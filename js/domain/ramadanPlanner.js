/**
 * ramadanPlanner.js (v4.4)
 * The Ramadan planner's three logs — taraweeh, i'tikaf, and the
 * last-ten-nights checklist — plus the suhoor/iftar countdown helpers.
 * Keys follow the existing ramadanLog convention ({hijriYear}-{hijriMonth}
 * → {day: value}) so every Ramadan keeps its own record forever.
 *
 * Pure, hostile-shape-safe, DOM-free.
 */

const MONTH_DAY_RE = /^\d{1,2}$/;

/** Coerce a hijri-keyed {day: boolean} month map. */
function monthMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [d, v] of Object.entries(raw)) {
    if (MONTH_DAY_RE.test(d) && v === true) out[d] = true;
  }
  return out;
}

/** Defensively coerce a hijri-keyed log of day-boolean month maps. */
export function sanitizeHijriDayLog(raw, cap = 24) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const keyRe = /^\d{4,5}-\d{1,2}$/;
  const out = {};
  const keys = Object.keys(raw)
    .filter((k) => keyRe.test(k))
    .sort()
    .slice(-cap);
  for (const k of keys) out[k] = monthMap(raw[k]);
  return out;
}

/** The last-ten-nights checklist items (ids are i18n keys). */
export const LAST_TEN_ITEMS = Object.freeze([
  { id: 'oddNight', icon: 'moon' },
  { id: 'salah', icon: 'mosque' },
  { id: 'qiyam', icon: 'moon' },
  { id: 'istighfar', icon: 'heart' },
  { id: 'quran', icon: 'quran' },
  { id: 'charity', icon: 'heart' },
]);

/** True during the last ten nights of Ramadan (day 21..30 of month 9). */
export function isLastTenNights(hijri) {
  return !!hijri && hijri.month === 9 && hijri.day >= 21 && hijri.day <= 30;
}

/** Entries marked for a given hijri year-month (or {} when absent);
 *  index the returned map by day string. */
export function monthEntry(log, hijriYearMonth) {
  const m = log?.[hijriYearMonth];
  return m && typeof m === 'object' ? m : {};
}

/** Taraweeh nights completed this Ramadan (count of true days). */
export function taraweehCount(ramadanKey, taraweehLog) {
  const m = taraweehLog?.[ramadanKey];
  return m ? Object.keys(m).filter((d) => m[d] === true).length : 0;
}

/** I'tikaf days completed this Ramadan. */
export function itikafCount(ramadanKey, itikafLog) {
  const m = itikafLog?.[ramadanKey];
  return m ? Object.keys(m).filter((d) => m[d] === true).length : 0;
}

/**
 * Khatm projection for the Ramadan planner: how many pages per day finish
 * the whole Mushaf inside Ramadan, and whether the current pace (pages
 * read since Ramadan 1) lands on target. Reuses the reading progress the
 * khatma machinery already owns — no second progress system.
 */
export function ramadanKhatmPlan({ hijri, ramadanLength = 30, pagesReadInRamadan = 0 }) {
  if (!hijri || hijri.month !== 9) return null;
  const day = Math.max(1, hijri.day);
  const daysLeft = Math.max(0, ramadanLength - day);
  const remainingPages = Math.max(0, 604 - pagesReadInRamadan);
  return {
    day,
    daysLeft,
    pagesReadInRamadan,
    remainingPages,
    perDayNeeded: daysLeft > 0 ? Math.ceil(remainingPages / daysLeft) : remainingPages,
    onTrack: pagesReadInRamadan >= Math.round((604 / ramadanLength) * day),
  };
}

/**
 * The next fasting-boundary event: suhoor ends at Fajr, iftar at Maghrib.
 * `times` is the day-relative prayer-times map (decimal hours); returns
 * { kind:'suhoor'|'iftar', hours } where hours is day-relative (may exceed
 * 24 for tomorrow's Fajr — the same convention the v4.3 prayer engine
 * uses), or null. The view derives the clock label and the countdown.
 */
export function nextBoundary(times, now = new Date()) {
  if (!times || typeof times !== 'object') return null;
  const fajr = Number(times.fajr);
  const maghrib = Number(times.maghrib);
  if (!Number.isFinite(fajr) || !Number.isFinite(maghrib)) return null;
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (nowHours < fajr) return { kind: 'suhoor', hours: fajr };
  if (nowHours < maghrib) return { kind: 'iftar', hours: maghrib };
  return { kind: 'suhoor', hours: fajr + 24 };
}
