/**
 * search.js
 * Builds a lightweight in-memory search index from the loaded library
 * (state.library.itemIndex) and answers queries in well under 50ms even
 * for several thousand items, since everything is precomputed.
 */

import { normalizeSearch, pickLocale } from './utils.js';

let index = []; // [{ itemId, haystack, weightHints }]
let itemLookup = new Map();

/**
 * Build (or rebuild) the search index from the full item index.
 * Call once after boot and again whenever custom content changes.
 */
export function buildIndex(itemIndex) {
  index = [];
  itemLookup = new Map();
  for (const [itemId, entry] of Object.entries(itemIndex)) {
    const { item, category, document } = entry;
    const fields = [
      pickLocale(item.title, 'en'),
      pickLocale(item.title, 'ar'),
      item.arabic,
      item.transliteration,
      pickLocale(item.translation, 'en'),
      pickLocale(item.translation, 'ar'),
      pickLocale(item.virtues, 'en'),
      item.reference?.collection,
      item.reference?.hadith,
      item.tags?.length ? (Array.isArray(item.tags) ? item.tags.join(' ') : String(item.tags)) : '',
      pickLocale(category?.name, 'en'),
      pickLocale(category?.name, 'ar'),
      pickLocale(document?.metadata?.name, 'en'),
      pickLocale(document?.metadata?.name, 'ar')
    ].filter(Boolean).join(' \u2022 ');

    const rec = {
      itemId,
      haystack: normalizeSearch(fields),
      titleHaystack: normalizeSearch(pickLocale(item.title, 'en') + ' ' + pickLocale(item.title, 'ar') + ' ' + item.arabic + ' ' + item.transliteration)
    };
    index.push(rec);
    itemLookup.set(itemId, entry);
  }
  return index.length;
}

export function indexSize() {
  return index.length;
}

/**
 * Search the index. Returns an array of { itemId, item, category, document, score }
 * ranked by relevance (title/exact matches first).
 */
export function search(query, { limit = 50 } = {}) {
  const q = normalizeSearch(query);
  if (!q) return [];
  const terms = q.split(' ').filter(Boolean);
  if (!terms.length) return [];

  const results = [];
  for (const rec of index) {
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      const inTitle = rec.titleHaystack.includes(term);
      const inBody = rec.haystack.includes(term);
      if (!inTitle && !inBody) { allMatch = false; break; }
      score += inTitle ? 5 : 1;
      if (rec.titleHaystack.startsWith(term)) score += 3;
    }
    if (allMatch) results.push({ itemId: rec.itemId, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r) => ({ ...itemLookup.get(r.itemId), itemId: r.itemId, score: r.score }));
}

/** Return lightweight suggestions (top matching titles) for a partial query, for type-ahead UI. */
export function suggest(query, limit = 6) {
  return search(query, { limit }).map((r) => r.item);
}
