/**
 * domain/lastPosition.js — the unified "where was I" service (merged-plan item 2).
 *
 * Seven honest slots, one reader:
 *   quran ......... state.quranBookmark.surah (classic reader, 1..114)
 *   mushaf ........ state.mushafBookmark.page (book reader, 1..604)
 *   adhkar ........ state.lastPosition.adhkar { categoryId, itemId }
 *                   (stamped by HISTORY_PUSH; legacy readers fall back to
 *                   history[0], which is the same fact in older clothing)
 *   tasbih ........ state.lastPosition.tasbih { phraseId }
 *                   (stamped by TASBIH_SET_ACTIVE; falls back to the live
 *                   tasbih.activeItemId, which has always been persisted)
 *   hadith ........ state.lastPosition.hadith { bookId, n }
 *                   (stamped on hadith navigation)
 *   tajweedLesson . state.lastPosition.tajweedLesson { sessionId }
 *                   (stamped when a course session is opened / marked studied)
 *   tajweedRule ... state.lastPosition.tajweedRule { ruleId }
 *                   (stamped by practice results and rule drills)
 *
 * Pure and DOM-free. Absence is always null — never a guess, never a
 * placeholder id. A slot the reader never touched reads as "no previous
 * place", and Home answers that with al-Fatihah, not with fiction.
 */

export const LAST_POSITION_SLOTS = Object.freeze([
  'quran',
  'mushaf',
  'adhkar',
  'tasbih',
  'hadith',
  'tajweedLesson',
  'tajweedRule',
]);

const SAFE_SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;
const BOOK_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function isCleanKey(v, re = SAFE_SLUG_RE) {
  if (typeof v !== 'string' || !re.test(v)) return false;
  return v !== '__proto__' && v !== 'constructor' && v !== 'prototype';
}

function asTs(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** The persisted half: five explicit slots, all empty until earned. */
export function defaultLastPosition() {
  return {
    adhkar: null,
    tasbih: null,
    hadith: null,
    tajweedLesson: null,
    tajweedRule: null,
  };
}

function sanitizeAdhkar(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const categoryId =
    typeof raw.categoryId === 'string' && raw.categoryId.length <= 64 ? raw.categoryId : '';
  const itemId = typeof raw.itemId === 'string' && raw.itemId.length <= 128 ? raw.itemId : '';
  if (!categoryId || !itemId) return null;
  // Prototype-shaped values never become positions (rendered or keyed).
  if (['__proto__', 'constructor', 'prototype'].includes(categoryId)) return null;
  if (['__proto__', 'constructor', 'prototype'].includes(itemId)) return null;
  return { categoryId, itemId, ts: asTs(raw.ts) };
}

function sanitizeTasbih(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const phraseId =
    typeof raw.phraseId === 'string' && raw.phraseId.length <= 80 ? raw.phraseId : '';
  if (!phraseId) return null;
  if (['__proto__', 'constructor', 'prototype'].includes(phraseId)) return null;
  return { phraseId, ts: asTs(raw.ts) };
}

function sanitizeHadith(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!isCleanKey(raw.bookId, BOOK_ID_RE)) return null;
  const n = Math.floor(Number(raw.n));
  if (!Number.isFinite(n) || n < 1 || n > 999999) return null;
  return { bookId: raw.bookId, n, ts: asTs(raw.ts) };
}

function sanitizeTajweedLesson(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!isCleanKey(raw.sessionId)) return null;
  return { sessionId: raw.sessionId, ts: asTs(raw.ts) };
}

function sanitizeTajweedRule(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!isCleanKey(raw.ruleId)) return null;
  return { ruleId: raw.ruleId, ts: asTs(raw.ts) };
}

/**
 * Restore-time twin of the slice validators: a crafted backup can only
 * smuggle well-shaped ids, never markup, never a prototype key. Hostile
 * shapes degrade to null (honest absence), never to a crash.
 */
export function sanitizeLastPosition(raw) {
  const d = defaultLastPosition();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  return {
    adhkar: sanitizeAdhkar(raw.adhkar),
    tasbih: sanitizeTasbih(raw.tasbih),
    hadith: sanitizeHadith(raw.hadith),
    tajweedLesson: sanitizeTajweedLesson(raw.tajweedLesson),
    tajweedRule: sanitizeTajweedRule(raw.tajweedRule),
  };
}

function readQuranSlot(state) {
  const s = state?.quranBookmark?.surah;
  const str = String(s ?? '').trim();
  const n = /^\d{1,3}$/.test(str) ? Number(str) : 0;
  if (!(n >= 1 && n <= 114)) return null;
  return { surah: String(n), ts: asTs(state.quranBookmark.ts) };
}

function readMushafSlot(state) {
  const p = Math.floor(Number(state?.mushafBookmark?.page));
  if (!Number.isFinite(p) || p < 1 || p > 604) return null;
  return { page: p, ts: asTs(state.mushafBookmark.ts) };
}

function readAdhkarSlot(state) {
  const explicit = sanitizeAdhkar(state?.lastPosition?.adhkar);
  if (explicit) return explicit;
  // Legacy readers predate the explicit slot: history[0] is the same
  // lived fact (most-recent item opened), not a reconstruction.
  const h0 = Array.isArray(state?.history) ? state.history[0] : null;
  if (h0 && typeof h0 === 'object') return sanitizeAdhkar(h0);
  return null;
}

function readTasbihSlot(state) {
  const explicit = sanitizeTasbih(state?.lastPosition?.tasbih);
  if (explicit) return explicit;
  const activeId = state?.tasbih?.activeItemId;
  if (typeof activeId === 'string' && activeId && activeId.length <= 80) {
    return { phraseId: activeId, ts: null };
  }
  return null;
}

/**
 * Read all seven slots from live state. Each value is either a small
 * validated object or null (never touched / never valid). No network,
 * no lookup tables — display names resolve at the rendering edge.
 */
export function readLastPositions(state) {
  const s = state && typeof state === 'object' ? state : {};
  return {
    quran: readQuranSlot(s),
    mushaf: readMushafSlot(s),
    adhkar: readAdhkarSlot(s),
    tasbih: readTasbihSlot(s),
    hadith: sanitizeHadith(s.lastPosition?.hadith),
    tajweedLesson: sanitizeTajweedLesson(s.lastPosition?.tajweedLesson),
    tajweedRule: sanitizeTajweedRule(s.lastPosition?.tajweedRule),
  };
}

/** True when at least one slot holds a real place. */
export function hasAnyLastPosition(state) {
  return Object.values(readLastPositions(state)).some((slot) => slot !== null);
}
