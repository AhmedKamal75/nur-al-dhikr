/**
 * tests/audit-fixes-5.2.77.test.js — regression pins for the 360° audit wave.
 * Pure reducer/sanitizer/selector checks only (no DOM, no network).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeSettings } from '../js/core/config.js';
import { viewKeyOf } from '../js/app/renderer.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

describe('audit wave v5.2.77', () => {
  test('BUG-01: TICKER_NUDGE notifies without touching speech or persisted slices', () => {
    const s0 = { ...initialState(), speakingItemId: 'c1:i2' };
    const s1 = reduce(s0, actions.tickerNudge());
    assert.notEqual(s1, s0, 'must produce a new root (notify)');
    assert.equal(s1.speakingItemId, 'c1:i2', 'speech preserved');
    assert.equal(s1.tickerSeq, (s0.tickerSeq || 0) + 1, 'tickerSeq bumps');
    assert.equal(s1.settings, s0.settings, 'persisted settings untouched');
    assert.equal(s1.favorites, s0.favorites, 'persisted favorites untouched');
  });

  test('BUG-02: new lazy tiers use the loadErrors/Retry machinery keys', () => {
    const s0 = initialState();
    for (const key of [
      'quran-words',
      'quran-roots',
      'quran-roots-full',
      'tajweed-pool',
      'word-dict',
    ]) {
      const failed = reduce(s0, actions.setLoadError(key, true));
      assert.equal(failed.loadErrors[key], true, `${key} flags`);
      const retried = reduce(failed, actions.retryDataLoad(key));
      assert.ok(!(key in retried.loadErrors), `${key} retry clears`);
      assert.ok(retried.loadRetryCount > failed.loadRetryCount, 'retry bumps counter');
    }
  });

  test('BUG-06: viewKeyOf separates mushaf pages (scroll restore key)', () => {
    assert.notEqual(viewKeyOf('mushaf', { page: 10 }), viewKeyOf('mushaf', { page: 11 }));
    assert.equal(viewKeyOf('mushaf', { page: 10 }), viewKeyOf('mushaf', { page: 10 }));
  });

  test('UP-03: locationAccuracy sanitized (junk -> null, meters clamped)', () => {
    assert.equal(
      sanitizeSettings({ prayer: { locationAccuracy: 12 } }).prayer.locationAccuracy,
      12
    );
    assert.equal(
      sanitizeSettings({ prayer: { locationAccuracy: 'junk' } }).prayer.locationAccuracy,
      null
    );
    assert.equal(sanitizeSettings({ prayer: {} }).prayer.locationAccuracy, null);
    assert.equal(
      sanitizeSettings({ prayer: { locationAccuracy: 999999 } }).prayer.locationAccuracy,
      100000
    );
  });

  test('i18n parity: qibla.accuracy exists in both languages with same placeholder', () => {
    assert.ok(en['qibla.accuracy'] && ar['qibla.accuracy']);
    assert.ok(en['qibla.accuracy'].includes('{m}') && ar['qibla.accuracy'].includes('{m}'));
  });
});
