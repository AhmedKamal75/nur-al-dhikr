/**
 * core/state — package root docs live in core/state.js (the facade).
 */

import { VIEWS, MUSHAF_PAGE_COUNT, CHECKLIST_ITEMS, sanitizeSettings } from '../config.js';
import { dateKey, uid } from '../utils.js';
import { normalizeCustomContentMap } from '../schema.js';
import { nextStats as nextTajweedPracticeStats } from '../../domain/tajweedPractice.js';
import { normalizeHifzLevel, markMemorized, logReview } from '../../domain/hifz.js';
import { defaultNudgeState } from '../../domain/nudge.js';
import { FASTING_CATEGORIES } from '../../domain/fasting.js';
import { PRAYER_KEYS, cycleState } from '../../domain/prayerLog.js';
import {
  addBacklog as addQadaBacklog,
  completeOldest as completeOldestQada,
} from '../../domain/qada.js';
import {
  makeProfile as makeLocationProfile,
  profileToPrayerPatch,
} from '../../domain/locations.js';
import { initialState } from './initial.js';
import { computeStreak } from './streak.js';
import { sanitizeRestoredPayload } from './restore.js';
import { lensLibrary, prefsOf } from '../../domain/contentLens.js';

/* ---------------------------------------------------------------- */
/* Reducer — one pure function over (state, action). Views and      */
/* handlers never mutate state; every transition returns a new root */
/* (or the same reference for a no-op the store then skips).        */
/* ---------------------------------------------------------------- */

