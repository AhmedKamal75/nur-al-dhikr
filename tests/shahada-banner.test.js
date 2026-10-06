/**
 * Home sacred-text contract.
 *
 * The Shahada is content, not decorative Home chrome. Home must not render it
 * as a banner/footer/separator.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHome } from '../js/views/home.js';
import { initialState } from '../js/core/state/initial.js';

test('Home does not render the Shahada as decorative chrome', () => {
  const html = renderHome(initialState());
  assert.equal(html.includes('shahada-banner'), false);
  assert.equal(html.includes('لا إله إلا الله محمد رسول الله'), false);
});
