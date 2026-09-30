/**
 * search-offline-honesty.test.js — an empty list and a failed fetch are
 * different truths.
 *
 * THE DEFECT THIS PINS
 *
 * `renderSearch` checked the Qur'an tier and the tafsir tier and rendered an
 * error + Retry for both. It did NOT check the library tier. So on a cold
 * cache with no network, a real query answered with "no results" — a claim
 * about the corpus when the truth was that the corpus was never fetched. The
 * same query on the Library view was honest, because `library.js:282` checks
 * the same flag.
 *
 * The general rule this file holds, for the whole view and not just the
 * library section: **a section that could not load must never render as a
 * section that loaded and found nothing.**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}js/views/search.js`, 'utf8');

test('the library tier is checked, and it gates the result list', () => {
  assert.match(
    src,
    /const libLoadFailed = Boolean\(state\.loadErrors\?\.library\)/,
    'search must read the library tier flag'
  );
  assert.match(
    src,
    /libLoadFailed\s*\?\s*loadErrorStateHTML\(\{ lang, tierKey: 'library', t \}\)/,
    'a failed library tier must render error + Retry, not an empty state'
  );
});

test('a failed tier does not run a search it cannot satisfy', () => {
  assert.match(
    src,
    /query && !libLoadFailed\s*\? runSearch\(/,
    'do not search a corpus that failed to load — the empty result is the artefact'
  );
});

test('the breakdown count does not report zero for a corpus that never loaded', () => {
  // "Qur'an: 0 · Hadith: 0 · Azkar: 0" is the exact sentence this fixes. A
  // null is passed so the template can render a dash rather than a number it
  // does not have.
  assert.match(
    src,
    /libLoadFailed \? null : azkarAll\.length/,
    'the Azkar count must not claim 0 when the library tier failed'
  );
});

test('every tier in the view is covered, not just the library one', () => {
  // The generalisation: whichever tiers this view searches, each must have a
  // failure branch. If a new searchable corpus is added, this fails until it
  // is handled honestly too.
  const tiers = [...src.matchAll(/loadErrorStateHTML\(\{ lang, tierKey: '([^']+)'/g)].map(
    (m) => m[1]
  );
  const searched = [...src.matchAll(/loadErrors\?\.\['([a-z-]+)'\]/g)].map((m) => m[1]);
  const gate = src.match(/const libLoadFailed = Boolean\(([^)]*)\)/);
  assert.ok(gate, 'the library gate should exist');
  assert.ok(gate[1].includes('library'), 'the gate should read the library tier');

  const all = [...new Set([...searched, ...tiers, 'library'])].sort();
  for (const tier of all) {
    assert.ok(
      tiers.includes(tier),
      `tier "${tier}" is searched but has no error + Retry branch — it would render as "no results"`
    );
  }
});

test('the library view already does this correctly — the two must agree', () => {
  // If these ever diverge again, the same query tells the reader two different
  // stories depending on where they typed it.
  const library = readFileSync(`${ROOT}js/views/library.js`, 'utf8');
  assert.match(library, /loadErrors\?\.library/, 'library.js should still check the tier');
});
