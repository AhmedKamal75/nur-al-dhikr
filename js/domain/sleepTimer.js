/**
 * sleepTimer.js (v4.4)
 * Listen-mode sleep timer — a pure state machine the audio engine drives.
 * Continuous multi-surah playback runs until the timer elapses, then the
 * last 90 seconds fade to silence before a hard stop (a cliff-edge stop
 * mid-recitation is jarring; the fade is the audio equivalent of a soft
 * landing).
 *
 * The volume curve is deliberately linear over the fade window: recitation
 * audio has long quiet passages, and a perceptual (exponential) curve
 * makes the fade inaudible almost immediately at these durations.
 */

export const SLEEP_TIMER_CHOICES = Object.freeze([15, 30, 45, 60]);
export const FADE_SECONDS = 90;

/** A fresh, inert timer state. */
export function initialTimerState() {
  return { enabled: false, minutes: 30, endsAtMs: null, lastTickMs: null };
}

/** Arm the timer (call at playback start or when the user sets minutes). */
export function armTimer(state, minutes, nowMs = Date.now()) {
  const m = SLEEP_TIMER_CHOICES.includes(minutes) ? minutes : 30;
  return { ...initialTimerState(), enabled: true, minutes: m, endsAtMs: nowMs + m * 60_000 };
}

/** Clear the timer. */
export function clearTimer() {
  return initialTimerState();
}

/**
 * Volume for a given moment: 1 until the fade window opens, then a linear
 * ramp to 0 at endsAtMs. Returns 0 past the end (the engine stops).
 */
export function volumeAt(state, nowMs = Date.now()) {
  if (!state?.enabled || !state.endsAtMs) return 1;
  const remainingMs = state.endsAtMs - nowMs;
  if (remainingMs <= 0) return 0;
  if (remainingMs > FADE_SECONDS * 1000) return 1;
  return Math.max(0, remainingMs / (FADE_SECONDS * 1000));
}

/** Human countdown label (mm:ss or h:mm:ss) for the UI. */
export function countdownLabel(state, nowMs = Date.now()) {
  if (!state?.enabled || !state.endsAtMs) return '';
  const s = Math.max(0, Math.round((state.endsAtMs - nowMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
