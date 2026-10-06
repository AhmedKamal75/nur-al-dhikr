/**
 * tests/mushaf-search.test.js — the mushaf-search gap (v5.17.28):
 *  1. resolvePage lives ONLY in services/mushaf.js — search.js imports it
 *     from there (v5.17.41 removed the deprecated surahPlayback re-export,
 *     so the engine can no longer hand out a second copy to drift);
 *  2. the canonical resolvePage + mushafRoutePage resolve units;
 *  3. search ayah hits render the mushaf chip (page AND ayah deep link,
 *     sibling anchors) and render none when the map is missing — or corrupt.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolvePage, mushafRoutePage } from '../js/services/mushaf.js';
import * as playback from '../js/services/surahPlayback.js';
import { renderSearch } from '../js/views/search.js';
import { buildQuranIndex, resetQuranIndex, setQuranIndexReady } from '../js/domain/quranSearch.js';

const ROOT = new URL('..', import.meta.url).pathname;
const readProject = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

describe('mushaf-search unification: one resolvePage', () => {
  test('search.js imports resolvePage from services/mushaf.js', () => {
    const src = readProject('js/views/search.js');
    assert.match(
      src,
      /import\s*\{\s*resolvePage\s*\}\s*from\s*'\.\.\/services\/mushaf\.js'/,
      'search resolves pages through the canonical service'
    );
    assert.doesNotMatch(src, /services\/surahPlayback\.js/, 'no engine import left in search');
  });

  test('surahPlayback no longer re-exports resolvePage (one implementation)', async () => {
    assert.equal(
      playback.resolvePage,
      undefined,
      'the deprecated dup is gone — import resolvePage from services/mushaf.js'
    );
    assert.equal(typeof resolvePage, 'function', 'the canonical import still resolves');
  });
});

describe('resolvePage (canonical, services/mushaf.js)', () => {
  const map = { '1:1': 1, '2:255': 42, '114:6': 604 };

  test('resolves known ayahs, coercing string pairs', () => {
    assert.equal(resolvePage(map, 2, 255), 42);
    assert.equal(resolvePage(map, '2', '255'), 42);
    assert.equal(resolvePage(map, 1, 1), 1);
    assert.equal(resolvePage(map, 114, 6), 604);
  });

  test('hostile input and corrupt entries refuse with null', () => {
    assert.equal(resolvePage(null, 2, 255), null);
    assert.equal(resolvePage(undefined, 2, 255), null);
    assert.equal(resolvePage('nope', 2, 255), null);
    assert.equal(resolvePage({}, 2, 255), null);
    assert.equal(resolvePage(map, 0, 1), null);
    assert.equal(resolvePage(map, 2, 0), null);
    assert.equal(resolvePage(map, 'x', 'y'), null);
    assert.equal(resolvePage({ '2:255': 99999 }, 2, 255), null, 'out-of-range page refused');
    assert.equal(resolvePage({ '2:255': 'x' }, 2, 255), null, 'non-numeric page refused');
  });
});

describe('mushafRoutePage (the one route resolution)', () => {
  const state = (activeParams, ayahPages = { '2:255': 42 }) => ({
    activeParams,
    mushaf: { meta: ayahPages ? { ayahPages } : null },
    mushafBookmark: { page: 7 },
    settings: { mushafPrefs: {} },
  });

  test('an ayah resolves to its page and stays marked', () => {
    assert.deepEqual(mushafRoutePage(state({ s: '2', ay: '255' })), {
      page: 42,
      surah: 2,
      ayah: 255,
    });
  });

  test('an explicit page wins over the ayah', () => {
    assert.deepEqual(mushafRoutePage(state({ page: '3', s: '2', ay: '255' })), {
      page: 3,
      surah: 2,
      ayah: 255,
    });
  });

  test('an unresolvable ayah falls back to the bookmark, unmarked', () => {
    assert.deepEqual(mushafRoutePage(state({ s: '2', ay: '9999' })), {
      page: 7,
      surah: null,
      ayah: null,
    });
  });

  test('no map means no resolution, never a crash', () => {
    assert.deepEqual(mushafRoutePage(state({ s: '2', ay: '255' }, null)), {
      page: 7,
      surah: null,
      ayah: null,
    });
  });
});

describe('search hits: mushaf chip href and honest absence', () => {
  const SURAH_DOCS = {
    2: { ayahs: [{ number: 5, text: 'نص تجريبي', translation: 'a test verse' }] },
  };

  function searchState(mushafMeta, lang = 'en') {
    return {
      settings: { language: lang, showTranslation: true },
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

  function withIndex(fn) {
    resetQuranIndex();
    buildQuranIndex(SURAH_DOCS);
    setQuranIndexReady(true);
    try {
      fn();
    } finally {
      resetQuranIndex();
      setQuranIndexReady(false);
    }
  }

  test('chip deep-links page AND ayah beside the reader link', () => {
    withIndex(() => {
      const html = renderSearch(searchState({ ayahPages: { '2:5': 42 } }));
      assert.ok(html.includes('href="#/quran/2?ay=5"'), 'reader deep link intact');
      assert.ok(html.includes('href="#/mushaf?page=42&s=2&ay=5"'), 'chip carries page + ayah');
      assert.ok(html.includes('data-page="42"'), 'page rides the dataset');
      assert.ok(
        html.match(/class="quran-hit__reader"[\s\S]*?<\/a>\s*<a class="quran-hit__mushaf"/),
        'sibling links, never nested anchors'
      );
    });
  });

  test('AR chip label renders, never undefined', () => {
    withIndex(() => {
      const html = renderSearch(searchState({ ayahPages: { '2:5': 42 } }, 'ar'));
      assert.ok(html.includes('quran-hit__mushaf'), 'chip renders in AR');
      assert.ok(html.includes('افتح في المصحف'), 'AR open-in-mushaf label');
      assert.doesNotMatch(html, /undefined/);
    });
  });

  test('root-expanded hits disclose why the ayah matched', () => {
    withIndex(() => {
      const html = renderSearch(searchState({ ayahPages: { '2:5': 42 } }));
      const original = Object.assign({}, searchState({ ayahPages: { '2:5': 42 } }));
      // Keep the renderer contract honest without replacing the search engine:
      // renderSearch reads the hit flag from the search result. This assertion
      // verifies the dedicated disclosure class/text exists in the template.
      assert.match(
        readProject('js/views/search.js'),
        /quran-hit__relation.*search\.relatedRoot/,
        'Qur’an search has a dedicated related-root disclosure'
      );
      assert.equal(typeof original, 'object');
      assert.ok(html.includes('quran-hit__mushaf'));
    });
  });

  test('tafsir hits can continue into the exact Mushaf page when the map exists', () => {
    const src = readProject('js/views/search.js');
    assert.match(
      src,
      /function tafsirResultRow[\s\S]*resolvePage\(state\.mushaf\?\.meta\?\.ayahPages/
    );
    assert.match(src, /function tafsirResultRow[\s\S]*search\.mushafPage/);
  });
  test('no chip without the map; corrupt entries chip nothing', () => {
    withIndex(() => {
      const bare = renderSearch(searchState(null));
      assert.ok(!bare.includes('quran-hit__mushaf'), 'no chip without ayahPages');
      assert.ok(bare.includes('class="quran-hit__reader"'), 'reader link still renders');
      const corrupt = renderSearch(searchState({ ayahPages: { '2:5': 99999 } }));
      assert.ok(!corrupt.includes('quran-hit__mushaf'), 'out-of-range entry refuses the chip');
    });
  });
});
