/**
 * counter-rules.test.js — v5.2.25 counter-standards wave, permanent.
 *
 * Rule 1 (threshold): taps increment 1/3 → 2/3 → 3/3; nothing dismisses
 *   before count == target; completion stamps the day and completes.
 * Rule 2 (separation): the pill shows session progress only (never
 *   "6 / 1"); lifetime rides its own badge; reload restores 0/target
 *   while cycles + completion day survive (free tasbih-dial keys keep
 *   their live count — the dial's reload gate depends on it).
 * Rule 3 (dedup): first occurrence wins across feed panels; a done
 *   pick-of-the-day falls through to the next fresh entry; completion
 *   math is day-stamped, never lifetime-derived.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dedupeEntries,
  isCompletedToday,
  listCompletion,
  nextFreshIndex,
} from '../js/domain/reflections.js';
import { sanitizeRestoredPayload, freshSessionCounters } from '../js/core/state/restore.js';
import { store } from '../js/core/state.js';
import { increment } from '../js/services/tasbih.js';
import { dateKey } from '../js/core/utils.js';
import { cardHTML } from '../js/ui/card.js';

const ITEM = {
  id: 'rule-item-1',
  title: { en: 'Rule item' },
  arabic: 'نص',
  repetitions: 3,
};
const CAT = { id: 'cat-rule', name: { en: 'Rule' }, color: 'emerald' };

test('Rule 1: taps walk 1/3 → 2/3 → 3/3 and only then complete', () => {
  const id = 'rule-walk-1';
  let r = increment(id, 'cat-rule', 3);
  assert.deepEqual([r.count, r.cycleCompleted], [1, false]);
  r = increment(id, 'cat-rule', 3);
  assert.deepEqual([r.count, r.cycleCompleted], [2, false]);
  r = increment(id, 'cat-rule', 3);
  assert.deepEqual([r.count, r.cycleCompleted, r.completedCycles], [0, true, 1]);
});

test('Rule 1: completion stamps today on the counter record', () => {
  const id = 'rule-stamp-1';
  increment(id, 'cat-rule', 1);
  const rec = store.getState().counters[id];
  assert.equal(rec.completedCycles, 1);
  assert.equal(rec.lastCompletedDay, dateKey(new Date()));
  assert.equal(isCompletedToday(rec, dateKey(new Date())), true);
});

test('Rule 2: pill never conflates lifetime cycles into the ratio', () => {
  const html = cardHTML({ ...ITEM, id: 'rule-conflate-1' }, CAT, {
    counter: { count: 0, target: 1, completedCycles: 6 },
    lang: 'en',
  });
  assert.ok(html.includes('0 / 1'), 'resting pill reads session progress');
  assert.ok(!html.includes('6 / 1'), 'no "6 / 1" conflation');
  assert.ok(html.includes('✓ 6×'), 'lifetime rides its own badge');
});

test('Rule 2: reload restores 0/target, keeps cycles + day; dial keys exempt', () => {
  // sanitize restores faithfully (security-pinned) including the day stamp…
  const sane = sanitizeRestoredPayload({
    counters: {
      'rule-item-9': { count: 2, target: 3, completedCycles: 4, lastCompletedDay: '2026-09-11' },
      'rule-hostile-day': { count: 1, target: 1, completedCycles: 1, lastCompletedDay: '<x>' },
    },
  });
  assert.equal(sane.counters['rule-item-9'].count, 2, 'sanitize keeps the stored count');
  assert.equal(sane.counters['rule-item-9'].lastCompletedDay, '2026-09-11');
  assert.equal(sane.counters['rule-hostile-day'].lastCompletedDay, null);
  // …then boot hydrate restarts routines at zero (dial keys keep counting).
  const fresh = freshSessionCounters({
    ...sane.counters,
    'tasbih:subhanallah': { count: 41, target: 100, completedCycles: 2 },
  });
  assert.deepEqual(fresh['rule-item-9'], {
    count: 0,
    target: 3,
    completedCycles: 4,
    lastCompletedDay: '2026-09-11',
  });
  assert.equal(fresh['tasbih:subhanallah'].count, 41, 'dial count survives reload');
});

test('Rule 3: dedupe keeps first occurrence, drops junk', () => {
  const a = { item: { id: 'a' } };
  const b = { item: { id: 'b' } };
  assert.deepEqual(dedupeEntries([a, b, a, null, { item: {} }, b]), [a, b]);
  assert.deepEqual(dedupeEntries([]), []);
});

test('Rule 3: done pick falls through to the next fresh entry', () => {
  const eligible = [{ item: { id: 'a' } }, { item: { id: 'b' } }, { item: { id: 'c' } }];
  const stale = (e) => e.item.id === 'a';
  assert.equal(nextFreshIndex(eligible, 0, stale), 1);
  assert.equal(
    nextFreshIndex(eligible, 0, () => false),
    1,
    'fresh pick still advances the ring'
  );
  assert.equal(
    nextFreshIndex(eligible, 2, () => true),
    -1,
    'all stale keeps the original'
  );
  assert.equal(
    nextFreshIndex([], 0, () => false),
    -1
  );
});

test('Rule 3/4: completion math is day-stamped', () => {
  const today = '2026-09-11';
  const counters = {
    a: { count: 0, target: 3, completedCycles: 9, lastCompletedDay: today },
    b: { count: 1, target: 3, completedCycles: 9 },
    c: { count: 0, target: 1, completedCycles: 0, lastCompletedDay: '2026-09-10' },
  };
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.deepEqual(listCompletion(items, counters, today), { done: 1, total: 4, pct: 25 });
  assert.deepEqual(listCompletion([], counters, today), { done: 0, total: 0, pct: 0 });
  assert.equal(isCompletedToday(counters.b, today), false, 'lifetime cycles are not today');
});
