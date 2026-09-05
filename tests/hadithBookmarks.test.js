/**
 * tests/hadithBookmarks.test.js — hadith bookmarks (v5.2.0): the reducer
 * toggle contract + the restore sanitizer boundary for "<bookId>:<n>" keys.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';

describe('HADITH_BOOKMARK_TOGGLE', () => {
  test('toggles a well-formed key on and off', () => {
    let s = { ...initialState(), hadithBookmarks: [] };
    s = reduce(s, actions.toggleHadithBookmark('bukhari', 7544));
    assert.deepEqual(s.hadithBookmarks, ['bukhari:7544']);
    s = reduce(s, actions.toggleHadithBookmark('bukhari', 7544));
    assert.deepEqual(s.hadithBookmarks, []);
  });

  test('drops malformed keys, never stores them', () => {
    const s0 = { ...initialState(), hadithBookmarks: [] };
    const bad = [
      actions.toggleHadithBookmark('../x', 1),
      actions.toggleHadithBookmark('bukhari', '1;drop'),
      { type: 'HADITH_BOOKMARK_TOGGLE', key: 42 },
      { type: 'HADITH_BOOKMARK_TOGGLE', key: 'no-colon' },
    ];
    for (const a of bad) {
      const s = reduce(s0, a);
      assert.deepEqual(s.hadithBookmarks, [], JSON.stringify(a));
    }
  });

  test('bookmarks persist across reloads', () => {
    assert.ok(PERSISTED_KEYS.includes('hadithBookmarks'));
  });
});

describe('restore sanitizer', () => {
  test('keeps valid keys, drops hostile ones, caps length', () => {
    const out = sanitizeRestoredPayload({
      hadithBookmarks: ['muslim:2690', '<img src=x>', 'a'.repeat(50) + ':1', 'bukhari:abc', 7],
    });
    assert.deepEqual(out.hadithBookmarks, ['muslim:2690']);
    const big = Array.from({ length: 1200 }, (_, i) => `bukhari:${i + 1}`);
    assert.equal(sanitizeRestoredPayload({ hadithBookmarks: big }).hadithBookmarks.length, 1000);
  });
});
