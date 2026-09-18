/**
 * app/boot.js — the composition root: hydrate the store, load the
 * content libraries, wire every runtime subsystem, then hand control to
 * the router and the renderer. One boot, one error boundary.
 */

import { rt } from './rt.js';
import { wirePlayer, startAudioPlay as wireAudioStart } from './audioEngine.js';
import * as fullSurahPlayer from '../services/player.js';
import { renderErrorScreen } from './drawer.js';
import { bindGlobalEvents } from './events.js';
import { warmHadithDaily } from './hadithData.js';
import { wireInstallPrompt } from './installPrompt.js';
import { mountShell, render } from './renderer.js';
import { onStateChange } from './stateSub.js';
import { armPrayerTriggers, registerServiceWorker } from './triggers.js';
import { APP_NAME, VIEWS } from '../core/config.js';
import { t } from '../core/i18n.js';
import { go, initRouter } from '../core/router.js';
import { actions, store } from '../core/state.js';
import { applyTheme, watchSystemTheme } from '../core/theme.js';
import { applyTajweedColors } from './handlers/quran.js';
import { handleImportFile } from './fileImports.js';
import { isBackupFile, parseProtocolLaunch, parseShareTarget } from '../domain/launchIntents.js';
import { loadLibraries, refreshLibraryIndex } from './net.js';
import { showToast } from '../ui/toast.js';
import { flushReading } from './readingTimer.js';
import { clearAppBadge, refreshAppBadge } from '../services/appBadge.js';
import { maybeAutoBackupNow } from '../services/backup.js';
import * as notifications from '../services/notifications.js';
import * as mediaSession from '../services/mediaSession.js';
import * as recitation from '../services/recitation.js';
import * as speech from '../services/speech.js';
import * as surahPlayback from '../services/surahPlayback.js';

/* Boot                                                                */
/* ------------------------------------------------------------------ */

