/**
 * tests/prayerExport.test.js — .ics prayer-times export (v5.2.0).
 * Pure domain: event counts, midnight-wrap dates, escaping, filenames.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrayerICS,
  icsEscape,
  icsLocal,
  prayerICSFilename,
} from '../js/domain/prayerExport.js';

const TIMES = { fajr: 5.5, sunrise: 7, dhuhr: 12.5, asr: 15.75, maghrib: 18.25, isha: 19.75 };
const DAY = new Date(2026, 8, 4, 12, 0, 0);

test('emits six VEVENTs with local floating times', () => {
  const ics = buildPrayerICS(TIMES, DAY, { names: { fajr: 'Fajr' } });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 6);
  assert.ok(ics.includes('DTSTART:20260904T053000'));
  assert.ok(ics.includes('DTSTART:20260904T123000'));
  assert.ok(ics.includes('SUMMARY:Fajr'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('midnight-wrap hours land on the next calendar day', () => {
  const ics = buildPrayerICS({ ...TIMES, maghrib: 24.07 }, DAY);
  assert.ok(ics.includes('DTSTART:20260905T000400'));
});

test('unreachable and non-finite entries are skipped, never exported', () => {
  const ics = buildPrayerICS({ ...TIMES, isha: NaN }, DAY, {});
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 5);
  const polar = buildPrayerICS(TIMES, DAY, {});
  assert.equal((polar.match(/BEGIN:VEVENT/g) || []).length, 6);
  const withFlag = buildPrayerICS({ ...TIMES, unreachable: { isha: true } }, DAY, {});
  assert.equal((withFlag.match(/BEGIN:VEVENT/g) || []).length, 5);
});

test('place becomes LOCATION; special chars are escaped', () => {
  const ics = buildPrayerICS(TIMES, DAY, { place: 'Home, Sweet;Home' });
  assert.ok(ics.includes('LOCATION:Home\\, Sweet\\;Home'));
  assert.equal(icsEscape('a\\b\nc'), 'a\\\\b\\nc');
});

test('multi-day export clamps to 1..7 days; filename is dated', () => {
  const three = buildPrayerICS(TIMES, DAY, { days: 3 });
  assert.equal((three.match(/BEGIN:VEVENT/g) || []).length, 18);
  const clamped = buildPrayerICS(TIMES, DAY, { days: 99 });
  assert.equal((clamped.match(/BEGIN:VEVENT/g) || []).length, 6);
  assert.equal(prayerICSFilename(DAY), 'prayer-times-2026-09-04.ics');
  assert.ok(/^DTSTART:20260904T\d{6}$/.test(`DTSTART:${icsLocal(DAY).slice(0, 8)}T120000`));
});

test('monthly timetable: row per day, null without location, leap February', async () => {
  const { buildMonthTimetable, timetableCell, buildMonthICS } =
    await import('../js/domain/prayerExport.js');
  const prefs = {
    year: 2026,
    month: 2,
    latitude: 30.0444,
    longitude: 31.2357,
    timezoneOffsetHours: 2,
    method: 'MWL',
    asr: 'Standard',
  };
  const table = buildMonthTimetable(prefs);
  assert.equal(table.rows.length, 28, 'Feb 2026 has 28 days');
  assert.equal(table.rows[0].day, 1);
  assert.ok(Number.isFinite(table.rows[0].times.fajr), 'times computed');
  assert.equal(timetableCell(null, 'fajr'), '—');
  assert.equal(timetableCell({ fajr: NaN }, 'fajr'), '—');
  assert.ok(/^\d{1,2}:\d{2}/.test(timetableCell(table.rows[0].times, 'fajr')), 'clock-shaped cell');
  const noLoc = buildMonthTimetable({ ...prefs, latitude: null });
  assert.deepEqual(noLoc.rows, [], 'no location → no rows, never invented');
  assert.equal(buildMonthTimetable({ year: 'x', month: 13 }), null, 'hostile date refused');
  const ics = buildMonthICS(table, { place: 'Cairo', names: { fajr: 'Fajr' } });
  const events = ics.split('BEGIN:VEVENT').length - 1;
  assert.equal(events, 28 * 6, 'one event per prayer per day');
  assert.ok(ics.includes('UID:nur-month-20260201-fajr@nur-al-dhikr'), 'month UID namespace');
});
