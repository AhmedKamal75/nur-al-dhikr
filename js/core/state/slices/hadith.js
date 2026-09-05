/**
 * core/state/slices/hadith.js — hadith slice of the store reducer.
 *
 * Owns the hadith index/books/daily ephemeral slices plus the reader's
 * book-view transient. Pure (state, action) => state; returns undefined
 * when the action belongs to another slice (the dispatcher in
 * ../reducer.js tries each in turn).
 */

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

    default:
      return undefined;
  }
}
