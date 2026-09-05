/**
 * core/state — package root docs live in core/state.js (the facade).
 */

import { dateKey } from '../utils.js';

/* Selectors ---------------------------------------------------------------- */
export const selectors = {
  isFavorite: (state, itemId) => state.favorites.includes(itemId),
  getItem: (state, itemId) => state.library.itemIndex[itemId] || null,
  getCounter: (state, itemId) => state.counters[itemId] || null,
  getCollection: (state, id) => state.collections.find((c) => c.id === id) || null,
  todayStats: (state) =>
    state.statistics.dailyHistory[dateKey(new Date())] || {
      recitations: 0,
      sessions: 0,
      itemIds: [],
    },
  todayChecklist: (state) => state.dailyChecklist[dateKey(new Date())] || {},
};
