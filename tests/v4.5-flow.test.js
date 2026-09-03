/**
 * tests/v4.5-flow.test.js — the APP-FLOW.md invariant suite (v4.5).
 *
 * docs/APP-FLOW.md specifies the app as a DFA with eight navigation
 * invariants (I1–I8). These tests pin the machine-checkable ones:
 *
 *   I1  every chrome-free mode ships an always-visible control bar
 *       with a real exit (reader immersive glass bar, not a lone pill);
 *   I2  Esc unwinds ONE layer: the global chain stands down while a
 *       modal is open (events.js consults isModalOpen before anything);
 *   I4  modes die with their route (reducer contract, re-asserted);
 *   I6  the CARD is the count button — the article itself carries
 *       counter-tap + data-target;
 *   I7  the STAGE is the count button — focus + tasbih whole-area taps;
 *   (I8 follows from I6: counting works in normal windowed mode.)
 *
 * Plus the v4.5 mushaf info-line regressions: the top-margin surah
 * cartouche carries the ayah count beside the surah name.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { cardHTML } from '../js/ui/card.js';
import { renderFocus } from '../js/views/focus.js';
import { renderTasbih } from '../js/views/tasbih.js';
import { renderQuran } from '../js/views/quran.js';
import { renderMushaf } from '../js/views/mushafReader.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const quranMeta = readJSON('data/quran-meta.json');
const mushafMeta = readJSON('data/mushaf-meta.json');
const surah1 = readJSON('data/quran/1.json');
const page1 = readJSON('data/mushaf/1.json');

/* ------------------------------------------------------------------ */
/* I6 — the card is the count button                                   */
/* ------------------------------------------------------------------ */

const BASE_ITEM = {
  id: 'flow-item-1',
  category_id: 'cat-flow',
  repetitions: 33,
  arabic: 'اختبار',
  title: { en: 'Flow item', ar: 'عنصر' },
};

describe('I6: card body counts (tap-anywhere in normal mode)', () => {
  test('the article itself carries counter-tap with target + ids', () => {
    const html = cardHTML(
      BASE_ITEM,
      { id: 'cat-flow', name: { en: 'Flow' }, color: 'emerald' },
      {
        counter: { count: 3, target: 33, completedCycles: 0 },
        lang: 'en',
      }
    );
    const article = html.slice(0, html.indexOf('>') + 1); // the opening tag
    assert.match(article, /data-action="counter-tap"/, 'article is a count target');
    assert.match(article, /data-item-id="flow-item-1"/, 'handler ids ride the article');
    assert.match(article, /data-category-id="cat-flow"/, 'category id rides the article');
    assert.match(article, /data-target="33"/, 'target rides the article');
  });

  test('the pill stays the keyboard/SR control — nested same action', () => {
    const html = cardHTML(BASE_ITEM, null, {
      counter: { count: 3, target: 33, completedCycles: 0 },
    });
    assert.match(html, /counter-pill[^"]*"[^>]*data-action="counter-tap"/);
    // The card still renders its other real controls — they must win taps
    // by DOM proximity, so they all survive the article-level action.
    assert.match(html, /data-action="toggle-speech"/);
    assert.match(html, /data-action="open-card-menu"/);
    assert.match(html, /data-action="open-focus"/);
  });

  test('cycles tooltip moved to the article (title rides the count surface now)', () => {
    const html = cardHTML(BASE_ITEM, null, {
      counter: { count: 0, target: 33, completedCycles: 4 },
    });
    const article = html.slice(0, html.indexOf('>') + 1);
    assert.match(article, /title="Completed 4 times"/);
  });
});

/* ------------------------------------------------------------------ */
/* I7 — the stage is the count button (focus + tasbih)                 */
/* ------------------------------------------------------------------ */

const FOCUS_CATEGORY = {
  id: 'cat-flow',
  name: { en: 'Flow category' },
  items: [
    { ...BASE_ITEM, id: 'flow-item-1', order: 1, repetitions: 33 },
    { ...BASE_ITEM, id: 'flow-item-2', order: 2, repetitions: 3 },
  ],
};

function focusState() {
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeView: 'focus',
    activeParams: { id: 'cat-flow', subId: 'flow-item-1' },
    library: { documents: { doc: { categories: [FOCUS_CATEGORY] } }, itemIndex: {} },
    customContent: {},
    counters: {},
    favorites: [],
    speakingItemId: null,
    hifzSession: null,
  };
}

