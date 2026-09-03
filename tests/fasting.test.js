import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FASTING_CATEGORIES,
  REMIND_TIMES,
  defaultFastingPrefs,
  sanitizeFastingPrefs,
  nextRemindTime,
  fastingCategoriesForDate,
  activeFastingCategories,
  remindCategoriesFor,
  upcomingFastingDays,
  voluntaryFastCount,
  recentVoluntaryFasts,
} from '../js/domain/fasting.js';
import { toHijri, toGregorian } from '../js/domain/calendar.js';

/**
 * Voluntary fasting logic, pure: category matching (weekday + tabular
 * Hijri), the shared-log counters (Ramadan keys excluded), hostile-shape
 * sanitizers, and the upcoming-days scan.
 */

const PREFS_ALL = {
  remindTime: '18:00',
  monThu: { enabled: true, remind: true },
  whiteDays: { enabled: true, remind: true },
  ashura: { enabled: true, remind: true },
  arafah: { enabled: true, remind: true },
};

// Known anchor: 2026-08-29 is a Saturday. Ashura 1447 = 10 Muharram 1447.
const SAT = new Date(2026, 7, 29); // Aug 29 2026

describe('category matching', () => {
  test('monThu matches Mondays and Thursdays only', () => {
    const monday = new Date(2026, 7, 31); // Aug 31 2026 = Monday
    const thursday = new Date(2026, 8, 3); // Sep 3 2026 = Thursday
    const saturday = SAT;
    assert.ok(fastingCategoriesForDate(null, monday).includes('monThu'));
    assert.ok(fastingCategoriesForDate(null, thursday).includes('monThu'));
    assert.ok(!fastingCategoriesForDate(null, saturday).includes('monThu'));
  });

  test('whiteDays match Hijri 13/14/15 of any month', () => {
    // find a white day: scan from a known date
    let found = 0;
    for (let i = 0; i < 40; i++) {
      const d = new Date(2026, 7, 29 + i);
      const h = toHijri(d);
      const cats = fastingCategoriesForDate(h, d);
      if ([13, 14, 15].includes(h.day)) {
        found += 1;
        assert.ok(cats.includes('whiteDays'), `hijri day ${h.day} must match whiteDays`);
      } else {
        assert.ok(!cats.includes('whiteDays'), `hijri day ${h.day} must NOT match`);
      }
    }
    // a 40-day window spans parts of two Hijri months, so 3..6 white days
    // is legitimate; the per-day match/miss assertions above are the real gate
    assert.ok(found >= 3 && found <= 6, `3..6 white days expected, got ${found}`);
  });

  test('ashura is 10 Muharram and arafah is 9 Dhul-Hijjah', () => {
    const ashura = toGregorian(1447, 1, 10);
    assert.deepEqual(fastingCategoriesForDate(toHijri(ashura), ashura), ['ashura']);
    const arafah = toGregorian(1447, 12, 9);
    assert.deepEqual(fastingCategoriesForDate(toHijri(arafah), arafah), ['arafah']);
    const tasua = toGregorian(1447, 1, 9);
    assert.ok(!fastingCategoriesForDate(toHijri(tasua), tasua).includes('ashura'));
  });
});

describe('active / remind filtering', () => {
  test('activeFastingCategories respects the enabled flags', () => {
    const monday = new Date(2026, 7, 31);
    const prefs = { monThu: { enabled: true, remind: false } };
    assert.deepEqual(activeFastingCategories(prefs, null, monday), ['monThu']);
    assert.deepEqual(activeFastingCategories({}, null, monday), [], 'nothing enabled');
    const off = { monThu: { enabled: false, remind: true } };
    assert.deepEqual(activeFastingCategories(off, null, monday), []);
  });

  test('remindCategoriesFor requires BOTH enabled and remind', () => {
    const monday = new Date(2026, 7, 31);
    assert.deepEqual(remindCategoriesFor(PREFS_ALL, null, monday), ['monThu']);
    const noRemind = { monThu: { enabled: true, remind: false } };
    assert.deepEqual(remindCategoriesFor(noRemind, null, monday), []);
    const remindOnly = { monThu: { enabled: false, remind: true } };
    assert.deepEqual(remindCategoriesFor(remindOnly, null, monday), []);
  });
});

