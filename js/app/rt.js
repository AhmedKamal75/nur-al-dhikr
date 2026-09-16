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
  // (v5.2.82, BUG-09) tafsir corpus build latch — declared here (was an
  // undeclared dynamic prop); doubles as the navigation-cancel switch.
  tafsirSearchBuildStarted: null,
  pendingAyahScroll: null,
  ayahScrollAttempts: null,
  hifzParamConsumed: null,
  hadithIndexStarted: null,
  hadithSearchFlight: null,
  lastHadithSearchDocs: '',
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
  // (v5.2.87) retry cooldown for the uncapped roots index: a failure
  // resets the started latch so Retry can work, but the subscriber calls
  // ensure* on EVERY notify — without a cooldown each keystroke during a
  // slow fetch outage fires another 15s attempt and another console error
  // (observed: ~10 errors inside one typing test). Epoch-ms before which
  // a failed full-index fetch must not be re-attempted.
  quranRootsFullCooldownUntil: 0,
  // (v5.2.87) same contract for the capped (~1MB) index: same per-notify
  // re-fire shape, same spam vector under load.
  quranRootsCooldownUntil: 0,
  // (v5.2.88) bulk-build abort controllers: the SEARCH-view corpus builds
  // fetch in 24-wide chunks, and the v5.2.82 latch only stops SCHEDULING
  // between chunks — an in-flight chunk keeps saturating connections +
  // the main thread after a same-document hash "navigation" (which never
  // unloads the page). Aborted on SEARCH exit so the new view's own
  // fetches release immediately; builds re-latch and resume on return.
  quranBulkAbort: null,
  tafsirBulkAbort: null,
  // (v5.2.88) previous-notify view for the bulk-abort exit hook: a
  // same-document hash "navigation" never unloads the page, so the
  // subscriber must notice SEARCH→else itself and abort in-flight chunks.
  bulkViewWasSearch: null,
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
  hadithGridSearchTimer: null,
  lastVerseStatusVoice: null,
  pendingAutoAdvanceTimer: null,
  pendingImportPayload: null,
  // (v5.2.29) family plan sharing: the sanitized plan awaiting confirm.
  pendingPlanPayload: null,
  // Long-press ayah quick actions: pending timer id, press anchor, and the
  // timestamp until which click dispatch stays suppressed (the release
  // after a long-press must not also trigger the underlying control).
  longPressTimer: null,
  longPressAnchor: null,
  suppressClickUntil: 0,
  // Kids-mode hold-to-exit pending timer (2s press, cancelled on release)
  // plus the progress-fill paint interval and the tap-counter that teaches
  // the hold after repeated plain taps.
  kidsExitTimer: null,
  kidsExitPaint: null,
  kidsExitTaps: null,
};
