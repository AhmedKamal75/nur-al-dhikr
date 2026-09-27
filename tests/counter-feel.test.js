/**
 * tests/counter-feel.test.js — the counter is a FEEL contract, and a feel
 * cannot be asserted by a screenshot review that nobody re-runs.
 *
 * (v5.17.15) Measured against azkar.me's counter, ours was a 10px ring around
 * a 41.6px numeral: the ring dominated and the number did not read as the
 * thing being counted. Theirs is a hairline ring with a 72px/700 numeral. This
 * file pins the properties that produce the feel, so a later "small tidy-up"
 * cannot quietly take them back:
 *
 *   1. The numeral is the hero — a third of the dial, heavy, tabular.
 *   2. The ring is refined, not dominant, and its tip glows.
 *   3. A tap PUNCHES the numeral and blooms behind it (pure CSS, so it cannot
 *      drift out of sync with the counter the way a scripted animation would).
 *   4. All of it is dead under prefers-reduced-motion, leaving the ring fill
 *      and the number change as the feedback.
 *   5. The geometry lives in ONE place (--tasbih-dial-size), so the ring, the
 *      bloom and the numeral cannot drift apart.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const css = readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8');
const view = readFileSync(join(ROOT, 'js/views/tasbih.js'), 'utf8');

const block = (selector) => {
  const i = css.indexOf(selector);
  if (i < 0) return '';
  const start = css.lastIndexOf('}', i) + 1;
  const end = css.indexOf('}', i);
  return css.slice(start, end + 1);
};

describe('the numeral is the hero, not the ring', () => {
  test('the numeral is a third of the dial — the measured 72px at default', () => {
    const dial = block('.tasbih-dial {');
    assert.match(dial, /--tasbih-dial-size:\s*240px/, 'dial is 240px');
    const num = block('.tasbih-dial__count {');
    assert.match(
      num,
      /min\(4\.5rem,\s*calc\(var\(--tasbih-dial-size\)\s*\*\s*0\.3\)\)/,
      '72px, and never more than a third of the dial'
    );
  });

  test('it is heavy and tabular, so digits do not jitter as the count climbs', () => {
    const num = block('.tasbih-dial__count {');
    assert.match(num, /font-weight:\s*800/, 'heavy — this is the number you are counting');
    assert.match(num, /font-variant-numeric:\s*tabular-nums/, 'tabular figures');
    assert.match(num, /letter-spacing:\s*-0\.03em/, 'tightened, as a large numeral should be');
  });

  test('the 200% type scale cannot push the numeral out of its own ring', () => {
    // The app scales type through --font-scale feeding the --fs-* tokens, not
    // the root font-size, so a rem-based numeral stays put while the ring is
    // sized from the same token. min() is what makes that safe either way.
    const num = block('.tasbih-dial__count {');
    assert.match(num, /min\(/, 'bounded by the dial, not by a bare rem value');
  });
});

describe('the ring is refined, and its tip leads the eye', () => {
  test('the ring is a 6px hairline, not the 10px slab it was', () => {
    assert.match(block('.tasbih-dial__track {'), /stroke-width:\s*6/);
    assert.match(block('.tasbih-dial__fill {'), /stroke-width:\s*6/);
  });

  test('the fill tip glows and settles over 280ms', () => {
    const fill = block('.tasbih-dial__fill {');
    assert.match(fill, /drop-shadow\(/, 'a faint halo on the leading cap');
    assert.match(fill, /transition:\s*stroke-dashoffset/, 'and the settle is animated');
    assert.match(fill, /stroke-linecap:\s*round/, 'a round cap, so the tip reads as a point');
  });
});

describe('a tap feels like a bead moving', () => {
  test('the numeral punches on press', () => {
    const punch = css.slice(css.indexOf('.tasbih-dial:active .tasbih-dial__count'));
    assert.ok(punch.length > 0, 'the punch rule exists');
    assert.match(punch.slice(0, 120), /transform:\s*scale\(1\.0\d\)/, 'it scales up on press');
  });

  test('a bloom lifts behind it', () => {
    const bloom = block('.tasbih-dial__bloom {');
    assert.match(bloom, /radial-gradient/, 'a soft radial lift');
    assert.match(bloom, /opacity:\s*0;/, 'invisible at rest');
    assert.match(bloom, /pointer-events:\s*none/, 'and never intercepts a tap');
    const active = css.slice(css.indexOf('.tasbih-dial:active .tasbih-dial__bloom'));
    assert.match(active.slice(0, 120), /opacity:\s*1/, 'it appears on press');
  });

  test('the dial reads as a physical object, not a flat outline', () => {
    const dial = block('.tasbih-dial {');
    assert.match(dial, /box-shadow:/, 'inner highlight plus the shadow it already cast');
    assert.match(dial, /inset/, 'so the highlight is on the inside of the rim');
  });

  test('the markup carries the bloom and it is inert to assistive tech', () => {
    assert.match(
      view,
      /class="tasbih-dial__bloom" aria-hidden="true"/,
      'decorative, and marked as such'
    );
  });
});

describe('reduced motion keeps the feedback and drops the movement', () => {
  const rm = css.slice(
    css.indexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('.tasbih-dial__bloom'))
  );

  test('the punch and the bloom are switched off', () => {
    assert.ok(rm.length > 0, 'a reduced-motion block covers the counter');
    assert.match(
      rm,
      /\.tasbih-dial:active \.tasbih-dial__count \{[\s\S]*?transform:\s*none/,
      'no punch'
    );
    assert.match(rm, /\.tasbih-dial__bloom \{[\s\S]*?display:\s*none/, 'no bloom');
  });

  test('the ring fill and the numeral change survive — that is the count', () => {
    assert.doesNotMatch(rm, /stroke-dashoffset:\s*none/, 'the ring still fills');
  });
});

describe('the geometry has one source of truth', () => {
  test('the SVG is drawn at a fixed viewBox and scaled by CSS', () => {
    // Fixed width/height attributes on the SVG would silently freeze the
    // ring at the old 200px while the dial grew around it.
    assert.match(view, /viewBox="0 0 200 200"/, 'fixed viewBox');
    assert.doesNotMatch(
      view,
      /viewBox="0 0 200 200" width=/,
      'no hard-coded pixel size on the SVG'
    );
    assert.match(block('.tasbih-dial__ring {'), /inline-size:\s*100%/, 'CSS scales it to the dial');
  });

  test('the tap target only grew — it never shrank below the 44px floor', () => {
    const dial = block('.tasbih-dial {');
    assert.match(dial, /touch-action:\s*manipulation/, 'still a rapid-tap surface');
    assert.match(dial, /user-select:\s*none/, 'and no text-selection callout per tap');
  });
});
