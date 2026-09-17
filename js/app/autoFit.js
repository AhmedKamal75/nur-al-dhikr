/**
 * app/autoFit.js — (v5.4.0, P0-3 — ported from the v5.3.0 audit,
 * replacing the v5.2.87 dispatch-based fit engine) the Mushaf
 * fullscreen auto-fit engine.
 *
 * Contract (docs/APP-FLOW.md §fullscreen): in TRUE fullscreen the page
 * must fit the viewport with ZERO vertical overflow on every device —
 * the printed mushaf is a fixed page, and vertical scrolling a page is
 * the failure mode this engine exists to kill. Horizontal page-flip
 * (swipe, arrows, keyboard) is the ONLY navigation inside fullscreen.
 *
 * How it works, honestly:
 *  1. computeFitScale() — pure, unit-tested binary search: given the
 *     box height and a monotonic heightAt(scale) measure callback, find
 *     the largest scale in [FIT_MIN, FIT_MAX] whose page height fits.
 *  2. The DOM half measures the REAL page: it writes a trial
 *     --mushaf-fit-scale on each page wrap, reads back the scrollHeight
 *     of every text block inside, and binary-searches between renders
 *     (a handful of layout reads per fit, rAF-throttled). A spread
 *     fits its TIGHTEST page — one scale per wrap, min across texts.
 *  3. Fullscreen is a "fit the page" mode: the committed scale is the
 *     measured fill, clamped to [FIT_MIN, FIT_MAX] — NOT min() with the
 *     slider. (v5.4.0 capped the render at prefs.fontScale, so at the
 *     default slider the text could never grow past 1.0 and short pages
 *     sat half-empty by formula.) prefs.fontScale stays the single
 *     source of truth for INTENT in windowed mode (pinch / ctrl+wheel /
 *     the Settings slider all dispatch updateMushafPrefs({ fontScale }),
 *     applied the moment fullscreen exits); inside fullscreen the page
 *     owns the scale, exactly like a printed page owns its type size.
 *
 * Side effects only here (view = pure template): a ResizeObserver on the
 * page wrap + resize/orientation listeners, all removed on deactivate;
 * the store subscription decides when the engine runs (mushafFullscreen
 * on the mushaf view with a loaded page).
 */
import { VIEWS } from '../core/config.js';

export const FIT_MIN = 0.6;
export const FIT_MAX = 2.2;

/**
 * Largest scale in [min, max] whose measured height fits boxHeight.
 * `heightAt(scale)` must be monotonic non-decreasing (real text layout
 * is); after FIT_ITERATIONS bisection steps the interval is < 0.01.
 * Returns the scale, NOT clamped to the user's intent — the caller does
 * that (min with prefs), so pinch-down to 0.6 still fits honestly.
 */
export function computeFitScale(
  boxHeight,
  heightAt,
  { min = FIT_MIN, max = FIT_MAX, iterations = 8 } = {}
) {
  const box = Math.max(0, Number(boxHeight) || 0);
  if (!box || typeof heightAt !== 'function') return min;
  const h = (s) => Math.max(0, Number(heightAt(s)) || 0);
  // Everything fits even at the max → the max is the honest answer.
  if (h(max) <= box) return max;
  // Nothing ever fits (monotonic text can't) → still return the floor.
  if (h(min) > box) return min;
  let lo = min;
  let hi = max;
  for (let i = 0; i < iterations && hi - lo > 0.01; i += 1) {
    const mid = (lo + hi) / 2;
    if (h(mid) <= box) lo = mid;
    else hi = mid;
  }
  return lo;
}

/* ------------------------------------------------------------------ */
/* DOM side of the engine (activated only in fullscreen sessions)      */
/* ------------------------------------------------------------------ */

let active = false;
let resizeObserver = null;
let refreshTimer = null;
let rafPending = false;

function pageWrapEls() {
  const scoped = document.querySelectorAll('[data-mushaf-fs] .mushaf-page-wrap');
  if (scoped.length) return [...scoped];
  const any = document.querySelectorAll('.mushaf-page-wrap');
  return [...any];
}

/** One honest measurement: write the trial scale as the fit var (the
 *  stylesheet consumes --mushaf-fit-scale FIRST, falling back to the
 *  user's inline scale), then read the natural content height. The
 *  scrollHeight read forces a synchronous reflow, so the trial value
 *  is genuinely laid out before measuring — never estimated. */
function measureAt(wrap, textEl, trialScale) {
  wrap.style.setProperty('--mushaf-fit-scale', String(trialScale));
  return textEl ? textEl.scrollHeight : 0;
}

