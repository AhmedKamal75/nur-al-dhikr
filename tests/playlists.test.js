/**
 * tests/playlists.test.js — recitation queues: the reducer contract
 * (create/rename/delete/add/remove with hostile-shape guards) + the
 * restore sanitizer boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';

describe('PLAYLIST_*', () => {
  test('creates, renames, adds, removes, deletes', () => {
    let s = { ...initialState(), playlists: [] };
    s = reduce(s, actions.createPlaylist('morning', 'Morning'));
    assert.equal(s.playlists.length, 1);
    s = reduce(s, actions.addPlaylistItem('morning', { surah: 112, from: 1, to: 4 }));
    s = reduce(s, actions.addPlaylistItem('morning', { surah: 113, from: 1, to: 'x' }));
    assert.deepEqual(s.playlists[0].items, [
      { surah: 112, from: 1, to: 4 },
      { surah: 113, from: 1, to: null },
    ]);
    s = reduce(s, actions.renamePlaylist('morning', 'Evening'));
    assert.equal(s.playlists[0].name, 'Evening');
    s = reduce(s, actions.removePlaylistItem('morning', 0));
    assert.equal(s.playlists[0].items.length, 1);
    s = reduce(s, actions.deletePlaylist('morning'));
    assert.deepEqual(s.playlists, []);
  });

  test('drops hostile shapes, dupes, and over-capacity', () => {
    let s = { ...initialState(), playlists: [] };
    s = reduce(s, actions.createPlaylist('__proto__', 'evil'));
    assert.deepEqual(s.playlists, [], 'unsafe id refused');
    s = reduce(s, actions.createPlaylist('q', '  '));
    assert.equal(s.playlists[0].name, 'Queue', 'blank name falls back');
    s = reduce(s, actions.createPlaylist('q', 'dupe'));
    assert.equal(s.playlists.length, 1, 'duplicate id refused');
    s = reduce(s, actions.addPlaylistItem('q', { surah: 999, from: 1 }));
    s = reduce(s, actions.addPlaylistItem('q', 'junk'));
    s = reduce(s, actions.addPlaylistItem('nope', { surah: 1, from: 1 }));
    assert.deepEqual(s.playlists[0].items, [], 'bad items refused');
    s = reduce(s, actions.removePlaylistItem('q', 7));
    assert.equal(s.playlists[0].items.length, 0, 'bad index no-op');
    s = reduce(s, actions.renamePlaylist('q', ''));
    assert.equal(s.playlists[0].name, 'Queue', 'blank rename refused');
    assert.ok(PERSISTED_KEYS.includes('playlists'));
  });
});

describe('restore sanitizer', () => {
  test('keeps valid queues, drops hostile ones, caps counts', () => {
    const out = sanitizeRestoredPayload({
      playlists: [
        { id: 'a', name: 'A', items: [{ surah: 2, from: 255, to: 255 }], createdAt: 1 },
        { id: '__proto__', name: 'evil', items: [] },
        { id: 'b', name: 'x'.repeat(500), items: [{ surah: 0, from: -3 }] },
        'junk',
        null,
      ],
    });
    assert.equal(out.playlists.length, 2);
    assert.equal(out.playlists[1].name.length, 80, 'name capped');
    assert.deepEqual(out.playlists[1].items, [], 'bad range dropped');
    assert.equal({}.polluted, undefined, 'no prototype pollution');
    const big = Array.from({ length: 60 }, (_, i) => ({ id: `q${i}`, name: 'n', items: [] }));
    assert.equal(sanitizeRestoredPayload({ playlists: big }).playlists.length, 50);
  });
});
