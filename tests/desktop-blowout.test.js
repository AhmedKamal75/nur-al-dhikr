/**
 * desktop-blowout.test.js — a grid track may not exceed its container.
 *
 * The desktop contract this pins is now intentionally simple: Home is one
 * editorial column. Historical desktop.css grid rules caused the real browser
 * to place the Home story into a narrow half-column, reorder its hero visually,
 * and leave a large dead canvas beside it. The final Home layout lives in
 * deslopify.css; desktop.css must never impose a second Home geometry.
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

test('the desktop stylesheet does not impose a two-column Home dashboard', () => {
  const homeBlocks = [...desktopCss.matchAll(/\.view--home\s*\{([^}]+)\}/g)].map((m) => m[1]);
  assert.ok(
    homeBlocks.length === 0 ||
      homeBlocks.every((block) => !/display:\s*grid|grid-template-columns/.test(block))
  );
});

test('Home is explicitly a single editorial column in the late design layer', () => {
  const css = readFileSync(`${ROOT}assets/css/deslopify.css`, 'utf8');
  const home = css.match(/@media \(min-width: 1200px\) \{[\s\S]*?\.view--home \{([^}]+)\}/);
  assert.ok(home, 'the late wide-screen Home guard should exist');
  assert.match(home[1], /display:\s*flex/);
  assert.match(home[1], /flex-direction:\s*column/);
  assert.match(home[1], /grid-template-columns:\s*none/);
});
