/**
 * statistics.js
 * Pure read-side helpers that derive views over state.statistics for the UI.
 * Writes happen only through state actions (STATISTICS_RECORD) dispatched by
 * the module that actually recorded the recitation (tasbih.js / renderer.js).
 */

import { dateKey, addDays } from '../core/utils.js';

/** Build a 7-day window ending today: [{ key, date, count }] */
export function weekWindow(statistics, days = 7) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    const key = dateKey(d);
    out.push({ key, date: d, count: statistics.dailyHistory[key]?.recitations || 0 });
  }
  return out;
}

/** Build a full calendar-month heatmap grid: [{ key, date, count, inMonth }] */
export function monthWindow(statistics, refDate = new Date()) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month, day);
    const key = dateKey(d);
    cells.push({
      key,
      date: d,
      count: statistics.dailyHistory[key]?.recitations || 0,
      inMonth: true,
    });
  }
  return cells;
}

/** Sum of recitations in the last N days (rolling window, inclusive of today). */
export function totalInLastDays(statistics, days) {
  let sum = 0;
  const today = new Date();
  for (let i = 0; i < days; i += 1) {
    const key = dateKey(addDays(today, -i));
    sum += statistics.dailyHistory[key]?.recitations || 0;
  }
  return sum;
}

/** Reading seconds banked in the last N days (the reading timer's key). */
export function readingInLastDays(statistics, days) {
  let sum = 0;
  const today = new Date();
  for (let i = 0; i < days; i += 1) {
    const key = dateKey(addDays(today, -i));
    sum += statistics.dailyHistory[key]?.readingSec || 0;
  }
  return sum;
}

/** Active days (any recitations OR reading) inside the last N days. */
export function activeDaysInLastDays(statistics, days) {
  let n = 0;
  const today = new Date();
  for (let i = 0; i < days; i += 1) {
    const key = dateKey(addDays(today, -i));
    const d = statistics.dailyHistory[key];
    if ((d?.recitations || 0) > 0 || (d?.readingSec || 0) > 0) n += 1;
  }
  return n;
}

/**
 * Average recitations per day over the last N days, one decimal — the honest
 * denominator is the full window (not just active days), otherwise a single
 * busy day would masquerade as a towering daily average.
 */
export function averagePerDay(statistics, days) {
  return Math.round((totalInLastDays(statistics, days) / Math.max(1, days)) * 10) / 10;
}

/** How many distinct days have any recorded activity, all time — dhikr
 *  counts AND Quran reading both qualify (a read-only day is active). */
export function activeDays(statistics) {
  return Object.values(statistics.dailyHistory || {}).filter(
    (d) => (d.recitations || 0) > 0 || (d.readingSec || 0) > 0
  ).length;
}

/**
 * Weekly share text: recitations, active days, reading minutes, streak —
 * plain localized lines (labels passed in), shared via Web Share with a
 * clipboard fallback. Pure string building, no DOM.
 */
export function buildWeekSummary(
  { recitations = 0, activeDays = 0, readingMin = 0, streak = 0 } = {},
  labels = {}
) {
  const L = (k, d) => (typeof labels[k] === 'string' && labels[k] ? labels[k] : d);
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
  return [
    L('title', 'My week'),
    `${L('recitations', 'Dhikr')}: ${n(recitations)}`,
    `${L('days', 'Active days')}: ${n(activeDays)}/7`,
    `${L('reading', 'Quran reading')}: ${n(readingMin)} min`,
    `${L('streak', 'Streak')}: ${n(streak)}`,
  ].join('\n');
}

/** Total recitations within the calendar month of refDate (0 for future months). */
export function monthTotal(statistics, refDate) {
  const prefix = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  let sum = 0;
  for (const [key, day] of Object.entries(statistics.dailyHistory || {})) {
    if (key.startsWith(prefix)) sum += day.recitations || 0;
  }
  return sum;
}

/** Return the top N most-recited category ids with counts, sorted descending. */
export function mostReadCategories(statistics, limit = 5) {
  return Object.entries(statistics.favoriteCategories || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([categoryId, count]) => ({ categoryId, count }));
}

/** A 0..4 intensity bucket for heatmap coloring, relative to the max in the given set. */
export function intensityBucket(count, max) {
  if (!count) return 0;
  if (!max) return 1;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
