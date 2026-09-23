/**
 * startup-budget.test.js — F-013, permanent.
 *
 * First-visit parse cost is the reason lazy views exist: every static
 * `views/*` import in js/app/renderer.js is parsed before first paint.
 * Nine renderer-only leaf views (quiz, offline, about, ambient, garden,
 * mutashabihat, journal, kids, certificate) plus the three heavy views
 * (mushafReader, quran, hadith) plus three deferred hub views (statistics,
 * audioManager, roots) load via dynamic import() on first visit
 * instead. This gate pins that:
 * 1. renderer.js keeps at most 19 static view imports (34 at v5.2.14, 22 at v5.2.18);
 * 2. each lazy view has a dynamic loader AND stays in APP_SHELL
 *    (lazy must never mean offline-broken);
 * 3. no app-layer module statically imports a lazy view behind the
 *    renderer's back (which would silently re-couple it to startup).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const readProject = (rel) => readFileSync(ROOT + rel, 'utf8');

const LAZY_VIEWS = [
  'quiz',
  'offline',
  'about',
  'ambient',
  'garden',
  'mutashabihat',
  'journal',
  'kids',
  'certificate',
];

// (v5.2.18) The three largest view modules. Unlike the leaves, these had
// static app-layer edges (modal builders, the quick sheet) — all dynamic
// now, so the ban below covers the whole tree, not just the renderer.
const HEAVY_VIEWS = ['mushafReader', 'quran', 'hadith'];

// (PERF-01A) Deferred hub views: renderer-only modules on
// infrequently-first-visited routes (no handler imports their builders).
const DEFERRED_VIEWS = ['statistics', 'audioManager', 'roots'];

const ALL_LAZY = [...LAZY_VIEWS, ...HEAVY_VIEWS, ...DEFERRED_VIEWS];

const MAX_STATIC_VIEW_IMPORTS = 19;

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

test('startup budget: renderer keeps its static view imports capped', () => {
  const src = stripComments(readProject('js/app/renderer.js'));
  const staticViews = [...src.matchAll(/from\s+['"]\.\.\/views\/([^'"]+)\.js['"]/g)].map(
    (m) => m[1]
  );
  assert.ok(
    staticViews.length <= MAX_STATIC_VIEW_IMPORTS,
    `renderer statically imports ${staticViews.length} views (cap ${MAX_STATIC_VIEW_IMPORTS}): ${staticViews.join(', ')}`
  );
  for (const v of ALL_LAZY) {
    assert.ok(
      !staticViews.includes(v),
      `views/${v}.js must stay lazy (dynamic import), not static`
    );
  }
  // Editor stays static on purpose: handlers/editor.js and
  // handlers/content.js import its builders directly.
  assert.ok(
    staticViews.includes('editor'),
    'views/editor.js must stay static (handlers depend on it)'
  );
});

test('startup budget: every lazy view has a dynamic loader', () => {
  const src = stripComments(readProject('js/app/renderer.js'));
  for (const v of ALL_LAZY) {
    assert.match(
      src,
      new RegExp(`import\\(['"]\\.\\./views/${v}\\.js['"]\\)`),
      `no dynamic import() loader for views/${v}.js — the route would render a skeleton forever`
    );
  }
});

test('startup budget: lazy views stay precached (offline guarantee)', () => {
  const sw = readProject('sw.js');
  const shellBlock = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)?.[1] || '';
  for (const v of ALL_LAZY) {
    assert.match(
      shellBlock,
      new RegExp(`'js/views/${v}\\.js'`),
      `js/views/${v}.js fell out of APP_SHELL — the lazy route would 404 offline`
    );
  }
});

test('startup budget: no module anywhere statically re-couples a lazy view', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const f of readdirSync(ROOT + dir)) {
      const p = join(dir, f);
      if (statSync(ROOT + p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!f.endsWith('.js')) continue;
      // Dynamic import() loaders are the legal coupling (renderer lazy
      // table, on-demand builder chunks) — only static `from` re-couples
      // a view into the boot parse.
      const src = stripComments(readProject(p));
      for (const m of src.matchAll(/from\s+['"]([^'"]*views\/([^'"]+)\.js)['"]/g)) {
        if (ALL_LAZY.includes(m[2])) offenders.push(`${p} -> views/${m[2]}.js`);
      }
    }
  };
  walk('js');
  assert.deepEqual(
    offenders,
    [],
    `lazy views statically re-coupled to startup: ${offenders.join(', ')}`
  );
});

test('startup budget (PERF-01A): Mushaf-only font stays off the critical path', () => {
  // @font-face uses font-display:swap, so the book loads AmiriQuran on
  // first use — preloading it taxed every cold Home visit (~62KB).
  const html = readProject('index.html');
  assert.ok(!html.includes('AmiriQuran.woff2'), 'AmiriQuran must not be preloaded');
  assert.ok(html.includes('Amiri-Regular.woff2'), 'Home Arabic keeps its preload');
});

test('startup budget (PERF-02-ARCH): book CSS is route-lazy, desktop layer media-gated', () => {
  // 0 of ~500 quran.css rules match anything outside the
  // mushaf/reader/roots routes (probed live) — it must not ride index.html.
  const html = readProject('index.html');
  assert.ok(
    !html.includes('assets/css/quran.css'),
    'quran.css must be renderer-injected, not linked'
  );
  assert.match(
    html,
    /href="assets\/css\/desktop\.css" media="\(min-width: 960px\)"/,
    'desktop.css link must be media-gated (all its rules already are)'
  );
  const renderer = readProject('js/app/renderer.js');
  for (const route of ['VIEWS.MUSHAF', 'VIEWS.QURAN', 'VIEWS.ROOTS']) {
    assert.ok(
      renderer.includes(route) && renderer.includes('QURAN_CSS_ROUTES'),
      `${route} must be in the route-css set`
    );
  }
  assert.ok(
    renderer.includes('ensureQuranCss(state.activeView)'),
    'render() must ensure the book stylesheet before patching the view'
  );
});
