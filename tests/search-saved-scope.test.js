/**
 * search-saved-scope.test.js — the Saved scope of global search (C01).
 *
 * The Saved chip narrows the SAME index pass to favorites + collection
 * items via the savedIds option: identical ranking/normalization, never a
 * second engine. These pins cover the contract the view relies on:
 * unsaved matches drop out, saved matches keep their score/order, an
 * empty saved set honestly answers [], and a hostile (non-Set) value
 * degrades to the unscoped pass instead of throwing.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildIndex, search } from '../js/domain/search.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';

function entry(id, titleEn, extra = '') {
  return {
    item: {
      id,
      category_id: 'c1',
      title: { en: titleEn, ar: 'ذكر' },
      arabic: 'سُبْحَانَ اللَّهِ',
      transliteration: extra,
      translation: { en: extra, ar: '' },
      virtues: { en: '', ar: '' },
      tags: [],
    },
    category: { name: { en: 'Morning', ar: 'الصباح' } },
    document: { metadata: { name: { en: 'Adhkar', ar: 'الأذكار' } } },
  };
}

describe('saved-scope search', () => {
  buildIndex({
    'it-saved': entry('it-saved', 'Patience in prayer', 'sabr virtue'),
    'it-unsaved': entry('it-unsaved', 'Patience in hardship', 'sabr hardship'),
    'it-other': entry('it-other', 'Gratitude', 'shukr'),
  });

  test('savedIds narrows the pass to the saved subset only', () => {
    const all = search('patience', { limit: 10 });
    assert.deepEqual(
      all.map((r) => r.itemId).sort(),
      ['it-saved', 'it-unsaved'],
      'unscoped pass sees both'
    );
    const saved = search('patience', { limit: 10, savedIds: new Set(['it-saved']) });
    assert.deepEqual(
      saved.map((r) => r.itemId),
      ['it-saved'],
      'saved pass keeps only the saved match'
    );
    assert.equal(
      saved[0].score,
      all.find((r) => r.itemId === 'it-saved').score,
      'ranking identical'
    );
  });

  test('an empty saved set answers [] even when the corpus would match', () => {
    assert.deepEqual(search('patience', { limit: 10, savedIds: new Set() }), []);
    assert.deepEqual(search('sabr', { limit: 10, savedIds: new Set() }), []);
  });

  test('root-expansion extras respect the same subset', () => {
    const saved = search('zzz-nothing', {
      limit: 10,
      extraTerms: ['sabr'],
      savedIds: new Set(['it-unsaved']),
    });
    assert.deepEqual(
      saved.map((r) => r.itemId),
      ['it-unsaved'],
      'expansion hits stay inside the saved subset'
    );
    assert.ok(saved[0].viaRoot, 'expansion hit keeps its provenance flag');
  });

  test('a hostile savedIds value degrades to the unscoped pass', () => {
    const all = search('patience', { limit: 10 });
    for (const hostile of ['it-saved', 42, { has: () => true }, null, undefined]) {
      assert.deepEqual(
        search('patience', { limit: 10, savedIds: hostile })
          .map((r) => r.itemId)
          .sort(),
        all.map((r) => r.itemId).sort(),
        `savedIds=${String(hostile)} never throws, never filters`
      );
    }
  });
});

describe('searchScope setting', () => {
  test('sanitizer coerces the enum and drops hostile values', () => {
    assert.equal(sanitizeSettings({ searchScope: 'saved' }).searchScope, 'saved');
    assert.equal(sanitizeSettings({ searchScope: 'all' }).searchScope, 'all');
    for (const hostile of ['SAVED', 'everything', 1, true, null, undefined, ['saved'], { s: 1 }]) {
      assert.equal(
        sanitizeSettings({ searchScope: hostile }).searchScope,
        'all',
        `searchScope=${String(hostile)} falls back to all`
      );
    }
  });
});
