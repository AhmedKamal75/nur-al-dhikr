import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const lazyData = fs.readFileSync(new URL('../js/app/lazyData.js', import.meta.url), 'utf8');
const quranHandlers = fs.readFileSync(
  new URL('../js/app/handlers/quran.js', import.meta.url),
  'utf8'
);

function assertRetryAfter(source, needle, label) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label}: failure site missing`);
  const window = source.slice(index, Math.min(source.length, index + 900));
  assert.match(window, /actionLabel:\s*t\('common\.retry'/, `${label}: no Retry action`);
  assert.match(window, /onAction:\s*\(\)\s*=>/, `${label}: no Retry handler`);
}

test('Qur’an lazy-load failures expose a deterministic Retry action', () => {
  assertRetryAfter(lazyData, "flagLoad('quran-meta', true);", 'Qur’an metadata');
  assertRetryAfter(lazyData, "flagLoad('quran-surah', true);", 'Qur’an surah');
});

test('Mushaf page-load failures expose a deterministic Retry action', () => {
  assertRetryAfter(quranHandlers, '[mushaf] navigation page load failed', 'Mushaf next/previous');
  assertRetryAfter(quranHandlers, '[mushaf] find result load failed', 'Mushaf Find');
  assertRetryAfter(quranHandlers, '[mushaf] jump page load failed', 'Mushaf jump');
  assertRetryAfter(quranHandlers, '[mushaf] surah page load failed', 'Mushaf surah entry');
});

test('current release markers remain coherent after later waves', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const config = fs.readFileSync(new URL('../js/core/config.js', import.meta.url), 'utf8');
  const manifest = JSON.parse(
    fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')
  );
  const configVersion = /APP_VERSION = '([^']+)'/.exec(config)?.[1];
  assert.ok(configVersion, 'APP_VERSION marker missing');
  assert.equal(configVersion, pkg.version);
  assert.equal(manifest.version, pkg.version);
});
