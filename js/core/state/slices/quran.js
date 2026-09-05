/**
 * core/state/slices/quran.js — Qur'an-study slice of the store reducer.
 *
 * Owns the classic reader, Mushaf progress/bookmarks, tafsir, word study,
 * roots, tajweed pool/practice stats, ayah bookmarks + folders, hifz
 * sessions/records/profiles and mutashabihat. Pure (state, action) =>
 * state; returns undefined when the action belongs to another slice (the
 * dispatcher in ../reducer.js tries each in turn).
 */

import { MUSHAF_PAGE_COUNT } from '../../config.js';
import { dateKey, uid } from '../../utils.js';
import { nextStats as nextTajweedPracticeStats } from '../../../domain/tajweedPractice.js';
import { normalizeHifzLevel, markMemorized, logReview } from '../../../domain/hifz.js';

export function reduceQuran(state, action) {
  switch (action.type) {
    case 'QURAN_META_LOADED':
      return { ...state, quran: { ...state.quran, meta: action.meta } };

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

    // (v5.2.0) Translation-compare second-edition texts. Ephemeral like
    // quran.surahs (overlay files are SW-cached, never persisted). Shape:
    // { [surahNumber]: { edKey, byAyah: { [ayahNumber]: text } } }.
    case 'QURAN_TRANSLATION_B_LOADED': {
      const key = String(action.number);
      const prev = state.quran.translationB || {};
      if (!action.doc || typeof action.doc !== 'object') return state;
      return {
        ...state,
        quran: { ...state.quran, translationB: { ...prev, [key]: action.doc } },
      };
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

    default:
      return undefined;
  }
}
