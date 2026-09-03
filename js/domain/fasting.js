/**
 * fasting.js
 * Voluntary (sunnah) fasting tracker + reminder logic, v3.18. Pure and
 * DOM-free. Four categories the TODO named: Mondays & Thursdays, the White
 * Days (13th/14th/15th of every Hijri month), Ashura (10 Muharram), and
 * Arafah (9 Dhul-Hijjah, for those not at Hajj).
 *
 * STORAGE: voluntary fasts live in the SAME state.ramadanLog map the
 * Ramadan tracker already uses ({ 'hijriYear-month': { day: true } }) —
 * one fasting log, not a parallel system, exactly as the TODO demands.
 * Ramadan fasts only ever occupy the `-9` keys (the Ramadan tracker's own
 * key); voluntary days only ever occupy other months, so the two readers
 * never collide and neither ever miscounts the other.
 *
 * Hijri conversion rides on calendar.js's civil tabular algorithm — dates
 * can differ ±1–2 days from local moon sighting, and the UI says so.
 */

import { toHijri, toGregorian } from './calendar.js';
import { dateKey } from '../core/utils.js';

export const FASTING_CATEGORIES = ['monThu', 'whiteDays', 'ashura', 'arafah'];

export const RAMADAN_MONTH = 9; // voluntary days never land in Ramadan's key
export const ARAFAH_MONTH = 12;
export const ARAFAH_DAY = 9;
export const ASHURA_MONTH = 1;
export const ASHURA_DAY = 10;
export const WHITE_DAYS = [13, 14, 15];

/** How far ahead the "next fasting days" scan looks, in days.
 *  (v4.3) 60 days could not reach the NEXT Ashura/Arafah for most of the
 *  year, so the calendar panel honestly said "none upcoming" while a
 *  fast the person had enabled was in fact months away. 400 days always
 *  spans the next occurrence of every annual category (Hijri year ≈ 354d). */
export const FASTING_HORIZON_DAYS = 400;

/** Cycle of offered day-before reminder times (decimal-free HH:MM). */
export const REMIND_TIMES = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

export function defaultFastingPrefs() {
  return {
    remindTime: '18:00',
    monThu: { enabled: false, remind: false },
    whiteDays: { enabled: false, remind: false },
    ashura: { enabled: false, remind: false },
    arafah: { enabled: false, remind: false },
  };
}

/** Defensively coerce restored/imported prefs; junk degrades to defaults. */
export function sanitizeFastingPrefs(raw) {
  const d = defaultFastingPrefs();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const out = { ...d };
  for (const cat of FASTING_CATEGORIES) {
    const c = raw[cat];
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      out[cat] = { enabled: c.enabled === true, remind: c.remind === true };
    }
  }
  // (review v3.21): membership, not just shape — the cycle chip only offers
  // REMIND_TIMES, so a hand-edited backup with '03:45' used to display an
  // off-cycle time and silently jump on the first tap. Safe wrap already
  // recovers via nextRemindTime, but restore now snaps to the offered set.
  out.remindTime = REMIND_TIMES.includes(raw.remindTime) ? raw.remindTime : d.remindTime;
  return out;
}

export function nextRemindTime(time) {
  const i = REMIND_TIMES.indexOf(time);
  return REMIND_TIMES[(i + 1) % REMIND_TIMES.length];
}

/** Which categories does THIS day match (enabled or not)? `date` drives the
 *  weekday check; `hijri` the month/day checks. Both computed for the same
 *  day by the caller (toHijri(date)) — or omit hijri to derive it. */
export function fastingCategoriesForDate(hijri, date = new Date()) {
  const h = hijri ?? toHijri(date);
  const out = [];
  const dow = date.getDay();
  if (dow === 1 || dow === 4) out.push('monThu');
  if (WHITE_DAYS.includes(h.day)) out.push('whiteDays');
  if (h.month === ASHURA_MONTH && h.day === ASHURA_DAY) out.push('ashura');
  if (h.month === ARAFAH_MONTH && h.day === ARAFAH_DAY) out.push('arafah');
  return out;
}

/** Categories this day matches AND the person follows (enabled). */
export function activeFastingCategories(prefs, hijri, date = new Date()) {
  return fastingCategoriesForDate(hijri, date).filter((c) => prefs?.[c]?.enabled === true);
}

