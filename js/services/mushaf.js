/**
 * mushaf.js
 * Pure helpers for the 604-page Madani Mushaf reader: page bounds/navigation
 * and the "global ayah number" (1-6236) that Quran audio CDNs key recitation
 * files by. No DOM, no state.js — data comes in as plain arguments, which
 * keeps this trivially unit-testable.
 */
import { MUSHAF_PAGE_COUNT, quranAudioUrl } from '../core/config.js';

/** Clamp a page number into the valid 1..604 range. Non-numeric input -> 1. */
export function clampPage(page) {
  const n = Number(page);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MUSHAF_PAGE_COUNT, Math.round(n)));
}

export function nextPage(page) {
  return clampPage(clampPage(page) + 1);
}

export function prevPage(page) {
  return clampPage(clampPage(page) - 1);
}

export function isFirstPage(page) {
  return clampPage(page) === 1;
}

export function isLastPage(page) {
  return clampPage(page) === MUSHAF_PAGE_COUNT;
}

/* ------------------------------------------------------------------ */
/* (v4.5) Double-page spread — two facing pages, the way a printed      */
/* mushaf reads on a desk or a wide screen.                             */
/* ------------------------------------------------------------------ */

/** Module flag: is the viewport wide enough for a spread to make sense?
 *  Kept here (not in a view) so views, handlers AND events share ONE
 *  truth. app/events.js owns setting it — once at boot from
 *  matchMedia('(min-width: 900px)'), and again on every breakpoint
 *  crossing (which also nudges a re-render). Pure default `false` means
 *  Node-side tests render the single-page layout unless they opt in. */
let wideLayout = false;
export function setMushafWideLayout(v) {
  wideLayout = v === true;
}
export function getMushafWideLayout() {
  return wideLayout;
}

/** Is the two-page spread active for this render/navigation decision?
 *  Requires BOTH the persisted preference AND a wide enough viewport —
 *  a phone never shows half-pages, no matter what the pref says. */
export function mushafSpreadActive(prefs) {
  return prefs?.spread === true && wideLayout;
}

/**
 * The RIGHT-hand page of the spread containing `page`. A printed mushaf
 * opens from the right: odd pages are right pages, even pages face them
 * on the left (page 1 | 2 is the first spread). A jump to an even page
 * aligns down to the odd page whose spread contains it — page 200 is the
 * LEFT page of the 199|200 spread.
 */
export function spreadRightPage(page) {
  const p = clampPage(page);
  return p % 2 === 0 ? p - 1 : p;
}

/** The LEFT-hand page facing `rightPage`, or null on the (unreachable
 *  with 604 pages) truncated final spread. */
export function spreadLeftPage(rightPage, pageCount = MUSHAF_PAGE_COUNT) {
  const left = spreadRightPage(rightPage) + 1;
  return left <= pageCount ? left : null;
}

/** Next spread's right page (two pages forward), or null at the book's end. */
export function nextSpreadPage(rightPage, pageCount = MUSHAF_PAGE_COUNT) {
  const n = spreadRightPage(rightPage) + 2;
  return n <= pageCount ? n : null;
}

/** Previous spread's right page (two pages back), or null at the book's start. */
export function prevSpreadPage(rightPage) {
  const p = spreadRightPage(rightPage) - 2;
  return p >= 1 ? p : null;
}

/**
 * (v4.5) How far into its juz a page sits, in eighths — the hizb-quarter
 * rhythm of "juz 18, 3/8" that printed mushafs carry in their margins.
 * The exact quarter markers are ayah-based typesetting; this is the honest
 * page-position approximation (each juz spans a known run of pages), which
 * is what a page-level reader can always resolve with zero extra data.
 * Returns 1..8.
 */
export function juzEighth(juzFirstPage, page, juz, pageCount = MUSHAF_PAGE_COUNT) {
  const p = clampPage(page);
  if (!juzFirstPage || typeof juzFirstPage !== 'object') return 1;
  const start = Number(juzFirstPage[String(juz)]);
  if (!Number.isFinite(start)) return 1;
  const nextStart = Number(juzFirstPage[String(Number(juz) + 1)]);
  const end = (Number.isFinite(nextStart) ? nextStart : pageCount + 1) - 1;
  const span = Math.max(1, end - start + 1);
  const offset = Math.max(0, Math.min(span - 1, p - start));
  return Math.max(1, Math.min(8, Math.floor((offset / span) * 8) + 1));
}

