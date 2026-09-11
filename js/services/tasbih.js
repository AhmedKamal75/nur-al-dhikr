/**
 * tasbih.js
 * All counting / cycle-completion logic in one place, used both by the
 * per-card counter (in Focus Mode / library cards) and the standalone
 * Tasbih screen. No DOM access here — the renderer calls into this and
 * reflects the result.
 */

import { store, actions } from '../core/state.js';
import { vibrate, dateKey } from '../core/utils.js';
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
  // The rendered pill shows the EFFECTIVE target (manage overrides) — the
  // stored one goes stale the moment the stepper moves, so the passed-in
  // target wins and the record is healed to match it.
  const argTarget = Math.floor(Number(target));
  const effTarget =
    Number.isFinite(argTarget) && argTarget >= 1
      ? argTarget
      : Math.floor(Number(existing.target)) >= 1
        ? Math.floor(Number(existing.target))
        : 1;
  let count = existing.count + step;
  let completedCycles = existing.completedCycles;
  let cycleCompleted = false;

  if (count >= effTarget) {
    completedCycles += 1;
    count = 0;
    cycleCompleted = true;
  }

  // v3.7 FIX: one tap used to mean THREE synchronous full-app re-renders
  // (counter → statistics → history each notified subscribers on its own).
  // Batching makes the whole tap one logical update — exactly one render.
  // (v5.2.25) completions stamp the day: "completed today" (home feed
  // dedup, category % indicator) reads this field, never the lifetime
  // cycles. The COUNTER_SET merge preserves it on later taps.
  store.batch(() => {
    store.dispatch(
      actions.setCounter(itemId, {
        count,
        target: effTarget,
        completedCycles,
        ...(cycleCompleted ? { lastCompletedDay: dateKey(new Date()) } : null),
      })
    );
    store.dispatch(actions.recordStatistic(itemId, categoryId, step, false));
    store.dispatch(actions.pushHistory(itemId, categoryId));
  });

  if (cycleCompleted) markJustCompleted(itemId);
  // (v5.2.0) Milestone ping: the tasbihMilestone setting (0 = off) buzzes
  // + ticks every N counts so long sessions get rhythm feedback. Skipped on
  // the tap that completes a cycle — that tap already gets the completion
  // pattern, and two patterns on one tap would blur together.
  const milestone = !cycleCompleted && milestoneHit(count, state.settings.tasbihMilestone);
  // (v5.2.25) typeof-guards: unit tests drive increment() in node, where
  // navigator/document don't exist — silence, never throw.
  if (state.settings.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    if (cycleCompleted) vibrate([10, 40, 10]);
    else if (milestone) vibrate([20, 60, 20]);
    else vibrate(8);
  }
  if (milestone) playTick('milestone');
  announceCount(count, effTarget, cycleCompleted, completedCycles);

  return { count, target: effTarget, completedCycles, cycleCompleted };
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
  if (typeof document === 'undefined') return;
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
