import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../js/core/state/initial.js';
import {
  collectionSessionEntries,
  collectionReadableCount,
  resolveFocusQueue,
} from '../js/services/focusQueue.js';
import { renderCollection } from '../js/views/collection.js';
import { renderCollections } from '../js/views/collections.js';
import { renderHome } from '../js/views/home.js';

function fixture(lang = 'en') {
  const state = initialState();
  state.settings.language = lang;
  state.settings.hiddenHome = {};
  state.settings.homeOrder = ['collections'];
  const a = { id: 'a', title: { en: 'Alpha', ar: 'ألف' }, arabic: 'نص', repetitions: 1 };
  const b = { id: 'b', title: { en: 'Beta', ar: 'باء' }, arabic: 'نص', repetitions: 1 };
  const x = { id: 'x', items: [a], name: { en: 'X', ar: 'س' } };
  const y = { id: 'y', items: [b], name: { en: 'Y', ar: 'ص' } };
  const dx = { metadata: { id: 'dx' }, categories: [x] },
    dy = { metadata: { id: 'dy' }, categories: [y] };
  state.library = {
    documents: { dx, dy },
    order: ['dx', 'dy'],
    itemIndex: {
      a: { item: a, category: x, document: dx },
      b: { item: b, category: y, document: dy },
    },
  };
  state.collections = [
    {
      id: 'col',
      name: { en: 'Mine', ar: 'مجموعتي' },
      items: ['missing', 'a', 'a', 'b'],
      createdAt: 1,
    },
  ];
  state.activeParams = { id: 'col' };
  return state;
}

for (const lang of ['en', 'ar']) {
  for (const [key, id] of [
    ['hiddenItems', 'a'],
    ['deletedItems', 'a'],
    ['hiddenCategories', 'x'],
    ['deletedCategories', 'x'],
    ['hiddenLibraries', 'dx'],
    ['deletedLibraries', 'dx'],
  ]) {
    test(`${lang}: ${key} counts agree across Home, tiles, detail and Focus, restore keeps order`, () => {
      const state = fixture(lang),
        col = state.collections[0];
      const original = structuredClone(col.items);
      const pin = (n) => {
        assert.equal(collectionReadableCount(state, col), n);
        assert.equal(collectionSessionEntries(state, col).length, n);
        assert.equal(
          resolveFocusQueue({ ...state, activeParams: { collection: 'col', subId: 'a' } }).items
            .length,
          n
        );
        const home = renderHome(state),
          tiles = renderCollections(state),
          detail = renderCollection(state);
        assert.match(home, new RegExp(`chip--collection[^]*?chip__count">${n}</span>`));
        assert.match(tiles, new RegExp(`collection-tile__count">${n} `));
        assert.match(detail, new RegExp(`view__meta">${n} `));
        assert.deepEqual(col.items, original);
      };
      pin(2);
      state.settings.contentPrefs = { [key]: { [id]: true } };
      pin(1);
      state.activeParams.q = 'Alpha';
      assert.match(renderCollection(state), lang === 'en' ? /0 of 1 items/ : /0 من 1 عناصر/);
      delete state.activeParams.q;
      state.settings.contentPrefs.hiddenItems = { a: true, b: true };
      pin(0);
      state.settings.contentPrefs = {};
      pin(2);
      state.activeParams.q = 'Alpha';
      assert.match(renderCollection(state), lang === 'en' ? /1 of 2 items/ : /1 من 2 عناصر/);
      assert.equal(collectionReadableCount(state, col), 2);
      assert.deepEqual(col.items, original);
    });
  }
}
