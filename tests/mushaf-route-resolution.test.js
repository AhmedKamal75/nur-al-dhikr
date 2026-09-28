/**
 * tests/mushaf-route-resolution.test.js — v5.17.21, the APP layer half of
 * the "open the mushaf at 2:255" fix.
 *
 * The view layer was corrected first: mushafRoutePage() resolves a mushaf
 * route as explicit `page` → the corpus ayah→page map → the last-read
 * bookmark, and the reader, the jump drawer and the ⋯ sheet all read it.
 * The app layer kept asking the URL its own way, and a deep link is exactly
 * a route whose page the URL does NOT carry. The result was a book that
 * rendered the loading skeleton for the RIGHT page forever while the loader
 * fetched the WRONG one: for `?s=2&ay=255` the app requested
 * data/mushaf/1.json.gz and 2.json.gz and never 42.
 *
 * The resolver therefore lives in js/services/mushaf.js — the app layer
 * resolves the route on every render and must never statically import a
 * view — and everything below drives the real modules: the real store, the
 * real lazyData ensures, the real handler and the real matchMedia handler.
 * Nothing here re-implements the rule; a test that did would agree with a
 * regression by construction.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

import { mushafRoutePage } from '../js/services/mushaf.js';
import { mushafRoutePage as fromJump } from '../js/views/mushafJump.js';
import { mushafRoutePage as fromFacade, renderMushaf } from '../js/views/mushafReader.js';
import { buildMushafPlayPick } from '../js/views/mushafPlayer.js';
import {
  consumeFlipDirection,
  consumeMushafTarget,
  resetReadingTokensForTests,
  setFlipDirection,
  setMushafTarget,
} from '../js/ui/readingTokens.js';
import { actions, store } from '../js/core/state.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { rt } from '../js/app/rt.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const readJSON = (rel) => JSON.parse(read(rel));

const mushafMeta = readJSON('data/mushaf-meta.json');
/** Derived from the corpus, never typed in: 2:255 is printed on page 42. */
const KURSI_PAGE = mushafMeta.ayahPages['2:255'];
const FATIHAH_PAGE = mushafMeta.ayahPages['1:1'];
const BOOKMARK = 1;

/** Page docs the assertions need, from the shipped corpus. */
const pageDocs = {};
for (const n of [FATIHAH_PAGE, KURSI_PAGE]) pageDocs[n] = readJSON(`data/mushaf/${n}.json`);

/* ------------------------------------------------------------------ */
/* fetch + DOM shims                                                    */
/* ------------------------------------------------------------------ */

/**
 * Serve the REAL data files (gunzipped when the .json.gz sibling is asked
 * for, which is what the compressedDownloads default does) and record every
 * URL. The assertions are about WHICH page the app asks the network for, so
 * the stub has to be honest about the corpus rather than inventing docs.
 */
function stubFetch() {
  const urls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    urls.push(u);
    try {
      const raw = readFileSync(path.join(ROOT, u));
      const body = u.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      return new Response('{}', { status: 404 });
    }
  };
  return {
    urls,
    mushafPages: () =>
      urls
        .map((u) => u.match(/^data\/mushaf\/(\d+)\.json/))
        .filter(Boolean)
        .map((m) => Number(m[1])),
    quranSurahs: () =>
      urls
        .map((u) => u.match(/^data\/quran\/(\d+)\.json/))
        .filter(Boolean)
        .map((m) => Number(m[1])),
    restore() {
      globalThis.fetch = real;
    },
  };
}

/** The DOM bits js/app/events.js touches at BIND time (not at event time). */
function stubDom({ hash = '' } = {}) {
  const mq = [];
  const win = {
    location: { hash },
    scrollY: 0,
    scrollTo() {},
    history: { state: null, replaceState() {} },
    addEventListener() {},
    removeEventListener() {},
    matchMedia: (q) => ({
      matches: false,
      media: q,
      addEventListener: (_type, fn) => mq.push(fn),
      addListener: (fn) => mq.push(fn),
    }),
  };
  globalThis.window = win;
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: {
      dir: 'ltr',
      getAttribute: () => 'ltr',
      setAttribute() {},
      style: { setProperty() {}, removeProperty() {} },
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.Element = class {};
  globalThis.requestAnimationFrame = (fn) => fn();
  return { win, mediaQueries: mq };
}

/** state for the mushaf, as the store would hold it mid-arrival. */
function mushafState(overrides = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeView: 'mushaf',
    activeParams: {},
    mushaf: { meta: mushafMeta, pages: { ...pageDocs } },
    mushafBookmark: { page: BOOKMARK },
    mushafPagesRead: {},
    quran: { meta: readJSON('data/quran-meta.json'), surahs: {} },
    ayahBookmarks: [],
    ...overrides,
  };
}

