import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTimes, decimalHoursToDate, nightThirds } from '../js/prayer.js';

describe('nightThirds', () => {
  const loc = { latitude: 21.4225, longitude: 39.8262, method: 'MWL', asr: 'Standard' }; // Makkah

  function todaysTimes(now) {
    return calculateTimes({
      date: now,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezoneOffsetHours: -now.getTimezoneOffset() / 60,
      method: loc.method,
      asr: loc.asr,
    });
  }

  test('splits the night into equal thirds between Maghrib and the next Fajr', () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const todayTimes = todaysTimes(today);
    const tomorrowTimes = todaysTimes(tomorrow);
    const maghrib = decimalHoursToDate(today, todayTimes.maghrib);
    const fajr = decimalHoursToDate(tomorrow, tomorrowTimes.fajr);

    const thirds = nightThirds(maghrib, fajr);
    assert.ok(thirds);

    const nightMs = fajr.getTime() - maghrib.getTime();
    const expectedMidpoint = maghrib.getTime() + nightMs / 2;
    const expectedLastThird = maghrib.getTime() + (nightMs * 2) / 3;

    assert.equal(thirds.midpoint.getTime(), expectedMidpoint);
    assert.equal(thirds.lastThirdStart.getTime(), expectedLastThird);
    // The last third should start after the midpoint and before Fajr.
    assert.ok(thirds.lastThirdStart.getTime() > thirds.midpoint.getTime());
    assert.ok(thirds.lastThirdStart.getTime() < fajr.getTime());
  });

  test('returns null for a non-positive night duration (bad input)', () => {
    const maghrib = new Date('2026-01-01T18:00:00Z');
    const fajrBeforeMaghrib = new Date('2026-01-01T04:00:00Z');
    assert.equal(nightThirds(maghrib, fajrBeforeMaghrib), null);
  });
});
