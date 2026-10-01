/**
 * tests/kids-degamified.test.js — (v5.17.58, merged-plan item 11) kids mode
 * degamified, gate kept. Permanent.
 *
 * No-star/level/award pins: the domain exports no level ladder, no week
 * helper and no award path; the view renders a plain heard count with no
 * star/level/week/erase markup and no star vocabulary in either language
 * for the retired keys. Gate-intact pins: the parent gate (Settings entry,
 * hold-to-exit button, gate strings, blocked toast) still exists, and the
 * listen + quiz surfaces still render without awards.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as kidsDomain from '../js/domain/kids.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderKids } from '../js/views/kids.js';
import { en as EN } from '../js/core/i18n/en.js';
import { ar as AR } from '../js/core/i18n/ar.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(ROOT + rel, 'utf8');

const POOL = [
  { n: 1, nameAr: 'الفاتحة', nameEn: 'Al-Fatiha' },
  { n: 112, nameAr: 'الإخلاص', nameEn: 'Al-Ikhlas' },
  { n: 113, nameAr: 'الفلق', nameEn: 'Al-Falaq' },
  { n: 114, nameAr: 'الناس', nameEn: 'An-Nas' },
  { n: 108, nameAr: 'الكوثر', nameEn: 'Al-Kawthar' },
];

function kidsMetaState(lang = 'en', extra = {}) {
  return {
    ...initialState(),
    settings: { ...initialState().settings, language: lang },
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
    kidsHeard: { total: 3 },
    kidsQuiz: null,
    ...extra,
  };
}

describe('kids degamified: no ladder, no week, no award export', () => {
  test('domain exports the surah list + quiz round only', () => {
    assert.ok(Array.isArray(kidsDomain.KIDS_SURAHS), 'KIDS_SURAHS stays');
    assert.equal(typeof kidsDomain.kidsQuizRound, 'function', 'quiz builder stays');
    assert.equal(kidsDomain.KIDS_LEVELS, undefined, 'no level ladder');
    assert.equal(kidsDomain.kidsLevelFor, undefined, 'no level helper');
    assert.equal(kidsDomain.kidsWeek, undefined, 'no week helper');
  });

  test('quiz round still builds without awards', () => {
    const round = kidsDomain.kidsQuizRound(POOL, 42);
    assert.equal(round.options.length, 4);
    assert.ok(round.options.some((o) => o.n === round.target.n));
  });

  test('no award/erase actions exist', () => {
    assert.equal(typeof actions.recordKidsHeard, 'function', 'plain-count action exists');
    assert.equal(actions.awardKidsStar, undefined, 'star award action gone');
    assert.equal(actions.eraseKidsStars, undefined, 'erase action gone');
  });

  test('heard reducer increments a plain total only', () => {
    let s = { ...initialState(), kidsHeard: { total: 0 } };
    s = reduce(s, actions.recordKidsHeard());
    s = reduce(s, actions.recordKidsHeard());
    assert.deepEqual(s.kidsHeard, { total: 2 }, 'plain count, no days/bySurah shape');
    assert.ok(PERSISTED_KEYS.includes('kidsHeard'), 'persisted under the new key');
    assert.ok(!PERSISTED_KEYS.includes('kidsStars'), 'old key gone');
  });

  test('quiz session still walks with no award side-effect', () => {
    const round = kidsDomain.kidsQuizRound(POOL, 7);
    let s = { ...initialState(), kidsQuiz: null, kidsHeard: { total: 0 } };
    s = reduce(s, actions.kidsQuizStart(round));
    assert.equal(s.kidsQuiz.target, round.target.n);
    const wrong = round.options.find((o) => o.n !== round.target.n).n;
    s = reduce(s, actions.kidsQuizAnswer(wrong));
    assert.equal(s.kidsQuiz.answered, wrong);
    assert.deepEqual(s.kidsHeard, { total: 0 }, 'answering never touches the count');
    s = reduce(s, actions.kidsQuizExit());
    assert.equal(s.kidsQuiz, null);
  });
});

describe('kids degamified: view carries no gamification', () => {
  test('no star/level/week/erase markup; plain heard panel present', () => {
    const html = renderKids(kidsMetaState());
    assert.doesNotMatch(html, /panel--kids-stars/, 'no stars panel');
    assert.doesNotMatch(html, /panel--kids-level/, 'no level banner');
    assert.doesNotMatch(html, /kids-week/, 'no week chart');
    assert.doesNotMatch(html, /kids-bysurah/, 'no per-surah table');
    assert.doesNotMatch(html, /kids-erase/, 'no erase path');
    assert.doesNotMatch(html, /kids-level__/, 'no level chrome');
    assert.doesNotMatch(html, /\bstars?\b/i, 'no star vocabulary in markup');
    assert.match(html, /panel--kids-heard/, 'plain heard panel');
    assert.match(html, /kids-heard__total/, 'plain count shown');
  });

  test('listen + quiz survive without awards', () => {
    const html = renderKids(kidsMetaState());
    assert.match(html, /kids-grid/, 'listen tiles');
    assert.match(html, /data-action="surah-play"/, 'tiles play');
    assert.match(html, /panel--kids-quiz/, 'quiz panel');
    assert.match(html, /kids-quiz-start/, 'quiz start');
  });

  test('quiz result copy awards nothing', () => {
    const round = kidsDomain.kidsQuizRound(POOL, 7);
    const answered = {
      target: round.target.n,
      options: round.options,
      answered: round.target.n,
    };
    const html = renderKids(kidsMetaState('en', { kidsQuiz: answered }));
    assert.match(html, /kids-quiz__result/, 'result renders');
    assert.doesNotMatch(html, /\bstars?\b/i, 'no star in the result');
    assert.doesNotMatch(html, /panel--kids-level/, 'no level in the result');
  });

  test('retired strap keys are gone in BOTH languages', () => {
    const retired = [
      'kids.stars',
      'kids.todayStars',
      'kids.starsHint',
      'kids.starEarned',
      'kids.level',
      'kids.level.seed',
      'kids.level.sprout',
      'kids.level.explorer',
      'kids.level.star',
      'kids.level.moon',
      'kids.level.crown',
      'kids.toNext',
      'kids.maxLevel',
      'kids.parent',
      'kids.parentHint',
      'kids.weekTitle',
      'kids.bySurah',
      'kids.noStarsYet',
      'kids.erase',
      'kids.eraseConfirm',
      'kids.eraseDone',
    ];
    for (const k of retired) {
      assert.equal(EN[k], undefined, `EN retires ${k}`);
      assert.equal(AR[k], undefined, `AR retires ${k}`);
    }
    // The reworded survivors carry no award vocabulary in either language.
    for (const k of ['kids.listenHint', 'kids.quizHint', 'kids.quizWin']) {
      assert.doesNotMatch(String(EN[k]), /\bstars?\b/i, `EN ${k} awards nothing`);
    }
    assert.ok(!String(AR['kids.listenHint']).includes('نجمة'), 'AR listenHint awards nothing');
    assert.ok(!String(AR['kids.quizHint']).includes('نجمة'), 'AR quizHint awards nothing');
    assert.ok(!String(AR['kids.quizWin']).includes('نجمة'), 'AR quizWin awards nothing');
  });

  test('no star/level/week CSS ships for kids', () => {
    const css = read('assets/css/components.css');
    for (const sel of [
      '.panel--kids-stars',
      '.kids-stars__',
      '.panel--kids-level',
      '.kids-level__',
      '.kids-week',
      '.kids-bysurah',
    ]) {
      assert.ok(!css.includes(sel), `CSS retires ${sel}`);
    }
    assert.ok(css.includes('.panel--kids-heard'), 'heard panel styled');
  });
});

describe('kids gate intact: Settings-in, hold-to-exit, parent gate', () => {
  test('hold-to-exit + tasbih door render', () => {
    const html = renderKids(kidsMetaState());
    assert.match(html, /data-action="kids-exit-hold"/, 'hold-to-exit present');
    assert.match(html, /kids-exit__hint/, 'hold hint present');
    assert.match(html, /kids-tasbih/, 'tasbih door present');
  });

  test('gate + guard strings exist in EN + AR', () => {
    for (const k of [
      'kids.exit',
      'kids.exitHint',
      'kids.exitHow',
      'kids.exitDone',
      'kids.blocked',
      'kids.gateTitle',
      'kids.gateHint',
      'kids.gateWrong',
      'settings.kidsMode',
      'settings.kidsHint',
    ]) {
      assert.ok(EN[k], `EN ${k}`);
      assert.ok(AR[k], `AR ${k}`);
    }
    assert.doesNotMatch(String(EN['settings.kidsHint']), /\bstars?\b/i, 'entry promises no stars');
    assert.ok(!String(AR['settings.kidsHint']).includes('نجوم'), 'AR entry promises no stars');
  });

  test('Settings entry + hold gesture + gate handler stay wired (source-pinned)', () => {
    const settings = read('js/views/settings.js');
    assert.ok(settings.includes('toggle-kids-mode'), 'Settings-in toggle stays');
    const events = read('js/app/events.js');
    assert.ok(events.includes('kids-exit-hold'), 'hold gesture stays');
    assert.ok(events.includes('openParentGate'), 'parent gate stays');
    const system = read('js/app/handlers/system.js');
    assert.ok(system.includes('kids-gate-answer'), 'gate answers stay');
    assert.ok(system.includes("'kids-exit'"), 'hold exit stays');
  });
});
