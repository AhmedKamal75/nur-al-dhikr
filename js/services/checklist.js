/**
 * checklist.js
 * Pure helpers for the daily habit checklist (five prayers + morning/evening
 * adhkar + a Qur'an check-in). No DOM, no state.js — state.js owns the
 * `dailyChecklist` slice and dispatches; this module only computes derived
 * numbers from it, which keeps it trivially unit-testable.
 */

import { CHECKLIST_ITEMS } from '../core/config.js';
import { dateKey, addDays } from '../core/utils.js';

const TOTAL_ITEMS = CHECKLIST_ITEMS.length;

/** How many of today's checklist items are checked (0..CHECKLIST_ITEMS.length). */
export function completedCount(dayEntry) {
  if (!dayEntry || typeof dayEntry !== 'object') return 0;
  return CHECKLIST_ITEMS.reduce((n, item) => n + (dayEntry[item.id] ? 1 : 0), 0);
}

export function isDayComplete(dayEntry) {
  return completedCount(dayEntry) === TOTAL_ITEMS;
}

/**
 * Consecutive-day streak of *fully completed* checklists, walking backward
 * from today. A day only counts once every item on it is checked; today
 * itself is allowed to be incomplete-so-far without breaking a streak that
 * was otherwise unbroken through yesterday (so the badge doesn't flicker
 * off at midnight before the person has had a chance to check anything).
 */
export function checklistStreak(dailyChecklist, today = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const todayKey = dateKey(today);
  let streak = 0;
  let cursor = today;

  // If today isn't complete yet, don't count it, but don't break the streak
  // for it either — start counting from yesterday instead.
  if (!isDayComplete(map[todayKey])) {
    cursor = addDays(today, -1);
  }

  while (true) {
    const key = dateKey(cursor);
    if (isDayComplete(map[key])) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Last `days` days (oldest first) as { dateKey, count, total, complete } —
 * used for the small history strip on the checklist screen.
 */
export function recentHistory(dailyChecklist, days = 7, today = new Date()) {
  const map = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    const key = dateKey(d);
    const count = completedCount(map[key]);
    out.push({ dateKey: key, count, total: TOTAL_ITEMS, complete: count === TOTAL_ITEMS });
  }
  return out;
}
