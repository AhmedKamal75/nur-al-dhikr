import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/css/deslopify.css', import.meta.url), 'utf8');
const home = readFileSync(new URL('../js/views/home.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

test('palette refinement keeps palette choice functional', () => {
  for (const palette of ['emerald', 'sapphire', 'royal', 'amber', 'forest', 'ocean', 'amoled']) {
    assert.match(css, new RegExp(`\\[data-palette='${palette}'\\]`));
  }
  assert.match(css, /\[data-theme='dark'\]\[data-palette='sapphire'\]/);
});

test('mobile active state is an indicator, not a filled sticker', () => {
  assert.match(css, /\.nav-mobile-bar__item\[aria-current='page'\]/);
  assert.match(css, /\.nav-mobile-bar__item\[aria-current='page'\]::after/);
  assert.match(
    css,
    /\.nav-mobile-bar__item\[aria-current='page'\],\n\.nav-mobile-bar__item--active \{\n\s*background: transparent;/
  );
});

test('Home empty progress has a calm first-use branch', () => {
  assert.match(home, /panel--progress-empty/);
  assert.match(home, /today\?\.recitations > 0/);
  assert.match(home, /home\.startYourDay/);
});

test('new empty-state copy ships bilingually', () => {
  assert.match(en, /'home\.notStarted':/);
  assert.match(en, /'home\.startYourDay':/);
  assert.match(ar, /'home\.notStarted':/);
  assert.match(ar, /'home\.startYourDay':/);
});

test('Azkar tile cleanup keeps the duplicate action hidden at the design layer', () => {
  assert.match(css, /\.view--library \.browser-tile__read \{\n\s*display: none;/);
  assert.match(home, /<a class="category-tile"/);
});

test('major feature doors converge on one surface system', () => {
  for (const view of ['quran', 'hadith', 'prayer', 'statistics', 'tasbih']) {
    assert.match(css, new RegExp(`\\.view--${view}`), `missing ${view} visual contract`);
  }
  assert.match(css, /\.view--quran \.surah-grid \{[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(css, /\.view--hadith \.hadith-grid \{[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(css, /\.view--prayer \.next-prayer-card \{/);
  assert.match(css, /\.view--statistics \.stat-card \{/);
  assert.match(css, /\.view--tasbih \.tasbih-stage \{/);
  assert.match(css, /\.view--prayer \.next-prayer-card \{[\s\S]*border-inline-start: 4px/);
});

test('quiet control system avoids gradient-heavy button chrome and preserves mobile label floor', () => {
  assert.match(
    css,
    /\.btn--primary \{[\s\S]*background: var\(--color-primary\);[\s\S]*box-shadow: none;/
  );
  assert.match(css, /\.btn--secondary \{[\s\S]*box-shadow: none;/);
  assert.match(css, /\.nav-mobile-bar__item \{[\s\S]*font-size: 0\.68rem;/);
});

test('non-Mushaf surfaces share restrained silhouette and readable copy width', () => {
  assert.match(
    css,
    /\.view:not\(\.view--mushaf\) \.panel,[\s\S]*border-radius: var\(--radius-card-safe\);/
  );
  assert.match(css, /\.view:not\(\.view--mushaf\) \.panel__subtext,[\s\S]*max-width: 72ch;/);
});

test('shared browse surfaces do not reintroduce rainbow or gradient tile chrome', () => {
  assert.match(
    css,
    /\.view:not\(\.view--mushaf\) \.category-tile__icon\[class\*='category-tile__icon--'\]/
  );
  assert.match(
    css,
    /\.view:not\(\.view--mushaf\) \.mood-tile \{\n\s*background: var\(--color-surface\);/
  );
  assert.match(css, /Pass 5: remove legacy decorative drift/);
  assert.doesNotMatch(
    css.match(/\.view:not\(\.view--mushaf\) \.mood-tile \{[\s\S]*?\}/)?.[0] || '',
    /gradient/
  );
});

test('Home hero remains the focal welcome surface rather than a generic utility card', () => {
  assert.match(css, /Pass 6: editorial hierarchy \+ grouped personal navigation/);
  assert.match(
    css,
    /\.view--home > \.home-hero\.home-hero--line \{[\s\S]*border: 0;[\s\S]*background: transparent;/
  );
  assert.match(
    css,
    /\.view--home > \.home-hero\.home-hero--line \.home-hero__title \{[\s\S]*font-size: clamp\(1\.55rem/
  );
});

test('You navigation is grouped instead of a ten-button segmented wall', () => {
  assert.match(css, /\.view--you \.you-subnav__/);
  assert.match(css, /you-subnav__group-title/);
  assert.match(css, /grid-template-columns: repeat\(4/);
  assert.match(css, /grid-template-columns: repeat\(2/);
});

test('Home does not render a duplicate standalone Tasbih doorway', () => {
  assert.doesNotMatch(home, /\$\{tasbihEntryHTML\(state\)\}/);
});

test('section navigation uses an editorial rail instead of a filled segmented surface', () => {
  assert.match(css, /Pass 12 — section chrome \+ settings index/);
  assert.match(
    css,
    /\.section-mode-switch \{[\s\S]*border-block-end: 1px solid var\(--color-border\)/
  );
  assert.match(css, /\.section-mode-switch \.segmented__btn \{[\s\S]*min-block-size: 44px/);
  assert.match(
    css,
    /\.section-mode-switch \.segmented__btn--active,[\s\S]*background: transparent;/
  );
});

test('Settings leads with identity and search before the control index', () => {
  const settings = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
  assert.ok(
    settings.indexOf('<header class="settings-hero">') <
      settings.indexOf('youModeSwitchHTML(state.activeView, lang)')
  );
  assert.match(css, /\.view--settings \.settings-hero \{[\s\S]*grid-template-columns:/);
  assert.match(css, /\.view--settings > \.you-subnav \{[\s\S]*grid-template-columns: repeat\(3/);
});

test('data-absent Quran and Mushaf states retain a page heading landmark', () => {
  const quran = readFileSync(new URL('../js/views/quran.js', import.meta.url), 'utf8');
  const mushaf = readFileSync(new URL('../js/views/mushafReader.js', import.meta.url), 'utf8');
  assert.match(
    quran,
    /quran-surah[\s\S]*<h1 class=\"sr-only\">\$\{escapeHTML\(surahMeta \? surahMeta\.nameAr : t\('quran\.title'/
  );
  assert.match(mushaf, /failedTier[\s\S]*<h1 class=\"sr-only\">\$\{escapeHTML\(t\('mushaf\.title'/);
});
