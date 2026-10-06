import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/css/deslopify.css', import.meta.url), 'utf8');

test('Settings reciter rows release the global nowrap so long bilingual metadata can wrap', () => {
  assert.match(css, /\.view--settings \.reciter-row__name \{[\s\S]*white-space: normal;/);
  assert.match(css, /\.view--settings \.reciter-row \{[\s\S]*min-inline-size: 0;/);
});

test('The Settings reciter fix is not just an overflow clip', () => {
  const block = css.match(/\.view--settings \.reciter-row__name \{[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(block, /text-overflow:\s*ellipsis/);
  assert.doesNotMatch(block, /white-space:\s*nowrap/);
});
