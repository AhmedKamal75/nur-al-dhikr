/**
 * hygiene-gates.test.js — F-004/F-005, permanent:
 * 1. every runtime fetch() goes through the timeout layer
 *    (js/core/fetch.js is the single legal site);
 * 2. every precached JS file is reachable from js/app.js
 *    (no orphan dead weight ships with every install).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const readProject = (rel) => readFileSync(ROOT + rel, 'utf8');

function walkJs(dir, out = []) {
  for (const entry of readdirSync(ROOT + dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkJs(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

test('F-004: no raw fetch() outside js/core/fetch.js', () => {
  const offenders = [];
  for (const f of walkJs('js')) {
    if (f === 'js/core/fetch.js') continue;
    const src = stripComments(readProject(f));
    for (const m of src.matchAll(/(^|[^.\w])fetch\s*\(/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${f}:${line}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `raw fetch() bypasses the timeout layer — route through app/net.js or core/fetch.js: ${offenders.join(', ')}`
  );
});

function reachableFrom(entry) {
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    if (!existsSync(ROOT + rel)) return;
    seen.add(rel);
    const src = readProject(rel);
    const specs = [
      ...src.matchAll(/from\s+['"](\.[^'"]+)['"]/g),
      ...src.matchAll(/import\s*\(\s*['"](\.[^'"]+)['"]/g),
    ].map((m) => m[1]);
    for (const spec of specs) {
      const target = normalize(join(dirname(rel), spec)).replace(/\\/g, '/');
      const withExt = target.endsWith('.js') ? target : `${target}.js`;
      visit(withExt);
    }
  };
  visit(entry);
  return seen;
}

test('F-005: every precached JS file is reachable from js/app.js', () => {
  const sw = readProject('sw.js');
  const shellBlock = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)?.[1] || '';
  const shellJs = [...shellBlock.matchAll(/'((?:js\/)[^']+)'/g)].map((m) => m[1]);
  assert.ok(shellJs.length > 100, `suspiciously small shell: ${shellJs.length}`);
  const seen = reachableFrom('js/app.js');
  const orphans = shellJs.filter((f) => !seen.has(f));
  assert.deepEqual(orphans, [], `APP_SHELL ships unreachable modules: ${orphans.join(', ')}`);
});
