import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const read = (rel) => readFileSync(join(HERE, '..', rel), 'utf8');

test('calendar fasting is secondary progressive disclosure, not a panel wall', () => {
  const view = read('js/views/calendar.js');
  assert.match(
    view,
    /<details class="calendar-secondary-disclosure" id="calendar-fasting">/,
    'fasting management is grouped under native disclosure'
  );
  assert.match(
    view,
    /calendar-secondary-disclosure__summary[\s\S]*fasting\.title/,
    'the collapsed summary keeps a meaningful label'
  );
  assert.match(
    view,
    /calendar-secondary-disclosure__meta[\s\S]*todaySummary[\s\S]*countSummary/,
    'the collapsed row preserves useful today/count orientation'
  );
  assert.match(view, /panel--fasting-days/, 'today fasting controls remain available');
  assert.match(view, /panel--fasting-upcoming/, 'upcoming/history controls remain available');
});

test('calendar fasting jump opens the disclosure before scrolling', () => {
  const handler = read('js/app/handlers/worship.js');
  assert.match(
    handler,
    /'calendar-goto-fasting': \(\) => \{[\s\S]*?el instanceof HTMLDetailsElement[\s\S]*?el\.open = true/,
    'the calendar sheet entry opens the native disclosure before landing on it'
  );
});

test('calendar fasting disclosure has a restrained single-row hierarchy', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(css, /\.calendar-secondary-disclosure\s*\{[\s\S]*?border-block:/);
  assert.match(
    css,
    /\.calendar-secondary-disclosure__summary\s*\{[\s\S]*?min-height:\s*var\(--touch-target\)/
  );
  assert.match(css, /\.calendar-secondary-disclosure__body\s*>\s*\.panel\s*\{[\s\S]*?margin:\s*0/);
});
