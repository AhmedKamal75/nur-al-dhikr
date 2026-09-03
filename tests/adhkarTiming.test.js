/**
 * tests/adhkarTiming.test.js — time-of-day recommendation windows
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recommendedAdhkarWindow,
  MORNING_WINDOW,
  EVENING_WINDOW,
} from '../js/domain/adhkarTiming.js';

function at(hour, minute = 0) {
  const d = new Date(2026, 7, 24, hour, minute, 0, 0);
  return d;
}

test('recommendedAdhkarWindow: morning window spans Fajr-hour to noon', () => {
  assert.equal(MORNING_WINDOW.startHour, 4);
  assert.equal(MORNING_WINDOW.endHour, 12);
  assert.equal(recommendedAdhkarWindow(at(4, 0)), 'morning'); // window opens
  assert.equal(recommendedAdhkarWindow(at(6, 30)), 'morning');
  assert.equal(recommendedAdhkarWindow(at(11, 59)), 'morning'); // last minute
});

test('recommendedAdhkarWindow: midday gap between the two windows', () => {
  assert.equal(recommendedAdhkarWindow(at(12, 0)), null); // morning closed
  assert.equal(recommendedAdhkarWindow(at(13, 15)), null);
  assert.equal(recommendedAdhkarWindow(at(14, 59)), null);
});

test('recommendedAdhkarWindow: evening window spans Asr-hour to late evening', () => {
  assert.equal(EVENING_WINDOW.startHour, 15);
  assert.equal(EVENING_WINDOW.endHour, 21);
  assert.equal(recommendedAdhkarWindow(at(15, 0)), 'evening'); // window opens
  assert.equal(recommendedAdhkarWindow(at(17, 45)), 'evening');
  assert.equal(recommendedAdhkarWindow(at(20, 59)), 'evening'); // last minute
});

test('recommendedAdhkarWindow: night returns null (no wrong nudge)', () => {
  assert.equal(recommendedAdhkarWindow(at(21, 0)), null);
  assert.equal(recommendedAdhkarWindow(at(23, 30)), null);
  assert.equal(recommendedAdhkarWindow(at(2, 10)), null);
  assert.equal(recommendedAdhkarWindow(at(3, 59)), null); // just before Fajr-hour
});

test('recommendedAdhkarWindow: windows do not overlap', () => {
  assert.ok(MORNING_WINDOW.endHour <= EVENING_WINDOW.startHour);
});

/* ---- Prayer-times mode (v2.8.0): real windows when a location exists ---- */

// A realistic day: Fajr 4:36, Dhuhr 12:03, Asr 15:42, Maghrib 18:21, Isha 19:47.
const TIMES = { fajr: 4.6, sunrise: 6.05, dhuhr: 12.05, asr: 15.7, maghrib: 18.35, isha: 19.78 };

test('prayer mode: morning window runs Fajr → Dhuhr', () => {
  assert.equal(recommendedAdhkarWindow(at(4, 36), TIMES), 'morning'); // exactly at Fajr
  assert.equal(recommendedAdhkarWindow(at(7, 0), TIMES), 'morning');
  assert.equal(recommendedAdhkarWindow(at(11, 59), TIMES), 'morning');
  assert.equal(recommendedAdhkarWindow(at(12, 5), TIMES), null); // past Dhuhr
});

test('prayer mode: pre-Fajr and the Dhuhr→Asr gap both return null', () => {
  assert.equal(recommendedAdhkarWindow(at(4, 30), TIMES), null);
  assert.equal(recommendedAdhkarWindow(at(13, 0), TIMES), null);
  assert.equal(recommendedAdhkarWindow(at(15, 41), TIMES), null); // one minute before Asr
});

test('prayer mode: evening window runs Asr → Isha', () => {
  assert.equal(recommendedAdhkarWindow(at(15, 42), TIMES), 'evening'); // exactly at Asr
  assert.equal(recommendedAdhkarWindow(at(17, 0), TIMES), 'evening');
  assert.equal(recommendedAdhkarWindow(at(19, 47), TIMES), null); // at Isha the window closes
  assert.equal(recommendedAdhkarWindow(at(23, 0), TIMES), null);
});

test('prayer mode overrides the clock fallback when they disagree', () => {
  // 15:05 is inside the FIXED evening window (15–21) but before Asr (15:42):
  // with real times the answer must be null, not 'evening'.
  assert.equal(recommendedAdhkarWindow(at(15, 5), TIMES), null);
  assert.equal(recommendedAdhkarWindow(at(15, 5)), 'evening'); // fallback, no times given
});

test('prayer mode: malformed times fall back to the clock windows', () => {
  const broken = { fajr: NaN, dhuhr: 12, asr: 15, isha: 19 };
  assert.equal(recommendedAdhkarWindow(at(16, 0), broken), 'evening'); // behaves like the fixed window
  const partial = { fajr: 4.6, dhuhr: 12.05 }; // missing asr/isha
  assert.equal(recommendedAdhkarWindow(at(16, 0), partial), 'evening');
});
