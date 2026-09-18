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

/**
 * (v5.10.1) Daily-goal progress: today's recitations against the goal.
 * Hostile goals clamp to ≥1 so the bar never divides by zero; met is
 * strict (today >= goal) — the Garden's anti-guilt framing stays in the view.
 */
export function goalProgress(statistics, goal, today = new Date()) {
  const g = Math.floor(Number(goal));
  const target = Number.isFinite(g) && g > 0 ? g : 1;
  const key = dateKey(today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date());
  const rec = statistics?.dailyHistory?.[key];
  const done = Math.floor(Number(rec?.recitations)) || 0;
  const pct = Math.min(100, Math.round((Math.max(0, done) / target) * 100));
  return {
    today: Math.max(0, done),
    goal: target,
    pct,
    remaining: Math.max(0, target - done),
    met: done >= target,
  };
}

/** Streak milestones the coaching panel counts toward. */
export const STREAK_MILESTONES = Object.freeze([7, 30, 100, 365]);

/**
 * (v5.10.1) Streak coaching: the next milestone above the current run
 * and how many days remain. Null milestone = every milestone cleared.
 */
export function streakCoaching(currentStreak, longestStreak) {
  const cur = Math.floor(Number(currentStreak)) || 0;
  const best = Math.floor(Number(longestStreak)) || 0;
  const next = STREAK_MILESTONES.find((m) => m > Math.max(0, cur)) ?? null;
  return {
    current: Math.max(0, cur),
    longest: Math.max(0, best),
    nextMilestone: next,
    toGo: next == null ? 0 : next - Math.max(0, cur),
  };
}

/**
 * (v5.10.1) Per-surah reading depth from the mushaf page log: for every
 * read page, every surah printed on it earns one page. Derived — no new
 * recording, so old histories gain the breakdown for free. Bounded: one
 * pass over the 6,236-entry ayah→page map, hostile shapes degrade to {}.
 */
export function surahPageCounts(mushafPagesRead, ayahPages) {
  const out = {};
  if (!mushafPagesRead || typeof mushafPagesRead !== 'object') return out;
  if (!ayahPages || typeof ayahPages !== 'object') return out;
  const read = new Set(Object.keys(mushafPagesRead).map((k) => String(Math.floor(Number(k)))));
  const pageSurahs = new Map();
  for (const [key, pg] of Object.entries(ayahPages)) {
    const page = String(pg);
    if (!read.has(page)) continue;
    const s = Math.floor(Number(String(key).split(':')[0]));
    if (!Number.isFinite(s) || s < 1 || s > 114) continue;
    if (!pageSurahs.has(page)) pageSurahs.set(page, new Set());
    pageSurahs.get(page).add(s);
  }
  for (const surahs of pageSurahs.values()) {
    for (const s of surahs) out[s] = (out[s] || 0) + 1;
  }
  return out;
}

/**
 * (v5.10.1) Top-N surahs by pages read, with display names resolved from
 * the loaded quran meta (unknown numbers render as #N, never blank).
 */
export function topSurahsByPages(counts, surahsMeta, limit = 5) {
  const meta = Array.isArray(surahsMeta) ? surahsMeta : [];
  return Object.entries(counts || {})
    .map(([s, pages]) => ({ n: Math.floor(Number(s)), pages }))
    .filter((e) => Number.isFinite(e.n) && e.n >= 1 && e.n <= 114)
    .sort((a, b) => b.pages - a.pages)
    .slice(0, Math.max(1, Math.min(10, Math.floor(Number(limit)) || 5)))
    .map((e) => {
      const m = meta.find((x) => Number(x?.number) === e.n);
      return {
        ...e,
        nameAr: m?.nameAr || `#${e.n}`,
        nameEn: m?.nameTransliteration || m?.nameEn || '',
      };
    });
}

const CSV_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strict day-key check (junk and rolled dates never reach the export). */
function isCsvDayKey(key) {
  if (typeof key !== 'string' || !CSV_DAY_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Non-negative integer cell — hostile values coerce to 0. */
function csvCell(entry, field) {
  const n = Math.floor(Number(entry?.[field]));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Daily-grain CSV of the whole recorded history, oldest first:
 * `date,recitations,sessions,pages,reading_seconds`. No trailing newline;
 * header-only when nothing recorded. Pure string building, no DOM.
 */
export function buildStatsCSV(statistics) {
  const raw =
    statistics && typeof statistics.dailyHistory === 'object' && statistics.dailyHistory !== null
      ? statistics.dailyHistory
      : {};
  const lines = ['date,recitations,sessions,pages,reading_seconds'];
  for (const day of Object.keys(raw).filter(isCsvDayKey).sort()) {
    const e = raw[day];
    lines.push(
      [
        day,
        csvCell(e, 'recitations'),
        csvCell(e, 'sessions'),
        csvCell(e, 'pages'),
        csvCell(e, 'readingSec'),
      ].join(',')
    );
  }
  return lines.join('\n');
}

/** Export filename for today: nur-al-dhikr-stats-YYYY-MM-DD.csv */
export function statsCSVFilename(now = new Date()) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return `nur-al-dhikr-stats-${dateKey(d)}.csv`;
}