/**
 * The page numbers actually PRINTED in the page medallions — the mushaf
 * keeps Eastern numerals in its own ornament whatever the UI language is, so
 * this decodes them rather than reading digits.
 */
function renderedPages(html) {
  return [...html.matchAll(/mushaf-page__number">([^<]+)</g)].map((m) =>
    [...m[1]].reduce((n, c) => n * 10 + '٠١٢٣٤٥٦٧٨٩'.indexOf(c), 0)
  );
}

/* ------------------------------------------------------------------ */
/* 1. ONE resolver, in the layer that can reach both                    */
/* ------------------------------------------------------------------ */

describe('the mushaf route resolves in exactly one place', () => {
  test('the service, the drawer re-export and the reader facade are one function', () => {
    // Identity, not equality: a second copy of the rule in either the view or
    // the app layer is exactly the bug this suite exists to prevent, and two
    // separately-typed copies can compare equal forever while diverging on
    // the next edit.
    assert.equal(typeof mushafRoutePage, 'function', 'the app layer can import it');
    assert.equal(fromJump, mushafRoutePage, 'the drawer re-exports the same function');
    assert.equal(fromFacade, mushafRoutePage, 'the reader facade re-exports the same function');
  });

  test('the app-layer callers resolve through the service, never a view', () => {
    // WHY: js/services/mushaf.js is already in the boot graph; a view is not.
    // A static import of any view from js/app/ is also an eslint error, but
    // the reason here is the boot-parse edge, and the message needs it.
    for (const rel of ['js/app/lazyData.js', 'js/app/recitationFollow.js', 'js/app/events.js']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '');
      assert.match(
        src,
        /import\s*\{[^}]*\bmushafRoutePage\b[^}]*\}\s*from\s*'\.\.\/services\/mushaf\.js'/,
        `${rel} resolves the mushaf route through services/mushaf.js`
      );
    }
  });

  test('precedence: page → the corpus map → the bookmark, and nothing invented', () => {
    assert.deepEqual(mushafRoutePage(mushafState({ activeParams: { s: '2', ay: '255' } })), {
      page: KURSI_PAGE,
      surah: 2,
      ayah: 255,
    });
    assert.deepEqual(
      mushafRoutePage(
        mushafState({ activeParams: { page: String(FATIHAH_PAGE), s: '2', ay: '255' } })
      ),
      { page: FATIHAH_PAGE, surah: 2, ayah: 255 },
      'an explicit page still wins'
    );
    assert.deepEqual(mushafRoutePage(mushafState({ activeParams: { s: '2', ay: '9999' } })), {
      page: BOOKMARK,
      surah: null,
      ayah: null,
    });
    // No meta at all: the honest fallback, never a guess.
    assert.deepEqual(
      mushafRoutePage({
        activeParams: { s: '2', ay: '255' },
        mushaf: { meta: null },
        mushafBookmark: { page: BOOKMARK },
      }),
      { page: BOOKMARK, surah: null, ayah: null }
    );
  });
});

/* ------------------------------------------------------------------ */
/* 2. THE BUG: the loader fetched the wrong page                        */
/* ------------------------------------------------------------------ */

