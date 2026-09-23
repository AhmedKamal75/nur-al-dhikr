#!/usr/bin/env node
/**
 * scripts/wave2-baseline.mjs — Wave 2 Phase 0 baseline freezer.
 *
 * Recounts (never inherits) the v5.17.8 product surface into
 * evidence/wave2/baseline/: routes, chrome, controls, labels, icons and
 * tajweed capabilities. Screenshots and gate results are produced by the
 * sibling e2e spec / manual gate run and recorded in baseline-gates.md.
 *
 * Usage: node scripts/wave2-baseline.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'evidence', 'wave2', 'baseline');
mkdirSync(OUT, { recursive: true });

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const generatedAt = new Date().toISOString();
const write = (name, data) => {
  writeFileSync(
    join(OUT, name),
    `${JSON.stringify({ generatedAt, version: pkg.version, ...data }, null, 2)}\n`
  );
  console.log(`baseline: ${name}`);
};

/* ------------------------------------------------------------------ */
/* 1. Routes — recount VIEWS + router normalization + renderer table   */
/* ------------------------------------------------------------------ */
const viewsSrc = read('js/core/config/views.js');
const viewEntries = [...viewsSrc.matchAll(/^\s{2}([A-Z_]+):\s*'([^']+)'/gm)].map((m) => ({
  key: m[1],
  route: m[2],
}));
const routerSrc = read('js/core/router.js');
const rendererSrc = read('js/app/renderer.js');
const staticViews = [...rendererSrc.matchAll(/\[VIEWS\.([A-Z_]+)\]:\s*render\w+/g)].map(
  (m) => m[1]
);
const lazyViews = [
  ...rendererSrc.matchAll(/\[VIEWS\.([A-Z_]+)\]:\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g),
].map((m) => ({ key: m[1], module: m[2] }));
write('routes.json', {
  count: viewEntries.length,
  views: viewEntries.map((v) => ({
    ...v,
    loading: staticViews.includes(v.key)
      ? 'static'
      : lazyViews.some((l) => l.key === v.key)
        ? 'lazy'
        : 'unmapped?',
    lazyModule: (lazyViews.find((l) => l.key === v.key) || {}).module || null,
  })),
  routerNotes: {
    unknownRouteFallback: /renderHome/.test(rendererSrc),
    defaultView: 'home',
    hasQueryParams: /activeParams/.test(rendererSrc),
  },
  routerFileFirstLines: routerSrc.split('\n').slice(0, 3).join('\n'),
});

