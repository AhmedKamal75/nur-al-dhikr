/**
 * tests/statistics.test.js — derived-stats helpers added in v2.7.0
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { averagePerDay, activeDays, monthTotal, totalInLastDays } from '../js/domain/statistics.js';

function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Build a stats object whose dailyHistory has `count` recitations N days back. */
function statsWith({ daysAgo = {}, zeroDays = [] } = {}) {
  const dailyHistory = {};
  const today = new Date();
  for (const [offset, count] of Object.entries(daysAgo)) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(offset));
    dailyHistory[key(d)] = { recitations: count, sessions: 1, itemIds: [] };
  }
  for (const offset of zeroDays) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    dailyHistory[key(d)] = { recitations: 0, sessions: 0, itemIds: [] }; // present but idle
  }
  return {
    dailyHistory,
    totalRecitations: 0,
    totalSessions: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastActiveDate: null,
    favoriteCategories: {},
  };
}

test('activeDays counts only days with recitations > 0', () => {
  const s = statsWith({ daysAgo: { 0: 5, 1: 10, 3: 7 }, zeroDays: [2, 4] });
  assert.equal(activeDays(s), 3); // idle-but-present days don't count
});

test('activeDays on empty history is 0', () => {
  assert.equal(activeDays({ dailyHistory: {} }), 0);
  assert.equal(activeDays({}), 0);
});

test('averagePerDay divides by the full window, not active days', () => {
  const s = statsWith({ daysAgo: { 0: 100 } }); // one busy day, 29 empty days
  assert.equal(averagePerDay(s, 30), 3.3); // 100/30 = 3.33 → 3.3
});

test('averagePerDay rounds to one decimal', () => {
  const s = statsWith({ daysAgo: { 0: 1, 1: 1, 2: 1 } }); // 3/7 = 0.4285…
  assert.equal(averagePerDay(s, 7), 0.4);
});

test('averagePerDay with no data is 0', () => {
  assert.equal(averagePerDay(statsWith({}), 30), 0);
});

test('monthTotal sums only days in the ref month', () => {
  const now = new Date();
  // (v4.6.0) Use explicit same-month keys: a fixed "-5 days" offset crosses
  // the month boundary whenever today's date is ≤ 5, which made this test
  // fail on the 1st–5th of every month (a flake, not a regression).
  const sameMonthDay = (dayOfMonth) =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
  const thisMonth = { dailyHistory: {}, totalRecitations: 0, totalSessions: 0 };
  thisMonth.dailyHistory[sameMonthDay(now.getDate())] = {
    recitations: 10,
    sessions: 1,
    itemIds: [],
  };
  thisMonth.dailyHistory[sameMonthDay(Math.max(1, now.getDate() - 1))] = {
    recitations: 20,
    sessions: 1,
    itemIds: [],
  };
  assert.equal(monthTotal(thisMonth, now), 30);

  // Previous-month data must not leak into the current month's total.
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const prevKey = key(prevMonthDate);
  const mixed = { dailyHistory: {}, totalRecitations: 0, totalSessions: 0 };
  mixed.dailyHistory[sameMonthDay(now.getDate())] = { recitations: 10, sessions: 1, itemIds: [] };
  mixed.dailyHistory[prevKey] = { recitations: 999, sessions: 1, itemIds: [] };
  assert.equal(monthTotal(mixed, now), 10);
  assert.equal(monthTotal(mixed, prevMonthDate), 999);
});

test('totalInLastDays rolling window includes today, excludes older', () => {
  const s = statsWith({ daysAgo: { 0: 1, 6: 1, 7: 1, 8: 1 } });
  assert.equal(totalInLastDays(s, 7), 2); // days 0 and 6, not 7/8
});
