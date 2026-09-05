/**
 * prayer.js
 * Fully offline prayer time calculation from latitude/longitude/date using
 * standard low-precision solar position astronomy (no network calls, no UI).
 *
 * (v4.3) DAY-RELATIVE HOURS: calculateTimes returns each time as hours since
 * midnight of the COMPUTATION DATE, unwrapped into [−24, 48). At high
 * latitudes Maghrib/Isha can legitimately fall after midnight (raw value
 * ≥ 24) and Fajr before it (raw value < 0). The old per-time `fixHour`
 * collapsed 00:04-tomorrow onto 00:04-today, which broke nextPrayer, the
 * fasting phase, the adhkar windows, and fired SW alert triggers 24h early
 * (all of Iceland in summer). Consumers should either compare directly
 * against "hours since midnight of the same date" or format through
 * hoursToClock/formatClock, which normalize for display.
 *
 * Fajr/Isha angles and Maghrib/Isha offsets follow the commonly published
 * conventions used by most calculation authorities. Results are estimates —
 * always corroborate against a local moon-sighting authority for worship.
 */

import { toHijri } from './calendar.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const METHODS = Object.freeze({
  MWL: { name: 'Muslim World League', fajr: 18, isha: 17 },
  ISNA: { name: 'Islamic Society of North America', fajr: 15, isha: 15 },
  Egyptian: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  Karachi: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  // (v4.3) Umm al-Qura's published convention is Isha 90 minutes after
  // Maghrib during Ramadan and 120 minutes otherwise — a flat 90 left Isha
  // roughly half an hour early ~11 months a year for the method named after
  // the official Makkah calendar.
  UmmAlQura: {
    name: 'Umm al-Qura, Makkah',
    fajr: 18.5,
    isha: null,
    ishaMinutesAfterMaghrib: 120,
    ishaMinutesAfterMaghribRamadan: 90,
  },
  // (v4.3) Tehran computes Maghrib at 4.5° below the horizon (its own
  // convention), not the generic 0.833° sunset.
  Tehran: { name: 'Institute of Geophysics, Tehran', fajr: 17.7, isha: 14, maghribAngle: 4.5 },
  // The real Moonsighting Committee method uses latitude-dependent angles;
  // this approximation (18°/18°) is what most published tables reduce it
  // to. Labeled honestly so nobody mistakes it for the full rule.
  MoonsightingCommittee: { name: 'Moonsighting Committee (18°/18° approx.)', fajr: 18, isha: 18 },
});

export const ASR_FACTORS = Object.freeze({ Standard: 1, Hanafi: 2 });

function sin(d) {
  return Math.sin(d * D2R);
}
function cos(d) {
  return Math.cos(d * D2R);
}
function tan(d) {
  return Math.tan(d * D2R);
}
function arcsin(x) {
  return Math.asin(x) * R2D;
}
function arccos(x) {
  return Math.acos(x) * R2D;
}
function arctan2(y, x) {
  return Math.atan2(y, x) * R2D;
}
function arccot(x) {
  return arctan2(1, x);
}
function fixHour(h) {
  const x = h % 24;
  return x < 0 ? x + 24 : x;
}

