/**
 * fetch-timeout-catalog.test.js — B2/B8 regressions:
 * fetchJSON escapes a hung socket via timeout; loadCatalog shares one
 * in-flight promise instead of returning null to the second caller.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchJSON } from '../js/app/net.js';

test('B8: fetchJSON rejects on a hung socket within the timeout', async () => {
  const realFetch = globalThis.fetch;
  let seenSignal = null;
  globalThis.fetch = (url, { signal } = {}) =>
    new Promise((resolve, reject) => {
      seenSignal = signal || null;
      if (signal) {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }
    });
  try {
    const start = Date.now();
    await assert.rejects(fetchJSON('data/quran/2.json', { timeoutMs: 50 }));
    assert.ok(Date.now() - start < 5000, 'timeout must fire, not hang');
    assert.ok(seenSignal, 'fetch must receive an abort signal');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('B8: fetchJSON still passes a genuine document through', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    assert.deepEqual(await fetchJSON('data/catalog.json'), { ok: true });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('B2: concurrent loadCatalog() calls share one fetch', async () => {
  const realFetch = globalThis.fetch;
  const { loadCatalog, resetCatalogForTests } = await import('../js/services/audioCatalog.js');
  resetCatalogForTests();
  let calls = 0;
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const doc = { reciters: [{ id: 'x', server: 'https://x/', nameEn: 'X', nameAr: 'X' }] };
  globalThis.fetch = async () => {
    calls += 1;
    await gate;
    return new Response(JSON.stringify(doc), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const p1 = loadCatalog();
    const p2 = loadCatalog();
    release();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(calls, 1);
    assert.ok(r1, 'catalog resolves');
    assert.equal(r1, r2);
  } finally {
    globalThis.fetch = realFetch;
    resetCatalogForTests();
  }
});

test('B2: failed catalog load retries on the next call', async () => {
  const realFetch = globalThis.fetch;
  const { loadCatalog, resetCatalogForTests } = await import('../js/services/audioCatalog.js');
  resetCatalogForTests();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new Error('network down');
    return new Response(JSON.stringify({ reciters: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    assert.equal(await loadCatalog(), null);
    const retry = await loadCatalog();
    assert.ok(retry);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = realFetch;
    resetCatalogForTests();
  }
});
