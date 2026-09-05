/**
 * tests/motion.test.js — v3.12 UI/UX Phase B gates.
 *
 * Three layers are pinned here:
 *   1. js/celebrate.js — the transient celebration registry (behavioral).
 *   2. The pure decision helpers built on it (khatma completion freshness,
 *      renderer's view-enter decision).
 *   3. The CSS motion contract itself (structural): entrance animations
 *      must stay scoped so re-renders can never restart them, celebration
 *      blooms must stay within their documented bounds, and the
 *      prefers-reduced-motion kill rule must remain in force. This is the
 *      motion analogue of tests/cssDesign.test.js: a regression here is a
 *      regression the owner FEELS (the v3.9 "F5 refresh" class of defect).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { markCelebration, wasCelebrated, clearCelebrations } from '../js/domain/celebrate.js';
import { justCompletedKhatma, KHATMA_CELEBRATION_MS } from '../js/domain/khatma.js';
import { shouldMarkViewEnter, VIEW_ENTER_MS } from '../js/app/renderer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = join(ROOT, 'assets', 'css');

/* ------------------------------------------------------------------ */
/* 1. The celebration registry                                         */
/* ------------------------------------------------------------------ */

describe('celebrate.js — transient celebration registry', () => {
  test('a fresh stamp is celebrated; an unknown key never is', () => {
    clearCelebrations();
    markCelebration('test:known');
    assert.equal(wasCelebrated('test:known'), true);
    assert.equal(wasCelebrated('test:other'), false);
  });

  test('a zero/negative window is never true (the window is the contract)', () => {
    clearCelebrations();
    markCelebration('test:zero');
    assert.equal(wasCelebrated('test:zero', 0), false);
    assert.equal(wasCelebrated('test:zero', -1), false);
  });

  test('keys are independent — celebrating one says nothing about another', () => {
    clearCelebrations();
    markCelebration('quiz');
    markCelebration('plog-day');
    assert.equal(wasCelebrated('quiz'), true);
    assert.equal(wasCelebrated('plog-day'), true);
    assert.equal(wasCelebrated('khatma'), false);
  });

  test('re-stamping the same key is idempotent bookkeeping (no throw, still fresh)', () => {
    clearCelebrations();
    markCelebration('test:again');
    markCelebration('test:again');
    markCelebration('test:again');
    assert.equal(wasCelebrated('test:again'), true);
  });

  test('a large burst of stamps never breaks the registry (prune path)', () => {
    clearCelebrations();
    for (let i = 0; i < 500; i += 1) markCelebration(`burst:${i}`);
    assert.equal(wasCelebrated('burst:499'), true);
    assert.equal(wasCelebrated('burst:0', 0), false);
  });

  test('clearCelebrations resets everything (teardown hygiene)', () => {
    markCelebration('test:clear');
    clearCelebrations();
    assert.equal(wasCelebrated('test:clear'), false);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Pure helpers built on the stamps                                 */
/* ------------------------------------------------------------------ */

describe('khatma.justCompletedKhatma — freshness from the persisted stamp', () => {
  const NOW = 1_800_000_000_000;
  const state = (completedAt) => ({
    khatmaHistory: completedAt == null ? [] : [{ id: 'k', completedAt, days: 1, pages: 604 }],
  });

  test('true only inside the window after the completion stamp', () => {
    assert.equal(justCompletedKhatma(state(NOW), NOW), true);
    assert.equal(justCompletedKhatma(state(NOW - 1000), NOW), true);
    assert.equal(
      justCompletedKhatma(state(NOW - KHATMA_CELEBRATION_MS + 1), NOW),
      true,
      'boundary: one ms inside the window'
    );
  });

  test('false the moment the window passes — later re-renders stay silent', () => {
    assert.equal(justCompletedKhatma(state(NOW - KHATMA_CELEBRATION_MS), NOW), false);
    assert.equal(justCompletedKhatma(state(NOW - 86_400_000), NOW), false);
  });

  test('false with no history, malformed stamps, or future stamps', () => {
    assert.equal(justCompletedKhatma(state(), NOW), false);
    assert.equal(justCompletedKhatma(state(undefined), NOW), false);
    assert.equal(justCompletedKhatma(state('not-a-number'), NOW), false);
    assert.equal(justCompletedKhatma(state(NaN), NOW), false);
    assert.equal(justCompletedKhatma(state(NOW + 5000), NOW), false);
    assert.equal(justCompletedKhatma(null, NOW), false);
    assert.equal(justCompletedKhatma({}, NOW), false);
  });
});

describe('renderer.shouldMarkViewEnter — the anti-reflicker decision', () => {
  test('navigation (including first render) animates', () => {
    assert.equal(shouldMarkViewEnter(null, 'home'), true);
    assert.equal(shouldMarkViewEnter('home', 'quran'), true);
    assert.equal(shouldMarkViewEnter('quran', 'home'), true);
  });

  test('same-view re-renders never animate — THE anti-flicker guarantee', () => {
    assert.equal(shouldMarkViewEnter('home', 'home'), false);
    assert.equal(shouldMarkViewEnter('quran', 'quran'), false);
  });

  test('null-to-null (a render with no view yet) does not animate', () => {
    assert.equal(shouldMarkViewEnter(null, null), false);
  });

  test('VIEW_ENTER_MS outlives the 280ms entrance animation', () => {
    assert.ok(VIEW_ENTER_MS >= 300, 'must cover the var(--dur-slow) entrance');
    assert.ok(VIEW_ENTER_MS <= 500, 'but must not linger — it gates a one-shot');
  });
});

/* ------------------------------------------------------------------ */
/* 3. The CSS motion contract                                          */
/* ------------------------------------------------------------------ */

/** Pull every `animation:` shorthand out of a stylesheet's text. */
function animationDeclarations(cssText) {
  const out = [];
  const re = /animation:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(cssText))) out.push(m[1].trim());
  return out;
}

function parseDurationSeconds(token) {
  const m = /([\d.]+)s\b/.exec(token);
  if (m) return parseFloat(m[1]);
  const ms = /([\d.]+)ms\b/.exec(token);
  if (ms) return parseFloat(ms[1]) / 1000;
  return null;
}

/** Named allow-list: the ONLY animations permitted above 300ms are the
 *  celebration blooms — 700ms of satisfied settle, nothing else. */
const LONG_ANIMATION_ALLOWLIST = {
  celebrateBloom: 0.7,
  cycleComplete: 0.7,
  // (v5.0.0) the counting tap-ripple: a single 520ms radial bloom per
  // tap — a feedback gesture on a user-initiated event, allow-listed
  // like the celebration bloom, dead under prefers-reduced-motion.
  'count-ripple': 0.52,
};

describe('CSS motion contract', () => {
  const cssFiles = [
    'animations.css',
    'variables.css',
    'base.css',
    'layout.css',
    'components.css',
    'cards.css',
    'quran.css',
    'accessibility.css',
  ];
  const texts = Object.fromEntries(
    cssFiles.map((f) => [f, readFileSync(join(CSS_DIR, f), 'utf8')])
  );
  const all = Object.values(texts).join('\n\n');

  test('the view entrance is scoped to #main[data-view-enter] — never unscoped', () => {
    const anim = texts['animations.css'];
    // The ONLY place viewIn may be used is inside the scoped rule. Match the
    // whole rule (selectors span multiple lines) and inspect its selector.
    const usage = anim.match(/([^{}]+)\{\s*animation:\s*viewIn\b/);
    assert.ok(usage, 'viewIn usage expected');
    assert.match(
      usage[1],
      /data-view-enter/,
      'viewIn must be gated on the renderer-stamped [data-view-enter] state'
    );
    // And no stylesheet may put an animation on .view directly.
    assert.doesNotMatch(
      all,
      /(^|[^\w-])\.view\s*\{[^}]*animation:/,
      'unscoped .view animation would re-run on every re-render'
    );
  });

  /** Ambient/attention loops and event-driven emphasis pulses that
   *  deliberately exceed the entrance budget. Every entry here is a
   *  conscious exception; a NEW name above 300ms must be added or shortened. */
  const LONG_ANIMATION_NAMED = [
    'nowBadgePulse', // "today" badge breathing loop (infinite)
    'recite-pulse', // recitation console pulse (infinite)
    'sk-sweep', // skeleton shimmer sweep (infinite, v3.14)
    'dl-spin', // download-in-flight spinner (infinite, v3.14)
    'ayah-focus-glow', // ayah deep-link pulse — 700ms one-shot (v4.1)
    'garden-sway', // (v4.6.0) plant stem sway — ambient breeze loop (infinite)
    'garden-sway-alt', // (v4.6.0) counter-phase sway for multi-stem plants (infinite)
    'garden-float', // (v4.6.0) drifting pollen motes (infinite)
    'garden-breathe', // (v4.6.0) hero plant breathing loop (infinite)
  ];

  test('every animation duration is bounded; long ones are consciously allow-listed', () => {
    for (const decl of animationDeclarations(all)) {
      if (/none/.test(decl) && !/\d/.test(decl)) continue;
      const dur = parseDurationSeconds(decl.split(/[\s,]+/).find((t) => /m?s\b/.test(t)) || '');
      if (dur == null) continue; // duration-less shorthands set nothing timed
      const nameMatch = /([a-zA-Z][\w-]*)/.exec(decl);
      const name = nameMatch ? nameMatch[1] : '';
      if (dur > 0.3) {
        const isBloom =
          name in LONG_ANIMATION_ALLOWLIST && dur <= LONG_ANIMATION_ALLOWLIST[name] + 1e-9;
        const isDocumented = LONG_ANIMATION_NAMED.includes(name);
        const isInfiniteLoop = /infinite/.test(decl);
        assert.ok(
          isBloom || (isDocumented && isInfiniteLoop) || isDocumented,
          `animation "${decl}" exceeds 300ms without an allow-list entry`
        );
        if (isBloom) {
          assert.ok(
            dur <= LONG_ANIMATION_ALLOWLIST[name] + 1e-9,
            `bloom "${name}" exceeds its allow-listed bound`
          );
        }
      }
    }
  });

  test('the celebrate utility exists and is the documented bloom', () => {
    assert.match(texts['animations.css'], /\.celebrate\s*\{[^}]*celebrateBloom/s);
  });

  test('transition durations never exceed 300ms', () => {
    // Gather every literal duration in a transition declaration.
    const re = /transition(?:-duration)?:\s*([^;]+);/g;
    let m;
    while ((m = re.exec(all))) {
      const durations = m[1].match(/[\d.]+m?s\b/g) || [];
      for (const d of durations) {
        const secs = parseDurationSeconds(d);
        assert.ok(
          secs == null || secs <= 0.3,
          `transition duration ${d} exceeds the 300ms Phase B bound: ${m[1]}`
        );
      }
    }
  });

  test('prefers-reduced-motion kill rule is present and global', () => {
    const block = texts['animations.css'].match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\}/
    );
    assert.ok(block, 'the global reduce-motion kill rule must exist');
    assert.match(block[0], /animation-duration:\s*0.001ms\s*!important/);
    assert.match(block[0], /transition-duration:\s*0.001ms\s*!important/);
  });

  test('the Mushaf page-flip rides the spring curve', () => {
    assert.match(
      texts['quran.css'],
      /\.mushaf-page--flip-next\s*\{[^}]*var\(--ease-spring\)/s,
      'flip-next must use the spring easing'
    );
    assert.match(
      texts['quran.css'],
      /\.mushaf-page--flip-prev\s*\{[^}]*var\(--ease-spring\)/s,
      'flip-prev must use the spring easing'
    );
  });

  test('the drawer springs on open, keeps the standard curve for close', () => {
    const openRule = texts['layout.css'].match(/body\.nav-drawer-open \.nav-drawer\s*\{[^}]*\}/);
    assert.ok(openRule, 'open-state drawer rule missing');
    assert.match(openRule[0], /var\(--ease-spring\)/, 'open must use the spring curve');
    const baseRule = texts['layout.css'].match(
      /(?<!open\s*)\.nav-drawer\s*\{[^}]*transition:\s*transform[^}]*\}/
    );
    assert.ok(baseRule, 'base drawer transition missing');
    assert.match(baseRule[0], /var\(--ease-standard\)/, 'close must keep the standard curve');
  });

  test('press states exist for the shared chrome controls', () => {
    const anim = texts['animations.css'];
    // The :active selectors appear in a grouped rule; allow selector lists.
    assert.match(anim, /\.nav__item:active[\s\S]{0,160}scale\(0\.9/);
    assert.match(anim, /button\.chip:active[\s\S]{0,160}scale\(0\.9/);
  });
});
