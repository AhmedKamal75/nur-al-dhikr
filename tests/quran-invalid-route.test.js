import test from 'node:test';
import assert from 'node:assert/strict';
import { renderQuran } from '../js/views/quran.js';
import { initialState } from '../js/core/state/initial.js';

test('invalid Quran ids fail immediately with a not-found heading, without waiting for corpus hydration', () => {
  const base = initialState();
  const state = {
    ...base,
    activeParams: { id: '99999' },
    quran: { ...base.quran, meta: null, surahs: {} },
  };
  const html = renderQuran(state);
  assert.match(html, /quran-not-found|not-found|missing-data/i);
  assert.match(html, /<h1[^>]*class="sr-only"/i);
  assert.doesNotMatch(html, /skeleton/i);
});
