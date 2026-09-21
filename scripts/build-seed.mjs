#!/usr/bin/env node
/**
 * Build the lightweight offline seed bundle without modifying the full tree.
 *
 * The full release remains complete. This command creates a temporary staged
 * tree containing representative data only:
 *   Quran: 3 surahs (1, 32, 112)
 *   Adhkar: exactly 15 items
 *   Hadith: 6 Nawawi samples (catalog retained; other books remain remote)
 *   Tafsir/grammar: 3 surahs for every bundled edition
 *   Word study: the same 3 surahs
 *   Tajweed practice: rows whose ayahs exist in the 3-surah seed
 *
 * Code, Mushaf pages/meta, root/dictionary indexes, docs, tests, etc. remain
 * present so the seed is a real runnable project rather than a data-only zip.
 */
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SEED_SURAHS = [1, 32, 112];
const rootJoin = (...xs) => join(ROOT, ...xs);
const readJson = (rel) => JSON.parse(readFileSync(rootJoin(rel), 'utf8'));
const writeJson = (abs, value) => {
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

try {
  execFileSync('zip', ['-v'], { stdio: 'ignore' });
} catch {
  console.error('build-seed: the `zip` binary is required but was not found on PATH.');
  process.exit(1);
}

const pkg = readJson('package.json');
const stage = join(tmpdir(), `nur-al-dhikr-seed-${pkg.version}-${process.pid}`);
const out = rootJoin(`nur-al-dhikr-seed-v${pkg.version}.zip`);
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
rmSync(out, { force: true });

const relOf = (abs) => relative(ROOT, abs).split(sep).join('/');
const special = new Set([
  'data/quran',
  'data/translations',
  'data/tafsir',
  'data/quran-words',
  'data/quran-word-study',
  'data/hadith',
]);
const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'test-results',
  'playwright-report',
  'coverage',
  '.seed-build',
]);

function walk(abs, fn, { skipSpecial = abs === ROOT } = {}) {
  for (const ent of readdirSync(abs, { withFileTypes: true })) {
    const child = join(abs, ent.name);
    if (ent.isDirectory()) {
      if (ignoredDirs.has(ent.name)) continue;
      if (skipSpecial) {
        const rel = relOf(child);
        if ([...special].some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
      }
      walk(child, fn, { skipSpecial });
    } else if (ent.isFile()) fn(child, ent);
  }
}

function copyRel(rel) {
  const src = rootJoin(rel);
  const dst = join(stage, rel);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst);
}

// Copy the ordinary tree, skipping the data families replaced below.
walk(ROOT, (abs, ent) => {
  const rel = relOf(abs);
  const top = rel.split('/').slice(0, 2).join('/');
  if (rel.startsWith('node_modules/') || rel.startsWith('.git/') || rel.startsWith('test-results/') || rel.startsWith('playwright-report/')) return;
  if (rel.endsWith('.zip') || rel.endsWith('.log') || rel.endsWith('.gz')) return;
  if ([...special].some((p) => rel === p || rel.startsWith(`${p}/`))) return;
  if (rel === 'data/adhkar.json') return;
  copyRel(rel);
});

