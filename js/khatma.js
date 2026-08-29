/**
 * khatma.js
 * Pure math for the Khatma (full-Qur'an reading) planner. No DOM, no state
 * imports — data comes in as plain arguments so every rule below is
 * trivially unit-testable (same philosophy as mushaf.js / zakat.js).
 *
 * A plan is { startDate: 'YYYY-MM-DD', targetDate: 'YYYY-MM-DD' | null,
 * dailyTarget: number | null } — at least one of targetDate / dailyTarget
 * is required (enforced by the reducer and the sanitize pass). All day
 * counts are calendar days, inclusive of both endpoints, because that is
 * how a person counts a reading plan ("a 30-day khatma").
 */

import { MUSHAF_PAGE_COUNT } from './config.js';
import { toHijri, toGregorian } from './calendar.js';

/** Parse a 'YYYY-MM-DD' string to a local Date at midnight. Returns null when malformed. */
function parseISO(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole calendar days in [fromISO, toISO], both endpoints inclusive. Negative → 0. */
export function inclusiveDays(fromISO, toISO) {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);
  if (!from || !to) return 0;
  const days = Math.round((to - from) / 86400000) + 1;
  return days > 0 ? days : 0;
}

/** ISO 'YYYY-MM-DD' for a Date (local). */
function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** ISO date N days after a Date. */
function plusDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  return isoOf(d);
}

/** Daily page target that finishes the mushaf between today and targetISO (inclusive). */
export function suggestDailyTarget(targetISO, today = new Date()) {
  const days = inclusiveDays(isoOf(today), targetISO);
  if (!days) return null;
  return Math.ceil(MUSHAF_PAGE_COUNT / days);
}

/**
 * Compute the full status of a khatma for rendering.
 *
 * @param {object} params
 * @param {object} params.pagesRead   the mushafPagesRead map ({ pageKey: true })
 * @param {object|null} params.plan   the khatma plan (see file header)
 * @param {Date} [params.today]       clock injection for tests
 * @returns {object} status described below; every field is null (not
 *          undefined) when it doesn't apply, so templates can rely on it.
 */
export function planStatus({ pagesRead, plan, today = new Date() }) {
  const read = pagesRead && typeof pagesRead === 'object' ? Object.keys(pagesRead).length : 0;
  const remaining = Math.max(0, MUSHAF_PAGE_COUNT - read);
  const pct = Math.min(100, Math.round((read / MUSHAF_PAGE_COUNT) * 100));
  const complete = read >= MUSHAF_PAGE_COUNT;

  const base = { read, total: MUSHAF_PAGE_COUNT, remaining, pct, complete };

  const startDate = parseISO(plan?.startDate);
  if (!startDate || (!plan.targetDate && !plan.dailyTarget)) {
    return {
      ...base,
      planActive: false,
      daysElapsed: null,
      daysRemaining: null,
      totalDays: null,
      requiredPerDay: null,
      pace: null,
      projectedFinishISO: null,
      onTrack: null,
      todayStart: null,
      todayEnd: null,
      behindBy: null,
    };
  }

  const todayISO = isoOf(today);
  const totalDays = plan.targetDate ? inclusiveDays(plan.startDate, plan.targetDate) : null;
  const daysElapsed = inclusiveDays(plan.startDate, todayISO);
  // A future-start plan hasn't begun: deadline math measures from the START
  // date (not today), so a 27-day Ramadan preset honestly reports 23/day —
  // never a flattering "4/day" earned by counting pre-start days.
  const effectiveTodayISO = daysElapsed > 0 ? todayISO : plan.startDate;
  const daysRemaining = plan.targetDate ? inclusiveDays(effectiveTodayISO, plan.targetDate) : null;

  // Pace over elapsed days. A plan that starts in the future has no elapsed
  // days yet — pace is null until day one begins.
  const pace = daysElapsed > 0 ? Math.round((read / daysElapsed) * 10) / 10 : null;

  // Projection at the current pace (needs a nonzero pace).
  let projectedFinishISO = null;
  if (pace > 0 && remaining > 0) {
    projectedFinishISO = plusDays(today, Math.ceil(remaining / pace) - 1);
  } else if (complete && plan.targetDate) {
    projectedFinishISO = null;
  } else if (pace > 0 && remaining === 0) {
    projectedFinishISO = todayISO;
  }

  // Pages/day needed from today to still make a target date.
  let requiredPerDay = null;
  if (plan.targetDate) {
    requiredPerDay =
      daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : remaining > 0 ? Infinity : 0;
  }

  // On-track verdict: against the target date when set (projection must land
  // on or before it), otherwise against the daily goal (actual pace ≥ goal).
  // A plan that hasn't started yet gets NO verdict — you cannot be behind
  // before day one, and saying so would be dishonest.
  let onTrack = null;
  if (complete) {
    onTrack = true;
  } else if (daysElapsed === 0) {
    onTrack = null; // starts in the future — nothing knowable yet
  } else if (plan.targetDate && projectedFinishISO) {
    onTrack = projectedFinishISO <= plan.targetDate;
  } else if (plan.targetDate && !projectedFinishISO) {
    onTrack = false; // nothing read yet while a deadline exists
  } else if (plan.dailyTarget && pace != null) {
    onTrack = pace >= plan.dailyTarget;
  }

  // Today's page window on a daily-goal schedule: cumulative pages through
  // yesterday +1 .. cumulative pages through today. Both ends clamp inside
  // the mushaf: a schedule that has already "finished" shows page 604 as
  // today's window instead of spilling past the end.
  let todayStart = null;
  let todayEnd = null;
  let behindBy = null;
  if (plan.dailyTarget && daysElapsed > 0) {
    const throughYesterday = Math.min(MUSHAF_PAGE_COUNT, plan.dailyTarget * (daysElapsed - 1));
    const throughToday = Math.min(MUSHAF_PAGE_COUNT, plan.dailyTarget * daysElapsed);
    todayStart = Math.min(throughYesterday + 1, MUSHAF_PAGE_COUNT);
    todayEnd = throughToday;
    behindBy = Math.max(0, throughYesterday - read);
  }

  return {
    ...base,
    planActive: true,
    daysElapsed,
    daysRemaining,
    totalDays,
    requiredPerDay,
    pace,
    projectedFinishISO,
    onTrack,
    todayStart,
    todayEnd,
    behindBy,
  };
}

