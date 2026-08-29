import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HADITH_PAGE_SIZE,
  validateHadithIndex,
  validateHadithDoc,
  filterHadiths,
  pageCount,
  clampPage,
  pageForNumber,
  daySeed,
  pickDailyHadith,
} from '../js/hadith.js';

const ROOT = join(import.meta.dirname, '..');

/* ------------------------------------------------------------------ */
/* Validation — fetched JSON is untrusted                              */
/* ------------------------------------------------------------------ */

describe('validateHadithIndex', () => {
  test('accepts a well-formed index and normalizes it', () => {
    const idx = validateHadithIndex({
      books: [
        {
          id: 'bukhari',
          name: { en: 'B', ar: 'ب' },
          count: 2,
          sectionCount: 1,
          bundled: false,
          order: 1,
        },
        { id: 'nawawi', name: { en: 'N', ar: 'ن' }, count: 42, bundled: true, order: 0 },
      ],
    });
    assert.ok(idx);
    assert.equal(idx.books.length, 2);
    assert.equal(idx.books[0].id, 'nawawi'); // sorted by order
    assert.equal(idx.books[0].bundled, true);
  });

  test('rejects hostile/malformed shapes without throwing', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}, { books: 'no' }, { books: [null, 1] }]) {
      assert.equal(validateHadithIndex(bad), null, JSON.stringify(bad));
    }
  });

  test('drops books whose id could act as a path-traversal segment', () => {
    const idx = validateHadithIndex({
      books: [
        { id: '../../etc', name: { en: 'Evil' }, count: 1 },
        { id: 'ok-book', name: { en: 'Ok' }, count: 1 },
      ],
    });
    assert.equal(idx.books.length, 1);
    assert.equal(idx.books[0].id, 'ok-book');
  });
});

