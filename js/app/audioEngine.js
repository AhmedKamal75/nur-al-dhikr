/**
 * app/audioEngine.js — full-surah audio: reciter catalog, offline
 * downloads (IndexedDB), and the single shared <audio> player.
 */

import { startCompassIfNeeded, stopCompass } from './compassRuntime.js';
import { rt } from './rt.js';
import { formatCountdown } from '../domain/ramadan.js';

import { VIEWS } from '../core/config.js';
import { DEFAULT_RECITER, quranAudioSurahUrl, reciterDisplayName } from '../core/config/quran.js';
import { resolveNextFullSurah } from '../domain/audioQueue.js';
import { shortcutActionForKey } from '../domain/playerShortcuts.js';
import { t } from '../core/i18n.js';
import { actions, store } from '../core/state.js';
import { findMoshaf, loadCatalog, searchReciters, surahUrl } from '../services/audioCatalog.js';
import { isSurahMissing } from '../services/moshafAvailability.js';
import { showToast } from '../ui/toast.js';
import * as compass from '../domain/compass.js';
import * as audioStore from '../services/audioStore.js';
import * as mediaSession from '../services/mediaSession.js';
import * as player from '../services/player.js';
import { onAdhanStart } from '../services/prayerSound.js';
import * as recitation from '../services/recitation.js';
import * as surahPlayback from '../services/surahPlayback.js';

/* Full-surah audio: catalog + player + offline downloads              */
/* ------------------------------------------------------------------ */

/**
 * One-voice yield (v5.2.67, item 23): pause a playing full-surah track so
 * a verse queue, TTS narration or an alert preview takes the speaker.
 * Returns true when it yielded. The track stays docked (position kept) —
 * resuming is one tap, never a restart.
 */
export function yieldFullSurahPlayer() {
  const p = store.getState().player;
  if (!p?.moshafId || !p.playing) return false;
  player.pause();
  store.dispatch(actions.setAudioPlayer({ playing: false }));
  return true;
}

