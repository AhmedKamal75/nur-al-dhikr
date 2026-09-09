/**
 * domain/offline.js — offline-library content inventory (v5.3.0). Pure
 * URL builders over core/config: no fetching, no state. The batch engine
 * (app/offlineJobs.js) walks these lists through fetchJSON, which warms
 * the service worker's data cache file by file — state is never loaded,
 * so a 50MB hadith book costs bandwidth and disk, not memory.
 */

import {
  QURAN_META_URL,
  QURAN_SURAH_URL,
  TRANSLATION_EDITIONS,
  TRANSLATION_URL,
  MUSHAF_META_URL,
  MUSHAF_PAGE_URL,
  MUSHAF_PAGE_COUNT,
  HADITH_INDEX_URL,
  HADITH_BOOK_URL,
  TAFSIR_EDITIONS_URL,
  TAFSIR_TEXT_URL,
  QURAN_WORDS_URL,
  QURAN_ROOTS_URL,
  QURAN_ROOTS_FULL_URL,
  TAJWEED_PRACTICE_POOL_URL,
  RECITERS_URL,
} from '../core/config.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => from + k);
const SURAH_NUMBERS = range(1, 114);
const ID_RE = /^[a-z0-9-]{1,40}$/;

/** Display order, ids (persisted in settings.offline), honest sizes. */
export const OFFLINE_GROUPS = Object.freeze([
  { id: 'quran', sizeMB: 3, gzMB: 1 },
  { id: 'translations', sizeMB: 6, gzMB: 2 },
  { id: 'mushaf', sizeMB: 3, gzMB: 1 },
  { id: 'hadith', sizeMB: 50, gzMB: 12 },
  { id: 'tafsir', sizeMB: 51, gzMB: 7 },
  { id: 'words', sizeMB: 45, gzMB: 4 },
]);

export const OFFLINE_GROUP_IDS = Object.freeze(OFFLINE_GROUPS.map((g) => g.id));

export function quranUrls() {
  return [RECITERS_URL, QURAN_META_URL, ...SURAH_NUMBERS.map((n) => QURAN_SURAH_URL(n))];
}

export function translationUrls() {
  return TRANSLATION_EDITIONS.filter((e) => !e.inline).flatMap((e) =>
    SURAH_NUMBERS.map((n) => TRANSLATION_URL(e.id, n))
  );
}

export function mushafUrls() {
  return [MUSHAF_META_URL, ...range(1, MUSHAF_PAGE_COUNT).map((n) => MUSHAF_PAGE_URL(n))];
}

export function wordsUrls() {
  return [
    QURAN_ROOTS_URL,
    QURAN_ROOTS_FULL_URL,
    TAJWEED_PRACTICE_POOL_URL,
    ...SURAH_NUMBERS.map((n) => QURAN_WORDS_URL(n)),
  ];
}

/** Index-first groups: book/edition ids come from their catalogs. */
export async function hadithUrls(fetchJSON) {
  const index = await fetchJSON(HADITH_INDEX_URL);
  const books = Array.isArray(index?.books) ? index.books : [];
  const ids = books.map((b) => b?.id).filter((id) => typeof id === 'string' && ID_RE.test(id));
  return { indexUrl: HADITH_INDEX_URL, urls: ids.map((id) => HADITH_BOOK_URL(id)) };
}

export async function tafsirUrls(fetchJSON) {
  const catalog = await fetchJSON(TAFSIR_EDITIONS_URL);
  const editions = Array.isArray(catalog?.editions) ? catalog.editions : [];
  const ids = editions
    .filter((e) => e?.bundled === true)
    .map((e) => e?.id)
    .filter((id) => typeof id === 'string' && ID_RE.test(id));
  return {
    indexUrl: TAFSIR_EDITIONS_URL,
    urls: ids.flatMap((id) => SURAH_NUMBERS.map((n) => TAFSIR_TEXT_URL(id, n))),
  };
}
