/**
 * offline-essentials.test.js — the "works offline" promise (v5.17.17)
 *
 * The About copy says "Everything lives on your device and works
 * offline". An independent audit found that false for the corpus people
 * actually recite from: on a first visit with no prior signal, #/quran
 * and #/mushaf rendered error states, because the only path to the data
 * was a Download button on a screen nobody had been told about.
 *
 * These tests pin the fix at three levels: the guard logic that decides
 * whether to spend a reader's bandwidth, the wiring that starts it, and
 * the opt-out that keeps it from being a surprise.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';
import { essentialsAutoBlocker, ESSENTIAL_GROUPS_TEST } from '../js/app/offlineJobs.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test("the essentials batch is small enough to be the app's baseline", () => {
  // The whole justification for auto-downloading is that it is cheap. If a
  // future corpus growth pushes this past a few MB, auto-download stops
  // being respectful and this test is the reminder to make it opt-in.
  assert.deepEqual([...ESSENTIAL_GROUPS_TEST], ['quran', 'mushaf']);
  const offline = read('js/domain/offline.js');
  // 114 surahs + 604 mushaf pages, and nothing that scales with the hadith
  // corpus. translations/hadith/tafsir/words must stay OUT of this set.
  for (const heavy of ['translationUrls', 'hadithUrls', 'tafsirUrls', 'wordsUrls']) {
    assert.equal(
      Object.values(ESSENTIAL_GROUPS_TEST).includes(heavy),
      false,
      `${heavy} must not be an auto-downloaded essential`
    );
    assert.ok(offline.includes(heavy), `${heavy} builder still exists`);
  }
});

test('the default is ON, so an un-upgraded install still gets the corpus', () => {
  assert.equal(
    DEFAULT_SETTINGS.offlineEssentialsAuto,
    true,
    'default must be on: an absent key must not read as "no"'
  );
  // A settings blob written by an older version has no key at all. That must
  // sanitize to true, not to undefined/false.
  const fromOld = sanitizeSettings({ ...DEFAULT_SETTINGS, offlineEssentialsAuto: undefined });
  assert.equal(fromOld.offlineEssentialsAuto, true, 'missing key sanitizes to the default');
  // The house rule for every boolean here is "boolean or fall back to the
  // default". For a setting that spends bandwidth that resolves the SAFE
  // way: a junk value reads as ON, so we download rather than silently
  // leaving a reader with a dead Qur'an and no explanation.
  assert.equal(
    sanitizeSettings({ offlineEssentialsAuto: 0 }).offlineEssentialsAuto,
    true,
    'junk falls back to the default, which is the safe direction'
  );
  assert.equal(sanitizeSettings({ offlineEssentialsAuto: false }).offlineEssentialsAuto, false);
  assert.equal(sanitizeSettings({ offlineEssentialsAuto: true }).offlineEssentialsAuto, true);
});

test('every guard that would spend bandwidth unasked reports a reason', () => {
  const done = { offline: { quran: { done: 9, total: 9 }, mushaf: { done: 8, total: 8 } } };
  assert.equal(essentialsAutoBlocker(done, true), 'complete', 'already downloaded');
  assert.equal(
    essentialsAutoBlocker({ ...done, offlineEssentialsAuto: false }, true),
    'opted-out',
    'reader said no'
  );
  assert.equal(essentialsAutoBlocker({}, false), 'offline', 'no connection to spend');
  assert.equal(essentialsAutoBlocker({}, true), null, 'nothing blocks a first run');
});

test('a partly-finished batch is retried, a finished one is not', () => {
  const partial = { offline: { quran: { done: 40, total: 228 }, mushaf: { done: 0, total: 0 } } };
  assert.equal(
    essentialsAutoBlocker(partial, true),
    null,
    'a half-finished download must resume, not be treated as done'
  );
  // done > total is a corrupt row; treating it as complete would strand the
  // reader with a permanently "downloaded" lie.
  const corrupt = { offline: { quran: { done: 999, total: 228 }, mushaf: { done: 8, total: 8 } } };
  assert.notEqual(essentialsAutoBlocker(corrupt, true), 'complete', 'absurd counts are not "done"');
});

test('boot starts the batch, and a failure there cannot stop the app opening', () => {
  const boot = read('js/app/boot.js');
  assert.ok(boot.includes('maybeAutoDownloadEssentials'), 'boot triggers the essentials batch');
  // The dynamic import sits in its own try/catch. Offline reading is a
  // promise, never a boot dependency: an unhandled rejection on this path
  // would leave a blank screen instead of the app.
  const at = boot.indexOf("import('./offlineJobs.js')");
  assert.ok(at > 0, 'the engine is imported lazily, not at module load');
  const after = boot.slice(at, at + 700);
  assert.match(after, /catch\s*\([^)]*\)\s*\{/, 'a catch guards the lazy import');
  assert.match(
    after,
    /essentials auto-download unavailable/,
    'and it reports rather than swallowing the reason'
  );
  assert.equal(/essentials auto-download unavailable[\s\S]{0,120}throw/.test(after), false);
});

test('the batch runs through the tolerant engine, never install-time addAll', () => {
  // addAll is all-or-nothing: folding 1,436 corpus files into the shell
  // install would let one flaky fetch fail the whole app. The essentials
  // must reuse the per-file, per-group-counted batch engine instead.
  const sw = read('sw.js');
  assert.equal(
    /addAll\([^)]*quran/i.test(sw),
    false,
    'the service worker must not addAll the corpus'
  );
  assert.equal(
    /APP_SHELL[\s\S]{0,4000}data\/quran/.test(sw),
    false,
    'no corpus path inside the APP_SHELL literal'
  );
  const jobs = read('js/app/offlineJobs.js');
  assert.ok(jobs.includes('runOfflineBatch'), 'reuses the counted batch engine');
});

test('the reader can see it, and turn it off, in both languages', () => {
  const view = read('js/views/offline.js');
  assert.ok(view.includes('offline-toggle-essentials-auto'), 'a real switch, not a hidden default');
  const handlers = read('js/app/handlers/offline.js');
  assert.ok(
    handlers.includes('offline-toggle-essentials-auto'),
    'the switch resolves to a handler'
  );
  for (const lang of ['en', 'ar']) {
    const i18n = read(`js/core/i18n/${lang}.js`);
    for (const key of [
      'offline.essentialsLabel',
      'offline.essentialsBody',
      'offline.essentialsOff',
    ]) {
      assert.ok(i18n.includes(`'${key}'`), `${lang} is missing ${key}`);
    }
  }
});
