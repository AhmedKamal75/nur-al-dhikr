/**
 * ramadan.js
 * Pure Ramadan-companion logic: fasting-window detection, Suhoor/Iftar
 * countdown phases, fasting-day bookkeeping, and next-Ramadan/Eid lookups.
 * No DOM, no store, no network — everything here is trivially testable and
 * consumed by views/ramadan.js and app.js's countdown ticker.
 *
 * Hijri conversion rides on calendar.js's civil tabular algorithm, so all
 * the usual caveats apply: dates can differ ±1–2 days from local moon
 * sighting, and the UI says so.
 */

import { toHijri, toGregorian, daysInHijriMonth } from './calendar.js';

/** Hijri month number of Ramadan (1-indexed, 9). */
export const RAMADAN_MONTH = 9;

/**
 * Ramadan season info for a given day.
 * Returns { inRamadan, hijri } where hijri is the toHijri() result.
 */
export function ramadanInfo(date = new Date()) {
  const hijri = toHijri(date);
  return { inRamadan: hijri.month === RAMADAN_MONTH, hijri };
}

/**
 * Total days in this Ramadan (29 or 30, per the tabular calendar).
 * Only meaningful while in Ramadan.
 */
export function ramadanLength(hijriYear) {
  return daysInHijriMonth(hijriYear, RAMADAN_MONTH);
}

/**
 * The Gregorian date of 1 Ramadan for the *current* Hijri year, even if
 * that's in the past — used to derive "day N of Ramadan" style facts.
 */
export function ramadanStartForHijriYear(hijriYear) {
  return toGregorian(hijriYear, RAMADAN_MONTH, 1);
}

/**
 * Find the next 1 Ramadan strictly after `date` (inclusive of today when
 * today IS 1 Ramadan). Scans the current and following Hijri years, so it
 * works whether Ramadan just ended, is running, or hasn't begun.
 * Returns { hijriYear, startDate, daysUntil }.
 */
export function nextRamadan(date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const thisYear = toHijri(startOfDay).year;

  for (const hy of [thisYear, thisYear + 1, thisYear + 2]) {
    const start = ramadanStartForHijriYear(hy);
    const days = Math.round((start - startOfDay) / 86400000);
    if (days >= 0) return { hijriYear: hy, startDate: start, daysUntil: days };
  }
  // Unreachable, but keep the contract total.
  return {
    hijriYear: thisYear + 3,
    startDate: ramadanStartForHijriYear(thisYear + 3),
    daysUntil: 0,
  };
}

/**
 * Eid al-Fitr = 1 Shawwal. Returns the next occurrence after `date`
 * (if today is Eid, that's today, daysUntil 0).
 */
export function nextEidAlFitr(date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const h = toHijri(startOfDay);
  // Eid candidates: this year, next year (and a safety third).
  const candidates = [];
  // If still before end of Shawwal this hijri year, this year's eid counts.
  candidates.push({ hy: h.year, when: toGregorian(h.year, RAMADAN_MONTH + 1, 1) });
  candidates.push({ hy: h.year + 1, when: toGregorian(h.year + 1, RAMADAN_MONTH + 1, 1) });

  for (const c of candidates) {
    const days = Math.round((c.when - startOfDay) / 86400000);
    if (days >= 0) return { hijriYear: c.hy, startDate: c.when, daysUntil: days };
  }
  return { hijriYear: h.year + 1, startDate: candidates[1].when, daysUntil: 0 };
}

/**
 * Fasting phase relative to today's prayer times.
 * Suhoor ends at Fajr; the fast breaks at Maghrib. Between Maghrib and
 * Fajr the relevant countdown is "time left to eat" (i.e. until Fajr).
 *
 * times: the object returned by prayer.js calculateTimes for TODAY —
 * (v4.3) DAY-RELATIVE decimal hours (may be negative for Fajr or >= 24 for
 * Maghrib/Isha at high latitudes). Comparing them directly against
 * nowHours-since-midnight is exactly right: a Maghrib of 24.06h keeps the
 * "fasting" verdict alive at 23:30, where the old wrapped clock value
 * (00:04) used to flip the phase to "night" mid-fast. tomorrowFajr is
 * tomorrow's own hours (0–24ish, may numerically be smaller than now).
 *
 * Returns { phase: 'fasting' | 'night', targetName, targetHours, targetLabelKey }
 *  - fasting: countdown to Maghrib (Iftar)
 *  - night: countdown to tomorrow's Fajr (Suhoor end)
 *
 * Known imprecision (documented, accepted): between midnight and a
 * post-midnight Maghrib of YESTERDAY's times, the caller has already
 * recomputed for the new day, so the final minutes of a wrapped fast show
 * the suhoor countdown up to ~7 minutes early at extreme latitudes.
 */
