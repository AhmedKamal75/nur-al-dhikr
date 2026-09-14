/**
 * tests/kidsScope.test.js — item 22 (kids-mode scope-cut) gates:
 *  1. the allowlist holds exactly Kids + Tasbih and the resolver passes
 *     them through while rerouting everything else to Kids (mode off =
 *     identity);
 *  2. the NAVIGATE reducer backstops every silent path (deep links,
 *     history traversals, search-debounce navigations) into the scope;
 *  3. the nav chrome (rail, drawer, mobile bar) offers only the scope;
 *  4. the blocked-navigation string exists in both languages.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  VIEWS,
  KIDS_ALLOWED_VIEWS,
  isKidsAllowedView,
  resolveKidsView,
} from '../js/core/config/views.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderNav } from '../js/ui/shell.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';

function kidsState(view = VIEWS.HOME) {
  let s = { ...initialState(), settings: { ...initialState().settings, kidsMode: true } };
  s = reduce(s, actions.navigate(view, {}));
  return s;
}

describe('kids scope: pure resolver', () => {
  test('allowlist is exactly Kids + Tasbih, frozen', () => {
    assert.deepEqual([...KIDS_ALLOWED_VIEWS], [VIEWS.KIDS, VIEWS.TASBIH]);
    assert.ok(Object.isFrozen(KIDS_ALLOWED_VIEWS));
  });

  test('mode off is the identity; mode on scopes to the allowlist', () => {
    assert.equal(resolveKidsView(VIEWS.SETTINGS, false), VIEWS.SETTINGS);
    assert.equal(resolveKidsView(VIEWS.KIDS, true), VIEWS.KIDS);
    assert.equal(resolveKidsView(VIEWS.TASBIH, true), VIEWS.TASBIH);
    assert.equal(resolveKidsView(VIEWS.SETTINGS, true), VIEWS.KIDS);
    assert.equal(resolveKidsView(VIEWS.HOME, true), VIEWS.KIDS);
    assert.equal(resolveKidsView(VIEWS.QURAN, true), VIEWS.KIDS);
    assert.equal(resolveKidsView(VIEWS.SEARCH, true), VIEWS.KIDS);
    assert.equal(resolveKidsView('nope', true), VIEWS.KIDS, 'unknown routes stay scoped');
  });

  test('isKidsAllowedView matches the resolver', () => {
    assert.equal(isKidsAllowedView(VIEWS.KIDS), true);
    assert.equal(isKidsAllowedView(VIEWS.TASBIH), true);
    assert.equal(isKidsAllowedView(VIEWS.HOME), false);
  });
});

describe('kids scope: NAVIGATE backstop', () => {
  test('blocked deep links land on Kids; allowed views pass through', () => {
    let s = kidsState(VIEWS.SETTINGS);
    assert.equal(s.activeView, VIEWS.KIDS);
    s = kidsState(VIEWS.TASBIH);
    assert.equal(s.activeView, VIEWS.TASBIH);
    s = kidsState(VIEWS.KIDS);
    assert.equal(s.activeView, VIEWS.KIDS);
  });

  test('mode off navigates freely', () => {
    let s = initialState();
    s = reduce(s, actions.navigate(VIEWS.SETTINGS, {}));
    assert.equal(s.activeView, VIEWS.SETTINGS);
  });

  test('entering/exiting kids mode still works (toggle → Kids, exit → Home)', () => {
    let s = reduce(initialState(), actions.updateSettings({ kidsMode: true }));
    s = reduce(s, actions.navigate(VIEWS.KIDS, {}));
    assert.equal(s.activeView, VIEWS.KIDS);
    s = reduce(s, actions.updateSettings({ kidsMode: false }));
    s = reduce(s, actions.navigate(VIEWS.HOME, {}));
    assert.equal(s.activeView, VIEWS.HOME);
  });
});

describe('kids scope: nav chrome', () => {
  test('scoped chrome links only to Kids + Tasbih; full chrome untouched', () => {
    const viewsOf = (html) => [...html.matchAll(/data-view="([^"]+)"/g)].map((m) => m[1]).sort();
    const scoped = viewsOf(renderNav(kidsState()));
    assert.deepEqual(
      scoped,
      [VIEWS.KIDS, VIEWS.KIDS, VIEWS.KIDS, VIEWS.TASBIH, VIEWS.TASBIH, VIEWS.TASBIH].sort(),
      'rail + drawer + mobile bar offer the scope; More is gone'
    );
    assert.ok(!scoped.includes(VIEWS.SETTINGS));
    assert.ok(!scoped.includes(VIEWS.HOME));
    const full = viewsOf(renderNav(initialState()));
    assert.ok(full.includes(VIEWS.SETTINGS), 'mode off keeps every destination');
    assert.ok(full.includes(VIEWS.HOME));
  });
});

describe('kids scope: strings', () => {
  test('kids.blocked exists in EN + AR', () => {
    assert.ok(EN_STRINGS['kids.blocked'], 'EN kids.blocked');
    assert.ok(AR_STRINGS['kids.blocked'], 'AR kids.blocked');
  });

  test('handlers guard tap paths with a toast (source-pinned)', () => {
    const src = readFileSync(new URL('../js/app/handlers/navigation.js', import.meta.url), 'utf8');
    assert.ok(src.includes('kidsScopeGuard'), 'guard helper present');
    assert.ok(src.includes('kids.blocked'), 'blocked toast key wired');
    for (const handler of ["'quick-tile'", "'nav-drawer-go'", "'open-palette'"]) {
      const at = src.indexOf(handler);
      assert.ok(at > -1, `${handler} exists`);
      assert.ok(src.indexOf('kidsScopeGuard', at) > -1, `${handler} is scope-guarded`);
    }
    const navAt = src.indexOf('navigate: (ds)');
    assert.ok(src.indexOf('kidsScopeGuard', navAt) > -1, 'navigate is scope-guarded');
  });
});
