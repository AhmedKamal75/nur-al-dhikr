/**
 * tests/wordStudyRender.test.js — integration smoke test for the Qur'an
 * word-study + multi-tafsir + Mushaf-settings templates. Unlike
 * wordStudy.test.js (pure logic), this exercises the actual HTML-template
 * functions against the real bundled data files, catching the class of bug
 * a syntax check or a pure-logic unit test can't: wrong field names,
 * missing null guards, template literals that silently interpolate
 * "undefined". Data files are read straight from data/ so this also acts
 * as a contract test between the Python data pipeline and the JS templates.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  buildWordStudyPanel,
  buildTafsirPanel,
  buildAyahStudyExtras,
  buildMushafSettingsPanel,
  renderAyahWords,
  formatArabicCommentary,
} from '../js/views/tafsirPanel.js';
import { renderMushaf, buildMushafAyahDetail, setFlipDirection } from '../js/views/mushafReader.js';
import { renderQuran } from '../js/views/quran.js';
import { DEFAULT_SETTINGS } from '../js/config.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const words1 = readJSON('data/quran-words/1.json');
const words2 = readJSON('data/quran-words/2.json');
const roots = readJSON('data/quran-roots.json');
const editions = readJSON('data/tafsir-editions.json');
const muyassar1 = readJSON('data/tafsir/muyassar/1.json');
const jadwal1 = readJSON('data/tafsir/jadwal/1.json');
const mushafMeta = readJSON('data/mushaf-meta.json');
const mushafPage1 = readJSON('data/mushaf/1.json');
const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en', ...(settingsOverride || {}) },
    activeParams: {},
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: { 1: surah1 } },
    mushaf: { meta: mushafMeta, pages: { 1: mushafPage1 } },
    mushafBookmark: { page: 1 },
    ayahBookmarks: [],
    quranWords: { 1: words1, 2: words2 },
    quranRoots: roots,
    tafsirEditions: editions,
    tafsir: { muyassar: { 1: muyassar1 }, jadwal: { 1: jadwal1 } },
    activeWordStudy: { surah: '1', ayah: '1', i: 2 },
    recitingAyahKey: null,
    player: null,
    ...rest,
  };
}

/** No leaked "undefined"/"NaN" text, always a non-empty string. */
function assertClean(html, label) {
  assert.equal(typeof html, 'string', `${label}: should return a string`);
  assert.ok(html.trim().length > 0, `${label}: should not be empty`);
  assert.doesNotMatch(html, /\bundefined\b/, `${label}: leaked "undefined"`);
  assert.doesNotMatch(html, /\bNaN\b/, `${label}: leaked "NaN"`);
}

test('buildWordStudyPanel renders for a real word, both languages', () => {
  assertClean(buildWordStudyPanel(baseState()), 'word study (en)');
  assertClean(buildWordStudyPanel(baseState({ settings: { language: 'ar' } })), 'word study (ar)');
});

test('buildWordStudyPanel degrades gracefully when the word is not found', () => {
  const html = buildWordStudyPanel(
    baseState({ quranWords: {}, activeWordStudy: { surah: '9', ayah: '1', i: 1 } })
  );
  assertClean(html, 'word study (missing)');
  assert.match(html, /tafsir-open/);
});

test('buildWordStudyPanel shows root occurrences excluding the current ayah', () => {
  const html = buildWordStudyPanel(baseState({ activeWordStudy: { surah: '1', ayah: '4', i: 2 } })); // يوم
  assertClean(html, 'word study (root)');
  assert.match(html, /root-jump/);
  assert.doesNotMatch(html, /data-surah="1" data-ayah="4"[^>]*root-jump/);
});

test('buildTafsirPanel: bundled + loaded, bundled + not-yet-fetched, remote, sectioned source', () => {
  assertClean(buildTafsirPanel(baseState(), 1, 1, 'muyassar'), 'tafsir (loaded)');
  assertClean(buildTafsirPanel(baseState(), 5, 1, 'muyassar'), 'tafsir (loading state)');
  assertClean(buildTafsirPanel(baseState(), 1, 1, 'ibn-kathir'), 'tafsir (remote/download prompt)');
  const jadwalHtml = buildTafsirPanel(baseState(), 1, 5, 'jadwal');
  assertClean(jadwalHtml, 'tafsir (jadwal, sectioned)');
  assert.match(jadwalHtml, /tafsir-section-h/); // i'rab/sarf/balagha headers must render as real sections
});

test('buildTafsirPanel tolerates a catalog that has not loaded yet', () => {
  assertClean(
    buildTafsirPanel(baseState({ tafsirEditions: null }), 1, 1, null),
    'tafsir (no catalog)'
  );
});

