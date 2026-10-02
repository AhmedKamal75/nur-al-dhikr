/**
 * palette-glass.test.js — v5.17.62 palette + liquid-glass upgrade
 * (HANDOFF §5d: worship instrument, paper-not-screen, gilt restraint;
 * 4-LLM consensus: cream paper, deep green ink, gold only for now/here,
 * warm night lamp).
 *
 * What this pins, and why each would have caught a real regression:
 *   1. token resolution — the four new --glass-* tokens are defined in
 *      variables.css and every glass var() reference resolves (the v3.9
 *      undefined-token class: silently unstyled chrome for a release);
 *   2. contrast audit, inline — the retuned warm paper (light) and night
 *      lamp (dark) still hold every AA gate cssDesign enforces, recomputed
 *      here from the stylesheet rather than restated, so a future retune
 *      that breaks AA fails here first;
 *   3. one shared glass treatment — topbar, bottom nav, player bar and
 *      modal read the same tint + blur + hairline (no second glass
 *      language), sheets wear the tint + hairline with the blur inherited
 *      from the modal behind them;
 *   4. glass fallback pins — reduced-transparency, forced-colors and Elder
 *      mode all resolve the glass opaque (the 70-year-old reader never
 *      reads small text through translucency);
 *   5. glass carries no motion of its own (blur is static), so the global
 *      reduced-motion kill stays sufficient;
 *   6. scope pins — no new view, renderer static budget untouched, no new
 *      data-action, no new i18n key (this change is CSS + test only).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES } from '../js/core/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_DIR = join(HERE, '..', 'assets', 'css');
const readCss = (f) => readFileSync(join(CSS_DIR, f), 'utf8');
const VARIABLES = readCss('variables.css');
const LAYOUT = readCss('layout.css');
const COMPONENTS = readCss('components.css');
const QURAN = readCss('quran.css');
const A11Y = readCss('accessibility.css');
const ALL_CSS = readdirSync(CSS_DIR)
  .filter((f) => f.endsWith('.css'))
  .map(readCss)
  .join('\n');

/* ---------- WCAG helpers (mirrors tests/cssDesign.test.js) ---------- */
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
  const m = VARIABLES.match(selectorRe);
  assert.ok(m, `variables.css must contain block matching ${selectorRe}`);
  const out = {};
  for (const mm of m[1].matchAll(/--([a-z0-9_-]+):\s*([^;]+);/gi)) out[`--${mm[1]}`] = mm[2].trim();
  return out;
}
const root = blockTokens(/:root\s*\{([\s\S]*?)\n\}/);
const darkBlock = blockTokens(/\[data-theme=['"]dark['"]\]\s*\{([\s\S]*?)\n\}/);
const dark = { ...root, ...darkBlock };

function ruleBody(css, selectorRe) {
  const m = css.match(selectorRe);
  assert.ok(m, `expected rule matching ${selectorRe}`);
  return m[1];
}

/* ---------- 1. token resolution ---------- */

test('palette-glass: the four glass tokens are defined once in variables.css', () => {
  for (const tok of ['--glass-blur', '--glass-saturate', '--glass-bg', '--glass-bg-strong']) {
    assert.ok(root[tok], `${tok} must be defined in :root`);
  }
  assert.equal(root['--glass-blur'], '18px', 'one shared blur radius');
  assert.equal(root['--glass-saturate'], '1.5', 'one shared saturation');
  assert.ok(
    root['--glass-bg'].includes('--color-surface'),
    '--glass-bg derives from --color-surface so both themes follow'
  );
  assert.ok(
    root['--glass-bg-strong'].includes('--color-surface'),
    '--glass-bg-strong derives from --color-surface so both themes follow'
  );
  // No dark override needed: derivation follows the theme automatically.
  assert.ok(!('--glass-bg' in darkBlock), 'no dark duplicate of a derived token');
});

test('palette-glass: every glass var() reference resolves to a definition', () => {
  const defined = new Set();
  for (const m of ALL_CSS.matchAll(/(--[a-zA-Z0-9_-]+)\s*:(?=\s)/g)) defined.add(m[1]);
  const missing = [];
  for (const m of ALL_CSS.matchAll(/var\(\s*(--glass-[a-z-]+)/g)) {
    if (!defined.has(m[1])) missing.push(m[1]);
  }
  assert.deepEqual(missing, [], `unresolved glass tokens: ${missing.join(', ')}`);
});

/* ---------- 2. contrast audit, inline ---------- */

test('palette-glass: the retuned values are the consensus values', () => {
  // Cream paper / deep green ink (light), warm night lamp (dark). Pinning
  // the values documents the upgrade; the ratios below prove it is safe.
  const eq = (a, b) => String(a).toLowerCase() === b.toLowerCase();
  assert.ok(
    eq(root['--color-bg'], '#f7f1e2'),
    `light bg is cream paper, got ${root['--color-bg']}`
  );
  assert.ok(
    eq(root['--color-surface'], '#fffdf6'),
    `light surface is warm white, got ${root['--color-surface']}`
  );
  assert.ok(
    eq(root['--color-text'], '#1f2318'),
    `light ink is deep green, got ${root['--color-text']}`
  );
  assert.ok(eq(dark['--color-bg'], '#141109'), `dark bg is night lamp, got ${dark['--color-bg']}`);
  assert.ok(
    eq(dark['--color-surface'], '#1d1912'),
    `dark surface is lamplit, got ${dark['--color-surface']}`
  );
  assert.ok(
    eq(dark['--color-text'], '#f0e9d6'),
    `dark ink is warm paper-white, got ${dark['--color-text']}`
  );
  assert.ok(
    eq(root['--color-gold'], '#b8912a'),
    `gilt stays restrained, got ${root['--color-gold']}`
  );
});

test('palette-glass: text tiers hold AA on every surface, both themes', () => {
  for (const [label, t] of [
    ['light', root],
    ['dark', dark],
  ]) {
    const surfaces = [t['--color-bg'], t['--color-surface'], t['--color-surface-alt']];
    for (const fg of ['--color-text', '--color-text-secondary', '--color-text-muted']) {
      for (const bg of surfaces) {
        assert.ok(
          ratio(t[fg], bg) >= 4.5,
          `${label}: ${fg} ${t[fg]} on ${bg} = ${ratio(t[fg], bg).toFixed(2)} (need 4.5)`
        );
      }
    }
  }
});

test('palette-glass: semantic pairs and grade chips still hold AA', () => {
  assert.ok(ratio(root['--color-danger'], root['--color-danger-bg']) >= 4.5);
  assert.ok(ratio(root['--color-success'], root['--color-success-bg']) >= 4.5);
  assert.ok(ratio(root['--color-warning'], root['--color-warning-bg']) >= 4.5);
  const eq = (a, b) => String(a).toLowerCase() === b.toLowerCase();
  assert.ok(eq(darkBlock['--color-danger-text'], '#F87171'), 'dark danger foreground untouched');
  assert.ok(eq(darkBlock['--color-success-text'], '#4ADE80'), 'dark success foreground untouched');
  assert.ok(eq(darkBlock['--color-warning-text'], '#FBBF24'), 'dark warning foreground untouched');
  for (const m of ALL_CSS.matchAll(/--grade-([a-z]+):\s*(#[0-9a-fA-F]{6})/g)) {
    assert.ok(
      ratio('#FFFFFF', m[2]) >= 4.5,
      `grade ${m[1]}: white on ${m[2]} = ${ratio('#FFFFFF', m[2]).toFixed(2)}`
    );
  }
});

test('palette-glass: brand foregrounds hold AA for every palette on the new surfaces', () => {
  // Light: the darkened primary-text on the warmed surface and its tint.
  const token = root['--color-primary-text'];
  const m =
    /color-mix\(in srgb,\s*var\(--color-primary-raw\)\s*([\d.]+)%,\s*(#[0-9a-fA-F]{6})\)/.exec(
      token
    );
  assert.ok(m, `--color-primary-text formula intact, got: ${token}`);
  for (const p of PALETTES) {
    const text = mix(p.primary, m[2], Number(m[1]));
    const tint = mix(p.primary, root['--color-surface'], 14);
    assert.ok(ratio(text, root['--color-surface']) >= 4.5, `${p.id} light primary-text on surface`);
    assert.ok(ratio(text, tint) >= 4.5, `${p.id} light primary-text on 14% tint`);
    assert.ok(ratio('#FFFFFF', p.primary) >= 4.5, `${p.id} on-primary white on fill`);
    // Dark: the 50% white mix on the lamplit surfaces.
    const dText = mix(p.primary, '#FFFFFF', 50);
    for (const bg of [dark['--color-bg'], dark['--color-surface'], dark['--color-surface-alt']]) {
      assert.ok(
        ratio(dText, bg) >= 4.5,
        `${p.id} dark primary-text ${dText} on ${bg} = ${ratio(dText, bg).toFixed(2)}`
      );
    }
  }
});

test('palette-glass: dark category texts hold AA on the lamplit surfaces', () => {
  const families = [...new Set([...VARIABLES.matchAll(/--cat-([a-z]+):/g)].map((m) => m[1]))];
  assert.ok(families.length >= 15, `expected category families, got ${families.length}`);
  for (const fam of families) {
    const base = dark[`--cat-${fam}`];
    const text = dark[`--cat-${fam}-text`];
    assert.ok(/^#[0-9a-fA-F]{6}$/i.test(text), `${fam}: dark -text resolves to hex, got ${text}`);
    assert.notEqual(text.toLowerCase(), base.toLowerCase(), `${fam}: dark -text is brightened`);
    for (const bg of [dark['--color-bg'], dark['--color-surface']]) {
      assert.ok(ratio(text, bg) >= 4.5, `${fam}: ${text} on ${bg}`);
      assert.ok(ratio(text, mix(base, bg, 12)) >= 4.5, `${fam}: ${text} on 12% tint`);
    }
  }
});

/* ---------- 3. one shared glass treatment ---------- */

test('palette-glass: topbar, bottom nav, player bar and modal share one treatment', () => {
  const topbar = ruleBody(LAYOUT, /#topbar\s*\{([\s\S]*?)\n\}/);
  assert.ok(topbar.includes('var(--glass-bg)'), '#topbar reads the shared warm tint');
  assert.ok(topbar.includes('blur(var(--glass-blur))'), '#topbar reads the shared blur');
  assert.ok(
    topbar.includes('saturate(var(--glass-saturate))'),
    '#topbar reads the shared saturate'
  );
  assert.ok(topbar.includes('1px solid var(--color-border)'), '#topbar keeps its hairline');

  const bottomnav = ruleBody(LAYOUT, /#bottomnav\s*\{([\s\S]*?)\n\}/);
  assert.ok(bottomnav.includes('var(--glass-bg)'), '#bottomnav reads the shared warm tint');
  assert.ok(bottomnav.includes('blur(var(--glass-blur))'), '#bottomnav reads the shared blur');

  const player = ruleBody(COMPONENTS, /\.player-bar\s*\{([\s\S]*?)\n\}/);
  assert.ok(
    player.includes('var(--glass-bg-strong)'),
    '.player-bar reads the strong tint (small text)'
  );
  assert.ok(player.includes('blur(var(--glass-blur))'), '.player-bar reads the shared blur');

  const modal = ruleBody(COMPONENTS, /\.modal\s*\{([\s\S]*?)\n\}/);
  assert.ok(modal.includes('var(--glass-bg-strong)'), '.modal reads the strong tint');
  assert.ok(modal.includes('blur(var(--glass-blur))'), '.modal reads the shared blur');
  assert.ok(modal.includes('1px solid var(--color-border)'), '.modal keeps its hairline');
});

test('palette-glass: no second glass language — raw blurs are gone from the chrome', () => {
  // Boundary, stated so nobody "fixes" the rest: layout.css + components.css
  // are the app chrome and share one blur. cards.css keeps its content
  // treatments and quran.css keeps the book's own glass bars (fixed fs-bar
  // tokens, v5.2.75) — unifying those would put app chrome on the page.
  for (const [file, css] of [
    ['layout.css', LAYOUT],
    ['components.css', COMPONENTS],
  ]) {
    // A tokenized blur reads blur(var(--glass-blur)); anything else after
    // blur( is a second glass language. (A naive [^)]+ capture stops at the
    // var()'s own paren, so match the opening and read past it instead.)
    for (const m of css.matchAll(/backdrop-filter:[^;]*?blur\(/g)) {
      const rest = css.slice(m.index + m[0].length);
      assert.ok(
        rest.startsWith('var(--glass-blur))'),
        `${file}: raw blur(${rest.slice(0, 24)}…) outside the shared token`
      );
    }
  }
});

test('palette-glass: sheets wear the tint + hairline, blur inherited from the modal', () => {
  const viewSheet = ruleBody(COMPONENTS, /\.view-sheet__group\s*\{([\s\S]*?)\n\}/);
  assert.ok(
    viewSheet.includes('var(--glass-bg-strong)'),
    '.view-sheet__group reads the shared tint'
  );
  assert.ok(
    viewSheet.includes('1px solid var(--color-border)'),
    '.view-sheet__group keeps its hairline'
  );
  const mushafSheet = ruleBody(QURAN, /\.mushaf-sheet__group\s*\{([\s\S]*?)\n\}/);
  assert.ok(
    mushafSheet.includes('var(--glass-bg-strong)'),
    '.mushaf-sheet__group reads the shared tint'
  );
  const mushafRow = ruleBody(QURAN, /\.mushaf-sheet__row\s*\{([\s\S]*?)\n\}/);
  assert.ok(
    mushafRow.includes('background: transparent'),
    '.mushaf-sheet__row stays transparent so the group tint reads through'
  );
});

/* ---------- 4. glass fallback pins ---------- */

test('palette-glass: reduced-transparency resolves every glass surface opaque', () => {
  const blocks = [
    ...ALL_CSS.matchAll(/@media\s*\(prefers-reduced-transparency:\s*reduce\)\s*\{([\s\S]*?)\n\}/g),
  ].map((m) => m[1]);
  assert.ok(blocks.length > 0, 'a reduced-transparency block must exist');
  const all = blocks.join('\n');
  for (const sel of [
    '#topbar',
    '#bottomnav',
    '.player-bar',
    '.modal',
    '.view-sheet__group',
    '.mushaf-sheet__group',
    '.topbar__lang--floating',
  ]) {
    assert.ok(all.includes(sel), `reduced-transparency must cover ${sel}`);
  }
  assert.ok(all.includes('backdrop-filter: none'), 'translucency is killed, not softened');
});

test('palette-glass: forced-colors gives the glass a system edge, not a tint', () => {
  const blocks = [
    ...ALL_CSS.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*?)\n\}/g),
  ].map((m) => m[1]);
  const all = blocks.join('\n');
  for (const sel of ['#topbar', '.player-bar', '.modal']) {
    assert.ok(all.includes(sel), `forced-colors must cover ${sel}`);
  }
  assert.ok(all.includes('backdrop-filter: none'), 'no blur under forced colors');
  assert.ok(all.includes('ButtonText') || all.includes('Canvas'), 'system colors carry the edge');
});

test('palette-glass: Elder mode reads opaque (release-gate reader contrast)', () => {
  for (const sel of [
    'body.is-elder #topbar',
    'body.is-elder .player-bar',
    'body.is-elder .modal',
    'body.is-elder .view-sheet__group',
    'body.is-elder .mushaf-sheet__group',
    'body.is-elder .topbar__lang--floating',
  ]) {
    assert.ok(A11Y.includes(sel), `Elder fallback must cover ${sel}`);
  }
  // The Elder fallbacks resolve to the gated opaque tokens, never a mix wash.
  const elderBlock = A11Y.slice(A11Y.indexOf('body.is-elder #topbar'));
  assert.ok(elderBlock.includes('var(--color-bg)'), 'Elder chrome falls back to the bg token');
  assert.ok(
    elderBlock.includes('var(--color-surface)'),
    'Elder overlays fall back to the surface token'
  );
});

/* ---------- 5. glass carries no motion ---------- */

test('palette-glass: the shared treatment animates nothing new (reduced-motion stays sufficient)', () => {
  // Blur itself is static. The chrome rules must not grow their own motion;
  // the modal keeps ONLY its pre-existing sheet entrance/exit (sheetIn /
  // popIn / sheetOut / popOut + overlay fadeIn / fadeOut), which the global
  // reduced-motion kill and the modal.js timer skip already cover (v5.2.75,
  // UX-05) — glass adds no fifth animation to that set.
  for (const [sel, css, re] of [
    ['#topbar', LAYOUT, /#topbar\s*\{([\s\S]*?)\n\}/],
    ['.player-bar', COMPONENTS, /\.player-bar\s*\{([\s\S]*?)\n\}/],
  ]) {
    const body = ruleBody(css, re);
    assert.ok(!/animation\s*:/.test(body), `${sel} defines no animation`);
    assert.ok(!/transition\s*:/.test(body), `${sel} defines no transition`);
  }
  const modalAnims = new Set();
  for (const m of COMPONENTS.matchAll(/\.modal[^{]*\{([\s\S]*?)\n\}/g)) {
    for (const a of m[1].matchAll(/animation(?:-name)?\s*:\s*([a-zA-Z]+)/g)) modalAnims.add(a[1]);
  }
  assert.deepEqual(
    [...modalAnims].sort(),
    ['fadeIn', 'fadeOut', 'popIn', 'popOut', 'sheetIn', 'sheetOut'].sort(),
    `modal animations stay the pre-existing entrance/exit set, got ${[...modalAnims].join(', ')}`
  );
});

/* ---------- 6. scope pins: no views, no behavior, caps untouched ---------- */

test('palette-glass: renderer static view budget untouched (19 cap)', () => {
  const src = readFileSync(join(HERE, '..', 'js', 'app', 'renderer.js'), 'utf8');
  const staticViews = [...src.matchAll(/from\s+'\.\.\/views\/([a-zA-Z0-9_-]+)\.js'/g)].map(
    (m) => m[1]
  );
  assert.ok(
    staticViews.length <= 19,
    `renderer statically imports ${staticViews.length} views (cap 19)`
  );
});

test('palette-glass: glass is pure CSS — no JS plumbing, no behavior change', () => {
  // The tints derive from --color-surface at the cascade, so theme.js must
  // not set them inline: if JS owned the glass, every theme/palette switch
  // would need to re-derive it and Elder/high-contrast could desync.
  const theme = readFileSync(join(HERE, '..', 'js', 'core', 'theme.js'), 'utf8');
  assert.ok(!theme.includes('--glass-'), 'theme.js never touches the glass tokens');
});