export async function startAudioPlay(moshafId, surah) {
  const state = store.getState();
  // FIX (review A1): the reciters catalog is lazily loaded by the Audio
  // view — but this path runs from the Qur'an view, the player bar, and
  // auto-advance. Guarantee the catalog before resolving any moshaf.
  // loadCatalog() is idempotent and cached; it never throws.
  await loadCatalog();
  const customs = state.settings.customReciters || [];
  let moshaf = findMoshaf(moshafId, customs);
  if (!moshaf) {
    // First launch (no preference yet) or a stale/removed id: fall back to
    // Al-Husary murattal, then to the first entry in the catalog.
    const husary = findMoshaf('mp3-118-118', customs);
    moshafId = husary ? husary.id : searchReciters('', customs)[0]?.id;
    moshaf = findMoshaf(moshafId, customs);
  }
  if (!moshaf) {
    showToast(t('audio.playFailed', state.settings.language), { assertive: true });
    store.dispatch(actions.setAudioPlayer({ moshafId: null, surah: null, playing: false }));
    return;
  }
  // FIX (review A3): one voice at a time — starting a surah stops any
  // verse-by-verse recitation in flight.
  if (recitation.currentlyPlayingKey()) recitation.stop();
  // (v4.2) …and the mirror case: surahPlayback drives its verses THROUGH
  // the recitation element, so recitation.stop() alone killed the audio
  // but left the session "active" — the player bar then docked a frozen
  // verse console over the real full-surah playback (no pause/seek) until
  // the user found "stop recite". One voice means BOTH consoles stop.
  if (surahPlayback.isActive()) surahPlayback.stop();
  // (v4.2) one batched re-render instead of two back-to-back full renders
  // (playlist auto-advance did this per track while parked on the Qur'ān
  // reader — two ~1MB view rebuilds per song change).
  store.batch(() => {
    store.dispatch(actions.setAudioPlayer({ moshafId, surah, playing: true }));
    store.dispatch(actions.setAudioPrefs({ moshafId }));
  });
  try {
    // Known absent from this server: skip the doomed primary fetch and go
    // straight to the CDN-voice fallback below (which still says honestly
    // whose voice plays via the fallback toast). An offline copy always
    // wins — learned rows can only predate a successful download.
    const offlineKey = audioStore.audioKey(moshafId, surah);
    const skipPrimary = isSurahMissing(moshafId, surah) && !state.audioDownloads?.[offlineKey];
    let res = skipPrimary
      ? { offline: false, error: true }
      : await player.play(moshafId, surah, surahUrl(moshaf.server, surah));
    let { offline, error } = res;
    let fallbackVoice = '';
    // Cross-engine fallback (one retry, streaming only): the moshaf server
    // is unreachable and there is no offline copy — retry the same surah
    // through the verse CDN's per-surah files (default voice) rather than
    // failing outright. Downloads never fall back (a foreign voice under
    // this moshaf's IDB key would poison the offline cache).
    if (error && !offline) {
      fallbackVoice = reciterDisplayName(DEFAULT_RECITER, state.settings.language);
      res = await player.play(moshafId, surah, quranAudioSurahUrl(DEFAULT_RECITER, surah));
      offline = res.offline;
      error = res.error;
      if (!error) {
        const name = moshaf.nameEn || moshaf.nameAr || '';
        mediaSession.syncMetadata(
          mediaSession.fullSurahMetadata({
            surah,
            reciter: fallbackVoice || name,
            lang: state.settings.language,
          })
        );
        showToast(
          t('audio.fallbackVoice', state.settings.language, { name: fallbackVoice || name })
        );
      }
    }
    // Lock-screen metadata for the full-surah track (cleared on stop/close
    // by the recite-stop / player-close handlers via clearMetadata).
    if (!error && !fallbackVoice) {
      const name = moshaf.nameEn || moshaf.nameAr || '';
      mediaSession.syncMetadata(
        mediaSession.fullSurahMetadata({ surah, reciter: name, lang: state.settings.language })
      );
    }
    // The stored speed survives track changes: a fresh <audio> element (or
    // a prior 1x default) would otherwise reset to 1x while the chip still
    // claims 1.5x. Re-assert the preference on every track start.
    // (v5.12.0) same for the stored file volume (setVolume clamps).
    if (!error) {
      const rate = Number(state.settings.audio?.rate);
      if (Number.isFinite(rate) && rate !== 1) player.setRate(rate);
      const vol = Number(state.settings.audio?.fileVolume);
      if (Number.isFinite(vol)) player.setVolume(vol);
    }
    // (v4.2) dispatch only on an actual change — the common case (online
    // → online) was a third full re-render for nothing.
    if (offline !== store.getState().player.offline)
      store.dispatch(actions.setAudioPlayer({ offline }));
    // FIX (review A2/B4): playback could not start (dead URL, autoplay
    // rejection, storage failure) — revert the optimistic state and say
    // so, instead of a player bar that mimes playing forever.
    if (error) {
      store.dispatch(actions.setAudioPlayer({ playing: false }));
      // (v5.2.67) a failed track owns no lock-screen slot — without this
      // the previous track's metadata lingers as if still playing.
      mediaSession.clearMetadata();
      showToast(t('audio.playFailed', state.settings.language), { assertive: true });
    } else {
      // (v5.2.67) gapless-lite: warm the next track's offline lookup while
      // this one plays, so ended→start skips the IDB latency. Bounded to
      // one slot inside the engine; a failed warm falls back silently.
      const next = resolveNextFullSurah(surah, state.settings.audio?.repeat);
      if (next != null && moshaf) {
        player.prefetchTrack(moshafId, next, surahUrl(moshaf.server, next));
      }
    }
  } catch (err) {
    console.error('[app] startAudioPlay failed', err);
    store.dispatch(actions.setAudioPlayer({ playing: false }));
    showToast(t('audio.playFailed', state.settings.language), { assertive: true });
  }
}

