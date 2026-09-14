/**
 * tests/favorites.test.js — item 8 (favorites bulk) gates:
 *  1. favoriteSortFor resolves valid sorts, hostile ones fall back;
 *  2. sortFavorites orders recent (newest first), alpha (EN + AR locale
 *     titles) and most-read (all-time counts, ties keep favorited order);
 *  3. FAVORITE_CLEAR empties; the move flow (add + unfavorite) relocates;
 *  4. buildMovePicker lists single-destination buttons (present items
 *     disabled), an empty hint and a create path;
 *  5. the view renders sort control (q-preserving), per-row move buttons
 *     and a guarded unfavorite-all;
 *  6. handlers + move submit + EN/AR strings are wired.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { buildMovePicker } from '../js/ui/menus.js';
import {
  FAVORITE_SORTS,
  favoriteSortFor,
  sortFavorites,
  renderFavorites,
} from '../js/views/favorites.js';

const CAT = { id: 'morning', name: { en: 'Morning' }, color: 'emerald', icon: 'sun' };
const entry = (id, en, ar) => ({
  item: { id, title: { en, ar }, arabic: 'نص', repetitions: 1 },
  category: CAT,
});
const ENTRIES = [
  entry('a', 'Zebra Dua', 'دعاء'),
  entry('b', 'Apple Dua', 'ذكر'),
  entry('c', 'Mango Dua', 'ورد'),
];

const STATS = {
  dailyHistory: {
    '2026-05-10': { recitations: 5, itemIds: ['a', 'a', 'b'] },
    '2026-05-09': { recitations: 2, itemIds: ['a', 'c'] },
  },
};

describe('favoriteSortFor: valid sorts only', () => {
  test('resolves and falls back', () => {
    assert.deepEqual(FAVORITE_SORTS, ['recent', 'alpha', 'read']);
    assert.equal(favoriteSortFor({ sort: 'alpha' }), 'alpha');
    assert.equal(favoriteSortFor({ sort: 'read' }), 'read');
    assert.equal(favoriteSortFor({ sort: 'bogus' }), 'recent');
    assert.equal(favoriteSortFor({}), 'recent');
    assert.equal(favoriteSortFor(null), 'recent');
  });
});

describe('sortFavorites: three honest orders', () => {
  test('recent is newest-favorited first', () => {
    assert.deepEqual(
      sortFavorites(ENTRIES, 'recent', 'en', STATS).map((e) => e.item.id),
      ['c', 'b', 'a']
    );
  });

  test('alpha follows the UI locale', () => {
    assert.deepEqual(
      sortFavorites(ENTRIES, 'alpha', 'en', STATS).map((e) => e.item.id),
      ['b', 'c', 'a']
    );
    const ar = sortFavorites(ENTRIES, 'alpha', 'ar', STATS).map((e) => e.item.id);
    assert.deepEqual([...ar].sort(), ['a', 'b', 'c'], 'same members, locale order');
    assert.notDeepEqual(ar, ['b', 'c', 'a'], 'Arabic order differs from English');
  });

  test('most-read counts all-time reads, ties keep favorited order', () => {
    assert.deepEqual(
      sortFavorites(ENTRIES, 'read', 'en', STATS).map((e) => e.item.id),
      ['a', 'b', 'c'] // 3, 1, 1 — b before c on the tie
    );
    assert.deepEqual(
      sortFavorites(ENTRIES, 'read', 'en', {}).map((e) => e.item.id),
      ['a', 'b', 'c'],
      'no history keeps favorited order'
    );
  });

  test('hostile input degrades to [] / recent', () => {
    assert.deepEqual(sortFavorites(null, 'alpha', 'en', STATS), []);
    assert.deepEqual(
      sortFavorites(ENTRIES, 'bogus', 'en', STATS).map((e) => e.item.id),
      ['c', 'b', 'a']
    );
  });
});

describe('favorites reducer: clear and move', () => {
  function favState() {
    const s = initialState();
    return {
      ...s,
      favorites: ['a', 'b'],
      collections: [{ id: 'col1', name: { en: 'List', ar: '' }, items: ['a'], createdAt: 1 }],
    };
  }

  test('FAVORITE_CLEAR empties the list', () => {
    assert.deepEqual(reduce(favState(), actions.clearFavorites()).favorites, []);
  });

  test('move = add to collection + unfavorite', () => {
    let s = reduce(favState(), actions.addToCollection('col1', 'b'));
    assert.deepEqual(s.collections[0].items, ['a', 'b']);
    s = reduce(s, actions.toggleFavorite('b'));
    assert.deepEqual(s.favorites, ['a']);
  });
});

describe('buildMovePicker: single-destination moves', () => {
  const pickerState = (collections) => ({ settings: { language: 'en' }, collections });

  test('one move button per collection, present items disabled', () => {
    const html = buildMovePicker(
      { id: 'b' },
      pickerState([
        { id: 'c1', name: { en: 'One', ar: '' }, items: ['a'] },
        { id: 'c2', name: { en: 'Two', ar: '' }, items: ['b'] },
      ])
    );
    assert.ok(html.includes('data-action="move-to-collection"'), 'move buttons render');
    assert.ok(html.includes('data-collection-id="c1"'), 'destination rides along');
    assert.ok(html.includes('data-item-id="b"'), 'item rides along');
    assert.ok(html.includes('Move to collection'), 'EN label');
    assert.equal(
      (html.match(/disabled/g) || []).length,
      1,
      'exactly the present collection is disabled'
    );
    assert.ok(
      html.split('data-collection-id="c2"')[1].startsWith(' data-item-id="b" disabled'),
      'the disabled button is the present collection'
    );
  });

  test('empty collections show the hint plus a create path', () => {
    const html = buildMovePicker({ id: 'b' }, pickerState([]));
    assert.ok(!html.includes('data-action="move-to-collection"'), 'no destinations');
    assert.ok(html.includes('data-action="create-collection-inline-move"'), 'create path renders');
  });

  test('Arabic labels render', () => {
    const html = buildMovePicker(
      { id: 'b' },
      {
        settings: { language: 'ar' },
        collections: [{ id: 'c1', name: { en: 'One', ar: 'واحد' }, items: [] }],
      }
    );
    assert.ok(html.includes('نقل إلى مجموعة'), 'AR move label');
    assert.ok(html.includes('واحد'), 'AR collection name');
  });
});

describe('favorites view: sort, move, clear', () => {
  function viewState(over = {}) {
    const index = {};
    for (const e of ENTRIES) index[e.item.id] = e;
    return {
      settings: { language: 'en', showTransliteration: true, showTranslation: true },
      activeParams: {},
      favorites: ['a', 'b', 'c'],
      library: { itemIndex: index },
      speakingItemId: null,
      counters: {},
      statistics: STATS,
      ...over,
    };
  }

  test('sort control renders three q-preserving options', () => {
    const html = renderFavorites(viewState({ activeParams: { sort: 'alpha', q: 'dua' } }));
    for (const s of ['recent', 'alpha', 'read']) {
      assert.ok(html.includes(`data-sort="${s}"`), `sort option: ${s}`);
    }
    assert.ok(html.includes('data-q="dua"'), 'filter survives sort switches');
    assert.ok(html.includes('aria-selected="true"'), 'selection marked');
  });

  test('unknown sort falls back to recent order', () => {
    const html = renderFavorites(viewState({ activeParams: { sort: 'bogus' } }));
    const order = [...html.matchAll(/data-action="open-move-picker" data-item-id="([abc])"/g)].map(
      (m) => m[1]
    );
    // Move buttons ride above each card in row order: c, b, a (recent).
    assert.deepEqual(order, ['c', 'b', 'a']);
  });

  test('every row carries a move opener; clear-all is guarded', () => {
    const html = renderFavorites(viewState());
    assert.equal((html.match(/data-action="open-move-picker"/g) || []).length, 3);
    assert.ok(html.includes('data-action="unfavorite-all"'), 'clear-all renders with favorites');
    const empty = renderFavorites(viewState({ favorites: [] }));
    assert.ok(!empty.includes('data-action="unfavorite-all"'), 'no clear-all when empty');
    assert.ok(!empty.includes('data-sort='), 'no sort control when empty');
  });
});

describe('favorites wiring: handlers, submit, strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/items.js', import.meta.url), 'utf8');
  const forms = readFileSync(new URL('../js/app/forms.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('all six actions are registered', () => {
    for (const key of [
      'favorites-sort',
      'open-move-picker',
      'move-to-collection',
      'create-collection-inline-move',
      'unfavorite-all',
      'confirm-unfavorite-all',
    ]) {
      assert.ok(handlers.includes(`'${key}'`), `handler missing: ${key}`);
    }
    assert.ok(forms.includes("'submit-new-collection-move'"), 'move submit missing');
  });

  test('favorites strings ship EN + AR', () => {
    for (const key of [
      'favorites.sortBy',
      'favorites.sortRecent',
      'favorites.sortAlpha',
      'favorites.moveTo',
      'favorites.unfavoriteAll',
      'favorites.clearConfirm',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
