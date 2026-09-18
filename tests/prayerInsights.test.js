/**
 * tests/prayerInsights.test.js — (v5.10.1) prayer-log analytics (best
 * streak, 30-day insights) plus the iqama-wait sanitizer allowlist.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PRAYER_KEYS, prayerBestStreak, prayerInsights } from '../js/domain/prayerLog.js';
import { sanitizeSettings } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const at = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);

function fullDay(kind = 'prayed') {
  const o = {};
  for (const k of PRAYER_KEYS) o[k] = kind;
  return o;
}

describe('prayerBestStreak', () => {
  test('longest run across gaps; partial days reset', () => {
    const map = {
      [iso(2026, 9, 10)]: fullDay(),
      [iso(2026, 9, 11)]: fullDay(),
      [iso(2026, 9, 12)]: { fajr: 'prayed' },
      [iso(2026, 9, 14)]: fullDay(),
      [iso(2026, 9, 15)]: fullDay(),
      [iso(2026, 9, 16)]: fullDay(),
    };
    assert.equal(prayerBestStreak(map), 3);
  });

  test('empty and hostile maps yield zero', () => {
    assert.equal(prayerBestStreak({}), 0);
    assert.equal(prayerBestStreak(null), 0);
    assert.equal(prayerBestStreak({ nope: fullDay(), '2026-13-99': fullDay() }), 0);
  });
});

describe('prayerInsights', () => {
  test('rates, jamaah share, most-missed prayer', () => {
    const map = {
      [iso(2026, 9, 15)]: { ...fullDay('jamaah'), fajr: 'prayed' },
      [iso(2026, 9, 16)]: { dhuhr: 'prayed', maghrib: 'prayed' },
      [iso(2026, 9, 17)]: fullDay('jamaah'),
    };
    const ins = prayerInsights(map, 30, at(2026, 9, 17));
    assert.equal(ins.days, 3);
    assert.equal(ins.logged, 5 + 2 + 5);
    assert.equal(ins.total, 15);
    assert.ok(Math.abs(ins.rate - 12 / 15) < 1e-9);
    assert.equal(ins.jamaah, 4 + 5);
    assert.ok(Math.abs(ins.jamaahRate - 9 / 12) < 1e-9);
    assert.equal(ins.mostMissed, 'fajr');
    assert.equal(ins.missedByPrayer.fajr, 1);
    assert.equal(ins.bestStreak, 1);
  });

  test('no data degrades to zeros with null most-missed', () => {
    const ins = prayerInsights({}, 30, at(2026, 9, 17));
    assert.deepEqual(
      { days: ins.days, rate: ins.rate, jamaahRate: ins.jamaahRate, mostMissed: ins.mostMissed },
      { days: 0, rate: 0, jamaahRate: 0, mostMissed: null }
    );
  });
});

describe('iqama sanitizer', () => {
  test('fard-only 0..60, zeros dropped, sunrise excluded', () => {
    const base = initialState().settings;
    const out = sanitizeSettings({
      ...base,
      prayer: {
        ...base.prayer,
        iqama: { fajr: 15, dhuhr: 0, maghrib: 99, sunrise: 10, nope: 5, asr: -3 },
      },
    }).prayer.iqama;
    assert.deepEqual(out, { fajr: 15, maghrib: 60 });
    const clean = sanitizeSettings({ ...base, prayer: { ...base.prayer } }).prayer.iqama;
    assert.deepEqual(clean, {});
  });
});
