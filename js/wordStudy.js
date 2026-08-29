/**
 * wordStudy.js
 * Pure helpers for the per-word grammar popover: root/case/mood/verb-form
 * lookups, bilingual grammar summaries, and root-occurrence formatting. No
 * DOM, no state.js — data comes in as plain arguments (state.quranWords /
 * state.quranRoots slices), which keeps this trivially unit-testable, the
 * same convention as mushaf.js and khatma.js.
 */

/** Look up a single word's grammar record. Returns null if not (yet) loaded. */
export function getWord(quranWords, surah, ayah, i) {
  const ayahWords = quranWords?.[String(surah)]?.[String(ayah)];
  if (!Array.isArray(ayahWords)) return null;
  return ayahWords.find((w) => w.i === Number(i)) || null;
}

/**
 * A short, human, bilingual grammar summary line for a word, e.g.
 * "Noun · Genitive (مجرور)" or "Verb (Form X) · Jussive (مجزوم)".
 * Falls back gracefully when fields are missing (particles have no case).
 */
export function wordGrammarSummary(word, lang = 'en') {
  if (!word) return '';
  const ar = lang === 'ar';
  const bits = [];
  const posLabel = ar ? word.posAr : word.posEn;
  if (word.subtype) {
    bits.push(ar ? word.subtype.ar : word.subtype.en);
  } else if (posLabel) {
    bits.push(posLabel);
  }
  if (word.verbForm) {
    bits.push(ar ? `الوزن ${toArabicOrdinalForm(word.verbForm)}` : `Form ${word.verbForm}`);
  }
  const inflection = ar ? word.caseAr || word.moodAr : word.caseEn || word.moodEn;
  if (inflection) bits.push(inflection);
  return bits.join(ar ? ' \u00B7 ' : ' \u00B7 ');
}

const ARABIC_ORDINALS = [
  '',
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
];
function toArabicOrdinalForm(n) {
  const idx = Number(n);
  return ARABIC_ORDINALS[idx] || String(n);
}

/**
 * Person/gender/number + definiteness + adjective/passive flags as a flat
 * list of {ar, en} labels, for the popover's "details" row. Kept separate
 * from wordGrammarSummary so the header stays short and this can wrap.
 */
export function wordDetailTags(word, lang = 'en') {
  if (!word) return [];
  const ar = lang === 'ar';
  const tags = [];
  for (const fl of word.pgn || []) tags.push(ar ? fl.ar : fl.en);
  if (word.definite) tags.push(ar ? 'معرفة' : 'Definite');
  else if (word.indef) tags.push(ar ? 'نكرة' : 'Indefinite');
  if (word.adj) tags.push(ar ? 'نعت' : 'Attribute (na\u02BFt)');
  if (word.passive) tags.push(ar ? 'مبني للمجهول' : 'Passive voice');
  if (word.verbPattern)
    tags.push(ar ? `الوزن الصرفي: ${word.verbPattern}` : `Pattern: ${word.verbPattern}`);
  return tags;
}

/** Prefix/suffix particle glosses (e.g. "bi-" = "by/with", definite "al-"). */
export function wordAffixLabels(word, lang = 'en') {
  if (!word) return { prefixes: [], suffixes: [] };
  const ar = lang === 'ar';
  const map = (arr) => (arr || []).map((p) => ({ form: p.form, label: ar ? p.ar : p.en }));
  return { prefixes: map(word.prefixes), suffixes: map(word.suffixes) };
}

/**
 * Other ayahs where the same root occurs, excluding the current one,
 * capped to `limit`. Used as an authentic "usage example" instead of an
 * invented sentence — real Qur'anic usage of the same root.
 */
export function rootOccurrences(quranRoots, root, excludeSurah, excludeAyah, limit = 8) {
  if (!root || !quranRoots || !quranRoots[root]) return { count: 0, sample: [] };
  const entry = quranRoots[root];
  const sample = (entry.occ || [])
    .filter((o) => !(String(o.s) === String(excludeSurah) && String(o.a) === String(excludeAyah)))
    .slice(0, limit);
  return { count: entry.count || 0, sample };
}

/** True when the current tafsir edition's cached text for this surah has
 *  already been fetched. Pure guard used by the render layer to decide
 *  whether to show a loading state vs. the text itself. */
export function isTafsirLoaded(tafsirState, editionId, surah) {
  return Boolean(tafsirState?.[editionId]?.[String(surah)]);
}

/** Split a catalog into the on-device (bundled) and fetch-on-request lists. */
export function splitEditions(editions) {
  const list = editions?.editions || [];
  return {
    bundled: list.filter((e) => e.bundled),
    remote: list.filter((e) => !e.bundled),
  };
}

/** Find one edition's catalog entry by id. */
export function findEdition(editions, id) {
  return (editions?.editions || []).find((e) => e.id === id) || null;
}
