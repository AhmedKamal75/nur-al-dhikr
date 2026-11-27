/**
 * domain/tasbihMeaning.js (v5.17.183, C15 "Meaning at the counter")
 * Resolves what the Tasbih counter can honestly SAY about the active
 * phrase. Every byte shown comes from the bundled library as the user
 * sees it — items are read from state.library.documents, which is the
 * content-visibility lens's output (deletes drop the card, field
 * overrides replace its text), never from the raw file. Nothing here
 * authors, translates or paraphrases religious text.
 *
 * Resolution kinds:
 *   match  — the phrase has an exact library entry whose virtue and
 *            reference the counter may quote (CEO-granted pairs:
 *            astaghfirullah → glm-gt-009, lahawla → adh-tas-005,
 *            salawat → adh-tas-006; adh-tas-007 is that entry's own
 *            related complete form, linked from the card).
 *   gloss  — the three glorifications: translation/transliteration
 *            ride the exact-text post-prayer entries, but virtue and
 *            reference stay out — the card closes with an honest link
 *            to the tasbih-general section instead.
 *   link   — the granted entry is gone from the user's effective
 *            library (lens delete): say so and offer the same link.
 *   custom — a user-authored phrase: the "your own words" state.
 *
 * Pure functions only — trivially testable.
 */

/**
 * CEO-granted exact library matches (C15 scope): phrase id → the one
 * adhkar.json entry whose virtue/reference the counter may quote.
 */
export const MATCH_ITEM_IDS = Object.freeze({
  astaghfirullah: 'glm-gt-009',
  lahawla: 'adh-tas-005',
  salawat: 'adh-tas-006',
});

/**
 * Exact-text sources for translation/transliteration of the three
 * glorifications (the post-prayer tasbih entries carry them).
 */
export const GLOSS_ITEM_IDS = Object.freeze({
  subhanallah: 'adh-pos-004a',
  alhamdulillah: 'adh-pos-004b',
  allahuakbar: 'adh-pos-004c',
});

/** The section every meaning card links to for further reading. */
export const MORE_CATEGORY_ID = 'tasbih-general';

/**
 * Find one item in the user's EFFECTIVE library (already lensed at the
 * state boundary). Absent documents/categories or a lens-deleted item
 * yield null — never the raw corpus.
 */
export function findLibraryItem(state, itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  const docs = state?.library?.documents;
  if (!docs || typeof docs !== 'object') return null;
  for (const doc of Object.values(docs)) {
    const cats = doc?.categories;
    if (!Array.isArray(cats)) continue;
    for (const cat of cats) {
      const items = cat?.items;
      if (!Array.isArray(items)) continue;
      const hit = items.find((it) => it && it.id === itemId);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Resolve the meaning payload for the active counter phrase.
 * phraseId: the preset/custom id; isCustom: the view's own verdict that
 * the id is a user-authored phrase.
 */
export function resolveMeaning(state, phraseId, isCustom) {
  if (isCustom) return { kind: 'custom' };
  if (typeof phraseId !== 'string' || !phraseId) return { kind: 'link' };

  const matchId = MATCH_ITEM_IDS[phraseId];
  if (matchId) {
    const item = findLibraryItem(state, matchId);
    if (item) return { kind: 'match', item };
    // The granted card was removed from the user's effective library —
    // fall through to the honest link state below.
  }

  const glossId = GLOSS_ITEM_IDS[phraseId];
  if (glossId) {
    const item = findLibraryItem(state, glossId);
    if (item) return { kind: 'gloss', item };
  }

  return { kind: 'link' };
}
