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

/**
 * (v5.2.74, UX-01) the text column a full-page swipe naturally starts on.
 * Every .mushaf-ayah/.qword span carries a data-action for CLICK
 * delegation — the bare [data-action] guard above aborted swipe tracking
 * for touches originating on the text itself, so turns only registered
 * from margins and medallions. A drag never fires a click, so these
 * surfaces are exempt from the data-action rule (true controls keep
 * theirs — checked first in isSwipeGuardTarget).
 */
export const SWIPE_TEXT_SURFACE_SELECTOR = '.mushaf-ayah, .qword';

/** True when a touch originates on a guarded control surface (see above). */
export function isSwipeGuardTarget(el) {
  if (!el || typeof el.closest !== 'function') return false;
  try {
    // True controls and overlays always win — even over the text-surface
    // exemption below (a word-tap span inside a modal/sheet must never
    // turn the page behind it).
    if (
      el.closest(
        'button, a, input, select, textarea, [contenteditable="true"], ' +
          '.player-bar, .mushaf-fs-console, .mushaf-fs-controls, .mushaf-nav, ' +
          '.topbar, .modal, .sheet, .nav-drawer'
      ) != null
    ) {
      return true;
    }
    if (el.closest(SWIPE_TEXT_SURFACE_SELECTOR) != null) return false;
    return el.closest('[data-action]') != null;
  } catch {
    return false;
  }
}

/**
 * Find the touch with the tracked identifier in a TouchList (or array).
 * Multi-touch safety: a second finger's touchend must never be measured
 * against the first finger's touchstart — that mismatch produced phantom
 * page turns and phantom player minimizes on real phones. Returns the
 * Touch or null. Null-safe for hostile input.
 */
export function findTouch(touches, identifier) {
  if (touches == null || identifier == null) return null;
  try {
    // Real TouchList: length + item(), NO namedItem (that check rejected
    // every real list — phantom no-turns). Strict identifier lookup, no
    // item(0) fallback.
    if (typeof touches.length === 'number' && typeof touches.item === 'function') {
      for (let i = 0; i < touches.length; i += 1) {
        if (touches.item(i)?.identifier === identifier) return touches.item(i);
      }
      return null;
    }
    if (Array.isArray(touches)) return touches.find((tt) => tt?.identifier === identifier) ?? null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Finger-following paper drag (v5.17.4, real-phone pass). The book follows
 * the finger while a page-turn swipe is in flight — translateX tracks dx
 * one-to-one (direction-agnostic, always under the finger) with a small
 * scale dip for lift-off-the-page feel. Pure numbers: the caller owns the
 * DOM writes (direct style, no store churn at 60Hz) and the gating
 * (guarded origin, pinch, vertical scroll, reduced-motion, animation pref).
 *
 * @param {number} dx drag distance in px (signed, screen coords)
 * @param {number} pageWidth layout width of the dragged book in px
 * @returns {{x:number,scale:number,progress:number}|null} null for junk input
 */
export const MUSHAF_DRAG_CLAMP_RATIO = 0.45;
export const MUSHAF_DRAG_LIFT = 0.985;

export function mushafDragStyle(dx, pageWidth) {
  if (!Number.isFinite(dx) || !Number.isFinite(pageWidth) || pageWidth <= 0) return null;
  const max = pageWidth * MUSHAF_DRAG_CLAMP_RATIO;
  const x = Math.max(-max, Math.min(max, dx));
  const progress = Math.abs(x) / max; // 0..1
  return { x, scale: 1 - (1 - MUSHAF_DRAG_LIFT) * progress, progress };
}

/**
 * True for a mostly-vertical DOWNWARD swipe that minimizes the persistent
 * player bar (tap the chevron does the same via player-min-toggle; the X
 * stays the explicit quit). Upward and horizontal drags return false —
 * seeking and scrolling stay intact.
 */
export function isPlayerDismissSwipe(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  if (dy < PLAYER_DISMISS_MIN_DY) return false;
  return Math.abs(dy) > Math.abs(dx);
}

/**
 * (sweep) the minimize control for a swipe-origin bar: the bar's own
 * chevron, or — for the fullscreen transport row, which carries page
 * controls but no player buttons — the sibling console row's. Null-safe
 * for hostile input; the caller no-ops on null, so quiet surfaces
 * (transport with no console) never minimize from a swipe. Stub-friendly:
 * needs only querySelector/parentElement, like the guard above.
 */
export function resolveMinControl(bar) {
  if (!bar || typeof bar.querySelector !== 'function') return null;
  try {
    return (
      bar.querySelector('[data-action="player-min-toggle"]') ??
      bar.parentElement?.querySelector('.mushaf-fs-console [data-action="player-min-toggle"]') ??
      null
    );
  } catch {
    return null;
  }
}
