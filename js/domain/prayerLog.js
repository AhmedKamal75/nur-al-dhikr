/**
 * prayerLog.js
 * Pure helpers for the five-daily-prayers log shown in the Prayer view.
 *
 * Storage deliberately REUSES state.dailyChecklist (the daily-habit map)
 * with a tri-state value for each prayer key:
 *     undefined/false → not logged
 *     'prayed'        → prayed (alone / any valid way)
 *     'jamaah'        → prayed in congregation
 * One source of truth, zero migration: the Checklist view keeps working
 * (anything truthy reads as checked there) and every logged prayer rides
 * the existing backup/restore pipeline for free. Legacy boolean `true`
 * values (logged by the Checklist before v3.0) normalize to 'prayed'.
 *
 * No DOM, no state.js imports — trivially unit-testable, mirroring
 * checklist.js / ramadan.js.
 */

import { dateKey, addDays } from '../core/utils.js';

/** The five fard prayers, in day order (sunrise is deliberately excluded). */
export const PRAYER_KEYS = Object.freeze(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

/** Cycle: unset → prayed → congregation → unset. */
export function cycleState(value) {
  if (value === 'jamaah') return null;
  if (value === 'prayed' || value === true) return 'jamaah';
  return 'prayed';
}

/** Normalize any stored value to null | 'prayed' | 'jamaah'. */
export function prayerState(dayEntry, key) {
  const v = dayEntry?.[key];
  if (v === 'jamaah') return 'jamaah';
  if (v) return 'prayed';
  return null;
}

/** How many of the five prayers are logged on a day entry (0..5). */
export function loggedCount(dayEntry) {
  if (!dayEntry || typeof dayEntry !== 'object') return 0;
  let n = 0;
  for (const k of PRAYER_KEYS) {
    if (prayerState(dayEntry, k)) n += 1;
  }
  return n;
}

/** All five prayers logged (prayed or in congregation). */
export function dayComplete(dayEntry) {
  return PRAYER_KEYS.every((k) => prayerState(dayEntry, k));
}

/**
 * Consecutive-day streak of fully-logged five-prayer days, walking backward
 * from today. An incomplete TODAY never breaks a streak that was unbroken
 * through yesterday (the day isn't over yet) — same convention as the
 * checklist and recitation streaks.
 */
export function prayerStreak(dailyChecklist, today = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  let streak = 0;
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!dayComplete(map[dateKey(cursor)])) {
    cursor = addDays(cursor, -1);
  }
  while (true) {
    if (dayComplete(map[dateKey(cursor)])) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

/**
 * Last `days` days (oldest first) as
 * { dateKey, date, count, total, complete, states } — the week strip in the
 * Prayer view. `states` maps each prayer key to null|'prayed'|'jamaah'.
 */
export function prayerWeek(dailyChecklist, days = 7, today = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    const key = dateKey(d);
    const entry = map[key];
    const states = {};
    for (const k of PRAYER_KEYS) states[k] = prayerState(entry, k);
    const count = PRAYER_KEYS.filter((k) => states[k]).length;
    out.push({
      dateKey: key,
      date: d,
      count,
      total: PRAYER_KEYS.length,
      complete: count === PRAYER_KEYS.length,
      states,
    });
  }
  return out;
}

/** Total prayers logged in the calendar month of refDate. */
export function prayerMonthCount(dailyChecklist, refDate = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const prefix = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  let n = 0;
  for (const [key, entry] of Object.entries(map)) {
    if (typeof key === 'string' && key.startsWith(prefix)) n += loggedCount(entry);
  }
  return n;
}