test('formatArabicCommentary splits Al-Jadwal into labeled sections', () => {
  const html = formatArabicCommentary(jadwal1['1']);
  const headings = html.match(/tafsir-section-h/g) || [];
  assert.ok(headings.length >= 2, 'expected at least i\u2019rab + sarf sections');
});

test('formatArabicCommentary highlights \u25c1word\u25b7 markers without altering the text', () => {
  const marked = '\uFD3F\u0628ِ\uFD3E \u062D\u0631\u0641 \u062C\u0631';
  const html = formatArabicCommentary(marked);
  assert.match(html, /tafsir-word-mark/);
});

test('formatArabicCommentary never throws on empty/undefined input', () => {
  assert.equal(formatArabicCommentary(''), '');
  assert.equal(formatArabicCommentary(undefined), '');
});

test('renderAyahWords produces one tappable span per official-text word', () => {
  const text = surah1.ayahs[0].text; // بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — 4 words
  const html = renderAyahWords(text, words1['1'], 1, 1, { tappable: true, underline: true });
  const spanCount = (html.match(/data-action="word-tap"/g) || []).length;
  assert.equal(spanCount, text.trim().split(/\s+/).length);
});

test('renderAyahWords falls back to plain escaped text when not tappable or data missing', () => {
  const text = surah1.ayahs[0].text;
  assert.doesNotMatch(
    renderAyahWords(text, words1['1'], 1, 1, { tappable: false }),
    /data-action="word-tap"/
  );
  assert.doesNotMatch(
    renderAyahWords(text, undefined, 1, 1, { tappable: true }),
    /data-action="word-tap"/
  );
});

test('buildMushafSettingsPanel renders in both languages with no crash', () => {
  assertClean(buildMushafSettingsPanel(baseState()), 'mushaf settings (en)');
  assertClean(
    buildMushafSettingsPanel(baseState({ settings: { language: 'ar' } })),
    'mushaf settings (ar)'
  );
});

test('renderMushaf renders page 1 with tappable words and reflects every paper theme', () => {
  const html = renderMushaf(baseState());
  assertClean(html, 'mushaf page');
  assert.match(html, /data-action="word-tap"/);
  for (const paper of ['ivory', 'sepia', 'night', 'amoled']) {
    const st = baseState();
    st.settings.mushafPrefs = { ...st.settings.mushafPrefs, paper };
    assertClean(renderMushaf(st), `mushaf page (paper=${paper})`);
  }
});

test('renderMushaf respects the word-by-word toggle', () => {
  const st = baseState();
  st.settings.mushafPrefs = { ...st.settings.mushafPrefs, wordByWordStudy: false };
  const html = renderMushaf(st);
  assertClean(html, 'mushaf page (word study off)');
  assert.doesNotMatch(html, /data-action="word-tap"/);
});

test('renderMushaf consumes the flip direction exactly once', () => {
  setFlipDirection('next');
  const first = renderMushaf(baseState());
  assert.match(first, /mushaf-page--flip-next/);
  const second = renderMushaf(baseState());
  assert.doesNotMatch(second, /mushaf-page--flip-(next|prev)/);
});

test('renderMushaf shows a loading state when the page has not been fetched yet', () => {
  const html = renderMushaf(baseState({ mushaf: { meta: mushafMeta, pages: {} } }));
  assertClean(html, 'mushaf page (loading)');
});

test('buildMushafAyahDetail omits the bookmark action when no page is known (classic-reader entry point)', () => {
  const withPage = buildMushafAyahDetail(surah1.ayahs[0].text, surah1, 1, 1, baseState(), 1);
  const withoutPage = buildMushafAyahDetail(surah1.ayahs[0].text, surah1, 1, 1, baseState(), null);
  assertClean(withPage, 'ayah detail (with page)');
  assertClean(withoutPage, 'ayah detail (no page)');
  assert.match(withPage, /mushaf-toggle-bookmark/);
  assert.doesNotMatch(withoutPage, /mushaf-toggle-bookmark/);
});

test('renderQuran (classic reader) renders word-tappable ayahs and a tafsir shortcut', () => {
  const html = renderQuran(baseState({ activeParams: { id: '1' } }));
  assertClean(html, 'classic reader');
  assert.match(html, /data-action="word-tap"/);
  assert.match(html, /data-action="tafsir-open"/);
});

test('renderQuran surah list still renders untouched', () => {
  assertClean(renderQuran(baseState({ activeParams: {} })), 'classic reader (list)');
});
