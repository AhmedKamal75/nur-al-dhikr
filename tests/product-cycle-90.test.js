import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPracticeLesson } from '../js/views/tajweedPracticeView.js';

function state(language = 'en') {
  return {
    settings: { language, tajweedPrefs: {} },
    quran: {
      meta: { surahs: [{ number: 1, nameTransliteration: 'Al-Fatihah', nameAr: 'الفاتحة' }] },
      surahs: { 1: { ayahs: [{ number: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' }] } },
    },
  };
}

test('Tajweed rule lessons teach from a real Quran text example and visibly mark the rule', () => {
  const html = buildPracticeLesson(state(), 'lam_shamsiyyah', [
    { s: 1, a: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  ]);
  assert.match(html, /practice-lesson__example-card/);
  assert.match(html, /practice-lesson__ayah/);
  assert.match(html, /practice-lesson__mark/, 'the matched rule should be visibly marked');
  assert.match(html, /Open ayah/);
});

test('Tajweed lesson example text remains Arabic in Arabic UI', () => {
  const html = buildPracticeLesson(state('ar'), 'lam_shamsiyyah', [
    { s: 1, a: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  ]);
  assert.match(html, /افتح الآية/);
  assert.match(html, /المظلّل/);
  assert.match(html, /بِسْمِ اللَّهِ/);
});
