/**
 * app/shared.js — shared lookups used across handler modules.
 */

import { store } from '../core/state.js';
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

export function itemClipboardText(item, lang) {
  // Strict language separation: AR copies the Arabic matn only; EN copies
  // matn + transliteration + English translation.
  const parts = [item.arabic];
  if (showTransliterationFor(lang) && item.transliteration) parts.push(item.transliteration);
  if (showTranslationFor(lang)) {
    const tr = translationFor(item, lang);
    if (tr) parts.push(tr);
  }
  return parts.filter(Boolean).join('\n\n');
}
