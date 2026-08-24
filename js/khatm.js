/**
 * khatm.js
 * Pure helpers for the Qur'an reading-plan (Khatm) tracker. No DOM, no
 * state.js. Progress is deliberately simple: "how far past the plan's
 * starting page is the Mushaf's current bookmark" — an honest
 * approximation that assumes roughly linear front-to-back reading rather
 * than tracking every page actually visited. Good enough for pacing
 * yourself; not a claim about which specific pages were read.
 */

export const MUSHAF_TOTAL_PAGES = 604;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * @param {{active:boolean, startDate:string, targetDays:number, startPage:number}} khatm
 * @param {number} currentPage - the Mushaf's current bookmark page (1-604)
 * @returns {null|{percent, pagesRead, pagesToRead, pagesRemaining, daysElapsed,
 *   daysTotal, daysRemaining, pagesPerDayNeeded, onTrack, completed, overdue, targetDate}}
 *   Returns null if there's no active plan.
 */
export function khatmProgress(khatm, currentPage, now = new Date()) {
  if (!khatm || !khatm.active || !khatm.startDate) return null;

  const start = new Date(khatm.startDate);
  const daysTotal = Math.max(1, khatm.targetDays || 30);
  const targetDate = new Date(start.getTime() + daysTotal * 86400000);
  const startPage = Math.min(Math.max(1, khatm.startPage || 1), MUSHAF_TOTAL_PAGES);
  const pagesToRead = MUSHAF_TOTAL_PAGES - startPage + 1;

  const pagesRead = Math.max(0, Math.min(pagesToRead, (currentPage || startPage) - startPage + 1));
  const percent = Math.round((pagesRead / pagesToRead) * 100);

  const daysElapsed = Math.max(0, Math.round((startOfDay(now) - startOfDay(start)) / 86400000));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);
  const pagesRemaining = pagesToRead - pagesRead;
  const pagesPerDayNeeded =
    daysRemaining > 0 ? Math.ceil(pagesRemaining / daysRemaining) : pagesRemaining;

  const expectedPagesByNow = Math.round(pagesToRead * Math.min(1, daysElapsed / daysTotal));
  const completed = pagesRead >= pagesToRead;
  const onTrack = completed || pagesRead >= expectedPagesByNow;
  const overdue = !completed && startOfDay(now) > startOfDay(targetDate);

  return {
    percent,
    pagesRead,
    pagesToRead,
    pagesRemaining,
    daysElapsed,
    daysTotal,
    daysRemaining,
    pagesPerDayNeeded,
    onTrack,
    completed,
    overdue,
    targetDate,
  };
}
