/**
 * v5.17.126 hostile-review remediation contracts.
 * These are source-level traps for defects found by the local Chromium pass on
 * v5.17.125. They do not replace browser evidence; they prevent reintroducing
 * the classes already caught.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');

const css = read('assets/css/deslopify.css');
const desktop = read('assets/css/desktop.css');
const quranCss = read('assets/css/quran.css');
const home = read('js/views/home.js');
const quran = read('js/views/quran.js');
const settings = read('js/views/settings.js');
const sheets = read('js/views/viewSheets.js');
const worship = read('js/app/handlers/worship.js');
const pageFind = read('js/views/mushafPageFind.js');

test('Home has an explicit identity → core → supporting order', () => {
  const hero = css.indexOf('.view--home > .home-hero.home-hero--line');
  const core = css.indexOf('.view--home > .home-core');
  const secondary = css.indexOf('.view--home > .home-secondary');
  assert.ok(hero >= 0 && core >= 0 && secondary >= 0, 'Home order guards must exist');
  assert.ok(
    hero < core && core < secondary,
    'identity precedes Today/Start, which precedes Next/supporting'
  );
  assert.match(css.slice(core, secondary), /order:\s*1/);
});

test('desktop.css does not impose the retired Home grid dashboard', () => {
  const matches = [...desktop.matchAll(/\.view--home\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(matches.every((block) => !/display:\s*grid|grid-template-columns/.test(block)));
});

test('Home progress belongs to Today, not Next for you', () => {
  const today = home.indexOf('homeTodayStripHTML(state)');
  const progress = home.indexOf('${progressPanel}', today);
  const next = home.indexOf('home-section--next');
  assert.ok(
    today >= 0 && progress > today && next > progress,
    'Today contains progress before Next begins'
  );
});

test('invalid Quran IDs short-circuit to not-found with an accessible heading', () => {
  assert.match(quran, /id != null && id !== '' && !\/\^\[0-9\]\+\$\/.test\(String\(id\)\)/);
  assert.match(quran, /num < 1 \|\| num > 114/);
  assert.match(quran, /<h1 class="sr-only">/);
});

test('reciter picker and Mushaf page-play labels are allowed to wrap', () => {
  assert.match(css, /\.reciter-pick \.reciter-row__name[\s\S]*white-space:\s*normal/);
  assert.match(quranCss, /\.mushaf-pick-row__name[\s\S]*white-space:\s*normal/);
  assert.match(quranCss, /\.mushaf-pick-row__name[\s\S]*overflow-wrap:\s*anywhere/);
});

test('known v5.17.125 lint defects are absent', () => {
  assert.match(sheets, /import \{ VIEWS, QUIZ_LIBRARY_ID \} from/);
  assert.doesNotMatch(worship, /HTMLDetailsElement/);
  assert.equal((pageFind.match(/\.\.\/core\/i18n\.js/g) || []).length, 1);
});

test('Settings keeps the introduction replay inside Settings', () => {
  assert.match(settings, /state\.activeParams\?\.id === 'onboarding'/);
  assert.match(settings, /onboardingReplay/);
});
