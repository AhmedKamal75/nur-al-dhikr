/**
 * tests/gentle-ledger.test.js — (v5.17.57, merged-plan item 10) the gentle
 * memorization queue + private practice ledger.
 *
 * The contract, in one place:
 *  1. Home carries NO queue counts and NO shame/overdue language. The hifz
 *     card and the review digest link (names only) into the ledger; the
 *     progress panel carries no streak KPI.
 *  2. The private ledger (Statistics memorization panel) KEEPS the honest
 *     counts — hiding them on Home must never delete them.
 *  3. Pause-not-fail everywhere this item touched: khatma verdicts and the
 *     prayer insight state the place is saved; nothing implies loss,
 *     behind-ness, or catch-up.
 *  4. Every new/changed string ships EN + AR (the contracts parity gate
 *     enforces the set; this file pins the tone per language).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hifzReviewCardHTML, reviewDigestCardHTML, renderHome } from '../js/views/home.js';
import { memorizationPanel } from '../js/views/statistics.js';
import { buildMushafTrack } from '../js/views/khatma.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/* Banned on Home: queue-pressure and shame vocabulary (mirrors the nudge
 * and home-invites gates, extended with the queue's own words). Scanned
 * against RENDERED home HTML, both languages. */
const BANNED_EN = [
  'overdue',
  'due for review',
  'due today',
  'behind',
  'catch-up',
  'catch up',
  'missed',
  'streak',
  'shame',
  'guilt',
  'failure',
  'failed',
  'lost',
  'hurry',
  'urgent',
  'last chance',
  "don't miss",
  'too late',
  'act now',
  'waiting —',
];
const BANNED_AR = [
  'مستحق',
  'متأخر',
  'تأخر',
  'فوات',
  'فوت',
  'ذنب',
  'عار',
  'ضيّع',
  'ضيع',
  'خسر',
  'كسر',
  'تخلّف',
];

/** A Home state with a lived-in queue: due surahs, ayah dues, quiz + tajweed. */
function queuedState(lang = 'en') {
  const base = initialState();
  return {
    ...base,
    // (v5.17.84+) 'review' is a HOME_HIGHLIGHT_PANEL_ID: js/domain/homePanels.js
    // renders only HOME_PRIMARY_PANEL_IDS ('continue', 'progress') until a
    // panel is explicitly enabled through a saved order, so a highlight panel
    // needs opting in the way a real user does. The assertions below — no
    // queue/shame wording, no streak KPI, the gentle queue present, the ledger
    // door present — are unchanged.
    // `hiddenHome` needs the panel UN-hidden as well as ordered: DEFAULT
    // hiddenHome() marks verse/hadith/review/hifz hidden, and
    // resolveHomePanels drops a panel that is either not ordered OR hidden.
    settings: {
      ...base.settings,
      language: lang,
      homeOrder: ['review'],
      hiddenHome: { ...base.settings.hiddenHome, review: false },
    },
    hifzRecords: {
      2: {
        level: 1,
        due: '2020-01-01',
        since: '2019-01-01',
        lastReviewed: '2019-01-01',
        reviews: 3,
        lapses: 1,
      },
      36: {
        level: 0,
        due: '2020-02-01',
        since: '2020-01-30',
        lastReviewed: '2020-01-30',
        reviews: 0,
        lapses: 0,
      },
    },
    hifzAyahRecords: {
      '2:255': {
        level: 2,
        due: '2020-01-15',
        since: '2019-12-01',
        lastReviewed: '2019-12-20',
        reviews: 2,
        lapses: 0,
      },
    },
    quizMissRecords: { alim: { m: 2, l: '2026-09-01' } },
    tajweedMissRecords: { ghunnah: { m: 1, l: '2026-09-01' } },
  };
}

describe('item 10: Home carries no queue counts', () => {
  for (const lang of ['en', 'ar']) {
    test(`hifz card (${lang}): names only, no +N, no totals`, () => {
      const html = hifzReviewCardHTML(queuedState(lang));
      assert.ok(
        html.includes(lang === 'ar' ? 'مراجعة متاحة' : 'Available review'),
        'gentle title renders'
      );
      assert.doesNotMatch(html, /chip__count/, 'no +N overdue chips');
      assert.doesNotMatch(html, /streak-badge/, 'no count badges');
      assert.ok(html.includes('data-view="statistics"'), 'the ledger door is linked');
    });

    test(`review digest (${lang}): links only, no total badge`, () => {
      const html = reviewDigestCardHTML(queuedState(lang));
      assert.ok(html.length > 0, 'the digest still renders while things wait');
      assert.doesNotMatch(html, /chip__count/, 'no per-row counts');
      assert.doesNotMatch(html, /streak-badge/, 'no total badge');
      assert.ok(html.includes('data-view="statistics"'), 'the ledger door is linked');
      // The deep links the digest always owned survive the gentle pass.
      assert.ok(html.includes('mem='), 'hifz row still reaches memorize mode');
      assert.ok(html.includes('data-view="quiz"'), 'quiz row still reaches the quiz');
      assert.ok(
        html.includes('data-action="practice-start" data-rule="review"'),
        'tajweed review still wired'
      );
    });
  }

  test('full Home (en): no banned queue/shame words, no streak KPI', () => {
    const html = renderHome(queuedState('en')).toLowerCase();
    for (const w of BANNED_EN) assert.ok(!html.includes(w), `home must not say "${w}"`);
    assert.doesNotMatch(html, /streak-badge/, 'no streak KPI anywhere on Home');
    assert.ok(html.includes('available review'), 'the gentle queue is present');
    assert.ok(html.includes('data-view="statistics"'), 'the ledger door is present');
  });

  test('full Home (ar): no banned queue/shame words', () => {
    const html = renderHome(queuedState('ar'));
    for (const w of BANNED_AR) assert.ok(!html.includes(w), `home must not say "${w}"`);
    assert.doesNotMatch(html, /streak-badge/, 'no streak KPI anywhere on Home');
    assert.ok(html.includes('مراجعة متاحة'), 'the gentle queue is present in Arabic');
  });

  test('pause-not-fail is stated on Home, loss never implied', () => {
    const html = hifzReviewCardHTML(queuedState('en')) + reviewDigestCardHTML(queuedState('en'));
    assert.ok(html.includes('your place is saved'), 'pausing is stated in English');
    const arHtml = hifzReviewCardHTML(queuedState('ar')) + reviewDigestCardHTML(queuedState('ar'));
    assert.ok(arHtml.includes('مكانك محفوظ'), 'pausing is stated in Arabic');
  });
});

