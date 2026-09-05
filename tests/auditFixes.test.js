/**
 * tests/auditFixes.test.js — regression pins for the independent audit
 * round (scheduler guard, journal dates, stats, restore clamps, scroll
 * keys, collection counts). Each test names the defect it guards.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shouldFire } from '../js/services/notifications.js';
import { localDayKey } from '../js/domain/duaJournal.js';
import { activeDays } from '../js/domain/statistics.js';
import { computeFitr } from '../js/domain/zakat.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { viewKeyOf } from '../js/app/renderer.js';
import { liveCollectionCount } from '../js/views/collections.js';

describe('scheduler never throws on corrupt times', () => {
  test('shouldFire degrades to false, never throws', () => {
    const noon = new Date(2026, 0, 1, 12, 0);
    assert.equal(shouldFire(null, noon), false);
    assert.equal(shouldFire(undefined, noon), false);
    assert.equal(shouldFire('25:00', noon), false);
    assert.equal(shouldFire(42, noon), false);
    assert.equal(shouldFire('11:59', noon), true, 'sane times still fire');
  });
});

describe('journal export uses local days', () => {
  test('localDayKey renders device-local YYYY-MM-DD', () => {
    assert.match(localDayKey(new Date(2026, 0, 15, 0, 30).getTime()), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(localDayKey(NaN), '');
  });
});

describe('active days count reading', () => {
  test('a read-only day is active', () => {
    const stats = { dailyHistory: { '2026-09-01': { recitations: 0, readingSec: 600 } } };
    assert.equal(activeDays(stats), 1);
    assert.equal(activeDays({ dailyHistory: {} }), 0);
  });
});

describe('fitr never bills fractional people', () => {
  test('household floors', () => {
    assert.equal(computeFitr(10, 2.9).people, 2);
    assert.equal(computeFitr(10, 4).total, 40);
  });
});

describe('restore clamps the mushaf bookmark', () => {
  test('page 0/99999/negative degrade to null', () => {
    for (const page of [0, -3, 99999, 604.5]) {
      const out = sanitizeRestoredPayload({ mushafBookmark: { page, ts: 1 } });
      const ok = out.mushafBookmark.page === null || out.mushafBookmark.page === 604;
      assert.ok(ok, `page ${page} must not ride in raw`);
    }
    const good = sanitizeRestoredPayload({ mushafBookmark: { page: 42, ts: 1 } });
    assert.equal(good.mushafBookmark.page, 42);
  });
});

describe('scroll memory keys separate surfaces', () => {
  test('mushaf pages and journal tabs key independently', () => {
    assert.notEqual(viewKeyOf('mushaf', { page: '3' }), viewKeyOf('mushaf', { page: '4' }));
    assert.notEqual(viewKeyOf('quran', { id: '2' }), viewKeyOf('quran', { id: '3' }));
    assert.equal(viewKeyOf('home', {}), viewKeyOf('home', {}), 'stable');
  });
});

describe('collection tiles count live items', () => {
  test('deleted ids excluded', () => {
    const state = { library: { itemIndex: { a: {}, b: {} } } };
    assert.equal(liveCollectionCount(state, { items: ['a', 'b', 'ghost'] }), 2);
    assert.equal(liveCollectionCount(state, null), 0);
  });
});
