#!/usr/bin/env node
/**
 * scripts/wave2-org45.mjs — ORG-04 label table + ORG-05 icon census.
 * Static, deterministic. Writes evidence/wave2/org-04-labels.json and
 * evidence/wave2/org-05-icons.json.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'evidence', 'wave2');
mkdirSync(OUT, { recursive: true });
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const generatedAt = new Date().toISOString();
const write = (name, data) => {
  writeFileSync(
    join(OUT, name),
    `${JSON.stringify({ generatedAt, version: pkg.version, ...data }, null, 2)}\n`
  );
  console.log(`org45: ${name}`);
};

const { en } = await import('../js/core/i18n/en.js');
const { ar } = await import('../js/core/i18n/ar.js');

/* ---------------- ORG-04 ---------------- */
// Duplicate EN texts under different keys (same meaning twice, or worse).
const byText = new Map();
for (const [k, v] of Object.entries(en)) {
  if (typeof v !== 'string' || !v.trim()) continue;
  if (!byText.has(v)) byText.set(v, []);
  byText.get(v).push(k);
}
const duplicates = [...byText.entries()]
  .filter(([, ks]) => ks.length > 1)
  .map(([text, keys]) => ({ text: text.slice(0, 80), keys }))
  .sort((a, b) => b.keys.length - a.keys.length);
// Jargon candidates: latin tokens that rarely help an Arabic-only elder.
const JARGON = [
  'IDB',
  'URL',
  'JSON',
  'CSV',
  'ICS',
  'CDN',
  'SW',
  'PWA',
  'SRS',
  'UI',
  'UX',
  'API',
  'MB',
  'KB',
  'GB',
  'widget',
  'toggle',
  'sync',
  'cache',
  'offline',
  'online',
  'slot',
  'tier',
  'heatmap',
  'streak',
];
const jargonHits = [];
for (const [k, v] of Object.entries(en)) {
  if (typeof v !== 'string') continue;
  const found = JARGON.filter((j) => new RegExp(`\\b${j}\\b`, 'i').test(v));
  if (found.length)
    jargonHits.push({
      key: k,
      en: v.slice(0, 90),
      terms: found,
      ar: String(ar[k] || '').slice(0, 90),
    });
}
// Length outliers (EN > 90 chars may overwhelm small screens/elders).
const longLabels = Object.entries(en)
  .filter(([, v]) => typeof v === 'string' && v.length > 90)
  .map(([k, v]) => ({ key: k, len: v.length, en: v.slice(0, 110) }));
write('org-04-labels.json', {
  totals: { en: Object.keys(en).length, ar: Object.keys(ar).length },
  orphans: {
    missingInAr: Object.keys(en).filter((k) => !(k in ar)),
    missingInEn: Object.keys(ar).filter((k) => !(k in en)),
  },
  duplicateEnTexts: duplicates,
  duplicateEnTextCount: duplicates.length,
  jargonCandidates: jargonHits,
  jargonCandidateCount: jargonHits.length,
  longLabels,
  note: 'Clarity/ambiguous verdicts need human (Grandmother-lens) review; duplicates and jargon lists above are the mechanical input.',
});

/* ---------------- ORG-05 ---------------- */
const { PATHS, ALIASES } = await import('../js/core/icons.js');
const { auditIcons } = await import('../tests/helpers/icon-audit.mjs');
const audit = auditIcons();
function walkJs(dir, out = []) {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walkJs(p, out);
    else if (e.name.endsWith('.js') && e.name !== 'icons.js') out.push(p);
  }
  return out;
}
const files = walkJs('js');
const usage = {};
const sizes = {};
for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/\bicon\(\s*['"]([a-zA-Z0-9_-]+)['"]/g)) {
    (usage[m[1]] = usage[m[1]] || []).push(f);
  }
  for (const m of src.matchAll(/\bicon\(\s*([^,)]+),\s*\{[^}]*size:\s*(\d+)/g)) {
    const name = /['"]([a-zA-Z0-9_-]+)['"]/.exec(m[1]);
    if (name) (sizes[name[1]] = sizes[name[1]] || []).push(Number(m[2]));
  }
  for (const m of src.matchAll(/\biconName\s*:\s*['"]([a-zA-Z0-9_-]+)['"]/g)) {
    (usage[m[1]] = usage[m[1]] || []).push(`${f} (iconName:)`);
  }
  for (const m of src.matchAll(/\bicon\s*:\s*['"]([a-zA-Z0-9_-]+)['"]/g)) {
    (usage[m[1]] = usage[m[1]] || []).push(`${f} (icon:)`);
  }
}
// Icon-only buttons lacking an accessible name (same-tag check).
const unlabeled = [];
for (const f of files) {
  const src = read(f);
  const tags = src.match(/<button[^>]*>/g) || [];
  for (const tag of tags) {
    if (/\$\{icon\(/.test(tag) && !/aria-label=/.test(tag)) {
      unlabeled.push(`${f}: ${tag.slice(0, 100)}`);
    }
  }
}
const DIRECTIONAL = new Set([
  'chevronLeft',
  'chevronRight',
  'chevronUp',
  'chevronDown',
  'repeat',
  'upload',
  'download',
  'back',
]);
const census = Object.keys(PATHS)
  .sort()
  .map((name) => ({
    icon: name,
    referenced: audit.referenced.includes(name),
    callSites: (usage[name] || []).length,
    sizes: [...new Set(sizes[name] || [])].sort((a, b) => a - b),
    rtlSensitive: DIRECTIONAL.has(name),
    aliasFor: Object.entries(ALIASES).find(([, t]) => t === name)?.[0] || null,
  }));
write('org-05-icons.json', {
  defined: Object.keys(PATHS).length,
  aliases: ALIASES,
  unlabeledIconButtons: unlabeled.slice(0, 40),
  unlabeledIconButtonCount: unlabeled.length,
  directionalGlyphs: [...DIRECTIONAL],
  census,
  note: 'RTL correctness of each directional use + 5-second recognition need human review (ORG-05 gate); family/stroke consistency is by construction (single icon() wrapper).',
});
console.log('org45: done.');
