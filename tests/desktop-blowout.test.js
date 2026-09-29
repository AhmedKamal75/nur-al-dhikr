/**
 * desktop-blowout.test.js — a grid track may not exceed its container.
 *
 * THE BUG THIS PINS
 *
 * `assets/css/desktop.css` turned the home view into a two-column grid with
 * `grid-template-columns: 1fr 1fr`. A bare `1fr` is really `minmax(auto, 1fr)`,
 * and that `auto` minimum resolves to the item's MIN-CONTENT width. The adhkar
 * browser contains a deliberately non-wrapping horizontal scroller
 * (`.chip-row--scroll`), so its min-content width is enormous.
 *
 * Measured before the fix, at a 1440px viewport:
 *   .view            1144px   (the column)
 *   .home-browser    2533px   (should never exceed the column)
 *   page height      8486px
 *
 * `.view` carries `overflow-x: clip`, so the 1389px of overflow was swallowed
 * silently: no scrollbar, no document overflow, no error. The visible symptom
 * was the entire right-hand third of every tile row cut off mid-word.
 *
 * WHY IT ONLY EVER SHOWED ON DESKTOP
 *
 * The grid lives inside a `min-width` media query. Below it, `.view` is a
 * plain flex column and the bug is unreachable. That is why this read as
 * "mobile is fine, the desktop home is broken" rather than as a layout bug.
 *
 * WHY A UNIT TEST, NOT A SCREENSHOT
 *
 * The overflow was invisible to every existing gate: the document scrollWidth
 * matched clientWidth, so no reflow check fired, and the axe sweep only runs on
 * mobile-sized viewports. Only a width comparison between a child and its
 * container catches it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const desktopCss = readFileSync(`${ROOT}assets/css/desktop.css`, 'utf8');

/** Grid declarations inside desktop.css, as raw source text. */
const gridBlocks = [...desktopCss.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((m) => m[1]);

test('the desktop stylesheet actually declares grid tracks (this file is not vacuous)', () => {
  assert.ok(
    gridBlocks.length >= 3,
    `expected several grid-template-columns declarations, found ${gridBlocks.length}`
  );
});

test('no desktop grid track uses a bare fr, which floors at min-content', () => {
  // A bare `fr` track — `1fr 1fr`, `auto 1fr auto` — carries an automatic
  // minimum equal to the item's min-content width, so a horizontal scroller or
  // nowrap strip inside blows it past its container.
  //
  // NOT all fr usage is wrong, and the first two cuts of this test wrongly
  // failed nine safe declarations. These are safe and must stay:
  //   repeat(auto-fit, minmax(230px, 1fr))  — explicit LENGTH minimum
  //   minmax(0, 1fr)                        — explicit zero minimum
  // Unsafe is a track whose minimum is the `auto` default, or no min at all.
  //
  // So: resolve each `minmax(min, ...)` group to SAFE or UNSAFE, drop the
  // `repeat(N, ...)` count wrapper, and then ask whether any BARE fr or any
  // UNSAFE group survives.
  const classify = (decl) =>
    decl
      .replace(/minmax\(\s*([^,()]+?)\s*,[^()]+\)/g, (whole, min) =>
        /^\s*auto\s*$/i.test(min) ? 'UNSAFE_TRACK' : 'SAFE_TRACK'
      )
      .replace(/repeat\(\s*[^,()]+?\s*,/g, 'repeat(SAFE_COUNT,');

  const offenders = gridBlocks
    .map((decl) => decl.trim())
    .filter((decl) => {
      const resolved = classify(decl);
      return /(^|[\s,(,])\d+fr\b/.test(resolved) || resolved.includes('UNSAFE_TRACK');
    });

  assert.deepEqual(
    offenders,
    [],
    `desktop grid tracks must use minmax(0, 1fr); a bare fr floors at min-content and\n` +
      `  silently overflows a clipped container:\n  ${offenders.join('\n  ')}`
  );
});

test('the home view is the two-column dashboard it claims to be', () => {
  // Guards the fix from being "simplified" back to one column: the intent is
  // two balanced columns on wide screens, full-bleed hero above them.
  const home = desktopCss.match(/\.view--home\s*\{([^}]+)\}/);
  assert.ok(home, 'the .view--home desktop block should exist');
  assert.match(home[1], /display:\s*grid/);
  assert.match(home[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
});
