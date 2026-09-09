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
  /**
   * (UX-7) the ONE audio session. Two engines (full-surah `player`,
   * verse-by-verse `surahPlayback`) used to render the same play/pause
   * glyph from different slices, so a tile could claim "paused" while the
   * other engine was sounding. Verse wins when active (one-voice rule:
   * starting either engine stops the other, so both sounding is
   * unreachable — but both holding residue is ordinary).
   */
  audioSession: (state) => {
    const sp = state.surahPlayback;
    if (sp?.active && sp.surah != null) {
      const paused = sp.paused === true;
      return { mode: 'verse', surah: Number(sp.surah), sounding: !paused, paused };
    }
    const p = state.player;
    if (p?.moshafId && p.surah != null) {
      const sounding = p.playing === true;
      return { mode: 'surah', surah: Number(p.surah), sounding, paused: !sounding };
    }
    return { mode: 'none', surah: null, sounding: false, paused: false };
  },
  todayStats: (state) =>
    state.statistics.dailyHistory[dateKey(new Date())] || {
      recitations: 0,
      sessions: 0,
      itemIds: [],
    },
  todayChecklist: (state) => state.dailyChecklist[dateKey(new Date())] || {},
};
