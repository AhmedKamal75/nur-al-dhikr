/**
 * timezone.test.js — the location-clock helper behind v5.17.143.
 *
 * Pins: IANA offsets resolve with DST on the DATE asked, wall hours come
 * from the zone (not the device), invalid/empty zones fall back to the
 * device clock, and the shifted Date's local getters read the zone's wall
 * time — the property nextPrayer/currentPrayer/countdowns rely on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoneOffsetHours, zoneLocalHours, prayerClock } from '../js/domain/timezone.js';

test('zoneOffsetHours resolves fixed and DST zones on the given date', () => {
  // Africa/Cairo: EET, UTC+2 year-round since 2024's DST abolition debate —
  // pin only that winter is +2 (November is unambiguous).
  assert.equal(zoneOffsetHours('Africa/Cairo', new Date(Date.UTC(2026, 10, 23, 12, 0, 0))), 2);
  // America/New_York: EST (-5) in January, EDT (-4) in July.
  assert.equal(zoneOffsetHours('America/New_York', new Date(Date.UTC(2026, 0, 15, 12, 0, 0))), -5);
  assert.equal(zoneOffsetHours('America/New_York', new Date(Date.UTC(2026, 6, 15, 12, 0, 0))), -4);
  // Asia/Riyadh: fixed +3.
  assert.equal(zoneOffsetHours('Asia/Riyadh', new Date(Date.UTC(2026, 2, 1, 0, 0, 0))), 3);
});

test('zoneOffsetHours rejects junk instead of guessing', () => {
  assert.equal(zoneOffsetHours('', new Date()), null);
  assert.equal(zoneOffsetHours('Not/AZone', new Date()), null);
  assert.equal(zoneOffsetHours(null, new Date()), null);
  assert.equal(zoneOffsetHours('Africa/Cairo', new Date(NaN)), null);
});

test('zoneLocalHours reads the zone wall clock', () => {
  // 12:30 UTC is 14:30 in Cairo (+2), 07:30 in New York EST (-5).
  const d = new Date(Date.UTC(2026, 0, 15, 12, 30, 0));
  assert.equal(zoneLocalHours('Africa/Cairo', d), 14.5);
  assert.equal(zoneLocalHours('America/New_York', d), 7.5);
  assert.equal(zoneLocalHours('Not/AZone', d), null);
});

test('prayerClock prefers the stored zone and shifts the comparison Date', () => {
  const d = new Date(Date.UTC(2026, 10, 23, 12, 0, 0));
  const clock = prayerClock({ timezone: 'Asia/Riyadh' }, d);
  assert.equal(clock.source, 'location');
  assert.equal(clock.offsetHours, 3);
  assert.equal(clock.timeZone, 'Asia/Riyadh');
  // The shifted Date: moved by (zone offset - device offset) so its
  // device-local getters read the zone wall time.
  const deviceOffset = -d.getTimezoneOffset() / 60;
  assert.equal(clock.date.getTime() - d.getTime(), (3 - deviceOffset) * 3600000);
  // localHours is the zone wall hour: 12:00 UTC + 3 = 15:00.
  assert.equal(clock.localHours, 15);
});

test('prayerClock falls back to the device clock when no zone resolves', () => {
  const d = new Date(Date.UTC(2026, 10, 23, 12, 0, 0));
  const clock = prayerClock({ timezone: 'Not/AZone' }, d);
  assert.equal(clock.source, 'device');
  assert.equal(clock.offsetHours, -d.getTimezoneOffset() / 60);
  assert.equal(clock.date, d);
  const empty = prayerClock({}, d);
  assert.equal(empty.source, 'device');
});
