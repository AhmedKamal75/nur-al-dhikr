/**
 * Hostile review: untrusted local-file import boundaries.
 *
 * Guards against memory-pressure / parse-DoS from arbitrarily large JSON files
 * and reserved object keys entering family-plan counter maps.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MAX_IMPORT_FILE_BYTES, isImportFileTooLarge } from '../js/services/backup.js';
import { PLAN_KIND, sanitizePlan } from '../js/domain/planExport.js';

const imports = readFileSync(new URL('../js/app/fileImports.js', import.meta.url), 'utf8');

test('hostile import: oversized JSON is rejected before FileReader is invoked', () => {
  assert.equal(MAX_IMPORT_FILE_BYTES, 8 * 1024 * 1024);
  assert.equal(isImportFileTooLarge({ size: 0 }), false);
  assert.equal(isImportFileTooLarge({ size: MAX_IMPORT_FILE_BYTES }), false);
  assert.equal(isImportFileTooLarge({ size: MAX_IMPORT_FILE_BYTES + 1 }), true);
  const backupGuard = imports.indexOf('if (backup.isImportFileTooLarge(file))');
  const backupRead = imports.indexOf(
    'const text = await backup.readFileAsText(file);',
    backupGuard
  );
  assert.ok(backupGuard >= 0 && backupRead > backupGuard, 'backup guard precedes file read');
  const planGuard = imports.indexOf('if (backup.isImportFileTooLarge(file))', backupRead);
  const planRead = imports.indexOf('const text = await backup.readFileAsText(file);', planGuard);
  assert.ok(planGuard >= 0 && planRead > planGuard, 'plan guard precedes file read');
});

test('hostile import: plan sanitizer rejects prototype-pollution object keys', () => {
  const payload = {
    kind: PLAN_KIND,
    plan: {
      dailyGoal: 100,
      tasbihTargets: {
        normal: 33,
        __proto__: 44,
        constructor: 55,
        prototype: 66,
      },
    },
  };
  const clean = sanitizePlan(payload);
  assert.deepEqual(clean?.tasbihTargets, { normal: 33 });
});
