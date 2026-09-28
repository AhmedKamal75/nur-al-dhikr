/**
 * tests/tasbihCaps.test.js — OPEN-ISSUES #19: tasbih lifetime counters are
 * unbounded. `count` is bounded by its target, but `completedCycles` and
 * `totalRecitations` grew without end — a mashed dial (or a crafted
 * backup/dispatch) could push them past 1e6 toward Number.MAX_SAFE_INTEGER,
 * where float precision, the `✓ N×` badge, and localStorage health all
 * degrade. Both must saturate:
 *   completedCycles → 999999 (MAX_COMPLETED_CYCLES in js/core/utils.js)
 *   totalRecitations → 1e9   (MAX_TOTAL_RECITATIONS in js/core/utils.js,
 *                             the ceiling restore-time asCount already used)
 * No new user strings: saturation is silent, counting just stops growing.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { store } from '../js/core/state.js';
import { increment } from '../js/services/tasbih.js';
import { dateKey } from '../js/core/utils.js';

// Literal pins (mirror the constants — the test must fail meaningfully
// even before the constants exist, so no import from utils here).
const MAX_CYCLES = 999999;
const MAX_TOTAL = 1e9;

describe('OPEN-ISSUES #19: completedCycles saturates instead of growing unbounded', () => {
  test('live increment() stops at the cap (no 1e6+, no MAX_SAFE_INTEGER drift)', () => {
    const id = 'cap-live-1';
    store.dispatch(
      actions.setCounter(id, { count: 0, target: 1, completedCycles: MAX_CYCLES - 1 })
    );
    const r = increment(id, 'cat-cap', 1);
    assert.equal(r.completedCycles, MAX_CYCLES, 'last legal cycle lands exactly on the cap');
    assert.equal(r.cycleCompleted, true);
    const r2 = increment(id, 'cat-cap', 1);
    assert.equal(r2.completedCycles, MAX_CYCLES, 'further completions saturate, never exceed');
    assert.equal(
      store.getState().counters[id].completedCycles,
      MAX_CYCLES,
      'stored record saturates too'
    );
  });

  test('COUNTER_SET clamps a hostile completedCycles patch (crafted dispatch)', () => {
    const s = reduce(
      initialState(),
      actions.setCounter('cap-hostile-1', {
        count: 0,
        target: 33,
        completedCycles: Number.MAX_SAFE_INTEGER,
      })
    );
    assert.equal(s.counters['cap-hostile-1'].completedCycles, MAX_CYCLES);
  });

  test('restore clamps a hostile completedCycles value from a backup', () => {
    const out = sanitizeRestoredPayload({
      counters: {
        'cap-restore-1': { count: 0, target: 33, completedCycles: 5e9 },
      },
    });
    assert.equal(out.counters['cap-restore-1'].completedCycles, MAX_CYCLES);
  });
});

describe('OPEN-ISSUES #19: totalRecitations saturates instead of growing unbounded', () => {
  test('STATISTICS_RECORD stops at the cap', () => {
    const s0 = initialState();
    const today = dateKey(new Date());
    const seeded = {
      ...s0,
      statistics: {
        ...s0.statistics,
        totalRecitations: MAX_TOTAL - 1,
        dailyHistory: { [today]: { recitations: MAX_TOTAL - 1, sessions: 0, itemIds: [] } },
      },
    };
    const s1 = reduce(seeded, actions.recordStatistic('cap-item', 'cat-cap', 5, false));
    assert.equal(s1.statistics.totalRecitations, MAX_TOTAL, 'lifetime total saturates');
    assert.ok(
      s1.statistics.dailyHistory[today].recitations <= MAX_TOTAL,
      'the day entry saturates with it'
    );
  });

  test('restore clamps a hostile totalRecitations value from a backup', () => {
    const out = sanitizeRestoredPayload({ statistics: { totalRecitations: 5e9 } });
    assert.equal(out.statistics.totalRecitations, MAX_TOTAL);
  });
});

describe('OPEN-ISSUES #19: ordinary counting is untouched by the caps', () => {
  test('small counts and cycles behave exactly as before', () => {
    const id = 'cap-normal-1';
    let r = increment(id, 'cat-cap', 3);
    assert.deepEqual([r.count, r.cycleCompleted, r.completedCycles], [1, false, 0]);
    r = increment(id, 'cat-cap', 3);
    assert.deepEqual([r.count, r.cycleCompleted], [2, false]);
    r = increment(id, 'cat-cap', 3);
    assert.deepEqual([r.count, r.cycleCompleted, r.completedCycles], [0, true, 1]);
    const s = reduce(initialState(), actions.recordStatistic('cap-normal-1', 'cat-cap', 3, false));
    assert.equal(s.statistics.totalRecitations, 3);
  });
});
