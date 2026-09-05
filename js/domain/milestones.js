/**
 * milestones.js (v4.4)
 * Juz' / surah mastery badges — positive framing only, consistent with the
 * app's anti-guilt nudge policy: badges celebrate what IS memorized or
 * read, never countdowns of what isn't.
 *
 * Mastery rules (computed, never persisted):
 *  - Surah mastered: it has a hifz record (marked memorized, v3.17).
 *  - Juz' mastered: every Mushaf page of the juz appears in
 *    mushafPagesRead (read-through mastery), OR every surah that STARTS in
 *    the juz and ends in it is memorized — in practice the page rule is
 *    the honest one for juz', so that is what ships; memorization-only
 *    juz' show as "in progress" with a percentage.
 *
 * The certificate view (v4.4) renders from the same computation so the
 * paper and the badge can never disagree.
 */

const TOTAL_JUZ = 30;
const TOTAL_PAGES = 604;

/** { [juzNumber]: { firstPage, lastPage } } from the mushaf page index. */
export function juzPageRanges(pagesMeta) {
  const out = {};
  const pages = Array.isArray(pagesMeta) ? pagesMeta : [];
  for (const p of pages) {
    const j = Number(p?.juz);
    if (!(j >= 1 && j <= TOTAL_JUZ)) continue;
    if (!out[j]) out[j] = { firstPage: Number(p.page), lastPage: Number(p.page) };
    else out[j].lastPage = Number(p.page);
  }
  return out;
}

/**
 * The badge list. Each badge: { kind:'juz'|'surah', id, label, earned,
 * progress (0..1), pagesRead, pagesTotal }.
 */
export function milestoneBadges({ hifzRecords = {}, mushafPagesRead = {}, pagesMeta = [] }) {
  const ranges = juzPageRanges(pagesMeta);
  const read = mushafPagesRead && typeof mushafPagesRead === 'object' ? mushafPagesRead : {};

  const juzBadges = [];
  for (let j = 1; j <= TOTAL_JUZ; j++) {
    const r = ranges[j];
    if (!r) continue;
    const total = r.lastPage - r.firstPage + 1;
    let n = 0;
    for (let p = r.firstPage; p <= r.lastPage; p++) if (read[String(p)] || read[p]) n += 1;
    juzBadges.push({
      kind: 'juz',
      id: j,
      earned: n >= total,
      progress: total ? n / total : 0,
      pagesRead: n,
      pagesTotal: total,
    });
  }

  const surahBadges = Object.keys(hifzRecords || {})
    .map(Number)
    .filter((s) => s >= 1 && s <= 114)
    .sort((a, b) => a - b)
    .map((s) => ({ kind: 'surah', id: s, earned: true, progress: 1 }));

  return { juz: juzBadges, surah: surahBadges };
}

/**
 * Milestones worth celebrating on the certificate: every earned juz badge
 * plus the total memorized surah count. Returns null when there is
 * nothing yet (the certificate button stays hidden).
 */
export function certificateData({ hifzRecords = {}, mushafPagesRead = {}, pagesMeta = [] }) {
  const { juz, surah } = milestoneBadges({ hifzRecords, mushafPagesRead, pagesMeta });
  const earnedJuz = juz.filter((b) => b.earned).map((b) => b.id);
  if (!earnedJuz.length && !surah.length) return null;
  return {
    juzList: earnedJuz,
    surahCount: surah.length,
    surahList: surah.map((b) => b.id),
    pagesRead: Object.keys(mushafPagesRead || {}).length,
    totalPages: TOTAL_PAGES,
  };
}
