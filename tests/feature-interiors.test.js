import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('feature interiors keep their primary task visually explicit', () => {
  const focus = read('js/views/focus.js');
  assert.match(focus, /class="focus__identity"/, 'Focus exposes category identity in its own rail');
  assert.match(
    focus,
    /class="focus__progress"/,
    'Focus exposes session position as a slim progress line'
  );
  assert.match(focus, /class="focus__counter/, 'Focus retains one primary counter action');
});

test('focus styling is reading-first rather than dashboard-like', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.focus__arabic[\s\S]*?font-size: clamp\(2\.15rem/,
    'Focus reading type gets deliberate scale'
  );
  assert.match(
    css,
    /\.focus__bar[\s\S]*?background: color-mix\(in srgb, var\(--color-surface\) 96%/,
    'Focus control chrome is restrained'
  );
});

test('audio player groups secondary controls instead of crowding the transport row', () => {
  const js = read('js/views/playerBar.js');
  const css = read('assets/css/deslopify.css');
  assert.match(
    js,
    /class="player-bar__secondary"/,
    'Secondary player controls have a dedicated group'
  );
  assert.match(
    css,
    /\.player-bar__secondary[\s\S]*?flex-wrap: wrap/,
    'Secondary player controls can reflow without breaking transport'
  );
  assert.match(js, /class="player-bar__volume"/, 'Volume remains an explicit player control');
  assert.match(
    css,
    /\.player-bar__volume \{[\s\S]*?display: inline-flex/,
    'Volume is integrated into the transport settings row'
  );
});

test('Tajweed course has a focal continue target and flatter learning rows', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.taj-course__continue[\s\S]*?background: color-mix\(in srgb, var\(--color-primary\) 5%/,
    'Continue receives focal treatment'
  );
  assert.match(
    css,
    /\.taj-course__session--next[\s\S]*?box-shadow: 0 0 0 2px/,
    'Next lesson has a restrained position cue'
  );
  assert.match(
    css,
    /\.taj-course__session \{[\s\S]*?border-radius: 12px/,
    'Session rows are not oversized cards'
  );
});

test('Azkar browse remains one-action-per-tile and compact by need', () => {
  const library = read('js/views/library.js');
  const css = read('assets/css/deslopify.css');
  assert.match(library, /<a class="category-tile"/, 'Category itself is the navigation target');
  assert.doesNotMatch(library, /category-tile__read/, 'Library has no detached Read-now action');
  assert.match(
    css,
    /\.view--library \.mood-tile \{[\s\S]*?flex-direction: row/,
    'Mood navigation is compact rather than another tall card grid'
  );
});

test('secondary feature pages use a primary gesture with quiet support chrome', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--prayer \.panel--prayer-tools \.quick-actions--compact[\s\S]*?grid-template-columns: repeat\(3/,
    'Prayer tools form one secondary index'
  );
  assert.match(
    css,
    /\.view--prayer \.next-prayer-card__name[\s\S]*?color: var\(--color-text\)/,
    'Prayer focal text overrides the legacy dark-hero token'
  );
  assert.match(
    css,
    /\.view--prayer \.next-prayer-card__countdown[\s\S]*?background: transparent/,
    'Prayer countdown is no longer a decorative white pill on a light hero'
  );
  assert.match(
    css,
    /\.view--statistics \.stat-grid \.stat-card:first-child[\s\S]*?grid-column: span 2/,
    'Statistics has a clear focal metric'
  );
  assert.match(
    css,
    /\.view--tasbih \.tasbih-stage[\s\S]*?background: transparent/,
    'Tasbih has one dominant practice surface'
  );
  assert.match(
    css,
    /\.view--tajweed-course \.taj-course__sessions[\s\S]*?border-inline-start/,
    'Tajweed uses a curriculum rail instead of card stacking'
  );
});

test('audio manager and hadith library stay information-dense without becoming boxed walls', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--audio \.dl-grid[\s\S]*?grid-template-columns: repeat\(12/,
    'Audio download index is intentionally dense'
  );
  assert.match(
    css,
    /\.view--hadith \.hadith-tile \{[\s\S]*?box-shadow: none/,
    'Hadith books read as a quiet index rather than floating cards'
  );
});

test('Qur’an study surfaces prioritize source selection and reading content', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.tafsir-tab--active::before[\s\S]*?background: var\(--color-primary\)/,
    'Tafsir active source has a quiet positional cue'
  );
  assert.match(
    css,
    /\.tafsir-panel__body[\s\S]*?line-height: 2/,
    'Tafsir body is treated as reading content'
  );
  assert.match(
    css,
    /\.word-study__hero[\s\S]*?border: 0[\s\S]*?box-shadow: none/,
    'Word study word remains the hero instead of a nested card'
  );
  assert.match(
    css,
    /\.word-study__root[\s\S]*?border-inline-start: 3px/,
    'Root meaning gets one semantic edge instead of another card frame'
  );
});

