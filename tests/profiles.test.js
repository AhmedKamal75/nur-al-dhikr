/**
 * tests/profiles.test.js — app-wide progress profiles: create/switch/
 * delete isolation (no streak leakage) + restore boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';

describe('profiles', () => {
  test('create → switch → isolate → switch back → delete', () => {
    let s = { ...initialState() };
    s = reduce(s, actions.toggleFavorite('adh-mor-001'));
    s = reduce(s, actions.createProfile('layla', 'Layla'));
    assert.equal(s.profiles.length, 1);
    s = reduce(s, actions.switchProfile('layla'));
    assert.equal(s.activeProfile, 'layla');
    assert.deepEqual(s.favorites, [], 'fresh profile starts empty');
    s = reduce(s, actions.toggleFavorite('adh-eve-001'));
    s = reduce(s, actions.switchProfile('main'));
    assert.deepEqual(s.favorites, ['adh-mor-001'], 'main data restored');
    assert.deepEqual(s.profileStore.layla.favorites, ['adh-eve-001'], 'stashed');
    s = reduce(s, actions.switchProfile('layla'));
    assert.deepEqual(s.favorites, ['adh-eve-001']);
    assert.deepEqual(s.profileStore.main.favorites, ['adh-mor-001']);
    for (const bad of ['main', 'nope']) {
      const before = s;
      s = reduce(s, actions.deleteProfile(bad));
      if (bad === 'nope') assert.equal(s, before, 'unknown delete no-ops');
    }
    s = reduce(s, actions.deleteProfile('layla'));
    assert.equal(s, s, 'active-profile delete refused (state kept)');
    assert.ok(s.profiles.some((p) => p.id === 'layla'));
    s = reduce(s, actions.switchProfile('main'));
    s = reduce(s, actions.deleteProfile('layla'));
    assert.deepEqual(s.profiles, []);
    assert.deepEqual(s.profileStore.layla, undefined, 'stash dropped');
  });

  test('hostile ids, dupes, and caps refused', () => {
    let s = { ...initialState() };
    s = reduce(s, actions.createProfile('__proto__', 'evil'));
    s = reduce(s, actions.createProfile('main', 'Main'));
    assert.deepEqual(s.profiles, []);
    s = reduce(s, actions.createProfile('a', '  '));
    assert.equal(s.profiles[0].name, 'a', 'blank name falls back to id');
    s = reduce(s, actions.createProfile('a', 'dupe'));
    assert.equal(s.profiles.length, 1);
    s = reduce(s, actions.switchProfile('ghost'));
    assert.equal(s.activeProfile, 'main', 'unknown switch refused');
    assert.ok(PERSISTED_KEYS.includes('profiles'));
    assert.ok(PERSISTED_KEYS.includes('profileStore'));
    assert.ok(PERSISTED_KEYS.includes('activeProfile'));
  });

  test('restore keeps valid profiles, drops hostile, falls back to main', () => {
    const out = sanitizeRestoredPayload({
      profiles: [
        { id: 'layla', name: 'Layla', createdAt: 1 },
        { id: '__proto__', name: 'evil' },
        { id: 'main', name: 'Main' },
        'junk',
      ],
      profileStore: {
        layla: { favorites: ['a', 42], counters: {}, statistics: {}, history: [] },
        ghost: { favorites: [] },
        __proto__: { favorites: [] },
      },
      activeProfile: 'ghost',
    });
    assert.deepEqual(
      out.profiles.map((p) => p.id),
      ['layla']
    );
    assert.deepEqual(out.profileStore.layla.favorites, ['a']);
    assert.equal(out.profileStore.ghost, undefined, 'stash without profile dropped');
    assert.equal(out.activeProfile, 'main', 'unknown active falls back');
    assert.equal({}.polluted, undefined);
  });
});
