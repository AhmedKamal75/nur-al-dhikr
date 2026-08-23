/**
 * ramadan.js
 * Pure helpers for the Ramadan & Fasting Companion. No DOM, no state.js —
 * state.js owns the `ramadanFasting` slice and dispatches; this module only
 * computes derived values from it (and from calendar.js / prayer.js), which
 * keeps it trivially unit-testable.
 *
 * Suhoor ends at Fajr and Iftar begins at Maghrib — this module doesn't
 * duplicate that astronomy, it just asks prayer.js for the same times the
 * Prayer view already shows, then figures out which side of them "now"
 * falls on.
 */

import { toHijri, toGregorian, daysInHijriMonth, isSunnahFastDay } from './calendar.js';
import { calculateTimes, decimalHoursToDate } from './prayer.js';
import { dateKey, addDays } from './utils.js';

export const RAMADAN_HIJRI_MONTH = 9;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Where "now" sits relative to Ramadan: currently in it (with day-of-month
 * and the month's total day count), or not.
 */
export function ramadanStatus(now = new Date()) {
  const hijri = toHijri(now);
  if (hijri.month === RAMADAN_HIJRI_MONTH) {
    return {
      inRamadan: true,
      dayOfRamadan: hijri.day,
      totalDays: daysInHijriMonth(hijri.year, RAMADAN_HIJRI_MONTH),
      hijri,
    };
  }
  return { inRamadan: false, dayOfRamadan: null, totalDays: null, hijri };
}

/**
 * The Gregorian date Ramadan begins — this Ramadan's start if we're
 * currently in it, otherwise the next upcoming one.
 */
export function nextRamadanStart(now = new Date()) {
  const hijri = toHijri(now);
  let start = toGregorian(hijri.year, RAMADAN_HIJRI_MONTH, 1);
  if (hijri.month !== RAMADAN_HIJRI_MONTH && startOfDay(start) < startOfDay(now)) {
    start = toGregorian(hijri.year + 1, RAMADAN_HIJRI_MONTH, 1);
  }
  return start;
}

/** Whole days remaining until the next Ramadan begins (0 = starts today). */
export function daysUntilRamadan(now = new Date()) {
  const start = nextRamadanStart(now);
  return Math.round((startOfDay(start) - startOfDay(now)) / 86400000);
}

/**
 * The fasting-day phase for "now" at a given location: before Fajr
 * (Suhoor window still open), between Fajr and Maghrib (fasting, counting
 * down to Iftar), or after Maghrib (counting down to tomorrow's Suhoor
 * cutoff). Returns null if no location is configured yet — callers should
 * show the same "enable location" prompt the Prayer view uses.
 */
export function fastingCountdown(
  { latitude, longitude, method = 'MWL', asr = 'Standard' } = {},
  now = new Date()
) {
  if (latitude == null || longitude == null) return null;

  const timesFor = (d) =>
    calculateTimes({
      date: d,
      latitude,
      longitude,
      timezoneOffsetHours: -d.getTimezoneOffset() / 60,
      method,
      asr,
    });

  const times = timesFor(now);
  if (!times) return null;
  const suhoorTime = decimalHoursToDate(now, times.fajr);
  const iftarTime = decimalHoursToDate(now, times.maghrib);

  if (now < suhoorTime) {
    return {
      phase: 'before-fajr',
      target: suhoorTime,
      msRemaining: suhoorTime - now,
      suhoorTime,
      iftarTime,
    };
  }
  if (now < iftarTime) {
    return {
      phase: 'fasting',
      target: iftarTime,
      msRemaining: iftarTime - now,
      suhoorTime,
      iftarTime,
    };
  }

  const tomorrow = addDays(now, 1);
  const timesTomorrow = timesFor(tomorrow);
  const nextSuhoorTime = decimalHoursToDate(tomorrow, timesTomorrow.fajr);
  return {
    phase: 'after-maghrib',
    target: nextSuhoorTime,
    msRemaining: nextSuhoorTime - now,
    suhoorTime,
    iftarTime,
    nextSuhoorTime,
  };
}

/** Split a millisecond duration into whole hours + minutes for display. */
export function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
}

/**
 * Consecutive-day fasting streak, walking backward from today. Mirrors
 * checklist.js's checklistStreak: today not yet logged doesn't break a
 * streak that was otherwise unbroken through yesterday.
 */
export function fastingStreak(ramadanFasting, today = new Date()) {
  const map = ramadanFasting && typeof ramadanFasting === 'object' ? ramadanFasting : {};
  const todayKey = dateKey(today);
  let streak = 0;
  let cursor = map[todayKey] ? today : addDays(today, -1);
  while (map[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** How many days of the given Hijri year's Ramadan have been logged as fasted so far. */
export function ramadanFastsLogged(ramadanFasting, hijriYear) {
  const map = ramadanFasting && typeof ramadanFasting === 'object' ? ramadanFasting : {};
  const start = toGregorian(hijriYear, RAMADAN_HIJRI_MONTH, 1);
  const total = daysInHijriMonth(hijriYear, RAMADAN_HIJRI_MONTH);
  let count = 0;
  for (let i = 0; i < total; i += 1) {
    if (map[dateKey(addDays(start, i))]) count += 1;
  }
  return { count, total };
}

/** True if the given date is a recommended voluntary fasting day and it's not Ramadan (Ramadan is already obligatory). */
export function isVoluntaryFastDay(now = new Date()) {
  return !ramadanStatus(now).inRamadan && isSunnahFastDay(now);
}
