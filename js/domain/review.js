/**
 * review.js — the worship "year in review" aggregation (v3.23.0).
 *
 * The TODO's own framing, kept as a contract: computed entirely from data
 * already being tracked, presented honestly — a summary of one's own
 * worship, NOT a leaderboard and NEVER a guilt trip about days missed.
 * So every metric here counts what happened; nothing counts what didn't.
 *
 * Sources (all read-only, all pre-existing — nothing new is recorded):
 *  - Dhikr + Qur'an pages: state.statistics.dailyHistory[dateKey]
 *    ({recitations, pages, pagesVisited, ...})
 *  - Prayers: state.dailyChecklist[dateKey] (tri-state, prayerLog.js)
 *  - Fasts: state.ramadanLog (hijri 'year-month' keys; month 9 is Ramadan)
 *  - Sadaqah: state.sadaqahLog [{id, ts, note}]
 *  - Bookmarks: state.ayahBookmarks [{key, surah, ayah, ...}]
 *  - Khatma: state.khatmaHistory [{id, completedAt, days, pages}] and
 *    state.mushafPagesRead ({pageKey: true})
 *
 * Windows: rolling last-90 days, the current Hijri year, and all time.
 * Hostile shapes degrade to zeros exactly like worship.js.
 */

import { dateKey, addDays } from '../core/utils.js';
import { loggedCount, prayerState } from './prayerLog.js';
import { toHijri, toGregorian } from './calendar.js';
import { voluntaryFastCount } from './fasting.js';
import { readingStreak } from './worship.js';

/** Strict dateKey shape — junk restore keys must never enter the sums
 *  (the v3.21 lesson: forged khatma completions rode in on junk keys). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Own, enumerable, plain-object guard (mirrors worship.js). */