// Quran corpus + translations + word study: exactly three surahs.
for (const n of SEED_SURAHS) {
  for (const base of [
    `data/quran/${n}.json`,
    `data/quran-words/${n}.json`,
    `data/quran-word-study/${n}.json`,
  ]) copyRel(base);
}
const fullStudyManifest = readJson('data/quran-word-study/index.json');
const seedWordTokens = SEED_SURAHS.reduce((sum, n) => {
  const d = readJson(`data/quran-words/${n}.json`);
  return sum + Object.values(d).reduce((n0, rows) => n0 + rows.length, 0);
}, 0);
writeJson(join(stage, 'data/quran-word-study/index.json'), {
  ...fullStudyManifest,
  schemaVersion: '1.0-seed',
  tokenCount: seedWordTokens,
  surahs: SEED_SURAHS.length,
  files: SEED_SURAHS.length,
});
// TRANSLATION_EDITIONS is JS, not JSON; copy the four non-inline overlays by
// reading their actual directories, but only for the seed surahs.
const translationDirs = readdirSync(rootJoin('data/translations'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
for (const ed of translationDirs) {
  for (const n of SEED_SURAHS) {
    const rel = `data/translations/${ed}/${n}.json`;
    if (existsSync(rootJoin(rel))) copyRel(rel);
  }
}

// Tafsir/grammar: every shipped bundled edition keeps the same 3-surah sample.
const tafsirDirs = readdirSync(rootJoin('data/tafsir'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
for (const ed of tafsirDirs) {
  for (const n of SEED_SURAHS) {
    const rel = `data/tafsir/${ed}/${n}.json`;
    if (existsSync(rootJoin(rel))) copyRel(rel);
  }
}

// Adhkar: exactly 15 representative items across categories.
const adhkar = readJson('data/adhkar.json');
let remaining = 15;
const sampleCategories = [];
for (const cat of adhkar.categories || []) {
  if (remaining <= 0) break;
  const take = Math.min(5, remaining, Array.isArray(cat.items) ? cat.items.length : 0);
  if (!take) continue;
  const items = cat.items.slice(0, take).map((it, idx) => ({ ...it, order: idx + 1 }));
  sampleCategories.push({ ...cat, items, order: sampleCategories.length + 1 });
  remaining -= take;
}
if (remaining) {
  for (const cat of adhkar.categories || []) {
    if (remaining <= 0) break;
    const existing = sampleCategories.find((c) => c.id === cat.id);
    const used = existing ? existing.items.length : 0;
    const add = Math.min(remaining, (cat.items || []).length - used);
    if (!add) continue;
    if (existing) existing.items = cat.items.slice(0, used + add).map((it, idx) => ({ ...it, order: idx + 1 }));
    else sampleCategories.push({ ...cat, items: cat.items.slice(0, add).map((it, idx) => ({ ...it, order: idx + 1 })) });
    remaining -= add;
  }
}
if (remaining) throw new Error(`Unable to construct 15 adhkar samples; ${remaining} missing`);
const seedAdhkar = {
  ...adhkar,
  metadata: { ...adhkar.metadata, version: `${adhkar.metadata?.version || 'seed'}-seed`, description: { en: 'Seed sample: 15 representative adhkar items.', ar: 'عينة تشغيلية: 15 ذكرًا ممثلًا.' } },
  categories: sampleCategories,
};
writeJson(join(stage, 'data/adhkar.json'), seedAdhkar);

// Hadith: retain catalog, but turn only Nawawi into a six-record offline sample.
const hIndex = readJson('data/hadith/index.json');
const nawawi = readJson('data/hadith/nawawi.json');
const sampleHadiths = nawawi.hadiths.slice(0, 6);
const seedNawawi = { ...nawawi, blurb: { en: 'Seed sample: first six hadith of the Nawawi collection.', ar: 'عينة تشغيلية: الأحاديث الستة الأولى من الأربعين النووية.' }, sections: [{ ...nawawi.sections[0], count: sampleHadiths.length }], hadiths: sampleHadiths };
writeJson(join(stage, 'data/hadith/nawawi.json'), seedNawawi);
writeJson(join(stage, 'data/hadith/seed-samples.json'), {
  schema_version: 1,
  source_book: 'nawawi',
  count: sampleHadiths.length,
  hadiths: sampleHadiths,
});
const seedBooks = (hIndex.books || []).map((book) => {
  if (book.id === 'nawawi') return { ...book, count: sampleHadiths.length, bundled: true, seed: true, file: 'data/hadith/nawawi.json' };
  return { ...book, bundled: false };
});
writeJson(join(stage, 'data/hadith/index.json'), { ...hIndex, books: seedBooks });

// Tajweed: keep the same schema, but only rows whose ayah exists in the seed.
const taj = readJson('data/tajweed-practice.json');
const keep = new Set(SEED_SURAHS);
const byRule = {};
for (const [rule, rows] of Object.entries(taj.byRule || {})) byRule[rule] = (rows || []).filter((e) => keep.has(Number(e.s)));
const mixed = (taj.mixed || []).filter((e) => keep.has(Number(e.s)));
const levels = { '1': {}, '2': {}, '3': {} };
for (const [rule, rows] of Object.entries(byRule)) {
  levels['1'][rule] = rows.slice(0, 10);
  levels['2'][rule] = rows.slice(0, 25);
  levels['3'][rule] = rows.slice();
}
const coverage = {};
for (const [rule, rows] of Object.entries(byRule)) {
  const ayahs = [...new Set(rows.map((e) => `${e.s}:${e.a}`))];
  coverage[rule] = { rows: rows.length, ayahs: ayahs.length };
}
writeJson(join(stage, 'data/tajweed-practice.json'), {
  ...taj,
  schemaVersion: '2.0-seed',
  generatedFrom: `${taj.generatedFrom || 'data/quran'} + seed surahs [1,32,112]`,
  corpus: { surahs: SEED_SURAHS.length, ayahs: mixed.length },
  coverage,
  levels,
  byRule,
  mixed,
});

// Keep a compact manifest that both humans and seed-aware tests can inspect.
const stageRel = (abs) => relative(stage, abs).split(sep).join('/');
const seedFileCount = [];
walk(stage, (abs, ent) => {
  if (ent.isFile()) seedFileCount.push(stageRel(abs));
}, { skipSpecial: false });
const manifest = {
  seed: true,
  version: pkg.version,
  surahs: SEED_SURAHS,
  adhkarItems: 15,
  hadithSamples: sampleHadiths.length,
  tafsirSurahs: SEED_SURAHS,
  wordStudySurahs: SEED_SURAHS,
  tajweedSurahs: SEED_SURAHS,
  generatedAt: new Date().toISOString(),
  fileCount: seedFileCount.length,
};
writeJson(join(stage, 'data/seed.json'), manifest);
writeFileSync(join(stage, 'data/SEED-README.md'), `# Seed bundle\n\nThis archive intentionally ships only Qur'an surahs ${SEED_SURAHS.join(', ')}, 15 adhkar, six Nawawi hadith samples, three-surah bundled tafsir/grammar, and the matching word-study/tajweed sample layers. The full release remains unchanged outside this staged bundle.\n`);

// Refresh seed marker's fileCount after writing the marker/README.
const finalFiles = [];
walk(stage, (abs, ent) => { if (ent.isFile()) finalFiles.push(stageRel(abs)); }, { skipSpecial: false });
manifest.fileCount = finalFiles.length;
writeJson(join(stage, 'data/seed.json'), manifest);

// Archive from the staging root. No .gz siblings are required for the seed.
const relFiles = [];
walk(stage, (abs, ent) => { if (ent.isFile()) relFiles.push(stageRel(abs)); }, { skipSpecial: false });
execFileSync('zip', ['-9', '-q', out, ...relFiles], { cwd: stage, stdio: 'inherit' });
const bytes = statSync(out).size;
console.log(`seed bundle: ${out} (${(bytes / 1048576).toFixed(1)} MB, ${relFiles.length} files)`);
if (bytes >= 50 * 1048576) {
  console.error('build-seed: bundle exceeds the 50 MB ceiling — prune harder.');
  process.exitCode = 1;
}
rmSync(stage, { recursive: true, force: true });
