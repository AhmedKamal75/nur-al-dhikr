import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BISMILLAH_AR,
  TAJWEED_FAMILIES,
  TAJWEED_RULES,
  canonicalWordTokens,
  filterSpansByPrefs,
} from '../js/domain/tajweed.js';
import { renderAyahWords, buildMushafSettingsPanel } from '../js/views/tafsirPanel.js';
import { buildTajweedSettingsPanel } from '../js/views/tajweedSettings.js';
import { buildPracticePicker } from '../js/views/tajweedPracticeView.js';

function state(overrides = {}) {
  return {
    settings: {
      language: 'en',
      mushafPrefs: { tajweedColoring: true },
      tajweedPrefs: {},
      ...overrides.settings,
    },
    tajweedPracticeStats: {},
    tajweedMissRecords: {},
    ...overrides,
  };
}

test('the shared Bismillah is byte-identical to the classic corpus', () => {
  const corpus = JSON.parse(readFileSync(new URL('../data/quran/1.json', import.meta.url), 'utf8'));
  assert.equal(BISMILLAH_AR, corpus.ayahs[0].text);
});

test('Tajweed page spans resolve through CSS variables, never inline color', () => {
  const html = renderAyahWords(BISMILLAH_AR, null, 1, 0, {
    tappable: false,
    tajweed: true,
    prefs: { colors: { nasal: '#ff9800' } },
  });
  assert.match(html, /class="tajweed tajweed--/);
  assert.doesNotMatch(html, /style="color:/);
});

test('every Tajweed rule is reachable in Settings, including plain rules', () => {
  const html = buildTajweedSettingsPanel(state());
  const toggles = html.match(/data-action="tajweed-toggle-rule"/g) || [];
  assert.equal(toggles.length, TAJWEED_RULES.length);
  assert.ok(TAJWEED_FAMILIES.some((f) => f.id === 'plain' && f.recolorable === false));
  assert.match(html, /tajpick__family-swatch--plain/);
  assert.doesNotMatch(html, /background:null/);
});

test('the Mushaf legend reads tajweedPrefs and includes every rule', () => {
  const html = buildMushafSettingsPanel(
    state({
      settings: {
        language: 'en',
        mushafPrefs: { tajweedColoring: true },
        tajweedPrefs: { colors: { nasal: '#ff9800' }, rules: { ghunnah: false } },
      },
    })
  );
  assert.match(html, /#ff9800/i);
  assert.match(html, /tajweed-legend__swatch--plain/);
  assert.doesNotMatch(html, /background:null/);
  const rows = html.match(/tajweed-legend__row/g) || [];
  assert.equal(rows.length, TAJWEED_RULES.length);
});

test('practice swatches honour color prefs and never render a null background', () => {
  const html = buildPracticePicker(
    state({
      settings: {
        language: 'en',
        tajweedPrefs: { colors: { nasal: '#ff9800' } },
      },
    })
  );
  assert.match(html, /#ff9800/i);
  assert.doesNotMatch(html, /background:null/);
});

test('word tokens retain their printed ornaments for page and inspector parity', () => {
  const [token] = canonicalWordTokens('رَبِّهِمۡۗ');
  assert.equal(token.text, 'رَبِّهِمۡ');
  assert.equal(token.raw, 'رَبِّهِمۡۗ');
});

test('the inspector span lens is the same non-overlapping set the painter uses', () => {
  const spans = [
    { rule: 'madd_6', start: 2, end: 4 },
    { rule: 'ghunnah', start: 4, end: 7 },
    { rule: 'idgham_ghunnah', start: 4, end: 7 },
  ];
  assert.deepEqual(filterSpansByPrefs(spans, {}), [spans[0], spans[1]]);
  assert.deepEqual(filterSpansByPrefs(spans, { rules: { ghunnah: false } }), [spans[0], spans[2]]);
});
