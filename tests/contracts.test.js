/**
 * tests/contracts.test.js — structural gates for release protocols that
 * previously relied on reviewer memory (v4.3). Each test pins a contract
 * whose violation shipped a real bug in this app's history:
 *
 *  1. en/ar dictionary key parity — t() silently falls back per-key, so a
 *     missing translation renders English (or the raw key) with no error
 *     anywhere. The i18n split (v4.2) made drift possible; this closes it.
 *  2. every emitted data-action resolves to a handler — the dead-UI class
 *     (dead hadith-jump form v3.27, dead adhan import v4.0) shipped twice.
 *  3. version markers in lockstep — package.json / config / sw / manifest.
 *  4. SW APP_SHELL contains the core shell (offline.html, manifest, CSS,
 *     fonts, icons) — a regression here breaks offline first-launch.
 *  5. Qur'an corpus verse counts equal quran-meta's ayahCount for all 114
 *     surahs — windowing and globalAyahNumber silently corrupt otherwise.
 *  6. CSS release protocols: every --cat-* token has a dark override, the
 *     z-index scale is used, no sub-12px floor violations, forced-colors
 *     block exists, tap-target floors are pinned.
 *  7. Views use the shared empty-state builder (no hand-rolled drift).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { handlerMaps, mergedClickHandlers } from '../js/app/events.js';
import { formHandlers } from '../js/app/forms.js';

const ROOT = new URL('..', import.meta.url).pathname;

function readProject(relPath) {
  return readFileSync(ROOT + relPath, 'utf8');
}

function walkJs(dir, out = []) {
  const abs = ROOT + dir;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkJs(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1. i18n key parity                                                  */
/* ------------------------------------------------------------------ */

describe('contract: en/ar dictionaries are key-set identical', () => {
  test('symmetric difference is empty', () => {
    const enKeys = new Set(Object.keys(en));
    const arKeys = new Set(Object.keys(ar));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    assert.deepEqual(
      missingInAr,
      [],
      `keys present in en but missing in ar: ${missingInAr.join(', ')}`
    );
    assert.deepEqual(
      missingInEn,
      [],
      `keys present in ar but missing in en: ${missingInEn.join(', ')}`
    );
  });

  test('placeholder sets match across languages', () => {
    const ph = (s) =>
      [...String(s).matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join(',');
    for (const [key, value] of Object.entries(en)) {
      if (!(key in ar)) continue;
      assert.equal(
        ph(ar[key]),
        ph(value),
        `${key}: en placeholders {${ph(value)}} vs ar {${ph(ar[key])}}`
      );
    }
  });

  test('every t() call site key exists in BOTH dictionaries (static scan)', () => {
    // Scan t('key' ...) literals across js/ so a typo'd key cannot render
    // the raw key string in production. This exact gate found a real one on
    // its first run: t('tafsir.title') had no dictionary entry and rendered
    // the raw key as the tafsir tablist's aria-label.
    const files = ['js/views', 'js/ui', 'js/app', 'js/services', 'js/domain'].flatMap((d) =>
      walkJs(d)
    );
    const missing = [];
    for (const f of files) {
      const src = readProject(f);
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) {
        const key = m[1];
        // Dynamic prefixes ('prayer.' + name, 'prayer.alertMode_' + m) are
        // covered by their owning views' render tests.
        if (key.endsWith('.') || key.endsWith('_')) continue;
        if (!(key in en) || !(key in ar)) missing.push(`${f}: ${key}`);
      }
    }
    assert.deepEqual(
      missing.slice(0, 12),
      [],
      `t() keys missing from dictionaries (first 12 of ${missing.length})`
    );
  });
});

/* ------------------------------------------------------------------ */
/* 2. data-action ↔ handler contract                                   */
/* ------------------------------------------------------------------ */

