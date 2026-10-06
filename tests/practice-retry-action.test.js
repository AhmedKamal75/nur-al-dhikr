import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/app/practice.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'js/core/i18n/en.js'), 'utf8');
const ar = fs.readFileSync(path.join(root, 'js/core/i18n/ar.js'), 'utf8');

test('Tajweed round load failure exposes a retry action', () => {
  const marker = "t('practice.loadFailed', retryLang)";
  const start = src.indexOf(marker);
  assert.ok(start >= 0, 'practice load failure toast should exist');
  const block = src.slice(start, start + 420);
  assert.match(block, /assertive:\s*true/);
  assert.match(block, /actionLabel:\s*t\('common\.retry',\s*retryLang\)/);
  assert.match(block, /onAction:\s*\(\)\s*=>/);
  assert.match(block, /startPracticeRound\(ruleId, mode\)/);
});

test('Retry label exists in both locales', () => {
  assert.match(en, /['"]common\.retry['"]\s*:\s*['"]Retry['"]/);
  assert.match(ar, /['"]common\.retry['"]\s*:\s*['"]إعادة المحاولة['"]/);
});
