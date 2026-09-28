/**
 * tests/custom-card-reorder.test.js — OPEN-ISSUES #10 verification:
 * custom library card-level reorder under the shared lens.
 *
 * moveItem pool + visibleCategoryItems reader + category.js buttons
 * already handle custom; this pins the missing render-order assertion:
 *  1. moveItem updates orderOverrides for a custom cat,
 *  2. visibleCategoryItems reflects it,
 *  3. renderCategory HTML data-manage-for order matches,
 *  4. sanitize round-trip preserves the override.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { moveItem, visibleCategoryItems } from '../js/services/contentPrefs.js';
import { renderCategory } from '../js/views/category.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../js/core/config.js';
import { normalizeDocument } from '../js/core/schema.js';

const customDoc = normalizeDocument({
  metadata: {
    id: 'lib-custom-1',
    name: { en: 'My Duas', ar: 'أدعيتي' },
    description: { en: 'Custom', ar: 'مخصص' },
    version: '1.0.0',
  },
  categories: [
    {
      id: 'cat-a',
      name: { en: 'Morning', ar: 'صباح' },
      order: 1,
      items: [
        {
          id: 'usr-1',
          title: { en: 'One', ar: 'واحد' },
          arabic: 'وَاحِد',
          order: 1,
          repetitions: 3,
        },
        {
          id: 'usr-2',
          title: { en: 'Two', ar: 'اثنان' },
          arabic: 'اثْنَان',
          order: 2,
          repetitions: 3,
        },
      ],
    },
    {
      id: 'cat-b',
      name: { en: 'Evening', ar: 'مساء' },
      order: 2,
      items: [],
    },
  ],
});

function state(prefs = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, contentPrefs: prefs },
    library: {
      documents: {},
      order: [],
      itemIndex: {},
      raw: { documents: {}, order: [] },
    },
    customContent: { 'lib-custom-1': customDoc },
    activeView: 'category',
    activeParams: { id: 'cat-a' },
    favorites: [],
    collections: [],
    counters: {},
    speakingItemId: null,
    ui: { contentManage: true },
  };
}

describe('OPEN-ISSUES #10: custom library card-level reorder', () => {
  test('moveItem updates orderOverrides for the custom cat', () => {
    const after = moveItem(state(), 'cat-a', 'usr-2', -1);
    assert.deepEqual(after.orderOverrides['cat-a'], ['usr-2', 'usr-1']);
  });

  test('visibleCategoryItems reflects the custom reorder', () => {
    const s = state();
    const after = moveItem(s, 'cat-a', 'usr-2', -1);
    const cat = s.customContent['lib-custom-1'].categories.find((c) => c.id === 'cat-a');
    const ids = visibleCategoryItems(
      { ...s, settings: { ...s.settings, contentPrefs: after } },
      cat
    ).map((it) => it.id);
    assert.deepEqual(ids, ['usr-2', 'usr-1']);
  });

  test('renderCategory HTML data-manage-for order matches the override', () => {
    const s = state({ orderOverrides: { 'cat-a': ['usr-2', 'usr-1'] } });
    const html = renderCategory(s);
    const manageOrder = [...html.matchAll(/data-manage-for="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(manageOrder, ['usr-2', 'usr-1']);
    // cards themselves render in the same order
    const cardOrder = [...html.matchAll(/data-item-id="(usr-[12])"/g)].map((m) => m[1]);
    assert.ok(cardOrder.length >= 2, 'expected both custom cards in the HTML');
    assert.equal(cardOrder.indexOf('usr-2') < cardOrder.indexOf('usr-1'), true);
  });

  test('sanitize round-trip preserves the custom order override', () => {
    const prefs = { orderOverrides: { 'cat-a': ['usr-2', 'usr-1'] } };
    const clean = sanitizeSettings({ ...DEFAULT_SETTINGS, contentPrefs: prefs }).contentPrefs;
    assert.deepEqual(clean.orderOverrides['cat-a'], ['usr-2', 'usr-1']);
    // and the sanitized prefs still drive the reader
    const s = state(clean);
    const cat = s.customContent['lib-custom-1'].categories.find((c) => c.id === 'cat-a');
    assert.deepEqual(
      visibleCategoryItems(s, cat).map((it) => it.id),
      ['usr-2', 'usr-1']
    );
  });
});