export function wirePlayer() {
  wireAudioShortcuts();
  wirePlayerIdle();
  player.onPlayerPatch((info) => {
    // DOM patches only — never the store — while audio is running.
    const bar = document.querySelector('.player-bar');
    if (!bar) return;
    const timeEl = bar.querySelector('[data-player-time]');
    const durEl = bar.querySelector('[data-player-dur]');
    const seek = bar.querySelector('[data-player-seek]');
    const bufEl = bar.querySelector('[data-player-buffer]');
    // (v4.1) seconds → "M:SS" via the shared countdown formatter (the
    // hand-rolled twin of this used to drift from it).
    const fmt = (s) => formatCountdown((s || 0) * 1000);
    // While the seek thumb is being dragged (it has focus), the live preview
    // written by the input handler owns the time label — don't let the
    // timeupdate patches overwrite it until the drag ends.
    if (timeEl && !(seek && document.activeElement === seek))
      timeEl.textContent = fmt(info.currentTime);
    if (durEl) durEl.textContent = fmt(info.duration);
    if (seek && document.activeElement !== seek && info.duration > 0) {
      seek.value = String((info.currentTime / info.duration) * 100);
    }
    // FIX (review A6): honest buffering state — shown only when the element
    // wants to play but has no data yet, never as a false "playing".
    if (bufEl) bufEl.hidden = !info.buffering;
  });
  // FIX (review A10): the element is the source of truth — if the OS,
  // headphones, or a suspended tab pause playback, the store follows.
  player.onPlayingStateChange((playing) => {
    const p = store.getState().player;
    if (p?.moshafId && p.playing !== playing) {
      store.dispatch(actions.setAudioPlayer({ playing }));
    }
  });
  // Sleep-timer countdown: the 1s engine tick syncs the store only
  // when the displayed minute changes (≤60 tiny bar patches per hour),
  // plus the final off-state when the timer expires mid-fade.
  let lastSleepMinute = undefined;
  player.onSleepTick(() => {
    const snap = player.sleepSnapshot();
    if (!snap.enabled) {
      if (lastSleepMinute !== null) {
        lastSleepMinute = null;
        store.dispatch(
          actions.setAudioPlayer({ sleepEnabled: false, sleepMinutes: null, sleepLabel: '' })
        );
      }
      return;
    }
    const minute = snap.label.replace(/:\d\d$/, '');
    if (minute !== lastSleepMinute) {
      lastSleepMinute = minute;
      store.dispatch(
        actions.setAudioPlayer({
          sleepEnabled: true,
          sleepMinutes: snap.minutes,
          sleepLabel: snap.label,
        })
      );
    }
  });
  // FIX (review A2/R12): a mid-stream drop (tunnel Wi-Fi) reverts the UI
  // and tells the person — no silent lying bar.
  player.onPlayerError(() => {
    const p = store.getState().player;
    if (p?.moshafId && p.playing) {
      store.dispatch(actions.setAudioPlayer({ playing: false }));
      showToast(t('audio.playFailed', store.getState().settings.language), { assertive: true });
    }
  });
  // FIX (review A7/B8): verse playback failures are spoken, not swallowed.
  // (B3) the session owner reports its own failures (reciteVerseFailed):
  // the shared toast stays silent while a session is active so one dead
  // verse does not produce two toasts — and it keeps working after the
  // session ends, which the old single-slot wiring broke.
  recitation.onPlaybackError(() => {
    if (surahPlayback.isActive()) return;
    showToast(t('audio.playFailed', store.getState().settings.language), { assertive: true });
  });
  // (v5.2.72) a real adhan owns the speaker: pause the full-surah track
  // (docked, resumable), freeze a verse session in place, and stop a
  // single-verse tap. No auto-resume — one tap resumes, never a surprise.
  onAdhanStart(() => {
    yieldFullSurahPlayer();
    if (surahPlayback.isActive()) {
      store.dispatch(actions.setSurahPlayback(surahPlayback.pause()));
    }
    recitation.stop();
  });
  player.onTrackEnded(() => {
    const state = store.getState();
    const p = state.player;
    if (!p?.moshafId || p.surah == null) return;
    // (v5.2.67) one shared advance answer (domain/audioQueue.js): repeat
    // one holds, repeat all wraps 114→1, off walks to a real end at 114.
    const next = resolveNextFullSurah(p.surah, state.settings.audio?.repeat);
    if (next != null) startAudioPlay(p.moshafId, next);
    else store.dispatch(actions.setAudioPlayer({ playing: false }));
  });
}

/* Player-bar idle fade (v5.12.0)                                        */
/* ------------------------------------------------------------------ */

// While any audio plays, the bar fades to a ghost after 5s without user
// activity (pointer/key/touch/wheel) so nothing but the text holds the
// screen; any activity brings it straight back. Opacity only — the faded
// bar stays operable and screen-reader visible, and the minimized pill
// never fades (it is already the compact form). The timer arms from the
// state pump (syncPlayerIdleArmed, never resetting) and resets on real
// activity — store dispatches must NOT reset it, or every ayah advance
// would keep the bar awake forever.
// (v5.12.0 hostile review) the ghost yields to fullscreen/immersive
// sessions: their own 3s timer owns every fade there, so the two systems
// can never stage a double fade (console at 3s, bar at 5s) again.
export const PLAYER_IDLE_MS = 5000;
let playerIdleTimer = null;

