/**
 * a11y-budget.test.js — (v5.17.2) audit ACCESS follow-up, step 1.
 * Static budget gates that run in unit CI (no browser needed):
 * touch target >= 44px, visible focus, reduced-motion kill rule,
 * RTL shell, and named controls on the always-visible player bar.
 * Full axe-core + screen-reader pass remains a browser-CI job
 * (see .github/workflows/check.yml `accessibility`).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(root, p), 'utf8');

describe('accessibility budget (static)', () => {
  test('touch target token is >= 44px', () => {
    const css = read('assets/css/accessibility.css');
    const m = /--touch-target:\s*(\d+)px/.exec(css);
    assert.ok(m, '--touch-target token must exist');
    assert.ok(Number(m[1]) >= 44, `touch target ${m[1]}px < 44px minimum`);
  });

  test('visible focus + reduced-motion kill rules exist', () => {
    const a11y = read('assets/css/accessibility.css');
    assert.match(a11y, /:focus-visible/, 'focus-visible styles required');
    const animations = read('assets/css/animations.css');
    assert.match(
      animations,
      /prefers-reduced-motion:\s*reduce/,
      'reduced-motion kill rule required'
    );
  });

  test('shell is RTL-capable with a lang attribute', () => {
    const html = read('index.html');
    assert.match(html, /<html[^>]*lang="/, 'html lang required');
    const theme = read('js/core/theme.js');
    assert.match(
      theme,
      /setAttribute\('dir'[^)]*'rtl'[^)]*\)|dir.*rtl.*ltr/s,
      'theme must set document direction'
    );
  });

  test('player bar controls are all named', () => {
    const bar = read('js/views/playerBar.js');
    const buttons = [...bar.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
    assert.ok(buttons.length >= 5, 'player bar must keep its controls');
    for (const b of buttons) {
      assert.ok(/aria-label=/.test(b), `unnamed player control: ${b.slice(0, 80)}`);
    }
  });

  test('views keep heading structure (screen-reader landmarks)', () => {
    const views = readdirSync(path.join(root, 'js/views')).filter((f) => f.endsWith('.js'));
    const without = views.filter((f) => !/<h[12][\s>]/.test(read(`js/views/${f}`)));
    // Player bar is a toolbar (aria-labelled), not a document view.
    assert.deepEqual(
      without.filter((f) => f !== 'playerBar.js'),
      [],
      `views missing h1/h2: ${without.join(', ')}`
    );
  });

  test('compact visuals keep a >=44px effective hit area via ::after aprons', () => {
    // A11Y-01 contract: .icon-btn--sm is 36px visual + 6px ::after apron
    // per side (48px effective); .chip is 40px min-height + 6px per side
    // (52px effective). These rules are intentional accessibility
    // affordances — removing or shrinking them is a release-blocking
    // regression even though the visuals stay compact.
    const css = read('assets/css/components.css');
    const sm = /\.icon-btn--sm::after\s*\{[^}]*inset-block:\s*-6px[^}]*inset-inline:\s*-6px/s.exec(
      css
    );
    assert.ok(sm, '.icon-btn--sm::after must expand 6px per side (36 -> 48px effective)');
    const chip = /\.chip::after\s*\{[^}]*inset-block:\s*-6px/s.exec(css);
    assert.ok(chip, '.chip::after must expand 6px vertically (40 -> 52px effective)');
    // The base icon button itself must be full-size, not compact.
    assert.match(css, /\.icon-btn\s*\{[^}]*width:\s*var\(--touch-target\)/s);
  });
});
