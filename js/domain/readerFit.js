/**
 * readerFit.js — (v5.2.87, P0-3) pure math for the fullscreen no-scroll
 * auto-fit engine. The Mushaf page clips (`overflow: hidden`), so "fits"
 * means `contentH <= viewportH` on the `.mushaf-page` box; content height
 * scales linearly with `--mushaf-font-scale`, which makes the fit a direct
 * ratio rather than a measured binary search (same fixed point, no layout
 * thrash). No DOM here — callers pass measured numbers in and dispatch
 * the returned scale through `updateMushafPrefs({ fontScale })`, the
 * single source of truth. Wiring + loop guards live in app/fullscreen.js.
 */
import { clamp } from '../core/utils.js';

/** Spec bounds: the fit never leaves the sanitized pref range. */
export const MUSHAF_FIT_MIN = 0.6;
export const MUSHAF_FIT_MAX = 2.2;
/** Step quantization + hysteresis band: sub-step deltas never dispatch,
 *  which is what keeps measure→dispatch→re-render→measure convergent. */
export const MUSHAF_FIT_STEP = 0.05;
/** 1px tolerance: sub-pixel rounding must not count as overflow. */
export const MUSHAF_FIT_TOLERANCE_PX = 1;

/**
 * Compute the font scale that fits `contentH` into `viewportH`.
 *
 * `anchor` is the person's preferred scale (pref at page entry): the fit
 * only ever *reduces* toward what fits and restores toward the anchor when
 * the estimate proves it fits — it never invents a larger size.
 * `current` is the applied scale. Returns `{ scale, changed }`; callers
 * dispatch only when `changed` is true.
 *
 * Convergence (no oscillation): shrink targets quantize down to STEP and
 * verify on the next pass; growth happens only when the linear estimate
 * proves the anchor fits, and a wrong estimate shrinks straight back to a
 * stable point — at most 3 dispatches to a fixed point, then silence.
 */
export function computeFitScale({
  viewportH,
  contentH,
  current,
  anchor,
  min = MUSHAF_FIT_MIN,
  max = MUSHAF_FIT_MAX,
  step = MUSHAF_FIT_STEP,
} = {}) {
  const noChange = (scale) => ({ scale, changed: false });
  const vh = Number(viewportH);
  const ch = Number(contentH);
  let cur = Number(current);
  let anch = Number(anchor);
  // Hostile/zero measurements measure nothing — never dispatch on them.
  if (!Number.isFinite(vh) || vh <= 0 || !Number.isFinite(ch) || ch <= 0) {
    return noChange(Number.isFinite(cur) ? cur : 1);
  }
  if (!Number.isFinite(cur)) cur = 1;
  if (!Number.isFinite(anch)) anch = cur;
  const lo = Number.isFinite(min) ? min : MUSHAF_FIT_MIN;
  const hi = Number.isFinite(max) ? max : MUSHAF_FIT_MAX;
  const st = Number.isFinite(step) && step > 0 ? step : MUSHAF_FIT_STEP;

  let target;
  if (ch <= vh + MUSHAF_FIT_TOLERANCE_PX) {
    // Fits at the current scale.
    if (cur >= anch - 1e-9) {
      target = anch; // at/above preference: converge exactly onto it.
    } else {
      // Previously shrunk: regrow only when the linear estimate proves
      // the anchor itself fits (estimate-then-verify converges; blind
      // regrowth would oscillate shrink→grow→shrink).
      const estimatedAtAnchor = ch * (anch / cur);
      target = estimatedAtAnchor <= vh + MUSHAF_FIT_TOLERANCE_PX ? anch : cur;
    }
  } else {
    // Overflows: the exact linear solution from the CURRENT measurement
    // (content scales with the applied scale), floored to STEP so the
    // result undershoots into fitting — verified, not ratcheted, on the
    // next pass, so this lands within one step and then goes silent.
    const solved = (cur * vh) / ch;
    target = Math.floor(solved / st) * st;
  }
  target = clamp(target, lo, hi);
  // Round to 3dp: float dust (0.30000000000000004) must not read as change.
  target = Math.round(target * 1000) / 1000;
  if (Math.abs(target - cur) < st / 2) return noChange(cur);
  return { scale: target, changed: true };
}
