/**
 * tests/hadithNotes.test.js — personal hadith notes: the reducer contract
 * (key shape, blank-deletes, caps) + the restore sanitizer boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';

describe('HADITH_NOTE_SET', () => {
  test('sets, updates, and deletes on blank', () => {
    let s = { ...initialState(), hadithNotes: {} };
    s = reduce(s, actions.setHadithNote('bukhari:1', 'first thought'));
    assert.deepEqual(s.hadithNotes, { 'bukhari:1': 'first thought' });
    s = reduce(s, actions.setHadithNote('bukhari:1', 'revised'));
    assert.deepEqual(s.hadithNotes, { 'bukhari:1': 'revised' });
    s = reduce(s, actions.setHadithNote('bukhari:1', '   '));
    assert.deepEqual(s.hadithNotes, {}, 'blank deletes');
  });

  test('drops malformed keys and hostile shapes, caps text', () => {
    const s0 = { ...initialState(), hadithNotes: {} };
    for (const a of [
      actions.setHadithNote('../x:1', 'hi'),
      actions.setHadithNote('no-colon', 'hi'),
      actions.setHadithNote('__proto__:1', 'pollute'),
      { type: 'HADITH_NOTE_SET', key: 'bukhari:1', text: 42 },
      { type: 'HADITH_NOTE_SET', key: 42, text: 'hi' },
    ]) {
      const s = reduce(s0, a);
      assert.deepEqual(s.hadithNotes, {}, JSON.stringify(a));
    }
    const long = reduce(s0, actions.setHadithNote('muslim:2', 'a'.repeat(5000)));
    assert.equal(long.hadithNotes['muslim:2'].length, 2000, 'text capped');
    assert.equal({}.polluted, undefined, 'no prototype pollution');
  });

  test('notes persist across reloads', () => {
    assert.ok(PERSISTED_KEYS.includes('hadithNotes'));
  });
});

describe('restore sanitizer', () => {
  test('keeps valid notes, drops hostile ones, caps the map', () => {
    const out = sanitizeRestoredPayload({
      hadithNotes: {
        'muslim:2690': 'my reflection',
        'bad key!': 'x',
        'bukhari:abc': 'x',
        'muslim:1': '   ',
        'muslim:2': 42,
      },
    });
    assert.deepEqual(out.hadithNotes, { 'muslim:2690': 'my reflection' });
    const big = {};
    for (let i = 1; i <= 1200; i++) big[`bukhari:${i}`] = 'n';
    assert.equal(
      Object.keys(sanitizeRestoredPayload({ hadithNotes: big }).hadithNotes).length,
      1000
    );
  });
});
