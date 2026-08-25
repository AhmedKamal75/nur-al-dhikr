/**
 * mushaf.js
 * Pure helpers for the 604-page Madani Mushaf reader: page bounds/navigation
 * and the "global ayah number" (1-6236) that Quran audio CDNs key recitation
 * files by. No DOM, no state.js — data comes in as plain arguments, which
 * keeps this trivially unit-testable.
 */
import { MUSHAF_PAGE_COUNT, quranAudioUrl } from './config.js';

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
