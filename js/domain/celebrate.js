/**
 * celebrate.js
 * A transient, in-memory "something good just happened" registry, shared by
 * every celebration micro-interaction in the app (v3.12 — generalized from
 * the tasbih cycle-completion flash).
 *
 * WHY THIS EXISTS
 * The render model is full re-render per state change: any CSS animation
 * keyed off persistent store state would either never fire (the state is
 * already old by the time it renders) or re-fire on every later render that
 * happens to touch the same subtree (the "F5 refresh" class of defect the
 * v3.9 patch engine exists to prevent). A short-lived timestamp stamp gives
 * the declarative views the missing event dimension:
 *
 *   1. The moment the good thing happens (an action handler, a counter
 *      completing a cycle), call markCelebration(key).
 *   2. While rendering, views ask wasCelebrated(key) — true only inside the
 *      celebration window — and decorate the element with the `celebrate`
 *      CSS class (see assets/css/animations.css).
 *   3. Once the window passes, the class simply stops being added, so later
 *      re-renders of the same subtree can never re-run the bloom. The
 *      celebration belongs to the moment, not to the element.
 *
 * No DOM access, no persistence, no timers of its own — pure bookkeeping.
 */

const DEFAULT_WINDOW_MS = 1200;
const PRUNE_AFTER_MS = 5000;
const MAX_ENTRIES = 64;

const stampedAt = new Map();

/**
 * (v5.2.0) Tasbih milestone pings ("buzz every Nth count"). Pure: true
 * exactly when `count` is a positive multiple of `every`. `every <= 0`
 * (the "off" setting) never fires; garbage inputs never fire.
 */
export function milestoneHit(count, every) {
  const c = Number(count);
  const e = Number(every);
  if (!Number.isFinite(c) || !Number.isFinite(e)) return false;
  if (!Number.isInteger(c) || !Number.isInteger(e)) return false;
  if (c <= 0 || e <= 0) return false;
  return c % e === 0;
}

/** Stamp `key` as celebrated right now. */
export function markCelebration(key) {
  const now = Date.now();
  stampedAt.set(key, now);
  // Opportunistic pruning so the map can never grow unbounded, mirroring
  // the tasbih flash registry this module generalizes.
  if (stampedAt.size > MAX_ENTRIES) {
    for (const [k, at] of stampedAt) {
      if (now - at > PRUNE_AFTER_MS) stampedAt.delete(k);
    }
  }
}

/**
 * True when `key` was celebrated within the last `ms` milliseconds
 * (default 1200). Deterministic in the trivial sense the tests rely on:
 * a zero/negative window is never true, a huge window is true right after
 * a mark.
 */
export function wasCelebrated(key, ms = DEFAULT_WINDOW_MS) {
  const at = stampedAt.get(key);
  return typeof at === 'number' && Date.now() - at < ms;
}

/** Test/teardown hook — forget every stamp. Not used by the app. */
export function clearCelebrations() {
  stampedAt.clear();
}
