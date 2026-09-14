/**
 * core/state/streak.js — shared streak math (reducer + restore).
 *
 * Honest rules (v5.2.45):
 *  - A day is a STREAK DAY when it meets the daily dhikr goal
 *    (recitations >= goal) or carries Qur'an activity (pages/readingSec —
 *    a read-only day is active, the same doctrine as activeDays in
 *    domain/statistics.js and the review's "presence is NOT activity").
 *    Mere presence of an entry (`{ recitations: 0 }`) never counts.
 *  - TODAY is pending: an idle today neither breaks nor inflates the run.
 *    The current-walk anchors on today when it is a streak day, else on
 *    yesterday, else the streak reads 0 — the same convention as
 *    prayerStreak and readingStreak. (The old `|| key === todayKey`
 *    counted an idle today as active, so current could never read 0
 *    mid-day and a run ending yesterday inflated by one all day.)
 *  - STREAK FREEZE: one isolated missed day per run is absorbed — the run
 *    continues past it, but the frozen day adds no length (lengths count
 *    streak days only). A second gap, or two misses in a row, ends the
 *    run. Both walks share the rule so current can never outgrow longest
 *    on frozen ground.
 */

import { dateKey } from '../utils.js';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strict calendar-day key check: rejects junk and rolled dates (Feb 30). */
export function validDayKey(key) {
  if (typeof key !== 'string' || !DAY_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Coerce a daily goal to a sane threshold (>= 1, default 1: any activity). */
export function coerceGoal(goal) {
  const n = Math.floor(Number(goal));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Is this dailyHistory entry a streak day under `goal`? Hostile shapes
 * degrade to false.
 */
export function isStreakDay(entry, goal = 1) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const g = coerceGoal(goal);
  const rec = Number(entry.recitations);
  if (Number.isFinite(rec) && rec >= g) return true;
  for (const k of ['pages', 'readingSec']) {
    const n = Number(entry[k]);
    if (Number.isFinite(n) && n > 0) return true;
  }
  return false;
}

export function computeStreak(stats, todayKey, goal = 1) {
  const g = coerceGoal(goal);
  const raw =
    stats && typeof stats.dailyHistory === 'object' && stats.dailyHistory !== null
      ? stats.dailyHistory
      : {};
  const active = (k) => isStreakDay(raw[k], g);

  // Longest run: streak days only (an idle today can never join it — the
  // v4.3 fix falls out of the filter instead of a special case), one
  // isolated miss per run absorbed.
  const days = Object.keys(raw).filter(validDayKey).filter(active).sort();
  let longest = 0;
  let run = 0;
  let frozen = false;
  let prev = null;
  for (const d of days) {
    // (v4.2) compare calendar days, not clock milliseconds: in DST zones a
    // local midnight is 23h/25h apart twice a year, and the strict
    // `=== 86400000` severed the run — silently resetting an earned
    // longest streak to 1 across every spring-forward/fall-back boundary.
    if (prev !== null && nextDayKey(prev) === d) run += 1;
    else if (prev !== null && !frozen && nextDayKey(nextDayKey(prev)) === d) {
      run += 1; // streak freeze: the missed day adds no length
      frozen = true;
    } else {
      run = 1;
      frozen = false;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  // Current streak: anchor on today when it is a streak day, else on
  // yesterday (today pending), else 0 — then walk back absorbing one
  // isolated miss. Bounded: history is capped at 731 days by restore.
  let cursor = null;
  if (validDayKey(todayKey) && active(todayKey)) cursor = todayKey;
  else if (validDayKey(todayKey) && active(prevDayKey(todayKey))) cursor = prevDayKey(todayKey);
  let current = 0;
  if (cursor !== null) {
    let frozenUsed = false;
    for (let guard = 0; guard < 4000; guard += 1) {
      if (active(cursor)) {
        current += 1;
        cursor = prevDayKey(cursor);
      } else if (!frozenUsed && active(prevDayKey(cursor))) {
        frozenUsed = true; // streak freeze: skip the miss, count nothing
        cursor = prevDayKey(cursor);
      } else break;
    }
  }
  return { currentStreak: current, longestStreak: longest };
}

/** The day after a 'YYYY-MM-DD' key, as a key — DST-proof calendar math. */
function nextDayKey(key) {
  const d = new Date(key + 'T12:00:00'); // noon anchor: never a DST boundary
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

/** The day before a 'YYYY-MM-DD' key — same noon-anchor discipline. */
function prevDayKey(key) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}
