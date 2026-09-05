/**
 * tests/prayer.test.js — the prayer-time engine's first direct test file
 * (v4.3). The engine had ZERO tests through v4.2 despite being the app's
 * daily-critical computation, which is exactly how the wrapped-midnight
 * bug (D2) and the flat-90-minute Umm al-Qura Isha (D5) shipped.
 *
 * The reference below is the NOAA "General Solar Position Calculations"
 * factsheet formulation — a Fourier-series method, deliberately a DIFFERENT
 * algorithm family from the app's PrayTimes-style orbital-element engine —
 * so agreement is evidence about astronomy, not about shared code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTimes,
  nextPrayer,
  hoursToClock,
  formatClock,
  decimalHoursToDate,
  METHODS,
  ASR_FACTORS,
} from '../js/domain/prayer.js';
import { recommendedAdhkarWindow } from '../js/domain/adhkarTiming.js';
import { fastPhase } from '../js/domain/ramadan.js';

const D2R = Math.PI / 180;
const sind = (d) => Math.sin(d * D2R);
const cosd = (d) => Math.cos(d * D2R);

/* ------------------------------------------------------------------ */
/* Independent NOAA reference (factsheet formulas)                     */
/* ------------------------------------------------------------------ */

function dayOfYear(y, m, d) {
  const start = Date.UTC(y, 0, 1);
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000) + 1;
}

/** NOAA solar position for a given date (hours = 12 local), latitude deg,
 *  longitude deg (east+), timezone hours. Returns decimal-hour times for
 *  sunrise / solar noon (dhuhr) / sunset and hour-angle-based times for
 *  arbitrary depression angles. */
function noaaTimes(y, m, d, lat, lng, tzHours) {
  const doy = dayOfYear(y, m, d);
  const g = ((2 * Math.PI) / 365) * (doy - 1); // fractional year at noon
  const eqtimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g); // radians

  const solarNoonMin = 720 - 4 * lng - eqtimeMin + tzHours * 60;

  const timeAtDepression = (depressionDeg) => {
    const zenith = 90 + depressionDeg;
    const ha =
      (Math.acos(
        (cosd(zenith) - Math.sin(lat * D2R) * Math.sin(decl)) /
          (Math.cos(lat * D2R) * Math.cos(decl))
      ) *
        180) /
      Math.PI;
    return { rise: (solarNoonMin - 4 * ha) / 60, set: (solarNoonMin + 4 * ha) / 60 };
  };

  return {
    dhuhr: solarNoonMin / 60,
    sunrise: timeAtDepression(0.833).rise,
    sunset: timeAtDepression(0.833).set,
    at: (depression) => timeAtDepression(depression),
  };
}

/** Compare engine vs reference within `toleranceMin` minutes. */
function assertClose(actualHours, expectedHours, toleranceMin, label) {
  const diffMin = Math.abs(actualHours - expectedHours) * 60;
  assert.ok(
    diffMin <= toleranceMin,
    `${label}: engine ${actualHours.toFixed(3)}h vs NOAA ${expectedHours.toFixed(3)}h — ${diffMin.toFixed(1)} min apart (tolerance ${toleranceMin})`
  );
}

/* ------------------------------------------------------------------ */
/* Golden values: city/date/method matrix vs the NOAA reference         */
/* ------------------------------------------------------------------ */

const CITY_MATRIX = [
  // [label, lat, lng, tz, y, m, d, method, fajrAngle, ishaAngle, twilightReachable]
  // London in late June never reaches 17/18° below the horizon (the sun's
  // solar-midnight depression is only ~15°) — real astronomy, not a bug:
  // the engine's one-seventh-of-night fallback applies there, so fajr/isha
  // are asserted as fallbacks rather than against the (NaN) reference.
  ['Cairo Jun', 30.0444, 31.2357, 3, 2025, 6, 21, 'MWL', 18, 17, true],
  ['Cairo Dec', 30.0444, 31.2357, 3, 2025, 12, 21, 'MWL', 18, 17, true],
  ['Mecca Jun', 21.4225, 39.8262, 3, 2025, 6, 21, 'MWL', 18, 17, true],
  ['London Jun', 51.5074, -0.1278, 1, 2025, 6, 21, 'MWL', 18, 17, false],
  ['London Dec', 51.5074, -0.1278, 1, 2025, 12, 21, 'MWL', 18, 17, true],
  ['New York Jun (ISNA)', 40.7128, -74.006, -4, 2025, 6, 21, 'ISNA', 15, 15, true],
  ['Jakarta Jun (Karachi)', -6.2088, 106.8456, 7, 2025, 6, 21, 'Karachi', 18, 18, true],
  ['Sydney Dec', -33.8688, 151.2093, 10, 2025, 12, 21, 'MWL', 18, 17, true],
];

