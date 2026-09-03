/**
 * app/quizDeck.js — 99 Names quiz deck building. Randomness lives here
 * (the call site), not in the reducer, so QUIZ_START stays deterministic.
 */

import { QUIZ_CHOICE_COUNT, QUIZ_LENGTH, QUIZ_LIBRARY_ID } from '../core/config.js';

/* ------------------------------------------------------------------ */
/* Quiz: deck building                                                 */
/* ------------------------------------------------------------------ */
// Randomness lives here (the click handler), not in the reducer, so
// QUIZ_START itself stays a pure, deterministic action — consistent with
// how ids/random data are generated at the call site elsewhere in this
// file (e.g. uid() before COLLECTION_CREATE).

export function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuizDeck(state) {
  const doc = state.library.documents[QUIZ_LIBRARY_ID];
  const allIds = doc ? doc.categories.flatMap((c) => c.items.map((i) => i.id)) : [];
  if (allIds.length < QUIZ_CHOICE_COUNT) return [];
  const questionIds = shuffled(allIds).slice(0, Math.min(QUIZ_LENGTH, allIds.length));
  return questionIds.map((itemId) => {
    const distractors = shuffled(allIds.filter((id) => id !== itemId)).slice(
      0,
      QUIZ_CHOICE_COUNT - 1
    );
    return { itemId, choices: shuffled([itemId, ...distractors]) };
  });
}
