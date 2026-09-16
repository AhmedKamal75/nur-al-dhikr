/**
 * app/quizDeck.js — quiz deck building. Randomness lives here
 * (the call site), not in the reducer, so QUIZ_START stays deterministic.
 *
 * (v5.2.75, UP-10) generalized beyond the 99 Names: any loaded library
 * with enough items, either direction (prompt Arabic or prompt meaning),
 * and a configurable size. The view renders both directions from the
 * per-question `dir` stamp.
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

export function buildQuizDeck(state, { libraryId, direction, size, includeIds } = {}) {
  const prefs = state.quizPrefs || {};
  const id =
    typeof libraryId === 'string' && libraryId
      ? libraryId
      : typeof prefs.libraryId === 'string' && prefs.libraryId
        ? prefs.libraryId
        : QUIZ_LIBRARY_ID;
  const doc = state.library.documents[id] || state.library.documents[QUIZ_LIBRARY_ID];
  const lang = state.settings.language;
  const dir =
    direction === 'en-ar' || (direction == null && prefs.direction === 'en-ar') ? 'en-ar' : 'ar-en';
  const items = doc
    ? doc.categories.flatMap((c) => c.items).filter((it) => it && quizReady(it, dir, lang))
    : [];
  if (items.length < QUIZ_CHOICE_COUNT) return [];
  const readyIds = new Set(items.map((i) => i.id));
  // (v5.2.80, UP-08) Review-mistakes: the caller names the questions
  // (still quizReady-filtered, order kept, distractors freshly shuffled).
  // Unknown/stale ids drop out — an empty result means nothing reviewable.
  if (Array.isArray(includeIds)) {
    const wanted = includeIds.filter((x) => typeof x === 'string' && readyIds.has(x));
    const allIds = items.map((i) => i.id);
    return wanted.map((itemId) => {
      const distractors = shuffled(allIds.filter((x) => x !== itemId)).slice(
        0,
        QUIZ_CHOICE_COUNT - 1
      );
      return { itemId, choices: shuffled([itemId, ...distractors]), dir };
    });
  }
  const n = Math.max(
    1,
    Math.min(
      items.length,
      Math.floor(Number(size) || Number(prefs.size) || QUIZ_LENGTH) || QUIZ_LENGTH
    )
  );
  const questionIds = shuffled(items.map((i) => i.id)).slice(0, n);
  const allIds = items.map((i) => i.id);
  return questionIds.map((itemId) => {
    const distractors = shuffled(allIds.filter((x) => x !== itemId)).slice(
      0,
      QUIZ_CHOICE_COUNT - 1
    );
    return { itemId, choices: shuffled([itemId, ...distractors]), dir };
  });
}

/**
 * An item is quizzable in a direction when both sides render in the UI
 * language (strict separation — pickLocale would leak the other language
 * when one side is missing, the landmine the view already guards).
 */
function quizReady(item, dir, lang) {
  const hasArabic = typeof item.arabic === 'string' && item.arabic.trim() !== '';
  const tr = item.translation;
  const meaning = tr && typeof tr === 'object' ? tr[lang] : null;
  return hasArabic && typeof meaning === 'string' && meaning.trim() !== '';
}
