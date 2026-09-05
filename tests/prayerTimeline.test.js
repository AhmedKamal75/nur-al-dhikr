/**
 * tests/prayerTimeline.test.js — full-day timeline strip math (v5.2.0).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimeline,
  nextPrayerCountdown,
  spanBetween,
  stripPosition,
} from '../js/domain/prayerTimeline.js';

const TIMES = { fajr: 5.5, sunrise: 7, dhuhr: 12.5, asr: 15.75, maghrib: 18.25, isha: 19.75 };

test('positions fold hours into [0,1]; midnight wrap lands near 0', () => {
  assert.equal(stripPosition(12), 0.5);
  assert.ok(Math.abs(stripPosition(24.07) - 0.0029) < 0.001);
  assert.ok(Math.abs(stripPosition(-1) - 0.9583) < 0.001);
  assert.equal(stripPosition(NaN), null);
  assert.equal(stripPosition(Infinity), null);
});

test('buildTimeline emits six markers + now position', () => {
  const tl = buildTimeline(TIMES, 10);
  assert.equal(tl.markers.length, 6);
  assert.deepEqual(tl.markers[0], { name: 'fajr', at: stripPosition(5.5) });
  assert.equal(tl.nowAt, 10 / 24);
});

test('unreachable and non-finite entries never plot', () => {
  const tl = buildTimeline({ ...TIMES, isha: NaN, unreachable: { fajr: true } }, 10);
  assert.equal(tl.markers.length, 4);
  assert.ok(!tl.markers.some((m) => m.name === 'isha' || m.name === 'fajr'));
});

test('spanBetween clamps to [0,1] and rejects garbage', () => {
  assert.equal(spanBetween(0.2, 0.5), 0.3);
  assert.equal(spanBetween(0.5, 0.2), 0);
  assert.equal(spanBetween(NaN, 0.5), 0);
});

test('nextPrayerCountdown picks the coming prayer with floored parts', () => {
  const at = (h, m = 0, s = 0) => new Date(2026, 8, 4, h, m, s);
  const cd = nextPrayerCountdown(TIMES, at(10));
  assert.equal(cd.name, 'dhuhr');
  assert.equal(cd.tomorrow, false);
  assert.equal(cd.h, 2);
  assert.equal(cd.m, 30);
  assert.equal(cd.totalSec, 2 * 3600 + 30 * 60);
});

test('nextPrayerCountdown rolls past midnight to fajr', () => {
  const at = (h, m = 0) => new Date(2026, 8, 4, h, m, 0);
  const cd = nextPrayerCountdown(TIMES, at(21));
  assert.equal(cd.name, 'fajr');
  assert.equal(cd.tomorrow, true);
  // 21:00 → 05:30 next day = 8h30m.
  assert.equal(cd.h, 8);
  assert.equal(cd.m, 30);
});

test('nextPrayerCountdown returns null without a finite fajr', () => {
  assert.equal(nextPrayerCountdown({}, new Date(2026, 8, 4, 10)), null);
  assert.equal(nextPrayerCountdown({ fajr: NaN }, new Date(2026, 8, 4, 10)), null);
});
