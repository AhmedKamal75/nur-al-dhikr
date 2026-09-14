/**
 * tests/mushafHizb.test.js — item 15 (Mushaf parity) gates:
 *  1. hizbStartPage maps 1..60 onto juz halves monotonically, never
 *     overtaking the next juz, degrading to null on hostile input;
 *  2. the jump drawer lists all 60 hizb jumps grouped by juz with the
 *     approximation disclosure;
 *  3. search ayah hits carry a mushaf-page chip (resolvePage) when the
 *     map is loaded, and none when it isn't — reader links untouched;
 *  4. new strings ship EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { clampPage, hizbStartPage } from '../js/services/mushaf.js';
import { buildMushafJump } from '../js/views/mushafReader.js';
import { renderSearch } from '../js/views/search.js';
import { buildQuranIndex, resetQuranIndex, setQuranIndexReady } from '../js/domain/quranSearch.js';

const JUZ = { 1: 1, 2: 22, 3: 42 };
/** Even 20-page juz starts across the book (self-contained stand-in). */
const JUZ30 = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, i * 20 + 1]));

describe('hizbStartPage: juz halves, monotonic, honest', () => {
  test('H1 opens juz 1; H2 opens its second half', () => {
    assert.equal(hizbStartPage(JUZ, 1), 1);
    const h2 = hizbStartPage(JUZ, 2);
    assert.ok(h2 > 1 && h2 < 22, `H2 inside juz 1, got ${h2}`);
  });

  test('all 60 resolve in range and never overtake the next juz', () => {
    let prev = 0;
    for (let h = 1; h <= 60; h += 1) {
      const page = hizbStartPage(JUZ30, h);
      assert.ok(Number.isInteger(page) && page >= 1 && page <= 604, `H${h} in range`);
      assert.ok(page >= prev, `H${h} monotonic`);
      if (h % 2 === 0) {
        const juz = Math.ceil(h / 2);
        assert.ok(page < JUZ30[juz + 1] || juz === 30, `second half H${h} stays inside juz ${juz}`);
      }
      prev = page;
    }
    // Hizb 1 opens the book; odd hizbs open their juz exactly.
    assert.equal(hizbStartPage(JUZ30, 1), 1);
    assert.equal(hizbStartPage(JUZ30, 3), 21);
  });

  test('hostile input degrades to null', () => {
    assert.equal(hizbStartPage(JUZ, 0), null);
    assert.equal(hizbStartPage(JUZ, 61), null);
    assert.equal(hizbStartPage(JUZ, 'x'), null);
    assert.equal(hizbStartPage(null, 5), null);
    assert.equal(hizbStartPage({}, 5), null);
    assert.equal(hizbStartPage(JUZ, 5.9), hizbStartPage(JUZ, 5), 'floors to H5');
  });

  test('clampPage still bounds the book', () => {
    assert.equal(clampPage(0), 1);
    assert.equal(clampPage(605), 604);
  });
});

describe('jump drawer: Hizb index beside Surahs and Juz', () => {
  function jumpState() {
    const chapterNames = { 1: 'F', 2: 'B' };
    const surahFirstPage = { 1: 1, 2: 2 };
    return {
      settings: { language: 'en' },
      mushaf: { meta: { chapterNames, surahFirstPage, juzFirstPage: JUZ30 } },
      mushafBookmark: { page: 1 },
      quran: { meta: null },
    };
  }

  test('60 hizb jumps in 30 juz rows with disclosure', () => {
    const html = buildMushafJump(jumpState());
    // 2 surahs + 30 juz + 60 hizb, all on the same jump action.
    assert.equal((html.match(/data-action="mushaf-jump-page"/g) || []).length, 2 + 30 + 60);
    assert.equal((html.match(/mushaf-jump__hizb-row/g) || []).length, 30, 'one row per juz');
    assert.ok(html.includes('Hizb'), 'section heading');
    assert.ok(html.includes('approximate'), 'approximation disclosed');
    for (const m of html.matchAll(/data-page="(\d+)"/g)) {
      const p = Number(m[1]);
      assert.ok(p >= 1 && p <= 604, `jump page in range: ${p}`);
    }
  });

  test('skeleton without meta; AR renders', () => {
    const skel = buildMushafJump({ settings: { language: 'en' }, mushaf: {}, mushafBookmark: {} });
    assert.ok(skel.includes('sk-'), 'loading skeleton preserved');
    const ar = buildMushafJump({
      settings: { language: 'ar' },
      mushaf: { meta: { chapterNames: {}, surahFirstPage: {}, juzFirstPage: JUZ } },
      mushafBookmark: { page: 1 },
      quran: { meta: null },
    });
    assert.ok(ar.includes('الأحزاب'), 'AR section heading');
    assert.doesNotMatch(ar, /undefined/);
  });
});

describe('search hits: ayah→page chips beside reader links', () => {
  const SURAH_DOCS = {
    2: { ayahs: [{ number: 5, text: 'نص تجريبي', translation: 'a test verse' }] },
  };

  function searchState(mushafMeta) {
    return {
      settings: { language: 'en', showTranslation: true },
      activeParams: { q: 'test' },
      search: { historyList: [] },
      library: { documents: {}, order: [], itemIndex: {} },
      favorites: [],
      speakingItemId: null,
      counters: {},
      quran: { surahs: SURAH_DOCS, meta: null },
      mushaf: { meta: mushafMeta },
    };
  }

  test('chip links to the resolved page; reader link untouched', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const html = renderSearch(searchState({ ayahPages: { '2:5': 42 } }));
      assert.ok(html.includes('class="quran-hit__reader"'), 'reader link keeps its card');
      assert.ok(html.includes('href="#/quran/2?ay=5"'), 'reader deep link intact');
      assert.ok(html.includes('class="quran-hit__mushaf"'), 'mushaf chip renders');
      assert.ok(html.includes('href="#/mushaf?page=42"'), 'chip deep-links the page');
      assert.ok(html.includes('data-page="42"'), 'page rides the dataset');
      assert.ok(
        html.match(/class="quran-hit__reader"[\s\S]*?<\/a>\s*<a class="quran-hit__mushaf"/),
        'sibling links, never nested anchors'
      );
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  });

  test('no chip without the map; translation follows its pref', () => {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      const bare = renderSearch(searchState(null));
      assert.ok(!bare.includes('quran-hit__mushaf'), 'no chip without ayahPages');
      assert.ok(bare.includes('class="quran-hit__reader"'), 'reader link still renders');
      const noTrans = renderSearch({
        ...searchState({ ayahPages: { '2:5': 42 } }),
        settings: { language: 'en' },
      });
      assert.ok(!noTrans.includes('a test verse'), 'reader translation pref respected');
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  });
});

describe('mushaf parity strings ship EN + AR', () => {
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('hizb + open-in-mushaf keys exist', () => {
    for (const key of [
      'mushaf.hizb',
      'mushaf.hizbSection',
      'mushaf.hizbApprox',
      'mushaf.openInMushaf',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