function setPlayerIdle(idle) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('player-idle', idle === true);
}

function playerIdleEligible() {
  const st = store.getState();
  const audioActive = st.player?.playing === true || surahPlayback.isActive();
  // (v5.12.0 hostile review) one wake path per context: while a
  // fullscreen/immersive session governs the chrome, its own 3s timer owns
  // every fade — the 5s bar ghost must not stage a second fade behind it.
  // (The mushaf-fs dock hides the full bar anyway; the pill never fades.)
  const fsGoverns =
    (st.mushafFullscreen === true && st.activeView === VIEWS.MUSHAF) ||
    (st.readerImmersive === true && st.activeView === VIEWS.QURAN);
  return audioActive && st.ui?.playerMin !== true && !fsGoverns;
}

/** Pump hook (every notify): arm when audio starts, clear when it stops.
 *  Never resets a running timer — only user activity does that. */
export function syncPlayerIdleArmed() {
  if (typeof document === 'undefined') return;
  if (!playerIdleEligible()) {
    if (playerIdleTimer) clearTimeout(playerIdleTimer);
    playerIdleTimer = null;
    setPlayerIdle(false);
    return;
  }
  if (playerIdleTimer || document.body.classList.contains('player-idle')) return;
  playerIdleTimer = setTimeout(() => {
    playerIdleTimer = null;
    // Re-check at fire time: a stop inside the window must not fade.
    if (playerIdleEligible()) setPlayerIdle(true);
  }, PLAYER_IDLE_MS);
}

/** User activity: un-fade and re-arm (no-op without active audio). */
export function resetPlayerIdleTimer() {
  if (typeof document === 'undefined') return;
  if (!playerIdleEligible()) return;
  setPlayerIdle(false);
  if (playerIdleTimer) clearTimeout(playerIdleTimer);
  playerIdleTimer = setTimeout(() => {
    playerIdleTimer = null;
    if (playerIdleEligible()) setPlayerIdle(true);
  }, PLAYER_IDLE_MS);
}

function wirePlayerIdle() {
  if (typeof window === 'undefined') return;
  for (const evt of ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel']) {
    window.addEventListener(evt, () => resetPlayerIdleTimer(), { passive: true });
  }
}

/* Keyboard drills + mute (v5.12.0)                                      */
/* ------------------------------------------------------------------ */

/** Arrow-key seek step for file mode (YouTube's 10s). */
export const SHORTCUT_SEEK_SEC = 10;

// Element-level mute mirror (the services own their element flags for
// future elements; this owns the toggle intent + UI mirror).
let audioMuted = false;

export function isAudioMuted() {
  return audioMuted;
}

export function setAudioMuted(on) {
  audioMuted = on === true;
  recitation.setMuted(audioMuted);
  player.setMuted(audioMuted);
  return audioMuted;
}

/** Flip mute on both engines + toast. Returns the new state. */
export function toggleAudioMute() {
  const next = setAudioMuted(!audioMuted);
  const lang = store.getState().settings.language;
  showToast(t(next ? 'audio.mute' : 'audio.unmute', lang));
  return next;
}

function shortcutTogglePlay() {
  const st = store.getState();
  if (surahPlayback.isActive()) {
    const paused = st.surahPlayback?.paused === true;
    store.dispatch(
      actions.setSurahPlayback(paused ? surahPlayback.resume() : surahPlayback.pause())
    );
    return true;
  }
  const p = st.player;
  if (p?.moshafId && p.surah != null) {
    if (p.playing) {
      player.pause();
      store.dispatch(actions.setAudioPlayer({ playing: false }));
    } else {
      // (v5.12.0 hostile review) same optimistic-revert as the bar toggle:
      // a blocked play() reverts instead of blipping a false icon.
      const outcome = player.toggle();
      store.dispatch(actions.setAudioPlayer({ playing: true }));
      if (outcome && typeof outcome.then === 'function') {
        outcome.then((playing) => {
          if (playing !== true) store.dispatch(actions.setAudioPlayer({ playing: false }));
        });
      }
    }
    return true;
  }
  return false;
}

