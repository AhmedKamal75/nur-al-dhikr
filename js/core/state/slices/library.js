/**
 * core/state/slices/library.js — library slice of the store reducer.
 *
 * Owns favorites, hadith bookmarks, collections, counters, reminders,
 * calendar notes, statistics, custom content, tasbih/speech transients.
 * Pure (state, action) => state; returns undefined when the action belongs
 * to another slice (the dispatcher in ../reducer.js tries each in turn).
 */

import { dateKey, isSafeKey } from '../../utils.js';
import { computeStreak } from '../streak.js';

/** One playlist range item, or null when unusable. Surah is strictly
 *  1–114; from/to are positive ints (upper bounds clamp against live
 *  meta at play time, since the corpus index is ephemeral). */
function sanitizePlaylistItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const surah = Math.floor(Number(raw.surah));
  if (!Number.isFinite(surah) || surah < 1 || surah > 114) return null;
  const from = Math.floor(Number(raw.from));
  const to = raw.to == null ? null : Math.floor(Number(raw.to));
  return {
    surah,
    from: Number.isFinite(from) && from >= 1 ? from : 1,
    to: Number.isFinite(to) && to >= 1 ? to : null,
  };
}

/** "<bookId>:<n>" — shared by hadith bookmarks + notes. The regex alone
 *  still matches `__proto__:1` (S3), so the book half must also pass
 *  isSafeKey; the `:n` suffix keeps exact-`__proto__` assignment off the
 *  table for the notes map either way (defense in depth). */
const HADITH_KEY_RE = /^[A-Za-z0-9_-]{1,40}:\d{1,6}$/;

function isHadithKey(key) {
  if (typeof key !== 'string' || !HADITH_KEY_RE.test(key)) return false;
  return isSafeKey(key.split(':')[0]);
}

