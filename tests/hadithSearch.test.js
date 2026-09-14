/**
 * tests/hadithSearch.test.js — item 14 (cross-book hadith search) gates:
 *  1. buildHadithIndex covers loaded books, skipping malformed docs/rows;
 *  2. searchHadith ranks cross-book (AND terms, phrase bonus, both
 *     languages, deterministic ties) with the quranSearch memo discipline;
 *  3. hostile input degrades to empty (never the corpus);
 *  4. the grid search box renders; results page with scope honesty, book
 *     labels and reader deep links; hostile pages clamp;
 *  5. trigger/handlers/inputs/precache/strings are wired.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildHadithIndex,
  hadithIndexStats,
  resetHadithIndex,
  searchHadith,
} from '../js/domain/hadithSearch.js';
import { renderHadith } from '../js/views/hadith.js';

const DOCS = {
  nawawi: {
    hadiths: [
      { n: 1, b: 's1', ar: 'إنما الأعمال بالنيات', en: 'Actions are but by intentions' },
      { n: 2, b: 's1', ar: 'بني الإسلام على خمس', en: 'Islam is built upon five' },
    ],
  },
  qudsi: {
    hadiths: [
      {
        n: 1,
        b: 's1',
        ar: 'يا عبادي إني حرمت الظلم',
        en: 'O My servants, I have forbidden injustice',
      },
      { n: 2, b: 's1', ar: 'الصوم لي وأنا أجزي به', en: 'Fasting is for Me and I reward it' },
    ],
  },
};

describe('buildHadithIndex: loaded books, hostile rows out', () => {
  test('counts books and records', () => {
    resetHadithIndex();
    assert.deepEqual(buildHadithIndex(DOCS), { books: 2, records: 4 });
    assert.deepEqual(hadithIndexStats(), { books: ['nawawi', 'qudsi'], records: 4 });
    resetHadithIndex();
  });

  test('malformed docs and rows drop out', () => {
    resetHadithIndex();
    const out = buildHadithIndex({
      ok: { hadiths: [{ n: 1, ar: 'x', en: 'y' }, null, { n: 'z', ar: 'x' }, { n: 2 }] },
      empty: { hadiths: [] },
      junk: null,
      stray: { hadiths: 'x' },
    });
    assert.deepEqual(out, { books: 1, records: 1 });
    assert.deepEqual(buildHadithIndex(null), { books: 0, records: 0 });
    assert.deepEqual(buildHadithIndex([]), { books: 0, records: 0 });
    resetHadithIndex();
  });
});

describe('searchHadith: ranked AND matching', () => {
  test('terms must all match; phrase wins; both languages count', () => {
    resetHadithIndex();
    buildHadithIndex(DOCS);
    const one = searchHadith('intentions');
    assert.deepEqual(
      one.map((r) => [r.bookId, r.n]),
      [['nawawi', 1]]
    );
    // Arabic term across books.
    const ar = searchHadith('الصوم');
    assert.deepEqual(
      ar.map((r) => [r.bookId, r.n]),
      [['qudsi', 2]]
    );
    // AND: no single hadith holds both terms.
    assert.deepEqual(searchHadith('intentions fasting'), []);
    // Exact phrase outranks scattered terms.
    const both = searchHadith('الأعمال بالنيات');
    assert.equal(both[0].bookId, 'nawawi');
    assert.equal(both[0].n, 1);
    resetHadithIndex();
  });

  test('ties break deterministically; memo holds the repeat', () => {
    resetHadithIndex();
    buildHadithIndex({
      bbook: { hadiths: [{ n: 2, ar: 'نور الهدى', en: 'light' }] },
      abook: { hadiths: [{ n: 1, ar: 'نور الهدى', en: 'light' }] },
    });
    const first = searchHadith('light', { limit: 10 });
    assert.deepEqual(
      first.map((r) => [r.bookId, r.n]),
      [
        ['abook', 1],
        ['bbook', 2],
      ]
    );
    assert.equal(searchHadith('light', { limit: 10 }), first, 'memoized repeat');
    resetHadithIndex();
  });

  test('empty queries and empty indexes return nothing', () => {
    resetHadithIndex();
    buildHadithIndex(DOCS);
    assert.deepEqual(searchHadith(''), []);
    assert.deepEqual(searchHadith('   '), []);
    resetHadithIndex();
    assert.deepEqual(searchHadith('light'), []);
  });
});

describe('grid search UI: box, scope, results, pager', () => {
  function gridState(over = {}) {
    const books = [
      {
        id: 'nawawi',
        name: { en: 'Nawawi', ar: 'نووي' },
        author: { en: '', ar: '' },
        blurb: { en: '', ar: '' },
        count: 2,
        sectionCount: 1,
        bundled: true,
        order: 1,
      },
      {
        id: 'qudsi',
        name: { en: 'Qudsi', ar: 'قدسي' },
        author: { en: '', ar: '' },
        blurb: { en: '', ar: '' },
        count: 2,
        sectionCount: 1,
        bundled: true,
        order: 2,
      },
    ];
    return {
      settings: { language: 'en' },
      hadith: {
        index: { books },
        docs: DOCS,
        errors: {},
        bookView: { query: '', section: 'all', page: 1 },
      },
      activeParams: {},
      ...over,
    };
  }

  test('search box renders on the grid; results replace tiles', () => {
    resetHadithIndex();
    buildHadithIndex(DOCS);
    try {
      const idle = renderHadith(gridState());
      assert.ok(idle.includes('data-bind="hadith-grid-search"'), 'search box renders');
      assert.ok(idle.includes('hadith-tile'), 'tiles without a query');
      const hit = renderHadith(gridState({ activeParams: { q: 'intentions' } }));
      assert.ok(!hit.includes('hadith-tile'), 'results replace the grid');
      assert.ok(hit.includes('Nawawi'), 'book label renders');
      assert.ok(hit.includes('Actions are but by'), 'card text renders');
      assert.ok(hit.includes('<mark>intentions</mark>'), 'query terms highlight');
      assert.ok(hit.includes('#/hadith/nawawi?n=1'), 'reader deep link rides along');
      assert.ok(!hit.includes('data-action="hadith-grid-prev"'), 'no pager for one hit');
    } finally {
      resetHadithIndex();
    }
  });

  test('partial coverage states its scope honestly', () => {
    resetHadithIndex();
    buildHadithIndex({ nawawi: DOCS.nawawi });
    try {
      const html = renderHadith(gridState({ activeParams: { q: 'the' } }));
      assert.ok(html.includes('Searching 1 of 2 books'), 'scope line names the gap');
    } finally {
      resetHadithIndex();
    }
  });

  test('misses render the empty hint; hostile pages clamp', () => {
    resetHadithIndex();
    buildHadithIndex(DOCS);
    try {
      const miss = renderHadith(gridState({ activeParams: { q: 'zzz-no-match' } }));
      assert.ok(
        miss.includes('hadith.noResults') || miss.includes('No hadith matches'),
        'empty hint'
      );
      const many = {};
      for (let i = 0; i < 25; i += 1) {
        many[`b${i}`] = { hadiths: [{ n: 1, ar: `unique${i} كلمة`, en: `unique${i} word` }] };
      }
      buildHadithIndex(many);
      const p1 = renderHadith({
        settings: { language: 'en' },
        hadith: {
          index: {
            books: Object.keys(many).map((id) => ({
              id,
              name: { en: id },
              author: {},
              blurb: {},
              count: 1,
              sectionCount: 0,
            })),
          },
          docs: many,
          errors: {},
          bookView: { query: '', section: 'all', page: 1 },
        },
        activeParams: { q: 'unique' },
      });
      assert.ok(p1.includes('page 1/3'), 'pager pages the cap');
      const clamped = renderHadith({
        settings: { language: 'en' },
        hadith: {
          index: { books: [] },
          docs: many,
          errors: {},
          bookView: { query: '', section: 'all', page: 1 },
        },
        activeParams: { q: 'unique', page: '99' },
      });
      assert.ok(clamped.includes('page 3/3'), 'hostile page clamps to the end');
    } finally {
      resetHadithIndex();
    }
  });
});

describe('hadith search wiring: trigger, handlers, inputs, precache, strings', () => {
  const sub = readFileSync(new URL('../js/app/stateSub.js', import.meta.url), 'utf8');
  const items = readFileSync(new URL('../js/app/handlers/items.js', import.meta.url), 'utf8');
  const nav = readFileSync(new URL('../js/app/handlers/navigation.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('grid queries start the build; pager + input arms exist', () => {
    assert.ok(sub.includes('maybeStartHadithSearchBuild'), 'stateSub must trigger the build');
    assert.ok(items.includes("'hadith-grid-prev'"), 'grid pager back missing');
    assert.ok(items.includes("'hadith-grid-next'"), 'grid pager forward missing');
    assert.ok(nav.includes('hadith-grid-search'), 'grid input arm missing');
  });

  test('the index module is precached', () => {
    assert.ok(/'js\/domain\/hadithSearch\.js'/.test(sw), 'APP_SHELL missing hadithSearch.js');
  });

  test('grid strings ship EN + AR', () => {
    for (const key of ['hadith.searchAll', 'hadith.searchScope']) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
