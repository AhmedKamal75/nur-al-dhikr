import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyWordTajweed,
  MEEM_SAKINAH_RULE_GROUP,
  NOON_TANWEEN_RULE_GROUP,
  NOON_TANWEEN_SAME_WORD_EXCEPTIONS,
  meemSakinahRuleForNextBase,
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
  assert.deepEqual(NOON_TANWEEN_SAME_WORD_EXCEPTIONS.nextBases, ['ي', 'و']);
  assert.ok(
    TAJWEED_SOURCES.izhar.also.some(
      (citation) => citation.work === NOON_TANWEEN_SAME_WORD_EXCEPTIONS.source
    )
  );
  assert.ok(TAJWEED_WORKS[NOON_TANWEEN_SAME_WORD_EXCEPTIONS.source].url);

  const fixtures = [
    { word: 'ٱلدُّنۡيَا', nextBase: 'ي', wordSkeleton: 'الدنيا' },
    { word: 'بُنۡيَٰنٗا', nextBase: 'ي', wordSkeleton: 'بنيانا' },
    { word: 'صِنۡوَانٞ', nextBase: 'و', wordSkeleton: 'صنوان' },
    { word: 'قِنۡوَانٞ', nextBase: 'و', wordSkeleton: 'قنوان' },
  ];

  for (const { word, nextBase, wordSkeleton } of fixtures) {
    const spans = classifyWordTajweed(word);
    assert.ok(spans.some(({ rule }) => rule === 'izhar'), word);
    assert.ok(!spans.some(({ rule }) => rule === 'idgham_ghunnah'), word);
    assert.equal(
      noonTanweenRuleForNextBase(nextBase, { sameWord: true, wordSkeleton }),
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

test('cross-word lookahead resolves combining hamza for all supported seats', () => {
  for (const [nextWordFirstBase, mark, flag] of [
    ['ا', 'above', 'nextWordFirstHasHamzaAbove'],
    ['ا', 'below', 'nextWordFirstHasHamzaBelow'],
    ['و', 'above', 'nextWordFirstHasHamzaAbove'],
    ['ي', 'above', 'nextWordFirstHasHamzaAbove'],
    ['ي', 'below', 'nextWordFirstHasHamzaBelow'],
  ]) {
    const marked = classifyWordTajweed('نْ', {
      nextWordFirstBase,
      [flag]: true,
    });
    assert.ok(
      marked.some(({ rule }) => rule === 'izhar'),
      `${mark} hamza on ${nextWordFirstBase} must be Izhar`
    );
  }

  for (const nextWordFirstBase of ['ا', 'و', 'ي']) {
    const plain = classifyWordTajweed('نْ', { nextWordFirstBase });
    assert.ok(
      !plain.some(({ rule }) => NOON_TANWEEN_RULE_GROUP.rules.some(
        ({ rule }) => rule !== 'izhar' && plain.some((span) => span.rule === rule)
      )),
      `unmarked ${nextWordFirstBase} must not be treated as a hamza`
    );
  }
});
test('Meem Sakinah uses its explicit exceptions and sourced-rule fallback', () => {
  assert.equal(MEEM_SAKINAH_RULE_GROUP.id, 'meem_sakinah');
  assert.equal(MEEM_SAKINAH_RULE_GROUP.mode, 'explicit-with-default');
  assert.equal(MEEM_SAKINAH_RULE_GROUP.defaultRule, 'izhar_shafawi');
  assert.ok(Object.isFrozen(MEEM_SAKINAH_RULE_GROUP));
  assert.ok(Object.isFrozen(MEEM_SAKINAH_RULE_GROUP.rules));

  const seen = new Set();
  for (const entry of MEEM_SAKINAH_RULE_GROUP.rules) {
    assert.ok(TAJWEED_RULES.some(({ id }) => id === entry.rule), entry.rule);
    assert.ok(TAJWEED_SOURCES[entry.rule], entry.rule);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.nextBases));
    for (const base of entry.nextBases) {
      assert.match(base, /^\\p{L}$/u);
      assert.match(base, /^\\p{Script=Arabic}$/u);
      assert.ok(!seen.has(base), `overlapping Meem Sakinah follower: ${base}`);
      seen.add(base);
    }
  }

  for (const [nextBase, expectedRule] of [
    ['م', 'idgham_shafawi'],
    ['ب', 'ikhfa_shafawi'],
    ['ت', 'izhar_shafawi'],
    ['ن', 'izhar_shafawi'],
    ['ء', 'izhar_shafawi'],
  ]) {
    assert.equal(meemSakinahRuleForNextBase(nextBase), expectedRule);
    const spans = classifyWordTajweed('مْ', { nextWordFirstBase: nextBase });
    const matchingRules = spans
      .filter(({ rule }) => ['idgham_shafawi', 'ikhfa_shafawi', 'izhar_shafawi'].includes(rule))
      .map(({ rule }) => rule);
    assert.deepEqual(
      matchingRules,
      [expectedRule],
      `classifier disagreed with the Meem Sakinah table before ${nextBase}`
    );
  }

  assert.equal(meemSakinahRuleForNextBase(null), null);
  assert.equal(meemSakinahRuleForNextBase(''), null);
});
