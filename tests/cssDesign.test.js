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
  const out = {};
  let seen = 0;
  // Resolve the token set the BROWSER ends up with, not one file's opinion of
  // it. Equal-specificity blocks are settled by source order, so the last
  // stylesheet to declare a token wins.
  //
  // This function used to read variables.css alone. The v5.17.7x deslopify
  // pass added a second `:root` in deslopify.css, which index.html loads last,
  // so the contrast gate went on certifying --color-text-muted #6e6952 (4.90:1,
  // passes) while every light view rendered #6d756c (4.22:1, fails AA). A
  // gate that reads a token the cascade has already overridden is worse than
  // no gate: it reports green for a defect that is on screen.
  for (const f of EFFECTIVE_CSS_ORDER) {
    const globalRe = new RegExp(selectorRe.source, 'g');
    for (const m of CSS[f].matchAll(globalRe)) {
      seen++;
      for (const mm of m[1].matchAll(/--([a-z0-9_-]+):\s*([^;]+);/gi)) {
        out[`--${mm[1]}`] = mm[2].trim();
      }
    }
  }
  assert.ok(seen, `no stylesheet in the shell load order contains a block matching ${selectorRe}`);
  return out;
}

// The single source of truth for cascade order is the shell itself: the
// stylesheets index.html links, in document order, followed by the route-lazy
// sheets the renderer injects later (they win over everything, and one day one
// of them will define a token).
const EFFECTIVE_CSS_ORDER = [
  ...new Set(
    [
      ...readFileSync(join(HERE, '..', 'index.html'), 'utf8').matchAll(
        /assets\/css\/([a-z0-9_-]+\.css)/g
      ),
    ].map((m) => m[1])
  ),
  ...CSS_FILES.filter((f) => !readFileSync(join(HERE, '..', 'index.html'), 'utf8').includes(f)),
];

