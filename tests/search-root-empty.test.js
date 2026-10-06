import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/views/search.js', import.meta.url), 'utf8');

test('global Search does not render an empty Roots panel when no root matched', () => {
  assert.match(src, /if \(!expansion\.matched\) return '';/);
  assert.doesNotMatch(src, /if \(!expansion\.matched\) \{[\s\S]*roots-search-panel/);
});
