import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

function assertRetry(source, needle, label, windowSize = 1000) {
  const i = source.indexOf(needle);
  assert.notEqual(i, -1, `${label}: failure site missing`);
  const window = source.slice(i, Math.min(source.length, i + windowSize));
  assert.match(window, /actionLabel:\s*t\('common\.retry'/, `${label}: no Retry action`);
  assert.match(window, /onAction:\s*\(\)\s*=>/, `${label}: no retry handler`);
}

test('v5.17.129 recoverable failures expose direct Retry actions', () => {
  assertRetry(
    read('js/app/audioEngine.js'),
    "console.error('[app] startAudioPlay failed'",
    'full-surah startup'
  );
  assertRetry(
    read('js/ui/modal.js'),
    "console.error('[modal] lazy sheet failed to load'",
    'lazy modal'
  );
  assertRetry(
    read('js/app/fileImports.js'),
    "console.error('[adhan-import] audio store failed to load'",
    'Adhan module load'
  );
  assertRetry(
    read('js/app/fileImports.js'),
    "console.error('[adhan-import]', err);",
    'Adhan transient save'
  );
  assertRetry(
    read('js/app/offlineJobs.js'),
    "t('offline.needOnline', lang)",
    'offline while offline'
  );
  assertRetry(
    read('js/app/handlers/audio.js'),
    "t('audio.downloadFailed', lang)",
    'single-surah audio'
  );
  assertRetry(read('js/app/handlers/audio.js'), 'failed && !saved', 'verse pack');
  assertRetry(
    read('js/app/handlers/quranAudio.js'),
    "console.error('[surah-playback] failed to start'",
    'verse-session startup'
  );
  assertRetry(
    read('js/app/handlers/audio.js'),
    "console.error('[playlist] failed to start'",
    'playlist startup'
  );
  {
    const src = read('js/app/fileImports.js');
    const i = src.indexOf('void handleImportFile(file)');
    assert.notEqual(i, -1, 'backup import retry target missing');
    assert.match(src.slice(Math.max(0, i - 500), i + 80), /common\.retry/);
  }
  {
    const src = read('js/app/fileImports.js');
    const i = src.indexOf('void handleImportPlanFile(file)');
    assert.notEqual(i, -1, 'plan import retry target missing');
    assert.match(src.slice(Math.max(0, i - 500), i + 100), /common\.retry/);
  }
  assertRetry(
    read('js/app/boot.js'),
    "console.error('[launch] open-with failed'",
    'open-with import'
  );
  assertRetry(
    read('js/app/handlers/worship.js'),
    "console.error('[prayer-adhan-clear]', err);",
    'Adhan clear'
  );
});

test('non-recoverable conditions remain actionless', () => {
  const imports = read('js/app/fileImports.js');
  const invalid = imports.slice(
    imports.indexOf("t('prayer.adhanInvalid'"),
    imports.indexOf("t('prayer.adhanImported'")
  );
  assert.doesNotMatch(invalid, /common\.retry/, 'validation failure should not offer Retry');

  const audio = read('js/app/handlers/audio.js');
  const missingStart = audio.indexOf("} else if (res.error === 'missing') {");
  const missingEnd = audio.indexOf('} else {', missingStart + 10);
  assert.notEqual(missingStart, -1, 'known-missing branch missing');
  assert.notEqual(missingEnd, -1, 'known-missing branch boundary missing');
  const missing = audio.slice(missingStart, missingEnd);
  assert.doesNotMatch(
    missing,
    /common\.retry/,
    'known-missing server media should not offer Retry'
  );
});