describe('item 10: the ledger keeps the honest counts', () => {
  test('Statistics panel (en): counts render with the gentle header', () => {
    const html = memorizationPanel(queuedState('en'), 'en');
    assert.ok(html.includes('Available review'), 'ledger header is gentle');
    assert.ok(html.includes('2 surahs'), 'surah count lives in the ledger');
    assert.ok(html.includes('1 ayahs'), 'ayah count lives in the ledger');
  });

  test('Statistics panel (ar): counts render with the gentle header', () => {
    const html = memorizationPanel(queuedState('ar'), 'ar');
    assert.ok(html.includes('مراجعة متاحة'), 'ledger header is gentle in Arabic');
    assert.ok(html.includes('2 سور'), 'surah count lives in the ledger');
  });

  test('ledger empty state: gentle, no caught-up/due copy', () => {
    const st = (lang) => ({
      settings: { ...initialState().settings, language: lang },
      hifzRecords: { 2: { level: 3, due: '2999-01-01' } },
      hifzAyahRecords: {},
      mushaf: { meta: null },
      mushafPagesRead: {},
    });
    const html = memorizationPanel(st('en'), 'en');
    assert.ok(html.includes('your place is saved'), 'pause-not-fail empty state');
    assert.ok(!html.toLowerCase().includes('caught up'), 'no catch-up copy');
    assert.ok(!html.toLowerCase().includes('nothing due'), 'no due-today copy');
  });
});

describe('item 10: pause-not-fail beyond the queue', () => {
  const pages = (n) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), true]));

  test('khatma verdict (en): place saved, no behind/catch-up, no warn styling', () => {
    const base = initialState();
    const html = buildMushafTrack({
      ...base,
      settings: { ...base.settings, language: 'en' },
      mushafPagesRead: pages(60),
      khatmaPlan: { startDate: '2026-08-20', dailyTarget: 20 },
    });
    assert.ok(html.includes('your place is saved'), 'pause is stated');
    assert.ok(!html.toLowerCase().includes('behind'), 'no behind language');
    assert.ok(!html.toLowerCase().includes('catch'), 'no catch-up copy');
    assert.doesNotMatch(html, /verdict--warn/, 'no warn (red) styling');
  });

  test('khatma verdict (ar): place saved, no behind language', () => {
    const base = initialState();
    const html = buildMushafTrack({
      ...base,
      settings: { ...base.settings, language: 'ar' },
      mushafPagesRead: pages(60),
      khatmaPlan: { startDate: '2026-08-20', dailyTarget: 20 },
    });
    assert.ok(html.includes('مكانك محفوظ'), 'pause is stated in Arabic');
    assert.ok(!html.includes('متأخر'), 'no behind language');
  });

  test('prayer insight copy (both langs): a gentle return, never a miss count', () => {
    for (const [dict, lang] of [
      [en, 'en'],
      [ar, 'ar'],
    ]) {
      const line = dict['plog.mostMissed'];
      assert.ok(!/miss|fوات|فوت/i.test(line), `${lang}: no miss language`);
      assert.ok(!/\{n\}/.test(line), `${lang}: no miss count placeholder`);
      assert.ok(line.includes('{prayer}'), `${lang}: the prayer name still renders`);
    }
    assert.equal(
      en['plog.mostMissed'].includes('{n}'),
      ar['plog.mostMissed'].includes('{n}'),
      'placeholder parity holds (both dropped {n})'
    );
  });

  test('streak coaching (both langs): milestones keep a pause clause', () => {
    assert.ok(en['stats.streakToGo'].toLowerCase().includes('paus'), 'EN to-go states pause');
    assert.ok(ar['stats.streakToGo'].includes('التوقف'), 'AR to-go states pause');
    assert.ok(en['stats.streakEve'].toLowerCase().includes('paus'), 'EN eve states pause');
  });
});
