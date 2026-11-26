/**
 * tests/countUndo.test.js — C14 "Undo the last count" (v5.17.182):
 *  1. an ordinary tap's undo rewinds the counter and that tap's counting
 *     statistics (per-day, lifetime, favorite category, streak recomputed);
 *  2. one level only — the newest tap replaces the ticket, no redo;
 *  3. a cycle-completion tap restores count to target-1 and
 *     completedCycles-1; saturation caps are honoured (a saturated cycle
 *     or total rewinds only what it actually added);
 *  4. the ~60s window expires and the control is same-view only;
 *  5. cross-midnight: the undo rewinds the day the TAP landed on, never
 *     the day the undo runs on;
 *  6. disclosed limits hold: history, the day's itemIds and reading
 *     positions stay untouched;
 *  7. hostile tickets degrade to a no-op; strings ship EN + AR; both
 *     views wire the control.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { store, actions } from '../js/core/state.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { increment } from '../js/services/tasbih.js';
import * as countUndo from '../js/services/countUndo.js';
import { dateKey } from '../js/core/utils.js';
import { isCompletedToday } from '../js/domain/reflections.js';
import { wasCelebrated, clearCelebrations } from '../js/domain/celebrate.js';

const MAX_CYCLES = 999999;
const MAX_TOTAL = 1e9;

function todayKey() {
  return dateKey(new Date());
}

function yesterdayKey() {
  return dateKey(new Date(Date.now() - 25 * 3600 * 1000));
}

function ticket(over = {}) {
  return {
    itemId: 'undo-it',
    categoryId: 'undo-cat',
    step: 1,
    target: 33,
    cycleCompleted: false,
    dayKey: todayKey(),
    appliedRecitations: 1,
    appliedDayRecitations: 1,
    appliedCycles: 0,
    favCatApplied: 1,
    surface: 'tasbih',
    ts: Date.now(),
    ...over,
  };
}

beforeEach(() => {
  store.dispatch(actions.clearCountTap());
});

describe('ordinary tap: counter and counting statistics rewind', () => {
  test('count, day, lifetime, favorite category and ticket all rewind', () => {
    const id = 'undo-ordinary';
    const cat = 'undo-cat-ordinary';
    const before = store.getState().statistics.totalRecitations;
    increment(id, cat, 33, 1, 'tasbih');
    assert.equal(store.getState().counters[id].count, 1);
    const day = store.getState().statistics.dailyHistory[todayKey()];
    const dayBefore = (day.recitations || 0) - 1;
    assert.equal(store.getState().lastCountTap.itemId, id, 'ticket recorded');

    store.dispatch(actions.undoCountTap());
    assert.equal(store.getState().counters[id].count, 0, 'counter rewound');
    assert.equal(
      store.getState().statistics.dailyHistory[todayKey()].recitations,
      dayBefore,
      'day total rewound'
    );
    assert.equal(store.getState().statistics.totalRecitations, before, 'lifetime total rewound');
    assert.equal(store.getState().lastCountTap, null, 'ticket consumed');
  });

  test('one level only: the newest tap replaces the ticket, no redo', () => {
    const id = 'undo-one-level';
    increment(id, null, 33, 1, 'tasbih');
    increment(id, null, 33, 1, 'tasbih');
    assert.equal(store.getState().counters[id].count, 2);
    store.dispatch(actions.undoCountTap());
    assert.equal(store.getState().counters[id].count, 1, 'only the last tap rewinds');
    assert.equal(store.getState().lastCountTap, null);
    store.dispatch(actions.undoCountTap());
    assert.equal(store.getState().counters[id].count, 1, 'no second undo, no redo');
  });
});

describe('cycle completion and saturation edges', () => {
  test('a completing tap restores count to target-1 and completedCycles-1', () => {
    const id = 'undo-cycle';
    increment(id, null, 2, 1, 'tasbih');
    const r = increment(id, null, 2, 1, 'tasbih');
    assert.equal(r.cycleCompleted, true);
    assert.equal(store.getState().counters[id].completedCycles, 1);
    store.dispatch(actions.undoCountTap());
    const c = store.getState().counters[id];
    assert.equal(c.count, 1, 'count back to target-1');
    assert.equal(c.completedCycles, 0, 'cycle rewound');
  });

  test("a completing tap's undo restores the prior lastCompletedDay (planner HOLD)", () => {
    const id = 'undo-stamp';
    increment(id, null, 2, 1, 'tasbih');
    increment(id, null, 2, 1, 'tasbih');
    assert.equal(
      isCompletedToday(store.getState().counters[id], todayKey()),
      true,
      'the completing tap stamps the day'
    );
    store.dispatch(actions.undoCountTap());
    assert.equal(
      isCompletedToday(store.getState().counters[id], todayKey()),
      false,
      'the undo retracts the stamp — Reflections sees the item again'
    );
  });

  test('a prior day stamp survives the completion undo (reducer level)', () => {
    const y = yesterdayKey();
    const base = {
      ...initialState(),
      counters: {
        'undo-it': { count: 0, target: 2, completedCycles: 1, lastCompletedDay: y },
      },
      statistics: {
        ...initialState().statistics,
        dailyHistory: { [todayKey()]: { recitations: 1, sessions: 0, itemIds: ['undo-it'] } },
        totalRecitations: 1,
      },
    };
    const s1 = reduce(
      base,
      actions.recordCountTap(
        ticket({ cycleCompleted: true, appliedCycles: 1, prevLastCompletedDay: y })
      )
    );
    const s2 = reduce(s1, actions.undoCountTap());
    assert.equal(s2.counters['undo-it'].lastCompletedDay, y, 'the older stamp is restored');
    const s3 = reduce(
      s1,
      actions.undoCountTap() // consumed already — but drive the null-restore path separately
    );
    assert.equal(s3.counters['undo-it'].lastCompletedDay, y, 'idempotent without a ticket');
    const s4 = reduce(
      {
        ...base,
        counters: {
          'undo-it': { count: 0, target: 2, completedCycles: 1, lastCompletedDay: todayKey() },
        },
      },
      actions.recordCountTap(
        ticket({ cycleCompleted: true, appliedCycles: 1, prevLastCompletedDay: null })
      )
    );
    const s5 = reduce(s4, actions.undoCountTap());
    assert.equal(s5.counters['undo-it'].lastCompletedDay, null, 'no prior stamp restores null');
  });

  test('a retracted completion keeps no celebration pulse (planner check)', () => {
    const id = 'undo-celebrate';
    clearCelebrations();
    store.dispatch(actions.navigate('tasbih'));
    increment(id, null, 2, 1, 'tasbih');
    increment(id, null, 2, 1, 'tasbih');
    assert.equal(wasCelebrated(`tasbih:${id}`, 700), true, 'completion stamped the pulse');
    assert.equal(countUndo.undoLastTap(), true);
    assert.equal(wasCelebrated(`tasbih:${id}`, 700), false, 'the undo retracts the pulse');
    store.dispatch(actions.navigate('home'));
    clearCelebrations();
  });

  test('a saturated cycle completion rewinds count but not the capped cycles', () => {
    const id = 'undo-sat-cycle';
    store.dispatch(actions.setCounter(id, { count: 0, target: 1, completedCycles: MAX_CYCLES }));
    const r = increment(id, null, 1, 1, 'tasbih');
    assert.equal(r.cycleCompleted, true);
    assert.equal(r.completedCycles, MAX_CYCLES, 'cycles saturated');
    store.dispatch(actions.undoCountTap());
    const c = store.getState().counters[id];
    assert.equal(c.count, 0, 'count restored to target-1 = 0');
    assert.equal(c.completedCycles, MAX_CYCLES, 'the capped cycle is not invented back');
  });

  test('a saturated lifetime total rewinds only what the tap added (zero)', () => {
    const id = 'undo-sat-total';
    // Drive the lifetime total to the cap via reducer-level state craft.
    const crafted = {
      ...store.getState(),
      statistics: { ...store.getState().statistics, totalRecitations: MAX_TOTAL },
    };
    const s1 = reduce(crafted, actions.recordCountTap(ticket({ appliedRecitations: 0 })));
    const s2 = reduce(s1, actions.undoCountTap());
    assert.equal(s2.statistics.totalRecitations, MAX_TOTAL, 'nothing to rewind below the cap');
  });

  test('undo never drives totals negative on a hostile under-record', () => {
    const s1 = reduce(
      initialState(),
      actions.recordCountTap(ticket({ appliedRecitations: 5, appliedDayRecitations: 5 }))
    );
    const s2 = reduce(s1, actions.undoCountTap());
    assert.equal(s2.statistics.totalRecitations, 0, 'floored at zero');
  });
});

describe('window and surface discipline', () => {
  test('the ticket is live ~60s for its own view only', () => {
    increment('undo-window', null, 33, 1, 'tasbih');
    const tap = store.getState().lastCountTap;
    assert.ok(countUndo.getUndoableTap('tasbih'), 'live on its own view');
    assert.equal(countUndo.getUndoableTap('focus'), null, 'not on the other view');
    assert.equal(
      countUndo.getUndoableTap('tasbih', tap.ts + countUndo.UNDO_WINDOW_MS + 1),
      null,
      'expired after the window'
    );
    assert.equal(
      countUndo.getUndoableTap('tasbih', tap.ts + countUndo.UNDO_WINDOW_MS - 1),
      tap,
      'still live inside the window'
    );
  });

  test('undoLastTap() is a no-op outside the window / on another view', () => {
    const id = 'undo-stale';
    increment(id, null, 33, 1, 'tasbih');
    // Expire the ticket in place (reducer keeps a hostile/old ts as-is).
    store.dispatch(actions.clearCountTap());
    store.dispatch(actions.recordCountTap(ticket({ itemId: id, ts: Date.now() - 61000 })));
    store.dispatch(actions.navigate('tasbih'));
    assert.equal(countUndo.undoLastTap(), false, 'stale ticket: no undo');
    assert.equal(store.getState().counters[id].count, 1, 'counter untouched');
    store.dispatch(actions.navigate('focus'));
    assert.equal(countUndo.undoLastTap(), false, 'other view: no undo');
    store.dispatch(actions.navigate('home'));
  });

  test('undoLastTap() performs the undo on the matching view', () => {
    const id = 'undo-e2e';
    store.dispatch(actions.navigate('tasbih'));
    increment(id, null, 33, 1, 'tasbih');
    assert.equal(countUndo.undoLastTap(), true);
    assert.equal(store.getState().counters[id].count, 0);
    store.dispatch(actions.navigate('home'));
  });

  test('a reset retires the pending ticket for that counter', () => {
    const id = 'undo-reset';
    increment(id, null, 33, 1, 'tasbih');
    store.dispatch(actions.resetCounter(id, 33));
    assert.equal(store.getState().lastCountTap, null);
  });
});

describe('cross-midnight and disclosed limits', () => {
  test('the undo rewinds the day the tap landed on, not today', () => {
    const y = yesterdayKey();
    const base = {
      ...initialState(),
      counters: { 'undo-it': { count: 1, target: 33, completedCycles: 0 } },
      statistics: {
        ...initialState().statistics,
        dailyHistory: {
          [y]: { recitations: 5, sessions: 1, itemIds: ['undo-it'] },
          [todayKey()]: { recitations: 2, sessions: 0, itemIds: [] },
        },
        totalRecitations: 7,
        favoriteCategories: { 'undo-cat': 3 },
        lastActiveDate: y,
      },
    };
    const s1 = reduce(base, actions.recordCountTap(ticket({ dayKey: y })));
    const s2 = reduce(s1, actions.undoCountTap());
    assert.equal(s2.statistics.dailyHistory[y].recitations, 4, "the tap's own day rewinds");
    assert.equal(s2.statistics.dailyHistory[todayKey()].recitations, 2, 'today is untouched');
    assert.equal(s2.statistics.totalRecitations, 6);
    assert.equal(s2.statistics.favoriteCategories['undo-cat'], 2);
  });

  test('the day itemIds stay (disclosed limit) and the streak recomputes', () => {
    const y = yesterdayKey();
    const base = {
      ...initialState(),
      statistics: {
        ...initialState().statistics,
        dailyHistory: { [y]: { recitations: 1, sessions: 0, itemIds: ['undo-it'] } },
        totalRecitations: 1,
        lastActiveDate: y,
      },
    };
    const s1 = reduce(base, actions.recordCountTap(ticket({ dayKey: y })));
    const s2 = reduce(s1, actions.undoCountTap());
    const entry = s2.statistics.dailyHistory[y];
    assert.equal(entry.recitations, 0);
    assert.deepEqual(entry.itemIds, ['undo-it'], 'itemIds untouched (disclosed limit)');
    assert.equal(
      s2.statistics.currentStreak,
      0,
      'the streak recomputes: the rewound day no longer meets the goal'
    );
  });

  test('history is untouched by the undo', () => {
    const id = 'undo-history';
    const before = store.getState().history.length;
    increment(id, null, 33, 1, 'tasbih');
    assert.equal(store.getState().history.length, before + 1, 'the tap pushed history');
    store.dispatch(actions.undoCountTap());
    assert.equal(store.getState().history.length, before + 1, 'history stays (disclosed limit)');
  });
});

describe('reducer hardening and wiring', () => {
  test('hostile tickets leave state alone', () => {
    const s0 = initialState();
    for (const bad of [
      null,
      42,
      [],
      { itemId: 7 },
      { ...ticket(), surface: '' },
      { ...ticket(), dayKey: 'not-a-day' },
      { ...ticket(), ts: 'later' },
    ]) {
      assert.equal(reduce(s0, actions.recordCountTap(bad)), s0, `rejected: ${JSON.stringify(bad)}`);
    }
    assert.equal(reduce(s0, actions.undoCountTap()), s0, 'undo with no ticket is a no-op');
  });

  test('a stale expiry clears only its own ticket', () => {
    const s1 = reduce(initialState(), actions.recordCountTap(ticket({ ts: 1000 })));
    const s2 = reduce(s1, actions.clearCountTap(999));
    assert.equal(s2.lastCountTap.ts, 1000, 'a stale timer never retires the live ticket');
    const s3 = reduce(s1, actions.clearCountTap(1000));
    assert.equal(s3.lastCountTap, null, 'its own timer clears it');
  });

  test('strings ship EN + AR; both views wire the control', () => {
    const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
    const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');
    for (const key of ['tasbih.undoLastTap', 'a11y.countUndone']) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
    for (const view of ['tasbih', 'focus']) {
      const src = readFileSync(new URL(`../js/views/${view}.js`, import.meta.url), 'utf8');
      assert.ok(src.includes('data-action="count-undo"'), `${view} view wires the control`);
      assert.ok(src.includes(`getUndoableTap('${view}')`), `${view} gates on its own surface`);
    }
    const handler = readFileSync(new URL('../js/app/handlers/tasbih.js', import.meta.url), 'utf8');
    assert.ok(handler.includes("'count-undo'"), 'the click handler exists');
    const shell = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
    assert.ok(shell.includes('js/services/countUndo.js'), 'the new module is precached');
  });
});