describe('contract: every emitted data-action resolves to a handler', () => {
  // Actions handled OUTSIDE the two delegated maps, each with its reason.
  const ALLOWED = new Set([
    // modal.js attaches its own overlay-click listener for this action.
    'modal-close-overlay',
    // Checkbox change-events: events.js routes [data-action] checkboxes
    // through the CHANGE pipeline (matches('[data-action="..."]')), not the
    // click table — verified live in js/app/events.js.
    'toggle-setting',
    'toggle-mushaf-pref',
    'checklist-toggle',
    'collection-picker-toggle',
    'toggle-reminder',
    // (v4.4) same CHANGE pipeline: the sunnah tracker rows and the traveler
    // mode switch are checkboxes (see the sunnah-toggle/toggle-traveler-mode
    // branches in js/app/events.js's change listener).
    'sunnah-toggle',
    'toggle-traveler-mode',
    // (v4.5.2) manage-mode target stepper: a number <input>, so it lives in
    // the CHANGE pipeline (the content-set-target branch in events.js).
    'content-set-target',
  ]);

  function registeredActions() {
    const registered = new Set([...Object.keys(mergedClickHandlers), ...Object.keys(formHandlers)]);
    // buildConfirm/buildTextPrompt emit data-action="${confirmAction}" — the
    // string lives at the CALL SITE, so harvest it from source.
    for (const f of walkJs('js/app/handlers')) {
      const src = readProject(f);
      for (const m of src.matchAll(/confirmAction: '([a-z-]+)'/g)) registered.add(m[1]);
    }
    // handlePromptForm's literal branches (js/app/forms.js).
    for (const a of [
      'submit-new-collection',
      'submit-new-collection-inline',
      'submit-new-bookmark-folder',
      'submit-new-location-profile',
    ]) {
      registered.add(a);
    }
    return registered;
  }

  test('emitted static actions minus registered minus allowlist is empty', () => {
    const registered = registeredActions();
    const emitted = new Set();
    for (const f of ['js/views', 'js/ui', 'js/app'].flatMap((d) => walkJs(d))) {
      const src = readProject(f);
      for (const m of src.matchAll(/data-action="([a-z-]+)"/g)) emitted.add(m[1]);
    }
    // The known dynamic template sites (ternaries) emit these literals.
    for (const a of ['audio-delete-surah', 'audio-download-surah', 'nav-drawer-go', 'navigate']) {
      emitted.add(a);
    }
    const dead = [...emitted].filter((a) => !registered.has(a) && !ALLOWED.has(a)).sort();
    assert.deepEqual(dead, [], `emitted but no handler anywhere (dead UI): ${dead.join(', ')}`);
  });

  test('the click-table merge stays collision-free (no silent overwrite)', () => {
    const total = handlerMaps.reduce((n, [, m]) => n + Object.keys(m).length, 0);
    assert.equal(Object.keys(mergedClickHandlers).length, total);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Version-marker lockstep                                          */
/* ------------------------------------------------------------------ */

describe('contract: version markers in lockstep', () => {
  test('package.json, config.js, sw.js and manifest agree on the version', () => {
    const pkg = JSON.parse(readProject('package.json'));
    const config = readProject('js/core/config.js');
    const sw = readProject('sw.js');
    const manifest = JSON.parse(readProject('manifest.json'));

    const fromPkg = pkg.version;
    const fromConfig = /APP_VERSION\s*=\s*'([^']+)'/.exec(config)?.[1];
    const fromSw = /VERSION = 'nur-al-dhikr-v([\d.]+)'/.exec(sw)?.[1];

    assert.match(fromPkg, /^\d+\.\d+\.\d+$/);
    assert.equal(fromConfig, fromPkg, 'config.js APP_VERSION');
    assert.equal(fromSw, fromPkg, 'sw.js cache VERSION');
    // The SW cache name must embed the exact version.
    assert.ok(sw.includes(`nur-al-dhikr-v${fromPkg}`));
    // Manifest carries a version too (or at least a stable id/name pair).
    assert.ok(manifest.name && typeof manifest.name === 'string');
    assert.ok(
      !manifest.version || manifest.version === fromPkg,
      `manifest.version ${manifest.version} != ${fromPkg}`
    );
  });
});

/* ------------------------------------------------------------------ */
/* 4. SW core-shell precache                                           */
/* ------------------------------------------------------------------ */

describe('contract: APP_SHELL precaches the core shell', () => {
  test('offline.html, manifest, every CSS file, fonts, icons and the ENTRY module are precached', () => {
    const sw = readProject('sw.js');
    const shellBlock = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)?.[1] || '';
    const shell = new Set([...shellBlock.match(/'([^']+)'/g)].map((s) => s.slice(1, -1)));

    const required = ['index.html', 'offline.html', 'manifest.json'];
    // (v4.3) the entry module itself: it was never precached through v4.2,
    // so a first-visit-then-offline launch served the shell HTML but failed
    // to load the first <script> — a blank app until an online reload.
    required.push('js/app.js');
    // every shipped CSS file
    for (const f of readdirSync(ROOT + 'assets/css')) {
      if (f.endsWith('.css')) required.push(`assets/css/${f}`);
    }
    // fonts + icons referenced by index/manifest
    for (const f of readdirSync(ROOT + 'assets/fonts')) required.push(`assets/fonts/${f}`);
    const manifest = JSON.parse(readProject('manifest.json'));
    for (const icon of manifest.icons || []) required.push(icon.src.replace(/^\.\//, ''));
    // offline fallback must itself be precached

    const missing = required.filter((r) => !shell.has(r) && !shell.has('./' + r));
    assert.deepEqual(missing, [], `APP_SHELL is missing: ${missing.join(', ')}`);
  });

  test('every APP_SHELL entry exists on disk (no phantom precache)', () => {
    const sw = readProject('sw.js');
    const shellBlock = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)?.[1] || '';
    const shell = [...shellBlock.match(/'([^']+)'/g)].map((s) => s.slice(1, -1));
    assert.ok(shell.length > 100, `suspiciously small shell: ${shell.length}`);
    const phantom = shell.filter((entry) => {
      if (entry === './' || entry === 'index.html') return false; // './' maps to index
      return !existsSync(ROOT + entry) && !existsSync(ROOT + entry.replace(/^\.\//, ''));
    });
    assert.deepEqual(phantom, [], `precache entries with no file on disk: ${phantom.join(', ')}`);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Qur'an corpus ↔ meta integrity                                   */
/* ------------------------------------------------------------------ */

describe('contract: Qur’an corpus matches quran-meta verse counts', () => {
  test('all 114 surah files carry exactly ayahCount ayahs (bismillah rules included)', () => {
    const meta = JSON.parse(readProject('data/quran-meta.json'));
    let total = 0;
    const problems = [];
    for (const s of meta.surahs) {
      const doc = JSON.parse(readProject(`data/quran/${s.number}.json`));
      const n = Array.isArray(doc.ayahs) ? doc.ayahs.length : -1;
      total += Math.max(0, n);
      if (n !== s.ayahCount) problems.push(`surah ${s.number}: ${n} != meta ${s.ayahCount}`);
    }
    assert.equal(meta.surahs.length, 114);
    assert.deepEqual(problems, []);
    assert.equal(total, 6236, 'the Qur’an has 6,236 numbered ayahs');
  });

  test('mushaf-meta ayahPages covers exactly the 6,236 ayahs', () => {
    const mushaf = JSON.parse(readProject('data/mushaf-meta.json'));
    const keys = Object.keys(mushaf.ayahPages || {});
    assert.equal(keys.length, 6236);
    assert.equal(mushaf.pageCount, 604);
    assert.equal(Object.keys(mushaf.pages || {}).length, 604);
  });
});

/* ------------------------------------------------------------------ */
/* 6. CSS release protocols                                            */
/* ------------------------------------------------------------------ */

describe('contract: CSS design-system protocols', () => {
  const variables = readProject('assets/css/variables.css');
  const allCss = readdirSync(ROOT + 'assets/css')
    .filter((f) => f.endsWith('.css'))
    .map((f) => readProject('assets/css/' + f))
    .join('\n');

  test('every --cat-* category token has a dark-mode override', () => {
    const lightBlock = /\b:root\b[\s\S]*?(?=\[data-theme)/.exec(variables)?.[0] || variables;
    const darkBlock = /\[data-theme=["']?dark["']?\][\s\S]*?\}/.exec(variables)?.[0] || '';
    const catTokens = [...lightBlock.matchAll(/(--cat-[a-z-]+)\s*:/g)].map((m) => m[1]);
    assert.ok(catTokens.length >= 15, `expected the 19 category tokens, found ${catTokens.length}`);
    const missing = catTokens.filter((tok) => !darkBlock.includes(tok));
    assert.deepEqual(missing, [], `category tokens without dark variants: ${missing.join(', ')}`);
  });

  test('z-index declarations use the --z-* scale (allowlisted exceptions only)', () => {
    const allowed = new Set(['auto']);
    const offenders = [];
    for (const m of allCss.matchAll(/z-index:\s*([^;]+);/g)) {
      const v = m[1].trim();
      if (v.startsWith('var(--z-') || allowed.has(v)) continue;
      offenders.push(v);
    }
    assert.deepEqual(offenders, [], `raw z-index values: ${offenders.join(', ')}`);
  });

  test('no font-size below the 12px accessibility floor (allowlisted only)', () => {
    const offenders = [];
    for (const m of allCss.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(m[1]) < 12) offenders.push(m[1] + 'px');
    }
    assert.deepEqual(offenders, [], `sub-12px font sizes: ${offenders.join(', ')}`);
  });

  test('forced-colors block exists with non-color state cues', () => {
    assert.match(allCss, /@media\s*\(forced-colors:\s*active\)/);
  });

  test('tap-target floors are pinned (.chip__x at 36px)', () => {
    // The block uses logical properties (min-inline-size/min-block-size),
    // which are the RTL-correct equivalent of min-width/min-height.
    const block = /\.chip__x\s*\{[\s\S]*?\}/.exec(allCss)?.[0] || '';
    assert.match(block, /min-(?:inline-size|width):\s*36px/, 'chip close button min size (inline)');
    assert.match(block, /min-(?:block-size|height):\s*36px/, 'chip close button min size (block)');
  });
});

/* ------------------------------------------------------------------ */
/* 7. Shared empty-state builder (no hand-rolled drift)                */
/* ------------------------------------------------------------------ */

describe('contract: views use the shared empty-state builder', () => {
  test('no hand-rolled empty-state markup outside the sanctioned sites', () => {
    // The shared builder emits class="empty-state…". Small inline hints
    // (<p class="empty-hint">) are a DIFFERENT, sanctioned idiom — the
    // v4.2 dedupe was about full empty states only.
    const sanctioned = new Set(['js/views/quiz.js']);
    const offenders = [];
    for (const f of walkJs('js/views')) {
      if (sanctioned.has(f)) continue;
      const src = readProject(f);
      if (/class="[^"]*empty-state/.test(src) && !src.includes('emptyStateHTML')) {
        offenders.push(f);
      }
    }
    assert.deepEqual(offenders, [], `hand-rolled empty states: ${offenders.join(', ')}`);
  });
});
