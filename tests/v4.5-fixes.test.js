/**
 * tests/v4.5-fixes.test.js — regression suite for the v4.5 wave:
 *
 *   - double-page spread math (right/left/next/prev) and its gating,
 *   - juz eighths ("Juz 18 · 3/8") from the real mushaf-meta index,
 *   - the spread-aware Mushaf renderer (facing pages, pending sheet,
 *     pair-granularity nav bounds, fullscreen tap zones + counter),
 *   - the surah banner's ayah-count line and the jump drawer's counts,
 *   - ayah-detail feature parity (share / open-in-study / hifz row),
 *   - the classic reader's immersive slice + entry/exit markup.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
  juzEighth,
  mushafSpreadActive,
  setMushafWideLayout,
} from '../js/services/mushaf.js';
import {
  renderMushaf,
  buildMushafAyahDetail,
  buildMushafSheet,
  buildMushafJump,
} from '../js/views/mushafReader.js';
import { renderQuran } from '../js/views/quran.js';
import { buildMushafSettingsPanel } from '../js/views/tafsirPanel.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const mushafMeta = readJSON('data/mushaf-meta.json');
const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');
const surah2 = readJSON('data/quran/2.json');
const words1 = readJSON('data/quran-words/1.json');
const words2 = readJSON('data/quran-words/2.json');
const pageDocs = {};
for (const n of [1, 2, 3, 4, 199, 200, 603, 604]) {
  pageDocs[n] = readJSON(`data/mushaf/${n}.json`);
}

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en', ...(settingsOverride || {}) },
    activeParams: {},
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: { 1: surah1, 2: surah2 } },
    mushaf: { meta: mushafMeta, pages: pageDocs },
    mushafBookmark: { page: 1 },
    ayahBookmarks: [],
    quranWords: { 1: words1, 2: words2 },
    hifzRecords: {},
    mushafPagesRead: {},
    khatmaPlan: null,
    khatmaHistory: [],
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    mushafFullscreen: false,
    readerImmersive: false,
    recitingAyahKey: null,
    player: null,
    ...rest,
  };
}

// Every spread test sets the layout flag explicitly; always land back on
// the narrow default so later tests in this file stay single-page.
function withWideLayout(fn) {
  setMushafWideLayout(true);
  try {
    fn();
  } finally {
    setMushafWideLayout(false);
  }
}

/* ------------------------------------------------------------------ */
/* Spread page math (services/mushaf.js)                               */
/* ------------------------------------------------------------------ */

describe('double-page spread math', () => {
  test('spreadRightPage: odd pages stand, even pages align down to their facing odd', () => {
    assert.equal(spreadRightPage(1), 1);
    assert.equal(spreadRightPage(2), 1); // page 2 faces page 1 on the left
    assert.equal(spreadRightPage(3), 3);
    assert.equal(spreadRightPage(200), 199);
    assert.equal(spreadRightPage(604), 603);
    assert.equal(spreadRightPage(999), 603); // clamped, then aligned
    assert.equal(spreadRightPage('7'), 7); // string input tolerated
  });

  test('spreadLeftPage: right + 1; the book ends exactly on a full spread', () => {
    assert.equal(spreadLeftPage(1), 2);
    assert.equal(spreadLeftPage(3), 4);
    assert.equal(spreadLeftPage(603), 604);
    assert.equal(spreadLeftPage(604), 604); // normalized: right 603 -> left 604
    // 604 pages = 302 complete spreads: no truncated final leaf.
    assert.notEqual(spreadLeftPage(603), null);
  });

  test('nextSpreadPage / prevSpreadPage: two-page turns, honest nulls at the covers', () => {
    assert.equal(nextSpreadPage(1), 3);
    assert.equal(nextSpreadPage(199), 201);
    assert.equal(nextSpreadPage(603), null); // last spread: 603|604
    assert.equal(prevSpreadPage(3), 1);
    assert.equal(prevSpreadPage(1), null);
    assert.equal(prevSpreadPage(199), 197);
    // An even "anchor" normalizes through its right page first.
    assert.equal(nextSpreadPage(200), 201);
    assert.equal(prevSpreadPage(200), 197);
  });

  test('mushafSpreadActive needs BOTH the pref and the wide layout flag', () => {
    setMushafWideLayout(false);
    assert.equal(mushafSpreadActive({ spread: true }), false); // phone: never half-pages
    setMushafWideLayout(true);
    assert.equal(mushafSpreadActive({ spread: true }), true);
    assert.equal(mushafSpreadActive({ spread: false }), false);
    assert.equal(mushafSpreadActive({}), false);
    setMushafWideLayout(false);
  });
});

