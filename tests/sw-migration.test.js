/**
 * sw-migration.test.js — (v5.17.2) audit F-04/F-05 follow-up.
 * Static contract on the service-worker migration path (browser execution
 * stays in CI): migration MUST be entry-bounded and MUST drop a fully
 * migrated old cache so upgrades never cost 2x storage; partial copies
 * MUST keep the source so no ayah is lost.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');

function migrateBody() {
  const m = /async function migrateDataCache\(\) \{([\s\S]*?)\n\}/.exec(sw);
  assert.ok(m, 'migrateDataCache must exist');
  return m[1];
}

describe('bounded data-cache migration', () => {
  test('entry cap is defined and sane', () => {
    const m = /const MIGRATE_ENTRY_CAP = (\d+);/.exec(sw);
    assert.ok(m, 'MIGRATE_ENTRY_CAP must be defined');
    const cap = Number(m[1]);
    assert.ok(cap >= 500 && cap <= 10000, `cap ${cap} outside sane range`);
    assert.ok(migrateBody().includes('MIGRATE_ENTRY_CAP'), 'cap must gate the copy loop');
  });

  test('fully migrated old caches are deleted; partial copies are kept', () => {
    const body = migrateBody();
    assert.ok(body.includes('caches.delete(key)'), 'old cache dropped after full copy');
    assert.ok(body.includes('failed === 0'), 'deletion gated on zero failures');
  });

  test('quota-aware put path is intact', () => {
    assert.ok(sw.includes('async function putWithEviction'), 'putWithEviction must survive');
  });
});
