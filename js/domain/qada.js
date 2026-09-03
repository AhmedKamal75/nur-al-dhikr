/**
 * qada.js (v4.4)
 * Qada' (make-up) tracker for missed fard prayers — log a backlog, work it
 * down, one prayer at a time. Entries are deliberately simple:
 *   { id, prayer, reason, date (the estimated missed day), ts (logged at),
 *     doneAt (null until prayed) }
 *
 * Storage: state.qadaLog (array, newest-first, capped).
 *
 * Tone follows the app's anti-guilt policy: the UI shows "remaining" and
 * celebrates completions; it never ranks, shames, or projects dates.
 */

import { PRAYER_KEYS } from './prayerLog.js';

export const QADA_LOG_CAP = 1000;

const REASONS = Object.freeze(['sleep', 'forget', 'travel', 'illness', 'other']);

const PRAYER_SET = new Set(PRAYER_KEYS);
const REASON_SET = new Set(REASONS);

/** A safe new entry (id + ts supplied by the caller's dispatch path). */
export function makeQadaEntry({ prayer, reason = 'other', date = '', ts, id }) {
  return {
    id: typeof id === 'string' && id ? id : `qada-${ts}`,
    prayer: PRAYER_SET.has(prayer) ? prayer : null,
    reason: REASON_SET.has(reason) ? reason : 'other',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    ts: Number.isFinite(ts) ? ts : Date.now(),
    doneAt: null,
  };
}

/** Defensively coerce a restored/imported qada log. */
export function sanitizeQadaLog(raw, cap = QADA_LOG_CAP) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) =>
      e && typeof e === 'object' && !Array.isArray(e)
        ? makeQadaEntry({
            prayer: e.prayer,
            reason: e.reason,
            date: typeof e.date === 'string' ? e.date : '',
            ts: Number.isFinite(e.ts) ? e.ts : 0,
            id: typeof e.id === 'string' ? e.id : undefined,
          })
        : null
    )
    .filter((e) => e && e.prayer && e.ts > 0)
    .map((e) => ({
      ...e,
      doneAt: Number.isFinite(e.doneAt) && e.doneAt > 0 ? e.doneAt : null,
      // re-key after coercion so ids stay unique against collisions
    }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
}

/** Pending (not yet prayed) entries, oldest-first — the work-down order. */
export function pendingQada(qadaLog) {
  return (Array.isArray(qadaLog) ? qadaLog : [])
    .filter((e) => e && e.prayer && !e.doneAt)
    .sort((a, b) => a.ts - b.ts);
}

/** Count of pending make-ups per prayer key ({ fajr: 2, … }). */
export function pendingByPrayer(qadaLog) {
  const out = {};
  for (const k of PRAYER_KEYS) out[k] = 0;
  for (const e of pendingQada(qadaLog)) out[e.prayer] = (out[e.prayer] || 0) + 1;
  return out;
}

/** Total pending, total completed. */
export function qadaSummary(qadaLog) {
  const all = Array.isArray(qadaLog) ? qadaLog : [];
  const done = all.filter((e) => e && e.doneAt);
  return {
    pending: all.length - done.length,
    completed: done.length,
  };
}

/** Mark the oldest pending entry for `prayer` as prayed; returns a new array. */
export function completeOldest(qadaLog, prayer, doneAt = Date.now()) {
  const list = Array.isArray(qadaLog) ? [...qadaLog] : [];
  const idx = list.findIndex((e) => e && e.prayer === prayer && !e.doneAt);
  if (idx === -1) return list;
  list[idx] = { ...list[idx], doneAt };
  return list;
}

/** Add N backlog entries for a prayer (bulk add from the "estimate" flow). */
export function addBacklog(
  qadaLog,
  prayer,
  n,
  { reason = 'other', date = '', ts, now = Date.now() }
) {
  const list = Array.isArray(qadaLog) ? [...qadaLog] : [];
  const count = Math.max(1, Math.min(50, Math.floor(Number(n) || 1)));
  for (let i = 0; i < count; i++) {
    list.push(makeQadaEntry({ prayer, reason, date, ts: ts ?? now + i }));
  }
  return list;
}
