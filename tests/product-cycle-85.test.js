import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('Home defaults to daily work, not a reflection dashboard', () => {
  const panels = read('../js/domain/homePanels.js');
  assert.match(panels, /HOME_DEFAULT_VISIBLE[\s\S]*'continue'[\s\S]*'progress'/);
  assert.match(panels, /Optional[\s\S]*never auto-inserted/);
});

test('Home quick actions default to the current daily adhkar pair', () => {
  const src = read('../js/domain/quickTiles.js');
  assert.match(src, /HOME_QUICK_TILE_DEFAULTS[\s\S]*\['morning', 'evening'\]/);
});

test('Home has no decorative Shahada banner', () => {
  const src = read('../js/views/home.js');
  assert.doesNotMatch(src, /shahadaBannerHTML|SHAHADA_TEXT|shahada-banner/);
});

test('Azkar browser has a dedicated search doorway and featured daily categories', () => {
  const library = read('../js/views/library.js');
  const home = read('../js/views/home.js');
  assert.match(library, /library-search-launch/);
  assert.match(home, /category-tile-wrap--featured/);
  assert.match(home, /cat\.id === 'morning' \|\| cat\.id === 'evening'/);
});

test('Focus auto-advance is a brief handoff, not a long wait', () => {
  const runtime = read('../js/app/focusRuntime.js');
  assert.match(runtime, /scheduleAutoAdvance\(delay = 220\)/);
  assert.match(runtime, /Math\.max\(120, Math\.min\(600/);
});
