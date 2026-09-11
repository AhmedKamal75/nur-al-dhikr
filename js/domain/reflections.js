/**
 * domain/reflections.js — Home feed queue + list completion math
 * (v5.2.25, counter-standards wave).
 *
 * Three pure helpers, DOM-free and unit-tested:
 *
 * - isCompletedToday(counter, todayKey): "done for today" reads the
 *   completion DAY stamp, never the lifetime cycles (which conflate
 *   years of history with this morning's routine).
 * - dedupeEntries(entries): the Home verse/recent/favorites panels draw
 *   from overlapping sources (daily pick, history, favorites) — the same
 *   duaa used to appear two or three times down one screen. First
 *   occurrence wins, order preserved.
 * - nextFreshIndex(eligible, fromIdx, isStale): when the pick-of-the-day
 *   is already done, walk the eligible ring for the next fresh item so
 *   the Reflections panel always surfaces something actionable.
 * - listCompletion(items, counters, todayKey): { done, total, pct } for
 *   the category "done today" indicator.
 */

export function isCompletedToday(counter, todayKey) {
  return !!counter && counter.lastCompletedDay === todayKey;
}

function entryId(entry) {
  return entry?.item?.id ?? entry?.id ?? null;
}

/** First occurrence wins (by item id); order preserved; junk dropped. */
export function dedupeEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries || []) {
    const id = entryId(entry);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  return out;
}

/**
 * Ring-walk `eligible` starting AFTER fromIdx for the first entry where
 * isStale(entry) is false. Returns the index, or -1 when everything is
 * stale (caller keeps the original pick rather than showing nothing).
 */
export function nextFreshIndex(eligible, fromIdx, isStale) {
  const list = eligible || [];
  if (!list.length) return -1;
  for (let step = 1; step <= list.length; step += 1) {
    const idx = (fromIdx + step) % list.length;
    if (!isStale(list[idx])) return idx;
  }
  return -1;
}

/**
 * { done, total, pct } completed-today stats for a visible item list.
 * getTarget(item) resolves the effective target (manage overrides live
 * outside this module — the caller supplies the resolution).
 */
export function listCompletion(items, counters, todayKey) {
  const list = items || [];
  const total = list.length;
  let done = 0;
  for (const item of list) {
    if (isCompletedToday(counters?.[item?.id], todayKey)) done += 1;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
