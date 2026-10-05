import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStudyTray } from '../js/views/studyTray.js';

const state = (lang = 'en') => ({
  settings: { language: lang, showTranslation: false, quranTranslation: 'en-sahih' },
  quran: { surahs: { 2: { ayahs: [{ number: 255, text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ' }] } } },
  quranWords: {
    2: { 255: [{ i: 1, text: 'اللَّهُ', lemma: 'اللَّه', root: 'أله', en: 'Allah' }] },
  },
  wordDict: { index: {} },
  rootsMeaning: { index: {} },
  quranRoots: {},
  mushafSession: { tafsirTab: null },
  studyTray: { surah: '2', ayah: '255', word: 1, surface: 'اللَّهُ' },
});

test('selected word in the study rail exposes the full Word Study action', () => {
  const html = buildStudyTray(state(), 2, 255, 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
  assert.match(html, /data-action="word-study-from-tray"/);
  assert.match(html, /data-surah="2" data-ayah="255" data-i="1"/);
  assert.match(html, /Open word study/);
});

test('full Word Study action is localized in Arabic', () => {
  const html = buildStudyTray(state('ar'), 2, 255, 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
  assert.match(html, /فتح دراسة الكلمة/);
});
