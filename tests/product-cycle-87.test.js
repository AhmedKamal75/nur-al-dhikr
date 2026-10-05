import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTajweedCourse } from '../js/views/tajweedCourseView.js';
import { buildPracticeLesson } from '../js/views/tajweedPracticeView.js';

const base = {
  settings: { language: 'en', tajweedPathMode: 'open', mushafPrefs: {} },
  tajweedCourseProgress: {},
  activeParams: {},
};

test('Tajweed course exposes Learn separately from Drill', () => {
  const html = renderTajweedCourse(base);
  assert.match(html, /data-action="practice-lesson"/, 'course must expose teaching entry');
  assert.match(html, /data-action="tajweed-course-drill-rule"/, 'course must retain drill entry');
  assert.match(html, /taj-course__rule-main/, 'rule actions must share one row');
});

test('Tajweed lesson includes its cited source when available', () => {
  const state = {
    settings: { language: 'en', tajweedPrefs: {} },
    quran: { meta: { surahs: [] } },
  };
  const html = buildPracticeLesson(state, 'ghunnah', [{ s: 1, a: 1 }]);
  assert.match(html, /practice-lesson__source/, 'lesson must surface provenance');
  assert.match(html, /Sources|Source/, 'lesson source label should be visible');
});
