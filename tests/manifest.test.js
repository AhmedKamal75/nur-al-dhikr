import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildDataManifest,
  canonicalDataManifestJSON,
  checkDataManifest,
  writeDataManifest,
} from './helpers/data-manifest.mjs';

const VERSION = '9.9.9';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nur-data-manifest-'));
  mkdirSync(join(root, 'data/nested'), { recursive: true });
  writeFileSync(join(root, 'data/a.json'), '{"a":1}\n');
  writeFileSync(join(root, 'data/nested/b.json'), '{"b":2}\n');
  writeFileSync(join(root, 'data/ignored.json.gz'), 'not hashed');
  writeFileSync(join(root, 'data/seed.json'), '{"seed":true}');
  return root;
}

test('data manifest is canonical, sorted, and covers every eligible JSON file', () => {
  const root = fixture();
  try {
    const manifest = buildDataManifest(root, { mode: 'full', version: VERSION });
    assert.deepEqual(
      manifest.files.map((file) => file.path),
      ['a.json', 'nested/b.json']
    );
    assert.equal(manifest.algorithm, 'sha256');
    assert.equal(manifest.files[0].bytes, 8);
    assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(canonicalDataManifestJSON(manifest), `${JSON.stringify(manifest, null, 2)}\n`);
    writeDataManifest(root, manifest);
    const result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(buildDataManifest(root, { mode: 'full', version: VERSION }), manifest);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('data manifest detects content, size, added, removed, and mode drift', () => {
  const root = fixture();
  try {
    const manifest = buildDataManifest(root, { mode: 'full', version: VERSION });
    writeDataManifest(root, manifest);
    writeFileSync(join(root, 'data/a.json'), '{"a":2}\n');
    let result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('sha256 mismatch: a.json')));

    writeFileSync(join(root, 'data/a.json'), '{"a":22}\n');
    result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.ok(result.errors.some((error) => error.includes('byte size mismatch: a.json')));

    writeFileSync(join(root, 'data/extra.json'), '{}\n');
    result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.ok(result.errors.some((error) => error.includes('extra file not listed: extra.json')));

    result = checkDataManifest(root, { mode: 'seed', version: VERSION });
    assert.ok(result.errors.includes('mode does not match expected mode'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('data manifest rejects legacy and unsafe records', () => {
  const root = fixture();
  try {
    writeFileSync(
      join(root, 'data/manifest.json'),
      JSON.stringify({ version: VERSION, mode: 'full', files: ['a.json'] })
    );
    let result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('schemaVersion is invalid'));

    writeFileSync(
      join(root, 'data/manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        version: VERSION,
        mode: 'full',
        algorithm: 'sha256',
        files: [{ path: '../outside.json', bytes: 0, sha256: '0'.repeat(64) }],
      })
    );
    result = checkDataManifest(root, { mode: 'full', version: VERSION });
    assert.ok(result.errors.some((error) => error.includes('unsafe path')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('data manifest rejects symlinks instead of following them', () => {
  const root = fixture();
  try {
    symlinkSync(join(root, 'data/a.json'), join(root, 'data/link.json'));
    assert.throws(
      () => buildDataManifest(root, { mode: 'full', version: VERSION }),
      /rejects symlink/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
