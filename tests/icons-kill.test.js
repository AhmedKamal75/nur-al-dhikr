import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, icon } from '../js/core/icons.js';
import { auditIcons } from './helpers/icon-audit.mjs';

/**
 * KILL-01 corrected outcome.
 *
 * The plan listed moon/feather/gauge as removable. Re-probing through the
 * fixed audit (iconName: descriptors, row-builder positionals, FIELD_ICONS)
 * proved feather and gauge LIVE — the journal guide row, the
 * transliteration field toggle and the mushaf speed row reach them through
 * variables the old audit could not see. Only `moon` was truly dead (the
 * kids `moon` level id is a translation key, never an icon() argument).
 */
describe('KILL-01 icon pruning', () => {
  test('moon stays removed (zero icon() call sites)', () => {
    assert.ok(!PATHS.moon, 'moon glyph must stay removed');
    assert.equal(auditIcons().unused.length, 0, 'no dead glyphs may re-accumulate silently');
  });

  test('feather and gauge stay: live through variable indirection', () => {
    const r = auditIcons();
    assert.ok(r.referenced.includes('feather'), 'journal row + translit toggle need feather');
    assert.ok(r.referenced.includes('gauge'), 'mushaf speed row needs gauge');
    assert.ok(icon('feather').includes('<svg'), 'feather must render');
    assert.ok(icon('gauge').includes('<svg'), 'gauge must render');
  });
});
