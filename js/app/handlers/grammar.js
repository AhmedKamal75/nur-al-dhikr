/**
 * app/handlers/grammar.js — feature-scoped controller module for the
 * grammar-flashcard drill (see domain/grammarDrill.js). Each export is a
 * partial click-handler map merged by app/events.js.
 */

import { ensureQuranWordsData } from '../lazyData.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { showToast } from '../../ui/toast.js';
import { buildDeck, DRILL_SIZE } from '../../domain/grammarDrill.js';

/** Distinct random surah numbers for the drill pool (call-site randomness). */
function pickSurahs(count, total = 114) {
  const picked = new Set();
  let guard = 0;
  while (picked.size < count && guard++ < count * 20) {
    picked.add(1 + Math.floor(Math.random() * total));
  }
  return [...picked];
}

export const clickHandlers = {
  // Build a fresh deck from a random pool of surahs (word docs fetch on
  // demand, then stay SW-cached). Already-cached surahs cost nothing.
  'grammar-start': async () => {
    const lang = store.getState().settings.language;
    showToast(t('grammar.loading', lang));
    for (const s of pickSurahs(6)) {
      try {
        await ensureQuranWordsData(store.getState(), String(s));
      } catch {
        /* one missing surah never cancels the round */
      }
    }
    const deck = buildDeck(store.getState().quranWords, { count: DRILL_SIZE });
    if (!deck.length) {
      showToast(t('grammar.empty', lang), { assertive: true });
      return;
    }
    store.dispatch(actions.startGrammarDrill(deck));
  },

  'grammar-reveal': () => {
    store.dispatch(actions.revealGrammarCard());
  },

  'grammar-grade': (ds) => {
    store.dispatch(actions.gradeGrammarCard(ds.right === '1'));
  },

  'grammar-restart': async () => {
    const lang = store.getState().settings.language;
    for (const s of pickSurahs(6)) {
      try {
        await ensureQuranWordsData(store.getState(), String(s));
      } catch {
        /* best effort */
      }
    }
    const deck = buildDeck(store.getState().quranWords, { count: DRILL_SIZE });
    if (!deck.length) {
      showToast(t('grammar.empty', lang), { assertive: true });
      return;
    }
    store.dispatch(actions.startGrammarDrill(deck));
  },

  'grammar-exit': () => {
    store.dispatch(actions.exitGrammarDrill());
  },
};
