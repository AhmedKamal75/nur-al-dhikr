/**
 * state.js
 * Single source of truth for Nūr al-Dhikr.
 * Modules never mutate state directly — they call dispatch(action) and
 * subscribe() to react to changes. Renderer treats state as read-only.
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_VIEW,
  DEFAULT_ZAKAT,
  DEFAULT_KHATM,
  DEFAULT_QADA,
  SCHEMA_VERSION,
} from './config.js';
import { clone, debounce, dateKey } from './utils.js';
import { loadState, saveState } from './storage.js';
import { normalizeCustomContentMap } from './schema.js';

function initialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    booted: false,
    activeView: DEFAULT_VIEW,
    activeParams: {},
    library: {
      // populated at boot by app.js from catalog + fetched documents
      documents: {}, // { libraryId: normalizedDocument }
      itemIndex: {}, // { itemId: { item, category, document } }
      order: [], // library ids in catalog order
    },
    settings: clone(DEFAULT_SETTINGS),
    favorites: [],
    collections: [], // [{ id, name:{en,ar}, items:[ids], createdAt }]
    counters: {}, // { itemId: { count, target, completedCycles, lastUpdated } }
    reminders: [], // [{ id, type, time, section, enabled }]
    calendarNotes: [], // [{ id, title, body, startDate, recurrence, intervalDays, endDate, reminder, reminderTime, createdAt }]
    statistics: {
      dailyHistory: {}, // { 'YYYY-MM-DD': { recitations, sessions, itemIds:[...] } }
      totalRecitations: 0,
      totalSessions: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastActiveDate: null,
      favoriteCategories: {}, // { categoryId: count }
    },
    history: [], // [{ itemId, categoryId, ts }] most-recent-first, capped
    search: { historyList: [] },
    customContent: {}, // { libraryId: normalizedDocument } user-authored, mirrors library shape
    editor: { undoStack: [], redoStack: [] },
    tasbih: { activeItemId: null, activePhrase: null },
    // Complete Qur'an text/meta, fetched lazily (never at boot) and cached
    // here in memory only — it's large enough (2.4MB across 114 files) that
    // persisting it to localStorage on every dispatch would be wasteful;
    // the browser HTTP cache / service worker already makes repeat visits fast.
    quran: { meta: null, surahs: {} },
    // Mushaf (604-page book-style reader): meta is the compact page/juz/surah
    // index (mushaf-meta.json); pages caches individual page JSON as visited.
    // Both ephemeral — refetched (from cache-first storage.js/SW) each session.
    mushaf: { meta: null, pages: {} },
    // Last surah the reader opened, persisted so Home can offer a
    // "Continue Reading" shortcut back into the Qur'an, mirroring the
    // pattern already used for adhkar/dua reading history.
    quranBookmark: { surah: null, ts: null },
    // Last page opened in the Mushaf (book-style) reader, separate from the
    // classic reader's surah bookmark since they're different browsing modes.
    mushafBookmark: { page: null, ts: null },
    // Ephemeral — which "surah:ayah" key is currently playing recited audio,
    // if any. Mirrors speakingItemId's reactive-highlight purpose.
    recitingAyahKey: null,
    // Daily habit checklist: { 'YYYY-MM-DD': { fajr: true, dhuhr: false, ... } }.
    // A private, local-only tracker — separate from the recitation-based
    // streak in `statistics`, and never auto-derived from it or vice versa.
    dailyChecklist: {},
    // Ramadan & Fasting Companion: which calendar days the person has
    // logged as fasted, `{ 'YYYY-MM-DD': true }`. Works for any fast (the
    // 30 obligatory Ramadan days or voluntary Mon/Thu ones) — just a
    // private, local-only log, same spirit as dailyChecklist.
    ramadanFasting: {},
    // Zakat calculator inputs — persisted so the person can revisit and
    // update it as their situation changes, rather than re-entering
    // everything each time. See config.js DEFAULT_ZAKAT for field docs.
    zakat: clone(DEFAULT_ZAKAT),
    // Per-ayah bookmarks made from the Mushaf reader, keyed "surah:ayah" ->
    // { surah, ayah, page, ts }. Distinct from mushafBookmark (last page
    // visited) and quranBookmark (last surah in the classic reader) — this
    // is an explicit, multi-entry "save this exact verse" list.
    mushafAyahBookmarks: {},
    // Qur'an reading-plan (Khatm) tracker — see config.js DEFAULT_KHATM.
    khatm: clone(DEFAULT_KHATM),
    // Missed-prayer (Qada') make-up counters, one per obligatory prayer.
    qada: clone(DEFAULT_QADA),
    // Ongoing charity (Sadaqah) log — separate from the once-a-year Zakat
    // calculator. Array of { id, amount, currency, cause, date, note },
    // newest first.
    sadaqah: [],
    // 99 Names quiz: ephemeral in-progress session (never persisted — a
    // half-finished quiz shouldn't survive a reload any more than a
    // half-typed search does). `deck` is an array of
    // { itemId, choices: [itemId, itemId, itemId, itemId] } built once at
    // QUIZ_START time so the reducer itself never needs randomness.
    quiz: {
      deck: [],
      index: 0,
      correctCount: 0,
      wrongCount: 0,
      revealed: false,
      selectedId: null,
      finished: false,
    },
    // Lifetime quiz stats — this part IS persisted, so "best score" survives reloads.
    quizStats: { bestScore: 0, totalAttempts: 0, totalCorrect: 0 },
    // Ephemeral (never persisted) — which item's TTS is currently playing,
    // if any. Lives in state (not a module-level var) so every card
    // showing that item re-renders its Play button reactively, and
    // starting playback on a new item correctly reverts any other card.
    speakingItemId: null,
  };
}

const PERSISTED_KEYS = [
  'settings',
  'favorites',
  'collections',
  'counters',
  'reminders',
  'calendarNotes',
  'statistics',
  'history',
  'search',
  'customContent',
  'tasbih',
  'quranBookmark',
  'dailyChecklist',
  'quizStats',
  'mushafBookmark',
  'ramadanFasting',
  'zakat',
  'mushafAyahBookmarks',
  'khatm',
  'qada',
  'sadaqah',
];

function pickPersisted(state) {
  const out = {};
  for (const key of PERSISTED_KEYS) out[key] = state[key];
  return out;
}

class Store {
  constructor() {
    this.state = initialState();
    this._listeners = new Set();
    this._persist = debounce(() => {
      saveState(pickPersisted(this.state));
    }, 200);
  }

  hydrate() {
    const result = loadState();
    if (result.success && result.value) {
      this.state = {
        ...this.state,
        ...sanitizeRestoredPayload(result.value),
        settings: { ...DEFAULT_SETTINGS, ...(result.value.settings || {}) },
        // Defense-in-depth: localStorage can end up holding malformed custom
        // content from a bad import, manual tampering, or a bug in an older
        // version of this app. Normalize on every load so a single corrupted
        // field can never crash boot — see the "type confusion" incident in
        // the product review (a string where an array was expected crashed
        // the entire app on every subsequent load until storage was wiped).
        customContent: normalizeCustomContentMap(result.value.customContent),
      };
    }
    return this.state;
  }

  getState() {
    return this.state;
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  dispatch(action) {
    const prev = this.state;
    const next = reduce(prev, action);
    if (next === prev) return; // no-op action, skip render + persist churn
    this.state = next;
    this._listeners.forEach((fn) => {
      try {
        fn(this.state, action, prev);
      } catch (err) {
        console.error('[state] subscriber error', err);
      }
    });
    this._persist();
  }
}

/* ---------------------------------------------------------------- */
/* Reducer                                                           */
/* ---------------------------------------------------------------- */

