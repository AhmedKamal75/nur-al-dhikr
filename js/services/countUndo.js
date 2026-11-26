/**
 * countUndo.js — "Undo last tap" (v5.17.182, C14): one-level undo of the
 * most recent count tap, live for UNDO_WINDOW_MS on the view where the
 * tap happened (Tasbih and Focus render the control; other surfaces only
 * hold the ticket until it expires or is replaced).
 *
 * services/tasbih.js increment() records the ticket with the EXACT
 * applied amounts, so a tap that hit a saturation cap rewinds only what
 * it actually added. The rewind itself is the COUNT_TAP_UNDO reducer in
 * state/slices/library.js — counter plus counting statistics (per-day and
 * lifetime, streak recomputed) in one dispatch.
 *
 * Deliberate limits (disclosed in the release notes): the tap's history
 * entry, the reading position and the day's itemIds stay — the undo
 * rewinds counting, not the record that the reading happened.
 */

import { store, actions } from '../core/state.js';
import { clearCelebration } from '../domain/celebrate.js';
import { t } from '../core/i18n.js';

export const UNDO_WINDOW_MS = 60000;

/** The live undoable ticket for a view surface, or null (expired / other view / none). */
export function getUndoableTap(surface, now = Date.now()) {
  const tap = store.getState().lastCountTap;
  if (!tap || tap.surface !== surface) return null;
  return now - tap.ts < UNDO_WINDOW_MS ? tap : null;
}

let expiryTimer = null;

/**
 * Hide the control once the window passes. The clear is ticket-stamped so
 * a newer tap's timer never retires an older tap's replacement ticket.
 * unref'd: unit tests drive increment() in node by the hundred.
 */
export function scheduleExpiry(ts) {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    expiryTimer = null;
    store.dispatch(actions.clearCountTap(ts));
  }, UNDO_WINDOW_MS + 250);
  if (typeof expiryTimer.unref === 'function') expiryTimer.unref();
}

/**
 * Undo the current view's live ticket. Returns false (no-op) when there
 * is nothing to undo here — expired window, other view's tap, or none.
 */
export function undoLastTap() {
  const state = store.getState();
  const tap = getUndoableTap(state.activeView);
  if (!tap) return false;
  store.dispatch(actions.undoCountTap());
  // A retracted completion keeps no celebration pulse (planner HOLD fix).
  if (tap.cycleCompleted) clearCelebration(`tasbih:${tap.itemId}`);
  // The undo is announced through the same live region as the counts
  // themselves (#counter-announcer survives re-renders; a second region
  // on the button would double-announce).
  if (typeof document !== 'undefined') {
    const el = document.getElementById('counter-announcer');
    if (el) el.textContent = t('a11y.countUndone', store.getState().settings.language);
  }
  return true;
}
