/**
 * mushaf-structure.test.js — Blueprint E step 2 pins: mushafReader.js
 * stays a page-render module (no re-growth), its parts live in their own
 * view modules with no back-edges, and the facade re-exports resolve so
 * every existing importer keeps working untouched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
const importsOf = (text) => [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

test('E: mushafReader.js stays lean (no re-growth)', () => {
  const lines = src('js/views/mushafReader.js').split('\n').length;
  assert.ok(lines < 800, `mushafReader.js is ${lines} lines (was 1058)`);
});

test('E: mushafReader.js imports only layers + its extracted parts', () => {
  const allowedPrefixes = ['../core/', '../ui/', '../domain/', '../services/'];
  const allowedViews = [
    './tafsirPanel.js',
    './khatma.js',
    './mushafBookmarks.js',
    './ayahStudy.js',
  ];
  const offenders = importsOf(src('js/views/mushafReader.js')).filter(
    (spec) => !allowedPrefixes.some((p) => spec.startsWith(p)) && !allowedViews.includes(spec)
  );
  assert.deepEqual(offenders, [], `unexpected mushafReader imports: ${offenders.join(', ')}`);
});

test('E: extracted parts have no back-edge into mushafReader', () => {
  for (const mod of ['mushafBookmarks', 'khatma', 'ayahStudy']) {
    const offenders = importsOf(src(`js/views/${mod}.js`)).filter((s) =>
      s.includes('mushafReader')
    );
    assert.deepEqual(offenders, [], `${mod}.js imports mushafReader`);
  }
});

test('E: facade re-exports resolve to functions', async () => {
  const m = await import('../js/views/mushafReader.js');
  for (const name of [
    'buildMushafTrack',
    'buildKhatmaPlanForm',
    'buildMushafBookmarks',
    'buildMushafAyahDetail',
    'renderMushaf',
    'setFlipDirection',
  ]) {
    assert.equal(typeof m[name], 'function', `mushafReader.${name}`);
  }
  // (v5.2.9) the session setters are gone — state.mushafSession owns them.
  for (const gone of ['setBookmarkFolderFilter', 'setActiveTafsirTab', 'getActiveTafsirTab']) {
    assert.equal(m[gone], undefined, `mushafReader.${gone} removed`);
  }
});
