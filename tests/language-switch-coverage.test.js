/**
 * language-switch-coverage.test.js — the completeness trap.
 *
 * The rule: a surface that hides the shell still owes the reader the language
 * switch. My first implementation covered THREE chrome-hiding modes and
 * missed the fourth (`is-reader-immersive`, the classic reader's immersive
 * mode) — the exact un-generalised shape this project keeps paying for, and
 * the same one that made the earlier `#/focus` fix a special case.
 *
 * A list in a stylesheet cannot be checked by a human reading it, so this
 * derives the set instead: every body class in the app that hides `#topbar`
 * must also reveal the floating switch. Add a fifth chrome-hiding mode and
 * this fails until the switch rule is extended to it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const cssDir = `${ROOT}assets/css`;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');

const allCss = readdirSync(cssDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ file: f, text: readFileSync(`${cssDir}/${f}`, 'utf8') }))
  .map(({ file, text }) => ({ file, text: text.replace(/\/\*[\s\S]*?\*\//g, '') }));

/** Every body class that hides the topbar, across every stylesheet. */
const CHROME_HIDING = new Set();
for (const { text } of allCss) {
  for (const m of text.matchAll(/body\.(is-[a-z-]+)\s+#topbar/g)) CHROME_HIDING.add(m[1]);
}

/** Every body class that reveals the floating language switch. */
const SWITCH_SHOWN = new Set();
for (const { text } of allCss) {
  for (const m of text.matchAll(/body\.(is-[a-z-]+)\s+#immersive-chrome/g)) SWITCH_SHOWN.add(m[1]);
}

test('the derivation is not vacuous — the app really does hide chrome', () => {
  assert.ok(
    CHROME_HIDING.size >= 4,
    `expected at least 4 chrome-hiding modes, derived ${[...CHROME_HIDING].join(', ')}`
  );
  assert.ok(
    CHROME_HIDING.has('is-mushaf-fullscreen'),
    'the mushaf fullscreen mode must still be in the set'
  );
});

test('EVERY chrome-hiding mode reveals the language switch', () => {
  const missing = [...CHROME_HIDING].filter((c) => !SWITCH_SHOWN.has(c)).sort();
  assert.deepEqual(
    missing,
    [],
    `these modes hide #topbar and so hide the language switch with it:\n  ${missing.join('\n  ')}\n` +
      `  add each to the #immersive-chrome rule in layout.css, or an Arabic-only\n` +
      `  reader has no way back from that surface.`
  );
});

test('the switch rule invents no modes that do not exist', () => {
  // The reverse direction: a class revealed that hides nothing is dead CSS
  // that will mislead the next reader about what hides chrome.
  const extra = [...SWITCH_SHOWN].filter((c) => !CHROME_HIDING.has(c)).sort();
  assert.deepEqual(
    extra,
    [],
    `these reveal the switch but do not hide #topbar:\n  ${extra.join('\n  ')}`
  );
});

test('the floating control is a sibling of #app, not inside it', () => {
  // Everything inside #app is hidden by some mode. A switch mounted in there
  // disappears exactly when it is needed — which is how this bug existed for
  // as long as it did.
  const html = read('index.html');
  const app = html.match(/<div id="app">([\s\S]*?)\n    <\/div>/);
  assert.ok(app, 'the #app block should be locatable');
  assert.ok(!app[1].includes('id="immersive-chrome"'), '#immersive-chrome must live OUTSIDE #app');
  assert.match(html, /<div id="immersive-chrome">/);
});

test('the kids scope guard governs navigation, never configuration', () => {
  // Stated once and pinned: a language preference is not a route change, so
  // routing it through the guard made a visible control do nothing.
  const nav = read('js/app/handlers/navigation.js');
  const toggle = nav.match(/'quick-language-toggle': \(\) => \{([\s\S]*?)\n  \},/);
  assert.ok(toggle, 'the toggle handler should exist');
  assert.ok(
    !/kidsScopeGuard/.test(toggle[1]),
    'quick-language-toggle must not pass through the kids navigation guard'
  );
  // And the guard must still exist for things that ARE navigation.
  assert.match(nav, /function kidsScopeGuard\(/);
});
