import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { khatmProgress, MUSHAF_TOTAL_PAGES } from '../js/khatm.js';

const dk = (d) => d.toISOString().slice(0, 10);
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

describe('khatmProgress', () => {
  test('returns null when there is no active plan', () => {
    assert.equal(khatmProgress(null, 100), null);
    assert.equal(khatmProgress({ active: false }, 100), null);
    assert.equal(khatmProgress({ active: true, startDate: null }, 100), null);
  });

  test('computes percent complete from startPage to the current page', () => {
    const khatm = { active: true, startDate: dk(daysAgo(0)), targetDays: 30, startPage: 1 };
    const progress = khatmProgress(khatm, 302); // roughly halfway through 604 pages
    assert.equal(progress.pagesToRead, MUSHAF_TOTAL_PAGES);
    assert.equal(progress.pagesRead, 302);
    assert.equal(progress.percent, 50);
  });

  test('accounts for a non-default starting page', () => {
    const khatm = { active: true, startDate: dk(daysAgo(0)), targetDays: 30, startPage: 100 };
    const progress = khatmProgress(khatm, 100);
    assert.equal(progress.pagesToRead, MUSHAF_TOTAL_PAGES - 100 + 1);
    assert.equal(progress.pagesRead, 1);
  });

  test('flags completed once the current page reaches the end', () => {
    const khatm = { active: true, startDate: dk(daysAgo(5)), targetDays: 30, startPage: 1 };
    const progress = khatmProgress(khatm, MUSHAF_TOTAL_PAGES);
    assert.equal(progress.completed, true);
    assert.equal(progress.pagesRemaining, 0);
  });

  test('is on track when reading pace meets or exceeds the expected pace', () => {
    // 30-day plan, 15 days elapsed -> expect ~50% of 604 pages read by now.
    const khatm = { active: true, startDate: dk(daysAgo(15)), targetDays: 30, startPage: 1 };
    const aheadProgress = khatmProgress(khatm, 400);
    assert.equal(aheadProgress.onTrack, true);

    const behindProgress = khatmProgress(khatm, 50);
    assert.equal(behindProgress.onTrack, false);
    assert.ok(behindProgress.pagesPerDayNeeded > 0);
  });

  test('flags overdue once past the target date without completing', () => {
    const khatm = { active: true, startDate: dk(daysAgo(40)), targetDays: 30, startPage: 1 };
    const progress = khatmProgress(khatm, 10);
    assert.equal(progress.overdue, true);
    assert.equal(progress.completed, false);
  });

  test('daysRemaining never goes negative', () => {
    const khatm = { active: true, startDate: dk(daysAgo(100)), targetDays: 30, startPage: 1 };
    const progress = khatmProgress(khatm, 10);
    assert.equal(progress.daysRemaining, 0);
  });
});
