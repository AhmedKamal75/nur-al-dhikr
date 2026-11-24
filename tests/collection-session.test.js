import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectionSessionEntries,
  collectionSessionStart,
  resolveFocusQueue,
  focusRoute,
  focusExitRoute,
} from '../js/services/focusQueue.js';
import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';

function fixture() {
  const a = { id: 'a', repetitions: 1 };
  const b = { id: 'b', repetitions: 1 };
  const c = { id: 'c', repetitions: 1 };
  const x = { id: 'x', items: [a, c] };
  const y = { id: 'y', items: [b] };
  const state = initialState();
  state.library = {
    documents: { d: { categories: [x, y] } },
    itemIndex: {
      a: { item: a, category: x },
      b: { item: b, category: y },
      c: { item: c, category: x },
    },
  };
  state.collections = [{ id: 'col', name: { en: 'Mine', ar: 'مجموعتي' }, items: ['c', 'b', 'a'] }];
  state.activeParams = { id: 'x', subId: 'c', collection: 'col' };
  return state;
}

test('collection queue preserves saved order across categories and ignores category order', () => {
  const state = fixture();
  state.settings.contentPrefs = { orderOverrides: { x: ['a', 'c'] } };
  assert.deepEqual(
    collectionSessionEntries(state, state.collections[0]).map((e) => e.item.id),
    ['c', 'b', 'a']
  );
  const queue = resolveFocusQueue(state);
  assert.equal(queue.idx, 0);
  assert.deepEqual(focusRoute(state.library.itemIndex.b, 'col'), {
    id: 'y',
    subId: 'b',
    collection: 'col',
  });
  assert.deepEqual(focusExitRoute(state), { view: 'collection', params: { id: 'col' } });
});

test('navigation persists an independent bookmark by identity, even after reorder', () => {
  let state = fixture();
  state = reduce(state, {
    type: 'NAVIGATE',
    view: 'focus',
    params: { id: 'y', subId: 'b', collection: 'col' },
  });
  assert.equal(state.collections[0].sessionItemId, 'b');
  state.collections[0] = { ...state.collections[0], items: ['b', 'a', 'c'] };
  assert.equal(collectionSessionStart(state, state.collections[0]).item.id, 'b');
  state = reduce(state, { type: 'NAVIGATE', view: 'focus', params: { id: 'x', subId: 'a' } });
  assert.equal(state.collections[0].sessionItemId, 'b');
  const restored = sanitizeRestoredPayload({ collections: state.collections });
  assert.equal(restored.collections[0].sessionItemId, 'b');
});

test('missing, duplicate and hidden entries are skipped; removed bookmark falls back honestly', () => {
  const state = fixture();
  state.collections[0] = {
    ...state.collections[0],
    items: ['ghost', 'c', 'c', 'b', 'a'],
    sessionItemId: 'c',
  };
  state.settings.contentPrefs = { hiddenItems: { c: true } };
  assert.deepEqual(
    collectionSessionEntries(state, state.collections[0]).map((e) => e.item.id),
    ['b', 'a']
  );
  assert.equal(collectionSessionStart(state, state.collections[0]).item.id, 'b');
  assert.equal(resolveFocusQueue(state).item.id, 'b');
  state.collections[0].items = ['a'];
  assert.equal(resolveFocusQueue(state).item.id, 'a');
});

test('deleted or empty collection never leaks into the category queue', () => {
  const state = fixture();
  state.collections = [];
  assert.equal(resolveFocusQueue(state).item, null);
  state.collections = [{ id: 'col', items: [] }];
  assert.equal(resolveFocusQueue(state).item, null);
  assert.equal(collectionSessionStart(state, state.collections[0]), null);
});

test('normal category focus and exit remain unchanged', () => {
  const state = fixture();
  state.activeParams = { id: 'x', subId: 'a' };
  const queue = resolveFocusQueue(state);
  assert.deepEqual(
    queue.items.map((i) => i.id),
    ['a', 'c']
  );
  assert.equal(queue.idx, 0);
  assert.deepEqual(focusExitRoute(state), { view: 'category', params: { id: 'x' } });
});

test('beginning navigation changes only route and collection position, not progress', async () => {
  const { renderCollection } = await import('../js/views/collection.js');
  const state = fixture();
  state.activeParams = { id: 'col', q: 'no matching title' };
  state.collections[0].sessionItemId = 'b';
  state.counters = { c: { count: 3, target: 7, completedCycles: 4, lastUpdated: 12 } };
  state.statistics.dailyHistory = { '2026-11-24': { recitations: 5, sessions: 2, itemIds: ['c'] } };
  state.history = [{ itemId: 'b', categoryId: 'y', ts: 123 }];
  const before = structuredClone(state);
  assert.match(renderCollection(state), /data-action="collection-session-beginning"/);
  const first = collectionSessionEntries(state, state.collections[0])[0];
  const next = reduce(state, { type: 'NAVIGATE', view: 'focus', params: focusRoute(first, 'col') });
  assert.equal(next.collections[0].sessionItemId, 'c');
  assert.deepEqual(next, {
    ...before,
    ui: { contentManage: false },
    activeView: 'focus',
    activeParams: focusRoute(first, 'col'),
    collections: [{ ...before.collections[0], sessionItemId: 'c' }],
  });
  assert.equal(collectionSessionStart(next, next.collections[0]).item.id, 'c');
  assert.doesNotMatch(
    renderCollection({ ...next, activeParams: { id: 'col' } }),
    /data-action="collection-session-beginning"/
  );
});

for (const [label, prefs] of Object.entries({
  hiddenItem: { hiddenItems: { c: true } },
  deletedItem: { deletedItems: { c: true } },
  hiddenCategory: { hiddenCategories: { x: true } },
  deletedCategory: { deletedCategories: { x: true } },
  hiddenLibrary: { hiddenLibraries: { dx: true } },
  deletedLibrary: { deletedLibraries: { dx: true } },
})) {
  test(`beginning skips missing, duplicate and ${label} entries in saved order`, () => {
    const state = fixture();
    for (const id of ['a', 'c']) state.library.itemIndex[id].document = { metadata: { id: 'dx' } };
    state.collections[0].items = ['ghost', 'c', 'c', 'b', 'a'];
    state.settings.contentPrefs = prefs;
    assert.equal(collectionSessionEntries(state, state.collections[0])[0].item.id, 'b');
    state.collections[0].sessionItemId = 'ghost';
    assert.equal(collectionSessionStart(state, state.collections[0]).item.id, 'b');
    state.collections[0].items = ['a', 'b', 'c'];
    const first = collectionSessionEntries(state, state.collections[0])[0];
    assert.equal(first.item.id, label.endsWith('Item') ? 'a' : 'b');
    state.settings.contentPrefs = { hiddenItems: { a: true, b: true, c: true } };
    assert.equal(collectionSessionEntries(state, state.collections[0])[0], undefined);
    assert.equal(collectionSessionStart(state, state.collections[0]), null);
  });
}

test('beginning action is absent for stale bookmarks at first entry and all-ineligible queues', async () => {
  const { renderCollection } = await import('../js/views/collection.js');
  const state = fixture();
  state.activeParams = { id: 'col' };
  state.collections[0].sessionItemId = 'missing';
  assert.doesNotMatch(renderCollection(state), /data-action="collection-session-beginning"/);
  state.settings.contentPrefs = { hiddenCategories: { x: true, y: true } };
  assert.doesNotMatch(
    renderCollection(state),
    /data-action="collection-session-(?:beginning|start)"/
  );
});
