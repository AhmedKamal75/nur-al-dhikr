import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('v5.17.131 offline storage persistence request is explicit and bilingual', () => {
  const view = read('js/views/offline.js');
  const handler = read('js/app/handlers/offline.js');
  const en = read('js/core/i18n/en.js');
  const ar = read('js/core/i18n/ar.js');
  assert.match(view, /data-action="offline-request-persistence"/);
  assert.match(handler, /navigator\?\.storage/);
  assert.match(handler, /storage\.persist\(\)/);
  assert.match(handler, /storage\.persisted\(\)/);
  for (const key of [
    'offline.persistenceNote',
    'offline.persistenceAction',
    'offline.persistenceAlready',
    'offline.persistenceGranted',
    'offline.persistenceDeclined',
    'offline.persistenceUnsupported',
  ]) {
    assert.match(en, new RegExp(`['"]${key}['"]\s*:`), `${key} missing in EN`);
    assert.match(ar, new RegExp(`['"]${key}['"]\s*:`), `${key} missing in AR`);
  }
});

test('v5.17.131 issue ledger closes the iOS storage-warning gap', () => {
  const issues = read('docs/OPEN-ISSUES.md');
  assert.match(
    issues,
    /\| 22\s+\| iOS storage eviction and push limits are not in the README\s+\| \*\*RESOLVED\*\*/
  );
});

test('v5.17.131 README tells readers to keep backups despite persistent-storage support', () => {
  const readme = read('README.md');
  assert.match(readme, /keep a recent backup/i);
  assert.match(readme, /persistent storage/i);
  assert.match(readme, /background.*notification|exact.*alarm/i);
});
