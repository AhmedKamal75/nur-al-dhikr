/**
 * offline-gzip.test.js — compressed downloads (v5.3.0): transparent
 * .json.gz fetching with plain fallback, the storage-mode toggle, and
 * the packaging script.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { fetchJSON } from '../js/app/net.js';
import { actions, store } from '../js/core/state.js';
import { sanitizeSettings } from '../js/core/config.js';
import { clearTextCache } from '../js/app/offlineJobs.js';
import { clickHandlers } from '../js/app/handlers/offline.js';
import { renderOffline } from '../js/views/offline.js';
import { initialState } from '../js/core/state/initial.js';
// No static import of scripts/: shipped archives may omit scripts/
// (ARCHITECTURE.md packaging rule). The packaging test below loads it
// dynamically and skips gracefully when absent.

const DOC = { ok: true, ayahs: [{ number: 1 }] };
const gzBytes = () => gzipSync(Buffer.from(JSON.stringify(DOC)));

function stubFetch(handler) {
  const real = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = real;
  };
}

function prefOn() {
  store.dispatch(actions.updateSettings({ compressedDownloads: true }));
}

function prefOff() {
  store.dispatch(actions.updateSettings({ compressedDownloads: false }));
}

test('gzip: decodes .json.gz served as application/gzip', async () => {
  prefOn();
  const seen = [];
  const restore = stubFetch(async (url) => {
    seen.push(String(url));
    return new Response(gzBytes(), { headers: { 'Content-Type': 'application/gzip' } });
  });
  try {
    assert.deepEqual(await fetchJSON('data/x.json'), DOC);
    assert.deepEqual(seen, ['data/x.json.gz']);
  } finally {
    restore();
    prefOff();
  }
});

test('gzip: pre-decoded body under a .gz URL still parses', async () => {
  prefOn();
  const restore = stubFetch(async () => new Response(JSON.stringify(DOC)));
  try {
    // A host that gunzips for us (Content-Encoding): decode attempt fails
    // on plain JSON and the original body is used instead.
    assert.deepEqual(await fetchJSON('data/x.json.gz'), DOC);
  } finally {
    restore();
    prefOff();
  }
});

test('gzip: missing .gz (404) falls back to plain', async () => {
  prefOn();
  const seen = [];
  const restore = stubFetch(async (url) => {
    seen.push(String(url));
    if (String(url).endsWith('.gz')) return new Response('nope', { status: 404 });
    return new Response(JSON.stringify(DOC), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    assert.deepEqual(await fetchJSON('data/x.json'), DOC);
    assert.deepEqual(seen, ['data/x.json.gz', 'data/x.json']);
  } finally {
    restore();
    prefOff();
  }
});

test('gzip: genuine failures still throw (no masking)', async () => {
  prefOn();
  const restore = stubFetch(async (url) =>
    String(url).endsWith('.gz')
      ? new Response('x', { status: 500 })
      : new Response('x', { status: 500 })
  );
  try {
    await assert.rejects(fetchJSON('data/x.json'), /500/);
  } finally {
    restore();
    prefOff();
  }
});

test('gzip: pref off fetches plain once', async () => {
  prefOff();
  const seen = [];
  const restore = stubFetch(async (url) => {
    seen.push(String(url));
    return new Response(JSON.stringify(DOC));
  });
  try {
    assert.deepEqual(await fetchJSON('data/x.json'), DOC);
    assert.deepEqual(seen, ['data/x.json']);
  } finally {
    restore();
  }
});

test('gzip: setting sanitizes to boolean, default on (PERF-01B)', () => {
  assert.equal(sanitizeSettings({}).compressedDownloads, true);
  assert.equal(sanitizeSettings({ compressedDownloads: true }).compressedDownloads, true);
  // Stored explicit opt-outs survive: the default flip must never
  // re-enable compression for an existing install that turned it off.
  assert.equal(sanitizeSettings({ compressedDownloads: false }).compressedDownloads, false);
  assert.equal(sanitizeSettings({ compressedDownloads: 'yes' }).compressedDownloads, true);
  assert.equal(initialState().settings.compressedDownloads, true);
});

test('gzip: every catalog library ships a .json.gz sibling (default-on gate)', () => {
  // Fresh installs fetch url + '.gz' first: a missing sibling costs a
  // wasted 404 round-trip per library (the plain fallback still works,
  // so this is a packaging gate, not a correctness one).
  const root = new URL('..', import.meta.url).pathname;
  const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
  const missing = (catalog.libraries || [])
    .map((l) => l.file)
    .filter((f) => f && !existsSync(join(root, `${f}.gz`)));
  assert.deepEqual(missing, [], `libraries without a prebuilt .json.gz: ${missing.join(', ')}`);
});

test('gzip: toggle flips pref, wipes data caches, resets statuses', async () => {
  globalThis.document = { getElementById: () => null };
  const deleted = [];
  globalThis.caches = {
    keys: async () => ['nur-al-dhikr-v9-data', 'nur-al-dhikr-v9-shell', 'other'],
    delete: async (k) => {
      deleted.push(k);
      return true;
    },
  };
  prefOff();
  try {
    await clickHandlers['offline-toggle-compressed']({}, {}, { checked: true });
    assert.equal(store.getState().settings.compressedDownloads, true);
    assert.deepEqual(deleted, ['nur-al-dhikr-v9-data']);
    assert.deepEqual(store.getState().settings.offline, {});
    await clickHandlers['offline-toggle-compressed']({}, {}, { checked: false });
    assert.equal(store.getState().settings.compressedDownloads, false);
  } finally {
    delete globalThis.document;
    delete globalThis.caches;
    prefOff();
  }
});

test('gzip: clearTextCache is a safe no-op without the Cache API', async () => {
  assert.equal(await clearTextCache(), 0);
});

test('gzip: view shows the storage-mode section with live state', () => {
  const s = initialState();
  s.settings.language = 'en';
  s.settings.compressedDownloads = true;
  const html = renderOffline(s);
  assert.ok(html.includes('data-action="offline-toggle-compressed"'));
  assert.ok(html.includes('checked'));
  assert.ok(html.includes('~27 MB'));
});

test('gzip: compress-data script only zips JSON, recursively', async (t) => {
  let compressDir;
  try {
    ({ compressDir } = await import('../scripts/compress-data.mjs'));
  } catch {
    t.skip('scripts/ not shipped in this packaging');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'gz-'));
  const big = JSON.stringify({
    ayahs: Array.from({ length: 200 }, (_, i) => ({
      number: i,
      text: 'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ',
    })),
  });
  writeFileSync(join(dir, 'a.json'), big);
  writeFileSync(join(dir, 'b.txt'), 'plain');
  const { files, raw, gz } = compressDir(dir);
  assert.equal(files, 1);
  assert.ok(raw > gz * 2, `expected real compression, got ${raw} -> ${gz}`);
  assert.ok(existsSync(join(dir, 'a.json.gz')));
  assert.ok(!existsSync(join(dir, 'b.txt.gz')));
});
