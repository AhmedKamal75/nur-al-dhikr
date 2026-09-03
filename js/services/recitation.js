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
let onKeyChange = null; // optional callback(key|null), fired on start/stop/end/error
let onError = null; // optional callback(key) — verse audio failed to play
let onEnded = null; // optional callback(key) — verse finished playing naturally

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'none';
    audioEl.addEventListener('ended', () => {
      const finished = currentKey;
      setKey(null);
      onEnded?.(finished);
    });
    audioEl.addEventListener('error', () => {
      onError?.(currentKey);
      setKey(null);
    });
  }
  return audioEl;
}

function setKey(key) {
  currentKey = key;
  if (onKeyChange) onKeyChange(key);
}

/** Register a listener that's called whenever the playing ayah key changes. */
export function onPlaybackChange(callback) {
  onKeyChange = callback;
}

/** Register a listener for verse-playback failures, so the UI can say why
 *  the button just reverted instead of failing in silence. */
export function onPlaybackError(callback) {
  onError = callback;
}

/** Register a listener that fires when a verse finishes playing NATURALLY
 *  (not via stop()) with the finished key — the seam the continuous
 *  surah-recitation engine (surahPlayback.js) advances on. */
export function onPlaybackEnded(callback) {
  onEnded = callback;
}

/** Start playing `url`, tagged with `key` for isPlaying()/UI reflection. */
export function play(url, key) {
  const el = getAudioEl();
  el.src = url;
  setKey(key);
  el.play().catch(() => {
    onError?.(key);
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

/** (v4.4) Sleep-timer fade: clamp volume on the shared element. */
export function setVolume(v) {
  const n = Number(v);
  if (audioEl && Number.isFinite(n)) audioEl.volume = Math.min(1, Math.max(0, n));
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

export function driverOnEnded(cb) {
  drv().onEnded(cb);
}

export function driverOnError(cb) {
  drv().onError(cb);
}
