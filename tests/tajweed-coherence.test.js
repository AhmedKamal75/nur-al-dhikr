import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BISMILLAH_AR,
  TAJWEED_FAMILIES,
  TAJWEED_FAMILY_VARS,
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

test('user Tajweed family colors override paper-scoped default palettes', () => {
  const css = readFileSync(new URL('../assets/css/quran.css', import.meta.url), 'utf8');
  const overrideVars = Object.values(TAJWEED_FAMILY_VARS).flat();

  assert.ok(overrideVars.length > 0);
  for (const variable of overrideVars) {
    assert.ok(variable.startsWith('--tw-user-'), `custom color variable must be isolated: ${variable}`);
    assert.ok(
      css.includes(`var(${variable}, var(`),
      `${variable} must take precedence over the paper/theme fallback`
    );
  }

  // The dark-paper scopes retain their accessible default palette. User picks
  // win through the distinct --tw-user-* layer instead of fighting these values.
  assert.match(css, /\.mushaf-page-wrap\[data-mushaf-paper='night'\][\s\S]*?--tw-qalqalah:\s*#4dd0e1/);
  assert.match(css, /\.mushaf-page-wrap\[data-mushaf-paper='amoled'\]/);
  assert.match(css, /\.mushaf-page-wrap\[data-mushaf-paper='royal-black'\]/);
});

test('the inspector retains same-unit rule collisions for independent toggling', () => {
  const spans = [
    { rule: 'madd_6', start: 2, end: 4 },
    { rule: 'ghunnah', start: 4, end: 7 },
    { rule: 'idgham_ghunnah', start: 4, end: 7 },
  ];
  assert.deepEqual(filterSpansByPrefs(spans, {}), spans);
  assert.deepEqual(filterSpansByPrefs(spans, { rules: { ghunnah: false } }), [spans[0], spans[2]]);
  assert.deepEqual(
    filterSpansByPrefs(spans, { rules: { idgham_ghunnah: false } }),
    [spans[0], spans[1]]
  );
});
