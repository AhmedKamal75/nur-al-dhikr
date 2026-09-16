/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { buildQuizDeck } from '../quizDeck.js';
import { VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { vibrate } from '../../core/utils.js';
import { markCelebration } from '../../domain/celebrate.js';
import { weakQuizIds } from '../../domain/quiz.js';
import { showToast } from '../../ui/toast.js';

export const clickHandlers = {
  'quiz-start': () => {
    const state = store.getState();
    const deck = buildQuizDeck(state);
    if (!deck.length) {
      showToast(t('quiz.unavailable', state.settings.language));
      return;
    }
    store.dispatch(actions.startQuiz(deck));
    go(VIEWS.QUIZ);
  },

  // (v5.2.75, UP-10) generalized deck preferences: library, direction,
  // size. The next quiz-start builds from these.
  'quiz-library': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.setQuizPrefs({ libraryId: ds.id }));
  },

  'quiz-direction': (ds) => {
    if (ds.dir !== 'ar-en' && ds.dir !== 'en-ar') return;
    store.dispatch(actions.setQuizPrefs({ direction: ds.dir }));
  },

  'quiz-size': (ds) => {
    const n = Math.floor(Number(ds.size));
    if (!Number.isFinite(n)) return;
    store.dispatch(actions.setQuizPrefs({ size: n }));
  },

  'quiz-answer': (ds) => {
    store.dispatch(actions.answerQuiz(ds.itemId));
    const state = store.getState();
    const q = state.quiz.deck[state.quiz.index];
    const correct = !!q && ds.itemId === q.itemId;
    if (state.settings.hapticsEnabled) vibrate(correct ? [10, 40, 10] : 15);
  },

  'quiz-next': () => {
    store.dispatch(actions.nextQuiz());
    // v3.12: the finish moment — the result screen blooms once via the
    // transient celebrate stamp; re-renders after the window stay silent.
    if (store.getState().quiz.finished) markCelebration('quiz');
  },

  'quiz-exit-link': () => {
    store.dispatch(actions.exitQuiz());
    go(VIEWS.LIBRARY);
  },

  // (v5.2.80, UP-08) Review-mistakes: rebuild a deck from the just-missed
  // ids (fresh distractors, same direction). Empty/stale ids toast instead
  // of starting a broken round; a fresh QUIZ_START resets the miss list.
  'quiz-review-mistakes': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const wrongIds = Array.isArray(state.quiz.wrongIds) ? state.quiz.wrongIds : [];
    if (!state.quiz.finished || !wrongIds.length) return;
    const deck = buildQuizDeck(state, { includeIds: wrongIds });
    if (!deck.length) {
      showToast(t('quiz.unavailable', lang));
      return;
    }
    store.dispatch(actions.startQuiz(deck));
    go(VIEWS.QUIZ);
  },

  // (v5.2.85, UP-08) Practice weak items: a deck from the cross-session
  // miss records (most-missed first). Stale ids (edited-out content)
  // drop out in the builder; empty means nothing weak — toast, no round.
  'quiz-practice-weak': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const ids = weakQuizIds(state.quizMissRecords);
    if (!ids.length) return;
    const deck = buildQuizDeck(state, { includeIds: ids });
    if (!deck.length) {
      showToast(t('quiz.unavailable', lang));
      return;
    }
    store.dispatch(actions.startQuiz(deck));
    go(VIEWS.QUIZ);
  },
};
