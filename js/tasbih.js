/**
 * tasbih.js
 * All counting / cycle-completion logic in one place, used both by the
 * per-card counter (in Focus Mode / library cards) and the standalone
 * Tasbih screen. No DOM access here — the renderer calls into this and
 * reflects the result.
 */

import { store, actions } from './state.js';
import { vibrate } from './utils.js';
import { t } from './i18n.js';

/**
 * Increment the counter for an item. Handles cycle completion and dispatches
 * both the counter update and a statistics record.
 * Returns the new counter object.
 */
export function increment(itemId, categoryId, target = 1, step = 1) {
  const state = store.getState();
  const existing = state.counters[itemId] || { count: 0, target, completedCycles: 0 };
  let count = existing.count + step;
  let completedCycles = existing.completedCycles;
  let cycleCompleted = false;

  if (count >= existing.target) {
    completedCycles += 1;
    count = 0;
    cycleCompleted = true;
  }

  // v3.7 FIX: one tap used to mean THREE synchronous full-app re-renders
  // (counter → statistics → history each notified subscribers on its own).
  // Batching makes the whole tap one logical update — exactly one render.
  store.batch(() => {
    store.dispatch(actions.setCounter(itemId, { count, target: existing.target, completedCycles }));
    store.dispatch(actions.recordStatistic(itemId, categoryId, step, false));
    store.dispatch(actions.pushHistory(itemId, categoryId));
  });

  if (cycleCompleted) markJustCompleted(itemId);
  if (state.settings.hapticsEnabled) vibrate(cycleCompleted ? [10, 40, 10] : 8);
  announceCount(count, existing.target, cycleCompleted, completedCycles);

  return { count, target: existing.target, completedCycles, cycleCompleted };
}

/* ------------------------------------------------------------------ *
 * Transient "just completed" feedback.
 * The render model is full re-render per state change, so a CSS pulse
 * keyed off ephemeral store state would be erased by every later render.
 * Instead a short-lived in-memory stamp lets any view currently rendering
 * this item decorate it with the completion animation; the class simply
 * stops being added once the window passes.
 * ------------------------------------------------------------------ */
const JUST_COMPLETED_MS = 700;
const justCompletedAt = new Map();

function markJustCompleted(itemId) {
  const now = Date.now();
  justCompletedAt.set(itemId, now);
  // Opportunistic pruning so the map can never grow unbounded.
  if (justCompletedAt.size > 64) {
    for (const [k, at] of justCompletedAt) {
      if (now - at > JUST_COMPLETED_MS) justCompletedAt.delete(k);
    }
  }
}

/** True within JUST_COMPLETED_MS of this item's most recent completed cycle. */
export function wasJustCompleted(itemId) {
  const at = justCompletedAt.get(itemId);
  return typeof at === 'number' && Date.now() - at < JUST_COMPLETED_MS;
}

/**
 * Screen readers won't reliably announce a counter change when the whole
 * view around it gets replaced via innerHTML on every render, since that
 * reads as "new content" rather than a live update. This region lives
 * outside #main (see index.html) specifically so it survives re-renders
 * and screen readers treat updates to it as genuine live-region changes.
 */
function announceCount(count, target, cycleCompleted, completedCycles) {
  const el = document.getElementById('counter-announcer');
  if (!el) return;
  const lang = store.getState().settings.language;
  el.textContent = cycleCompleted
    ? t('a11y.counterComplete', lang, { n: completedCycles })
    : t('a11y.counterProgress', lang, { count, target });
}

export function reset(itemId, target = 1) {
  store.dispatch(actions.resetCounter(itemId, target));
}

export function setTarget(itemId, target) {
  const state = store.getState();
  const existing = state.counters[itemId] || { count: 0, completedCycles: 0 };
  store.dispatch(actions.setCounter(itemId, { count: existing.count, target, completedCycles: existing.completedCycles }));
}

export function getCounter(itemId, fallbackTarget = 33) {
  const state = store.getState();
  return state.counters[itemId] || { count: 0, target: fallbackTarget, completedCycles: 0 };
}

/** A short WebAudio "click" used as the optional tasbih sound, generated in-memory (no asset file needed). */
let audioCtx = null;
export function playTick(kind = 'tick') {
  const state = store.getState();
  if (!state.settings.soundEnabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'complete' ? 660 : 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (kind === 'complete' ? 0.35 : 0.09));
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (kind === 'complete' ? 0.4 : 0.12));
  } catch { /* audio unavailable, ignore silently */ }
}
