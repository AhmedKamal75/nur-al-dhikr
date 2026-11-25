import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../js/core/state/initial.js';
import { counterResetSnapshot, counterResetReviewHTML } from '../js/app/counterReset.js';

test('live Tasbih target, cycles and custom text are reviewed; removed or inactive phrase rejected', () => {
  const s = initialState();
  s.activeView = 'tasbih';
  s.tasbih.activeItemId = 'custom';
  s.tasbihCustom = [{ id: 'custom', text: '<custom & phrase>', target: 7 }];
  s.counters['tasbih:custom'] = { count: 0, target: 9, completedCycles: 2 };
  const snap = counterResetSnapshot(s, 'tasbih', 'custom');
  assert.equal(snap.target, 9);
  assert.equal(snap.cycles, 2);
  assert.equal(snap.count, 0);
  const h = counterResetReviewHTML(snap, 'en', '1');
  assert.match(h, /&lt;custom &amp; phrase&gt;/);
  assert.doesNotMatch(h, /<custom/);
  assert.match(h, /0 \/ 9/);
  assert.match(h, /cycles to clear: 2/);
  assert.doesNotMatch(h, /history/i);
  assert.equal(counterResetSnapshot(s, 'tasbih', 'subhanallah'), null);
  s.tasbihCustom = [];
  assert.equal(counterResetSnapshot(s, 'tasbih', 'custom'), null);
});
test('Focus requires current live item and resolves effective target', () => {
  const s = initialState();
  const item = { id: 'a', title: { en: 'A' }, repetitions: 3 };
  const category = { id: 'cat', items: [item] };
  s.library.documents = { lib: { metadata: { id: 'lib' }, categories: [category] } };
  s.activeView = 'focus';
  s.activeParams = { id: 'cat', subId: 'a' };
  s.settings.contentPrefs = { targetOverrides: { a: 8 } };
  assert.equal(counterResetSnapshot(s, 'focus', 'a').target, 8);
  assert.equal(counterResetSnapshot(s, 'focus', 'b'), null);
  s.activeView = 'home';
  assert.equal(counterResetSnapshot(s, 'focus', 'a'), null);
});

test('Focus review preserves the displayed stored target rather than the item default', () => {
  const s = initialState();
  const item = { id: 'adh-mor-001', title: { en: 'Morning' }, repetitions: 1 };
  const category = { id: 'morning', items: [item] };
  s.library.documents = { lib: { metadata: { id: 'lib' }, categories: [category] } };
  s.activeView = 'focus';
  s.activeParams = { id: 'morning', subId: item.id };
  s.counters[item.id] = { count: 1, target: 3, completedCycles: 5 };
  const snapshot = counterResetSnapshot(s, 'focus', item.id);
  assert.equal(snapshot.target, 3);
  assert.equal(snapshot.storedTarget, 3);
  assert.equal(snapshot.count, 1);
  assert.equal(snapshot.cycles, 5);
  assert.match(counterResetReviewHTML(snapshot, 'en', '1'), /1 \/ 3/);
});
