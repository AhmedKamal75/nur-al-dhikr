/**
 * quranSearch.js
 * Full-text search across the entire Qur'an — the Uthmani Arabic text
 * (diacritic-insensitive, via stripQuranAnnotations + normalizeSearch) and
 * the bundled Sahih International translation. (v3.6: closes the single
 * biggest study gap called out in TODO.md.)
 *
 * Design notes:
 *  - The index lives at module scope exactly like search.js's library
 *    index; it is built ONCE from whatever surah documents are already in
 *    state.quran.surahs plus the full 114-surah corpus fetched by app.js's
 *    ensureQuranSearchData() on first use (~2.7MB of local JSON, SW-cached
 *    after the first fetch so later searches work offline).
 *  - Ranking mirrors the library search's honesty rules: every term must
 *    appear somewhere in the ayah (AND semantics); exact phrase matches
 *    outrank scattered term matches; Arabic and translation weigh equally.
 *  - Arabic matching is ALEF-ELIDED on both sides identically: Uthmani
 *    orthography and what a person actually types disagree about WHERE
 *    alefs sit (dagger-alif words like إِلَٰهَ are typed إله or إلاه;
 *    hamzat al-wasl / imperative alefs come and go). A delta of even one
 *    inter-letter alef breaks substring matching, and regex "optional
 *    alef" patterns still fail in one direction or the other — so instead
 *    every alef is deleted from the Arabic haystack and from each query
 *    term alike. Symmetric by construction, O(1) extra per term, and the
 *    English translation haystack is left untouched so nothing there is
 *    ever corrupted by an Arabic-only fold.
 *  - The index stores only what ranking needs (surah number, ayah number,
 *    normalized haystacks + the alef-intact form for future snippet work).
 *    Raw text is re-read from state at render time so the display never
 *    depends on this module's memory copies.
 */

import { normalizeSearch, normalizeArabic, stripQuranAnnotations } from './utils.js';

let quranRecords = []; // [{ s, a, hay, hayTrans }]
let arabicByKey = new Map(); // "s:a" -> normalized-arabic for snippet reuse
let builtFromCount = 0;

/** Number of surah documents the current index was built from. */
export function quranIndexSurahCount() {
  return builtFromCount;
}

/**
 * Remove every alef AFTER normalization has already folded the variants
 * (أ إ آ ٱ → ا). Applied IDENTICALLY to records and queries — see the
 * design note above for why deletion rather than optional-alef regexes.
 */
const elideAlefs = (s) => s.replace(/\u0627/g, '');

/**
 * Build (or rebuild) the Qur'an search index from a surah-documents map of
 * shape { [surahNumber]: { ayahs: [{ number, text, translation }] } }.
 * Malformed entries are skipped defensively — a hostile or corrupted store
 * must never crash a render (same rule as everywhere else).
 */
export function buildQuranIndex(surahDocs) {
  quranRecords = [];
  arabicByKey = new Map();
  builtFromCount = 0;
  if (!surahDocs || typeof surahDocs !== 'object') {
    return 0;
  }
  for (const [sStr, doc] of Object.entries(surahDocs)) {
    const s = Number(sStr);
    if (!Number.isInteger(s) || s < 1 || s > 114 || !doc || !Array.isArray(doc.ayahs)) continue;
    builtFromCount++;
    for (const a of doc.ayahs) {
      const n = Number(a?.number);
      if (!Number.isFinite(n)) continue;
      const arabic = typeof a.text === 'string' ? a.text : '';
      const translation = typeof a.translation === 'string' ? a.translation : '';
      const key = `${s}:${a.number}`;
      const normArabic = normalizeArabic(stripQuranAnnotations(arabic));
      arabicByKey.set(key, normArabic);
      quranRecords.push({
        s,
        a: a.number,
        // Two SEPARATE haystacks with two purposes: Arabic folds Uthmani
        // marks away AND elides all alefs (matching is symmetric because
        // the query side passes through the same pipeline), while the
        // translation keeps the same plain fold as every other text
        // search in this app — no Arabic-only behavior leaks into it.
        hayArabic: elideAlefs(normArabic),
        hayTrans: normalizeSearch(translation),
      });
    }
  }
  return quranRecords.length;
}

/** Drop the whole index (used by tests and by RESET-path hygiene). */
export function resetQuranIndex() {
  quranRecords = [];
  arabicByKey = new Map();
  builtFromCount = 0;
}

export function quranIndexSize() {
  return quranRecords.length;
}

/**
 * Search the corpus. Query is folded with the same pipeline as the records,
 * so diacritics, alef variants, and Uthmani marks cancel out on both sides.
 * Returns [{ s, a, score }] ordered by relevance.
 */
export function searchQuran(query, { limit = 24 } = {}) {
  const raw = String(query ?? '');
  if (!raw.trim() || !quranRecords.length) return [];
  // Query side goes through the SAME pipeline as the records (annotations
  // stripped, diacritics folded, alefs elided), so pasted-in ayah
  // fragments and plainly typed words both match their targets. Translation
  // terms keep the pre-elision form.
  const qNorm = normalizeSearch(stripQuranAnnotations(raw));
  // One PAIR per raw term keeps translation and elided-Arabic forms aligned
  // even when some middle term elides away entirely (pure-alef tokens).
  const pairs = [];
  let arabicRequirements = 0;
  for (const term of qNorm.split(' ').filter(Boolean)) {
    const ar = elideAlefs(term);
    if (ar) arabicRequirements++;
    pairs.push({ t: term, ar });
  }
  // Every token folded away (e.g. someone searching bare "ا ا") — treat
  // exactly like any other no-op query instead of returning the whole corpus.
  if (!arabicRequirements) return [];
  if (!pairs.length) return [];
  const phrase = pairs
    .map((p) => p.ar)
    .filter(Boolean)
    .join(' ');
  const phraseTrans = pairs.map((p) => p.t).join(' ');

  const results = [];
  for (const rec of quranRecords) {
    let score = 0;
    let allMatch = true;
    for (const pair of pairs) {
      // A term that elided to empty (pure-alef input like a lone "ا") cannot
      // require anything — ignore it rather than let it veto a real match.
      if (!pair.ar) continue;
      const inTrans = rec.hayTrans.includes(pair.t);
      const inArabic = rec.hayArabic.includes(pair.ar);
      if (!inTrans && !inArabic) {
        allMatch = false;
        break;
      }
      if (inTrans) score += 3; // translation hits read first for most users
      if (inArabic) score += 2;
    }
    if (!allMatch) continue;
    // Exact multi-word phrase (either language) strongly outranks scattered terms.
    if ((phrase && rec.hayArabic.includes(phrase)) || rec.hayTrans.includes(phraseTrans))
      score += 8;
    results.push({ s: rec.s, a: rec.a, score });
  }

  results.sort((x, y) => y.score - x.score || x.s - y.s || x.a - y.a);
  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Ready-flag plumbing                                                  */
/* ------------------------------------------------------------------ */
// Views need to know whether the corpus has been loaded+indexed without
// importing app.js (import cycle). This tiny listener set lets app.js flip
// readiness through setQuranIndexReady(); the view reads it directly.

let ready = false;

export function isQuranSearchReady() {
  return ready;
}

export function setQuranIndexReady(value) {
  ready = !!value;
}
