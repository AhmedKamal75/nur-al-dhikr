/**
 * services/dhikrAudio.js — single-shot per-dhikr recitation playback.
 * (v5.17.30, OPEN-ISSUES #15 infra only — zero licensed clips ship.)
 *
 * Deliberately NOT the full-surah session (services/player.js,
 * services/recitation.js, app/audioEngine.js): no queue, no repeat, no
 * session state, no lock-screen metadata, and NO IndexedDB caching — clips
 * stream (`preload = 'none'`) and are never stored, so there is no cache
 * budget, no eviction, and no offline story beyond "streaming needs a
 * connection" (recorded in docs/DATA-SCHEMA.md). One shared element:
 * starting a second clip stops the first (play-once).
 *
 * Fail-closed: playDhikrAudio re-verifies the url through
 * hasVerifiedDhikrAudio, so a caller that skipped the render gate still
 * cannot start an http/javascript/data URL. Stateful side effects only —
 * pure shape validation lives in core/schema.js.
 */

import { hasVerifiedDhikrAudio } from '../core/schema.js';

let el = null;
let currentItemId = null;
let currentUrl = null;
let endHandler = null;
let errorHandler = null;

function detach(element) {
  if (endHandler) element.removeEventListener('ended', endHandler);
  if (errorHandler) element.removeEventListener('error', errorHandler);
  endHandler = null;
  errorHandler = null;
}

/**
 * Play one verified clip once. Returns 'started', 'invalid' (url failed
 * the gate — caller must revert any optimistic UI), or 'unsupported'
 * (no Audio in this host — caller falls back to a toast).
 * AudioImpl is injectable so node tests can drive the driver with a fake.
 */
export function playDhikrAudio(
  { itemId, url },
  { AudioImpl = typeof Audio !== 'undefined' ? Audio : null, onEnd, onError } = {}
) {
  if (!hasVerifiedDhikrAudio({ audio: { url } })) {
    return 'invalid';
  }
  if (!AudioImpl) {
    onError?.(new Error('audio-unsupported'));
    return 'unsupported';
  }
  stopDhikrAudio();

  const element = new AudioImpl();
  // Streaming-only: never preload, never hand the bytes to audioStore.
  try {
    element.preload = 'none';
  } catch {
    /* a minimal fake may not take props — harmless */
  }
  currentItemId = itemId != null ? String(itemId) : null;
  currentUrl = url;
  endHandler = () => {
    const finished = currentItemId;
    stopDhikrAudio();
    if (finished != null) onEnd?.(finished);
  };
  // A source that errors on load (dead URL, offline mid-fetch) reports
  // through onError so the caller can offer a Retry — never a silent stop.
  errorHandler = () => {
    const failed = currentItemId;
    stopDhikrAudio();
    if (failed != null) onError?.(new Error('audio-error'));
  };
  element.addEventListener('ended', endHandler);
  element.addEventListener('error', errorHandler);
  try {
    element.src = url;
  } catch {
    /* setting src on a fake must not throw past us */
  }
  el = element;
  let played = null;
  try {
    played = element.play();
  } catch {
    played = null;
  }
  // Autoplay rejection (or any synchronous play failure) is a failure,
  // not a hang: report it so the caller reverts + toasts with Retry.
  // `played` may be undefined on old hosts — only a real promise rejection
  // counts; a missing promise means "assume started".
  if (played && typeof played.catch === 'function') {
    played.catch(() => {
      // Only this generation's failure: a second play() in between already
      // detached our listeners via stopDhikrAudio.
      if (el === element) {
        const failed = currentItemId;
        stopDhikrAudio();
        if (failed != null) onError?.(new Error('play-rejected'));
      }
    });
  }
  return 'started';
}

/** Stop any in-flight clip and clear the highlight identity. Idempotent. */
export function stopDhikrAudio() {
  if (el) {
    detach(el);
    try {
      el.pause();
    } catch {
      /* already stopped / fake — harmless */
    }
    try {
      el.removeAttribute('src');
    } catch {
      /* minimal fakes may lack attributes — harmless */
    }
    el = null;
  }
  currentItemId = null;
  currentUrl = null;
}

/** True only when the given item's clip is the live one. */
export function isPlayingDhikrAudioItem(itemId) {
  return el != null && currentItemId != null && currentItemId === String(itemId);
}

/** The live clip's item id, or null when idle. Test seam. */
export function currentDhikrAudioItemId() {
  return currentItemId;
}

/** The live clip's url, or null when idle. Test seam. */
export function currentDhikrAudioUrl() {
  return currentUrl;
}

/** Test-only: reset module state between cases. */
export function resetDhikrAudioForTests() {
  stopDhikrAudio();
}
