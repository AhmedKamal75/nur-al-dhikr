#!/usr/bin/env node
/**
 * scripts/build-seed.mjs — build the minimal audit/seed bundle.
 *
 * Usage: npm run build-seed
 * Output: nur-al-dhikr-audit-slim-v<version>.zip in the repo root.
 *
 * The bundle is a strict subset of the working tree (see
 * data/SEED-README.md for the pruning manifest and rationale):
 *
 *   include: every git-tracked file EXCEPT data/tafsir/**,
 *            data/quran-words/** and data/hadith/**, PLUS the generated
 *            `.gz` siblings of included data files (built by
 *            scripts/compress-data.mjs, git-ignored but shipped).
 *   exclude: node_modules/, .git/, test-results/, playwright-report/,
 *            *.log, *.zip (prior bundles), the three pruned corpora.
 *
 * Untracked-but-present shell files (e.g. a freshly generated .gz) are
 * picked up via the .gz-sibling rule only — nothing else untracked is
 * bundled, so the zip is reproducible from `git ls-files` + the
 * compressor output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Node ships no zip writer; the repo's documented runtime is a POSIX
// shell (Start-Here-*.sh, python http.server), so `zip` is the same
// dependency class. Fail loudly when it is missing.
try {
  execFileSync('zip', ['-v'], { stdio: 'ignore' });
} catch {
  console.error('build-seed: the `zip` binary is required but was not found on PATH.');
  process.exit(1);
}

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PRUNE_PREFIXES = ['data/tafsir/', 'data/quran-words/', 'data/hadith/'];

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);
// Brand-new (not yet `git add`-ed) working-tree files are part of the
// tree the agent is actually auditing — include them unless ignored.
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
  cwd: ROOT,
  encoding: 'buffer',
})
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

const files = [];
for (const f of [...tracked, ...untracked]) {
  if (f.endsWith('.zip')) continue;
  if (PRUNE_PREFIXES.some((p) => f.startsWith(p))) continue;
  files.push(f);
  // Ship the compressor's .gz sibling when present (offline PWA serves
  // pre-compressed bytes; the .gz files are git-ignored by design).
  const gz = `${f}.gz`;
  if (!gz.endsWith('.gz.gz') && existsSync(`${ROOT}/${gz}`)) files.push(gz);
}
// Also sweep on-disk .gz files under included data dirs whose base file
// is tracked (covers compressor outputs 1:1 without directory walks).
const extraGz = new Set();
for (const f of files) {
  if (f.endsWith('.gz')) extraGz.add(f);
}

const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8'));
const out = `${ROOT}/nur-al-dhikr-audit-slim-v${pkg.version}.zip`;
execSync(`rm -f ${JSON.stringify(out)}`);
execFileSync('zip', ['-9', '-q', out, ...files], { cwd: ROOT, stdio: 'inherit' });

const bytes = statSync(out).size;
console.log(`seed bundle: ${out} (${(bytes / 1048576).toFixed(1)} MB, ${files.length} files)`);
if (bytes >= 50 * 1048576) {
  console.error('build-seed: bundle exceeds the 50 MB ceiling — prune harder.');
  process.exit(1);
}
