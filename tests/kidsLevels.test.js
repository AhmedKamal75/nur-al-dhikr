/**
 * tests/kidsLevels.test.js — (v5.10.1) kids progression: level ladder,
 * weekly activity, seeded memory-quiz rounds, and the quiz session
 * reducer (shape validation, hostile-input safety, per-surah stars).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { KIDS_LEVELS, kidsLevelFor, kidsWeek, kidsQuizRound } from '../js/domain/kids.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderKids } from '../js/views/kids.js';

const POOL = [
  { n: 1, nameAr: 'الفاتحة', nameEn: 'Al-Fatiha' },
  { n: 112, nameAr: 'الإخلاص', nameEn: 'Al-Ikhlas' },
  { n: 113, nameAr: 'الفلق', nameEn: 'Al-Falaq' },
  { n: 114, nameAr: 'الناس', nameEn: 'An-Nas' },
  { n: 108, nameAr: 'الكوثر', nameEn: 'Al-Kawthar' },
];

describe('kidsLevelFor', () => {
  test('ladder boundaries + final form', () => {
    assert.equal(kidsLevelFor(0).level.id, 'seed');
    assert.equal(kidsLevelFor(4).level.id, 'seed');
    assert.equal(kidsLevelFor(4).next.id, 'sprout');
    assert.equal(kidsLevelFor(5).level.id, 'sprout');
    assert.equal(kidsLevelFor(100).level.id, 'crown');
    assert.equal(kidsLevelFor(100).next, null);
    assert.equal(kidsLevelFor(100).progress, 1);
    assert.equal(kidsLevelFor(10000).level.id, 'crown', 'caps at the top');
  });

  test('hostile totals degrade to seed', () => {
    for (const bad of [NaN, -5, 'x', null, undefined, Infinity]) {
      assert.equal(kidsLevelFor(bad).level.id, 'seed', `total ${String(bad)}`);
    }
    assert.ok(KIDS_LEVELS.every((l) => typeof l.id === 'string' && l.at >= 0));
  });

  test('progress is 0..1 toward next', () => {
    const p = kidsLevelFor(10); // sprout 5 → explorer 15
    assert.equal(p.level.id, 'sprout');
    assert.ok(Math.abs(p.progress - 0.5) < 1e-9);
  });
});

describe('kidsWeek', () => {
  test('seven days ending today, oldest first', () => {
    const week = kidsWeek({ '2026-09-17': 3 }, new Date(2026, 8, 17));
    assert.equal(week.length, 7);
    assert.equal(week[6].key, '2026-09-17');
    assert.equal(week[6].count, 3);
    assert.equal(week[0].key, '2026-09-11');
    assert.ok(week.slice(0, 6).every((d) => d.count === 0));
  });

  test('hostile maps degrade to zeros', () => {
    const week = kidsWeek({ nope: 9, '2026-09-17': -4 }, new Date(2026, 8, 17));
    assert.ok(week.every((d) => d.count >= 0));
    assert.equal(week.length, 7);
    assert.deepEqual(kidsWeek(null).length, 7);
  });
});

describe('kidsQuizRound', () => {
  test('target + 4 shuffled options, deterministic per seed', () => {
    const a = kidsQuizRound(POOL, 42);
    const b = kidsQuizRound(POOL, 42);
    assert.deepEqual(a, b);
    assert.equal(a.options.length, 4);
    assert.ok(a.options.some((o) => o.n === a.target.n));
    assert.equal(new Set(a.options.map((o) => o.n)).size, 4);
  });

  test('too-small pool returns null', () => {
    assert.equal(kidsQuizRound(POOL.slice(0, 3), 1), null);
    assert.equal(kidsQuizRound(null, 1), null);
  });
});

describe('kids quiz reducer + stars', () => {
  const round = kidsQuizRound(POOL, 7);

  test('start validates shape; answer walks once; exit clears', () => {
    let s = { ...initialState(), kidsQuiz: null };
    s = reduce(s, actions.kidsQuizStart({ nope: true }));
    assert.equal(s.kidsQuiz, null, 'junk round ignored');
    s = reduce(s, actions.kidsQuizStart(round));
    assert.equal(s.kidsQuiz.target, round.target.n);
    assert.equal(s.kidsQuiz.options.length, 4);
    assert.equal(s.kidsQuiz.answered, null);
    const wrong = round.options.find((o) => o.n !== round.target.n).n;
    s = reduce(s, actions.kidsQuizAnswer(wrong));
    assert.equal(s.kidsQuiz.answered, wrong);
    s = reduce(s, actions.kidsQuizAnswer(round.target.n));
    assert.equal(s.kidsQuiz.answered, wrong, 'first answer sticks');
    s = reduce(s, actions.kidsQuizExit());
    assert.equal(s.kidsQuiz, null);
  });

  test('award carries an optional per-surah breakdown', () => {
    let s = { ...initialState(), kidsStars: { total: 0, days: {}, bySurah: {} } };
    s = reduce(s, actions.awardKidsStar(114));
    s = reduce(s, actions.awardKidsStar('junk'));
    assert.equal(s.kidsStars.total, 2);
    assert.deepEqual(s.kidsStars.bySurah, { 114: 1 });
  });
});

describe('kids view renders progression', () => {
  test('level + quiz + parent panel appear', () => {
    const s = {
      ...initialState(),
      settings: { ...initialState().settings, language: 'en' },
      quran: {
        meta: {
          surahs: POOL.map((p) => ({
            number: p.n,
            nameAr: p.nameAr,
            nameTransliteration: p.nameEn,
          })),
        },
        surahs: {},
      },
      kidsStars: { total: 7, days: {}, bySurah: { 114: 2 } },
      kidsQuiz: null,
    };
    const html = renderKids(s);
    assert.match(html, /panel--kids-level/, 'level banner');
    assert.match(html, /Sprout/, 'level name for 7 stars');
    assert.match(html, /panel--kids-quiz/, 'quiz panel');
    assert.match(html, /kids-quiz-start/, 'start button');
    assert.match(html, /panel--kids-parent/, 'parent dashboard');
  });
});
