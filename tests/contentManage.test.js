/**
 * tests/contentManage.test.js — v4.5.2, the in-place content manage layer.
 * The prefs lens (ordering math, hide, targets), the reducer contract
 * (manage mode is transient + dies on navigation), the sanitizer (hostile
 * backups drop), and the view wiring (manage rows render, hidden items
 * vanish from the card list but count in the unhide bar, focus follows
 * the lens, I6 survives — the card body stays the count target).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  visibleCategoryItems,
  hiddenCategoryItems,
  isCategoryHidden,
  itemTargetOf,
  moveItem,
  setItemHidden,
  setItemTarget,
  setCategoryHidden,
} from '../js/services/contentPrefs.js';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { renderCategory } from '../js/views/category.js';
import { renderLibrary } from '../js/views/library.js';
import { renderFocus } from '../js/views/focus.js';
import { processDocument } from '../js/core/schema.js';

const ROOT = join(import.meta.dirname, '..');
const adhkar = processDocument(
  JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
).value;
const morning = adhkar.categories.find((c) => c.id === 'morning');

const lensState = (prefs) => ({
  settings: { ...DEFAULT_SETTINGS, contentPrefs: prefs },
  library: { documents: { adhkar }, order: ['adhkar'], itemIndex: {} },
  customContent: {},
});

describe('the contentPrefs lens (pure ordering/hide/target math)', () => {
  test('no prefs: canonical order and full visibility', () => {
    const items = visibleCategoryItems(lensState({}), morning);
    assert.equal(items.length, morning.items.length);
    assert.deepEqual(
      items.map((i) => i.id),
      [...morning.items].sort((a, b) => a.order - b.order).map((i) => i.id)
    );
  });

  test('an order override ranks its items first, newcomers keep natural order', () => {
    const ids = morning.items.map((i) => i.id);
    const prefs = { orderOverrides: { morning: [ids[5], ids[2]] } };
    const out = visibleCategoryItems(lensState(prefs), morning).map((i) => i.id);
    assert.equal(out[0], ids[5]);
    assert.equal(out[1], ids[2]);
    // everyone else follows in natural order
    assert.deepEqual(
      out.slice(2),
      ids.filter((id) => id !== ids[5] && id !== ids[2])
    );
  });

  test('hidden items are filtered out and reported by hiddenCategoryItems', () => {
    const ids = morning.items.map((i) => i.id);
    const state = lensState({ hiddenItems: { [ids[0]]: true, [ids[1]]: true } });
    const visible = visibleCategoryItems(state, morning);
    assert.equal(visible.length, morning.items.length - 2);
    assert.equal(hiddenCategoryItems(state, morning).length, 2);
  });

  test('moveItem swaps within the visible order and is a no-op at the edges', () => {
    // the CANONICAL order is the `order`-sorted one, not the raw array
    const ids = visibleCategoryItems(lensState({}), morning).map((i) => i.id);
    let prefs = moveItem(lensState({}), 'morning', ids[0], 1); // down
    assert.deepEqual(prefs.orderOverrides.morning, [ids[1], ids[0], ...ids.slice(2)]);
    // ids[0] now sits at slot 1 — moving IT back up restores the canon
    prefs = moveItem(lensState({ orderOverrides: prefs.orderOverrides }), 'morning', ids[0], -1);
    assert.deepEqual(prefs.orderOverrides.morning, ids); // back to canon
    const edge = moveItem(lensState({}), 'morning', ids[0], -1); // up from top
    assert.deepEqual(edge, {});
  });

  test('itemTargetOf: override wins, clamped sane, falls back to repetitions', () => {
    const item = { id: 'x', repetitions: 33 };
    assert.equal(itemTargetOf(lensState({ targetOverrides: { x: 100 } }), item), 100);
    assert.equal(itemTargetOf(lensState({}), item), 33);
    assert.equal(itemTargetOf(lensState({ targetOverrides: { x: -4 } }), item), 33);
    assert.equal(itemTargetOf(lensState({ targetOverrides: { x: '7' } }), item), 7);
  });

  test('section hide round-trips', () => {
    let prefs = setCategoryHidden(lensState({}), 'sleep', true);
    assert.ok(isCategoryHidden(lensState(prefs), 'sleep'));
    prefs = setCategoryHidden(lensState(prefs), 'sleep', false);
    assert.ok(!isCategoryHidden(lensState(prefs), 'sleep'));
  });
});

describe('manage-mode state contract', () => {
  const base = {
    ui: { contentManage: false },
    settings: clone(DEFAULT_SETTINGS),
  };

  test('CONTENT_MANAGE_TOGGLE flips; NAVIGATE resets it (modes die with routes)', () => {
    const on = reduce(base, { type: 'CONTENT_MANAGE_TOGGLE' });
    assert.equal(on.ui.contentManage, true);
    const off = reduce(on, { type: 'CONTENT_MANAGE_TOGGLE' });
    assert.equal(off.ui.contentManage, false);
    const navigated = reduce(
      { ...on, activeView: 'category', mushafFullscreen: false, readerImmersive: false },
      { type: 'NAVIGATE', view: 'library', params: {} }
    );
    assert.equal(navigated.ui.contentManage, false, 'manage mode must not survive navigation');
  });

  test('sanitizeSettings: hostile contentPrefs drop silently, valid ones survive', () => {
    const hostile = {
      ...DEFAULT_SETTINGS,
      contentPrefs: {
        hiddenItems: { 'adh-mor-001': true, '<script>': true, 'ok-but-flag': 'yes-not-true' },
        targetOverrides: { 'adh-mor-001': 99, bad: 'alert(1)', neg: -5 },
        orderOverrides: { morning: ['adh-mor-003', 42, { x: 1 }, 'not<safe'] },
        hiddenCategories: { sleep: true },
      },
    };
    const clean = sanitizeSettings(hostile).contentPrefs;
    assert.deepEqual(clean.hiddenItems, { 'adh-mor-001': true });
    assert.deepEqual(clean.targetOverrides, { 'adh-mor-001': 99 });
    assert.deepEqual(clean.orderOverrides, { morning: ['adh-mor-003'] });
    assert.deepEqual(clean.hiddenCategories, { sleep: true });
    // absent prefs degrade to the empty lens
    assert.deepEqual(sanitizeSettings({}).contentPrefs, DEFAULT_SETTINGS.contentPrefs);
  });
});

describe('the views render the lens', () => {
  const stateWith = (prefs, extra = {}) => ({
    ...lensState(prefs),
    activeView: 'category',
    activeParams: { id: 'morning' },
    favorites: [],
    collections: [],
    counters: {},
    speakingItemId: null,
    ui: { contentManage: false },
    ...extra,
  });

  test('category: hidden items vanish; manage mode adds rows + unhide bar; I6 intact', () => {
    const ids = morning.items.map((i) => i.id);
    const hidden = { [ids[0]]: true, [ids[2]]: true };
    const normal = renderCategory(stateWith({ hiddenItems: hidden }));
    // the unhide-bar chip legitimately carries the id — assert the CARD
    // (the article) is absent, not the raw string.
    assert.ok(
      !new RegExp(`class="card[^>]*data-item-id="${ids[0]}"`).test(normal),
      'hidden item has no card'
    );
    assert.equal((normal.match(/<article class="card/g) || []).length, morning.items.length - 2);
    assert.ok(!normal.includes('manage-row'), 'no manage rows when off');
    // (APP-FLOW I6) the card body stays the count target even hidden-check
    assert.match(normal, /<article class="card [^>]*data-action="counter-tap"/);

    const manageOn = renderCategory(
      stateWith({ hiddenItems: hidden }, { ui: { contentManage: true } })
    );
    assert.match(manageOn, /data-action="content-manage-toggle"/);
    assert.match(manageOn, /data-action="content-move-item"/);
    assert.match(manageOn, /data-action="content-set-target"/);
    assert.match(manageOn, /data-action="content-hide-item"/);
    assert.match(manageOn, /data-action="content-unhide-item"/);
    assert.match(manageOn, /data-action="content-reset-category"/);
    assert.ok(manageOn.includes('unhide-bar'), 'the unhide bar lists hidden items');
    // builtin sections never offer editor edit/delete
    assert.ok(!manageOn.includes('data-action="editor-delete-item"'));
    // the count line reads VISIBLE items
    assert.match(manageOn, new RegExp(`${morning.items.length - 2} items`));
  });

  test('library: manage toggle, hidden sections filtered, unhide chips in manage mode', () => {
    const normal = renderLibrary(stateWith({ hiddenCategories: { sleep: true } }));
    assert.ok(!normal.includes('data-id="sleep"'), 'hidden section filtered');
    const manageOn = renderLibrary(
      stateWith({ hiddenCategories: { sleep: true } }, { ui: { contentManage: true } })
    );
    assert.match(manageOn, /data-action="content-manage-toggle"/);
    assert.match(manageOn, /data-action="content-hide-category"/);
    assert.match(manageOn, /data-action="content-unhide-category"/);
    assert.ok(
      manageOn.includes('data-id="sleep"'),
      'manage mode reveals hidden section for unhide'
    );
  });

  test('focus: follows the lens (hidden skipped, target overridden)', () => {
    const ids = morning.items.map((i) => i.id);
    const state = stateWith({
      hiddenItems: { [ids[0]]: true },
      targetOverrides: { [ids[1]]: 100 },
    });
    // ids[1] is now the FIRST visible item; open focus on it
    const html = renderFocus({ ...state, activeParams: { id: 'morning', subId: ids[1] } });
    assert.match(html, new RegExp(`data-target="100"`));
    assert.match(html, /1 \/ \d+/);
    // opening focus on the hidden item falls to the not-found state
    const nf = renderFocus({ ...state, activeParams: { id: 'morning', subId: ids[0] } });
    assert.match(nf, /notFound|empty-hint/);
  });
});

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
