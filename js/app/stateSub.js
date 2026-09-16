/**
 * app/stateSub.js — the store's single subscriber. Every state change
 * flows through here: theme application, lazy-data triggers, lifecycles
 * (ticker/compass), guard resets, and the view re-render itself.
 */

import { rt } from './rt.js';
import { ensureRecitersData, maybeSyncVerseStatus, updateCompassLifecycle } from './audioEngine.js';
import { refreshLibraryIndex } from './net.js';
import { renderErrorScreen, closeNavDrawer } from './drawer.js';
import {
  ensureHadithData,
  maybeScrollToFocusHadith,
  maybeStartHadithSearchBuild,
  resetHadithBookFetches,
} from './hadithData.js';
import { ensureOfflineQuota } from './offlineJobs.js';
import {
  clearLazyInFlightFetches,
  ensureMushafData,
  ensureQuranData,
  ensureQuranRoots,
  ensureQuranRootsFull,
} from './lazyData.js';
import { applyTranslationEdition } from './quranData.js';
import {
  maybeScrollToFocusAyah,
  maybeStartHifzFromParam,
  maybeStartQuranSearchBuild,
} from './quranSearch.js';
import { maybeStartTafsirSearchBuild } from './tafsirSearch.js';
import { maybeFollowRecitation } from './recitationFollow.js';
import { syncReadingTimer } from './readingTimer.js';
import { render, clearScrollMemory } from './renderer.js';
import {
  maybeMarkNudgeShown,
  maybeProbeStorage,
  updateHomeTickerLifecycle,
  updateRamadanLifecycle,
} from './tickers.js';
import { scheduleTriggerArm } from './triggers.js';
import { settingsSectionForSlug } from '../views/settings.js';
import { refreshAppBadge } from '../services/appBadge.js';
import { syncPlayingState } from '../services/mediaSession.js';
import { armFsControlsAfterEnter, updateAmbientWakeLifecycle } from './fullscreen.js';
import { VIEWS } from '../core/config.js';
import { computeReaderWindow } from '../domain/readerWindow.js';
import { resetQuranIndex, setQuranIndexReady } from '../domain/quranSearch.js';
import { clearClassifyMemo } from '../domain/tajweed.js';

import { actions, store } from '../core/state.js';
import { applyTheme } from '../core/theme.js';
import { closeModal, isModalOpen } from '../ui/modal.js';
import { buildHash } from '../core/router.js';

/* FIX (review v3.3 A2): the Settings text-size sliders dispatched
 * SETTINGS_UPDATE on every `input` tick, and the full #main innerHTML swap
 * destroyed the slider mid-drag — the thumb moved one step and the drag
 * died (pointer capture is bound to the destroyed element). The same swap
 * reset the daily-goal number field's caret to position 0, mangling
 * multi-digit entry. These settings reach the DOM either through the
 * <html>-level CSS custom properties that applyTheme() sets
 * (--font-scale / --arabic-font-scale) or through the input element the
 * person is actively editing — nothing else inside #main renders them. So
 * for these patches we apply the theme (subscriber, above) and SKIP the
 * view re-render: the control keeps its element, its drag, and its caret.
 * Every other settings change still re-renders normally. */
const SELF_RENDERED_SETTING_KEYS = new Set(['fontScale', 'arabicFontScale', 'dailyGoal']);

function isSelfRenderedSettingsUpdate(action) {
  if (!action || action.type !== 'SETTINGS_UPDATE' || !action.patch) return false;
  const keys = Object.keys(action.patch);
  return keys.length > 0 && keys.every((k) => SELF_RENDERED_SETTING_KEYS.has(k));
}

/**
 * Keep the ephemeral reader-window slice in sync with the volatile
 * signals before a QURAN render. Returns true when it dispatched (the
 * caller must re-read the state). Signals mirror views/quran.js exactly:
 * the raw activeParams.id key, the ?ay= param, and the reciting key —
 * data-gated on the loaded surah doc, so pre-load skeletons never arm
 * a window for a surah with no ayahs yet.
 */
