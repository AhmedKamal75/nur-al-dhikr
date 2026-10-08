import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('hostile review provenance wording avoids an unconditional CC0 claim for hadith UI', () => {
  const en = read('js/core/i18n/en.js');
  const ar = read('js/core/i18n/ar.js');
  assert.match(
    en,
    /hadith-sourceProvenance|hadith-api dataset; full provenance and source-rights notes are recorded/
  );
  assert.doesNotMatch(en, /hadith\.sourceProvenance[^\n]*CC0/i);
  assert.doesNotMatch(ar, /hadith-api[^\n]*CC0/i);
});

test('hostile review provenance notes are durable in the source tree', () => {
  const credits = read('CREDITS.md');
  const sources = read('data/SOURCES.md');
  const report = read('docs/HOSTILE-REVIEW-v5.17.131.md');
  assert.match(credits, /rights chain|provenance/i);
  assert.match(sources, /Sunnah\.com explicitly states|source\/permission chain/i);
  assert.match(report, /HR-03|HR-04|HR-05|HR-06/);
});
