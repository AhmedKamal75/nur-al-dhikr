/**
 * core/state/slices/hadith.js — hadith slice of the store reducer.
 *
 * Owns the hadith index/books/daily ephemeral slices plus the reader's
 * book-view transient. Pure (state, action) => state; returns undefined
 * when the action belongs to another slice (the dispatcher in
 * ../reducer.js tries each in turn).
 */

import { isSafeKey } from '../../utils.js';

export function reduceHadith(state, action) {
  switch (action.type) {
    // ---- Ahadeeth (v3.9) — all ephemeral, see initialState ----
    case 'HADITH_INDEX_LOADED':
      return { ...state, hadith: { ...state.hadith, index: action.index, indexFailed: false } };

    case 'HADITH_INDEX_FAILED':
      return { ...state, hadith: { ...state.hadith, indexFailed: true } };

    case 'HADITH_BOOK_LOADED': {
      const id = String(action.bookId || '');
      if (!id || !action.doc || action.doc.id !== id) return state; // poisoned/mismatched doc: ignore
      return {
        ...state,
        hadith: {
          ...state.hadith,
          docs: { ...state.hadith.docs, [id]: action.doc },
          errors: { ...state.hadith.errors, [id]: false },
        },
      };
    }

    case 'HADITH_BOOK_FAILED':
      return {
        ...state,
        hadith: {
          ...state.hadith,
          errors: { ...state.hadith.errors, [String(action.bookId || '')]: true },
        },
      };

    case 'HADITH_DAILY_SET':
      return { ...state, hadith: { ...state.hadith, daily: action.daily } };

    // (v5.2.75, BUG-09) cross-book search consent: bulk-fetching every
    // missing book is user-initiated, never a keystroke side effect.
    case 'HADITH_INDEX_ALL_CONFIRM':
      if (state.hadith.indexAllConfirmed) return state;
      return { ...state, hadith: { ...state.hadith, indexAllConfirmed: true } };

    case 'HADITH_VIEW_SET': {
      const patch =
        action.patch && typeof action.patch === 'object' && !Array.isArray(action.patch)
          ? action.patch
          : {};
      return {
        ...state,
        hadith: {
          ...state.hadith,
          bookView: { ...state.hadith.bookView, ...patch },
        },
      };
    }

    // (merged-plan item 2) explicit hadith last-position stamp
    // (book+number). Navigation stamps it too (see shell NAVIGATE); this
    // covers programmatic moves. Shaped ids only — junk stamps nothing.
    case 'HADITH_LAST_SET': {
      const bookId = typeof action.bookId === 'string' ? action.bookId : '';
      const n = Math.floor(Number(action.n));
      if (!isSafeKey(bookId) || !/^[A-Za-z0-9_-]{1,40}$/.test(bookId)) return state;
      if (!Number.isFinite(n) || n < 1 || n > 999999) return state;
      const prev = state.lastPosition?.hadith;
      if (prev?.bookId === bookId && prev?.n === n) return state;
      return {
        ...state,
        lastPosition: { ...(state.lastPosition || {}), hadith: { bookId, n, ts: Date.now() } },
      };
    }

    default:
      return undefined;
  }
}
