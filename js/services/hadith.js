/**
 * hadith.js
 * The Ahadeeth library engine: book registry, lazy-loading orchestration
 * primitives, chapter/pagination/filter helpers, and the deterministic
 * daily-hadith picker. Deliberately DOM-free so it is directly unit-testable
 * (tests/hadith.test.js) — views/hadith.js owns all rendering.
 *
 * DATA: data/hadith/index.json + one file per book (Sahih al-Bukhari, Sahih
 * Muslim, the Forty of an-Nawawi, Forty Hadith Qudsi), built by
 * scripts/build-hadith.mjs from public-domain collection texts. Every text
 * field is DATA, never markup — views must escapeHTML() anything they render
 * from a book document, exactly like the adhkar libraries treat content.
 *
 * OFFLINE STRATEGY (mirrors the tafsir on-demand precedent): the small
 * bundled books (nawawi, qudsi) + the index are SW-precached, so the daily
 * hadith works with zero network ever. The two big Sahihs load on first
 * open and the service worker caches them forever after — offline from the
 * first visit onwards, without inflating the install by ~24MB.
 */

import { normalizeSearch } from '../core/utils.js';

/** Small precached books eligible for the daily hadith card. */
export const HADITH_DAILY_BOOKS = ['nawawi', 'qudsi'];

/** Hadith cards per page in the book reader. */
export const HADITH_PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/* Validation — fetched JSON is untrusted input                        */
/* ------------------------------------------------------------------ */

/**
 * Shape-check a fetched index.json. Returns a normalized {books:[...]} or
 * null — a poisoned/hand-edited file must degrade to "library unavailable",
 * never crash the render loop. Books without an id/name/count are dropped.
 */
export function validateHadithIndex(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!Array.isArray(raw.books)) return null;
  const books = raw.books
    .filter(
      (b) =>
        b &&
        typeof b === 'object' &&
        typeof b.id === 'string' &&
        /^[a-z0-9-]{1,40}$/.test(b.id) && // id doubles as a URL path segment
        b.name &&
        typeof b.name === 'object' &&
        typeof (b.count ?? b.hadithCount) === 'number' &&
        Number.isFinite(b.count ?? b.hadithCount)
    )
    .map((b) => ({
      id: b.id,
      name: { en: String(b.name?.en ?? b.id), ar: String(b.name?.ar ?? b.name?.en ?? b.id) },
      author: { en: String(b.author?.en ?? ''), ar: String(b.author?.ar ?? '') },
      blurb: { en: String(b.blurb?.en ?? ''), ar: String(b.blurb?.ar ?? '') },
      count: b.count ?? b.hadithCount,
      sectionCount: Number.isFinite(b.sectionCount) ? b.sectionCount : 0,
      bundled: b.bundled === true,
      order: Number.isFinite(b.order) ? b.order : 99,
      file: typeof b.file === 'string' && b.file.startsWith('data/hadith/') ? b.file : null,
    }))
    .sort((a, b) => a.order - b.order);
  return books.length ? { books } : null;
}

/**
 * Shape-check a fetched book document. Returns a normalized doc or null.
 * `hadiths` rows are kept as compact {n,b,ar,en}; rows missing BOTH texts
 * or a finite number are dropped; the array order is preserved (the books
 * ship in canonical order and pagination relies on that stability).
 */
export function validateHadithDoc(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(raw.id)) return null;
  if (!Array.isArray(raw.hadiths) || !raw.hadiths.length) return null;
  const hadiths = [];
  for (const h of raw.hadiths) {
    if (!h || typeof h !== 'object') continue;
    const n = Number(h.n);
    if (!Number.isFinite(n)) continue;
    const ar = typeof h.ar === 'string' ? h.ar : '';
    const en = typeof h.en === 'string' ? h.en : '';
    if (!ar && !en) continue;
    hadiths.push({ n, b: String(h.b ?? ''), ar, en });
  }
  if (!hadiths.length) return null;
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .filter((s) => s && typeof s === 'object' && typeof s.id === 'string')
        .map((s) => ({ id: s.id, name: String(s.name ?? ''), count: Number(s.count) || 0 }))
    : [];
  return {
    id: raw.id,
    name: {
      en: String(raw.name?.en ?? raw.id),
      ar: String(raw.name?.ar ?? raw.name?.en ?? raw.id),
    },
    author: { en: String(raw.author?.en ?? ''), ar: String(raw.author?.ar ?? '') },
    blurb: { en: String(raw.blurb?.en ?? ''), ar: String(raw.blurb?.ar ?? '') },
    sections,
    hadiths,
  };
}

