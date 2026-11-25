import test from 'node:test';
import assert from 'node:assert/strict';
import { store, actions } from '../js/core/state.js';
import { rt } from '../js/app/rt.js';
import { invalidateLazyFetches } from '../js/app/lazyData.js';
import {
  quranBulkResource,
  tafsirBulkResource,
  cancelBulkResources,
} from '../js/app/bulkResources.js';
import { ensureQuranSearchData } from '../js/app/quranSearch.js';
import { ensureTafsirSearchData } from '../js/app/tafsirSearch.js';
import {
  resetQuranIndex,
  setQuranIndexReady,
  isQuranSearchReady,
} from '../js/domain/quranSearch.js';
import { resetTafsirIndex, isTafsirSearchReady } from '../js/domain/tafsirSearch.js';
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { resolve, promise };
};
const response = (x) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' } });
const flush = () => new Promise((r) => setImmediate(r));
const reset = () => {
  store.dispatch(actions.resetAll());
  invalidateLazyFetches();
  resetQuranIndex();
  setQuranIndexReady(false);
  resetTafsirIndex();
  store.dispatch(actions.updateSettings({ compressedDownloads: false }));
  store.dispatch(actions.navigate('search', { q: 'test' }));
  store.dispatch(actions.setQuranMeta({ surahs: [] }));
};
const edition = { id: 'local', bundled: true };
test('tafsir catalog concurrent preflight publishes one build; remote explicit still denied', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    const catalog = defer(),
      chunk = defer();
    let catalogs = 0,
      texts = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes('editions')) {
        catalogs++;
        await catalog.promise;
        return response({ editions: [edition, { id: 'remote', bundled: false }] });
      }
      texts++;
      await chunk.promise;
      return response({ 1: 'text' });
    };
    const a = ensureTafsirSearchData(),
      b = ensureTafsirSearchData();
    catalog.resolve();
    await flush();
    assert.equal(catalogs, 1);
    assert.equal(texts, 24);
    chunk.resolve();
    assert.equal(await a, true);
    await b;
    assert.equal(texts, 114);
    assert.equal(isTafsirSearchReady(), true);
    resetTafsirIndex();
    rt.tafsirSearchBuildStarted = false;
    assert.equal(await ensureTafsirSearchData('remote'), false);
    assert.equal(texts, 114);
  } finally {
    cancelBulkResources();
    globalThis.fetch = fetch;
  }
});
test('invalidated catalog preflight cannot start an obsolete bulk owner', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    const gate = defer();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      await gate.promise;
      return response({ editions: [edition] });
    };
    const a = ensureTafsirSearchData();
    cancelBulkResources();
    gate.resolve();
    assert.equal(await a, false);
    assert.equal(calls, 1);
    assert.equal(tafsirBulkResource.pending, null);
  } finally {
    cancelBulkResources();
    globalThis.fetch = fetch;
  }
});
test('exit then return before old chunk settles: old completion does not dispatch or erase new owner', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    store.dispatch(actions.setTafsirEditions({ editions: [edition] }));
    const old = defer(),
      fresh = defer();
    let calls = 0;
    globalThis.fetch = async () => {
      const d = ++calls <= 24 ? old : fresh;
      await d.promise;
      return response({ 1: d === old ? 'old' : 'fresh' });
    };
    const a = ensureTafsirSearchData();
    await flush();
    const oldCtl = rt.tafsirBulkAbort;
    store.dispatch(actions.navigate('roots', {}));
    cancelBulkResources();
    store.dispatch(actions.navigate('search', { q: 'test' }));
    const b = ensureTafsirSearchData();
    await flush();
    const newCtl = rt.tafsirBulkAbort;
    assert.equal(oldCtl.signal.aborted, true);
    assert.equal(newCtl.signal.aborted, false);
    old.resolve();
    assert.equal(await a, false);
    assert.equal(rt.tafsirBulkAbort, newCtl);
    assert.equal(store.getState().tafsir.local, undefined);
    fresh.resolve();
    assert.equal(await b, true);
    assert.equal(store.getState().tafsir.local['1']['1'], 'fresh');
    assert.equal(rt.tafsirBulkAbort, null);
  } finally {
    cancelBulkResources();
    globalThis.fetch = fetch;
  }
});
test('Search to Mutashabihat: Quran continues, tafsir stops scheduling at next ownership check', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    store.dispatch(actions.setTafsirEditions({ editions: [edition] }));
    const gate = defer();
    let qCalls = 0,
      tCalls = 0;
    globalThis.fetch = async (url) => {
      const q = String(url).includes('/quran/');
      if (q) qCalls++;
      else tCalls++;
      await gate.promise;
      return response(q ? { ayahs: [], translationEdition: 'en-sahih' } : { 1: 'text' });
    };
    const q = ensureQuranSearchData(),
      t = ensureTafsirSearchData();
    await flush();
    assert.equal(qCalls, 24);
    assert.equal(tCalls, 24);
    store.dispatch(actions.navigate('mutashabihat', {}));
    gate.resolve();
    await Promise.all([q, t]);
    assert.equal(qCalls, 114);
    assert.equal(tCalls, 24);
    assert.equal(isQuranSearchReady(), true);
    assert.equal(isTafsirSearchReady(), false);
    assert.equal(tafsirBulkResource.pending, null);
    assert.equal(quranBulkResource.pending, null);
  } finally {
    cancelBulkResources();
    globalThis.fetch = fetch;
  }
});

test('Quran bulk canceled during meta fetch cannot publish into a new build', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    store.dispatch(actions.setQuranMeta(null));
    const old = defer(),
      fresh = defer();
    let metaCalls = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes('quran-meta')) {
        const gate = ++metaCalls === 1 ? old : fresh;
        await gate.promise;
        return response({ surahs: [], owner: gate === old ? 'old' : 'fresh' });
      }
      return response({ ayahs: [], translationEdition: 'en-sahih' });
    };
    const a = ensureQuranSearchData();
    await flush();
    const ctl = rt.quranBulkAbort;
    cancelBulkResources();
    const b = ensureQuranSearchData();
    const next = rt.quranBulkAbort;
    assert.equal(ctl.signal.aborted, true);
    old.resolve();
    assert.equal(await a, false);
    assert.equal(store.getState().quran.meta, null);
    assert.equal(rt.quranBulkAbort, next);
    fresh.resolve();
    await b;
    assert.equal(store.getState().quran.meta.owner, 'fresh');
    assert.equal(isQuranSearchReady(), true);
  } finally {
    cancelBulkResources();
    globalThis.fetch = fetch;
  }
});
