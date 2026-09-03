/**
 * tests/khatma.test.js — pure planner math for the Khatma scheduler
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planStatus,
  inclusiveDays,
  suggestDailyTarget,
  ramadanKhatmaPreset,
} from '../js/domain/khatma.js';

const TOTAL = 604;

function pages(n) {
  const o = {};
  for (let i = 1; i <= n; i += 1) o[String(i)] = true;
  return o;
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const at = (y, m, d) => new Date(y, m - 1, d, 10, 0, 0);

test('inclusiveDays counts both endpoints, and zero/negative spans collapse to 0', () => {
  assert.equal(inclusiveDays(iso(2026, 8, 24), iso(2026, 8, 24)), 1); // same day
  assert.equal(inclusiveDays(iso(2026, 8, 24), iso(2026, 8, 30)), 7);
  assert.equal(inclusiveDays(iso(2026, 8, 24), iso(2026, 8, 23)), 0);
  assert.equal(inclusiveDays('garbage', iso(2026, 8, 24)), 0);
});

test('suggestDailyTarget: 604 pages over 30 days needs 21/day', () => {
  assert.equal(suggestDailyTarget(iso(2026, 8, 24), at(2026, 8, 24)), Math.ceil(TOTAL / 1));
  // 30-day window starting today (inclusive both ends = 30 days)
  assert.equal(suggestDailyTarget(iso(2026, 9, 22), at(2026, 8, 24)), Math.ceil(TOTAL / 30));
  assert.equal(suggestDailyTarget(iso(2026, 8, 23), at(2026, 8, 24)), null); // in the past
  assert.equal(suggestDailyTarget('nonsense', at(2026, 8, 24)), null);
});

test('planStatus without a plan: progress only, no derived schedule', () => {
  const s = planStatus({ pagesRead: pages(120), plan: null, today: at(2026, 8, 24) });
  assert.equal(s.read, 120);
  assert.equal(s.remaining, 484);
  assert.equal(s.pct, 20);
  assert.equal(s.complete, false);
  assert.equal(s.planActive, false);
  assert.equal(s.onTrack, null);
  assert.equal(s.todayStart, null);
  assert.equal(s.pace, null);
});

test('planStatus with a malformed plan degrades to no-plan, never crashes', () => {
  const s = planStatus({
    pagesRead: pages(1),
    plan: { startDate: 'nope', targetDate: 'x', dailyTarget: 'y' },
    today: at(2026, 8, 24),
  });
  assert.equal(s.planActive, false);
  assert.equal(s.read, 1);
});

test('dailyTarget plan: today’s window and behind-by math', () => {
  // Started Aug 20 (5th day on Aug 24), 20 pages/day, read 60.
  const plan = { startDate: iso(2026, 8, 20), targetDate: null, dailyTarget: 20 };
  const s = planStatus({ pagesRead: pages(60), plan, today: at(2026, 8, 24) });
  assert.equal(s.daysElapsed, 5);
  // through yesterday = 20*4 = 80 → behind by 20; today's window = 81..100
  assert.equal(s.behindBy, 20);
  assert.equal(s.todayStart, 81);
  assert.equal(s.todayEnd, 100);
  assert.equal(s.pace, 12); // 60/5
  assert.equal(s.onTrack, false); // pace 12 < goal 20
  assert.equal(s.daysRemaining, null);
  assert.equal(s.requiredPerDay, null);
});

test('dailyTarget plan: ahead of schedule reports zero behind', () => {
  const plan = { startDate: iso(2026, 8, 20), targetDate: null, dailyTarget: 20 };
  const s = planStatus({ pagesRead: pages(120), plan, today: at(2026, 8, 24) });
  assert.equal(s.behindBy, 0);
  assert.equal(s.todayStart, 81);
  assert.equal(s.todayEnd, 100);
  assert.equal(s.read >= s.todayEnd, true); // UI shows "ahead"
  assert.equal(s.pace, 24);
  assert.equal(s.onTrack, true);
});

test('targetDate plan: required/day and projection honestly flag an off-pace plan', () => {
  // 34-day window (Aug 20 – Sep 22), 84 read by day 5 → pace 16.8/day.
  const plan = { startDate: iso(2026, 8, 20), targetDate: iso(2026, 9, 22), dailyTarget: null };
  const s = planStatus({ pagesRead: pages(84), plan, today: at(2026, 8, 24) });
  assert.equal(s.daysElapsed, 5);
  assert.equal(s.totalDays, 34);
  assert.equal(s.daysRemaining, 30); // Aug 24 → Sep 22 inclusive
  assert.equal(s.requiredPerDay, Math.ceil(520 / 30));
  assert.equal(s.pace, 16.8);
  // (v4.3) At 16.8/day, 520 remaining needs ceil(520/16.8) = 31 more READING
  // days (30 × 16.8 = 504 < 520 — the old projection's −1 baked in an
  // optimistic day the pace cannot pay for). 31 days after Aug 24 → Sep 24.
  assert.equal(s.projectedFinishISO, iso(2026, 9, 24));
  assert.equal(s.onTrack, false); // Sep 24 > Sep 22
});

test('targetDate plan: fast pace projects inside the deadline', () => {
  const plan = { startDate: iso(2026, 8, 20), targetDate: iso(2026, 9, 22), dailyTarget: null };
  const s = planStatus({ pagesRead: pages(200), plan, today: at(2026, 8, 24) });
  assert.equal(s.pace, 40);
  assert.equal(s.onTrack, true); // 404 remaining at 40/day → ~11 days → Sep 4 ≤ Sep 22
  assert.equal(s.projectedFinishISO <= plan.targetDate, true);
});

test('targetDate plan: nothing read yet with a deadline is honestly off track', () => {
  const plan = { startDate: iso(2026, 8, 24), targetDate: iso(2026, 9, 22), dailyTarget: null };
  const s = planStatus({ pagesRead: {}, plan, today: at(2026, 8, 24) });
  assert.equal(s.pace, 0);
  assert.equal(s.projectedFinishISO, null);
  assert.equal(s.onTrack, false);
});

test('deadline already passed: required/day is infinite for remaining pages', () => {
  const plan = { startDate: iso(2026, 8, 1), targetDate: iso(2026, 8, 20), dailyTarget: null };
  const s = planStatus({ pagesRead: pages(300), plan, today: at(2026, 8, 24) });
  assert.equal(s.daysRemaining, 0);
  assert.equal(s.requiredPerDay, Infinity);
  assert.equal(s.onTrack, false);
});

test('future start date: pace and today’s window are null until day one', () => {
  const plan = { startDate: iso(2026, 8, 30), targetDate: iso(2026, 9, 29), dailyTarget: 20 };
  const s = planStatus({ pagesRead: {}, plan, today: at(2026, 8, 24) });
  assert.equal(s.daysElapsed, 0);
  assert.equal(s.pace, null);
  assert.equal(s.todayStart, null);
  assert.equal(s.todayEnd, null);
});

test('completed khatma: complete=true, onTrack=true, nothing remaining', () => {
  const plan = { startDate: iso(2026, 8, 1), targetDate: iso(2026, 8, 30), dailyTarget: 21 };
  const s = planStatus({ pagesRead: pages(TOTAL), plan, today: at(2026, 8, 24) });
  assert.equal(s.complete, true);
  assert.equal(s.remaining, 0);
  assert.equal(s.pct, 100);
  assert.equal(s.onTrack, true);
});

test('today’s window never exceeds the mushaf bounds near the end', () => {
  const plan = { startDate: iso(2026, 8, 1), targetDate: null, dailyTarget: 60 };
  // Day 10 (Aug 10): through yesterday 540 → window 541..600
  const day10 = planStatus({ pagesRead: pages(500), plan, today: at(2026, 8, 10) });
  assert.equal(day10.todayStart, 541);
  assert.equal(day10.todayEnd, 600);
  // Day 11: through yesterday 600 → 601..604 (end clamped, no spill past 604)
  const day11 = planStatus({ pagesRead: pages(600), plan, today: at(2026, 8, 11) });
  assert.equal(day11.todayStart, 601);
  assert.equal(day11.todayEnd, 604);
  // Day 12: schedule already finished → window collapses to page 604
  const day12 = planStatus({ pagesRead: pages(604), plan, today: at(2026, 8, 12) });
  assert.equal(day12.todayStart, 604);
  assert.equal(day12.todayEnd, 604);
});

/* ---- Ramadan preset (v3.0) ----
 * Anchors pinned against the app's tabular Hijri calendar:
 *   1 Ramadan 1446 = 2025-03-01, 27 Ramadan 1446 = 2025-03-27
 *   1 Ramadan 1447 = 2026-02-18, 27 Ramadan 1447 = 2026-03-16
 *   2025-02-20 is Ramadan 3, 1447; 2025-03-28 is Ramadan 28, 1446;
 *   2026-08-24 is Rabi' I 10, 1448.
 */

