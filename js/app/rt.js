/**
 * app/rt.js — the runtime context.
 *
 * Every piece of mutable, module-scope state that used to live as bare
 * `let` bindings inside the old 4,200-line app.js god-file. They were the
 * real coupling between sections (timers, fetch guards, one-shot latches,
 * pending-scroll bookkeeping), so they now live in one explicit, importable
 * object. Access stays O(1) and behavior is byte-identical — but the state
 * is now visible and greppable instead of hidden in closure scope.
 */

export const rt = {
  lastCustomContentRef: null,
  // (v5.0.0) contentPrefs ref watcher — the lens re-derivation counterpart
  // of lastCustomContentRef (see stateSub.js).
  lastContentPrefsRef: null,
  navDrawerOpener: null,
  // (v4.5.2, APP-FLOW I9) the LOGICAL back stack: the view keys a forward
  // navigation walked through. The topbar Back button renders while this
  // is non-empty and dispatches history.back() — the browser entry stack
  // and this stack stay in lockstep because every logical push rode on a
  // real history push. popstate-back pops it; replaceGo-style updates
  // (search typing) never touch it.
  navBackStack: [],
  editionSwitchRunning: null,
  editionSwitchTarget: null,
  lastSeenTranslationEdition: null,
  quranSearchBuildStarted: null,
  pendingAyahScroll: null,
  ayahScrollAttempts: null,
  hifzParamConsumed: null,
  hadithIndexStarted: null,
  hadithBookViewLastId: null,
  hadithDeepRef: null,
  hadithDailyStarted: null,
  pendingHadithScroll: null,
  hadithScrollAttempts: null,
  lastFollowedAyahKey: null,
  compassRunning: null,
  compassRAFHandle: null,
  smoothedHeading: null,
  headingSource: 'relative',
  batchCancelled: null,
  ramadanTickerHandle: null,
  homeTickerHandle: null,
  // (v4.2) rollover latches: dispatch the cheap re-render exactly once per
  // target/day change instead of in the final pre-boundary second.
  ramadanTickerTarget: null,
  homeTickerTarget: null,
  homeTickerDay: null,
  storageProbeStarted: null,
  quranMetaFetchStarted: null,
  mushafMetaFetchStarted: null,
  quranRootsFetchStarted: null,
  tafsirEditionsFetchStarted: null,
  quranRootsFullFetchStarted: null,
  tajweedPoolFetchStarted: null,
  practiceSession: null,
  swRegistration: null,
  lastTriggerFingerprint: '',
  lastTriggerArmTs: 0,
  lastPrayerSettingsRef: null,
  lastArmLang: '',
  triggerArmTimer: null,
  deferredInstallPrompt: null,
  searchDebounceTimer: null,
  quranSearchDebounceTimer: null,
  // (v4.2) bookmark-note edits in the ayah-study modal: debounced dispatch.
  bookmarkNoteTimer: null,
  audioSearchTimer: null,
  rootsSearchTimer: null,
  hadithQueryTimer: null,
  pendingAutoAdvanceTimer: null,
  pendingImportPayload: null,
};
