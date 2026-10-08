import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('assets/css/deslopify.css', 'utf8');
const settings = readFileSync('js/views/settings.js', 'utf8');
const offline = readFileSync('js/views/offline.js', 'utf8');

describe('v5.17.127 settings/offline affordances', () => {
  test('palette swatches visibly consume their per-palette colour token', () => {
    assert.match(
      css,
      /\.view--settings \.swatch[\s\S]*?background: var\(--sw-color, var\(--color-primary\)\)/
    );
  });

  test('Arabic typeface choices are specimen cards, not palette swatches', () => {
    assert.match(settings, /class="typeface-picker"/);
    assert.match(settings, /class="typeface-option /);
    assert.match(settings, /typeface-option__preview/);
    assert.match(settings, /typeface-option__sub/);
    assert.doesNotMatch(settings, /class="swatch \${s\.arabicFont/);
  });

  test('offline essentials switch is on the primary Offline surface', () => {
    const primaryStart = offline.indexOf('<section class="view view--offline">');
    const disclosureStart = offline.indexOf('<details class="offline-management-disclosure">');
    const switchPos = offline.indexOf('data-action="offline-toggle-essentials-auto"');
    assert.ok(primaryStart >= 0 && disclosureStart > primaryStart);
    assert.ok(switchPos > primaryStart && switchPos < disclosureStart);
    const disclosure = offline.slice(disclosureStart);
    assert.doesNotMatch(disclosure, /offline-toggle-essentials-auto/);
  });
});
