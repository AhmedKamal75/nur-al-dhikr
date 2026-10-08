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
import { t } from '../core/i18n.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const METHODS = Object.freeze({
  MWL: {
    name: 'Muslim World League',
    fajr: 18,
    isha: 17,
    // (v5.17.40) provenance mirrors data/prayer-methods.json `source`.
    // verified:false throughout: SOURCES.md prayer section cites only
    // secondary corroboration, so no method claims official status.
    source: {
      body: 'Muslim World League',
      document: 'Fajr 18°, Isha 17° convention',
      verified: false,
    },
  },
  ISNA: {
    name: 'Islamic Society of North America',
    fajr: 15,
    isha: 15,
    source: {
      body: 'Islamic Society of North America',
      document: 'Fajr 15°, Isha 15° convention',
      verified: false,
    },
  },
  Egyptian: {
    name: 'Egyptian General Authority of Survey',
    fajr: 19.5,
    isha: 17.5,
    source: {
      body: 'Egyptian General Authority of Survey',
      document: 'Fajr 19.5°, Isha 17.5° convention',
      verified: false,
    },
  },
  Karachi: {
    name: 'University of Islamic Sciences, Karachi',
    fajr: 18,
    isha: 18,
    source: {
      body: 'University of Islamic Sciences, Karachi',
      document: 'Fajr 18°, Isha 18° convention',
      verified: false,
    },
  },
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
    source: {
      body: 'Umm al-Qura Calendar, Makkah',
      document: 'Fajr 18.5°; Isha 120 minutes after Maghrib (90 in Ramadan)',
      verified: false,
    },
  },
  // (v4.3) Tehran computes Maghrib at 4.5° below the horizon (its own
  // convention), not the generic 0.833° sunset.
  Tehran: {
    name: 'Institute of Geophysics, University of Tehran',
    fajr: 17.7,
    isha: 14,
    maghribAngle: 4.5,
    source: {
      body: 'Institute of Geophysics, University of Tehran',
      document: 'Fajr 17.7°, Isha 14°, Maghrib 4.5° convention',
      verified: false,
    },
  },
  // The real Moonsighting Committee method uses latitude-dependent angles;
  // this approximation (18°/18°) is what most published tables reduce it
  // to. Labeled honestly so nobody mistakes it for the full rule.
  MoonsightingCommittee: {
    name: 'Moonsighting Committee (18°/18° approx.)',
    fajr: 18,
    isha: 18,
    source: {
      body: 'Moonsighting Committee',
      document: 'Simplified 18°/18° approximation of the full latitude-dependent method',
      verified: false,
    },
  },
});

export const ASR_FACTORS = Object.freeze({ Standard: 1, Hanafi: 2 });

/** Canonical prayer order, sun-up to night. Views render from this
 *  single list instead of pinning their own copy (rule 6). */
export const PRAYER_ORDER = Object.freeze(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);

/** Prayers carrying a manual minute offset (sunrise too — mosques shift it). */
export const OFFSET_PRAYERS = Object.freeze(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);

/**
 * (v5.2.75, UP-06) apply manual minute offsets ({ name: −60..60 }) onto
 * computed times. Out-of-range/hostile entries are ignored, never
 * clamped into surprise — clamping lives in the settings handler and
 * the restore sanitizer. Returns a new object; unreachable rides along.
 */
export function applyPrayerOffsets(times, offsets) {
  if (!times || typeof times !== 'object') return times;
  if (!offsets || typeof offsets !== 'object' || Array.isArray(offsets)) return times;
  let touched = false;
  const out = { ...times };
  for (const name of OFFSET_PRAYERS) {
    const m = Math.floor(Number(offsets[name]));
    if (!Number.isFinite(m) || m === 0) continue;
    if (!Number.isFinite(out[name])) continue;
    if (m < -60 || m > 60) continue;
    out[name] = out[name] + m / 60;
    touched = true;
  }
  return touched ? out : times;
}

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
  offsets = null,
}) {
  if (latitude == null || longitude == null) return null;
  const jd =
    julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) - longitude / (15 * 24);
  const { equation } = sunPosition(jd);
  const transit = 12 + timezoneOffsetHours - longitude / 15 - equation;

  // (v5.17.14) A hostile `method` in a crafted backup used to resolve through
  // the prototype chain: METHODS['__proto__'] is Object.prototype (truthy), so
  // `|| METHODS.MWL` never fired and every angle came back undefined, yielding
  // plausible-looking but meaningless times. Own-property lookup only.
  const cfg = Object.hasOwn(METHODS, method) ? METHODS[method] : METHODS.MWL;
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

  // (v5.2.75, UP-06) manual minute offsets land here — the single choke
  // point, so the timetable, notifications, triggers, fasting and Ramadan
  // all inherit them together. Applied AFTER the polar fallback so an
  // offset shifts the displayed fallback, never the raw astronomy.
  return applyPrayerOffsets(
    {
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
    },
    offsets
  );
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
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  for (const name of PRAYER_ORDER) {
    if (Number.isFinite(times[name]) && times[name] > nowHours) {
      return { name, hours: times[name] };
    }
  }
  return { name: 'fajr', hours: times.fajr, tomorrow: true };
}