export function reduceLibrary(state, action) {
  switch (action.type) {
    case 'FAVORITE_TOGGLE': {
      const has = state.favorites.includes(action.itemId);
      return {
        ...state,
        favorites: has
          ? state.favorites.filter((id) => id !== action.itemId)
          : [...state.favorites, action.itemId],
      };
    }

    // (v5.2.0) Hadith bookmarks. The key is validated to "<bookId>:<n>"
    // shape — anything else is dropped, never stored.
    case 'HADITH_BOOKMARK_TOGGLE': {
      const key = typeof action.key === 'string' ? action.key : '';
      if (!isHadithKey(key)) return state;
      const has = (state.hadithBookmarks || []).includes(key);
      return {
        ...state,
        hadithBookmarks: has
          ? state.hadithBookmarks.filter((k) => k !== key)
          : [...(state.hadithBookmarks || []), key],
      };
    }

    // Personal hadith notes: { "<bookId>:<n>": text }. Malformed keys and
    // non-string texts are dropped; blank text deletes; capped at 1000 so
    // a hostile dispatch cannot bloat the persisted blob.
    case 'HADITH_NOTE_SET': {
      const key = typeof action.key === 'string' ? action.key : '';
      if (!isHadithKey(key)) return state;
      const text = typeof action.text === 'string' ? action.text.slice(0, 2000) : '';
      const notes = { ...(state.hadithNotes || {}) };
      if (!text.trim()) {
        if (!(key in notes)) return state;
        delete notes[key];
        return { ...state, hadithNotes: notes };
      }
      if (!(key in notes) && Object.keys(notes).length >= 1000) return state;
      if (notes[key] === text) return state;
      notes[key] = text;
      return { ...state, hadithNotes: notes };
    }

    // Recitation queues: named lists of { surah, from, to } ranges played
    // in order by the verse engine. Ids are safe-key slugs; surah/ayah
    // ints are clamped (surah 1–114, ayahs ≥ 1 — upper-clamped against
    // live meta at play time, not here, since meta is ephemeral).
    case 'PLAYLIST_CREATE': {
      const id = typeof action.id === 'string' && isSafeKey(action.id) ? action.id : null;
      if (!id || (state.playlists || []).some((p) => p.id === id)) return state;
      if ((state.playlists || []).length >= 50) return state;
      const name =
        typeof action.name === 'string' && action.name.trim()
          ? action.name.trim().slice(0, 80)
          : 'Queue';
      return {
        ...state,
        playlists: [...(state.playlists || []), { id, name, items: [], createdAt: Date.now() }],
      };
    }

    case 'PLAYLIST_RENAME': {
      const name =
        typeof action.name === 'string' && action.name.trim()
          ? action.name.trim().slice(0, 80)
          : null;
      if (!name) return state;
      if (!(state.playlists || []).some((p) => p.id === action.id)) return state;
      return {
        ...state,
        playlists: state.playlists.map((p) => (p.id === action.id ? { ...p, name } : p)),
      };
    }

    case 'PLAYLIST_DELETE': {
      if (!(state.playlists || []).some((p) => p.id === action.id)) return state;
      return { ...state, playlists: state.playlists.filter((p) => p.id !== action.id) };
    }

    case 'PLAYLIST_ADD_ITEM': {
      const item = sanitizePlaylistItem(action.item);
      if (!item) return state;
      const pl = (state.playlists || []).find((p) => p.id === action.id);
      if (!pl || pl.items.length >= 200) return state;
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id ? { ...p, items: [...p.items, item] } : p
        ),
      };
    }

    case 'PLAYLIST_REMOVE_ITEM': {
      const pl = (state.playlists || []).find((p) => p.id === action.id);
      const idx = Math.floor(Number(action.index));
      if (!pl || !Number.isFinite(idx) || idx < 0 || idx >= pl.items.length) return state;
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id ? { ...p, items: p.items.filter((_, i) => i !== idx) } : p
        ),
      };
    }

    case 'COLLECTION_CREATE': {
      const col = { id: action.id, name: action.name, items: [], createdAt: Date.now() };
      return { ...state, collections: [...state.collections, col] };
    }

    case 'COLLECTION_DELETE':
      return { ...state, collections: state.collections.filter((c) => c.id !== action.id) };

    case 'COLLECTION_RENAME':
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      };

    case 'COLLECTION_ADD_ITEM':
      return {
        ...state,
        collections: state.collections.map((c) => {
          if (c.id !== action.collectionId) return c;
          if (c.items.includes(action.itemId)) return c;
          return { ...c, items: [...c.items, action.itemId] };
        }),
      };

    case 'COLLECTION_REMOVE_ITEM':
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === action.collectionId
            ? { ...c, items: c.items.filter((id) => id !== action.itemId) }
            : c
        ),
      };

    case 'COUNTER_SET': {
      const existing = state.counters[action.itemId] || {
        count: 0,
        target: action.target || 1,
        completedCycles: 0,
      };
      return {
        ...state,
        counters: {
          ...state.counters,
          [action.itemId]: { ...existing, ...action.patch, lastUpdated: Date.now() },
        },
      };
    }

    case 'COUNTER_RESET':
      return {
        ...state,
        counters: {
          ...state.counters,
          [action.itemId]: {
            count: 0,
            target: action.target || 1,
            completedCycles: 0,
            lastUpdated: Date.now(),
          },
        },
      };

    case 'REMINDER_ADD':
      return { ...state, reminders: [...state.reminders, action.reminder] };

    case 'REMINDER_UPDATE':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };

    case 'REMINDER_DELETE':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };

    case 'CALENDAR_NOTE_ADD':
      return { ...state, calendarNotes: [...state.calendarNotes, action.note] };

    case 'CALENDAR_NOTE_UPDATE':
      return {
        ...state,
        calendarNotes: state.calendarNotes.map((n) =>
          n.id === action.id ? { ...n, ...action.patch } : n
        ),
      };

    case 'CALENDAR_NOTE_DELETE':
      return { ...state, calendarNotes: state.calendarNotes.filter((n) => n.id !== action.id) };

    case 'STATISTICS_RECORD': {
      const key = dateKey(new Date());
      const today = state.statistics.dailyHistory[key] || {
        recitations: 0,
        sessions: 0,
        itemIds: [],
      };
      // Spread first: sibling writers (khatma pages, reading seconds) add
      // their own keys to the same day entry — rebuilding it from scratch
      // used to wipe them on every dhikr count.
      const nextToday = {
        ...today,
        recitations: (today.recitations || 0) + (action.count || 1),
        sessions: (today.sessions || 0) + (action.newSession ? 1 : 0),
        itemIds: (today.itemIds || []).includes(action.itemId)
          ? today.itemIds
          : [...(today.itemIds || []), action.itemId],
      };
      const favCat = { ...state.statistics.favoriteCategories };
      if (action.categoryId) favCat[action.categoryId] = (favCat[action.categoryId] || 0) + 1;

      const { currentStreak, longestStreak } = computeStreak(state.statistics, key);

      return {
        ...state,
        statistics: {
          ...state.statistics,
          dailyHistory: { ...state.statistics.dailyHistory, [key]: nextToday },
          totalRecitations: state.statistics.totalRecitations + (action.count || 1),
          totalSessions: state.statistics.totalSessions + (action.newSession ? 1 : 0),
          favoriteCategories: favCat,
          lastActiveDate: key,
          currentStreak,
          longestStreak: Math.max(longestStreak, state.statistics.longestStreak),
        },
      };
    }

    // Reading-timer accumulation: adds seconds spent in the Qur'an/Mushaf
    // readers to today's entry (created when missing). Hostile/negative
    // payloads clamp to a no-op so a forged dispatch can't rewrite history.
    case 'READING_ADD_SECONDS': {
      const secs = Math.floor(Number(action.seconds));
      if (!Number.isFinite(secs) || secs <= 0) return state;
      const key = dateKey(new Date());
      const today = state.statistics.dailyHistory[key] || {
        recitations: 0,
        sessions: 0,
        itemIds: [],
      };
      return {
        ...state,
        statistics: {
          ...state.statistics,
          dailyHistory: {
            ...state.statistics.dailyHistory,
            [key]: { ...today, readingSec: (today.readingSec || 0) + Math.min(secs, 86400) },
          },
          lastActiveDate: key,
        },
      };
    }

    case 'CUSTOM_LIBRARY_UPSERT':
      return {
        ...state,
        customContent: { ...state.customContent, [action.library.metadata.id]: action.library },
      };

    case 'CUSTOM_LIBRARY_DELETE': {
      const next = { ...state.customContent };
      delete next[action.libraryId];
      return { ...state, customContent: next };
    }

    case 'TASBIH_SET_ACTIVE':
      return {
        ...state,
        tasbih: { activeItemId: action.itemId, activePhrase: action.phrase || null },
      };

    case 'SPEECH_SET_ACTIVE':
      return { ...state, speakingItemId: action.itemId };

    default:
      return undefined;
  }
}
