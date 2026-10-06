import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../js/views/checklist.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

test('Checklist keeps today primary and moves history behind one disclosure', () => {
  assert.match(view, /panel--checklist-summary/);
  assert.match(view, /checklist-history-details/);
  assert.match(view, /<summary class=\"checklist-history-details__summary\"/);
  assert.match(view, /class=\"checklist-history-details__body\"/);
});

test('Checklist history disclosure is bilingual', () => {
  assert.match(en, /'checklist\.historyTitle': 'Last 7 days'/);
  assert.match(ar, /'checklist\.historyTitle': 'آخر ٧ أيام'/);
});

test('Prayer and adhkar checklist groups remain directly available', () => {
  assert.match(view, /t\('checklist\.groupPrayer'/);
  assert.match(view, /t\('checklist\.groupAdhkar'/);
});