const root = blockTokens(/:root\s*\{([\s\S]*?)\n\}/);
const darkBlock = blockTokens(/\[data-theme=['"]dark['"]\]\s*\{([\s\S]*?)\n\}/);
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

test('contrast: derived (color-mix) foregrounds hold AA on the surface they sit on', () => {
  // The token-tier contract above cannot see a foreground that is COMPUTED.
  // Two shipped rules were: a gold-on-gold chip that measured 3.72:1, and a
  // text rule whose colour came from a token in another file while a third
  // file dimmed it with `opacity`. Both were only ever caught by axe, on a
  // route, months later. These are the two measured pairs, pinned as numbers
  // with the rule they came from named — deliberately NOT a naming heuristic
  // over class names, which this suite already rejects for good reason.
  // Parse the ACTUAL declaration out of the stylesheet. Asserting a hardcoded
  // 70% here would be a decorative test: it would still pass with the rule
  // reverted to 88%, which is the mistake this pin exists to catch.
  const hijriDecl = /\.home-hero--line \.home-hero__hijri\s*\{([^}]*)\}/.exec(
    stripCssComments(CSS['deslopify.css'])
  );
  assert.ok(hijriDecl, '.home-hero--line .home-hero__hijri rule must exist');
  const hijriPct =
    /color:\s*color-mix\(in srgb,\s*var\(--color-gold\)\s*([\d.]+)%,\s*var\(--color-text\)\s*\)/.exec(
      hijriDecl[1]
    );
  assert.ok(
    hijriPct,
    '.home-hero__hijri must derive its text colour from --color-gold over --color-text, so the tint it sits on can be measured against it'
  );
  const hijriBg = mix(root['--color-gold'], root['--color-surface'], 10);
  const hijriFg = mix(root['--color-gold'], root['--color-text'], Number(hijriPct[1]));
  assert.ok(
    ratio(hijriFg, hijriBg) >= 4.5,
    `home-hero__hijri gold text ${hijriFg} on its own gold tint ${hijriBg} = ${ratio(hijriFg, hijriBg).toFixed(2)} (need 4.5)`
  );
  // Same chip must also stay legible if it ever renders on the plain surface.
  assert.ok(
    ratio(hijriFg, root['--color-surface']) >= 4.5,
    `home-hero__hijri ${hijriFg} on --color-surface = ${ratio(hijriFg, root['--color-surface']).toFixed(2)}`
  );
});

test('tajweed-course.css dims no text with opacity (token instead)', () => {
  // `.taj-course__stage-count` carried `opacity: 0.7` while its colour was
  // assigned by deslopify.css as --color-text-muted — 3.00:1 light, 2.13:1
  // dark. The generic opacity gate in this file cannot see it (it only catches
  // colour AND opacity in the same rule, which is stated in that test's scope
  // note), so pin the absence here where the alpha used to be.
  const src = stripCssComments(CSS['tajweed-course.css']);
  const block = /\.taj-course__stage-count\s*\{([^}]*)\}/.exec(src);
  assert.ok(block, '.taj-course__stage-count rule must exist');
  assert.ok(
    !/opacity\s*:/.test(block[1]),
    '.taj-course__stage-count must not set opacity — its colour comes from a token in another file, so the alpha silently voids the measured token'
  );
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

test('a segmented control wraps on a phone instead of widening the page', () => {
  // Measured at 360x800, English: `.quran-mode-switch` (5 buttons) had
  // `scrollWidth` 413 vs `clientWidth` 334 with `overflow-x: visible` — 66px
  // of unintended horizontal scroll for the WHOLE page, and only 4 of 5
  // options visible. Arabic measured 334/334 and already fit, which is why a
  // bilingual fix must not disturb it.
  //
  // Asserted as a declaration, not as a vibe: the narrow-viewport wrap has to
  // exist, it has to be scoped to phone widths (so desktop keeps one line), and
  // it must be `wrap` rather than a scroller — the project already distrusts
  // scrollers that hide an option (see the Home prayer ribbon rule below).
  const narrow = [
    ...ALL_CSS.matchAll(/@media\s*\(max-width:\s*480px\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g),
  ].map((m) => m[1]);
  assert.ok(narrow.length >= 1, 'there must be a phone-width breakpoint owning this rule');
  assert.ok(
    narrow.some((b) => /\.segmented\s*\{[^}]*flex-wrap:\s*wrap/.test(b)),
    'some phone-width breakpoint must declare flex-wrap: wrap on .segmented — found none in: ' +
      narrow.length +
      ' block(s)'
  );
  assert.ok(
    !narrow.some((b) => /\.segmented\s*\{[^}]*overflow-x:\s*(auto|scroll)/.test(b)),
    'a segmented control must not become a scroller at phone widths — that hides options'
  );
  // And the wrapped buttons must still reach the touch target.
  const btn = CSS['components.css'].match(/\.segmented__btn\s*\{[^}]*\}/);
  assert.ok(
    btn && btn[0].includes('var(--touch-target)'),
    '.segmented__btn must reach 44px when wrapped'
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

test('a hit-area apron is never clipped by its own element', () => {
  // The compact-control idiom in this codebase is a visually small box plus a
  // `::after { inset-*: -Npx }` apron that widens the effective hit area.
  // That apron is a DESCENDANT of the control, so any `overflow: hidden`/
  // `clip` on the control's own box silently deletes the reach it exists to
  // add. `.card__meta > .chip { overflow: hidden }` did exactly that: the chip
  // looked 40px, the apron promised 56px, and a real pointer 5px off the top
  // or bottom landed on `.card__top`.

  // Structural, not a naming heuristic: the check pairs a real `overflow`
  // declaration with a real apron declaration on the same selector. A class
  // name is never guessed at.
  const apronSel = new Set();
  for (const f of CSS_FILES) {
    const src = stripCssComments(CSS[f]);
    for (const m of src.matchAll(/([^{}]+)::after\s*\{([^}]*)\}/g)) {
      if (!/inset-(block|inline)\s*:\s*-|inset\s*:\s*-/.test(m[2])) continue;
      for (const s of m[1].split(',')) {
        const t = s.trim().replace(/\s+/g, ' ');
        if (t) apronSel.add(t);
      }
    }
  }
  assert.ok(apronSel.size >= 8, `expected the apron idiom to still exist, found ${apronSel.size}`);

  const endsWith = (sel, a) => sel.split(/\s+/).pop() === a;
  const offenders = [];
  for (const f of CSS_FILES) {
    const src = stripCssComments(CSS[f]);
    for (const m of src.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const head = m[1].trim().replace(/\s+/g, ' ');
      if (head.startsWith('@')) continue;
      const of = /(?:^|;)\s*overflow\s*:\s*(hidden|clip)\s*(;|$)/.exec(m[2]);
      if (!of) continue;
      // A clip that is deliberately pushed back out by the apron's own reach
      // is the fix, not the defect.
      const margin = /(?:^|;)\s*overflow-clip-margin\s*:\s*([\d.]+)px/.exec(m[2]);
      for (const part of head.split(',').map((s) => s.trim())) {
        const a = [...apronSel].find((x) => endsWith(part, x));
        if (!a) continue;
        if (margin && Number(margin[1]) >= 4) continue;
        offenders.push(`${f}: ${part} — overflow:${of[1]} clips the ::after apron on ${a}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these rules clip a control that carries its own hit-area apron, deleting the reach the ' +
      'apron exists to add. Use `overflow: clip` with `overflow-clip-margin` at least as large ' +
      'as the apron inset (overflow-clip-margin is a no-op on `overflow: hidden`).'
  );
});

test('rule 8: no Home prayer is hidden behind an unlabelled scroller', () => {
  // The Home prayer ribbon is the app's primary surface, and five daily
  // prayers live on it. It shipped as `display:flex; overflow-x:auto` with
  // `flex: 1 0 auto` cells: measured in Chromium, 319px of track for 474px of
  // content on a 393px phone, so Maghrib and Isha were off-screen with no
  // affordance, and only 3 of 6 showed at 360px. A grid shows all six.
  const rule = /\.home-prayer-ribbon__cells\s*\{([^}]*)\}/.exec(ALL_CSS);
  assert.ok(rule, '.home-prayer-ribbon__cells must exist');
  assert.match(
    rule[1],
    /display:\s*grid/,
    'the ribbon must lay its cells out in a grid, not a single scrolling row'
  );
  assert.doesNotMatch(
    rule[1],
    /overflow-x:\s*(auto|scroll)/,
    'a horizontal scroller here hides prayer times with no affordance — that is the ' +
      'defect this gate exists for'
  );
  // Scoped to the ribbon's OWN rules: repeat(2)/repeat(3) are legitimate in the
  // weekday strip and the calendars, so a whole-file scan would fail on those.
  const ribbonCols = [
    ...ALL_CSS.matchAll(/\.home-prayer-ribbon__cells\s*(?:,[^{]*)?\{([^}]*)\}/g),
  ].flatMap((m) =>
    [...m[1].matchAll(/grid-template-columns:\s*repeat\((\d+)/g)].map((c) => Number(c[1]))
  );

  assert.ok(ribbonCols.length > 0, 'the ribbon must declare its columns');
  assert.deepEqual(
    [...new Set(ribbonCols)],
    [6],
    'every ribbon layout — base and phone override — must keep six columns. A 3x2 phone ' +
      'variant was tried and reverted: it grew Home ~64px, which pushed the onboarding ' +
      'dismiss button to the scroller edge and clipped its 44px apron to 1px ' +
      '(touch-targets.spec.js). The cells tighten instead, so the strip keeps one row.'
  );
});

test('rule 8: a prayer name is never truncated, on the ribbon or the stat row', () => {
  // `.home-prayer-ribbon__name` was also nowrap + ellipsis, so the one thing a
  // worshipper must never lose — which prayer a time belongs to — was the first
  // thing trimmed when six cells share a phone row. Names wrap instead.
  for (const sel of ['.home-prayer-ribbon__name', '.home-today__label']) {
    const rule = new RegExp(sel.replace('.', '\\.') + '\\s*\\{([^}]*)\\}').exec(ALL_CSS);
    assert.ok(rule, `${sel} must exist`);
    assert.doesNotMatch(
      rule[1],
      /white-space:\s*nowrap|overflow:\s*hidden|text-overflow:\s*ellipsis/,
      `${sel} truncates its own text; rule 8 says a label is content, never decoration`
    );
  }
});

test('rule 8: a stat label wraps instead of being truncated by an ellipsis', () => {
  // `.home-today__label` was `white-space: nowrap` + `text-overflow: ellipsis`
  // inside a `flex: 1 1 9rem` row that also holds nowrap values. At 393px the
  // three cells could not share one row, and instead of wrapping the label was
  // silently trimmed: 101px lost from "Qur'an reading", 26px from the Arabic
  // "قراءة القرآن". A label is content — it wraps or the layout gives it room.
  const rule = /\.home-today__label\s*\{([^}]*)\}/.exec(ALL_CSS);
  assert.ok(rule, '.home-today__label must exist');
  assert.doesNotMatch(
    rule[1],
    /white-space:\s*nowrap/,
    'a nowrap label cannot wrap, so the only way to fit is truncation'
  );
  assert.doesNotMatch(
    rule[1],
    /text-overflow:\s*ellipsis/,
    "an ellipsis here is how the Qur'an reading label lost 101px without anyone noticing"
  );
  assert.doesNotMatch(
    rule[1],
    /overflow:\s*hidden/,
    'hidden overflow on a label is truncation by another name'
  );
});
