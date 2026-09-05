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
};
