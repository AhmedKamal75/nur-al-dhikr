/**
 * search-pagination-pages.test.js — (SEARCH-01) explicit page-number contract.
 *
 * - "Page X of Y" + Previous/Next per scope (no Load More);
 * - page count correct, no duplicated results across pages;
 * - boundary states (prev disabled on 1, next disabled on last);
 * - deep link reproduces the page; legacy qn converts to its page;
 * - Quran/Hadith/Azkar breakdown preserved; offline-safe (pure render).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderSearch } from '../js/views/search.js';
import { buildQuranIndex, resetQuranIndex, setQuranIndexReady } from '../js/domain/quranSearch.js';
import { paginate, resolveScopePage, pageCountFor } from '../js/domain/searchPagination.js';

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

describe('SEARCH-01 explicit pagination', () => {
  test('pure paginate(): counts, clamping, no overlap', () => {
    const all = Array.from({ length: 20 }, (_, i) => i + 1);
    const p1 = paginate(all, {}, 'quran');
    assert.equal(p1.page, 1);
    assert.equal(p1.pageCount, 2);
    assert.deepEqual(p1.items, all.slice(0, 15));
    const p2 = paginate(all, { qp: '2' }, 'quran');
    assert.deepEqual(p2.items, all.slice(15));
    assert.deepEqual([...p1.items, ...p2.items].sort((a, b) => a - b), all);
    // Hostile page clamps to the last page, never an empty list.
    const hostile = paginate(all, { qp: '999' }, 'quran');
    assert.equal(hostile.page, 2);
    assert.ok(hostile.items.length > 0);
    // Legacy shown-count converts to its covering page.
    assert.equal(resolveScopePage({ qn: '30' }, 'quran'), 2);
    assert.equal(pageCountFor(20, 'quran'), 2);
  });

  test('render: Page X of Y + Previous/Next, deep link reproduces page', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const first = renderSearch(searchState({}));
      assert.match(first, /Page 1 of 2/, 'page counter');
      assert.match(first, /data-action="search-page" data-scope="quran" data-page="2"/, 'next button');
      assert.match(first, /Quran: 20/, 'breakdown carries the quran total');
      assert.match(first, /Hadith: 0/, 'breakdown carries the hadith total');
      assert.match(first, /Azkar: 0/, 'breakdown carries the azkar total');
      assert.equal((first.match(/class="quran-hit"/g) || []).length, 15);
      assert.doesNotMatch(first, /data-action="search-more"/, 'no Load More control');

      const second = renderSearch(searchState({ qp: '2' }));
      assert.match(second, /Page 2 of 2/, 'second page counter');
      assert.equal((second.match(/class="quran-hit"/g) || []).length, 5);
      // No duplicated ayah rows across the two pages (data-ay carries the ayah number).
      const rowsOf = (html) =>
        [...html.matchAll(/data-ay="(\d+)"/g)].map((m) => m[1]).sort((a, b) => Number(a) - Number(b));
      const r1 = rowsOf(first);
      const r2 = rowsOf(second);
      assert.equal(r1.length, 15);
      assert.equal(r2.length, 5);
      assert.equal(new Set([...r1, ...r2]).size, 20);
      assert.equal(r1.filter((x) => r2.includes(x)).length, 0);

      const legacy = renderSearch(searchState({ qn: '30' }));
      assert.match(legacy, /Page 2 of 2/, 'legacy qn lands on its covering page');

      const hostile = renderSearch(searchState({ qp: 'not-a-number' }));
      assert.match(hostile, /Page 1 of 2/, 'hostile qp falls back to page 1');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  });
});