/**
 * (v5.17.50) The prayer in effect right now: the most recent of today's
 * computed times at or before now. Before today's Fajr the answer is
 * yesterday's Isha — reported in today's day-relative frame (times.isha
 * minus 24) so countdown arithmetic keeps working. Only the name drives
 * the Home ribbon highlight; hours ride along for symmetry with
 * nextPrayer. Pure — exported for tests.
 */
export function currentPrayer(times, now = new Date()) {
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  let current = null;
  for (const name of PRAYER_ORDER) {
    if (Number.isFinite(times[name]) && times[name] <= nowHours) {
      current = { name, hours: times[name] };
    }
  }
  if (current) return current;
  return { name: 'isha', hours: times.isha - 24, yesterday: true };
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

/**
 * (v5.17.51, merged-plan item 4) the active-method line: one plain-text
 * summary of the calculation prefs the times on screen were computed with —
 * method · region · Asr convention · offsets · source. The prayer hero and
 * the home ribbon both render it; the calc sheet keeps the long explainer.
 *
 * Single source of truth (rule 6): both views call this, so the tree
 * cannot drift from itself. Reuses the existing localized method/region
 * names and the prayer.methodSource (unverified) qualifier — the source
 * body is an institution proper noun rendered verbatim in both languages
 * (the deliberate MEMORY.md §4 exception, as in the calc sheet). The Asr
 * token renders raw ('Standard'/'Hanafi'), exactly as the existing Asr
 * select does — transliterating a school label would invent a translation.
 * Offsets render per prayer with the localized minute unit; all-zero
 * reads as absence via prayer.offsetsNone, never as "+0".
 *
 * Hostile prefs degrade like the engine: unknown method → MWL, unknown
 * Asr → Standard, out-of-range/non-numeric offsets ignored. Pure
 * (prefs/lang → string); t() escapes the interpolated body centrally.
 */
/**
 * Compact method summary for focal prayer surfaces. Keep provenance and
 * adjustment detail out of the next-prayer hero; the full calculation sheet
 * remains the deliberate place for that information.
 */
export function compactPrayerMethodLine(prefs, lang) {
  const p = prefs && typeof prefs === 'object' ? prefs : {};
  const methodId =
    typeof p.method === 'string' && Object.hasOwn(METHODS, p.method) ? p.method : 'MWL';
  const asrId = typeof p.asr === 'string' && Object.hasOwn(ASR_FACTORS, p.asr) ? p.asr : 'Standard';
  const methodKey = `prayer.method.${methodId}`;
  const methodName = t(methodKey, lang) === methodKey ? METHODS[methodId].name : t(methodKey, lang);
  const sourceBody =
    METHODS[methodId]?.source &&
    typeof METHODS[methodId].source.body === 'string' &&
    METHODS[methodId].source.body
      ? METHODS[methodId].source.body
      : '';
  const sourceBit = sourceBody ? t('prayer.methodSource', lang, { body: sourceBody }) : '';
  return [`${methodName} · ${t('prayer.asrMethod', lang)}: ${t(`prayer.asr.${asrId}`, lang)}`, sourceBit]
    .filter(Boolean)
    .join(' · ');
}

export function prayerMethodLine(prefs, lang) {
  const p = prefs && typeof prefs === 'object' ? prefs : {};
  const methodId =
    typeof p.method === 'string' && Object.hasOwn(METHODS, p.method) ? p.method : 'MWL';
  const asrId = typeof p.asr === 'string' && Object.hasOwn(ASR_FACTORS, p.asr) ? p.asr : 'Standard';
  const m = METHODS[methodId];
  const nameKey = `prayer.method.${methodId}`;
  const named = t(nameKey, lang);
  const methodName = named === nameKey ? m.name : named;
  const region = t(`prayer.methodRegion.${methodId}`, lang);
  const offsets =
    p.offsets && typeof p.offsets === 'object' && !Array.isArray(p.offsets) ? p.offsets : {};
  const bits = [];
  for (const name of OFFSET_PRAYERS) {
    const minutes = Math.floor(Number(offsets[name]));
    if (!Number.isFinite(minutes) || minutes === 0 || minutes < -60 || minutes > 60) continue;
    const signed = minutes > 0 ? `+${minutes}` : `${minutes}`;
    bits.push(`${t(`prayer.${name}`, lang)} ${t('units.m', lang, { n: signed })}`);
  }
  const offsetsBit = bits.length
    ? bits.join(lang === 'ar' ? '، ' : ', ')
    : t('prayer.offsetsNone', lang);
  const segments = [methodName, region, `${t('prayer.asrMethod', lang)}: ${asrId}`, offsetsBit];
  const body = m.source && typeof m.source.body === 'string' && m.source.body ? m.source.body : '';
  if (body) segments.push(t('prayer.methodSource', lang, { body }));
  return segments.join(' · ');
}
