#!/usr/bin/env node
/**
 * scripts/snapshot-shell.mjs — re-stamp tests/app-shell-hashes.json after
 * a version bump (B7 gate companion). Dev-only release tooling, never
 * shipped: tests must not import from scripts/ (see tests/helpers/
 * shell-hash.mjs for the shared logic).
 *
 * Usage: npm run snapshot-shell
 *        npm run snapshot-shell -- --check   (verify only: exit 1 on drift,
 *        never writes)
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { hashShell } from '../tests/helpers/shell-hash.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
const sw = readFileSync(`${ROOT}sw.js`, 'utf8');

const snapshot = { version: pkg.version, files: hashShell(ROOT, sw) };

if (process.argv.includes('--check')) {
  const path = `${ROOT}tests/app-shell-hashes.json`;
  const committed = JSON.parse(readFileSync(path, 'utf8'));
  const drift = [];
  if (committed.version !== snapshot.version) {
    drift.push(`version: committed v${committed.version} vs tree v${snapshot.version}`);
  }
  for (const [f, h] of Object.entries(snapshot.files)) {
    if (!(f in committed.files)) drift.push(`${f} (added)`);
    else if (committed.files[f] !== h) drift.push(`${f} (changed)`);
  }
  for (const f of Object.keys(committed.files)) {
    if (!(f in snapshot.files)) drift.push(`${f} (removed)`);
  }
  if (drift.length) {
    console.error(`shell snapshot drift at v${snapshot.version}:\n  ${drift.join('\n  ')}`);
    console.error('run npm run snapshot-shell to re-stamp alongside the version bump');
    process.exit(1);
  }
  console.log(`shell snapshot matches (${Object.keys(snapshot.files).length} files at v${snapshot.version})`);
  process.exit(0);
}

writeFileSync(`${ROOT}tests/app-shell-hashes.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`stamped ${Object.keys(snapshot.files).length} files at v${snapshot.version}`);
