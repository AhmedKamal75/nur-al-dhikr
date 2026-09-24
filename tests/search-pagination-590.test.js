/**
 * search-pagination-590.test.js — (v5.9.0 origins, SEARCH-01 rework)
 * explicit page-number contracts.
 *
 * No hard truncation: over-limit scopes render "Page X of Y" with
 * Previous/Next, URL page params (qp/tp/lp; legacy qn/tn/ln convert to
 * their covering page), and every view carries the per-corpus match
 * breakdown.
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
  test('over-limit scope shows pager + breakdown; params move pages', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const first = renderSearch(searchState({}));
      assert.match(first, /data-action="search-page" data-scope="quran" data-page="2"/, 'quran Next');
      assert.match(first, /Page 1 of 2/, 'page counter');
      assert.match(first, /Showing 15 of 20/, 'showing counter');
      assert.match(first, /Quran: 20/, 'breakdown carries the quran total');
      assert.match(first, /Hadith: 0/, 'breakdown carries the hadith total');
      assert.match(first, /Azkar: 0/, 'breakdown carries the azkar total');
      const rows = (first.match(/class="quran-hit"/g) || []).length;
      assert.equal(rows, 15, 'default page size is 15');

      const wider = renderSearch(searchState({ qn: '30' }));
      const rows2 = (wider.match(/class="quran-hit"/g) || []).length;
      assert.equal(rows2, 5, 'legacy qn lands on its covering page (page 2)');
      assert.match(wider, /Page 2 of 2/, 'legacy qn converts to page 2');

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
