import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { completedCount, isDayComplete, checklistStreak, recentHistory } from '../js/checklist.js';
import { CHECKLIST_ITEMS } from '../js/config.js';
import { dateKey, addDays } from '../js/utils.js';

function fullDay() {
  const day = {};
  for (const item of CHECKLIST_ITEMS) day[item.id] = true;
  return day;
}

describe('completedCount / isDayComplete', () => {
  test('counts checked items and never throws on missing/malformed entries', () => {
    assert.equal(completedCount(null), 0);
    assert.equal(completedCount(undefined), 0);
    assert.equal(completedCount({}), 0);
    assert.equal(completedCount({ fajr: true, dhuhr: true }), 2);
    assert.equal(completedCount(fullDay()), CHECKLIST_ITEMS.length);
  });

  test('a day is only "complete" once every single item is checked', () => {
    const almost = fullDay();
    delete almost[CHECKLIST_ITEMS[0].id];
    assert.equal(isDayComplete(almost), false);
    assert.equal(isDayComplete(fullDay()), true);
  });

  test('ignores unrelated keys (defensive against corrupted/imported data)', () => {
    const day = { ...fullDay(), notARealItem: true };
    assert.equal(completedCount(day), CHECKLIST_ITEMS.length);
  });
});

describe('checklistStreak', () => {
  test('is 0 with no history at all', () => {
    assert.equal(checklistStreak({}), 0);
  });

  test('counts consecutive fully-completed days ending yesterday when today is still incomplete', () => {
    const today = new Date(2026, 5, 10);
    const history = {
      [dateKey(addDays(today, -1))]: fullDay(),
      [dateKey(addDays(today, -2))]: fullDay(),
      [dateKey(addDays(today, -3))]: fullDay(),
      // today itself: not present / incomplete — should not break the streak
    };
    assert.equal(checklistStreak(history, today), 3);
  });

  test('includes today once it is itself fully complete', () => {
    const today = new Date(2026, 5, 10);
    const history = {
      [dateKey(today)]: fullDay(),
      [dateKey(addDays(today, -1))]: fullDay(),
    };
    assert.equal(checklistStreak(history, today), 2);
  });

  test('a single incomplete day in the past breaks the streak there', () => {
    const today = new Date(2026, 5, 10);
    const history = {
      [dateKey(addDays(today, -1))]: fullDay(),
      [dateKey(addDays(today, -2))]: { fajr: true }, // incomplete
      [dateKey(addDays(today, -3))]: fullDay(),
    };
    assert.equal(checklistStreak(history, today), 1);
  });

  test('never throws on garbage input', () => {
    assert.doesNotThrow(() => checklistStreak(null));
    assert.doesNotThrow(() => checklistStreak('not an object'));
    assert.doesNotThrow(() => checklistStreak(42));
  });
});

describe('recentHistory', () => {
  test('returns `days` entries, oldest first, ending on today', () => {
    const today = new Date(2026, 5, 10);
    const history = { [dateKey(today)]: fullDay() };
    const rows = recentHistory(history, 7, today);
    assert.equal(rows.length, 7);
    assert.equal(rows[rows.length - 1].dateKey, dateKey(today));
    assert.equal(rows[rows.length - 1].complete, true);
    assert.equal(rows[0].dateKey, dateKey(addDays(today, -6)));
    assert.equal(rows[0].complete, false);
  });
});