/**
 * The "Ramadan preset": a khatma that finishes by the 27th of Ramadan, so
 * the last nights stay free for seeking Laylat al-Qadr — the widely
 * practiced schedule. Runs on the app's tabular Hijri calendar, so every
 * date is an estimate the person reviews before saving (the plan form
 * shows exactly what will be stored).
 *
 * - Before Ramadan: start = 1 Ramadan, finish = 27 Ramadan of THIS Hijri year.
 * - During Ramadan (on/before the 27th): start = today (the days already
 *   passed can't be reading days), finish = 27 Ramadan.
 * - During the last nights (28–30) or after Ramadan: next year's Ramadan.
 *
 * @param {Date} [today]
 * @returns {{ hijriYear: number, startDate: string, targetDate: string, dailyTarget: number, days: number }}
 */
export function ramadanKhatmaPreset(today = new Date()) {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const h = toHijri(day);
  const FINISH_DAY = 27;

  // Which Ramadan are we aiming at?
  let hijriYear = h.year;
  if (h.month > 9 || (h.month === 9 && h.day > FINISH_DAY)) {
    hijriYear = h.year + 1;
  }

  const firstRamadan = toGregorian(hijriYear, 9, 1);
  const finish = toGregorian(hijriYear, 9, FINISH_DAY);

  // Start today when Ramadan is already running; otherwise at 1 Ramadan.
  const start = h.month === 9 && day >= firstRamadan ? day : firstRamadan;

  const startDate = isoOf(start);
  const targetDate = isoOf(finish);
  const days = Math.max(1, inclusiveDays(startDate, targetDate));
  const dailyTarget = Math.ceil(MUSHAF_PAGE_COUNT / days);

  return { hijriYear, startDate, targetDate, dailyTarget, days };
}

/**
 * True while the most recent khatma completion is fresh enough to deserve
 * its one-shot celebration bloom (v3.12). Derives purely from the persisted
 * khatmaHistory stamp — the reducer writes `completedAt` exactly once (the
 * dispatch that added the 604th page), so this is true only inside the
 * window after the real moment, and every later re-render is silent.
 * Pure; `nowMs` injectable for tests.
 */
export const KHATMA_CELEBRATION_MS = 1500;
export function justCompletedKhatma(state, nowMs = Date.now()) {
  const first = state?.khatmaHistory?.[0];
  return (
    !!first &&
    Number.isFinite(first.completedAt) &&
    nowMs - first.completedAt >= 0 &&
    nowMs - first.completedAt < KHATMA_CELEBRATION_MS
  );
}