describe('the app layer loads the page the reader renders', () => {
  test('a deep link fetches the routed page, not page 1 — the real bug', async () => {
    const net = stubFetch();
    const { ensureMushafData } = await import('../js/app/lazyData.js');
    // Cold arrival, as a shared link is: mushaf-meta.json is NOT loaded yet,
    // which is also what makes the loader's own snapshot useless for
    // resolving the route — the ayah→page map only exists after the fetch.
    store.dispatch(actions.resetAll());
    store.dispatch(actions.setMushafBookmark(BOOKMARK));
    store.dispatch(actions.navigate('mushaf', { s: '2', ay: '255' }));
    try {
      await ensureMushafData(store.getState());
      await new Promise((r) => setTimeout(r, 0)); // let the best-effort prefetch settle

      const fetched = net.mushafPages();
      assert.ok(
        fetched.includes(KURSI_PAGE),
        `page ${KURSI_PAGE} (where 2:255 is printed) is fetched — got ${fetched.join(', ')}`
      );
      assert.ok(
        !fetched.includes(BOOKMARK),
        `page ${BOOKMARK} is NOT fetched for a 2:255 arrival — got ${fetched.join(', ')}`
      );
      assert.equal(
        store.getState().mushafBookmark.page,
        KURSI_PAGE,
        'the bookmark follows the page the book is actually open at'
      );
      // The end-to-end promise: no skeleton, the right page. Before the fix
      // the reader asked for a page nothing was ever going to load.
      const html = renderMushaf(store.getState());
      assert.deepEqual(renderedPages(html), [KURSI_PAGE]);
      assert.doesNotMatch(html, /mushaf-loading/, 'the book renders, it does not shimmer');
    } finally {
      net.restore();
      store.dispatch(actions.resetAll());
    }
  });

  test('the page the loader asked for is the page the reader shows', async () => {
    const net = stubFetch();
    const { ensureMushafData } = await import('../js/app/lazyData.js');
    store.dispatch(actions.resetAll());
    store.dispatch(actions.setMushafBookmark(BOOKMARK));
    // Every mushaf render runs this ensure (stateSub), so the invariant has
    // to hold on the SECOND pass too, when meta is already resident.
    store.dispatch(actions.navigate('mushaf', { s: '2', ay: '255' }));
    try {
      await ensureMushafData(store.getState());
      const state = store.getState();
      assert.equal(mushafRoutePage(state).page, KURSI_PAGE);
      assert.deepEqual(renderedPages(renderMushaf(state)), [KURSI_PAGE]);

      net.urls.length = 0;
      await ensureMushafData(state);
      await new Promise((r) => setTimeout(r, 0));
      // Second pass: the page is already resident, so nothing new is asked
      // for and the bookmark does not drift.
      assert.deepEqual(net.mushafPages(), [], 'a resident page is never re-fetched');
      assert.equal(store.getState().mushafBookmark.page, KURSI_PAGE);
    } finally {
      net.restore();
      store.dispatch(actions.resetAll());
    }
  });

  test('a plain `?page=` route is untouched: that page, bookmarked as before', async () => {
    const net = stubFetch();
    const { ensureMushafData } = await import('../js/app/lazyData.js');
    store.dispatch(actions.resetAll());
    store.dispatch(actions.setMushafBookmark(BOOKMARK));
    store.dispatch(actions.navigate('mushaf', { page: String(KURSI_PAGE) }));
    try {
      await ensureMushafData(store.getState());
      await new Promise((r) => setTimeout(r, 0));
      const fetched = net.mushafPages();
      assert.ok(fetched.includes(KURSI_PAGE), `page ${KURSI_PAGE} is fetched`);
      assert.ok(!fetched.includes(BOOKMARK), `page ${BOOKMARK} is not — got ${fetched.join(', ')}`);
      assert.equal(store.getState().mushafBookmark.page, KURSI_PAGE);
    } finally {
      net.restore();
      store.dispatch(actions.resetAll());
    }
  });

  test('the translation tray arms for the routed page, not page 1', async () => {
    const net = stubFetch();
    const { ensureMushafSurahDocs } = await import('../js/app/lazyData.js');
    // Both page docs resident, as they are on any render after the first
    // load — the difference between them is the whole point: page 1 is
    // Al-Fatihah, page 42 is Al-Baqarah.
    try {
      await ensureMushafSurahDocs(mushafState({ activeParams: { s: '2', ay: '255' } }));
      const surahs = net.quranSurahs();
      assert.deepEqual(
        surahs,
        [2],
        `only Al-Baqarah's doc is fetched — got ${surahs.join(', ') || 'none'}`
      );
    } finally {
      net.restore();
    }
  });
});

/* ------------------------------------------------------------------ */
/* 3. The recitation picker                                             */
/* ------------------------------------------------------------------ */