export async function boot() {
  try {
    // (v4.4) The file:// guard in index.html paints a standalone notice
    // because module scripts never load under file://. If boot ever runs,
    // the context is module-capable — drop the notice before first paint.
    document.getElementById('file-protocol-notice')?.remove();

    // (v4.1) mountShell lives INSIDE the try: a throw here used to escape
    // boot() entirely — an unhandled rejection and a blank screen instead
    // of the error screen every other boot failure gets.
    mountShell();
    store.hydrate();
    // (v5.2.53) rolling auto-backup heartbeat (fire-and-forget, total):
    // a returning user whose snapshot is older than a week banks a fresh
    // on-device copy; first runs and failures resolve silently.
    maybeAutoBackupNow();
    // (v5.2.44) a stale icon badge (yesterday's remaining prayers, a dead
    // streak warning) must not survive the app being opened — clear it
    // before first paint; the fresh count syncs below once state is live.
    // Fire-and-forget: the badge sync never throws or rejects.
    clearAppBadge();

    // (v4.1) Theme + a static skeleton BEFORE the ~2.2MB library download:
    // the first meaningful paint used to wait for loadLibraries(), leaving
    // an unstyled blank page for seconds on a slow first visit. The first
    // real render replaces this skeleton through the patch engine.
    applyTheme(store.getState().settings);
    // (v4.6.0) the user's tajweed family colors ride the same startup
    // moment as the theme — restored prefs apply before first paint.
    applyTajweedColors(store.getState());
    showBootSkeleton();

    // (v4.2) register the SW and wire the pagehide safety net BEFORE the
    // ~2.2MB library download: on a first visit the two biggest network
    // jobs (shell precache + content libraries) used to run SEQUENTIALLY —
    // the worker didn't even start caching until the libraries finished.
    // registerServiceWorker is fire-and-forget and never rejects into boot.
    registerServiceWorker();
    // (v4.3) persist flush on exit: the store's persist is a 200ms
    // TRAILING debounce, so during sustained tasbih tapping no write ever
    // lands — closing the app inside the final window silently lost the
    // whole burst. pagehide (mobile app-switch, tab close) and
    // visibilitychange→hidden both flush synchronously; localStorage writes
    // complete reliably there.
    const flushPendingPersist = () => {
      try {
        store.flushPersist();
      } catch {
        /* a failed flush must never break the rest of the pagehide chain */
      }
    };
    window.addEventListener('pagehide', flushPendingPersist);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Bank the open reading stretch before the tab freezes — timers
        // don't run backgrounded, so unflushed time would vanish.
        flushReading();
        flushPendingPersist();
      }
    });
    // Same banking when the page itself goes away (persist flushes after,
    // so the seconds are included in what lands on disk).
    window.addEventListener('pagehide', () => flushReading());
    window.addEventListener('pagehide', () => {
      if (rt.triggerArmTimer) {
        clearTimeout(rt.triggerArmTimer);
        rt.triggerArmTimer = null;
        armPrayerTriggers(true);
      }
    });

    const { documents, order } = await loadLibraries();
    store.dispatch(actions.bootComplete({ documents, order, itemIndex: {} }));
    refreshLibraryIndex();
    rt.lastCustomContentRef = store.getState().customContent;

    watchSystemTheme(() => applyTheme(store.getState().settings));
    speech.warmVoices();
    // Reflect the shared recitation <audio> element's play/stop state back
    // into the store so any card/button showing that ayah re-renders with
    // the right "now playing" affordance, the same way speakingItemId does
    // for text-to-speech.
    // (v5.10.6) single render per advance: while a verse session is active
    // its own mirror below already carries the key (batched into the same
    // dispatch) — a second render here would double every handoff's main-
    // thread bill. Single-ayah taps (no session) still flow through here.
    recitation.onPlaybackChange((key) => {
      if (surahPlayback.isActive()) return;
      store.dispatch(actions.setRecitingAyah(key));
    });
    // Continuous recitation: the engine owns the audio; this mirrors its
    // progress into the store so every view (reader, Mushaf, player bar)
    // renders the moving highlight reactively.
    surahPlayback.onAyahChange((surah, ayah) => {
      // carry the live repeat budget too, so the recitation console's chip
      // renders from state rather than going stale between ayah changes
      const snap = surahPlayback.snapshot();
      // (v5.10.6) one dispatch for the whole advance: the card highlight
      // key rides WITH the session mirror, so each ayah costs exactly one
      // render instead of two back-to-back full rebuilds.
      const recitingKey = ayah != null && surah != null ? `${surah}:${ayah}` : null;
      store.batch(() => {
        store.dispatch(
          actions.setSurahPlayback({
            active: ayah != null,
            surah,
            ayah,
            from: snap.from,
            repeat: snap.repeat,
            // (v5.2.0) echo mode + "your turn" pause ride the same mirror.
            listenRepeat: snap.listenRepeat === true,
            waiting: snap.waiting === true,
            // FIX (v5.2.1): the mirror used to drop total/end, so every
            // counter in the app ("1 / 0" in the player bar AND the
            // fullscreen glass bar) read zero. The engine owns them.
            total: snap.total,
            end: snap.end,
            // FIX: the mirror also dropped listen mode + voices, so enabling
            // continuous/compare then advancing one ayah silently lost them
            // (continuous "didn't work"; a reciter change never stuck).
            continuous: snap.continuous === true,
            reciterId: snap.reciterId,
            reciterIdB: snap.reciterIdB,
            compare: snap.compare === true,
            loop: snap.loop,
            speed: snap.speed,
            queue: snap.queue,
            qIndex: snap.qIndex,
            stopAt: snap.stopAt,
            paused: snap.paused === true,
          })
        );
        store.dispatch(actions.setRecitingAyah(recitingKey));
      });
      // Lock-screen / headset metadata follows the reciting ayah (cleared
      // when the session closes) — best-effort, silent where unsupported.
      if (ayah != null) {
        mediaSession.syncMetadata(
          mediaSession.verseMetadata({
            surah,
            ayah,
            total: snap.total,
            reciter: snap.reciterId,
            lang: store.getState().settings.language,
          })
        );
      } else {
        mediaSession.clearMetadata();
      }
      // Kids-mode stars: a naturally finished surah earns one. The engine
      // flags only true play-throughs (manual stops never set it), and the
      // flag is single-read, so a star can never double-count.
      const finished = surahPlayback.consumeLastFinish();
      if (finished != null && store.getState().settings.kidsMode === true) {
        store.dispatch(actions.awardKidsStar(finished));
        showToast(t('kids.starEarned', store.getState().settings.language));
      }
    });
    // Lock-screen controls: the verse session wins when active (prev/next
    // ayah, play/pause in place), otherwise the full-surah player steps
    // tracks and toggles. Installed once; all decisions read live state
    // inside the callbacks.
    mediaSession.installMediaHandlers({
      onPrev: () => {
        if (surahPlayback.isActive()) surahPlayback.skip(-1);
        else {
          const p = store.getState().player;
          if (p?.moshafId && p.surah > 1) wireAudioStart(p.moshafId, p.surah - 1);
        }
      },
      onNext: () => {
        if (surahPlayback.isActive()) surahPlayback.skip(1);
        else {
          const p = store.getState().player;
          if (p?.moshafId && p.surah != null && p.surah < 114)
            wireAudioStart(p.moshafId, p.surah + 1);
        }
      },
      onToggle: () => {
        const sp = store.getState().surahPlayback;
        if (sp?.active) {
          store.dispatch(
            actions.setSurahPlayback(
              sp.paused === true ? surahPlayback.resume() : surahPlayback.pause()
            )
          );
          return;
        }
        const p = store.getState().player;
        if (!p?.moshafId) return;
        if (p.playing) {
          fullSurahPlayer.pause();
          store.dispatch(actions.setAudioPlayer({ playing: false }));
        } else {
          fullSurahPlayer.toggle();
          store.dispatch(actions.setAudioPlayer({ playing: true }));
        }
      },
    });
    surahPlayback.onError((surah, ayah) => {
      console.error('[surah-playback] verse failed', surah, ayah);
      const lang = store.getState().settings.language;
      // First-ayah failure = voice/CDN outage or offline (not one bad file):
      // degrade to the full-surah stream of the same surah instead of
      // silence. Mid-session failures keep the plain error toast (the
      // session already delivered audio; auto-switching would be a surprise).
      const sp = store.getState().surahPlayback;
      const s = Math.floor(Number(surah));
      const firstAyah =
        Number.isFinite(s) &&
        s >= 1 &&
        s <= 114 &&
        sp &&
        sp.from != null &&
        Number(sp.ayah) === Number(sp.from) &&
        Number(ayah) === Number(sp.from);
      if (firstAyah) {
        const moshafId = store.getState().settings.audio?.moshafId || null;
        wireAudioStart(moshafId, s);
        showToast(t('audio.verseFallbackSurah', lang));
      } else {
        showToast(t('audio.reciteVerseFailed', lang));
      }
    });
    notifications.startScheduler(
      () => store.getState().reminders,
      // (review v3.21): accessor, not a frozen snapshot — notification copy
      // follows the language setting for the whole session.
      () => store.getState().settings.language,
      () => store.getState().calendarNotes,
      () => store.getState().settings.prayer,
      () => store.getState().zakatHistory,
      () => store.getState().fastingPrefs,
      // (v5.2.28) first-class clock settings (Jumu'ah, daily verse, Fitr).
      () => store.getState().settings
    );

    // (review v3.21): a settings-change re-arm is debounced 250ms; a tab
    // closed inside that window would leave the OFF state's cancellation
    // unsent. pagehide flushes the pending arm synchronously (best effort).
    // (v4.2) the listener itself is now attached before loadLibraries()
    // above — a first-visit failure inside that await used to skip it.

    store.subscribe(onStateChange);
    // FIX (review v3.1 A4): persistence failures (e.g. storage quota
    // exceeded) were silent — the app looked like it was saving while every
    // write was lost. One honest toast, once per broken session.
    store.onPersistError = () => {
      showToast(t('storage.persistFailed', store.getState().settings.language), {
        duration: 6000,
        assertive: true,
      });
    };
    wirePlayer();
    initRouter(); // dispatches the first NAVIGATE
    render(store.getState());
    // (v5.2.66, item 24) OS launch entry points (share/file/protocol)
    // override the boot route — after the first NAVIGATE so there is
    // always a sane route underneath, silent everywhere unsupported.
    consumeLaunchIntents();

    // Warm today's daily hadith (index + small bundled books — never the
    // multi-MB Sahihs). Fire-and-forget: the Home card appears when ready.
    warmHadithDaily();

    wireInstallPrompt();
    bindGlobalEvents();

    // v3.20 prayer-alert reliability: re-arm on every return to the app so
    // an open-then-closed-then-reopened day always has a fresh 24h of
    // timestamped triggers (the TODO's "on each app open" requirement).
    // (v5.2.44) the icon badge re-syncs on the same signal — a day that
    // rolled over while the tab was hidden re-badges without a reload.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        armPrayerTriggers();
        refreshAppBadge(() => store.getState());
      }
    });
    // (v5.2.44) first fresh badge right after boot (the early clear above
    // removed the stale one; this paints today's truth).
    refreshAppBadge(() => store.getState());
  } catch (err) {
    renderErrorScreen(err);
  }
}

