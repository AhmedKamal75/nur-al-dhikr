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
import { PALETTES, MUSHAF_PAPERS } from '../js/core/config.js';

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
  '--mushaf-fit-scale', // (v5.4.0, P0-3) auto-fit engine output (wrap-inline)
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

test('contrast: light primary-text holds AA on surface AND its own active tint (v5.17.3 axe)', () => {
  // Raw brand color sits at ~4.50:1 on its own 14% active tint (axe fail).
  // The token must darken the palette raw toward ink; this test resolves
  // the ACTUAL token (not a restated formula) and checks every palette on
  // both the plain surface and the tinted active/chip backgrounds.
  const token = root['--color-primary-text'];
  const m =
    /color-mix\(in srgb,\s*var\(--color-primary-raw\)\s*([\d.]+)%,\s*(#[0-9a-fA-F]{6})\)/.exec(
      token
    );
  assert.ok(m, `--color-primary-text must darken --color-primary-raw via color-mix, got: ${token}`);
  const pct = Number(m[1]);
  const ink = m[2];
  const surface = root['--color-surface'];
  for (const p of PALETTES) {
    const text = mix(p.primary, ink, pct);
    const tint = mix(p.primary, surface, 14);
    assert.ok(
      ratio(text, surface) >= 4.5,
      `palette ${p.id}: primary-text ${text} on surface = ${ratio(text, surface).toFixed(2)} (need 4.5)`
    );
    assert.ok(
      ratio(text, tint) >= 4.5,
      `palette ${p.id}: primary-text ${text} on 14% tint ${tint} = ${ratio(text, tint).toFixed(2)} (need 4.5)`
    );
  }
});

test('contrast: dark category -text variants are brightened, not clobbered by :root order (v5.17.3 axe)', () => {
  // A later bare `:root` block once re-pinned every --cat-*-text to its
  // strong base at equal specificity, silently deleting the dark-mode
  // brightened variants (dark chips rendered base-on-dark at ~3:1).
  // This test resolves the cascade the way the browser does — matching
  // rules in (specificity, source order) — instead of assuming the dark
  // block always wins. A merged-roots-then-dark shortcut would PASS on
  // the buggy CSS; this one fails on it (verified).
  const src = CSS['variables.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  const specOf = (sel) => {
    const s = sel.replace(/:not\(([^)]*)\)/g, ' $1');
    return (
      (s.match(/#[a-zA-Z0-9_-]+/g) || []).length * 100 +
      ((s.match(/\.[a-zA-Z0-9_-]+/g) || []).length +
        (s.match(/\[[^\]]+\]/g) || []).length +
        (s.match(/:(?!:)[a-zA-Z-]+/g) || []).length) *
        10
    );
  };
  // A rule participates in the dark-mode cascade unless it explicitly
  // excludes dark (e.g. :root:not([data-theme='dark'])).
  const matchesDark = (sel) => !/:not\([^)]*data-theme=['"]dark['"]/.test(sel);
  const rules = [];
  for (const m of src.matchAll(/([^{}]+)\{([\s\S]*?)\n\}/g)) {
    const sel = m[1].trim();
    if (!/--cat-[a-z-]+:\s*[^;]+;/.test(m[2])) continue;
    if (!matchesDark(sel)) continue;
    const vars = {};
    for (const mm of m[2].matchAll(/--([a-z0-9_-]+):\s*([^;]+);/gi))
      vars[`--${mm[1]}`] = mm[2].trim();
    rules.push({ sel, spec: specOf(sel), order: m.index, vars });
  }
  assert.ok(rules.length >= 2, 'expected :root + dark rules defining category tokens');
  rules.sort((a, b) => a.spec - b.spec || a.order - b.order);
  const darkResolved = Object.assign({}, ...rules.map((r) => r.vars));
  const families = Object.keys(darkResolved)
    .filter((k) => /^--cat-[a-z]+$/.test(k))
    .map((k) => k.slice(6));
  assert.ok(families.length >= 15, `expected category families, got ${families.length}`);
  const darkSurfaces = [darkResolved['--color-bg'], darkResolved['--color-surface']];
  for (const fam of families) {
    const base = darkResolved[`--cat-${fam}`];
    const text = darkResolved[`--cat-${fam}-text`];
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(base), `${fam}: base must be a hex, got ${base}`);
    assert.ok(
      /^#[0-9a-fA-F]{6}$/.test(text),
      `${fam}: dark -text must resolve to a hex, got ${text}`
    );
    assert.notEqual(
      text.toLowerCase(),
      base.toLowerCase(),
      `${fam}: dark -text must be brightened, not the base`
    );
    for (const bg of darkSurfaces) {
      assert.ok(
        ratio(text, bg) >= 4.5,
        `${fam}: dark -text ${text} on ${bg} = ${ratio(text, bg).toFixed(2)} (need 4.5)`
      );
      const tint = mix(base, bg, 12);
      assert.ok(
        ratio(text, tint) >= 4.5,
        `${fam}: dark -text ${text} on 12% tint ${tint} = ${ratio(text, tint).toFixed(2)} (need 4.5)`
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
  const chipAfter = /\.chip::after\s*\{[^}]*inset-block:\s*-(\d+)px/.exec(CSS['components.css']);
  assert.ok(
    chipAfter && Number(chipAfter[1]) >= 6,
    '.chip needs >=6px vertical hit-area expansion for its 44px effective target'
  );
});

/* ------------------------------------------------------------------ */
/* v5.17.29 mushaf fidelity: roundel on all papers + page-height sheet */
/* ------------------------------------------------------------------ */

// Every rule block whose selector targets the ayah-end marker, as
// { selector, declarations } pairs (grouped selectors split apart).
function markerRules() {
  const out = [];
  for (const m of ALL_CSS.matchAll(/([^{}]+)\.mushaf-ayah__marker([^{}]*)\{([\s\S]*?)\n\}/g)) {
    out.push({ selector: `${m[1]}.mushaf-ayah__marker${m[2]}`.trim(), decls: m[3] });
  }
  return out;
}

test('mushaf roundel (v5.17.29): all 11 papers wear the tight roundel', () => {
  const rules = markerRules();
  assert.ok(
    rules.length >= 4,
    `expected base + madinah + cream + extension rules, got ${rules.length}`
  );
  const missing = [];
  for (const paper of MUSHAF_PAPERS) {
    const hit = rules.find(
      (r) =>
        r.selector.includes(`[data-mushaf-paper='${paper.id}']`) &&
        r.decls.includes('background-clip: content-box') &&
        r.decls.includes('outline-offset: -0.4em') &&
        r.decls.includes('border-radius: var(--radius-pill)')
    );
    if (!hit) missing.push(paper.id);
  }
  assert.deepEqual(missing, [], `papers without the tight roundel: ${missing.join(', ')}`);
});

test('mushaf roundel (v5.17.29): 30px+ hitbox kept, letter-spacing forbidden', () => {
  const base = /^\.mushaf-ayah__marker\s*\{([\s\S]*?)\n\}/m.exec(CSS['quran.css'])?.[1] || '';
  assert.ok(base, 'the base marker rule must exist');
  // The invisible hitbox: generous padding with cancelling negative
  // margins — the glyph taps like a 30px+ target without moving the paper.
  assert.match(base, /padding:\s*0\.45em 0\.55em/, 'hitbox padding intact');
  assert.match(base, /margin:\s*-0\.45em -0\.55em/, 'hitbox margins intact');
  // Arabic joins break under letter-spacing (project rule, not taste).
  assert.match(base, /letter-spacing:\s*normal/, 'marker never letter-spaced');
  for (const r of markerRules()) {
    const values = [...r.decls.matchAll(/letter-spacing\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
    assert.deepEqual(
      values.filter((v) => v !== 'normal' && v !== '0'),
      [],
      `roundel must not letter-space: ${r.selector.slice(0, 80)}`
    );
  }
});

test('mushaf roundel (v5.17.29): forced-colors falls back to a system ring', () => {
  const blocks = [
    ...ALL_CSS.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*?)\n\}/g),
  ].map((m) => m[1]);
  const hit = blocks.find((b) => b.includes('.mushaf-ayah__marker'));
  assert.ok(hit, 'a forced-colors block must restyle the ayah-end marker');
  assert.ok(hit.includes('CanvasText'), 'marker falls back to a system color');
  assert.ok(/outline:\s*1px solid/.test(hit), 'the ring survives as a shape, not a tint');
});

test('mushaf roundel (v5.17.29): marker ink holds AA on every paper', () => {
  // The marker color resolves per paper (gold 60% + paper ink; cream's
  // print red is the documented exception). Recompute the same mix the
  // stylesheet performs and demand WCAG AA against the paper ground.
  const quran = CSS['quran.css'];
  const goldOf = (block) => /--mushaf-gold:\s*(#[0-9a-fA-F]{6})/.exec(block)?.[1];
  const defaultGold = goldOf(/\.mushaf-page-wrap\s*\{([\s\S]*?)\n\}/.exec(quran)?.[1] || '');
  const darkGold = goldOf(
    /\.mushaf-page-wrap\[data-mushaf-paper='night'\][\s\S]*?\{([\s\S]*?)\n\}/.exec(quran)?.[1] || ''
  );
  const madinahGold = goldOf(
    /\.mushaf-page-wrap\[data-mushaf-paper='madinah'\]\s*\{([\s\S]*?)\n\}/.exec(quran)?.[1] || ''
  );
  assert.ok(defaultGold && darkGold && madinahGold, 'paper golds must resolve from the CSS');
  for (const paper of MUSHAF_PAPERS) {
    const gold = paper.id === 'madinah' ? madinahGold : paper.dark ? darkGold : defaultGold;
    const marker = paper.id === 'cream' ? '#b3261e' : mix(gold, paper.ink, 60);
    assert.ok(
      ratio(marker, paper.bg) >= 4.5,
      `paper ${paper.id}: marker ${marker} on ${paper.bg} = ${ratio(marker, paper.bg).toFixed(2)} (need 4.5)`
    );
  }
});

test('mushaf sheet (v5.17.29): windowed page owns a viewport-relative floor', () => {
  const quran = CSS['quran.css'];
  const m =
    /\.view--mushaf:not\(\.view--mushaf-fullscreen\)\s+\.mushaf-page\s*\{([\s\S]*?)\n\}/.exec(
      quran
    )?.[1] || '';
  assert.ok(m, 'the windowed-only sheet rule must exist');
  assert.match(m, /min-block-size:\s*clamp\(420px, 75dvh, 960px\)/, 'viewport-relative floor');
  assert.ok(!/^\s*height:/m.test(m), 'a floor, never a fixed height (tall pages still grow)');
  assert.ok(
    !m.includes('--font-scale'),
    'the sheet must not touch the app type scale (OPEN-ISSUES #49 exclusion)'
  );
});

test('mushaf sheet (v5.17.29): fullscreen auto-fit geometry untouched', () => {
  // The windowed floor must not leak into TRUE fullscreen: layout.css
  // still floors the fullscreen chain at 0 and the engine still owns
  // only the fullscreen session.
  const layout = CSS['layout.css'];
  const fsPage =
    /body\.is-mushaf-fullscreen \.mushaf-page\s*\{([\s\S]*?)\}/.exec(layout)?.[1] || '';
  assert.match(fsPage, /min-block-size:\s*0/, 'fullscreen page still floors at 0');
  const autoFit = readFileSync(join(HERE, '..', 'js', 'app', 'autoFit.js'), 'utf8');
  assert.match(
    autoFit,
    /state\.mushafFullscreen === true && state\.activeView === VIEWS\.MUSHAF/,
    'the fit engine still runs on fullscreen sessions only'
  );
});

/* ------------------------------------------------------------------ *
 * v5.17.64 — the two ways this stylesheet lost a contrast regression
 * to a rule that was individually fine.
 * ------------------------------------------------------------------ */

/** Which of background/background-color/color/border-color a rule body sets. */
function paintedProps(body) {
  const out = new Set();
  for (const m of body.matchAll(/(^|;)\s*(background|background-color|color|border-color)\s*:/g)) {
    out.add(m[2]);
  }
  return out;
}

/** Single-class rules with their byte offset, so "declared later" is checkable.
 *
 * Comments MUST be stripped first. `([^{}]+)` captures everything back to the
 * previous `}`, so a rule preceded by an explanatory comment yields a "selector"
 * of `/* why *\/ .chip--basis-active` — which fails the single-class shape test
 * and drops the rule from the index entirely. That is not hypothetical: the
 * Zakat rule this gate exists for carries a long comment, so an earlier version
 * of this gate indexed nothing and passed every mutation. A gate that cannot see
 * the rule it was written for is worse than no gate.
 */
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function singleClassRules() {
  const out = [];
  for (const f of CSS_FILES) {
    const src = stripCssComments(CSS[f]);
    // Scoped scan, because a global byte offset is not a position in the
    // cascade. `.nav__item` at layout.css:317 lives INSIDE the ≥960px media
    // block and `.nav__item--active` at :337 lives in that same block after it,
    // so the active state correctly wins; comparing raw offsets across block
    // boundaries reported it as a conflict that does not exist. Two rules can
    // only clobber each other inside the same at-rule context.
    let i = 0;
    let prelude = '';
    const stack = [];
    while (i < src.length) {
      const ch = src[i];
      if (ch === '{') {
        const at = /^\s*(@[a-zA-Z-]+)/.exec(prelude);
        if (at) stack.push(prelude.trim());
        const start = i + 1;
        let depth = 1;
        let j = start;
        while (j < src.length && depth > 0) {
          if (src[j] === '{') depth += 1;
          else if (src[j] === '}') depth -= 1;
          j += 1;
        }
        const body = src.slice(start, j - 1);
        const head = prelude.trim();
        if (!at) {
          for (const part of head.split(',')) {
            const sel = part.trim();
            if (!/^\.[a-z0-9_-]+$/.test(sel)) continue;
            const props = paintedProps(body);
            if (props.size === 0) continue;
            out.push({ sel, file: f, idx: start, props, scope: stack.join(' && ') });
          }
        }
        prelude = '';
        i = j;
        // `i` now sits past this block's closing brace, so the `}` branch below
        // will never see it. Without this pop the at-rule stack only ever
        // grows: adjacent rules share one accumulated (wrong) scope and still
        // compare equal, while two rules separated by a media block compare
        // unequal and a real conflict is silently suppressed.
        if (at) stack.pop();
        continue;
      }
      if (ch === '}') {
        stack.pop();
        prelude = '';
        i += 1;
        continue;
      }
      if (ch === ';') {
        prelude = '';
        i += 1;
        continue;
      }
      prelude += ch;
      i += 1;
    }
  }
  return out;
}

/**
 * Class pairs that actually appear TOGETHER on one element in the markup.
 *
 * This is what makes the ordering check below precise. A naive "is this
 * selector a string prefix of that one" test fires ~35 times on this
 * stylesheet, almost all of them `.quick-actions` vs `.quick-action` — classes
 * that never share an element, so the later rule cannot possibly clobber the
 * earlier one. Requiring the pair to co-occur in a rendered class list drops
 * the false positives and leaves the real conflict.
 *
 * Conditional classes are read from INSIDE the interpolation, not stripped with
 * it. js/views/zakat.js writes
 * `class="chip chip--basis ${basis === 'gold' ? 'chip--basis-active' : ''}"`,
 * so the state class exists only as a quoted literal inside `${...}`. An
 * earlier version of this deleted the interpolation wholesale and therefore
 * never saw the very pair it was written to catch — a gate that cannot fail.
 */
function coOccurringClassPairs() {
  const pairs = new Set();
  const jsDir = join(HERE, '..', 'js');
  const addPair = (list) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) pairs.add([list[i], list[j]].sort().join('|'));
    }
  };
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (full.endsWith('.js')) {
        const src = readFileSync(full, 'utf8');
        for (const m of src.matchAll(/class="([^"]*)"/g)) {
          const attr = m[1];
          // Static tokens, plus every single-quoted literal (how a conditional
          // class is written), minus the `?`/`:`/keyword noise around them.
          const tokens = new Set(attr.split(/\s+/));
          for (const q of attr.matchAll(/'([a-z][a-z0-9_-]*)'/g)) tokens.add(q[1]);
          addPair([...tokens].filter((c) => /^[a-z][a-z0-9_-]*$/.test(c)));
        }
      } else {
        try {
          if (readdirSync(full)) walk(full);
        } catch {
          /* not a directory */
        }
      }
    }
  };
  walk(jsDir);
  return pairs;
}

