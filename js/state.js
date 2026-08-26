/**
 * state.js
 * Single source of truth for Nūr al-Dhikr.
 * Modules never mutate state directly — they call dispatch(action) and
 * subscribe() to react to changes. Renderer treats state as read-only.
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_VIEW,
  SCHEMA_VERSION,
  VIEWS,
  MUSHAF_PAGE_COUNT,
  CHECKLIST_ITEMS,
  sanitizeSettings,
} from './config.js';
import { clone, debounce, dateKey, uid } from './utils.js';
import { loadState, saveState } from './storage.js';
import { normalizeCustomContentMap } from './schema.js';
import { isReturningUser } from './onboarding.js';
import { PRAYER_KEYS, cycleState } from './prayerLog.js';

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
    // Per-word grammar (root/i'rab/sarf/POS) + English gloss, one entry per
    // surah, fetched lazily the first time word study is opened for that
    // surah. { [surahNumber]: { [ayahNumber]: [wordRecord, ...] } }
    quranWords: {},
    // Root -> occurrences index (data/quran-roots.json), fetched once.
    quranRoots: null,
    // Tafsir/i'rab/sarf/gharib catalog (data/tafsir-editions.json) + cached
    // per-(edition, surah) text. { [editionId]: { [surahNumber]: {ayah:text} } }
    tafsirEditions: null,
    tafsir: {},
    // Ephemeral — which word's grammar popover is open, if any:
    // { surah, ayah, i } | null. Never persisted; closes on navigation.
    activeWordStudy: null,
    // Last surah the reader opened, persisted so Home can offer a
    // "Continue Reading" shortcut back into the Qur'an, mirroring the
    // pattern already used for adhkar/dua reading history.
    quranBookmark: { surah: null, ts: null },
    // Last page opened in the Mushaf (book-style) reader, separate from the
    // classic reader's surah bookmark since they're different browsing modes.
    mushafBookmark: { page: null, ts: null },
    // Per-ayah bookmarks created in the Mushaf reader. Keyed "surah:ayah"
    // with the page recorded at bookmark time (the mushaf page index has no
    // global ayah→page map, so we snapshot it while we know it). Each entry
    // can carry a free-text note and belong to one user-made folder.
    ayahBookmarks: [], // [{ key, surah, ayah, page, ts, note, folderId }]
    // User-defined folders for grouping ayah bookmarks.
    ayahBookmarkFolders: [], // [{ id, name, createdAt }]
    // Khatma progress: every Mushaf page the person has opened at least
    // once. Keys are page numbers as strings. A "reset" empties the map so
    // a fresh khatma can begin.
    mushafPagesRead: {},
    // Khatma plan (v2.9.0): { startDate: 'YYYY-MM-DD', targetDate: 'YYYY-MM-DD'|null,
    // dailyTarget: number|null } — at least one of targetDate/dailyTarget.
    // The plan is a schedule layered ON TOP of mushafPagesRead; removing it
    // never touches reading progress.
    khatmaPlan: null,
    // Completed khatmas, recorded automatically when the last page is read:
    // [{ id, completedAt, days, pages }]. Capped at 20 entries.
    khatmaHistory: [],
    // Ramadan fasting log: { '1447-9': { '1': true, '2': true, … } } —
    // hijriYear-month keyed so every Ramadan keeps its own record forever.
    ramadanLog: {},
    // Zakat calculator: prefs (currency, metal prices, nisab basis) and the
    // in-progress inputs are both persisted — figures are often gathered
    // over days, and this app's whole privacy model is local-only storage.
    zakat: {
      prefs: {
        basis: 'gold',
        goldPricePerGram: '',
        silverPricePerGram: '',
        currency: '',
        fitrPer: '',
        fitrPeople: '',
      },
      inputs: {
        cash: '',
        goldGrams: '',
        silverGrams: '',
        investments: '',
        businessGoods: '',
        receivables: '',
        otherAssets: '',
        liabilities: '',
      },
    },
    zakatHistory: [], // [{ id, ts, due, currency, netWealth, nisabMet, fitrTotal }]
    // Offline audio registry: mirror of the audio IndexedDB (key "moshafId:surah"
    // -> { bytes, ts }) so download UI renders instantly without opening IDB.
    audioDownloads: {},
    // Ephemeral full-surah player state (DOM-patched per tick; only coarse
    // changes dispatch through here).
    player: { moshafId: null, surah: null, playing: false, offline: false },
    // Ephemeral download manager UI state (selected moshaf, search text,
    // and whether the catalog finished loading — flip once → one re-render).
    audioManager: { query: '', catalogReady: false },
    // Ephemeral — which "surah:ayah" key is currently playing recited audio,
    // if any. Mirrors speakingItemId's reactive-highlight purpose.
    recitingAyahKey: null,
    // Daily habit checklist: { 'YYYY-MM-DD': { fajr: true, dhuhr: false, ... } }.
    // A private, local-only tracker — separate from the recitation-based
    // streak in `statistics`, and never auto-derived from it or vice versa.
    dailyChecklist: {},
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
    // First-run onboarding ("Getting started" panel on Home). Persisted, but
    // self-dismissing for returning users — see sanitizeRestoredPayload:
    // anyone upgrading from an earlier version with existing progress is
    // never shown it, so v2.7.0 users won't meet a first-run wizard.
    onboarding: { dismissed: false, settingsVisited: false },
    // Ephemeral — install-prompt state. beforeinstallprompt can only be
    // consumed once, so app.js stores the event itself and dispatches these
    // flags; the onboarding panel then re-renders reactively as the browser
    // makes (or uses up) the prompt available.
    install: { promptReady: false, installed: false },
    // Ephemeral — the month the Statistics heatmap is focused on, as
    // 'YYYY-MM'. Defaults to the current month on boot; shifting it re-renders
    // the heatmap for browsing history. Never persisted: re-opening the app
    // should always land on "now".
    statsHeatmapRef: null,
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
  'ayahBookmarks',
  'ayahBookmarkFolders',
  'mushafPagesRead',
  'ramadanLog',
  'zakat',
  'zakatHistory',
  'audioDownloads',
  'onboarding',
  'khatmaPlan',
  'khatmaHistory',
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
    this._persistFailed = false;
    // FIX (review v3.1 A4): a quota-exceeded (or otherwise failing) save used
    // to be swallowed silently — the app appeared to save and didn't.
    // Register a callback to tell the person, once, that persistence is
    // broken (every further write this session is being lost).
    this.onPersistError = null;
    this._persist = debounce(() => {
      const result = saveState(pickPersisted(this.state));
      if (!result.success && !this._persistFailed) {
        this._persistFailed = true;
        this.onPersistError?.(result.error);
      }
      if (result.success) this._persistFailed = false;
    }, 200);
  }

  hydrate() {
    const result = loadState();
    if (result.success && result.value) {
      this.state = {
        ...this.state,
        ...sanitizeRestoredPayload(result.value),
        // FIX (review v3.3 B1/B4/B5): settings from storage are untrusted
        // (tampered localStorage, hostile/older backup imports). The old
        // shallow spread let crafted strings reach HTML attributes
        // (stored XSS) and dropped every default key a partial payload
        // lacked, silently disabling features. sanitizeSettings validates
        // every field, clamps numbers, checks enums, and deep-merges the
        // nested objects (prayer / audio / mushafPrefs) over their
        // defaults.
        settings: sanitizeSettings(result.value.settings),
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

    case 'NAVIGATE': {
      const base = { ...state, activeView: action.view, activeParams: action.params || {} };
      // The onboarding "Personalize" step completes the first time the
      // person actually opens Settings. Tracked here (not in a view) to
      // keep views pure and the fact observable from state alone.
      if (action.view === VIEWS.SETTINGS && state.onboarding && !state.onboarding.settingsVisited) {
        return { ...base, onboarding: { ...state.onboarding, settingsVisited: true } };
      }
      return base;
    }

    case 'SETTINGS_UPDATE':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'SETTINGS_UPDATE_PRAYER':
      return {
        ...state,
        settings: { ...state.settings, prayer: { ...state.settings.prayer, ...action.patch } },
      };

    case 'SETTINGS_UPDATE_MUSHAF_PREFS':
      return {
        ...state,
        settings: {
          ...state.settings,
          mushafPrefs: { ...state.settings.mushafPrefs, ...action.patch },
        },
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

    case 'ONBOARDING_DISMISS':
      if (state.onboarding?.dismissed) return state;
      return { ...state, onboarding: { ...state.onboarding, dismissed: true } };

    case 'INSTALL_PROMPT_READY':
      if (state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: true } };

    case 'INSTALL_PROMPT_CLEAR':
      if (!state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: false } };

    case 'INSTALL_DONE':
      if (state.install?.installed) return state;
      return { ...state, install: { ...state.install, installed: true, promptReady: false } };

    case 'STATS_HEATMAP_MONTH_SHIFT': {
      // Keep the ref inside [current month - 11, current month] so the
      // heatmap browse back through a year of history but never into the
      // (empty) future.
      const base = action.baseRef; // 'YYYY-MM' of the current month
      const [by, bm] = base.split('-').map(Number);
      const [ry, rm] = (state.statsHeatmapRef || base).split('-').map(Number);
      // Work in 0-based months for the arithmetic, then back to 1-based.
      const shifted = ry * 12 + (rm - 1) + action.delta;
      const minY = by * 12 + (bm - 1) - 11;
      const maxY = by * 12 + (bm - 1);
      const clamped = Math.min(maxY, Math.max(minY, shifted));
      const ref = `${Math.floor(clamped / 12)}-${String((clamped % 12) + 1).padStart(2, '0')}`;
      if (ref === state.statsHeatmapRef) return state;
      return { ...state, statsHeatmapRef: ref };
    }

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

    case 'QURAN_WORDS_LOADED':
      return {
        ...state,
        quranWords: { ...state.quranWords, [action.number]: action.words },
      };

    case 'QURAN_ROOTS_LOADED':
      return { ...state, quranRoots: action.roots };

    case 'TAFSIR_EDITIONS_LOADED':
      return { ...state, tafsirEditions: action.editions };

    case 'TAFSIR_TEXT_LOADED':
      return {
        ...state,
        tafsir: {
          ...state.tafsir,
          [action.editionId]: { ...state.tafsir[action.editionId], [action.number]: action.text },
        },
      };

    case 'WORD_STUDY_OPEN':
      return { ...state, activeWordStudy: { surah: action.surah, ayah: action.ayah, i: action.i } };

    case 'WORD_STUDY_CLOSE':
      return { ...state, activeWordStudy: null };

    case 'AYAH_BOOKMARK_TOGGLE': {
      const exists = state.ayahBookmarks.some((b) => b.key === action.key);
      const next = exists
        ? state.ayahBookmarks.filter((b) => b.key !== action.key)
        : [
            ...state.ayahBookmarks,
            {
              key: action.key,
              surah: action.surah,
              ayah: action.ayah,
              page: action.page,
              ts: Date.now(),
              note: '',
              folderId: null,
            },
          ];
      return { ...state, ayahBookmarks: next };
    }

    case 'AYAH_BOOKMARK_UPDATE':
      return {
        ...state,
        ayahBookmarks: state.ayahBookmarks.map((b) =>
          b.key === action.key ? { ...b, ...action.patch } : b
        ),
      };

    case 'BOOKMARK_FOLDER_CREATE':
      return {
        ...state,
        ayahBookmarkFolders: [
          ...state.ayahBookmarkFolders,
          { id: action.id, name: action.name, createdAt: Date.now() },
        ],
      };

    case 'BOOKMARK_FOLDER_RENAME':
      return {
        ...state,
        ayahBookmarkFolders: state.ayahBookmarkFolders.map((f) =>
          f.id === action.id ? { ...f, name: action.name } : f
        ),
      };

    case 'BOOKMARK_FOLDER_DELETE':
      return {
        ...state,
        ayahBookmarkFolders: state.ayahBookmarkFolders.filter((f) => f.id !== action.id),
        // Orphaned bookmarks are kept, just unfiled.
        ayahBookmarks: state.ayahBookmarks.map((b) =>
          b.folderId === action.id ? { ...b, folderId: null } : b
        ),
      };

    case 'AYAH_BOOKMARK_REMOVE':
      return { ...state, ayahBookmarks: state.ayahBookmarks.filter((b) => b.key !== action.key) };

    case 'MUSHAF_PAGE_VISITED': {
      const key = String(action.page);
      if (state.mushafPagesRead[key]) return state; // idempotent
      const pagesRead = { ...state.mushafPagesRead, [key]: true };
      const next = { ...state, mushafPagesRead: pagesRead };
      // Khatma completion: recorded exactly once — only this dispatch (the
      // one that added the final page) sees count === 604; re-visits no-op
      // above, and after an explicit progress reset the count restarts at 0.
      if (Object.keys(pagesRead).length >= MUSHAF_PAGE_COUNT) {
        const startISO =
          typeof state.khatmaPlan?.startDate === 'string' ? state.khatmaPlan.startDate : null;
        // Floor, not round: completing 18 hours into the start date is a
        // 1-day khatma (that day), not 2 — the +1 counts the start day itself.
        const days = startISO
          ? Math.max(
              1,
              Math.floor((Date.now() - new Date(`${startISO}T00:00:00`).getTime()) / 86400000) + 1
            )
          : null;
        next.khatmaHistory = [
          { id: uid('khatma'), completedAt: Date.now(), days, pages: MUSHAF_PAGE_COUNT },
          ...(Array.isArray(state.khatmaHistory) ? state.khatmaHistory : []),
        ].slice(0, 20);
      }
      return next;
    }

    case 'KHATMA_PLAN_SET':
      return { ...state, khatmaPlan: action.plan };

    case 'KHATMA_PLAN_CLEAR':
      return state.khatmaPlan ? { ...state, khatmaPlan: null } : state;

    case 'MUSHAF_PROGRESS_RESET':
      return { ...state, mushafPagesRead: {} };

    case 'RAMADAN_FAST_TOGGLE': {
      const key = action.logKey;
      const entry = state.ramadanLog[key] || {};
      return {
        ...state,
        ramadanLog: { ...state.ramadanLog, [key]: { ...entry, [action.day]: !entry[action.day] } },
      };
    }

    case 'ZAKAT_PREFS_SET':
      return {
        ...state,
        zakat: { ...state.zakat, prefs: { ...state.zakat.prefs, ...action.patch } },
      };

    case 'ZAKAT_INPUT_SET':
      return {
        ...state,
        zakat: { ...state.zakat, inputs: { ...state.zakat.inputs, [action.field]: action.value } },
      };

    case 'ZAKAT_INPUTS_CLEAR':
      return {
        ...state,
        zakat: {
          ...state.zakat,
          inputs: {
            cash: '',
            goldGrams: '',
            silverGrams: '',
            investments: '',
            businessGoods: '',
            receivables: '',
            otherAssets: '',
            liabilities: '',
          },
        },
      };

    case 'ZAKAT_SNAPSHOT_SAVE':
      return { ...state, zakatHistory: [action.snapshot, ...state.zakatHistory].slice(0, 30) };

    case 'ZAKAT_SNAPSHOT_DELETE':
      return { ...state, zakatHistory: state.zakatHistory.filter((s) => s.id !== action.id) };

    case 'AUDIO_SET_PLAYER':
      return { ...state, player: { ...state.player, ...action.patch } };

    case 'AUDIO_SET_PREFS':
      return {
        ...state,
        settings: { ...state.settings, audio: { ...state.settings.audio, ...action.patch } },
      };

    case 'AUDIO_CUSTOM_ADD':
      return {
        ...state,
        settings: {
          ...state.settings,
          customReciters: [
            ...state.settings.customReciters.filter((c) => c.id !== action.entry.id),
            action.entry,
          ],
        },
      };

    case 'AUDIO_CUSTOM_REMOVE': {
      const remainingCustom = state.settings.customReciters.filter((c) => c.id !== action.id);
      const audioStillValid =
        remainingCustom.some((c) => c.id === state.settings.audio.moshafId) ||
        !String(state.settings.audio.moshafId || '').startsWith('custom-');
      return {
        ...state,
        settings: {
          ...state.settings,
          customReciters: remainingCustom,
          audio: audioStillValid
            ? state.settings.audio
            : { ...state.settings.audio, moshafId: null },
        },
        player:
          state.player.moshafId === action.id
            ? { moshafId: null, surah: null, playing: false, offline: false }
            : state.player,
      };
    }

    case 'AUDIO_DOWNLOAD_DONE': {
      const next = { ...state.audioDownloads };
      if (action.remove) delete next[action.key];
      else next[action.key] = { bytes: action.bytes || 0, ts: Date.now() };
      return { ...state, audioDownloads: next };
    }

    case 'AUDIO_CATALOG_READY':
      if (state.audioManager.catalogReady) return state;
      return { ...state, audioManager: { ...state.audioManager, catalogReady: true } };

    case 'AUDIO_MANAGER_QUERY':
      // MUST no-op on an unchanged query: ensureRecitersData nudges this
      // action after the catalog arrives, and a reducer that always returns
      // a fresh object turns that nudge into an infinite render loop.
      if (state.audioManager.query === action.query) return state;
      return { ...state, audioManager: { ...state.audioManager, query: action.query } };

    case 'ZAKAT_SNAPSHOT_UPDATE':
      return {
        ...state,
        zakatHistory: state.zakatHistory.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s
        ),
      };

    case 'PRUNE_DANGLING_REFS': {
      // Remove favorites / collection entries whose item no longer exists in
      // the built index (e.g. after the v2.5 data dedupe removed double-
      // entries). Without this, collection counts keep counting dead ids and
      // backups carry them forever. No-ops when nothing dangles.
      const valid = action.validIds;
      const favorites = state.favorites.filter((id) => valid.has(id));
      let collectionsChanged = false;
      const collections = state.collections.map((c) => {
        const items = c.items.filter((id) => valid.has(id));
        if (items.length !== c.items.length) {
          collectionsChanged = true;
          return { ...c, items };
        }
        return c;
      });
      if (favorites.length === state.favorites.length && !collectionsChanged) return state;
      return { ...state, favorites, collections };
    }

    case 'CHECKLIST_TOGGLE': {
      // FIX (review v3.1 A7/B4): accept only known checklist item ids — a
      // forged data-item used to store arbitrary garbage rows (even a
      // literal "__proto__" key) into the persisted map.
      if (!CHECKLIST_ITEMS.some((i) => i.id === action.item)) return state;
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

    case 'PRAYER_LOG_CYCLE': {
      // Tri-state prayer log riding the same dailyChecklist map the habit
      // checklist uses (see js/prayerLog.js for the storage contract).
      // Only the five fard prayers are ever cyclable; anything else no-ops.
      if (!PRAYER_KEYS.includes(action.item)) return state;
      const key = dateKey(new Date());
      const day = state.dailyChecklist[key] || {};
      const next = cycleState(day[action.item]);
      const newDay = { ...day };
      if (next == null) delete newDay[action.item];
      else newDay[action.item] = next;
      return { ...state, dailyChecklist: { ...state.dailyChecklist, [key]: newDay } };
    }

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
        // Same defense as hydrate(): an imported backup is user-supplied
        // (or hand-editable) data and must never be trusted as pre-validated.
        // sanitizeSettings blocks the crafted-mushafPrefs XSS chain and keeps
        // partial/legacy backups from silently switching features off.
        settings: sanitizeSettings(action.payload?.settings),
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
  // FIX (walkthrough v3.4 W-4): strict 24-hour HH:MM clock. Shared by the
  // reminder and calendar-note sanitizers below.
  const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const stats = asObject(p.statistics);
  const qb = asObject(p.quranBookmark);
  const mb = asObject(p.mushafBookmark);
  const quizStats = asObject(p.quizStats);
  const ob = asObject(p.onboarding);
  const kp = asObject(p.khatmaPlan);
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const zakatObj = asObject(p.zakat);
  const zakatPrefs = asObject(zakatObj.prefs);
  const zakatInputs = asObject(zakatObj.inputs);
  const asStr = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
  const asNumStr = (v) =>
    typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v : '';

  return {
    ...p,
    // Onboarding: honor an explicit flag from the payload; when absent
    // (pre-onboarding versions, fresh imports), returning users are
    // auto-dismissed so upgrades never meet a first-run wizard, while
    // genuinely new users still get the guided panel.
    onboarding: {
      dismissed: typeof ob.dismissed === 'boolean' ? ob.dismissed : isReturningUser(p),
      settingsVisited: typeof ob.settingsVisited === 'boolean' ? ob.settingsVisited : false,
    },
    // Khatma plan: a schedule layered over reading progress — never trust
    // imported shapes. Requires a valid startDate AND at least one of a
    // valid targetDate or a sane dailyTarget; anything else drops to null.
    khatmaPlan: (() => {
      const startDate = ISO_DATE.test(kp.startDate) ? kp.startDate : null;
      const targetDate = ISO_DATE.test(kp.targetDate) ? kp.targetDate : null;
      const dailyRaw = Number(kp.dailyTarget);
      const dailyTarget =
        Number.isFinite(dailyRaw) && dailyRaw >= 1
          ? Math.min(MUSHAF_PAGE_COUNT, Math.round(dailyRaw))
          : null;
      if (!startDate || (!targetDate && !dailyTarget)) return null;
      return { startDate, targetDate, dailyTarget };
    })(),
    // FIX (review v3.1 A3/B2): the audioDownloads registry is a mirror of
    // the audio IndexedDB — and the blobs do NOT travel inside a backup.
    // Honoring an imported registry had the download grid, offline badges,
    // and "Download All" all lying on the new device. It always starts
    // empty after a restore; re-download what you want offline there.
    audioDownloads: {},
    khatmaHistory: asArray(p.khatmaHistory)
      .filter((h) => h && typeof h === 'object' && Number.isFinite(h.completedAt))
      .map((h) => ({
        id: typeof h.id === 'string' ? h.id : `khatma-${h.completedAt}`,
        completedAt: h.completedAt,
        days: Number.isFinite(h.days) ? h.days : null,
        pages: Number.isFinite(h.pages) ? h.pages : MUSHAF_PAGE_COUNT,
      }))
      .slice(0, 20),
    favorites: asArray(p.favorites).filter((id) => typeof id === 'string'),
    ayahBookmarks: asArray(p.ayahBookmarks)
      .filter((b) => b && typeof b === 'object' && typeof b.key === 'string')
      .map((b) => ({
        key: b.key,
        surah: b.surah,
        ayah: b.ayah,
        page: Number.isFinite(b.page) ? b.page : 1,
        ts: Number.isFinite(b.ts) ? b.ts : null,
        note: typeof b.note === 'string' ? b.note : '',
        folderId: typeof b.folderId === 'string' ? b.folderId : null,
      })),
    ayahBookmarkFolders: asArray(p.ayahBookmarkFolders)
      .filter((f) => f && typeof f === 'object' && typeof f.id === 'string')
      .map((f) => ({
        id: f.id,
        name: typeof f.name === 'string' ? f.name : '',
        createdAt: Number.isFinite(f.createdAt) ? f.createdAt : null,
      })),
    mushafPagesRead: asObject(p.mushafPagesRead),
    // (audioDownloads intentionally omitted here — see the note above: the
    // registry is always cleared on restore because the IndexedDB blobs
    // never travel inside a backup.)
    ramadanLog: asObject(p.ramadanLog),
    zakat: {
      prefs: {
        basis: zakatPrefs.basis === 'silver' ? 'silver' : 'gold',
        goldPricePerGram: asStr(zakatPrefs.goldPricePerGram),
        silverPricePerGram: asStr(zakatPrefs.silverPricePerGram),
        currency: asStr(zakatPrefs.currency).slice(0, 12),
        fitrPer: asNumStr(zakatPrefs.fitrPer),
        fitrPeople: asNumStr(zakatPrefs.fitrPeople),
      },
      inputs: {
        cash: asNumStr(zakatInputs.cash),
        goldGrams: asNumStr(zakatInputs.goldGrams),
        silverGrams: asNumStr(zakatInputs.silverGrams),
        investments: asNumStr(zakatInputs.investments),
        businessGoods: asNumStr(zakatInputs.businessGoods),
        receivables: asNumStr(zakatInputs.receivables),
        otherAssets: asNumStr(zakatInputs.otherAssets),
        liabilities: asNumStr(zakatInputs.liabilities),
      },
    },
    zakatHistory: asArray(p.zakatHistory)
      .filter((s) => s && typeof s === 'object' && typeof s.id === 'string')
      .slice(0, 30),
    collections: asArray(p.collections)
      .filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
      .map((c) => ({
        ...c,
        items: asArray(c.items).filter((id) => typeof id === 'string'),
      })),
    counters: asObject(p.counters),
    // FIX (walkthrough v3.4 W-4): reminders only validated structurally
    // before — a hostile/older backup could carry time:"garbage" (or an
    // empty string), which the scheduler's minutesSince() parses to NaN:
    // no crash, but the reminder silently NEVER fires while the Settings
    // list shows it as live. Broken-time reminders are now dropped at the
    // state boundary; calendar notes get the same treatment below.
    reminders: asArray(p.reminders).filter(
      (r) => r && typeof r === 'object' && typeof r.id === 'string' && CLOCK_RE.test(String(r.time))
    ),
    calendarNotes: asArray(p.calendarNotes)
      .filter((n) => n && typeof n === 'object' && typeof n.id === 'string')
      .map((n) => ({
        ...n,
        // An unparseable reminderTime on a note is a dead reminder —
        // normalize it away rather than keep a silently-broken alert.
        reminderTime: CLOCK_RE.test(String(n.reminderTime)) ? n.reminderTime : null,
      })),
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
  setQuranWords: (number, words) => ({ type: 'QURAN_WORDS_LOADED', number: String(number), words }),
  setQuranRoots: (roots) => ({ type: 'QURAN_ROOTS_LOADED', roots }),
  setTafsirEditions: (editions) => ({ type: 'TAFSIR_EDITIONS_LOADED', editions }),
  setTafsirText: (editionId, number, text) => ({
    type: 'TAFSIR_TEXT_LOADED',
    editionId,
    number: String(number),
    text,
  }),
  openWordStudy: (surah, ayah, i) => ({
    type: 'WORD_STUDY_OPEN',
    surah: String(surah),
    ayah: String(ayah),
    i: Number(i),
  }),
  closeWordStudy: () => ({ type: 'WORD_STUDY_CLOSE' }),
  updateMushafPrefs: (patch) => ({ type: 'SETTINGS_UPDATE_MUSHAF_PREFS', patch }),
  toggleAyahBookmark: (key, surah, ayah, page) => ({
    type: 'AYAH_BOOKMARK_TOGGLE',
    key,
    surah,
    ayah,
    page,
  }),
  updateAyahBookmark: (key, patch) => ({ type: 'AYAH_BOOKMARK_UPDATE', key, patch }),
  createBookmarkFolder: (id, name) => ({ type: 'BOOKMARK_FOLDER_CREATE', id, name }),
  renameBookmarkFolder: (id, name) => ({ type: 'BOOKMARK_FOLDER_RENAME', id, name }),
  deleteBookmarkFolder: (id) => ({ type: 'BOOKMARK_FOLDER_DELETE', id }),
  removeAyahBookmark: (key) => ({ type: 'AYAH_BOOKMARK_REMOVE', key }),
  markMushafPageVisited: (page) => ({ type: 'MUSHAF_PAGE_VISITED', page: String(page) }),
  resetMushafProgress: () => ({ type: 'MUSHAF_PROGRESS_RESET' }),
  setKhatmaPlan: (plan) => ({ type: 'KHATMA_PLAN_SET', plan }),
  clearKhatmaPlan: () => ({ type: 'KHATMA_PLAN_CLEAR' }),
  toggleRamadanFast: (logKey, day) => ({ type: 'RAMADAN_FAST_TOGGLE', logKey, day: String(day) }),
  setZakatPrefs: (patch) => ({ type: 'ZAKAT_PREFS_SET', patch }),
  setZakatInput: (field, value) => ({ type: 'ZAKAT_INPUT_SET', field, value }),
  clearZakatInputs: () => ({ type: 'ZAKAT_INPUTS_CLEAR' }),
  saveZakatSnapshot: (snapshot) => ({ type: 'ZAKAT_SNAPSHOT_SAVE', snapshot }),
  deleteZakatSnapshot: (id) => ({ type: 'ZAKAT_SNAPSHOT_DELETE', id }),
  updateZakatSnapshot: (id, patch) => ({ type: 'ZAKAT_SNAPSHOT_UPDATE', id, patch }),
  pruneDanglingRefs: (validIds) => ({ type: 'PRUNE_DANGLING_REFS', validIds }),
  setAudioPlayer: (patch) => ({ type: 'AUDIO_SET_PLAYER', patch }),
  setAudioPrefs: (patch) => ({ type: 'AUDIO_SET_PREFS', patch }),
  addCustomReciter: (entry) => ({ type: 'AUDIO_CUSTOM_ADD', entry }),
  removeCustomReciter: (id) => ({ type: 'AUDIO_CUSTOM_REMOVE', id }),
  markAudioDownload: (key, bytes, remove) => ({ type: 'AUDIO_DOWNLOAD_DONE', key, bytes, remove }),
  setAudioManagerQuery: (query) => ({ type: 'AUDIO_MANAGER_QUERY', query }),
  setAudioCatalogReady: () => ({ type: 'AUDIO_CATALOG_READY' }),
  setRecitingAyah: (key) => ({ type: 'RECITATION_SET_ACTIVE', key }),
  toggleChecklistItem: (item, date) => ({ type: 'CHECKLIST_TOGGLE', item, date }),
  cyclePrayerLog: (item) => ({ type: 'PRAYER_LOG_CYCLE', item }),
  startQuiz: (deck) => ({ type: 'QUIZ_START', deck }),
  answerQuiz: (itemId) => ({ type: 'QUIZ_ANSWER', itemId }),
  nextQuiz: () => ({ type: 'QUIZ_NEXT' }),
  exitQuiz: () => ({ type: 'QUIZ_EXIT' }),
  shiftStatsHeatmapMonth: (delta, baseRef) => ({
    type: 'STATS_HEATMAP_MONTH_SHIFT',
    delta,
    baseRef,
  }),
  dismissOnboarding: () => ({ type: 'ONBOARDING_DISMISS' }),
  installPromptReady: () => ({ type: 'INSTALL_PROMPT_READY' }),
  installPromptClear: () => ({ type: 'INSTALL_PROMPT_CLEAR' }),
  markAppInstalled: () => ({ type: 'INSTALL_DONE' }),
};

export function persistedSnapshot(state) {
  return pickPersisted(state);
}

/* New-feature selectors ---------------------------------------------------- */
export const newSelectors = {
  isAyahBookmarked: (state, surah, ayah) =>
    state.ayahBookmarks.some((b) => b.key === `${surah}:${ayah}`),
  mushafPagesReadCount: (state) => Object.keys(state.mushafPagesRead).length,
};

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
