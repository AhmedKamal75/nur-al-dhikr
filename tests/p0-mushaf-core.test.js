/**
 * tests/p0-mushaf-core.test.js — P0-1 … P0-4 gates (v5.3.0).
 * Every acceptance criterion below is checkable from pure templates, the
 * domain classifier, or the shipped CSS — no browser required:
 *   P0-1  word popup: 4 labeled blocks, honest per-block empty states,
 *         i'rab line derived only from structured fields, EN+AR;
 *   P0-2a orthography: per-typeface line-rhythm floors + ligature fixes
 *         present in the shipped CSS for all four MUSHAF_FONTS ids;
 *   P0-2b sajdah line accent: rendered ONLY on As-Sajdah 15's word,
 *         text bytes unchanged, distinct token colors for sajdah vs hizb;
 *   P0-2c waqf marks classified + styled + legend in the settings panel;
 *   P0-3  auto-fit: pure binary search (bounds, monotonic honesty) and
 *         the CSS consumes the fit var; fullscreen is unscrollable;
 *   P0-4  banner scales sublinearly (capped) and the Bismillah is 1.2×
 *         body at the default scale — pinned by CSS assertions.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { renderAyahWords, buildMushafSettingsPanel } from '../js/views/tafsirPanel.js';
import { renderMushaf, mushafRoutePage, buildMushafSheet } from '../js/views/mushafReader.js';
import { buildMushafJump } from '../js/views/mushafJump.js';
import { buildWordStudyPanel } from '../js/views/tafsirPanel.js';
import { TAJWEED_RULES } from '../js/domain/tajweed.js';
import { ornamentTokenKind, sameSurfaceWord } from '../js/domain/tajweed.js';
import { wordIrabLine } from '../js/domain/wordStudy.js';
import { computeFitScale, FIT_MIN, FIT_MAX, takeoverManualZoom } from '../js/app/autoFit.js';
import { actions, store } from '../js/core/state.js';
import { MUSHAF_FONTS, MUSHAF_PAPERS, DEFAULT_SETTINGS } from '../js/core/config.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const readJSON = (rel) => JSON.parse(read(rel));

const quranCss = read('assets/css/quran.css');
const layoutCss = read('assets/css/layout.css');

/* -------------------------------- P0-1 -------------------------------- */
describe("P0-1: word study popup — 4 blocks, honest empties, i'rab line", () => {
  const words1 = readJSON('data/quran-words/1.json');
  const surah1 = readJSON('data/quran/1.json');
  const roots = readJSON('data/quran-roots.json');
  const dict = readJSON('data/quran-dict.json');
  const rootsMeaning = readJSON('data/quran-roots-meaning.json');

  const baseState = (overrides = {}) => ({
    settings: { ...DEFAULT_SETTINGS, language: 'en', ...(overrides.settings || {}) },
    activeWordStudy: overrides.activeWordStudy || { surah: '1', ayah: '4', i: 2 },
    quranWords: overrides.quranWords ?? { 1: words1 },
    quran: { surahs: { 1: surah1 } },
    quranRoots: roots,
    wordDict: overrides.wordDict ?? { index: dict.entries, failed: false },
    rootsMeaning: overrides.rootsMeaning ?? { index: rootsMeaning.entries, failed: false },
    wordBookmarks: {},
    mushafSession: {},
  });

  test("i'rab line derives only from structured fields (EN + AR)", () => {
    const word = words1['4'][1]; // يَوْمِ
    const en = wordIrabLine(word, 'en');
    const ar = wordIrabLine(word, 'ar');
    assert.match(en, /Noun/, 'EN pos present');
    assert.match(en, /Genitive/i, 'EN case present');
    // NOTE (v5.4.0 unification): the seed bundle re-authored this record
    // with definite:true; the full corpus record carries definite:false +
    // indef:false AND a masculine pgn tag — the line honestly renders what
    // the record holds (pos + case + pgn), inventing neither definiteness.
    assert.match(en, /Masculine/, 'EN pgn present');
    assert.match(ar, /اسم/, 'AR pos present');
    assert.match(ar, /مجرور/, 'AR case present');
    assert.ok(!en.includes('undefined') && !ar.includes('undefined'));
    // (v5.5.0) the subtype refines the coarse pos — a Proper noun, an
    // Active participle and an adjective are never "just a noun".
    assert.match(wordIrabLine(words1['1'][1], 'en'), /Proper noun/, 'subtype wins over Noun');
    assert.match(wordIrabLine(words1['1'][1], 'ar'), /علم/, 'AR subtype');
    assert.match(
      wordIrabLine(words1['4'][0], 'en'),
      /Active participle/,
      'participle subtype surfaces'
    );
    assert.match(wordIrabLine(words1['1'][2], 'en'), /adjective/, 'adj flag surfaces');
    // A record with NO grammar fields → empty line (the honest state).
    assert.equal(wordIrabLine({ i: 1, text: 'ـ' }, 'en'), '');
    assert.equal(wordIrabLine(null, 'en'), '');
  });

  test("full-data word: definition + syn/ant + root + i'rab blocks all render", () => {
    const html = buildWordStudyPanel(baseState());
    assert.match(html, /word-study__block-label/, 'labeled blocks render');
    assert.match(html, /word-study__meanings/, 'definition block carries the dict tier');
    assert.match(html, /word-study__synrow/, 'syn/ant chips render');
    assert.match(html, /word-study__irab-line/, "i'rab line renders");
    assert.match(html, /roots-open/, 'root block deep-links into #/roots');
    // (v5.6.0) the root block carries the root's core conceptual meaning.
    assert.match(html, /word-study__root-meaning/, 'root meaning renders');
    assert.match(html, /اليوم والزمن/, 'AR root sense renders');
    // Exactly the four labeled study blocks (definition + syn/ant + root + i'rab).
    const labels = html.match(/word-study__block-label/g) || [];
    assert.equal(labels.length, 4, `expected 4 labeled blocks, got ${labels.length}`);
  });

  test('data-less word: every block shows its honest empty state, never content-free shells', () => {
    // Word record with no lemma/dict/root/grammar — surface only.
    const bareWords = {
      4: [
        { i: 1, text: 'مَالِكِ' },
        { i: 2, text: 'كِتَابٍ' },
      ],
    };
    const html = buildWordStudyPanel(
      baseState({
        quranWords: { 4: bareWords },
        activeWordStudy: { surah: '4', ayah: '4', i: 2 },
        wordDict: { index: null, failed: true },
      })
    );
    assert.match(html, /word-study__block--empty/, 'empty blocks are visually explicit');
    const empties = (html.match(/word-study__block--empty/g) || []).length;
    assert.equal(empties, 4, 'all four blocks show honest empty states');
    assert.doesNotMatch(html, /word-study__meanings/, 'no hollow meanings section');
    assert.match(html, /data-action="word-bookmark"/, 'actions survive without tiers');
  });
});

