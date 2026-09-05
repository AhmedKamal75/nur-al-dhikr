/**
 * tasbih.js
 * All counting / cycle-completion logic in one place, used both by the
 * per-card counter (in Focus Mode / library cards) and the standalone
 * Tasbih screen. No DOM access here — the renderer calls into this and
 * reflects the result.
 */

import { store, actions } from '../core/state.js';
import { vibrate } from '../core/utils.js';
import { markCelebration, milestoneHit, wasCelebrated } from '../domain/celebrate.js';
import { t } from '../core/i18n.js';
import { getAudioContext } from './audioContext.js';

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
  // (v5.2.0) Milestone ping: the tasbihMilestone setting (0 = off) buzzes
  // + ticks every N counts so long sessions get rhythm feedback. Skipped on
  // the tap that completes a cycle — that tap already gets the completion
  // pattern, and two patterns on one tap would blur together.
  const milestone = !cycleCompleted && milestoneHit(count, state.settings.tasbihMilestone);
  if (state.settings.hapticsEnabled) {
    if (cycleCompleted) vibrate([10, 40, 10]);
    else if (milestone) vibrate([20, 60, 20]);
    else vibrate(8);
  }
  if (milestone) playTick('milestone');
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
 * v3.12: the registry itself was generalized into js/celebrate.js so the
 * khatma verdict, quiz results and the prayer-log day-complete moment use
 * the exact same mechanism; only the keying and the window differ here.
 * ------------------------------------------------------------------ */
const JUST_COMPLETED_MS = 700;

function markJustCompleted(itemId) {
  markCelebration(`tasbih:${itemId}`);
}

/** True within JUST_COMPLETED_MS of this item's most recent completed cycle. */
export function wasJustCompleted(itemId) {
  return wasCelebrated(`tasbih:${itemId}`, JUST_COMPLETED_MS);
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
  store.dispatch(
    actions.setCounter(itemId, {
      count: existing.count,
      target,
      completedCycles: existing.completedCycles,
    })
  );
  // (v4.2) the new target is spoken once — the stepper value span isn't a
  // live region, so silent target changes left screen-reader users
  // counting toward a number they never heard change.
  announceCount(existing.count, target, false, existing.completedCycles);
}

export function getCounter(itemId, fallbackTarget = 33) {
  const state = store.getState();
  return state.counters[itemId] || { count: 0, target: fallbackTarget, completedCycles: 0 };
}

/** A short WebAudio "click" used as the optional tasbih sound, generated in-memory (no asset file needed). */
export function playTick(kind = 'tick') {
  const state = store.getState();
  if (!state.settings.soundEnabled) return;
  try {
    // (v4.2) shared singleton — see services/audioContext.js.
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'complete' ? 660 : kind === 'milestone' ? 990 : 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + (kind === 'complete' ? 0.35 : 0.09)
    );
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (kind === 'complete' ? 0.4 : 0.12));
  } catch {
    /* audio unavailable, ignore silently */
  }
}
