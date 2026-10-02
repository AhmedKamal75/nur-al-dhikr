import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  foldTranslit,
  romanizeArabic,
  consonantSkeleton,
  expandQueryWithRoots,
  mergeQuranHits,
  unifiedSearch,
} from '../js/domain/rootAwareSearch.js';
import { renderSearch } from '../js/views/search.js';
import { buildQuranIndex, resetQuranIndex, setQuranIndexReady } from '../js/domain/quranSearch.js';

const ROOTS = {
  رحم: {
    count: 5,
    occ: [
      { s: 1, a: 1, t: 'رحمة' },
      { s: 2, a: 2, t: 'رحيم' },
    ],
  },
  علم: { count: 3, occ: [{ s: 3, a: 3, t: 'عليم' }] },
};
const MEANINGS = {
  رحم: { en: 'mercy, womb', ar: 'الرحمة' },
  علم: { en: 'knowledge', ar: 'العلم' },
};

test('foldTranslit cancels Latin diacritics and ayn/hamza', () => {
  assert.equal(foldTranslit('ṣabr'), 'sabr');
  assert.equal(foldTranslit('ʿilm'), 'ilm');
  assert.equal(foldTranslit(null), '');
  assert.equal(foldTranslit('Tasbīh!'), 'tasbih');
});

test('romanizeArabic + consonantSkeleton bridge scripts', () => {
  assert.equal(romanizeArabic('رحم'), 'rhm');
  assert.equal(consonantSkeleton('rahman'), 'rhmn');
  assert.equal(consonantSkeleton('rhmn'), 'rhmn');
});

test('arabic query matching a root key expands its family', () => {
  const r = expandQueryWithRoots('رحم', ROOTS, MEANINGS);
  assert.ok(r.matched);
  assert.ok(r.roots.some((x) => x.root === 'رحم' && x.reason === 'key'));
  assert.ok(r.arabicForms.length > 0);
});

test('arabic word matching a surface form expands via form reason', () => {
  const r = expandQueryWithRoots('رحيم', { رحم: ROOTS['رحم'] }, {});
  assert.ok(r.matched);
  assert.ok(r.roots.some((x) => x.root === 'رحم'));
});

test('english query matching a recorded meaning expands (data, never invented)', () => {
  const r = expandQueryWithRoots('mercy', ROOTS, MEANINGS);
  assert.ok(r.matched);
  assert.ok(r.roots.some((x) => x.root === 'رحم' && x.reason === 'meaning'));
});

test('latin skeleton names the arabic root (romanized reason)', () => {
  const r = expandQueryWithRoots('rhm', ROOTS, {});
  assert.ok(r.matched);
  assert.ok(r.roots.some((x) => x.root === 'رحم' && x.reason === 'romanized'));
});

test('no match stays honestly unmatched, hostile keys safe', () => {
  const r = expandQueryWithRoots('xyzqq', ROOTS, MEANINGS);
  assert.equal(r.matched, false);
  assert.deepEqual(r.roots, []);
  const evil = expandQueryWithRoots('رحم', JSON.parse('{"__proto__":{"polluted":1}}'), {});
  assert.equal(evil.matched, false);
  assert.equal({}.polluted, undefined);
});

test('mergeQuranHits keeps exact order, appends expanded in mushaf order, dedupes', () => {
  const exact = [{ s: 2, a: 255, score: 9 }];
  const expanded = [
    { s: 2, a: 255, viaRoot: 'x' },
    { s: 1, a: 1, viaRoot: 'x' },
    { s: 114, a: 1, viaRoot: 'x' },
  ];
  const out = mergeQuranHits(exact, expanded);
  assert.deepEqual(
    out.map((h) => `${h.s}:${h.a}`),
    ['2:255', '1:1', '114:1']
  );
});

test('unifiedSearch names unrun tiers pending/failed, never counts them as zero', () => {
  const r = unifiedSearch('نور', {
    libraryHits: [{ id: 1 }],
    quranExact: [],
    quranExpanded: [],
    rootHits: [],
    tiers: { library: true, quran: 'failed', roots: 'pending' },
  });
  assert.deepEqual(r.searched, ['library']);
  assert.deepEqual(r.failed, ['quran']);
  assert.deepEqual(r.pending, ['roots']);
  assert.equal(r.empty.library, false);
});

const VIEW_DOCS = {
  1: {
    ayahs: [{ number: 1, text: 'بسم الله الرحمن الرحيم', translation: 'In the name of Allah' }],
  },
};

function viewState(q, extra = {}) {
  return {
    settings: { language: 'en', showTranslation: true },
    activeParams: { q, ...extra },
    search: { historyList: [] },
    library: { documents: {}, order: [], itemIndex: {} },
    favorites: [],
    speakingItemId: null,
    dhikrAudioItemId: null,
    counters: {},
    quran: { surahs: VIEW_DOCS, meta: null },
    mushaf: { meta: null },
    tafsir: {},
    tafsirEditions: { editions: [] },
    loadErrors: {},
    quranRoots: null,
    rootsMeaning: { index: null, failed: false },
  };
}

test('view: roots tier renders honest empty naming the root index when unmatched', () => {
  resetQuranIndex();
  buildQuranIndex(VIEW_DOCS);
  setQuranIndexReady(true);
  try {
    const html = renderSearch(viewState('zzzqqq'));
    assert.match(html, /From the word roots/);
    assert.match(html, /Searched the root index — nothing matched/);
  } finally {
    setQuranIndexReady(false);
    resetQuranIndex();
  }
});

test('view: matched root family renders door chips into the roots view', () => {
  resetQuranIndex();
  buildQuranIndex(VIEW_DOCS);
  setQuranIndexReady(true);
  try {
    const st = viewState('رحمة');
    st.quranRoots = { رحم: { count: 2, occ: [{ s: 1, a: 1, t: 'رحمة' }] } };
    st.rootsMeaning = { index: { رحم: { en: 'mercy', ar: 'الرحمة' } }, failed: false };
    const html = renderSearch(st);
    assert.match(html, /#/);
    assert.match(html, /رحم/);
    assert.match(html, /Including the .+ family/);
  } finally {
    setQuranIndexReady(false);
    resetQuranIndex();
  }
});

test('view: empty quran tier names its scope instead of generic nothing', () => {
  resetQuranIndex();
  buildQuranIndex(VIEW_DOCS);
  setQuranIndexReady(true);
  try {
    const html = renderSearch(viewState('zzzqqq'));
    assert.match(html, /Searched the Qur\u2019an — nothing matched/);
  } finally {
    setQuranIndexReady(false);
    resetQuranIndex();
  }
});
