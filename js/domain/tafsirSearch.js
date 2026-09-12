/**
 * domain/tafsirSearch.js — full-text search over one bundled tafsir edition.
 *
 * Tafsir is modern Arabic prose (no Uthmani marks), so records fold with
 * the app-wide normalizeSearch only — no Quran-specific pipelines leak
 * in. Ranking mirrors quranSearch (AND terms, translation-style weight,
 * whole-phrase bonus) over {surah: {ayah: text}} file maps.
 * Remote (on-demand) editions are never indexed: they fetch only on
 * explicit tap per the lazyData rule, and a 114-file background build
 * would break it — see isTafsirSearchable().
 */
import { normalizeSearch } from '../core/utils.js';

let tafsirRecords = []; // [{ s, a, hay }]
let tafsirEditionId = null;
let lastSearch = { query: null, limit: 0, results: null };

/** Only bundled editions may be bulk-indexed (see module note). */
export function isTafsirSearchable(edition) {
  return !!edition && edition.bundled === true && typeof edition.id === 'string' && !!edition.id;
}

/** First bundled edition in catalog order (the default search edition). */
export function defaultSearchEdition(editions) {
  const list = Array.isArray(editions) ? editions : editions?.editions || [];
  return (Array.isArray(list) ? list : []).find((e) => isTafsirSearchable(e)) || null;
}

export function buildTafsirIndex(editionId, filesBySurah) {
  tafsirRecords = [];
  tafsirEditionId = typeof editionId === 'string' ? editionId : null;
  lastSearch = { query: null, limit: 0, results: null };
  if (!tafsirEditionId || !filesBySurah || typeof filesBySurah !== 'object') return 0;
  for (const [sStr, ayahs] of Object.entries(filesBySurah)) {
    const s = Number(sStr);
    if (!Number.isInteger(s) || s < 1 || s > 114 || !ayahs || typeof ayahs !== 'object') continue;
    for (const [aStr, text] of Object.entries(ayahs)) {
      const a = Number(aStr);
      if (!Number.isInteger(a) || typeof text !== 'string' || !text.trim()) continue;
      tafsirRecords.push({ s, a, hay: normalizeSearch(text) });
    }
  }
  return tafsirRecords.length;
}

export function resetTafsirIndex() {
  tafsirRecords = [];
  tafsirEditionId = null;
  lastSearch = { query: null, limit: 0, results: null };
}

export function tafsirIndexSize() {
  return tafsirRecords.length;
}

export function tafsirIndexEdition() {
  return tafsirEditionId;
}

/** Ready means a non-empty index (an all-failed build retries next time). */
export function isTafsirSearchReady() {
  return tafsirRecords.length > 0;
}

export function searchTafsir(query, { limit = 24 } = {}) {
  const raw = String(query ?? '');
  if (!raw.trim() || !tafsirRecords.length) return [];
  if (lastSearch.query === raw && lastSearch.limit === limit && lastSearch.results) {
    return lastSearch.results;
  }
  const q = normalizeSearch(raw);
  const terms = q.split(' ').filter(Boolean);
  if (!terms.length) return [];
  const phrase = terms.join(' ');
  const results = [];
  for (const rec of tafsirRecords) {
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      if (!rec.hay.includes(term)) {
        allMatch = false;
        break;
      }
      score += 2;
    }
    if (!allMatch) continue;
    if (rec.hay.includes(phrase)) score += 8;
    results.push({ s: rec.s, a: rec.a, score });
  }
  results.sort((a, b) => b.score - a.score || a.s - b.s || a.a - b.a);
  const out = results.slice(0, limit);
  lastSearch = { query: raw, limit, results: out };
  return out;
}