/* ------------------------------------------------------------------ */
/* Book-reading helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Filter a book's hadiths by chapter id ('all' = everything) and a free-text
 * query. Matching folds diacritics/alef-forms on both sides via
 * normalizeSearch — the shipped Arabic is FULLY vocalized, so a person
 * typing a bare form without the vocalization must still hit. Returns the filtered hadith array IN DOCUMENT ORDER —
 * callers slice pages out of it.
 *
 * (v4.2) PERFORMANCE: normalizeSearch runs 4–6 regex passes per string, and
 * this filter used to run it over EVERY hadith's ar+en on EVERY render —
 * measured ~250ms per pass over Bukhari's 7,580 rows on desktop (≈1s of
 * main-thread freeze on mid-range Android), on every debounced keystroke
 * AND on every unrelated dispatch while a queried book was open. Haystacks
 * are now pre-normalized ONCE per loaded book (WeakMap keyed on the doc —
 * restore/wipe swaps the doc object, so the cache can never go stale) and
 * matching is a plain .includes() scan. Built lazily on the first query,
 * so section-only browsing never pays the normalization cost.
 */
const normalizedHaystacks = new WeakMap();
// (v4.3) test probe: counts cache BUILDS so the memo test can prove the
// second query is served from the cache (identical results alone cannot).
let haystackBuilds = 0;

export function _haystackBuildsForTests() {
  return haystackBuilds;
}

function haystacksFor(doc) {
  let cache = normalizedHaystacks.get(doc);
  if (!cache) {
    haystackBuilds += 1;
    cache = doc.hadiths.map((h) => ({
      n: String(h.n),
      ar: normalizeSearch(h.ar || ''),
      en: normalizeSearch(h.en || ''),
    }));
    normalizedHaystacks.set(doc, cache);
  }
  return cache;
}

export function filterHadiths(doc, { query = '', section = 'all' } = {}) {
  if (!doc || !Array.isArray(doc.hadiths)) return [];
  const q = typeof query === 'string' ? normalizeSearch(query) : '';
  const sec = typeof section === 'string' ? section : 'all';
  if (!q && sec === 'all') return doc.hadiths;
  if (!q) return doc.hadiths.filter((h) => h.b === sec);
  const hay = haystacksFor(doc);
  const out = [];
  for (let i = 0; i < doc.hadiths.length; i++) {
    if (sec !== 'all' && doc.hadiths[i].b !== sec) continue;
    if (hay[i].ar.includes(q) || hay[i].en.includes(q) || hay[i].n.includes(q))
      out.push(doc.hadiths[i]);
  }
  return out;
}

/** 1-based page count for a filtered list. */
export function pageCount(filtered) {
  return Math.max(1, Math.ceil((filtered?.length ?? 0) / HADITH_PAGE_SIZE));
}

/** Clamp any hostile/edge page input into [1, pageCount]. */
export function clampPage(page, filtered) {
  const n = Math.floor(Number(page));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(pageCount(filtered), n);
}

/**
 * Which 1-based page must be visible so that hadith number `n` is on screen?
 * Returns null when the book doesn't contain that number (bad deep link).
 * Linear scan is fine: books are ordered, and even Bukhari's 7,580 rows are
 * nothing to a modern device — but we stop at the first hit anyway.
 */
export function pageForNumber(doc, n, section = 'all', query = '') {
  if (!doc || !Number.isFinite(Number(n))) return null;
  const target = Number(n);
  const idx = doc.hadiths.findIndex((h) => h.n === target);
  if (idx === -1) return null;
  // Page over the CURRENTLY FILTERED list: locate that hadith's position in
  // it. If a filter hides it, fall back to its position in the full list —
  // clearing filters is the user's next obvious step; crashing isn't.
  const filtered = filterHadiths(doc, { query, section });
  const inFiltered = filtered.findIndex((h) => h.n === target);
  const pos = inFiltered !== -1 ? inFiltered : idx;
  return Math.floor(pos / HADITH_PAGE_SIZE) + 1;
}

/* ------------------------------------------------------------------ */
/* Daily hadith — deterministic, offline-safe, zero randomness         */
/* ------------------------------------------------------------------ */

/**
 * 'YYYY-MM-DD' -> a stable integer seed. Same shape as utils.dateKey so it
 * composes with the app's existing "same all day, changes at midnight"
 * pattern (verse of the day, streaks) without importing app-only modules.
 */
export function daySeed(dateKey) {
  const parts = String(dateKey ?? '').split('-');
  const y = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const d = parseInt(parts[2], 10) || 0;
  return y * 372 + m * 31 + d;
}

/**
 * Pick today's daily hadith source: a deterministic (book, hadith) pair over
 * the bundled small books only — so the Home card never forces a multi-MB
 * Sahih download just to greet you. Requires the book doc to be loaded;
 * returns null otherwise (callers ensure the load first).
 */
export function pickDailyHadith(books, docs, dateKey) {
  const pool = (books || []).filter((b) => HADITH_DAILY_BOOKS.includes(b.id));
  const usable = pool.filter((b) => {
    const doc = docs?.[b.id];
    return doc && Array.isArray(doc.hadiths) && doc.hadiths.length;
  });
  if (!usable.length) return null;
  const seed = daySeed(dateKey);
  const book = usable[seed % usable.length];
  const doc = docs[book.id];
  return { bookId: book.id, hadith: doc.hadiths[seed % doc.hadiths.length] };
}