export function reduce(state, action) {
  switch (action.type) {
    case 'BOOT_COMPLETE': {
      // (v5.0.0) The library slice keeps BOTH shapes: `raw` = the immutable
      // bundled documents as fetched (the restore-to-default source of
      // truth), `documents`/`order` = the lensed view the whole app reads.
      // Every contentPrefs change re-derives documents from raw — the
      // book on disk never changes.
      const raw = {
        documents: action.library.documents,
        order: action.library.order,
      };
      const lensed = lensLibrary(raw.documents, raw.order, prefsOf(state));
      return { ...state, booted: true, library: { raw, ...lensed, itemIndex: {} } };
    }

    case 'NAVIGATE': {
      const base = {
        ...state,
        activeView: action.view,
        activeParams: action.params || {},
        // (v4.4) fullscreen Mushaf is a reading gesture tied to THIS view —
        // leaving the Mushaf (to any other view, incl. back/forward history)
        // must restore the normal shell, exactly like focus-mode does.
        mushafFullscreen: action.view === VIEWS.MUSHAF ? !!state.mushafFullscreen : false,
        // (v4.5) reader immersive is likewise a reading gesture tied to
        // THIS view — leaving the classic reader restores the shell.
        readerImmersive: action.view === VIEWS.QURAN ? !!state.readerImmersive : false,
        // (v4.5.2) manage mode is a per-surface editing gesture — it never
        // survives navigation onto a different surface (same DFA hygiene
        // as the modes above).
        ui: { contentManage: false },
      };
      // The onboarding "Personalize" step completes the first time the
      // person actually opens Settings. Tracked here (not in a view) to
      // keep views pure and the fact observable from state alone.
      if (action.view === VIEWS.SETTINGS && state.onboarding && !state.onboarding.settingsVisited) {
        return { ...base, onboarding: { ...state.onboarding, settingsVisited: true } };
      }
      return base;
    }

    case 'SETTINGS_UPDATE': {
      const next = { ...state, settings: { ...state.settings, ...action.patch } };
      // (v5.0.0) contentPrefs changed → re-derive the lensed library from
      // the immutable raw documents (four-level content authority).
      if (action.patch && action.patch.contentPrefs && state.library.raw) {
        const lensed = lensLibrary(
          state.library.raw.documents,
          state.library.raw.order,
          action.patch.contentPrefs
        );
        next.library = { ...state.library, ...lensed };
      }
      return next;
    }

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

    // (v4.5.2) The in-place content-manage mode (Library / Category):
    // enter to reorder, hide, re-target or edit items directly on the
    // surface that shows them. Transient by design (see initial state).
    case 'CONTENT_MANAGE_TOGGLE':
      return { ...state, ui: { contentManage: !state.ui?.contentManage } };

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

    case 'LOAD_ERROR_SET': {
      // Immutable set/clear of one flag; a no-op when unchanged so repeated
      // success paths never spam re-renders.
      const was = !!state.loadErrors[action.key];
      if (was === !!action.failed) return state;
      const next = { ...state.loadErrors };
      if (action.failed) next[action.key] = true;
      else delete next[action.key];
      return { ...state, loadErrors: next };
    }

    case 'DATA_LOAD_RETRY': {
      // Clear the flag and ALWAYS bump a counter — the bump is what makes
      // the retry dispatch notify subscribers even when the flag was the
      // only change, which re-runs the ensure* fetch in stateSub.
      const next = { ...state.loadErrors };
      delete next[action.key];
      return { ...state, loadErrors: next, loadRetryCount: state.loadRetryCount + 1 };
    }

    case 'QURAN_SURAH_LOADED':
      return {
        ...state,
        quran: { ...state.quran, surahs: { ...state.quran.surahs, [action.number]: action.surah } },
      };

    // v3.6: full-text search bulk-warms the whole corpus. ONE dispatch (not
    // 114) so the view re-renders exactly once after the batch lands.
    case 'QURAN_SURAHS_BULK_LOADED': {
      const docs =
        action.docs && typeof action.docs === 'object' && !Array.isArray(action.docs)
          ? action.docs
          : {};
      if (!Object.keys(docs).length) return state;
      const merged = { ...state.quran.surahs };
      for (const [k, doc] of Object.entries(docs)) merged[k] = doc;
      return { ...state, quran: { ...state.quran, surahs: merged } };
    }

    case 'QURAN_BOOKMARK_SET': {
      // (review v3.21): the bookmark id flows in from the raw URL hash and
      // out into HTML attributes + hrefs on Home — only a canonical surah
      // number string (1..114) is ever stored; anything else is not a
      // bookmarkable surah and degrades to null.
      const s = String(action.surah ?? '').trim();
      const n = /^\d{1,3}$/.test(s) ? Number(s) : 0;
      const surah = n >= 1 && n <= 114 ? String(n) : null;
      if (surah === state.quranBookmark.surah) return state;
      return { ...state, quranBookmark: { surah, ts: Date.now() } };
    }

    case 'MUSHAF_META_LOADED':
      return { ...state, mushaf: { ...state.mushaf, meta: action.meta } };

    case 'MUSHAF_PAGE_LOADED':
      return {
        ...state,
        mushaf: { ...state.mushaf, pages: { ...state.mushaf.pages, [action.page]: action.doc } },
      };

    case 'MUSHAF_BOOKMARK_SET':
      return { ...state, mushafBookmark: { page: action.page, ts: Date.now() } };

    // (v4.4) TRUE fullscreen Mushaf. Plain boolean — the renderer maps it
    // to body.is-mushaf-fullscreen and the handler owns the native
    // Fullscreen-API + wake-lock side effects (views stay pure).
    case 'MUSHAF_FULLSCREEN_SET':
      return state.mushafFullscreen === action.on
        ? state
        : { ...state, mushafFullscreen: action.on === true };

    // (v4.5) Classic-reader immersive mode. Plain boolean — the renderer
    // maps it to body.is-reader-immersive; the handler owns nothing else
    // (no native fullscreen, no wake lock: this is a chrome-free reading
    // column, and the browser itself owns the tab).
    case 'READER_IMMERSIVE_SET':
      return state.readerImmersive === action.on
        ? state
        : { ...state, readerImmersive: action.on === true };

    case 'QURAN_WORDS_LOADED':
      return {
        ...state,
        quranWords: { ...state.quranWords, [action.number]: action.words },
      };

    case 'QURAN_ROOTS_LOADED':
      return { ...state, quranRoots: action.roots };
    case 'QURAN_ROOTS_FULL_LOADED':
      return { ...state, quranRootsFull: action.roots };

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

    case 'TAJWEED_POOL_LOADED':
      return { ...state, tajweedPool: action.pool };

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

    // Hifz (memorization, v3.17) — session cases are guards around the
    // ephemeral slice; record cases delegate to the pure js/hifz.js rules.
    case 'HIFZ_SESSION_START': {
      const s = Math.floor(Number(action.surah));
      if (!(s >= 1 && s <= 114)) return state;
      return {
        ...state,
        hifzSession: {
          mode: true,
          surah: s,
          level: normalizeHifzLevel(action.level),
          revealed: {},
        },
      };
    }
    case 'HIFZ_SESSION_END':
      if (!state.hifzSession.mode) return state;
      // keep the last-used level — the next session starts where you left off
      return { ...state, hifzSession: { ...state.hifzSession, mode: false, revealed: {} } };
    case 'HIFZ_LEVEL': {
      if (!state.hifzSession.mode) return state;
      const level = normalizeHifzLevel(action.level);
      if (level === state.hifzSession.level) return state;
      // switching levels re-hides — a fresh pass, never a half-revealed mix
      return { ...state, hifzSession: { ...state.hifzSession, level, revealed: {} } };
    }
    case 'HIFZ_REVEAL': {
      const sess = state.hifzSession;
      if (!sess.mode) return state;
      const a = Math.floor(Number(action.ayah));
      if (!(a >= 1)) return state;
      const cur = sess.revealed[a] ?? {};
      let next;
      if (action.word == null) {
        next = { ...cur, all: true };
      } else {
        const w = Math.floor(Number(action.word));
        if (!(w >= 0)) return state;
        next = { ...cur, words: { ...(cur.words ?? {}), [w]: true } };
      }
      return { ...state, hifzSession: { ...sess, revealed: { ...sess.revealed, [a]: next } } };
    }
    case 'HIFZ_REHIDE':
      if (!state.hifzSession.mode) return state;
      return { ...state, hifzSession: { ...state.hifzSession, revealed: {} } };
    case 'HIFZ_MARK_MEMORIZED':
      return { ...state, hifzRecords: markMemorized(state.hifzRecords, action.surah, dateKey()) };
    case 'HIFZ_REVIEW': {
      const grade = action.grade === 'again' ? 'again' : action.grade === 'easy' ? 'easy' : null;
      if (!grade) return state;
      return {
        ...state,
        hifzRecords: logReview(state.hifzRecords, action.surah, grade, dateKey()),
      };
    }

    // Voluntary fasting prefs (v3.18) — guarded enum mutations; the fasts
    // themselves ride the generic RAMADAN_FAST_TOGGLE on non-Ramadan keys.
    case 'FASTING_TOGGLE_CATEGORY': {
      if (!FASTING_CATEGORIES.includes(action.cat)) return state;
      const cur = state.fastingPrefs[action.cat] ?? { enabled: false, remind: false };
      return {
        ...state,
        fastingPrefs: {
          ...state.fastingPrefs,
          [action.cat]: { ...cur, enabled: !cur.enabled },
        },
      };
    }
    case 'FASTING_TOGGLE_REMIND': {
      if (!FASTING_CATEGORIES.includes(action.cat)) return state;
      const cur = state.fastingPrefs[action.cat] ?? { enabled: false, remind: false };
      return {
        ...state,
        fastingPrefs: {
          ...state.fastingPrefs,
          [action.cat]: { ...cur, remind: !cur.remind },
        },
      };
    }
    case 'FASTING_SET_REMIND_TIME': {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(action.time))) return state;
      return { ...state, fastingPrefs: { ...state.fastingPrefs, remindTime: action.time } };
    }

    // Quick-log sadaqah (v3.19) — entries are timestamps with an optional
    // note; "given today" counts entries, never amounts (no amount field).
    case 'SADAQAH_LOG':
      return {
        ...state,
        sadaqahLog: [
          { id: uid('sadaqah'), ts: Date.now(), note: String(action.note || '').slice(0, 200) },
          ...state.sadaqahLog,
        ].slice(0, 500),
      };
    case 'SADAQAH_REMOVE':
      return { ...state, sadaqahLog: state.sadaqahLog.filter((e) => e.id !== action.id) };

    /* -------------------------------------------------------------- */
    /* (v4.4) Sunnah prayers / qada' / locations / journal / planner  */
    /* -------------------------------------------------------------- */

    case 'SUNNAH_TOGGLE': {
      const key = dateKey(new Date());
      const day = { ...(state.sunnahLog[key] || {}) };
      day[action.id] = !day[action.id];
      return { ...state, sunnahLog: { ...state.sunnahLog, [key]: day } };
    }

    case 'QADA_ADD':
      return {
        ...state,
        qadaLog: [
          ...addQadaBacklog(state.qadaLog, action.prayer, action.n, {
            reason: action.reason,
            date: action.date,
          }),
        ].slice(0, 1000),
      };

    case 'QADA_COMPLETE': {
      const next = completeOldestQada(state.qadaLog, action.prayer);
      return next === state.qadaLog ? state : { ...state, qadaLog: next };
    }

    case 'QADA_REMOVE_ALL':
      return {
        ...state,
        qadaLog: state.qadaLog.filter((e) => e.doneAt || e.prayer !== action.prayer),
      };

    case 'LOCATION_PROFILE_SAVE': {
      const profile = makeLocationProfile({
        id: action.id,
        name: action.name,
        prayer: state.settings.prayer,
      });
      const rest = state.locationProfiles.filter(
        (p) => p.id !== profile.id && p.name !== profile.name
      );
      return { ...state, locationProfiles: [...rest, profile].slice(0, 5) };
    }

    case 'LOCATION_PROFILE_APPLY': {
      const profile = state.locationProfiles.find((p) => p.id === action.id);
      if (!profile) return state;
      return {
        ...state,
        settings: {
          ...state.settings,
          prayer: { ...state.settings.prayer, ...profileToPrayerPatch(profile) },
        },
      };
    }

    case 'LOCATION_PROFILE_REMOVE':
      return {
        ...state,
        locationProfiles: state.locationProfiles.filter((p) => p.id !== action.id),
      };

    case 'DUA_JOURNAL_ADD':
      return {
        ...state,
        duaJournal: [
          {
            id: uid('dua'),
            ts: Date.now(),
            date: dateKey(new Date()),
            text: String(action.text || '').slice(0, 4000),
            answered: false,
            answeredTs: null,
          },
          ...state.duaJournal,
        ].slice(0, 1000),
      };

    case 'DUA_JOURNAL_TOGGLE_ANSWERED': {
      const next = state.duaJournal.map((e) =>
        e.id === action.id
          ? { ...e, answered: !e.answered, answeredTs: !e.answered ? Date.now() : null }
          : e
      );
      return { ...state, duaJournal: next };
    }

    case 'DUA_JOURNAL_REMOVE':
      return { ...state, duaJournal: state.duaJournal.filter((e) => e.id !== action.id) };

    case 'REFLECTION_ADD':
      return {
        ...state,
        reflections: [
          {
            id: uid('refl'),
            ts: Date.now(),
            week: String(action.week || ''),
            promptId: String(action.promptId || ''),
            text: String(action.text || '').slice(0, 8000),
          },
          ...state.reflections,
        ].slice(0, 500),
      };

    case 'REFLECTION_REMOVE':
      return { ...state, reflections: state.reflections.filter((e) => e.id !== action.id) };

    case 'RAMADAN_PLANNER_TOGGLE': {
      // Shared by taraweeh / i'tikaf / last-ten checklist; `slice` is the
      // persisted map name, `key` the hijri year-month, `day` the day.
      const map = state[action.slice] || {};
      const month = { ...(map[action.key] || {}) };
      month[action.day] = !month[action.day];
      return { ...state, [action.slice]: { ...map, [action.key]: month } };
    }

    case 'HIFZ_PROFILE_SWITCH': {
      const target = String(action.id || 'main');
      if (target === state.hifzActiveProfile) return state;
      const store = { ...state.hifzProfileStore };
      store[state.hifzActiveProfile] = state.hifzRecords;
      const nextRecords = store[target] || {};
      delete store[target];
      return {
        ...state,
        hifzRecords: nextRecords,
        hifzProfileStore: store,
        hifzActiveProfile: target,
      };
    }

    case 'MUTASHABIHAT_SESSION_UPDATE':
      return { ...state, mutashabihat: { ...state.mutashabihat, ...action.patch } };

    case 'IMMERSIVE_READER_TOGGLE':
      return { ...state, immersiveReader: !state.immersiveReader };

    // (v4.4) Plan import — merges ONLY the plan keys from a family member's
    // exported plan file; personal history/logs are never touched.
    case 'PLAN_IMPORT': {
      const plan = action.plan || {};
      const next = { ...state };
      if (plan.khatmaPlan) next.khatmaPlan = plan.khatmaPlan;
      if (plan.dailyGoal) next.settings = { ...next.settings, dailyGoal: plan.dailyGoal };
      if (plan.tasbihTargets) {
        const counters = { ...next.counters };
        for (const [id, target] of Object.entries(plan.tasbihTargets)) {
          counters[id] = {
            ...(counters[id] || { count: 0, completedCycles: 0, lastUpdated: 0 }),
            target,
          };
        }
        next.counters = counters;
      }
      return next;
    }

    // Gentle nudge (v3.25) — both actions write the DEVICE's own today and
    // ignore any action payload, so a forged dispatch cannot schedule,
    // rewind, or suppress future nudges. 'shown' is recorded by the app.js
    // effect the moment the card actually paints; dismiss also hides it
    // for the session (ephemeral, never persisted).
    case 'NUDGE_SHOWN': {
      const todayKey = dateKey(new Date());
      return {
        ...state,
        nudge: { ...(state.nudge || defaultNudgeState()), lastShownKey: todayKey },
      };
    }
    case 'NUDGE_DISMISS': {
      const todayKey = dateKey(new Date());
      return {
        ...state,
        nudge: {
          ...(state.nudge || defaultNudgeState()),
          lastShownKey: todayKey,
          // The persisted dismissed-day: "I said no today" is honored for
          // the whole day, reloads included — the ephemeral session flag
          // alone dies with the session and would re-show the card.
          lastDismissedKey: todayKey,
        },
        nudgeDismissed: true,
      };
    }

    // Data health (v3.26) — the export action stamps the DEVICE's own
    // Date.now() and ignores any payload, so a forged dispatch cannot
    // fake an older (or future) backup. The dry-run/storage reports are
    // session readouts: enum-guarded shapes, junk degrades to null.
    case 'BACKUP_EXPORTED': {
      return { ...state, backupMeta: { lastBackupAt: Date.now() } };
    }
    case 'DATA_HEALTH_STORAGE': {
      const s = action.value;
      const value =
        s && typeof s === 'object' && !Array.isArray(s)
          ? {
              unsupported: s.unsupported === true,
              usage: Number.isFinite(s.usage) && s.usage >= 0 ? s.usage : 0,
              quota: Number.isFinite(s.quota) && s.quota >= 0 ? s.quota : 0,
            }
          : null;
      return { ...state, dataHealth: { ...(state.dataHealth || {}), storage: value } };
    }
    case 'DATA_HEALTH_DRYRUN': {
      const r = action.value;
      const value =
        r && typeof r === 'object' && !Array.isArray(r) && typeof r.ok === 'boolean'
          ? {
              ok: r.ok,
              total: Number.isFinite(r.total) && r.total >= 0 ? r.total : 0,
              kept: Number.isFinite(r.kept) && r.kept >= 0 ? r.kept : 0,
              slices: r.slices && typeof r.slices === 'object' ? r.slices : {},
              at: Date.now(),
            }
          : null;
      return { ...state, dataHealth: { ...(state.dataHealth || {}), dryRun: value } };
    }

    // Prayer-alert reliability status (v3.20) — ephemeral, enum-guarded.
    // Dispatched by app.js's armPrayerTriggers() after it measures what the
    // current browser can actually do.
    case 'ALERT_TRIGGER_STATUS': {
      const modes = ['unknown', 'off', 'permission', 'tab', 'triggers'];
      const raw = action.status && typeof action.status === 'object' ? action.status : {};
      const mode = modes.includes(raw.mode) ? raw.mode : 'unknown';
      const countNum = Number(raw.count);
      const count =
        Number.isFinite(countNum) && countNum > 0 ? Math.min(64, Math.floor(countNum)) : 0;
      // (review v3.21): idempotent — arm passes run on every visibilitychange;
      // a fresh object for an unchanged status re-rendered the app for nothing.
      if (state.alertTriggerStatus.mode === mode && state.alertTriggerStatus.count === count) {
        return state;
      }
      return { ...state, alertTriggerStatus: { mode, count } };
    }

    case 'SURAH_PLAYBACK_SET': {
      const patch =
        action.patch && typeof action.patch === 'object' && !Array.isArray(action.patch)
          ? action.patch
          : {};
      return { ...state, surahPlayback: { ...state.surahPlayback, ...patch } };
    }

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

    case 'TAJWEED_PRACTICE_RESULT':
      return {
        ...state,
        tajweedPracticeStats: nextTajweedPracticeStats(
          state.tajweedPracticeStats,
          action.ruleId,
          action.perfect
        ),
      };

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
      const todayKey = dateKey(new Date());
      const todayStats = state.statistics.dailyHistory[todayKey] || {
        recitations: 0,
        sessions: 0,
        itemIds: [],
      };
      // v3.19: pages-per-day for the combined worship card — bumped in the
      // SAME dispatch that feeds the khatma. (review v3.21): idempotency is
      // now PER DAY, not once-ever — re-reading an already-read page still
      // counts toward today's pages and today's streak, exactly once per
      // page per day (pagesVisited is the per-day dedup that also keeps the
      // render→dispatch loop bounded).
      const visitedToday =
        todayStats.pagesVisited && typeof todayStats.pagesVisited === 'object'
          ? todayStats.pagesVisited
          : {};
      if (state.mushafPagesRead[key] && visitedToday[key]) return state; // fully idempotent
      const isNewEverPage = !state.mushafPagesRead[key];
      const pagesRead = isNewEverPage
        ? { ...state.mushafPagesRead, [key]: true }
        : state.mushafPagesRead;
      const nextStats = {
        ...state.statistics,
        dailyHistory: {
          ...state.statistics.dailyHistory,
          [todayKey]: {
            ...todayStats,
            pages: (todayStats.pages || 0) + 1,
            pagesVisited: { ...visitedToday, [key]: true },
          },
        },
      };
      const next = { ...state, mushafPagesRead: pagesRead, statistics: nextStats };
      // Khatma completion: recorded exactly once — only the dispatch that
      // ADDS A NEW ever-read page can push the count across 604; per-day
      // re-visits no-op above or re-use the same pagesRead map, and after
      // an explicit progress reset the count restarts at 0.
      if (isNewEverPage && Object.keys(pagesRead).length >= MUSHAF_PAGE_COUNT) {
        const startISO =
          typeof state.khatmaPlan?.startDate === 'string' ? state.khatmaPlan.startDate : null;
        // (v4.3) calendar days via LOCAL DATE COMPONENTS, not millisecond
        // division: even the v4.2 noon-anchor diff is 23h/25h across a DST
        // transition, and floor() loses a whole day over spring-forward
        // (noon Mar 8 → noon Mar 10 in America/New_York is 47h → "2 days"
        // for a khatma that touched 3 calendar dates). Date.UTC over local
        // Y/M/D components counts pure calendar days in every timezone.
        // Floor, not round: completing 18 hours into the start date is a
        // 1-day khatma (that day), not 2 — the +1 counts the start day itself.
        let days = null;
        if (startISO) {
          const start = new Date(`${startISO}T12:00:00`);
          const now = new Date();
          const calendarDiff =
            (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
              Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
            86400000;
          days = Math.max(1, Math.floor(calendarDiff) + 1);
        }
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

    case 'AUDIO_DOWNLOAD_START': {
      if (state.audioDownloading[action.key]) return state;
      return { ...state, audioDownloading: { ...state.audioDownloading, [action.key]: true } };
    }

    case 'AUDIO_DOWNLOAD_END': {
      if (!state.audioDownloading[action.key]) return state;
      const inFlight = { ...state.audioDownloading };
      delete inFlight[action.key];
      return { ...state, audioDownloading: inFlight };
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

    case 'AUDIO_BATCH_RUNNING':
      // (v4.2) ephemeral: is a "Download All" batch in flight? Drives the
      // Stop button. No-op on an unchanged flag for the same reason as the
      // query above.
      if (state.audioManager.batchRunning === action.running) return state;
      return { ...state, audioManager: { ...state.audioManager, batchRunning: action.running } };

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

    case 'CHECKLIST_DAY_RESET': {
      // (v4.6.0) Clear one day's checklist (the sheet's "start fresh").
      const key = action.date || dateKey(new Date());
      if (!(key in state.dailyChecklist)) return state;
      const dailyChecklist = { ...state.dailyChecklist };
      delete dailyChecklist[key];
      return { ...state, dailyChecklist };
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

    case 'RESTORE_STATE': {
      const restored = {
        ...initialState(),
        ...sanitizeRestoredPayload(action.payload),
        // sanitizeSettings blocks the crafted-mushafPrefs XSS chain and keeps
        // partial/legacy backups from silently switching features off.
        settings: sanitizeSettings(action.payload?.settings),
        // Same defense as hydrate(): an imported backup is user-supplied
        // (or hand-editable) data and must never be trusted as pre-validated.
        customContent: normalizeCustomContentMap(action.payload.customContent),
        library: state.library,
        booted: true,
      };
      // (v5.0.0) a restored backup carries its own contentPrefs — re-apply
      // the lens over this session's raw documents so the restored
      // customizations render immediately.
      if (state.library.raw) {
        const lensed = lensLibrary(
          state.library.raw.documents,
          state.library.raw.order,
          prefsOf(restored)
        );
        restored.library = { ...state.library, ...lensed };
      }
      return restored;
    }

    case 'RESET_ALL': {
      // (v5.0.0) reset wipes prefs — the lensed library returns to the
      // book exactly as bundled.
      const fresh = { ...initialState(), booted: true, library: state.library };
      if (state.library.raw) {
        const lensed = lensLibrary(state.library.raw.documents, state.library.raw.order, {});
        fresh.library = { ...state.library, ...lensed };
      }
      return fresh;
    }

    default:
      return state;
  }
}