test('ramadanKhatmaPreset: before Ramadan aims at this year\u2019s 1\u201327', () => {
  // Jan 15, 2026 — two Hijri months before Ramadan 1447.
  const p = ramadanKhatmaPreset(at(2026, 1, 15));
  assert.equal(p.hijriYear, 1447);
  assert.equal(p.startDate, iso(2026, 2, 18)); // 1 Ramadan
  assert.equal(p.targetDate, iso(2026, 3, 16)); // 27 Ramadan
  assert.equal(p.days, 27);
  assert.equal(p.dailyTarget, Math.ceil(604 / 27)); // 23
});

test('ramadanKhatmaPreset: during Ramadan starts today, still finishing by the 27th', () => {
  // Feb 20, 2026 = Ramadan 3 → 25 remaining days incl. today.
  const p = ramadanKhatmaPreset(at(2026, 2, 20));
  assert.equal(p.hijriYear, 1447);
  assert.equal(p.startDate, iso(2026, 2, 20)); // today, not 1 Ramadan
  assert.equal(p.targetDate, iso(2026, 3, 16));
  assert.equal(p.days, 25);
  assert.equal(p.dailyTarget, Math.ceil(604 / 25)); // 25
});

test('ramadanKhatmaPreset: ON 1 Ramadan starts today', () => {
  const p = ramadanKhatmaPreset(at(2026, 2, 18));
  assert.equal(p.hijriYear, 1447);
  assert.equal(p.startDate, iso(2026, 2, 18));
  assert.equal(p.days, 27);
});

