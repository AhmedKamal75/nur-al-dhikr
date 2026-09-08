/**
 * tests/helpers/shell-hash.mjs — shared logic for the APP_SHELL
 * version-stamp gate (B7). The committed snapshot
 * (tests/app-shell-hashes.json) records the sha256 of every file the
 * service worker serves cache-first; any content change without a version
 * bump fails the contract gate until `npm run snapshot-shell` re-stamps.
 *
 * Lives in tests/helpers/ (not scripts/) so contract tests can import it:
 * tests must never import outside the shipped tree.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

export function parseAppShell(swText) {
  const block = /const APP_SHELL = \[([\s\S]*?)\];/.exec(swText)?.[1] || '';
  return [...block.match(/'([^']+)'/g)].map((s) => s.slice(1, -1));
}

export function shellEntryToPath(entry) {
  if (entry === './' || entry === 'index.html') return 'index.html';
  return entry.replace(/^\.\//, '');
}

export function hashFile(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

/** sha256 for every APP_SHELL entry (+ sw.js itself) that exists on disk. */
export function hashShell(rootDir, swText) {
  const files = {};
  const entries = [...parseAppShell(swText), 'sw.js'];
  for (const entry of entries) {
    const rel = shellEntryToPath(entry);
    const abs = `${rootDir}${rel}`;
    if (existsSync(abs)) files[rel] = hashFile(abs);
  }
  return files;
}

export function loadSnapshot(rootDir) {
  return JSON.parse(readFileSync(`${rootDir}tests/app-shell-hashes.json`, 'utf8'));
}