test('personal learning tools avoid stacked floating panels', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--journal \.journal-entry[\s\S]*?box-shadow: none/,
    'Journal entries use a quiet chronological surface'
  );
  assert.match(
    css,
    /\.quiz-choice[\s\S]*?box-shadow: none/,
    'Quiz answers are flat interactive rows'
  );
});

test('secondary utility features use their own interaction grammar instead of generic card stacks', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--qibla \.qibla-compass \{[\s\S]*?box-shadow: none/,
    'Qibla compass is the focal instrument'
  );
  assert.match(
    css,
    /\.view--qibla \.qibla-facts \{[\s\S]*?grid-template-columns: repeat\(4/,
    'Qibla facts form a restrained information rail'
  );
  assert.match(
    css,
    /\.view--calendar > \.panel \{[\s\S]*?box-shadow: none/,
    'Calendar uses the calendar surface as the object'
  );
  assert.match(
    css,
    /\.view--garden \.garden-timeline-panel[\s\S]*?box-shadow: none/,
    'Garden progression is a rail, not a card stack'
  );
  assert.match(
    css,
    /\.view--offline > \.panel \{[\s\S]*?box-shadow: none/,
    'Offline status reads like an operational list'
  );
  assert.match(
    css,
    /\.view--zakat \.zakat-result \{[\s\S]*?border-inline-start: 3px/,
    'Zakat gives the result a single semantic edge'
  );
});

test('Azkar utility pages share a library-like grammar', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--favorites \.segmented \{[\s\S]*?border-block-end: 1px solid var\(--color-border\)/,
    'Favorites sorting behaves like a source rail'
  );
  assert.match(
    css,
    /\.view--collections \.collection-tile \{[\s\S]*?box-shadow: none/,
    'Collections are quiet index entries'
  );
  assert.match(
    css,
    /\.view--search \.quran-search-panel[\s\S]*?background: transparent/,
    'Search result sections do not become nested cards'
  );
  assert.match(
    css,
    /\.view--search \.quran-hit \{[\s\S]*?border-radius: 0/,
    'Search hits scan as an editorial list'
  );
});

test('specialized modes retain distinct identity without falling back to generic slop', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--ramadan \.panel--fast-tracker,[\s\S]*?border-block: 1px solid var\(--color-border\)/,
    'Ramadan keeps a special hero while quieting support sections'
  );
  assert.match(
    css,
    /\.view--kids \.kids-tile \{[\s\S]*?border-radius: 18px/,
    'Kids keeps a separate tactile language'
  );
  assert.match(
    css,
    /\.view--ambient \.ambient__transport \{[\s\S]*?backdrop-filter: blur\(14px/,
    'Ambient transport uses glass only where it is functional'
  );
  assert.match(
    css,
    /\.view--mutashabihat \.drill__option \{[\s\S]*?box-shadow: none/,
    'Mutashabihat answers behave like a drill ladder'
  );
});

test('Tajweed practice is a drill surface, not a card dashboard', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.tajweed-practice \.practice-stats \{[\s\S]*?border-block: 1px solid var\(--color-border\)/,
    'Practice statistics form a quiet evidence strip'
  );
  assert.match(
    css,
    /\.tajweed-practice \.practice-rule \{[\s\S]*?border: 0/,
    'Rule selection is a list row, not another card'
  );
  assert.match(
    css,
    /\.tajweed-practice \.practice-ayah \{[\s\S]*?font-size: clamp\(1\.9rem/,
    'Practice ayah receives primary reading scale'
  );
});

test('learning expansion, onboarding, and Mushaf secondary navigation stay editorial', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.mushaf-tray__study \.study-tray__word-detail[\s\S]*?border-radius: 0/,
    'Inline word study does not become a card inside the tray'
  );
  assert.match(
    css,
    /\.panel--onboarding--line \{[\s\S]*?border-block: 1px solid var\(--color-border\)/,
    'Onboarding uses a quiet guide rail'
  );
  assert.match(
    css,
    /\.mushaf-bookmark-row \{[\s\S]*?border-radius: 0/,
    'Mushaf bookmarks scan as an index'
  );
});

test('the specialized feature language remains intentionally distinct', () => {
  const css = read('assets/css/deslopify.css');
  assert.match(
    css,
    /\.view--kids \.panel--kids-heard,[\s\S]*?background: color-mix\(in srgb, var\(--mushaf-gold\)/,
    'Kids keeps its own warm tactile surface'
  );
  assert.match(
    css,
    /\.view--ambient \.ambient__transport[\s\S]*?backdrop-filter: blur\(14px/,
    'Ambient keeps glass confined to transport chrome'
  );
  assert.match(
    css,
    /\.mushaf-fs-console \.rec-console-more[\s\S]*?box-shadow: none/,
    'Mushaf transport support chrome stays quiet'
  );
});
