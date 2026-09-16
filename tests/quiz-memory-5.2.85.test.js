/**
 * tests/quiz-memory-5.2.85.test.js — UP-08 cross-session weak-item memory.
 * Pure domain + reducer + restore checks (no DOM, no network).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import {
  QUIZ_MISS_CAP,
  clearQuizMiss,
  recordQuizMiss,
  sanitizeQuizMissRecords,
  weakQuizIds,
} from '../js/domain/quiz.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

describe('quiz weak-item memory', () => {
  test('sanitizer keeps shaped records, drops hostile junk', () => {
    const out = sanitizeQuizMissRecords({
      'asma-001': { m: 3, l: '2026-09-01' },
      __proto__: { m: 9, l: '2026-09-01' },
      'bad id!': { m: 2, l: '2026-09-01' },
      'asma-002': { m: 0, l: '2026-09-01' },
      'asma-003': { m: 2, l: 'not-a-day' },
      'asma-004': 'junk',
    });
    assert.deepEqual(Object.keys(out), ['asma-001']);
    assert.deepEqual(out['asma-001'], { m: 3, l: '2026-09-01' });
    assert.deepEqual(sanitizeQuizMissRecords(null), {});
    assert.deepEqual(sanitizeQuizMissRecords([]), {});
  });

  test('record upserts + refreshes recency, clears on learn, weak order', () => {
    let r = recordQuizMiss({}, 'asma-001', '2026-09-01');
    r = recordQuizMiss(r, 'asma-001', '2026-09-02');
    r = recordQuizMiss(r, 'asma-002', '2026-09-01');
    assert.equal(r['asma-001'].m, 2);
    assert.deepEqual(weakQuizIds(r), ['asma-001', 'asma-002']);
    r = clearQuizMiss(r, 'asma-001');
    assert.deepEqual(weakQuizIds(r), ['asma-002']);
    assert.equal(recordQuizMiss(r, 'not a key!')['asma-002'].m, 1);
  });

  test('cap holds at 200, oldest evicted first', () => {
    let r = {};
    for (let i = 0; i < QUIZ_MISS_CAP + 10; i++) {
      r = recordQuizMiss(r, `asma-${String(i).padStart(3, '0')}`, '2026-09-01');
    }
    assert.equal(Object.keys(r).length, QUIZ_MISS_CAP);
    assert.ok(!('asma-000' in r), 'oldest evicted');
    assert.ok('asma-209' in r, 'newest kept');
  });

  test('reducer: wrong accumulates records, correct clears, restore round-trips', () => {
    let s = initialState();
    const deck = [{ itemId: 'asma-001', choices: ['asma-001'], dir: 'ar-en' }];
    s = reduce(s, actions.startQuiz(deck));
    s = reduce(s, actions.answerQuiz('zzz'));
    assert.equal(s.quizMissRecords['asma-001'].m, 1);
    s = reduce(s, actions.startQuiz(deck));
    s = reduce(s, actions.answerQuiz('asma-001'));
    assert.ok(!('asma-001' in s.quizMissRecords), 'correct clears the record');
    const restored = sanitizeRestoredPayload({
      quizMissRecords: { 'asma-002': { m: 2, l: '2026-09-01' } },
    });
    assert.deepEqual(restored.quizMissRecords, { 'asma-002': { m: 2, l: '2026-09-01' } });
  });

  test('i18n parity for the weak-items button', () => {
    assert.ok(en['quiz.practiceWeak'].includes('{n}'));
    assert.ok(ar['quiz.practiceWeak'].includes('{n}'));
  });
});