function reduce(state, action) {
  switch (action.type) {
    case 'BOOT_COMPLETE':
      return { ...state, booted: true, library: action.library };

    case 'NAVIGATE':
      return { ...state, activeView: action.view, activeParams: action.params || {} };

    case 'SETTINGS_UPDATE':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'SETTINGS_UPDATE_PRAYER':
      return {
        ...state,
        settings: { ...state.settings, prayer: { ...state.settings.prayer, ...action.patch } },
      };

    case 'FAVORITE_TOGGLE': {
      const has = state.favorites.includes(action.itemId);
      return {
        ...state,
        favorites: has
          ? state.favorites.filter((id) => id !== action.itemId)
          : [...state.favorites, action.itemId],
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
      const nextToday = {
        recitations: today.recitations + (action.count || 1),
        sessions: today.sessions + (action.newSession ? 1 : 0),
        itemIds: today.itemIds.includes(action.itemId)
          ? today.itemIds
          : [...today.itemIds, action.itemId],
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

    case 'HISTORY_PUSH': {
      const entry = { itemId: action.itemId, categoryId: action.categoryId, ts: Date.now() };
      const filtered = state.history.filter((h) => h.itemId !== action.itemId);
      return { ...state, history: [entry, ...filtered].slice(0, 50) };
    }

    case 'SEARCH_HISTORY_ADD': {
      const q = action.query.trim();
      if (!q) return state;
      const filtered = state.search.historyList.filter((s) => s !== q);
      return { ...state, search: { historyList: [q, ...filtered].slice(0, 10) } };
    }

    case 'SEARCH_HISTORY_CLEAR':
      return { ...state, search: { historyList: [] } };

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

    case 'RECITATION_SET_ACTIVE':
      return { ...state, recitingAyahKey: action.key };

    case 'LIBRARY_SET_INDEX':
      return { ...state, library: { ...state.library, itemIndex: action.itemIndex } };

    case 'QURAN_META_LOADED':
      return { ...state, quran: { ...state.quran, meta: action.meta } };

    case 'QURAN_SURAH_LOADED':
      return {
        ...state,
        quran: { ...state.quran, surahs: { ...state.quran.surahs, [action.number]: action.surah } },
      };

    case 'QURAN_BOOKMARK_SET':
      return { ...state, quranBookmark: { surah: action.surah, ts: Date.now() } };

    case 'MUSHAF_META_LOADED':
      return { ...state, mushaf: { ...state.mushaf, meta: action.meta } };

    case 'MUSHAF_PAGE_LOADED':
      return {
        ...state,
        mushaf: { ...state.mushaf, pages: { ...state.mushaf.pages, [action.page]: action.doc } },
      };

    case 'MUSHAF_BOOKMARK_SET':
      return { ...state, mushafBookmark: { page: action.page, ts: Date.now() } };

    case 'CHECKLIST_TOGGLE': {
      const key = action.date || dateKey(new Date());
      const day = state.dailyChecklist[key] || {};
      return {
        ...state,
        dailyChecklist: {
          ...state.dailyChecklist,
          [key]: { ...day, [action.item]: !day[action.item] },
        },
      };
    }

    case 'RAMADAN_FAST_TOGGLE': {
      const key = action.date || dateKey(new Date());
      const next = { ...state.ramadanFasting };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { ...state, ramadanFasting: next };
    }

    case 'ZAKAT_UPDATE':
      return { ...state, zakat: { ...state.zakat, ...action.patch } };

    case 'MUSHAF_AYAH_BOOKMARK_TOGGLE': {
      const key = `${action.surah}:${action.ayah}`;
      const next = { ...state.mushafAyahBookmarks };
      if (next[key]) delete next[key];
      else
        next[key] = { surah: action.surah, ayah: action.ayah, page: action.page, ts: Date.now() };
      return { ...state, mushafAyahBookmarks: next };
    }

    case 'KHATM_START':
      return {
        ...state,
        khatm: {
          active: true,
          startDate: dateKey(new Date()),
          targetDays: Math.max(1, action.targetDays || 30),
          startPage: action.startPage || 1,
        },
      };

    case 'KHATM_RESET':
      return { ...state, khatm: clone(DEFAULT_KHATM) };

    case 'QADA_STEP': {
      const current = state.qada[action.prayer] || 0;
      const next = Math.max(0, current + (action.delta || 0));
      return { ...state, qada: { ...state.qada, [action.prayer]: next } };
    }

    case 'SADAQAH_ADD':
      return { ...state, sadaqah: [action.entry, ...state.sadaqah] };

    case 'SADAQAH_DELETE':
      return { ...state, sadaqah: state.sadaqah.filter((e) => e.id !== action.id) };

    case 'QUIZ_START':
      return {
        ...state,
        quiz: {
          deck: action.deck,
          index: 0,
          correctCount: 0,
          wrongCount: 0,
          revealed: false,
          selectedId: null,
          finished: false,
        },
      };

    case 'QUIZ_ANSWER': {
      if (state.quiz.revealed || !state.quiz.deck.length) return state;
      const q = state.quiz.deck[state.quiz.index];
      const correct = q && action.itemId === q.itemId;
      return {
        ...state,
        quiz: {
          ...state.quiz,
          revealed: true,
          selectedId: action.itemId,
          correctCount: state.quiz.correctCount + (correct ? 1 : 0),
          wrongCount: state.quiz.wrongCount + (correct ? 0 : 1),
        },
      };
    }

    case 'QUIZ_NEXT': {
      if (!state.quiz.deck.length) return state;
      const nextIndex = state.quiz.index + 1;
      const finished = nextIndex >= state.quiz.deck.length;
      const nextQuiz = {
        ...state.quiz,
        index: nextIndex,
        revealed: false,
        selectedId: null,
        finished,
      };
      if (!finished) return { ...state, quiz: nextQuiz };
      return {
        ...state,
        quiz: nextQuiz,
        quizStats: {
          bestScore: Math.max(state.quizStats.bestScore, state.quiz.correctCount),
          totalAttempts: state.quizStats.totalAttempts + 1,
          totalCorrect: state.quizStats.totalCorrect + state.quiz.correctCount,
        },
      };
    }

    case 'QUIZ_EXIT':
      return {
        ...state,
        quiz: {
          deck: [],
          index: 0,
          correctCount: 0,
          wrongCount: 0,
          revealed: false,
          selectedId: null,
          finished: false,
        },
      };

    case 'RESTORE_STATE':
      return {
        ...initialState(),
        ...sanitizeRestoredPayload(action.payload),
        settings: { ...DEFAULT_SETTINGS, ...(action.payload.settings || {}) },
        // Same defense as hydrate(): an imported backup is user-supplied
        // (or hand-editable) data and must never be trusted as pre-validated.
        customContent: normalizeCustomContentMap(action.payload.customContent),
        library: state.library,
        booted: true,
      };

    case 'RESET_ALL':
      return { ...initialState(), booted: true, library: state.library };

    default:
      return state;
  }
}

/**
 * Defensively coerce every array/object-shaped field of an imported (or
 * otherwise externally-supplied) payload to its expected type, dropping
 * anything that doesn't match rather than letting one bad field crash a
 * render somewhere downstream. Unlike normalizeCustomContentMap (which
 * repairs content item-by-item), this operates on the coarse top-level
 * shape — good enough to prevent crashes, not a full schema pass.
 */
function sanitizeRestoredPayload(payload) {
  const p = payload || {};
  const asArray = (v, fallback = []) => (Array.isArray(v) ? v : fallback);
  const asObject = (v, fallback = {}) =>
    v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
  const stats = asObject(p.statistics);
  const qb = asObject(p.quranBookmark);
  const mb = asObject(p.mushafBookmark);
  const quizStats = asObject(p.quizStats);
  const zakatIn = asObject(p.zakat);
  const khatmIn = asObject(p.khatm);
  const qadaIn = asObject(p.qada);
  const asNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  return {
    ...p,
    favorites: asArray(p.favorites).filter((id) => typeof id === 'string'),
    collections: asArray(p.collections)
      .filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
      .map((c) => ({
        ...c,
        items: asArray(c.items).filter((id) => typeof id === 'string'),
      })),
    counters: asObject(p.counters),
    reminders: asArray(p.reminders).filter(
      (r) => r && typeof r === 'object' && typeof r.id === 'string'
    ),
    history: asArray(p.history),
    search: {
      historyList: asArray(asObject(p.search).historyList).filter((q) => typeof q === 'string'),
    },
    quranBookmark: {
      surah: typeof qb.surah === 'string' ? qb.surah : null,
      ts: Number.isFinite(qb.ts) ? qb.ts : null,
    },
    mushafBookmark: {
      page: Number.isFinite(mb.page) ? mb.page : null,
      ts: Number.isFinite(mb.ts) ? mb.ts : null,
    },
    dailyChecklist: asObject(p.dailyChecklist),
    ramadanFasting: asObject(p.ramadanFasting),
    mushafAyahBookmarks: asObject(p.mushafAyahBookmarks),
    zakat: {
      ...DEFAULT_ZAKAT,
      cash: asNum(zakatIn.cash),
      gold: asNum(zakatIn.gold),
      silver: asNum(zakatIn.silver),
      investments: asNum(zakatIn.investments),
      business: asNum(zakatIn.business),
      receivables: asNum(zakatIn.receivables),
      other: asNum(zakatIn.other),
      liabilities: asNum(zakatIn.liabilities),
      goldPricePerGram:
        zakatIn.goldPricePerGram != null ? asNum(zakatIn.goldPricePerGram, null) : null,
      silverPricePerGram:
        zakatIn.silverPricePerGram != null ? asNum(zakatIn.silverPricePerGram, null) : null,
      nisabStandard: zakatIn.nisabStandard === 'gold' ? 'gold' : 'silver',
      currency: typeof zakatIn.currency === 'string' ? zakatIn.currency : '',
    },
    khatm: {
      active: khatmIn.active === true,
      startDate: typeof khatmIn.startDate === 'string' ? khatmIn.startDate : null,
      targetDays: Math.max(1, asNum(khatmIn.targetDays, 30)),
      startPage: Math.min(604, Math.max(1, asNum(khatmIn.startPage, 1))),
    },
    qada: {
      fajr: Math.max(0, asNum(qadaIn.fajr)),
      dhuhr: Math.max(0, asNum(qadaIn.dhuhr)),
      asr: Math.max(0, asNum(qadaIn.asr)),
      maghrib: Math.max(0, asNum(qadaIn.maghrib)),
      isha: Math.max(0, asNum(qadaIn.isha)),
    },
    sadaqah: asArray(p.sadaqah).filter(
      (e) => e && typeof e === 'object' && typeof e.id === 'string'
    ),
    quizStats: {
      bestScore: Number.isFinite(quizStats.bestScore) ? quizStats.bestScore : 0,
      totalAttempts: Number.isFinite(quizStats.totalAttempts) ? quizStats.totalAttempts : 0,
      totalCorrect: Number.isFinite(quizStats.totalCorrect) ? quizStats.totalCorrect : 0,
    },
    statistics: {
      dailyHistory: asObject(stats.dailyHistory),
      totalRecitations: Number.isFinite(stats.totalRecitations) ? stats.totalRecitations : 0,
      totalSessions: Number.isFinite(stats.totalSessions) ? stats.totalSessions : 0,
      longestStreak: Number.isFinite(stats.longestStreak) ? stats.longestStreak : 0,
      currentStreak: Number.isFinite(stats.currentStreak) ? stats.currentStreak : 0,
      lastActiveDate: typeof stats.lastActiveDate === 'string' ? stats.lastActiveDate : null,
      favoriteCategories: asObject(stats.favoriteCategories),
    },
  };
}

function computeStreak(stats, todayKey) {
  const dates = Object.keys(stats.dailyHistory).sort();
  if (!dates.includes(todayKey)) dates.push(todayKey);
  dates.sort();
  let longest = 0;
  let run = 0;
  let prevTime = null;
  for (const d of dates) {
    const t = new Date(d + 'T00:00:00').getTime();
    if (prevTime !== null && t - prevTime === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prevTime = t;
  }
  // current streak: walk backwards from today
  let current = 0;
  const cursor = new Date(todayKey + 'T00:00:00');
  while (true) {
    const key = dateKey(cursor);
    if (stats.dailyHistory[key] || key === todayKey) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return { currentStreak: current, longestStreak: longest };
}

export const store = new Store();

/* Convenience action creators -------------------------------------------------- */
export const actions = {
  navigate: (view, params) => ({ type: 'NAVIGATE', view, params }),
  bootComplete: (library) => ({ type: 'BOOT_COMPLETE', library }),
  updateSettings: (patch) => ({ type: 'SETTINGS_UPDATE', patch }),
  updatePrayerSettings: (patch) => ({ type: 'SETTINGS_UPDATE_PRAYER', patch }),
  toggleFavorite: (itemId) => ({ type: 'FAVORITE_TOGGLE', itemId }),
  createCollection: (id, name) => ({ type: 'COLLECTION_CREATE', id, name }),
  deleteCollection: (id) => ({ type: 'COLLECTION_DELETE', id }),
  renameCollection: (id, name) => ({ type: 'COLLECTION_RENAME', id, name }),
  addToCollection: (collectionId, itemId) => ({
    type: 'COLLECTION_ADD_ITEM',
    collectionId,
    itemId,
  }),
  removeFromCollection: (collectionId, itemId) => ({
    type: 'COLLECTION_REMOVE_ITEM',
    collectionId,
    itemId,
  }),
  setCounter: (itemId, patch, target) => ({ type: 'COUNTER_SET', itemId, patch, target }),
  resetCounter: (itemId, target) => ({ type: 'COUNTER_RESET', itemId, target }),
  addReminder: (reminder) => ({ type: 'REMINDER_ADD', reminder }),
  updateReminder: (id, patch) => ({ type: 'REMINDER_UPDATE', id, patch }),
  deleteReminder: (id) => ({ type: 'REMINDER_DELETE', id }),
  addCalendarNote: (note) => ({ type: 'CALENDAR_NOTE_ADD', note }),
  updateCalendarNote: (id, patch) => ({ type: 'CALENDAR_NOTE_UPDATE', id, patch }),
  deleteCalendarNote: (id) => ({ type: 'CALENDAR_NOTE_DELETE', id }),
  recordStatistic: (itemId, categoryId, count, newSession) => ({
    type: 'STATISTICS_RECORD',
    itemId,
    categoryId,
    count,
    newSession,
  }),
  pushHistory: (itemId, categoryId) => ({ type: 'HISTORY_PUSH', itemId, categoryId }),
  addSearchHistory: (query) => ({ type: 'SEARCH_HISTORY_ADD', query }),
  clearSearchHistory: () => ({ type: 'SEARCH_HISTORY_CLEAR' }),
  upsertCustomLibrary: (library) => ({ type: 'CUSTOM_LIBRARY_UPSERT', library }),
  deleteCustomLibrary: (libraryId) => ({ type: 'CUSTOM_LIBRARY_DELETE', libraryId }),
  setTasbihActive: (itemId, phrase) => ({ type: 'TASBIH_SET_ACTIVE', itemId, phrase }),
  setSpeakingItem: (itemId) => ({ type: 'SPEECH_SET_ACTIVE', itemId }),
  setLibraryIndex: (itemIndex) => ({ type: 'LIBRARY_SET_INDEX', itemIndex }),
  restoreState: (payload) => ({ type: 'RESTORE_STATE', payload }),
  resetAll: () => ({ type: 'RESET_ALL' }),
  setQuranMeta: (meta) => ({ type: 'QURAN_META_LOADED', meta }),
  setQuranSurah: (number, surah) => ({ type: 'QURAN_SURAH_LOADED', number: String(number), surah }),
  setQuranBookmark: (surah) => ({ type: 'QURAN_BOOKMARK_SET', surah }),
  setMushafMeta: (meta) => ({ type: 'MUSHAF_META_LOADED', meta }),
  setMushafPage: (page, doc) => ({ type: 'MUSHAF_PAGE_LOADED', page: String(page), doc }),
  setMushafBookmark: (page) => ({ type: 'MUSHAF_BOOKMARK_SET', page }),
  setRecitingAyah: (key) => ({ type: 'RECITATION_SET_ACTIVE', key }),
  toggleChecklistItem: (item, date) => ({ type: 'CHECKLIST_TOGGLE', item, date }),
  toggleRamadanFast: (date) => ({ type: 'RAMADAN_FAST_TOGGLE', date }),
  updateZakat: (patch) => ({ type: 'ZAKAT_UPDATE', patch }),
  toggleMushafAyahBookmark: (surah, ayah, page) => ({
    type: 'MUSHAF_AYAH_BOOKMARK_TOGGLE',
    surah: String(surah),
    ayah: String(ayah),
    page: Number(page) || null,
  }),
  startKhatm: (targetDays, startPage) => ({ type: 'KHATM_START', targetDays, startPage }),
  resetKhatm: () => ({ type: 'KHATM_RESET' }),
  stepQada: (prayer, delta) => ({ type: 'QADA_STEP', prayer, delta }),
  addSadaqah: (entry) => ({ type: 'SADAQAH_ADD', entry }),
  deleteSadaqah: (id) => ({ type: 'SADAQAH_DELETE', id }),
  startQuiz: (deck) => ({ type: 'QUIZ_START', deck }),
  answerQuiz: (itemId) => ({ type: 'QUIZ_ANSWER', itemId }),
  nextQuiz: () => ({ type: 'QUIZ_NEXT' }),
  exitQuiz: () => ({ type: 'QUIZ_EXIT' }),
};

export function persistedSnapshot(state) {
  return pickPersisted(state);
}

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
  todayFasted: (state) => !!state.ramadanFasting[dateKey(new Date())],
  isMushafAyahBookmarked: (state, surah, ayah) => !!state.mushafAyahBookmarks[`${surah}:${ayah}`],
};
