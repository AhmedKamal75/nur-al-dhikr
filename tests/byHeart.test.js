/**
 * tests/byHeart.test.js — adhkar-by-heart mode: session walk + SRS records
 * over item ids + restore boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { sanitizeMemRecords } from '../js/domain/hifz.js';

describe('BYHEART session', () => {
  test('starts, reveals, exits; bad input no-ops', () => {
    let s = { ...initialState(), byHeart: null };
    s = reduce(s, actions.startByHeart('morning'));
    assert.deepEqual(s.byHeart, { categoryId: 'morning', revealed: {} });
    s = reduce(s, actions.revealByHeart('adh-mor-001'));
    assert.deepEqual(s.byHeart.revealed, { 'adh-mor-001': true });
    s = reduce(s, actions.revealByHeart('adh-mor-001'));
    assert.deepEqual(s.byHeart.revealed, { 'adh-mor-001': true }, 'idempotent');
    s = reduce(s, actions.exitByHeart());
    assert.equal(s.byHeart, null);
    s = reduce(s, actions.startByHeart(''));
    assert.equal(s.byHeart, null, 'blank category refused');
    s = reduce(s, actions.revealByHeart('x'));
    assert.equal(s.byHeart, null, 'reveal with no session no-ops');
  });
});

describe('BYHEART_* records', () => {
  test('mark + review climb the ladder; hostile keys refused', () => {
    let s = { ...initialState(), byHeartRecords: {} };
    s = reduce(s, actions.markByHeart('adh-mor-001'));
    assert.ok(s.byHeartRecords['adh-mor-001']);
    s = reduce(s, actions.reviewByHeart('adh-mor-001', 'easy'));
    assert.equal(s.byHeartRecords['adh-mor-001'].level, 1);
    s = reduce(s, actions.reviewByHeart('adh-mor-001', 'junk'));
    assert.equal(s.byHeartRecords['adh-mor-001'].level, 1);
    s = reduce(s, actions.markByHeart('__proto__'));
    assert.ok(!Object.hasOwn(s.byHeartRecords, '__proto__'), 'no own proto key stored');
    assert.equal({}.polluted, undefined);
    assert.ok(PERSISTED_KEYS.includes('byHeartRecords'));
  });

  test('item-kind sanitize keeps ids, drops hostile', () => {
    const out = sanitizeMemRecords(
      {
        'adh-mor-001': {
          level: 0,
          due: '2026-09-06',
          since: '2026-09-05',
          lastReviewed: null,
          reviews: 0,
          lapses: 0,
        },
        'bad id!': {
          level: 0,
          due: '2026-09-06',
          since: '2026-09-05',
          lastReviewed: null,
          reviews: 0,
          lapses: 0,
        },
      },
      'item'
    );
    assert.deepEqual(Object.keys(out), ['adh-mor-001']);
    const restored = sanitizeRestoredPayload({
      byHeartRecords: {
        'dua-1': {
          level: 9,
          due: '2026-10-01',
          since: '2026-09-01',
          lastReviewed: null,
          reviews: 0,
          lapses: 0,
        },
      },
    });
    assert.equal(restored.byHeartRecords['dua-1'].level, 6, 'level clamped to ladder top');
  });
});
