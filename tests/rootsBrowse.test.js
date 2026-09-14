/**
 * tests/rootsBrowse.test.js — item 13 (roots browser) gates:
 *  1. occurrenceGloss/occurrenceAyah resolve loaded data only (hostile
 *     shapes degrade to ''/null — never invented content);
 *  2. splitAyahWord marks the occurrence word, refusing mismatches and
 *     out-of-range positions (mis-marking is worse than no marking);
 *  3. the index paginates past the old hard 60 (page clamping, q kept);
 *  4. detail groups show previews (marked ayah + gloss + gated
 *     translation) for loaded surahs and cap ref chips behind an
 *     expander; unloaded surahs stay chips;
 *  5. handlers + strings are wired.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ROOT_GROUP_REF_CAP,
  ROOT_PREVIEW_CAP,
  ROOTS_PAGE_SIZE,
  occurrenceAyah,
  occurrenceGloss,
  splitAyahWord,
} from '../js/domain/roots.js';
import { renderRoots } from '../js/views/roots.js';

function bigIndex(n) {
  const index = {};
  for (let i = 0; i < n; i += 1) index[`r${i}`] = { count: 1, occ: [{ s: 1, a: 1, i: 1, t: 'x' }] };
  return index;
}

function occ15() {
  return Array.from({ length: 15 }, () => ({ s: 2, a: 5, i: 2, t: 'رَحْمَةٍ' }));
}

function detailState(over = {}) {
  return {
    settings: { language: 'en', showTranslation: true },
    quranRoots: { رحم: { count: 15, occ: occ15() } },
    quranRootsFull: null,
    quran: {
      surahs: {
        2: {
          ayahs: [{ number: 5, text: 'x رَحْمَةٍ y', translation: 'a mercy' }],
        },
      },
    },
    quranWords: { 2: { 5: [{ i: 2, en: 'mercy' }] } },
    activeParams: { id: 'رحم' },
    ...over,
  };
}

describe('occurrence data lookups: loaded or nothing', () => {
  const words = {
    2: {
      5: [
        { i: 2, en: 'mercy' },
        { i: 3, en: '' },
      ],
    },
  };
  const surahs = { 2: { ayahs: [{ number: 5, text: 'x y', translation: 't' }] } };

  test('gloss resolves the word record, else empty', () => {
    assert.equal(occurrenceGloss(words, 2, 5, 2), 'mercy');
    assert.equal(occurrenceGloss(words, 2, 5, 9), '');
    assert.equal(occurrenceGloss(words, 2, 6, 2), '');
    assert.equal(occurrenceGloss(words, 3, 5, 2), '');
    assert.equal(occurrenceGloss(null, 2, 5, 2), '');
    assert.equal(occurrenceGloss(words, 2, 5, 3), '', 'blank gloss stays blank');
  });

  test('ayah resolves the loaded record, else null', () => {
    assert.deepEqual(occurrenceAyah(surahs, 2, 5), {
      number: 5,
      text: 'x y',
      translation: 't',
    });
    assert.equal(occurrenceAyah(surahs, 2, 6), null);
    assert.equal(occurrenceAyah(surahs, 3, 5), null);
    assert.equal(occurrenceAyah(null, 2, 5), null);
    assert.equal(occurrenceAyah({ 2: { ayahs: 'x' } }, 2, 5), null);
  });

  test('splitAyahWord marks position-verified words only', () => {
    assert.deepEqual(splitAyahWord('x رَحْمَةٍ y', 2, 'رَحْمَةٍ'), {
      pre: 'x',
      word: 'رَحْمَةٍ',
      post: 'y',
    });
    assert.equal(splitAyahWord('x OTHER y', 2, 'رَحْمَةٍ'), null, 'mismatch never marks');
    assert.equal(splitAyahWord('x y', 5, 'z'), null, 'out of range');
    assert.equal(splitAyahWord('x y', 'junk', 'x'), null);
    assert.equal(splitAyahWord(null, 1, 'x'), null);
  });

  test('render caps are sane constants', () => {
    assert.equal(ROOTS_PAGE_SIZE, 60);
    assert.equal(ROOT_PREVIEW_CAP, 3);
    assert.equal(ROOT_GROUP_REF_CAP, 12);
  });
});

describe('index pagination: past the hard 60', () => {
  test('page 1 renders 60 with a pager; page 2 the rest', () => {
    const p1 = renderRoots({
      settings: { language: 'en' },
      quranRoots: bigIndex(70),
      quranRootsFull: null,
      activeParams: {},
    });
    assert.equal((p1.match(/class="root-tile"/g) || []).length, 60);
    assert.ok(p1.includes('data-action="roots-page"'), 'pager renders');
    assert.ok(p1.includes('page 1/2'), 'pager status');
    const p2 = renderRoots({
      settings: { language: 'en' },
      quranRoots: bigIndex(70),
      quranRootsFull: null,
      activeParams: { page: '2' },
    });
    assert.equal((p2.match(/class="root-tile"/g) || []).length, 10);
    assert.ok(p2.includes('page 2/2'), 'pager follows');
  });

  test('hostile pages clamp; a single page hides the pager', () => {
    const base = { settings: { language: 'en' }, quranRoots: bigIndex(70), quranRootsFull: null };
    const clamped = renderRoots({ ...base, activeParams: { page: '99' } });
    assert.ok(clamped.includes('page 2/2'), 'clamps to the last page');
    const small = renderRoots({ ...base, quranRoots: bigIndex(3) });
    assert.ok(!small.includes('data-action="roots-page"'), 'no pager for one page');
  });

  test('pager buttons preserve the filter', () => {
    const html = renderRoots({
      settings: { language: 'en' },
      quranRoots: bigIndex(70),
      quranRootsFull: null,
      activeParams: { q: 'r', page: '1' },
    });
    assert.ok(html.includes('data-q="r"'), 'filter survives paging');
  });
});

describe('detail groups: previews, glosses, expanders', () => {
  test('loaded surahs preview with marked word, gloss and translation', () => {
    const html = renderRoots(detailState());
    assert.equal((html.match(/class="root-preview"/g) || []).length, 3, 'capped previews');
    assert.ok(html.includes('<mark>رَحْمَةٍ</mark>'), 'occurrence word marked');
    assert.ok(html.includes('mercy'), 'word gloss shown');
    assert.ok(html.includes('a mercy'), 'translation shown when enabled');
    assert.equal((html.match(/data-action="roots-jump"/g) || []).length, 15, 'all chips kept');
    assert.ok(html.includes('data-action="roots-expand"'), 'overflow expander renders');
    assert.ok(html.includes('Show all (3)'), 'expander names the overflow');
  });

  test('translation hides with the reader pref; unloaded surahs stay chips', () => {
    const noTrans = renderRoots(detailState({ settings: { language: 'en' } }));
    assert.ok(!noTrans.includes('a mercy'), 'reader pref respected');
    const bare = renderRoots(detailState({ quran: { surahs: {} }, quranWords: {} }));
    assert.ok(!bare.includes('class="root-preview"'), 'no previews without loaded docs');
    assert.ok(!bare.includes('mercy'), 'no gloss without word data');
    assert.ok(bare.includes('data-action="roots-jump"'), 'chips still jump to the reader');
  });

  test('expander carries both labels for the toggle', () => {
    const html = renderRoots(detailState());
    assert.ok(html.includes('data-label-less="Show less"'), 'collapse label rides along');
    assert.ok(html.includes('aria-expanded="false"'), 'collapsed state announced');
  });
});

describe('roots browse wiring: handlers and strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/quran.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('page and expand keys are registered', () => {
    assert.ok(handlers.includes("'roots-page'"), 'page handler missing');
    assert.ok(handlers.includes("'roots-expand'"), 'expand handler missing');
  });

  test('expander strings ship EN + AR', () => {
    assert.ok(en.includes("'roots.showAll'"), 'EN missing roots.showAll');
    assert.ok(ar.includes("'roots.showAll'"), 'AR missing roots.showAll');
    assert.ok(en.includes("'roots.showLess'"), 'EN missing roots.showLess');
    assert.ok(ar.includes("'roots.showLess'"), 'AR missing roots.showLess');
  });
});
