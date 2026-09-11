/**
 * domain/gestures.js — pure touch-gesture decisions (v5.2.22, bug-report wave).
 *
 * The Mushaf page-turn swipe emulates a physical Arabic book, so its
 * direction is ALWAYS right-to-left book order — a swipe right-to-left
 * (the finger moves left, dx < 0) turns to the NEXT page, a swipe
 * left-to-right (dx > 0) turns to the PREVIOUS page — regardless of the
 * app's own UI language (document.dir). The keyboard page-turn arrows in
 * app/events.js follow the same mapping (ArrowLeft = next page), so keys,
 * buttons, and swipes can never disagree.
 *
 * DOM-free on purpose: events.js feeds it raw deltas plus the touch's
 * target Element (or a { closest } stub in tests), so the mapping and the
 * control-surface guard are pinned by unit tests without a browser.
 */

/** Minimum horizontal travel before a touch counts as a page-turn swipe. */
export const MUSHAF_SWIPE_MIN_PX = 60;

/** Minimum downward travel before a touch counts as a player dismiss. */
export const PLAYER_DISMISS_MIN_DY = 64;

/**
 * 'next' | 'prev' | null for a Mushaf swipe with the given deltas.
 * Short drags and mostly-vertical drags (scrolling) return null.
 */
export function mushafSwipeTurn(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) < MUSHAF_SWIPE_MIN_PX) return null;
  if (Math.abs(dx) < Math.abs(dy)) return null;
  // RTL book order: leftward travel is forward, rightward is back.
  return dx < 0 ? 'next' : 'prev';
}

/**
 * Selector for surfaces whose own tap/scroll semantics must win over a
 * page-turn swipe. Buttons and links (plus anything carrying a data-action)
 * keep their taps; the player bar, the Mushaf consoles, sheets, modals,
 * and the drawer keep their gestures — a swipe starting on any of them
 * must never turn the page underneath.
 */
export const SWIPE_GUARD_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[data-action]',
  '.player-bar',
  '.mushaf-fs-console',
  '.mushaf-fs-controls',
  '.mushaf-nav',
  '.topbar',
  '.modal',
  '.sheet',
  '.nav-drawer',
].join(', ');

/** True when a touch originates on a guarded control surface (see above). */
export function isSwipeGuardTarget(el) {
  if (!el || typeof el.closest !== 'function') return false;
  try {
    return el.closest(SWIPE_GUARD_SELECTOR) != null;
  } catch {
    return false;
  }
}

/**
 * True for a mostly-vertical DOWNWARD swipe that dismisses the persistent
 * mini player (tap the X does the same via data-player-dismiss). Upward
 * and horizontal drags return false — seeking and scrolling stay intact.
 */
export function isPlayerDismissSwipe(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  if (dy < PLAYER_DISMISS_MIN_DY) return false;
  return Math.abs(dy) > Math.abs(dx);
}