const TOL = 4; // minutes — the two formulations differ by ~1-2 min; 4 absorbs equinox extremes

test('calculateTimes matches the independent NOAA reference across the city matrix', () => {
  for (const [label, lat, lng, tz, y, m, d, method, fajrA, ishaA, twilight] of CITY_MATRIX) {
    const engine = calculateTimes({
      date: new Date(y, m - 1, d),
      latitude: lat,
      longitude: lng,
      timezoneOffsetHours: tz,
      method,
    });
    const ref = noaaTimes(y, m, d, lat, lng, tz);

    assertClose(engine.sunrise, ref.sunrise, TOL, `${label} sunrise`);
    assertClose(engine.dhuhr, ref.dhuhr, TOL, `${label} dhuhr`);
    assertClose(engine.maghrib, ref.sunset, TOL, `${label} maghrib`);

    if (twilight) {
      assertClose(engine.fajr, ref.at(fajrA).rise, TOL, `${label} fajr`);
      assertClose(engine.isha, ref.at(ishaA).set, TOL, `${label} isha`);
      assert.equal(engine.unreachable.fajr, false, `${label} fajr reachable`);
      assert.equal(engine.unreachable.isha, false, `${label} isha reachable`);
    } else {
      // White night: the one-seventh-of-night fallback must produce finite,
      // ORDERED stand-ins and honestly flag itself.
      assert.equal(engine.unreachable.fajr, true, `${label} fajr fallback flag`);
      assert.equal(engine.unreachable.isha, true, `${label} isha fallback flag`);
      assert.ok(
        Number.isFinite(engine.fajr) && engine.fajr < engine.sunrise,
        `${label} fallback fajr`
      );
      assert.ok(
        Number.isFinite(engine.isha) && engine.isha > engine.maghrib,
        `${label} fallback isha`
      );
    }

    // Physical ordering must hold everywhere on the matrix.
    assert.ok(
      engine.fajr < engine.sunrise && engine.sunrise < engine.dhuhr,
      `${label}: fajr < sunrise < dhuhr`
    );
    assert.ok(
      engine.dhuhr < engine.asr && engine.asr < engine.maghrib && engine.maghrib < engine.isha,
      `${label}: dhuhr < asr < maghrib < isha`
    );
  }
});

test('Hanafi Asr is meaningfully later than Standard Asr (shadow factor 2 vs 1)', () => {
  const base = {
    date: new Date(2025, 5, 21),
    latitude: 30.0444,
    longitude: 31.2357,
    timezoneOffsetHours: 3,
    method: 'MWL',
  };
  const standard = calculateTimes({ ...base, asr: 'Standard' });
  const hanafi = calculateTimes({ ...base, asr: 'Hanafi' });
  const deltaMin = (hanafi.asr - standard.asr) * 60;
  // The audit's independent check measured +54 min at Cairo's latitude in
  // June; accept the plausible magnitude band rather than a single minute.
  assert.ok(deltaMin > 30 && deltaMin < 90, `Hanafi−Standard asr = ${deltaMin.toFixed(1)} min`);
  assert.equal(ASR_FACTORS.Standard, 1);
  assert.equal(ASR_FACTORS.Hanafi, 2);
});

