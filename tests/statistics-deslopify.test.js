import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../js/views/statistics.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

test('Statistics keeps a compact visible overview and one progressive detail layer', () => {
  assert.match(view, /class=\"stat-grid statistics-overview\"/);
  assert.match(view, /<details class=\"statistics-details\">/);
  assert.match(view, /class=\"statistics-details__summary\"/);
  assert.match(view, /class=\"statistics-details__body\"/);
  const visible = view.match(/class=\"stat-grid statistics-overview\"/g) || [];
  assert.equal(visible.length, 1, 'only one primary metric grid is visible by default');
  assert.match(view, /statistics-overview--secondary/);
});

test('Statistics detail disclosure copy is bilingual', () => {
  assert.match(en, /'stats\.detailsTitle': 'Detailed activity'/);
  assert.match(ar, /'stats\.detailsTitle': 'تفاصيل النشاط'/);
});

test('Detailed Statistics keeps secondary analytics inside the disclosure', () => {
  const body = view.match(/<details class=\"statistics-details\">([\s\S]*?)<\/details>/)?.[1] || '';
  assert.match(body, /stats\.goalTitle/);
  assert.match(body, /stats\.heatmap/);
  assert.match(body, /stats\.mostRead/);
  assert.match(body, /memorizationPanel\(state, lang\)/);
});