/**
 * Strip the one-shot launch query (?title/&text/&url=/proto=) while keeping
 * the hash route, so a reload boots clean instead of re-firing the intent.
 */
function stripLaunchQuery() {
  try {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.hash
    );
  } catch {
    /* opaque origins: the query stays, the intent still runs once per load */
  }
}

/**
 * (v5.2.66, item 24) consume OS launch intents: shared content searches
 * the library, protocol deep-links route, and .json open-with files reuse
 * the backup-import confirm flow. Every branch fails closed to the normal
 * boot route on junk input or missing APIs.
 */
function consumeLaunchIntents() {
  const search = window.location.search || '';
  // File open-with works whether or not a query rides along — and on
  // browsers without launchQueue the manifest file_handlers simply never
  // fire, so this stays a silent no-op there.
  const lq = window.launchQueue;
  if (lq && typeof lq.setConsumer === 'function') {
    lq.setConsumer(async (launchParams) => {
      for (const handle of launchParams?.files ?? []) {
        if (!handle || !isBackupFile(handle.name)) continue;
        try {
          handleImportFile(await handle.getFile());
        } catch (err) {
          console.error('[launch] open-with failed', err);
          showToast(t('common.error', store.getState().settings.language));
        }
      }
    });
  }
  const share = parseShareTarget(search);
  if (share) {
    stripLaunchQuery();
    showToast(t('share.received', store.getState().settings.language));
    go(VIEWS.SEARCH, { q: share.q });
    return;
  }
  const proto = parseProtocolLaunch(search);
  if (proto) {
    stripLaunchQuery();
    go(proto.view, proto.params);
  }
}

/**
 * Static first-paint skeleton: an honest "the app is here, content is on
 * its way" shape mirroring the home hero, instead of a blank page while
 * the content libraries download. Announced politely to screen readers.
 */
function showBootSkeleton() {
  const main = document.getElementById('main');
  if (!main) return;
  const lang = store.getState().settings.language;
  main.innerHTML = `
    <div class="boot-skeleton" role="status" aria-live="polite">
      <span class="boot-skeleton__mark" aria-hidden="true">۞</span>
      <p class="boot-skeleton__title">${APP_NAME}</p>
      <span class="sr-only">${t('common.loading', lang)}</span>
      <div class="boot-skeleton__lines" aria-hidden="true">
        <span class="sk" style="--sk-w:72%"></span>
        <span class="sk" style="--sk-w:52%"></span>
        <span class="sk" style="--sk-w:64%"></span>
      </div>
    </div>`;
}