test('Umm al-Qura Isha: 90 min after Maghrib in Ramadan, 120 otherwise (v4.3)', () => {
  const mecca = (date) =>
    calculateTimes({
      date,
      latitude: 21.4225,
      longitude: 39.8262,
      timezoneOffsetHours: 3,
      method: 'UmmAlQura',
    });
  // 2025-03-05 is inside Ramadan 1446; 2025-12-21 is not.
  const ramadan = mecca(new Date(2025, 2, 5));
  const december = mecca(new Date(2025, 11, 21));
  assert.equal((ramadan.isha - ramadan.maghrib).toFixed(2), '1.50');
  assert.equal((december.isha - december.maghrib).toFixed(2), '2.00');
});

test('Tehran Maghrib uses its 4.5° convention, not the generic sunset', () => {
  const coords = {
    date: new Date(2025, 5, 21),
    latitude: 35.6892,
    longitude: 51.389,
    timezoneOffsetHours: 4.5,
  };
  const tehran = calculateTimes({ ...coords, method: 'Tehran' });
  const generic = calculateTimes({ ...coords, method: 'MWL' });
  const deltaMin = (tehran.maghrib - generic.maghrib) * 60;
  // 3.67° of extra depression near the solstice ≈ 15-25 min of hour angle.
  assert.ok(deltaMin > 10 && deltaMin < 35, `Tehran maghrib is ${deltaMin.toFixed(1)} min later`);
});

/* ------------------------------------------------------------------ */
/* Day-relative hours: the high-latitude midnight wrap (v4.3)          */
/* ------------------------------------------------------------------ */

// Reykjavik, 2025-06-21: sunset falls PAST midnight — the audit's headline
// case. Raw hours must keep the event on the NEXT calendar day.
const REYKJAVIK = { latitude: 64.1466, longitude: -21.9426, timezoneOffsetHours: 0, method: 'MWL' };

test('maghrib/isha past midnight stay day-relative (>= 24h), not wrapped onto today', () => {
  const t = calculateTimes({ ...REYKJAVIK, date: new Date(2025, 5, 21) });
  assert.ok(t.maghrib >= 24, `raw maghrib ${t.maghrib}`);
  assert.ok(t.isha >= 24, `raw isha ${t.isha}`);
  // Display normalizes onto the clock.
  assert.equal(formatClock(t.maghrib, false).slice(0, 2), '00');
});

test('nextPrayer at 23:30 says Maghrib (00:04), not Fajr — the fasting strip bug', () => {
  const t = calculateTimes({ ...REYKJAVIK, date: new Date(2025, 5, 21) });
  const next = nextPrayer(t, new Date(2025, 5, 21, 23, 30));
  assert.equal(next.name, 'maghrib');
  assert.ok(next.hours >= 24);
  assert.equal(next.tomorrow, undefined);
});

test('decimalHoursToDate rolls wrapped hours onto the NEXT day (trigger bug)', () => {
  const t = calculateTimes({ ...REYKJAVIK, date: new Date(2025, 5, 21) });
  const d = decimalHoursToDate(new Date(2025, 5, 21), t.maghrib);
  assert.equal(d.getDate(), 22);
  assert.equal(d.getHours(), 0);
  // And negative hours roll onto the previous day.
  const prev = decimalHoursToDate(new Date(2025, 5, 21), -0.5);
  assert.equal(prev.getDate(), 20);
  assert.equal(prev.getHours(), 23);
});

test('fastPhase keeps the fasting verdict at 23:30 when Maghrib is past midnight', () => {
  const t = calculateTimes({ ...REYKJAVIK, date: new Date(2025, 5, 21) });
  const phase = fastPhase(new Date(2025, 5, 21, 23, 30), t, 2.4);
  assert.equal(phase.phase, 'fasting');
  assert.equal(phase.targetName, 'maghrib');
});