function objOf(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** 'YYYY-MM-DD' -> local Date (never UTC), null for junk. Rolled dates
 *  (e.g. '2025-02-30') are rejected by a round-trip check — new Date()
 *  would silently normalize them into a different real day. Exported for
 *  the view layer's "since {date}" formatting — same parsing, one source. */
export function keyToDate(key) {
  if (typeof key !== 'string' || !DATE_RE.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  )
    return null;
  return dt;
}

function asFiniteCount(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Earliest tracked day across history + checklist (ISO keys compare
 * lexicographically), or null when nothing was ever recorded. This is the
 * "since you started" anchor — first ACTIVITY, not first app open, because
 * installing is not worshipping.
 */
export function firstTrackedKey(dailyHistory, dailyChecklist) {
  const keys = [];
  for (const k of Object.keys(objOf(dailyHistory))) if (keyToDate(k)) keys.push(k);
  for (const k of Object.keys(objOf(dailyChecklist))) if (keyToDate(k)) keys.push(k);
  if (!keys.length) return null;
  return keys.sort()[0];
}

/**
 * Longest run of consecutive days from a set of qualifying dateKeys.
 * Runs are walked from run-starts only (a run start's predecessor is not
 * in the set), so this is O(n) and month/year boundaries fall out of the
 * arithmetic naturally.
 */
export function longestDayStreak(keys) {
  const set = new Set();
  for (const k of keys) {
    // keyToDate does BOTH jobs: regex shape and round-trip validity —
    // a rolled key like '2025-02-30' would crash the date walk below.
    if (keyToDate(k)) set.add(k);
  }
  if (!set.size) return 0;
  let best = 0;
  for (const k of set) {
    // (v4.3) DST fix: the walk used raw clock milliseconds (± DAY_MS), so a
    // 25-hour fall-back day landed on the SAME dateKey twice (counting the
    // run a day long) and spring-forward skipped run starts entirely —
    // proven on ['2025-11-01','2025-11-02','2025-11-03'] in America/New_York
    // returning 4. Calendar-day arithmetic via noon-anchored keys instead,
    // the same rule the v4.2 streak/khatma fixes established.
    if (set.has(shiftDayKey(k, -1))) continue; // not a run start
    let len = 1;
    let cursor = k;
    while (true) {
      cursor = shiftDayKey(cursor, 1);
      if (!set.has(cursor)) break;
      len += 1;
    }
    if (len > best) best = len;
  }
  return best;
}

/** The day ±N from a 'YYYY-MM-DD' key, as a key — noon-anchored so it can
 *  never straddle a DST transition (which would re-introduce the raw-ms
 *  arithmetic this module just escaped). */
function shiftDayKey(key, days) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Fresh per-window accumulator. */
function newWindow() {
  return { days: 0, pages: 0, recitations: 0, prayers: 0, jamaah: 0 };
}

/**
 * The full review. `today` defaults to now (injectable for tests);
 * the Hijri year is the app-wide convention toHijri(today).year.
 */
export function worshipReview(state, today = new Date()) {
  const history = objOf(state?.statistics?.dailyHistory);
  const checklist = objOf(state?.dailyChecklist);
  const ramadanLog = objOf(state?.ramadanLog);
  const sadaqahLog = Array.isArray(state?.sadaqahLog) ? state.sadaqahLog : [];
  const bookmarks = Array.isArray(state?.ayahBookmarks) ? state.ayahBookmarks : [];
  const khatmaHistory = Array.isArray(state?.khatmaHistory) ? state.khatmaHistory : [];
  const pagesRead = objOf(state?.mushafPagesRead);

  const todayKey = dateKey(today);
  const d90StartKey = dateKey(addDays(today, -89));
  const hijriYear = toHijri(today).year;

  const windows = { d90: newWindow(), hijriYear: newWindow(), all: newWindow() };
  const inWindow = (d) => {
    const k = dateKey(d);
    return {
      all: true,
      d90: k >= d90StartKey && k <= todayKey,
      hijriYear: toHijri(d).year === hijriYear,
    };
  };

  // Union of day keys from both day-keyed maps (a checklist-only day still
  // counts as a day with activity — prayers are worship too).
  const dayKeys = new Set([...Object.keys(history), ...Object.keys(checklist)]);
  for (const key of dayKeys) {
    if (!DATE_RE.test(key)) continue; // junk keys never enter any sum
    const dayDate = keyToDate(key);
    if (!dayDate) continue; // rolled/junk dates (e.g. 2025-02-30) too
    const h = objOf(history[key]);
    const recitations = asFiniteCount(h.recitations);
    const pages = asFiniteCount(h.pages);
    const day = checklist[key];
    const prayers = loggedCount(day);
    let jamaah = 0;
    if (day && typeof day === 'object') {
      for (const pk of Object.keys(day)) {
        if (prayerState(day, pk) === 'jamaah') jamaah += 1;
      }
    }
    const active = recitations > 0 || pages > 0 || prayers > 0;
    if (!active) continue; // presence is not activity
    const w = inWindow(dayDate);
    for (const name of ['all', 'd90', 'hijriYear']) {
      if (!w[name]) continue;
      const win = windows[name];
      win.days += 1;
      win.pages += pages;
      win.recitations += recitations;
      win.prayers += prayers;
      win.jamaah += jamaah;
    }
  }

  // Fasts: ramadanLog day-numbers -> gregorian via the app's own converter,
  // then binned per window. Total includes Ramadan (it is worship too);
  // the voluntary split comes from fasting.js (which excludes month 9).
  const fasts = { d90: 0, hijriYear: 0, all: 0 };
  for (const [key, days] of Object.entries(ramadanLog)) {
    const m = /^(\d{1,4})-(\d{1,2})$/.exec(key);
    if (!m || !days || typeof days !== 'object' || Array.isArray(days)) continue;
    const hy = Number(m[1]);
    const hm = Number(m[2]);
    for (const [dayNum, v] of Object.entries(days)) {
      if (v !== true) continue;
      const hd = Math.floor(Number(dayNum));
      if (!Number.isFinite(hd) || hd < 1 || hd > 31) continue;
      const g = toGregorian(hy, hm, hd);
      if (inWindow(g).d90) fasts.d90 += 1;
      if (toHijri(g).year === hijriYear) fasts.hijriYear += 1;
      fasts.all += 1;
    }
  }
  const voluntary = voluntaryFastCount(ramadanLog, hijriYear);

  // Sadaqah entries carry timestamps; bookmarks/khatmas are all-time facts.
  const sadaqah = { d90: 0, hijriYear: 0, all: 0 };
  for (const e of sadaqahLog) {
    const ts = Number(e?.ts);
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    const k = dateKey(d);
    if (k >= d90StartKey && k <= todayKey) sadaqah.d90 += 1;
    if (toHijri(d).year === hijriYear) sadaqah.hijriYear += 1;
    sadaqah.all += 1;
  }

  const recitationKeys = [];
  const readingKeys = [];
  for (const [key, h] of Object.entries(history)) {
    if (!DATE_RE.test(key)) continue;
    if (asFiniteCount(h.recitations) > 0) recitationKeys.push(key);
    if (asFiniteCount(h.pages) > 0) readingKeys.push(key);
  }

  return {
    hijriYear,
    sinceKey: firstTrackedKey(history, checklist),
    windows,
    fasts,
    voluntary,
    sadaqah,
    streaks: {
      longestRecitations: longestDayStreak(recitationKeys),
      longestReading: longestDayStreak(readingKeys),
      currentReading: readingStreak(history, today),
    },
    allTime: {
      ayahBookmarks: bookmarks.length,
      khatmas: khatmaHistory.length,
      mushafPages: Object.keys(pagesRead).length,
    },
  };
}

/** True when there is nothing to summarize yet (first-run honesty). */
export function reviewIsEmpty(review) {
  if (!review) return true;
  const w = review.windows || {};
  const all = w.all || {};
  return (
    (all.pages || 0) === 0 &&
    (all.recitations || 0) === 0 &&
    (all.prayers || 0) === 0 &&
    ((review.fasts || {}).all || 0) === 0 &&
    ((review.sadaqah || {}).all || 0) === 0
  );
}
