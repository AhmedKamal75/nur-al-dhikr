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

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'none';
    audioEl.addEventListener('ended', () => setKey(null));
    audioEl.addEventListener('error', () => setKey(null));
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

/** Start playing `url`, tagged with `key` for isPlaying()/UI reflection. */
export function play(url, key) {
  const el = getAudioEl();
  el.src = url;
  setKey(key);
  el.play().catch(() => setKey(null)); // e.g. autoplay policy or network failure
}

export function stop() {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
  }
  setKey(null);
}

export function isPlaying(key) {
  return currentKey === key;
}

export function currentlyPlayingKey() {
  return currentKey;
}
