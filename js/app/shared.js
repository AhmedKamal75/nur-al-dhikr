/**
 * app/shared.js — shared lookups used across handler modules.
 */

import { store } from '../core/state.js';
import { pickLocale } from '../core/utils.js';

/* Shared lookups                                                      */
/* ------------------------------------------------------------------ */

export function getItemEntry(itemId) {
  return store.getState().library.itemIndex[itemId] || null;
}

export function itemClipboardText(item, lang) {
  const parts = [item.arabic, item.transliteration, pickLocale(item.translation, lang)].filter(
    Boolean
  );
  return parts.join('\n\n');
}
