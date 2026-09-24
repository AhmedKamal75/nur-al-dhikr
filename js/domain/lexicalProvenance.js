/**
 * domain/lexicalProvenance.js — (LEX-01) field-aware lexical provenance states.
 *
 * The lexicon must never fabricate synonyms/antonyms/etymology to raise a
 * coverage counter. Every lexical field resolves to either a sourced list /
 * record or an explicit applicability state:
 *
 * - CURATED: human-reviewed, app-authored record with a citation.
 * - CORPUS: bundled corpus tier (word-study rows, dict tier) without a
 *   classical-edition citation — honest but not scholarly-authoritative.
 * - TAFSIR: meaning carried by a tafsir edition (reserved; only set when
 *   the caller passes an explicit tafsir source id).
 * - CLASSICAL_LEXICON: cited classical dictionary / grammar-corpus record.
 * - NOT_ATTESTED: applicable in principle, nothing recorded yet.
 * - NOT_APPLICABLE: the field does not apply (e.g. antonym of a particle,
 *   root study of a function word without an independent root).
 *
 * Pure module: no DOM, no state.js. Backwards-compatible additions only.
 */

export const LEXICAL_STATES = Object.freeze({
  CURATED: 'CURATED',
  CORPUS: 'CORPUS',
  TAFSIR: 'TAFSIR',
  CLASSICAL_LEXICON: 'CLASSICAL_LEXICON',
  NOT_ATTESTED: 'NOT_ATTESTED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

const GENERIC_SOURCE_TO_STATE = Object.freeze({
  'bundled-root-core-meaning': 'CORPUS',
  'no-independent-root-policy': 'NOT_APPLICABLE',
  'no-attested-direct-antonym': 'NOT_ATTESTED',
});

/** Minimal citation shape from data/lexical-provenance-schema.json. */
export function isValidCitation(src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return false;
  for (const k of ['sourceId', 'work', 'author', 'edition']) {
    if (typeof src[k] !== 'string' || !src[k].trim()) return false;
  }
  return true;
}

export function genericSourceState(source) {
  if (typeof source !== 'string' || !source) return null;
  return GENERIC_SOURCE_TO_STATE[source] || null;
}

/**
 * True when the token is a grammatical/function item with no independent
 * derivational root (particles, pronouns, relative nouns, ...). Such tokens
 * are explained by grammatical/contextual function — root study and
 * synonym/antonym lists are NOT_APPLICABLE rather than missing.
 */
export function isFunctionToken(word) {
  if (!word || typeof word !== 'object') return false;
  if (word.root) return false;
  const pos = typeof word.pos === 'string' ? word.pos : '';
  // P = particle tier in data/quran-words; also cover rootless pronouns,
  // relative nouns and adverbs that carry no lemma-level lexical entry.
  if (pos === 'P') return true;
  if (!word.lemma) return true;
  return false;
}

/**
 * Resolve a synonym/antonym list to a field-aware state. Never invents
 * entries: a non-empty list is returned as-is, otherwise the token is
 * classified NOT_APPLICABLE (function word) or NOT_ATTESTED.
 */
export function resolveLexicalListState(list, word) {
  const clean = Array.isArray(list)
    ? list.filter((s) => typeof s === 'string' && s.trim()).slice(0, 12)
    : [];
  if (clean.length) return { state: 'CURATED_LIST', list: clean };
  if (isFunctionToken(word)) return { state: 'NOT_APPLICABLE', list: [] };
  return { state: 'NOT_ATTESTED', list: [] };
}

export function resolveAntonymState(dictEntry, word) {
  return resolveLexicalListState(dictEntry?.ant, word);
}

export function resolveSynonymState(dictEntry, word) {
  return resolveLexicalListState(dictEntry?.syn, word);
}

/**
 * Resolve lemma-tier provenance. Cited src -> CLASSICAL_LEXICON/CURATED;
 * uncited bundled tier -> CORPUS; unknown lemma -> NOT_ATTESTED.
 */
export function resolveLemmaProvenance(dictEntry, rawEntry = null) {
  const src = dictEntry?.src || rawEntry?.src || null;
  if (isValidCitation(src)) {
    return {
      state: 'CLASSICAL_LEXICON',
      sourceId: src.sourceId,
      work: src.work,
      author: src.author,
      edition: src.edition,
      reference: typeof src.location === 'string' ? src.location : '',
      reviewStatus: 'CURATED',
    };
  }
  if (dictEntry) {
    return {
      state: 'CORPUS',
      sourceId: 'bundled-quran-dict',
      work: 'Bundled Quran lemma dictionary',
      author: '',
      edition: 'app-bundled',
      reference: '',
      reviewStatus: 'UNCITED',
    };
  }
  return {
    state: 'NOT_ATTESTED',
    sourceId: '',
    work: '',
    author: '',
    edition: '',
    reference: '',
    reviewStatus: 'PENDING',
  };
}

/**
 * Resolve root-tier provenance. Cited src wins; otherwise the bundled
 * generic labels map to CORPUS / NOT_APPLICABLE / NOT_ATTESTED.
 */
export function resolveRootProvenance(rootEntry) {
  const src = rootEntry?.src || null;
  if (isValidCitation(src)) {
    return {
      state: 'CLASSICAL_LEXICON',
      sourceId: src.sourceId,
      work: src.work,
      author: src.author,
      edition: src.edition,
      reference: typeof src.location === 'string' ? src.location : '',
      reviewStatus: 'CURATED',
    };
  }
  const mapped = genericSourceState(rootEntry?.source);
  if (mapped) {
    return {
      state: mapped,
      sourceId: rootEntry.source,
      work: '',
      author: '',
      edition: '',
      reference: '',
      reviewStatus: mapped === 'CORPUS' ? 'UNCITED' : 'N/A',
    };
  }
  if (rootEntry) {
    return {
      state: 'CORPUS',
      sourceId: 'bundled-root-core-meaning',
      work: '',
      author: '',
      edition: '',
      reference: '',
      reviewStatus: 'UNCITED',
    };
  }
  return {
    state: 'NOT_ATTESTED',
    sourceId: '',
    work: '',
    author: '',
    edition: '',
    reference: '',
    reviewStatus: 'PENDING',
  };
}

/**
 * Resolve contextual-meaning provenance from a word-study row source tag.
 * Known bundled tier tags -> CORPUS. An explicit tafsir source id (passed
 * by the caller, never guessed) -> TAFSIR. Empty -> NOT_ATTESTED.
 */
export function resolveContextProvenance(tokenStudy) {
  const source = typeof tokenStudy?.contextualMeaning?.source === 'string'
    ? tokenStudy.contextualMeaning.source
    : typeof tokenStudy?.source === 'string'
      ? tokenStudy.source
      : '';
  const hasText = Boolean(
    (typeof tokenStudy?.contextualMeaning?.ar === 'string' &&
      tokenStudy.contextualMeaning.ar.trim()) ||
    (typeof tokenStudy?.mA === 'string' && tokenStudy.mA.trim())
  );
  if (!hasText) {
    return { state: 'NOT_ATTESTED', sourceId: source, reviewStatus: 'PENDING' };
  }
  if (source.startsWith('tafsir:')) {
    return { state: 'TAFSIR', sourceId: source, reviewStatus: 'CITED' };
  }
  return { state: 'CORPUS', sourceId: source || 'bundled-word-study', reviewStatus: 'UNCITED' };
}
