import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toHijri, toGregorian } from '../js/calendar.js';
import { calculateTimes, decimalHoursToDate } from '../js/prayer.js';
import {
  ramadanStatus,
  nextRamadanStart,
  daysUntilRamadan,
  fastingCountdown,
  formatCountdown,
  fastingStreak,
  ramadanFastsLogged,
  isVoluntaryFastDay,
  RAMADAN_HIJRI_MONTH,
} from '../js/ramadan.js';

const dk = (d) => d.toISOString().slice(0, 10);

describe('ramadanStatus', () => {
  test('reports inRamadan on the first day of Ramadan', () => {
    const hijriNow = toHijri(new Date());
    const start = toGregorian(hijriNow.year, RAMADAN_HIJRI_MONTH, 1);
    const status = ramadanStatus(start);
    assert.equal(status.inRamadan, true);
    assert.equal(status.dayOfRamadan, 1);
    assert.ok(status.totalDays === 29 || status.totalDays === 30);
  });

  test('reports not-in-Ramadan on the first day of the following month (Shawwal)', () => {
    const hijriNow = toHijri(new Date());
    const shawwalStart = toGregorian(hijriNow.year, RAMADAN_HIJRI_MONTH + 1, 1);
    const status = ramadanStatus(shawwalStart);
    assert.equal(status.inRamadan, false);
    assert.equal(status.dayOfRamadan, null);
  });
});

describe('nextRamadanStart / daysUntilRamadan', () => {
  test('counts down correctly to a known Ramadan start', () => {
    const hijriNow = toHijri(new Date());
    let year = hijriNow.year;
    let start = toGregorian(year, RAMADAN_HIJRI_MONTH, 1);
    // If this year's Ramadan 1 already passed, the function should roll to next year — mirror that here.
    if (
      start < new Date(new Date().setHours(0, 0, 0, 0)) &&
      hijriNow.month !== RAMADAN_HIJRI_MONTH
    ) {
      year += 1;
      start = toGregorian(year, RAMADAN_HIJRI_MONTH, 1);
    }
    const fiveDaysBefore = new Date(start);
    fiveDaysBefore.setDate(fiveDaysBefore.getDate() - 5);

    assert.equal(dk(nextRamadanStart(fiveDaysBefore)), dk(start));
    assert.equal(daysUntilRamadan(fiveDaysBefore), 5);
  });

  test('returns 0 on the day Ramadan starts', () => {
    const hijriNow = toHijri(new Date());
    const start = toGregorian(hijriNow.year, RAMADAN_HIJRI_MONTH, 1);
    assert.equal(daysUntilRamadan(start), 0);
  });
});

describe('fastingCountdown', () => {
  const loc = { latitude: 21.4225, longitude: 39.8262, method: 'MWL', asr: 'Standard' }; // Makkah

  test('returns null without a location', () => {
    assert.equal(fastingCountdown({}, new Date()), null);
  });

  // Rather than assuming a wall-clock hour maps to "before Fajr" (which
  // depends on the test runner's system timezone matching Makkah's — not
  // a safe assumption in CI), derive today's actual Fajr/Maghrib the same
  // way the module does, then pick `now` relative to them.
  function todaysTimes(now) {
    const times = calculateTimes({
      date: now,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezoneOffsetHours: -now.getTimezoneOffset() / 60,
      method: loc.method,
      asr: loc.asr,
    });
    return {
      fajr: decimalHoursToDate(now, times.fajr),
      maghrib: decimalHoursToDate(now, times.maghrib),
    };
  }

  test('phase is "before-fajr" shortly before Fajr', () => {
    const base = new Date();
    const { fajr } = todaysTimes(base);
    const now = new Date(fajr.getTime() - 30 * 60 * 1000);
    const cd = fastingCountdown(loc, now);
    assert.equal(cd.phase, 'before-fajr');
    assert.ok(cd.msRemaining > 0 && cd.msRemaining <= 30 * 60 * 1000 + 1000);
  });

  test('phase is "fasting" at the midpoint between Fajr and Maghrib', () => {
    const base = new Date();
    const { fajr, maghrib } = todaysTimes(base);
    const now = new Date((fajr.getTime() + maghrib.getTime()) / 2);
    const cd = fastingCountdown(loc, now);
    assert.equal(cd.phase, 'fasting');
    assert.ok(cd.msRemaining > 0);
    assert.ok(cd.iftarTime.getTime() > now.getTime());
  });

  test('phase is "after-maghrib" shortly after Maghrib', () => {
    const base = new Date();
    const { maghrib } = todaysTimes(base);
    const now = new Date(maghrib.getTime() + 10 * 60 * 1000);
    const cd = fastingCountdown(loc, now);
    assert.equal(cd.phase, 'after-maghrib');
    assert.ok(cd.nextSuhoorTime.getTime() > now.getTime());
  });
});

describe('formatCountdown', () => {
  test('splits milliseconds into whole hours and minutes', () => {
    assert.deepEqual(formatCountdown(90 * 60 * 1000), { h: 1, m: 30 });
    assert.deepEqual(formatCountdown(20 * 1000), { h: 0, m: 0 });
    assert.deepEqual(formatCountdown(-5000), { h: 0, m: 0 });
  });
});

describe('fastingStreak', () => {
  function daysAgoKey(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return dk(d);
  }

  test('counts consecutive logged days ending today', () => {
    const log = { [daysAgoKey(0)]: true, [daysAgoKey(1)]: true, [daysAgoKey(2)]: true };
    assert.equal(fastingStreak(log), 3);
  });

  test('still counts an unbroken streak through yesterday even if today is not yet logged', () => {
    const log = { [daysAgoKey(1)]: true, [daysAgoKey(2)]: true };
    assert.equal(fastingStreak(log), 2);
  });

  test('a gap breaks the streak', () => {
    const log = { [daysAgoKey(0)]: true, [daysAgoKey(2)]: true };
    assert.equal(fastingStreak(log), 1);
  });

  test('returns 0 for an empty log', () => {
    assert.equal(fastingStreak({}), 0);
  });
});

describe('ramadanFastsLogged', () => {
  test('counts only days that fall within that Ramadan and reports the month total', () => {
    const hijriNow = toHijri(new Date());
    const start = toGregorian(hijriNow.year, RAMADAN_HIJRI_MONTH, 1);
    const day1 = dk(start);
    const day2 = dk(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1));
    const log = { [day1]: true, [day2]: true, 'unrelated-key': true };
    const { count, total } = ramadanFastsLogged(log, hijriNow.year);
    assert.equal(count, 2);
    assert.ok(total === 29 || total === 30);
  });
});

describe('isVoluntaryFastDay', () => {
  test('is false during Ramadan even on a Monday/Thursday', () => {
    const hijriNow = toHijri(new Date());
    // Find a Monday within this Ramadan.
    const start = toGregorian(hijriNow.year, RAMADAN_HIJRI_MONTH, 1);
    let d = new Date(start);
    for (let i = 0; i < 10; i += 1) {
      if (d.getDay() === 1) break;
      d.setDate(d.getDate() + 1);
    }
    assert.equal(isVoluntaryFastDay(d), false);
  });
});
