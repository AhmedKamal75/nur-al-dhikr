/**
 * tests/streak.test.js — item 2 (streak inflation) gates for the v5.2.45
 * rules in core/state/streak.js:
 *  1. an idle today never inflates or breaks: empty history reads 0 (was
 *     1), a run ending yesterday reads its own length (was +1);
 *  2. presence is not activity (idle entries never join a run);
 *  3. a streak day meets the daily goal (or carries Qur'an activity);
 *  4. one isolated miss per run is frozen (adds no length); a second gap
 *     or two misses in a row ends the run — both walks alike;
 *  5. junk/rolled keys and hostile shapes never throw;
 *  6. the reducer wires the user's dailyGoal into the computation.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { dateKey, addDays } from '../js/core/utils.js';
import { coerceGoal, computeStreak, isStreakDay, validDayKey } from '../js/core/state/streak.js';
import { actions, store } from '../js/core/state.js';

const DAY = new Date(2026, 4, 10, 12, 0, 0); // local noon: dateKey-stable in any TZ
const key = (ago) => dateKey(addDays(DAY, -ago));
const TODAY = key(0);

function statsWith(entries) {
  return { dailyHistory: { ...entries } };
}

describe('validDayKey / coerceGoal / isStreakDay units', () => {
  test('keys must be real calendar days', () => {
    assert.equal(validDayKey('2026-05-10'), true);
    assert.equal(validDayKey('2025-02-30'), false); // rolled date
    assert.equal(validDayKey('junk'), false);
    assert.equal(validDayKey('2026-5-1'), false);
    assert.equal(validDayKey(null), false);
  });

  test('goals coerce to >= 1', () => {
    assert.equal(coerceGoal(100), 100);
    assert.equal(coerceGoal(1.9), 1);
    assert.equal(coerceGoal(0), 1);
    assert.equal(coerceGoal(-5), 1);
    assert.equal(coerceGoal('x'), 1);
    assert.equal(coerceGoal(undefined), 1);
  });

  test('a streak day meets the goal or reads Qur’an', () => {
    assert.equal(isStreakDay({ recitations: 100 }, 100), true);
    assert.equal(isStreakDay({ recitations: 99 }, 100), false);
    assert.equal(isStreakDay({ pages: 2 }, 100), true);
    assert.equal(isStreakDay({ readingSec: 60 }, 100), true);
    assert.equal(isStreakDay({ recitations: 1 }), true);
    assert.equal(isStreakDay({ recitations: 0, sessions: 0, itemIds: [] }), false);
    assert.equal(isStreakDay(null), false);
  });
});

describe('computeStreak: today is pending, never counted idle', () => {
  test('empty history reads 0, not 1', () => {
    assert.deepEqual(computeStreak(statsWith({}), TODAY), {
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  test('a run ending yesterday reads its own length mid-day', () => {
    const s = statsWith({
      [key(1)]: { recitations: 1 },
      [key(2)]: { recitations: 1 },
      [key(3)]: { recitations: 1 },
    });
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 3, longestStreak: 3 });
  });

  test('an active today extends its own run', () => {
    const s = statsWith({
      [key(0)]: { recitations: 1 },
      [key(1)]: { recitations: 1 },
      [key(2)]: { recitations: 1 },
    });
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 3, longestStreak: 3 });
  });

  test('two idle days in a row read 0 (nothing live to protect)', () => {
    const s = statsWith({ [key(3)]: { recitations: 1 } });
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 0, longestStreak: 1 });
  });

  test('idle entries never join a run (presence is not activity)', () => {
    const s = statsWith({
      [key(0)]: { recitations: 0, sessions: 0, itemIds: [] },
      [key(1)]: { recitations: 1 },
    });
    // Today idle → anchor yesterday; the idle entry is not a streak day.
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 1, longestStreak: 1 });
  });
});

describe('computeStreak: daily-goal gating', () => {
  test('sub-goal dhikr days do not extend the run', () => {
    const s = statsWith({
      [key(0)]: { recitations: 30 },
      [key(1)]: { recitations: 100 },
      [key(2)]: { recitations: 100 },
    });
    // Today sub-goal → anchor yesterday; yesterday + day-before meet 100.
    assert.deepEqual(computeStreak(s, TODAY, 100), { currentStreak: 2, longestStreak: 2 });
  });

  test('a sub-goal today with an idle yesterday reads 0', () => {
    const s = statsWith({ [key(0)]: { recitations: 30 } });
    assert.deepEqual(computeStreak(s, TODAY, 100), { currentStreak: 0, longestStreak: 0 });
  });

  test('Qur’an activity counts regardless of the dhikr goal', () => {
    const s = statsWith({
      [key(0)]: { pages: 4 },
      [key(1)]: { recitations: 100 },
    });
    assert.deepEqual(computeStreak(s, TODAY, 100), { currentStreak: 2, longestStreak: 2 });
  });
});

describe('computeStreak: one frozen miss per run', () => {
  test('an isolated miss mid-run is absorbed without adding length', () => {
    const s = statsWith({
      [key(0)]: { recitations: 1 },
      // key(1): missed — frozen
      [key(2)]: { recitations: 1 },
      [key(3)]: { recitations: 1 },
    });
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 3, longestStreak: 3 });
  });

  test('a second gap ends the run; two misses in a row break it', () => {
    const twoGaps = statsWith({
      [key(0)]: { recitations: 1 },
      [key(2)]: { recitations: 1 },
      [key(4)]: { recitations: 1 },
    });
    // Anchored today, the walk freezes the NEAREST miss (day 1) and breaks
    // at the next one (day 3): today + day 2 read 2, the day-4 island is
    // its own run of 1.
    assert.deepEqual(computeStreak(twoGaps, TODAY), { currentStreak: 2, longestStreak: 2 });
    // The second gap severs even a long run: only the post-gap island counts.
    const streakThenBreak = statsWith({
      [key(0)]: { recitations: 1 },
      [key(1)]: { recitations: 1 },
      [key(4)]: { recitations: 1 },
      [key(5)]: { recitations: 1 },
    });
    assert.deepEqual(computeStreak(streakThenBreak, TODAY), {
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  test('the freeze cannot anchor a run (misses at the edge do not count)', () => {
    // Today + yesterday idle: no anchor, even with older activity.
    const s = statsWith({ [key(2)]: { recitations: 1 }, [key(3)]: { recitations: 1 } });
    assert.deepEqual(computeStreak(s, TODAY), { currentStreak: 0, longestStreak: 2 });
  });
});

describe('computeStreak: hostile input never throws', () => {
  test('junk keys, rolled dates and garbage shapes degrade to zeros', () => {
    assert.deepEqual(computeStreak({ dailyHistory: {} }, TODAY), {
      currentStreak: 0,
      longestStreak: 0,
    });
    assert.deepEqual(computeStreak(null, TODAY), { currentStreak: 0, longestStreak: 0 });
    assert.deepEqual(computeStreak({ dailyHistory: 'x' }, TODAY), {
      currentStreak: 0,
      longestStreak: 0,
    });
    const junk = statsWith({
      notADate: { recitations: 999 },
      '2025-02-30': { recitations: 777 },
      [TODAY]: { recitations: 1 },
    });
    assert.deepEqual(computeStreak(junk, TODAY), { currentStreak: 1, longestStreak: 1 });
  });

  test('a hostile todayKey degrades to 0 without throwing', () => {
    assert.doesNotThrow(() => computeStreak(statsWith({}), 'junk'));
    assert.deepEqual(computeStreak(statsWith({}), 'junk'), {
      currentStreak: 0,
      longestStreak: 0,
    });
  });
});

describe('reducer: STATISTICS_RECORD uses the user’s dailyGoal', () => {
  test('sub-goal counts leave the streak anchored (goal 100)', () => {
    store.dispatch(actions.restoreState({ settings: { dailyGoal: 100 } }));
    store.dispatch(actions.recordStatistic('x', null, 30, true));
    const after = store.getState().statistics;
    assert.equal(after.dailyHistory[dateKey(new Date())].recitations, 30);
    // 30 < 100: today is not a streak day, yesterday is empty → 0.
    assert.equal(after.currentStreak, 0);
    store.dispatch(actions.recordStatistic('x', null, 70, false));
    const met = store.getState().statistics;
    assert.equal(met.dailyHistory[dateKey(new Date())].recitations, 100);
    assert.equal(met.currentStreak, 1);
    assert.equal(met.longestStreak, 1);
    store.flushPersist();
  });
});
