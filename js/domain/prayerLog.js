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

/**
 * (v5.10.1) Longest-ever run of fully-logged five-prayer days. Scans the
 * sorted calendar keys (capped — a hostile blob with 10k keys costs one
 * bounded pass, never a hang); gaps and partial days reset the run.
 */
export function prayerBestStreak(dailyChecklist) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const keys = Object.keys(map)
    .filter((k) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
      return (
        m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= 31
      );
    })
    .sort()
    .slice(-3700);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const d = new Date(`${k}T12:00:00`);
    const consecutive = prev != null && d - prev === 86400000;
    if (dayComplete(map[k]) && (prev == null || consecutive)) run += 1;
    else if (dayComplete(map[k]))
      run = 1; // complete day after a gap restarts
    else run = 0; // partial day resets
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

/**
 * (v5.10.1) 30-day insights for the Prayer view: completion rate, jamaah
 * share, per-prayer miss counts (most-missed first), and the best streak.
 * All counts derive from the same tri-state storage — no new state.
 */
export function prayerInsights(dailyChecklist, days = 30, today = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const base = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  const missedByPrayer = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  let logged = 0;
  let jamaah = 0;
  let daysSeen = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dateKey(addDays(base, -i));
    const entry = map[key];
    if (!entry || typeof entry !== 'object') continue;
    daysSeen += 1;
    for (const k of PRAYER_KEYS) {
      const st = prayerState(entry, k);
      if (st) {
        logged += 1;
        if (st === 'jamaah') jamaah += 1;
      } else {
        missedByPrayer[k] += 1;
      }
    }
  }
  const total = daysSeen * PRAYER_KEYS.length;
  const mostMissed = [...PRAYER_KEYS].sort((a, b) => missedByPrayer[b] - missedByPrayer[a])[0];
  return {
    days: daysSeen,
    logged,
    total,
    rate: total ? logged / total : 0,
    jamaah,
    jamaahRate: logged ? jamaah / logged : 0,
    missedByPrayer,
    mostMissed: daysSeen ? mostMissed : null,
    bestStreak: prayerBestStreak(map),
  };
}
