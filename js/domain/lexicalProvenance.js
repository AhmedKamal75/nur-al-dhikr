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

const FUNCTION_SUBTYPES = new Set([
  'CERT',
  'COND',
  'CONJ',
  'DEM',
  'EXH',
  'EXL',
  'EXP',
  'FUT',
  'INL',
  'INT',
  'INTG',
  'LOC',
  'NEG',
  'P',
  'PREV',
  'PRON',
  'REL',
  'RES',
  'RET',
  'SUB',
  'T',
]);

/** Minimal citation shape from data/lexical-provenance-schema.json. */
export function isValidCitation(src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return false;
  if ('tracking' in src || 'beacon' in src) return false;
  for (const key of ['sourceId', 'work', 'author', 'edition']) {
    if (typeof src[key] !== 'string' || !src[key].trim()) return false;
  }
  for (const key of ['location', 'url']) {
    if (key in src && (typeof src[key] !== 'string' || !src[key].trim())) return false;
  }
  if ('url' in src) {
    try {
      const url = new URL(src.url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid']) {
        if (url.searchParams.has(key)) return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

export function genericSourceState(source) {
  if (typeof source !== 'string' || !source) return null;
  return GENERIC_SOURCE_TO_STATE[source] || null;
}

function textValue(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function provenanceRecord({
  state,
  sourceId = '',
  work = '',
  author = '',
  edition = '',
  reference = '',
  url = '',
  reviewStatus = 'PENDING',
}) {
  return {
    state,
    sourceId: textValue(sourceId, 160),
    work: textValue(work),
    author: textValue(author),
    edition: textValue(edition),
    reference: textValue(reference),
    url: textValue(url),
    reviewStatus: textValue(reviewStatus, 40) || 'PENDING',
  };
}

function citationRecord(src, state = LEXICAL_STATES.CLASSICAL_LEXICON, reviewStatus = 'CURATED') {
  if (!isValidCitation(src)) return null;
  return provenanceRecord({
    state,
    sourceId: src.sourceId,
    work: src.work,
    author: src.author,
    edition: src.edition,
    reference: src.location,
    url: src.url,
    reviewStatus,
  });
}

function invalidCitationSource(src) {
  return textValue(src?.sourceId, 160) || 'bundled-quran-dict';
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
  const subtype = typeof word.subtype?.code === 'string' ? word.subtype.code : '';
  if (pos === 'P' || FUNCTION_SUBTYPES.has(subtype)) return true;
  return false;
}

/**
 * Resolve a synonym/antonym list to a field-aware state. Never invents
 * entries: a non-empty list is returned as-is, otherwise the token is
 * classified NOT_APPLICABLE (function word) or NOT_ATTESTED.
 */
export function resolveLexicalListState(list, word, dictEntry = null) {
  const clean = Array.isArray(list)
    ? list
        .filter((s) => typeof s === 'string' && s.trim())
        .map((s) => s.trim().slice(0, 60))
        .slice(0, 12)
    : [];
  const provenance = resolveLemmaProvenance(dictEntry);
  if (clean.length) {
    const state =
      provenance.state === LEXICAL_STATES.CLASSICAL_LEXICON
        ? LEXICAL_STATES.CURATED
        : LEXICAL_STATES.CORPUS;
    return { state, list: clean, provenance };
  }
  if (isFunctionToken(word)) {
    return { state: LEXICAL_STATES.NOT_APPLICABLE, list: [], provenance };
  }
  return { state: LEXICAL_STATES.NOT_ATTESTED, list: [], provenance };
}

export function resolveAntonymState(dictEntry, word) {
  return resolveLexicalListState(dictEntry?.ant, word, dictEntry);
}

export function resolveSynonymState(dictEntry, word) {
  return resolveLexicalListState(dictEntry?.syn, word, dictEntry);
}

export function resolveLemmaProvenance(dictEntry, rawEntry = null) {
  const entry =
    dictEntry && typeof dictEntry === 'object' && !Array.isArray(dictEntry)
      ? dictEntry
      : rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
        ? rawEntry
        : null;
  const src = dictEntry?.src ?? rawEntry?.src ?? null;
  const cited = citationRecord(src);
  if (cited) return cited;
  if (!entry) {
    return provenanceRecord({ state: LEXICAL_STATES.NOT_ATTESTED, reviewStatus: 'PENDING' });
  }
  return provenanceRecord({
    state: LEXICAL_STATES.CORPUS,
    sourceId: src != null ? invalidCitationSource(src) : 'bundled-quran-dict',
    work: src != null ? '' : 'Bundled Quran lemma dictionary',
    edition: src != null ? '' : 'app-bundled',
    reviewStatus: src != null ? 'INVALID_CITATION' : 'UNCITED',
  });
}

export function resolveRootProvenance(rootEntry) {
  if (!rootEntry || typeof rootEntry !== 'object' || Array.isArray(rootEntry)) {
    return provenanceRecord({ state: LEXICAL_STATES.NOT_ATTESTED, reviewStatus: 'PENDING' });
  }
  const cited = citationRecord(rootEntry.src);
  if (cited) return cited;
  if (rootEntry.src != null) {
    return provenanceRecord({
      state: LEXICAL_STATES.CORPUS,
      sourceId: invalidCitationSource(rootEntry.src),
      reviewStatus: 'INVALID_CITATION',
    });
  }
  const mapped = genericSourceState(rootEntry.source);
  if (mapped) {
    return provenanceRecord({
      state: mapped,
      sourceId: rootEntry.source,
      reviewStatus: mapped === LEXICAL_STATES.CORPUS ? 'UNCITED' : 'N/A',
    });
  }
  return provenanceRecord({
    state: LEXICAL_STATES.CORPUS,
    sourceId: 'bundled-root-core-meaning',
    reviewStatus: 'UNCITED',
  });
}

export function resolveContextProvenance(tokenStudy) {
  const meaning =
    tokenStudy?.contextualMeaning && typeof tokenStudy.contextualMeaning === 'object'
      ? tokenStudy.contextualMeaning
      : {};
  const source = textValue(meaning.source || tokenStudy?.source, 160);
  const citation =
    meaning.citation ||
    (meaning.src && typeof meaning.src === 'object' ? meaning.src : null) ||
    tokenStudy?.citation ||
    null;
  const cited = citationRecord(citation);
  const hasText = Boolean(
    (typeof meaning.ar === 'string' && meaning.ar.trim()) ||
    (typeof meaning.en === 'string' && meaning.en.trim()) ||
    (typeof tokenStudy?.mA === 'string' && tokenStudy.mA.trim()) ||
    (typeof tokenStudy?.mE === 'string' && tokenStudy.mE.trim())
  );
  if (!hasText) {
    if (cited) return { ...cited, state: LEXICAL_STATES.NOT_ATTESTED, reviewStatus: 'PENDING' };
    if (citation != null) {
      return provenanceRecord({
        state: LEXICAL_STATES.NOT_ATTESTED,
        sourceId: source || invalidCitationSource(citation),
        reviewStatus: 'INVALID_CITATION',
      });
    }
    return provenanceRecord({
      state: LEXICAL_STATES.NOT_ATTESTED,
      sourceId: source,
      reviewStatus: 'PENDING',
    });
  }
  const tafsir =
    source.startsWith('tafsir:') || textValue(citation?.sourceId, 160).startsWith('tafsir:');
  if (tafsir) {
    return (
      (cited && { ...cited, state: LEXICAL_STATES.TAFSIR, reviewStatus: 'CITED' }) ||
      provenanceRecord({
        state: LEXICAL_STATES.TAFSIR,
        sourceId: source,
        reviewStatus: 'CITED',
      })
    );
  }
  if (cited) return cited;
  if (citation != null) {
    return provenanceRecord({
      state: LEXICAL_STATES.CORPUS,
      sourceId: source || invalidCitationSource(citation),
      reviewStatus: 'INVALID_CITATION',
    });
  }
  return provenanceRecord({
    state: LEXICAL_STATES.CORPUS,
    sourceId: source || 'bundled-word-study',
    reviewStatus: 'UNCITED',
  });
}

export function resolveIrabProvenance(tokenStudy) {
  const irab = tokenStudy?.irab && typeof tokenStudy.irab === 'object' ? tokenStudy.irab : {};
  const source = textValue(irab.source || tokenStudy?.iSrc, 160);
  const citation =
    irab.citation || (irab.src && typeof irab.src === 'object' ? irab.src : null) || null;
  const cited = citationRecord(citation);
  const hasText = Boolean(
    (typeof irab.ar === 'string' && irab.ar.trim()) ||
    (typeof irab.en === 'string' && irab.en.trim())
  );
  if (!hasText) {
    if (cited) return { ...cited, state: LEXICAL_STATES.NOT_ATTESTED, reviewStatus: 'PENDING' };
    if (citation != null) {
      return provenanceRecord({
        state: LEXICAL_STATES.NOT_ATTESTED,
        sourceId: source || invalidCitationSource(citation),
        reviewStatus: 'INVALID_CITATION',
      });
    }
    return provenanceRecord({ state: LEXICAL_STATES.NOT_ATTESTED, reviewStatus: 'PENDING' });
  }
  if (cited) return cited;
  if (citation != null) {
    return provenanceRecord({
      state: LEXICAL_STATES.CORPUS,
      sourceId: source || invalidCitationSource(citation),
      reviewStatus: 'INVALID_CITATION',
    });
  }
  return provenanceRecord({
    state: LEXICAL_STATES.CORPUS,
    sourceId: source || 'bundled-word-study',
    reviewStatus: 'UNCITED',
  });
}