/**
 * The Qur'an's 6,236 ayahs are numbered 1..6236 continuously across all 114
 * surahs (surah 1 ayah 1 = 1, surah 2 ayah 1 = 8, and so on). Verse-by-verse
 * audio CDNs (e.g. cdn.islamic.network) key files by this number rather than
 * by (surah, ayah) pairs, so it has to be derived from cumulative ayah
 * counts. `surahs` is the quran-meta.json `surahs` array (each item needs a
 * numeric `ayahCount`).
 */
export function globalAyahNumber(surahs, surahNumber, ayahNumber) {
  const target = Number(surahNumber);
  const ayah = Number(ayahNumber);
  if (!Array.isArray(surahs) || !Number.isFinite(target) || !Number.isFinite(ayah)) return null;
  let offset = 0;
  for (const s of surahs) {
    if (Number(s.number) === target) return offset + ayah;
    offset += Number(s.ayahCount) || 0;
  }
  return null;
}

/** Build the recitation audio URL for a given (surah, ayah), or null if unresolvable. */
export function ayahAudioUrl(surahs, reciterId, surahNumber, ayahNumber) {
  const g = globalAyahNumber(surahs, surahNumber, ayahNumber);
  if (g == null) return null;
  return quranAudioUrl(reciterId, g);
}

/** First page a given surah appears on, from mushaf-meta.json's surahFirstPage map. */
export function surahStartPage(meta, surahNumber) {
  if (!meta || !meta.surahFirstPage) return 1;
  return clampPage(meta.surahFirstPage[String(surahNumber)] || 1);
}

/** First page a given juz (1-30) appears on, from mushaf-meta.json's juzFirstPage map. */
export function juzStartPage(meta, juzNumber) {
  if (!meta || !meta.juzFirstPage) return 1;
  return clampPage(meta.juzFirstPage[String(juzNumber)] || 1);
}

/**
 * The standard places of prostration (mawadi' as-sujud) as printed in the
 * Madani mushaf — the ۩ marks. 15 sites; the Hanafi count is 11 (three of
 * these are understood as ta'ammud-grade, not obligatory sajda), but the
 * MARK is printed at all 15 in the King Fahd Complex layout this app's
 * page boundaries follow, so all 15 are marked and the tap explains it.
 * Static table on purpose: this is fixed mushaf typesetting, not data that
 * could ever drift — and mushaf-meta carries no sajda field to derive it.
 */
export const SAJDA_AYAHS = Object.freeze(
  new Set([
    '7:206',
    '13:15',
    '16:50',
    '17:109',
    '19:58',
    '22:18',
    '22:77',
    '25:60',
    '27:26',
    '32:15',
    '38:24',
    '41:38',
    '53:62',
    '84:21',
    '96:19',
  ])
);

/** Does this ayah carry a printed sajda mark ۩ ? */
export function isSajdaAyah(surah, ayah) {
  return SAJDA_AYAHS.has(`${Number(surah)}:${Number(ayah)}`);
}

/**
 * Mushaf page carrying a specific ayah, from mushaf-meta.json's ayahPages
 * map ("surah:ayah" → page, all 6,236 entries, gate-checked at build time
 * by scripts/build-mushaf-ayah-pages.mjs). Used by the v3.10 follow-along
 * recitation to flip the Mushaf to the right page as each ayah is recited.
 * v3.12 NOTE: this export was declared as an app.js dependency in v3.10 but
 * the function itself never made it into this file — the app's entry module
 * failed to link from v3.10 onwards and nothing loaded. It is restored here
 * with the defensive shape every other helper in this file uses, and the
 * node import gate in tests/motion.test.js now imports app.js ITSELF so a
 * broken entry link can never ship again.
 *
 * @param {Record<string, number>|undefined} ayahPages
 * @param {number|string} surah
 * @param {number|string} ayah
 * @returns {number|null} page number, or null when unresolvable
 */
export function resolvePage(ayahPages, surah, ayah) {
  if (!ayahPages || typeof ayahPages !== 'object') return null;
  const s = Number(surah);
  const a = Number(ayah);
  if (!Number.isFinite(s) || !Number.isFinite(a) || s < 1 || a < 1) return null;
  const page = ayahPages[`${s}:${a}`];
  return Number.isFinite(page) ? clampPage(page) : null;
}
