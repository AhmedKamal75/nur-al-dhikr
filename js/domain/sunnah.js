/**
 * sunnah.js (v4.4)
 * Sunnah prayer tracker domain — Duha, Witr, Tahajjud, Rawatib, separate
 * from the fard log (prayerLog.js) by design: mixing them would inflate the
 * five-prayer completion UI and every streak built on it.
 *
 * Storage: state.sunnahLog — { 'YYYY-MM-DD': { duha, witr, tahajjud, rawatib } }
 * Booleans only; Rawatib is one toggle for the whole sunnah-rawatib set
 * (12 rak'ahs across the day), not per-prayer, to keep the surface gentle.
 *
 * Pure and hostile-shape-safe, mirroring prayerLog.js conventions.
 */

import { dateKey, addDays } from '../core/utils.js';

/** The tracked sunnah prayers, display order. ids are i18n keys. */
export const SUNNAH_ITEMS = Object.freeze([
  { id: 'tahajjud', icon: 'moon' },
  { id: 'duha', icon: 'sun' },
  { id: 'rawatib', icon: 'mosque' },
  { id: 'witr', icon: 'moon' },
]);

const SUNNAH_IDS = new Set(SUNNAH_ITEMS.map((i) => i.id));

/** Coerce one restored day-entry to a clean {id: boolean} object. */
function coerceDay(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of SUNNAH_IDS) out[id] = raw[id] === true;
  return out;
}

/** Defensively coerce a restored/imported sunnah log (cap 400 days). */
export function sanitizeSunnahLog(raw, cap = 400) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const out = {};
  const keys = Object.keys(raw)
    .filter((k) => dateRe.test(k))
    .sort()
    .slice(-cap);
  for (const k of keys) out[k] = coerceDay(raw[k]);
  return out;
}

/** Today's entry (always an object, never null). */
export function sunnahToday(sunnahLog, today = new Date()) {
  const log = sunnahLog && typeof sunnahLog === 'object' ? sunnahLog : {};
  return coerceDay(log[dateKey(today)]);
}

/** How many of the tracked sunnah prayers are logged on a day (0..4). */
export function sunnahCount(dayEntry) {
  return SUNNAH_ITEMS.filter((i) => dayEntry?.[i.id] === true).length;
}

/** The last 7 days (oldest first) for the week strip. */
export function sunnahWeek(sunnahLog, today = new Date(), days = 7) {
  const log = sunnahLog && typeof sunnahLog === 'object' ? sunnahLog : {};
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(new Date(today), -i);
    const entry = coerceDay(log[dateKey(d)]);
    out.push({ dateKey: dateKey(d), count: sunnahCount(entry), entry });
  }
  return out;
}

/**
 * Consecutive-day Witr streak (the one sunnah with a strong daily
 * convention). Today with no witr yet never breaks yesterday's streak.
 */
export function witrStreak(sunnahLog, today = new Date()) {
  const log = sunnahLog && typeof sunnahLog === 'object' ? sunnahLog : {};
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (log[dateKey(cursor)]?.witr !== true) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (streak < 3650) {
    if (log[dateKey(cursor)]?.witr === true) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}
