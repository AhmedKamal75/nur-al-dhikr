/**
 * core/state/streak.js — shared streak math (reducer + restore).
 */

import { dateKey } from '../utils.js';

export function computeStreak(stats, todayKey) {
  // (v4.3) todayKey only joins the LONGEST-run walk when the day actually
  // has activity: a 3-day run ending yesterday used to report 4 for the
  // rest of today (idle today was unconditionally appended), inflating the
  // Year-in-Review headline until midnight.
  const dates = Object.keys(stats.dailyHistory)
    .filter((k) => k !== todayKey)
    .sort();
  if (stats.dailyHistory[todayKey]) dates.push(todayKey);
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of dates) {
    // (v4.2) compare calendar days, not clock milliseconds: in DST zones a
    // local midnight is 23h/25h apart twice a year, and the strict
    // `=== 86400000` severed the run — silently resetting an earned
    // longest streak to 1 across every spring-forward/fall-back boundary.
    if (prev !== null && nextDayKey(prev) === d) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  // current streak: walk backwards from today
  let current = 0;
  const cursor = new Date(todayKey + 'T00:00:00');
  while (true) {
    const key = dateKey(cursor);
    if (stats.dailyHistory[key] || key === todayKey) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return { currentStreak: current, longestStreak: longest };
}

/** The day after a 'YYYY-MM-DD' key, as a key — DST-proof calendar math. */
function nextDayKey(key) {
  const d = new Date(key + 'T12:00:00'); // noon anchor: never a DST boundary
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}
