/**
 * domain/quiz.js — pure quiz-memory helpers (no DOM, no store).
 *
 * quizMissRecords is the cross-session half of Review-mistakes: every
 * wrong answer upserts { m: misses, l: last-miss day } under the item id;
 * a later correct answer clears it (re-learned). Bounded (200) and
 * hostile-shape sanitized like every other persisted map.
 */

import { dateKey, isSafeKey } from '../core/utils.js';

export const QUIZ_MISS_CAP = 200;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// Item-id shape (mirrors config/sanitize.js SAFE_ID_RE + hifz MEM_KEY_RES:
// slug chars only; isSafeKey alone still passes display strings).
const QUIZ_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isQuizId(k) {
  return typeof k === 'string' && QUIZ_ID_RE.test(k) && isSafeKey(k);
}

/** Item-id shape guard shared with the reducer's session miss list. */
export function isQuizItemId(k) {
  return isQuizId(k);
}

/** Sanitize a restored/imported miss map: { [safeKey]: { m, l } }. */
export function sanitizeQuizMissRecords(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= QUIZ_MISS_CAP) break;
    if (!isQuizId(k)) continue;
    const r = v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    if (!r) continue;
    const m = Math.floor(Number(r.m));
    const l = typeof r.l === 'string' && ISO_DAY.test(r.l) ? r.l : null;
    if (!Number.isFinite(m) || m < 1 || !l) continue;
    out[k] = { m: Math.min(9999, m), l };
  }
  return out;
}

/** Record one miss: upsert + refresh recency, pruned to the cap. Pure. */
export function recordQuizMiss(records, itemId, today = dateKey(new Date())) {
  const base = records && typeof records === 'object' && !Array.isArray(records) ? records : {};
  if (!isQuizId(itemId)) return base;
  const day = typeof today === 'string' && ISO_DAY.test(today) ? today : dateKey(new Date());
  const prev = base[itemId];
  const prevM = prev && Number.isFinite(Number(prev.m)) ? Math.floor(Number(prev.m)) : 0;
  const next = { ...base };
  delete next[itemId];
  next[itemId] = { m: Math.min(9999, prevM + 1), l: day };
  while (Object.keys(next).length > QUIZ_MISS_CAP) {
    const oldest = Object.keys(next)[0];
    delete next[oldest];
  }
  return next;
}

/** Clear one item (answered correctly — re-learned). Pure. */
export function clearQuizMiss(records, itemId) {
  if (!records || typeof records !== 'object' || typeof itemId !== 'string') return records || {};
  if (!Object.hasOwn(records, itemId)) return records;
  const next = { ...records };
  delete next[itemId];
  return next;
}

/** Review order: most-missed first, ties by most-recent miss. Capped. */
export function weakQuizIds(records, limit = 50) {
  if (!records || typeof records !== 'object') return [];
  const n = Math.floor(Number(limit));
  return Object.entries(records)
    .filter(([k, v]) => typeof k === 'string' && v && Number.isFinite(Number(v.m)))
    .sort(
      (a, b) =>
        Number(b[1].m) - Number(a[1].m) || String(b[1].l || '').localeCompare(String(a[1].l || ''))
    )
    .slice(0, Number.isFinite(n) && n > 0 ? n : 50)
    .map(([k]) => k);
}
