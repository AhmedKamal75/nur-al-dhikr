/**
 * mushaf-session.test.js — v5.2.9: the last multi-owner transients live
 * in state.mushafSession (bookmark folder filter, study tafsir tab):
 * sanitized at the reducer boundary, invisible to persistence, read by
 * pure views.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { actions, store, PERSISTED_KEYS } from '../js/core/state.js';
import { initialState } from '../js/core/state/initial.js';
import { buildMushafBookmarks } from '../js/views/mushafBookmarks.js';

test('session: fresh state carries the defaults', () => {
  assert.deepEqual(initialState().mushafSession, {
    bookmarkFilter: '__all__',
    tafsirTab: null,
  });
});

test('session: stays ephemeral (never persisted, never restored)', () => {
  assert.ok(!PERSISTED_KEYS.includes('mushafSession'), 'mushafSession must stay ephemeral');
});

test('session: sets, sanitizes hostile payloads, no-ops by reference', () => {
  const before = store.getState();
  store.dispatch(actions.setMushafSession({ bookmarkFilter: 'f1', tafsirTab: 'ibn-kathir' }));
  assert.deepEqual(store.getState().mushafSession, {
    bookmarkFilter: 'f1',
    tafsirTab: 'ibn-kathir',
  });
  // Hostile shapes coerce to defaults, extra keys dropped.
  store.dispatch(
    actions.setMushafSession({ bookmarkFilter: 42, tafsirTab: 'x'.repeat(100), nope: 1 })
  );
  assert.deepEqual(store.getState().mushafSession, {
    bookmarkFilter: '__all__',
    tafsirTab: null,
  });
  // Redundant set returns state by reference (no notify, no persist).
  const s = store.getState();
  store.dispatch(actions.setMushafSession({ bookmarkFilter: '__all__' }));
  assert.equal(store.getState(), s);
  void before;
});

function bookmarkState(filter) {
  const s = initialState();
  s.settings.language = 'en';
  s.ayahBookmarkFolders = [{ id: 'f1', name: 'F1' }];
  s.ayahBookmarks = [
    { key: '2:255', page: 10, surah: 2, ayah: 255, note: '', folderId: 'f1' },
    { key: '112:1', page: 20, surah: 112, ayah: 1, note: '', folderId: null },
  ];
  s.mushafSession = { bookmarkFilter: filter, tafsirTab: null };
  return s;
}

test('session: bookmarks view follows the session filter', () => {
  const unfiled = buildMushafBookmarks(bookmarkState('__unfiled__'));
  assert.ok(unfiled.includes('112:1') && !unfiled.includes('2:255'));
  const folder = buildMushafBookmarks(bookmarkState('f1'));
  assert.ok(folder.includes('2:255') && !folder.includes('112:1'));
});

test('session: deleted folder corrects read-only (B12, no write-back)', () => {
  const s = bookmarkState('gone');
  const html = buildMushafBookmarks(s);
  assert.ok(html.includes('2:255') && html.includes('112:1'), 'falls back to all');
  assert.equal(s.mushafSession.bookmarkFilter, 'gone', 'render does not mutate state');
});