function syncReaderWindow(state) {
  const number = state.activeParams?.id;
  if (number == null || number === '') return false;
  const surah = state.quran?.surahs?.[number];
  const total = surah?.ayahs?.length;
  if (!Number.isFinite(total) || total < 1) return false;
  const key = String(number);
  const ayParam = Number(state.activeParams?.ay) || null;
  const recitingKey = state.recitingAyahKey;
  const recitingAyah =
    recitingKey && recitingKey.startsWith(`${key}:`) ? Number(recitingKey.split(':')[1]) || 0 : 0;
  const next = computeReaderWindow(state.readerWindow, { key, ayParam, recitingAyah, total });
  if (!next) return false;
  store.dispatch(actions.setReaderWindow(next));
  return true;
}

/**
 * (v5.2.75, BUG-12) kids-scope reroute hash: when kids mode rewrites a
 * navigation, the requested view never renders — the caller replaces the
 * doomed browser entry with this hash so Back never burns entries with
 * no view change. Null when no reroute happened. Pure (exported for
 * tests); the window guard lives with the caller.
 */
export function kidsRerouteHash(action, state) {
  if (!action || action.type !== 'NAVIGATE') return null;
  if (state?.settings?.kidsMode !== true) return null;
  if (action.view === state.activeView) return null;
  return buildHash(state.activeView, state.activeParams);
}

/**
 * (v5.2.75, PERF-03) reset-path memo hygiene: bounded-but-never-cleared
 * caches drop on RESET_ALL / RESTORE_STATE. (The qur'an search index
 * already resets through the data-gone guard above.) Pure over the
 * action; exported for tests.
 */
export function resetEphemeralCaches(action) {
  if (action && (action.type === 'RESET_ALL' || action.type === 'RESTORE_STATE')) {
    clearClassifyMemo();
    clearScrollMemory();
  }
}

/**
 * (v5.2.73, BUG-02) reset every module-level fetch guard whose data is
 * gone (RESTORE_STATE / RESET_ALL wipe ephemeral slices while the flags
 * stay true — the next navigation would otherwise sit on an eternal
 * skeleton). Pure over rt + the qur'an search index; exported for tests.
 */
export function resetStaleFetchGuards(state) {
  if (!state.quran.meta) rt.quranMetaFetchStarted = false;
  if (!state.mushaf.meta) rt.mushafMetaFetchStarted = false;
  // FIX (review v3.26 F1): the roots browser's uncapped index, the
  // tafsir editions catalog, and the tajweed practice pool are all
  // ephemeral slices with module-level fetch guards — RESTORE_STATE /
  // RESET_ALL wipe the slices, but the flags used to stay true, leaving
  // those surfaces stuck on loading/partial until a full reload. Same
  // lesson as the quran/mushaf guards above: whenever the data is gone,
  // the guard is wrong — reset it so the next navigation refetches.
  if (!state.quranRootsFull) rt.quranRootsFullFetchStarted = false;
  if (!state.tafsirEditions) rt.tafsirEditionsFetchStarted = false;
  if (!state.tajweedPool) rt.tajweedPoolFetchStarted = false;
  // (v5.2.73, BUG-02) the three guards this block missed: the hadith
  // index (+ its cached book promises, which would resolve `true` without
  // ever re-dispatching the wiped documents), the small roots index, and
  // the qur'an full-text search corpus (rt latch + domain index + ready
  // flag — a stale "ready" with an empty corpus bricks search).
  if (!state.hadith.index) {
    rt.hadithIndexStarted = false;
    resetHadithBookFetches();
  }
  if (!state.quranRoots) rt.quranRootsFetchStarted = false;
  if (Object.keys(state.quran?.surahs || {}).length === 0) {
    rt.quranSearchBuildStarted = false;
    resetQuranIndex();
    setQuranIndexReady(false);
  }
  // (v5.2.77, BUG-05) drop in-flight per-surah/page/word/tafsir markers so
  // late resolves after a reset/restore cannot repopulate wiped slices.
  clearLazyInFlightFetches();
}

