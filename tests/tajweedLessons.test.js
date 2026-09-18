/**
 * tests/tajweedLessons.test.js — (v5.10.1) guided rule lessons: validated
 * pool-drawn examples, unknown-id safety, and the lesson modal render
 * (definition, example deep links, drill CTA).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  tajweedLessonExamples,
  tajweedLessonRule,
  LESSON_EXAMPLE_COUNT,
} from '../js/domain/tajweedLessons.js';
import { buildPracticeLesson } from '../js/views/tajweedPracticeView.js';
import { initialState } from '../js/core/state/initial.js';

const POOL = {
  byRule: {
    ghunnah: [
      { s: 1, a: 1, w: 2, c: 3 },
      { s: 112, a: 1 },
      { s: 999, a: 1 },
      { s: 2, a: 999 },
      { s: 1, a: 1 },
      { s: 114, a: 6 },
    ],
  },
};

describe('tajweedLessonExamples', () => {
  test('validated, deduped, capped refs', () => {
    const ex = tajweedLessonExamples(POOL, 'ghunnah');
    assert.equal(ex.length, LESSON_EXAMPLE_COUNT);
    assert.deepEqual(ex[0], { s: 1, a: 1 });
    assert.ok(ex.every((e) => e.s >= 1 && e.s <= 114 && e.a >= 1 && e.a <= 286));
  });

  test('unknown rule and hostile pools yield []', () => {
    assert.deepEqual(tajweedLessonExamples(POOL, 'nope'), []);
    assert.deepEqual(tajweedLessonExamples(POOL, 'mixed'), []);
    assert.deepEqual(tajweedLessonExamples(null, 'ghunnah'), []);
    assert.deepEqual(tajweedLessonExamples({ byRule: 'junk' }, 'ghunnah'), []);
  });
});

describe('tajweedLessonRule', () => {
  test('real rules resolve, junk does not', () => {
    assert.equal(tajweedLessonRule('ghunnah')?.id, 'ghunnah');
    assert.equal(tajweedLessonRule('mixed'), null);
    assert.equal(tajweedLessonRule(null), null);
  });
});

describe('buildPracticeLesson', () => {
  function lessonState() {
    const s = initialState();
    return {
      ...s,
      settings: { ...s.settings, language: 'en' },
      quran: {
        ...s.quran,
        meta: { surahs: [{ number: 1, nameAr: 'الفاتحة', nameTransliteration: 'Al-Fatiha' }] },
      },
    };
  }

  test('definition + example links + drill CTA', () => {
    const html = buildPracticeLesson(lessonState(), 'ghunnah', [
      { s: 1, a: 1 },
      { s: 112, a: 1 },
    ]);
    assert.match(html, /practice-lesson__desc/, 'definition');
    assert.match(html, /practice-lesson__example/, 'example links');
    assert.match(html, /#\/quran\/1/, 'deep link toward the ayah');
    assert.match(html, /data-action="practice-start" data-rule="ghunnah"/, 'drill CTA');
    assert.match(html, /data-action="practice-open"/, 'back to rules');
  });

  test('empty pool shows the honest empty state; unknown rule blanks', () => {
    const html = buildPracticeLesson(lessonState(), 'ghunnah', []);
    assert.match(html, /Examples load with/, 'honest empty state');
    assert.match(html, /data-action="practice-start" data-rule="ghunnah"/, 'drill still offered');
    assert.equal(buildPracticeLesson(lessonState(), 'nope', []), '');
  });
});
