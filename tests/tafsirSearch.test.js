/**
 * tafsirSearch.test.js — bundled-edition full-text tafsir search.
 *
 * Pins the pure index (diacritic-insensitive AND + phrase bonus, hostile
 * input, malformed files) and the hard rule: remote editions are never
 * bulk-indexed. Loader wiring stays thin glue over these.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTafsirIndex,
  defaultSearchEdition,
  isTafsirSearchable,
  isTafsirSearchReady,
  resetTafsirIndex,
  searchTafsir,
  tafsirIndexEdition,
  tafsirIndexSize,
} from '../js/domain/tafsirSearch.js';

const FILES = {
  1: { 1: 'الحمد لله رب العالمين، الثناء الكامل لله وحده', 2: 'الرحمن الرحيم بعباده' },
  2: { 1: 'ذلك الكتاب لا ريب فيه هدى للمتقين', 2: 'الحمد لله على نعمة الهداية' },
};

describe('tafsir index build', () => {
  test('counts records, tracks edition, resets cleanly', () => {
    resetTafsirIndex();
    assert.equal(isTafsirSearchReady(), false);
    assert.equal(buildTafsirIndex('muyassar', FILES), 4);
    assert.equal(tafsirIndexSize(), 4);
    assert.equal(tafsirIndexEdition(), 'muyassar');
    assert.equal(isTafsirSearchReady(), true);
    resetTafsirIndex();
    assert.equal(tafsirIndexSize(), 0);
  });

  test('malformed files and hostile values never throw', () => {
    resetTafsirIndex();
    assert.equal(buildTafsirIndex('x', null), 0);
    assert.equal(buildTafsirIndex('x', { 1: null, 999: { 1: 'ok' }, 2: { 1: '', 2: 42 } }), 0);
    assert.equal(buildTafsirIndex('x', { 1: { 1: 'نص' } }), 1);
    resetTafsirIndex();
  });
});

describe('tafsir search ranking', () => {
  test('diacritic-insensitive AND with phrase bonus', () => {
    resetTafsirIndex();
    buildTafsirIndex('muyassar', FILES);
    const hits = searchTafsir('الحمد لله', { limit: 10 });
    assert.ok(hits.length >= 2);
    assert.deepEqual([hits[0].s, hits[0].a], [1, 1], 'whole phrase outranks split terms');
    assert.deepEqual(searchTafsir('هدى للمتقين', { limit: 10 })[0], { s: 2, a: 1, score: 12 });
    assert.deepEqual(searchTafsir('كلمة-مفقودة', { limit: 10 }), []);
    assert.deepEqual(searchTafsir('   ', { limit: 10 }), []);
    assert.deepEqual(searchTafsir('الحمد', { limit: 1 }).length, 1);
    resetTafsirIndex();
  });
});

describe('edition gating', () => {
  test('only bundled editions are searchable; first bundled is default', () => {
    assert.equal(isTafsirSearchable({ id: 'muyassar', bundled: true }), true);
    assert.equal(isTafsirSearchable({ id: 'saadi', bundled: false }), false);
    assert.equal(isTafsirSearchable(null), false);
    assert.equal(isTafsirSearchable({ bundled: true }), false);
    const editions = [
      { id: 'saadi', bundled: false },
      { id: 'muyassar', bundled: true },
    ];
    assert.equal(defaultSearchEdition(editions)?.id, 'muyassar');
    assert.equal(defaultSearchEdition([]), null);
  });
});

describe('palette tafsir provider', () => {
  test('tafsir group renders above library with edition ref', async () => {
    const { buildPaletteGroups } = await import('../js/views/palette.js');
    const { groups } = buildPaletteGroups({
      query: 'الهداية',
      lang: 'ar',
      libraryHits: [],
      surahs: [],
      ayahIndex: null,
      reciters: [],
      books: [],
      history: [],
      tafsirIndex: {
        editionName: 'التفسير الميسر',
        hits: [{ s: 2, a: 2, score: 4, text: 'الحمد لله على نعمة الهداية' }],
      },
    });
    const taf = groups.find((g) => g.key === 'tafsir');
    assert.ok(taf, 'tafsir group present');
    assert.equal(taf.title, 'التفسير');
    assert.equal(taf.rows[0].action, 'navigate');
    assert.ok(taf.rows[0].href.includes('quran'));
    assert.ok(taf.rows[0].secondary.includes('2:2'));
  });
});
