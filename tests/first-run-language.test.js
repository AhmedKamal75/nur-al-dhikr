/**
 * tests/first-run-language.test.js — the two "an Arabic-only reader is
 * stranded in English chrome" verdicts, pinned by EXECUTION (not by a
 * source-grep), because both used to be believed fixed while one was
 * fragile:
 *
 *  1. A fresh install honors the OS language exactly once. A returning
 *     reader's stored choice always wins, in both directions.
 *  2. Backup parse failures carry a stable machine code. The UI maps
 *     that code to an i18n key — the previous implementation matched
 *     the ENGLISH SENTENCE, so rewording a message silently sent raw
 *     English to an Arabic-only reader again.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { BACKUP_ERRORS, parseBackup } from '../js/services/backup.js';
import { backupErrorText } from '../js/app/fileImports.js';
import { APP_VERSION, SCHEMA_VERSION } from '../js/core/config.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const STORAGE_KEY = 'nurAlDhikr:v2:state';

/**
 * Boot the store in a CHILD PROCESS: the store's storage layer memoizes
 * "is localStorage usable" at import time, so one process can only ever
 * host one environment. An in-process fake silently reuses the first
 * case's memoized connection — which is exactly how this verdict looked
 * "verified" while proving nothing.
 */
function hydrateInChild({ storedLanguage, osLanguage }) {
  const script = `
    const map = new Map();
    ${
      storedLanguage === undefined
        ? ''
        : `map.set(${JSON.stringify(STORAGE_KEY)}, JSON.stringify({ schemaVersion: ${SCHEMA_VERSION}, settings: { language: ${JSON.stringify(storedLanguage)} } }));`
    }
    const localStorage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
      removeItem: (k) => map.delete(k),
    };
    globalThis.window = { localStorage };
    globalThis.localStorage = localStorage;
    globalThis.navigator = { languages: [${JSON.stringify(osLanguage)}], language: ${JSON.stringify(osLanguage)} };
    const { store } = await import(${JSON.stringify(join(HERE, '../js/core/state/store.js'))});
    process.stdout.write(String(store.hydrate().settings.language));
  `;
  return execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    cwd: join(HERE, '..'),
  }).trim();
}

describe('first launch: the OS language is honored exactly once', () => {
  test('a fresh install on an Arabic OS starts in Arabic', () => {
    assert.equal(hydrateInChild({ osLanguage: 'ar-EG' }), 'ar');
  });

  test('a fresh install on a bare "ar" tag still reads ar', () => {
    assert.equal(hydrateInChild({ osLanguage: 'ar' }), 'ar');
  });

  test('a fresh install on a non-Arabic OS stays English (chrome is EN+AR)', () => {
    assert.equal(hydrateInChild({ osLanguage: 'fr-FR' }), 'en');
    assert.equal(hydrateInChild({ osLanguage: 'en-US' }), 'en');
  });

  test('a returning reader who chose English keeps English on an Arabic OS', () => {
    assert.equal(hydrateInChild({ storedLanguage: 'en', osLanguage: 'ar-EG' }), 'en');
  });

  test('a returning reader who chose Arabic keeps Arabic on an English OS', () => {
    assert.equal(hydrateInChild({ storedLanguage: 'ar', osLanguage: 'en-US' }), 'ar');
  });
});

describe('backup parse failures carry a code, not an English sentence', () => {
  const wrapped = (patch) =>
    JSON.stringify({
      kind: 'nur-al-dhikr-backup',
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      data: { settings: {}, favorites: [], collections: [], counters: {}, statistics: {} },
      ...patch,
    });

  test('every refusal path returns a stable code', () => {
    const cases = [
      ['not json at all', BACKUP_ERRORS.invalidJson],
      [wrapped({ schemaVersion: 99 }), BACKUP_ERRORS.futureVersion],
      [JSON.stringify('just a string'), BACKUP_ERRORS.noData],
      [JSON.stringify({ nothing: 'here' }), BACKUP_ERRORS.emptyFile],
    ];
    for (const [text, code] of cases) {
      const result = parseBackup(text);
      assert.equal(result.success, false, `${code} must refuse`);
      assert.equal(result.code, code);
    }
  });

  test('the code maps to a DIFFERENT string in each language', () => {
    for (const code of Object.values(BACKUP_ERRORS)) {
      const key = {
        [BACKUP_ERRORS.invalidJson]: 'backup.invalidJson',
        [BACKUP_ERRORS.futureVersion]: 'backup.futureVersion',
        [BACKUP_ERRORS.noData]: 'backup.noData',
        [BACKUP_ERRORS.emptyFile]: 'backup.emptyFile',
      }[code];
      assert.ok(en[key], `EN string for ${key}`);
      assert.ok(ar[key], `AR string for ${key}`);
      assert.notEqual(en[key], ar[key], `${key} must not be an English pass-through in AR`);
    }
  });

  test('reworded English no longer leaks: the UI reads the code, not the sentence', () => {
    // A future edit to the English fallback must NOT change what an
    // Arabic reader sees — that was the whole point of the codes.
    const result = {
      success: false,
      code: BACKUP_ERRORS.futureVersion,
      error: 'TOTALLY NEW WORDING',
    };
    const arabic = backupErrorText(result, 'ar');
    assert.equal(arabic, ar['backup.futureVersion']);
    assert.ok(!/TOTALLY NEW WORDING/.test(arabic), 'raw English never reaches the reader');
  });

  test('an unknown failure degrades to the generic error, never raw English', () => {
    const arabic = backupErrorText({ success: false, error: 'mystery' }, 'ar');
    assert.equal(arabic, ar['common.error']);
  });

  test('a bare string (legacy caller) can never leak an English sentence', () => {
    const arabic = backupErrorText('That file is not valid JSON.', 'ar');
    assert.equal(arabic, ar['common.error']);
  });
});
