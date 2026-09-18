/**
 * search-pagination-590.test.js — (v5.9.0) search pagination contracts.
 *
 * No hard truncation: over-limit scopes render a Load More trigger with
 * a "Showing x of n" counter, URL params (qn/tn/ln) widen the window,
 * and every view carries the per-corpus match breakdown.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderSearch } from '../js/views/search.js';
import { buildQuranIndex, resetQuranIndex, setQuranIndexReady } from '../js/domain/quranSearch.js';

// 20 matching ayahs with real (surah, ayah) docs so rows render.
const SURAH_DOCS = {
  1: {
    ayahs: Array.from({ length: 20 }, (_, i) => ({
      number: i + 1,
      text: `ayah text mercy ${i + 1}`,
      translation: `translation mercy ${i + 1}`,
    })),
  },
};

function searchState(params) {
  return {
    settings: { language: 'en', showTranslation: true },
    activeParams: { q: 'mercy', ...params },
    search: { historyList: [] },
    library: { documents: {}, order: [], itemIndex: {} },
    favorites: [],
    speakingItemId: null,
    counters: {},
    quran: { surahs: SURAH_DOCS, meta: null },
    mushaf: { meta: null },
    tafsir: {},
    tafsirEditions: { editions: [] },
    loadErrors: {},
  };
}

describe('search pagination + breakdown', () => {
  test('over-limit scope shows Load More + breakdown; params widen it', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const first = renderSearch(searchState({}));
      assert.match(first, /data-action="search-more" data-scope="quran"/, 'quran Load More');
      assert.match(first, /Showing 15 of 20/, 'showing counter');
      assert.match(first, /Qur’an: 20/, 'breakdown carries the quran total');
      assert.match(first, /Library: 0/, 'breakdown carries the library total');
      const rows = (first.match(/class="quran-hit"/g) || []).length;
      assert.equal(rows, 15, 'default window is 15');

      const wider = renderSearch(searchState({ qn: '30' }));
      const rows2 = (wider.match(/class="quran-hit"/g) || []).length;
      assert.equal(rows2, 20, 'qn param widens the window');
      assert.doesNotMatch(
        wider,
        /data-action="search-more" data-scope="quran"/,
        'no trigger at full coverage'
      );

      const hostile = renderSearch(searchState({ qn: 'not-a-number' }));
      const rows3 = (hostile.match(/class="quran-hit"/g) || []).length;
      assert.equal(rows3, 15, 'hostile qn falls back to the default');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  });

  test('breakdown carries a hadith cross-search link with the same query', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const html = renderSearch(searchState({}));
      // Deep link into the hadith corpus (its own pager) carrying the query.
      assert.match(html, /class="search-hadith-link"/, 'hadith link block renders');
      assert.match(
        html,
        /data-action="navigate" data-view="hadith" data-q="mercy"/,
        'SPA navigation forwards the query via data-q'
      );
      assert.match(html, /#\/hadith\?q=mercy/, 'href deep-links with the encoded query');
      assert.match(html, /Search hadith for/, 'link carries an accessible label');
      // Hostile query must be escaped, never break out of the attributes.
      const evil = renderSearch(searchState({ q: '"><script>alert(1)</script>' }));
      assert.doesNotMatch(evil, /<script>alert/, 'query is HTML-escaped in the link');
      assert.match(evil, /data-q="&quot;&gt;/, 'data-q attribute stays quoted');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  });
});