/* -------------------------------- P0-2 -------------------------------- */
describe('P0-2: orthography, sajdah accent, waqf system', () => {
  test('P0-2a: every shipped typeface has its own line-rhythm floor', () => {
    for (const f of MUSHAF_FONTS) {
      assert.match(
        quranCss,
        new RegExp(`\\.mushaf-page-wrap\\[data-mushaf-font='${f.id}'\\] \\.mushaf-page__text`),
        `typeface ${f.id} has a per-face line-height floor`
      );
    }
    assert.match(quranCss, /font-feature-settings:\s*'calt' 1,\s*'liga' 1/, 'ligature fix present');
  });

  test('P0-2b: the sajdah line accent renders on 32:15 only, bytes unchanged', () => {
    const meta = readJSON('data/quran-meta.json');
    const sajdah32 = meta.surahs.find((s) => s.number === 32);
    // (v5.17.21) This used to read data/mushaf-annotations.json — a file
    // NOTHING in the app ever loaded. The test asserted on documentation, so
    // it would have stayed green if the sajdah accent had been deleted from
    // the reader, and green if the double-underline list had drifted. It is
    // now deleted, and these assertions read the LIVE sources instead: the
    // accent constant the renderer actually uses, and the rule ids the
    // underline implementation actually consults.
    const readerSrc = read('js/views/mushafReader.js');
    assert.match(readerSrc, /const SAJDA_ACCENT_SURAH = 32;/, 'the renderer accents 32');
    assert.match(readerSrc, /const SAJDA_ACCENT_AYAH = 15;/, 'the renderer accents verse 15');
    // Both written forms must be covered, because the Uthmani surface differs
    // from the imla'i one and the accent has to survive either.
    assert.match(readerSrc, /'سُجَّدًا'/, 'accent covers the Uthmani surface');
    assert.match(readerSrc, /'سَجَدُوا'/, "accent covers the imla'i surface");
    // The double-underline default and its rule list are real settings, so
    // assert the real settings rather than a copy of them.
    assert.equal(DEFAULT_SETTINGS.mushafPrefs.tajweedUnderlines, true, 'underlines default on');
    const maddRuleIds = TAJWEED_RULES.map((r) => r.id).filter((id) => id.startsWith('madd_'));
    assert.ok(maddRuleIds.length >= 6, 'the madd rules are the double-underlined set');
    const page = readJSON('data/mushaf-meta.json').ayahPages['32:15'];
    assert.equal(page, 416, 'the corpus still puts 32:15 on mushaf page 416');
    const doc = readJSON(`data/mushaf/${page}.json`);
    const verses = doc.chapters.flatMap((c) =>
      c.verses.map((v) => ({ s: c.number, a: v.number, t: v.text }))
    );
    const accent = verses.find((v) => v.s === 32 && v.a === 15);
    const withAccent = renderAyahWords(accent.t, null, 32, 15, { accentWord: 'سُجَّدًا' });
    assert.match(withAccent, /mushaf-ayah__sajda-word/, '32:15 carries the accent span');
    // A non-sajdah ayah and a different sajdah ayah never get it.
    const plain = verses.find((v) => v.s === 32 && v.a === 14);
    assert.doesNotMatch(
      renderAyahWords(plain.t, null, 32, 14, { accentWord: 'سُجَّدًا' }),
      /mushaf-ayah__sajda-word/
    );
    const sajdah15 = verses.find((v) => v.s === 32 && v.a === 15);
    // Text fidelity: stripping tags restores the exact corpus tokens.
    const plainOf = (html) =>
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const tokens = (t) => t.trim().split(/\s+/).join(' ');
    assert.equal(plainOf(withAccent), tokens(sajdah15.t), 'tag-stripped text is byte-identical');
  });

  test('P0-2c: waqf marks classify into distinct sajdah/hizb/waqf families', () => {
    assert.equal(ornamentTokenKind('۩'), 'sajdah');
    assert.equal(ornamentTokenKind('۞'), 'hizb');
    assert.equal(ornamentTokenKind('\u06DA'), 'waqf'); // small high jeem stop
    assert.equal(ornamentTokenKind('\u06D8'), 'waqf'); // صلى ligature
    assert.equal(ornamentTokenKind('٥'), 'digits');
    assert.equal(ornamentTokenKind('كِتَاب'), null);
    assert.equal(ornamentTokenKind(''), null);
    // Letter-written stop names are WORDS to this classifier (they sit in
    // prose in some sources) — the ligature forms are the mark tokens.
    assert.equal(ornamentTokenKind('صلى'), null);
    // The two DIVIDER families never share a styling hook.
    assert.match(quranCss, /\.mushaf-mark--sajdah/);
    assert.match(quranCss, /\.mushaf-mark--hizb/);
    assert.match(quranCss, /--mushaf-sajda-color/);
    assert.match(quranCss, /--mushaf-hizb-color/);
    assert.notEqual(
      (quranCss.match(/\.mushaf-mark--sajdah \{/) || []).length,
      0,
      'sajdah hook exists'
    );
    assert.match(
      quranCss,
      /forced-colors: active[\s\S]*mushaf-mark--hizb/,
      'forced-colors fallback'
    );
    // Same surface matching tolerates ornament gluing (۩ on the last word).
    assert.equal(
      sameSurfaceWord('يَسْتَكْبِرُونَ ۩', 'يَسْتَكْبِرُونَ'),
      false,
      'glued mark is its own token'
    );
  });

  test('P0-2c: the marks legend ships in the mushaf settings panel (EN + AR)', () => {
    const state = {
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'en',
        mushafPrefs: { font: 'amiriQuran', paper: 'ivory' },
      },
    };
    const en = buildMushafSettingsPanel(state);
    assert.match(en, /mushaf-settings__marks/, 'legend renders');
    assert.match(
      en,
      /mushaf-mark--sajdah[\s\S]*mushaf-mark--hizb[\s\S]*mushaf-mark--waqf/,
      'all three families'
    );
    const ar = buildMushafSettingsPanel({
      ...state,
      settings: { ...state.settings, language: 'ar' },
    });
    assert.match(ar, /علامات الصفحة/, 'legend in Arabic');
    assert.match(ar, /موضع السجدة/, 'sajdah legend row in Arabic');
  });
});