/**
 * Fit ONE wrap: usable box = wrap height minus its head/footer chrome;
 * the committed scale is the tightest fitting scale across every text
 * block it holds (a spread's denser page governs). Returns the committed
 * scale, or null when nothing was measurable (wrap too small, no text).
 *
 * Two guards keep the fixed point honest:
 *  - the box never exceeds the viewport height: if CSS ever lets the
 *    chain grow past the screen again, the engine fits the SCREEN, not
 *    its own runaway box (observed: 1571px wrap "filled" at 0.92 while
 *    the viewport showed overflow);
 *  - NO tolerance is subtracted from the box: scrollHeight can never
 *    read below clientHeight, so box = client − 2 fails EVERY trial and
 *    pins the engine at the floor (observed: all pages at 0.6). The
 *    zero-overflow guarantee instead comes from committing one
 *    bisection step BELOW the found scale (FIT_STEP_DOWN) — a ~0.4px
 *    font undershoot, invisible, while binary precision alone could
 *    strand ~1px of overflow against a zero budget.
 */
const FIT_STEP_DOWN = 0.015;

function fitOneWrap(wrap) {
  const texts = [...wrap.querySelectorAll('.mushaf-page__text')];
  if (!texts.length) return null;
  // (v5.6.0) the box is the TEXT's own constrained height
  // (clientHeight — the flex column clamps it; only scrollHeight moves
  // with the trial scale). Measuring wrap-minus-chrome instead
  // over-counted by the page paddings (~50px) and left real overflow.
  // clientHeight is trial-invariant, so the bisection fixed point is
  // the true one; a hidden sheet reports 0 and is skipped, never
  // pinning its wrap at a fake max.
  let tightest = FIT_MAX;
  let measured = false;
  for (const textEl of texts) {
    let box = textEl.clientHeight;
    // Belt and braces: the box can never honestly exceed the viewport
    // (a CSS regression that lets the chain grow again must not become
    // a runaway fixed point — the engine fits the screen, not itself).
    if (typeof window !== 'undefined' && Number.isFinite(window.innerHeight)) {
      box = Math.min(box, window.innerHeight);
    }
    if (!(box > 40)) continue;
    const heightAt = (scale) => measureAt(wrap, textEl, scale);
    if (!(heightAt(1) > 0)) continue;
    measured = true;
    const fit = computeFitScale(box, heightAt, { min: FIT_MIN, max: FIT_MAX });
    if (fit < tightest) tightest = fit;
  }
  if (!measured) return null;
  const effective = Math.min(
    FIT_MAX,
    Math.max(FIT_MIN, Math.round((tightest - FIT_STEP_DOWN) * 1000) / 1000)
  );
  // Commit: the fit var wins over the user var in fullscreen (min()
  // semantics deliberately NOT applied here — see the header contract).
  wrap.style.setProperty('--mushaf-fit-scale', String(effective));
  return effective;
}

/** Run the bounded bisection against the live DOM and commit each wrap's
 *  result as --mushaf-fit-scale (the CSS var the stylesheet prefers). */
export function refreshMushafFit() {
  if (!active) return;
  const wraps = pageWrapEls();
  if (!wraps.length) return;
  for (const wrap of wraps) {
    // Re-observe the live node every pass: the string→DOM patch may have
    // replaced the sheet after our last run — observing a dead node
    // would stall the loop one resize away from the fixed point.
    if (resizeObserver) {
      try {
        resizeObserver.observe(wrap);
      } catch {
        /* a dead node throws on observe — the next pass re-queries */
      }
    }
    fitOneWrap(wrap);
  }
}

/** rAF-coalesced refresh (resize storms coalesce to one fit per frame). */
function scheduleFitRefresh() {
  if (!active || rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    refreshMushafFit();
  });
}

export function activateMushafAutoFit() {
  if (active) {
    scheduleFitRefresh();
    return;
  }
  active = true;
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => scheduleFitRefresh());
    for (const wrap of pageWrapEls()) resizeObserver.observe(wrap);
  }
  window.addEventListener('resize', scheduleFitRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleFitRefresh, { passive: true });
  // Fonts arriving late (first paint of a fresh face) change metrics.
  if (document.fonts?.ready?.then) {
    document.fonts.ready.then(() => scheduleFitRefresh()).catch(() => {});
  }
  scheduleFitRefresh();
}

export function deactivateMushafAutoFit() {
  if (!active) return;
  active = false;
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', scheduleFitRefresh);
  window.removeEventListener('orientationchange', scheduleFitRefresh);
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  const wraps = pageWrapEls();
  for (const wrap of wraps) wrap.style.removeProperty('--mushaf-fit-scale');
}

/** Store-subscription hook (called per dispatch from app/stateSub.js):
 *  the engine owns exactly one lifecycle — fullscreen mushaf with a
 *  loaded page. Anything else tears it down and clears its var. */
export function updateMushafAutoFitLifecycle(state) {
  const shouldRun = state.mushafFullscreen === true && state.activeView === VIEWS.MUSHAF;
  if (shouldRun) activateMushafAutoFit();
  else deactivateMushafAutoFit();
}