describe('validateHadithDoc', () => {
  test('accepts a well-formed book document', () => {
    const doc = validateHadithDoc({
      id: 'nawawi',
      name: { en: 'N', ar: 'ن' },
      sections: [{ id: '1', name: 'S', count: 2 }],
      hadiths: [
        { n: 1, b: '1', ar: 'عربي', en: 'English' },
        { n: 2, b: '1', ar: '', en: 'English only' },
      ],
    });
    assert.ok(doc);
    assert.equal(doc.hadiths.length, 2);
  });

  test('drops rows with no text in either language and rows with non-numeric n', () => {
    const doc = validateHadithDoc({
      id: 'x',
      hadiths: [
        null,
        { n: 'abc', b: '1', ar: 'a' },
        { n: 3, b: '1', ar: '', en: '' }, // sunnah.com intro placeholder
        { n: 4, b: '1', ar: 'صحيح', en: 'ok' },
      ],
    });
    assert.ok(doc);
    assert.deepEqual(
      doc.hadiths.map((h) => h.n),
      [4]
    );
  });

  test('rejects shapes that would crash a render', () => {
    for (const bad of [
      null,
      'x',
      5,
      {},
      { id: 'x' },
      { id: 'x', hadiths: [] },
      { id: 'x', hadiths: 'no' },
    ]) {
      assert.equal(validateHadithDoc(bad), null);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Book-reading helpers                                                */
/* ------------------------------------------------------------------ */

const DOC = validateHadithDoc({
  id: 't',
  sections: [
    { id: '1', name: 'Faith', count: 3 },
    { id: '2', name: 'Prayer', count: 2 },
  ],
  hadiths: [
    { n: 1, b: '1', ar: 'الحديث الأول', en: 'First hadith' },
    { n: 2, b: '1', ar: 'ثانٍ', en: 'Second' },
    { n: 3, b: '1', ar: 'ثالث', en: 'Third' },
    { n: 4, b: '2', ar: 'رابع', en: 'Fourth' },
    { n: 5, b: '2', ar: 'خامس', en: 'Fifth' },
  ],
});

describe('filterHadiths / paging', () => {
  test('section filter keeps document order', () => {
    assert.deepEqual(
      filterHadiths(DOC, { section: '2' }).map((h) => h.n),
      [4, 5]
    );
  });

  test('query matches Arabic (diacritic-folded), English, and the hadith number', () => {
    // DOC's Arabic is fully vocalized (الأَوَّلُ with hamza+tanwin marks) —
    // the bare typed form must still hit after folding.
    assert.deepEqual(
      filterHadiths(DOC, { query: 'الاول' }).map((h) => h.n),
      [1]
    );
    assert.deepEqual(
      filterHadiths(DOC, { query: 'fourth' }).map((h) => h.n),
      [4]
    );
    assert.deepEqual(
      filterHadiths(DOC, { query: '5' }).map((h) => h.n),
      [5]
    );
  });

  test('query + section compose with AND semantics', () => {
    assert.deepEqual(filterHadiths(DOC, { query: 'zzz-nomatch', section: '1' }).length, 0);
    assert.deepEqual(
      filterHadiths(DOC, { query: 'third', section: '1' }).map((h) => h.n),
      [3]
    );
  });

  test('hostile filter inputs degrade to unfiltered', () => {
    assert.equal(filterHadiths(DOC, { query: { a: 1 }, section: ['x'] }).length, 5);
    assert.deepEqual(filterHadiths(null, {}), []);
  });

  test('pageCount and clampPage bound the pager', () => {
    const big = {
      id: 'b',
      hadiths: Array.from({ length: 45 }, (_, i) => ({ n: i + 1, b: '1', ar: 'x', en: 'y' })),
    };
    assert.equal(pageCount(big.hadiths), Math.ceil(45 / HADITH_PAGE_SIZE));
    assert.equal(clampPage(999, big.hadiths), pageCount(big.hadiths));
    assert.equal(clampPage(-3, big.hadiths), 1);
    assert.equal(clampPage('attacker', big.hadiths), 1);
    assert.equal(clampPage(2, []), 1);
  });

  test('pageForNumber finds the right page and survives bad input', () => {
    const big = {
      id: 'b',
      sections: [],
      hadiths: Array.from({ length: 45 }, (_, i) => ({ n: i + 1, b: '1', ar: 'x', en: 'y' })),
    };
    assert.equal(pageForNumber(big, 1), 1);
    assert.equal(pageForNumber(big, 20), 1);
    assert.equal(pageForNumber(big, 21), 2);
    assert.equal(pageForNumber(big, 45), 3);
    assert.equal(pageForNumber(big, 46), null);
    assert.equal(pageForNumber(big, 'injected'), null);
    assert.equal(pageForNumber(null, 1), null);
  });

  test('pageForNumber respects an active section filter', () => {
    // Hadith 4 is the 1st hit inside section 2's filtered list.
    assert.equal(pageForNumber(DOC, 4, '2'), 1);
  });
});

/* ------------------------------------------------------------------ */
/* Daily hadith — deterministic, offline-safe                          */
/* ------------------------------------------------------------------ */

describe('daySeed / pickDailyHadith', () => {
  test('daySeed is stable for the same day and grows with the date', () => {
    assert.equal(daySeed('2026-08-27'), daySeed('2026-08-27'));
    assert.ok(daySeed('2026-08-27') !== daySeed('2026-08-28'));
    assert.equal(daySeed('garbage'), 0);
  });

  test('picks deterministically from bundled books only, using loaded docs', () => {
    const books = [
      { id: 'bukhari', bundled: false, count: 7580, order: 1 },
      { id: 'nawawi', bundled: true, count: 42, order: 3 },
      { id: 'qudsi', bundled: true, count: 40, order: 4 },
    ];
    const docs = { nawawi: DOC, qudsi: DOC };
    const a = pickDailyHadith(books, docs, '2026-08-27');
    const b = pickDailyHadith(books, docs, '2026-08-27');
    assert.deepEqual(a, b); // same day, same pick
    assert.ok(['nawawi', 'qudsi'].includes(a.bookId), 'never picks an unbundled book');
    assert.ok(DOC.hadiths.some((h) => h.n === a.hadith.n));
  });

  test('returns null when nothing usable is loaded yet (never blocks Home)', () => {
    assert.equal(pickDailyHadith([{ id: 'nawawi', bundled: true }], {}, '2026-08-27'), null);
    assert.equal(pickDailyHadith([], {}, 'x'), null);
  });
});

/* ------------------------------------------------------------------ */
/* Shipped-data integrity gates                                        */
/* ------------------------------------------------------------------ */

describe('shipped hadith data integrity', () => {
  const index = JSON.parse(readFileSync(join(ROOT, 'data/hadith/index.json'), 'utf8'));

  test('index lists the eight books with correct bundled flags', () => {
    assert.deepEqual(
      index.books.map((b) => b.id),
      ['bukhari', 'muslim', 'nawawi', 'qudsi', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah']
    );
    const byId = Object.fromEntries(index.books.map((b) => [b.id, b]));
    assert.equal(byId.nawawi.bundled, true);
    assert.equal(byId.qudsi.bundled, true);
    for (const id of ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah']) {
      assert.equal(byId[id].bundled, false, `${id} is lazy-loaded`);
    }
  });

  test('the shipped library totals 34,239 hadith (fork-union count)', () => {
    // 15,022 (two Sahihs + the two Forties) + 19,217 (the four Sunans,
    // restored in v3.16.0: abudawud 5,272 + tirmidhi 3,926 + nasai 5,679 +
    // ibnmajah 4,340) — gates the whole library against silent content loss.
    const total = index.books.reduce((a, b) => a + b.count, 0);
    assert.equal(total, 34239);
  });

  for (const b of index.books) {
    test(`book ${b.id}: file parses, matches its index entry, has no empty/blank rows`, () => {
      const doc = JSON.parse(readFileSync(join(ROOT, 'data/hadith', `${b.id}.json`), 'utf8'));
      const checked = validateHadithDoc(doc);
      assert.ok(checked, 'must pass the runtime validator');
      assert.equal(checked.hadiths.length, b.count, 'count matches index');
      assert.ok(doc.sections.length === b.sectionCount, 'section count matches index');
      // Every hadith carries at least one non-empty text; numbers are finite.
      for (const h of checked.hadiths) {
        assert.ok(h.ar.trim() || h.en.trim(), `hadith ${h.n} has text`);
        assert.ok(Number.isFinite(h.n));
      }
      // Every shipped hadith is reachable through the chapter index.
      const bookIds = new Set(doc.sections.map((s) => s.id));
      const unreachable = checked.hadiths.filter((h) => !bookIds.has(h.b));
      assert.equal(unreachable.length, 0, 'no hadith hidden from the chapter view');
      // Numbers are unique — deep links and paging rely on that.
      const nums = new Set(checked.hadiths.map((h) => h.n));
      assert.equal(nums.size, checked.hadiths.length, 'unique hadith numbers');
    });
  }

  test('bundled books stay small (the precache budget is deliberate)', () => {
    for (const id of ['nawawi', 'qudsi']) {
      const bytes = readFileSync(join(ROOT, 'data/hadith', `${id}.json`)).length;
      assert.ok(bytes < 512 * 1024, `${id} should be well under 512KB, got ${bytes}`);
    }
  });
});
