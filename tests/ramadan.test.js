/**
 * ramadan.test.js — pure-logic tests for the Ramadan companion module.
 * Run: node --test tests/ramadan.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ramadanInfo,
  ramadanLength,
  nextRamadan,
  nextEidAlFitr,
  fastPhase,
  formatCountdown,
  qadrNightInfo,
  keptFastCount,
  fastTrackerDays,
  ramadanLogKey,
  ramadanAlertTimes,
} from '../js/domain/ramadan.js';
import { toGregorian } from '../js/domain/calendar.js';
import {
  sanitizeHijriDayLog,
  monthEntry,
  taraweehCount,
  itikafCount,
  isLastTenNights,
} from '../js/domain/ramadanPlanner.js';
import { reduceWorship } from '../js/core/state/slices/worship.js';
import { plannerPanel } from '../js/views/ramadan.js';

test('ramadanInfo detects a known Ramadan date (1 Ramadan 1447 ≈ 19 Feb 2028 tabular)', () => {
  // Tabular-civil conversion, so derive the expected date instead of
  // hardcoding: 1 Ramadan 1447 through the same calendar.
  const first = toGregorian(1447, 9, 1);
  const info = ramadanInfo(first);
  assert.equal(info.inRamadan, true);
  assert.equal(info.hijri.year, 1447);
  assert.equal(info.hijri.month, 9);
  assert.equal(info.hijri.day, 1);
});

test('ramadanInfo rejects a date outside Ramadan', () => {
  const notRamadan = toGregorian(1447, 10, 5); // Shawwal
  assert.equal(ramadanInfo(notRamadan).inRamadan, false);
});

test('ramadanLength is 29 or 30 days', () => {
  for (const hy of [1446, 1447, 1448]) {
    const len = ramadanLength(hy);
    assert.ok(len === 29 || len === 30, `unexpected length ${len} for ${hy}`);
  }
});

test('nextRamadan on 1 Ramadan returns today (daysUntil 0)', () => {
  const first = toGregorian(1447, 9, 1);
  const nr = nextRamadan(first);
  assert.equal(nr.daysUntil, 0);
  assert.equal(nr.hijriYear, 1447);
});

test('nextRamadan the day after Eid looks to next year', () => {
  const afterEid = toGregorian(1447, 10, 3);
  const nr = nextRamadan(afterEid);
  assert.equal(nr.hijriYear, 1448);
  // A lunar year is ~354 days; from 3 Shawwal it's ~323 to the next 1 Ramadan.
  assert.ok(nr.daysUntil > 310 && nr.daysUntil < 345, `expected ~a year out, got ${nr.daysUntil}`);
});

test("fastPhase: post-midnight before fajr targets today's fajr", () => {
  const at2am = new Date(2026, 2, 5, 2, 0, 0);
  const phase = fastPhase(at2am, { fajr: 5.0, maghrib: 18.2 }, 5.05);
  assert.equal(phase.phase, 'night');
  assert.equal(phase.targetHours, 5.0); // today's fajr, not tomorrow's
});

test('nextEidAlFitr during Ramadan counts down within the same hijri year', () => {
  const midRamadan = toGregorian(1447, 9, 15);
  const eid = nextEidAlFitr(midRamadan);
  assert.equal(eid.hijriYear, 1447);
  assert.ok(eid.daysUntil > 0 && eid.daysUntil < 20);
});

test('fastPhase: midday is fasting, target maghrib', () => {
  const noon = new Date(2026, 2, 5, 12, 0, 0); // month index 2 = March
  const times = { fajr: 5.0, maghrib: 18.2 };
  const phase = fastPhase(noon, times, 5.1);
  assert.equal(phase.phase, 'fasting');
  assert.equal(phase.targetName, 'maghrib');
  assert.equal(phase.targetHours, 18.2);
});

test('fastPhase: after maghrib is night, target tomorrow fajr', () => {
  const night = new Date(2026, 2, 5, 20, 30, 0);
  const times = { fajr: 5.0, maghrib: 18.2 };
  const phase = fastPhase(night, times, 5.05);
  assert.equal(phase.phase, 'night');
  assert.equal(phase.targetName, 'fajr');
  assert.equal(phase.targetHours, 5.05);
});

test('fastPhase: before fajr is night', () => {
  const lateNight = new Date(2026, 2, 5, 3, 0, 0);
  const phase = fastPhase(lateNight, { fajr: 5.0, maghrib: 18.2 }, 5.0);
  assert.equal(phase.phase, 'night');
});

test('formatCountdown formats hours, minutes, seconds', () => {
  assert.equal(formatCountdown(0), '0:00');
  assert.equal(formatCountdown(65000), '1:05');
  assert.equal(formatCountdown(3661000), '1:01:01');
  assert.equal(formatCountdown(-500), '0:00');
});

test('qadrNightInfo flags odd nights in the last ten only', () => {
  assert.equal(qadrNightInfo(15).isLikelyQadrNight, false);
  assert.equal(qadrNightInfo(20).isLikelyQadrNight, false);
  assert.equal(qadrNightInfo(21).isLikelyQadrNight, true);
  assert.equal(qadrNightInfo(22).isLikelyQadrNight, false);
  assert.equal(qadrNightInfo(27).isLikelyQadrNight, true);
  assert.equal(qadrNightInfo(29).isLikelyQadrNight, true);
});

test('keptFastCount + fastTrackerDays + log key round-trip', () => {
  const hy = 1447;
  const log = { [ramadanLogKey(hy)]: { 1: true, 3: true, 5: false } };
  assert.equal(keptFastCount(log, hy), 2);
  assert.equal(keptFastCount({}, hy), 0);

  const days = fastTrackerDays(log, hy, 3, 30);
  assert.equal(days.length, 30);
  assert.equal(days[0].kept, true);
  assert.equal(days[2].kept, true);
  assert.equal(days[2].isToday, true);
  assert.equal(days[4].kept, false);
});

test('ramadanAlertTimes: suhoor = fajr minus offset, floored; iftar = maghrib', () => {
  const a = ramadanAlertTimes({ fajr: 4.52, maghrib: 18.24 }, 30);
  assert.equal(a.iftar, 18.24);
  // 4.52 - 0.5 = 4.02h = 241.2min → floored to the minute = 241min = 4.01666…h (4:01)
  assert.ok(Math.abs(a.suhoor - 4.0166666667) < 1e-6);
});

test('ramadanAlertTimes: never negative, bad offset falls back to 30', () => {
  assert.equal(ramadanAlertTimes({ fajr: 0.2, maghrib: 18 }, 60).suhoor, 0);
  const weird = ramadanAlertTimes({ fajr: 5, maghrib: 18 }, 'nope');
  assert.equal(weird.suhoor, 4.5); // 30-minute default
});

/* (v5.2.27) Ramadan planner — the v4.4 logs with no UI until this wave. */

