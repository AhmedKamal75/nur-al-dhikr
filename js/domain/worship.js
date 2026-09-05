/**
 * worship.js
 * The combined "today in worship" aggregation (v3.19) — one honest view
 * over data that ALREADY exists per-day, plus the one gap (sadaqah given).
 *
 * Sources, deliberately not duplicated:
 *  - Prayers: state.dailyChecklist (tri-state prayer log, prayerLog.js)
 *  - Dhikr:   state.statistics.dailyHistory[day].recitations
 *  - Qur'an:  state.statistics.dailyHistory[day].pages (bumped by the same
 *             MUSHAF_PAGE_VISITED dispatch that feeds the khatma — one
 *             write path, no second progress system)
 *  - Fasting: state.ramadanLog (the shared fasting log, v3.18)
 *  - Sadaqah: state.sadaqahLog (new, quick-log; a full amount/note editor
 *             is a recorded follow-up)
 *
 * Everything here is pure and DOM-free; hostile shapes degrade to zeros.
 */

import { dateKey } from '../core/utils.js';
import { PRAYER_KEYS, prayerState } from './prayerLog.js';
import { toHijri } from './calendar.js';

export const SADAQAH_LOG_CAP = 500;

/** Defensive page-count read from a dailyHistory entry. */
function pagesOf(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  const n = Math.floor(Number(entry.pages));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Qur'an pages read on `today` (0 when nothing recorded). */
export function pagesReadToday(dailyHistory, today = new Date()) {
  const h = dailyHistory && typeof dailyHistory === 'object' ? dailyHistory : {};
  return pagesOf(h[dateKey(today)]);
}

/**
 * Consecutive-day Qur'an reading streak: days with pages > 0, walking back
 * from today (today counts only when it already has pages; a morning with
 * no reading yet doesn't break yesterday's streak).
 */
export function readingStreak(dailyHistory, today = new Date()) {
  const h = dailyHistory && typeof dailyHistory === 'object' ? dailyHistory : {};
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (pagesOf(h[dateKey(cursor)]) === 0) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (streak < 3650) {
    if (pagesOf(h[dateKey(cursor)]) > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

/** How many of the five fard prayers are logged today (0..5). */
export function prayersLoggedToday(dayEntry) {
  let count = 0;
  let jamaah = 0;
  for (const key of PRAYER_KEYS) {
    const s = prayerState(dayEntry, key);
    if (s) count += 1;
    if (s === 'jamaah') jamaah += 1;
  }
  return { count, jamaah };
}

/** Sadaqah entries dated `today` (quick-log entries carry ts only). */
export function sadaqahGivenToday(sadaqahLog, today = new Date()) {
  if (!Array.isArray(sadaqahLog)) return 0;
  const key = dateKey(today);
  return sadaqahLog.filter((e) => e && typeof e === 'object' && dateKey(new Date(e.ts)) === key)
    .length;
}

/** Defensively coerce a restored/imported sadaqah log. */
export function sanitizeSadaqahLog(raw, cap = SADAQAH_LOG_CAP) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object' && !Array.isArray(e) && Number.isFinite(e.ts))
    .map((e) => ({
      id: typeof e.id === 'string' && e.id ? e.id : `sadaqah-${e.ts}`,
      ts: e.ts,
      note: typeof e.note === 'string' ? e.note.slice(0, 200) : '',
    }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
}

/**
 * Fasted today? Reads the shared fasting log (v3.18) — the same map the
 * Ramadan tracker and the voluntary panel write, so this row can never
 * disagree with either.
 */
export function fastedToday(ramadanLog, today = new Date()) {
  const log = ramadanLog && typeof ramadanLog === 'object' ? ramadanLog : {};
  const h = toHijri(today);
  if (!h) return false;
  return log[`${h.year}-${h.month}`]?.[String(h.day)] === true;
}

/**
 * The combined rows for the Home "Today in worship" card. ids are stable
 * i18n/render keys: prayers, quran, dhikr, fasting, sadaqah.
 */
export function worshipTodayRows(input, today = new Date()) {
  const { statistics, dailyChecklist, ramadanLog, sadaqahLog } =
    input && typeof input === 'object' ? input : {};
  const stats = statistics && typeof statistics === 'object' ? statistics : {};
  const history = stats.dailyHistory;
  const checklist = dailyChecklist && typeof dailyChecklist === 'object' ? dailyChecklist : {};
  const dayEntry = checklist[dateKey(today)] ?? {};
  const prayers = prayersLoggedToday(dayEntry);
  const sadaqahCount = sadaqahGivenToday(sadaqahLog, today);
  const dhikrEntry = history && typeof history === 'object' ? history[dateKey(today)] : undefined;
  const dhikrToday =
    dhikrEntry && typeof dhikrEntry === 'object'
      ? Math.max(0, Math.floor(Number(dhikrEntry.recitations)) || 0)
      : 0;

  return [
    {
      id: 'prayers',
      count: prayers.count,
      total: PRAYER_KEYS.length,
      done: prayers.count >= PRAYER_KEYS.length,
      detail: prayers.jamaah ? prayers.jamaah : 0,
    },
    {
      id: 'quran',
      count: pagesReadToday(history, today),
      streak: readingStreak(history, today),
      done: pagesReadToday(history, today) > 0,
    },
    {
      id: 'dhikr',
      count: dhikrToday,
      done: dhikrToday > 0,
    },
    {
      id: 'fasting',
      done: fastedToday(ramadanLog, today),
      count: fastedToday(ramadanLog, today) ? 1 : 0,
    },
    {
      id: 'sadaqah',
      count: sadaqahCount,
      done: sadaqahCount > 0,
    },
  ];
}
