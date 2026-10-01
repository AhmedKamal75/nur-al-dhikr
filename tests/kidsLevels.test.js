/**
 * tests/kidsLevels.test.js — (v5.17.58, merged-plan item 11) kids quiz
 * without awards: seeded memory-quiz rounds and the quiz session reducer
 * (shape validation, hostile-input safety). The level ladder and the week
 * chart are retired — see tests/kids-degamified.test.js for the
 * no-star/level/award pins.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { kidsQuizRound } from '../js/domain/kids.js';
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

describe('kids quiz reducer (no awards)', () => {
  const round = kidsQuizRound(POOL, 7);

  test('start validates shape; answer walks once; exit clears; count untouched', () => {
    let s = { ...initialState(), kidsQuiz: null, kidsHeard: { total: 0 } };
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
    assert.deepEqual(s.kidsHeard, { total: 0 }, 'quiz never awards');
    s = reduce(s, actions.kidsQuizExit());
    assert.equal(s.kidsQuiz, null);
  });
});

describe('kids view renders quiz without awards', () => {
  test('quiz + plain heard panel appear, no level markup', () => {
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
      kidsHeard: { total: 7 },
      kidsQuiz: null,
    };
    const html = renderKids(s);
    assert.doesNotMatch(html, /panel--kids-level/, 'no level banner');
    assert.match(html, /panel--kids-heard/, 'plain heard panel');
    assert.match(html, /panel--kids-quiz/, 'quiz panel');
    assert.match(html, /kids-quiz-start/, 'start button');
  });
});
