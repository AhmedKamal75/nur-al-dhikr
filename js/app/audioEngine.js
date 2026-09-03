/**
 * app/audioEngine.js — full-surah audio: reciter catalog, offline
 * downloads (IndexedDB), and the single shared <audio> player.
 */

import { startCompassIfNeeded, stopCompass } from './compassRuntime.js';
import { formatCountdown } from '../domain/ramadan.js';

import { VIEWS } from '../core/config.js';
import { t } from '../core/i18n.js';
import { actions, store } from '../core/state.js';
import { findMoshaf, loadCatalog, searchReciters, surahUrl } from '../services/audioCatalog.js';
import { showToast } from '../ui/toast.js';
import * as compass from '../domain/compass.js';
import * as audioStore from '../services/audioStore.js';
import * as player from '../services/player.js';
import * as recitation from '../services/recitation.js';
import * as surahPlayback from '../services/surahPlayback.js';

/* Full-surah audio: catalog + player + offline downloads              */
/* ------------------------------------------------------------------ */

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
    const { offline, error } = await player.play(moshafId, surah, surahUrl(moshaf.server, surah));
    // (v4.2) dispatch only on an actual change — the common case (online
    // → online) was a third full re-render for nothing.
    if (offline !== store.getState().player.offline)
      store.dispatch(actions.setAudioPlayer({ offline }));
    // FIX (review A2/B4): playback could not start (dead URL, autoplay
    // rejection, storage failure) — revert the optimistic state and say
    // so, instead of a player bar that mimes playing forever.
    if (error) {
      store.dispatch(actions.setAudioPlayer({ playing: false }));
      showToast(t('audio.playFailed', state.settings.language), { assertive: true });
    }
  } catch (err) {
    console.error('[app] startAudioPlay failed', err);
    store.dispatch(actions.setAudioPlayer({ playing: false }));
    showToast(t('audio.playFailed', state.settings.language), { assertive: true });
  }
}

export function wirePlayer() {
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
  recitation.onPlaybackError(() => {
    showToast(t('audio.playFailed', store.getState().settings.language), { assertive: true });
  });
  player.onTrackEnded(() => {
    const state = store.getState();
    const p = state.player;
    if (!p?.moshafId || p.surah == null) return;
    if (state.settings.audio.repeat === 'one') {
      startAudioPlay(p.moshafId, p.surah);
      return;
    }
    if (p.surah < 114) startAudioPlay(p.moshafId, p.surah + 1);
    else store.dispatch(actions.setAudioPlayer({ playing: false }));
  });
}

export async function ensureRecitersData(state) {
  if (state.activeView !== VIEWS.AUDIO) return;
  const doc = await loadCatalog();
  // Flip catalogReady exactly once: true state change → one re-render that
  // drops the loading hint. Reducer no-ops on every later call.
  if (doc) store.dispatch(actions.setAudioCatalogReady());
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