/* ------------------------------------------------------------------ */
/* 2. Chrome — recount NAV_GROUPS + mobile bar + topbar actions        */
/* ------------------------------------------------------------------ */
const shellSrc = read('js/ui/shell.js');
const navBlock = shellSrc.slice(
  shellSrc.indexOf('const NAV_GROUPS = ['),
  shellSrc.indexOf('];', shellSrc.indexOf('const NAV_GROUPS = [')) + 2
);
const groupBlocks = [...navBlock.matchAll(/label:\s*'(nav\.group\.[^']+)'/g)].map((m) => m[1]);
const navItems = [
  ...navBlock.matchAll(/\{ view: VIEWS\.([A-Z_]+), icon: '([^']+)', label: '([^']+)'/g),
].map((m) => ({ view: m[1], icon: m[2], label: m[3] }));
const mobileBlock = shellSrc.slice(
  shellSrc.indexOf('const MOBILE_ITEMS'),
  shellSrc.indexOf('];', shellSrc.indexOf('const MOBILE_ITEMS')) + 2
);
const mobileItems = [...mobileBlock.matchAll(/view: VIEWS\.([A-Z_]+)/g)].map((m) => m[1]);
const topbarActions = [...shellSrc.matchAll(/data-action="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((a, i, arr) => arr.indexOf(a) === i);
write('chrome.json', {
  desktopRailGroups: groupBlocks,
  desktopRailEntries: navItems.length,
  desktopRail: navItems,
  mobileBar: mobileItems,
  topbarActions,
});

/* ------------------------------------------------------------------ */
/* 3. Controls — static census per view module                         */
/* ------------------------------------------------------------------ */
const viewsDir = join(ROOT, 'js/views');
const controls = {};
for (const f of readdirSync(viewsDir).filter((x) => x.endsWith('.js'))) {
  const src = read(`js/views/${f}`);
  const actions = [...src.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
  const uniqActions = [...new Set(actions)].sort();
  controls[f.replace(/\.js$/, '')] = {
    dataActionUses: actions.length,
    distinctActions: uniqActions,
    buttons: (src.match(/<button\b/g) || []).length,
    inputs: (src.match(/<input\b/g) || []).length,
    selects: (src.match(/<select\b/g) || []).length,
    links: (src.match(/<a\b/g) || []).length,
  };
}
// ui/ shared components carry controls rendered inside views
const uiControls = {};
for (const f of readdirSync(join(ROOT, 'js/ui')).filter((x) => x.endsWith('.js'))) {
  const src = read(`js/ui/${f}`);
  const actions = [...src.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
  uiControls[f.replace(/\.js$/, '')] = {
    dataActionUses: actions.length,
    distinctActions: [...new Set(actions)].sort(),
  };
}
write('controls.json', { views: controls, sharedUi: uiControls });

/* ------------------------------------------------------------------ */
/* 4. Labels — full EN/AR census + orphans                             */
/* ------------------------------------------------------------------ */
const { en } = await import('../js/core/i18n/en.js');
const { ar } = await import('../js/core/i18n/ar.js');
const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();
write('labels.json', {
  en: enKeys.length,
  ar: arKeys.length,
  parity: enKeys.length === arKeys.length,
  missingInAr: enKeys.filter((k) => !(k in ar)),
  missingInEn: arKeys.filter((k) => !(k in en)),
  identicalBothLanguages: enKeys.filter((k) => k in ar && en[k] === ar[k]),
});

/* ------------------------------------------------------------------ */
/* 5. Icons — audit output snapshot                                    */
/* ------------------------------------------------------------------ */
const { auditIcons } = await import('../tests/helpers/icon-audit.mjs');
const { PATHS, ALIASES } = await import('../js/core/icons.js');
const audit = auditIcons();
write('icons.json', {
  defined: Object.keys(PATHS).length,
  aliases: Object.keys(ALIASES).length,
  referenced: audit.referenced.length,
  unused: audit.unused,
  unknown: audit.unknown,
  duplicates: audit.duplicates,
  deadMarkup: audit.deadMarkup,
  brokenAliases: audit.brokenAliases,
});

/* ------------------------------------------------------------------ */
/* 6. Tajweed capabilities inventory                                   */
/* ------------------------------------------------------------------ */
function grepFiles(pattern, dirs) {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue;
        walk(rel);
      } else if (e.name.endsWith('.js')) {
        const src = read(rel);
        const lines = src.split('\n');
        lines.forEach((ln, i) => {
          if (pattern.test(ln)) hits.push(`${rel}:${i + 1}:${ln.trim().slice(0, 120)}`);
        });
      }
    }
  };
  dirs.forEach(walk);
  return hits;
}
const tajweedFiles = [];
for (const d of ['js/domain', 'js/views', 'js/services', 'js/app', 'data']) {
  const dir = join(ROOT, d);
  if (!existsSync(dir)) continue;
  for (const e of readdirSync(dir)) {
    if (/tajweed/i.test(e)) tajweedFiles.push(`${d}/${e}`);
  }
}
const tajweedI18n = enKeys.filter((k) => /^tajweed|practice|tafsir/i.test(k) || /tajweed/i.test(k));
write('tajweed-capabilities.json', {
  files: tajweedFiles.sort(),
  i18nKeys: tajweedI18n,
  dataRefs: grepFiles(/tajweed/i, ['data']).slice(0, 5),
  note: 'Full call-site list via: grep -rn tajweed js/ | wc -l (recorded in baseline-gates.md).',
});

console.log('baseline: done.');
