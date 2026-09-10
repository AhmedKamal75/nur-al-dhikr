/**
 * lazy-modal.test.js — v5.2.19, permanent.
 *
 * The v5.2.18 lazy wave left fire-and-forget `import().then(openModal)`
 * chains with no rejection path (a failed chunk was an unhandled
 * rejection and the tap silently died) and let the 550ms long-press
 * timer outlive its view. openLazyModal closes both: failures resolve
 * false after an error toast, and a viewGuard drops stale opens. None
 * of these paths may ever throw — not even without a DOM (the failure
 * toast degrades to the console log when there is no document).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openLazyModal } from '../js/ui/modal.js';
import { store } from '../js/core/state.js';

test('lazy modal: viewGuard drops a sheet that outlived its view', async () => {
  assert.notEqual(store.getState().activeView, 'quiz');
  const opened = await openLazyModal(() => Promise.resolve('<p>stale sheet</p>'), {
    labelledBy: 'modal-title-test',
    viewGuard: 'quiz',
  });
  assert.equal(opened, false, 'stale sheet must not open');
});

test('lazy modal: rejected chunk resolves false, never throws without a DOM', async () => {
  assert.equal(typeof document, 'undefined', 'precondition: no document in node');
  const opened = await openLazyModal(() => Promise.reject(new Error('chunk gone')), {
    labelledBy: 'modal-title-test',
  });
  assert.equal(opened, false, 'failed chunk must resolve false, not reject');
});

test('lazy modal: synchronous loader throw resolves false, never throws', async () => {
  const opened = await openLazyModal(
    () => {
      throw new Error('sync throw');
    },
    { labelledBy: 'modal-title-test' }
  );
  assert.equal(opened, false, 'sync throw must resolve false, not reject');
});

test('lazy modal: empty content resolves false without touching the DOM', async () => {
  assert.equal(await openLazyModal(() => Promise.resolve('')), false);
  assert.equal(await openLazyModal(() => Promise.resolve(null)), false);
});
