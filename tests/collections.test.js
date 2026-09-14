/**
 * tests/collections.test.js — item 7 (collections) gates:
 *  1. COLLECTION_MOVE_ITEM swaps neighbors; edges, unknown ids and
 *     hostile dirs no-op;
 *  2. COLLECTION_ADD_ITEMS appends missing ids in order (bulk favorites
 *     import), deduping existing entries and hostile payloads;
 *  3. COLLECTION_RENAME stores the name (wires the dead path);
 *  4. restore keeps {en,ar} object names (legacy strings still restore) —
 *     the old shape dropped object names to '';
 *  5. buildCollectionShareText numbers titles in the UI language (locale
 *     choke point), skipping dead ids, '' when nothing is shareable;
 *  6. the view renders rename/share/delete, bounded reorder controls
 *     (hidden while filtering), and the bulk button only with news;
 *  7. handlers + rename submit + EN/AR strings are wired.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { buildCollectionShareText, renderCollection } from '../js/views/collection.js';

const CAT = { id: 'morning', name: { en: 'Morning' }, color: 'emerald', icon: 'sun' };
const item = (id, en, ar) => ({
  item: { id, title: { en, ar }, arabic: 'نص', repetitions: 1 },
  category: CAT,
});

function colState(over = {}) {
  const s = initialState();
  return {
    ...s,
    settings: { ...s.settings, language: 'en' },
    collections: [
      { id: 'col1', name: { en: 'My list', ar: 'قائمتي' }, items: ['a', 'b', 'c'], createdAt: 1 },
    ],
    ...over,
  };
}

describe('COLLECTION_MOVE_ITEM: bounded neighbor swaps', () => {
  test('middle items swap both directions', () => {
    const down = reduce(colState(), actions.moveCollectionItem('col1', 'b', 1));
    assert.deepEqual(down.collections[0].items, ['a', 'c', 'b']);
    const up = reduce(colState(), actions.moveCollectionItem('col1', 'b', -1));
    assert.deepEqual(up.collections[0].items, ['b', 'a', 'c']);
  });

  test('edges, unknown ids and hostile dirs no-op', () => {
    const s0 = colState();
    assert.deepEqual(reduce(s0, actions.moveCollectionItem('col1', 'a', -1)).collections[0].items, [
      'a',
      'b',
      'c',
    ]);
    assert.deepEqual(reduce(s0, actions.moveCollectionItem('col1', 'c', 1)).collections[0].items, [
      'a',
      'b',
      'c',
    ]);
    assert.deepEqual(
      reduce(s0, actions.moveCollectionItem('col1', 'ghost', 1)).collections[0].items,
      ['a', 'b', 'c']
    );
    assert.deepEqual(
      reduce(s0, actions.moveCollectionItem('nope', 'a', 1)).collections,
      s0.collections
    );
    assert.deepEqual(
      reduce(s0, actions.moveCollectionItem('col1', 'b', 'x')).collections[0].items,
      ['a', 'b', 'c']
    );
    assert.deepEqual(reduce(s0, actions.moveCollectionItem('col1', 'b', 0)).collections[0].items, [
      'a',
      'b',
      'c',
    ]);
  });
});

describe('COLLECTION_ADD_ITEMS: ordered deduped bulk add', () => {
  test('appends missing ids in order, skips present ones', () => {
    const s = reduce(colState(), actions.addItemsToCollection('col1', ['c', 'd', 'e', 'd']));
    assert.deepEqual(s.collections[0].items, ['a', 'b', 'c', 'd', 'e']);
  });

  test('hostile payloads and unknown collections no-op', () => {
    const s0 = colState();
    assert.equal(reduce(s0, actions.addItemsToCollection('col1', [])), s0);
    assert.equal(reduce(s0, actions.addItemsToCollection('col1', 'x')), s0);
    assert.equal(reduce(s0, actions.addItemsToCollection('col1', [null, 42])), s0);
    assert.deepEqual(
      reduce(s0, actions.addItemsToCollection('nope', ['d'])).collections,
      s0.collections
    );
    // Nothing new: collection object untouched.
    const s = reduce(s0, actions.addItemsToCollection('col1', ['a', 'b']));
    assert.equal(s.collections[0], s0.collections[0]);
  });
});

describe('COLLECTION_RENAME: the dead path lives', () => {
  test('stores the new name object', () => {
    const s = reduce(colState(), actions.renameCollection('col1', { en: 'Evening', ar: 'مساء' }));
    assert.deepEqual(s.collections[0].name, { en: 'Evening', ar: 'مساء' });
    assert.deepEqual(s.collections[0].items, ['a', 'b', 'c']);
  });
});

describe('restore: collection names survive the round trip', () => {
  test('object names kept and capped; legacy strings kept; hostile blanked', () => {
    const out = sanitizeRestoredPayload({
      collections: [
        { id: 'c1', name: { en: 'List', ar: 'قائمة' }, items: ['a', 42, null] },
        { id: 'c2', name: 'Legacy name', items: [] },
        { id: 'c3', name: { en: 'x'.repeat(200), ar: null }, items: [] },
        { id: 'c4', name: 42, items: [] },
      ],
    });
    assert.deepEqual(out.collections[0].name, { en: 'List', ar: 'قائمة' });
    assert.deepEqual(out.collections[0].items, ['a']);
    assert.equal(out.collections[1].name, 'Legacy name');
    assert.equal(out.collections[2].name.en.length, 120);
    assert.equal(out.collections[2].name.ar, '');
    assert.equal(out.collections[3].name, '');
  });
});

describe('buildCollectionShareText: numbered titles, locale-correct', () => {
  const col = { id: 'col1', name: { en: 'My list', ar: 'قائمتي' }, items: ['a', 'b', 'ghost'] };
  const index = {
    a: item('a', 'Morning Dua', 'دعاء الصباح'),
    b: item('b', 'Evening Dua', 'دعاء المساء'),
  };

  test('EN and AR lines (no cross-language leakage)', () => {
    const en = buildCollectionShareText(col, index, 'en');
    assert.deepEqual(en.split('\n'), ['My list', '1. Morning Dua', '2. Evening Dua']);
    const ar = buildCollectionShareText(col, index, 'ar');
    assert.deepEqual(ar.split('\n'), ['قائمتي', '1. دعاء الصباح', '2. دعاء المساء']);
  });

  test('empty or hostile collections share nothing', () => {
    assert.equal(buildCollectionShareText({ items: [] }, index, 'en'), '');
    assert.equal(buildCollectionShareText(null, index, 'en'), '');
    assert.equal(buildCollectionShareText({ items: ['ghost'] }, index, 'en'), '');
  });
});

describe('collection view: manage controls', () => {
  function viewState(over = {}) {
    return {
      settings: { language: 'en', showTransliteration: true, showTranslation: true },
      activeParams: { id: 'col1' },
      collections: [
        { id: 'col1', name: { en: 'My list', ar: 'قائمتي' }, items: ['a', 'b'], createdAt: 1 },
      ],
      library: {
        itemIndex: {
          a: item('a', 'Morning Dua', 'دعاء الصباح'),
          b: item('b', 'Evening Dua', 'دعاء المساء'),
          c: item('c', 'Night Dua', 'دعاء الليل'),
        },
      },
      favorites: [],
      speakingItemId: null,
      counters: {},
      ...over,
    };
  }

  test('header carries rename, share and delete', () => {
    const html = renderCollection(viewState());
    assert.ok(html.includes('data-action="rename-collection"'), 'rename control');
    assert.ok(html.includes('data-action="share-collection"'), 'share control');
    assert.ok(html.includes('data-action="delete-collection"'), 'delete control');
    assert.ok(html.includes('My list'), 'name renders');
  });

  test('reorder controls bound the list and hide while filtering', () => {
    const html = renderCollection(viewState());
    assert.ok(html.includes('data-action="collection-move"'), 'move controls render');
    assert.ok(html.includes('data-dir="-1" disabled'), 'first item cannot move up');
    assert.ok(html.includes('data-dir="1" disabled'), 'last item cannot move down');
    const filtered = renderCollection(viewState({ activeParams: { id: 'col1', q: 'Morning' } }));
    assert.ok(!filtered.includes('data-action="collection-move"'), 'no reorder while filtering');
    assert.ok(!filtered.includes('collection-row__order'), 'no order chrome while filtering');
  });

  test('bulk button shows only with missing favorites', () => {
    const none = renderCollection(viewState());
    assert.ok(!none.includes('data-action="collection-add-favorites"'), 'hidden when nothing new');
    const some = renderCollection(viewState({ favorites: ['b', 'c'] }));
    assert.ok(some.includes('data-action="collection-add-favorites"'), 'bulk control renders');
    assert.ok(some.includes('(1)'), 'counts only the missing favorite');
    const all = renderCollection(viewState({ favorites: ['a', 'b'] }));
    assert.ok(!all.includes('data-action="collection-add-favorites"'), 'hidden when all present');
  });

  test('unknown collection renders the not-found state', () => {
    const html = renderCollection(viewState({ activeParams: { id: 'nope' } }));
    assert.ok(!html.includes('data-action="rename-collection"'), 'no controls for ghosts');
  });
});

describe('collection wiring: handlers, submit, strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/items.js', import.meta.url), 'utf8');
  const forms = readFileSync(new URL('../js/app/forms.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('all four actions are registered', () => {
    for (const key of [
      'rename-collection',
      'share-collection',
      'collection-move',
      'collection-add-favorites',
    ]) {
      assert.ok(handlers.includes(`'${key}'`), `handler missing: ${key}`);
    }
    assert.ok(forms.includes("'submit-rename-collection'"), 'rename submit missing');
  });

  test('collection strings ship EN + AR', () => {
    for (const key of [
      'collections.rename',
      'collections.share',
      'collections.addFavorites',
      'collections.shareEmpty',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
