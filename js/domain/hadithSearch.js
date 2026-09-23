/**
 * hadithSearch.js (v5.2.57)
 * Cross-book ranked hadith search — the per-book substring filter in
 * services/hadith.js only ever sees one open book. This module indexes
 * every LOADED book document and ranks across all of them, reusing the
 * quranSearch honesty pattern:
 *  - every query term must appear somewhere in the hadith (AND);
 *  - exact phrase matches outrank scattered term matches;
 *  - Arabic and English weigh equally per term, translation-first totals.
 *
 * Two deliberate differences from quranSearch: Arabic matching uses the
 * plain normalizeSearch pipeline with NO alef elision (hadith orthography
 * is fully vocalized classical text, and services/hadith.js matches it
 * the same way — both sides stay consistent); tiebreaks are bookId asc +
 * number asc (books have no numeric order).
 *
 * The index stores only what ranking needs (book id, number, normalized
 * haystacks). Raw texts re-read from state.hadith.docs at render time so
 * display never depends on this module's memory copies. Grades/isnad are
 * absent upstream (the validator strips rows to {n,b,ar,en}) — ranking
 * never pretends they exist; that pipeline is item 19's work.
 */

import { normalizeSearch } from '../core/utils.js';

let hadithRecords = []; // [{ bookId, n, hayAr, hayEn }]
let indexedBookIds = [];

/**
 * Build (or rebuild) the index from a loaded-docs map of shape
 * { [bookId]: { hadiths: [{ n, ar, en }] } }. Malformed books and rows
 * drop out defensively. Returns { books, records } counts.
 */
export function buildHadithIndex(docs) {
  hadithRecords = [];
  indexedBookIds = [];
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) {
    return { books: 0, records: 0 };
  }
  for (const [bookId, doc] of Object.entries(docs)) {
    if (typeof bookId !== 'string' || !bookId || !doc || !Array.isArray(doc.hadiths)) continue;
    let kept = 0;
    for (const h of doc.hadiths) {
      if (!h || typeof h !== 'object') continue;
      const n = Number(h.n);
      if (!Number.isFinite(n)) continue;
      const ar = typeof h.ar === 'string' ? h.ar : '';
      const en = typeof h.en === 'string' ? h.en : '';
      if (!ar && !en) continue;
      hadithRecords.push({
        bookId,
        n,
        hayAr: normalizeSearch(ar),
        hayEn: normalizeSearch(en),
      });
      kept += 1;
    }
    if (kept) indexedBookIds.push(bookId);
  }
  return { books: indexedBookIds.length, records: hadithRecords.length };
}

/** Drop the whole index (tests + RESET-path hygiene). */
export function resetHadithIndex() {
  hadithRecords = [];
  indexedBookIds = [];
}

/** Coverage readout for honest scope lines ("N of M books"). */
export function hadithIndexStats() {
  return { books: [...indexedBookIds], records: hadithRecords.length };
}

// (v4.2 quranSearch lesson) MEMOIZED on the last (query, limit): the scan
// is fast but it ran on every re-render while a query stood.
let lastSearch = { query: null, limit: 0, results: null };

/**
 * Search the indexed books. Returns [{ bookId, n, score }] by relevance.
 * Empty/whitespace queries and empty indexes return [] (never the corpus).
 */
export function searchHadith(query, { limit = 10 } = {}) {
  const resultLimit = limit == null ? Infinity : Number(limit);
  const safeLimit = Number.isFinite(resultLimit) ? Math.max(0, resultLimit) : Infinity;
  const raw = String(query ?? '');
  if (!raw.trim() || !hadithRecords.length) return [];
  if (lastSearch.query === raw && lastSearch.limit === safeLimit && lastSearch.results) {
    return lastSearch.results;
  }
  const terms = normalizeSearch(raw).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const phrase = terms.join(' ');

  const results = [];
  for (const rec of hadithRecords) {
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      const inTrans = rec.hayEn.includes(term);
      const inArabic = rec.hayAr.includes(term);
      if (!inTrans && !inArabic) {
        allMatch = false;
        break;
      }
      if (inTrans) score += 3;
      if (inArabic) score += 2;
    }
    if (!allMatch) continue;
    // Exact multi-word phrase (either language) strongly outranks scatter.
    if (rec.hayAr.includes(phrase) || rec.hayEn.includes(phrase)) score += 8;
    results.push({ bookId: rec.bookId, n: rec.n, score });
  }

  results.sort(
    (x, y) =>
      y.score - x.score || (x.bookId < y.bookId ? -1 : x.bookId > y.bookId ? 1 : 0) || x.n - y.n
  );
  const out = results.slice(0, safeLimit);
  lastSearch = { query: raw, limit: safeLimit, results: out };
  return out;
}

/**
 * (NF01-STUDY) Derive an honest text-search query from an ayah's Arabic:
 * the up-to-3 longest distinctive tokens (4+ Arabic letters, deduped).
 * Returns '' when nothing distinctive exists. Callers MUST label results
 * as text matches — there is no source-backed ayah↔hadith relation map.
 */
export function studyHadithQuery(arabicText) {
  const tokens = String(arabicText || '')
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, ' ')
    .split(/\s+/)
    // Length counts bare letters: tashkeel must not inflate a 2-letter
    // word into a "distinctive" query term.
    .filter((w) => w.replace(/[\u064B-\u0652\u0670\u0640]/g, '').length >= 4);
  const unique = [...new Set(tokens)].sort((a, b) => b.length - a.length);
  return unique.slice(0, 3).join(' ');
}