export function fastPhase(now, times, tomorrowFajr) {
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const maghrib = times.maghrib;
  const fajr = times.fajr;

  if (nowHours >= fajr && nowHours < maghrib) {
    return {
      phase: 'fasting',
      targetName: 'maghrib',
      targetHours: maghrib,
      targetLabelKey: 'ramadan.untilIftar',
    };
  }
  // Night = [maghrib → midnight → fajr). Two distinct stretches:
  //  - evening (maghrib → midnight): target is TOMORROW's fajr, which as a
  //    decimal hour is numerically smaller than now (e.g. 5.05 < 20.5) —
  //    the countdown wraps past midnight (+24h) at the caller.
  //  - post-midnight (00:00 → fajr): target is TODAY's fajr, already ahead.
  let target;
  if (nowHours < fajr) {
    target = fajr;
  } else {
    target = tomorrowFajr != null && Number.isFinite(tomorrowFajr) ? tomorrowFajr : fajr;
  }
  return {
    phase: 'night',
    targetName: 'fajr',
    targetHours: target,
    targetLabelKey: 'ramadan.untilSuhoor',
  };
}

/** Format milliseconds of remaining time as "H:MM:SS" (or "M:SS" under an hour). */
export function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Laylat al-Qadr hint: the last ten nights of Ramadan, with the odd ones
 * (21, 23, 25, 27, 29) traditionally highlighted. Returns null outside
 * Ramadan, otherwise { dayOfRamadan, isOdd, inLastTen, isLikelyQadrNight }.
 */
export function qadrNightInfo(hijriDay) {
  const day = hijriDay;
  const inLastTen = day >= 21;
  const isOdd = day % 2 === 1;
  return {
    dayOfRamadan: day,
    isOdd,
    inLastTen,
    isLikelyQadrNight: inLastTen && isOdd,
  };
}

/**
 * (v4.3) Which Ramadan NIGHT is "tonight" for the Qadr banner?
 * The Islamic night begins at Maghrib, so the night of the 27th runs from
 * Maghrib of day 26 to Fajr of day 27 — the banner used to key purely on
 * the calendar day number, announcing "Qadr tonight" all through day 27's
 * daylight (after the odd night had already ended) and showing only the
 * generic banner through the real 26th-evening stretch.
 *
 * Rule (day-relative prayer hours; see prayer.js):
 *  - nowHours < fajr  → the ongoing night belongs to hijri.day (the
 *    calendar day already rolled at midnight)
 *  - otherwise        → the UPCOMING night, starting at today's Maghrib,
 *    belongs to hijri.day + 1
 * Returns null past the last day of the month (Eid eve — no Ramadan night).
 */
export function qadrNightFor(hijri, times, nowHours, totalDays) {
  if (!hijri || !Number.isFinite(nowHours)) return null;
  const fajrH = times && Number.isFinite(times.fajr) ? times.fajr : null;
  const nightDay = fajrH != null && nowHours < fajrH ? hijri.day : hijri.day + 1;
  const total = Number.isFinite(totalDays) ? totalDays : 30;
  if (nightDay > total) return null;
  return qadrNightInfo(nightDay);
}

/** Storage key for a Ramadan fast log entry: '1447-9' (hijriYear-month). */
export function ramadanLogKey(hijriYear) {
  return `${hijriYear}-${RAMADAN_MONTH}`;
}

/**
 * Ramadan alert clock-times for the notifications scheduler.
 * suhoor = Fajr minus the offset in minutes (floor to the whole minute);
 * iftar = Maghrib exactly. Both returned as decimal hours. The scheduler
 * compares them against the wall clock, so any midnight wrap is handled by
 * simply never producing a negative value (fajr - offset <= 0 degenerates
 * to 0.0 = midnight, the best available fallback for extreme latitudes).
 */
export function ramadanAlertTimes(times, suhoorOffsetMin = 30) {
  const offset = Number.isFinite(suhoorOffsetMin) && suhoorOffsetMin > 0 ? suhoorOffsetMin : 30;
  const suhoor = Math.max(0, Math.floor((times.fajr - offset / 60) * 60) / 60);
  return { suhoor, iftar: times.maghrib };
}

/**
 * How many fasts were marked kept in a given log object for a hijri year.
 * log shape: state.ramadanLog = { '1447-9': { '1': true, '3': true, ... } }
 */
export function keptFastCount(ramadanLog, hijriYear) {
  const entry = ramadanLog?.[ramadanLogKey(hijriYear)] || {};
  return Object.values(entry).filter(Boolean).length;
}

/**
 * Serialize the 29/30 fasting-day tracker cells for the current Ramadan.
 * Returns an array of { day, kept, isToday } for easy template rendering.
 */
export function fastTrackerDays(ramadanLog, hijriYear, todayHijriDay, totalDays) {
  const entry = ramadanLog?.[ramadanLogKey(hijriYear)] || {};
  const days = [];
  for (let d = 1; d <= totalDays; d += 1) {
    days.push({ day: d, kept: !!entry[String(d)], isToday: d === todayHijriDay });
  }
  return days;
}
