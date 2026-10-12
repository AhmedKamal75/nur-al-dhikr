import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildHash } from '../js/core/router.js';
import { renderTajweedCourse } from '../js/views/tajweedCourseView.js';
import {
  studyContextOf,
  studyContextParams,
  mergeStudyContextParams,
  wordStudyContextParams,
  studyContextHTML,
} from '../js/views/studyContext.js';

const quranMeta = JSON.parse(
  readFileSync(new URL('../data/quran-meta.json', import.meta.url), 'utf8')
);

const base = (params = {}, lang = 'en', meta = quranMeta) => ({
  activeParams: params,
  settings: { language: lang },
  quran: { meta },
});

test('study context validates references against canonical surah ayah counts', () => {
  for (const [surah, ayah] of [
    [1, 7],
    [2, 286],
    [36, 12],
    [114, 6],
  ]) {
    assert.deepEqual(
      studyContextOf(base({ from: 'mushaf', fromSurah: String(surah), fromAyah: String(ayah) })),
      { from: 'mushaf', surah, ayah }
    );
  }

  for (const [surah, ayah] of [
    [1, 8],
    [2, 287],
    [114, 7],
    [115, 1],
    [2.5, 3],
  ]) {
    assert.equal(
      studyContextOf(base({ from: 'mushaf', fromSurah: String(surah), fromAyah: String(ayah) })),
      null,
      `${surah}:${ayah} is not a valid Qur'an reference`
    );
  }
  assert.equal(studyContextOf(base({ from: 'home', fromSurah: '2', fromAyah: '255' })), null);
  assert.equal(
    studyContextOf(base({ from: 'mushaf', fromSurah: '114', fromAyah: '6' }, 'en', null)),
    null,
    'unknown metadata must not be treated as proof that an ayah exists'
  );
});

test('study context parameters preserve origin and can be merged into route params', () => {
  const ctx = studyContextParams(36, 12, 'mushaf', quranMeta);
  assert.deepEqual(ctx, { from: 'mushaf', fromSurah: '36', fromAyah: '12' });
  assert.deepEqual(studyContextParams(1, 8, 'mushaf', quranMeta), {});
  assert.deepEqual(studyContextParams(114, 6, 'mushaf', null), {});
  assert.deepEqual(studyContextParams(114, 6, 'home', quranMeta), {});
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

test('Study Tray journey links derive context from the exact open ayah', () => {
  const mushaf = {
    ...base({ page: '42' }),
    activeView: 'mushaf',
    studyTray: { surah: '2', ayah: '255', word: 3 },
  };
  assert.deepEqual(mergeStudyContextParams({ id: 'نصر' }, mushaf), {
    id: 'نصر',
    from: 'mushaf',
    fromSurah: '2',
    fromAyah: '255',
  });
  const quran = {
    ...base({ id: '2' }),
    activeView: 'quran',
    studyTray: { surah: '2', ayah: '255', word: 3 },
  };
  assert.deepEqual(mergeStudyContextParams({ id: 'نصر' }, quran), {
    id: 'نصر',
    from: 'quran',
    fromSurah: '2',
    fromAyah: '255',
  });
  assert.deepEqual(
    mergeStudyContextParams(
      { id: 'نصر' },
      { ...mushaf, studyTray: { surah: '1', ayah: '8' } }
    ),
    { id: 'نصر' },
    'invalid tray references must not create a study context'
  );
  assert.deepEqual(
    mergeStudyContextParams({ id: 'نصر' }, { ...mushaf, studyTray: null }),
    { id: 'نصر' },
    'a page-only Mushaf route must not guess which ayah was open'
  );
  const relatedStudy = {
    ...base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' }),
    activeView: 'roots',
    studyTray: { surah: '3', ayah: '7' },
  };
  assert.deepEqual(mergeStudyContextParams({ id: 'نصر' }, relatedStudy), {
    id: 'نصر',
    from: 'mushaf',
    fromSurah: '2',
    fromAyah: '255',
  });
});

test('Tajweed Course renders a validated return path for direct study links', () => {
  const html = renderTajweedCourse(
    base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' })
  );
  assert.match(html, /class="study-context"/);
  assert.match(html, /Return to ayah 2:255/);
  assert.ok(html.includes('#/mushaf?s=2&ay=255'));
  const invalid = renderTajweedCourse(
    base({ from: 'mushaf', fromSurah: '1', fromAyah: '8' })
  );
  assert.doesNotMatch(invalid, /class="study-context"/);
});

test('word-root navigation preserves an exact source ayah', () => {
  assert.deepEqual(
    wordStudyContextParams({
      ...base(),
      activeView: 'mushaf',
      activeWordStudy: { surah: '1', ayah: '7', i: 2 },
    }),
    { from: 'mushaf', fromSurah: '1', fromAyah: '7' }
  );
  assert.deepEqual(
    wordStudyContextParams({
      ...base(),
      activeView: 'quran',
      activeWordStudy: { surah: '114', ayah: '6', i: 2 },
    }),
    { from: 'quran', fromSurah: '114', fromAyah: '6' }
  );
  assert.deepEqual(
    wordStudyContextParams({
      ...base(),
      activeView: 'mushaf',
      activeWordStudy: { surah: '1', ayah: '8', i: 2 },
    }),
    {},
    'invalid source ayah must not produce a context'
  );
  assert.deepEqual(
    wordStudyContextParams(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' })),
    { from: 'mushaf', fromSurah: '2', fromAyah: '255' }
  );
});

test('study context renders a single quiet return path in both languages', () => {
  const en = studyContextHTML(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' }, 'en'));
  const ar = studyContextHTML(base({ from: 'mushaf', fromSurah: '2', fromAyah: '255' }, 'ar'));
  assert.match(en, /Return to ayah 2:255/);
  assert.match(en, /#\/mushaf\?s=2&ay=255/);
  assert.match(ar, /العودة إلى الآية 2:255/);
});
