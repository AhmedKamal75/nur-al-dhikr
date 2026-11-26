/**
 * app/shared.js — shared lookups used across handler modules.
 */

import { store } from '../core/state.js';
import { t } from '../core/i18n.js';
import { hasPendingScholarlyReview } from '../domain/contentLens.js';
import {
  showTransliterationFor,
  showTranslationFor,
  translationFor,
} from '../domain/localeContent.js';

/* Shared lookups                                                      */
/* ------------------------------------------------------------------ */

export function getItemEntry(itemId) {
  return store.getState().library.itemIndex[itemId] || null;
}

/** The { category, document } pair for a category id across bundled and
 *  custom libraries — the same lookup the category view renders from. */
export function findCategoryEntry(state, categoryId) {
  const docs = [
    ...Object.values(state.library?.documents || {}),
    ...Object.values(state.customContent || {}),
  ];
  for (const doc of docs) {
    const category = (doc.categories || []).find((c) => c.id === categoryId);
    if (category) return { category, document: doc };
  }
  return null;
}

export function itemClipboardText(item, lang) {
  // Strict language separation: AR copies the Arabic matn only; EN copies
  // matn + transliteration + English translation.
  const parts = [item.arabic];
  if (showTransliterationFor(lang) && item.transliteration) parts.push(item.transliteration);
  if (showTranslationFor(lang)) {
    const tr = translationFor(item, lang);
    if (tr) parts.push(tr);
  }
  if (hasPendingScholarlyReview(item)) parts.push(t('content.reviewPending', lang));
  return parts.filter(Boolean).join('\n\n');
}
