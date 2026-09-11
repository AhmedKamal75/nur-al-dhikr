/**
 * domain/completedCards.js — session-only memory for finished counters
 * (v5.2.24, counter-flow wave).
 *
 * Reaching a card's target used to leave the done card sitting in every
 * list. Now the completed card plays an exit animation and vanishes,
 * letting the next supplication slide up — the routine-checklist feel.
 * Dismissal is SESSION memory (a module Set, never persisted, never
 * synced): a reload brings done cards back in their resting ✓ state,
 * which is the honest behavior — nothing completed is ever lost, the
 * counters and statistics are untouched, only the list presentation
 * rests for the session.
 *
 * DOM-free: app/handlers/items.js writes, ui/card.js reads. The handoff
 * between the synchronous re-render and the animation end is a timestamp
 * (`noteCompleted` opens a short exiting window the template renders as
 * `.card--exiting`; the handler's timer dismisses + removes the node).
 */

const EXITING_WINDOW_MS = 700;

const dismissed = new Set();
const completedAt = new Map();

/** True when this item was dismissed after completing its target. */
export function isDismissed(itemId) {
  return dismissed.has(itemId);
}

/** Dismiss a completed card for the rest of the session. */
export function dismissCompleted(itemId) {
  if (itemId != null) dismissed.add(itemId);
}

/** Open the exit-animation window for a freshly completed item. */
export function noteCompleted(itemId) {
  if (itemId != null) completedAt.set(itemId, Date.now());
  dismissed.delete(itemId);
}

/** True inside the exit-animation window after a completion. */
export function wasCompletedRecently(itemId, now = Date.now()) {
  const at = completedAt.get(itemId);
  return at != null && now - at < EXITING_WINDOW_MS;
}

/** Forget all session dismissals (tests; a reload does this naturally). */
export function clearDismissed() {
  dismissed.clear();
  completedAt.clear();
}