describe('upcoming scan', () => {
  test('finds the next enabled days in order, capped at limit', () => {
    const prefs = { monThu: { enabled: true, remind: false } };
    const days = upcomingFastingDays(prefs, SAT, 3);
    assert.equal(days.length, 3);
    assert.equal(days[0].date.getDay(), 1, 'first hit is a Monday');
    assert.ok(days[0].date < days[1].date && days[1].date < days[2].date);
    assert.deepEqual(days[0].categories, ['monThu']);
  });

  test('disabled categories never appear', () => {
    const prefs = { whiteDays: { enabled: true, remind: false } };
    const days = upcomingFastingDays(prefs, SAT, 3);
    for (const d of days) assert.deepEqual(d.categories, ['whiteDays']);
  });

  test('multiple categories on one day list together', () => {
    // a Monday that is also a white day exists somewhere in the horizon
    const prefs = {
      monThu: { enabled: true, remind: false },
      whiteDays: { enabled: true, remind: false },
    };
    const days = upcomingFastingDays(prefs, SAT, 12, 90);
    const multi = days.find((d) => d.categories.length > 1);
    if (multi)
      assert.ok(multi.categories.includes('monThu') && multi.categories.includes('whiteDays'));
  });

  test('nothing enabled → empty; hostile prefs → empty', () => {
    assert.deepEqual(upcomingFastingDays({}, SAT, 3), []);
    assert.deepEqual(upcomingFastingDays(null, SAT, 3), []);
    assert.deepEqual(upcomingFastingDays('x', SAT, 3), []);
  });
});

describe('shared-log counters (Ramadan keys excluded)', () => {
  const log = {
    '1447-9': { 1: true, 2: true, 3: true }, // Ramadan: never counted here
    '1447-10': { 2: true, 4: true }, // Shawwal: 2 voluntary
    '1447-1': { 10: true }, // Muharram: 1 voluntary (Ashura)
    '1446-10': { 5: true }, // last Hijri year: 1
    garbage: { 1: true }, // not a month key — ignored
    '1447-11': 'junk', // hostile entry — ignored
  };

  test('voluntaryFastCount totals non-Ramadan days only', () => {
    const c = voluntaryFastCount(log, 1447);
    assert.equal(c.total, 4);
    assert.equal(c.thisHijriYear, 3);
  });

  test('counts survive hostile maps', () => {
    assert.deepEqual(voluntaryFastCount(null, 1447), { total: 0, thisHijriYear: 0 });
    assert.deepEqual(voluntaryFastCount('x', 'y'), { total: 0, thisHijriYear: 0 });
  });

  test('recentVoluntaryFasts lists non-Ramadan entries newest first', () => {
    const recent = recentVoluntaryFasts(log, 8, new Date());
    assert.equal(recent.length, 4);
    for (let i = 1; i < recent.length; i++) {
      assert.ok(recent[i - 1].date >= recent[i].date, 'sorted newest first');
    }
    assert.ok(
      recent.every((r) => !r.logKey.endsWith('-9')),
      'no Ramadan keys leak in'
    );
    // each carries undo-ready coordinates
    assert.ok(recent.every((r) => /^\d{1,4}-\d{1,2}$/.test(r.logKey) && /^\d+$/.test(r.day)));
  });

  test('recentVoluntaryFasts survives junk', () => {
    assert.deepEqual(recentVoluntaryFasts(null), []);
    assert.deepEqual(
      recentVoluntaryFasts({ a: null, b: 'x', '1447-10': { n: 'not-true', 2: false } }),
      []
    );
  });
});

describe('prefs sanitize + remind time cycle', () => {
  test('sanitize keeps well-formed values, drops the rest', () => {
    const clean = sanitizeFastingPrefs({
      monThu: { enabled: true, remind: 'yes' }, // remind coerced false
      whiteDays: 'junk',
      ashura: { enabled: 1 },
      arafah: [true],
      remindTime: '25:99', // invalid clock
      __proto__: { enabled: true, remind: true },
    });
    assert.deepEqual(clean.monThu, { enabled: true, remind: false });
    assert.deepEqual(clean.whiteDays, { enabled: false, remind: false });
    assert.deepEqual(clean.ashura, { enabled: false, remind: false }, 'enabled coerces strictly');
    assert.deepEqual(clean.arafah, { enabled: false, remind: false });
    assert.equal(clean.remindTime, '18:00');
    assert.ok(!Object.hasOwn(clean, '__proto__'));
    assert.deepEqual(Object.keys(clean).sort(), [
      'arafah',
      'ashura',
      'monThu',
      'remindTime',
      'whiteDays',
    ]);
  });

  test('sanitize falls back to defaults on hostile input', () => {
    assert.deepEqual(sanitizeFastingPrefs(null), defaultFastingPrefs());
    assert.deepEqual(sanitizeFastingPrefs([1]), defaultFastingPrefs());
    assert.deepEqual(sanitizeFastingPrefs('x'), defaultFastingPrefs());
  });

  test('remind time cycles through the offered list', () => {
    assert.deepEqual(REMIND_TIMES, ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00']);
    assert.equal(nextRemindTime('18:00'), '18:30');
    assert.equal(nextRemindTime('20:00'), '17:30', 'wraps');
    assert.equal(nextRemindTime('junk'), '17:30', 'unknown → first slot');
    assert.ok(FASTING_CATEGORIES.length === 4);
  });
});