test('v5.17.64: a base class never clobbers a state class that shares its element', () => {
  // How the Zakat basis chip broke: js/views/zakat.js emits
  // `class="chip chip--basis chip--basis-active"`, `.chip--basis` was declared
  // AFTER `.chip--basis-active`, and both are one class of specificity — so the
  // base won on source order and the SELECTED chip painted `--color-surface`
  // while keeping `--color-on-primary` text. White on white, 1.02:1 by axe.
  const rules = singleClassRules();
  const bySel = new Map();
  for (const r of rules) {
    if (!bySel.has(r.sel)) bySel.set(r.sel, []);
    bySel.get(r.sel).push(r);
  }
  const conflicts = [];
  for (const pair of coOccurringClassPairs()) {
    // The pairs are bare class names from the markup; bySel is keyed by
    // SELECTOR, which carries the dot. Re-adding it here is load-bearing: an
    // earlier version compared `bySel.has('chip--basis')` against keys shaped
    // `.chip--basis`, so every pair took the `continue` below and the gate
    // reported zero conflicts forever.
    const [aRaw, bRaw] = pair.split('|');
    const a = `.${aRaw}`;
    const b = `.${bRaw}`;
    if (!bySel.has(a) || !bySel.has(b)) continue;
    if (!b.startsWith(a) && !a.startsWith(b)) continue;
    const base = b.startsWith(a) ? a : b;
    const state = base === a ? b : a;
    for (const rs of bySel.get(state)) {
      for (const rb of bySel.get(base)) {
        if (rb.file !== rs.file || rb.idx <= rs.idx) continue;
        // Same at-rule context only: a rule inside a media query cannot
        // clobber a global one, and two rules in different queries never meet.
        if (rb.scope !== rs.scope) continue;
        // Only a SHARED property can actually be clobbered. A base that paints
        // `background` does not undo a state that only sets `color`, and
        // flagging that pairing turns a precise gate into noise.
        const shared = [...rs.props].filter((p) => rb.props.has(p));
        if (shared.length === 0) continue;
        conflicts.push(
          `${rs.file}: ${state} is declared BEFORE ${base}, which re-sets ` +
            `${shared.join('/')} later — an element carrying both takes the BASE's value`
        );
      }
    }
  }
  assert.deepEqual(
    [...new Set(conflicts)],
    [],
    'state/base source-order conflicts. Compound the STATE selector instead of moving it ' +
      '(e.g. `.chip.chip--basis-active`), so the state outranks its base whatever order ' +
      'this file is edited in.'
  );
});