test('planner domain: sanitize keeps only numeric day:true entries under valid keys', () => {
  const out = sanitizeHijriDayLog({
    '1447-9': { 1: true, 2: false, xx: true, 31: true },
    nope: { 1: true },
    '1447-9-extra': { 1: true },
  });
  assert.deepEqual(out, { '1447-9': { 1: true, 31: true } });
  assert.deepEqual(monthEntry(out, '1447-9'), { 1: true, 31: true });
  assert.deepEqual(monthEntry(out, '1448-9'), {});
});

test('planner domain: counts + last-ten gate', () => {
  const key = ramadanLogKey(1447);
  const taraweehLog = { [key]: { 1: true, 2: true } };
  const itikafLog = { [key]: { 27: true } };
  assert.equal(taraweehCount(key, taraweehLog), 2);
  assert.equal(itikafCount(key, itikafLog), 1);
  assert.equal(taraweehCount(key, {}), 0);
  assert.equal(isLastTenNights({ month: 9, day: 20 }), false);
  assert.equal(isLastTenNights({ month: 9, day: 21 }), true);
  assert.equal(isLastTenNights({ month: 8, day: 27 }), false);
});

test('RAMADAN_PLANNER_TOGGLE: toggles one day off/on per slice, hostile inputs no-op', () => {
  const base = { taraweehLog: {}, itikafLog: {}, lastTenLog: {} };
  const key = '1447-9';
  const on = reduceWorship(base, {
    type: 'RAMADAN_PLANNER_TOGGLE',
    slice: 'taraweehLog',
    key,
    day: '5',
  });
  assert.equal(on.taraweehLog[key]['5'], true);
  assert.deepEqual(on.itikafLog, {});
  const off = reduceWorship(on, {
    type: 'RAMADAN_PLANNER_TOGGLE',
    slice: 'taraweehLog',
    key,
    day: '5',
  });
  assert.equal(off.taraweehLog[key]['5'], undefined);
  // Hostile: unknown slice, malformed key, out-of-range day — all no-ops.
  for (const bad of [
    { slice: 'settings', key, day: '5' },
    { slice: '__proto__', key, day: '5' },
    { slice: 'taraweehLog', key: '__proto__', day: '5' },
    { slice: 'taraweehLog', key, day: '0' },
    { slice: 'taraweehLog', key, day: '31' },
    { slice: 'taraweehLog', key, day: 'abc' },
  ]) {
    assert.equal(reduceWorship(base, { type: 'RAMADAN_PLANNER_TOGGLE', ...bad }), base);
  }
});

test('plannerPanel: renders three dot grids with the planner toggle action', () => {
  const hijri = { year: 1447, day: 25 };
  const html = plannerPanel({ taraweehLog: {}, itikafLog: {}, lastTenLog: {} }, 'en', hijri, 30);
  assert.ok(html.includes('ramadan.plannerTitle') === false, 'titles are translated, not keys');
  assert.ok(html.includes('data-action="ramadan-planner-toggle"'));
  assert.ok(html.includes('data-slice="taraweehLog"'));
  assert.ok(html.includes('data-slice="itikafLog"'));
  assert.ok(html.includes('data-slice="lastTenLog"'));
  // 30 taraweeh + 30 itikaf + 10 last-ten nights (21..30).
  const dots = html.match(/ramadan-planner-toggle/g).length;
  assert.equal(dots, 70);
  // Future days disabled: day 26+ of the 30-day grids carry the attribute.
  assert.ok(html.includes('data-day="26"'));
  // A kept night renders pressed.
  const key = ramadanLogKey(1447);
  const kept = plannerPanel(
    { taraweehLog: { [key]: { 1: true } }, itikafLog: {}, lastTenLog: {} },
    'en',
    hijri,
    30
  );
  assert.ok(kept.includes('aria-pressed="true"'));
});
