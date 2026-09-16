/**
 * tests/search-cancel-5.2.82.test.js — BUG-09: background corpus builds
 * stop scheduling chunks once the person leaves Search (no network here:
 * 113 warm surahs + the cancel check runs before any fetch).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { rt } from '../js/app/rt.js';
import { actions, store } from '../js/core/state.js';
import { ensureQuranSearchData } from '../js/app/quranSearch.js';
import { ensureTafsirSearchData } from '../js/app/tafsirSearch.js';

describe('search build cancellation', () => {
  test('quran corpus build cancels off-search without fetching', async () => {
    store.dispatch(actions.setQuranMeta({ surahs: [] }));
    const docs = {};
    for (let n = 1; n <= 113; n++) docs[String(n)] = { number: n, ayahs: [] };
    store.dispatch(actions.setQuranSurahsBulk(docs));
    store.dispatch(actions.navigate('roots', {}));
    assert.equal(store.getState().activeView, 'roots');
    rt.quranSearchBuildStarted = false;
    await ensureQuranSearchData();
    assert.equal(rt.quranSearchBuildStarted, false, 'latch reset, build stood down');
    // A fetch attempt would flag the tier on failure (no server running
    // here); cancel dispatches nothing — this distinguishes the two paths.
    assert.ok(!store.getState().loadErrors['quran-search-corpus'], 'no fetch attempted');
    rt.quranSearchBuildStarted = null;
  });

  test('tafsir corpus build cancels off-search without fetching', async () => {
    store.dispatch(actions.setTafsirEditions({ editions: [] }));
    store.dispatch(actions.navigate('roots', {}));
    rt.tafsirSearchBuildStarted = false;
    const ready = await ensureTafsirSearchData();
    assert.equal(ready, false, 'no bundled edition -> refuses silently, no fetch');
    rt.tafsirSearchBuildStarted = null;
  });
});
