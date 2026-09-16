/**
 * tests/reader-autofit.test.js — (v5.2.87, P0-3) fullscreen no-scroll
 * auto-fit engine. The DOM wiring (ResizeObserver → dispatch) lives in
 * app/fullscreen.js and is verified by lint + live measurement; these
 * tests pin the pure core in js/domain/readerFit.js: shrink-to-fit,
 * anchor restore, hostile-input silence, hysteresis, and fixed-point
 * convergence (no dispatch oscillation).
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeFitScale,
  MUSHAF_FIT_MIN,
  MUSHAF_FIT_MAX,
  MUSHAF_FIT_STEP,
} from '../js/domain/readerFit.js';

describe('readerFit: bounds + hostile input', () => {
  test('exports the spec range 0.6–2.2 in 0.05 steps', () => {
    assert.equal(MUSHAF_FIT_MIN, 0.6);
    assert.equal(MUSHAF_FIT_MAX, 2.2);
    assert.equal(MUSHAF_FIT_STEP, 0.05);
  });

  test('zero/non-finite measurements never dispatch', () => {
    for (const bad of [
      { viewportH: 0, contentH: 500, current: 1, anchor: 1 },
      { viewportH: 800, contentH: 0, current: 1, anchor: 1 },
      { viewportH: NaN, contentH: 500, current: 1, anchor: 1 },
      { viewportH: 800, contentH: -3, current: 1, anchor: 1 },
      {},
    ]) {
      const r = computeFitScale(bad);
      assert.equal(r.changed, false, JSON.stringify(bad));
    }
  });
});

describe('readerFit: shrink-to-fit', () => {
  test('overflow shrinks proportionally, floored to step', () => {
    // 1200px of content in an 800px box at scale 1 → 800/1200 = 0.666…
    // floored to 0.65.
    const r = computeFitScale({ viewportH: 800, contentH: 1200, current: 1, anchor: 1 });
    assert.equal(r.changed, true);
    assert.equal(r.scale, 0.65);
  });

  test('shrink solves off the current measurement and stays in range', () => {
    // 2000px of content at scale 0.7 in an 800px box: 0.7*800/2000 = 0.28
    // floored to 0.25, clamped up to the 0.6 floor.
    const r = computeFitScale({ viewportH: 800, contentH: 2000, current: 0.7, anchor: 1 });
    assert.equal(r.scale, 0.6);
    assert.ok(r.scale >= MUSHAF_FIT_MIN && r.scale <= MUSHAF_FIT_MAX);
  });

  test('undisplayable pages pin at min and go silent (honest floor)', () => {
    const r = computeFitScale({ viewportH: 400, contentH: 4000, current: 0.6, anchor: 1 });
    assert.equal(r.scale, MUSHAF_FIT_MIN);
    assert.equal(r.changed, false, 'already at the floor: no dispatch loop');
  });
});

describe('readerFit: restore + hysteresis', () => {
  test('fitting content converges exactly onto the anchor', () => {
    const r = computeFitScale({ viewportH: 800, contentH: 700, current: 1.15, anchor: 1 });
    assert.deepEqual(r, { scale: 1, changed: true });
  });

  test('fitting content at the anchor is silent', () => {
    const r = computeFitScale({ viewportH: 800, contentH: 700, current: 1, anchor: 1 });
    assert.equal(r.changed, false);
  });

  test('sub-step deltas never dispatch', () => {
    // Would compute 1.02… — inside the hysteresis band around 1.
    const r = computeFitScale({ viewportH: 800, contentH: 790, current: 1, anchor: 1.02 });
    assert.equal(r.changed, false);
  });

  test('shrunk state regrows only when the estimate proves the anchor fits', () => {
    // Fits now at 0.7; at anchor 1.0 the estimate (700/0.7*1.0 = 1000)
    // overflows 800 → hold (no blind regrow → no oscillation).
    const hold = computeFitScale({ viewportH: 800, contentH: 700, current: 0.7, anchor: 1 });
    assert.equal(hold.changed, false);
    assert.equal(hold.scale, 0.7);
    // Same geometry after a rotation (viewport 1100): estimate fits → grow.
    const grow = computeFitScale({ viewportH: 1100, contentH: 700, current: 0.7, anchor: 1 });
    assert.deepEqual(grow, { scale: 1, changed: true });
  });

  test('iterated passes reach a fixed point in <= 3 dispatches', () => {
    // Simulate the measure→dispatch→re-render→measure loop with exact
    // linear reflow: content scales with the applied scale.
    let current = 1;
    const anchor = 1.2;
    const vh = 800;
    const baseContent = 1200; // content height at scale 1 (fits at 0.6)
    let dispatches = 0;
    for (let i = 0; i < 10; i += 1) {
      const contentH = (baseContent * current) / 1;
      const r = computeFitScale({ viewportH: vh, contentH, current, anchor });
      if (!r.changed) break;
      current = r.scale;
      dispatches += 1;
    }
    assert.ok(dispatches <= 3, `converged in ${dispatches} dispatches`);
    assert.ok((baseContent * current) / 1 <= vh + 1, 'final state fits');
  });
});
