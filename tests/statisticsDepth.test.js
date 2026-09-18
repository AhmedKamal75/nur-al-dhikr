/**
 * tests/statisticsDepth.test.js — (v5.10.1) statistics depth: daily-goal
 * progress, streak coaching milestones, and the derived per-surah reading
 * breakdown (pages read → surahs on those pages).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  goalProgress,
  streakCoaching,
  surahPageCounts,
  topSurahsByPages,
  STREAK_MILESTONES,
} from '../js/domain/statistics.js';

const STATS = {
  dailyHistory: { '2026-09-17': { recitations: 60, sessions: 2, itemIds: [] } },
};

describe('goalProgress', () => {
  test('today vs goal with remaining + met flag', () => {
    const g = goalProgress(STATS, 100, new Date(2026, 8, 17));
    assert.deepEqual(g, { today: 60, goal: 100, pct: 60, remaining: 40, met: false });
    const met = goalProgress(
      { dailyHistory: { '2026-09-17': { recitations: 120 } } },
      100,
      new Date(2026, 8, 17)
    );
    assert.equal(met.met, true);
    assert.equal(met.pct, 100, 'caps at 100');
  });

  test('hostile goals degrade safely', () => {
    assert.equal(goalProgress(STATS, 0, new Date(2026, 8, 17)).goal, 1);
    assert.equal(goalProgress(STATS, 'x', new Date(2026, 8, 17)).goal, 1);
    assert.equal(goalProgress(null, 100, new Date(2026, 8, 17)).today, 0);
  });
});

describe('streakCoaching', () => {
  test('next milestone + days to go', () => {
    assert.deepEqual(streakCoaching(3, 12), {
      current: 3,
      longest: 12,
      nextMilestone: 7,
      toGo: 4,
    });
    assert.deepEqual(streakCoaching(400, 400).nextMilestone, null);
    assert.ok(STREAK_MILESTONES.every((m) => m > 0));
  });
});

describe('surahPageCounts + topSurahsByPages', () => {
  // Page 1 holds 1:1..1:7 (Al-Fatiha), page 2 holds 2:1.. (Al-Baqarah).
  const ayahPages = { '1:1': 1, '1:7': 1, '2:1': 2, '2:5': 2 };

  test('read pages attribute to every surah printed on them', () => {
    assert.deepEqual(surahPageCounts({ 1: true }, ayahPages), { 1: 1 });
    assert.deepEqual(surahPageCounts({ 1: 1, 2: 1 }, ayahPages), { 1: 1, 2: 1 });
    assert.deepEqual(surahPageCounts({}, ayahPages), {});
    assert.deepEqual(surahPageCounts({ 1: 1 }, null), {});
    assert.deepEqual(surahPageCounts(null, ayahPages), {});
  });

  test('top list resolves names, caps, ignores junk', () => {
    const meta = [
      { number: 1, nameAr: 'الفاتحة', nameTransliteration: 'Al-Fatiha' },
      { number: 2, nameAr: 'البقرة', nameTransliteration: 'Al-Baqarah' },
    ];
    const top = topSurahsByPages({ 1: 3, 2: 1, 999: 9 }, meta, 5);
    assert.equal(top.length, 2, 'surah 999 filtered');
    assert.equal(top[0].n, 1);
    assert.equal(top[0].nameAr, 'الفاتحة');
    assert.equal(topSurahsByPages({ 1: 1 }, null)[0].nameAr, '#1', 'no meta, no blank');
  });
});
