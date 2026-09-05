/**
 * tests/review.test.js — v3.23.0 worship "year in review".
 *
 * Layers:
 *   1. pure aggregation (js/review.js) against a synthetic state with
 *      known windows — including hostile shapes, junk day keys, and
 *      rolled calendar dates (2025-02-30 must never become Mar 2);
 *   2. streak math, including month/year boundary runs;
 *   3. a render smoke over the real Statistics view in EN and AR
 *      (the review panel renders, stays honest, never says "undefined").
 *
 * Framing contract tested by omission: nothing in the panel counts days
 * missed — only what actually happened (the TODO's own anti-guilt rule).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  keyToDate,
  firstTrackedKey,
  longestDayStreak,
  worshipReview,
  reviewIsEmpty,
} from '../js/domain/review.js';
import { renderStatistics } from '../js/views/statistics.js';
import { dateKey, addDays } from '../js/core/utils.js';
import { toHijri, toGregorian } from '../js/domain/calendar.js';

const TODAY = new Date();
const keyDaysAgo = (n) => dateKey(addDays(TODAY, -n));

/* ---- 1. key parsing / first tracked day -------------------------------- */

describe('keyToDate', () => {
  test('valid keys parse to local midnights', () => {
    const d = keyToDate('2025-03-05');
    assert.equal(d.getFullYear(), 2025);
    assert.equal(d.getMonth(), 2);
    assert.equal(d.getDate(), 5);
  });
  test('junk and malformed keys are null', () => {
    for (const bad of [null, '', 'abc', '2025-3-5', '2025-13-01', '999', {}, '2025-02-30']) {
      assert.equal(keyToDate(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });
});

describe('firstTrackedKey', () => {
  test('earliest key across history + checklist; junk ignored', () => {
    const k = firstTrackedKey(
      { [keyDaysAgo(200)]: { recitations: 1 }, junk: { recitations: 5 } },
      { [keyDaysAgo(400)]: { fajr: 'prayed' } }
    );
    assert.equal(k, keyDaysAgo(400));
  });
  test('null when nothing tracked', () => {
    assert.equal(firstTrackedKey({}, {}), null);
    assert.equal(firstTrackedKey(null, null), null);
  });
});

/* ---- 2. streak math ----------------------------------------------------- */

describe('longestDayStreak', () => {
  test('runs across month and year boundaries', () => {
    // 2025-01-30, 01-31, 02-01 — three consecutive days over a boundary.
    assert.equal(longestDayStreak(['2025-01-30', '2025-01-31', '2025-02-01']), 3);
    assert.equal(longestDayStreak(['2024-12-30', '2024-12-31', '2025-01-01']), 3);
  });
  test('gaps break runs; single days count as 1', () => {
    assert.equal(longestDayStreak(['2025-01-01', '2025-01-03', '2025-01-04']), 2);
    assert.equal(longestDayStreak(['2025-06-06']), 1);
  });
  test('empty and hostile input -> 0; junk keys dropped', () => {
    assert.equal(longestDayStreak([]), 0);
    assert.equal(longestDayStreak(['nope', '2025-02-30', '__proto__']), 0);
  });
});

/* ---- 3. the aggregation -------------------------------------------------- */

function baseReviewState() {
  return {
    settings: { language: 'en' },
    statistics: {
      dailyHistory: {
        // today: active
        [keyDaysAgo(0)]: { recitations: 10, pages: 3 },
        // 10 days ago: recitations only
        [keyDaysAgo(10)]: { recitations: 5 },
        // 50 days ago: idle entry — presence is NOT activity
        [keyDaysAgo(50)]: { recitations: 0, pages: 0 },
        // 200 days ago: pages only (outside 90d, inside hijri year?)
        [keyDaysAgo(200)]: { pages: 2 },
        // 400 days ago: both
        [keyDaysAgo(400)]: { recitations: 7, pages: 1 },
        // junk keys must be ignored entirely
        notADate: { recitations: 999, pages: 999 },
        '2025-02-30': { recitations: 777 }, // rolled date -> dropped
      },
      totalRecitations: 0,
      totalSessions: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastActiveDate: null,
      favoriteCategories: {},
    },
    dailyChecklist: {
      [keyDaysAgo(0)]: {
        fajr: 'jamaah',
        dhuhr: 'prayed',
        asr: 'jamaah',
        maghrib: 'prayed',
        isha: 'prayed',
      },
      [keyDaysAgo(10)]: { fajr: 'prayed', asr: 'jamaah', isha: true }, // legacy true -> prayed
      // checklist-only day 300 days back: a day with activity, no dhikr/pages
      [keyDaysAgo(300)]: { maghrib: 'prayed' },
      junk: { fajr: 'prayed' },
    },
    ramadanLog: (() => {
      // One fast ~today (same hijri day-of-year as today), one exactly
      // 100 gregorian days ago, two in last Ramadan (month 9 of the
      // previous hijri year), one junk day number (33) that must be
      // skipped. Keys are built through the app's own converters so the
      // test stays correct regardless of when it runs.
      const h = toHijri(TODAY);
      const h100 = toHijri(addDays(TODAY, -100));
      const hPrevRamadanYear = String(h.year - 1);
      return {
        [`${h.year}-${h.month}`]: { [h.day]: true },
        [`${h100.year}-${h100.month}`]: { [h100.day]: true },
        [`${hPrevRamadanYear}-9`]: { 1: true, 2: true },
        [`${h.year}-1`]: { 33: true, 0: true },
      };
    })(),
    sadaqahLog: [
      { id: 'a', ts: TODAY.getTime(), note: '' },
      { id: 'b', ts: addDays(TODAY, -1).getTime(), note: '' },
      { id: 'c', ts: addDays(TODAY, -100).getTime(), note: '' },
      { id: 'd', ts: addDays(TODAY, -400).getTime(), note: '' },
      { id: 'e', ts: 'not-a-number' }, // skipped
      null, // skipped
    ],
    ayahBookmarks: [{ key: '1' }, { key: '2' }, { key: '3' }],
    khatmaHistory: [{ id: 'k1' }, { id: 'k2' }],
    mushafPagesRead: { p1: true, p2: true, p3: true, p4: true, p5: true },
  };
}

describe('worshipReview', () => {
  const review = worshipReview(baseReviewState(), TODAY);

  test('hijri year matches the app converter', () => {
    assert.equal(review.hijriYear, toHijri(TODAY).year);
  });

  test('sinceKey anchors on the earliest activity, junk ignored', () => {
    assert.equal(review.sinceKey, keyDaysAgo(400));
  });

  test('windows: today + 10d are in the 90-day window', () => {
    const { d90, all } = review.windows;
    assert.equal(d90.days, 2);
    assert.equal(d90.recitations, 15); // 10 today + 5
    assert.equal(d90.pages, 3);
    assert.equal(d90.prayers, 8); // 5 today + 3 at day 10
    assert.equal(d90.jamaah, 3); // fajr+asr today, asr at day 10
    // idle day at 50d never counted
    // all-time adds 200d pages day, 300d checklist-only day, 400d both
    assert.equal(all.days, 5);
    assert.equal(all.recitations, 22); // 10 + 5 + 7
    assert.equal(all.pages, 6); // 3 + 2 + 1
    assert.equal(all.prayers, 9); // 8 + 1 (checklist-only day)
  });

  test('fasts: total includes Ramadan; junk day numbers skipped', () => {
    // Structural count: today-fast + 100d-fast + 2 Ramadan days = 4;
    // the '1448-1' key contributes 0 (days 33 and 0 are both junk).
    assert.equal(review.fasts.all, 4);
    // Window membership computed through the app's own converters.
    const h = toHijri(TODAY);
    const h100 = toHijri(addDays(TODAY, -100));
    const in90 = ([y, m, d]) => {
      const k = dateKey(toGregorian(y, m, d));
      return k >= keyDaysAgo(89) && k <= keyDaysAgo(0);
    };
    const expectedD90 = [
      [h.year, h.month, h.day],
      [h100.year, h100.month, h100.day],
    ].filter(in90).length;
    assert.equal(review.fasts.d90, expectedD90);
    // today's fast is definitionally in the current hijri year
    assert.ok(review.fasts.hijriYear >= 1);
  });

  test('voluntary split excludes Ramadan (month 9) — fasting.js rules', () => {
    // Non-9 keys with valid days: today-fast (1) + 100d-fast (1) = 2;
    // '1448-1' contributes 0 (junk days), Ramadan key excluded entirely.
    assert.equal(review.voluntary.total, 2);
    // Both voluntary fasts fall in the hijri year only if their converted
    // gregorian dates do — compute through the converter, not by hand.
    const hy = toHijri(TODAY).year;
    const inYear = ([y, m, d]) => toHijri(toGregorian(y, m, d)).year === hy;
    const expected =
      [[hy, toHijri(TODAY).month, toHijri(TODAY).day]].filter(inYear).length +
      (inYear([
        toHijri(addDays(TODAY, -100)).year,
        toHijri(addDays(TODAY, -100)).month,
        toHijri(addDays(TODAY, -100)).day,
      ])
        ? 1
        : 0);
    assert.equal(review.voluntary.thisHijriYear, expected);
  });

  test('sadaqah windows with junk timestamps skipped', () => {
    assert.equal(review.sadaqah.d90, 2);
    assert.equal(review.sadaqah.all, 4);
  });

  test('all-time facts', () => {
    assert.deepEqual(review.allTime, { ayahBookmarks: 3, khatmas: 2, mushafPages: 5 });
  });

  test('streaks are activity-based, not presence-based', () => {
    const s = baseReviewState();
    // Build a reading run: pages on days 3,4,5,6 ago (4 days), and today.
    for (const n of [3, 4, 5, 6])
      s.statistics.dailyHistory[keyDaysAgo(n)] = { recitations: 0, pages: 1 };
    const r = worshipReview(s, TODAY);
    assert.equal(r.streaks.longestReading, 4);
    assert.equal(r.streaks.currentReading, 1); // today has pages, yesterday doesn't
    assert.equal(r.streaks.longestRecitations, 1); // isolated days only
  });

  test('hostile state shapes degrade to an empty-but-valid review', () => {
    for (const bad of [null, {}, { statistics: null }, { statistics: { dailyHistory: 'x' } }]) {
      const r = worshipReview(bad, TODAY);
      assert.equal(r.windows.all.recitations, 0);
      assert.equal(r.fasts.all, 0);
      assert.equal(r.allTime.ayahBookmarks, 0);
      assert.deepEqual(r.streaks, { longestRecitations: 0, longestReading: 0, currentReading: 0 });
    }
  });

  test('checklist-only day counts as activity (prayers are worship too)', () => {
    const s = baseReviewState();
    delete s.statistics.dailyHistory[keyDaysAgo(0)]; // today: NO dhikr/pages
    const r = worshipReview(s, TODAY);
    // today is checklist-only (5 prayers) yet still a day with activity,
    // alongside the 10d day — and its prayers still count:
    assert.equal(r.windows.d90.days, 2);
    assert.equal(r.windows.d90.prayers, 8);
  });
});

describe('reviewIsEmpty', () => {
  test('true when nothing at all happened; false on any activity', () => {
    assert.equal(reviewIsEmpty(worshipReview(null, TODAY)), true);
    assert.equal(reviewIsEmpty(worshipReview({}, TODAY)), true);
    const s = baseReviewState();
    assert.equal(reviewIsEmpty(worshipReview(s, TODAY)), false);
    // only fasts:
    const f = { ramadanLog: { '1447-2': { 5: true } } };
    assert.equal(reviewIsEmpty(worshipReview(f, TODAY)), false);
  });
});

/* ---- 4. render smoke ------------------------------------------------------ */

function viewState(overrides = {}) {
  const s = baseReviewState();
  return {
    ...s,
    customContent: {},
    library: { documents: {} },
    statsHeatmapRef: null,
    ...overrides,
  };
}

describe('renderStatistics review panel', () => {
  test('renders the review panel with real numbers, EN', () => {
    const html = renderStatistics(viewState());
    assert.match(html, /Your worship in review/);
    assert.match(html, /Last 90 days/);
    assert.match(html, /Hijri year \d+/);
    assert.match(html, /<span class="stat-card__value">15<\/span>/); // d90 recitations
    assert.match(html, /Longest reading streak/);
    assert.doesNotMatch(html, /undefined/);
    assert.doesNotMatch(html, /\{n\}/); // labels are parameter-free by design
    // anti-guilt framing, enforced: the copy may promise "no days missed",
    // but it must never ACCUSE the reader of missing anything.
    assert.doesNotMatch(html, /you missed/i);
    assert.doesNotMatch(html, /broken streak/i);
  });

  test('renders in Arabic without undefined', () => {
    const html = renderStatistics(viewState({ settings: { language: 'ar' } }));
    assert.match(html, /مراجعة عبادتك/);
    assert.match(html, /آخر 90 يومًا/);
    assert.doesNotMatch(html, /undefined/);
  });

  test('empty state is gentle and never shames', () => {
    const empty = viewState();
    empty.statistics.dailyHistory = {};
    empty.dailyChecklist = {};
    empty.ramadanLog = {};
    empty.sadaqahLog = [];
    const html = renderStatistics(empty);
    assert.match(html, /Nothing to summarize yet/);
    assert.doesNotMatch(html, /undefined/);
  });
});
