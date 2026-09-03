import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, ALIASES, icon } from '../js/core/icons.js';
import { auditIcons } from './helpers/icon-audit.mjs';

/**
 * The icon system's integrity gate (v3.13). A typo'd icon name renders the
 * blank-square fallback silently — these tests make that class of defect
 * impossible to ship: every name the app can reference must resolve, every
 * drawing must be unique, and no dead markup may ride along.
 */

describe('icon system integrity', () => {
  test('every referenced icon name resolves (no silent blank squares)', () => {
    const r = auditIcons();
    assert.deepEqual(r.unknown, [], `unknown referenced icon names: ${r.unknown.join(', ')}`);
  });

  test('aliases point at real glyphs', () => {
    for (const [alias, target] of Object.entries(ALIASES)) {
      assert.ok(PATHS[target], `alias "${alias}" points at missing glyph "${target}"`);
    }
  });

  test('no duplicated path data — second names are ALIASES, not copy-paste', () => {
    const bodies = Object.values(PATHS);
    assert.equal(new Set(bodies).size, bodies.length);
  });

  test('no dead markup ships (nothing at opacity 0)', () => {
    for (const [name, body] of Object.entries(PATHS)) {
      assert.ok(!body.includes('opacity="0"'), `dead markup in icon "${name}"`);
    }
  });

  test('icon() renders a well-formed svg for every defined name and alias', () => {
    for (const name of [...Object.keys(PATHS), ...Object.keys(ALIASES)]) {
      const svg = icon(name, { size: 18 });
      assert.ok(svg.startsWith('<svg'), name);
      assert.ok(svg.endsWith('</svg>'), name);
      assert.ok(!svg.includes('undefined'), name);
      assert.ok(svg.includes(`width="18"`), name);
    }
  });

  test('the fallback is intact for truly unknown names', () => {
    const svg = icon('definitely-not-an-icon');
    assert.ok(svg.includes('<rect'), 'fallback must render a blank square');
    assert.ok(svg.includes('<svg'), 'fallback must still be a valid svg');
  });

  test('icon() stays alias-aware and size-aware', () => {
    // "food" and "rain" are aliases; they must draw the canonical glyphs.
    assert.equal(icon('food'), icon('utensils'));
    assert.equal(icon('rain'), icon('cloud-rain'));
    assert.notEqual(icon('sun'), icon('moon'));
  });
});
