/**
 * adhan-cache.test.js — OPEN-ISSUES #8 (v5.17.25)
 *
 * `assets/audio/adhan/adhan.mp3` is ~2.4MB — roughly 40% of the install —
 * for a file only needed when a prayer alert fires. It must NOT be
 * precached in APP_SHELL; instead the service worker caches it cache-first
 * on first play, so install stays lean while repeat alerts work offline.
 *
 * Pinned at three levels:
 *  1. the precache literal contains no adhan entry (install never pays);
 *  2. the fetch handler has an explicit same-origin runtime path for the
 *     bundled adhan that routes to cacheFirst (first play populates the
 *     shell cache; the 200-only guard refuses 206 range slices, which
 *     cache.put() would reject);
 *  3. playback still resolves to the same bundled file, which still exists
 *     on disk (the alert path itself is untouched).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const ADHAN_PATH = 'assets/audio/adhan/adhan.mp3';

function appShellEntries(sw) {
  const block = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)?.[1] || '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('the bundled adhan is NOT precached (no install-time download)', () => {
  const sw = read('sw.js');
  const shell = appShellEntries(sw);
  assert.equal(
    shell.includes(ADHAN_PATH),
    false,
    `${ADHAN_PATH} must not be in APP_SHELL — it costs ~2.4MB at install for a file only an alert needs`
  );
  assert.equal(
    shell.some((e) => e.includes('adhan')),
    false,
    'no adhan-path variant may hide in APP_SHELL under a different spelling'
  );
});

test('the committed shell snapshot carries no adhan bytes', () => {
  const snapshot = JSON.parse(read('tests/app-shell-hashes.json'));
  assert.equal(
    ADHAN_PATH in snapshot.files,
    false,
    're-stamp the snapshot alongside the fix: the committed hashes must not pin adhan.mp3'
  );
});

test('first play caches the adhan via an explicit same-origin cache-first path', () => {
  const sw = read('sw.js');
  // An explicit matcher, so a future refactor cannot silently fold the
  // adhan back into "whatever the generic fallback does" without the
  // test naming the behaviour that was lost.
  assert.match(sw, /isAdhanRequest/, 'sw.js needs an isAdhanRequest matcher');
  const handler = sw.slice(sw.indexOf("self.addEventListener('fetch'"));
  assert.ok(handler.includes('isAdhanRequest'), 'the fetch handler must consult isAdhanRequest');
  assert.match(
    handler,
    /isAdhanRequest\(url\)[\s\S]{0,400}?cacheFirst\(request\)/,
    'an adhan request must route to cacheFirst (cache-on-first-use), not to the network uncached'
  );
  // The 206 guard: a range slice is ok:true but cache.put() rejects it,
  // so only status 200 may be stored — the same guard as the navigation
  // refresh path.
  assert.match(
    sw,
    /response && response\.status === 200/,
    'only full 200 responses may be cached (a 206 partial would throw in put)'
  );
});

test('playback still resolves to the bundled file, which still ships on disk', () => {
  const sound = read('js/services/prayerSound.js');
  assert.match(
    sound,
    /BUNDLED_ADHAN_URL = 'assets\/audio\/adhan\/adhan\.mp3'/,
    'the alert path must keep pointing at the bundled recording'
  );
  assert.ok(
    fs.existsSync(path.join(root, ADHAN_PATH)),
    'the bundled recording must still ship — cache-on-first-use needs a first network copy'
  );
  const stats = fs.statSync(path.join(root, ADHAN_PATH));
  assert.ok(
    stats.size > 1024 * 1024,
    `the file under test should still be the ~2.4MB recording, found ${stats.size} bytes`
  );
});