/** Categories to remind about for a given day: matching AND enabled AND
 *  reminder-armed. Used by the scheduler for the day-before notification. */
export function remindCategoriesFor(prefs, hijri, date = new Date()) {
  return fastingCategoriesForDate(hijri, date).filter(
    (c) => prefs?.[c]?.enabled === true && prefs?.[c]?.remind === true
  );
}

/**
 * The next fasting days for the enabled categories, scanning forward from
 * `from` (inclusive — today counts). Returns at most `limit` entries of
 * { date, key, hijri, categories } sorted by date. Disabled categories
 * never appear; a day with several matching categories lists them all.
 */
export function upcomingFastingDays(
  prefs,
  from = new Date(),
  limit = 3,
  horizon = FASTING_HORIZON_DAYS
) {
  const out = [];
  const anyEnabled = FASTING_CATEGORIES.some((c) => prefs?.[c]?.enabled === true);
  if (!anyEnabled) return out;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < horizon && out.length < limit; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const hijri = toHijri(date);
    const cats = activeFastingCategories(prefs, hijri, date);
    if (cats.length) out.push({ date, key: dateKey(date), hijri, categories: cats });
  }
  return out;
}

/**
 * Voluntary fast count from the shared fasting log: every kept day whose
 * month key is NOT Ramadan's. Shape: { '1447-10': { '3': true }, '1447-9': {...} }.
 * Returns { total, thisHijriYear } — Ramadan days are never counted here
 * (the Ramadan tracker owns them).
 */
export function voluntaryFastCount(ramadanLog, hijriYear) {
  const log = ramadanLog && typeof ramadanLog === 'object' ? ramadanLog : {};
  let total = 0;
  let thisYear = 0;
  const yearPrefix = `${Math.floor(Number(hijriYear))}-`;
  for (const [key, days] of Object.entries(log)) {
    if (!days || typeof days !== 'object' || Array.isArray(days)) continue;
    const m = /^(\d{1,4})-(\d{1,2})$/.exec(key);
    if (!m) continue;
    const hm = Number(m[2]);
    if (hm === RAMADAN_MONTH) continue; // the Ramadan tracker's own records
    // (v3.23.0) day numbers are validated: a hijri month has 29/30 (max
    // 31) days, so junk restore keys like { 0: true, 33: true } must not
    // inflate the count.
    const count = Object.keys(days).filter((k) => {
      const n = Math.floor(Number(k));
      return days[k] === true && Number.isFinite(n) && n >= 1 && n <= 31;
    }).length;
    total += count;
    if (Number.isFinite(hijriYear) && key.startsWith(yearPrefix)) thisYear += count;
  }
  return { total, thisHijriYear: thisYear };
}

/**
 * Most recent voluntary fasts (newest first), for the history strip.
 * Ramadan keys are excluded — same rule as voluntaryFastCount.
 */
export function recentVoluntaryFasts(ramadanLog, limit = 8, today = new Date()) {
  const log = ramadanLog && typeof ramadanLog === 'object' ? ramadanLog : {};
  const entries = [];
  for (const [key, days] of Object.entries(log)) {
    if (!days || typeof days !== 'object' || Array.isArray(days)) continue;
    const m = /^(\d{1,4})-(\d{1,2})$/.exec(key);
    if (!m || Number(m[2]) === RAMADAN_MONTH) continue;
    for (const [day, v] of Object.entries(days)) {
      if (v !== true) continue;
      const hm = Number(m[2]);
      const hd = Math.floor(Number(day));
      // reconstruct the Gregorian date via the shared tabular calendar
      const g = hijriToGregorianSafe(Number(m[1]), hm, hd);
      entries.push({
        logKey: key,
        day: String(hd),
        hijri: { year: Number(m[1]), month: hm, day: hd },
        date: g,
      });
    }
  }
  return (
    entries
      .filter((e) => e.date)
      .sort((a, b) => b.date - a.date)
      // (v4.3) end of TODAY, not tomorrow: future-dated junk log entries used
      // to render in the "recent" history strip a day before they happened.
      .filter(
        (e) =>
          e.date <= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      )
      .slice(0, limit)
  );
}

function hijriToGregorianSafe(hy, hm, hd) {
  // lazy import avoidance: calendar.js exports toGregorian directly
  try {
    const d = toGregorian(hy, hm, hd);
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}
