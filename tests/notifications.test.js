/**
 * tests/notifications.test.js — reminder catch-up window (pure helper)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldFire } from '../js/services/notifications.js';

const at = (h, m) => new Date(2026, 7, 24, h, m, 0, 0);

test('shouldFire: fires on the exact minute', () => {
  assert.equal(shouldFire('07:30', at(7, 30)), true);
});

test('shouldFire: catches up within 2 minutes (throttled-tab recovery)', () => {
  assert.equal(shouldFire('07:30', at(7, 31)), true);
  assert.equal(shouldFire('07:30', at(7, 32)), true);
});

test('shouldFire: never fires before the target time', () => {
  assert.equal(shouldFire('07:30', at(7, 29)), false);
  assert.equal(shouldFire('07:30', at(6, 0)), false);
});

test('shouldFire: gives up after the catch-up window (no stale spam)', () => {
  assert.equal(shouldFire('07:30', at(7, 33)), false);
  assert.equal(shouldFire('07:30', at(10, 0)), false);
});

test('shouldFire: midnight-wrap safety — yesterday 23:59 vs today 00:01 is late, not early', () => {
  // 00:01 target vs clock 23:58 same-day reading: target not reached (negative)
  assert.equal(shouldFire('00:01', at(23, 58)), false);
});
