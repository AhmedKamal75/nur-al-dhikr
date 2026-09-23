/**
 * shahada-banner.test.js (v5.17.6) — the Shahada strip atop Home carries
 * quoted wording: no theme, language, or edit may silently alter a
 * letter, translate it, or drop its RTL/ARIA contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { SHAHADA_TEXT, shahadaBannerHTML } from '../js/views/home.js';

test('the Shahada wording is exact and untranslated', () => {
  assert.equal(SHAHADA_TEXT, 'لا إله إلا الله محمد رسول الله');
  for (const lang of ['en', 'ar']) {
    const html = shahadaBannerHTML(lang);
    assert.ok(html.includes(SHAHADA_TEXT), `${lang} banner carries the wording`);
  }
});

test('the banner keeps its RTL + accessible-name contract', () => {
  const en = shahadaBannerHTML('en');
  assert.ok(en.includes('dir="rtl"'), 'always right-to-left');
  assert.ok(en.includes('lang="ar"'), 'announced as Arabic');
  assert.ok(en.includes('role="img"'), 'treated as an emblem, not a paragraph');
  assert.ok(en.includes('aria-label="'), 'has an accessible name');
  const ar = shahadaBannerHTML('ar');
  assert.ok(ar.includes('aria-label="'), 'named in Arabic too');
  // The emblem has no interactive children and no icon-font dependency.
  assert.ok(!en.includes('data-action'), 'nothing to tap');
});
