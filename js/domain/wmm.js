/**
 * wmm.js — the World Magnetic Model (WMM2025), pure and offline.
 *
 * Computes the magnetic declination D (the angle between true north and
 * magnetic north) at a geodetic position and date, using the official
 * NOAA/NCEI coefficients embedded in wmm-coefs.js. This is the "tiny
 * static table at app latitudes" the TODO asked for, except it's the real
 * model: spherical-harmonic evaluation of the main geomagnetic field,
 * accurate for declination to well under a degree in most inhabited areas.
 *
 * Standard WMM algorithm (Chulliat et al., tech report): geodetic -> geo-
 * centric via WGS84, Schmidt semi-normalized associated Legendre functions
 * up to n=m=12, coefficient time-adjustment by secular variation, then the
 * geocentric-to-geodetic rotation. tests/declination.test.js pins the
 * result against NOAA's own published test values — if this file drifts,
 * those tests fail loudly. Public-domain model data; nothing leaves the
 * device.
 */

import { WMM_COEF, WMM_EPOCH } from './wmm-coefs.js';

const A = 6378.137; // WGS84 semi-major axis, km
const B = 6356.7523142; // WGS84 semi-minor axis, km
const RE = 6371.2; // geomagnetic reference radius, km
const E2 = (A * A - B * B) / (A * A);
const MAX_N = 12;
const RAD = Math.PI / 180;
const DAY_MS = 86400000;

/** Coefficients indexed [n][m] = { gtc, htc } at time-dependence applied. */
let coefCacheKey = null;
let coefCache = null;

function coefficientsFor(decimalYear) {
  const key = Math.round(decimalYear * 1000) / 1000;
  if (coefCacheKey === key && coefCache) return coefCache;
  const dt = key - WMM_EPOCH;
  const table = Array.from({ length: MAX_N + 1 }, () => new Array(MAX_N + 1).fill(null));
  for (const [n, m, g, h, gd, hd] of WMM_COEF) {
    table[n][m] = { gtc: g + gd * dt, htc: h + hd * dt };
  }
  coefCacheKey = key;
  coefCache = table;
  return table;
}

/** Decimal year from a Date (NOAA convention: 365-day year from Jan 1). */
export function decimalYear(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const next = Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  return date.getUTCFullYear() + (date.getTime() - start) / (next - start);
}

/**
 * Associated Legendre functions P[n][m] (geomagnetic convention: no
 * Condon–Shortley phase, colatitude form) and their theta-derivatives,
 * built from the PLAIN recurrences in x = cos(colatitude) and then scaled
 * by the Schmidt quasi-normal factors. The derivative uses the exact
 * term-by-term differentiation of the same recurrences (chain rule via
 * dsin/dx), never a finite difference.
 */
function schmidtLegendre(theta) {
  const x = Math.cos(theta); // = sin(latitude)
  const s = Math.sin(theta);
  const P = Array.from({ length: MAX_N + 1 }, () => new Array(MAX_N + 1).fill(0));
  const dP = Array.from({ length: MAX_N + 1 }, () => new Array(MAX_N + 1).fill(0)); // dP/dx
  P[0][0] = 1;
  for (let n = 1; n <= MAX_N; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        // P(n,n) = (2n-1)!! (1-x^2)^(n/2) = (2n-1) s P(n-1,n-1)
        P[n][n] = (2 * n - 1) * s * P[n - 1][n - 1];
        dP[n][n] = (2 * n - 1) * ((-x / s) * P[n - 1][n - 1] + s * dP[n - 1][n - 1]);
      } else if (n - 1 === m) {
        // P(n,n-1) = x (2n-1) P(n-1,n-1)
        P[n][m] = x * (2 * n - 1) * P[n - 1][n - 1];
        dP[n][m] = (2 * n - 1) * (P[n - 1][n - 1] + x * dP[n - 1][n - 1]);
      } else {
        // P(n,m) = ((2n-1) x P(n-1,m) - (n+m-1) P(n-2,m)) / (n-m)
        const k = n + m - 1;
        P[n][m] = ((2 * n - 1) * x * P[n - 1][m] - k * P[n - 2][m]) / (n - m);
        dP[n][m] = ((2 * n - 1) * (P[n - 1][m] + x * dP[n - 1][m]) - k * dP[n - 2][m]) / (n - m);
      }
    }
  }
  // Schmidt quasi-normal factors: 1 for m=0, sqrt(2 (n-m)!/(n+m)!) else.
  const fact = [1];
  for (let i = 1; i <= 2 * MAX_N; i++) fact[i] = fact[i - 1] * i;
  for (let n = 1; n <= MAX_N; n++) {
    for (let m = 1; m <= n; m++) {
      const f = Math.sqrt((2 * fact[n - m]) / fact[n + m]);
      P[n][m] *= f;
      dP[n][m] *= f;
    }
  }
  // Convert dP/dx to dP/d(theta) = -sin(theta) * dP/dx.
  for (let n = 0; n <= MAX_N; n++) {
    for (let m = 0; m <= n; m++) dP[n][m] *= -s;
  }
  return { P, dP };
}

