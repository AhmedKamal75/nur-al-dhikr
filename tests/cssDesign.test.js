/**
 * cssDesign.test.js — Phase A (v3.11) design-system gates.
 *
 * These tests make the v3.11 token/contrast/focus/touch-target work
 * permanent policy:
 *   1. every var(--token) used in the CSS is defined in the CSS (or is a
 *      documented JS-set inline property) — the v3.9 hadith styles shipped
 *      with `var(--radius)` / `var(--transition-fast)` undefined and
 *      silently rendered unstyled for a whole release;
 *   2. accent color is never assigned as a text color (it cannot hold
 *      4.5:1 on light surfaces — the design system forbids it);
 *   3. the semantic/brand foregrounds keep WCAG AA contrast in light AND
 *     dark themes (recomputed here from variables.css, worst-case palette);
 *   4. the global :focus-visible rule never overrides an element's own
 *      border-radius (the pill-button focus-snap bug fixed in v3.11);
 *   5. the 44px touch-target token exists and the core standalone
 *      controls actually use it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES } from '../js/core/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_DIR = join(HERE, '..', 'assets', 'css');
const CSS_FILES = readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
const CSS = Object.fromEntries(CSS_FILES.map((f) => [f, readFileSync(join(CSS_DIR, f), 'utf8')]));
const ALL_CSS = Object.values(CSS).join('\n');

// Tokens set at runtime from JS (theme.js on <html>, views inline on their
// own elements). Everything else must be defined inside variables.css.
const JS_SET = new Set([
  '--font-scale',
  '--arabic-font-scale',
  '--color-primary-raw',
  '--color-accent-raw',
  '--radius-card',
  '--sh-radius',
  '--sw-color',
  '--fill',
  '--sk-w', // v3.14 skeleton bar width (inline on each .sk element)
  '--sk-h', // v3.14 skeleton bar height (inline on each .sk element)
  '--hifz-w', // v3.17 hifz blank width = hidden word length (inline per blank)
  '--pct',
  '--progress',
  '--p', // v4.1 progress-bar fill scale 0–1 (inline per fill)
  '--bar-h', // v4.1 bar-chart bar height in px (inline per bar)
  '--hero-pattern',
  '--mushaf-font-family',
  '--mushaf-font-scale',
  '--mushaf-line-scale',
  '--mushaf-paper-bg',
  '--mushaf-paper-ink',
  '--mushaf-paper-border',
]);

function definedTokens() {
  const set = new Set();
  for (const m of ALL_CSS.matchAll(/(--[a-zA-Z0-9_-]+)\s*:(?=\s)/g)) set.add(m[1]);
  return set;
}

// ---------- WCAG helpers (mirrors scripts/css-contrast-audit.mjs) ----------
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lum(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function mix(fg, bg, pct) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return (
    '#' +
    f
      .map((v, i) =>
        Math.round((v * pct) / 100 + b[i] * (1 - pct / 100))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
function blockTokens(selectorRe) {
  const m = CSS['variables.css'].match(selectorRe);
  assert.ok(m, `variables.css must contain block matching ${selectorRe}`);
  const out = {};
  for (const mm of m[1].matchAll(/--([a-z0-9_-]+):\s*([^;]+);/gi)) out[`--${mm[1]}`] = mm[2].trim();
  return out;
}

const root = blockTokens(/:root\s*\{([\s\S]*?)\n\}/);
const darkBlock = blockTokens(/\[data-theme=['\"]dark['\"]\]\s*\{([\s\S]*?)\n\}/);
const dark = { ...root, ...darkBlock };

test('design tokens: every var() reference resolves (nothing undefined at runtime)', () => {
  const defined = definedTokens();
  const missing = [];
  for (const [file, css] of Object.entries(CSS)) {
    for (const m of css.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
      if (!defined.has(m[1]) && !JS_SET.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, [], `undefined custom properties used: ${missing.join(', ')}`);
});

test('design tokens: the v3.9 broken token names never reappear', () => {
  assert.ok(
    !/--radius[,\s)]/.test(ALL_CSS.replace(/--radius-[a-z]/g, '')),
    'bare var(--radius) must not be used (use --radius-sm/md/lg)'
  );
  assert.ok(
    !ALL_CSS.includes('--transition-fast'),
    'undefined --transition-fast must not be used (use --dur-* + --ease-*)'
  );
});

test('design tokens: accent color is never assigned as a text color', () => {
  const violations = [];
  for (const [file, css] of Object.entries(CSS)) {
    for (const m of css.matchAll(/(?<![-a-zA-Z])color:\s*var\(\s*--color-accent\b[^)]*\)/g)) {
      violations.push(`${file}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'accent cannot hold 4.5:1 on light surfaces — use --color-accent-text only for foregrounds that are not text'
  );
});

test('contrast: text tiers hold AA on every surface they render on (light + dark)', () => {
  for (const [label, t] of [
    ['light', root],
    ['dark', dark],
  ]) {
    const surfaces = [t['--color-bg'], t['--color-surface'], t['--color-surface-alt']];
    for (const fg of ['--color-text', '--color-text-secondary', '--color-text-muted']) {
      for (const bg of surfaces) {
        assert.ok(
          ratio(t[fg], bg) >= 4.5,
          `${label}: ${fg} on ${bg} = ${ratio(t[fg], bg).toFixed(2)} (need 4.5)`
        );
      }
    }
  }
});

test('contrast: semantic foregrounds hold AA on their dark -bg surfaces', () => {
  // Dark theme redefines the foreground variants; verify the chosen values
  // (case-insensitive — prettier lowercases hex in the token file).
  const eq = (a, b) => a.toLowerCase() === b.toLowerCase();
  assert.ok(eq(darkBlock['--color-danger-text'], '#F87171'));
  assert.ok(eq(darkBlock['--color-success-text'], '#4ADE80'));
  assert.ok(eq(darkBlock['--color-warning-text'], '#FBBF24'));
  assert.ok(ratio('#F87171', dark['--color-danger-bg']) >= 4.5);
  assert.ok(ratio('#4ADE80', dark['--color-success-bg']) >= 4.5);
  assert.ok(ratio('#FBBF24', dark['--color-warning-bg']) >= 4.5);
  // Light theme semantic pairs too.
  assert.ok(ratio(root['--color-danger'], root['--color-danger-bg']) >= 4.5);
  assert.ok(ratio(root['--color-success'], root['--color-success-bg']) >= 4.5);
  assert.ok(ratio(root['--color-warning'], root['--color-warning-bg']) >= 4.5);
});

test('contrast: dark-mode brand foreground (50% white mix) holds AA for EVERY palette', () => {
  // Worst dark surface the app renders text on:
  const surfaces = [dark['--color-bg'], dark['--color-surface'], dark['--color-surface-alt']];
  for (const p of PALETTES) {
    const text = mix(p.primary, '#FFFFFF', 50);
    for (const bg of surfaces) {
      assert.ok(
        ratio(text, bg) >= 4.5,
        `palette ${p.id}: primary-text on ${bg} = ${ratio(text, bg).toFixed(2)} (need 4.5)`
      );
    }
  }
});

test('contrast: on-primary text holds AA on every palette primary fill (light theme)', () => {
  for (const p of PALETTES) {
    assert.ok(
      ratio('#FFFFFF', p.primary) >= 4.5,
      `palette ${p.id}: white on primary ${p.primary} = ${ratio('#FFFFFF', p.primary).toFixed(2)}`
    );
  }
});

test('contrast: grade chips keep AA white text', () => {
  for (const m of ALL_CSS.matchAll(/--grade-([a-z]+):\s*(#[0-9a-fA-F]{6})/g)) {
    assert.ok(
      ratio('#FFFFFF', m[2]) >= 4.5,
      `grade ${m[1]}: white on ${m[2]} = ${ratio('#FFFFFF', m[2]).toFixed(2)}`
    );
  }
});

test('focus: the global :focus-visible rule never overrides border-radius', () => {
  const m = CSS['base.css'].match(/:focus-visible\s*\{[^}]*\}/);
  assert.ok(m, 'base.css must style :focus-visible');
  assert.ok(
    !m[0].includes('border-radius'),
    'global :focus-visible must not snap pill/round elements to squares'
  );
  assert.ok(
    m[0].includes('--color-primary-text'),
    'focus ring must use the theme-tuned foreground token'
  );
});

test('touch targets: the token exists and core standalone controls use it', () => {
  assert.ok(root['--touch-target'] === '44px', '--touch-target must be 44px');
  const iconBtn = CSS['components.css'].match(/\.icon-btn\s*\{[^}]*\}/);
  assert.ok(iconBtn && iconBtn[0].includes('var(--touch-target)'), '.icon-btn must be 44px');
  const play = CSS['components.css'].match(/\.player-bar__play\s*\{[^}]*\}/);
  assert.ok(play && play[0].includes('var(--touch-target)'), '.player-bar__play must be 44px');
  // Compact buttons get explicit full-height minimums…
  for (const sel of ['.btn--sm', '.segmented__btn']) {
    const block = CSS['components.css'].match(
      new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`)
    );
    assert.ok(
      block && block[0].includes('var(--touch-target)'),
      `${sel} must reach the touch target`
    );
  }
  // …or an explicit hit-area expansion pseudo-element.
  assert.ok(
    /\.chip\s*\{[^}]*position:\s*relative/.test(CSS['components.css']),
    '.chip needs relative positioning for its hit area'
  );
  assert.ok(
    /\.chip::after\s*\{[^}]*inset-block:\s*-6px/.test(CSS['components.css']),
    '.chip needs its 44px vertical hit area'
  );
});
