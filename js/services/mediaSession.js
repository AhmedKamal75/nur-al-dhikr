/**
 * services/mediaSession.js — lock-screen / headset / notification-shade
 * controls for recitation (Media Session API, no backend, fully local).
 *
 * Pure metadata builders (unit-tested) + thin guarded sync: every touch of
 * `navigator.mediaSession` is feature-detected, so browsers without it
 * (or Node under test) simply get silence instead of an exception. The
 * engine owns audio; this module only ADVERTISES it to the platform.
 */

import { reciterDisplayName } from '../core/config/quran.js';

/**
 * (v5.2.81, UP-08) lock-screen artwork: the app's own precached icons
 * (sw.js APP_SHELL + manifest, always offline). Relative URLs resolve
 * against the document base; no network, no backend, no new assets.
 */
export const SESSION_ARTWORK = Object.freeze([
  { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
]);

export function verseMetadata({ surah, ayah, total, reciter, lang = 'en' }) {
  const s = Math.floor(Number(surah));
  const a = Math.floor(Number(ayah));
  const t = Math.floor(Number(total));
  return {
    title:
      Number.isFinite(s) && Number.isFinite(a)
        ? `Surah ${s} · Ayah ${a}${Number.isFinite(t) && t > 0 ? `/${t}` : ''}`
        : 'Qur\u2019an recitation',
    // Display name, never the raw voice id (was 'ar.alafasy' on lock screens).
    artist: reciterDisplayName(typeof reciter === 'string' ? reciter : '', lang),
    album: '',
    artwork: [...SESSION_ARTWORK],
  };
}

export function fullSurahMetadata({ surah, reciter, lang = 'en' }) {
  const s = Math.floor(Number(surah));
  const raw = typeof reciter === 'string' ? reciter : '';
  return {
    title: Number.isFinite(s) ? `Surah ${s}` : 'Qur\u2019an recitation',
    // Callers pass a display name; ids that slip through resolve through
    // the same display-name map as verse sessions (never raw on screens).
    artist: reciterDisplayName(raw, lang) || raw,
    album: '',
    artwork: [...SESSION_ARTWORK],
  };
}

function api() {
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaSession) return navigator.mediaSession;
  } catch {
    /* hostile/partial navigator — treat as absent */
  }
  return null;
}

/** Publish (or clear, with null) the platform metadata. Returns true when applied. */
export function syncMetadata(meta) {
  const m = api();
  if (!m) return false;
  try {
    m.metadata = meta && typeof meta.title === 'string' ? new MediaMetadata(meta) : null;
    m.playbackState = meta ? 'playing' : 'none';
    return true;
  } catch {
    return false;
  }
}

/** Clear the platform slot (session over / player closed). */
export function clearMetadata() {
  return syncMetadata(null);
}

/**
 * Honest lock-screen transport state derived from the store (v5.2.67,
 * item 23): the verse session wins when active — echo "your turn" pauses
 * count as paused — else the full-surah track, else none. Pure, so the
 * subscriber and unit tests share one answer.
 */
export function desiredPlayingState(state) {
  const sp = state?.surahPlayback;
  if (sp?.active) return sp.paused === true || sp.waiting === true ? 'paused' : 'playing';
  const p = state?.player;
  if (!p?.moshafId) return 'none';
  return p.playing ? 'playing' : 'paused';
}

let lastPlayingState = null;

/**
 * Publish desiredPlayingState, touching the platform slot only on change
 * (the subscriber runs on every dispatch — an unconditional assignment
 * per keystroke would be pure platform chatter).
 */
export function syncPlayingState(state) {
  const want = desiredPlayingState(state);
  if (want === lastPlayingState) return want;
  lastPlayingState = want;
  const m = api();
  if (m) {
    try {
      m.playbackState = want;
    } catch {
      /* hostile/partial implementation — the next change retries */
    }
  }
  return want;
}

/** Reset the playback-state latch (tests only). */
export function _resetPlayingStateForTests() {
  lastPlayingState = null;
}

let handlersInstalled = false;

/**
 * Install lock-screen prev/next/play-pause exactly once. Callbacks stay in
 * app-land (this module never imports the store or the engines).
 */
export function installMediaHandlers({ onPrev, onNext, onToggle } = {}) {
  const m = api();
  if (!m || handlersInstalled) return false;
  try {
    if (typeof onPrev === 'function') m.setActionHandler('previoustrack', onPrev);
    if (typeof onNext === 'function') m.setActionHandler('nexttrack', onNext);
    if (typeof onToggle === 'function') {
      m.setActionHandler('play', onToggle);
      m.setActionHandler('pause', onToggle);
    }
    handlersInstalled = true;
    return true;
  } catch {
    return false;
  }
}

/** Reset the once-latch (tests only). */
export function _resetMediaHandlersForTests() {
  handlersInstalled = false;
}
