import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMushafPageFind, renderMushafPageFindResults } from '../js/views/mushafPageFind.js';

const ROOT = new URL('..', import.meta.url).pathname;
const readJSON = (rel) => JSON.parse(readFileSync(`${ROOT}${rel}`, 'utf8'));
const meta = readJSON('data/mushaf-meta.json');
const page1 = readJSON('data/mushaf/1.json');
const page2 = readJSON('data/mushaf/2.json');

function state(overrides = {}) {
  return {
    settings: { language: 'en', mushafPrefs: { spread: false } },
    activeParams: { page: '1' },
    mushafBookmark: { page: 1 },
    mushaf: { meta, pages: { 1: page1, 2: page2 } },
    ...overrides,
  };
}

describe('Mushaf page-scoped find', () => {
  test('renders a local find surface without launching global search', () => {
    const html = buildMushafPageFind(state());
    assert.match(html, /mushaf-page-find/);
    assert.match(html, /data-bind="mushaf-page-find"/);
    assert.doesNotMatch(html, /data-view="search"/);
    assert.match(html, /Find on this page/);
  });

  test('matches Quranic text while ignoring Uthmani marks', () => {
    const html = renderMushafPageFindResults(state(), 'الحمد لله');
    assert.match(html, /data-surah="1" data-ayah="2"/);
    assert.match(html, /ٱلْحَمْدُ لِلَّهِ/);
  });

  test('never searches beyond the visible page', () => {
    const html = renderMushafPageFindResults(state(), 'المتقين');
    assert.match(html, /No match on the visible page/);
  });

  test('searches both pages when the printed spread is enabled', () => {
    const st = state({
      settings: { language: 'en', mushafPrefs: { spread: true } },
      activeParams: { page: '2' },
    });
    const html = renderMushafPageFindResults(st, 'الم');
    assert.match(html, /data-page="1"/);
    assert.match(html, /data-page="2"/);
  });

  test('keeps no-match honest and query HTML-safe', () => {
    const html = renderMushafPageFindResults(state(), '<script>');
    assert.match(html, /No match on the visible page/);
    assert.doesNotMatch(html, /<script>/i);
  });
});
