import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { renderPractice } from '../js/views/practice.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

function state(lang) {
  const base = initialState();
  return {
    ...base,
    settings: { ...base.settings, language: lang },
  };
}

describe('Practice landing', () => {
  test('EN presents four task-shaped destinations without duplicating content', () => {
    const html = renderPractice(state('en'));
    assert.equal((html.match(/class="practice-task/g) || []).length, 4);
    assert.match(html, /#\/tasbih/);
    assert.match(html, /data-action="practice-open"/);
    assert.match(html, /#\/mutashabihat/);
    assert.match(html, /#\/quiz/);
    for (const key of [
      'practiceHub.title',
      'practiceHub.lead',
      'practiceHub.tasbihTitle',
      'practiceHub.tajweedTitle',
      'practiceHub.recallTitle',
      'practiceHub.namesTitle',
    ]) {
      assert.ok(html.includes(en[key]), key + ' missing from EN Practice surface');
    }
  });

  test('AR renders the same task contract in Arabic', () => {
    const html = renderPractice(state('ar'));
    for (const key of [
      'practiceHub.title',
      'practiceHub.lead',
      'practiceHub.tasbihTitle',
      'practiceHub.tajweedTitle',
      'practiceHub.recallTitle',
      'practiceHub.namesTitle',
    ]) {
      assert.ok(html.includes(ar[key]), key + ' missing from AR Practice surface');
    }
    assert.ok(!html.includes(en['practiceHub.title']), 'EN title leaked into AR');
  });

  test('the Practice surface stays task-flat', () => {
    const html = renderPractice(state('en'));
    assert.equal((html.match(/<details\b/g) || []).length, 0);
    assert.ok(!html.includes('More'), 'no generic More bucket');
  });
});
