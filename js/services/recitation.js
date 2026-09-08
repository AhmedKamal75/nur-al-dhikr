/**
 * recitation.js
 * A single shared <audio> element for streaming verse-by-verse Qur'an
 * recitation from a public CDN (see config.js quranAudioUrl). Nothing plays
 * without an explicit tap; nothing is proxied through this app's own
 * servers (there are none) — playback is a direct browser-to-CDN request,
 * the same as any <audio src> on a normal web page.
 *
 * Mirrors the plain-module-with-a-tracked-key shape of speech.js so app.js
 * can reflect "which ayah is currently playing" back into UI state.
 */

let audioEl = null;
let currentKey = null; // e.g. "2:255" — lets a card ask "is *this* ayah playing?"
// (B3) listener SETS, not single slots: two owners (the toast wiring and
// the continuous engine) used to share one slot, so starting a verse
// session silently clobbered single-ayah failure toasts forever after.
const keyListeners = new Set();
const errorListeners = new Set();
const endedListeners = new Set();

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'none';
    audioEl.addEventListener('ended', () => {
      const finished = currentKey;
      setKey(null);
      for (const cb of [...endedListeners]) {
        try {
          cb(finished);
        } catch (err) {
          console.error('[recitation] ended listener failed', err);
        }
      }
    });
    audioEl.addEventListener('error', () => {
      const failed = currentKey;
      setKey(null);
      for (const cb of [...errorListeners]) {
        try {
          cb(failed);
        } catch (err) {
          console.error('[recitation] error listener failed', err);
        }
      }
    });
  }
  return audioEl;
}

function setKey(key) {
  currentKey = key;
  for (const cb of [...keyListeners]) {
    try {
      cb(key);
    } catch (err) {
      console.error('[recitation] change listener failed', err);
    }
  }
}

/** Register a listener that's called whenever the playing ayah key changes. */
export function onPlaybackChange(callback) {
  if (typeof callback === 'function') keyListeners.add(callback);
}

export function offPlaybackChange(callback) {
  keyListeners.delete(callback);
}

/** Register a listener for verse-playback failures, so the UI can say why
 *  the button just reverted instead of failing in silence. */
export function onPlaybackError(callback) {
  if (typeof callback === 'function') errorListeners.add(callback);
}

export function offPlaybackError(callback) {
  errorListeners.delete(callback);
}

/** Register a listener that fires when a verse finishes playing NATURALLY
 *  (not via stop()) with the finished key — the seam the continuous
 *  surah-recitation engine (surahPlayback.js) advances on. */
export function onPlaybackEnded(callback) {
  if (typeof callback === 'function') endedListeners.add(callback);
}

export function offPlaybackEnded(callback) {
  endedListeners.delete(callback);
}

function emitError(key) {
  for (const cb of [...errorListeners]) {
    try {
      cb(key);
    } catch (err) {
      console.error('[recitation] error listener failed', err);
    }
  }
}

/** Start playing `url`, tagged with `key` for isPlaying()/UI reflection. */
export function play(url, key) {
  const el = getAudioEl();
  el.src = url;
  setKey(key);
  el.play().catch(() => {
    emitError(key);
    setKey(null);
  }); // e.g. autoplay policy or network failure
}

export function stop() {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
  }
  setKey(null);
}

/** Pause mid-ayah, keeping src + key so resume() continues in place. */
export function pause() {
  if (audioEl && !audioEl.paused) audioEl.pause();
}

/** Resume after pause(). A failed resume surfaces as a playback error
 *  (same contract as play()) so the session ends honestly, never hung. */
export function resume() {
  if (!audioEl || !audioEl.paused || !audioEl.currentSrc) return;
  const key = currentKey;
  audioEl.play().catch(() => {
    emitError(key);
    setKey(null);
  });
}

/** True while an ayah is paused mid-stream (source still loaded). */
export function isPaused() {
  return !!audioEl && !!audioEl.currentSrc && audioEl.paused && currentKey != null;
}

/** True when the element already played through (resume would no-op). */
export function hasEnded() {
  return !!audioEl && !!audioEl.currentSrc && audioEl.ended;
}

/** (v4.4) Sleep-timer fade: clamp volume on the shared element. */
export function setVolume(v) {
  const n = Number(v);
  if (audioEl && Number.isFinite(n)) audioEl.volume = Math.min(1, Math.max(0, n));
}

/** Verse speed: applies live to the shared element (takes effect instantly,
 *  no restart needed — the platform stretches the running buffer). */
export function setPlaybackRate(v) {
  const n = Number(v);
  if (audioEl && Number.isFinite(n)) audioEl.playbackRate = Math.min(2, Math.max(0.5, n));
}

export function isPlaying(key) {
  return currentKey === key;
}

export function currentlyPlayingKey() {
  return currentKey;
}

/* Surah-playback hands its own driver in via configureDriver() so the
 * continuous engine can be unit-tested without real audio. */
let driver = null;

export function configureDriver(custom) {
  driver = custom; // { play(url, key), stop(), onEnded(cb), onError(cb) } | null
}

function drv() {
  return (
    driver ?? {
      play: (url, key) => play(url, key),
      stop: () => stop(),
      onEnded: (cb) => onPlaybackEnded(cb),
      onError: (cb) => onPlaybackError(cb),
      offEnded: (cb) => offPlaybackEnded(cb),
      offError: (cb) => offPlaybackError(cb),
    }
  );
}

export function driverPlay(url, key) {
  drv().play(url, key);
}

export function driverStop() {
  drv().stop();
}

export function driverSetVolume(v) {
  if (driver?.setVolume) driver.setVolume(v);
  else setVolume(v);
}

export function driverSetRate(v) {
  if (driver?.setRate) driver.setRate(v);
  else setPlaybackRate(v);
}

export function driverPause() {
  if (driver?.pause) driver.pause();
  else pause();
}

export function driverResume() {
  if (driver?.resume) driver.resume();
  else resume();
}

export function driverIsPaused() {
  if (driver?.isPaused) return driver.isPaused();
  return isPaused();
}

export function driverHasEnded() {
  if (typeof driver?.ended === 'boolean') return driver.ended;
  return hasEnded();
}

export function driverOnEnded(cb) {
  drv().onEnded(cb);
}

export function driverOnError(cb) {
  drv().onError(cb);
}

export function driverOffEnded(cb) {
  try {
    drv().offEnded?.(cb);
  } catch {
    /* custom driver without removal — session guard still applies */
  }
}

export function driverOffError(cb) {
  try {
    drv().offError?.(cb);
  } catch {
    /* custom driver without removal — session guard still applies */
  }
}

/** Test-only: drop all listeners + driver between cases. */
export function resetRecitationForTests() {
  keyListeners.clear();
  errorListeners.clear();
  endedListeners.clear();
  driver = null;
}