/** Julian Day Number at Greenwich noon for a given Gregorian date. */
function julianDay(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function fixMod(val, mod) {
  const x = val % mod;
  return x < 0 ? x + mod : x;
}
function fixHour360(v) {
  return fixMod(v, 360);
}

/** Sun's declination (deg) and the equation of time (hours) for a given Julian day. */
function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixHour360(357.529 + 0.98560028 * D);
  const q = fixHour360(280.459 + 0.98564736 * D);
  const L = fixHour360(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = fixHour(arctan2(cos(e) * sin(L), cos(L)) / 15);
  const eqt = q / 15 - RA;
  const decl = arcsin(sin(e) * sin(L));
  return { declination: decl, equation: eqt };
}

/** Compute the time (in decimal hours, local solar time) the sun reaches `angle` degrees below horizon.
 *  Returns { time, unreachable } — unreachable is true at high latitudes/seasons where the sun never
 *  reaches that depression angle (e.g. summer twilight); callers should apply a fallback rule.
 */
function sunAngleTime(angle, jd, lat, dir /* -1 before noon, 1 after noon */, transit) {
  const { declination } = sunPosition(jd);
  const num = -sin(angle) - sin(declination) * sin(lat);
  const den = cos(declination) * cos(lat);
  const rawRatio = num / den;
  const unreachable = rawRatio < -1 || rawRatio > 1 || !Number.isFinite(rawRatio);
  const ratio = Math.max(-1, Math.min(1, rawRatio));
  const t = (1 / 15) * arccos(ratio);
  return { time: transit + dir * t, unreachable };
}

function asrTime(factor, jd, lat, transit) {
  const { declination } = sunPosition(jd);
  const angle = -arccot(factor + tan(Math.abs(lat - declination)));
  return sunAngleTime(angle, jd, lat, 1, transit);
}

/** Tabular Hijri month == Ramadan? (Used only by the Umm al-Qura Isha rule;
 *  ±1 day of tabular drift at the month boundary is immaterial there.) */
function isRamadanDate(date) {
  try {
    return toHijri(date).month === 9;
  } catch {
    return false;
  }
}

/**
 * Compute prayer times for a given date/location/settings.
 *
 * @returns {{fajr,sunrise,dhuhr,asr,maghrib,isha,unreachable}}
 *   Decimal hours since MIDNIGHT OF THE COMPUTATION DATE (day-relative,
 *   unwrapped — see the file header). `unreachable` is a per-name map that is
 *   true when the sun never reaches that time's defining angle today (polar
 *   day/night, white nights): those entries are best-effort fallbacks and
 *   views should say so instead of presenting them as measured times.
 */
export function calculateTimes({
  date = new Date(),
  latitude,
  longitude,
  timezoneOffsetHours,
  method = 'MWL',
  asr = 'Standard',
}) {
  if (latitude == null || longitude == null) return null;
  const jd =
    julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) - longitude / (15 * 24);
  const { equation } = sunPosition(jd);
  const transit = 12 + timezoneOffsetHours - longitude / 15 - equation;

  const cfg = METHODS[method] || METHODS.MWL;
  const lat = latitude;

  const fajrR = sunAngleTime(cfg.fajr, jd, lat, -1, transit);
  const sunriseR = sunAngleTime(0.833, jd, lat, -1, transit);
  const dhuhr = transit + 1 / 120; // small correction, conventional
  const asrT = asrTime(ASR_FACTORS[asr] ?? 1, jd, lat, transit);
  const maghribR = sunAngleTime(cfg.maghribAngle ?? 0.833, jd, lat, 1, transit);

  let ishaMinutes = cfg.ishaMinutesAfterMaghrib;
  if (cfg.ishaMinutesAfterMaghribRamadan != null && isRamadanDate(date)) {
    ishaMinutes = cfg.ishaMinutesAfterMaghribRamadan;
  }
  let ishaR;
  if (cfg.isha == null && ishaMinutes != null) {
    ishaR = {
      time: maghribR.time + ishaMinutes / 60,
      unreachable: maghribR.unreachable,
    };
  } else {
    ishaR = sunAngleTime(cfg.isha, jd, lat, 1, transit);
  }

  // High-latitude fallback: when twilight angle is never reached (e.g. summer white nights),
  // use the "one-seventh of the night" rule instead of an out-of-range clamp.
  // (v4.3) nightLength is derived from the RAW day-relative span, so a
  // Maghrib past midnight (>= 24h) yields the true night length instead of a
  // wrapped-negative garbage value; clamped at 0 for the polar day.
  const nightLength = Math.max(0, 24 - (maghribR.time - sunriseR.time));
  const seventh = nightLength / 7;
  const fajr = fajrR.unreachable ? sunriseR.time - seventh : fajrR.time;
  const isha = ishaR.unreachable ? maghribR.time + seventh : ishaR.time;

  return {
    fajr,
    sunrise: sunriseR.time,
    dhuhr,
    asr: asrT.time,
    maghrib: maghribR.time,
    isha,
    // (v4.3) honesty surface for polar latitudes: which entries are
    // fallbacks rather than measured positions. Sunrise/Maghrib/Asr are
    // clamped transits; Fajr/Isha use the one-seventh-night convention.
    unreachable: Object.freeze({
      fajr: fajrR.unreachable,
      sunrise: sunriseR.unreachable,
      asr: asrT.unreachable,
      maghrib: maghribR.unreachable,
      isha: ishaR.unreachable,
    }),
  };
}

/** Convert decimal hours -> { h, m } for display. Normalizes day-relative
 *  values (may be negative or >= 24) into the 0–24 clock. */
export function hoursToClock(decimalHours) {
  const total = Math.round(decimalHours * 60);
  let h = Math.floor(total / 60) % 24;
  if (h < 0) h += 24; // (v4.3) raw hours can be negative (twilight before midnight)
  const m = ((total % 60) + 60) % 60;
  return { h, m };
}

/**
 * Format decimal hours as a clock string. In 12-hour mode the AM/PM
 * marker follows the app language ("ص/م" in Arabic) — the marker is part
 * of the localized string table, passed in by the caller as 'am'/'pm'.
 * Day-relative inputs (negative or >= 24) are normalized for display.
 */
export function formatClock(decimalHours, hour12 = true, amPm = null) {
  const { h, m } = hoursToClock(decimalHours);
  const mm = String(m).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${mm}`;
  const isPM = h >= 12;
  const period = amPm ? (isPM ? amPm.pm : amPm.am) : isPM ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}

/**
 * Find the next upcoming prayer name + its day-relative hours, given the
 * times computed for NOW'S calendar date (see the file header: comparing
 * hours from any other date is a caller bug, not handled here).
 * The returned `hours` may be >= 24 (the event falls after midnight) —
 * countdown arithmetic `(hours - nowHours + 24) % 24` keeps working.
 */
export function nextPrayer(times, now = new Date()) {
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  for (const name of order) {
    if (Number.isFinite(times[name]) && times[name] > nowHours) {
      return { name, hours: times[name] };
    }
  }
  return { name: 'fajr', hours: times.fajr, tomorrow: true };
}

/** Convert day-relative decimal hours into a concrete Date. The minutes are
 *  applied from midnight of `baseDate` so the Date rolls across day
 *  boundaries in either direction — a Maghrib of 24.07h (00:04 the NEXT
 *  calendar day) used to collapse onto the same day and schedule alerts
 *  24 hours early. */
export function decimalHoursToDate(baseDate, decimalHours) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(Math.round(decimalHours * 60));
  return d;
}
