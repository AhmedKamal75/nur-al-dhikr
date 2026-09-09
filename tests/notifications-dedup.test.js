/**
 * notifications-dedup.test.js — F-007: the persisted day-dedup is shared
 * across tabs. A sibling tab's write must invalidate our cache (storage
 * event) and never be clobbered by ours (merge-on-write).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  wasDayFired,
  markDayFired,
  handleDayFiredStorageEvent,
  DAY_DEDUP_KEY_FOR_TESTS,
} from '../js/services/notifications.js';

const TODAY = '2026-09-09';

function installStorage(seed = {}) {
  const mem = { ...seed };
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
  return mem;
}

test('F-007: a sibling tab write invalidates our cache', () => {
  const mem = installStorage();
  try {
    markDayFired('a-fire', TODAY);
    assert.equal(wasDayFired('a-fire', TODAY), true);
    assert.equal(wasDayFired('b-fire', TODAY), false); // primes the day cache
    // Sibling tab fires and persists directly (bypassing our module).
    mem[DAY_DEDUP_KEY_FOR_TESTS] = JSON.stringify({
      'a-fire': TODAY,
      'b-fire': TODAY,
    });
    assert.equal(wasDayFired('b-fire', TODAY), false, 'stale cache without the event');
    handleDayFiredStorageEvent({ key: DAY_DEDUP_KEY_FOR_TESTS });
    assert.equal(wasDayFired('b-fire', TODAY), true, 'fresh read after the event');
    handleDayFiredStorageEvent({ key: 'unrelated' });
  } finally {
    delete globalThis.localStorage;
  }
});

test('F-007: our write merges sibling keys instead of clobbering', () => {
  const mem = installStorage();
  try {
    markDayFired('a-fire', TODAY);
    assert.equal(wasDayFired('a-fire', TODAY), true); // primes cache
    mem[DAY_DEDUP_KEY_FOR_TESTS] = JSON.stringify({
      'a-fire': TODAY,
      'b-fire': TODAY,
    });
    markDayFired('c-fire', TODAY);
    const stored = JSON.parse(mem[DAY_DEDUP_KEY_FOR_TESTS]);
    assert.deepEqual(Object.keys(stored).sort(), ['a-fire', 'b-fire', 'c-fire']);
  } finally {
    delete globalThis.localStorage;
  }
});
