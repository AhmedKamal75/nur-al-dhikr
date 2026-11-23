import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAJWEED_SITES, resolveConventionSites } from '../js/domain/tajweedSites.js';

const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const quran = new Map();
const mushaf = new Map();
for (let s = 1; s <= 114; s++)
  for (const a of json(`data/quran/${s}.json`).ayahs) quran.set(`${s}:${a.number}`, a.text);
for (let p = 1; p <= 604; p++)
  for (const c of json(`data/mushaf/${p}.json`).chapters || [])
    for (const a of c.verses || []) mushaf.set(`${c.number}:${a.number}`, a.text);

test('site registry runtime mirror matches canonical data, with attribution', () => {
  assert.deepEqual(TAJWEED_SITES, json('data/tajweed-sites.json'));
  assert.equal(TAJWEED_SITES.sites.length, 71);
  assert.equal(TAJWEED_SITES.provenance.annotations.license, 'CC-BY-4.0');
});

test('all nonconflicted sites resolve to the exact first letter in BOTH original texts', () => {
  for (const site of TAJWEED_SITES.sites) {
    for (const corpus of [quran, mushaf]) {
      const text = corpus.get(site.ref);
      const hits = resolveConventionSites(text, site.surah, site.ayah, 'lpmq');
      if (site.ref === '11:42') {
        assert.deepEqual(hits, []);
        continue;
      }
      const expectedCount = TAJWEED_SITES.sites.filter((s) => s.ref === site.ref).length;
      assert.equal(hits.length, expectedCount, site.ref);
      for (const hit of hits) {
        const word = text.trim().split(/\s+/)[hit.wordIndex - 1];
        assert.ok(word.slice(hit.start, hit.end).length === 1, site.ref);
        assert.equal(hit.evidenceLevel, 'rule-level-cited');
        assert.equal(hit.perSiteVisual, 'Unknown');
      }
      assert.ok(
        hits.some(
          (hit) =>
            text.trim().split(/\s+/)[hit.wordIndex - 1].slice(hit.start, hit.end) ===
            site.sakin_letter
        ),
        site.ref
      );
    }
  }
});

test('DAM stays unannotated, conflict stays Unknown, wrong pair fails closed', () => {
  assert.deepEqual(resolveConventionSites(quran.get('17:24'), 17, 24, 'dar-al-maarifah'), []);
  assert.deepEqual(resolveConventionSites(quran.get('11:42'), 11, 42, 'lpmq'), []);
  assert.deepEqual(resolveConventionSites('نص غير مطابق', 17, 24, 'lpmq'), []);
  assert.deepEqual(resolveConventionSites(quran.get('17:24'), 17, 25, 'lpmq'), []);
});