/* ------------------------------------------------------------------ */
/* Juz eighths (the "juz 18 · 3/8" margin rhythm)                      */
/* ------------------------------------------------------------------ */

describe('juzEighth', () => {
  const jfp = mushafMeta.juzFirstPage;

  test('a juz opens at 1/8 and its final page reaches 8/8', () => {
    for (const j of Object.keys(jfp)) {
      const start = jfp[j];
      const end = (jfp[String(Number(j) + 1)] ?? 605) - 1;
      assert.equal(juzEighth(jfp, start, j), 1, `juz ${j} first page`);
      assert.equal(juzEighth(jfp, end, j), 8, `juz ${j} final page`);
    }
  });

  test('monotonic, in-range, and stable across every page of juz 18', () => {
    const j = 18;
    const start = jfp[String(j)];
    const end = jfp[String(j + 1)] - 1;
    let last = 0;
    for (let p = start; p <= end; p++) {
      const e = juzEighth(jfp, p, j);
      assert.ok(e >= 1 && e <= 8, `page ${p}: ${e} in 1..8`);
      assert.ok(e >= last, `page ${p}: non-decreasing`);
      last = e;
    }
    assert.equal(last, 8);
  });

  test('degenerate inputs fall back to 1/8 instead of NaN', () => {
    assert.equal(juzEighth(null, 100, 10), 1);
    assert.equal(juzEighth({}, 100, 10), 1);
    assert.equal(juzEighth(jfp, 100, 'nope'), 1);
    assert.equal(juzEighth(jfp, 100, 10), 1);
  });
});

/* ------------------------------------------------------------------ */
/* The spread-aware renderer                                           */
/* ------------------------------------------------------------------ */

