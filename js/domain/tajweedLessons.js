/**
 * domain/tajweedLessons.js (v5.10.1) — guided rule lessons. A lesson is
 * the rule's own scholarly definition (domain/tajweed.js, EN+AR) plus
 * example ayahs drawn from the drill pool itself — never invented refs.
 * Example entries are validated (surah/ayah ints in range); hostile pool
 * rows fall off, and an empty pool yields an empty example list with the
 * drill button as the way forward.
 */
import { tajweedRule } from './tajweed.js';

/** Lesson example count shown under each rule. */
export const LESSON_EXAMPLE_COUNT = 3;

/**
 * Validated [{ s, a }] example refs for a rule from a loaded pool.
 * Pure — the handler reads state.tajweedPool, the view renders refs.
 */
export function tajweedLessonExamples(pool, ruleId, count = LESSON_EXAMPLE_COUNT) {
  const list = pool?.byRule?.[ruleId];
  if (!Array.isArray(list)) return [];
  const n = Math.max(1, Math.min(10, Math.floor(Number(count)) || LESSON_EXAMPLE_COUNT));
  const out = [];
  const seen = new Set();
  for (const e of list) {
    if (out.length >= n) break;
    const s = Math.floor(Number(e?.s));
    const a = Math.floor(Number(e?.a));
    if (!Number.isFinite(s) || s < 1 || s > 114) continue;
    if (!Number.isFinite(a) || a < 1 || a > 286) continue;
    const key = `${s}:${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ s, a });
  }
  return out;
}

/** The rule for a lesson id, or null for unknown ids (mixed/review included). */
export function tajweedLessonRule(ruleId) {
  return typeof ruleId === 'string' ? tajweedRule(ruleId) : null;
}