test('adhkar evening window survives the midnight wrap', () => {
  // Synthetic day-relative times matching Reykjavik's shape.
  const times = { fajr: 2.56, dhuhr: 13.5, asr: 18.37, isha: 24.47 };
  assert.equal(recommendedAdhkarWindow(new Date(2025, 0, 1, 23, 0), times), 'evening');
  assert.equal(recommendedAdhkarWindow(new Date(2025, 0, 1, 0, 12), times), 'evening');
  // After Isha (00:28) the window closes.
  assert.equal(recommendedAdhkarWindow(new Date(2025, 0, 1, 0, 36), times), null);
  // Morning window unaffected.
  assert.equal(recommendedAdhkarWindow(new Date(2025, 0, 1, 7, 0), times), 'morning');
});

/* ------------------------------------------------------------------ */
/* Polar honesty (v4.3): unreachable flags                             */
/* ------------------------------------------------------------------ */

test('polar night: sunrise/maghrib/asr flagged unreachable; fajr/isha real', () => {
  const t = calculateTimes({
    date: new Date(2025, 11, 21),
    latitude: 69.6492, // Tromsø
    longitude: 18.9553,
    timezoneOffsetHours: 1,
    method: 'MWL',
  });
  assert.equal(t.unreachable.sunrise, true);
  assert.equal(t.unreachable.maghrib, true);
  assert.equal(t.unreachable.asr, true);
  // In deep polar night the sun DOES reach 18° below — fajr/isha are real.
  assert.equal(t.unreachable.fajr, false);
  assert.equal(t.unreachable.isha, false);
  // All outputs remain finite and ordered enough to render.
  for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    assert.ok(Number.isFinite(t[k]), `${k} finite`);
  }
});

test('mid-latitude cities never report unreachable sunrise/maghrib/asr', () => {
  for (const [label, lat, lng, tz, y, m, d] of CITY_MATRIX) {
    const t = calculateTimes({
      date: new Date(y, m - 1, d),
      latitude: lat,
      longitude: lng,
      timezoneOffsetHours: tz,
      method: 'MWL',
    });
    for (const k of ['sunrise', 'maghrib', 'asr']) {
      assert.equal(t.unreachable[k], false, `${label} ${k}`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Clock helpers                                                       */
/* ------------------------------------------------------------------ */

test('hoursToClock normalizes negative and >= 24 day-relative hours', () => {
  assert.deepEqual(hoursToClock(-0.5), { h: 23, m: 30 });
  assert.deepEqual(hoursToClock(24.06), { h: 0, m: 4 });
  assert.deepEqual(hoursToClock(25.5), { h: 1, m: 30 });
  assert.deepEqual(hoursToClock(12.25), { h: 12, m: 15 });
});

test('formatClock renders 12h and 24h forms from wrapped hours', () => {
  assert.equal(formatClock(24.06, false), '00:04');
  assert.equal(formatClock(-0.5, false), '23:30');
  assert.equal(formatClock(18.5, true, { am: 'AM', pm: 'PM' }), '6:30 PM');
  assert.equal(formatClock(0.5, true, { am: 'AM', pm: 'PM' }), '12:30 AM');
});

test('nextPrayer: normal-latitude day walks in order and wraps to tomorrow fajr', () => {
  const times = { fajr: 5, sunrise: 6.2, dhuhr: 12.5, asr: 15.7, maghrib: 18.4, isha: 19.9 };
  assert.equal(nextPrayer(times, new Date(2025, 0, 1, 3, 0)).name, 'fajr');
  assert.equal(nextPrayer(times, new Date(2025, 0, 1, 5, 30)).name, 'sunrise');
  assert.equal(nextPrayer(times, new Date(2025, 0, 1, 13, 0)).name, 'asr');
  const last = nextPrayer(times, new Date(2025, 0, 1, 23, 0));
  assert.equal(last.name, 'fajr');
  assert.equal(last.tomorrow, true);
});

test('METHODS table is frozen and every method defines fajr + one isha rule', () => {
  assert.ok(Object.isFrozen(METHODS));
  for (const [id, cfg] of Object.entries(METHODS)) {
    assert.ok(Number.isFinite(cfg.fajr), `${id} fajr angle`);
    assert.ok(
      cfg.isha == null ? Number.isFinite(cfg.ishaMinutesAfterMaghrib) : Number.isFinite(cfg.isha),
      `${id} isha rule`
    );
  }
});
