/**
 * tests/quiz-mistakes-5.2.80.test.js — UP-08: missed ids feed a review
 * round. Pure reducer + deck-builder checks (randomness only shuffles;
 * membership assertions stay deterministic).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { actions } from '../js/core/state/actions.js';
import { buildQuizDeck } from '../js/app/quizDeck.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

function quizState() {
  const s = initialState();
  s.settings.language = 'en';
  return s;
}

describe('quiz mistakes review', () => {
  test('QUIZ_ANSWER records the miss, deduped; correct answers record nothing', () => {
    let s = quizState();
    const deck = [
      { itemId: 'a', choices: ['a', 'b', 'c', 'd'], dir: 'ar-en' },
      { itemId: 'b', choices: ['a', 'b', 'c', 'd'], dir: 'ar-en' },
    ];
    s = reduce(s, actions.startQuiz(deck));
    assert.deepEqual(s.quiz.wrongIds, []);
    s = reduce(s, actions.answerQuiz('zzz')); // wrong on Q1 (deck id 'a')
    assert.deepEqual(s.quiz.wrongIds, ['a']);
    assert.equal(s.quiz.wrongCount, 1);
    s = reduce(s, actions.nextQuiz());
    s = reduce(s, actions.answerQuiz('b')); // correct on Q2
    assert.deepEqual(s.quiz.wrongIds, ['a']);
    assert.equal(s.quiz.correctCount, 1);
  });

  test('QUIZ_START / QUIZ_EXIT clear the miss list', () => {
    let s = quizState();
    s = reduce(s, actions.startQuiz([{ itemId: 'a', choices: ['a'], dir: 'ar-en' }]));
    s = reduce(s, actions.answerQuiz('zzz'));
    assert.equal(s.quiz.wrongIds.length, 1);
    s = reduce(s, actions.startQuiz([]));
    assert.deepEqual(s.quiz.wrongIds, []);
  });

  test('buildQuizDeck includeIds: exact membership, fresh distractors, stale dropped', () => {
    const s = quizState();
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id,
      arabic: 'نص',
      translation: { en: `meaning ${id}` },
    }));
    s.library = { documents: { asma: { categories: [{ items }] } }, order: ['asma'] };
    const deck = buildQuizDeck(s, { includeIds: ['b', 'd', 'ghost'] });
    assert.deepEqual(
      deck.map((q) => q.itemId),
      ['b', 'd']
    );
    for (const q of deck) {
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.itemId), 'correct answer among choices');
    }
  });

  test('i18n parity for the review button', () => {
    assert.ok(en['quiz.reviewMistakes'].includes('{n}'));
    assert.ok(ar['quiz.reviewMistakes'].includes('{n}'));
  });
});