/* -------------------------------- P0-3 -------------------------------- */
describe('P0-3: fullscreen auto-fit engine', () => {
  test('computeFitScale: monotonic bisection within [0.6, 2.2]', () => {
    const heightAt = (s) => 400 * s + 200; // strictly monotonic
    // Huge box → even the max scale fits (fit-side answer is the max).
    assert.ok(computeFitScale(100000, heightAt) > FIT_MAX - 0.02);
    // Tiny box → the floor is the honest answer, never a fake fit.
    assert.equal(computeFitScale(100, heightAt), FIT_MIN);
    // A box the content fits at exactly scale 1.5 → 400*1.5+200 = 800.
    const fit = computeFitScale(800, heightAt);
    assert.ok(Math.abs(fit - 1.5) < 0.02, `fit ≈ 1.5, got ${fit}`);
  });

  test('computeFitScale: hostile inputs degrade to the floor, never NaN', () => {
    assert.equal(
      computeFitScale(0, () => 10),
      FIT_MIN
    );
    assert.equal(computeFitScale(100, null), FIT_MIN);
    assert.equal(
      computeFitScale(-5, () => NaN),
      FIT_MIN
    );
  });

  test('the stylesheet consumes the fit var and forbids vertical scroll in fullscreen', () => {
    assert.match(
      quranCss,
      /var\(--mushaf-fit-scale,\s*var\(--mushaf-font-scale,\s*1\)\)/,
      'fit var wins over the user scale; windowed mode unaffected'
    );
    assert.match(
      layoutCss,
      /body\.is-mushaf-fullscreen \.mushaf-page-wrap \{[\s\S]*?touch-action: pan-x/,
      'horizontal-only touch'
    );
    assert.match(
      layoutCss,
      /body\.is-mushaf-fullscreen \.mushaf-page-wrap \{[\s\S]*?overflow: hidden/,
      'no scroll'
    );
  });

  test('(v5.9.0) manual zoom: takeover flips autoFit off in fullscreen only', () => {
    store.dispatch(actions.updateMushafPrefs({ autoFit: true }));
    store.dispatch(actions.setMushafFullscreen(false));
    takeoverManualZoom();
    assert.equal(
      store.getState().settings.mushafPrefs.autoFit,
      true,
      'windowed gestures never touch the fit mode'
    );
    store.dispatch(actions.setMushafFullscreen(true));
    try {
      takeoverManualZoom();
      assert.equal(
        store.getState().settings.mushafPrefs.autoFit,
        false,
        'first fullscreen zoom takes manual control'
      );
      // Second gesture is a silent no-op (guarded transition, no spam).
      takeoverManualZoom();
      assert.equal(store.getState().settings.mushafPrefs.autoFit, false);
    } finally {
      store.dispatch(actions.setMushafFullscreen(false));
      store.dispatch(actions.updateMushafPrefs({ autoFit: true }));
    }
  });

  test('(v5.9.0) settings carry the auto-fit toggle; manual CSS scrolls the column', () => {
    const state = {
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'en',
        mushafPrefs: { font: 'amiriQuran', paper: 'ivory', autoFit: true },
      },
    };
    const html = buildMushafSettingsPanel(state);
    assert.match(html, /data-action="toggle-mushaf-pref" data-key="autoFit"/, 'toggle wired');
    assert.match(html, /checked/, 'on by default');
    assert.match(
      layoutCss,
      /body\.is-mushaf-fullscreen\.is-mushaf-manual \.mushaf-page__text \{[\s\S]*?overflow-y: auto/,
      'manual column scrolls internally'
    );
    assert.match(
      layoutCss,
      /body\.is-mushaf-fullscreen\.is-mushaf-manual \.mushaf-page-wrap \{[\s\S]*?touch-action: pan-x pan-y/,
      'manual pans both axes'
    );
  });
});

/* -------------------------------- P0-4 -------------------------------- */
describe('P0-4: surah header & Bismillah proportional rhythm', () => {
  test('banner scales sublinearly and is capped (rectangle band, own type size)', () => {
    // (v5.5.0) the band decouples from the page font with its own capped
    // size; the name rides the band at 1em with a slim 2px rectangle
    // cartouche — never page-text inheritance, never a tall square.
    const band = /\.mushaf-surah-banner \{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(band, /min\(var\(--mushaf-font-scale, 1\), 1\.25\)/, 'band capped at 1.25');
    const name = /\.mushaf-surah-banner__name \{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(name, /font-size:\s*1em/, 'name rides the band, not the page');
    assert.doesNotMatch(name, /min\(var\(--mushaf-font-scale/, 'no direct page coupling');
    const frame = /\.mushaf-surah-banner__frame \{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(frame, /border-radius:\s*2px/, 'rectangle cartouche');
  });

  test('Bismillah matches the page text (live words, same size and rhythm)', () => {
    const block = /^\.mushaf-bismillah \{[\s\S]*?\}/m.exec(quranCss)?.[0] || '';
    assert.match(
      block,
      /font-size:\s*calc\(1\.65rem \* var\(--mushaf-fit-scale,\s*var\(--mushaf-font-scale,\s*1\)\)\)/,
      'same size as the page text'
    );
    assert.match(block, /line-height:\s*calc\(2\.15 \* var\(--mushaf-line-scale/, 'same rhythm');
  });

  test('windowed render still reflects every paper theme with the new vars', () => {
    const meta = readJSON('data/mushaf-meta.json');
    const page = readJSON('data/mushaf/1.json');
    const surah1 = readJSON('data/quran/1.json');
    const state = {
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'en',
        mushafPrefs: { font: 'amiriQuran', paper: 'ivory' },
      },
      activeParams: { page: 1 },
      mushaf: { meta, pages: { 1: page } },
      mushafBookmark: { page: 1 },
      quran: { meta, surahs: { 1: surah1 } },
      quranWords: {},
      ayahBookmarks: [],
      surahPlayback: { active: false },
      activeView: 'mushaf',
    };
    const html = renderMushaf(state);
    for (const paper of MUSHAF_PAPERS.slice(0, 4)) {
      const h = renderMushaf({
        ...state,
        settings: {
          ...state.settings,
          mushafPrefs: { ...state.settings.mushafPrefs, paper: paper.id },
        },
      });
      assert.match(h, new RegExp(`data-mushaf-paper="${paper.id}"`), `paper ${paper.id} renders`);
    }
    assert.match(html, /data-mushaf-font="amiriQuran"/, 'typeface hook present for P0-2a');
  });
});

/* ------------------------- mushaf route: `?s=&ay=` ------------------------- */
/**
 * (v5.17.21, FIXED) `#/mushaf?s=2&ay=255` opened Al-Fatihah 1.
 *
 * The deep link shipped reading `s`/`ay` for the highlight and then still
 * deriving the page from the URL alone, so the book rendered page 1 and the
 * marker matched nothing — a silent wrong answer about scripture position,
 * which in a mushaf is the worst class of bug there is. The v5.17.21 test
 * could not catch it: it only ever passed `{ page: 1 }`, the one shape where
 * the broken and the fixed reader agree. Every case below drives a REAL
 * page out of the REAL corpus and asserts against mushaf-meta.json's
 * ayahPages, so the test fails if the wiring goes missing, and not only if a
 * number in the data ever changes.
 */
describe('mushaf deep link: `?s=2&ay=255` opens THAT ayah (v5.17.21 fix)', () => {
  const meta = readJSON('data/mushaf-meta.json');
  const pageDoc = (n) => readJSON(`data/mushaf/${n}.json`);
  // Pages read out of the corpus, never typed in: a data change moves the
  // expectation with it, and a missing wiring does not.
  const KURSI_PAGE = meta.ayahPages['2:255'];
  const FATIHAH_PAGE = meta.ayahPages['1:1'];
  const LAST_PAGE = meta.ayahPages['114:6'];
  // The state's bookmark page doubles as the documented fallback: it is where
  // a route that names nothing lands, so it must stay where it was.
  const BOOKMARK = 7;
  // Pages read out of the corpus, never typed in: a data change moves the
  // expectation with it, and a missing wiring does not. BOOKMARK+1 is the
  // page the OLD code would have turned to (it read the page off a URL that
  // carries none and used the bookmark) — it is resident so that a
  // regression fails on the destination assertion instead of on a fetch.
  const pages = [
    1,
    2,
    BOOKMARK,
    BOOKMARK + 1,
    FATIHAH_PAGE,
    KURSI_PAGE,
    KURSI_PAGE - 1,
    KURSI_PAGE + 1,
    LAST_PAGE,
  ];

  const state = (activeParams, over = {}) => ({
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeParams,
    mushaf: { meta, pages: Object.fromEntries(pages.map((n) => [n, pageDoc(n)])) },
    mushafBookmark: { page: BOOKMARK },
    quran: { meta: null, surahs: {} },
    quranWords: {},
    ayahBookmarks: [],
    surahPlayback: { active: false },
    activeView: 'mushaf',
    ...over,
  });

  /** The page numbers actually printed in the page medallions. */
  const renderedPages = (html) =>
    [...html.matchAll(/mushaf-page__number">([^<]+)</g)].map((m) =>
      [...m[1]].reduce((n, c) => n * 10 + '٠١٢٣٤٥٦٧٨٩'.indexOf(c), 0)
    );
  /** Every ayah the route marked, as "surah:ayah" — nothing else counts. */
  const targets = (html) =>
    [
      ...html.matchAll(
        /<span class="mushaf-ayah[^"]*mushaf-ayah--target" data-action="mushaf-ayah-tap" data-surah="(\d+)" data-ayah="(\d+)"/g
      ),
    ].map((m) => `${m[1]}:${m[2]}`);
  /** Rendered text with the word spans removed, the P0-2b technique. */
  const plainOf = (html) =>
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const verseText = (surah, ayah) =>
    pageDoc(meta.ayahPages[`${surah}:${ayah}`])
      .chapters.flatMap((c) => c.verses)
      .find((v) => v.number === ayah).text;

  test('the ayah a link names is the page that renders — and only that ayah is marked', () => {
    // Sanity on the fixture itself: the whole test is worthless if the map
    // and the page files ever disagree about where 2:255 lives.
    assert.equal(KURSI_PAGE, 42, 'the corpus puts 2:255 on page 42');
    assert.notEqual(KURSI_PAGE, FATIHAH_PAGE, '2:255 and 1:1 are on different pages');
    // Strings, because parseHash() hands the view strings — and numbers,
    // because a dataset-driven call site can carry them.
    for (const params of [
      { s: '2', ay: '255' },
      { s: 2, ay: 255 },
    ]) {
      const html = renderMushaf(state(params));
      assert.deepEqual(
        renderedPages(html),
        [KURSI_PAGE],
        `opens ${KURSI_PAGE} for ${JSON.stringify(params)}`
      );
      assert.deepEqual(targets(html), ['2:255'], 'exactly one target, the one asked for');
      // And the page on screen really carries it (not just the right footer).
      assert.ok(
        plainOf(html).includes(verseText(2, 255)),
        'the 2:255 text itself is on the rendered page'
      );
    }
  });

  test('a bare `?page=42` is unchanged: that page, and nothing marked', () => {
    const html = renderMushaf(state({ page: String(KURSI_PAGE) }));
    assert.deepEqual(renderedPages(html), [KURSI_PAGE]);
    assert.deepEqual(targets(html), [], 'a page-only route marks nothing');
  });

  test('an explicit `page` wins over the ayah — including when they disagree', () => {
    // Search's mushaf chip passes BOTH; the spread, page-turn, jump and
    // follow-along paths pass page only.
    const agreeing = renderMushaf(state({ page: String(KURSI_PAGE), s: '2', ay: '255' }));
    assert.deepEqual(renderedPages(agreeing), [KURSI_PAGE], 'page wins (and it agrees)');
    assert.deepEqual(targets(agreeing), ['2:255'], 'the ayah is on that page, so it is marked');
    // The non-degenerate twin: 2:255 is NOT on page 1, so a route that names
    // both must show page 1 and mark nothing — never silently re-route.
    const clashing = renderMushaf(state({ page: String(FATIHAH_PAGE), s: '2', ay: '255' }));
    assert.deepEqual(renderedPages(clashing), [FATIHAH_PAGE], 'the page the URL names wins');
    assert.deepEqual(targets(clashing), [], 'an ayah that is not on this page marks nothing');
  });

  test('the LAST page resolves too (2:114:6 sits on 604, the clamp edge)', () => {
    const html = renderMushaf(state({ s: '114', ay: '6' }));
    assert.deepEqual(renderedPages(html), [LAST_PAGE]);
    assert.deepEqual(targets(html), ['114:6']);
  });

  test('an ayah the corpus cannot place degrades to the page behaviour — no crash, no target', () => {
    // Every one of these used to be a route the reader could not answer.
    // The contract is the same for all of them: the bookmark page renders,
    // nothing is marked, nothing throws.
    for (const params of [
      { s: '2', ay: '9999' },
      { s: '2', ay: '0' },
      { s: '0', ay: '1' },
      { s: '-1', ay: '5' },
      { s: '2' },
      { ay: '255' },
      { s: 'x', ay: 'y' },
      { s: '2.5', ay: '3' },
      { s: '', ay: '' },
    ]) {
      const html = renderMushaf(state(params));
      assert.deepEqual(
        renderedPages(html),
        [BOOKMARK],
        `${JSON.stringify(params)} falls back to the bookmark page`
      );
      assert.deepEqual(targets(html), [], `${JSON.stringify(params)} marks nothing`);
    }
  });

  test('missing meta / missing params / missing bookmark never throw', () => {
    // The loader can hand the view a route before mushaf-meta.json has
    // landed; resolvePage() answers null for a missing map rather than
    // inventing a position.
    const noMeta = renderMushaf(
      state({ s: '2', ay: '255' }, { mushaf: { meta: null, pages: {} } })
    );
    assert.match(noMeta, /mushaf-loading/, 'the honest loading state, not a wrong page');
    const bare = state({});
    delete bare.activeParams;
    assert.ok(renderMushaf(bare).length > 0, 'a state with no activeParams renders');
    const noBookmark = state({});
    delete noBookmark.mushafBookmark;
    assert.deepEqual(renderedPages(renderMushaf(noBookmark)), [1], 'page 1, the old default');
  });

  test('the jump drawer and the reader resolve the SAME page (one rule, two surfaces)', () => {
    // A drawer marking "you are here: Al-Fatihah" while the book shows 2:255
    // is a second wrong answer about position, one tap from the first.
    const hereSurahs = (html) =>
      [
        ...html.matchAll(
          /mushaf-jump__surah mushaf-jump__row--here" data-action="mushaf-jump-page"[^>]*>[\s\S]*?mushaf-jump__surah-num">(\d+)</g
        ),
      ].map((m) => Number(m[1]));
    assert.deepEqual(
      hereSurahs(buildMushafJump(state({ s: '2', ay: '255' }))),
      [2],
      'the drawer says Al-Baqarah, the page the reader opened'
    );
    // And page-only routes keep the drawer's own rule (page 1 → Al-Fatihah).
    assert.deepEqual(hereSurahs(buildMushafJump(state({ page: String(FATIHAH_PAGE) }))), [1]);
    // A route that names nothing still lands on the bookmark page, so the
    // drawer keeps saying whatever surah that page carries — derived from the
    // corpus, not typed in.
    const surahAt = (page) =>
      Number(
        Object.entries(meta.surahFirstPage)
          .filter(([, first]) => Number(first) <= page)
          .map(([n]) => n)
          .pop()
      );
    assert.equal(surahAt(BOOKMARK), 2, 'the bookmark page sits inside Al-Baqarah');
    assert.deepEqual(hereSurahs(buildMushafJump(state({}))), [surahAt(BOOKMARK)]);
    // The ⋯ sheet's "memorise this surah" is the third surface that used to
    // ask the URL instead of the route: on a 2:255 arrival it offered
    // Al-Fatihah.
    const sheet = buildMushafSheet(state({ s: '2', ay: '255' }));
    assert.ok(
      sheet.includes('href="#/quran/2?mem=1"'),
      'the sheet offers the surah actually on the page'
    );
  });

  test('mushafRoutePage: the one resolution, precedence and all', () => {
    assert.deepEqual(mushafRoutePage(state({ s: '2', ay: '255' })), {
      page: KURSI_PAGE,
      surah: 2,
      ayah: 255,
    });
    assert.deepEqual(
      mushafRoutePage(state({ page: String(FATIHAH_PAGE), s: '2', ay: '255' })),
      { page: FATIHAH_PAGE, surah: 2, ayah: 255 },
      'page wins; the target is still reported for the marker'
    );
    assert.deepEqual(
      mushafRoutePage(state({ s: '2', ay: '9999' })),
      { page: BOOKMARK, surah: null, ayah: null },
      'an unplaceable ayah names no target at all'
    );
    assert.deepEqual(mushafRoutePage(state({})), { page: BOOKMARK, surah: null, ayah: null });
  });

  test('a page turn clears the target: the URL it writes carries a page and nothing else', async () => {
    // Driven through the REAL handler, not a re-implementation: mushaf-prev /
    // mushaf-next both land here, and `go()` rewrites the whole query string,
    // so `s`/`ay` cannot survive the turn and leave a highlight stuck to an
    // ayah that is no longer on the page.
    const shim = { location: { hash: '' }, scrollTo() {} };
    globalThis.window = shim;
    try {
      const { navigateMushafPage } = await import('../js/app/handlers/quran.js');
      const { setMushafMeta, setMushafPage, setMushafBookmark, navigate } = actions;
      store.dispatch(setMushafMeta(meta));
      for (const n of pages) store.dispatch(setMushafPage(String(n), pageDoc(n)));
      store.dispatch(setMushafBookmark(BOOKMARK));

      // Arrive the way a shared link does: no `page` in the URL at all.
      store.dispatch(navigate('mushaf', { s: '2', ay: '255' }));
      assert.deepEqual(renderedPages(renderMushaf(store.getState())), [KURSI_PAGE], 'on 2:255');

      shim.location.hash = '#/mushaf?s=2&ay=255';
      assert.equal(await navigateMushafPage('next'), true, 'the turn happened');
      // The old code read the current page off the URL, found none, and used
      // the bookmark: "next" from 2:255 used to land on page 8.
      assert.equal(shim.location.hash, `#/mushaf?page=${KURSI_PAGE + 1}`, 'turns forward from 42');
      assert.doesNotMatch(shim.location.hash, /[?&]s=/, 'the target is gone from the URL');
      assert.doesNotMatch(shim.location.hash, /[?&]ay=/, 'the ayah is gone from the URL');

      // Feed that URL back through the router's own query parse and the view
      // must hold nothing: no page 43 doc is loaded, so even the skeleton is
      // the honest state — but with the doc resident the marker is absent.
      const params = Object.fromEntries(new URLSearchParams(shim.location.hash.split('?')[1]));
      assert.deepEqual(params, { page: String(KURSI_PAGE + 1) }, 'the turn rewrote the route');
      const turned = renderMushaf(state(params));
      assert.deepEqual(renderedPages(turned), [KURSI_PAGE + 1], 'the new page renders');
      assert.deepEqual(targets(turned), [], 'no highlight survives on the new page');

      // And backwards, from the same deep link.
      store.dispatch(navigate('mushaf', { s: '2', ay: '255' }));
      shim.location.hash = '#/mushaf?s=2&ay=255';
      assert.equal(await navigateMushafPage('prev'), true);
      assert.equal(shim.location.hash, `#/mushaf?page=${KURSI_PAGE - 1}`, 'turns back from 42');
    } finally {
      delete globalThis.window;
      store.dispatch(actions.navigate('home', {}));
    }
  });
});
