/**
 * services/mediaSession.js — lock-screen / headset / notification-shade
 * controls for recitation (Media Session API, no backend, fully local).
 *
 * Pure metadata builders (unit-tested) + thin guarded sync: every touch of
 * `navigator.mediaSession` is feature-detected, so browsers without it
 * (or Node under test) simply get silence instead of an exception. The
 * engine owns audio; this module only ADVERTISES it to the platform.
 */

export function verseMetadata({ surah, ayah, total, reciter }) {
  const s = Math.floor(Number(surah));
  const a = Math.floor(Number(ayah));
  const t = Math.floor(Number(total));
  return {
    title:
      Number.isFinite(s) && Number.isFinite(a)
        ? `Surah ${s} · Ayah ${a}${Number.isFinite(t) && t > 0 ? `/${t}` : ''}`
        : 'Qur\u2019an recitation',
    artist: typeof reciter === 'string' && reciter ? reciter : '',
    album: '',
  };
}

export function fullSurahMetadata({ surah, reciter }) {
  const s = Math.floor(Number(surah));
  return {
    title: Number.isFinite(s) ? `Surah ${s}` : 'Qur\u2019an recitation',
    artist: typeof reciter === 'string' && reciter ? reciter : '',
    album: '',
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

let handlersInstalled = false;

/**
 * Install lock-screen prev/next exactly once. Callbacks stay in app-land
 * (this module never imports the store or the engines).
 */
export function installMediaHandlers({ onPrev, onNext } = {}) {
  const m = api();
  if (!m || handlersInstalled) return false;
  try {
    if (typeof onPrev === 'function') m.setActionHandler('previoustrack', onPrev);
    if (typeof onNext === 'function') m.setActionHandler('nexttrack', onNext);
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
