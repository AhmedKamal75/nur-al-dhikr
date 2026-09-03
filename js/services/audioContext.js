/**
 * services/audioContext.js — the app's ONE lazily-created AudioContext.
 *
 * (v4.2) prayerSound, soundDesign, and tasbih each used to spin their own
 * context. Browsers cap concurrent AudioContexts per page (~4–6, tighter on
 * Safari), and each context also carries its own hardware audio thread —
 * three modules racing toward that cap is exactly the kind of silent
 * failure ("no sound on the third feature, only on real devices") that
 * never reproduces in a dev session. One shared context, created on first
 * use, resumed by the browser's autoplay policy on the user gesture that
 * triggered the sound (every caller fires from a tap).
 */

let audioCtx = null;

/** The shared context, created on first call. Returns null when the
 *  environment has no AudioContext at all (older browsers, test runs) —
 *  callers treat null as "stay silent", never an error. */
export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

/** Test seam — drops the shared context so tests can start clean. */
export function _resetAudioContextForTests() {
  audioCtx = null;
}
