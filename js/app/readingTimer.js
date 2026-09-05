/**
 * app/readingTimer.js — the reading session timer. While the person sits in
 * the Qur'an or Mushaf readers, wall-clock seconds accumulate into today's
 * statistics entry (`dailyHistory[key].readingSec`), shown on the Statistics
 * view. Pure-local, zero network, and honest about its limits: backgrounded
 * tabs freeze timers, so time is only counted while the page is visible and
 * flushed on navigation / tab-hide / pagehide (anything unflushed by a
 * hard crash is simply not counted, never estimated).
 */

import { rt } from './rt.js';
import { VIEWS } from '../core/config.js';
import { actions, store } from '../core/state.js';

const READING_VIEWS = new Set([VIEWS.QURAN, VIEWS.MUSHAF]);

/** Is this a reading view whose time counts? Pure (unit-tested). */
export function isReadingView(view) {
  return READING_VIEWS.has(view);
}

/** Whole seconds between two timestamps, never negative. Pure. */
export function elapsedSeconds(sinceMs, nowMs) {
  const d = Math.floor((Number(nowMs) - Number(sinceMs)) / 1000);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/** Flush the open reading stretch into today's statistics (no-op when idle
 *  or under a second). Called on navigation-away, tab-hide, and pagehide. */
export function flushReading(nowMs = Date.now()) {
  if (rt.readingSince == null) return 0;
  const secs = elapsedSeconds(rt.readingSince, nowMs);
  rt.readingSince = null;
  if (secs < 1) return 0;
  store.dispatch(actions.addReadingSeconds(secs));
  return secs;
}

/**
 * Track the timer across navigation: entering a reading view starts (or
 * keeps) the clock; leaving one flushes. Runs from the store subscriber —
 * same-view param changes (surah turns, page flips) never disturb it.
 */
export function syncReadingTimer(state, action) {
  if (!action || action.type !== 'NAVIGATE') return;
  if (isReadingView(action.view)) {
    if (rt.readingSince == null) rt.readingSince = Date.now();
    return;
  }
  flushReading();
}

/** Test hook: read/reset the open stretch without touching the store. */
export function _readingSinceForTests() {
  return rt.readingSince;
}