test('v5.17.64: a chosen text colour is never also dimmed with opacity', () => {
  // `.taj-course__session--locked { opacity: 0.62 }` was how the locked session
  // was dimmed. Opacity composites toward the backdrop, so it faded the card's
  // INHERITED TEXT too — title, source line and lock note all fell under AA and
  // axe flagged the course. Contrast became a side effect of a number nobody
  // measured. Eleven more rules did the same thing and happened to pass; they
  // pass by luck, not by measurement, and any palette change can unmake them.
  // All twelve now use a colour token.
  //
  // SCOPE, stated honestly: this catches a rule that sets BOTH a `color` and an
  // `opacity` — provably double-dimming, since the colour was already chosen
  // and the alpha then overrides what was measured about it. A bare
  // `opacity: .6` on a text wrapper (the shape the tajweed bug actually had)
  // is NOT caught here: telling "this wraps text" from "this is decorative"
  // statically needs a naming heuristic, and a heuristic gate produces false
  // positives, gets switched off, and stops catching anything. The disabled-
  // control opacity in this stylesheet is legitimate — WCAG 1.4.3 exempts
  // inactive components, which is why axe does not flag them. axe over the full
  // route matrix (tests/e2e/a11y-matrix.spec.js) is the gate for that class.
  const offenders = [];
  for (const f of CSS_FILES) {
    const src = stripCssComments(CSS[f]).replace(
      /@keyframes[^{}]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
      ''
    );
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const head = m[1].trim();
      if (head.startsWith('@')) continue;
      const op = /(?:^|;)\s*opacity:\s*([0-9.]+)\s*;/.exec(m[2]);
      if (!op || Number(op[1]) >= 1) continue;
      if (!/(^|;)\s*color\s*:/.test(m[2])) continue;
      const line = CSS[f].slice(0, m.index).split('\n').length;
      offenders.push(`${f}:${line} ${head.replace(/\s+/g, ' ')} (opacity: ${op[1]})`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these rules pick a text colour AND set opacity < 1, which fades that colour toward the ' +
      'background and makes the choice unmeasurable. Express the hierarchy in the colour token ' +
      '(--color-text-muted / --color-text-secondary), or color-mix against the surface this ' +
      'rule actually sits on.'
  );
});
