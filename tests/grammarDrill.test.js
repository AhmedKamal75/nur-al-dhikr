/**
 * tests/grammarDrill.test.js — grammar flashcards: pure deck building
 * (deterministic shuffle, candidate filtering, caps) + the ephemeral
 * session reducer walk.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { collectDrillWords, buildDeck, DRILL_SIZE } from '../js/domain/grammarDrill.js';

const CACHE = {
  2: {
    1: [
      {
        text: 'الٓمٓ',
        posEn: 'Preposition',
        posAr: 'حرف جر',
        en: 'Alif Laam Meem',
        translit: 'x',
        caseEn: null,
        moodEn: null,
        verbPattern: null,
        root: null,
      },
      {
        text: 'ذَٰلِكَ',
        posEn: 'Demonstrative',
        posAr: 'اسم إشارة',
        en: 'That',
        translit: 'dhalika',
        caseEn: 'Nominative',
        moodEn: null,
        verbPattern: null,
        root: null,
      },
      { text: 'xyz', posEn: null, en: 'Untagged' },
      { text: '', posEn: 'Noun', en: 'Empty' },
    ],
    2: [
      {
        text: 'ٱللَّهُ',
        posEn: 'Proper noun',
        posAr: 'اسم علم',
        en: 'Allah',
        translit: 'allah',
        caseEn: null,
        moodEn: null,
        verbPattern: null,
        root: 'أ ل ه',
      },
    ],
  },
  junk: {},
};

describe('deck building', () => {
  test('collects only quizzable words with feats', () => {
    const words = collectDrillWords(CACHE);
    assert.equal(words.length, 3, 'untagged + empty text skipped');
    assert.deepEqual(words[0].feats, [], 'no features → empty list');
    assert.deepEqual(words[1].feats, ['Nominative']);
    assert.equal(words[2].root, 'أ ل ه');
    assert.deepEqual(collectDrillWords(null), []);
    assert.deepEqual(
      collectDrillWords({ 999: { 1: [{ text: 'x', posEn: 'N' }] } }),
      [],
      'bad surah skipped'
    );
  });

  test('shuffles deterministically with an injected rng and caps', () => {
    const zeros = buildDeck(CACHE, { count: 50, rng: () => 0 });
    assert.equal(zeros.length, 3, 'capped by pool, not the request');
    const ones = buildDeck(CACHE, { count: 2, rng: () => 0.9999 });
    assert.equal(ones.length, 2);
    assert.deepEqual(
      buildDeck(CACHE, { count: 2, rng: () => 0 }).map((c) => c.id),
      buildDeck(CACHE, { count: 2, rng: () => 0 }).map((c) => c.id),
      'same rng → same deck'
    );
    assert.equal(DRILL_SIZE, 10);
  });
});

describe('GRAMMAR_DRILL_*', () => {
  const deck = [
    { id: '2:1:0', text: 'a', posEn: 'Noun' },
    { id: '2:1:1', text: 'b', posEn: 'Verb' },
  ];
  test('walks start → reveal → grade → done → exit', () => {
    let s = { ...initialState(), grammarDrill: null };
    s = reduce(s, actions.startGrammarDrill(deck));
    assert.equal(s.grammarDrill.index, 0);
    s = reduce(s, actions.gradeGrammarCard(true));
    assert.equal(s.grammarDrill.index, 0, 'unrevealed grade refused');
    s = reduce(s, actions.revealGrammarCard());
    assert.equal(s.grammarDrill.revealed, true);
    s = reduce(s, actions.gradeGrammarCard(true));
    assert.deepEqual([s.grammarDrill.index, s.grammarDrill.right], [1, 1]);
    s = reduce(s, actions.revealGrammarCard());
    s = reduce(s, actions.gradeGrammarCard(false));
    assert.deepEqual([s.grammarDrill.index, s.grammarDrill.wrong], [2, 1]);
    s = reduce(s, actions.exitGrammarDrill());
    assert.equal(s.grammarDrill, null);
    s = reduce(s, actions.startGrammarDrill([]));
    assert.equal(s.grammarDrill, null, 'empty deck refused');
  });
});
