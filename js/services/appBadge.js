/**
 * services/appBadge.js — the installable-app icon badge (Badging API, no
 * backend, fully local).
 *
 * Pure count builder (unit-tested) + thin guarded sync, mirroring
 * services/mediaSession.js: every touch of `navigator.setAppBadge` /
 * `navigator.clearAppBadge` is feature-detected, so browsers without it
 * (Firefox, desktop Safari, or Node under test) simply get silence instead
 * of an exception. The store owns worship state; this module only
 * ADVERTISES the outstanding count to the platform.
 *
 * Badge meaning (one number, "things left today"):
 *  - prayers remaining today (5 → 1) while the five fard log is incomplete;
 *  - 1 when the prayers are done but today is not yet a streak day while
 *    yesterday was (the streak dies at midnight — same streak-day rule as
 *    the engine in core/state/streak.js, goal-aware);
 *  - cleared otherwise (everything done, or no live streak to protect).
 *
 * "Streak day" is the shared isStreakDay predicate (goal met, or Qur'an
 * activity) — a present-but-idle `{ recitations: 0, sessions: 0 }` entry
 * does NOT secure the streak.
 */

import { dateKey, addDays } from '../core/utils.js';
import { coerceGoal, isStreakDay } from '../core/state/streak.js';
import { loggedCount, PRAYER_KEYS } from '../domain/prayerLog.js';

/** A setAppBadge/clearAppBadge-capable navigator (or null when absent). */
function badgeApi(nav) {
  try {
    const n = nav === undefined ? (typeof navigator !== 'undefined' ? navigator : null) : nav;
    if (n && typeof n.setAppBadge === 'function' && typeof n.clearAppBadge === 'function') return n;
  } catch {
    /* hostile/partial navigator — treat as absent */
  }
  return null;
}

/**
 * The badge number for `today` (a Date, default now), or null when the
 * badge should be cleared. Never throws; hostile state degrades to the
 * full five outstanding (the log simply reads as empty).
 */
export function badgeCountFor(state, today = new Date()) {
  const s = state && typeof state === 'object' ? state : {};
  const now = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  const checklist =
    s.dailyChecklist && typeof s.dailyChecklist === 'object' ? s.dailyChecklist : {};
  const settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
  const statistics = s.statistics && typeof s.statistics === 'object' ? s.statistics : {};
  const history =
    statistics.dailyHistory && typeof statistics.dailyHistory === 'object'
      ? statistics.dailyHistory
      : {};
  const goal = coerceGoal(settings.dailyGoal);

  const remaining = PRAYER_KEYS.length - loggedCount(checklist[dateKey(now)]);
  if (remaining > 0) return remaining;
  // Prayers done: the only thing left that can die at midnight is the
  // streak — flag it exactly while it is at risk (today not a streak day,
  // yesterday one). Anything else clears the badge.
  if (
    !isStreakDay(history[dateKey(now)], goal) &&
    isStreakDay(history[dateKey(addDays(now, -1))], goal)
  ) {
    return 1;
  }
  return null;
}

/**
 * Set (or clear, with null/0) the platform badge. Returns 'set' /
 * 'cleared' when applied, 'unsupported' where the API is missing or
 * throws. Never rejects: the returned promise always resolves.
 */
export async function syncAppBadge(count, nav) {
  const api = badgeApi(nav);
  if (!api) return 'unsupported';
  const n = Math.floor(Number(count));
  try {
    if (!Number.isFinite(n) || n <= 0) await api.clearAppBadge();
    else await api.setAppBadge(n);
  } catch {
    return 'unsupported';
  }
  return !Number.isFinite(n) || n <= 0 ? 'cleared' : 'set';
}

/** Clear the platform badge (app open / session over). Never throws. */
export async function clearAppBadge(nav) {
  return syncAppBadge(null, nav);
}

// Change-dedupe: setAppBadge on every store dispatch (each tasbih tap)
// would churn the platform API for an unchanged number, so the refresh
// path applies only on transitions. `undefined` (never synced) always
// applies, so the first refresh after boot clears stale badges too.
let lastApplied = undefined;

/**
 * Recompute the badge from live state and sync it when the number
 * changed since the last applied value. `getState` is an accessor (so
 * the subscriber always reads post-dispatch state). Resolves to the
 * syncAppBadge result, or 'unchanged' when the platform call was
 * skipped. Never throws.
 */
export async function refreshAppBadge(getState, nav, today = new Date()) {
  let count = null;
  try {
    count = badgeCountFor(typeof getState === 'function' ? getState() : getState, today);
  } catch {
    count = null;
  }
  if (count === lastApplied) return 'unchanged';
  lastApplied = count;
  return syncAppBadge(count, nav);
}

/** Reset the change latch (tests only). */
export function _resetAppBadgeForTests() {
  lastApplied = undefined;
}
