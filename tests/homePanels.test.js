/**
 * tests/homePanels.test.js — home panel order + visibility: pure resolve/
 * move helpers and the settings sanitizer boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_PANEL_IDS, resolveHomePanels, moveHomePanel } from '../js/domain/homePanels.js';
import { sanitizeSettings } from '../js/core/config.js';

describe('resolveHomePanels', () => {
  test('book order by default, hides respected, stale ids ignored', () => {
    assert.deepEqual(resolveHomePanels(null, {}), [...HOME_PANEL_IDS]);
    assert.deepEqual(resolveHomePanels(null, { verse: true, nope: true }), [
      ...HOME_PANEL_IDS.filter((id) => id !== 'verse'),
    ]);
    assert.deepEqual(resolveHomePanels(['hifz', 'hifz', 'nope', 'verse'], {}), [
      'hifz',
      'verse',
      ...HOME_PANEL_IDS.filter((id) => id !== 'hifz' && id !== 'verse'),
    ]);
    assert.deepEqual(resolveHomePanels('junk', null), [...HOME_PANEL_IDS]);
  });
});

describe('moveHomePanel', () => {
  test('moves within (or from) the book order, clamps at edges', () => {
    assert.deepEqual(moveHomePanel(null, 'verse', -1)[3], 'verse', 'moves up one');
    const top = moveHomePanel(null, 'ramadan', -1);
    assert.equal(top[0], 'ramadan', 'stays at the top');
    const bottom = moveHomePanel(null, 'collections', 1);
    assert.equal(bottom.at(-1), 'collections', 'stays at the bottom');
    assert.deepEqual(moveHomePanel(null, 'nope', 1).length, HOME_PANEL_IDS.length, 'junk ignored');
  });
});

describe('sanitizer', () => {
  test('keeps known ids, dedupes, drops hostile', () => {
    const s = sanitizeSettings({
      homeOrder: ['hifz', 'hifz', 'nope', 42],
      hiddenHome: { verse: true, nope: true, verse2: 'x' },
    });
    assert.deepEqual(s.homeOrder, ['hifz']);
    assert.deepEqual(s.hiddenHome, { verse: true });
    assert.equal(sanitizeSettings({}).homeOrder, null);
  });
});
