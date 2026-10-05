import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyTray } from '../js/views/studyTray.js';

function state(language = 'en') {
  return {
    settings: { language },
    quran: { surahs: { 2: { ayahs: [{ number: 255, text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ' }] } } },
    quranWords: {
      2: {
        255: [{ i: 1, text: 'اللَّهُ', lemma: 'اللَّه', root: 'أله', en: 'Allah' }],
      },
    },
    quranRoots: {},
    wordDict: {},
    rootsMeaning: {},
    studyTray: { surah: 2, ayah: 255, word: 1, surface: 'اللَّهُ' },
    mushafSession: {},
  };
}

test('ayah study tray exposes a coherent next-step study journey', () => {
  const html = buildStudyTray(state(), 2, 255, 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
  assert.match(html, /study-tray__journey/, 'journey strip should render');
  assert.match(html, /Tafsir/, 'tafsir should remain directly reachable');
  assert.match(html, /Root/, 'selected word root should be reachable');
  assert.match(html, /Tajweed/, 'Tajweed should be reachable');
  assert.match(html, /Memorize/, 'memorization should be reachable');
  assert.match(html, /Look-alike ayat/, 'Mutashabihat should be reachable');
  assert.match(
    html,
    /data-id="2" data-ay="255" data-mem="1"/,
    'memorization link must preserve ayah context'
  );
});

test('Arabic study journey is fully localized', () => {
  const html = buildStudyTray(state('ar'), 2, 255, 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
  assert.match(html, /متابعة الدراسة/);
  assert.match(html, /التفسير/);
  assert.match(html, /الجذر/);
  assert.match(html, /التجويد/);
  assert.match(html, /الحفظ/);
  assert.match(html, /الآيات المتشابهة/);
});
