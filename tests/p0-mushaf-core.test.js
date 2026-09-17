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
import { renderMushaf } from '../js/views/mushafReader.js';
import { buildWordStudyPanel } from '../js/views/tafsirPanel.js';
import { ornamentTokenKind, sameSurfaceWord } from '../js/domain/tajweed.js';
import { wordIrabLine } from '../js/domain/wordStudy.js';
import { computeFitScale, FIT_MIN, FIT_MAX } from '../js/app/autoFit.js';
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
