/**
 * planExport.test.js (v5.2.29) — B-5: the restored family plan-sharing
 * primitive. Pure builders/sanitizers: hostile shapes degrade to null,
 * never throw, never invent data.
 * Run: node --test tests/planExport.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAN_KIND,
  PLAN_VERSION,
  buildPlan,
  isPlanFile,
  sanitizePlan,
} from '../js/domain/planExport.js';
import { reduceWorship } from '../js/core/state/slices/worship.js';

test('buildPlan exports plan keys only — never logs or history', () => {
  const plan = buildPlan(
    {
      khatmaPlan: { startDate: '2026-09-01', targetDate: null, dailyTarget: 20 },
      settings: { dailyGoal: 200 },
      counters: { 'tasbih:a': { target: 33 }, junk: { target: 0 }, bad: 'x' },
      statistics: { secret: true },
      sadaqahLog: [{ id: 'x' }],
    },
    { now: 0 }
  );
  assert.equal(plan.kind, PLAN_KIND);
  assert.equal(plan.version, PLAN_VERSION);
  assert.deepEqual(plan.plan.khatmaPlan, {
    startDate: '2026-09-01',
    targetDate: null,
    dailyTarget: 20,
  });
  assert.equal(plan.plan.dailyGoal, 200);
  assert.deepEqual(plan.plan.tasbihTargets, { 'tasbih:a': 33 });
  assert.ok(!('statistics' in plan) && !('sadaqahLog' in plan));
});

test('buildPlan degrades hostile state to safe defaults', () => {
  assert.equal(buildPlan(null).plan.dailyGoal, 100);
  assert.equal(buildPlan({}).plan.khatmaPlan, null);
  assert.deepEqual(buildPlan(undefined).plan.tasbihTargets, {});
});

test('isPlanFile accepts only our kind with a plan body', () => {
  assert.equal(isPlanFile({ kind: PLAN_KIND, plan: {} }), true);
  assert.equal(isPlanFile({ kind: 'nur-al-dhikr-backup', plan: {} }), false);
  assert.equal(isPlanFile({ kind: PLAN_KIND }), false);
  assert.equal(isPlanFile(null), false);
  assert.equal(isPlanFile('x'), false);
});

test('sanitizePlan coerces each key, null when nothing usable', () => {
  const good = sanitizePlan({
    kind: PLAN_KIND,
    plan: {
      khatmaPlan: { startDate: '2026-09-01', targetDate: '2026-10-01', dailyTarget: '20' },
      dailyGoal: 500,
      tasbihTargets: { a: 33, b: -1, c: 'xx', ['x'.repeat(200)]: 5 },
    },
  });
  assert.deepEqual(good.khatmaPlan, {
    startDate: '2026-09-01',
    targetDate: '2026-10-01',
    dailyTarget: 20,
  });
  assert.equal(good.dailyGoal, 500);
  assert.deepEqual(good.tasbihTargets, { a: 33 });
  // Khatma without a start date is dropped, not half-kept.
  const noStart = sanitizePlan({ kind: PLAN_KIND, plan: { khatmaPlan: { dailyTarget: 5 } } });
  assert.equal(noStart?.khatmaPlan ?? null, null);
  // An empty plan body yields only a null dailyGoal (falsy — the
  // PLAN_IMPORT reducer skips it, so the import is a pass-through).
  assert.deepEqual(sanitizePlan({ kind: PLAN_KIND, plan: {} }), { dailyGoal: null });
  assert.equal(sanitizePlan({ kind: 'nope', plan: {} }), null);
  assert.equal(sanitizePlan(null), null);
});

test('PLAN_IMPORT merges plan keys only — personal data untouched', () => {
  const base = {
    khatmaPlan: null,
    settings: { dailyGoal: 100 },
    counters: { keep: { count: 5, target: 10 } },
    statistics: { n: 1 },
  };
  const next = reduceWorship(base, {
    type: 'PLAN_IMPORT',
    plan: {
      khatmaPlan: { startDate: '2026-09-01', targetDate: null, dailyTarget: 20 },
      dailyGoal: 300,
      tasbihTargets: { new: 99 },
    },
  });
  assert.deepEqual(next.khatmaPlan, { startDate: '2026-09-01', targetDate: null, dailyTarget: 20 });
  assert.equal(next.settings.dailyGoal, 300);
  assert.equal(next.counters.keep.count, 5, 'existing counter progress kept');
  assert.equal(next.counters.new.target, 99);
  assert.deepEqual(next.statistics, { n: 1 }, 'history untouched');
  // Empty plan object: pass-through by value (reducer always spreads).
  assert.deepEqual(reduceWorship(base, { type: 'PLAN_IMPORT', plan: {} }), base);
});