test('ramadanKhatmaPreset: on the 27th itself, still today (one-day sprint)', () => {
  const p = ramadanKhatmaPreset(at(2026, 3, 16)); // 27 Ramadan 1447
  assert.equal(p.startDate, iso(2026, 3, 16));
  assert.equal(p.targetDate, iso(2026, 3, 16));
  assert.equal(p.days, 1);
  assert.equal(p.dailyTarget, 604);
});

test('ramadanKhatmaPreset: in the last nights (28\u201330) rolls to NEXT Ramadan', () => {
  // Mar 28, 2025 = Ramadan 28, 1446 → aim at Ramadan 1447.
  const p = ramadanKhatmaPreset(at(2025, 3, 28));
  assert.equal(p.hijriYear, 1447);
  assert.equal(p.startDate, iso(2026, 2, 18));
  assert.equal(p.targetDate, iso(2026, 3, 16));
});

test('ramadanKhatmaPreset: after Ramadan (later Hijri month) rolls to next year', () => {
  // Aug 24, 2026 = Rabi\u2019 I 1448 → Ramadan 1448.
  const p = ramadanKhatmaPreset(at(2026, 8, 24));
  assert.equal(p.hijriYear, 1448);
  assert.ok(p.startDate > iso(2026, 8, 24)); // a future 1 Ramadan
  assert.equal(inclusiveDays(p.startDate, p.targetDate), 27);
});

test('ramadanKhatmaPreset: produced plan is immediately valid for planStatus', () => {
  const preset = ramadanKhatmaPreset(at(2026, 1, 15));
  const s = planStatus({
    pagesRead: {},
    plan: {
      startDate: preset.startDate,
      targetDate: preset.targetDate,
      dailyTarget: preset.dailyTarget,
    },
    today: at(2026, 2, 18),
  });
  assert.equal(s.planActive, true);
  assert.equal(s.todayEnd, preset.dailyTarget); // day 1 target = the daily goal
});

test('future-start plan: no verdict and deadline math measured from the start date', () => {
  // The Ramadan preset shape: starts months out, 27-day window, 23/day.
  const plan = { startDate: iso(2027, 2, 8), targetDate: iso(2027, 3, 6), dailyTarget: 23 };
  const s = planStatus({ pagesRead: pages(1), plan, today: at(2026, 8, 24) });
  assert.equal(s.daysElapsed, 0);
  assert.equal(s.onTrack, null); // cannot be "behind" before day one
  assert.equal(s.daysRemaining, 27); // start → target, NOT today → target
  assert.equal(s.requiredPerDay, Math.ceil(603 / 27)); // 23, matching the preset goal
  assert.equal(s.pace, null);
  assert.equal(s.projectedFinishISO, null);
  assert.equal(s.todayStart, null);
  assert.equal(s.behindBy, null);
});

test('started plan: deadline math measures from today (unchanged behavior)', () => {
  const plan = { startDate: iso(2026, 8, 20), targetDate: iso(2026, 9, 22), dailyTarget: null };
  const s = planStatus({ pagesRead: pages(84), plan, today: at(2026, 8, 24) });
  assert.equal(s.daysRemaining, 30); // Aug 24 → Sep 22, measured from TODAY
  assert.equal(s.requiredPerDay, Math.ceil(520 / 30));
});
