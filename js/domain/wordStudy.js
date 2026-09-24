/**
 * wordStudy.js
 * Pure helpers for the per-word grammar popover: root/case/mood/verb-form
 * lookups, bilingual grammar summaries, and root-occurrence formatting. No
 * DOM, no state.js — data comes in as plain arguments (state.quranWords /
 * state.quranRoots slices), which keeps this trivially unit-testable, the
 * same convention as mushaf.js and khatma.js.
 */

import { sameSurfaceWord, containsSurfaceWord } from './tajweed.js';
import { isFunctionToken } from './lexicalProvenance.js';

/** Look up a single word's grammar record. Returns null if not (yet) loaded.
 *
 *  (v5.3.0) optional `surface` (the tapped display text) anchors the
 *  lookup for the handful of spelling-split ayahs (37:164 etc.) where a
 *  bare index diverges: exact normalized match first (±3), then
 *  containment, else the indexed record.
 */
export function getWord(quranWords, surah, ayah, i, surface = null) {
  const ayahWords = quranWords?.[String(surah)]?.[String(ayah)];
  if (!Array.isArray(ayahWords)) return null;
  const n = Number(i);
  const byIndex = ayahWords.find((w) => w.i === n) || null;
  if (!surface) return byIndex;
  if (byIndex && sameSurfaceWord(byIndex.text, surface)) return byIndex;
  if (!byIndex) {
    // No indexed record at n (glued/spelling-split sources disagree on
    // numbering): anchor on the tapped surface across the whole ayah —
    // exact first, then containment — instead of returning null.
    return (
      ayahWords.find((w) => sameSurfaceWord(w.text, surface)) ||
      ayahWords.find((w) => containsSurfaceWord(w.text, surface)) ||
      null
    );
  }
  const at = (k) => ayahWords.find((w) => w.i === k) || null;
  for (const d of [1, -1, 2, -2, 3, -3]) {
    const w = at(n + d);
    if (w && sameSurfaceWord(w.text, surface)) return w;
  }
  for (const d of [0, 1, -1, 2, -2, 3, -3]) {
    const w = at(n + d);
    if (w && containsSurfaceWord(w.text, surface)) return w;
  }
  return byIndex;
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

/**
 * Ayah-level transliteration from the bundled per-word romanization
 * (`data/quran-words/`). Joins each word's `translit` in order — the
 * dataset's own transcription, never invented. Returns null when the word
 * data isn't loaded (the caller omits the line) or carries no romanization.
 */
export function ayahTranslit(words) {
  if (!Array.isArray(words) || !words.length) return null;
  const parts = [];
  for (const w of words) {
    if (!w || typeof w !== 'object') continue;
    if (typeof w.translit === 'string' && w.translit.trim()) parts.push(w.translit.trim());
  }
  return parts.length ? parts.join(' ') : null;
}

/**
 * (v5.4.0, P0-1 — ported from the v5.3.0 audit) A one-line i'rab
 * (الإعراب) composed ONLY from the word's own structured grammar
 * fields — position tags, case/mood, verb form, person/gender/number,
 * definiteness. Never a paraphrased commentary: if the corpus carries
 * no grammar fields at all, the line is empty and the view shows an
 * honest "no data" hint. Bilingual, deterministic.
 */
export function wordIrabLine(word, lang = 'en') {
  if (!word) return '';
  const ar = lang === 'ar';
  const bits = [];
  // (v5.5.0) the subtype refines the coarse pos: a Proper noun, Active
  // participle or Verbal noun is NOT "just a noun" — same precedence as
  // wordGrammarSummary so the two lines can never disagree.
  if (word.subtype) {
    bits.push(ar ? word.subtype.ar : word.subtype.en);
  } else {
    const posLabel = ar ? word.posAr : word.posEn;
    if (posLabel) bits.push(posLabel);
  }
  if (word.adj) bits.push(ar ? 'نعت' : 'adjective (naʿt)');
  if (word.verbForm) {
    bits.push(ar ? `الوزن ${toArabicOrdinalForm(word.verbForm)}` : `Form ${word.verbForm}`);
  }
  const inflection = ar ? word.caseAr || word.moodAr : word.caseEn || word.moodEn;
  if (inflection) bits.push(inflection);
  const pgn = (word.pgn || []).map((p) => (ar ? p.ar : p.en)).filter(Boolean);
  if (pgn.length) bits.push(pgn.join(ar ? '، ' : ', '));
  if (word.definite) bits.push(ar ? 'معرفة' : 'definite');
  else if (word.indef) bits.push(ar ? 'نكرة' : 'indefinite');
  return bits.join(ar ? '، ' : ' · ');
}

/**
 * (v5.2.75, UP-01) lemma-dict lookup for the popup's Meanings section.
 * Returns a sanitized { ar, en, syn[], ant[] } or null (unknown lemma,
 * unloaded/malformed index). Renderers escape everything again anyway.
 * (LEX-02) also carries the raw `src` citation through (when present) so
 * the popup can render provenance without re-reading the data tier.
 */
export function dictEntryFor(wordDict, lemma) {
  const index = wordDict && typeof wordDict === 'object' ? wordDict.index : null;
  if (!index || typeof index !== 'object' || typeof lemma !== 'string' || !lemma) return null;
  const e = index[lemma];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const strings = (v) =>
    Array.isArray(v)
      ? v
          .filter((s) => typeof s === 'string' && s.trim())
          .map((s) => s.slice(0, 60))
          .slice(0, 12)
      : [];
  const out = {
    ar: typeof e.ar === 'string' ? e.ar.slice(0, 500) : '',
    en: typeof e.en === 'string' ? e.en.slice(0, 200) : '',
    syn: strings(e.syn),
    ant: strings(e.ant),
  };
  if (e.src && typeof e.src === 'object' && !Array.isArray(e.src)) out.src = e.src;
  return out;
}

/** Bookmark key for one word ("surah:ayah:i"), null on hostile input. */
export function wordBookmarkKey(surah, ayah, i) {
  const s = Math.floor(Number(surah));
  const a = Math.floor(Number(ayah));
  const n = Math.floor(Number(i));
  if (!(s >= 1 && s <= 114 && a >= 1 && n >= 1)) return null;
  return `${s}:${a}:${n}`;
}

/**
 * (v5.6.0) root core-meaning lookup: the conceptual sense a root
 * carries (e.g. ش-ج-ر branching/intertwining), from the app-authored
 * roots-meaning tier. Returns a sanitized { ar, en } or null (unknown
 * root, unloaded/malformed index). Renderers escape everything again.
 */
/**
 * Materialize the complete per-token study contract from its compact tiers.
 * The disk format deliberately de-duplicates lemma/root data; this helper
 * exposes one stable record to renderers/tests without copying that metadata
 * into all 77,429 token rows.
 */
export function materializeWordStudy(word, tokenStudy = null, dict = null, root = null) {
  if (!word || typeof word !== 'object') return null;
  const contextualMeaning = tokenStudy?.contextualMeaning || {};
  const irab = tokenStudy?.irab || {};
  // (LEX-01/02) field-aware synonym/antonym states. Function tokens resolve
  // to NOT_APPLICABLE, applicable-but-unrecorded tokens to NOT_ATTESTED.
  // No list is ever invented here.
  const synonymList = Array.isArray(dict?.syn)
    ? dict.syn.filter((s) => typeof s === 'string' && s.trim()).slice(0, 12)
    : [];
  const antonyms = Array.isArray(dict?.ant) ? dict.ant : [];
  const noDirectAntonym = antonyms.length === 0;
  // (LEX-01) single applicability source: domain/lexicalProvenance.js.
  const functionToken = isFunctionToken(word);
  const synonymState = synonymList.length
    ? 'CURATED_LIST'
    : functionToken
      ? 'NOT_APPLICABLE'
      : 'NOT_ATTESTED';
  const etymology = root
    ? { ...root }
    : {
        root: null,
        rootLetters: [],
        lexicalCoreAr:
          'لا جذر معجمي مستقل مُسجَّل لهذا العنصر الوظيفي في طبقة الدراسة؛ يُشرح بوظيفته النحوية والسياقية.',
        lexicalCoreEn:
          'No independent lexical root is recorded for this grammatical/function token; it is explained by grammatical and contextual function.',
        classicalUsageAr:
          'عنصر وظيفي/ضميري لا يُنسب إلى جذر اشتقاقي مستقل في بيانات الدراسة المضمّنة.',
        classicalUsageEn:
          'A function-word/pronominal token without an independent derivational root in the bundled study data.',
        quranicBridgeAr: 'يُفهم معناه من وظيفته في السياق القرآني لا من اشتقاق جذري مستقل.',
        quranicBridgeEn:
          'Its Qur’anic sense is determined by its contextual grammatical function rather than an independent lexical derivation.',
        source: 'no-independent-root-policy',
      };
  return {
    schemaVersion: '1.0',
    coverage: 'quran-token',
    contextualMeaning: {
      ar: typeof contextualMeaning.ar === 'string' ? contextualMeaning.ar : '',
      en: typeof word.en === 'string' ? word.en : '',
      source: typeof contextualMeaning.source === 'string' ? contextualMeaning.source : '',
      // (LEX-03) bundled study rows are CORPUS tier, never presented as
      // classical/tafsir authority unless an explicit tafsir source lands.
      provenanceState:
        typeof contextualMeaning.ar === 'string' && contextualMeaning.ar.trim()
          ? 'CORPUS'
          : 'NOT_ATTESTED',
    },
    englishTranslation: typeof word.en === 'string' ? word.en : '',
    synonyms: {
      ar: synonymList,
      state: synonymState,
      covered: Boolean(dict && typeof dict === 'object'),
      hasDirectSynonym: synonymList.length > 0,
      noteAr:
        synonymState === 'NOT_APPLICABLE'
          ? 'لا تنطبق المرادفات على هذا العنصر الوظيفي؛ لم يُخترع بديل.'
          : synonymState === 'NOT_ATTESTED'
            ? 'لا يوجد مرادف عربي مُثبت في طبقة الدراسة المضمّنة؛ لم يُخترع مرادف.'
            : '',
      noteEn:
        synonymState === 'NOT_APPLICABLE'
          ? 'Synonyms do not apply to this function token; none was invented.'
          : synonymState === 'NOT_ATTESTED'
            ? 'No attested Arabic synonym is recorded in the bundled study tier; none was invented.'
            : '',
    },
    antonyms: {
      ar: antonyms,
      state: antonyms.length ? 'CURATED_LIST' : functionToken ? 'NOT_APPLICABLE' : 'NOT_ATTESTED',
      covered: Boolean(dict && typeof dict === 'object'),
      hasDirectAntonym: !noDirectAntonym,
      noteAr: noDirectAntonym
        ? functionToken
          ? 'لا تنطبق الأضداد على هذا العنصر الوظيفي؛ لم يُخترع مضاد.'
          : 'لا يوجد مضاد عربي مباشر مُثبت في طبقة الدراسة المضمّنة؛ لم يُخترع مضاد.'
        : '',
      noteEn: noDirectAntonym
        ? functionToken
          ? 'Antonyms do not apply to this function token; none was invented.'
          : 'No attested direct Arabic antonym is recorded in the bundled study tier; none was invented.'
        : '',
    },
    irab: {
      ar: typeof irab.ar === 'string' ? irab.ar : '',
      en: typeof irab.en === 'string' ? irab.en : '',
      source: typeof irab.source === 'string' ? irab.source : '',
    },
    etymology,
    // (LEX-02/LEX-04) lemma/root provenance carried alongside the
    // materialized record so renderers never guess authority. Uncited
    // bundled tiers resolve to CORPUS; cited src resolves upstream.
    provenance: {
      lemma:
        dict && typeof dict === 'object'
          ? {
              state: dict.src ? 'CLASSICAL_LEXICON' : 'CORPUS',
              sourceId:
                typeof dict.src?.sourceId === 'string' ? dict.src.sourceId : 'bundled-quran-dict',
            }
          : { state: 'NOT_ATTESTED', sourceId: '' },
      root: root
        ? {
            state: root.src
              ? 'CLASSICAL_LEXICON'
              : root.source === 'no-independent-root-policy'
                ? 'NOT_APPLICABLE'
                : 'CORPUS',
            sourceId: typeof root.source === 'string' ? root.source : '',
          }
        : { state: 'NOT_APPLICABLE', sourceId: 'no-independent-root-policy' },
    },
  };
}

export function rootStudyEntryFor(rootsMeaning, root) {
  const index = rootsMeaning && typeof rootsMeaning === 'object' ? rootsMeaning.index : null;
  if (!index || typeof index !== 'object' || typeof root !== 'string' || !root) return null;
  const e = index[root];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const ar = typeof e.ar === 'string' ? e.ar.slice(0, 200) : '';
  const en = typeof e.en === 'string' ? e.en.slice(0, 120) : '';
  if (!ar && !en) return null;
  return {
    ...e,
    ar,
    en,
    root: typeof e.root === 'string' ? e.root : root,
    rootLetters: Array.isArray(e.rootLetters)
      ? e.rootLetters.filter((x) => typeof x === 'string')
      : [],
    classicalUsageAr:
      typeof e.classicalUsageAr === 'string' ? e.classicalUsageAr.slice(0, 500) : '',
    classicalUsageEn:
      typeof e.classicalUsageEn === 'string' ? e.classicalUsageEn.slice(0, 300) : '',
    lexicalCoreAr: typeof e.lexicalCoreAr === 'string' ? e.lexicalCoreAr.slice(0, 300) : '',
    lexicalCoreEn: typeof e.lexicalCoreEn === 'string' ? e.lexicalCoreEn.slice(0, 200) : '',
    quranicBridgeAr: typeof e.quranicBridgeAr === 'string' ? e.quranicBridgeAr.slice(0, 600) : '',
    quranicBridgeEn: typeof e.quranicBridgeEn === 'string' ? e.quranicBridgeEn.slice(0, 400) : '',
    source: typeof e.source === 'string' ? e.source : '',
  };
}

/** Backward-compatible core-meaning API: returns only the original {ar,en} contract. */
export function rootMeaningFor(rootsMeaning, root) {
  const e = rootStudyEntryFor(rootsMeaning, root);
  return e ? { ar: e.ar, en: e.en } : null;
}