/**
 * Magnetic declination in degrees, east-positive, at geodetic latitude /
 * longitude (degrees, sea level) for the given date. Returns null for
 * non-finite input — the qibla view degrades to the uncorrected needle,
 * never to a wrong correction.
 */
export function declinationAt(latDeg, lonDeg, date = new Date(), altKm = 0) {
  // Strict number guards BEFORE coercion: null would silently become 0 and
  // junk strings NaN — a wrong correction here points the needle the wrong
  // way, so anything that is not a finite number returns null.
  if (typeof latDeg !== 'number' || typeof lonDeg !== 'number') return null;
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  const h = Number(altKm);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(h)) return null;
  if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 180) return null;
  const t = decimalYear(date);
  if (t == null) return null;

  // Geodetic -> geocentric (WGS84) at the given altitude (app uses 0 km).
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const rc = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  const p = (rc + h) * cosLat;
  const z = (rc * (1 - E2) + h) * sinLat;
  const r = Math.sqrt(p * p + z * z);
  const phiC = Math.asin(z / r); // geocentric latitude
  const theta = Math.PI / 2 - phiC; // colatitude
  const v = Math.sin(theta);
  const delta = lat - phiC; // geodetic - geocentric

  const { P, dP } = schmidtLegendre(theta);
  const coefs = coefficientsFor(t);
  const ratio = RE / r;

  // Geocentric field components (standard WMM form): north X' = +Σw·ghc·
  // dP/dθ (the derivative's sense is fixed by the chain rule above), east
  // Y' = +Σw·m·ghs·P/sinθ, down Z' = −Σ(n+1)·w·ghc·P, with w = (re/r)^(n+2).
  let Xc = 0; // northward (geocentric)
  let Yc = 0; // eastward
  let Zc = 0; // downward
  for (let n = 1; n <= MAX_N; n++) {
    for (let m = 0; m <= n; m++) {
      const c = coefs[n][m];
      if (!c) continue;
      const cosM = Math.cos(m * lon);
      const sinM = Math.sin(m * lon);
      const ghc = c.gtc * cosM + c.htc * sinM;
      const ghs = c.gtc * sinM - c.htc * cosM;
      const w = Math.pow(ratio, n + 2);
      Xc += w * ghc * dP[n][m];
      Zc += -(n + 1) * w * ghc * P[n][m];
      if (m > 0) Yc += (w * m * ghs * P[n][m]) / v;
    }
  }

  // Rotate geocentric components onto the geodetic frame (Δ = geodetic −
  // geocentric colatitude tilt): the geodetic north is tilted from the
  // geocentric radial direction, mixing Z' into X.
  const cosD = Math.cos(delta);
  const sinD = Math.sin(delta);
  const X = Xc * cosD + Zc * sinD;

  const D = Math.atan2(Yc, X) / RAD;
  if (!Number.isFinite(D)) return null;
  return Math.round(D * 100) / 100;
}

/** '4.6° E' / '12.3° W' label for a declination value. */
export function declinationLabel(dDeg) {
  if (!Number.isFinite(dDeg)) return null;
  return `${Math.abs(dDeg).toFixed(1)}\u00B0 ${dDeg >= 0 ? 'E' : 'W'}`;
}

/** Cache keyed by (lat, lon, day) — secular variation moves <0.02°/day. */
const cache = new Map();

/** Session-cached wrapper used by the qibla view (same inputs -> same value). */
export function declinationCached(latDeg, lonDeg, date = new Date()) {
  if (typeof latDeg !== 'number' || typeof lonDeg !== 'number') return null;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  const key = `${Number(latDeg).toFixed(3)}|${Number(lonDeg).toFixed(3)}|${Math.floor(
    date.getTime() / DAY_MS
  )}`;
  if (cache.has(key)) return cache.get(key);
  const value = declinationAt(latDeg, lonDeg, date);
  if (cache.size > 64) cache.clear();
  cache.set(key, value);
  return value;
}
