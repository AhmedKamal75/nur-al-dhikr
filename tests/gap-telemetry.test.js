/**
 * tests/gap-telemetry.test.js — (v5.11.0 C) opt-in, local-only follow-gap
 * telemetry: pure math, the disabled-by-default gate, sample lifecycle,
 * hostile storage/sanitize input, and the ring-buffer cap.
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentile,
  summarize,
  setEnabled,
  isEnabled,
  markDispatch,
  markApplied,
  recordEffect,
  noteLongtask,
  stats,
  clear,
  hydrate,
  resetGapTelemetryForTests,
  MAX_SAMPLES,
} from '../js/services/gapTelemetry.js';
import { sanitizeSettings } from '../js/core/config.js';

function stubStorage() {
  const data = new Map();
  const fake = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    _data: data,
  };
  const prev = globalThis.localStorage;
  globalThis.localStorage = fake;
  return { fake, restore: () => {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  } };
}

beforeEach(() => resetGapTelemetryForTests());
afterEach(() => resetGapTelemetryForTests());

describe('percentile/summarize', () => {
  test('nearest-rank math', () => {
    assert.equal(percentile([1, 2, 3, 4], 50), 2);
    assert.equal(percentile([1, 2, 3, 4], 95), 4);
    assert.equal(percentile([7], 50), 7);
  });

  test('hostile input', () => {
    assert.equal(percentile(null, 50), null);
    assert.equal(percentile([], 50), null);
    assert.equal(percentile(['x', -1, NaN], 50), null);
    assert.deepEqual(summarize([]), { count: 0, p50: null, p95: null, max: null, last: null });
    const s = summarize([10, 20, 30]);
    assert.deepEqual(s, { count: 3, p50: 20, p95: 30, max: 30, last: 30 });
  });
});

describe('opt-in gate', () => {
  test('disabled by default: every mark is a no-op', () => {
    assert.equal(isEnabled(), false);
    markDispatch('2:255');
    markApplied('2:255');
    recordEffect(5);
    noteLongtask(60);
    assert.equal(stats().count, 0);
    assert.equal(stats().longtasks.count, 0);
  });

  test('dispatch → applied closes one sample', () => {
    setEnabled(true);
    markDispatch('2:255');
    markApplied('2:255');
    const s = stats();
    assert.equal(s.count, 1);
    assert.ok(Number.isFinite(s.gap.p50) && s.gap.p50 >= 0);
  });

  test('applied without dispatch records nothing; null dispatch clears', () => {
    setEnabled(true);
    markApplied('2:255');
    assert.equal(stats().count, 0);
    markDispatch('2:255');
    markDispatch(null);
    markApplied('2:255');
    assert.equal(stats().count, 0, 'stale stamp dropped on session end');
  });

  test('hostile longtasks dropped', () => {
    setEnabled(true);
    noteLongtask(-5);
    noteLongtask('junk');
    noteLongtask(10 ** 9);
    assert.equal(stats().longtasks.count, 0);
    noteLongtask(52);
    assert.deepEqual(stats().longtasks, { count: 1, totalMs: 52 });
  });
});

describe('ring buffer + persistence', () => {
  test('caps at MAX_SAMPLES, oldest evicted first', () => {
    setEnabled(true);
    for (let i = 0; i < MAX_SAMPLES + 40; i += 1) {
      markDispatch(`2:${i + 1}`);
      markApplied(`2:${i + 1}`);
    }
    assert.equal(stats().count, MAX_SAMPLES);
  });

  test('round-trips through storage, hostile rows dropped', () => {
    const { fake, restore } = stubStorage();
    try {
      fake.setItem(
        'nur.gapTelemetry.v1',
        JSON.stringify([
          { t: 1, gapMs: 40, effectMs: 3 },
          { t: 2, gapMs: -9, effectMs: 1 }, // hostile gap
          'junk',
          { t: 3, gapMs: 10 ** 9 }, // frozen tab, not a measurement
          { t: 4, gapMs: 12, effectMs: 'x' }, // hostile effect
        ])
      );
      assert.deepEqual(hydrate(), [{ t: 1, gapMs: 40, effectMs: 3 }]);
    } finally {
      restore();
    }
  });

  test('corrupt storage hydrates empty, never throws', () => {
    const { fake, restore } = stubStorage();
    try {
      fake.setItem('nur.gapTelemetry.v1', '{nope');
      assert.deepEqual(hydrate(), []);
    } finally {
      restore();
    }
  });

  test('clear() empties memory and storage', () => {
    const { fake, restore } = stubStorage();
    try {
      setEnabled(true);
      markDispatch('2:255');
      markApplied('2:255');
      assert.equal(stats().count, 1);
      clear();
      assert.equal(stats().count, 0);
      assert.equal(fake.getItem('nur.gapTelemetry.v1'), null);
    } finally {
      restore();
    }
  });
});

describe('settings plumbing', () => {
  test('gapTelemetry sanitizes strict-boolean, default off', () => {
    assert.equal(sanitizeSettings({}).gapTelemetry, false);
    assert.equal(sanitizeSettings({ gapTelemetry: true }).gapTelemetry, true);
    assert.equal(sanitizeSettings({ gapTelemetry: 'yes' }).gapTelemetry, false);
    assert.equal(sanitizeSettings({ gapTelemetry: 1 }).gapTelemetry, false);
    assert.equal(sanitizeSettings(null).gapTelemetry, false);
  });
});
