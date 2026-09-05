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