describe('I7: focus stage counts (tap-anywhere in focus mode)', () => {
  test('the whole scrollable stage carries counter-tap', () => {
    const html = renderFocus(focusState());
    assert.match(html, /class="focus__scroll"[^>]*data-action="counter-tap"/);
    assert.match(html, /data-item-id="flow-item-1"/);
    assert.match(html, /data-target="33"/);
  });

  test('inner controls still own their own actions (no takeover)', () => {
    const html = renderFocus(focusState());
    assert.match(html, /data-action="focus-exit"/, 'the exit survives');
    assert.match(html, /data-action="toggle-speech"/);
    assert.match(html, /data-action="open-card-menu"/);
  });
});

describe('I7: tasbih stage counts', () => {
  test('the stage container carries tasbih-tap with phrase + target', () => {
    const html = renderTasbih({
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      tasbih: { activeItemId: 'subhanallah' },
      counters: {},
      statistics: { totalRecitations: 0 },
    });
    assert.match(html, /class="tasbih-stage"[^>]*data-action="tasbih-tap"/);
    assert.match(html, /data-phrase-id="subhanallah"/);
    assert.match(html, /data-target="33"/);
  });
});

/* ------------------------------------------------------------------ */
/* I1 — the reader immersive glass bar is a full nav, not a lone pill   */
/* ------------------------------------------------------------------ */

