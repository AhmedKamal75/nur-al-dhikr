/**
 * calendarNotes.js
 * Pure logic for resolving whether a user-created calendar note applies to
 * a given date. No state/DOM access — state.js owns storage, calendar.js
 * (the view) owns rendering, this module only answers "does note X apply
 * to date Y" and related aggregate questions.
 *
 * A note's `recurrence` is one of:
 *   'once'     — a single specific day (startDate only)
 *   'daily'    — every day from startDate onward (optionally capped by endDate)
 *   'interval' — every `intervalDays` days starting at startDate (optionally capped)
 *   'range'    — every day within [startDate, endDate] inclusive
 *   'weekly'   — the startDate weekday, every week (optionally capped)
 *   'monthly'  — the startDate month-day, every month (short months skip —
 *                a 31st never fires a phantom 28th; optionally capped)
 *   'yearly'   — the startDate month+day, every year (Feb 29 keeps leap
 *                years only; optionally capped)
 *   'hijri-monthly' — the startDate's Hijri day-of-month, every Hijri
 *                month (optionally capped)
 *   'whitedays' — Hijri 13/14/15 of every month (domain/calendar.js
 *                isWhiteDay), from startDate (optionally capped)
 */

import { toHijri, isWhiteDay } from '../domain/calendar.js';

function daysBetween(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

/** Local-midnight Date for a day key (calendar fields, never clock math). */
function dayDate(key) {
  return new Date(key + 'T00:00:00');
}

/** Hijri day-of-month for a day key (NaN when unparseable — never matches). */
function hijriDayOf(key) {
  const d = dayDate(key);
  if (Number.isNaN(d.getTime())) return NaN;
  return toHijri(d).day;
}

/** Does `note` apply to the given YYYY-MM-DD date key? */
export function appliesToDate(note, dateKeyStr) {
  if (!note || !note.startDate) return false;
  if (dateKeyStr < note.startDate) return false;

  switch (note.recurrence) {
    case 'once':
      return dateKeyStr === note.startDate;

    case 'range':
      return !!note.endDate && dateKeyStr >= note.startDate && dateKeyStr <= note.endDate;

    case 'daily':
      return !note.endDate || dateKeyStr <= note.endDate;

    case 'interval': {
      const n = Math.max(1, note.intervalDays || 1);
      if (note.endDate && dateKeyStr > note.endDate) return false;
      return daysBetween(note.startDate, dateKeyStr) % n === 0;
    }

    case 'weekly': {
      if (note.endDate && dateKeyStr > note.endDate) return false;
      return dayDate(dateKeyStr).getDay() === dayDate(note.startDate).getDay();
    }

    case 'monthly': {
      if (note.endDate && dateKeyStr > note.endDate) return false;
      return dayDate(dateKeyStr).getDate() === dayDate(note.startDate).getDate();
    }

    case 'yearly': {
      if (note.endDate && dateKeyStr > note.endDate) return false;
      const d = dayDate(dateKeyStr);
      const s = dayDate(note.startDate);
      return d.getMonth() === s.getMonth() && d.getDate() === s.getDate();
    }

    case 'hijri-monthly': {
      if (note.endDate && dateKeyStr > note.endDate) return false;
      return hijriDayOf(dateKeyStr) === hijriDayOf(note.startDate);
    }

    case 'whitedays': {
      if (note.endDate && dateKeyStr > note.endDate) return false;
      return isWhiteDay(hijriDayOf(dateKeyStr));
    }

    default:
      return false;
  }
}

/** All notes (from a flat array) that apply to a specific date, most-recently-created first. */
export function notesForDate(notes, dateKeyStr) {
  return (notes || [])
    .filter((n) => appliesToDate(n, dateKeyStr))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Set of YYYY-MM-DD keys within [monthStartKey, monthEndKey] that have >=1 note — for calendar dot indicators. */
export function datesWithNotesInRange(notes, dateKeys) {
  const result = new Set();
  for (const key of dateKeys) {
    if ((notes || []).some((n) => appliesToDate(n, key))) result.add(key);
  }
  return result;
}

export const RECURRENCE_TYPES = Object.freeze([
  'once',
  'daily',
  'interval',
  'range',
  'weekly',
  'monthly',
  'yearly',
  'hijri-monthly',
  'whitedays',
]);
