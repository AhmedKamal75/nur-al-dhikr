#!/usr/bin/env node
/**
 * scripts/measure.mjs — canonical repo numbers, printed for copy-paste
 * into ARCHITECTURE.md / README.md (v5.15.0, docs-drift guard).
 * Usage: node scripts/measure.mjs
 * Counts i18n keys, test files, corpus items and markers. Read-only.
 */
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const j = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));
const itemsOf = (d) => d.items || (d.categories || []).flatMap((c) => c.items || []);

const en = Object.keys((await import('../js/core/i18n/en.js')).en).length;
const ar = Object.keys((await import('../js/core/i18n/ar.js')).ar).length;
const tests = readdirSync(`${ROOT}/tests`).filter((f) => f.endsWith('.test.js'));
const libs = ['adhkar.json', 'duas.json', 'prophet-duas.json', 'pdf-duas.json',
  'daily-sunnah.json', 'quranic.json', 'reflections.json'];
const perLib = libs.map((f) => [f, itemsOf(j(`data/${f}`)).length]);
const hadithIdx = j('data/hadith/index.json');
const hadithTotal = (hadithIdx.books || []).reduce((a, b) => a + (b.count || 0), 0);
const unk = ['adhkar.json', 'duas.json'].reduce(
  (a, f) => a + itemsOf(j(`data/${f}`)).filter((i) => (i.grade ?? i.grading) === 'Unknown').length, 0);
const pkg = j('package.json');

console.log(`version: ${pkg.version}`);
console.log(`i18n: en ${en} / ar ${ar} (parity: ${en === ar})`);
console.log(`tests: ${tests.length} files (run npm test for the count)`);
console.log(`libraries: ${perLib.reduce((a, [, n]) => a + n, 0)} items / ${libs.length} files`);
perLib.forEach(([f, n]) => console.log(`  ${f}: ${n}`));
console.log(`hadith: ${hadithTotal} local (index: ${(hadithIdx.books || []).length} books)`);
console.log(`honest Unknown grades: ${unk} (adhkar + duas)`);
