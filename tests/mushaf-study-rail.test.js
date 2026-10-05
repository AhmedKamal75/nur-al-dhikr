import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMushaf } from '../js/views/mushafReader.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';

const pageDoc = (page) => ({
  page,
  juz: 1,
  chapters: [
    {
      number: 1,
      titleAr: 'الفاتحة',
      titleEn: 'Al-Fatihah',
      startsHere: page === 1,
      verses: [
        { number: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
        { number: 2, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
      ],
    },
  ],
});

const baseState = (over = {}) => ({
  settings: {
    ...DEFAULT_SETTINGS,
    language: 'en',
    mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, spread: false, translationPanel: false },
  },
  activeParams: { page: '1' },
  mushaf: {
    meta: { juzFirstPage: { 1: 1 }, surahFirstPage: { 1: 1 }, ayahPages: { '1:1': 1, '1:2': 1 } },
    pages: { 1: pageDoc(1) },
  },
  quran: { meta: null, surahs: {} },
  quranWords: {},
  wordDict: { index: {} },
  rootsMeaning: { index: {} },
  tafsirEditions: [],
  tafsir: {},
  mushafSession: { tafsirTab: null },
  studyTray: null,
  ayahBookmarks: [],
  surahPlayback: { active: false },
  activeView: 'mushaf',
  ...over,
});

describe('Mushaf contextual study rail', () => {
  test('does not render when no ayah is selected', () => {
    const html = renderMushaf(baseState());
    assert.equal(html.includes('mushaf-study-rail'), false);
  });

  test('renders under the paper independently of translation settings', () => {
    const html = renderMushaf(
      baseState({ studyTray: { surah: '1', ayah: '2', word: null, surface: null } })
    );
    const paper = html.indexOf('class="mushaf-page-wrap"');
    const rail = html.indexOf('class="mushaf-study-rail"');
    assert.ok(paper >= 0 && rail > paper, 'rail follows the paper');
    assert.ok(html.includes('data-study-tray="1:2"'));
    assert.ok(html.includes('data-action="tafsir-open"'));
  });

  test('rail remains available when translation panel is disabled', () => {
    const html = renderMushaf(
      baseState({
        settings: {
          ...DEFAULT_SETTINGS,
          language: 'en',
          mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, translationPanel: false, spread: false },
        },
        studyTray: { surah: '1', ayah: '1', word: null, surface: null },
      })
    );
    assert.ok(html.includes('mushaf-study-rail'));
    assert.equal(html.includes('mushaf-tray__title'), false);
  });
});
