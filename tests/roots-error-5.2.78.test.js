/**
 * tests/roots-error-5.2.78.test.js — BUG-02 completion: the roots tiers
 * render error + Retry (not a forever skeleton) when flagged.
 * Pure string-template checks (no DOM, no network).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { renderRoots } from '../js/views/roots.js';

function stateWith(overrides = {}) {
  const s = initialState();
  s.settings.language = 'en';
  s.quranRoots = null;
  s.loadErrors = {};
  return Object.assign(s, overrides);
}

describe('roots error UI', () => {
  test('no data + no flag -> skeleton, no retry button', () => {
    const html = renderRoots(stateWith());
    assert.ok(!html.includes('retry-load'), 'no Retry on first-load skeleton');
  });

  test('no data + quran-roots flag -> error + Retry for that tier', () => {
    const html = renderRoots(stateWith({ loadErrors: { 'quran-roots': true } }));
    assert.ok(html.includes('retry-load'), 'Retry button renders');
    assert.ok(html.includes('quran-roots'), 'Retry targets the roots tier');
  });

  test('partial detail + quran-roots-full flag -> inline Retry', () => {
    // Root keys are Arabic (sanitizeRootParam drops latin); count > occ
    // forces the partial hint, and the flag appends the tier Retry.
    const s = stateWith({
      quranRoots: { كتب: { count: 5, occ: [{ s: 2, a: 255, t: 'كتاب' }] } },
      loadErrors: { 'quran-roots-full': true },
      activeParams: { id: 'كتب' },
    });
    const html = renderRoots(s);
    assert.ok(html.includes('roots-partial-hint'), 'partial hint renders');
    assert.ok(html.includes('retry-load'), 'Retry renders for the full tier');
    assert.ok(html.includes('quran-roots-full'), 'Retry targets the full tier');
  });
});
