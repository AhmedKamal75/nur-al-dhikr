import test from 'node:test';
import assert from 'node:assert/strict';
import { monthTimetableContext, buildMonthModal } from '../js/views/prayer.js';
import { CITY_PRESETS } from '../js/domain/locations.js';
import { buildMonthTimetable } from '../js/domain/prayerExport.js';
import { applyPrayerOffsets, METHODS } from '../js/domain/prayer.js';

const p = { latitude: 30, longitude: 31, timezone: 'Africa/Cairo', method: 'MWL', asr: 'Standard' };
test('month context uses bound preset only, never unbound saved text or null-as-zero', () => {
  const city = CITY_PRESETS[0];
  const bound = {
    ...p,
    cityId: city.id,
    latitude: city.lat,
    longitude: city.lng,
    locationName: '<img src=x>',
  };
  assert.equal(monthTimetableContext(bound, 2026, 3, 'en').place, city.en);
  assert.equal(monthTimetableContext(bound, 2026, 3, 'ar').place, city.ar);
  assert.match(
    monthTimetableContext({ ...bound, latitude: 0, longitude: -2.12 }, 2026, 3, 'en').place,
    /0.00, -2.12/
  );
  assert.equal(
    monthTimetableContext({ ...bound, latitude: null }, 2026, 3, 'en').place,
    'Location not set'
  );
  assert.deepEqual(
    buildMonthTimetable({ year: 2026, month: 3, latitude: null, longitude: 0 }).rows,
    []
  );
  const html = buildMonthModal(
    {
      settings: {
        language: 'en',
        prayer: { ...p, locationName: '<img src=x>' + 'LONG'.repeat(500) },
      },
    },
    2026,
    3
  );
  assert.equal(html.includes('<img src=x>'), false);
  assert.match(html, /Coordinates: 30.00, 31.00/);
});
test('context names saved zone across DST, never today/device offset', () => {
  for (const timezone of ['America/New_York', 'Africa/Cairo']) {
    assert.equal(monthTimetableContext({ ...p, timezone }, 2026, 3, 'en').timezone, timezone);
    assert.equal(monthTimetableContext({ ...p, timezone }, 2026, 11, 'en').timezone, timezone);
  }
  for (const timezone of ['', 'invalid', null])
    assert.equal(
      monthTimetableContext({ ...p, timezone }, 2026, 3, 'en').timezone,
      'Device-clock fallback'
    );
});
test('resolved Method and Asr names are translated, offsets follow engine normalization', () => {
  const offsets = { fajr: 3.9, sunrise: -2.1, dhuhr: '5', asr: 100, maghrib: 'bad', isha: null };
  const context = monthTimetableContext(
    { ...p, method: 'unknown', asr: 'unknown', offsets },
    2026,
    3,
    'en'
  );
  assert.equal(context.offsets.length, 3);
  const applied = applyPrayerOffsets(
    { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    offsets
  );
  assert.deepEqual(
    context.offsets.map((v) => v.match(/[+-]\d+/)?.[0]),
    ['+3', '-3', '+5']
  );
  assert.equal(applied.sunrise * 60, -3);
  assert.match(context.asr, /Standard/);
  assert.equal(context.method, 'Muslim World League');
  for (const method of Object.keys(METHODS))
    for (const lang of ['ar', 'en'])
      assert.equal(
        monthTimetableContext({ ...p, method }, 2026, 3, lang).method.includes('prayer.method.'),
        false
      );
});
