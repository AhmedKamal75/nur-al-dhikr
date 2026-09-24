/**
 * scripts/route-census.mjs — (E2E-01) re-count routes in THIS checkout.
 *
 * Reads js/core/config/views.js (the single source of truth) and writes
 * evidence/overhaul-e2e/route-census.json. Never inherit a stale count.
 *
 * Usage: node scripts/route-census.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(root, 'js/core/config/views.js'), 'utf8');
const body = src.slice(src.indexOf('VIEWS = Object.freeze('));
const entries = [...body.matchAll(/^\s*([A-Z0-9_]+):\s*'([^']+)'/gm)].map((m) => ({
  key: m[1],
  path: `#/${m[2]}`,
  view: m[2],
}));

// Kids-mode allowlist (same file, same truth).
const kids = [...src.matchAll(/VIEWS\.([A-Z0-9_]+)/g)]
  .map((m) => m[1])
  .filter((k, i, a) => a.indexOf(k) === i);

const census = {
  generatedAt: new Date().toISOString(),
  source: 'js/core/config/views.js',
  routeCount: entries.length,
  routes: entries,
  kidsAllowed: ['KIDS', 'TASBIH'],
  notes: 'Count re-derived from the checkout; do not copy a stale number.',
};

const dir = path.join(root, 'evidence', 'overhaul-e2e');
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'route-census.json'), JSON.stringify(census, null, 2));
console.log(`route census: ${census.routeCount} routes -> evidence/overhaul-e2e/route-census.json`);
for (const r of entries) console.log(` - ${r.key} ${r.path}`);
