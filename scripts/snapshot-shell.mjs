#!/usr/bin/env node
/**
 * scripts/snapshot-shell.mjs — re-stamp tests/app-shell-hashes.json after
 * a version bump (B7 gate companion). Dev-only release tooling, never
 * shipped: tests must not import from scripts/ (see tests/helpers/
 * shell-hash.mjs for the shared logic).
 *
 * Usage: npm run snapshot-shell
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { hashShell } from '../tests/helpers/shell-hash.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
const sw = readFileSync(`${ROOT}sw.js`, 'utf8');

const snapshot = { version: pkg.version, files: hashShell(ROOT, sw) };
writeFileSync(`${ROOT}tests/app-shell-hashes.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`stamped ${Object.keys(snapshot.files).length} files at v${snapshot.version}`);
