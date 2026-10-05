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
  assert.match(home, /category-tile/);
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
  assert.match(css, /v5\.17\.84 — Home should feel like a quiet welcome/);
  assert.match(
    css,
    /\.view--home > \.home-hero\.home-hero--line \{[\s\S]*border: 0;[\s\S]*background: transparent;/
  );
  assert.match(
    css,
    /\.view--home > \.home-hero\.home-hero--line \.home-hero__title \{[\s\S]*font-size: clamp\(1\.25rem/
  );
});

test('You is a true top-level section and does not own Settings/About/Tools', () => {
  const nav = readFileSync(new URL('../js/core/config/nav.js', import.meta.url), 'utf8');
  assert.match(nav, /entry: 'CHECKLIST'/);
  assert.doesNotMatch(nav, /route: 'SETTINGS'/);
  assert.doesNotMatch(nav, /route: 'ABOUT'/);
  assert.doesNotMatch(nav, /route: 'ZAKAT'/);
  assert.doesNotMatch(nav, /route: 'OFFLINE'/);
});

test('Home does not render a duplicate standalone Tasbih doorway', () => {
  assert.doesNotMatch(home, /\$\{tasbihEntryHTML\(state\)\}/);
});

test('section navigation lives in the main menu, not duplicated on every page', () => {
  assert.doesNotMatch(
    readFileSync(new URL('../js/views/library.js', import.meta.url), 'utf8'),
    /azkarModeSwitchHTML/
  );
  assert.doesNotMatch(
    readFileSync(new URL('../js/views/quran.js', import.meta.url), 'utf8'),
    /quranModeSwitchHTML/
  );
  assert.doesNotMatch(
    readFileSync(new URL('../js/views/prayer.js', import.meta.url), 'utf8'),
    /prayerModeSwitchHTML/
  );
  assert.doesNotMatch(
    readFileSync(new URL('../js/views/tasbih.js', import.meta.url), 'utf8'),
    /practiseModeSwitchHTML/
  );
  assert.doesNotMatch(
    readFileSync(new URL('../js/views/checklist.js', import.meta.url), 'utf8'),
    /youModeSwitchHTML/
  );
  assert.match(
    readFileSync(new URL('../js/ui/shell.js', import.meta.url), 'utf8'),
    /<details class="nav__section/
  );
});

test('Settings leads with identity and search before the control index', () => {
  const settings = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
  assert.ok(settings.indexOf('<header class="settings-hero">') >= 0);
  assert.equal(settings.includes('youModeSwitchHTML(state.activeView, lang)'), false);
  assert.match(css, /\.view--settings \.settings-hero \{[\s\S]*grid-template-columns:/);
  assert.doesNotMatch(css, /\.view--settings > \.you-subnav \{/);
  assert.doesNotMatch(css, /\.section-mode-switch \{/);
  const renderStart = home.lastIndexOf('<section class="view view--home">');
  assert.ok(renderStart >= 0, 'Home render markup disappeared');
  const homeRender = home.slice(renderStart);
  assert.ok(homeRender.indexOf('home-core') < homeRender.indexOf('home-secondary'));
  assert.ok(homeRender.indexOf('home-secondary') < homeRender.indexOf('shahadaBannerHTML(lang)'));
  assert.ok(homeRender.indexOf('home-today-heading') < homeRender.indexOf('home-start-heading'));
});

test('Home keeps a vertical product argument: core → Shahada → next → reflection → context', () => {
  const renderStart = home.lastIndexOf('<section class="view view--home">');
  const homeRender = home.slice(renderStart);
  const positions = [
    'home-core',
    'shahadaBannerHTML(lang)',
    'home-section--next',
    'home-section--reflection',
    'nudgeCardHTML(state)',
    'onboardingPanelHTML(state, lang)',
  ].map((needle) => [needle, homeRender.indexOf(needle)]);
  for (const [name, pos] of positions) assert.ok(pos >= 0, `Home missing ${name}`);
  assert.ok(positions[0][1] < positions[1][1], 'core must precede Shahada');
  assert.ok(positions[0][1] < positions[2][1], 'core must precede Next');
  assert.ok(positions[2][1] < positions[3][1], 'Next must precede Reflection');
  assert.ok(positions[3][1] < positions[4][1], 'Reflection must precede contextual nudge');
  assert.ok(positions[4][1] < positions[5][1], 'nudge must precede onboarding');
});

test('application tail keeps Zakat, Offline, Settings and About as standalone siblings', () => {
  const nav = readFileSync(new URL('../js/core/config/nav.js', import.meta.url), 'utf8');
  assert.match(nav, /kind: 'zakat'/);
  assert.match(nav, /kind: 'offline'/);
  assert.match(nav, /kind: 'settings'/);
  assert.match(nav, /kind: 'about'/);
  assert.match(css, /\.nav__app-tail\s*\{/);
  assert.match(css, /\.nav__item--app-settings/);
  assert.match(css, /\.nav__item--app-about/);
  assert.doesNotMatch(css, /\.nav__group--app-utility/);
});

test('hierarchical menu has intentional visual chrome and no native marker/dashed-line fallthrough', () => {
  const navCss = css;
  assert.match(navCss, /\.nav__section\s*\{/);
  assert.match(navCss, /\.nav__section-summary\s*\{/);
  assert.match(navCss, /\.nav__section-summary::-webkit-details-marker/);
  assert.match(navCss, /\.nav__section-summary::marker/);
  assert.match(navCss, /\.nav__sub\s*\{/);
  assert.doesNotMatch(navCss, /\.nav__sub[\s\S]{0,900}border[^;]*dashed/);
});

test('Settings setup links are controls, not hyperlink-looking prose', () => {
  const settings = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
  assert.match(settings, /settings-link-row__icon/);
  assert.match(settings, /settings-link-row__chevron/);
  assert.match(
    css,
    /\.view--settings \.panel--deferred \.reciter-row\s*\{[\s\S]*text-decoration: none !important/
  );
  assert.match(css, /\.view--settings \.panel--deferred \.reciter-row__meta/);
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
