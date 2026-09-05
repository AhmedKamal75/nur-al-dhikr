/**
 * tests/readingTimer.test.js — the reading session timer: pure view/sync
 * decisions, the reducer accumulation contract, and the duration format.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { VIEWS } from '../js/core/config.js';
import { dateKey } from '../js/core/utils.js';
import {
  isReadingView,
  elapsedSeconds,
  flushReading,
  syncReadingTimer,
} from '../js/app/readingTimer.js';
import { formatReadingMinutes, todayReadingSec } from '../js/views/statistics.js';
import { rt } from '../js/app/rt.js';
import { store } from '../js/core/state.js';

describe('reading views', () => {
  test('only the two readers count', () => {
    assert.equal(isReadingView(VIEWS.QURAN), true);
    assert.equal(isReadingView(VIEWS.MUSHAF), true);
    assert.equal(isReadingView(VIEWS.HOME), false);
    assert.equal(isReadingView('quran'), true, 'value equality with the route id');
    assert.equal(elapsedSeconds(1000, 61000), 60);
    assert.equal(elapsedSeconds(61000, 1000), 0, 'never negative');
    assert.equal(elapsedSeconds('x', 1000), 0, 'hostile input');
  });
});

describe('READING_ADD_SECONDS', () => {
  test('accumulates into today and preserves sibling keys', () => {
    const key = dateKey(new Date());
    let s = {
      ...initialState(),
      statistics: {
        ...initialState().statistics,
        dailyHistory: { [key]: { recitations: 2, sessions: 1, itemIds: ['a'], pages: 3 } },
      },
    };
    s = reduce(s, actions.addReadingSeconds(90));
    assert.equal(s.statistics.dailyHistory[key].readingSec, 90);
    assert.equal(s.statistics.dailyHistory[key].pages, 3, 'khatma pages survive');
    s = reduce(s, actions.addReadingSeconds(30));
    assert.equal(s.statistics.dailyHistory[key].readingSec, 120);
    // STATISTICS_RECORD must not wipe the timer (the old rebuild did).
    s = reduce(s, actions.recordStatistic('x', null, 1, false));
    assert.equal(s.statistics.dailyHistory[key].readingSec, 120);
    assert.equal(s.statistics.dailyHistory[key].pages, 3);
  });

  test('hostile payloads no-op', () => {
    const s0 = initialState();
    for (const a of [
      actions.addReadingSeconds(0),
      actions.addReadingSeconds(-5),
      actions.addReadingSeconds('x'),
      actions.addReadingSeconds(NaN),
    ]) {
      assert.deepEqual(reduce(s0, a).statistics.dailyHistory, {}, JSON.stringify(a));
    }
  });
});

describe('navigation sync', () => {
  test('entering starts, leaving flushes into the store', () => {
    rt.readingSince = null;
    syncReadingTimer(store.getState(), { type: 'NAVIGATE', view: VIEWS.QURAN });
    assert.ok(rt.readingSince != null, 'clock started');
    rt.readingSince = Date.now() - 65000;
    syncReadingTimer(store.getState(), { type: 'NAVIGATE', view: VIEWS.HOME });
    assert.equal(rt.readingSince, null, 'clock cleared');
    const key = dateKey(new Date());
    assert.ok(store.getState().statistics.dailyHistory[key]?.readingSec >= 60, 'banked');
    assert.equal(flushReading(), 0, 'idle flush no-ops');
  });
});

describe('formatReadingMinutes', () => {
  test('compact durations', () => {
    assert.equal(formatReadingMinutes(0), '0 min');
    assert.equal(formatReadingMinutes(45), '45s');
    assert.equal(formatReadingMinutes(720), '12 min');
    assert.equal(formatReadingMinutes(3900), '1h 5m');
    assert.equal(todayReadingSec({ statistics: { dailyHistory: {} } }), 0);
  });
});
