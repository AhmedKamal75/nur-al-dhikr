#!/usr/bin/env node
/**
 * icon-audit.mjs — standing icon-system integrity gate (v3.13, moved to
 * tests/helpers/ in v3.16.0).
 *
 * WHY THIS LIVES INSIDE THE APP BOUNDARY NOW: the release zip packages the
 * app directory only — repo-root `scripts/` is excluded by the documented
 * release protocol (AGENTS.md §4.4). tests/icons.test.js used to import
 * this file from `../../scripts/`, which hard-crashed the entire test file
 * with ERR_MODULE_NOT_FOUND the moment `npm test` ran from the shipped zip
 * (zero tests in the file even ran). Same defect class as the earlier
 * hostileGate.test.js failure, one level worse. The rule is now in
 * AGENTS.md §3: logic a test needs lives inside the app; repo-root
 * `scripts/icon-audit.mjs` is a thin shim re-exporting from here so the
 * standing CLI command keeps working.
 *
 * Collects EVERY icon name the app can reference:
 *   - static `icon('name')` calls and ternary `icon(cond ? 'a' : 'b')`
 *     first arguments across all js source files;
 *   - `icon: 'name'` object-map values across all js source files (nav
 *     items, moods, checklist items, category defaults…);
 *   - the exported icon maps PRAYER_ICONS / STEP_ICONS (their keys aren't
 *     `icon:`, so the regex pass can't see them);
 *   - `"icon": "name"` fields in data JSON (top level only — the large
 *     corpora in subdirectories carry no icon fields).
 *
 * Fails (exit 1) when:
 *   - any referenced name is not defined in PATHS or ALIASES — that name
 *     would silently render the blank-square fallback in production;
 *   - an ALIASES value points at a non-existent glyph;
 *   - two PATHS entries carry byte-identical path data (duplicates must be
 *     aliases, not copy-paste);
 *   - any icon body contains dead markup (opacity="0").
 *
 * Reports (exit 0): defined-but-never-referenced names (informational —
 * a small reserve is fine; prune if it grows).
 *
 * Run standalone:  node tests/helpers/icon-audit.mjs
 *                  node ../scripts/icon-audit.mjs   (shim, same gate)
 * Or via the test: tests/icons.test.js imports auditIcons() from here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATHS, ALIASES } from '../../js/core/icons.js';
import { PRAYER_ICONS } from '../../js/views/prayer.js';
import { STEP_ICONS } from '../../js/views/onboardingPanel.js';

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    // skip the definition file itself — its docstrings contain literal
    // `icon('x')` examples that are not real call sites
    else if (entry.name.endsWith('.js') && entry.name !== 'icons.js') out.push(p);
  }
  return out;
}

export function auditIcons(appRoot = APP_ROOT) {
  const known = new Set([...Object.keys(PATHS), ...Object.keys(ALIASES)]);
  const referenced = new Set();
  const NAME = '[\'"]([a-zA-Z0-9_-]+)[\'"]';

  for (const file of walk(join(appRoot, 'js'))) {
    const src = readFileSync(file, 'utf8');
    // static first-argument calls: icon('x'), icon("x")
    for (const m of src.matchAll(new RegExp(`\\bicon\\(\\s*${NAME}`, 'g'))) {
      referenced.add(m[1]);
    }
    // ternary first arguments: icon(cond ? 'a' : 'b', …)
    for (const m of src.matchAll(
      new RegExp(`\\bicon\\(\\s*[^'")\\s][^,)]*\\?\\s*${NAME}\\s*:\\s*${NAME}`, 'g')
    )) {
      referenced.add(m[1]);
      referenced.add(m[2]);
    }
    // icon-map object values anywhere in view/feature code: icon: 'x'
    for (const m of src.matchAll(new RegExp(`\\bicon\\s*:\\s*${NAME}`, 'g'))) {
      referenced.add(m[1]);
    }
  }

  // exported maps whose keys aren't literally `icon:`
  for (const map of [PRAYER_ICONS, STEP_ICONS]) {
    for (const v of Object.values(map)) referenced.add(v);
  }

  // data files (top level only)
  const dataDir = join(appRoot, 'data');
  for (const entry of readdirSync(dataDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const src = readFileSync(join(dataDir, entry.name), 'utf8');
    for (const m of src.matchAll(/"icon"\s*:\s*"([a-zA-Z0-9_-]+)"/g)) referenced.add(m[1]);
  }

  const unknown = [...referenced].filter((n) => !known.has(n)).sort();
  // alias targets render through their aliases — not "unused" drawings
  const viaAlias = new Set(Object.values(ALIASES));
  const unused = [...Object.keys(PATHS)]
    .filter((n) => !referenced.has(n) && !viaAlias.has(n))
    .sort();

  const seen = new Map();
  const duplicates = [];
  for (const [name, body] of Object.entries(PATHS)) {
    if (seen.has(body)) duplicates.push(`${name} duplicates ${seen.get(body)}`);
    else seen.set(body, name);
  }

  const deadMarkup = Object.entries(PATHS)
    .filter(([, body]) => body.includes('opacity="0"'))
    .map(([name]) => name);

  const brokenAliases = Object.entries(ALIASES)
    .filter(([, target]) => !PATHS[target])
    .map(([alias]) => alias);

  return {
    referenced: [...referenced].sort(),
    unknown,
    unused,
    duplicates,
    deadMarkup,
    brokenAliases,
  };
}

export function runCli() {
  const r = auditIcons();
  console.log(
    `icon-audit: ${r.referenced.length} referenced names, ${Object.keys(PATHS).length} defined, ${Object.keys(ALIASES).length} aliases`
  );
  if (r.unknown.length) {
    console.error('FAIL unknown referenced names (would render the blank-square fallback):');
    for (const n of r.unknown) console.error(`  - ${n}`);
  }
  if (r.brokenAliases.length) {
    console.error('FAIL aliases pointing at missing glyphs:');
    for (const n of r.brokenAliases) console.error(`  - ${n}`);
  }
  if (r.duplicates.length) {
    console.error('FAIL duplicated path data (use ALIASES instead):');
    for (const n of r.duplicates) console.error(`  - ${n}`);
  }
  if (r.deadMarkup.length) {
    console.error('FAIL dead markup (opacity="0") in:');
    for (const n of r.deadMarkup) console.error(`  - ${n}`);
  }
  if (r.unused.length) {
    console.log(`info: defined but never referenced (${r.unused.length}): ${r.unused.join(', ')}`);
  }
  const failed =
    r.unknown.length || r.brokenAliases.length || r.duplicates.length || r.deadMarkup.length;
  if (!failed) console.log('icon-audit: PASS');
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
