/**
 * tests/review-v3.3-fixes.test.js
 * Regression tests for the v3.3.0 adversarial-review fixes (see
 * REVIEW-v3.3.0.md): settings sanitization, zakat symbol escaping,
 * router malformed-hash resilience, and the service-worker precache
 * completeness check that guards the offline-install promise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeSettings, sanitizeMushafPrefs, DEFAULT_SETTINGS } from '../js/config.js';
import { formatAmount } from '../js/zakat.js';
import { safeDecode } from '../js/router.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* sanitizeSettings — hostile payloads (review B1/B4/B5)               */
/* ------------------------------------------------------------------ */

test('sanitizeSettings neutralizes a crafted mushafPrefs XSS payload', () => {
  const hostile = sanitizeSettings({
    mushafPrefs: {
      fontScale: '1" onmouseover="window.__xss=1;//',
      lineSpacing: '"><img src=x onerror=alert(1)>',
    },
  });
  // Numeric slots coerce to clamped numbers — never strings.
  assert.equal(typeof hostile.mushafPrefs.fontScale, 'number');
  assert.equal(typeof hostile.mushafPrefs.lineSpacing, 'number');
  assert.ok(!String(hostile.mushafPrefs.fontScale).includes('onmouseover'));
  assert.ok(!String(hostile.mushafPrefs.lineSpacing).includes('<img'));
});

test('sanitizeSettings deep-merges defaults so partial payloads keep features on', () => {
  const restored = sanitizeSettings({ mushafPrefs: { font: 'amiri' } });
  assert.equal(
    restored.mushafPrefs.wordByWordStudy,
    true,
    'missing keys must fall back to defaults'
  );
  assert.equal(restored.mushafPrefs.font, 'amiri');
  assert.equal(restored.mushafPrefs.paper, DEFAULT_SETTINGS.mushafPrefs.paper);
  // Nested prayer/audio objects also survive a partial payload.
  assert.equal(restored.prayer.method, DEFAULT_SETTINGS.prayer.method);
  assert.equal(restored.audio.rate, DEFAULT_SETTINGS.audio.rate);
});

test('sanitizeSettings clamps numeric settings into their slider ranges', () => {
  const s = sanitizeSettings({ fontScale: 99, arabicFontScale: 'not-a-number', dailyGoal: -5 });
  assert.ok(s.fontScale <= 1.4 && s.fontScale >= 0.85);
  assert.equal(s.arabicFontScale, DEFAULT_SETTINGS.arabicFontScale);
  assert.equal(s.dailyGoal, 1);
});

test('sanitizeSettings validates enum-ish fields', () => {
  const s = sanitizeSettings({
    language: 'fr',
    themeMode: 'neon',
    palette: 'hotpink',
    shape: 'wavy',
  });
  assert.equal(s.language, 'en');
  assert.equal(s.themeMode, DEFAULT_SETTINGS.themeMode);
  assert.equal(s.palette, DEFAULT_SETTINGS.palette);
  assert.equal(s.shape, DEFAULT_SETTINGS.shape);
});

test('sanitizeSettings survives null/undefined/garbage input wholesale', () => {
  for (const garbage of [null, undefined, 42, 'string', [], [{ a: 1 }]]) {
    const s = sanitizeSettings(garbage);
    assert.deepEqual(Object.keys(s).sort(), Object.keys(DEFAULT_SETTINGS).sort());
    assert.equal(s.mushafPrefs.wordByWordStudy, true);
  }
});

test('sanitizeMushafPrefs accepts valid values unchanged', () => {
  const p = sanitizeMushafPrefs({
    font: 'amiri',
    paper: 'sepia',
    fontScale: 1.2,
    lineSpacing: 1.1,
    pageFlipAnimation: false,
    wordByWordStudy: false,
    wordUnderline: true,
    defaultTafsir: 'jalalayn',
  });
  assert.deepEqual(p, {
    font: 'amiri',
    paper: 'sepia',
    fontScale: 1.2,
    lineSpacing: 1.1,
    pageFlipAnimation: false,
    wordByWordStudy: false,
    wordUnderline: true,
    defaultTafsir: 'jalalayn',
  });
});

/* ------------------------------------------------------------------ */
/* formatAmount — currency symbol escaping (review B2)                 */
/* ------------------------------------------------------------------ */

test('formatAmount escapes a hostile currency symbol', () => {
  const out = formatAmount(100, 'USD"><img src=x onerror=alert(1)>');
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
  assert.ok(out.startsWith('100'));
});

test('formatAmount keeps normal symbols and plain numbers working', () => {
  assert.equal(formatAmount(6800, 'USD'), '6,800 USD');
  assert.equal(formatAmount(12.5, '€'), '12.50 €');
  assert.equal(formatAmount(1000), '1,000');
});

/* ------------------------------------------------------------------ */
/* router.safeDecode — malformed deep links (review B3)                */
/* ------------------------------------------------------------------ */

test('safeDecode returns raw text for malformed percent sequences', () => {
  assert.equal(safeDecode('%C3'), '%C3');
  assert.equal(safeDecode('%E0%A4%A'), '%E0%A4%A');
  assert.equal(safeDecode('%'), '%');
});

test('safeDecode still decodes valid sequences', () => {
  assert.equal(safeDecode('morning%20adhkar'), 'morning adhkar');
  assert.equal(safeDecode('%D9%85'), 'م');
});

/* ------------------------------------------------------------------ */
/* Service-worker precache completeness (review A4)                    */
/* ------------------------------------------------------------------ */

test('every ES module imported by the app is in the SW precache list', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const match = sw.match(/const APP_SHELL = \[(.*?)\];/s);
  assert.ok(match, 'APP_SHELL list must exist in sw.js');
  const precache = new Set([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));

  // Walk the local import graph starting from js/app.js.
  const imported = new Set();
  const queue = ['js/app.js'];
  const seen = new Set(queue);
  while (queue.length) {
    const file = queue.pop();
    let src;
    try {
      src = readFileSync(join(ROOT, file), 'utf8');
    } catch {
      continue; // non-existent file: other tests cover data integrity
    }
    for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
      const dep = normalize(join(dirname(file), m[1])).replace(/\\/g, '/');
      imported.add(dep);
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }

  const missing = [...imported].filter((f) => !precache.has(f));
  assert.deepEqual(
    missing,
    [],
    `These modules are imported but NOT precached — a first-visit offline install would fail to boot: ${missing.join(', ')}`
  );
});
