import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const read = (rel) => readFileSync(join(HERE, '..', rel), 'utf8');

test('ramadan secondary planning is progressive disclosure, not a card wall', () => {
  const view = read('js/views/ramadan.js');
  assert.match(view, /<details class="panel ramadan-secondary-disclosure panel--ramadan-planner">/);
  assert.match(view, /ramadan\.plannerSummary[\s\S]*taraweeh/);
  assert.match(view, /data-slice="\$\{slice\}"/);
  assert.match(view, /data-action="ramadan-planner-toggle"/);
  assert.match(view, /dots\(taraweeh, 'taraweehLog'/);
  assert.match(view, /dots\(itikaf, 'itikafLog'/);
  assert.match(view, /dots\(lastTen, 'lastTenLog'/);
});

test('ramadan alert controls are secondary while active state remains visible in summary', () => {
  const view = read('js/views/ramadan.js');
  assert.match(
    view,
    /<details class="panel ramadan-secondary-disclosure">[\s\S]*ramadan\.alertsSummary/
  );
  assert.match(view, /data-alert="suhoor"/);
  assert.match(view, /data-alert="iftar"/);
  assert.match(view, /data-bind="ramadan-suhoor-offset"/);
});

test('ramadan explore actions are navigation, not another generic panel', () => {
  const view = read('js/views/ramadan.js');
  assert.match(view, /<nav class="ramadan-explore"/);
  assert.doesNotMatch(view, /<section class="panel">[\s\S]*ramadan\.explore/);
});

test('ramadan secondary disclosures use the same restrained native disclosure grammar in the design layer', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(css, /\.view--ramadan \.ramadan-secondary-disclosure\s*\{[\s\S]*?border-block:/);
  assert.match(
    css,
    /ramadan-secondary-disclosure__summary[\s\S]*?min-height:\s*var\(--touch-target\)/
  );
  assert.match(css, /ramadan-secondary-disclosure__summary::after/);
  assert.match(css, /ramadan-secondary-disclosure__body/);
});
