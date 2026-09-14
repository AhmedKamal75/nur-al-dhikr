/**
 * domain/audioQueue.js — shared full-surah queue math (item 23, v5.2.67).
 *
 * The verse engine keeps its own range queue (surahPlayback.normalizeQueue
 * + advanceQueue); this module owns the full-surah side so the player,
 * the auto-advance and the repeat chip read one answer: which track is
 * next under a repeat mode, and how the repeat ladder cycles. Pure.
 */

/** Repeat modes for full-surah playback: walk once, repeat one, wrap all. */
export const REPEAT_MODES = Object.freeze(['off', 'one', 'all']);

export function normalizeRepeatMode(mode) {
  return REPEAT_MODES.includes(mode) ? mode : 'off';
}

/**
 * Next full-surah track number (1..114) under a repeat mode, or null at a
 * real end. Out-of-range input fails closed to null (never invents a track).
 */
export function resolveNextFullSurah(surah, repeat) {
  const s = Math.floor(Number(surah));
  if (!Number.isFinite(s) || s < 1 || s > 114) return null;
  const mode = normalizeRepeatMode(repeat);
  if (mode === 'one') return s;
  if (s < 114) return s + 1;
  return mode === 'all' ? 1 : null;
}

/** Repeat chip ladder: off → one → all → off. */
export function cycleRepeatMode(cur) {
  const modes = ['off', 'one', 'all'];
  return modes[(modes.indexOf(normalizeRepeatMode(cur)) + 1) % modes.length];
}
