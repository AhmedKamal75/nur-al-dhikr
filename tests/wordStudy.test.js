import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getWord,
  wordGrammarSummary,
  wordDetailTags,
  wordAffixLabels,
  rootOccurrences,
  isTafsirLoaded,
  splitEditions,
  findEdition,
} from '../js/domain/wordStudy.js';

const SAMPLE_WORDS = {
  1: {
    1: [
      {
        i: 1,
        text: '\u0628ِ\u0633\u0652\u0645ِ',
        pos: 'P',
        posAr: '\u062D\u0631\u0641 \u062C\u0631',
        posEn: 'Preposition',
        root: null,
      },
      {
        i: 2,
        text: '\u0627\u0644\u0644\u0651\u064e\u0647ِ',
        pos: 'N',
        posAr: '\u0627\u0633\u0645',
        posEn: 'Noun',
        root: '\u0623\u0644\u0647',
        case: 'GEN',
        caseAr: '\u0645\u062C\u0631\u0648\u0631',
        caseEn: 'Genitive (majr\u016Br)',
        subtype: { code: 'PN', ar: '\u0639\u0644\u0645', en: 'Proper noun' },
        definite: true,
        pgn: [],
      },
      {
        i: 4,
        text: '\u0627\u0644\u0631\u0651\u064e\u062D\u064a\u0645ِ',
        pos: 'N',
        posAr: '\u0627\u0633\u0645',
        posEn: 'Noun',
        root: '\u0631\u062D\u0645',
        case: 'GEN',
        caseAr: '\u0645\u062C\u0631\u0648\u0631',
        caseEn: 'Genitive (majr\u016Br)',
        adj: true,
        pgn: [
          {
            code: 'MS',
            ar: '\u0645\u0630\u0643\u0631 \u0645\u0641\u0631\u062F',
            en: 'Masculine Singular',
          },
        ],
      },
    ],
  },
};

describe('getWord', () => {
  test('finds a word by surah/ayah/index', () => {
    const w = getWord(SAMPLE_WORDS, 1, 1, 2);
    assert.equal(w.text, '\u0627\u0644\u0644\u0651\u064e\u0647ِ');
  });

  test('returns null for an unloaded surah or missing word', () => {
    assert.equal(getWord(SAMPLE_WORDS, 2, 1, 1), null);
    assert.equal(getWord(SAMPLE_WORDS, 1, 1, 99), null);
    assert.equal(getWord({}, 1, 1, 1), null);
  });
});

describe('wordGrammarSummary', () => {
  test('prefers subtype over generic POS, includes case', () => {
    const w = getWord(SAMPLE_WORDS, 1, 1, 2);
    const s = wordGrammarSummary(w, 'en');
    assert.match(s, /Proper noun/);
    assert.match(s, /Genitive/);
  });

  test('falls back to POS when there is no subtype', () => {
    const w = getWord(SAMPLE_WORDS, 1, 1, 4);
    const s = wordGrammarSummary(w, 'en');
    assert.match(s, /^Noun/);
  });

  test('empty for null word', () => {
    assert.equal(wordGrammarSummary(null, 'en'), '');
  });
});

describe('wordDetailTags', () => {
  test('includes definiteness and adjective flags', () => {
    const w2 = getWord(SAMPLE_WORDS, 1, 1, 2);
    assert.ok(wordDetailTags(w2, 'en').includes('Definite'));
    const w4 = getWord(SAMPLE_WORDS, 1, 1, 4);
    const tags = wordDetailTags(w4, 'en');
    assert.ok(tags.includes('Attribute (na\u02BFt)'));
    assert.ok(tags.some((t) => t === 'Masculine Singular'));
  });
});

describe('wordAffixLabels', () => {
  test('returns empty arrays when there are none', () => {
    const w = getWord(SAMPLE_WORDS, 1, 1, 2);
    const { prefixes, suffixes } = wordAffixLabels(w, 'en');
    assert.deepEqual(prefixes, []);
    assert.deepEqual(suffixes, []);
  });

  test('handles a null word without throwing', () => {
    assert.deepEqual(wordAffixLabels(null), { prefixes: [], suffixes: [] });
  });
});

describe('rootOccurrences', () => {
  const roots = {
    '\u0631\u062D\u0645': {
      count: 3,
      occ: [
        { s: 1, a: 1, i: 4, t: 'x' },
        { s: 1, a: 3, i: 1, t: 'y' },
        { s: 2, a: 5, i: 2, t: 'z' },
      ],
    },
  };

  test('excludes the current ayah and caps the sample', () => {
    const { count, sample } = rootOccurrences(roots, '\u0631\u062D\u0645', 1, 1, 8);
    assert.equal(count, 3);
    assert.equal(sample.length, 2);
    assert.ok(!sample.some((o) => o.s === 1 && o.a === 1));
  });

  test('unknown root returns zero/empty, never throws', () => {
    assert.deepEqual(rootOccurrences(roots, 'xxx', 1, 1), { count: 0, sample: [] });
    assert.deepEqual(rootOccurrences(null, '\u0631\u062D\u0645', 1, 1), { count: 0, sample: [] });
  });

  test('respects the limit', () => {
    const { sample } = rootOccurrences(roots, '\u0631\u062D\u0645', 99, 99, 1);
    assert.equal(sample.length, 1);
  });
});

describe('isTafsirLoaded', () => {
  test('true only once that edition+surah text is cached', () => {
    const t = { muyassar: { 1: { 1: 'text' } } };
    assert.equal(isTafsirLoaded(t, 'muyassar', 1), true);
    assert.equal(isTafsirLoaded(t, 'muyassar', 2), false);
    assert.equal(isTafsirLoaded(t, 'jalalayn', 1), false);
    assert.equal(isTafsirLoaded(null, 'muyassar', 1), false);
  });
});

describe('splitEditions / findEdition', () => {
  const catalog = {
    editions: [
      { id: 'muyassar', bundled: true },
      { id: 'tabari', bundled: false },
      { id: 'jalalayn', bundled: true },
    ],
  };

  test('splitEditions partitions bundled vs remote', () => {
    const { bundled, remote } = splitEditions(catalog);
    assert.equal(bundled.length, 2);
    assert.equal(remote.length, 1);
    assert.equal(remote[0].id, 'tabari');
  });

  test('splitEditions tolerates a missing/empty catalog', () => {
    assert.deepEqual(splitEditions(null), { bundled: [], remote: [] });
    assert.deepEqual(splitEditions({}), { bundled: [], remote: [] });
  });

  test('findEdition looks up by id or returns null', () => {
    assert.equal(findEdition(catalog, 'tabari').bundled, false);
    assert.equal(findEdition(catalog, 'nope'), null);
  });
});