export function onStateChange(stateArg, action) {
  try {
    let state = stateArg;
    // FIX (walkthrough v3.4 W-1): a modal left open used to survive view
    // navigation — most reproducibly via the browser Back button / mobile
    // back-swipe with a card menu open: the hash changes, the view under
    // the overlay re-renders, and the stale menu (Copy/Share/Listen for a
    // card that is no longer on screen) stays trapped on top with focus
    // still inside it. Every modal belongs to the view that opened it, so
    // any NAVIGATE now closes whatever is open. All existing call sites
    // already closeModal() before go(); this is the safety net for the
    // navigation paths that bypass handlers (history, deep links).
    if (action && action.type === 'NAVIGATE' && isModalOpen()) closeModal();
    // The mobile "More" drawer belongs to its view too: Back-button and
    // deep-link navigations bypass tap handlers, so close it here (idempotent).
    if (action && action.type === 'NAVIGATE') closeNavDrawer();
    // (v4.2) a pending search debounce must not outlive its view: typing a
    // query then tapping a bottom-nav item within the 180ms window let the
    // timer fire AFTER navigation and yank the app back to SEARCH (or
    // mutate the params of the view just left, for the quran/roots
    // variants). Any real navigation invalidates all four debounce timers.
    if (action && action.type === 'NAVIGATE') {
      clearTimeout(rt.searchDebounceTimer);
      clearTimeout(rt.quranSearchDebounceTimer);
      clearTimeout(rt.rootsSearchTimer);
      clearTimeout(rt.hadithQueryTimer);
      // (v5.2.48) `#/settings/<slug>` deep links persist the open section
      // (Back/forward and reloads keep landing on it); unknown slugs are
      // ignored. Nested dispatch, same discipline as the reader-window
      // sync below — the follow-up render is a patch-engine no-op.
      if (action.view === VIEWS.SETTINGS) {
        const slug =
          action.params && typeof action.params === 'object'
            ? settingsSectionForSlug(action.params.id)
            : null;
        if (slug && store.getState().settings.settingsSection !== slug) {
          store.dispatch(actions.updateSettings({ settingsSection: slug }));
          state = store.getState();
        }
      }
      // (v5.2.75, BUG-12) kids-scope reroute leaves a doomed browser
      // entry: the requested view never renders, so every Back burns an
      // entry with no view change (and the topbar Back dead-ends once the
      // logical stack is exhausted). Replace it with the resolved view's
      // hash — Back then returns to the pre-tap page directly.
      if (typeof window !== 'undefined') {
        const rerouteHash = kidsRerouteHash(action, state);
        if (rerouteHash) {
          try {
            window.history.replaceState(window.history.state, '', rerouteHash);
          } catch {
            /* opaque origins — the entry stays, Back still steps through it */
          }
        }
      }
    }
    // (v4.4) entering TRUE fullscreen Mushaf arms the control-bar
    // auto-fade (and leaving disarms it — handled inside the reset fn).
    // (v4.5) the classic reader's immersive mode shares the same contract
    // (APP-FLOW §5): entering it arms the SAME timer for the glass bar.
    if (action && action.type === 'MUSHAF_FULLSCREEN_SET' && action.on === true) {
      armFsControlsAfterEnter();
    }
    if (action && action.type === 'READER_IMMERSIVE_SET' && action.on === true) {
      armFsControlsAfterEnter();
    }
    if (state.customContent !== rt.lastCustomContentRef) {
      rt.lastCustomContentRef = state.customContent;
      refreshLibraryIndex();
      state = store.getState();
    }
    // (v5.0.0) contentPrefs changes re-lens library.documents in the
    // reducer; the derived itemIndex/search index must follow, exactly
    // like the customContent watcher above.
    if (state.settings.contentPrefs !== rt.lastContentPrefsRef) {
      rt.lastContentPrefsRef = state.settings.contentPrefs;
      refreshLibraryIndex();
      state = store.getState();
    }
    // FIX (review v3.1 A1/B3): RESTORE_STATE / RESET_ALL wipe the ephemeral
    // quran/mushaf slices, but the lazy-fetch "started" guards below are
    // module-level and used to stay true — leaving the readers stuck on
    // "Loading…" for the rest of the session. Whenever the data is gone,
    // the guard is wrong: reset it so the next navigation refetches.
    resetStaleFetchGuards(state);
    // (v5.2.75, PERF-03) reset-path memo hygiene for the bounded caches.
    resetEphemeralCaches(action);
    // v3.15: translation edition changed through ANY path (settings picker,
    // backup restore, reset) → re-merge loaded surah docs once, and reset
    // the search-index latch so the index re-warms in the new language.
    if (
      rt.lastSeenTranslationEdition !== null &&
      state.settings.quranTranslation !== rt.lastSeenTranslationEdition
    ) {
      applyTranslationEdition(state.settings.quranTranslation);
    }
    rt.lastSeenTranslationEdition = state.settings.quranTranslation;
    applyTheme(state.settings);
    if (state.activeView === VIEWS.QURAN) ensureQuranData(state);
    // Kids tiles need the surah names — same lazy tier as the reader.
    if (state.activeView === VIEWS.KIDS) ensureQuranData(state);
    if (state.activeView === VIEWS.ROOTS) {
      ensureQuranRoots(state); // small precached index -> instant render
      ensureQuranRootsFull(state); // uncapped browser index -> upgrade
    }
    if (state.activeView === VIEWS.MUSHAF) {
      ensureMushafData(state); // (v4.4) also arms the translation-tray fetch when the tray pref is on
    }
    if (state.activeView === VIEWS.AUDIO) ensureRecitersData(state);
    if (state.activeView === VIEWS.AUDIO) maybeSyncVerseStatus(state);
    if (state.activeView === VIEWS.HADITH) ensureHadithData(state);
    if (state.activeView === VIEWS.OFFLINE) ensureOfflineQuota();
    updateCompassLifecycle(state);
    updateRamadanLifecycle(state);
    updateHomeTickerLifecycle(state);
    // (v5.2.0) ambient nightstand wake lock follows the route.
    updateAmbientWakeLifecycle(state);
    maybeMarkNudgeShown(state);
    maybeProbeStorage(state);
    // (v5.2.44) icon badge follows every state change, change-deduped
    // inside refreshAppBadge — prayer logs and dhikr counts move the
    // number; anything else is a cheap integer compare, no platform call.
    refreshAppBadge(() => store.getState());
    // (v5.2.67) lock-screen play/pause follows every state change, deduped
    // inside syncPlayingState — toggles, OS pauses, echo waits and session
    // ends all flow through the store, so no call site needs its own
    // platform update and the shade can never claim "playing" while paused.
    syncPlayingState(state);
    maybeStartQuranSearchBuild(state);
    maybeStartTafsirSearchBuild(state);
    maybeStartHadithSearchBuild(state);
    // v3.20: prayer settings changed through ANY path (bell toggles, location,
    // method, backup restore) → re-arm the next-24h trigger plan from the
    // fresh state. Fingerprint-checked inside, so identical plans don't
    // re-message the worker.
    if (rt.lastPrayerSettingsRef === null) rt.lastPrayerSettingsRef = state.settings.prayer;
    // (review v3.21): the trigger plan's titles/bodies are language-dependent
    // — a language switch must re-arm even though the settings object
    // reference is unchanged.
    else if (
      state.settings.prayer !== rt.lastPrayerSettingsRef ||
      state.settings.language !== rt.lastArmLang
    ) {
      rt.lastPrayerSettingsRef = state.settings.prayer;
      scheduleTriggerArm();
    }
    rt.lastArmLang = state.settings.language;
    // (v5.2.17) reader-window derivation (B12): the QURAN view reads the
    // ephemeral state.readerWindow slice purely, so the subscriber keeps
    // it in sync first — dispatch only on change (computeReaderWindow
    // returns null when the window stands), then re-read; the nested
    // notify already rendered the new window, so the outer render below
    // is a patch-engine no-op. Quiet recitation ticks cost a few integer
    // comparisons and no extra render.
    if (state.activeView === VIEWS.QURAN && syncReaderWindow(state)) state = store.getState();
    if (!isSelfRenderedSettingsUpdate(action)) render(state);
    // Reading timer follows navigation (entering/leaving the two readers
    // starts/stops the clock; same-view param changes never disturb it).
    syncReadingTimer(state, action);
    maybeScrollToFocusAyah(state);
    maybeScrollToFocusHadith(state);
    maybeFollowRecitation(state);
    maybeStartHifzFromParam(state);
  } catch (err) {
    renderErrorScreen(err);
  }
}
