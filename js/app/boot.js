/**
 * app/boot.js — the composition root: hydrate the store, load the
 * content libraries, wire every runtime subsystem, then hand control to
 * the router and the renderer. One boot, one error boundary.
 */

import { rt } from './rt.js';
import { wirePlayer, startAudioPlay as wireAudioStart } from './audioEngine.js';
import { renderErrorScreen } from './drawer.js';
import { bindGlobalEvents } from './events.js';
import { warmHadithDaily } from './hadithData.js';
import { wireInstallPrompt } from './installPrompt.js';
import { mountShell, render } from './renderer.js';
import { onStateChange } from './stateSub.js';
import { armPrayerTriggers, registerServiceWorker } from './triggers.js';
import { APP_NAME } from '../core/config.js';
import { t } from '../core/i18n.js';
import { initRouter } from '../core/router.js';
import { actions, store } from '../core/state.js';
import { applyTheme, watchSystemTheme } from '../core/theme.js';
import { applyTajweedColors } from './handlers/quran.js';
import { loadLibraries, refreshLibraryIndex } from './net.js';
import { showToast } from '../ui/toast.js';
import { flushReading } from './readingTimer.js';
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
    recitation.onPlaybackChange((key) => store.dispatch(actions.setRecitingAyah(key)));
    // Continuous recitation: the engine owns the audio; this mirrors its
    // progress into the store so every view (reader, Mushaf, player bar)
    // renders the moving highlight reactively.
    surahPlayback.onAyahChange((surah, ayah) => {
      // carry the live repeat budget too, so the recitation console's chip
      // renders from state rather than going stale between ayah changes
      const snap = surahPlayback.snapshot();
      store.dispatch(
        actions.setSurahPlayback({
          active: ayah != null,
          surah,
          ayah,
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
        })
      );
      // Lock-screen / headset metadata follows the reciting ayah (cleared
      // when the session closes) — best-effort, silent where unsupported.
      if (ayah != null) {
        mediaSession.syncMetadata(
          mediaSession.verseMetadata({
            surah,
            ayah,
            total: snap.total,
            reciter: snap.reciterId,
          })
        );
      } else {
        mediaSession.clearMetadata();
      }
    });
    // Lock-screen prev/next: verse session wins when active, otherwise the
    // full-surah player steps tracks. Installed once; all decisions read
    // live state inside the callbacks.
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
    });
    surahPlayback.onError((surah, ayah) => {
      console.error('[surah-playback] verse failed', surah, ayah);
      showToast(t('audio.reciteVerseFailed', store.getState().settings.language));
    });
    notifications.startScheduler(
      () => store.getState().reminders,
      // (review v3.21): accessor, not a frozen snapshot — notification copy
      // follows the language setting for the whole session.
      () => store.getState().settings.language,
      () => store.getState().calendarNotes,
      () => store.getState().settings.prayer,
      () => store.getState().zakatHistory,
      () => store.getState().fastingPrefs
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

    // Warm today's daily hadith (index + small bundled books — never the
    // multi-MB Sahihs). Fire-and-forget: the Home card appears when ready.
    warmHadithDaily();

    wireInstallPrompt();
    bindGlobalEvents();

    // v3.20 prayer-alert reliability: re-arm on every return to the app so
    // an open-then-closed-then-reopened day always has a fresh 24h of
    // timestamped triggers (the TODO's "on each app open" requirement).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') armPrayerTriggers();
    });
  } catch (err) {
    renderErrorScreen(err);
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