function shortcutStep(left) {
  const st = store.getState();
  if (surahPlayback.isActive()) {
    // ArrowLeft answers the console's left-chevron "next" button (mushaf
    // order); ArrowRight the right-chevron "prev" — same icons, same keys.
    surahPlayback.skip(left ? 1 : -1);
    return true;
  }
  const p = st.player;
  if (p?.moshafId && p.surah != null) {
    player.seekBy(left ? -SHORTCUT_SEEK_SEC : SHORTCUT_SEEK_SEC);
    return true;
  }
  return false;
}

function onShortcutKey(e) {
  const action = shortcutActionForKey(e);
  if (!action) return;
  if (action === 'mute') {
    e.preventDefault();
    const next = toggleAudioMute();
    store.dispatch(actions.audioMutedSet(next));
    return;
  }
  const acted = action === 'toggle' ? shortcutTogglePlay() : shortcutStep(action === 'arrowLeft');
  // No audio context (quiet reading): leave the key alone so Space still
  // scrolls and arrows still scroll — shortcuts must never break reading.
  if (acted) e.preventDefault();
}

/** Global keydown for the player drills (wired once with the player). */
export function wireAudioShortcuts() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', onShortcutKey);
}

export function unwireAudioShortcutsForTests() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('keydown', onShortcutKey);
}

export async function ensureRecitersData(state) {
  if (state.activeView !== VIEWS.AUDIO) return;
  const doc = await loadCatalog();
  // Flip catalogReady exactly once: true state change → one re-render that
  // drops the loading hint. Reducer no-ops on every later call.
  if (doc) store.dispatch(actions.setAudioCatalogReady());
}

/**
 * (v5.2.61) verse-pack status rescan: recount stored ayahs per surah for
 * the active voice into the ephemeral cache. Runs on audio-view renders,
 * once per voice (rt latch) — IDB is the truth, the cache just renders.
 */
export async function maybeSyncVerseStatus(state) {
  if (state.activeView !== VIEWS.AUDIO) return;
  const voice =
    typeof state.settings.reciter === 'string' && state.settings.reciter
      ? state.settings.reciter
      : null;
  if (!voice) return;
  if (rt.lastVerseStatusVoice === voice) return;
  rt.lastVerseStatusVoice = voice;
  try {
    const { ensureQuranMeta } = await import('./lazyData.js');
    await ensureQuranMeta();
    const meta = store.getState().quran.meta?.surahs;
    if (!Array.isArray(meta)) return;
    const stored = await audioStore.listVerseAyahs(voice);
    const have = new Set(stored);
    // Cumulative ayah counts bound each global number to its surah.
    const bounds = [];
    let run = 0;
    for (const s of meta) {
      const count = Math.floor(Number(s.ayahCount)) || 0;
      run += count;
      bounds.push({ surah: Number(s.number), end: run, total: count });
    }
    const packs = {};
    for (const { surah, end, total } of bounds) {
      if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
      let done = 0;
      for (let g = end - total + 1; g <= end; g += 1) {
        if (have.has(g)) done += 1;
      }
      if (done > 0) packs[surah] = { done, total };
    }
    store.dispatch(actions.setVersePackStatus({ voice, packs }));
  } catch {
    /* IDB/meta failure leaves the grid unmarked, never broken */
  }
}

export async function downloadOne(moshafId, surah) {
  const state = store.getState();
  const moshaf = findMoshaf(moshafId, state.settings.customReciters || []);
  if (!moshaf) return { ok: false, error: 'no-moshaf' };
  const res = await audioStore.downloadSurah(moshafId, surah, surahUrl(moshaf.server, surah));
  if (res.ok)
    store.dispatch(actions.markAudioDownload(audioStore.audioKey(moshafId, surah), res.bytes));
  return res;
}

export function updateCompassLifecycle(state) {
  const onQibla = state.activeView === VIEWS.QIBLA;
  if (!onQibla) {
    stopCompass();
    return;
  }
  // On browsers that require an explicit permission prompt (iOS Safari),
  // wait for the person to tap "Enable Compass" (see clickHandlers below)
  // rather than starting automatically.
  if (compass.isSupported() && !compass.needsPermission()) startCompassIfNeeded();
}
