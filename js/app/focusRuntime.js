/**
 * app/focusRuntime.js — Focus-mode runtime: keyboard navigation and the
 * single pending auto-advance timer (v3.7 race fix).
 */

import { rt } from './rt.js';
import { getItemEntry } from './shared.js';
import { VIEWS } from '../core/config.js';
import { go } from '../core/router.js';
import { store } from '../core/state.js';
import { isModalOpen } from '../ui/modal.js';

export function handleFocusKeydown(e) {
  const state = store.getState();
  if (state.activeView !== VIEWS.FOCUS) return;
  // (v4.2) a modal (card menu, collection picker…) takes ALL keys: Escape
  // used to double-fire — closing the modal AND navigating out of Focus to
  // the category — and the arrows silently moved the background view while
  // the dialog was up. Same rule the drawer already follows.
  if (isModalOpen()) return;
  if (e.key === 'ArrowRight') navigateFocusAdjacent(1);
  else if (e.key === 'ArrowLeft') navigateFocusAdjacent(-1);
  else if (e.key === ' ' || e.key === 'Enter') {
    const btn = document.querySelector('.focus__counter');
    if (btn && document.activeElement !== btn) {
      e.preventDefault();
      btn.click();
    }
  } else if (e.key === 'Escape') {
    go(VIEWS.CATEGORY, { id: state.activeParams.id });
  }
}

export function navigateFocusAdjacent(dir) {
  const state = store.getState();
  const categoryId = state.activeParams.id;
  const itemId = state.activeParams.subId;
  const entry = getItemEntry(itemId);
  if (!entry) return;
  const items = [...entry.category.items].sort((a, b) => a.order - b.order);
  const idx = items.findIndex((i) => i.id === itemId);
  const target = items[idx + dir];
  if (target) go(VIEWS.FOCUS, { id: categoryId, subId: target.id });
}

/* v3.7 FIX — auto-advance used to stack one anonymous setTimeout per
 * cycle completion with no cancellation. Two completions in quick succession
 * (small-target zikr chains tap fast by nature) armed TWO timers: the first
 * advanced to the next item, the second fired after that and advanced AGAIN —
 * landing on next-next and skipping the item in between entirely.
 *
 * Now a single pending timer exists at most ever; scheduling clears any prior
 * one, and when it fires it re-checks that the user is still on EXACTLY the
 * item/view the completion happened on, so a stale timer can never yank the
 * view away from somewhere new. */
export function scheduleAutoAdvance() {
  const origin = store.getState();
  const from = {
    view: origin.activeView,
    id: String(origin.activeParams?.id ?? ''),
    subId: String(origin.activeParams?.subId ?? ''),
  };
  clearTimeout(rt.pendingAutoAdvanceTimer);
  rt.pendingAutoAdvanceTimer = setTimeout(() => {
    rt.pendingAutoAdvanceTimer = null;
    const now = store.getState();
    if (now.activeView !== from.view) return;
    if (String(now.activeParams?.id ?? '') !== from.id) return;
    if (String(now.activeParams?.subId ?? '') !== from.subId) return;
    navigateFocusAdjacent(1);
  }, 550);
}
