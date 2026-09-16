/**
 * tests/p0-roadmap-fixes.test.js — v5.2.73 P0 regressions for
 * Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72:
 *
 * 1. BUG-01: a library that fails to load must never cause its favorites /
 *    collection refs to be pruned (irreversible user-data loss).
 * 2. BUG-02: RESET_ALL / RESTORE_STATE must reset the hadith, small-roots
 *    and qur'an-search fetch guards (eternal skeletons otherwise).
 * 3. UP-02: `#/settings/<slug>` arrivals resolve a scroll target (the
 *    renderer scrolls the section up + focuses its summary).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { actions, store } from '../js/core/state.js';
import {
  failedLibraryIds,
  loadLibraries,
  refreshLibraryIndex,
  resetFailedLibrariesForTests,
} from '../js/app/net.js';
import { resetStaleFetchGuards } from '../js/app/stateSub.js';
import { settingsSectionScrollTarget } from '../js/app/renderer.js';
import { rt } from '../js/app/rt.js';
import {
  buildQuranIndex,
  isQuranSearchReady,
  quranIndexSize,
  resetQuranIndex,
  setQuranIndexReady,
} from '../js/domain/quranSearch.js';

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const OK_DOC = {
  metadata: { id: 'lib-ok', name: { en: 'OK', ar: '' } },
  categories: [{ id: 'c1', items: [{ id: 'ok-001' }, { id: 'ok-002' }] }],
};

describe('BUG-01: prune skips while a library fetch has failed', () => {
  test('loadLibraries records the failed library id', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.endsWith('.gz')) return new Response('x', { status: 404 });
      if (u.includes('catalog.json')) {
        return json({
          libraries: [
            { id: 'lib-ok', file: 'data/lib-ok.json', order: 1 },
            { id: 'lib-down', file: 'data/lib-down.json', order: 2 },
          ],
        });
      }
      if (u.includes('lib-ok.json')) return json(OK_DOC);
      return new Response('offline', { status: 503 });
    };
    resetFailedLibrariesForTests();
    try {
      const { documents, order, failedLibraryIds: failed } = await loadLibraries();
      assert.ok(documents['lib-ok'], 'successful library loads');
      assert.ok(!documents['lib-down'], 'failed library absent');
      assert.ok(failed.includes('lib-down'), 'failure tracked');
      assert.ok(failedLibraryIds.has('lib-down'), 'session set tracks it');
      // The tier flag fires (partial failure still boots with content, so
      // the flag stays clear here — only a TOTAL failure flags the tier).
      assert.equal(order.length, 1);
    } finally {
      globalThis.fetch = realFetch;
      resetFailedLibrariesForTests();
    }
  });

  test('refreshLibraryIndex keeps favorites of the failed library', () => {
    resetFailedLibrariesForTests();
    store.dispatch(
      actions.bootComplete({ documents: { 'lib-ok': OK_DOC }, order: ['lib-ok'], itemIndex: {} })
    );
    store.dispatch(actions.toggleFavorite('ok-001'));
    store.dispatch(actions.toggleFavorite('down-001')); // lives in the failed lib
    // Sanity: with no failures the unknown id IS pruned (old behavior kept
    // for provably-gone ids).
    refreshLibraryIndex();
    assert.ok(
      !store.getState().favorites.includes('down-001'),
      'provably-gone ids still prune when every library loaded'
    );
    // Restore it, then simulate the failed session: the prune must stand down.
    store.dispatch(actions.toggleFavorite('down-001'));
    failedLibraryIds.add('lib-down');
    refreshLibraryIndex();
    const favs = store.getState().favorites;
    assert.ok(favs.includes('ok-001'), 'loaded ids survive');
    assert.ok(favs.includes('down-001'), 'failed-library ids survive the prune');
    assert.ok(store.getState().library.itemIndex['ok-001'], 'index still refreshes');
    // Cleanup for the next file/process state.
    store.dispatch(actions.toggleFavorite('ok-001'));
    store.dispatch(actions.toggleFavorite('down-001'));
    resetFailedLibrariesForTests();
  });
});

describe('BUG-02: stale fetch guards reset when their data is gone', () => {
  const snapRt = () => ({
    hadithIndexStarted: rt.hadithIndexStarted,
    quranRootsFetchStarted: rt.quranRootsFetchStarted,
    quranSearchBuildStarted: rt.quranSearchBuildStarted,
  });
  const restoreRt = (s) => {
    rt.hadithIndexStarted = s.hadithIndexStarted;
    rt.quranRootsFetchStarted = s.quranRootsFetchStarted;
    rt.quranSearchBuildStarted = s.quranSearchBuildStarted;
  };

  test('wiped hadith/roots/search slices re-arm their guards', () => {
    const before = snapRt();
    rt.hadithIndexStarted = true;
    rt.quranRootsFetchStarted = true;
    rt.quranSearchBuildStarted = true;
    buildQuranIndex({ 1: { ayahs: [{ number: 1, text: 'a', translation: 'b' }] } });
    setQuranIndexReady(true);
    try {
      // A post-RESET_ALL shaped state: ephemeral slices gone.
      resetStaleFetchGuards({
        quran: { meta: null, surahs: {} },
        mushaf: { meta: null },
        quranRoots: null,
        quranRootsFull: null,
        tafsirEditions: null,
        tajweedPool: null,
        hadith: { index: null },
      });
      assert.equal(rt.hadithIndexStarted, false, 'hadith guard re-arms');
      assert.equal(rt.quranRootsFetchStarted, false, 'roots guard re-arms');
      assert.equal(rt.quranSearchBuildStarted, false, 'search latch re-arms');
      assert.equal(quranIndexSize(), 0, 'stale search records dropped');
      assert.equal(isQuranSearchReady(), false, 'stale search ready-flag dropped');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
      restoreRt(before);
    }
  });

  test('present data keeps its guards (no refetch storms)', () => {
    const before = snapRt();
    rt.hadithIndexStarted = true;
    rt.quranRootsFetchStarted = true;
    rt.quranSearchBuildStarted = true;
    buildQuranIndex({ 1: { ayahs: [{ number: 1, text: 'a', translation: 'b' }] } });
    setQuranIndexReady(true);
    try {
      resetStaleFetchGuards({
        quran: { meta: {}, surahs: { 1: { ayahs: [] } } },
        mushaf: { meta: {} },
        quranRoots: {},
        quranRootsFull: {},
        tafsirEditions: {},
        tajweedPool: {},
        hadith: { index: { books: [] } },
      });
      assert.equal(rt.hadithIndexStarted, true, 'healthy hadith guard untouched');
      assert.equal(rt.quranRootsFetchStarted, true, 'healthy roots guard untouched');
      assert.equal(rt.quranSearchBuildStarted, true, 'healthy search latch untouched');
      assert.equal(isQuranSearchReady(), true, 'healthy ready-flag untouched');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
      restoreRt(before);
    }
  });
});

describe('UP-02: settings deep-link scroll targets', () => {
  test('known slug on the settings view resolves its section', () => {
    assert.equal(
      settingsSectionScrollTarget({ activeView: 'settings', activeParams: { id: 'data' } }),
      'settings-sec-data'
    );
    assert.equal(
      settingsSectionScrollTarget({ activeView: 'settings', activeParams: { id: 'reciter' } }),
      'settings-sec-reciter'
    );
  });

  test('unknown slugs, missing params and other views resolve null', () => {
    assert.equal(
      settingsSectionScrollTarget({ activeView: 'settings', activeParams: { id: 'nope' } }),
      null
    );
    assert.equal(settingsSectionScrollTarget({ activeView: 'settings', activeParams: {} }), null);
    assert.equal(settingsSectionScrollTarget({ activeView: 'settings' }), null);
    assert.equal(
      settingsSectionScrollTarget({ activeView: 'home', activeParams: { id: 'data' } }),
      null
    );
    assert.equal(settingsSectionScrollTarget(null), null);
  });
});