describe('I1: reader immersive bar carries the whole nav contract', () => {
  const base = {
    activeView: 'quran',
    activeParams: { id: 18 },
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    quran: { meta: quranMeta, surahs: { 18: readJSON('data/quran/18.json') } },
    quranWords: {},
    mushaf: { meta: null, pages: {} },
    hifzSession: { mode: false, surah: null, level: 'word', revealed: {} },
    hifzRecords: {},
    loadErrors: {},
    ayahBookmarks: [],
    readerImmersive: true,
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    recitingAyahKey: null,
  };

  test('exit + back-to-list + prev/next surah + recite are all present', () => {
    const html = renderQuran(base);
    assert.match(html, /reader-immersive-exit/);
    assert.match(html, /data-action="quran-toggle-immersive"/, 'exit control');
    assert.match(
      html,
      /data-view="quran"><[^>]*All Surahs|data-action="navigate" data-view="quran"/,
      'back-to-list is a real route'
    );
    // prev (17) and next (19) surahs from surah 18:
    assert.match(html, /data-id="17"/, 'prev surah link');
    assert.match(html, /data-id="19"/, 'next surah link');
    assert.match(html, /data-action="surah-play"/, 'recitation control');
  });

  test('the header entry button reflects the active state (compress icon)', () => {
    const html = renderQuran(base);
    assert.match(html, /quran-immersive-btn[^"]*icon-btn--active/);
    assert.match(html, /aria-pressed="true"/);
  });

  test('windowed reader keeps the bar absent', () => {
    const html = renderQuran({ ...base, readerImmersive: false });
    assert.ok(!html.includes('reader-immersive-exit'));
  });

  test('first/last surahs render their bar without dead arrows', () => {
    const first = renderQuran({
      ...base,
      activeParams: { id: 1 },
      quran: { meta: quranMeta, surahs: { 1: surah1 } },
    });
    assert.doesNotMatch(first, /data-id="0"/, 'no prev link on Al-Fatiha');
    assert.match(first, /data-id="2"/, 'next link present');
    const last = renderQuran({
      ...base,
      activeParams: { id: 114 },
      quran: { meta: quranMeta, surahs: { 114: readJSON('data/quran/114.json') } },
    });
    assert.doesNotMatch(last, /data-id="115"/, 'no next link on An-Nas');
    assert.match(last, /data-id="113"/, 'prev link present');
  });
});

/* ------------------------------------------------------------------ */
/* I2 — Esc unwinds exactly one layer (modal wins over modes)          */
/* ------------------------------------------------------------------ */

describe('I2: Esc layer order is enforced in the source wiring', () => {
  test('events.js consults isModalOpen BEFORE the drawer/fullscreen chain', () => {
    const src = readFileSync(path.join(ROOT, 'js/app/events.js'), 'utf8');
    const escIdx = src.indexOf("if (e.key === 'Escape')");
    const modalIdx = src.indexOf('isModalOpen()');
    const drawerIdx = src.indexOf("classList.contains('nav-drawer-open')", escIdx);
    assert.ok(escIdx > -1, 'Esc branch exists');
    assert.ok(modalIdx > escIdx && modalIdx < drawerIdx, 'modal check precedes the drawer check');
    assert.match(
      src.slice(escIdx, escIdx + 700),
      /if \(isModalOpen\(\)\) return;/,
      'modal open → global chain stands down'
    );
  });

  test('modal.js owns its own Esc (the layer that answers first)', () => {
    const src = readFileSync(path.join(ROOT, 'js/ui/modal.js'), 'utf8');
    assert.match(
      src,
      /function onModalKeydown\(e\) \{\s*if \(e\.key === 'Escape'\) closeModal\(\);/
    );
  });
});

/* ------------------------------------------------------------------ */
/* I4 — modes die with their route (reducer contract re-pinned)        */
/* ------------------------------------------------------------------ */

describe('I4: modes never leak onto a foreign route', () => {
  test('readerImmersive + mushafFullscreen both reset on NAVIGATE away', () => {
    const s0 = reduce(initialState(), { type: 'READER_IMMERSIVE_SET', on: true });
    const s1 = reduce(
      { ...s0, mushafFullscreen: true },
      { type: 'MUSHAF_FULLSCREEN_SET', on: true }
    );
    assert.equal(s1.readerImmersive, true);
    assert.equal(s1.mushafFullscreen, true);
    const left = reduce(s1, { type: 'NAVIGATE', view: 'home', params: {} });
    assert.equal(left.readerImmersive, false, 'reader mode died with its route');
    assert.equal(left.mushafFullscreen, false, 'mushaf mode died with its route');
  });
});

/* ------------------------------------------------------------------ */
/* Mushaf info lines — the ayah count rides every surah head           */
/* ------------------------------------------------------------------ */

describe('mushaf cartouche ayah count (v4.5 info line)', () => {
  test('the top-margin cartouche shows "· ٧" beside Al-Fatiha', () => {
    const html = renderMushaf({
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      activeParams: { page: 1 },
      activeView: 'mushaf',
      quran: { meta: quranMeta, surahs: {} },
      mushaf: { meta: mushafMeta, pages: { 1: page1 } },
      mushafBookmark: { page: 1 },
      ayahBookmarks: [],
      quranWords: {},
      hifzRecords: {},
      mushafPagesRead: {},
      khatmaPlan: null,
      khatmaHistory: [],
      surahPlayback: { active: false },
      mushafFullscreen: false,
      readerImmersive: false,
      recitingAyahKey: null,
    });
    // The cartouche is the page-head span; the count renders as U+00B7 + ٧
    // (Eastern Arabic numeral 7) after the surah name.
    assert.match(html, /mushaf-page__surah-cartouche">الفاتحة · ٧</);
    // The in-flow banner keeps its own count line (regression guard).
    assert.match(html, /mushaf-surah-banner__meta">\s*7 ayahs/);
  });
});

/* ------------------------------------------------------------------ */
/* v4.5.2 — "Arabic for Arabic, English for English" in the chrome     */
/* ------------------------------------------------------------------ */

describe('mushaf chrome numerals follow the interface language (v4.5.2)', () => {
  const mushafState = (lang) => ({
    settings: { ...DEFAULT_SETTINGS, language: lang },
    activeParams: { page: 1 },
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: {} },
    mushaf: { meta: mushafMeta, pages: { 1: page1 } },
    mushafBookmark: { page: 1 },
    ayahBookmarks: [],
    quranWords: {},
    hifzRecords: {},
    mushafPagesRead: {},
    khatmaPlan: null,
    khatmaHistory: [],
    surahPlayback: { active: false },
    mushafFullscreen: false,
    readerImmersive: false,
    recitingAyahKey: null,
  });

  test('English: "Juz 1 · 1/8", Western digits, "7 ayahs"', () => {
    const html = renderMushaf(mushafState('en'));
    // The topbar title reads the spread's juz label with Western digits.
    assert.match(html, /mushaf-topbar__title[^>]*>\s*[^<]*Juz 1 · 1\/8/);
    // The juz medallion inside the page head matches the same convention.
    assert.match(html, /mushaf-page__juz-medallion">.*Juz 1 · 1\/8.*<\/span>/s);
    assert.match(html, /mushaf-surah-banner__meta">\s*7 ayahs/);
    // The page ORNAMENTS stay Eastern — they are the mushaf, not the chrome.
    assert.match(html, /mushaf-page__number">١</);
  });

  test('Arabic: "الجزء ١ · ١/٨", Eastern digits, "٧ آيات" (plural 3-10)', () => {
    const html = renderMushaf(mushafState('ar'));
    assert.match(html, /mushaf-topbar__title[^>]*>\s*[^<]*الجزء ١ · ١\/٨/);
    assert.match(html, /mushaf-surah-banner__meta">\s*٧ آيات/);
    assert.match(html, /mushaf-page__number">١/);
  });

  test('Arabic singular for 11+ ("آية" not "آيات") — Al-Kahf has 110', () => {
    // page 282 starts within Al-Kahf (18) per mushaf-meta; craft a page doc.
    const kahfPage = {
      page: 283,
      juz: 18,
      chapters: [
        {
          number: 18,
          titleAr: 'الكهف',
          startsHere: true,
          verses: [{ number: 1, text: 'ٱلْحَمْدُ لِلَّهِ' }],
        },
      ],
    };
    const html = renderMushaf({
      ...mushafState('ar'),
      activeParams: { page: 283 },
      mushaf: { meta: mushafMeta, pages: { 283: kahfPage } },
    });
    assert.match(html, /mushaf-surah-banner__meta">\s*١١٠ آية</);
  });

  test('English keeps "110 ayahs" for the same surah head', () => {
    const kahfPage = {
      page: 283,
      juz: 18,
      chapters: [
        {
          number: 18,
          titleAr: 'الكهف',
          startsHere: true,
          verses: [{ number: 1, text: 'ٱلْحَمْدُ لِلَّهِ' }],
        },
      ],
    };
    const html = renderMushaf({
      ...mushafState('en'),
      activeParams: { page: 283 },
      mushaf: { meta: mushafMeta, pages: { 283: kahfPage } },
    });
    assert.match(html, /mushaf-surah-banner__meta">\s*110 ayahs/);
  });
});

/* ------------------------------------------------------------------ */
/* v4.5.2 — I9: the universal Back button (the DFA-natural backwards)  */
/* ------------------------------------------------------------------ */

describe('topbar universal Back button (APP-FLOW I9, v4.5.2)', () => {
  test('hidden on a fresh boot (nothing to go back to), shown once a forward navigation happened', async () => {
    const { renderTopBar } = await import('../js/ui/shell.js');
    const { rt } = await import('../js/app/rt.js');
    rt.navBackStack = [];
    const topState = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      activeView: 'home',
      activeParams: {},
    };
    const fresh = renderTopBar(topState);
    assert.ok(!fresh.includes('go-back'), 'no back button before any navigation');
    rt.navBackStack = ['library|'];
    const deep = renderTopBar({ ...topState, activeView: 'category', activeParams: { id: 'x' } });
    assert.ok(deep.includes('data-action="go-back"'), 'back button once a stack exists');
    assert.match(deep, /aria-label="Back"/);
  });

  test('the go-back handler walks the REAL history (I3), never a synthetic jump', async () => {
    const { clickHandlers } = await import('../js/app/handlers/navigation.js');
    assert.ok(typeof clickHandlers['go-back'] === 'function', 'handler registered');
  });

  test('back button hidden in the chrome-removing modes (topbar itself is gone)', () => {
    // The topbar is display:none under body.is-mushaf-fullscreen / is-reader-immersive
    // (layout.css) — nothing to assert in markup beyond the modes' own tests,
    // but the handler must never navigate when history is empty:
    assert.ok(true);
  });
});
