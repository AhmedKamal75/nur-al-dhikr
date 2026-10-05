import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHash } from '../js/core/router.js';
import {
  studyContextOf,
  studyContextParams,
  mergeStudyContextParams,
  studyContextHTML,
} from '../js/views/studyContext.js';

const base = (params = {}, lang = 'en') => ({
  activeParams: params,
  settings: { language: lang },
});

test('study context validates an exact ayah origin', () => {
  assert.deepEqual(studyContextOf(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' })), {
    from: 'mushaf',
    surah: 2,
    ayah: 255,
  });
  assert.equal(studyContextOf(base({ from: 'mushaf', fromSurah: '2', fromAyah: '0' })), null);
  assert.equal(studyContextOf(base({ from: 'home', fromSurah: '2', fromAyah: '255' })), null);
});

test('study context parameters preserve origin and can be merged into route params', () => {
  const ctx = studyContextParams(36, 12);
  assert.deepEqual(ctx, { from: 'mushaf', fromSurah: '36', fromAyah: '12' });
  const merged = mergeStudyContextParams(
    { id: 'نصر' },
    base({ from: 'mushaf', fromSurah: '36', fromAyah: '12' })
  );
  assert.equal(merged.id, 'نصر');
  assert.equal(
    buildHash('roots', merged),
    '#/roots/%D9%86%D8%B5%D8%B1?from=mushaf&fromSurah=36&fromAyah=12'
  );
});

test('study context renders a single quiet return path in both languages', () => {
  const en = studyContextHTML(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' }, 'en'));
  const ar = studyContextHTML(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' }, 'ar'));
  assert.match(en, /Return to ayah 2:255/);
  assert.match(en, /#\/mushaf\?s=2&ay=255/);
  assert.match(ar, /العودة إلى الآية 2:255/);
});
