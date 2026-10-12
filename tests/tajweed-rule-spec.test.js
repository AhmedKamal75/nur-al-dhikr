import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyWordTajweed,
  NOON_TANWEEN_RULE_GROUP,
  NOON_TANWEEN_SAME_WORD_EXCEPTIONS,
  noonTanweenRuleForNextBase,
  TAJWEED_RULES,
} from '../js/domain/tajweed.js';
import { TAJWEED_SOURCES, TAJWEED_WORKS } from '../js/domain/tajweedSources.js';

const groupRuleIds = NOON_TANWEEN_RULE_GROUP.rules.map(({ rule }) => rule);

test('noon/tanween specification is explicit, immutable, and limited to exclusive matching', () => {
  assert.equal(NOON_TANWEEN_RULE_GROUP.id, 'noon_sakinah_tanween');
  assert.equal(NOON_TANWEEN_RULE_GROUP.mode, 'first-match');
  assert.ok(Object.isFrozen(NOON_TANWEEN_RULE_GROUP));
  assert.ok(Object.isFrozen(NOON_TANWEEN_RULE_GROUP.rules));
  assert.equal(new Set(groupRuleIds).size, groupRuleIds.length, 'rule IDs must be unique');

  const legendIds = new Set(TAJWEED_RULES.map(({ id }) => id));
  const seenLetters = new Map();
  for (const entry of NOON_TANWEEN_RULE_GROUP.rules) {
    assert.ok(legendIds.has(entry.rule), `orphan rule ID: ${entry.rule}`);
    assert.ok(TAJWEED_SOURCES[entry.rule], `rule has no citation registry entry: ${entry.rule}`);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.nextBases));
    assert.ok(entry.nextBases.length > 0, `empty next-letter set: ${entry.rule}`);

    for (const base of entry.nextBases) {
      assert.equal([...base].length, 1, `expected one glyph for ${entry.rule}: ${base}`);
      assert.match(base, /^\p{L}$/u, `expected a letter, not a mark: ${base}`);
      assert.match(base, /^\p{Script=Arabic}$/u, `expected an Arabic letter: ${base}`);
      assert.ok(
        !seenLetters.has(base),
        `${base} assigned to both ${seenLetters.get(base)} and ${entry.rule}`
      );
      seenLetters.set(base, entry.rule);
    }
  }
});

test('every declarative follower letter maps to its exclusive rule in the live classifier', () => {
  for (const entry of NOON_TANWEEN_RULE_GROUP.rules) {
    for (const nextBase of entry.nextBases) {
      assert.equal(noonTanweenRuleForNextBase(nextBase), entry.rule);
      const spans = classifyWordTajweed('نْ', { nextWordFirstBase: nextBase });
      assert.deepEqual(
        spans.filter(({ rule }) => groupRuleIds.includes(rule)).map(({ rule }) => rule),
        [entry.rule],
        `classifier disagreed with ${entry.rule} before ${nextBase}`
      );
    }
  }
});

test('Izhar Mutlaq exception list is closed, sourced, and separate from ordinary matching', () => {
  assert.equal(NOON_TANWEEN_SAME_WORD_EXCEPTIONS.id, 'izhar_mutlaq');
  assert.equal(NOON_TANWEEN_SAME_WORD_EXCEPTIONS.rule, 'izhar');
  assert.equal(NOON_TANWEEN_SAME_WORD_EXCEPTIONS.source, 'awqaf-noon-sakinah');
  assert.ok(Object.isFrozen(NOON_TANWEEN_SAME_WORD_EXCEPTIONS));
  assert.ok(Object.isFrozen(NOON_TANWEEN_SAME_WORD_EXCEPTIONS.wordSkeletons));
  assert.deepEqual(
    NOON_TANWEEN_SAME_WORD_EXCEPTIONS.nextBases,
    ['ي', 'و']
  );
  assert.ok(TAJWEED_SOURCES.izhar.also.some((citation) =>
    citation.work === NOON_TANWEEN_SAME_WORD_EXCEPTIONS.source
  ));
  assert.ok(TAJWEED_WORKS[NOON_TANWEEN_SAME_WORD_EXCEPTIONS.source].url);

  for (const [word, nextBase] of [
    ['ٱلدُّنۡيَا', 'ي'],
    ['بُنۡيَٰنٗا', 'ي'],
    ['صِنۡوَانٞ', 'و'],
    ['قِنۡوَانٞ', 'و'],
  ]) {
    const spans = classifyWordTajweed(word);
    assert.ok(spans.some(({ rule }) => rule === 'izhar'), word);
    assert.ok(!spans.some(({ rule }) => rule === 'idgham_ghunnah'), word);
    assert.equal(
      noonTanweenRuleForNextBase(nextBase, {
        sameWord: true,
        wordSkeleton:
          word === 'ٱلدُّنۡيَا' ? 'الدنيا' :
          word === 'بُنۡيَٰنٗا' ? 'بنيانا' :
          word === 'صِنۡوَانٞ' ? 'صنوان' : 'قنوان',
      }),
      'izhar'
    );
  }

  const nonException = classifyWordTajweed('مِنْيَ');
  assert.ok(nonException.some(({ rule }) => rule === 'idgham_ghunnah'));
  assert.ok(!nonException.some(({ rule }) => rule === 'izhar'));
});

test('unknown following letters do not acquire a noon/tanween rule', () => {
  for (const base of ['ا', 'ى', '۩', 'A', '']) {
    assert.equal(noonTanweenRuleForNextBase(base), null);
    const spans = classifyWordTajweed('نْ', { nextWordFirstBase: base });
    assert.ok(!spans.some(({ rule }) => groupRuleIds.includes(rule)), base);
  }
});

test('cross-word lookahead preserves a combining hamza on initial alif', () => {
  const marked = classifyWordTajweed('نْ', {
    nextWordFirstBase: 'ا',
    nextWordFirstHasHamzaAbove: true,
  });
  assert.ok(marked.some(({ rule }) => rule === 'izhar'));

  const unmarked = classifyWordTajweed('نْ', {
    nextWordFirstBase: 'ا',
    nextWordFirstHasHamzaAbove: false,
  });
  assert.ok(!unmarked.some(({ rule }) => groupRuleIds.includes(rule)));
});

test('cross-word lookahead treats combining hamza-below on a yeh carrier as hamza', () => {
  const marked = classifyWordTajweed('نْ', {
    nextWordFirstBase: 'ي',
    nextWordFirstHasHamzaBelow: true,
  });
  assert.ok(marked.some(({ rule }) => rule === 'izhar'));

  const plain = classifyWordTajweed('نْ', {
    nextWordFirstBase: 'ي',
    nextWordFirstHasHamzaBelow: false,
  });
  assert.ok(plain.some(({ rule }) => rule === 'idgham_ghunnah'));
});
