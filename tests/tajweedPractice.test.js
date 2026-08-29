import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickRoundEntry,
  buildAnswerKey,
  scoreRound,
  defaultTajweedPracticeStats,
  nextStats,
  accuracyFor,
} from '../js/tajweedPractice.js';

const POOL = {
  byRule: {
    qalqalah: [
      { s: 2, a: 2, w: 7, c: 1 },
      { s: 2, a: 25, w: 8, c: 1 },
    ],
    ikhfa: [{ s: 2, a: 3, w: 8, c: 2 }],
  },
  mixed: [{ s: 1, a: 1, w: 4, rules: ['hamzat_wasl', 'madd_246'] }],
};

test('pickRoundEntry returns an entry from the right pool', () => {
  const e = pickRoundEntry(POOL, 'qalqalah');
  assert.ok(e.s === 2 && [2, 25].includes(e.a));
  assert.equal(pickRoundEntry(POOL, 'mixed').s, 1);
});

test('pickRoundEntry avoids repeating the given ayah when an alternative exists', () => {
  for (let i = 0; i < 20; i += 1) {
    const e = pickRoundEntry(POOL, 'qalqalah', { s: 2, a: 2 });
    assert.notEqual(e.a, 2);
  }
});

test('pickRoundEntry falls back to the full list when avoiding would empty it', () => {
  const e = pickRoundEntry(POOL, 'ikhfa', { s: 2, a: 3 });
  assert.equal(e.a, 3); // only one entry exists; avoiding it must not return null
});

test('pickRoundEntry returns null for an empty/unknown rule or pool', () => {
  assert.equal(pickRoundEntry(POOL, 'not-a-rule'), null);
  assert.equal(pickRoundEntry(null, 'qalqalah'), null);
  assert.equal(pickRoundEntry({}, 'qalqalah'), null);
});

test('buildAnswerKey matches what the reading-mode classifier would color', () => {
  const ayah =
    '\u0628ِ\u0633\u0652\u0645ِ \u0671\u0644\u0644\u0651\u064e\u0647ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0652\u0645\u064e\u0670\u0646ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0650\u064a\u0645ِ';
  const targets = buildAnswerKey(ayah, 'hamzat_wasl');
  assert.equal(targets.length, 3); // three ٱ in this ayah
  assert.ok(targets.every((t) => t.rule === 'hamzat_wasl'));
});

test('buildAnswerKey with "mixed" collects every rule found', () => {
  const ayah =
    '\u0628ِ\u0633\u0652\u0645ِ \u0671\u0644\u0644\u0651\u064e\u0647ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0652\u0645\u064e\u0670\u0646ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0650\u064a\u0645ِ';
  const targets = buildAnswerKey(ayah, 'mixed');
  const rules = new Set(targets.map((t) => t.rule));
  assert.ok(rules.has('hamzat_wasl'));
  assert.ok(rules.has('lam_shamsiyyah'));
  assert.ok(rules.size > 1);
});

test('scoreRound: a perfect round has no wrong or missed taps', () => {
  const targets = [
    { word: 1, start: 0, end: 1, rule: 'x' },
    { word: 2, start: 3, end: 4, rule: 'x' },
  ];
  const result = scoreRound(targets, ['1:0:1', '2:3:4']);
  assert.equal(result.perfect, true);
  assert.equal(result.correct.length, 2);
  assert.equal(result.wrong.length, 0);
  assert.equal(result.missed.length, 0);
});

test('scoreRound: reports wrong taps and missed targets separately', () => {
  const targets = [
    { word: 1, start: 0, end: 1, rule: 'x' },
    { word: 2, start: 3, end: 4, rule: 'x' },
  ];
  const result = scoreRound(targets, ['1:0:1', '5:0:1']); // one right, one wrong, one missed
  assert.equal(result.perfect, false);
  assert.deepEqual(result.correct, ['1:0:1']);
  assert.deepEqual(result.wrong, ['5:0:1']);
  assert.equal(result.missed.length, 1);
  assert.equal(result.missed[0].word, 2);
});

test('scoreRound: tapping nothing when there is nothing to find is not "perfect" (targetCount 0 guards against a trivial win)', () => {
  const result = scoreRound([], []);
  assert.equal(result.perfect, false);
  assert.equal(result.targetCount, 0);
});

test('defaultTajweedPracticeStats starts at zero with no rules recorded', () => {
  const s = defaultTajweedPracticeStats();
  assert.equal(s.totalAttempts, 0);
  assert.equal(s.currentStreak, 0);
  assert.deepEqual(s.byRule, {});
});

test('nextStats: a perfect round extends the streak and updates the per-rule tally', () => {
  let stats = defaultTajweedPracticeStats();
  stats = nextStats(stats, 'qalqalah', true);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.bestStreak, 1);
  assert.deepEqual(stats.byRule.qalqalah, { correct: 1, attempts: 1 });

  stats = nextStats(stats, 'qalqalah', true);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.bestStreak, 2);
});

test('nextStats: a missed round resets the current streak but keeps the best streak', () => {
  let stats = defaultTajweedPracticeStats();
  stats = nextStats(stats, 'ikhfa', true);
  stats = nextStats(stats, 'ikhfa', true);
  assert.equal(stats.bestStreak, 2);
  stats = nextStats(stats, 'ikhfa', false);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestStreak, 2); // best streak is not erased by one miss
  assert.deepEqual(stats.byRule.ikhfa, { correct: 2, attempts: 3 });
});

test('nextStats never throws when called on an undefined/null previous state', () => {
  const s = nextStats(undefined, 'qalqalah', true);
  assert.equal(s.totalAttempts, 1);
});

test('accuracyFor: null (not a misleading 0%) before any attempts, a rounded percent after', () => {
  let stats = defaultTajweedPracticeStats();
  assert.equal(accuracyFor(stats), null);
  assert.equal(accuracyFor(stats, 'qalqalah'), null);

  stats = nextStats(stats, 'qalqalah', true);
  stats = nextStats(stats, 'qalqalah', false);
  stats = nextStats(stats, 'qalqalah', false);
  assert.equal(accuracyFor(stats, 'qalqalah'), 33); // 1/3 rounded
  assert.equal(accuracyFor(stats), 33); // overall matches, only one rule practiced so far
});
