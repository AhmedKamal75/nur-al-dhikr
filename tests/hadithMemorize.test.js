/**
 * tests/hadithMemorize.test.js — hadith memorization on the shared SRS
 * ladder (domain key-agnostic twins + reducer + restore boundary).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import {
  markMemorizedKey,
  logReviewKey,
  sanitizeMemRecords,
  dueMemRecords,
  HIFZ_INTERVALS,
} from '../js/domain/hifz.js';

describe('SRS key twins', () => {
  test('mark + easy climbs, again resets, hostile no-ops', () => {
    let r = markMemorizedKey({}, 'bukhari:1', 'hadith', '2026-09-05');
    assert.equal(r['bukhari:1'].due, '2026-09-06');
    assert.equal(r['bukhari:1'].level, 0);
    r = logReviewKey(r, 'bukhari:1', 'easy', '2026-09-06');
    assert.equal(r['bukhari:1'].level, 1);
    assert.equal(r['bukhari:1'].due, '2026-09-09', `+${HIFZ_INTERVALS[1]} days`);
    r = logReviewKey(r, 'bukhari:1', 'again', '2026-09-09');
    assert.equal(r['bukhari:1'].level, 0);
    assert.equal(r['bukhari:1'].lapses, 1);
    assert.deepEqual(markMemorizedKey(r, '__proto__:1', 'hadith'), r, 'proto refused');
    assert.deepEqual(markMemorizedKey(r, 'nope', 'hadith'), r);
    assert.deepEqual(logReviewKey(r, 'bukhari:1', 'meh'), r, 'bad grade no-op');
    assert.deepEqual(logReviewKey(r, 'muslim:9', 'easy'), r, 'unknown key no-op');
    assert.deepEqual(sanitizeMemRecords({ 'a:1': { due: 'x' } }, 'hadith'), {}, 'bad date dropped');
  });

  test('due lists sort oldest-first', () => {
    const r = {
      'bukhari:2': {
        level: 0,
        due: '2026-09-10',
        since: '2026-09-09',
        lastReviewed: null,
        reviews: 0,
        lapses: 0,
      },
      'bukhari:1': {
        level: 1,
        due: '2026-09-08',
        since: '2026-09-01',
        lastReviewed: null,
        reviews: 1,
        lapses: 0,
      },
    };
    assert.deepEqual(
      dueMemRecords(r, '2026-09-10').map((d) => d.key),
      ['bukhari:1', 'bukhari:2']
    );
  });
});

describe('HADITH_MEM_*', () => {
  test('mark + review flow through the store', () => {
    let s = { ...initialState(), hadithMemRecords: {} };
    s = reduce(s, actions.markHadithMemorized('muslim:2690'));
    assert.ok(s.hadithMemRecords['muslim:2690']);
    s = reduce(s, actions.reviewHadithMem('muslim:2690', 'easy'));
    assert.equal(s.hadithMemRecords['muslim:2690'].reviews, 1);
    s = reduce(s, actions.reviewHadithMem('muslim:2690', 'junk'));
    assert.equal(s.hadithMemRecords['muslim:2690'].reviews, 1, 'bad grade no-op');
    s = reduce(s, actions.markHadithMemorized('../evil:1'));
    assert.equal(s.hadithMemRecords['../evil:1'], undefined);
    assert.ok(PERSISTED_KEYS.includes('hadithMemRecords'));
  });

  test('restore keeps valid records only', () => {
    const out = sanitizeRestoredPayload({
      hadithMemRecords: {
        'bukhari:1': {
          level: 2,
          due: '2026-09-12',
          since: '2026-09-01',
          lastReviewed: null,
          reviews: 3,
          lapses: 0,
        },
        'bad key': {
          level: 0,
          due: '2026-09-06',
          since: '2026-09-05',
          lastReviewed: null,
          reviews: 0,
          lapses: 0,
        },
        'muslim:1': { level: 0, since: '2026-09-05', lastReviewed: null, reviews: 0, lapses: 0 },
      },
    });
    assert.deepEqual(Object.keys(out.hadithMemRecords).sort(), ['bukhari:1', 'muslim:1']);
  });
});
