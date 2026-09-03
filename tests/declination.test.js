/**
 * tests/declination.test.js — v3.26.0, the World Magnetic Model in the app.
 *
 * The gold standard: NOAA/NCEI publishes official WMM2025 test values
 * (scripts/WMM2025COF/WMM2025_TestValues.txt). A qibla needle correction
 * built on a hand-typed or mis-derived model would be quietly wrong, so
 * the implementation is pinned against the model's own ground truth —
 * VERBATIM rows spanning all six test dates and every hemisphere,
 * including the wild near-pole rows. If this implementation drifts, the
 * gate fails loudly. A second layer of regression pins covers the
 * positions the app actually serves (model-vs-itself, clearly labeled).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  declinationAt,
  declinationLabel,
  declinationCached,
  decimalYear,
} from '../js/domain/wmm.js';
import { renderQibla } from '../js/views/qibla.js';
import { t } from '../js/core/i18n.js';

/** Date whose decimal year is exactly `y` under the app's convention. */
function dateAtDecimalYear(y) {
  const year = Math.floor(y);
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  return new Date(start + (y - year) * (next - start));
}

/* ------------------------------------------------------------------ */
/* THE GATE: verbatim rows from NOAA's WMM2025_TestValues.txt          */
/* (decimalYear, altitudeKm, latDeg, lonDeg, declinationDeg)          */
/* ------------------------------------------------------------------ */

const NOAA_ROWS = [
  [2025.0, 28, 89, -121, -99.77],
  [2025.0, 48, 80, -96, -29.91],
  [2025.0, 54, 82, 87, 54.89],
  [2025.0, 65, 43, 93, 0.5],
  [2025.0, 51, -33, 109, -5.49],
  [2025.0, 39, -59, -8, -15.75],
  [2025.0, 3, -50, -103, 27.96],
  [2025.0, 94, -29, -110, 15.74],
  [2025.0, 66, 14, 143, -0.19],
  [2025.0, 18, 0, 21, 1.29],
  [2025.5, 6, -36, -137, 20.28],
  [2025.5, 63, 26, 81, 0.51],
  [2025.5, 50, -70, -133, 57.21],
  [2025.5, 8, -66, 17, -33.14],
  [2025.5, 40, -12, -129, 10.76],
  [2025.5, 44, 33, -118, 11.1],
  [2026.0, 74, -57, 3, -22.51],
  [2026.0, 33, -3, -147, 9.71],
  [2026.0, 62, -14, 99, -1.43],
  [2026.0, 83, 86, -46, -30.61],
  [2026.0, 82, -64, 87, -81.74],
  [2026.0, 34, -19, 43, -14.98],
  [2026.5, 14, 0, 80, -3.1],
  [2026.5, 12, -82, -68, 29.79],
  [2026.5, 12, -79, 115, -137.58],
  [2026.5, 19, 29, 66, 2.24],
  [2027.0, 67, 72, -115, 13.73],
  [2027.0, 57, -43, 50, -48.27],
  [2027.0, 12, -63, 178, 57.87],
  [2027.0, 61, 59, -77, -16.48],
  [2027.5, 0, -13, -59, -17.49],
  [2027.5, 73, -72, 95, -102.64],
  [2027.5, 16, 66, -178, 0.37],
  [2027.5, 72, -87, 38, -65.44],
  [2028.0, 86, -85, -79, 41.09],
  [2028.0, 75, 79, 125, -18.59],
  [2028.0, 11, -22, -21, -23.24],
  [2028.5, 68, -58, 156, 41.57],
  [2028.5, 55, 86, 70, 67.64],
  [2028.5, 65, 48, 148, -9.55],
  [2029.0, 50, 87, -154, -73.48],
  [2029.0, 49, -50, -179, 32.11],
  [2029.0, 38, -76, 49, -64.28],
  [2029.5, 93, -2, 158, 7.09],
  [2029.5, 63, 88, 26, 36.52],
  [2029.5, 26, -65, 55, -63.48],
];

