/**
 * reader-window.test.js — v5.2.17 (B12), permanent.
 *
 * The classic reader's window memory was the last module-scoped view
 * state: render mutated it while rendering, so the store, the
 * sanitizers, and the tests could not see it. It is a store slice now;
 * this gate pins the three properties that make the promotion safe:
 * 1. no module latch remains in the view (render is a pure read);
 * 2. the derivation is a fixed point — a second compute over the same
 *    signals returns null, so the subscriber's derive-then-render can
 *    never chase itself (quiet recitation ticks dispatch nothing);
 * 3. the reducer treats the window like every hostile payload: hostile
 *    shapes sanitize, magnitudes cap, no-ops return the same reference.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeReaderWindow,
  expandWindow,
  initialReaderWindow,
  readWindow,
  sanitizeWindow,
  READER_WINDOW_SIZE,
} from '../js/domain/readerWindow.js';
import { store, actions } from '../js/core/state.js';

const ROOT = new URL('..', import.meta.url).pathname;
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

test('B12: no window latch remains in views/quran.js', () => {
  const src = stripComments(readFileSync(`${ROOT}js/views/quran.js`, 'utf8'));
  assert.doesNotMatch(src, /let readerWindow/, 'module latch deleted');
  assert.doesNotMatch(src, /function currentWindow/, 'render-time read/write deleted');
  assert.doesNotMatch(src, /_resetReaderWindowForTests/, 'test-only reset deleted');
  assert.doesNotMatch(src, /function expandReaderWindow/, 'module mutator deleted');
});

test('B12: derivation reaches a fixed point on the same signals', () => {
  const signals = [
    { key: '2', ayParam: null, recitingAyah: 0, total: 286 }, // fresh open
    { key: '2', ayParam: 200, recitingAyah: 0, total: 286 }, // deep link
    { key: '2', ayParam: 200, recitingAyah: 215, total: 286 }, // slide
    { key: '108', ayParam: null, recitingAyah: 0, total: 3 }, // short surah
  ];
  let prev = initialReaderWindow();
  for (const s of signals) {
    const next = computeReaderWindow(prev, s);
    assert.ok(next, `signal must move the window: ${JSON.stringify(s)}`);
    assert.equal(
      computeReaderWindow(next, s),
      null,
      `second compute must be null (fixed point): ${JSON.stringify(s)}`
    );
    prev = next;
  }
  // Param cleared after honoring: exactly one latch-only update, then quiet.
  const honored = computeReaderWindow(initialReaderWindow(), {
    key: '2',
    ayParam: 5,
    recitingAyah: 0,
    total: 286,
  });
  const cleared = computeReaderWindow(honored, {
    key: '2',
    ayParam: null,
    recitingAyah: 0,
    total: 286,
  });
  assert.ok(cleared && cleared.ayParam === null, 'latch adopts the cleared param once');
  assert.deepEqual([cleared.from, cleared.to], [honored.from, honored.to], 'bounds untouched');
  assert.equal(
    computeReaderWindow(cleared, { key: '2', ayParam: null, recitingAyah: 0, total: 286 }),
    null,
    'quiet after the latch update'
  );
});

test('B12: reducer sanitizes hostile windows and no-ops identically', () => {
  const before = store.getState();
  store.dispatch(actions.setReaderWindow({ from: '1<img>', to: -40, surah: 2, ayParam: 'x' }));
  const sane = store.getState().readerWindow;
  assert.deepEqual(
    [sane.from, sane.to, sane.surah, sane.ayParam],
    [1, 1, null, null],
    'hostile window coerces to the clamped default'
  );
  store.dispatch(actions.setReaderWindow({ from: 1, to: 1e15, surah: '2', ayParam: 5 }));
  assert.ok(
    store.getState().readerWindow.to <= 10000,
    'absurd magnitudes cap instead of parking in the slice'
  );
  const ref = store.getState();
  store.dispatch(actions.setReaderWindow({ ...ref.readerWindow }));
  assert.equal(store.getState(), ref, 'identical set is a reference no-op (no notify)');
  store.dispatch(actions.expandReaderWindow('sideways'));
  assert.equal(store.getState(), ref, 'bogus dir is a no-op (defaults are not a direction)');
  store.dispatch(actions.setReaderWindow(initialReaderWindow()));
});

test('B12: view reads stay bounded without a slice', () => {
  assert.deepEqual(readWindow(undefined, 286), { from: 1, to: READER_WINDOW_SIZE });
  assert.deepEqual(readWindow({ surah: '2', from: 190, to: 400, ayParam: 200 }, 286), {
    surah: '2',
    from: 190,
    to: 286,
    ayParam: 200,
  });
  assert.deepEqual(sanitizeWindow(null), { surah: null, from: 1, to: 1, ayParam: null });
  assert.equal(expandWindow({ surah: '2', from: 30, to: 60, ayParam: null }, 'up').from, 1);
  assert.equal(expandWindow({ surah: '2', from: 1, to: 30, ayParam: null }, 'down').to, 60);
});