describe('renderMushaf (v4.5)', () => {
  test('single-page: no spread markup, juz label carries the x/8 fraction', () => {
    setMushafWideLayout(false);
    const html = renderMushaf(baseState({ activeParams: { page: 1 } }));
    assert.ok(!html.includes('mushaf-book--spread'));
    assert.equal((html.match(/<article class="mushaf-page /g) || []).length, 1);
    // (v4.5.2) EN chrome renders Western digits: "Juz 1 · 1/8"; the
    // Eastern form is the AR mode (see v4.5-flow numeral tests).
    assert.ok(html.includes('Juz 1 · 1/8'), 'juz label shows the eighth');
    assert.ok(!html.includes('mushaf-fs-tap'), 'tap zones are fullscreen-only');
  });

  test('spread: two facing pages, right page first, book marked as a spread', () => {
    withWideLayout(() => {
      const html = renderMushaf(baseState({ activeParams: { page: 2 } }));
      assert.ok(html.includes('mushaf-book--spread'));
      const articles = html.match(/<article class="mushaf-page [^"]*"/g) || [];
      assert.equal(articles.length, 2, 'both facing pages render');
      // FIRST article in the RTL book = the RIGHT page (1); its footer number ١
      // must appear before the left page's ٢.
      const rightFoot = html.indexOf('<span class="mushaf-page__number">١</span>');
      const leftFoot = html.indexOf('<span class="mushaf-page__number">٢</span>');
      assert.ok(rightFoot > -1 && leftFoot > -1);
      assert.ok(rightFoot < leftFoot, 'right page renders first');
    });
  });

  test('spread with a still-loading facing page renders a pending sheet, not a hole', () => {
    withWideLayout(() => {
      const pages = { 1: pageDocs[1] }; // page 2 not loaded yet
      const html = renderMushaf(
        baseState({ activeParams: { page: 1 }, mushaf: { meta: mushafMeta, pages } })
      );
      assert.ok(html.includes('mushaf-page--pending'));
      // The pending sheet still carries its REAL page number (the sheet is
      // the page, only its text is still arriving) — never a fake number.
      assert.ok(html.includes('<span class="mushaf-page__number">٢</span>'));
    });
  });

  test('spread nav disables at the covers on PAIR granularity', () => {
    withWideLayout(() => {
      const first = renderMushaf(baseState({ activeParams: { page: 1 } }));
      assert.ok(first.includes('data-action="mushaf-prev" disabled'));
      assert.ok(!first.includes('data-action="mushaf-next" disabled'));
      const last = renderMushaf(baseState({ activeParams: { page: 604 } }));
      assert.ok(last.includes('data-action="mushaf-next" disabled'));
      assert.ok(!last.includes('data-action="mushaf-prev" disabled'));
    });
  });

  test('fullscreen: tap zones render, and the counter reads the spread range', () => {
    withWideLayout(() => {
      const fs = renderMushaf(baseState({ activeParams: { page: 1 }, mushafFullscreen: true }));
      assert.ok(fs.includes('mushaf-fs-tap--prev'));
      assert.ok(fs.includes('mushaf-fs-tap--next'));
      assert.ok(fs.includes('1–2 / 604'), 'spread range in the page counter (EN digits)');
    });
    setMushafWideLayout(false);
    const single = renderMushaf(baseState({ activeParams: { page: 1 }, mushafFullscreen: true }));
    // narrow layout single page counter: 1 / 604 (EN chrome, v4.5.2)
    assert.ok(single.includes('1 / 604'));
    assert.ok(single.includes('mushaf-fs-tap--prev'), 'tap zones work single-page too');
  });

  test('the surah banner carries its ayah count from quran-meta', () => {
    setMushafWideLayout(false);
    const en = renderMushaf(baseState({ activeParams: { page: 1 } }));
    assert.ok(en.includes('mushaf-surah-banner__meta'), 'count line present');
    assert.ok(en.includes('7 ayahs'), 'surah 1 = 7 ayahs');
    const ar = renderMushaf(baseState({ activeParams: { page: 1 }, settings: { language: 'ar' } }));
    assert.ok(ar.includes('٧ آيات'), 'Arabic count with Eastern numerals');
  });

  test('no leaked undefined/NaN anywhere in either layout', () => {
    setMushafWideLayout(false);
    const single = renderMushaf(baseState({ activeParams: { page: 199 } }));
    withWideLayout(() => {
      const spread = renderMushaf(baseState({ activeParams: { page: 199 } }));
      for (const [html, label] of [
        [single, 'single'],
        [spread, 'spread'],
      ]) {
        assert.doesNotMatch(html, /\bundefined\b/, `${label}: leaked undefined`);
        assert.doesNotMatch(html, /\bNaN\b/, `${label}: leaked NaN`);
      }
    });
  });
});

/* ------------------------------------------------------------------ */
/* Jump drawer + sheet + settings: counts and the spread toggle        */
/* ------------------------------------------------------------------ */

describe('mushaf sheet / settings / jump (v4.5)', () => {
  test('action sheet and settings panel both expose the spread toggle', () => {
    const sheet = buildMushafSheet(baseState());
    assert.ok(sheet.includes('data-key="spread"'));
    const panel = buildMushafSettingsPanel(baseState());
    assert.ok(panel.includes('data-key="spread"'));
    assert.ok(panel.includes('min="0.6" max="2.2"'), 'text-size slider matches the zoom range');
  });

  test('jump drawer rows carry the ayah count', () => {
    const html = buildMushafJump(baseState());
    assert.ok(html.includes('mushaf-jump__surah-count'));
    assert.ok(html.includes('7 ayahs'));
  });
});

/* ------------------------------------------------------------------ */
/* Ayah-detail feature parity                                          */
/* ------------------------------------------------------------------ */

describe('buildMushafAyahDetail parity rows (v4.5)', () => {
  test('share + open-in-study + the hifz mark row all render', () => {
    const html = buildMushafAyahDetail('بِسْمِ اللَّهِ', surah1, 1, 1, baseState(), 1);
    assert.ok(html.includes('data-action="ayah-share"'), 'share');
    assert.ok(html.includes('data-action="mushaf-open-in-study"'), 'open in study');
    assert.ok(html.includes('data-action="hifz-mark"'), 'mark memorized (no record yet)');
  });

  test('with a hifz record the row becomes the two recall-grade chips', () => {
    const state = baseState({ hifzRecords: { 1: { due: '2026-01-01', level: 'word' } } });
    const html = buildMushafAyahDetail('بِسْمِ اللَّهِ', surah1, 1, 1, state, 1);
    assert.ok(html.includes('data-action="hifz-review"'));
    assert.ok(html.includes('data-grade="easy"'));
    assert.ok(html.includes('data-grade="again"'));
    assert.ok(!html.includes('data-action="hifz-mark"'));
  });
});

/* ------------------------------------------------------------------ */
/* Reader immersive slice + markup                                     */
/* ------------------------------------------------------------------ */

describe('readerImmersive slice (v4.5)', () => {
  test('set toggles, dedupes; NAVIGATE resets it only when leaving the reader', () => {
    const s0 = initialState();
    assert.equal(s0.readerImmersive, false);
    const s1 = reduce(s0, { type: 'READER_IMMERSIVE_SET', on: true });
    assert.equal(s1.readerImmersive, true);
    assert.equal(reduce(s1, { type: 'READER_IMMERSIVE_SET', on: true }), s1, 'no-op dedupe');
    // Staying in the reader keeps the session.
    const stay = reduce(s1, { type: 'NAVIGATE', view: 'quran', params: { id: '2' } });
    assert.equal(stay.readerImmersive, true);
    // Leaving restores the shell — same contract as mushafFullscreen.
    const leave = reduce(s1, { type: 'NAVIGATE', view: 'home', params: {} });
    assert.equal(leave.readerImmersive, false);
    // And it is never persisted (PERSISTED_KEYS is the allowlist).
    assert.ok(
      !readPersistedKeys().includes('readerImmersive'),
      'readerImmersive is absent from PERSISTED_KEYS'
    );
    assert.ok(
      !readPersistedKeys().includes('mushafFullscreen'),
      'mushafFullscreen stays absent too (v4.4 contract holds)'
    );
  });

  function readPersistedKeys() {
    // import-sync would tangle with the module graph; read the source's
    // own export instead (the contracts gate already pins its behavior).
    const src = readFileSync(path.join(ROOT, 'js/core/state/initial.js'), 'utf8');
    const m = src.match(/export const PERSISTED_KEYS = \[([^\]]*)\]/s);
    assert.ok(m, 'PERSISTED_KEYS array found');
    return (m[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  }

  test('readerImmersive is false after a plain state round-trip', () => {
    const s = reduce(initialState(), { type: 'READER_IMMERSIVE_SET', on: false });
    assert.equal(s.readerImmersive, false);
  });
});

describe('renderQuran immersive markup (v4.5)', () => {
  test('surah view shows the immersive entry; the exit pill appears only when active', () => {
    const base = {
      activeView: 'quran',
      activeParams: { id: 1 },
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      quran: { meta: quranMeta, surahs: { 1: surah1 } },
      quranWords: { 1: words1 },
      mushaf: { meta: null, pages: {} },
      mushafPrefsForView: null,
      hifzSession: { mode: false, surah: null, level: 'word', revealed: {} },
      hifzRecords: {},
      loadErrors: {},
      ayahBookmarks: [],
      readerImmersive: false,
      surahPlayback: { active: false },
      recitingAyahKey: null,
      activeParamsForWindow: null,
    };
    const quiet = renderQuran({
      ...base,
      settings: { ...base.settings, mushafPrefs: DEFAULT_SETTINGS.mushafPrefs },
    });
    assert.ok(quiet.includes('data-action="quran-toggle-immersive"'), 'enter button');
    assert.ok(!quiet.includes('reader-immersive-exit'), 'no exit pill when windowed');
    const active = renderQuran({
      ...base,
      readerImmersive: true,
      settings: { ...base.settings, mushafPrefs: DEFAULT_SETTINGS.mushafPrefs },
    });
    assert.ok(active.includes('reader-immersive-exit'), 'exit pill when immersive');
  });
});