test('DECLINATION GATE: the model reproduces NOAA official WMM2025 values verbatim', () => {
  let worst = 0;
  for (const [year, altKm, lat, lon, expected] of NOAA_ROWS) {
    const d = declinationAt(lat, lon, dateAtDecimalYear(year), altKm);
    assert.ok(d != null, `declinationAt(${lat}, ${lon}, ${year}) returned null`);
    const err = Math.abs(d - expected);
    worst = Math.max(worst, err);
    assert.ok(
      err <= 0.02,
      `D(${lat}, ${lon}, ${year}, ${altKm}km) = ${d}, NOAA says ${expected} (err ${err})`
    );
  }
  assert.ok(worst <= 0.02, `worst-case error ${worst} exceeded the 0.02 gate`);
});

/* ------------------------------------------------------------------ */
/* regression pins for app-served positions (model vs itself — the     */
/* correctness proof lives in the gate above)                          */
/* ------------------------------------------------------------------ */

test('REGRESSION: Cairo, Mecca, Medina, London, NYC stay within their pinned bands', () => {
  const mid2026 = dateAtDecimalYear(2026.5);
  const pins = [
    // [lat, lon, expected, band] — east-positive. Values produced by the
    // gate-proven model (NOAA-verbatim gate above); they pin the model
    // against future drift, NOT an independent source of truth.
    [30.0444, 31.2357, 4.76, 0.05], // Cairo
    [21.4225, 39.8262, 3.5, 0.05], // Mecca
    [24.4686, 39.6142, 3.86, 0.05], // Medina
    [51.5074, -0.1278, 1.16, 0.05], // London
    [40.7128, -74.006, -12.47, 0.05], // New York
  ];
  for (const [lat, lon, expected, band] of pins) {
    const d = declinationAt(lat, lon, mid2026, 0);
    assert.ok(d != null);
    assert.ok(
      Math.abs(d - expected) <= band,
      `regression D(${lat},${lon}) = ${d}, pinned ${expected} ± ${band}`
    );
  }
});

/* ------------------------------------------------------------------ */
/* guards and helpers                                                  */
/* ------------------------------------------------------------------ */

test('declinationAt: hostile and out-of-range input returns null, never a wrong correction', () => {
  assert.equal(declinationAt(NaN, 10), null);
  assert.equal(declinationAt('x', 10), null);
  assert.equal(declinationAt(30, Infinity), null);
  assert.equal(declinationAt(91, 10), null);
  assert.equal(declinationAt(30, 181), null);
  assert.equal(declinationAt(30, 10, 'not-a-date'), null);
  assert.equal(declinationAt(null, null), null);
});

test('declinationCached: deterministic per day, distinct positions distinct values', () => {
  const now = new Date(2026, 7, 29);
  const a = declinationCached(30.0444, 31.2357, now);
  const b = declinationCached(30.0444, 31.2357, now);
  assert.equal(a, b);
  assert.ok(Math.abs(declinationCached(21.4225, 39.8262, now) - a) > 0.01);
  assert.equal(declinationCached('junk', 5, now), null);
});

test('declinationLabel: east-positive convention, one decimal', () => {
  assert.equal(declinationLabel(4.36), '4.4\u00B0 E');
  assert.equal(declinationLabel(-12.72), '12.7\u00B0 W');
  assert.equal(declinationLabel(0), '0.0\u00B0 E');
  assert.equal(declinationLabel(null), null);
});

test('decimalYear: NOAA convention mid-year fractions', () => {
  assert.equal(decimalYear(new Date(Date.UTC(2025, 0, 1))), 2025);
  assert.ok(Math.abs(decimalYear(dateAtDecimalYear(2025.5)) - 2025.5) < 0.001);
  assert.equal(decimalYear('x'), null);
});
