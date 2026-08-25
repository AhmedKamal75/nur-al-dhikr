/**
 * prayer.js
 * Fully offline prayer time calculation from latitude/longitude/date using
 * standard low-precision solar position astronomy (no network calls, no UI).
 *
 * Fajr/Isha angles and Maghrib/Isha offsets follow the commonly published
 * conventions used by most calculation authorities. Results are estimates —
 * always corroborate against a local moon-sighting authority for worship.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const METHODS = Object.freeze({
  MWL: { name: 'Muslim World League', fajr: 18, isha: 17 },
  ISNA: { name: 'Islamic Society of North America', fajr: 15, isha: 15 },
  Egyptian: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  Karachi: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  UmmAlQura: { name: 'Umm al-Qura, Makkah', fajr: 18.5, isha: null, ishaMinutesAfterMaghrib: 90 },
  Tehran: { name: 'Institute of Geophysics, Tehran', fajr: 17.7, isha: 14 },
  MoonsightingCommittee: { name: 'Moonsighting Committee', fajr: 18, isha: 18 }
});

export const ASR_FACTORS = Object.freeze({ Standard: 1, Hanafi: 2 });

function sin(d) { return Math.sin(d * D2R); }
function cos(d) { return Math.cos(d * D2R); }
function tan(d) { return Math.tan(d * D2R); }
function arcsin(x) { return Math.asin(x) * R2D; }
function arccos(x) { return Math.acos(x) * R2D; }
function arctan2(y, x) { return Math.atan2(y, x) * R2D; }
function arccot(x) { return arctan2(1, x); }
function fixHour(h) { const x = h % 24; return x < 0 ? x + 24 : x; }

/** Julian Day Number at Greenwich noon for a given Gregorian date. */
function julianDay(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function fixMod(val, mod) { const x = val % mod; return x < 0 ? x + mod : x; }
function fixHour360(v) { return fixMod(v, 360); }
function fixHourBase(h) { return fixHour(h); }

/** Sun's declination (deg) and the equation of time (hours) for a given Julian day. */
function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixHour360(357.529 + 0.98560028 * D);
  const q = fixHour360(280.459 + 0.98564736 * D);
  const L = fixHour360(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = fixHourBase(arctan2(cos(e) * sin(L), cos(L)) / 15);
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

/**
 * Compute prayer times for a given date/location/settings.
 * @returns {{fajr,sunrise,dhuhr,asr,maghrib,isha}} decimal hours in *local solar* time (needs timezone correction)
 */
export function calculateTimes({ date = new Date(), latitude, longitude, timezoneOffsetHours, method = 'MWL', asr = 'Standard' }) {
  if (latitude == null || longitude == null) return null;
  const jd = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) - longitude / (15 * 24);
  const { equation } = sunPosition(jd);
  const transit = 12 + timezoneOffsetHours - longitude / 15 - equation;

  const cfg = METHODS[method] || METHODS.MWL;
  const lat = latitude;

  const fajrR = sunAngleTime(cfg.fajr, jd, lat, -1, transit);
  const sunriseR = sunAngleTime(0.833, jd, lat, -1, transit);
  const dhuhr = transit + 1 / 120; // small correction, conventional
  const asrT = asrTime(ASR_FACTORS[asr] ?? 1, jd, lat, transit);
  const maghribR = sunAngleTime(0.833, jd, lat, 1, transit);
  let ishaR;
  if (cfg.isha == null && cfg.ishaMinutesAfterMaghrib) {
    ishaR = { time: maghribR.time + cfg.ishaMinutesAfterMaghrib / 60, unreachable: maghribR.unreachable };
  } else {
    ishaR = sunAngleTime(cfg.isha, jd, lat, 1, transit);
  }

  // High-latitude fallback: when twilight angle is never reached (e.g. summer white nights),
  // use the "one-seventh of the night" rule instead of an out-of-range clamp.
  const nightLength = 24 - (maghribR.time - sunriseR.time);
  const seventh = nightLength / 7;
  const fajr = fajrR.unreachable ? sunriseR.time - seventh : fajrR.time;
  const isha = ishaR.unreachable ? maghribR.time + seventh : ishaR.time;

  return {
    fajr: fixHourBase(fajr),
    sunrise: fixHourBase(sunriseR.time),
    dhuhr: fixHourBase(dhuhr),
    asr: fixHourBase(asrT.time),
    maghrib: fixHourBase(maghribR.time),
    isha: fixHourBase(isha)
  };
}

/** Convert decimal hours -> { h, m } for display. */
export function hoursToClock(decimalHours) {
  const total = Math.round(decimalHours * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return { h, m };
}

export function formatClock(decimalHours, hour12 = true) {
  const { h, m } = hoursToClock(decimalHours);
  const mm = String(m).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${mm}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}

/** Find the next upcoming prayer name + a Date object for it, given today's computed times. */
export function nextPrayer(times, now = new Date()) {
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  for (const name of order) {
    if (times[name] > nowHours) {
      return { name, hours: times[name] };
    }
  }
  return { name: 'fajr', hours: times.fajr, tomorrow: true };
}

export function decimalHoursToDate(baseDate, decimalHours) {
  const d = new Date(baseDate);
  const { h, m } = hoursToClock(decimalHours);
  d.setHours(h, m, 0, 0);
  return d;
}