describe('the recitation picker offers the surah on the page in front of you', () => {
  const pickSurahs = (html) =>
    [...html.matchAll(/data-action="surah-play" data-surah="(\d+)"/g)].map((m) => Number(m[1]));

  test('a deep link lists Al-Baqarah, not the bookmark page surah', () => {
    const html = buildMushafPlayPick(mushafState({ activeParams: { s: '2', ay: '255' } }));
    assert.deepEqual(pickSurahs(html), [2], 'the picker recites what the reader shows');
  });

  test('an explicit page and a page-less route keep the old behaviour', () => {
    assert.deepEqual(
      pickSurahs(buildMushafPlayPick(mushafState({ activeParams: { page: '1' } }))),
      [1]
    );
    assert.deepEqual(pickSurahs(buildMushafPlayPick(mushafState({ activeParams: {} }))), [
      BOOKMARK,
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* 4. Follow-along recitation                                          */
/* ------------------------------------------------------------------ */

describe('follow-along recitation on a deep link', () => {
  const followState = (ayah) =>
    mushafState({
      activeParams: { s: '2', ay: '255' },
      surahPlayback: { active: true, surah: 2, ayah },
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'en',
        audio: { ...DEFAULT_SETTINGS.audio, ayahFollow: true },
      },
    });

  test('reciting the linked ayah turns no page and pushes no history entry', async () => {
    const net = stubFetch();
    const dom = stubDom({ hash: '#/mushaf?s=2&ay=255' });
    const { maybeFollowRecitation } = await import('../js/app/recitationFollow.js');
    rt.lastFollowedAyahKey = null;
    try {
      // The book is ALREADY open on 2:255. Reciting it must be a no-op for
      // navigation: the old code compared the ayah's page against the URL's
      // (absent) page, so it "turned" to 42 — a page-turn animation and a
      // pushed history entry for a page you were already on, which then made
      // Back land the reader on Al-Fatihah.
      await maybeFollowRecitation(followState(255));
      assert.equal(
        dom.win.location.hash,
        '#/mushaf?s=2&ay=255',
        'no navigation: the reader was already on this ayah'
      );
      assert.deepEqual(net.mushafPages(), [], 'and no page fetch behind a phantom turn');
    } finally {
      net.restore();
      rt.lastFollowedAyahKey = null;
      delete globalThis.window;
      delete globalThis.document;
    }
  });

  test('an ayah on another page still turns — the follow is not disabled', async () => {
    const net = stubFetch();
    const dom = stubDom({ hash: '#/mushaf?s=2&ay=255' });
    const { maybeFollowRecitation } = await import('../js/app/recitationFollow.js');
    rt.lastFollowedAyahKey = null;
    try {
      await maybeFollowRecitation(followState(1));
      assert.equal(
        dom.win.location.hash,
        `#/mushaf?page=${mushafMeta.ayahPages['2:1']}`,
        'a genuinely different page still navigates'
      );
    } finally {
      net.restore();
      rt.lastFollowedAyahKey = null;
      delete globalThis.window;
      delete globalThis.document;
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5. Breakpoint crossing                                              */
/* ------------------------------------------------------------------ */

describe('a viewport crossing on a deep link re-bookmarks the page you are reading', () => {
  test('rotating mid deep link does not write a page-1 bookmark', async () => {
    const dom = stubDom();
    const { bindGlobalEvents } = await import('../js/app/events.js');
    store.dispatch(actions.setMushafMeta(mushafMeta));
    store.dispatch(actions.setMushafBookmark(BOOKMARK));
    store.dispatch(actions.navigate('mushaf', { s: '2', ay: '255' }));
    try {
      bindGlobalEvents();
      const handler = dom.mediaQueries[0];
      assert.equal(typeof handler, 'function', 'the wide-layout query is wired');
      handler({ matches: true });
      assert.equal(
        store.getState().mushafBookmark.page,
        KURSI_PAGE,
        `the bookmark is the page the book is open at, not ${BOOKMARK}`
      );
    } finally {
      store.dispatch(actions.resetAll());
      delete globalThis.window;
      delete globalThis.document;
    }
  });
});

/* ------------------------------------------------------------------ */
/* 6. One token, one consumer                                          */
/* ------------------------------------------------------------------ */

describe('reading tokens are consumed one at a time', () => {
  test('consuming the flip direction leaves the reveal target alone', () => {
    resetReadingTokensForTests();
    setFlipDirection('next');
    setMushafTarget(2, 255);
    assert.equal(consumeFlipDirection(), 'next', 'the flip reads once');
    // The renderer happens to take the flip before it sets the target, so the
    // old side effect was invisible — and one reorder away from silently
    // dropping the reveal of a deep-linked ayah.
    assert.deepEqual(
      consumeMushafTarget(),
      { surah: 2, ayah: 255 },
      'the reveal target survives an unrelated consume'
    );
    assert.equal(consumeMushafTarget(), null, 'and is still consume-once itself');
  });

  test('the flip token is still consume-once on its own', () => {
    resetReadingTokensForTests();
    setFlipDirection('prev');
    assert.equal(consumeFlipDirection(), 'prev');
    assert.equal(consumeFlipDirection(), null);
  });
});
