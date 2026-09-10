/**
 * domain/readerWindow.js — classic-reader ayah windowing, pure.
 *
 * (v5.2.17) The last module-scoped view state (B12): views/quran.js kept
 * a `readerWindow` latch that render mutated while rendering, which is
 * why the store, the sanitizers, and the tests could not see it. The
 * memory now lives in the ephemeral `state.readerWindow` slice; this
 * module owns the pure transition math, the reducer owns validation,
 * and app/stateSub.js derives-then-renders (dispatch only on change,
 * so quiet ticks cost a few integer comparisons and no extra render).
 *
 * Why the reader renders ~30 ayahs, not the whole surah: Al-Baqarah is
 * 286 ayah cards ≈ 1.1MB of HTML, and the string-render engine rebuilt
 * all of it on every dispatch — including one dispatch per ayah during
 * continuous recitation. Two honest "show more" sentinels extend the
 * window, deep links center it, and the reciting ayah slides it forward.
 * Short surahs (median 17 ayahs) render whole and never see a sentinel.
 */

/** Ayahs in the DOM window. */
export const READER_WINDOW_SIZE = 30;

/** Fresh window memory (matches the old module latch's reset shape). */
export function initialReaderWindow() {
  return { surah: null, from: 1, to: READER_WINDOW_SIZE, ayParam: null };
}

/** Shape-guard a window from anywhere (store, tests, future callers). */
export function sanitizeWindow(win) {
  const w = win && typeof win === 'object' && !Array.isArray(win) ? win : {};
  const from = Math.max(1, Math.floor(Number(w.from)) || 1);
  const to = Math.max(from, Math.floor(Number(w.to)) || from);
  // (null stays null: Number(null) is 0, and a 0-vs-null latch mismatch
  // would make the subscriber derive-then-dispatch forever.)
  const ayParam =
    w.ayParam == null ? null : Number.isFinite(Number(w.ayParam)) ? Number(w.ayParam) : null;
  return {
    surah: typeof w.surah === 'string' ? w.surah.slice(0, 16) : null,
    from,
    to,
    ayParam,
  };
}

function centerOn(key, c, ayParam, total) {
  const from = Math.max(1, Math.min(c - 10, Math.max(1, total - 9)));
  return {
    surah: key,
    from,
    to: Math.min(total, from + READER_WINDOW_SIZE - 1),
    ayParam,
  };
}

/**
 * Pure transition: given the previous window and the volatile signals,
 * return the next window object, or null when nothing changed (so the
 * caller can skip the dispatch entirely). Faithful port of the old
 * render-time latch: surah switch centers, a NEW deep link re-centers
 * exactly once, follow-along slides near either edge, and whatever
 * stands adopts the current ay param as its latch so a later manual
 * "show more" is never undone by a stale-param check.
 */
export function computeReaderWindow(prev, { key, ayParam, recitingAyah, total }) {
  const base = sanitizeWindow(prev);
  const totalInt = Math.max(1, Math.floor(Number(total)) || 1);
  const recite = Math.floor(Number(recitingAyah)) || 0;
  if (base.surah !== key) return centerOn(key, ayParam || 1, ayParam, totalInt);
  if (ayParam !== null && ayParam !== base.ayParam)
    return centerOn(key, ayParam, ayParam, totalInt);
  if (recite > 0 && (recite > base.to - 5 || recite < base.from))
    return centerOn(key, recite, ayParam, totalInt);
  if (ayParam !== base.ayParam) return { ...base, ayParam };
  return null;
}

/**
 * Manual sentinel extension: `from` clamps at ayah 1, `to` grows
 * unclamped exactly like the old latch (the view's read clamps it into
 * the surah — keeping the latch unclamped preserves the old
 * recitation-edge interplay bit-for-bit near the surah end).
 */
export function expandWindow(prev, dir) {
  const base = sanitizeWindow(prev);
  if (dir === 'up') return { ...base, from: Math.max(1, base.from - READER_WINDOW_SIZE) };
  return { ...base, to: base.to + READER_WINDOW_SIZE };
}

/**
 * Defensive read for the view: clamp a stored window into [1, total].
 * A missing slice (hand-made test states that predate it) renders the
 * fresh-open first window — exactly what the old module latch produced
 * on its first call.
 */
export function readWindow(win, total) {
  const totalInt = Math.max(1, Math.floor(Number(total)) || 1);
  if (win == null) return { from: 1, to: Math.min(totalInt, READER_WINDOW_SIZE) };
  const base = sanitizeWindow(win);
  return {
    ...base,
    from: Math.min(Math.max(1, base.from), totalInt),
    to: Math.min(Math.max(1, base.to), totalInt),
  };
}
