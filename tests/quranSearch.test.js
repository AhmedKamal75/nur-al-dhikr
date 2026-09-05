/**
 * tests/quranSearch.test.js
 * v3.6 — full-text Qur'an search: diacritic-insensitive Arabic matching,
 * translation matching, hostile-input safety, and the bulk reducer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuranIndex,
  searchQuran,
  resetQuranIndex,
  quranIndexSize,
  isQuranSearchReady,
  setQuranIndexReady,
} from '../js/domain/quranSearch.js';
import { stripQuranAnnotations, normalizeArabic } from '../js/core/utils.js';

const SURAH_1 = {
  ayahs: [
    {
      number: 1,
      text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful',
    },
    {
      number: 2,
      text: 'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ',
      translation: '[All] praise is [due] to Allah, Lord of the worlds',
    },
    {
      number: 3,
      text: 'ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
      translation: 'The Entirely Merciful, the Especially Merciful,',
    },
  ],
};

// A line of Ayat al-Kursi (2:255) — Uthmani marks exercise the annotation stripper.
const KURSI_HEAD = 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ۡ  ٱلۡحَىُّ';
const SURAH_2 = {
  ayahs: [
    {
      number: 255,
      text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَىُّ ٱلۡقَيُّومُ',
      translation:
        'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.',
    },
  ],
};

function corpus() {
  return { 1: SURAH_1, 2: SURAH_2 };
}

test('stripQuranAnnotations removes Uthmani marks but keeps base letters', () => {
  const stripped = stripQuranAnnotations('بِسۡمِ ٱللَّهِ');
  // folds to plain letters of بسم الله (alef-wasla becomes plain alef later)
  assert.equal(normalizeArabic(stripped), 'بسم الله');
});

test('buildQuranIndex counts surahs and records every ayah', () => {
  resetQuranIndex();
  const n = buildQuranIndex(corpus());
  assert.equal(quranIndexSize(), 4); // 3 + 1 ayahs
  assert.equal(n, 4);
});

test('arabic search is diacritic-insensitive across Uthmani marks', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  // plain typed words vs fully-marked Uthmani text
  const hits = searchQuran('الحمد لله');
  assert.ok(
    hits.some((h) => h.s === 1 && String(h.a) === '2'),
    'al-hamd ayah must match'
  );
  const kursi = searchQuran('لا اله الا هو الحي القيوم');
  assert.ok(
    kursi.some((h) => h.s === 2 && String(h.a) === '255'),
    'kursi opening must match'
  );
});

test('alef mismatch cancels symmetrically, both directions', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  // Uthmani إِلَٰهَ folds to الاه on the record side; typed اله must still find it.
  const fewer = searchQuran('لا اله');
  assert.ok(
    fewer[0] && String(fewer[0].s) === '2',
    'query with FEWER alefs than record matches (regression: v3.6 sanity)'
  );
  // Inverse direction: a typed form carrying MORE alefs than the record.
  resetQuranIndex();
  buildQuranIndex({ 1: { ayahs: [{ number: 1, text: 'اله', translation: 'deity' }] } });
  const more = searchQuran('الاه');
  assert.equal(more[0].s, 1, 'query with MORE alefs than record also matches');
});

test('pure-alef query tokens never veto real matches or crash', () => {
  resetQuranIndex();
  buildQuranIndex({ 1: { ayahs: [{ number: 1, text: 'الحمد لله', translation: 'praise' }] } });
  const hits = searchQuran('ا ا ا praise'); // lone-alef tokens fold to empty
  assert.ok(
    hits.some((h) => h.s === 1),
    'empty-after-fold terms are ignored, not required'
  );
  assert.deepEqual(
    searchQuran('ا ا ا'),
    [],
    'all-pure-alef query returns nothing rather than everything'
  );
});

test('pasted-in ayah fragment matches its own source ayah best', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  const hits = searchQuran(SURAH_1.ayahs[0].text); // paste raw Uthmani text
  assert.equal(hits[0].s, 1);
  assert.equal(String(hits[0].a), '1');
});

test('translation search finds ayahs and ranks phrase hits first', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  const phrase = searchQuran('Lord of the worlds');
  assert.equal(phrase[0].s, 1);
  assert.equal(String(phrase[0].a), '2');
});

test('AND semantics: a term set with no single matching ayah returns empty', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  assert.deepEqual(searchQuran('praise xyznotfound'), []);
});

test('hostile/garbage queries never throw and never crash', () => {
  resetQuranIndex();
  buildQuranIndex(corpus());
  for (const q of [
    '',
    null,
    undefined,
    '<img src=x onerror=alert(1)>',
    '(); DROP TABLE;',
    '\u06DD\u06D6\u06ED',
    'a'.repeat(5000),
  ]) {
    assert.doesNotThrow(() => searchQuran(q));
  }
  assert.deepEqual(searchQuran(null), []);
  assert.deepEqual(searchQuran(''), []);
});

test('hostile/malformed surah documents are skipped, not fatal', () => {
  resetQuranIndex();
  assert.doesNotThrow(() =>
    buildQuranIndex({
      0: { ayahs: [] }, // out-of-range surah number key
      abc: { ayahs: [] }, // non-numeric key
      7: null, // null doc
      8: { noAyahsHere: true }, // wrong shape
      9: {
        ayahs: [
          null,
          {},
          { number: 'x', text: {} },
          { number: 2, text: 'بِسْمِ', translation: 'In the name' },
        ],
      },
      114: { ayahs: [{ number: 6, text: 'ناس', translation: 'Mankind' }] },
    })
  );
  assert.equal(quranIndexSize(), 2);
  const hits = searchQuran('name');
  assert.ok(hits.some((h) => h.s === 9));
});

test('empty corpus yields zero-size index and empty results', () => {
  resetQuranIndex();
  buildQuranIndex({});
  assert.equal(quranIndexSize(), 0);
  assert.deepEqual(searchQuran('allah'), []);
  buildQuranIndex(undefined);
  assert.deepEqual(searchQuran('allah'), []);
});

test('ready flag round-trips', () => {
  setQuranIndexReady(false);
  assert.equal(isQuranSearchReady(), false);
  setQuranIndexReady(true);
  assert.equal(isQuranSearchReady(), true);
  setQuranIndexReady(false);
});

/* Bulk reducer case -------------------------------------------------- */
// state.js exposes a singleton store (not the class); drive the real one
// and restore its prior quran slice afterwards so suites stay independent.
import { store, actions } from '../js/core/state.js';

test('QURAN_SURAHS_BULK_LOADED merges docs in one dispatch and ignores junk', () => {
  const before = store.getState().quran;
  try {
    store.dispatch(actions.setQuranSurahsBulk({ 36: { ayahs: [] } }));
    assert.ok(store.getState().quran.surahs['36']);
    const snap = store.getState().quran.surahs['36'];
    store.dispatch(actions.setQuranSurahsBulk(null));
    store.dispatch(actions.setQuranSurahsBulk([]));
    assert.deepEqual(store.getState().quran.surahs['36'], snap); // junk is a no-op
    store.dispatch(actions.setQuranSurahsBulk({ 36: { ayahs: [{ number: 1 }] } }));
    assert.equal(store.getState().quran.surahs['36'].ayahs.length, 1);
  } finally {
    // best-effort cleanup of the ephemeral slice so later tests are unaffected
    store.dispatch({ type: 'QURAN_META_LOADED', meta: before.meta });
  }
});
