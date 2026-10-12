import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyWordTajweed,
  NOON_TANWEEN_RULE_GROUP,
  noonTanweenRuleForNextBase,
  TAJWEED_RULES,
} from '../js/domain/tajweed.js';
import { TAJWEED_SOURCES } from '../js/domain/tajweedSources.js';

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

test('declarative next-letter rules reproduce each current noon/tanween branch', () => {
  const cases = [
    ['ب', 'iqlab'],
    ['ي', 'idgham_ghunnah'],
    ['ن', 'idgham_ghunnah'],
    ['م', 'idgham_ghunnah'],
    ['و', 'idgham_ghunnah'],
    ['ل', 'idgham_no_ghunnah'],
    ['ر', 'idgham_no_ghunnah'],
    ['ت', 'ikhfa'],
    ['ك', 'ikhfa'],
    ['ء', 'izhar'],
    ['ه', 'izhar'],
    ['ع', 'izhar'],
    ['ح', 'izhar'],
    ['غ', 'izhar'],
    ['خ', 'izhar'],
  ];

  for (const [nextBase, expectedRule] of cases) {
    assert.equal(noonTanweenRuleForNextBase(nextBase), expectedRule);
    const spans = classifyWordTajweed('نْ', { nextWordFirstBase: nextBase });
    assert.deepEqual(
      spans.filter(({ rule }) => groupRuleIds.includes(rule)).map(({ rule }) => rule),
      [expectedRule],
      `classifier disagreed with the spec before ${nextBase}`
    );
  }
});

test('unknown following letters do not acquire a noon/tanween rule', () => {
  for (const base of ['ا', 'ى', '۩', 'A', '']) {
    assert.equal(noonTanweenRuleForNextBase(base), null);
    const spans = classifyWordTajweed('نْ', { nextWordFirstBase: base });
    assert.ok(!spans.some(({ rule }) => groupRuleIds.includes(rule)), base);
  }
});
