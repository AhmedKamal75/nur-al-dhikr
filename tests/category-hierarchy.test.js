import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../js/views/category.js', import.meta.url), 'utf8');
const sheet = readFileSync(new URL('../js/views/viewSheets.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

test('Category keeps Focus session as the only header-level action', () => {
  assert.match(view, /class=\"view-header\"/);
  assert.match(view, /data-action=\"session-start\"/);
  assert.doesNotMatch(view, /data-action=\"byheart-start\"/);
  assert.doesNotMatch(view, /data-action=\"quiz-start\"/);
});

test('Section study modes live in the existing view menu', () => {
  assert.match(sheet, /sheetRow\('byheart-start', 'category\.sheet\.byheart'/);
  assert.match(sheet, /sheetRow\('quiz-start', 'category\.sheet\.quiz'/);
  assert.match(sheet, /libId === QUIZ_LIBRARY_ID/);
});

test('Category study-mode menu labels are bilingual', () => {
  assert.match(en, /'category\.sheet\.byheart': 'Recall from memory'/);
  assert.match(en, /'category\.sheet\.quiz': 'Start quiz'/);
  assert.match(ar, /'category\.sheet\.byheart': 'استدعاء من الذاكرة'/);
  assert.match(ar, /'category\.sheet\.quiz': 'ابدأ الاختبار'/);
});
