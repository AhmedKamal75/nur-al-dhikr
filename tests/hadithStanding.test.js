/**
 * tests/hadithStanding.test.js — item 19 (hadith scholarship, honest
 * slice) gates:
 *  1. bookStanding names the Two Sahihs and nothing else (no invented
 *     per-hadith grades — the pipeline gap stays a gap);
 *  2. validateHadithIndex carries the standing through;
 *  3. grid tiles and the reader header badge sahih books only, EN + AR;
 *  4. the label string ships EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HADITH_SAHIH_COLLECTIONS,
  bookStanding,
  validateHadithIndex,
} from '../js/services/hadith.js';
import { renderHadith } from '../js/views/hadith.js';

const BOOKS = [
  {
    id: 'bukhari',
    name: { en: 'Bukhari', ar: 'بخاري' },
    author: { en: '', ar: '' },
    blurb: { en: '', ar: '' },
    count: 10,
    sectionCount: 2,
    bundled: false,
    order: 1,
  },
  {
    id: 'muslim',
    name: { en: 'Muslim', ar: 'مسلم' },
    author: { en: '', ar: '' },
    blurb: { en: '', ar: '' },
    count: 10,
    sectionCount: 2,
    bundled: false,
    order: 2,
  },
  {
    id: 'nawawi',
    name: { en: 'Nawawi', ar: 'نووي' },
    author: { en: '', ar: '' },
    blurb: { en: '', ar: '' },
    count: 42,
    sectionCount: 1,
    bundled: true,
    order: 3,
  },
];

function gridState(over = {}) {
  return {
    settings: { language: 'en' },
    hadith: {
      index: validateHadithIndex({ books: BOOKS }),
      docs: {},
      errors: {},
      bookView: { query: '', section: 'all', page: 1 },
    },
    activeParams: {},
    ...over,
  };
}

describe('bookStanding: the Two Sahihs, nothing else', () => {
  test('names exactly bukhari + muslim', () => {
    assert.deepEqual([...HADITH_SAHIH_COLLECTIONS], ['bukhari', 'muslim']);
    assert.equal(bookStanding('bukhari'), 'sahih');
    assert.equal(bookStanding('muslim'), 'sahih');
  });

  test('everything else is an honest null', () => {
    for (const id of [
      'nawawi',
      'qudsi',
      'abudawud',
      'tirmidhi',
      'nasai',
      'ibnmajah',
      '',
      null,
      '__proto__',
    ]) {
      assert.equal(bookStanding(id), null, `no invented grade for ${String(id)}`);
    }
  });

  test('validator carries the standing', () => {
    const idx = validateHadithIndex({ books: BOOKS });
    assert.deepEqual(
      idx.books.map((b) => [b.id, b.standing ?? null]),
      [
        ['bukhari', 'sahih'],
        ['muslim', 'sahih'],
        ['nawawi', null],
      ]
    );
  });
});

describe('badges render on sahih books only', () => {
  test('grid tiles badge the Two Sahihs', () => {
    const html = renderHadith(gridState());
    assert.equal((html.match(/chip--grade-sahih/g) || []).length, 2, 'two badges, no more');
    assert.ok(html.includes('Sahih collection'), 'EN label');
  });

  test('reader header badges sahih books, stays quiet otherwise', () => {
    const reader = (id, name) =>
      renderHadith(
        gridState({
          activeParams: { id },
          hadith: {
            ...gridState().hadith,
            docs: { [id]: { id, name: { en: name }, sections: [], hadiths: [] } },
          },
        })
      );
    assert.ok(reader('bukhari', 'B').includes('chip--grade-sahih'), 'reader badge for Bukhari');
    assert.ok(!reader('nawawi', 'N').includes('chip--grade-sahih'), 'no badge without standing');
  });

  test('AR labels render without undefined', () => {
    const html = renderHadith(gridState({ settings: { language: 'ar' } }));
    assert.ok(html.includes('مجموعة صحيحة'), 'AR label');
    assert.doesNotMatch(html, /undefined/);
  });
});

describe('standing strings ship EN + AR', () => {
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('hadith.standingSahih exists', () => {
    assert.ok(en.includes("'hadith.standingSahih'"), 'EN missing');
    assert.ok(ar.includes("'hadith.standingSahih'"), 'AR missing');
  });
});
