# AGENT-MAP (full) — every file, every export, every action

GENERATED — do not hand-edit. Regenerate with `node scripts/agent-map.mjs` (plain node, no args).

This is the exhaustive dump. For the one-page version — chrome spine, where-to-change table, counted inventory — read `docs/AGENT-MAP.md` instead. This file is ~530 KB by design; it is meant to be searched for one named thing, not read end to end.

- js modules: 244 — data files: 27 — tests: 274

Conventions: `js/views/*.js` pure state→HTML templates; `js/domain/*.js` pure logic;
`js/app/**/*.js` wiring + handlers; `js/core/**` state/router/config/i18n/storage;
`js/ui/*.js` dumb chrome primitives; `js/services/*.js` side-effect owners.

## app

_wiring + event handlers: boot, render dispatch, delegation, feature runners._

### `js/app/audioEngine.js`

job: full-surah audio: reciter catalog, offline downloads (IndexedDB), and the single shared <audio> player.

- exports: `yieldFullSurahPlayer` (function), `VOICES` (const), `claimSpeaker` (function), `startAudioPlay` (function), `wirePlayer` (function), `PLAYER_IDLE_MS` (const), `syncPlayerIdleArmed` (function), `resetPlayerIdleTimer` (function), `SHORTCUT_SEEK_SEC` (const), `setAudioMuted` (function), `toggleAudioMute` (function), `wireAudioShortcuts` (function), `unwireAudioShortcutsForTests` (function), `ensureRecitersData` (function), `maybeSyncVerseStatus` (function), `maybeSyncBatchResume` (function), `downloadOne` (function), `updateCompassLifecycle` (function)
- emits: —
- handles: —
- i18n: `audio.fallbackVoice`, `audio.playFailed`, `common.retry`
- routes: `VIEWS.AUDIO`, `VIEWS.MUSHAF`, `VIEWS.QIBLA`, `VIEWS.QURAN`

### `js/app/autoFit.js`

job: (v5.4.0, P0-3 — ported from the v5.3.0 audit, replacing the v5.2.87 dispatch-based fit engine) the Mushaf fullscreen auto-fit engine.

- exports: `FIT_MIN` (const), `FIT_MAX` (const), `computeFitScale` (function), `refreshMushafFit` (function), `activateMushafAutoFit` (function), `deactivateMushafAutoFit` (function), `updateMushafAutoFitLifecycle` (function), `takeoverManualZoom` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.MUSHAF`

### `js/app/boot.js`

job: the composition root: hydrate the store, load the content libraries, wire every runtime subsystem, then hand control to the router and the renderer. One boot, one error boundary.

- exports: `boot` (function)
- emits: —
- handles: —
- i18n: `audio.reciteVerseFailed`, `audio.verseFallbackSurah`, `common.error`, `common.loading`, `kids.heardDone`, `share.received`, `storage.persistFailed`
- routes: `VIEWS.SEARCH`

### `js/app/compassRuntime.js`

job: Qibla compass lifecycle: sensor permission, smoothing, declination correction, per-frame DOM patching.

- exports: `handleCompassHeading` (function), `startCompassIfNeeded` (function), `stopCompass` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.QIBLA`

### `js/app/drawer.js`

job: the mobile "More" drawer: open/close with focus management and Tab containment.

- exports: `openNavDrawer` (function), `closeNavDrawer` (function), `renderErrorScreen` (function), `wipeAppDataForReset` (function)
- emits: `nav-drawer-close`
- handles: —
- i18n: `error.screen.body`, `error.screen.reload`, `error.screen.reset`, `error.screen.title`
- routes: —

### `js/app/events.js`

job: (no header comment)

- exports: `handlerMaps` (const), `mergedClickHandlers` (const), `changeRegistry` (const), `inputRegistry` (const), `matchRegistry` (re-export), `dispatchRegistry` (function), `openParentGate` (function), `bindGlobalEvents` (function)
- emits: `kids-exit-hold`, `kids-gate-answer`, `modal-close`, `practice-tap`, `word-tap`
- handles: `counter-tap` (events.js special), `kids-exit-hold` (events.js special), `modal-close-overlay` (events.js special)
- i18n: `common.cancel`, `common.error`, `kids.exitHow`, `kids.gateHint`, `kids.gateTitle`
- routes: `VIEWS.MUSHAF`, `VIEWS.QURAN`

### `js/app/fileImports.js`

job: user file imports: backup JSON (with confirm), shared family plans (with confirm), and custom Adhan audio (magic-byte validated).

- exports: `backupErrorText` (function), `handleAdhanImport` (function), `handleImportFile` (function), `handleImportPlanFile` (function)
- emits: —
- handles: —
- i18n: `backup.importConfirm`, `common.error`, `kids.blocked`, `plan.badFile`, `plan.importConfirm`, `prayer.adhanImportFailed`, `prayer.adhanImported`, `prayer.adhanInvalid`
- routes: —

### `js/app/focusRuntime.js`

job: Focus-mode runtime: keyboard navigation and the single pending auto-advance timer (v3.7 race fix).

- exports: `handleFocusKeydown` (function), `isAutoAdvancePendingFor` (function), `navigateFocusAdjacent` (function), `scheduleAutoAdvance` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.CATEGORY`, `VIEWS.FOCUS`

### `js/app/forms.js`

job: (empty header comment)

- exports: `reminderFormHTML` (function), `manualLocationFormHTML` (function), `locationPermissionGuidanceHTML` (function), `formHandlers` (object), `handlePromptForm` (function)
- emits: `modal-close`, `prayer-manual-location`
- handles: `form:audio-custom-reciter`, `form:calendar-note`, `form:category`, `form:hadith-jump`, `form:hadith-note`, `form:item`, `form:khatma-plan`, `form:library`, `form:mushaf-jump-page`, `form:prayer-location`, `form:quran-range`, `form:reminder`, `form:sadaqah-entry`, `form:schedule`
- i18n: `audio.customChecking`, `audio.customNotAudio`, `calendar.untilDate`, `common.close`, `common.done`, `common.error`, `editor.cancel`, `editor.categoryNotFound`, `editor.fieldTitleEn`, `editor.save`, `editor.saved`, `editor.savedWithWarning`, `editor.validationError`, `hadith.jumpInvalid`, `hadith.jumpOutOfRange`, `khatma.needOne`, `khatma.planSaved`, `mushaf.jumpInvalid`, `playlist.created`, `prayer.chooseCityPlaceholder` (+20 more)
- routes: `VIEWS.COLLECTION`, `VIEWS.HADITH`, `VIEWS.MUSHAF`

### `js/app/fullscreen.js`

job: (v4.4) Side-effect owner for TRUE fullscreen Mushaf reading. Three browser capabilities are wrapped here, each strictly best-effort (the CSS full-bleed layout is the source of truth and needs none of

- exports: `resetFsControlsIdleTimer` (function), `armFsControlsAfterEnter` (function), `requestMushafNativeFullscreen` (function), `releaseMushafNativeFullscreen` (function), `reacquireWakeLockIfFullscreen` (function), `updateAmbientWakeLifecycle` (function), `initFullscreenSync` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.AMBIENT`, `VIEWS.MUSHAF`, `VIEWS.QURAN`

### `js/app/hadithData.js`

job: the Ahadeeth library data layer: index warm-up, per-book lazy loading with retry state, deep links, daily pick.

- exports: `resetHadithBookFetches` (function), `routeWorkerReply` (function), `ensureHadithIndex` (function), `ensureHadithBook` (function), `ensureHadithData` (function), `warmHadithDaily` (function), `maybeScrollToFocusHadith` (function), `scrollToHadithListTop` (function), `ensureHadithSearchIndex` (function), `maybeStartHadithSearchBuild` (function), `isHadithIndexAllConfirmed` (function), `confirmHadithIndexAll` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.HADITH`

### `js/app/inputs.js`

job: data-bind routing for debounced search navigation, Zakat live inputs with caret salvage, and font-scale sliders.

- exports: `playFlipSound` (function), `debounceSearchNavigate` (const), `debounceRootsSearchNavigate` (const), `debounceQuranSearchNavigate` (const), `debounceTajweedCourseSearchNavigate` (const), `debounceFavoritesSearchNavigate` (function), `debounceSettingsSearchNavigate` (const), `debounceCollectionSearchNavigate` (function), `debounceJournalSearchNavigate` (function), `debounceHadithQuery` (function), `debounceHadithGridQuery` (function), `clampSliderNum` (function), `refocusZakatInput` (function), `handleZakatInput` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.COLLECTION`, `VIEWS.FAVORITES`, `VIEWS.HADITH`, `VIEWS.JOURNAL`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`, `VIEWS.SETTINGS`, `VIEWS.TAJWEED_COURSE`

### `js/app/installPrompt.js`

job: the PWA install flow (beforeinstallprompt can be consumed exactly once; the store carries only the reactive flags).

- exports: `wireInstallPrompt` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/lazyData.js`

job: (no header comment)

- exports: `ensureMushafNavigationPages` (function), `ensureMushafMeta` (function), `ensureQuranMeta` (function), `ensureQuranData` (function), `ensureMushafData` (function), `clearLazyInFlightFetches` (function), `invalidateLazyFetches` (function), `ensureWordDict` (function), `ensureRootsMeaning` (function), `ensureMushafSurahDocs` (function), `ensureQuranWordsData` (function), `ensureQuranRoots` (function), `ensureQuranRootsFull` (function), `ensureTafsirEditions` (function), `ensureTajweedPool` (function), `ensureTafsirText` (function), `currentAyahDetailPage` (function), `openAyahStudy` (function)
- emits: —
- handles: —
- i18n: `khatma.completeToast`, `quran.loadFailed`
- routes: —

### `js/app/net.js`

job: the app's data-fetch layer. Extracted from boot.js in v4.1: boot is the composition root AND (as the old home of fetchJSON) was imported by six runtime modules — lazyData,

- exports: `FETCH_TIMEOUT_MS` (re-export), `fetchWithTimeout` (re-export), `fetchJSON` (function), `isMissingResourceError` (function), `isTimeoutError` (function), `isBulkAbortError` (function), `fetchDataResponse` (function), `failedLibraryIds` (const), `resetFailedLibrariesForTests` (function), `buildItemIndex` (function), `loadLibraries` (function), `retryLibraryLoad` (function), `refreshLibraryIndex` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/offlineJobs.js`

job: offline-library batch downloads (v5.3.0). One tap warms the service worker's data cache for every on-demand corpus: each URL goes through fetchJSON (validating, SW-cached) and

- exports: `ESSENTIAL_GROUPS_TEST` (const), `ESSENTIALS_DEFER_MS` (const), `essentialsAutoBlocker` (function), `maybeAutoDownloadEssentials` (function), `checkOfflineRoom` (function), `stopOfflineBatch` (function), `clearTextCache` (function), `clearStudyData` (function), `ensureOfflineQuota` (function), `runOfflineBatch` (function)
- emits: —
- handles: —
- i18n: `offline.lowStorage`, `offline.needOnline`, `offline.started`
- routes: —

### `js/app/palette.js`

job: command-palette wiring (Spotlight-style overlay). App-layer half of views/palette.js: opens the modal, feeds providers from the store/modules, live-updates on input, drives ↑↓/Enter

- exports: `updatePalette` (function), `openPalette` (function), `armPaletteShortcut` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/practice.js`

job: the Tajweed drill-mode session engine (pure scoring lives in domain/tajweedPractice.js; this is the mutable session). (v5.4.0, P0-5b — ported from the v5.3.0 audit) A round is FIVE

- exports: `renderPracticeRound` (function), `renderPracticeSummary` (function), `startClassifyRound` (function), `answerClassify` (function), `advanceClassifyRound` (function), `renderClassifyRound` (function), `startPracticeRound` (function), `advancePracticeRound` (function), `openPracticePicker` (function)
- emits: —
- handles: —
- i18n: `common.retry`, `practice.loadFailed`, `practice.nothingToReview`
- routes: —

### `js/app/quizDeck.js`

job: quiz deck building. Randomness lives here (the call site), not in the reducer, so QUIZ_START stays deterministic. (v5.2.75, UP-10) generalized beyond the 99 Names: any loaded library

- exports: `shuffled` (function), `buildQuizDeck` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/quranData.js`

job: Qur'an surah document loading with translation edition overlays (single-flight switching, per-edition caching).

- exports: `clearQuranDataFetches` (function), `translationBMap` (re-export), `ensureTranslationBDoc` (function), `ensureTranslationCDoc` (function), `fetchTranslationOverlay` (function), `loadSurahDoc` (function), `dispatchSurahDoc` (function), `runEditionSwitch` (function), `applyTranslationEdition` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/quranSearch.js`

job: the full-text Qur'an search corpus: lazy index build over all 6,236 ayahs, once per translation edition.

- exports: `ensureQuranSearchData` (function), `maybeScrollToFocusAyah` (function), `maybeStartHifzFromParam` (function), `maybeStartQuranSearchBuild` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.MUTASHABIHAT`, `VIEWS.QURAN`, `VIEWS.SEARCH`

### `js/app/readingTimer.js`

job: the reading session timer. While the person sits in the Qur'an or Mushaf readers, wall-clock seconds accumulate into today's statistics entry (dailyHistory[key].readingSec), shown on the Statistics

- exports: `isReadingView` (function), `elapsedSeconds` (function), `flushReading` (function), `syncReadingTimer` (function), `_readingSinceForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.MUSHAF`, `VIEWS.QURAN`

### `js/app/recitationFollow.js`

job: (no header comment)

- exports: `maybeFollowRecitation` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.MUSHAF`, `VIEWS.QURAN`

### `js/app/renderer.js`

job: Treats state as read-only input and produces DOM output. Two render tiers: 1. Shell (topbar + nav) — re-rendered only when settings/activeView change in a way that affects it (cheap either way, but k…

- exports: `LAZY_VIEW_KEYS` (const), `resetLazyViewsForTests` (function), `clearScrollMemory` (function), `readScrollTop` (function), `writeScrollTop` (function), `viewKeyOf` (function), `VIEW_ENTER_MS` (const), `shouldMarkViewEnter` (function), `mountShell` (function), `QURAN_CSS_ROUTES` (const), `ROUTE_CSS` (const), `ensureQuranCss` (function), `nodeKey` (function), `matchChildren` (function), `structuralKey` (function), `matchChildrenDeep` (function), `focusSignature` (function), `patchHTML` (function), `settingsSectionScrollTarget` (function), `render` (function)
- emits: — (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `a11y.fileImports`, `audio.player`, `common.skipToContent`, `common.unknownRoute`, `title.home`
- routes: `VIEWS.ABOUT`, `VIEWS.AMBIENT`, `VIEWS.AUDIO`, `VIEWS.CALENDAR`, `VIEWS.CATEGORY`, `VIEWS.CERTIFICATE`, `VIEWS.CHECKLIST`, `VIEWS.COLLECTION`, `VIEWS.COLLECTIONS`, `VIEWS.EDITOR`, `VIEWS.FAVORITES`, `VIEWS.FOCUS`, `VIEWS.GARDEN`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.JOURNAL`, `VIEWS.KIDS`, `VIEWS.LIBRARY`, `VIEWS.MOOD`, `VIEWS.MUSHAF`, `VIEWS.MUTASHABIHAT`, `VIEWS.OFFLINE`, `VIEWS.PRAYER`, `VIEWS.QIBLA`, `VIEWS.QUIZ`, `VIEWS.QURAN`, `VIEWS.RAMADAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`, `VIEWS.SETTINGS`, `VIEWS.STATISTICS`, `VIEWS.TAJWEED_COURSE`, `VIEWS.TASBIH`, `VIEWS.ZAKAT`

### `js/app/rt.js`

job: the runtime context. Every piece of mutable, module-scope state that used to live as bare let bindings inside the old 4,200-line app.js god-file. They were the

- exports: `rt` (object)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/app/shared.js`

job: shared lookups used across handler modules.

- exports: `getItemEntry` (function), `itemClipboardText` (function)
- emits: —
- handles: —
- i18n: `content.reviewPending`
- routes: —

### `js/app/stateSub.js`

job: the store's single subscriber. Every state change flows through here: theme application, lazy-data triggers, lifecycles (ticker/compass), guard resets, and the view re-render itself.

- exports: `kidsRerouteHash` (function), `resetEphemeralCaches` (function), `resetStaleFetchGuards` (function), `onStateChange` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.AUDIO`, `VIEWS.CERTIFICATE`, `VIEWS.HADITH`, `VIEWS.KIDS`, `VIEWS.MUSHAF`, `VIEWS.MUTASHABIHAT`, `VIEWS.OFFLINE`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`, `VIEWS.SETTINGS`, `VIEWS.STATISTICS`

### `js/app/tafsirSearch.js`

job: full-text search corpus for one bundled tafsir edition: lazy index build over all 114 surah files, once per edition. Mirrors the Quran-search build (chunked fetch, single bulk dispatch,

- exports: `resolveTafsirSearchEdition` (function), `ensureTafsirSearchData` (function), `maybeStartTafsirSearchBuild` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.SEARCH`

### `js/app/tickers.js`

job: the live tickers (next-prayer + Ramadan countdowns), nudge shown-marking, and the one-shot storage estimate probe.

- exports: `ramadanTick` (function), `updateRamadanLifecycle` (function), `homeTick` (function), `updateHomeTickerLifecycle` (function), `prayerTick` (function), `ambientTick` (function), `updatePrayerTickerLifecycle` (function), `updateAmbientTickerLifecycle` (function), `maybeMarkNudgeShown` (function), `maybeProbeStorage` (function)
- emits: —
- handles: —
- i18n: `prayer.`, `prayer.in`, `units.h`, `units.m`
- routes: `VIEWS.AMBIENT`, `VIEWS.HOME`, `VIEWS.PRAYER`, `VIEWS.RAMADAN`, `VIEWS.SETTINGS`

### `js/app/triggers.js`

job: prayer-alert reliability: computes the next 24h of adhan alerts and arms them with the service worker (TimestampTriggers where supported, periodicsync catch-up otherwise).

- exports: `TRIGGER_ARM_THROTTLE_MS` (const), `scheduleTriggerArm` (function), `sendTriggerPlan` (function), `armPrayerTriggers` (function), `registerServiceWorker` (function)
- emits: —
- handles: —
- i18n: `common.retry`, `sw.precacheFailed`, `update.available`, `update.refresh`
- routes: —

### `js/app.js`

job: the application entry point. Since v4.0 this file is intentionally tiny: the composition root lives in app/boot.js, the delegated event system in app/events.js, and every

- exports: —
- emits: —
- handles: —
- i18n: —
- routes: —

## app/handlers

_feature-scoped click-handler maps merged by app/events.js._

### `js/app/handlers/audio.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `changeHandlers` (const), `inputHandlers` (const), `resolveRangeSave` (function)
- emits: —
- handles: `audio-batch-dismiss`, `audio-batch-stop`, `audio-delete-moshaf`, `audio-delete-surah`, `audio-download-all`, `audio-download-surah`, `audio-mute-toggle`, `audio-pick-moshaf`, `audio-play-moshaf`, `audio-remove-custom`, `audio-select-moshaf`, `player-close`, `player-min-toggle`, `player-next`, `player-prev`, `player-rate`, `player-repeat`, `player-seek-back`, `player-seek-fwd`, `player-sleep-cycle`, `player-toggle`, `playlist-create`, `playlist-delete`, `playlist-delete-confirmed`, `playlist-move-item`, `playlist-play`, `playlist-remove-item`, `playlist-rename`, `playlist-save-range`, `quran-play-surah`, `verse-pack-delete`, `verse-pack-download`
- i18n: `audio.allDone`, `audio.batchCancelled`, `audio.batchDone`, `audio.batchDoneSkipped`, `audio.batchStarted`, `audio.deleted`, `audio.downloadDone`, `audio.downloadFailed`, `audio.downloading`, `audio.echoNeedsRepeat`, `audio.evictedWarning`, `audio.loopNeedsSession`, `audio.quota`, `audio.reciteStartFailed`, `audio.sleepArmed`, `audio.sleepOff`, `audio.surahUnavailable`, `audio.versePackDone`, `playlist.addedRange`, `playlist.createTitle` (+6 more)
- routes: `VIEWS.AUDIO`

### `js/app/handlers/content.js`

job: The four-level content-authority actions. Everything dispatches through the contentPrefs lens (services/contentPrefs.js) — the bundled libraries never change, so every level's "Restore defaults" is j…

- exports: `clickHandlers` (object), `changeHandlers` (const)
- emits: `content-set-target`
- handles: `category-top`, `confirm-content-delete-category`, `confirm-content-delete-custom-library`, `confirm-content-delete-item`, `confirm-content-delete-library`, `confirm-content-restore-all`, `confirm-content-restore-category`, `confirm-content-restore-library`, `confirm-hadith-delete-book`, `confirm-hadith-restore-all`, `content-delete-category`, `content-delete-item`, `content-delete-library`, `content-duplicate-item`, `content-edit-category`, `content-edit-item`, `content-edit-library`, `content-field-reset`, `content-field-toggle`, `content-field-toggle-global`, `content-hide-category`, `content-hide-item`, `content-hide-library`, `content-manage-toggle`, `content-move-category`, `content-move-item`, `content-move-library`, `content-new-category`, `content-new-item`, `content-reset-category`, `content-restore-all`, `content-restore-category`, `content-restore-item`, `content-restore-library`, `content-schedule`, `content-target-step`, `content-unhide-category`, `content-unhide-item`, `content-unhide-library`, `hadith-book-move`, `hadith-delete-book`, `hadith-hide-book`, `hadith-hide-item`, `hadith-restore-all`, `hadith-restore-book`, `hadith-unhide-book`, `hadith-unhide-item`, `library-jump`, `schedule-delete`, `schedule-toggle`, `content-set-target` (change/input)
- i18n: `content.allRestored`, `content.deleteItemConfirm`, `content.deleteLibraryConfirm`, `content.deleteSectionConfirm`, `content.itemDeleted`, `content.itemRestored`, `content.libraryDeleted`, `content.libraryRestored`, `content.restoreAllConfirm`, `content.restoreLibraryConfirm`, `content.restoreSectionConfirm`, `content.sectionDeleted`, `content.sectionRestored`, `editor.deleteConfirm`, `editor.duplicated`, `hadith.restoreAllConfirm`, `nav.hadith`, `schedule.removed`
- routes: `VIEWS.CATEGORY`, `VIEWS.HADITH`, `VIEWS.LIBRARY`

### `js/app/handlers/editor.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object)
- emits: —
- handles: `confirm-delete-category`, `confirm-delete-item`, `editor-delete-category`, `editor-delete-item`, `editor-duplicate-item`, `editor-edit-item`, `editor-new-category`, `editor-new-item`, `editor-new-library`, `modal-close`
- i18n: `editor.deleteConfirm`
- routes: —

### `js/app/handlers/grammar.js`

job: feature-scoped controller module for the grammar-flashcard drill (see domain/grammarDrill.js). Each export is a partial click-handler map merged by app/events.js.

- exports: `clickHandlers` (object)
- emits: —
- handles: `grammar-exit`, `grammar-grade`, `grammar-restart`, `grammar-reveal`, `grammar-start`
- i18n: `grammar.empty`, `grammar.loading`
- routes: —

### `js/app/handlers/hifz.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object)
- emits: —
- handles: `hifz-ayah-mark`, `hifz-level`, `hifz-mark`, `hifz-mcq-new`, `hifz-mcq-pick`, `hifz-rehide`, `hifz-reveal`, `hifz-review`, `hifz-test`, `hifz-toggle`
- i18n: —
- routes: —

### `js/app/handlers/items.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `triggerRipple` (function), `shareAyahCard` (function), `clickHandlers` (object), `changeHandlers` (const)
- emits: `collection-picker-toggle`, `counter-tap`, `hadith-note-delete`, `modal-close`
- handles: `ambient-mode`, `ayah-share`, `byheart-exit`, `byheart-reveal`, `byheart-review`, `byheart-start`, `clear-search-history`, `collection-add-favorites`, `collection-move`, `confirm-delete-collection`, `confirm-unfavorite-all`, `copy-ayah`, `copy-item`, `counter-tap`, `create-collection`, `create-collection-inline`, `create-collection-inline-move`, `create-collection-suggested`, `delete-collection`, `favorites-sort`, `focus-exit`, `focus-reset`, `hadith-bookmark`, `hadith-copy`, `hadith-daily-shuffle`, `hadith-grid-next`, `hadith-grid-prev`, `hadith-index-all`, `hadith-mem-reveal`, `hadith-mem-review`, `hadith-memorize`, `hadith-note-delete`, `hadith-note-open`, `hadith-page-next`, `hadith-page-prev`, `hadith-retry`, `hadith-retry-index`, `hadith-section`, `hadith-share`, `hadith-speak`, `kids-quiz-answer`, `kids-quiz-exit`, `kids-quiz-start`, `move-to-collection`, `open-card-menu`, `open-collection-picker`, `open-focus`, `open-move-picker`, `play-dhikr-audio`, `rename-collection`, `run-search`, `search-page`, `session-start`, `share-collection`, `share-item`, `toggle-favorite`, `toggle-speech`, `unfavorite-all`, `collection-picker-toggle` (change/input)
- i18n: `card.copied`, `card.copyFailed`, `card.imageSaved`, `collections.itemCount`, `collections.namePrompt`, `collections.shareEmpty`, `common.delete`, `common.error`, `common.retry`, `common.save`, `dhikrAudio.failed`, `editor.cancel`, `editor.deleteConfirm`, `favorites.clearConfirm`, `hadith.note`, `hadith.noteDeleted`, `hadith.notePh`, `hadith.noteTitle`, `hadith.speechUnsupported`, `kids.quizWin` (+1 more)
- routes: `#/hadith`, `VIEWS.CATEGORY`, `VIEWS.COLLECTION`, `VIEWS.COLLECTIONS`, `VIEWS.FAVORITES`, `VIEWS.FOCUS`, `VIEWS.HADITH`, `VIEWS.SEARCH`

### `js/app/handlers/journal.js`

job: Feature-scoped controller module for the private journal (duas + weekly reflections), the printable memorization certificate, and the mutashabihat (look-alike ayat) drill. Pure (dataset) functions me…

- exports: `clickHandlers` (object)
- emits: —
- handles: `certificate-print`, `dua-edit-save`, `dua-remove`, `dua-save`, `dua-toggle-answered`, `journal-edit-cancel`, `journal-edit-open`, `journal-export`, `journal-page`, `mutashabihat-next`, `mutashabihat-pick`, `mutashabihat-pool`, `reflection-edit-save`, `reflection-remove`, `reflection-save`
- i18n: `journal.duaEmptyInput`, `journal.duaSaved`, `journal.exportEmpty`, `journal.reflectionEmptyInput`, `journal.reflectionSaved`
- routes: `VIEWS.JOURNAL`

### `js/app/handlers/location.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `changeHandlers` (const)
- emits: —
- handles: `prayer-manual-location`, `prayer-request-location`, `prayer-use-city`, `qibla-enable-compass`
- i18n: `prayer.locationSet`, `prayer.locationUnavailable`, `qibla.permissionDenied`
- routes: —

### `js/app/handlers/navigation.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `inputHandlers` (const)
- emits: —
- handles: `go-back`, `nav-drawer-close`, `nav-drawer-go`, `nav-toggle`, `navigate`, `open-palette`, `quick-language-toggle`, `quick-theme-toggle`, `quick-tile`
- i18n: `kids.blocked`
- routes: `VIEWS.KIDS`, `VIEWS.SEARCH`

### `js/app/handlers/offline.js`

job: offline-library controls (v5.3.0). Thin click handlers over app/offlineJobs.js; progress + completion live in the store so the view renders reactively.

- exports: `clickHandlers` (object), `changeHandlers` (const)
- emits: `offline-toggle-compressed`, `offline-toggle-essentials-auto`
- handles: `offline-clear-study`, `offline-download-all`, `offline-download-group`, `offline-stop`, `offline-toggle-compressed` (change/input), `offline-toggle-essentials-auto` (change/input)
- i18n: `offline.clearStudyDone`, `offline.essentialsAlready`, `offline.essentialsOff`
- routes: —

### `js/app/handlers/quiz.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object)
- emits: —
- handles: `quiz-answer`, `quiz-direction`, `quiz-exit-link`, `quiz-library`, `quiz-next`, `quiz-practice-weak`, `quiz-review-mistakes`, `quiz-size`, `quiz-start`
- i18n: `quiz.unavailable`
- routes: `VIEWS.LIBRARY`, `VIEWS.QUIZ`

### `js/app/handlers/quran.js`

job: (no header comment)

- exports: `applyTajweedColors` (function), `navigateMushafPage` (function), `clickHandlers` (object), `changeHandlers` (const), `inputHandlers` (const)
- emits: `tajweed-course-mode`, `word-bookmark`
- handles: `khatma-clear-plan`, `khatma-open-plan`, `mushaf-ayah-tap`, `mushaf-copy-ayah`, `mushaf-find-page-result`, `mushaf-jump-page`, `mushaf-more`, `mushaf-next`, `mushaf-open-at-surah`, `mushaf-open-bookmarks`, `mushaf-open-in-study`, `mushaf-open-jump`, `mushaf-open-page-find`, `mushaf-open-settings`, `mushaf-open-track`, `mushaf-play-pick`, `mushaf-prev`, `mushaf-remove-bookmark`, `mushaf-reset-progress`, `mushaf-set-bismillah`, `mushaf-set-font`, `mushaf-set-paper`, `mushaf-set-tafsir`, `mushaf-toggle-bookmark`, `mushaf-toggle-fullscreen`, `play-ayah`, `practice-check`, `practice-classify`, `practice-classify-next`, `practice-lesson`, `practice-mode`, `practice-next`, `practice-open`, `practice-review`, `practice-start`, `practice-tap`, `practice-this-ayah`, `quran-toggle-immersive`, `quran-window-expand`, `root-jump`, `roots-expand`, `roots-jump`, `roots-open`, `roots-page`, `roots-tab`, `study-tray-close`, `study-tray-toggle`, `study-tray-word`, `tafsir-compare`, `tafsir-compare-download`, `tafsir-download`, `tafsir-open`, `tafsir-tab`, `tajweed-course-drill`, `tajweed-course-drill-rule`, `tajweed-course-toggle-done`, `tajweed-open-settings`, `tajweed-reset`, `tajweed-set-color`, `tajweed-toggle-rule`, `word-bookmark`, `word-bookmark-open`, `word-bookmark-remove`, `word-bookmarks-open`, `word-copy`, `word-share`, `word-speak`, `word-study-from-tray`, `word-tap`, `tajweed-course-mode` (change/input)
- i18n: `card.copied`, `card.copyFailed`, `common.error`, `khatma.planCleared`, `mushaf.khatmaResetDone`, `mushaf.loadFailed`, `practice.nearestAyah`, `practice.nothingHere`, `tajweed.resetDone`, `wordStudy.savedWordRemoved`, `wordStudy.soundOff`, `wordStudy.speechUnsupported`, `wordStudy.title`
- routes: `VIEWS.MUSHAF`, `VIEWS.QURAN`, `VIEWS.ROOTS`

### `js/app/handlers/quranAudio.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `startVerseSurah` (function), `echoPauseOptions` (function), `clickHandlers` (object), `buildReciterPick` (function), `changeHandlers` (const), `inputHandlers` (const)
- emits: `modal-close`, `navigate`, `playlist-save-range`, `recite-pick-moshaf`, `recite-voice-b`, `set-setting`
- handles: `quran-range-open`, `recite-ayah-next`, `recite-ayah-prev`, `recite-compare-swap`, `recite-compare-toggle`, `recite-echo-toggle`, `recite-follow-toggle`, `recite-listen-toggle`, `recite-loop-toggle`, `recite-mode-ayah`, `recite-mode-surah`, `recite-more-toggle`, `recite-pause-toggle`, `recite-pick-moshaf`, `recite-repeat-toggle`, `recite-sleep-cycle`, `recite-speed-cycle`, `recite-stop`, `recite-voice-b`, `recite-voice-open`, `surah-play`
- i18n: `audio.browseAllMoshafs`, `audio.chooseReciter`, `audio.compareNeedB`, `audio.echoNeedsRepeat`, `audio.echoPause`, `audio.echoPauseHint`, `audio.echoPauseOpt`, `audio.fileModeNote`, `audio.fileVoices`, `audio.loopOnce`, `audio.moshafShown`, `audio.noSecondVoice`, `audio.rangeFrom`, `audio.rangeLoop`, `audio.rangePlay`, `audio.rangeTitle`, `audio.rangeTo`, `audio.rangeToSurah`, `audio.reciteStartFailed`, `audio.searchPh` (+12 more)
- routes: `#/audio`, `view:audio`

### `js/app/handlers/system.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `changeHandlers` (const), `inputHandlers` (const)
- emits: `home-panel-toggle`, `quick-tile-toggle`, `toggle-elder-mode`, `toggle-kids-mode`, `toggle-mushaf-pref`, `toggle-reminder`, `toggle-setting`
- handles: `add-preset`, `add-reminder`, `backup-link-file`, `confirm-reset-all`, `delete-reminder`, `delete-reminder-confirmed`, `export-backup`, `export-plan`, `home-panel-move`, `import-backup`, `import-backup-confirmed`, `import-plan`, `import-plan-confirmed`, `kids-exit`, `kids-gate-answer`, `profile-create`, `profile-delete`, `profile-delete-confirmed`, `profile-switch`, `quick-tile-move`, `reset-all-data`, `restore-auto-backup`, `retry-load`, `set-setting`, `toggle-dailyverse-reminder`, `toggle-jumuah-reminder`, `toggle-zakatfitr-reminder`, `verify-backup`, `home-panel-toggle` (change/input), `quick-tile-toggle` (change/input), `toggle-elder-mode` (change/input), `toggle-kids-mode` (change/input), `toggle-mushaf-pref` (change/input), `toggle-reminder` (change/input), `toggle-setting` (change/input)
- i18n: `audio.voiceModeAyah`, `backup.importConfirm`, `backup.importDone`, `kids.exitDone`, `kids.gateWrong`, `plan.exported`, `plan.importDone`, `preset.added`, `preset.dailyVerseBody`, `preset.dailyVerseLabel`, `preset.exists`, `preset.jumuahBody`, `preset.jumuahTitle`, `reminder.deleteConfirm`, `settings.backupExported`, `settings.backupFileSaved`, `settings.profileDeleteActive`, `settings.profileDeleteConfirm`, `settings.profileDeleted`, `settings.profileNamePh` (+3 more)
- routes: `VIEWS.HOME`, `VIEWS.KIDS`

### `js/app/handlers/tasbih.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object)
- emits: —
- handles: `tasbih-custom-remove`, `tasbih-custom-save`, `tasbih-float`, `tasbih-reset`, `tasbih-select`, `tasbih-tap`, `tasbih-target-set`, `tasbih-target-step`
- i18n: `nav.tasbih`, `tasbih.customAdded`, `tasbih.customEmpty`
- routes: —

### `js/app/handlers/viewMenus.js`

job: The per-view "⋯" menus: one 'view-menu' entry point that opens the right sheet for the current tab, plus the handful of sheet behaviors that had no handler of their own (opening the Prayer sub-panels…

- exports: `clickHandlers` (object)
- emits: —
- handles: `checklist-reset-day`, `garden-how-it-works`, `hadith-copy-book`, `library-field-toggles`, `library-sheet-reset-hidden`, `prayer-export-ics`, `prayer-month-ics`, `prayer-month-nav`, `prayer-month-open`, `prayer-month-print`, `prayer-open-adhan`, `prayer-open-calc`, `prayer-open-location`, `prayer-open-qada`, `prayer-open-sunnah`, `schedule-open-manager`, `statistics-export-csv`, `statistics-share-csv`, `statistics-share-week`, `view-menu`, `view-sheet-manage`, `view-toggle-traveler`
- i18n: `card.copied`, `card.copyFailed`, `checklist.sheet.resetDone`, `hadith.bookLinkCopied`, `library.sheet.resetHiddenDone`, `prayer.exportedIcs`, `prayer.locationNeeded`, `stats.activeDays`, `stats.currentStreak`, `stats.exportEmpty`, `stats.exportedCsv`, `stats.readingToday`, `stats.shareTitle`, `stats.totalRecitations`
- routes: `#/hadith`

### `js/app/handlers/worship.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `changeHandlers` (const)
- emits: `checklist-toggle`, `sunnah-toggle`, `toggle-prayer-quiet`, `toggle-prayer-quiet-cancel`
- handles: `calendar-delete-note`, `calendar-edit-note`, `calendar-goto-fasting`, `calendar-new-note`, `calendar-open-day`, `fasting-cycle-remind-time`, `fasting-toggle-category`, `fasting-toggle-remind`, `gap-telemetry-clear`, `home-invite-dismiss`, `install-later`, `install-reoffer`, `khatma-ramadan-preset`, `location-profile-apply`, `location-profile-remove`, `location-profile-save`, `notifications-enable`, `nudge-dismiss`, `onboarding-comfort`, `onboarding-confirm`, `onboarding-dismiss`, `onboarding-install`, `onboarding-language`, `onboarding-reshow`, `onboarding-step`, `prayer-adhan-clear`, `prayer-adhan-import`, `prayer-enable-notifications`, `prayer-log-cycle`, `prayer-set-alert-mode`, `prayer-test-sound`, `qada-add`, `qada-clear-prayer`, `qada-complete`, `ramadan-enable-notifications`, `ramadan-planner-toggle`, `ramadan-toggle-fast`, `sadaqah-log`, `sadaqah-open-editor`, `sadaqah-remove`, `stats-heatmap-export`, `stats-heatmap-shift`, `toggle-prayer-alert`, `toggle-ramadan-alert`, `checklist-toggle` (change/input), `sunnah-toggle` (change/input), `toggle-prayer-quiet` (change/input), `toggle-prayer-quiet-cancel` (change/input)
- i18n: `common.error`, `khatma.presetFilled`, `onboarding.installAccepted`, `onboarding.installDeferred`, `plog.allLoggedToast`, `prayer.adhanCleared`, `prayer.notifGranted`, `profiles.applied`, `profiles.namePlaceholder`, `profiles.namePrompt`, `profiles.saved`, `qada.added`, `qada.cleared`, `qada.doneOne`, `qada.offerAdd`, `qada.offerMissed`, `ramadan.alertsDenied`, `stats.gapCleared`, `stats.heatmapSaved`, `stats.monthTotalLabel`
- routes: `VIEWS.SETTINGS`

### `js/app/handlers/zakat.js`

job: app/handlers — feature-scoped controller modules. Each exports a partial click-handler map (pure (dataset, element, event) functions); app/events.js merges them into the single delegation table.

- exports: `clickHandlers` (object), `inputHandlers` (const)
- emits: —
- handles: `bookmark-delete-folder`, `bookmark-delete-folder-confirmed`, `bookmark-filter-folder`, `bookmark-new-folder`, `zakat-clear-inputs`, `zakat-delete-snapshot`, `zakat-delete-snapshot-confirmed`, `zakat-save-snapshot`, `zakat-set-basis`, `zakat-toggle-hawl-remind`
- i18n: `mushaf.deleteFolderConfirm`, `mushaf.folderNamePh`, `mushaf.newFolder`, `zakat.deleteSnapshotConfirm`, `zakat.priceRequiredNote`, `zakat.snapshotSaved`
- routes: —

## core

_state container, hash router, config, i18n, storage, schema, utils._

### `js/core/config.js`

job: Central, static configuration for Nūr al-Dhikr. No logic here — only constants. Every other module may import this. Since v5.2 the definitions live in focused modules under core/config/

- exports: `APP_VERSION` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/fetch.js`

job: transport primitive: every runtime fetch in the app goes through fetchWithTimeout (directly or via app/net.js), so no mobile-network handoff can hang a surface forever. Kernel-level

- exports: `FETCH_TIMEOUT_MS` (const), `fetchWithTimeout` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/i18n.js`

job: UI chrome translation dictionary (not content — content items are already localized). Usage: import { t } from './i18n.js'; t('nav.home', state.settings.language)

- exports: `t` (function), `availableLanguages` (function), `LANGUAGE_LABELS` (const), `languageLabel` (function), `isRTL` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/icons.js`

job: the app's icon system. A small set of hand-drawn (not copied) line icons as inline SVG strings, keyed by name. Inline (not a sprite) is deliberate: the patch engine

- exports: `PATHS` (object), `ALIASES` (object), `icon` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/migration.js`

job: Converts legacy or partially-shaped documents into the current unified schema before they reach schema.js normalization. Nothing is ever discarded silently: unknown top-level fields are preserved und…

- exports: `migrate` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/router.js`

job: Minimal hash router. URL shape: #/view/seg1/seg2?q=foo The router only ever dispatches NAVIGATE — it holds no state of its own, so the browser back/forward buttons and deep links both work for free.

- exports: `safeDecode` (function), `consumePopNavigation` (function), `initRouter` (function), `buildHash` (function), `go` (function), `replaceGo` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.HOME`

### `js/core/schema.js`

job: Validation and normalization for the unified content schema (schema_version 2). Nothing here touches the DOM, network, or storage — pure data functions only.

- exports: `normalizeDhikrAudio` (function), `hasVerifiedDhikrAudio` (function), `normalizeItem` (function), `normalizeCategory` (function), `normalizeDocument` (function), `validateDocument` (function), `processDocument` (function), `blankItem` (function), `blankCategory` (function), `normalizeCustomContentMap` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state.js`

job: the store package facade. Single source of truth for Nūr al-Dhikr, split since v4.0 into focused modules under core/state/ (this file re-exports the public surface so

- exports: `store` (re-export), `initialState` (re-export), `PERSISTED_KEYS` (re-export), `pickPersisted` (re-export), `reduce` (re-export), `actions` (re-export), `sanitizeRestoredPayload` (re-export), `dryRunRestore` (re-export), `persistedSnapshot` (re-export), `selectors` (re-export)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/storage.js`

job: The only module allowed to touch localStorage directly. Everything returns a Result ({ success, value, error }) and never throws during normal operation.

- exports: `loadState` (function), `saveState` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/theme.js`

job: Applies the current settings (palette, shape, theme mode, font scale, language direction, accessibility flags) to <html> as data-attributes and CSS custom properties. CSS in variables.css reacts to t…

- exports: `applyTheme` (function), `watchSystemTheme` (function)
- emits: —
- handles: —
- i18n: `a11y.mainNav`, `common.skipToContent`
- routes: —

### `js/core/utils.js`

job: Small, pure, dependency-free helper functions. Never imports state, storage, or the DOM directly (except where explicitly a DOM helper).

- exports: `uid` (function), `clone` (function), `debounce` (function), `throttle` (function), `normalizeArabic` (function), `normalizeSearch` (function), `stripQuranAnnotations` (function), `pickLocale` (function), `pickStrict` (function), `categoryDisplayName` (function), `toEasternArabicNumerals` (function), `dateKey` (function), `addDays` (function), `clamp` (function), `MAX_COMPLETED_CYCLES` (const), `MAX_TOTAL_RECITATIONS` (const), `formatBytes` (function), `scrollBehavior` (function), `escapeHTML` (function), `isSafeKey` (function), `cleanObject` (function), `h` (function), `ok` (function), `fail` (function), `safe` (function), `storageAvailable` (function), `vibrate` (function), `highlightMatch` (function), `ayahCountPhrase` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

## core/config

_routes (views.js), chrome doors (nav.js), defaults, sanitizer._

### `js/core/config/app.js`

job: app identity, storage keys and small global lists. (Split from core/config.js; re-exported by that facade so every existing .../config.js import keeps working.)

- exports: `APP_NAME` (const), `APP_NAME_AR` (const), `SCHEMA_VERSION` (const), `STORAGE_KEY` (const), `DB_NAME` (const), `DB_VERSION` (const), `CATALOG_URL` (const), `TASBIH_MILESTONES` (const), `ICON_SIZES` (const), `COLLECTION_SUGGESTIONS` (const), `CHECKLIST_ITEMS` (const), `QUIZ_LENGTH` (const), `QUIZ_CHOICE_COUNT` (const), `QUIZ_LIBRARY_ID` (const), `SUHOOR_OFFSETS` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/config/nav.js`

job: the seven-section chrome map (IA-7, v5.17.61). The single source of truth for the top-level chrome (AGENTS.md rule 6: derive, don't pin). Every chrome surface — the rail/drawer entries

- exports: `DOORS` (const), `DOOR_ENTRIES` (function), `DOOR_LABEL_KEYS` (function), `APP_MENU_GROUPS` (const), `APP_MENU_ENTRIES` (const)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.ABOUT`, `VIEWS.CHECKLIST`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.LIBRARY`, `VIEWS.MUSHAF`, `VIEWS.OFFLINE`, `VIEWS.PRAYER`, `VIEWS.SETTINGS`, `VIEWS.TASBIH`, `VIEWS.ZAKAT`

### `js/core/config/quran.js`

job: Qur'an corpus, Mushaf, tafsir, tajweed-pool, hadith and reciter data URLs + translation-edition helpers. (Split from core/config.js; re-exported by that facade so every existing

- exports: `QURAN_META_URL` (const), `QURAN_SURAH_URL` (function), `TRANSLATION_EDITIONS` (const), `DEFAULT_TRANSLATION_EDITION` (const), `TRANSLATION_URL` (function), `overlayTranslation` (function), `asTranslationEdition` (function), `MUSHAF_META_URL` (const), `MUSHAF_PAGE_URL` (function), `MUSHAF_PAGE_COUNT` (const), `RECITERS_URL` (const), `DEFAULT_RECITER` (const), `AUDIO_PROVIDERS_URL` (const), `quranAudioUrl` (function), `VERSE_BITRATES` (const), `quranAudioSurahUrl` (function), `QURAN_WORDS_URL` (function), `QURAN_WORD_STUDY_URL` (function), `QURAN_ROOTS_URL` (const), `QURAN_DICT_URL` (const), `ROOTS_MEANING_URL` (const), `QURAN_ROOTS_FULL_URL` (const), `TAFSIR_EDITIONS_URL` (const), `TAFSIR_TEXT_URL` (function), `TAFSIR_REMOTE_URL` (function), `TAJWEED_PRACTICE_POOL_URL` (const), `TAJWEED_RULE_ID_SET` (const), `TAJWEED_FAMILY_ID_SET` (const), `HADITH_INDEX_URL` (const), `HADITH_BOOK_URL` (function), `QURAN_RECITERS` (const), `QURAN_RECITER_IDS` (const), `reciterDisplayName` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/config/sanitize.js`

job: settings sanitization (the stored-XSS boundary). (Split from core/config.js; re-exported by that facade so every existing .../config.js import keeps working.)

- exports: `BISMILLAH_STYLES` (const), `SETTINGS_SECTION_SLUGS` (const), `sanitizeMushafPrefs` (function), `sanitizeSettings` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/config/views.js`

job: routes, Mushaf type/paper choices, hadith grades, theme palettes/shapes and the DEFAULT_SETTINGS tree. (Split from core/config.js; re-exported by that facade so every existing

- exports: `VIEWS` (const), `DEFAULT_VIEW` (const), `KIDS_ALLOWED_VIEWS` (const), `AMBIENT_MODES` (const), `isKidsAllowedView` (function), `resolveKidsView` (function), `MUSHAF_FONTS` (const), `DEFAULT_MUSHAF_FONT` (const), `ARABIC_TEXT_FONTS` (const), `DEFAULT_ARABIC_TEXT_FONT` (const), `MUSHAF_PAPERS` (const), `DEFAULT_MUSHAF_PAPER` (const), `GRADES` (const), `GRADE_LABELS` (const), `PALETTES` (const), `SHAPES` (const), `THEME_MODES` (const), `DEFAULT_SETTINGS` (const)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.HOME`, `VIEWS.KIDS`, `VIEWS.TASBIH`

## core/i18n

_bilingual dictionaries (en/ar)._

### `js/core/i18n/ar.js`

job: the Arabic UI-chrome dictionary. Split out of the former i18n.js monolith (v4.2): ~950 keys per language, one file each, so translations are diffable and editable in isolation.

- exports: `ar` (object)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/i18n/en.js`

job: the English UI-chrome dictionary. Split out of the former i18n.js monolith (v4.2): ~950 keys per language, one file each, so translations are diffable and editable in isolation.

- exports: `en` (object)
- emits: —
- handles: —
- i18n: —
- routes: —

## core/idb

_IndexedDB open helpers._

### `js/core/idb/openDB.js`

job: the hardened IndexedDB boundary (B4). Guarantees: - a blocked upgrade settles (resolves null), never a forever-pending

- exports: `openDB` (function), `closeLiveDatabases` (function), `withStore` (function), `resetIdbForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

## core/state

_store + reducer + slices + selectors + persistence restore._

### `js/core/state/actions.js`

job: core/state — package root docs live in core/state.js (the facade).

- exports: `actions` (object)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/initial.js`

job: core/state — package root docs live in core/state.js (the facade).

- exports: `initialState` (function), `PERSISTED_KEYS` (const), `pickPersisted` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/reducer.js`

job: the store's single action switch (dispatcher). Since v5.2 the per-feature transitions live in focused slice modules under core/state/slices/ (this file only fans out). The public surface

- exports: `reduce` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/restore.js`

job: core/state — package root docs live in core/state.js (the facade).

- exports: `sanitizeRestoredPayload` (function), `persistedSnapshot` (function), `isFuturePayload` (function), `freshSessionCounters` (function), `dryRunRestore` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/selectors.js`

job: core/state — package root docs live in core/state.js (the facade).

- exports: `selectors` (object)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/slices/audio.js`

job: audio slice of the store reducer. Owns the recitation player, audio prefs/custom reciters, offline download bookkeeping and the audio-manager transients (catalog query,

- exports: `reduceAudio` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/slices/hadith.js`

job: hadith slice of the store reducer. Owns the hadith index/books/daily ephemeral slices plus the reader's book-view transient. Pure (state, action) => state; returns undefined

- exports: `reduceHadith` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/slices/library.js`

job: library slice of the store reducer. Owns favorites, hadith bookmarks, collections, counters, reminders, calendar notes, statistics, custom content, tasbih/speech transients.

- exports: `reduceLibrary` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/slices/quran.js`

job: Qur'an-study slice of the store reducer. Owns the classic reader, Mushaf progress/bookmarks, tafsir, word study, roots, tajweed pool/practice stats, ayah bookmarks + folders, hifz

- exports: `reduceQuran` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/slices/shell.js`

job: app-shell slice of the store reducer. Owns navigation, settings, boot/restore/reset, history, reminders, calendar notes, nudge, data-health, alert-trigger status, playback/view

- exports: `reduceShell` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.HADITH`, `VIEWS.MUSHAF`, `VIEWS.QURAN`, `VIEWS.SETTINGS`, `VIEWS.TAJWEED_COURSE`

### `js/core/state/slices/worship.js`

job: worship-and-practice slice of the store reducer. Owns fasting prefs, sadaqah, sunnah/qada/location profiles, dua journal,

- exports: `reduceWorship` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/store.js`

job: core/state — package root docs live in core/state.js (the facade).

- exports: `migrateFocusAutoAdvanceSetting` (function), `store` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/core/state/streak.js`

job: shared streak math (reducer + restore). Honest rules (v5.2.45): - A day is a STREAK DAY when it meets the daily dhikr goal

- exports: `validDayKey` (function), `coerceGoal` (function), `isStreakDay` (function), `computeStreak` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

## data

_offline-first corpora consumed by domain/app layers._

### `data/adhkar.json`

job: library:adhkar (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/asma.json`

job: library:asma (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/audio-providers.json`

job: audio source registry

- shape: `object{schemaVersion, updated, scope, ayahProviders, surahFallbackProviders, fallbackOrder, policy, backendOnlyAyahProviders +1 more}`

### `data/catalog.json`

job: index of library corpora

- shape: `object{schema_version, catalog_version, libraries} schema_v2`

### `data/daily-sunnah.json`

job: library:daily-sunnah (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/duas.json`

job: library:duas (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/lexical-provenance-schema.json`

job: corpus

- shape: `object{schemaVersion, note, citation, appliesTo, allowedGenericLabels, rules}`

### `data/lexical-review-queue.json`

job: corpus

- shape: `object{schemaVersion, note, queue}`

### `data/manifest.json`

job: generated integrity manifest (scripts/data-manifest.mjs)

- shape: `object{schemaVersion, version, mode, algorithm, files}`

### `data/mushaf-meta.json`

job: mushaf page inventory

- shape: `object{pageCount, pages, surahFirstPage, juzFirstPage, chapterNames, ayahPages}`

### `data/pdf-duas.json`

job: library:pdf-duas (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/prayer-methods.json`

job: calculation-method presets + provenance

- shape: `object{_comment, methods}`

### `data/prophet-duas.json`

job: library:prophet-duas (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/quran-dict.json`

job: corpus

- shape: `object{_comment, entries, _wordStudyCoverage}`

### `data/quran-meta.json`

job: surah metadata (names, ayah counts)

- shape: `object{schema_version, surahs, juz} schema_v1`

### `data/quran-roots-full.json`

job: corpus

- shape: `object{سمو, أله, رحم, حمد, ربب, علم, ملك, يوم +1643 more}`

### `data/quran-roots-meaning.json`

job: corpus

- shape: `object{_comment, entries, _wordStudyEtymology}`

### `data/quran-roots.json`

job: corpus

- shape: `object{سمو, أله, رحم, حمد, ربب, علم, ملك, يوم +1643 more}`

### `data/quranic.json`

job: library:quranic (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/reciters.json`

job: audio source registry

- shape: `object{kind, version, updated, sources, urlPattern, total, reciters}`

### `data/reflections.json`

job: library:reflections (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/special-days.json`

job: library:special-days (see data/catalog.json)

- shape: `object{schema_version, metadata, categories} schema_v2`

### `data/tafsir-editions.json`

job: tafsir edition registry

- shape: `object{schema_version, editions} schema_v1`

### `data/tajweed-course.json`

job: corpus

- shape: `object{schemaVersion, attribution, stages}`

### `data/tajweed-practice.json`

job: corpus

- shape: `object{schemaVersion, generatedFrom, corpus, coverage, levels, byRule, mixed}`

### `data/tajweed-sources.json`

job: corpus

- shape: `object{schemaVersion, note, works, rules, provenance, palette}`

### `data/zakat-notes.json`

job: corpus

- shape: `object{_comment, cash, goldGrams, silverGrams, investments, businessGoods, receivables, otherAssets +2 more}`

## domain

_pure logic: no DOM, no store; core-only imports (compass sensor excepted)._

### `js/domain/adhkarTiming.js`

job: Pure time-of-day helpers for surfacing the "right" adhkar at the right moment on Home. Kept separate from views so it stays trivially testable (same philosophy as ramadan.js / zakat.js).

- exports: `MORNING_WINDOW` (const), `EVENING_WINDOW` (const), `recommendedAdhkarWindow` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/ambient.js`

job: Nightstand content picks. The countdown itself stays live math in the view (domain/prayerTimeline.js); this module owns the two slow-rotation modes: the verse of the day (same

- exports: `ambientVerse` (function), `ambientDhikr` (function), `lampAutoAdvanceDefault` (function), `lampShouldAutoAdvance` (function), `LAMP_GROUND` (const), `LAMP_AMBER` (const), `LAMP_LUMINANCE_CAP` (const), `lampLuminance` (function), `lampIsBlueDominant` (function), `lampPaletteHoldsCap` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/audioBatch.js`

job: (NF03-RESUME) pure batch-queue logic. No DOM, no store, no IDB: the persistence edge lives in services/audioStore.js (batchQueue object store) and the orchestration

- exports: `reconcilePending` (function), `remainingAfter` (function), `hasResumableWork` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/audioQueue.js`

job: shared full-surah queue math (item 23, v5.2.67). The verse engine keeps its own range queue (surahPlayback.normalizeQueue + advanceQueue); this module owns the full-surah side so the player,

- exports: `REPEAT_MODES` (const), `normalizeRepeatMode` (function), `resolveNextFullSurah` (function), `cycleRepeatMode` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/calendar.js`

job: Gregorian <-> Hijri conversion using the civil tabular Islamic calendar (a well-established astronomical approximation, base epoch 1 Muharram 1 AH = 16 July 622 CE Julian). This is an arithmetic ca…

- exports: `toHijri` (function), `toGregorian` (function), `daysInHijriMonth` (function), `islamicEventsForYear` (function), `EVENT_LABELS` (const), `isWhiteDay` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/celebrate.js`

job: A transient, in-memory "something good just happened" registry, shared by every celebration micro-interaction in the app (v3.12 — generalized from the tasbih cycle-completion flash).

- exports: `milestoneHit` (function), `markCelebration` (function), `wasCelebrated` (function), `clearCelebrations` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/compass.js`

job: Thin wrapper around the DeviceOrientationEvent API for a live magnetic compass heading. No DOM writes here, no state.js dispatches — it just turns raw sensor events into a single heading number (0-…

- exports: `isSupported` (function), `needsPermission` (function), `requestPermission` (function), `start` (function), `stop` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/completedCards.js`

job: session-only memory for finished counters (v5.2.24, counter-flow wave). Reaching a card's target used to leave the done card sitting in every

- exports: `isDismissed` (function), `dismissCompleted` (function), `noteCompleted` (function), `wasCompletedRecently` (function), `clearDismissed` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/contentLens.js`

job: The four-level content-authority lens. The bundled libraries stay immutable on disk; everything the user changes — full field edits on any card, true deletes, additions, reordering, renames, field

- exports: `hasPendingScholarlyReview` (re-export), `prefsOf` (function), `applyItemOverrides` (function), `ITEM_OVERRIDE_FIELDS` (const), `lensCategoryItems` (function), `lensDocumentCategories` (function), `lensLibrary` (function), `CARD_FIELD_KEYS` (const), `fieldTogglesFor` (function), `stripCategoryItemKeys` (function), `stripCategoryKeys` (function), `stripLibraryKeys` (function), `itemIsCustomized` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/dailyAyah.js`

job: Theme-biased selection for the home "verse of the day" card. The card itself predates this module (pickDailyItem in views/home.js) — this domain narrows its eligible pool by theme keywords so a user …

- exports: `DAILY_THEMES` (const), `DAILY_POOL_LIBRARIES` (const), `dailyEligibleEntries` (function), `matchesTheme` (function), `pickDailyItemThemed` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/duaJournal.js`

job: Private dua journal + weekly reflection prompts. Everything stays on the device (this app's whole privacy model); export is a plain-text download the user owns.

- exports: `DUA_JOURNAL_CAP` (const), `REFLECTIONS_CAP` (const), `duaMonthStats` (function), `sanitizeDuaJournal` (function), `sanitizeReflections` (function), `isoWeekKey` (function), `REFLECTION_PROMPTS` (const), `promptForDate` (function), `localDayKey` (function), `journalExportText` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/fasting.js`

job: Voluntary (sunnah) fasting tracker + reminder logic, v3.18. Pure and DOM-free. Four categories the TODO named: Mondays & Thursdays, the White Days (13th/14th/15th of every Hijri month), Ashura (10 Mu…

- exports: `FASTING_CATEGORIES` (const), `RAMADAN_MONTH` (const), `ARAFAH_MONTH` (const), `ARAFAH_DAY` (const), `ASHURA_MONTH` (const), `ASHURA_DAY` (const), `WHITE_DAYS` (const), `FASTING_HORIZON_DAYS` (const), `REMIND_TIMES` (const), `defaultFastingPrefs` (function), `sanitizeFastingPrefs` (function), `nextRemindTime` (function), `fastingCategoriesForDate` (function), `activeFastingCategories` (function), `remindCategoriesFor` (function), `upcomingFastingDays` (function), `voluntaryFastCount` (function), `recentVoluntaryFasts` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/garden.js`

job: The Garden — a growth visualization of a lifetime of dhikr, restored from the reference app the user supplied (webp7: the plant-a-tree screen). Every recitation counted anywhere in the app (cards, fo…

- exports: `GARDEN_STAGES` (const), `gardenState` (function), `gardenAchievements` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/gestures.js`

job: pure touch-gesture decisions (v5.2.22, bug-report wave). The Mushaf page-turn swipe emulates a physical Arabic book, so its direction is ALWAYS right-to-left book order — a swipe right-to-left

- exports: `MUSHAF_SWIPE_MIN_PX` (const), `FOCUS_SWIPE_MIN_PX` (const), `PLAYER_DISMISS_MIN_DY` (const), `mushafSwipeTurn` (function), `focusSwipeTurn` (function), `SWIPE_GUARD_SELECTOR` (const), `SWIPE_TEXT_SURFACE_SELECTOR` (const), `isSwipeGuardTarget` (function), `findTouch` (function), `MUSHAF_DRAG_CLAMP_RATIO` (const), `MUSHAF_DRAG_LIFT` (const), `mushafDragStyle` (function), `isPlayerDismissSwipe` (function), `resolveMinControl` (function)
- emits: `player-min-toggle`
- handles: —
- i18n: —
- routes: —

### `js/domain/grades.js`

job: (DATA-01) honest grade presentation. Content carries grade values from a closed vocabulary (GRADES in core/config/views.js). 144 adhkar/dua records are explicitly Unknown

- exports: `normalizeGrade` (function), `gradeStateOf` (function), `gradeChipHTML` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/grammarDrill.js`

job: grammar flashcards from the bundled word morphology (data/quran-words/: POS, case, mood, verb form, gloss per word). Pure deck building: the caller ensures whatever per-surah word

- exports: `DRILL_SIZE` (const), `collectDrillWords` (function), `buildDeck` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/hadithSearch.js`

job: Cross-book ranked hadith search — the per-book substring filter in services/hadith.js only ever sees one open book. This module indexes every LOADED book document and ranks across all of them, reusin…

- exports: `buildHadithIndex` (function), `resetHadithIndex` (function), `hadithIndexStats` (function), `searchHadith` (function), `studyHadithQuery` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/hadithStudy.js`

job: narrator lines + grade guide. Shipped book files carry texts only (no graded pipeline has run), so per-hadith narrators are DERIVED from the matn/isnad wording with

- exports: `hadithNarratorFromEn` (function), `hadithNarratorFromAr` (function), `hadithNarrator` (function), `HADITH_GRADE_IDS` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/hifz.js`

job: Hifz (memorization) support, v3.17. Two halves, both DOM-free: 1. A lightweight spaced-repetition scheduler over per-surah records. A surah is marked "memorized" once, then resurfaces for review on a

- exports: `HIFZ_INTERVALS` (const), `HIFZ_GRADES` (const), `normalizeHifzGrade` (function), `gradeStep` (function), `HIFZ_LEVELS` (const), `normalizeHifzLevel` (function), `plusDays` (function), `diffDays` (function), `sanitizeHifzRecords` (function), `markMemorized` (function), `logReview` (function), `sanitizeMemRecords` (function), `markMemorizedKey` (function), `logReviewKey` (function), `dueMemRecords` (function), `normalizeAyahKey` (function), `markAyahMemorized` (function), `logAyahReview` (function), `sanitizeAyahRecords` (function), `dueAyahs` (function), `ayahMistakes` (function), `dueSurahs` (function), `countMemorized` (function), `dueCounts` (function), `surahPageRange` (function), `suggestFromKhatma` (function), `clozeWords` (function), `HIFZ_TESTS` (const), `normalizeHifzTest` (function), `buildMcqOptions` (function), `clozeAyahHTML` (function)
- emits: `hifz-reveal`
- handles: —
- i18n: —
- routes: —

### `js/domain/homeInvitations.js`

job: (v5.17.56, merged-plan item 9) the three below-fold home invitations: a Hijri date note, a Friday Al-Kahf invitation, and a Ramadan countdown/companion invitation.

- exports: `INVITE_IDS` (const), `RAMADAN_COUNTDOWN_DAYS` (const), `inviteDayKey` (function), `fridayOf` (function), `isFridayInviteDay` (function), `ramadanInviteState` (function), `hijriInviteState` (function), `isInviteDismissed` (function), `shouldShowInvite` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/homePanels.js`

job: Home panel order + visibility. Pure helpers over the persisted settings.homeOrder (array of panel ids, or null for the book order) and settings.hiddenHome ({ [id]: true }). Unknown/stale

- exports: `HOME_PANEL_IDS` (const), `HOME_DEFAULT_VISIBLE` (const), `HOME_PRIMARY_PANEL_IDS` (const), `HOME_HIGHLIGHT_PANEL_IDS` (const), `defaultHiddenHome` (function), `resolveHomePanels` (function), `moveHomePanel` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/install.js`

job: Pure install-path logic for the in-app PWA install flow. The browser owns the only real dialog (beforeinstallprompt can be consumed exactly once; iOS Safari never fires it at all), so everything

- exports: `INSTALL_REOFFER_DAYS` (const), `INSTALL_MAX_DEFERRALS` (const), `defaultInstallDeferral` (function), `sanitizeInstallDeferral` (function), `recordInstallDeferral` (function), `shouldReofferInstall` (function), `detectInstallPlatform` (function), `installStepsKey` (function), `normalizeInstallOutcome` (function), `runInstallPrompt` (function), `swInstallMessageAction` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/khatma.js`

job: Pure math for the Khatma (full-Qur'an reading) planner. No DOM, no state imports — data comes in as plain arguments so every rule below is trivially unit-testable (same philosophy as mushaf.js / zaka…

- exports: `inclusiveDays` (function), `suggestDailyTarget` (function), `planStatus` (function), `ramadanKhatmaPreset` (function), `KHATMA_CELEBRATION_MS` (const), `justCompletedKhatma` (function), `juzProgress` (function), `justCompletedJuz` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/kids.js`

job: Kids-mode helpers: the surah list and the surah-name memory quiz. Degamified (v5.17.58, merged-plan item 11): no points, no stars, no levels, no week chart — listening keeps a plain finished

- exports: `KIDS_SURAHS` (const), `kidsQuizRound` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/lastPosition.js`

job: the unified "where was I" service (merged-plan item 2). Seven honest slots, one reader: quran ......... state.quranBookmark.surah (classic reader, 1..114)

- exports: `LAST_POSITION_SLOTS` (const), `defaultLastPosition` (function), `sanitizeLastPosition` (function), `readLastPositions` (function), `hasAnyLastPosition` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/launchIntents.js`

job: pure parsing for OS launch entry points (item 24, v5.2.66): share_target GET params, file_handlers picks and protocol_handlers URLs. Pure (search-string in, intent out) so unit

- exports: `SHARE_PROTOCOL` (const), `parseShareTarget` (function), `parseProtocolLaunch` (function), `isBackupFile` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/lexicalProvenance.js`

job: (LEX-01) field-aware lexical provenance states. The lexicon must never fabricate synonyms/antonyms/etymology to raise a coverage counter. Every lexical field resolves to either a sourced list /

- exports: `LEXICAL_STATES` (const), `isValidCitation` (function), `genericSourceState` (function), `isFunctionToken` (function), `resolveLexicalListState` (function), `resolveAntonymState` (function), `resolveSynonymState` (function), `resolveLemmaProvenance` (function), `resolveRootProvenance` (function), `resolveContextProvenance` (function), `resolveIrabProvenance` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/localeContent.js`

job: Strict language-separation helpers for devotional content rendering. Contract (Content & i18n audit): AR (ar): Arabic matn only. Transliteration and translation are NEVER

- exports: `pickStrict` (re-export), `containsArabic` (function), `hasPendingScholarlyReview` (function), `showTransliterationFor` (function), `showTranslationFor` (function), `translationFor` (function), `contentTitleFor` (function), `virtueFor` (function), `collectionFor` (function), `narratorFor` (function), `referencePartsFor` (function), `referenceLineFor` (function), `noteFor` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/locations.js`

job: Multiple location profiles for prayer times — home / work / travel, quick-switched from the Prayer view. The ACTIVE location stays exactly where it always lived (settings.prayer.latitude/…), so every…

- exports: `LOCATION_PROFILES_CAP` (const), `LOCATION_PROFILES_PRESETS` (const), `CITY_REGIONS` (const), `CITY_PRESETS` (const), `makeProfile` (function), `sanitizeLocationProfiles` (function), `profileMatchesActive` (function), `profileToPrayerPatch` (function), `nearbyMosqueMapUrl` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/milestones.js`

job: Juz' / surah mastery badges — positive framing only, consistent with the app's anti-guilt nudge policy: badges celebrate what IS memorized or read, never countdowns of what isn't.

- exports: `juzPageRanges` (function), `milestoneBadges` (function), `certificateData` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/moods.js`

job: "Browse by need" — curated cross-library collections that meet a person where they are ("I'm anxious", "I need forgiveness", "I'm traveling"). Every mood matches BOTH:

- exports: `MOODS` (const), `moodById` (function), `itemsForMood` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/mutashabihat.js`

job: Look-alike (mutashabihat) drill — the classic hifz pain point: passages that look or sound alike and get swapped during recall. NOTHING is hand-curated: similar-ayah pairs are COMPUTED from the actual

- exports: `buildSimilarPairs` (function), `resetMutashabihatCache` (function), `confusablePairsFor` (function), `pairForAyah` (function), `lapsedAyahKeys` (function), `filterLapsedPairs` (function), `buildDrillRound` (function), `diffWords` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/nudge.js`

job: the gentle "it's been a while" line (v3.25.0). Pure, DOM-free. The TODO's own framing is the contract: most habit apps punish a broken streak with guilt-inducing copy; this app already has enough rea…

- exports: `NUDGE_MIN_GAP_DAYS` (const), `NUDGE_WARM_DAYS` (const), `NUDGE_FRESH_DAYS` (const), `NUDGE_REPEAT_DAYS` (const), `defaultNudgeState` (function), `sanitizeNudgeState` (function), `lastActivity` (function), `computeNudge` (function), `shouldShowNudge` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/offline.js`

job: offline-library content inventory (v5.3.0). Pure URL builders over core/config: no fetching, no state. The batch engine (app/offlineJobs.js) walks these lists through fetchJSON, which warms

- exports: `OFFLINE_GROUPS` (const), `OFFLINE_GROUP_IDS` (const), `quranUrls` (function), `translationUrls` (function), `mushafUrls` (function), `wordsUrls` (function), `hadithUrls` (function), `tafsirUrls` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/onboarding.js`

job: Pure logic for the first-run wizard on Home: three decisions — language, location-or-offset, reciter — then done, with an instant skip. Everything else the old 8-step wizard asked (comfort,

- exports: `isReturningUser` (function), `WIZARD_STEP_IDS` (const), `CONFIRM_STEPS` (const), `LEGACY_STEP_ORDER` (const), `DEFERRED_STEPS` (const), `LEGACY_CONFIRM_STEPS` (const), `resolveOnboardingStep` (function), `buildOnboardingSteps` (function), `onboardingComplete` (function), `wizardStepIndex` (function), `shouldShowOnboarding` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/planExport.js`

job: Exportable reading/checklist plan — the zero-account sharing primitive. A family member exports their plan (khatma schedule, checklist targets, tasbih targets, dua-journal-free) as a small JSON file;…

- exports: `PLAN_KIND` (const), `PLAN_VERSION` (const), `buildPlan` (function), `isPlanFile` (function), `sanitizePlan` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/playerShortcuts.js`

job: (v5.12.0) keyboard drills for the players: Space = play/pause, m = mute, ArrowLeft/Right = step (ayah prev/next in verse mode, ∓10s seek in file mode — the dispatcher owns the mode).

- exports: `shortcutActionForKey` (function)
- emits: `practice-tap`, `word-tap`
- handles: —
- i18n: —
- routes: —

### `js/domain/prayer.js`

job: Fully offline prayer time calculation from latitude/longitude/date using standard low-precision solar position astronomy (no network calls, no UI). (v4.3) DAY-RELATIVE HOURS: calculateTimes returns e…

- exports: `METHODS` (const), `ASR_FACTORS` (const), `PRAYER_ORDER` (const), `OFFSET_PRAYERS` (const), `applyPrayerOffsets` (function), `calculateTimes` (function), `hoursToClock` (function), `formatClock` (function), `nextPrayer` (function), `currentPrayer` (function), `decimalHoursToDate` (function), `compactPrayerMethodLine` (function), `prayerMethodLine` (function)
- emits: —
- handles: —
- i18n: `prayer.asrMethod`, `prayer.methodSource`, `prayer.offsetsNone`, `units.m`
- routes: —

### `js/domain/prayerExport.js`

job: Export prayer times to the phone's system calendar as an .ics file (Google/Apple Calendar import). Pure string building — no DOM, no store. Times are the engine's day-relative decimal hours; dates re…

- exports: `PRAYER_EXPORT_ORDER` (const), `icsEscape` (function), `icsLocal` (function), `buildPrayerICS` (function), `prayerICSFilename` (function), `buildMonthTimetable` (function), `timetableCell` (function), `buildMonthICS` (function), `prayerMonthICSFilename` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/prayerLog.js`

job: Pure helpers for the five-daily-prayers log shown in the Prayer view. Storage deliberately REUSES state.dailyChecklist (the daily-habit map) with a tri-state value for each prayer key:

- exports: `PRAYER_KEYS` (const), `cycleState` (function), `prayerState` (function), `loggedCount` (function), `dayComplete` (function), `prayerStreak` (function), `prayerWeek` (function), `prayerMonthCount` (function), `prayerBestStreak` (function), `prayerInsights` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/prayerTimeline.js`

job: Full-day prayer timeline: all six times at a glance with a moving "now" indicator. Pure math over the engine's day-relative hours — no DOM. The strip spans 00:00–24:00 of the computation date. Positi…

- exports: `stripPosition` (function), `buildTimeline` (function), `spanBetween` (function), `nextPrayerCountdown` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/qada.js`

job: Qada' (make-up) tracker for missed fard prayers — log a backlog, work it down, one prayer at a time. Entries are deliberately simple: { id, prayer, reason, date (the estimated missed day), ts (logged…

- exports: `QADA_LOG_CAP` (const), `makeQadaEntry` (function), `sanitizeQadaLog` (function), `pendingQada` (function), `pendingByPrayer` (function), `qadaSummary` (function), `completeOldest` (function), `addBacklog` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/qibla.js`

job: Pure great-circle geometry for finding the direction and distance to the Kaaba (Masjid al-Haram, Mecca) from any point on Earth. No DOM, no sensors — that lives in compass.js. Kept separate so this s…

- exports: `KAABA` (const), `qiblaBearing` (function), `distanceToKaabaKm` (function), `cardinalLabel` (function), `angleDelta` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/quickTiles.js`

job: Home quick-action tiles: editable order + visibility, usage-driven by default. The 8 tiles used to be hardcoded in views/home.js. They are now a

- exports: `QUICK_TILE_IDS` (const), `HOME_QUICK_TILE_DEFAULTS` (const), `QUICK_TILE_DEFS` (const), `usageTileOrder` (function), `resolveQuickTiles` (function), `moveQuickTile` (function)
- emits: —
- handles: —
- i18n: —
- routes: `VIEWS.CATEGORY`, `VIEWS.MUSHAF`, `VIEWS.PRAYER`, `VIEWS.QIBLA`, `VIEWS.RAMADAN`, `VIEWS.TASBIH`, `VIEWS.ZAKAT`

### `js/domain/quiz.js`

job: pure quiz-memory helpers (no DOM, no store). quizMissRecords is the cross-session half of Review-mistakes: every wrong answer upserts { m: misses, l: last-miss day } under the item id;

- exports: `QUIZ_MISS_CAP` (const), `isQuizItemId` (function), `sanitizeQuizMissRecords` (function), `recordQuizMiss` (function), `clearQuizMiss` (function), `weakQuizIds` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/quranSearch.js`

job: Full-text search across the entire Qur'an — the Uthmani Arabic text (diacritic-insensitive, via stripQuranAnnotations + normalizeSearch) and the bundled Sahih International translation. (v3.6: closes…

- exports: `buildQuranIndex` (function), `resetQuranIndex` (function), `quranIndexSize` (function), `searchQuran` (function), `searchQuranExpanded` (function), `isQuranSearchReady` (function), `setQuranIndexReady` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/ramadan.js`

job: Pure Ramadan-companion logic: fasting-window detection, Suhoor/Iftar countdown phases, fasting-day bookkeeping, and next-Ramadan/Eid lookups. No DOM, no store, no network — everything here is trivial…

- exports: `RAMADAN_MONTH` (const), `ramadanInfo` (function), `ramadanLength` (function), `ramadanStartForHijriYear` (function), `nextRamadan` (function), `nextEidAlFitr` (function), `fastPhase` (function), `formatCountdown` (function), `qadrNightInfo` (function), `qadrNightFor` (function), `ramadanLogKey` (function), `ramadanAlertTimes` (function), `keptFastCount` (function), `fastTrackerDays` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/ramadanPlanner.js`

job: The Ramadan planner's three logs — taraweeh, i'tikaf, and the last-ten-nights checklist — plus the suhoor/iftar countdown helpers. Keys follow the existing ramadanLog convention ({hijriYear}-{hijriMo…

- exports: `sanitizeHijriDayLog` (function), `LAST_TEN_ITEMS` (const), `isLastTenNights` (function), `monthEntry` (function), `taraweehCount` (function), `itikafCount` (function), `ramadanKhatmPlan` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/readerWindow.js`

job: classic-reader ayah windowing, pure. (v5.2.17) The last module-scoped view state (B12): views/quran.js kept a readerWindow latch that render mutated while rendering, which is

- exports: `READER_WINDOW_SIZE` (const), `initialReaderWindow` (function), `sanitizeWindow` (function), `computeReaderWindow` (function), `expandWindow` (function), `readWindow` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/reflections.js`

job: Home feed queue + list completion math (v5.2.25, counter-standards wave). Three pure helpers, DOM-free and unit-tested:

- exports: `isCompletedToday` (function), `dedupeEntries` (function), `nextFreshIndex` (function), `listCompletion` (function), `firstPendingItem` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/reminderPresets.js`

job: One-tap notification presets on the EXISTING scheduler (no new infra): • Jumu'ah (Surah Al-Kahf + salawat) → a recurring calendar note, every Friday via interval:7 anchored on a Friday. Calendar note…

- exports: `JUMUAH_PRESET_ID` (const), `DAILY_VERSE_PRESET_ID` (const), `dayKey` (function), `fridayAnchor` (function), `hasPreset` (function), `jumuahNote` (function), `dailyVerseReminder` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/review.js`

job: the worship "year in review" aggregation (v3.23.0). The TODO's own framing, kept as a contract: computed entirely from data already being tracked, presented honestly — a summary of one's own

- exports: `keyToDate` (function), `firstTrackedKey` (function), `longestDayStreak` (function), `worshipReview` (function), `reviewIsEmpty` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/rootAwareSearch.js`

job: (v5.17.60, merged-plan item 13) root-aware search. What was true before: the library index (domain/search.js) matched normalized exact substrings (AND semantics) over a transliteration

- exports: `ROOT_EXPANSION_MAX_ROOTS` (const), `ROOT_EXPANSION_MAX_FORMS` (const), `ROOT_EXPANSION_FORMS_SCANNED_PER_ROOT` (const), `QURAN_EXPANSION_HIT_CAP` (const), `foldTranslit` (function), `romanizeArabic` (function), `consonantSkeleton` (function), `expandQueryWithRoots` (function), `mergeQuranHits` (function), `unifiedSearch` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/roots.js`

job: pure logic for the root-family browser (v3.22.0). The per-word popover's "same root elsewhere" list (wordStudy.js) is a capped 8-item sample from data/quran-roots.json. This module powers the

- exports: `sanitizeRootParam` (function), `foldRoot` (function), `rootList` (function), `searchRoots` (function), `rootForms` (function), `rootStats` (function), `rootOccurrencesAll` (function), `ROOTS_PAGE_SIZE` (const), `ROOT_PREVIEW_CAP` (const), `ROOT_GROUP_REF_CAP` (const), `occurrenceGloss` (function), `occurrenceAyah` (function), `splitAyahWord` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/search.js`

job: Builds a lightweight in-memory search index from the loaded library (state.library.itemIndex) and answers queries in well under 50ms even for several thousand items, since everything is precomputed.

- exports: `buildIndex` (function), `search` (function), `searchSurahs` (function), `filterEntries` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/searchPagination.js`

job: (SEARCH-01) explicit page-number pagination. Replaces the Load More shown-count window with: scopePage / pageSize / resultTotal / resultPageCount

- exports: `SEARCH_PAGE_SIZES` (const), `SEARCH_PAGE_KEYS` (const), `SEARCH_LEGACY_KEYS` (const), `pageSizeFor` (function), `resolveScopePage` (function), `pageCountFor` (function), `paginate` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/sessionFlags.js`

job: session-scoped one-shot UI flags. Plain module state: never persisted, never synced, gone on reload. Exists because views/ must not import app/ (layer rule) while both the

- exports: `sessionFlag` (function), `setSessionFlag` (function), `sessionValue` (function), `setSessionValue` (function), `resetSessionFlagsForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/sleepTimer.js`

job: Listen-mode sleep timer — a pure state machine the audio engine drives. Continuous multi-surah playback runs until the timer elapses, then the last 90 seconds fade to silence before a hard stop (a cl…

- exports: `SLEEP_TIMER_CHOICES` (const), `FADE_SECONDS` (const), `initialTimerState` (function), `armTimer` (function), `nextSleepRung` (function), `clearTimer` (function), `volumeAt` (function), `countdownLabel` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/statistics.js`

job: Pure read-side helpers that derive views over state.statistics for the UI. Writes happen only through state actions (STATISTICS_RECORD) dispatched by the module that actually recorded the recitation …

- exports: `weekWindow` (function), `monthWindow` (function), `totalInLastDays` (function), `readingInLastDays` (function), `activeDaysInLastDays` (function), `averagePerDay` (function), `activeDays` (function), `buildWeekSummary` (function), `monthTotal` (function), `mostReadCategories` (function), `intensityBucket` (function), `goalProgress` (function), `STREAK_MILESTONES` (const), `streakCoaching` (function), `surahPageCounts` (function), `topSurahsByPages` (function), `buildStatsCSV` (function), `statsCSVFilename` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/sunnah.js`

job: Sunnah prayer tracker domain — Duha, Witr, Tahajjud, Rawatib, separate from the fard log (prayerLog.js) by design: mixing them would inflate the five-prayer completion UI and every streak built on it.

- exports: `SUNNAH_ITEMS` (const), `sanitizeSunnahLog` (function), `sunnahToday` (function), `sunnahCount` (function), `sunnahWeek` (function), `witrStreak` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tafsirSearch.js`

job: full-text search over one bundled tafsir edition. Tafsir is modern Arabic prose (no Uthmani marks), so records fold with the app-wide normalizeSearch only — no Quran-specific pipelines leak

- exports: `isTafsirSearchable` (function), `defaultSearchEdition` (function), `buildTafsirIndex` (function), `resetTafsirIndex` (function), `tafsirIndexSize` (function), `tafsirIndexEdition` (function), `isTafsirSearchReady` (function), `searchTafsir` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tajweed.js`

job: A deterministic Tajweed (recitation-rule) classifier that runs directly against this app's own Uthmani text. Character-index alignment between this app's text and any pre-computed third-party annotat…

- exports: `BISMILLAH_AR` (const), `TAJWEED_FAMILIES` (const), `TAJWEED_RULES` (const), `classifyWordTajweed` (function), `CLASSIFY_MEMO_CAP` (const), `clearClassifyMemo` (function), `classifyMemoSizeForTests` (function), `classifyAyahTajweed` (function), `tajweedRule` (function), `canonicalWordTokens` (function), `ornamentTokenKind` (function), `matchesAccentWord` (function), `sameSurfaceWord` (function), `containsSurfaceWord` (function), `wordUnits` (function), `TAJWEED_FAMILY_VARS` (const), `tajweedPrefsOf` (function), `ruleEnabled` (function), `effectiveRuleColor` (function), `filterSpansByPrefs` (function), `TAJWEED_COLOR_CHOICES` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tajweedCourse.js`

job: the course spine (v5.17.32) Eight stages, seventeen sessions, madd-first, shaped like Arabic101's published 30-day programme and sequenced along the classical gradient the

- exports: `COURSE_STAGES` (const), `COURSE_STAGE_IDS` (const), `PATH_MODES` (const), `DEFAULT_PATH_MODE` (const), `allSessions` (function), `findSession` (function), `findStage` (function), `courseRules` (function), `isDrivable` (function), `availableSessions` (function), `isUnlocked` (function), `nextSession` (function), `stageProgress` (function), `courseProgress` (function), `searchSessions` (function), `sessionsForRule` (function), `uncitedSessions` (function), `sanitizeTajweedCourseProgress` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tajweedLessons.js`

job: guided rule lessons. A lesson is the rule's own scholarly definition (domain/tajweed.js, EN+AR) plus example ayahs drawn from the drill pool itself — never invented refs.

- exports: `LESSON_EXAMPLE_COUNT` (const), `tajweedLessonExamples` (function), `tajweedLessonRule` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tajweedPractice.js`

job: Pure helpers for the "find the rule" drill mode: picking a practice ayah from the curated pool, building the answer key from the same deterministic classifier used for the reading-mode coloring (so t…

- exports: `PRACTICE_ROUND_SIZE` (const), `TAJWEED_MISS_CAP` (const), `tajweedMissRecord` (function), `tajweedMissClear` (function), `weakTajweedRules` (function), `PRACTICE_POOL_MIN` (const), `PRACTICE_POOL_CAP` (const), `backfillTajweedPool` (function), `practiceLevel` (function), `pickRoundEntries` (function), `isTajweedRuleId` (function), `pickRoundEntry` (function), `buildAnswerKey` (function), `scoreRound` (function), `defaultTajweedPracticeStats` (function), `nextStats` (function), `TAJWEED_QUIZ_MODES` (const), `TAJWEED_ANSWER_MODES` (const), `normalizeTajweedAnswerMode` (function), `buildWordAnswerKey` (function), `firstWeakRuleForAyah` (function), `scoreWordRound` (function), `buildClassifyQuestion` (function), `accuracyFor` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/tajweedSources.js`

job: runtime mirror of data/tajweed-sources.json (v5.17.18) A JS module, not a fetch, because the mushaf legend and the Settings panel both need the citation synchronously and offline. The JSON file is

- exports: `TAJWEED_WORKS` (const), `TAJWEED_SOURCES` (const), `tajweedCitation` (function), `uncitedTajweedRules` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/translationCompare.js`

job: Translation-compare view: pure helpers for showing a SECOND translation edition under the primary one in the classic reader. No DOM, no store.

- exports: `normalizeEditionKey` (function), `compareVisible` (function), `translationBMap` (function), `resolveCompareText` (function), `resolveCompareTexts` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/wmm-coefs.js`

job: GENERATED from the official NOAA World Magnetic Model 2025-2030 coefficient file (WMM2025.COF, epoch 2025, released 11/13/2024, public domain). Source: scripts/WMM2025COF/ via

- exports: `WMM_EPOCH` (const), `WMM_NAME` (const), `WMM_RELEASED` (const), `WMM_COEF` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/wmm.js`

job: the World Magnetic Model (WMM2025), pure and offline. Computes the magnetic declination D (the angle between true north and magnetic north) at a geodetic position and date, using the official

- exports: `decimalYear` (function), `declinationAt` (function), `declinationLabel` (function), `declinationCached` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/wordStudy.js`

job: Pure helpers for the per-word grammar popover: root/case/mood/verb-form lookups, bilingual grammar summaries, and root-occurrence formatting. No DOM, no state.js — data comes in as plain arguments (s…

- exports: `getWord` (function), `wordGrammarSummary` (function), `wordDetailTags` (function), `wordAffixLabels` (function), `rootOccurrences` (function), `isTafsirLoaded` (function), `splitEditions` (function), `findEdition` (function), `ayahTranslit` (function), `wordIrabLine` (function), `dictEntryFor` (function), `wordBookmarkKey` (function), `materializeWordStudy` (function), `rootStudyEntryFor` (function), `rootMeaningFor` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/worship.js`

job: The combined "today in worship" aggregation (v3.19) — one honest view over data that ALREADY exists per-day, plus the one gap (sadaqah given). Sources, deliberately not duplicated:

- exports: `SADAQAH_LOG_CAP` (const), `SADAQAH_AMOUNT_CAP` (const), `cleanSadaqahAmount` (function), `pagesReadToday` (function), `readingStreak` (function), `prayersLoggedToday` (function), `sadaqahGivenToday` (function), `sanitizeSadaqahLog` (function), `fastedToday` (function), `worshipTodayRows` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/domain/zakat.js`

job: Pure Zakat arithmetic: nisab thresholds, zakatable-wealth aggregation, the 2.5% due amount, the mandatory round-up to whole currency units, and the Zakat al-Fitr per-household amount. No DOM, no stor…

- exports: `ZAKAT_RATE` (const), `NISAB_GOLD_GRAMS` (const), `NISAB_SILVER_GRAMS` (const), `computeNisab` (function), `roundUpToUnit` (function), `computeZakat` (function), `computeFitr` (function), `formatAmount` (function), `HAWL_DAYS` (const), `hawlDueFor` (function), `daysUntilHawl` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

## services

_side-effect owners: audio, notifications, persistence helpers._

### `js/services/alertTriggers.js`

job: Prayer-alert reliability. Until now, adhan alerts only fired while a tab was open and the 30s in-tab check interval (notifications.js) was running — a briefly closed tab silently skipped a prayer. Th…

- exports: `PRAYER_ORDER` (const), `PLAN_WINDOW_MS` (const), `MAX_PLAN` (const), `MAX_LATENESS_MS` (const), `TRIGGER_TAG_PREFIX` (const), `buildTriggerPlan` (function), `planFingerprint` (function), `sanitizePlan` (function), `selectDueAlerts` (function), `pruneFiredMap` (function), `triggersSupported` (function)
- emits: —
- handles: —
- i18n: `prayer.`, `prayer.timeFor`
- routes: —

### `js/services/appBadge.js`

job: the installable-app icon badge (Badging API, no backend, fully local). Pure count builder (unit-tested) + thin guarded sync, mirroring

- exports: `badgeCountFor` (function), `syncAppBadge` (function), `clearAppBadge` (function), `refreshAppBadge` (function), `_resetAppBadgeForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/audioCatalog.js`

job: The full-reciter catalog: 312 mushafs from mp3quran.net + quranicaudio.com (both CORS-open, both serving per-surah files 001.mp3…114.mp3), loaded lazily from data/reciters.json, plus user-added custo…

- exports: `pad3` (function), `surahUrl` (function), `customMoshafId` (function), `rewayaAr` (function), `loadCatalog` (function), `resetCatalogForTests` (function), `searchReciters` (function), `translationLabel` (function), `findMoshaf` (function), `validateCustomServer` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/audioContext.js`

job: the app's ONE lazily-created AudioContext. (v4.2) prayerSound, soundDesign, and tasbih each used to spin their own context. Browsers cap concurrent AudioContexts per page (~4–6, tighter on

- exports: `getAudioContext` (function), `_resetAudioContextForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/audioStore.js`

job: Offline recitation storage: a dedicated IndexedDB database (separate from the app-state DB so a broken audio cache can never corrupt user data) holding one Blob per "moshafId:surahNumber" key, plus a…

- exports: `AUDIO_CACHE_DEFAULT_MAX_BYTES` (const), `setAudioCacheCapForTests` (function), `applyAudioCacheCapFromSettings` (function), `planCacheEviction` (function), `_resetAudioStoreForTests` (function), `closeAudioStoreForReset` (function), `audioKey` (function), `saveAudio` (function), `getAudio` (function), `deleteAudio` (function), `deleteMoshafAudio` (function), `downloadSurah` (function), `formatBytes` (function), `ensurePersistentStorage` (function), `resetPersistForTests` (function), `enforceAudioCacheCap` (function), `audioCacheUsage` (function), `verseKey` (function), `saveVerseAudio` (function), `getVerseAudio` (function), `listVerseAyahs` (function), `deleteVerseAudio` (function), `downloadVerseFile` (function), `ADHAN_MOSHAF_ID` (const), `ADHAN_KIND_SLOTS` (const), `ADHAN_MAX_BYTES` (const), `looksLikeAudio` (function), `validateAdhanFile` (function), `saveAdhanAudio` (function), `getAdhanAudio` (function), `deleteAdhanAudio` (function), `saveBatchQueue` (function), `loadBatchQueue` (function), `clearBatchQueue` (function), `loadAllBatchQueues` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/backup.js`

job: Export the persisted portion of state as a downloadable JSON file, and import/validate a previously exported file back into the store. This is the only supported way to move data between devices, sin…

- exports: `BACKUP_ERRORS` (const), `AUTO_BACKUP_DAYS` (const), `STALE_BACKUP_DAYS` (const), `AUTO_BACKUP_KEY` (const), `buildBackupPayload` (function), `downloadBackup` (function), `downloadPlan` (function), `parseBackup` (function), `readFileAsText` (function), `autoBackupDue` (function), `maybeAutoBackupNow` (function), `backupStale` (function), `defaultBackupStorage` (function), `writeAutoSnapshot` (function), `readAutoSnapshot` (function), `backupFileText` (function), `filePickerSupported` (function), `pickBackupFile` (function), `saveBackupHandle` (function), `loadBackupHandle` (function), `clearBackupHandle` (function), `writeBackupToHandle` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/calendarNotes.js`

job: Pure logic for resolving whether a user-created calendar note applies to a given date. No state/DOM access — state.js owns storage, calendar.js (the view) owns rendering, this module only answers "do…

- exports: `appliesToDate` (function), `notesForDate` (function), `datesWithNotesInRange` (function), `RECURRENCE_TYPES` (const)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/checklist.js`

job: Pure helpers for the daily habit checklist (five prayers + morning/evening adhkar + a Qur'an check-in). No DOM, no state.js — state.js owns the dailyChecklist slice and dispatches; this module only…

- exports: `completedCount` (function), `isDayComplete` (function), `checklistStreak` (function), `recentHistory` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/contentPrefs.js`

job: Pure helpers for the in-place content-manage layer — the user's own hide / reorder / re-target preferences applied ON TOP of the immutable bundled libraries (and custom libraries). The data files nev…

- exports: `contentPrefsOf` (function), `visibleCategoryItems` (function), `hiddenCategoryItems` (function), `isCategoryHidden` (function), `itemTargetOf` (function), `withEffectiveTargets` (function), `moveItem` (function), `setItemHidden` (function), `setCategoryHidden` (function), `setItemTarget` (function), `findCategoryById` (function), `setItemDeleted` (function), `setCategoryDeleted` (function), `setLibraryDeleted` (function), `setLibraryHidden` (function), `applyItemFields` (function), `applyCategoryFields` (function), `applyLibraryFields` (function), `moveCategory` (function), `moveLibrary` (function), `addItemToCategory` (function), `addCategoryToLibrary` (function), `restoreItem` (function), `restoreCategory` (function), `restoreLibrary` (function), `restoreAll` (function), `setLibraryFieldToggles` (function), `libraryIsCustomized` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/dataHealth.js`

job: the Settings "data health check" (v3.26.0). Pure, DOM-free helpers. The TODO's framing is the spec: "Backups people never test are hopes,

- exports: `daysSinceBackup` (function), `formatBytes` (function), `dryRunVerdict` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/dhikrAudio.js`

job: single-shot per-dhikr recitation playback. (v5.17.30, OPEN-ISSUES #15 infra only — zero licensed clips ship.) Deliberately NOT the full-surah session (services/player.js,

- exports: `playDhikrAudio` (function), `stopDhikrAudio` (function), `isPlayingDhikrAudioItem` (function), `currentDhikrAudioItemId` (function), `currentDhikrAudioUrl` (function), `resetDhikrAudioForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/editor.js`

job: All create/read/update/delete logic for user-authored content. Custom content lives in state.customContent, keyed by library id, using the exact same normalized shape as built-in libraries (see schem…

- exports: `DEFAULT_CUSTOM_LIBRARY_ID` (const), `getCustomLibrary` (function), `createLibrary` (function), `deleteLibrary` (function), `addCategory` (function), `updateCategory` (function), `updateLibrary` (function), `deleteCategory` (function), `saveItem` (function), `duplicateItem` (function), `deleteItem` (function), `undo` (function), `blankItemTemplate` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/floatingCounter.js`

job: the counter as a floating window. (v5.17.15) A reader counting while doing something else (working, walking, cooking) currently has to keep the tab in front. A native app ships an

- exports: `floatingCounterHTML` (function), `isSupported` (function), `isOpen` (function), `openFloatingCounter` (function), `updateFloatingCounter` (function), `closeFloatingCounter` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/gapTelemetry.js`

job: (v5.11.0 C) opt-in, local-only follow-gap telemetry for low-end devices. Headless numbers never capture budget-phone render costs, so the app can

- exports: `MAX_SAMPLES` (const), `GAP_MAX_MS` (const), `percentile` (function), `summarize` (function), `hydrate` (function), `setEnabled` (function), `isEnabled` (function), `markDispatch` (function), `markApplied` (function), `recordEffect` (function), `noteLongtask` (function), `stats` (function), `clear` (function), `resetGapTelemetryForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/hadith.js`

job: The Ahadeeth library engine: book registry, lazy-loading orchestration primitives, chapter/pagination/filter helpers, and the deterministic daily-hadith picker. Deliberately DOM-free so it is directl…

- exports: `HADITH_DAILY_BOOKS` (const), `HADITH_SAHIH_COLLECTIONS` (const), `bookStanding` (function), `HADITH_GRADES` (const), `normalizeHadithGrade` (function), `normalizeNarrator` (function), `HADITH_PAGE_SIZE` (const), `validateHadithIndex` (function), `validateHadithDoc` (function), `_haystackBuildsForTests` (function), `filterHadiths` (function), `pageCount` (function), `clampPage` (function), `pageForNumber` (function), `daySeed` (function), `mulberry32` (function), `pickDailyHadith` (function), `pickRandomHadith` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/mediaSession.js`

job: lock-screen / headset / notification-shade controls for recitation (Media Session API, no backend, fully local). Pure metadata builders (unit-tested) + thin guarded sync: every touch of

- exports: `SESSION_ARTWORK` (const), `verseMetadata` (function), `fullSurahMetadata` (function), `syncMetadata` (function), `clearMetadata` (function), `desiredPlayingState` (function), `syncPlayingState` (function), `_resetPlayingStateForTests` (function), `installMediaHandlers` (function), `_resetMediaHandlersForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/moshafAvailability.js`

job: learned per-surah availability. Catalog servers are assumed to host 001–114.mp3, but translation, Taraweeh and Mu'allim variants often lack surahs. Rather than HEADing

- exports: `missingSurahs` (function), `isSurahMissing` (function), `markSurahMissing` (function), `clearMoshafAvailability` (function), `_resetAvailabilityForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/mushaf.js`

job: Pure helpers for the 604-page Madani Mushaf reader: page bounds/navigation and the "global ayah number" (1-6236) that Quran audio CDNs key recitation files by. No DOM, no state.js — data comes in as …

- exports: `clampPage` (function), `nextPage` (function), `prevPage` (function), `isFirstPage` (function), `isLastPage` (function), `setMushafWideLayout` (function), `mushafSpreadActive` (function), `spreadRightPage` (function), `spreadLeftPage` (function), `nextSpreadPage` (function), `prevSpreadPage` (function), `juzEighth` (function), `hizbStartPage` (function), `juzPageRanges` (function), `juzReadStates` (function), `globalAyahNumber` (function), `ayahAudioUrl` (function), `surahStartPage` (function), `juzStartPage` (function), `SAJDA_AYAHS` (const), `isSajdaAyah` (function), `resolvePage` (function), `mushafRoutePage` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/notifications.js`

job: Schedules local (client-side only) reminders using the Notification API and setTimeout chains re-armed on each check. No server, no push service — reminders only fire while the app/tab is open or via…

- exports: `DAY_DEDUP_KEY_FOR_TESTS` (const), `handleDayFiredStorageEvent` (function), `wasDayFired` (function), `markDayFired` (function), `permissionState` (function), `requestPermission` (function), `startScheduler` (function), `stopScheduler` (function), `shouldFire` (function), `tickForTests` (function), `makeReminder` (function)
- emits: —
- handles: —
- i18n: `app.name`, `fasting.remindBody`, `fasting.remindTitle`, `home.dailyProgress`, `prayer.`, `prayer.timeFor`, `preset.dailyVerseBody`, `preset.dailyVerseLabel`, `preset.jumuahBody`, `preset.jumuahTitle`, `ramadan.alertIftarBody`, `ramadan.alertIftarTitle`, `ramadan.alertSuhoorBody`, `ramadan.alertSuhoorTitle`, `zakat.fitrReminderBody`, `zakat.fitrReminderTitle`, `zakat.hawlAlertBody`, `zakat.hawlAlertTitle`
- routes: —

### `js/services/player.js`

job: The full-surah audio engine behind the persistent player bar. One <audio> element for the whole app. Resolution order for a track: 1. offline copy in the audio IndexedDB (works with zero network),

- exports: `prefetchTrack` (function), `onPlayerPatch` (function), `onTrackEnded` (function), `onPlayerError` (function), `onPlayingStateChange` (function), `setAudioFetcher` (function), `resetPlayerForTests` (function), `play` (function), `toggle` (function), `pause` (function), `seek` (function), `seekBy` (function), `setMuted` (function), `isMuted` (function), `setRate` (function), `setVolume` (function), `userVolume` (function), `armSleepTimer` (function), `clearSleepTimer` (function), `sleepSnapshot` (function), `onSleepTick` (function), `_sleepTickForTests` (function), `stop` (function), `currentSrc` (function), `duration` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/prayerSound.js`

job: A handful of distinct, named alert tones synthesized with the Web Audio API (no bundled audio files needed/available). Used for prayer-time alerts and available as a "Test sound" preview in Settings.

- exports: `isQuietNow` (function), `effectiveAdhanVolume` (function), `SOUND_IDS` (const), `playSound` (function), `ADHAN_MODES` (const), `BUNDLED_ADHAN_URL` (const), `resolveAlertSource` (function), `refreshCustomAdhanFlags` (function), `customAdhanFlags` (function), `onAdhanStart` (function), `stopAdhan` (function), `startAdhan` (function), `playAlert` (function), `previewAlert` (function), `validateAdhanFile` (re-export), `looksLikeAudio` (re-export)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/recitation.js`

job: Shared verse-audio playback for streaming verse-by-verse Qur'an recitation from a public CDN (see config.js quranAudioUrl). Nothing plays without an explicit tap; nothing is proxied through this app'…

- exports: `onPreloadSample` (function), `setMuted` (function), `isMuted` (function), `onPlaybackChange` (function), `onPlaybackError` (function), `offPlaybackError` (function), `onPlaybackEnded` (function), `offPlaybackEnded` (function), `lastPlaySwapped` (function), `prunePool` (function), `preload` (function), `play` (function), `stop` (function), `pause` (function), `resume` (function), `hasEnded` (function), `setVolume` (function), `setPlaybackRate` (function), `isPlaying` (function), `currentlyPlayingKey` (function), `configureDriver` (function), `driverPlay` (function), `driverStop` (function), `driverSetVolume` (function), `driverSetRate` (function), `driverPause` (function), `driverResume` (function), `driverHasEnded` (function), `driverOnEnded` (function), `driverOnError` (function), `driverOffEnded` (function), `driverOffError` (function), `driverPreload` (function), `resetRecitationForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/shareCard.js`

job: Renders a dua / adhkar as a beautiful shareable image on a <canvas> — the feature people expect from a devotional app: send the words themselves, styled like the app, not a bare screenshot.

- exports: `wrapText` (function), `tint` (function), `renderDuaCardCanvas` (function), `cardFilename` (function), `generateCardBlob` (function), `downloadBlob` (function), `buildAyahCardPayload` (function), `ayahCardFilename` (function), `renderAyahCardCanvas` (function), `generateAyahCardBlob` (function)
- emits: —
- handles: —
- i18n: `content.reviewPending`
- routes: —

### `js/services/soundDesign.js`

job: Phase C (v3.14) — the optional, off-by-default soft sounds that pair with physical actions in the app (the Tier-2 "subtle sound design" item): • a page-turn for the Mushaf flip — a short filtered noi…

- exports: `_resetForTests` (function), `playPageTurn` (function), `playKhatmaChime` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/speech.js`

job: Thin wrapper around window.speechSynthesis for an optional "listen" action on cards. Entirely best-effort: many platforms lack an Arabic voice, in which case we fall back to reading the transliterati…

- exports: `isSupported` (function), `speakItem` (function), `stop` (function), `isSpeaking` (function), `isSpeakingItem` (function), `warmVoices` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/surahPlayback.js`

job: Continuous surah recitation: play a surah verse-by-verse with automatic advance — the "listen to the whole surah and follow along" mode. Closes the last Critical TODO item; works in BOTH reading mode…

- exports: `SLEEP_TIMER_CHOICES` (re-export), `nextAyah` (function), `ayahKey` (function), `verseAudioCandidates` (function), `verseDownloadCandidates` (function), `resolveQueueItem` (function), `queueSignature` (function), `normalizeQueue` (function), `REPEAT_CYCLE` (const), `normalizeRepeat` (function), `nextRepeat` (function), `LOOP_CYCLE` (const), `normalizeLoop` (function), `nextLoop` (function), `VERSE_RATES` (const), `normalizeSpeed` (function), `nextSpeed` (function), `consumeLastFinish` (function), `ECHO_PAUSE_MIN_MS` (const), `ECHO_PAUSE_MAX_MS` (const), `ECHO_PAUSE_DEFAULT_MS` (const), `ECHO_PAUSE_CHOICES` (const), `MAX_LOOKAHEAD` (const), `MIN_LOOKAHEAD` (const), `SEED_LOOKAHEAD` (const), `ewmaUpdate` (function), `lookaheadFor` (function), `smoothK` (function), `notePreloadSample` (function), `resetPlaybackNetStatsForTests` (function), `normalizeEchoPause` (function), `armSleepTimer` (function), `clearSleepTimer` (function), `_expireSleepForTests` (function), `sleepSnapshot` (function), `currentReciterId` (function), `pause` (function), `resume` (function), `peekNextUrl` (function), `peekNextTriples` (function), `computeWarmTriples` (function), `isActive` (function), `snapshot` (function), `start` (function), `setContinuous` (function), `setListenRepeat` (function), `setLoop` (function), `setSpeed` (function), `setBaseVolume` (function), `setReciter` (function), `setReciterB` (function), `setCompare` (function), `stop` (function), `setFollow` (function), `follow` (function), `setRepeat` (function), `skip` (function), `onAyahChange` (function), `onError` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/services/tasbih.js`

job: All counting / cycle-completion logic in one place, used both by the per-card counter (in Focus Mode / library cards) and the standalone Tasbih screen. No DOM access here — the renderer calls into th…

- exports: `increment` (function), `wasJustCompleted` (function), `reset` (function), `setTarget` (function), `getCounter` (function), `playTick` (function)
- emits: —
- handles: —
- i18n: `a11y.counterComplete`, `a11y.counterProgress`
- routes: —

## ui

_dumb chrome primitives: toasts, modals, cards, shells._

### `js/ui/calendarModals.js`

job: Modal content builders for the calendar's day-detail view and the add/edit note form (recurrence: once / daily / every-N-days / range / weekly / monthly / yearly / Hijri-monthly / White Days).

- exports: `BOUNDED_RECURRENCE` (const), `buildDayDetail` (function), `buildNoteForm` (function)
- emits: `calendar-delete-note`, `calendar-edit-note`, `calendar-new-note`, `modal-close`
- handles: —
- i18n: `calendar.addNote`, `calendar.everyNDays`, `calendar.noNotes`, `calendar.noteBody`, `calendar.noteTitle`, `calendar.recurDaily`, `calendar.recurIntervalSummary`, `calendar.recurOnce`, `calendar.recurrence`, `calendar.setReminder`, `calendar.untilDate`, `calendar.untilDateOptional`, `common.delete`, `editor.cancel`, `editor.edit`, `editor.save`, `reminder.time`
- routes: —

### `js/ui/card.js`

job: The one card template used everywhere an item appears: library lists, search results, favorites, collections, and Focus Mode. Fields that are empty for a given item are simply omitted — nothing rende…

- exports: `disclosureHTML` (function), `cardHTML` (function), `miniCardHTML` (function)
- emits: `byheart-reveal`, `byheart-review`, `counter-tap`, `navigate`, `open-card-menu`, `open-focus`, `play-dhikr-audio`, `toggle-favorite`, `toggle-speech`
- handles: —
- i18n: `card.completedTimes`, `card.details`, `card.more`, `card.narratedBy`, `card.openFocus`, `card.virtue`, `content.fieldCategory`, `content.fieldGrade`, `content.fieldNotes`, `content.fieldReference`, `content.fieldReferenceNotes`, `content.fieldRepetitions`, `content.fieldReview`, `content.fieldTitle`, `content.fieldTranslation`, `content.fieldTranslit`, `content.reviewPending`, `hifz.again`, `hifz.easy`, `hifz.good` (+5 more)
- routes: `view:category`

### `js/ui/emptyState.js`

job: Phase C (v3.14) — the shared empty-state builder. Every "nothing here yet" surface gets the same treatment: a soft icon medallion, a title that names what is empty, one short hint, and — where a next…

- exports: `emptyStateHTML` (function), `loadErrorStateHTML` (function), `notFoundStateHTML` (function)
- emits: `navigate`, `retry-load`
- handles: —
- i18n: `common.goHome`, `common.loadFailed`, `common.notFoundHint`, `common.retry`
- routes: `#/home`, `view:home`

### `js/ui/menus.js`

job: HTML builders for the small modal-hosted menus used throughout the app: the per-card "more" action sheet, the add-to-collection picker, and a generic yes/no confirmation dialog.

- exports: `buildCardMenu` (function), `buildCollectionPicker` (function), `buildMovePicker` (function), `buildConfirm` (function), `buildTextPrompt` (function)
- emits: `collection-picker-toggle`, `copy-item`, `create-collection-inline`, `create-collection-inline-move`, `modal-close`, `move-to-collection`, `open-collection-picker`, `share-item`, `toggle-speech` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `card.addToCollection`, `card.copy`, `card.listen`, `card.more`, `card.share`, `collections.empty`, `collections.new`, `common.cancel`, `common.confirm`, `common.save`, `favorites.moveTo`
- routes: —

### `js/ui/missingData.js`

job: (v5.17.53, merged-plan item 6) the ONE honest-absence pattern. Fragments it unifies (all presentation, no data, no behaviour): grades.js Unknown chip · emptyState.js loadError/notFound states ·

- exports: `MISSING_DATA_KINDS` (const), `missingDataKeyFor` (function), `missingDataHTML` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/ui/modal.js`

job: A single reusable modal/dialog host mounted once in index.html (#modal-root). Views call openModal(html) to show contextual UI (card menu, collection picker, confirmation dialogs, the editor form) wi…

- exports: `openModal` (function), `closeModal` (function), `cycleTabFocus` (function), `isModalOpen` (function), `getModalGeneration` (function), `openLazyModal` (function)
- emits: `modal-close`, `modal-close-overlay`
- handles: —
- i18n: `common.close`, `common.error`
- routes: —

### `js/ui/readingTokens.js`

job: one-shot reading-animation tokens. (v5.2.16) The neutral home for the single-use transients that used to live as module state in views/mushafReader.js: the page-flip direction

- exports: `setFlipDirection` (function), `consumeFlipDirection` (function), `setFullscreenAnim` (function), `consumeFullscreenAnim` (function), `consumeMushafTarget` (function), `setMushafTarget` (function), `clearMushafTarget` (function), `resetReadingTokensForTests` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/ui/recitationConsole.js`

job: THE recitation console (Blueprint E step 1). The fullscreen Mushaf bar, the immersive reader bar, and the player bar rendered the same 13 recitation controls from three copy-pasted builders

- exports: `reciterShortLabel` (function), `REPEAT_CYCLE_UI` (const), `LOOP_CYCLE_UI` (const), `SPEED_CYCLE_UI` (const), `consoleSnapshot` (function), `recitationChipsHTML` (function), `recitationEchoHTML` (function)
- emits: `audio-mute-toggle`, `recite-pause-toggle` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.ayahNext`, `audio.ayahPrev`, `audio.chooseReciter`, `audio.compare`, `audio.compareMode`, `audio.compareSwap`, `audio.echo`, `audio.echoMode`, `audio.echoNeedsRepeat`, `audio.follow`, `audio.listen`, `audio.listenMode`, `audio.loop`, `audio.loopNext`, `audio.modeSurah`, `audio.moreSettings`, `audio.reciteStop`, `audio.repeatNext`, `audio.sessionProgress`, `audio.sleepTimer` (+6 more)
- routes: —

### `js/ui/shell.js`

job: The persistent app shell: top bar (hamburger, title, search shortcut, theme toggle) and a SEVEN-SECTION navigation (IA-7, v5.17.61). - Desktop (>= 960px): a side rail with seven primary sections. Wor…

- exports: `NAV_GROUPS` (function), `INTERNAL_ONLY_ROUTES` (const), `drawerSectionsHTML` (function), `languageToggleHTML` (function), `renderTopBar` (function), `renderNav` (function)
- emits: `go-back`, `nav-drawer-close`, `nav-toggle`, `navigate`, `open-palette`, `quick-language-toggle`, `quick-theme-toggle` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `a11y.languageToggle`, `a11y.mainNav`, `a11y.navToggle`, `a11y.themeToggle`, `app.name`, `common.close`, `nav.back`, `nav.main`, `nav.overview`, `palette.open`
- routes: `#/prayer`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.KIDS`, `VIEWS.OFFLINE`, `VIEWS.SETTINGS`, `VIEWS.TASBIH`, `VIEWS.ZAKAT`

### `js/ui/skeleton.js`

job: Phase C (v3.14) — shape-mirroring shimmer placeholders for the app's lazily-loaded surfaces (surah docs, hadith books, tafsir volumes, the reciters catalog, mushaf pages). Before this, every one of t…

- exports: `skeletonLines` (function), `skeletonSurahList` (function), `skeletonAyahCards` (function), `skeletonReciterRows` (function), `skeletonHadithCard` (function), `skeletonMushafPage` (function)
- emits: —
- handles: —
- i18n: `common.loading`
- routes: —

### `js/ui/toast.js`

job: Brief, non-blocking status messages ("Copied to clipboard", "Saved"). Mounted into #toast-root (see index.html). Auto-dismisses; also announced via aria-live for screen readers.

- exports: `showToast` (function)
- emits: —
- handles: —
- i18n: —
- routes: —

### `js/ui/viewSheet.js`

job: The per-view "⋯" menu: one small icon button in a view's header, one modal-hosted grouped sheet behind it — the same visual language and interaction model as the Mushaf's More sheet, generalized so e…

- exports: `viewMenuButton` (function), `sheetRow` (function), `sheetLinkRow` (function), `sheetToggleRow` (function), `viewSheet` (function)
- emits: `navigate`, `toggle-setting`, `view-menu` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: —
- routes: —

## views

_pure state→HTML templates + their pure helpers._

### `js/views/about.js`

job: The About page answers what a person actually asks when they open it: what is this, what can it do for me, does it respect me (privacy), where does the content come from, and how do I keep it (offlin…

- exports: `renderAbout` (function)
- emits: `navigate`
- handles: —
- i18n: `about.builtWith`, `about.capabilities`, `about.guide`, `about.guideHint`, `about.hadithSources`, `about.mission`, `about.offline`, `about.offlineBody`, `about.privacy`, `about.privacyBody`, `about.scopeSunni`, `about.sources`, `about.title`, `about.verifyNote`, `about.version`, `about.whatItIs`, `about.whatItIsBody`, `content.aiAssistance`, `content.reviewPendingLong`
- routes: —

### `js/views/ambient.js`

job: Ambient / kiosk display: a big-text, chrome-free nightstand view. Four display modes (settings.prayer.ambientMode, switched in place): the live countdown to the next prayer, a full-screen verse of th…

- exports: `renderAmbient` (function)
- emits: `ambient-mode`, `navigate`, `recite-ayah-next`, `recite-ayah-prev`, `recite-pause-toggle`, `recite-sleep-cycle`
- handles: —
- i18n: `ambient.displayMode`, `ambient.emptyCorpus`, `ambient.exit`, `ambient.lampHint`, `ambient.lampNoSession`, `ambient.lampNow`, `ambient.lampTransport`, `ambient.modeLamp`, `ambient.title`, `audio.ayahNext`, `audio.ayahPrev`, `audio.sleepTimer`, `content.reviewPending`, `nav.prayer`, `prayer.`, `prayer.in`, `prayer.locationNeeded`, `prayer.next`, `units.h`, `units.m`
- routes: `VIEWS.PRAYER`

### `js/views/audioManager.js`

job: Reciters & offline downloads: - searchable catalog of 312 mushafs (mp3quran + quranicaudio) + the user's custom reciters,

- exports: `resumeBannerHTML` (function), `renderAudio` (function)
- emits: `audio-batch-dismiss`, `audio-batch-stop`, `audio-delete-moshaf`, `audio-delete-surah`, `audio-download-all`, `audio-play-moshaf`, `audio-remove-custom`, `audio-select-moshaf`, `playlist-create`, `playlist-delete`, `playlist-move-item`, `playlist-play`, `playlist-remove-item`, `playlist-rename`, `set-setting` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.batchResume`, `audio.batchResumeGo`, `audio.batchStop`, `audio.customHint`, `audio.customName`, `audio.customNamePh`, `audio.customServer`, `audio.customTitle`, `audio.deleteAll`, `audio.deleteFile`, `audio.downloadAll`, `audio.downloadFile`, `audio.downloadMissing`, `audio.fileModeNote`, `audio.loopMode`, `audio.loopNeedsSession`, `audio.loopOnce`, `audio.moreResults`, `audio.noResultsHint`, `audio.note` (+33 more)
- routes: —

### `js/views/ayahStudy.js`

job: the per-ayah detail modal: Arabic, translation, play/copy/share/study actions, hifz row, tafsir tab (extracted from views/mushafReader.js, Blueprint E step 2).

- exports: `buildStudyHadithSection` (function), `buildMushafAyahDetail` (function)
- emits: `ayah-share`, `hifz-ayah-mark`, `hifz-mark`, `hifz-review`, `mushaf-copy-ayah`, `mushaf-open-in-study`, `mushaf-toggle-bookmark`, `navigate`, `play-ayah`, `practice-this-ayah`, `surah-play`
- handles: —
- i18n: `audio.reciteFromHere`, `card.copy`, `hifz.markMemorized`, `mushaf.listen`, `mushaf.openInStudy`, `practice.thisAyah`, `quran.shareAyah`, `study.hadithNone`, `study.hadithNote`, `study.hadithScope`, `study.hadithTitle`, `study.openHadith`, `study.title`
- routes: `VIEWS.HADITH`

### `js/views/backupSummary.js`

job: (v5.17.59, merged-plan item 12) the ONE unified offline+backup summary card: a shared view partial (like installRow.js), because ui/ may not import services/ or domain/ and this card needs both

- exports: `MAX_SNAPSHOT_BYTES` (const), `cleanSnapshotBytes` (function), `describeBackupSummary` (function), `backupSummaryHTML` (function)
- emits: `export-backup`, `import-backup`, `navigate`, `restore-auto-backup`
- handles: —
- i18n: `backup.openData`, `backup.openOffline`, `backup.summarySize`, `backup.summaryTitle`, `settings.dataAutoLine`, `settings.dataAutoNever`, `settings.dataBackupNever`, `settings.dataBackupStale`, `settings.dataLastBackupDays`, `settings.dataLastBackupNever`, `settings.exportBackup`, `settings.importBackup`, `settings.restoreAutoBackup`
- routes: `VIEWS.OFFLINE`, `VIEWS.SETTINGS`

### `js/views/calendar.js`

job: A single navigable Gregorian month grid where every cell shows its Hijri equivalent too (day number, and month name at the seam where the Hijri month rolls over) — genuinely "dual calendar" without t…

- exports: `renderCalendar` (function)
- emits: `calendar-open-day`, `fasting-cycle-remind-time`, `fasting-toggle-category`, `fasting-toggle-remind`, `navigate`, `ramadan-enable-notifications`, `ramadan-toggle-fast`
- handles: —
- i18n: `calendar.ah`, `calendar.estimateNote`, `calendar.events`, `calendar.gregorian`, `calendar.hasNotes`, `calendar.nextMonth`, `calendar.prevMonth`, `calendar.today`, `calendar.whiteDays`, `fasting.count`, `fasting.countYear`, `fasting.fasted`, `fasting.history`, `fasting.markFasted`, `fasting.next`, `fasting.noneUpcoming`, `fasting.off`, `fasting.on`, `fasting.remind`, `fasting.remindTime` (+6 more)
- routes: `view:calendar`

### `js/views/category.js`

job: (v4.5.2) The category view now owns its content management: a Manage toggle in the header turns on per-card rows — reorder, hide, re-target, reset — plus, for custom sections, edit / duplicate / dele…

- exports: `renderCategory` (function)
- emits: `category-top`, `content-delete-category`, `content-delete-item`, `content-duplicate-item`, `content-edit-category`, `content-edit-item`, `content-hide-item`, `content-manage-toggle`, `content-move-item`, `content-new-item`, `content-reset-category`, `content-restore-item`, `content-schedule`, `content-set-target`, `content-target-step`, `content-unhide-item`, `navigate`, `session-start`
- handles: —
- i18n: `byheart.hint`, `category.backToTop`, `category.progressToday`, `category.sessionStart`, `collections.itemCount`, `common.itemList`, `common.notFoundCategory`, `content.done`, `content.editSection`, `content.hiddenCount`, `content.hideItem`, `content.manageHint`, `content.moveDown`, `content.moveUp`, `content.order`, `content.resetProgress`, `content.restoreItem`, `content.target`, `content.targetDown`, `content.targetFor` (+8 more)
- routes: `VIEWS.LIBRARY`

### `js/views/certificate.js`

job: Printable/exportable memorization certificate. Rendered from the SAME milestone computation as the badges (domain/milestones.js) so paper and progress can never disagree. Print CSS (cards.css, @media…

- exports: `renderCertificate` (function)
- emits: `certificate-print`, `navigate`
- handles: —
- i18n: `certificate.back`, `certificate.goRead`, `certificate.juz`, `certificate.line2`, `certificate.nothingYet`, `certificate.nothingYetHint`, `certificate.presentedTo`, `certificate.print`, `certificate.printHint`, `certificate.surahCount`, `certificate.title`, `certificate.unnamed`, `certificate.wholeQuran`
- routes: `VIEWS.MUSHAF`

### `js/views/checklist.js`

job: A private, local-only daily tracker for the five prayers plus morning/ evening adhkar and a Qur'an check-in. Deliberately simple: it's a gentle reminder and a way to see the week at a glance, not a s…

- exports: `renderChecklist` (function)
- emits: `checklist-toggle`, `navigate`
- handles: —
- i18n: `checklist.completeCalm`, `checklist.dayStreak`, `checklist.groupAdhkar`, `checklist.groupPrayer`, `checklist.historyTitle`, `checklist.progress`, `checklist.subtitle`, `checklist.today`, `home.panel.continue`, `you.myAdhkar`
- routes: `VIEWS.LIBRARY`

### `js/views/collection.js`

job: A single collection: rename + share + delete in the header, bulk import of missing favorites, and per-item reorder controls (up/down) alongside the cards. Reorder hides while filtering — moving filte…

- exports: `buildCollectionShareText` (function), `renderCollection` (function)
- emits: `collection-add-favorites`, `collection-move`, `delete-collection`, `navigate`, `rename-collection`, `share-collection`
- handles: —
- i18n: `collections.addFavorites`, `collections.delete`, `collections.empty`, `collections.itemCount`, `collections.rename`, `collections.searchPh`, `collections.share`, `common.notFoundCollection`, `content.reviewPending`, `nav.collections`, `search.noResults`, `settings.moveDown`, `settings.moveUp`
- routes: `VIEWS.COLLECTIONS`

### `js/views/collections.js`

job: (header names file only — no job line)

- exports: `liveCollectionCount` (function), `renderCollections` (function)
- emits: `create-collection`, `create-collection-suggested`, `navigate`
- handles: —
- i18n: `collections.create`, `collections.empty`, `collections.emptyHint`, `collections.itemCount`, `collections.suggestions`, `nav.collections`
- routes: `VIEWS.COLLECTION`

### `js/views/editor.js`

job: The content editor: browse/create/edit/delete custom libraries, categories, and items. Item/category creation happens in a modal (see buildItemForm / buildCategoryForm) so the editor screen itself st…

- exports: `renderEditor` (function), `buildItemForm` (function), `buildCategoryForm` (function), `buildLibraryForm` (function), `buildScheduleForm` (function)
- emits: `editor-delete-category`, `editor-delete-item`, `editor-duplicate-item`, `editor-edit-item`, `editor-new-category`, `editor-new-item`, `editor-new-library`, `modal-close`
- handles: —
- i18n: `content.reviewPending`, `editor.builtinNote`, `editor.cancel`, `editor.delete`, `editor.duplicate`, `editor.edit`, `editor.emptyState`, `editor.fieldArabic`, `editor.fieldAttribution`, `editor.fieldAttributionPlaceholder`, `editor.fieldBook`, `editor.fieldChapter`, `editor.fieldColor`, `editor.fieldCustomGrade`, `editor.fieldDescriptionEn`, `editor.fieldGrade`, `editor.fieldGrading`, `editor.fieldHadithNumber`, `editor.fieldIcon`, `editor.fieldNarrator` (+21 more)
- routes: —

### `js/views/favorites.js`

job: The flat favorites list, sortable (recent / alpha / most-read) with per-row move-to-collection and a confirmed unfavorite-all. Sort rides on ?sort= (replaceGo — no history spam, deep-linkable, unkn…

- exports: `FAVORITE_SORTS` (const), `favoriteSortFor` (function), `sortFavorites` (function), `renderFavorites` (function)
- emits: `favorites-sort`, `navigate`, `open-move-picker`, `unfavorite-all`
- handles: —
- i18n: `favorites.empty`, `favorites.emptyAction`, `favorites.emptyHint`, `favorites.moveTo`, `favorites.searchPh`, `favorites.sortBy`, `favorites.unfavoriteAll`, `nav.favorites`, `search.noResults`
- routes: `VIEWS.LIBRARY`

### `js/views/focus.js`

job: Full-bleed, distraction-free reading/counting mode for one item at a time, with previous/next navigation through the rest of its category.

- exports: `focusEnterClass` (function), `renderFocus` (function)
- emits: `byheart-reveal`, `byheart-review`, `counter-tap`, `focus-exit`, `focus-reset`, `navigate`, `open-card-menu`, `play-dhikr-audio`, `toggle-favorite`, `toggle-speech`
- handles: —
- i18n: `card.completedTimes`, `card.favorite`, `card.more`, `card.narratedBy`, `category.progressToday`, `collections.itemCount`, `common.notFoundItem`, `content.reviewPending`, `focus.exit`, `focus.next`, `focus.pickerHint`, `focus.pickerTitle`, `focus.previous`, `focus.progress`, `focus.reset`, `focus.sessionComplete`, `focus.tapToCount`, `hifz.again`, `hifz.easy`, `hifz.good` (+7 more)
- routes: `VIEWS.FOCUS`, `VIEWS.LIBRARY`

### `js/views/garden.js`

job: The Garden — the growth view driven by a lifetime of counted dhikr (see domain/garden.js). Every counted recitation anywhere in the app is a seed; the plant on this screen is those seeds made visible.

- exports: `renderGarden` (function)
- emits: `navigate`
- handles: —
- i18n: `garden.finalForm`, `garden.growingToward`, `garden.harvest`, `garden.progressLabel`, `garden.readsCount`, `garden.seeStatistics`, `garden.seedsPlanted`, `garden.subtitle`, `garden.timeline`, `you.growth`
- routes: `VIEWS.STATISTICS`

### `js/views/hadith.js`

job: The Ahadeeth screens — one module, two faces: • no params.id → the book grid (the library's front door) • params.id set → the book reader: chapter filter, in-book search,

- exports: `renderHadith` (function)
- emits: `hadith-book-move`, `hadith-delete-book`, `hadith-grid-next`, `hadith-grid-prev`, `hadith-hide-book`, `hadith-index-all`, `hadith-page-next`, `hadith-page-prev`, `hadith-retry`, `hadith-retry-index`, `hadith-section`, `hadith-unhide-item`, `navigate` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `common.next`, `common.prev`, `common.retry`, `content.hiddenBanners`, `content.hiddenCount`, `content.hideSection`, `content.moveDown`, `content.moveUp`, `editor.delete`, `hadith.aboutBook`, `hadith.allChapters`, `hadith.author`, `hadith.backToLibrary`, `hadith.bookDetails`, `hadith.bookmarked`, `hadith.contents`, `hadith.coverage`, `hadith.grading`, `hadith.indexAll`, `hadith.indexAllHint` (+20 more)
- routes: `VIEWS.HADITH`

### `js/views/hadithCard.js`

job: shared hadith card builders. (v5.2.18) Extracted from views/hadith.js so Home can render its "Hadith of the day" card without statically importing the whole

- exports: `hadithCardHTML` (function), `dailyHadithCardHTML` (function)
- emits: `hadith-bookmark`, `hadith-copy`, `hadith-daily-shuffle`, `hadith-hide-item`, `hadith-mem-reveal`, `hadith-mem-review`, `hadith-memorize`, `hadith-note-open`, `hadith-share`, `hadith-speak`, `navigate`
- handles: —
- i18n: `common.copy`, `content.hideItem`, `hadith.cardListen`, `hadith.cardShare`, `hadith.chapter`, `hadith.collection`, `hadith.dailyShuffle`, `hadith.dailyTitle`, `hadith.details`, `hadith.gradeLabel`, `hadith.narrator`, `hadith.note`, `hadith.openBook`, `hadith.reference`, `hifz.again`, `hifz.easy`, `hifz.good`, `hifz.hard`, `hifz.memorizedBadge`, `hifz.recalled` (+2 more)
- routes: `VIEWS.HADITH`

### `js/views/home.js`

job: (header names file only — no job line)

- exports: `quickTilesHTML` (function), `worshipTodayCardHTML` (function), `resumePanelHTML` (function), `nudgeCardHTML` (function), `resolveBrowserWindow` (function), `prayerRibbonHTML` (function), `adhkarWindowLabel` (function), `rankBrowserDocuments` (function), `docCorpusCount` (function), `rankBrowserCategories` (function), `homeTodayStripHTML` (function), `homeInvitesHTML` (function), `adhkarBrowserHTML` (function), `renderHome` (function), `hifzReviewCardHTML` (function), `reviewDigestCardHTML` (function), `buildSadaqahEditor` (function)
- emits: `home-invite-dismiss`, `modal-close`, `mushaf-open-at-surah`, `navigate`, `nudge-dismiss`, `practice-start`, `quick-tile`, `sadaqah-log`, `sadaqah-open-editor`, `sadaqah-remove`
- handles: —
- i18n: `app.name`, `app.tagline`, `calendar.estimateNote`, `category.progressToday`, `certificate.title`, `checklist.today`, `collections.itemCount`, `common.am`, `common.delete`, `common.pm`, `editor.cancel`, `editor.save`, `hifz.availableHint`, `hifz.cardTitle`, `hifz.memorizedBadge`, `hifz.openLedger`, `hifz.suggestHint`, `home.blankPage`, `home.browserSub`, `home.browserTitle` (+80 more)
- routes: `VIEWS.CALENDAR`, `VIEWS.CATEGORY`, `VIEWS.CERTIFICATE`, `VIEWS.CHECKLIST`, `VIEWS.COLLECTION`, `VIEWS.COLLECTIONS`, `VIEWS.FAVORITES`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.LIBRARY`, `VIEWS.MOOD`, `VIEWS.MUSHAF`, `VIEWS.PRAYER`, `VIEWS.QUIZ`, `VIEWS.QURAN`, `VIEWS.RAMADAN`, `VIEWS.SETTINGS`, `VIEWS.STATISTICS`, `VIEWS.TAJWEED_COURSE`, `VIEWS.TASBIH`, `VIEWS.ZAKAT`

### `js/views/installRow.js`

job: The one persistent install row, shared by About and Settings (and its copy reused by the onboarding step body): title, honest status, and the action this platform actually has — the browser dialog wh…

- exports: `liveUA` (function), `liveInstallPlatform` (function), `installRowHTML` (function)
- emits: `install-later`, `install-reoffer`, `onboarding-install`
- handles: —
- i18n: `onboarding.install`, `onboarding.installAction`, `onboarding.installHint`, `onboarding.installLater`, `onboarding.installReoffer`, `sw.shellReady`
- routes: —

### `js/views/journal.js`

job: The private journal — duas and weekly reflections, two tabs in one view. Everything is device-local; export hands the user a plain-text file they own. Friday shows the week's reflection prompt at the…

- exports: `JOURNAL_PAGE_SIZE` (const), `clampJournalPage` (function), `journalMonthFooter` (function), `renderJournal` (function), `REFLECTION_PROMPTS` (re-export)
- emits: `dua-edit-save`, `dua-remove`, `dua-save`, `dua-toggle-answered`, `journal-edit-cancel`, `journal-edit-open`, `journal-export`, `journal-page`, `navigate`, `reflection-edit-save`, `reflection-remove`, `reflection-save`
- handles: —
- i18n: `common.cancel`, `common.delete`, `common.next`, `common.prev`, `common.save`, `editor.edit`, `journal.answered`, `journal.duaEmpty`, `journal.duaPlaceholder`, `journal.export`, `journal.markAnswered`, `journal.monthStats`, `journal.newDua`, `journal.pageStatus`, `journal.reflectionEmpty`, `journal.saveDua`, `journal.saveReflection`, `journal.searchPh`, `journal.subtitle`, `journal.tabDuas` (+5 more)
- routes: `#/journal`, `view:journal`

### `js/views/khatma.js`

job: the Khatma (Qur'an completion) tracker: progress panel, plan editor, history (extracted from views/mushafReader.js, Blueprint E step 2). Pure string templates over domain/khatma.js status.

- exports: `buildMushafTrack` (function), `juzMilestoneRow` (function), `buildKhatmaPlanForm` (function)
- emits: `khatma-clear-plan`, `khatma-open-plan`, `khatma-ramadan-preset`, `mushaf-reset-progress`
- handles: —
- i18n: `khatma.ahead`, `khatma.behind`, `khatma.behindSchedule`, `khatma.clearPlan`, `khatma.completeBanner`, `khatma.dailyLabel`, `khatma.deadline`, `khatma.history`, `khatma.juzDone`, `khatma.lastDays`, `khatma.lastDaysOne`, `khatma.neededPerDay`, `khatma.onTrack`, `khatma.pace`, `khatma.planHint`, `khatma.planTitle`, `khatma.projected`, `khatma.ramadanPreset`, `khatma.ramadanPresetHint`, `khatma.save` (+7 more)
- routes: —

### `js/views/kids.js`

job: Kids mode home: big tiles, short surahs, plain count. Degamified (v5.17.58, merged-plan item 11): no points, no stars, no levels, no week chart, no per-surah breakdown, no erase path. A calm

- exports: `KIDS_SURAHS` (re-export), `renderKids` (function)
- emits: `kids-exit-hold`, `kids-quiz-answer`, `kids-quiz-exit`, `kids-quiz-start`, `navigate`, `surah-play`
- handles: —
- i18n: `kids.exit`, `kids.exitHint`, `kids.heard`, `kids.heardHint`, `kids.hello`, `kids.listen`, `kids.listenHint`, `kids.quiz`, `kids.quizAgain`, `kids.quizClose`, `kids.quizHint`, `kids.quizMiss`, `kids.quizQuestion`, `kids.quizStart`, `kids.quizWin`, `kids.tasbih`, `kids.tasbihHint`, `kids.title`
- routes: `VIEWS.TASBIH`

### `js/views/library.js`

job: the Azkar section (IA-7, v5.17.61). Reading mode IS the adhkar browser moved out of Home (same component, views/home.js adhkarBrowserHTML — ranked tiles, mood row, invitations,

- exports: `renderLibrary` (function)
- emits: `confirm-content-restore-library`, `content-delete-category`, `content-delete-library`, `content-edit-category`, `content-edit-library`, `content-hide-category`, `content-hide-library`, `content-manage-toggle`, `content-move-category`, `content-move-library`, `content-new-category`, `content-restore-library`, `content-schedule`, `content-unhide-category`, `content-unhide-library`, `library-field-toggles`, `library-jump`, `navigate`
- handles: —
- i18n: `collections.itemCount`, `content.done`, `content.editBanner`, `content.editSection`, `content.fields`, `content.hiddenBanners`, `content.hiddenSections`, `content.hideBanner`, `content.hideSection`, `content.moveDown`, `content.moveUp`, `content.restoreLibrary`, `editor.delete`, `editor.emptyState`, `editor.newCategory`, `home.browserSub`, `library.jump`, `library.jumpToSection`, `moods.subtitle`, `moods.title` (+3 more)
- routes: `VIEWS.CATEGORY`, `VIEWS.MOOD`, `VIEWS.SEARCH`

### `js/views/mood.js`

job: "Browse by need" — a curated, cross-library list of duas and adhkar for how a person is feeling right now. Mirrors views/category.js's card-list pattern so every existing card affordance (count, favo…

- exports: `renderMood` (function)
- emits: `navigate`
- handles: —
- i18n: `collections.itemCount`, `editor.emptyState`, `moods.notFound`, `moods.pickerHint`, `moods.subtitle`, `moods.title`, `nav.azkar`
- routes: `VIEWS.LIBRARY`, `VIEWS.MOOD`

### `js/views/mushafBookmarks.js`

job: the Mushaf bookmark manager with folders (extracted from views/mushafReader.js, Blueprint E step 2). Pure string templates; the folder filter is explicit user choice held in

- exports: `buildMushafBookmarks` (function)
- emits: `bookmark-delete-folder`, `bookmark-filter-folder`, `bookmark-new-folder`, `modal-close`, `mushaf-jump-page`, `mushaf-remove-bookmark`
- handles: —
- i18n: `common.close`, `common.delete`, `mushaf.allBookmarks`, `mushaf.bookmarks`, `mushaf.folderEmpty`, `mushaf.folderLabel`, `mushaf.newFolder`, `mushaf.noBookmarks`, `mushaf.noBookmarksHint`, `mushaf.noteLabel`, `mushaf.notePh`, `mushaf.pageShort`, `mushaf.unfiled`
- routes: —

### `js/views/mushafJump.js`

job: the jump drawer (extracted v5.17.21) Pulled out of mushafReader.js, which had crossed its documented 800-line cap. AGENTS.md is explicit that a file near its cap gets a module, not a

- exports: `mushafRoutePage` (re-export), `buildMushafJump` (function)
- emits: `mushaf-jump-page`
- handles: —
- i18n: `mushaf.go`, `mushaf.hizb`, `mushaf.hizbApprox`, `mushaf.hizbSection`, `mushaf.jumpTo`, `mushaf.juz`, `mushaf.juzSection`, `mushaf.pageLabel`, `mushaf.surahs`
- routes: —

### `js/views/mushafPageFind.js`

job: find text within the page(s) currently visible in the Mushaf. This is deliberately a local reading aid, not a second global-search surface: it searches only resident pages in the current

- exports: `buildMushafPageFind` (function), `renderMushafPageFindResults` (function)
- emits: `mushaf-find-page-result`
- handles: —
- i18n: `mushaf.findNoMatch`, `mushaf.findOnPage`, `mushaf.findOnPageHint`, `mushaf.findOnPageInput`, `mushaf.findOnPagePlaceholder`, `mushaf.findOnPageStart`, `mushaf.pageLabelShort`
- routes: —

### `js/views/mushafPlayer.js`

job: (v5.12.0, Blueprint E part) the Mushaf's player surfaces: start-from-page math + the fullscreen file-player row. Extracted so mushafReader.js stays a page-render module (the lean pin);

- exports: `firstAyahOnPage` (function), `fileConsole` (function), `buildFullscreenConsole` (function), `pageChapters` (function), `buildMushafPlayPick` (function), `fsPlayButtonHTML` (function)
- emits: `mushaf-play-pick`, `player-close`, `player-min-toggle`, `player-next`, `player-prev`, `player-toggle`, `quran-range-open`, `surah-play`
- handles: —
- i18n: `audio.minimizeHint`, `audio.next`, `audio.player`, `audio.playerMinimize`, `audio.prev`, `audio.rangeTitle`, `audio.reciteFromHere`, `common.close`, `mushaf.playSurahHint`, `mushaf.playSurahOnPage`
- routes: —

### `js/views/mushafReader.js`

job: The 604-page Madani Mushaf, rendered the way a REAL printed mushaf looks (v4.4 "paper mushaf" redesign, modeled on the calm green/gold language of the popular Azkar/Freezikr family of apps):

- exports: `buildMushafBookmarks` (re-export), `pageChapters` (re-export), `buildMushafPlayPick` (re-export), `setFlipDirection` (re-export), `setFullscreenAnim` (re-export), `renderMushaf` (function), `fsRecitationState` (function), `buildMushafSheet` (function), `buildMushafJump` (re-export), `mushafRoutePage` (re-export), `buildMushafTrack` (re-export), `buildKhatmaPlanForm` (re-export), `buildMushafAyahDetail` (re-export)
- emits: `mushaf-ayah-tap`, `mushaf-more`, `mushaf-next`, `mushaf-open-jump`, `mushaf-open-page-find`, `mushaf-open-settings`, `mushaf-play-pick`, `mushaf-prev`, `mushaf-toggle-fullscreen`, `navigate`, `study-tray-toggle`, `surah-play`, `toggle-mushaf-pref` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.reciteStop`, `audio.reciteSurah`, `mushaf.approxMark`, `mushaf.bookOrderNote`, `mushaf.findOnPage`, `mushaf.fullscreenEnter`, `mushaf.fullscreenExit`, `mushaf.jumpTo`, `mushaf.juz`, `mushaf.more`, `mushaf.nextPage`, `mushaf.playSurahOnPage`, `mushaf.prevPage`, `mushaf.sajda`, `mushaf.sectionDisplay`, `mushaf.sectionGo`, `mushaf.sectionListen`, `mushaf.sectionStudy`, `mushaf.sectionTrack`, `mushaf.settingsTitle` (+7 more)
- routes: `VIEWS.AUDIO`, `VIEWS.HOME`, `VIEWS.MUTASHABIHAT`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`

### `js/views/mutashabihat.js`

job: Look-alike (mutashabihat) drill — a hifz practice mode for ayat that resemble each other. Pairs are COMPUTED from the Qur'an text (see domain/mutashabihat.js); nothing here is hand-curated, so the dr…

- exports: `renderMutashabihat` (function)
- emits: `mutashabihat-next`, `mutashabihat-pick`, `mutashabihat-pool`, `navigate`
- handles: —
- i18n: `mutashabihat.backToQuran`, `mutashabihat.correct`, `mutashabihat.drill`, `mutashabihat.drillHint`, `mutashabihat.incorrect`, `mutashabihat.loadingCorpus`, `mutashabihat.next`, `mutashabihat.noPairs`, `mutashabihat.partial`, `mutashabihat.pickSurah`, `mutashabihat.poolAll`, `mutashabihat.poolLapsed`, `mutashabihat.sharedRunHint`, `mutashabihat.subtitle`, `mutashabihat.title`
- routes: `VIEWS.MUSHAF`

### `js/views/offline.js`

job: the Offline library (v5.3.0): one-tap bulk download of every on-demand text corpus, per-group status, a storage meter, and a pointer to reciter-audio downloads (which stay per-reciter in Audio).

- exports: `renderOffline` (function)
- emits: `navigate`, `offline-clear-study`, `offline-download-all`, `offline-download-group`, `offline-stop`, `offline-toggle-compressed`, `offline-toggle-essentials-auto`
- handles: —
- i18n: `nav.offline`, `nav.settings`, `offline.audioBody`, `offline.audioCache`, `offline.audioOpen`, `offline.audioTitle`, `offline.cacheLimit`, `offline.cacheLimitHint`, `offline.clearStudy`, `offline.clearStudyBody`, `offline.complete`, `offline.compressedLabel`, `offline.downloadAll`, `offline.downloadGroup`, `offline.downloading`, `offline.essentialsBody`, `offline.essentialsLabel`, `offline.groupsTitle`, `offline.lead`, `offline.manageMeta` (+8 more)
- routes: `VIEWS.AUDIO`, `VIEWS.SETTINGS`

### `js/views/onboardingPanel.js`

job: The first-run wizard on Home — three decisions (language, location-or-offset, reciter), then done, with an instant skip. Step completion logic lives in domain/onboarding.js (pure, tested); this

- exports: `STEP_ICONS` (object), `onboardingPanelHTML` (function)
- emits: `navigate`, `onboarding-confirm`, `onboarding-dismiss`, `onboarding-language`, `onboarding-step`, `prayer-request-location`, `set-setting`
- handles: —
- i18n: `common.done`, `common.next`, `common.prev`, `onboarding.dismiss`, `onboarding.languageHint`, `onboarding.locationHint`, `onboarding.locationOffsetHint`, `onboarding.moreVoices`, `onboarding.progress`, `onboarding.reciterHint`, `onboarding.setManually`, `onboarding.title`, `onboarding.useDefaults`, `prayer.enableLocation`
- routes: `VIEWS.PRAYER`, `VIEWS.SETTINGS`

### `js/views/palette.js`

job: command palette ("search all things", Spotlight-style). One overlay to reach everything: navigation destinations, surahs by name/number, Quran ayahs, adhkar/duas, reciters, hadith books, and a few

- exports: `buildPaletteGroups` (function), `paletteGroupsHTML` (function), `paletteRowCount` (function), `paletteShellHTML` (function), `searchLibrary` (re-export), `searchSurahs` (re-export), `searchQuran` (re-export), `searchReciters` (re-export)
- emits: — (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `content.reviewPending`, `nav.search`, `palette.action`, `palette.ayah`, `palette.book`, `palette.hint`, `palette.journal`, `palette.library`, `palette.navigate`, `palette.reciter`, `palette.settings`, `palette.surah`, `palette.tafsir`, `search.placeholder`, `search.recent`
- routes: `VIEWS.AMBIENT`, `VIEWS.AUDIO`, `VIEWS.CALENDAR`, `VIEWS.CERTIFICATE`, `VIEWS.EDITOR`, `VIEWS.FAVORITES`, `VIEWS.FOCUS`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.JOURNAL`, `VIEWS.LIBRARY`, `VIEWS.MOOD`, `VIEWS.MUTASHABIHAT`, `VIEWS.PRAYER`, `VIEWS.QIBLA`, `VIEWS.QUIZ`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`, `VIEWS.SETTINGS`, `VIEWS.TAJWEED_COURSE`, `VIEWS.TASBIH`

### `js/views/playerBar.js`

job: The persistent full-surah player bar, rendered once a moshaf+surah is selected and docked above the bottom nav / bottom of content on desktop. Time/seek/buffered are DOM-patched by the player engine …

- exports: `renderPlayerBar` (function)
- emits: `audio-mute-toggle`, `player-close`, `player-min-toggle`, `player-next`, `player-prev`, `player-rate`, `player-repeat`, `player-seek-back`, `player-seek-fwd`, `player-sleep-cycle`, `player-toggle`, `recite-mode-ayah`, `recite-pause-toggle`, `recite-stop` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.buffering`, `audio.fileModeNote`, `audio.minimizeHint`, `audio.modeAyah`, `audio.moreSettings`, `audio.next`, `audio.offlineBadge`, `audio.player`, `audio.playerMinimize`, `audio.playerRestore`, `audio.prev`, `audio.reciteStop`, `audio.reciting`, `audio.repeat`, `audio.repeatAll`, `audio.repeatAllShort`, `audio.riwayaNote`, `audio.seek`, `audio.seekBack`, `audio.seekFwd` (+5 more)
- routes: —

### `js/views/prayer.js`

job: (v4.6.0) The Prayer page is FOCUSED: the next-prayer hero, the day's times, and the log strip. Everything that used to stack below — sunnah tracker, qada' backlog, traveler mode, adhan & alerts, calc…

- exports: `PRAYER_ICONS` (object), `alertStatusHTML` (function), `renderPrayer` (function), `sunnahPanelHTML` (function), `qadaPanelHTML` (function), `adhanPanelHTML` (function), `buildMonthModal` (function), `calcPanelHTML` (function), `profilesPanelHTML` (function)
- emits: `location-profile-apply`, `location-profile-save`, `prayer-adhan-clear`, `prayer-adhan-import`, `prayer-enable-notifications`, `prayer-log-cycle`, `prayer-manual-location`, `prayer-month-ics`, `prayer-month-nav`, `prayer-month-print`, `prayer-request-location`, `prayer-set-alert-mode`, `prayer-test-sound`, `prayer-use-city`, `qada-add`, `qada-clear-prayer`, `qada-complete`, `sunnah-toggle`, `toggle-prayer-alert`, `toggle-prayer-quiet`, `toggle-prayer-quiet-cancel`
- handles: —
- i18n: `checklist.today`, `common.am`, `common.pm`, `common.print`, `missingData.location-missing`, `nav.prayer`, `plog.bestStreak`, `plog.hint`, `plog.jamaahRate`, `plog.monthCount`, `plog.mostMissed`, `plog.rate30`, `plog.streak`, `plog.title`, `prayer.`, `prayer.addToCalendar`, `prayer.adhanBundled`, `prayer.adhanClear`, `prayer.adhanCustomSet`, `prayer.adhanImport` (+73 more)
- routes: —

### `js/views/qibla.js`

job: Finds the direction to the Kaaba from the person's location. Reuses the same location (settings.prayer.latitude/longitude) and the same request/manual-entry flow as the Prayer Times screen, so nobody…

- exports: `renderQibla` (function), `updateQiblaCompassDOM` (function)
- emits: `prayer-manual-location`, `prayer-request-location`, `qibla-enable-compass`
- handles: —
- i18n: `nav.qibla`, `prayer.enableLocation`, `prayer.locationNeeded`, `prayer.manualLocation`, `qibla.accuracy`, `qibla.bearing`, `qibla.bearingSentence`, `qibla.calibrate`, `qibla.calibrate1`, `qibla.calibrate2`, `qibla.calibrate3`, `qibla.calibrateTitle`, `qibla.cardinal.e`, `qibla.cardinal.n`, `qibla.cardinal.s`, `qibla.cardinal.w`, `qibla.declination`, `qibla.declinationModel`, `qibla.declinationNote`, `qibla.detailsTitle` (+12 more)
- routes: —

### `js/views/quiz.js`

job: A short multiple-choice quiz for memorizing the 99 Names of Allah (al-Asma al-Husna). Every question and answer is drawn verbatim from the existing asma.json library — this view only selects, shuffle…

- exports: `renderQuiz` (function)
- emits: `quiz-answer`, `quiz-direction`, `quiz-exit-link`, `quiz-library`, `quiz-next`, `quiz-practice-weak`, `quiz-review-mistakes`, `quiz-size`, `quiz-start`
- handles: —
- i18n: `content.reviewPending`, `quiz.bestScore`, `quiz.direction`, `quiz.directionArEn`, `quiz.directionEnAr`, `quiz.done`, `quiz.exit`, `quiz.intro`, `quiz.next`, `quiz.pickLibrary`, `quiz.practiceWeak`, `quiz.progress`, `quiz.reviewMistakes`, `quiz.seeResults`, `quiz.size`, `quiz.start`, `quiz.title`, `quiz.tryAgain`, `quiz.unavailable`
- routes: `VIEWS.LIBRARY`

### `js/views/quran.js`

job: The complete Qur'an: a searchable list of all 114 surahs, and a per-surah reader (Arabic + Sahih International translation). Data is fetched lazily by app.js (never at boot) and cached in state.quran…

- exports: `joinTranslitLine` (function), `hifzToolbarHTML` (function), `hifzHeatmapHTML` (function), `ayahCardMemoStats` (object), `resetAyahCardMemoForTests` (function), `renderQuran` (function), `buildAyahQuickSheet` (function)
- emits: `ayah-share`, `copy-ayah`, `hifz-level`, `hifz-mark`, `hifz-mcq-new`, `hifz-mcq-pick`, `hifz-rehide`, `hifz-review`, `hifz-test`, `hifz-toggle`, `mushaf-open-at-surah`, `navigate`, `play-ayah`, `player-min-toggle`, `quran-play-surah`, `quran-range-open`, `quran-toggle-immersive`, `quran-window-expand`, `recite-follow-toggle`, `study-tray-toggle`, `surah-play`, `tafsir-open`, `tajweed-open-settings`, `toggle-mushaf-pref` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.follow`, `audio.minimizeHint`, `audio.playerMinimize`, `audio.rangeShort`, `audio.rangeTitle`, `audio.reciteStop`, `audio.reciteSurah`, `common.copy`, `hifz.again`, `hifz.easy`, `hifz.good`, `hifz.hard`, `hifz.levelAyah`, `hifz.levelWord`, `hifz.markMemorized`, `hifz.mcqDealing`, `hifz.mcqNew`, `hifz.mcqTitle`, `hifz.memorizeMode`, `hifz.memorizedBadge` (+32 more)
- routes: `VIEWS.AUDIO`, `VIEWS.MUSHAF`, `VIEWS.MUTASHABIHAT`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.TAJWEED_COURSE`

### `js/views/ramadan.js`

job: The Ramadan & Fasting companion: a live Suhoor–Iftar countdown driven by the person's actual Fajr/Maghrib times (same solar-position engine the Prayer view uses), a 29/30-day fasting tracker, a Layla…

- exports: `plannerPanel` (function), `khatmPanel` (function), `renderRamadan` (function)
- emits: `navigate`, `prayer-manual-location`, `prayer-request-location`, `ramadan-enable-notifications`, `ramadan-planner-toggle`, `ramadan-toggle-fast`, `toggle-ramadan-alert`
- handles: —
- i18n: `nav.prayer`, `nav.zakat`, `prayer.enableLocation`, `prayer.manualLocation`, `ramadan.alertsDenied`, `ramadan.alertsNeedPermission`, `ramadan.alertsNote`, `ramadan.alertsSummary`, `ramadan.alertsTitle`, `ramadan.dayOf`, `ramadan.daysLeft`, `ramadan.daysLeftSub`, `ramadan.daysUnit`, `ramadan.enableNotifications`, `ramadan.explore`, `ramadan.fastDay`, `ramadan.fastTracker`, `ramadan.fastTrackerHint`, `ramadan.hijriNote`, `ramadan.iftarAlert` (+22 more)
- routes: `#/zakat`, `VIEWS.CATEGORY`, `VIEWS.FOCUS`, `VIEWS.MUSHAF`, `VIEWS.PRAYER`, `VIEWS.ZAKAT`

### `js/views/roots.js`

job: the root-family browser (v3.22.0). A dedicated view that shows EVERY occurrence of a Qur'anic root across the whole corpus, grouped by the word-forms it takes (the per-word

- exports: `drillHTML` (function), `renderRoots` (function)
- emits: `grammar-exit`, `grammar-grade`, `grammar-restart`, `grammar-reveal`, `grammar-start`, `navigate`, `retry-load`, `roots-expand`, `roots-jump`, `roots-page`, `roots-tab`
- handles: —
- i18n: `common.next`, `common.prev`, `common.retry`, `grammar.done`, `grammar.exit`, `grammar.hint`, `grammar.progress`, `grammar.prompt`, `grammar.restart`, `grammar.reveal`, `grammar.right`, `grammar.start`, `grammar.title`, `grammar.wrong`, `journal.pageStatus`, `nav.search`, `roots.back`, `roots.confusablesNeedCorpus`, `roots.empty`, `roots.indexStats` (+15 more)
- routes: `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.SEARCH`

### `js/views/search.js`

job: Global search: the Adhkar/Duas/Names library index (search.js) plus, since v3.6, the entire Qur'an — Uthmani Arabic (diacritic-insensitive) and the Sahih International translation — with jump-to-ayah…

- exports: `renderSearch` (function)
- emits: `clear-search-history`, `navigate`, `run-search`, `search-page`
- handles: —
- i18n: `mushaf.openInMushaf`, `mushaf.pageLabel`, `nav.search`, `search.breakdown`, `search.clearHistory`, `search.emptyHint`, `search.emptyNamed`, `search.loadingCorpus`, `search.mushafPage`, `search.next`, `search.noResults`, `search.noResultsHint`, `search.pageOf`, `search.placeholder`, `search.previous`, `search.quranResults`, `search.recent`, `search.relatedRoot`, `search.rootFamily`, `search.rootsCount` (+8 more)
- routes: `VIEWS.HADITH`, `VIEWS.MUSHAF`, `VIEWS.QURAN`, `VIEWS.ROOTS`

### `js/views/settings.js`

job: Settings reorganized into calm, purposeful sections — one panel per intent, each header carrying an icon and a one-line "what this does". New v5 sections: Counting feedback (vibration / tick sound / …

- exports: `settingsSectionIds` (function), `settingsSlugForSection` (function), `settingsSectionForSlug` (function), `openSettingsSectionFor` (function), `deferredSetupHTML` (function), `settingRow` (function), `SETTINGS_SECTIONS` (const), `SETTINGS_GROUPS` (const), `matchSettingsSection` (function), `renderSettings` (function)
- emits: `add-preset`, `add-reminder`, `backup-link-file`, `content-restore-all`, `delete-reminder`, `export-backup`, `export-plan`, `home-panel-move`, `home-panel-toggle`, `import-backup`, `import-plan`, `mushaf-set-tafsir`, `navigate`, `onboarding-reshow`, `profile-create`, `profile-delete`, `profile-switch`, `quick-tile-move`, `quick-tile-toggle`, `reset-all-data`, `restore-auto-backup`, `schedule-open-manager`, `set-setting`, `toggle-elder-mode`, `toggle-kids-mode`, `toggle-reminder`, `toggle-setting`, `verify-backup` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `audio.noSecondVoice`, `common.delete`, `editor.emptyState`, `library.sheet.restoreAll`, `nav.offline`, `onboarding.deferHint`, `onboarding.deferTitle`, `onboarding.reshow`, `preset.dailyVerse`, `preset.jumuah`, `quran.quickActions`, `schedule.manager`, `settings.accessibility`, `settings.addReminder`, `settings.appearance`, `settings.arabicFontSize`, `settings.arabicTypeface`, `settings.audioManager`, `settings.autoAdvanceFocus`, `settings.autoAdvanceFocusHint` (+73 more)
- routes: `#/offline`, `VIEWS.AUDIO`, `VIEWS.OFFLINE`

### `js/views/statistics.js`

job: (header names file only — no job line)

- exports: `todayReadingSec` (function), `formatReadingMinutes` (function), `memorizationPanel` (function), `renderStatistics` (function)
- emits: `gap-telemetry-clear`, `navigate`, `stats-heatmap-export`, `stats-heatmap-shift`, `toggle-setting`
- handles: —
- i18n: `garden.invite`, `nav.home`, `nav.statistics`, `nav.tasbih`, `quiz.start`, `review.allTime`, `review.daysActive`, `review.empty`, `review.hijriYear`, `review.kept`, `review.last90`, `review.since`, `review.streaks`, `review.subtitle`, `review.title`, `stats.activeDays`, `stats.avgPerDay`, `stats.currentStreak`, `stats.days`, `stats.detailsTitle` (+41 more)
- routes: `VIEWS.CERTIFICATE`, `VIEWS.GARDEN`, `VIEWS.HOME`, `VIEWS.MUSHAF`, `VIEWS.QUIZ`, `VIEWS.QURAN`

### `js/views/studyContext.js`

job: Shared Qur'an study context. A related study surface may be entered from an exact ayah in the Mushaf. Keep that origin in the URL so the learner can always return to the text

- exports: `studyContextOf` (function), `studyContextParams` (function), `mergeStudyContextParams` (function), `studyContextHTML` (function)
- emits: `navigate`
- handles: —
- i18n: `study.contextTitle`, `study.returnToAyah`
- routes: `VIEWS.MUSHAF`, `VIEWS.QURAN`

### `js/views/studyTray.js`

job: (v5.17.54, merged-plan item 7) the inline Qur'an study tray. Tapping an ayah's Study control renders the SAME study panel inline UNDER

- exports: `studyTrayKey` (function), `isStudyTrayOpen` (function), `buildStudyTray` (function)
- emits: `navigate`, `study-tray-close`, `study-tray-word`, `tafsir-open`, `word-study-from-tray` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `study.journeyTitle`, `study.title`, `study.trayClose`, `study.trayTitle`, `study.trayTranslation`, `study.trayWords`, `wordStudy.noData`, `wordStudy.open`, `wordStudy.openTafsir`, `wordStudy.rootCount`, `wordStudy.rootNotApplicable`, `wordStudy.wordN`
- routes: `VIEWS.MUTASHABIHAT`, `VIEWS.QURAN`, `VIEWS.ROOTS`, `VIEWS.TAJWEED_COURSE`

### `js/views/tafsirPanel.js`

job: Shared UI (modal templates) for the Qur'an study features: the per-word grammar/i'rab/sarf popover, the multi-source tafsir panel (tabs across every bundled + on-demand edition), and the Mushaf displ…

- exports: `renderAyahWords` (function), `BISMILLAH_AYAH_REF` (const), `buildBismillahHTML` (function), `buildSavedWordsPanel` (function), `buildWordStudyLoadingPanel` (function), `wordSourcesHTML` (function), `buildWordStudyPanel` (function), `formatArabicCommentary` (function), `formatEnglishCommentary` (function), `isEnglishEdition` (function), `editionBodyHTML` (function), `buildTafsirPanel` (function), `buildAyahStudyExtras` (function), `buildMushafSettingsPanel` (function)
- emits: `ayah-share`, `modal-close`, `mushaf-set-bismillah`, `mushaf-set-font`, `mushaf-set-paper`, `navigate`, `practice-open`, `root-jump`, `roots-open`, `tafsir-compare`, `tafsir-compare-download`, `tafsir-download`, `tafsir-open`, `tafsir-tab`, `tajweed-open-settings`, `toggle-mushaf-pref`, `word-bookmark`, `word-bookmark-open`, `word-bookmark-remove`, `word-bookmarks-open`, `word-copy`, `word-share`, `word-speak`, `word-tap`
- handles: —
- i18n: `common.close`, `common.delete`, `mushaf.behavior`, `mushaf.bismillahStyle`, `mushaf.font`, `mushaf.lineSpacing`, `mushaf.marksHizb`, `mushaf.marksLegend`, `mushaf.marksSajda`, `mushaf.marksWaqf`, `mushaf.paper`, `mushaf.settingsTitle`, `mushaf.studyAids`, `mushaf.tajweedCoverage`, `mushaf.tajweedLegend`, `mushaf.tajweedSettings`, `mushaf.tajweedSource`, `mushaf.tajweedUncited`, `mushaf.tajweedUncolored`, `mushaf.textSize` (+54 more)
- routes: `VIEWS.TAJWEED_COURSE`

### `js/views/tajweedCourseView.js`

job: the course screen (v5.17.32) Pure templates. No fetching, no state mutation: the caller passes state in and the view reads the spine from domain/tajweedCourse.js. Lazy-loaded, so

- exports: `renderTajweedCourse` (function), `TAJWEED_COURSE_SESSION_IDS` (const)
- emits: `navigate`, `practice-lesson`, `tajweed-course-drill`, `tajweed-course-drill-rule`, `tajweed-course-mode`, `tajweed-course-toggle-done`
- handles: —
- i18n: `nav.quran`, `practice.lesson`, `tajweedCourse.allDone`, `tajweedCourse.contested`, `tajweedCourse.continueLabel`, `tajweedCourse.done`, `tajweedCourse.intro`, `tajweedCourse.keepGoing`, `tajweedCourse.locked`, `tajweedCourse.lockedBecause`, `tajweedCourse.markDone`, `tajweedCourse.markUndone`, `tajweedCourse.mixed`, `tajweedCourse.nextUp`, `tajweedCourse.noResults`, `tajweedCourse.pathLabel`, `tajweedCourse.practice`, `tajweedCourse.progress`, `tajweedCourse.searchLabel`, `tajweedCourse.searchPlaceholder` (+5 more)
- routes: `VIEWS.MUSHAF`

### `js/views/tajweedPracticeView.js`

job: Templates for the "find the rule" drill mode. The interactive round is rendered fresh (via openModal again) on every tap — session state lives in app/practice.js as module-scoped transient state, the…

- exports: `buildPracticePicker` (function), `buildPracticeRound` (function), `buildPracticeSummary` (function), `buildPracticeLesson` (function), `renderClassifyRoundHtml` (function)
- emits: `navigate`, `practice-check`, `practice-classify`, `practice-classify-next`, `practice-lesson`, `practice-mode`, `practice-next`, `practice-open`, `practice-start`, `practice-tap`
- handles: —
- i18n: `practice.accuracy`, `practice.again`, `practice.backToRules`, `practice.bestStreak`, `practice.changeRule`, `practice.check`, `practice.classifyQuestion`, `practice.classifyTitle`, `practice.currentStreak`, `practice.drillRule`, `practice.exampleRef`, `practice.intro`, `practice.legendCorrect`, `practice.legendMissed`, `practice.legendWrong`, `practice.lesson`, `practice.lessonEmpty`, `practice.lessonExampleUnavailable`, `practice.lessonExamples`, `practice.lessonHighlight` (+17 more)
- routes: `VIEWS.QURAN`

### `js/views/tajweedSettings.js`

job: The Tajweed rules & colors panel: every rule of the standard chart with an on/off toggle (all ON by default), each family's color picked from a curated swatch row, a live sample line, and a one-tap r…

- exports: `buildTajweedSettingsPanel` (function)
- emits: `tajweed-reset`, `tajweed-set-color`, `tajweed-toggle-rule`
- handles: —
- i18n: `tajweed.disabledNote`, `tajweed.familyColor`, `tajweed.reset`, `tajweed.rulesHint`, `tajweed.rulesTitle`
- routes: —

### `js/views/tasbih.js`

job: (header names file only — no job line)

- exports: `renderTasbih` (function), `PRESETS` (re-export)
- emits: `tasbih-custom-remove`, `tasbih-custom-save`, `tasbih-float`, `tasbih-reset`, `tasbih-select`, `tasbih-tap`, `tasbih-target-set`, `tasbih-target-step`
- handles: —
- i18n: `focus.progress`, `focus.tapToCount`, `nav.tasbih`, `tasbih.customAdd`, `tasbih.customPhrase`, `tasbih.customPlaceholder`, `tasbih.customRemove`, `tasbih.cyclesCompleted`, `tasbih.float`, `tasbih.lifetime`, `tasbih.optionsTitle`, `tasbih.reset`, `tasbih.target`, `tasbih.targetDown`, `tasbih.targetPresets`, `tasbih.targetUp`
- routes: —

### `js/views/viewSheets.js`

job: The per-view "⋯" menu sheets — one builder per tab, all rendered through the shared viewSheet() composer (ui/viewSheet.js) and opened by the single 'view-menu' handler in app/handlers/viewMenus.js. R…

- exports: `FIELD_ICONS` (object), `buildFieldTogglesSheet` (function), `buildScheduleManagerSheet` (function), `buildLibrarySheet` (function), `buildCategorySheet` (function), `buildHadithSheet` (function), `buildHadithBookSheet` (function), `buildPrayerSheet` (function), `buildQiblaSheet` (function), `buildRamadanSheet` (function), `buildCalendarSheet` (function), `buildChecklistSheet` (function), `buildTasbihSheet` (function), `buildZakatSheet` (function), `buildStatisticsSheet` (function), `buildGardenSheet` (function), `buildGardenHowSheet` (function), `buildEditorSheet` (function)
- emits: `schedule-delete`, `schedule-toggle` (+ dynamic `data-action="${...}"`)
- handles: —
- i18n: `app.name`, `common.toggle`, `editor.delete`, `garden.sheet.howBody`, `garden.sheet.howTitle`, `traveler.hint`, `traveler.jamNote`, `traveler.qasrNote`
- routes: `VIEWS.ABOUT`, `VIEWS.AMBIENT`, `VIEWS.CALENDAR`, `VIEWS.CHECKLIST`, `VIEWS.EDITOR`, `VIEWS.GARDEN`, `VIEWS.HADITH`, `VIEWS.HOME`, `VIEWS.MUSHAF`, `VIEWS.PRAYER`, `VIEWS.QURAN`, `VIEWS.STATISTICS`, `VIEWS.TASBIH`

### `js/views/zakat.js`

job: The Zakat calculator: metal-priced nisab (gold 85 g / silver 595 g), seven asset lines + liabilities, a live 2.5% result panel, the Zakat al-Fitr household sub-calculator, and a small saved-snapshots…

- exports: `renderZakat` (function)
- emits: `zakat-clear-inputs`, `zakat-delete-snapshot`, `zakat-save-snapshot`, `zakat-set-basis`, `zakat-toggle-hawl-remind`
- handles: —
- i18n: `common.delete`, `zakat.assetsTitle`, `zakat.belowNisab`, `zakat.belowNisabShort`, `zakat.clear`, `zakat.currency`, `zakat.disclaimer`, `zakat.dueLabel`, `zakat.fitrNote`, `zakat.fitrPeople`, `zakat.fitrPerPerson`, `zakat.fitrSummary`, `zakat.fitrTitle`, `zakat.fitrTotal`, `zakat.goldPrice`, `zakat.goldStandard`, `zakat.goldStandardShort`, `zakat.hawlDueSoon`, `zakat.hawlIn`, `zakat.hawlNote` (+28 more)
- routes: —

## Reverse index: action → files

- `add-preset`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `add-reminder`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `ambient-mode`: emitted by `js/views/ambient.js`; handled in `js/app/handlers/items.js`
- `audio-batch-dismiss`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-batch-stop`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-delete-moshaf`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-delete-surah`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-download-all`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-mute-toggle`: emitted by `js/ui/recitationConsole.js`, `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `audio-play-moshaf`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-remove-custom`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `audio-select-moshaf`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `ayah-share`: emitted by `js/views/ayahStudy.js`, `js/views/quran.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/items.js`
- `backup-link-file`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `bookmark-delete-folder`: emitted by `js/views/mushafBookmarks.js`; handled in `js/app/handlers/zakat.js`
- `bookmark-filter-folder`: emitted by `js/views/mushafBookmarks.js`; handled in `js/app/handlers/zakat.js`
- `bookmark-new-folder`: emitted by `js/views/mushafBookmarks.js`; handled in `js/app/handlers/zakat.js`
- `byheart-reveal`: emitted by `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `byheart-review`: emitted by `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `calendar-delete-note`: emitted by `js/ui/calendarModals.js`; handled in `js/app/handlers/worship.js`
- `calendar-edit-note`: emitted by `js/ui/calendarModals.js`; handled in `js/app/handlers/worship.js`
- `calendar-new-note`: emitted by `js/ui/calendarModals.js`; handled in `js/app/handlers/worship.js`
- `calendar-open-day`: emitted by `js/views/calendar.js`; handled in `js/app/handlers/worship.js`
- `category-top`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `certificate-print`: emitted by `js/views/certificate.js`; handled in `js/app/handlers/journal.js`
- `checklist-toggle`: emitted by `js/app/handlers/worship.js`, `js/views/checklist.js`; handled in `js/app/handlers/worship.js`
- `clear-search-history`: emitted by `js/views/search.js`; handled in `js/app/handlers/items.js`
- `collection-add-favorites`: emitted by `js/views/collection.js`; handled in `js/app/handlers/items.js`
- `collection-move`: emitted by `js/views/collection.js`; handled in `js/app/handlers/items.js`
- `collection-picker-toggle`: emitted by `js/app/handlers/items.js`, `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `confirm-content-restore-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-delete-category`: emitted by `js/views/category.js`, `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-delete-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-delete-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-duplicate-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-edit-category`: emitted by `js/views/category.js`, `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-edit-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-edit-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-hide-category`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-hide-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-hide-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-manage-toggle`: emitted by `js/views/category.js`, `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-move-category`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-move-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-move-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-new-category`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-new-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-reset-category`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-restore-all`: emitted by `js/views/settings.js`; handled in `js/app/handlers/content.js`
- `content-restore-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-restore-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-schedule`: emitted by `js/views/category.js`, `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-set-target`: emitted by `js/app/handlers/content.js`, `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-target-step`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-unhide-category`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `content-unhide-item`: emitted by `js/views/category.js`; handled in `js/app/handlers/content.js`
- `content-unhide-library`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `copy-ayah`: emitted by `js/views/quran.js`; handled in `js/app/handlers/items.js`
- `copy-item`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `counter-tap`: emitted by `js/app/handlers/items.js`, `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/events.js`, `js/app/handlers/items.js`
- `create-collection`: emitted by `js/views/collections.js`; handled in `js/app/handlers/items.js`
- `create-collection-inline`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `create-collection-inline-move`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `create-collection-suggested`: emitted by `js/views/collections.js`; handled in `js/app/handlers/items.js`
- `delete-collection`: emitted by `js/views/collection.js`; handled in `js/app/handlers/items.js`
- `delete-reminder`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `dua-edit-save`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `dua-remove`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `dua-save`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `dua-toggle-answered`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `editor-delete-category`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-delete-item`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-duplicate-item`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-edit-item`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-new-category`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-new-item`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `editor-new-library`: emitted by `js/views/editor.js`; handled in `js/app/handlers/editor.js`
- `export-backup`: emitted by `js/views/backupSummary.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `export-plan`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `fasting-cycle-remind-time`: emitted by `js/views/calendar.js`; handled in `js/app/handlers/worship.js`
- `fasting-toggle-category`: emitted by `js/views/calendar.js`; handled in `js/app/handlers/worship.js`
- `fasting-toggle-remind`: emitted by `js/views/calendar.js`; handled in `js/app/handlers/worship.js`
- `favorites-sort`: emitted by `js/views/favorites.js`; handled in `js/app/handlers/items.js`
- `focus-exit`: emitted by `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `focus-reset`: emitted by `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `gap-telemetry-clear`: emitted by `js/views/statistics.js`; handled in `js/app/handlers/worship.js`
- `go-back`: emitted by `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `grammar-exit`: emitted by `js/views/roots.js`; handled in `js/app/handlers/grammar.js`
- `grammar-grade`: emitted by `js/views/roots.js`; handled in `js/app/handlers/grammar.js`
- `grammar-restart`: emitted by `js/views/roots.js`; handled in `js/app/handlers/grammar.js`
- `grammar-reveal`: emitted by `js/views/roots.js`; handled in `js/app/handlers/grammar.js`
- `grammar-start`: emitted by `js/views/roots.js`; handled in `js/app/handlers/grammar.js`
- `hadith-book-move`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/content.js`
- `hadith-bookmark`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-copy`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-daily-shuffle`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-delete-book`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/content.js`
- `hadith-grid-next`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-grid-prev`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-hide-book`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/content.js`
- `hadith-hide-item`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/content.js`
- `hadith-index-all`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-mem-reveal`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-mem-review`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-memorize`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-note-delete`: emitted by `js/app/handlers/items.js`; handled in `js/app/handlers/items.js`
- `hadith-note-open`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-page-next`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-page-prev`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-retry`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-retry-index`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-section`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/items.js`
- `hadith-share`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-speak`: emitted by `js/views/hadithCard.js`; handled in `js/app/handlers/items.js`
- `hadith-unhide-item`: emitted by `js/views/hadith.js`; handled in `js/app/handlers/content.js`
- `hifz-ayah-mark`: emitted by `js/views/ayahStudy.js`; handled in `js/app/handlers/hifz.js`
- `hifz-level`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-mark`: emitted by `js/views/ayahStudy.js`, `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-mcq-new`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-mcq-pick`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-rehide`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-reveal`: emitted by `js/domain/hifz.js`; handled in `js/app/handlers/hifz.js`
- `hifz-review`: emitted by `js/views/ayahStudy.js`, `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-test`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `hifz-toggle`: emitted by `js/views/quran.js`; handled in `js/app/handlers/hifz.js`
- `home-invite-dismiss`: emitted by `js/views/home.js`; handled in `js/app/handlers/worship.js`
- `home-panel-move`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `home-panel-toggle`: emitted by `js/app/handlers/system.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `import-backup`: emitted by `js/views/backupSummary.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `import-plan`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `install-later`: emitted by `js/views/installRow.js`; handled in `js/app/handlers/worship.js`
- `install-reoffer`: emitted by `js/views/installRow.js`; handled in `js/app/handlers/worship.js`
- `journal-edit-cancel`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `journal-edit-open`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `journal-export`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `journal-page`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `khatma-clear-plan`: emitted by `js/views/khatma.js`; handled in `js/app/handlers/quran.js`
- `khatma-open-plan`: emitted by `js/views/khatma.js`; handled in `js/app/handlers/quran.js`
- `khatma-ramadan-preset`: emitted by `js/views/khatma.js`; handled in `js/app/handlers/worship.js`
- `kids-exit-hold`: emitted by `js/app/events.js`, `js/views/kids.js`; handled in `js/app/events.js`
- `kids-gate-answer`: emitted by `js/app/events.js`; handled in `js/app/handlers/system.js`
- `kids-quiz-answer`: emitted by `js/views/kids.js`; handled in `js/app/handlers/items.js`
- `kids-quiz-exit`: emitted by `js/views/kids.js`; handled in `js/app/handlers/items.js`
- `kids-quiz-start`: emitted by `js/views/kids.js`; handled in `js/app/handlers/items.js`
- `library-field-toggles`: emitted by `js/views/library.js`; handled in `js/app/handlers/viewMenus.js`
- `library-jump`: emitted by `js/views/library.js`; handled in `js/app/handlers/content.js`
- `location-profile-apply`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `location-profile-save`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `modal-close`: emitted by `js/app/events.js`, `js/app/forms.js`, `js/app/handlers/items.js`, `js/app/handlers/quranAudio.js`, `js/ui/calendarModals.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/views/editor.js`, `js/views/home.js`, `js/views/mushafBookmarks.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/editor.js`
- `modal-close-overlay`: emitted by `js/ui/modal.js`; handled in `js/app/events.js`
- `move-to-collection`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `mushaf-ayah-tap`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-copy-ayah`: emitted by `js/views/ayahStudy.js`; handled in `js/app/handlers/quran.js`
- `mushaf-find-page-result`: emitted by `js/views/mushafPageFind.js`; handled in `js/app/handlers/quran.js`
- `mushaf-jump-page`: emitted by `js/views/mushafBookmarks.js`, `js/views/mushafJump.js`; handled in `js/app/handlers/quran.js`
- `mushaf-more`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-next`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-open-at-surah`: emitted by `js/views/home.js`, `js/views/quran.js`; handled in `js/app/handlers/quran.js`
- `mushaf-open-in-study`: emitted by `js/views/ayahStudy.js`; handled in `js/app/handlers/quran.js`
- `mushaf-open-jump`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-open-page-find`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-open-settings`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-play-pick`: emitted by `js/views/mushafPlayer.js`, `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-prev`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mushaf-remove-bookmark`: emitted by `js/views/mushafBookmarks.js`; handled in `js/app/handlers/quran.js`
- `mushaf-reset-progress`: emitted by `js/views/khatma.js`; handled in `js/app/handlers/quran.js`
- `mushaf-set-bismillah`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `mushaf-set-font`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `mushaf-set-paper`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `mushaf-set-tafsir`: emitted by `js/views/settings.js`; handled in `js/app/handlers/quran.js`
- `mushaf-toggle-bookmark`: emitted by `js/views/ayahStudy.js`; handled in `js/app/handlers/quran.js`
- `mushaf-toggle-fullscreen`: emitted by `js/views/mushafReader.js`; handled in `js/app/handlers/quran.js`
- `mutashabihat-next`: emitted by `js/views/mutashabihat.js`; handled in `js/app/handlers/journal.js`
- `mutashabihat-pick`: emitted by `js/views/mutashabihat.js`; handled in `js/app/handlers/journal.js`
- `mutashabihat-pool`: emitted by `js/views/mutashabihat.js`; handled in `js/app/handlers/journal.js`
- `nav-drawer-close`: emitted by `js/app/drawer.js`, `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `nav-toggle`: emitted by `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `navigate`: emitted by `js/app/handlers/quranAudio.js`, `js/ui/card.js`, `js/ui/emptyState.js`, `js/ui/shell.js`, `js/ui/viewSheet.js`, `js/views/about.js`, `js/views/ambient.js`, `js/views/ayahStudy.js`, `js/views/backupSummary.js`, `js/views/calendar.js`, `js/views/category.js`, `js/views/certificate.js`, `js/views/checklist.js`, `js/views/collection.js`, `js/views/collections.js`, `js/views/favorites.js`, `js/views/focus.js`, `js/views/garden.js`, `js/views/hadith.js`, `js/views/hadithCard.js`, `js/views/home.js`, `js/views/journal.js`, `js/views/kids.js`, `js/views/library.js`, `js/views/mood.js`, `js/views/mushafReader.js`, `js/views/mutashabihat.js`, `js/views/offline.js`, `js/views/onboardingPanel.js`, `js/views/quran.js`, `js/views/ramadan.js`, `js/views/roots.js`, `js/views/search.js`, `js/views/settings.js`, `js/views/statistics.js`, `js/views/studyContext.js`, `js/views/studyTray.js`, `js/views/tafsirPanel.js`, `js/views/tajweedCourseView.js`, `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/navigation.js`
- `nudge-dismiss`: emitted by `js/views/home.js`; handled in `js/app/handlers/worship.js`
- `offline-clear-study`: emitted by `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `offline-download-all`: emitted by `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `offline-download-group`: emitted by `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `offline-stop`: emitted by `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `offline-toggle-compressed`: emitted by `js/app/handlers/offline.js`, `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `offline-toggle-essentials-auto`: emitted by `js/app/handlers/offline.js`, `js/views/offline.js`; handled in `js/app/handlers/offline.js`
- `onboarding-confirm`: emitted by `js/views/onboardingPanel.js`; handled in `js/app/handlers/worship.js`
- `onboarding-dismiss`: emitted by `js/views/onboardingPanel.js`; handled in `js/app/handlers/worship.js`
- `onboarding-install`: emitted by `js/views/installRow.js`; handled in `js/app/handlers/worship.js`
- `onboarding-language`: emitted by `js/views/onboardingPanel.js`; handled in `js/app/handlers/worship.js`
- `onboarding-reshow`: emitted by `js/views/settings.js`; handled in `js/app/handlers/worship.js`
- `onboarding-step`: emitted by `js/views/onboardingPanel.js`; handled in `js/app/handlers/worship.js`
- `open-card-menu`: emitted by `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `open-collection-picker`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `open-focus`: emitted by `js/ui/card.js`; handled in `js/app/handlers/items.js`
- `open-move-picker`: emitted by `js/views/favorites.js`; handled in `js/app/handlers/items.js`
- `open-palette`: emitted by `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `play-ayah`: emitted by `js/views/ayahStudy.js`, `js/views/quran.js`; handled in `js/app/handlers/quran.js`
- `play-dhikr-audio`: emitted by `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `player-close`: emitted by `js/views/mushafPlayer.js`, `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-min-toggle`: emitted by `js/domain/gestures.js`, `js/views/mushafPlayer.js`, `js/views/playerBar.js`, `js/views/quran.js`; handled in `js/app/handlers/audio.js`
- `player-next`: emitted by `js/views/mushafPlayer.js`, `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-prev`: emitted by `js/views/mushafPlayer.js`, `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-rate`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-repeat`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-seek-back`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-seek-fwd`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-sleep-cycle`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `player-toggle`: emitted by `js/views/mushafPlayer.js`, `js/views/playerBar.js`; handled in `js/app/handlers/audio.js`
- `playlist-create`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-delete`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-move-item`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-play`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-remove-item`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-rename`: emitted by `js/views/audioManager.js`; handled in `js/app/handlers/audio.js`
- `playlist-save-range`: emitted by `js/app/handlers/quranAudio.js`; handled in `js/app/handlers/audio.js`
- `practice-check`: emitted by `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-classify`: emitted by `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-classify-next`: emitted by `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-lesson`: emitted by `js/views/tajweedCourseView.js`, `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-mode`: emitted by `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-next`: emitted by `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-open`: emitted by `js/views/tafsirPanel.js`, `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-start`: emitted by `js/views/home.js`, `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-tap`: emitted by `js/app/events.js`, `js/domain/playerShortcuts.js`, `js/views/tajweedPracticeView.js`; handled in `js/app/handlers/quran.js`
- `practice-this-ayah`: emitted by `js/views/ayahStudy.js`; handled in `js/app/handlers/quran.js`
- `prayer-adhan-clear`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-adhan-import`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-enable-notifications`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-log-cycle`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-manual-location`: emitted by `js/app/forms.js`, `js/views/prayer.js`, `js/views/qibla.js`, `js/views/ramadan.js`; handled in `js/app/handlers/location.js`
- `prayer-month-ics`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/viewMenus.js`
- `prayer-month-nav`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/viewMenus.js`
- `prayer-month-print`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/viewMenus.js`
- `prayer-request-location`: emitted by `js/views/onboardingPanel.js`, `js/views/prayer.js`, `js/views/qibla.js`, `js/views/ramadan.js`; handled in `js/app/handlers/location.js`
- `prayer-set-alert-mode`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-test-sound`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `prayer-use-city`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/location.js`
- `profile-create`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `profile-delete`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `profile-switch`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `qada-add`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `qada-clear-prayer`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `qada-complete`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `qibla-enable-compass`: emitted by `js/views/qibla.js`; handled in `js/app/handlers/location.js`
- `quick-language-toggle`: emitted by `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `quick-theme-toggle`: emitted by `js/ui/shell.js`; handled in `js/app/handlers/navigation.js`
- `quick-tile`: emitted by `js/views/home.js`; handled in `js/app/handlers/navigation.js`
- `quick-tile-move`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `quick-tile-toggle`: emitted by `js/app/handlers/system.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `quiz-answer`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-direction`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-exit-link`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-library`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-next`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-practice-weak`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-review-mistakes`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-size`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quiz-start`: emitted by `js/views/quiz.js`; handled in `js/app/handlers/quiz.js`
- `quran-play-surah`: emitted by `js/views/quran.js`; handled in `js/app/handlers/audio.js`
- `quran-range-open`: emitted by `js/views/mushafPlayer.js`, `js/views/quran.js`; handled in `js/app/handlers/quranAudio.js`
- `quran-toggle-immersive`: emitted by `js/views/quran.js`; handled in `js/app/handlers/quran.js`
- `quran-window-expand`: emitted by `js/views/quran.js`; handled in `js/app/handlers/quran.js`
- `ramadan-enable-notifications`: emitted by `js/views/calendar.js`, `js/views/ramadan.js`; handled in `js/app/handlers/worship.js`
- `ramadan-planner-toggle`: emitted by `js/views/ramadan.js`; handled in `js/app/handlers/worship.js`
- `ramadan-toggle-fast`: emitted by `js/views/calendar.js`, `js/views/ramadan.js`; handled in `js/app/handlers/worship.js`
- `recite-ayah-next`: emitted by `js/views/ambient.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-ayah-prev`: emitted by `js/views/ambient.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-follow-toggle`: emitted by `js/views/quran.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-mode-ayah`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-pause-toggle`: emitted by `js/ui/recitationConsole.js`, `js/views/ambient.js`, `js/views/playerBar.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-pick-moshaf`: emitted by `js/app/handlers/quranAudio.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-sleep-cycle`: emitted by `js/views/ambient.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-stop`: emitted by `js/views/playerBar.js`; handled in `js/app/handlers/quranAudio.js`
- `recite-voice-b`: emitted by `js/app/handlers/quranAudio.js`; handled in `js/app/handlers/quranAudio.js`
- `reflection-edit-save`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `reflection-remove`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `reflection-save`: emitted by `js/views/journal.js`; handled in `js/app/handlers/journal.js`
- `rename-collection`: emitted by `js/views/collection.js`; handled in `js/app/handlers/items.js`
- `reset-all-data`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `restore-auto-backup`: emitted by `js/views/backupSummary.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `retry-load`: emitted by `js/ui/emptyState.js`, `js/views/roots.js`; handled in `js/app/handlers/system.js`
- `root-jump`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `roots-expand`: emitted by `js/views/roots.js`; handled in `js/app/handlers/quran.js`
- `roots-jump`: emitted by `js/views/roots.js`; handled in `js/app/handlers/quran.js`
- `roots-open`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `roots-page`: emitted by `js/views/roots.js`; handled in `js/app/handlers/quran.js`
- `roots-tab`: emitted by `js/views/roots.js`; handled in `js/app/handlers/quran.js`
- `run-search`: emitted by `js/views/search.js`; handled in `js/app/handlers/items.js`
- `sadaqah-log`: emitted by `js/views/home.js`; handled in `js/app/handlers/worship.js`
- `sadaqah-open-editor`: emitted by `js/views/home.js`; handled in `js/app/handlers/worship.js`
- `sadaqah-remove`: emitted by `js/views/home.js`; handled in `js/app/handlers/worship.js`
- `schedule-delete`: emitted by `js/views/viewSheets.js`; handled in `js/app/handlers/content.js`
- `schedule-open-manager`: emitted by `js/views/settings.js`; handled in `js/app/handlers/viewMenus.js`
- `schedule-toggle`: emitted by `js/views/viewSheets.js`; handled in `js/app/handlers/content.js`
- `search-page`: emitted by `js/views/search.js`; handled in `js/app/handlers/items.js`
- `session-start`: emitted by `js/views/category.js`; handled in `js/app/handlers/items.js`
- `set-setting`: emitted by `js/app/handlers/quranAudio.js`, `js/views/audioManager.js`, `js/views/onboardingPanel.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `share-collection`: emitted by `js/views/collection.js`; handled in `js/app/handlers/items.js`
- `share-item`: emitted by `js/ui/menus.js`; handled in `js/app/handlers/items.js`
- `stats-heatmap-export`: emitted by `js/views/statistics.js`; handled in `js/app/handlers/worship.js`
- `stats-heatmap-shift`: emitted by `js/views/statistics.js`; handled in `js/app/handlers/worship.js`
- `study-tray-close`: emitted by `js/views/studyTray.js`; handled in `js/app/handlers/quran.js`
- `study-tray-toggle`: emitted by `js/views/mushafReader.js`, `js/views/quran.js`; handled in `js/app/handlers/quran.js`
- `study-tray-word`: emitted by `js/views/studyTray.js`; handled in `js/app/handlers/quran.js`
- `sunnah-toggle`: emitted by `js/app/handlers/worship.js`, `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `surah-play`: emitted by `js/views/ayahStudy.js`, `js/views/kids.js`, `js/views/mushafPlayer.js`, `js/views/mushafReader.js`, `js/views/quran.js`; handled in `js/app/handlers/quranAudio.js`
- `tafsir-compare`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tafsir-compare-download`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tafsir-download`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tafsir-open`: emitted by `js/views/quran.js`, `js/views/studyTray.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tafsir-tab`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tajweed-course-drill`: emitted by `js/views/tajweedCourseView.js`; handled in `js/app/handlers/quran.js`
- `tajweed-course-drill-rule`: emitted by `js/views/tajweedCourseView.js`; handled in `js/app/handlers/quran.js`
- `tajweed-course-mode`: emitted by `js/app/handlers/quran.js`, `js/views/tajweedCourseView.js`; handled in `js/app/handlers/quran.js`
- `tajweed-course-toggle-done`: emitted by `js/views/tajweedCourseView.js`; handled in `js/app/handlers/quran.js`
- `tajweed-open-settings`: emitted by `js/views/quran.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `tajweed-reset`: emitted by `js/views/tajweedSettings.js`; handled in `js/app/handlers/quran.js`
- `tajweed-set-color`: emitted by `js/views/tajweedSettings.js`; handled in `js/app/handlers/quran.js`
- `tajweed-toggle-rule`: emitted by `js/views/tajweedSettings.js`; handled in `js/app/handlers/quran.js`
- `tasbih-custom-remove`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-custom-save`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-float`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-reset`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-select`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-tap`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-target-set`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `tasbih-target-step`: emitted by `js/views/tasbih.js`; handled in `js/app/handlers/tasbih.js`
- `toggle-elder-mode`: emitted by `js/app/handlers/system.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `toggle-favorite`: emitted by `js/ui/card.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `toggle-kids-mode`: emitted by `js/app/handlers/system.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `toggle-mushaf-pref`: emitted by `js/app/handlers/system.js`, `js/views/mushafReader.js`, `js/views/quran.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/system.js`
- `toggle-prayer-alert`: emitted by `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `toggle-prayer-quiet`: emitted by `js/app/handlers/worship.js`, `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `toggle-prayer-quiet-cancel`: emitted by `js/app/handlers/worship.js`, `js/views/prayer.js`; handled in `js/app/handlers/worship.js`
- `toggle-ramadan-alert`: emitted by `js/views/ramadan.js`; handled in `js/app/handlers/worship.js`
- `toggle-reminder`: emitted by `js/app/handlers/system.js`, `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `toggle-setting`: emitted by `js/app/handlers/system.js`, `js/ui/viewSheet.js`, `js/views/settings.js`, `js/views/statistics.js`; handled in `js/app/handlers/system.js`
- `toggle-speech`: emitted by `js/ui/card.js`, `js/ui/menus.js`, `js/views/focus.js`; handled in `js/app/handlers/items.js`
- `unfavorite-all`: emitted by `js/views/favorites.js`; handled in `js/app/handlers/items.js`
- `verify-backup`: emitted by `js/views/settings.js`; handled in `js/app/handlers/system.js`
- `view-menu`: emitted by `js/ui/viewSheet.js`; handled in `js/app/handlers/viewMenus.js`
- `word-bookmark`: emitted by `js/app/handlers/quran.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-bookmark-open`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-bookmark-remove`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-bookmarks-open`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-copy`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-share`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-speak`: emitted by `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `word-study-from-tray`: emitted by `js/views/studyTray.js`; handled in `js/app/handlers/quran.js`
- `word-tap`: emitted by `js/app/events.js`, `js/domain/playerShortcuts.js`, `js/views/tafsirPanel.js`; handled in `js/app/handlers/quran.js`
- `zakat-clear-inputs`: emitted by `js/views/zakat.js`; handled in `js/app/handlers/zakat.js`
- `zakat-delete-snapshot`: emitted by `js/views/zakat.js`; handled in `js/app/handlers/zakat.js`
- `zakat-save-snapshot`: emitted by `js/views/zakat.js`; handled in `js/app/handlers/zakat.js`
- `zakat-set-basis`: emitted by `js/views/zakat.js`; handled in `js/app/handlers/zakat.js`
- `zakat-toggle-hawl-remind`: emitted by `js/views/zakat.js`; handled in `js/app/handlers/zakat.js`

## Reverse index: export → file

- `ADHAN_KIND_SLOTS`: `js/services/audioStore.js`
- `ADHAN_MAX_BYTES`: `js/services/audioStore.js`
- `ADHAN_MODES`: `js/services/prayerSound.js`
- `ADHAN_MOSHAF_ID`: `js/services/audioStore.js`
- `ALIASES`: `js/core/icons.js`
- `AMBIENT_MODES`: `js/core/config/views.js`
- `APP_MENU_ENTRIES`: `js/core/config/nav.js`
- `APP_MENU_GROUPS`: `js/core/config/nav.js`
- `APP_NAME`: `js/core/config/app.js`
- `APP_NAME_AR`: `js/core/config/app.js`
- `APP_VERSION`: `js/core/config.js`
- `ARABIC_TEXT_FONTS`: `js/core/config/views.js`
- `ARAFAH_DAY`: `js/domain/fasting.js`
- `ARAFAH_MONTH`: `js/domain/fasting.js`
- `ASHURA_DAY`: `js/domain/fasting.js`
- `ASHURA_MONTH`: `js/domain/fasting.js`
- `ASR_FACTORS`: `js/domain/prayer.js`
- `AUDIO_CACHE_DEFAULT_MAX_BYTES`: `js/services/audioStore.js`
- `AUDIO_PROVIDERS_URL`: `js/core/config/quran.js`
- `AUTO_BACKUP_DAYS`: `js/services/backup.js`
- `AUTO_BACKUP_KEY`: `js/services/backup.js`
- `BACKUP_ERRORS`: `js/services/backup.js`
- `BISMILLAH_AR`: `js/domain/tajweed.js`
- `BISMILLAH_AYAH_REF`: `js/views/tafsirPanel.js`
- `BISMILLAH_STYLES`: `js/core/config/sanitize.js`
- `BOUNDED_RECURRENCE`: `js/ui/calendarModals.js`
- `BUNDLED_ADHAN_URL`: `js/services/prayerSound.js`
- `CARD_FIELD_KEYS`: `js/domain/contentLens.js`
- `CATALOG_URL`: `js/core/config/app.js`
- `CHECKLIST_ITEMS`: `js/core/config/app.js`
- `CITY_PRESETS`: `js/domain/locations.js`
- `CITY_REGIONS`: `js/domain/locations.js`
- `CLASSIFY_MEMO_CAP`: `js/domain/tajweed.js`
- `COLLECTION_SUGGESTIONS`: `js/core/config/app.js`
- `CONFIRM_STEPS`: `js/domain/onboarding.js`
- `COURSE_STAGES`: `js/domain/tajweedCourse.js`
- `COURSE_STAGE_IDS`: `js/domain/tajweedCourse.js`
- `DAILY_POOL_LIBRARIES`: `js/domain/dailyAyah.js`
- `DAILY_THEMES`: `js/domain/dailyAyah.js`
- `DAILY_VERSE_PRESET_ID`: `js/domain/reminderPresets.js`
- `DAY_DEDUP_KEY_FOR_TESTS`: `js/services/notifications.js`
- `DB_NAME`: `js/core/config/app.js`
- `DB_VERSION`: `js/core/config/app.js`
- `DEFAULT_ARABIC_TEXT_FONT`: `js/core/config/views.js`
- `DEFAULT_CUSTOM_LIBRARY_ID`: `js/services/editor.js`
- `DEFAULT_MUSHAF_FONT`: `js/core/config/views.js`
- `DEFAULT_MUSHAF_PAPER`: `js/core/config/views.js`
- `DEFAULT_PATH_MODE`: `js/domain/tajweedCourse.js`
- `DEFAULT_RECITER`: `js/core/config/quran.js`
- `DEFAULT_SETTINGS`: `js/core/config/views.js`
- `DEFAULT_TRANSLATION_EDITION`: `js/core/config/quran.js`
- `DEFAULT_VIEW`: `js/core/config/views.js`
- `DEFERRED_STEPS`: `js/domain/onboarding.js`
- `DOORS`: `js/core/config/nav.js`
- `DOOR_ENTRIES`: `js/core/config/nav.js`
- `DOOR_LABEL_KEYS`: `js/core/config/nav.js`
- `DRILL_SIZE`: `js/domain/grammarDrill.js`
- `DUA_JOURNAL_CAP`: `js/domain/duaJournal.js`
- `ECHO_PAUSE_CHOICES`: `js/services/surahPlayback.js`
- `ECHO_PAUSE_DEFAULT_MS`: `js/services/surahPlayback.js`
- `ECHO_PAUSE_MAX_MS`: `js/services/surahPlayback.js`
- `ECHO_PAUSE_MIN_MS`: `js/services/surahPlayback.js`
- `ESSENTIALS_DEFER_MS`: `js/app/offlineJobs.js`
- `ESSENTIAL_GROUPS_TEST`: `js/app/offlineJobs.js`
- `EVENING_WINDOW`: `js/domain/adhkarTiming.js`
- `EVENT_LABELS`: `js/domain/calendar.js`
- `FADE_SECONDS`: `js/domain/sleepTimer.js`
- `FASTING_CATEGORIES`: `js/domain/fasting.js`
- `FASTING_HORIZON_DAYS`: `js/domain/fasting.js`
- `FAVORITE_SORTS`: `js/views/favorites.js`
- `FETCH_TIMEOUT_MS`: `js/app/net.js`, `js/core/fetch.js`
- `FIELD_ICONS`: `js/views/viewSheets.js`
- `FIT_MAX`: `js/app/autoFit.js`
- `FIT_MIN`: `js/app/autoFit.js`
- `FOCUS_SWIPE_MIN_PX`: `js/domain/gestures.js`
- `GAP_MAX_MS`: `js/services/gapTelemetry.js`
- `GARDEN_STAGES`: `js/domain/garden.js`
- `GRADES`: `js/core/config/views.js`
- `GRADE_LABELS`: `js/core/config/views.js`
- `HADITH_BOOK_URL`: `js/core/config/quran.js`
- `HADITH_DAILY_BOOKS`: `js/services/hadith.js`
- `HADITH_GRADES`: `js/services/hadith.js`
- `HADITH_GRADE_IDS`: `js/domain/hadithStudy.js`
- `HADITH_INDEX_URL`: `js/core/config/quran.js`
- `HADITH_PAGE_SIZE`: `js/services/hadith.js`
- `HADITH_SAHIH_COLLECTIONS`: `js/services/hadith.js`
- `HAWL_DAYS`: `js/domain/zakat.js`
- `HIFZ_GRADES`: `js/domain/hifz.js`
- `HIFZ_INTERVALS`: `js/domain/hifz.js`
- `HIFZ_LEVELS`: `js/domain/hifz.js`
- `HIFZ_TESTS`: `js/domain/hifz.js`
- `HOME_DEFAULT_VISIBLE`: `js/domain/homePanels.js`
- `HOME_HIGHLIGHT_PANEL_IDS`: `js/domain/homePanels.js`
- `HOME_PANEL_IDS`: `js/domain/homePanels.js`
- `HOME_PRIMARY_PANEL_IDS`: `js/domain/homePanels.js`
- `HOME_QUICK_TILE_DEFAULTS`: `js/domain/quickTiles.js`
- `ICON_SIZES`: `js/core/config/app.js`
- `INSTALL_MAX_DEFERRALS`: `js/domain/install.js`
- `INSTALL_REOFFER_DAYS`: `js/domain/install.js`
- `INTERNAL_ONLY_ROUTES`: `js/ui/shell.js`
- `INVITE_IDS`: `js/domain/homeInvitations.js`
- `ITEM_OVERRIDE_FIELDS`: `js/domain/contentLens.js`
- `JOURNAL_PAGE_SIZE`: `js/views/journal.js`
- `JUMUAH_PRESET_ID`: `js/domain/reminderPresets.js`
- `KAABA`: `js/domain/qibla.js`
- `KHATMA_CELEBRATION_MS`: `js/domain/khatma.js`
- `KIDS_ALLOWED_VIEWS`: `js/core/config/views.js`
- `KIDS_SURAHS`: `js/domain/kids.js`, `js/views/kids.js`
- `LAMP_AMBER`: `js/domain/ambient.js`
- `LAMP_GROUND`: `js/domain/ambient.js`
- `LAMP_LUMINANCE_CAP`: `js/domain/ambient.js`
- `LANGUAGE_LABELS`: `js/core/i18n.js`
- `LAST_POSITION_SLOTS`: `js/domain/lastPosition.js`
- `LAST_TEN_ITEMS`: `js/domain/ramadanPlanner.js`
- `LAZY_VIEW_KEYS`: `js/app/renderer.js`
- `LEGACY_CONFIRM_STEPS`: `js/domain/onboarding.js`
- `LEGACY_STEP_ORDER`: `js/domain/onboarding.js`
- `LESSON_EXAMPLE_COUNT`: `js/domain/tajweedLessons.js`
- `LEXICAL_STATES`: `js/domain/lexicalProvenance.js`
- `LOCATION_PROFILES_CAP`: `js/domain/locations.js`
- `LOCATION_PROFILES_PRESETS`: `js/domain/locations.js`
- `LOOP_CYCLE`: `js/services/surahPlayback.js`
- `LOOP_CYCLE_UI`: `js/ui/recitationConsole.js`
- `MAX_COMPLETED_CYCLES`: `js/core/utils.js`
- `MAX_LATENESS_MS`: `js/services/alertTriggers.js`
- `MAX_LOOKAHEAD`: `js/services/surahPlayback.js`
- `MAX_PLAN`: `js/services/alertTriggers.js`
- `MAX_SAMPLES`: `js/services/gapTelemetry.js`
- `MAX_SNAPSHOT_BYTES`: `js/views/backupSummary.js`
- `MAX_TOTAL_RECITATIONS`: `js/core/utils.js`
- `METHODS`: `js/domain/prayer.js`
- `MIN_LOOKAHEAD`: `js/services/surahPlayback.js`
- `MISSING_DATA_KINDS`: `js/ui/missingData.js`
- `MOODS`: `js/domain/moods.js`
- `MORNING_WINDOW`: `js/domain/adhkarTiming.js`
- `MUSHAF_DRAG_CLAMP_RATIO`: `js/domain/gestures.js`
- `MUSHAF_DRAG_LIFT`: `js/domain/gestures.js`
- `MUSHAF_FONTS`: `js/core/config/views.js`
- `MUSHAF_META_URL`: `js/core/config/quran.js`
- `MUSHAF_PAGE_COUNT`: `js/core/config/quran.js`
- `MUSHAF_PAGE_URL`: `js/core/config/quran.js`
- `MUSHAF_PAPERS`: `js/core/config/views.js`
- `MUSHAF_SWIPE_MIN_PX`: `js/domain/gestures.js`
- `NAV_GROUPS`: `js/ui/shell.js`
- `NISAB_GOLD_GRAMS`: `js/domain/zakat.js`
- `NISAB_SILVER_GRAMS`: `js/domain/zakat.js`
- `NUDGE_FRESH_DAYS`: `js/domain/nudge.js`
- `NUDGE_MIN_GAP_DAYS`: `js/domain/nudge.js`
- `NUDGE_REPEAT_DAYS`: `js/domain/nudge.js`
- `NUDGE_WARM_DAYS`: `js/domain/nudge.js`
- `OFFLINE_GROUPS`: `js/domain/offline.js`
- `OFFLINE_GROUP_IDS`: `js/domain/offline.js`
- `OFFSET_PRAYERS`: `js/domain/prayer.js`
- `PALETTES`: `js/core/config/views.js`
- `PATHS`: `js/core/icons.js`
- `PATH_MODES`: `js/domain/tajweedCourse.js`
- `PERSISTED_KEYS`: `js/core/state/initial.js`, `js/core/state.js`
- `PLAN_KIND`: `js/domain/planExport.js`
- `PLAN_VERSION`: `js/domain/planExport.js`
- `PLAN_WINDOW_MS`: `js/services/alertTriggers.js`
- `PLAYER_DISMISS_MIN_DY`: `js/domain/gestures.js`
- `PLAYER_IDLE_MS`: `js/app/audioEngine.js`
- `PRACTICE_POOL_CAP`: `js/domain/tajweedPractice.js`
- `PRACTICE_POOL_MIN`: `js/domain/tajweedPractice.js`
- `PRACTICE_ROUND_SIZE`: `js/domain/tajweedPractice.js`
- `PRAYER_EXPORT_ORDER`: `js/domain/prayerExport.js`
- `PRAYER_ICONS`: `js/views/prayer.js`
- `PRAYER_KEYS`: `js/domain/prayerLog.js`
- `PRAYER_ORDER`: `js/domain/prayer.js`, `js/services/alertTriggers.js`
- `PRESETS`: `js/views/tasbih.js`
- `QADA_LOG_CAP`: `js/domain/qada.js`
- `QUICK_TILE_DEFS`: `js/domain/quickTiles.js`
- `QUICK_TILE_IDS`: `js/domain/quickTiles.js`
- `QUIZ_CHOICE_COUNT`: `js/core/config/app.js`
- `QUIZ_LENGTH`: `js/core/config/app.js`
- `QUIZ_LIBRARY_ID`: `js/core/config/app.js`
- `QUIZ_MISS_CAP`: `js/domain/quiz.js`
- `QURAN_CSS_ROUTES`: `js/app/renderer.js`
- `QURAN_DICT_URL`: `js/core/config/quran.js`
- `QURAN_EXPANSION_HIT_CAP`: `js/domain/rootAwareSearch.js`
- `QURAN_META_URL`: `js/core/config/quran.js`
- `QURAN_RECITERS`: `js/core/config/quran.js`
- `QURAN_RECITER_IDS`: `js/core/config/quran.js`
- `QURAN_ROOTS_FULL_URL`: `js/core/config/quran.js`
- `QURAN_ROOTS_URL`: `js/core/config/quran.js`
- `QURAN_SURAH_URL`: `js/core/config/quran.js`
- `QURAN_WORDS_URL`: `js/core/config/quran.js`
- `QURAN_WORD_STUDY_URL`: `js/core/config/quran.js`
- `RAMADAN_COUNTDOWN_DAYS`: `js/domain/homeInvitations.js`
- `RAMADAN_MONTH`: `js/domain/fasting.js`, `js/domain/ramadan.js`
- `READER_WINDOW_SIZE`: `js/domain/readerWindow.js`
- `RECITERS_URL`: `js/core/config/quran.js`
- `RECURRENCE_TYPES`: `js/services/calendarNotes.js`
- `REFLECTIONS_CAP`: `js/domain/duaJournal.js`
- `REFLECTION_PROMPTS`: `js/domain/duaJournal.js`, `js/views/journal.js`
- `REMIND_TIMES`: `js/domain/fasting.js`
- `REPEAT_CYCLE`: `js/services/surahPlayback.js`
- `REPEAT_CYCLE_UI`: `js/ui/recitationConsole.js`
- `REPEAT_MODES`: `js/domain/audioQueue.js`
- `ROOTS_MEANING_URL`: `js/core/config/quran.js`
- `ROOTS_PAGE_SIZE`: `js/domain/roots.js`
- `ROOT_EXPANSION_FORMS_SCANNED_PER_ROOT`: `js/domain/rootAwareSearch.js`
- `ROOT_EXPANSION_MAX_FORMS`: `js/domain/rootAwareSearch.js`
- `ROOT_EXPANSION_MAX_ROOTS`: `js/domain/rootAwareSearch.js`
- `ROOT_GROUP_REF_CAP`: `js/domain/roots.js`
- `ROOT_PREVIEW_CAP`: `js/domain/roots.js`
- `ROUTE_CSS`: `js/app/renderer.js`
- `SADAQAH_AMOUNT_CAP`: `js/domain/worship.js`
- `SADAQAH_LOG_CAP`: `js/domain/worship.js`
- `SAJDA_AYAHS`: `js/services/mushaf.js`
- `SCHEMA_VERSION`: `js/core/config/app.js`
- `SEARCH_LEGACY_KEYS`: `js/domain/searchPagination.js`
- `SEARCH_PAGE_KEYS`: `js/domain/searchPagination.js`
- `SEARCH_PAGE_SIZES`: `js/domain/searchPagination.js`
- `SEED_LOOKAHEAD`: `js/services/surahPlayback.js`
- `SESSION_ARTWORK`: `js/services/mediaSession.js`
- `SETTINGS_GROUPS`: `js/views/settings.js`
- `SETTINGS_SECTIONS`: `js/views/settings.js`
- `SETTINGS_SECTION_SLUGS`: `js/core/config/sanitize.js`
- `SHAPES`: `js/core/config/views.js`
- `SHARE_PROTOCOL`: `js/domain/launchIntents.js`
- `SHORTCUT_SEEK_SEC`: `js/app/audioEngine.js`
- `SLEEP_TIMER_CHOICES`: `js/domain/sleepTimer.js`, `js/services/surahPlayback.js`
- `SOUND_IDS`: `js/services/prayerSound.js`
- `SPEED_CYCLE_UI`: `js/ui/recitationConsole.js`
- `STALE_BACKUP_DAYS`: `js/services/backup.js`
- `STEP_ICONS`: `js/views/onboardingPanel.js`
- `STORAGE_KEY`: `js/core/config/app.js`
- `STREAK_MILESTONES`: `js/domain/statistics.js`
- `SUHOOR_OFFSETS`: `js/core/config/app.js`
- `SUNNAH_ITEMS`: `js/domain/sunnah.js`
- `SWIPE_GUARD_SELECTOR`: `js/domain/gestures.js`
- `SWIPE_TEXT_SURFACE_SELECTOR`: `js/domain/gestures.js`
- `TAFSIR_EDITIONS_URL`: `js/core/config/quran.js`
- `TAFSIR_REMOTE_URL`: `js/core/config/quran.js`
- `TAFSIR_TEXT_URL`: `js/core/config/quran.js`
- `TAJWEED_ANSWER_MODES`: `js/domain/tajweedPractice.js`
- `TAJWEED_COLOR_CHOICES`: `js/domain/tajweed.js`
- `TAJWEED_COURSE_SESSION_IDS`: `js/views/tajweedCourseView.js`
- `TAJWEED_FAMILIES`: `js/domain/tajweed.js`
- `TAJWEED_FAMILY_ID_SET`: `js/core/config/quran.js`
- `TAJWEED_FAMILY_VARS`: `js/domain/tajweed.js`
- `TAJWEED_MISS_CAP`: `js/domain/tajweedPractice.js`
- `TAJWEED_PRACTICE_POOL_URL`: `js/core/config/quran.js`
- `TAJWEED_QUIZ_MODES`: `js/domain/tajweedPractice.js`
- `TAJWEED_RULES`: `js/domain/tajweed.js`
- `TAJWEED_RULE_ID_SET`: `js/core/config/quran.js`
- `TAJWEED_SOURCES`: `js/domain/tajweedSources.js`
- `TAJWEED_WORKS`: `js/domain/tajweedSources.js`
- `TASBIH_MILESTONES`: `js/core/config/app.js`
- `THEME_MODES`: `js/core/config/views.js`
- `TRANSLATION_EDITIONS`: `js/core/config/quran.js`
- `TRANSLATION_URL`: `js/core/config/quran.js`
- `TRIGGER_ARM_THROTTLE_MS`: `js/app/triggers.js`
- `TRIGGER_TAG_PREFIX`: `js/services/alertTriggers.js`
- `VERSE_BITRATES`: `js/core/config/quran.js`
- `VERSE_RATES`: `js/services/surahPlayback.js`
- `VIEWS`: `js/core/config/views.js`
- `VIEW_ENTER_MS`: `js/app/renderer.js`
- `VOICES`: `js/app/audioEngine.js`
- `WHITE_DAYS`: `js/domain/fasting.js`
- `WIZARD_STEP_IDS`: `js/domain/onboarding.js`
- `WMM_COEF`: `js/domain/wmm-coefs.js`
- `WMM_EPOCH`: `js/domain/wmm-coefs.js`
- `WMM_NAME`: `js/domain/wmm-coefs.js`
- `WMM_RELEASED`: `js/domain/wmm-coefs.js`
- `ZAKAT_RATE`: `js/domain/zakat.js`
- `_expireSleepForTests`: `js/services/surahPlayback.js`
- `_haystackBuildsForTests`: `js/services/hadith.js`
- `_readingSinceForTests`: `js/app/readingTimer.js`
- `_resetAppBadgeForTests`: `js/services/appBadge.js`
- `_resetAudioContextForTests`: `js/services/audioContext.js`
- `_resetAudioStoreForTests`: `js/services/audioStore.js`
- `_resetAvailabilityForTests`: `js/services/moshafAvailability.js`
- `_resetForTests`: `js/services/soundDesign.js`
- `_resetMediaHandlersForTests`: `js/services/mediaSession.js`
- `_resetPlayingStateForTests`: `js/services/mediaSession.js`
- `_sleepTickForTests`: `js/services/player.js`
- `accuracyFor`: `js/domain/tajweedPractice.js`
- `actions`: `js/core/state/actions.js`, `js/core/state.js`
- `activateMushafAutoFit`: `js/app/autoFit.js`
- `activeDays`: `js/domain/statistics.js`
- `activeDaysInLastDays`: `js/domain/statistics.js`
- `activeFastingCategories`: `js/domain/fasting.js`
- `addBacklog`: `js/domain/qada.js`
- `addCategory`: `js/services/editor.js`
- `addCategoryToLibrary`: `js/services/contentPrefs.js`
- `addDays`: `js/core/utils.js`
- `addItemToCategory`: `js/services/contentPrefs.js`
- `adhanPanelHTML`: `js/views/prayer.js`
- `adhkarBrowserHTML`: `js/views/home.js`
- `adhkarWindowLabel`: `js/views/home.js`
- `advanceClassifyRound`: `js/app/practice.js`
- `advancePracticeRound`: `js/app/practice.js`
- `alertStatusHTML`: `js/views/prayer.js`
- `allSessions`: `js/domain/tajweedCourse.js`
- `ambientDhikr`: `js/domain/ambient.js`
- `ambientTick`: `js/app/tickers.js`
- `ambientVerse`: `js/domain/ambient.js`
- `angleDelta`: `js/domain/qibla.js`
- `answerClassify`: `js/app/practice.js`
- `appliesToDate`: `js/services/calendarNotes.js`
- `applyAudioCacheCapFromSettings`: `js/services/audioStore.js`
- `applyCategoryFields`: `js/services/contentPrefs.js`
- `applyItemFields`: `js/services/contentPrefs.js`
- `applyItemOverrides`: `js/domain/contentLens.js`
- `applyLibraryFields`: `js/services/contentPrefs.js`
- `applyPrayerOffsets`: `js/domain/prayer.js`
- `applyTajweedColors`: `js/app/handlers/quran.js`
- `applyTheme`: `js/core/theme.js`
- `applyTranslationEdition`: `js/app/quranData.js`
- `ar`: `js/core/i18n/ar.js`
- `armFsControlsAfterEnter`: `js/app/fullscreen.js`
- `armPaletteShortcut`: `js/app/palette.js`
- `armPrayerTriggers`: `js/app/triggers.js`
- `armSleepTimer`: `js/services/player.js`, `js/services/surahPlayback.js`
- `armTimer`: `js/domain/sleepTimer.js`
- `asTranslationEdition`: `js/core/config/quran.js`
- `audioCacheUsage`: `js/services/audioStore.js`
- `audioKey`: `js/services/audioStore.js`
- `autoBackupDue`: `js/services/backup.js`
- `availableLanguages`: `js/core/i18n.js`
- `availableSessions`: `js/domain/tajweedCourse.js`
- `averagePerDay`: `js/domain/statistics.js`
- `ayahAudioUrl`: `js/services/mushaf.js`
- `ayahCardFilename`: `js/services/shareCard.js`
- `ayahCardMemoStats`: `js/views/quran.js`
- `ayahCountPhrase`: `js/core/utils.js`
- `ayahKey`: `js/services/surahPlayback.js`
- `ayahMistakes`: `js/domain/hifz.js`
- `ayahTranslit`: `js/domain/wordStudy.js`
- `backfillTajweedPool`: `js/domain/tajweedPractice.js`
- `backupErrorText`: `js/app/fileImports.js`
- `backupFileText`: `js/services/backup.js`
- `backupStale`: `js/services/backup.js`
- `backupSummaryHTML`: `js/views/backupSummary.js`
- `badgeCountFor`: `js/services/appBadge.js`
- `bindGlobalEvents`: `js/app/events.js`
- `blankCategory`: `js/core/schema.js`
- `blankItem`: `js/core/schema.js`
- `blankItemTemplate`: `js/services/editor.js`
- `bookStanding`: `js/services/hadith.js`
- `boot`: `js/app/boot.js`
- `buildAnswerKey`: `js/domain/tajweedPractice.js`
- `buildAyahCardPayload`: `js/services/shareCard.js`
- `buildAyahQuickSheet`: `js/views/quran.js`
- `buildAyahStudyExtras`: `js/views/tafsirPanel.js`
- `buildBackupPayload`: `js/services/backup.js`
- `buildBismillahHTML`: `js/views/tafsirPanel.js`
- `buildCalendarSheet`: `js/views/viewSheets.js`
- `buildCardMenu`: `js/ui/menus.js`
- `buildCategoryForm`: `js/views/editor.js`
- `buildCategorySheet`: `js/views/viewSheets.js`
- `buildChecklistSheet`: `js/views/viewSheets.js`
- `buildClassifyQuestion`: `js/domain/tajweedPractice.js`
- `buildCollectionPicker`: `js/ui/menus.js`
- `buildCollectionShareText`: `js/views/collection.js`
- `buildConfirm`: `js/ui/menus.js`
- `buildDayDetail`: `js/ui/calendarModals.js`
- `buildDeck`: `js/domain/grammarDrill.js`
- `buildDrillRound`: `js/domain/mutashabihat.js`
- `buildEditorSheet`: `js/views/viewSheets.js`
- `buildFieldTogglesSheet`: `js/views/viewSheets.js`
- `buildFullscreenConsole`: `js/views/mushafPlayer.js`
- `buildGardenHowSheet`: `js/views/viewSheets.js`
- `buildGardenSheet`: `js/views/viewSheets.js`
- `buildHadithBookSheet`: `js/views/viewSheets.js`
- `buildHadithIndex`: `js/domain/hadithSearch.js`
- `buildHadithSheet`: `js/views/viewSheets.js`
- `buildHash`: `js/core/router.js`
- `buildIndex`: `js/domain/search.js`
- `buildItemForm`: `js/views/editor.js`
- `buildItemIndex`: `js/app/net.js`
- `buildKhatmaPlanForm`: `js/views/khatma.js`, `js/views/mushafReader.js`
- `buildLibraryForm`: `js/views/editor.js`
- `buildLibrarySheet`: `js/views/viewSheets.js`
- `buildMcqOptions`: `js/domain/hifz.js`
- `buildMonthICS`: `js/domain/prayerExport.js`
- `buildMonthModal`: `js/views/prayer.js`
- `buildMonthTimetable`: `js/domain/prayerExport.js`
- `buildMovePicker`: `js/ui/menus.js`
- `buildMushafAyahDetail`: `js/views/ayahStudy.js`, `js/views/mushafReader.js`
- `buildMushafBookmarks`: `js/views/mushafBookmarks.js`, `js/views/mushafReader.js`
- `buildMushafJump`: `js/views/mushafJump.js`, `js/views/mushafReader.js`
- `buildMushafPageFind`: `js/views/mushafPageFind.js`
- `buildMushafPlayPick`: `js/views/mushafPlayer.js`, `js/views/mushafReader.js`
- `buildMushafSettingsPanel`: `js/views/tafsirPanel.js`
- `buildMushafSheet`: `js/views/mushafReader.js`
- `buildMushafTrack`: `js/views/khatma.js`, `js/views/mushafReader.js`
- `buildNoteForm`: `js/ui/calendarModals.js`
- `buildOnboardingSteps`: `js/domain/onboarding.js`
- `buildPaletteGroups`: `js/views/palette.js`
- `buildPlan`: `js/domain/planExport.js`
- `buildPracticeLesson`: `js/views/tajweedPracticeView.js`
- `buildPracticePicker`: `js/views/tajweedPracticeView.js`
- `buildPracticeRound`: `js/views/tajweedPracticeView.js`
- `buildPracticeSummary`: `js/views/tajweedPracticeView.js`
- `buildPrayerICS`: `js/domain/prayerExport.js`
- `buildPrayerSheet`: `js/views/viewSheets.js`
- `buildQiblaSheet`: `js/views/viewSheets.js`
- `buildQuizDeck`: `js/app/quizDeck.js`
- `buildQuranIndex`: `js/domain/quranSearch.js`
- `buildRamadanSheet`: `js/views/viewSheets.js`
- `buildReciterPick`: `js/app/handlers/quranAudio.js`
- `buildSadaqahEditor`: `js/views/home.js`
- `buildSavedWordsPanel`: `js/views/tafsirPanel.js`
- `buildScheduleForm`: `js/views/editor.js`
- `buildScheduleManagerSheet`: `js/views/viewSheets.js`
- `buildSimilarPairs`: `js/domain/mutashabihat.js`
- `buildStatisticsSheet`: `js/views/viewSheets.js`
- `buildStatsCSV`: `js/domain/statistics.js`
- `buildStudyHadithSection`: `js/views/ayahStudy.js`
- `buildStudyTray`: `js/views/studyTray.js`
- `buildTafsirIndex`: `js/domain/tafsirSearch.js`
- `buildTafsirPanel`: `js/views/tafsirPanel.js`
- `buildTajweedSettingsPanel`: `js/views/tajweedSettings.js`
- `buildTasbihSheet`: `js/views/viewSheets.js`
- `buildTextPrompt`: `js/ui/menus.js`
- `buildTimeline`: `js/domain/prayerTimeline.js`
- `buildTriggerPlan`: `js/services/alertTriggers.js`
- `buildWeekSummary`: `js/domain/statistics.js`
- `buildWordAnswerKey`: `js/domain/tajweedPractice.js`
- `buildWordStudyLoadingPanel`: `js/views/tafsirPanel.js`
- `buildWordStudyPanel`: `js/views/tafsirPanel.js`
- `buildZakatSheet`: `js/views/viewSheets.js`
- `calcPanelHTML`: `js/views/prayer.js`
- `calculateTimes`: `js/domain/prayer.js`
- `canonicalWordTokens`: `js/domain/tajweed.js`
- `cardFilename`: `js/services/shareCard.js`
- `cardHTML`: `js/ui/card.js`
- `cardinalLabel`: `js/domain/qibla.js`
- `categoryDisplayName`: `js/core/utils.js`
- `certificateData`: `js/domain/milestones.js`
- `changeHandlers`: `js/app/handlers/audio.js`, `js/app/handlers/content.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/offline.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/worship.js`
- `changeRegistry`: `js/app/events.js`
- `checkOfflineRoom`: `js/app/offlineJobs.js`
- `checklistStreak`: `js/services/checklist.js`
- `claimSpeaker`: `js/app/audioEngine.js`
- `clamp`: `js/core/utils.js`
- `clampJournalPage`: `js/views/journal.js`
- `clampPage`: `js/services/hadith.js`, `js/services/mushaf.js`
- `clampSliderNum`: `js/app/inputs.js`
- `classifyAyahTajweed`: `js/domain/tajweed.js`
- `classifyMemoSizeForTests`: `js/domain/tajweed.js`
- `classifyWordTajweed`: `js/domain/tajweed.js`
- `cleanObject`: `js/core/utils.js`
- `cleanSadaqahAmount`: `js/domain/worship.js`
- `cleanSnapshotBytes`: `js/views/backupSummary.js`
- `clear`: `js/services/gapTelemetry.js`
- `clearAppBadge`: `js/services/appBadge.js`
- `clearBackupHandle`: `js/services/backup.js`
- `clearBatchQueue`: `js/services/audioStore.js`
- `clearCelebrations`: `js/domain/celebrate.js`
- `clearClassifyMemo`: `js/domain/tajweed.js`
- `clearDismissed`: `js/domain/completedCards.js`
- `clearLazyInFlightFetches`: `js/app/lazyData.js`
- `clearMetadata`: `js/services/mediaSession.js`
- `clearMoshafAvailability`: `js/services/moshafAvailability.js`
- `clearMushafTarget`: `js/ui/readingTokens.js`
- `clearQuizMiss`: `js/domain/quiz.js`
- `clearQuranDataFetches`: `js/app/quranData.js`
- `clearScrollMemory`: `js/app/renderer.js`
- `clearSleepTimer`: `js/services/player.js`, `js/services/surahPlayback.js`
- `clearStudyData`: `js/app/offlineJobs.js`
- `clearTextCache`: `js/app/offlineJobs.js`
- `clearTimer`: `js/domain/sleepTimer.js`
- `clickHandlers`: `js/app/handlers/audio.js`, `js/app/handlers/content.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/offline.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/viewMenus.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `clone`: `js/core/utils.js`
- `closeAudioStoreForReset`: `js/services/audioStore.js`
- `closeFloatingCounter`: `js/services/floatingCounter.js`
- `closeLiveDatabases`: `js/core/idb/openDB.js`
- `closeModal`: `js/ui/modal.js`
- `closeNavDrawer`: `js/app/drawer.js`
- `clozeAyahHTML`: `js/domain/hifz.js`
- `clozeWords`: `js/domain/hifz.js`
- `coerceGoal`: `js/core/state/streak.js`
- `collectDrillWords`: `js/domain/grammarDrill.js`
- `collectionFor`: `js/domain/localeContent.js`
- `compactPrayerMethodLine`: `js/domain/prayer.js`
- `compareVisible`: `js/domain/translationCompare.js`
- `completeOldest`: `js/domain/qada.js`
- `completedCount`: `js/services/checklist.js`
- `computeFitScale`: `js/app/autoFit.js`
- `computeFitr`: `js/domain/zakat.js`
- `computeNisab`: `js/domain/zakat.js`
- `computeNudge`: `js/domain/nudge.js`
- `computeReaderWindow`: `js/domain/readerWindow.js`
- `computeStreak`: `js/core/state/streak.js`
- `computeWarmTriples`: `js/services/surahPlayback.js`
- `computeZakat`: `js/domain/zakat.js`
- `configureDriver`: `js/services/recitation.js`
- `confirmHadithIndexAll`: `js/app/hadithData.js`
- `confusablePairsFor`: `js/domain/mutashabihat.js`
- `consoleSnapshot`: `js/ui/recitationConsole.js`
- `consonantSkeleton`: `js/domain/rootAwareSearch.js`
- `consumeFlipDirection`: `js/ui/readingTokens.js`
- `consumeFullscreenAnim`: `js/ui/readingTokens.js`
- `consumeLastFinish`: `js/services/surahPlayback.js`
- `consumeMushafTarget`: `js/ui/readingTokens.js`
- `consumePopNavigation`: `js/core/router.js`
- `containsArabic`: `js/domain/localeContent.js`
- `containsSurfaceWord`: `js/domain/tajweed.js`
- `contentPrefsOf`: `js/services/contentPrefs.js`
- `contentTitleFor`: `js/domain/localeContent.js`
- `countMemorized`: `js/domain/hifz.js`
- `countdownLabel`: `js/domain/sleepTimer.js`
- `courseProgress`: `js/domain/tajweedCourse.js`
- `courseRules`: `js/domain/tajweedCourse.js`
- `createLibrary`: `js/services/editor.js`
- `currentAyahDetailPage`: `js/app/lazyData.js`
- `currentDhikrAudioItemId`: `js/services/dhikrAudio.js`
- `currentDhikrAudioUrl`: `js/services/dhikrAudio.js`
- `currentPrayer`: `js/domain/prayer.js`
- `currentReciterId`: `js/services/surahPlayback.js`
- `currentSrc`: `js/services/player.js`
- `currentlyPlayingKey`: `js/services/recitation.js`
- `customAdhanFlags`: `js/services/prayerSound.js`
- `customMoshafId`: `js/services/audioCatalog.js`
- `cycleRepeatMode`: `js/domain/audioQueue.js`
- `cycleState`: `js/domain/prayerLog.js`
- `cycleTabFocus`: `js/ui/modal.js`
- `dailyEligibleEntries`: `js/domain/dailyAyah.js`
- `dailyHadithCardHTML`: `js/views/hadithCard.js`
- `dailyVerseReminder`: `js/domain/reminderPresets.js`
- `dateKey`: `js/core/utils.js`
- `datesWithNotesInRange`: `js/services/calendarNotes.js`
- `dayComplete`: `js/domain/prayerLog.js`
- `dayKey`: `js/domain/reminderPresets.js`
- `daySeed`: `js/services/hadith.js`
- `daysInHijriMonth`: `js/domain/calendar.js`
- `daysSinceBackup`: `js/services/dataHealth.js`
- `daysUntilHawl`: `js/domain/zakat.js`
- `deactivateMushafAutoFit`: `js/app/autoFit.js`
- `debounce`: `js/core/utils.js`
- `debounceCollectionSearchNavigate`: `js/app/inputs.js`
- `debounceFavoritesSearchNavigate`: `js/app/inputs.js`
- `debounceHadithGridQuery`: `js/app/inputs.js`
- `debounceHadithQuery`: `js/app/inputs.js`
- `debounceJournalSearchNavigate`: `js/app/inputs.js`
- `debounceQuranSearchNavigate`: `js/app/inputs.js`
- `debounceRootsSearchNavigate`: `js/app/inputs.js`
- `debounceSearchNavigate`: `js/app/inputs.js`
- `debounceSettingsSearchNavigate`: `js/app/inputs.js`
- `debounceTajweedCourseSearchNavigate`: `js/app/inputs.js`
- `decimalHoursToDate`: `js/domain/prayer.js`
- `decimalYear`: `js/domain/wmm.js`
- `declinationAt`: `js/domain/wmm.js`
- `declinationCached`: `js/domain/wmm.js`
- `declinationLabel`: `js/domain/wmm.js`
- `dedupeEntries`: `js/domain/reflections.js`
- `defaultBackupStorage`: `js/services/backup.js`
- `defaultFastingPrefs`: `js/domain/fasting.js`
- `defaultHiddenHome`: `js/domain/homePanels.js`
- `defaultInstallDeferral`: `js/domain/install.js`
- `defaultLastPosition`: `js/domain/lastPosition.js`
- `defaultNudgeState`: `js/domain/nudge.js`
- `defaultSearchEdition`: `js/domain/tafsirSearch.js`
- `defaultTajweedPracticeStats`: `js/domain/tajweedPractice.js`
- `deferredSetupHTML`: `js/views/settings.js`
- `deleteAdhanAudio`: `js/services/audioStore.js`
- `deleteAudio`: `js/services/audioStore.js`
- `deleteCategory`: `js/services/editor.js`
- `deleteItem`: `js/services/editor.js`
- `deleteLibrary`: `js/services/editor.js`
- `deleteMoshafAudio`: `js/services/audioStore.js`
- `deleteVerseAudio`: `js/services/audioStore.js`
- `describeBackupSummary`: `js/views/backupSummary.js`
- `desiredPlayingState`: `js/services/mediaSession.js`
- `detectInstallPlatform`: `js/domain/install.js`
- `dictEntryFor`: `js/domain/wordStudy.js`
- `diffDays`: `js/domain/hifz.js`
- `diffWords`: `js/domain/mutashabihat.js`
- `disclosureHTML`: `js/ui/card.js`
- `dismissCompleted`: `js/domain/completedCards.js`
- `dispatchRegistry`: `js/app/events.js`
- `dispatchSurahDoc`: `js/app/quranData.js`
- `distanceToKaabaKm`: `js/domain/qibla.js`
- `docCorpusCount`: `js/views/home.js`
- `downloadBackup`: `js/services/backup.js`
- `downloadBlob`: `js/services/shareCard.js`
- `downloadOne`: `js/app/audioEngine.js`
- `downloadPlan`: `js/services/backup.js`
- `downloadSurah`: `js/services/audioStore.js`
- `downloadVerseFile`: `js/services/audioStore.js`
- `drawerSectionsHTML`: `js/ui/shell.js`
- `drillHTML`: `js/views/roots.js`
- `driverHasEnded`: `js/services/recitation.js`
- `driverOffEnded`: `js/services/recitation.js`
- `driverOffError`: `js/services/recitation.js`
- `driverOnEnded`: `js/services/recitation.js`
- `driverOnError`: `js/services/recitation.js`
- `driverPause`: `js/services/recitation.js`
- `driverPlay`: `js/services/recitation.js`
- `driverPreload`: `js/services/recitation.js`
- `driverResume`: `js/services/recitation.js`
- `driverSetRate`: `js/services/recitation.js`
- `driverSetVolume`: `js/services/recitation.js`
- `driverStop`: `js/services/recitation.js`
- `dryRunRestore`: `js/core/state/restore.js`, `js/core/state.js`
- `dryRunVerdict`: `js/services/dataHealth.js`
- `duaMonthStats`: `js/domain/duaJournal.js`
- `dueAyahs`: `js/domain/hifz.js`
- `dueCounts`: `js/domain/hifz.js`
- `dueMemRecords`: `js/domain/hifz.js`
- `dueSurahs`: `js/domain/hifz.js`
- `duplicateItem`: `js/services/editor.js`
- `duration`: `js/services/player.js`
- `echoPauseOptions`: `js/app/handlers/quranAudio.js`
- `editionBodyHTML`: `js/views/tafsirPanel.js`
- `effectiveAdhanVolume`: `js/services/prayerSound.js`
- `effectiveRuleColor`: `js/domain/tajweed.js`
- `elapsedSeconds`: `js/app/readingTimer.js`
- `emptyStateHTML`: `js/ui/emptyState.js`
- `en`: `js/core/i18n/en.js`
- `enforceAudioCacheCap`: `js/services/audioStore.js`
- `ensureHadithBook`: `js/app/hadithData.js`
- `ensureHadithData`: `js/app/hadithData.js`
- `ensureHadithIndex`: `js/app/hadithData.js`
- `ensureHadithSearchIndex`: `js/app/hadithData.js`
- `ensureMushafData`: `js/app/lazyData.js`
- `ensureMushafMeta`: `js/app/lazyData.js`
- `ensureMushafNavigationPages`: `js/app/lazyData.js`
- `ensureMushafSurahDocs`: `js/app/lazyData.js`
- `ensureOfflineQuota`: `js/app/offlineJobs.js`
- `ensurePersistentStorage`: `js/services/audioStore.js`
- `ensureQuranCss`: `js/app/renderer.js`
- `ensureQuranData`: `js/app/lazyData.js`
- `ensureQuranMeta`: `js/app/lazyData.js`
- `ensureQuranRoots`: `js/app/lazyData.js`
- `ensureQuranRootsFull`: `js/app/lazyData.js`
- `ensureQuranSearchData`: `js/app/quranSearch.js`
- `ensureQuranWordsData`: `js/app/lazyData.js`
- `ensureRecitersData`: `js/app/audioEngine.js`
- `ensureRootsMeaning`: `js/app/lazyData.js`
- `ensureTafsirEditions`: `js/app/lazyData.js`
- `ensureTafsirSearchData`: `js/app/tafsirSearch.js`
- `ensureTafsirText`: `js/app/lazyData.js`
- `ensureTajweedPool`: `js/app/lazyData.js`
- `ensureTranslationBDoc`: `js/app/quranData.js`
- `ensureTranslationCDoc`: `js/app/quranData.js`
- `ensureWordDict`: `js/app/lazyData.js`
- `escapeHTML`: `js/core/utils.js`
- `essentialsAutoBlocker`: `js/app/offlineJobs.js`
- `ewmaUpdate`: `js/services/surahPlayback.js`
- `expandQueryWithRoots`: `js/domain/rootAwareSearch.js`
- `expandWindow`: `js/domain/readerWindow.js`
- `fail`: `js/core/utils.js`
- `failedLibraryIds`: `js/app/net.js`
- `fastPhase`: `js/domain/ramadan.js`
- `fastTrackerDays`: `js/domain/ramadan.js`
- `fastedToday`: `js/domain/worship.js`
- `fastingCategoriesForDate`: `js/domain/fasting.js`
- `favoriteSortFor`: `js/views/favorites.js`
- `fetchDataResponse`: `js/app/net.js`
- `fetchJSON`: `js/app/net.js`
- `fetchTranslationOverlay`: `js/app/quranData.js`
- `fetchWithTimeout`: `js/app/net.js`, `js/core/fetch.js`
- `fieldTogglesFor`: `js/domain/contentLens.js`
- `fileConsole`: `js/views/mushafPlayer.js`
- `filePickerSupported`: `js/services/backup.js`
- `filterEntries`: `js/domain/search.js`
- `filterHadiths`: `js/services/hadith.js`
- `filterLapsedPairs`: `js/domain/mutashabihat.js`
- `filterSpansByPrefs`: `js/domain/tajweed.js`
- `findCategoryById`: `js/services/contentPrefs.js`
- `findEdition`: `js/domain/wordStudy.js`
- `findMoshaf`: `js/services/audioCatalog.js`
- `findSession`: `js/domain/tajweedCourse.js`
- `findStage`: `js/domain/tajweedCourse.js`
- `findTouch`: `js/domain/gestures.js`
- `firstAyahOnPage`: `js/views/mushafPlayer.js`
- `firstPendingItem`: `js/domain/reflections.js`
- `firstTrackedKey`: `js/domain/review.js`
- `firstWeakRuleForAyah`: `js/domain/tajweedPractice.js`
- `floatingCounterHTML`: `js/services/floatingCounter.js`
- `flushReading`: `js/app/readingTimer.js`
- `focusEnterClass`: `js/views/focus.js`
- `focusSignature`: `js/app/renderer.js`
- `focusSwipeTurn`: `js/domain/gestures.js`
- `foldRoot`: `js/domain/roots.js`
- `foldTranslit`: `js/domain/rootAwareSearch.js`
- `follow`: `js/services/surahPlayback.js`
- `formHandlers`: `js/app/forms.js`
- `formatAmount`: `js/domain/zakat.js`
- `formatArabicCommentary`: `js/views/tafsirPanel.js`
- `formatBytes`: `js/core/utils.js`, `js/services/audioStore.js`, `js/services/dataHealth.js`
- `formatClock`: `js/domain/prayer.js`
- `formatCountdown`: `js/domain/ramadan.js`
- `formatEnglishCommentary`: `js/views/tafsirPanel.js`
- `formatReadingMinutes`: `js/views/statistics.js`
- `freshSessionCounters`: `js/core/state/restore.js`
- `fridayAnchor`: `js/domain/reminderPresets.js`
- `fridayOf`: `js/domain/homeInvitations.js`
- `fsPlayButtonHTML`: `js/views/mushafPlayer.js`
- `fsRecitationState`: `js/views/mushafReader.js`
- `fullSurahMetadata`: `js/services/mediaSession.js`
- `gardenAchievements`: `js/domain/garden.js`
- `gardenState`: `js/domain/garden.js`
- `generateAyahCardBlob`: `js/services/shareCard.js`
- `generateCardBlob`: `js/services/shareCard.js`
- `genericSourceState`: `js/domain/lexicalProvenance.js`
- `getAdhanAudio`: `js/services/audioStore.js`
- `getAudio`: `js/services/audioStore.js`
- `getAudioContext`: `js/services/audioContext.js`
- `getCounter`: `js/services/tasbih.js`
- `getCustomLibrary`: `js/services/editor.js`
- `getItemEntry`: `js/app/shared.js`
- `getModalGeneration`: `js/ui/modal.js`
- `getVerseAudio`: `js/services/audioStore.js`
- `getWord`: `js/domain/wordStudy.js`
- `globalAyahNumber`: `js/services/mushaf.js`
- `go`: `js/core/router.js`
- `goalProgress`: `js/domain/statistics.js`
- `gradeChipHTML`: `js/domain/grades.js`
- `gradeStateOf`: `js/domain/grades.js`
- `gradeStep`: `js/domain/hifz.js`
- `h`: `js/core/utils.js`
- `hadithCardHTML`: `js/views/hadithCard.js`
- `hadithIndexStats`: `js/domain/hadithSearch.js`
- `hadithNarrator`: `js/domain/hadithStudy.js`
- `hadithNarratorFromAr`: `js/domain/hadithStudy.js`
- `hadithNarratorFromEn`: `js/domain/hadithStudy.js`
- `hadithUrls`: `js/domain/offline.js`
- `handleAdhanImport`: `js/app/fileImports.js`
- `handleCompassHeading`: `js/app/compassRuntime.js`
- `handleDayFiredStorageEvent`: `js/services/notifications.js`
- `handleFocusKeydown`: `js/app/focusRuntime.js`
- `handleImportFile`: `js/app/fileImports.js`
- `handleImportPlanFile`: `js/app/fileImports.js`
- `handlePromptForm`: `js/app/forms.js`
- `handleZakatInput`: `js/app/inputs.js`
- `handlerMaps`: `js/app/events.js`
- `hasAnyLastPosition`: `js/domain/lastPosition.js`
- `hasEnded`: `js/services/recitation.js`
- `hasPendingScholarlyReview`: `js/domain/contentLens.js`, `js/domain/localeContent.js`
- `hasPreset`: `js/domain/reminderPresets.js`
- `hasResumableWork`: `js/domain/audioBatch.js`
- `hasVerifiedDhikrAudio`: `js/core/schema.js`
- `hawlDueFor`: `js/domain/zakat.js`
- `hiddenCategoryItems`: `js/services/contentPrefs.js`
- `hifzHeatmapHTML`: `js/views/quran.js`
- `hifzReviewCardHTML`: `js/views/home.js`
- `hifzToolbarHTML`: `js/views/quran.js`
- `highlightMatch`: `js/core/utils.js`
- `hijriInviteState`: `js/domain/homeInvitations.js`
- `hizbStartPage`: `js/services/mushaf.js`
- `homeInvitesHTML`: `js/views/home.js`
- `homeTick`: `js/app/tickers.js`
- `homeTodayStripHTML`: `js/views/home.js`
- `hoursToClock`: `js/domain/prayer.js`
- `hydrate`: `js/services/gapTelemetry.js`
- `icon`: `js/core/icons.js`
- `icsEscape`: `js/domain/prayerExport.js`
- `icsLocal`: `js/domain/prayerExport.js`
- `inclusiveDays`: `js/domain/khatma.js`
- `increment`: `js/services/tasbih.js`
- `initFullscreenSync`: `js/app/fullscreen.js`
- `initRouter`: `js/core/router.js`
- `initialReaderWindow`: `js/domain/readerWindow.js`
- `initialState`: `js/core/state/initial.js`, `js/core/state.js`
- `initialTimerState`: `js/domain/sleepTimer.js`
- `inputHandlers`: `js/app/handlers/audio.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/zakat.js`
- `inputRegistry`: `js/app/events.js`
- `installMediaHandlers`: `js/services/mediaSession.js`
- `installRowHTML`: `js/views/installRow.js`
- `installStepsKey`: `js/domain/install.js`
- `intensityBucket`: `js/domain/statistics.js`
- `invalidateLazyFetches`: `js/app/lazyData.js`
- `inviteDayKey`: `js/domain/homeInvitations.js`
- `isActive`: `js/services/surahPlayback.js`
- `isAutoAdvancePendingFor`: `js/app/focusRuntime.js`
- `isBackupFile`: `js/domain/launchIntents.js`
- `isBulkAbortError`: `js/app/net.js`
- `isCategoryHidden`: `js/services/contentPrefs.js`
- `isCompletedToday`: `js/domain/reflections.js`
- `isDayComplete`: `js/services/checklist.js`
- `isDismissed`: `js/domain/completedCards.js`
- `isDrivable`: `js/domain/tajweedCourse.js`
- `isEnabled`: `js/services/gapTelemetry.js`
- `isEnglishEdition`: `js/views/tafsirPanel.js`
- `isFirstPage`: `js/services/mushaf.js`
- `isFridayInviteDay`: `js/domain/homeInvitations.js`
- `isFunctionToken`: `js/domain/lexicalProvenance.js`
- `isFuturePayload`: `js/core/state/restore.js`
- `isHadithIndexAllConfirmed`: `js/app/hadithData.js`
- `isInviteDismissed`: `js/domain/homeInvitations.js`
- `isKidsAllowedView`: `js/core/config/views.js`
- `isLastPage`: `js/services/mushaf.js`
- `isLastTenNights`: `js/domain/ramadanPlanner.js`
- `isMissingResourceError`: `js/app/net.js`
- `isModalOpen`: `js/ui/modal.js`
- `isMuted`: `js/services/player.js`, `js/services/recitation.js`
- `isOpen`: `js/services/floatingCounter.js`
- `isPlanFile`: `js/domain/planExport.js`
- `isPlayerDismissSwipe`: `js/domain/gestures.js`
- `isPlaying`: `js/services/recitation.js`
- `isPlayingDhikrAudioItem`: `js/services/dhikrAudio.js`
- `isQuietNow`: `js/services/prayerSound.js`
- `isQuizItemId`: `js/domain/quiz.js`
- `isQuranSearchReady`: `js/domain/quranSearch.js`
- `isRTL`: `js/core/i18n.js`
- `isReadingView`: `js/app/readingTimer.js`
- `isReturningUser`: `js/domain/onboarding.js`
- `isSafeKey`: `js/core/utils.js`
- `isSajdaAyah`: `js/services/mushaf.js`
- `isSpeaking`: `js/services/speech.js`
- `isSpeakingItem`: `js/services/speech.js`
- `isStreakDay`: `js/core/state/streak.js`
- `isStudyTrayOpen`: `js/views/studyTray.js`
- `isSupported`: `js/domain/compass.js`, `js/services/floatingCounter.js`, `js/services/speech.js`
- `isSurahMissing`: `js/services/moshafAvailability.js`
- `isSwipeGuardTarget`: `js/domain/gestures.js`
- `isTafsirLoaded`: `js/domain/wordStudy.js`
- `isTafsirSearchReady`: `js/domain/tafsirSearch.js`
- `isTafsirSearchable`: `js/domain/tafsirSearch.js`
- `isTajweedRuleId`: `js/domain/tajweedPractice.js`
- `isTimeoutError`: `js/app/net.js`
- `isUnlocked`: `js/domain/tajweedCourse.js`
- `isValidCitation`: `js/domain/lexicalProvenance.js`
- `isWhiteDay`: `js/domain/calendar.js`
- `islamicEventsForYear`: `js/domain/calendar.js`
- `isoWeekKey`: `js/domain/duaJournal.js`
- `itemClipboardText`: `js/app/shared.js`
- `itemIsCustomized`: `js/domain/contentLens.js`
- `itemTargetOf`: `js/services/contentPrefs.js`
- `itemsForMood`: `js/domain/moods.js`
- `itikafCount`: `js/domain/ramadanPlanner.js`
- `joinTranslitLine`: `js/views/quran.js`
- `journalExportText`: `js/domain/duaJournal.js`
- `journalMonthFooter`: `js/views/journal.js`
- `jumuahNote`: `js/domain/reminderPresets.js`
- `justCompletedJuz`: `js/domain/khatma.js`
- `justCompletedKhatma`: `js/domain/khatma.js`
- `juzEighth`: `js/services/mushaf.js`
- `juzMilestoneRow`: `js/views/khatma.js`
- `juzPageRanges`: `js/domain/milestones.js`, `js/services/mushaf.js`
- `juzProgress`: `js/domain/khatma.js`
- `juzReadStates`: `js/services/mushaf.js`
- `juzStartPage`: `js/services/mushaf.js`
- `keptFastCount`: `js/domain/ramadan.js`
- `keyToDate`: `js/domain/review.js`
- `khatmPanel`: `js/views/ramadan.js`
- `kidsQuizRound`: `js/domain/kids.js`
- `kidsRerouteHash`: `js/app/stateSub.js`
- `lampAutoAdvanceDefault`: `js/domain/ambient.js`
- `lampIsBlueDominant`: `js/domain/ambient.js`
- `lampLuminance`: `js/domain/ambient.js`
- `lampPaletteHoldsCap`: `js/domain/ambient.js`
- `lampShouldAutoAdvance`: `js/domain/ambient.js`
- `languageLabel`: `js/core/i18n.js`
- `languageToggleHTML`: `js/ui/shell.js`
- `lapsedAyahKeys`: `js/domain/mutashabihat.js`
- `lastActivity`: `js/domain/nudge.js`
- `lastPlaySwapped`: `js/services/recitation.js`
- `lensCategoryItems`: `js/domain/contentLens.js`
- `lensDocumentCategories`: `js/domain/contentLens.js`
- `lensLibrary`: `js/domain/contentLens.js`
- `libraryIsCustomized`: `js/services/contentPrefs.js`
- `listCompletion`: `js/domain/reflections.js`
- `listVerseAyahs`: `js/services/audioStore.js`
- `liveCollectionCount`: `js/views/collections.js`
- `liveInstallPlatform`: `js/views/installRow.js`
- `liveUA`: `js/views/installRow.js`
- `loadAllBatchQueues`: `js/services/audioStore.js`
- `loadBackupHandle`: `js/services/backup.js`
- `loadBatchQueue`: `js/services/audioStore.js`
- `loadCatalog`: `js/services/audioCatalog.js`
- `loadErrorStateHTML`: `js/ui/emptyState.js`
- `loadLibraries`: `js/app/net.js`
- `loadState`: `js/core/storage.js`
- `loadSurahDoc`: `js/app/quranData.js`
- `localDayKey`: `js/domain/duaJournal.js`
- `locationPermissionGuidanceHTML`: `js/app/forms.js`
- `logAyahReview`: `js/domain/hifz.js`
- `logReview`: `js/domain/hifz.js`
- `logReviewKey`: `js/domain/hifz.js`
- `loggedCount`: `js/domain/prayerLog.js`
- `longestDayStreak`: `js/domain/review.js`
- `lookaheadFor`: `js/services/surahPlayback.js`
- `looksLikeAudio`: `js/services/audioStore.js`, `js/services/prayerSound.js`
- `makeProfile`: `js/domain/locations.js`
- `makeQadaEntry`: `js/domain/qada.js`
- `makeReminder`: `js/services/notifications.js`
- `manualLocationFormHTML`: `js/app/forms.js`
- `markApplied`: `js/services/gapTelemetry.js`
- `markAyahMemorized`: `js/domain/hifz.js`
- `markCelebration`: `js/domain/celebrate.js`
- `markDayFired`: `js/services/notifications.js`
- `markDispatch`: `js/services/gapTelemetry.js`
- `markMemorized`: `js/domain/hifz.js`
- `markMemorizedKey`: `js/domain/hifz.js`
- `markSurahMissing`: `js/services/moshafAvailability.js`
- `matchChildren`: `js/app/renderer.js`
- `matchChildrenDeep`: `js/app/renderer.js`
- `matchRegistry`: `js/app/events.js`
- `matchSettingsSection`: `js/views/settings.js`
- `matchesAccentWord`: `js/domain/tajweed.js`
- `matchesTheme`: `js/domain/dailyAyah.js`
- `materializeWordStudy`: `js/domain/wordStudy.js`
- `maybeAutoBackupNow`: `js/services/backup.js`
- `maybeAutoDownloadEssentials`: `js/app/offlineJobs.js`
- `maybeFollowRecitation`: `js/app/recitationFollow.js`
- `maybeMarkNudgeShown`: `js/app/tickers.js`
- `maybeProbeStorage`: `js/app/tickers.js`
- `maybeScrollToFocusAyah`: `js/app/quranSearch.js`
- `maybeScrollToFocusHadith`: `js/app/hadithData.js`
- `maybeStartHadithSearchBuild`: `js/app/hadithData.js`
- `maybeStartHifzFromParam`: `js/app/quranSearch.js`
- `maybeStartQuranSearchBuild`: `js/app/quranSearch.js`
- `maybeStartTafsirSearchBuild`: `js/app/tafsirSearch.js`
- `maybeSyncBatchResume`: `js/app/audioEngine.js`
- `maybeSyncVerseStatus`: `js/app/audioEngine.js`
- `memorizationPanel`: `js/views/statistics.js`
- `mergeQuranHits`: `js/domain/rootAwareSearch.js`
- `mergeStudyContextParams`: `js/views/studyContext.js`
- `mergedClickHandlers`: `js/app/events.js`
- `migrate`: `js/core/migration.js`
- `migrateFocusAutoAdvanceSetting`: `js/core/state/store.js`
- `milestoneBadges`: `js/domain/milestones.js`
- `milestoneHit`: `js/domain/celebrate.js`
- `miniCardHTML`: `js/ui/card.js`
- `missingDataHTML`: `js/ui/missingData.js`
- `missingDataKeyFor`: `js/ui/missingData.js`
- `missingSurahs`: `js/services/moshafAvailability.js`
- `monthEntry`: `js/domain/ramadanPlanner.js`
- `monthTotal`: `js/domain/statistics.js`
- `monthWindow`: `js/domain/statistics.js`
- `moodById`: `js/domain/moods.js`
- `mostReadCategories`: `js/domain/statistics.js`
- `mountShell`: `js/app/renderer.js`
- `moveCategory`: `js/services/contentPrefs.js`
- `moveHomePanel`: `js/domain/homePanels.js`
- `moveItem`: `js/services/contentPrefs.js`
- `moveLibrary`: `js/services/contentPrefs.js`
- `moveQuickTile`: `js/domain/quickTiles.js`
- `mulberry32`: `js/services/hadith.js`
- `mushafDragStyle`: `js/domain/gestures.js`
- `mushafRoutePage`: `js/services/mushaf.js`, `js/views/mushafJump.js`, `js/views/mushafReader.js`
- `mushafSpreadActive`: `js/services/mushaf.js`
- `mushafSwipeTurn`: `js/domain/gestures.js`
- `mushafUrls`: `js/domain/offline.js`
- `narratorFor`: `js/domain/localeContent.js`
- `navigateFocusAdjacent`: `js/app/focusRuntime.js`
- `navigateMushafPage`: `js/app/handlers/quran.js`
- `nearbyMosqueMapUrl`: `js/domain/locations.js`
- `needsPermission`: `js/domain/compass.js`
- `nextAyah`: `js/services/surahPlayback.js`
- `nextEidAlFitr`: `js/domain/ramadan.js`
- `nextFreshIndex`: `js/domain/reflections.js`
- `nextLoop`: `js/services/surahPlayback.js`
- `nextPage`: `js/services/mushaf.js`
- `nextPrayer`: `js/domain/prayer.js`
- `nextPrayerCountdown`: `js/domain/prayerTimeline.js`
- `nextRamadan`: `js/domain/ramadan.js`
- `nextRemindTime`: `js/domain/fasting.js`
- `nextRepeat`: `js/services/surahPlayback.js`
- `nextSession`: `js/domain/tajweedCourse.js`
- `nextSleepRung`: `js/domain/sleepTimer.js`
- `nextSpeed`: `js/services/surahPlayback.js`
- `nextSpreadPage`: `js/services/mushaf.js`
- `nextStats`: `js/domain/tajweedPractice.js`
- `nodeKey`: `js/app/renderer.js`
- `normalizeArabic`: `js/core/utils.js`
- `normalizeAyahKey`: `js/domain/hifz.js`
- `normalizeCategory`: `js/core/schema.js`
- `normalizeCustomContentMap`: `js/core/schema.js`
- `normalizeDhikrAudio`: `js/core/schema.js`
- `normalizeDocument`: `js/core/schema.js`
- `normalizeEchoPause`: `js/services/surahPlayback.js`
- `normalizeEditionKey`: `js/domain/translationCompare.js`
- `normalizeGrade`: `js/domain/grades.js`
- `normalizeHadithGrade`: `js/services/hadith.js`
- `normalizeHifzGrade`: `js/domain/hifz.js`
- `normalizeHifzLevel`: `js/domain/hifz.js`
- `normalizeHifzTest`: `js/domain/hifz.js`
- `normalizeInstallOutcome`: `js/domain/install.js`
- `normalizeItem`: `js/core/schema.js`
- `normalizeLoop`: `js/services/surahPlayback.js`
- `normalizeNarrator`: `js/services/hadith.js`
- `normalizeQueue`: `js/services/surahPlayback.js`
- `normalizeRepeat`: `js/services/surahPlayback.js`
- `normalizeRepeatMode`: `js/domain/audioQueue.js`
- `normalizeSearch`: `js/core/utils.js`
- `normalizeSpeed`: `js/services/surahPlayback.js`
- `normalizeTajweedAnswerMode`: `js/domain/tajweedPractice.js`
- `notFoundStateHTML`: `js/ui/emptyState.js`
- `noteCompleted`: `js/domain/completedCards.js`
- `noteFor`: `js/domain/localeContent.js`
- `noteLongtask`: `js/services/gapTelemetry.js`
- `notePreloadSample`: `js/services/surahPlayback.js`
- `notesForDate`: `js/services/calendarNotes.js`
- `nudgeCardHTML`: `js/views/home.js`
- `occurrenceAyah`: `js/domain/roots.js`
- `occurrenceGloss`: `js/domain/roots.js`
- `offPlaybackEnded`: `js/services/recitation.js`
- `offPlaybackError`: `js/services/recitation.js`
- `ok`: `js/core/utils.js`
- `onAdhanStart`: `js/services/prayerSound.js`
- `onAyahChange`: `js/services/surahPlayback.js`
- `onError`: `js/services/surahPlayback.js`
- `onPlaybackChange`: `js/services/recitation.js`
- `onPlaybackEnded`: `js/services/recitation.js`
- `onPlaybackError`: `js/services/recitation.js`
- `onPlayerError`: `js/services/player.js`
- `onPlayerPatch`: `js/services/player.js`
- `onPlayingStateChange`: `js/services/player.js`
- `onPreloadSample`: `js/services/recitation.js`
- `onSleepTick`: `js/services/player.js`
- `onStateChange`: `js/app/stateSub.js`
- `onTrackEnded`: `js/services/player.js`
- `onboardingComplete`: `js/domain/onboarding.js`
- `onboardingPanelHTML`: `js/views/onboardingPanel.js`
- `openAyahStudy`: `js/app/lazyData.js`
- `openDB`: `js/core/idb/openDB.js`
- `openFloatingCounter`: `js/services/floatingCounter.js`
- `openLazyModal`: `js/ui/modal.js`
- `openModal`: `js/ui/modal.js`
- `openNavDrawer`: `js/app/drawer.js`
- `openPalette`: `js/app/palette.js`
- `openParentGate`: `js/app/events.js`
- `openPracticePicker`: `js/app/practice.js`
- `openSettingsSectionFor`: `js/views/settings.js`
- `ornamentTokenKind`: `js/domain/tajweed.js`
- `overlayTranslation`: `js/core/config/quran.js`
- `pad3`: `js/services/audioCatalog.js`
- `pageChapters`: `js/views/mushafPlayer.js`, `js/views/mushafReader.js`
- `pageCount`: `js/services/hadith.js`
- `pageCountFor`: `js/domain/searchPagination.js`
- `pageForNumber`: `js/services/hadith.js`
- `pageSizeFor`: `js/domain/searchPagination.js`
- `pagesReadToday`: `js/domain/worship.js`
- `paginate`: `js/domain/searchPagination.js`
- `pairForAyah`: `js/domain/mutashabihat.js`
- `paletteGroupsHTML`: `js/views/palette.js`
- `paletteRowCount`: `js/views/palette.js`
- `paletteShellHTML`: `js/views/palette.js`
- `parseBackup`: `js/services/backup.js`
- `parseProtocolLaunch`: `js/domain/launchIntents.js`
- `parseShareTarget`: `js/domain/launchIntents.js`
- `patchHTML`: `js/app/renderer.js`
- `pause`: `js/services/player.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`
- `peekNextTriples`: `js/services/surahPlayback.js`
- `peekNextUrl`: `js/services/surahPlayback.js`
- `pendingByPrayer`: `js/domain/qada.js`
- `pendingQada`: `js/domain/qada.js`
- `percentile`: `js/services/gapTelemetry.js`
- `permissionState`: `js/services/notifications.js`
- `persistedSnapshot`: `js/core/state/restore.js`, `js/core/state.js`
- `pickBackupFile`: `js/services/backup.js`
- `pickDailyHadith`: `js/services/hadith.js`
- `pickDailyItemThemed`: `js/domain/dailyAyah.js`
- `pickLocale`: `js/core/utils.js`
- `pickPersisted`: `js/core/state/initial.js`, `js/core/state.js`
- `pickRandomHadith`: `js/services/hadith.js`
- `pickRoundEntries`: `js/domain/tajweedPractice.js`
- `pickRoundEntry`: `js/domain/tajweedPractice.js`
- `pickStrict`: `js/core/utils.js`, `js/domain/localeContent.js`
- `planCacheEviction`: `js/services/audioStore.js`
- `planFingerprint`: `js/services/alertTriggers.js`
- `planStatus`: `js/domain/khatma.js`
- `plannerPanel`: `js/views/ramadan.js`
- `play`: `js/services/player.js`, `js/services/recitation.js`
- `playAlert`: `js/services/prayerSound.js`
- `playDhikrAudio`: `js/services/dhikrAudio.js`
- `playFlipSound`: `js/app/inputs.js`
- `playKhatmaChime`: `js/services/soundDesign.js`
- `playPageTurn`: `js/services/soundDesign.js`
- `playSound`: `js/services/prayerSound.js`
- `playTick`: `js/services/tasbih.js`
- `plusDays`: `js/domain/hifz.js`
- `practiceLevel`: `js/domain/tajweedPractice.js`
- `prayerBestStreak`: `js/domain/prayerLog.js`
- `prayerICSFilename`: `js/domain/prayerExport.js`
- `prayerInsights`: `js/domain/prayerLog.js`
- `prayerMethodLine`: `js/domain/prayer.js`
- `prayerMonthCount`: `js/domain/prayerLog.js`
- `prayerMonthICSFilename`: `js/domain/prayerExport.js`
- `prayerRibbonHTML`: `js/views/home.js`
- `prayerState`: `js/domain/prayerLog.js`
- `prayerStreak`: `js/domain/prayerLog.js`
- `prayerTick`: `js/app/tickers.js`
- `prayerWeek`: `js/domain/prayerLog.js`
- `prayersLoggedToday`: `js/domain/worship.js`
- `prefetchTrack`: `js/services/player.js`
- `prefsOf`: `js/domain/contentLens.js`
- `preload`: `js/services/recitation.js`
- `prevPage`: `js/services/mushaf.js`
- `prevSpreadPage`: `js/services/mushaf.js`
- `previewAlert`: `js/services/prayerSound.js`
- `processDocument`: `js/core/schema.js`
- `profileMatchesActive`: `js/domain/locations.js`
- `profileToPrayerPatch`: `js/domain/locations.js`
- `profilesPanelHTML`: `js/views/prayer.js`
- `promptForDate`: `js/domain/duaJournal.js`
- `pruneFiredMap`: `js/services/alertTriggers.js`
- `prunePool`: `js/services/recitation.js`
- `qadaPanelHTML`: `js/views/prayer.js`
- `qadaSummary`: `js/domain/qada.js`
- `qadrNightFor`: `js/domain/ramadan.js`
- `qadrNightInfo`: `js/domain/ramadan.js`
- `qiblaBearing`: `js/domain/qibla.js`
- `queueSignature`: `js/services/surahPlayback.js`
- `quickTilesHTML`: `js/views/home.js`
- `quranAudioSurahUrl`: `js/core/config/quran.js`
- `quranAudioUrl`: `js/core/config/quran.js`
- `quranIndexSize`: `js/domain/quranSearch.js`
- `quranUrls`: `js/domain/offline.js`
- `ramadanAlertTimes`: `js/domain/ramadan.js`
- `ramadanInfo`: `js/domain/ramadan.js`
- `ramadanInviteState`: `js/domain/homeInvitations.js`
- `ramadanKhatmPlan`: `js/domain/ramadanPlanner.js`
- `ramadanKhatmaPreset`: `js/domain/khatma.js`
- `ramadanLength`: `js/domain/ramadan.js`
- `ramadanLogKey`: `js/domain/ramadan.js`
- `ramadanStartForHijriYear`: `js/domain/ramadan.js`
- `ramadanTick`: `js/app/tickers.js`
- `rankBrowserCategories`: `js/views/home.js`
- `rankBrowserDocuments`: `js/views/home.js`
- `reacquireWakeLockIfFullscreen`: `js/app/fullscreen.js`
- `readAutoSnapshot`: `js/services/backup.js`
- `readFileAsText`: `js/services/backup.js`
- `readLastPositions`: `js/domain/lastPosition.js`
- `readScrollTop`: `js/app/renderer.js`
- `readWindow`: `js/domain/readerWindow.js`
- `readingInLastDays`: `js/domain/statistics.js`
- `readingStreak`: `js/domain/worship.js`
- `recentHistory`: `js/services/checklist.js`
- `recentVoluntaryFasts`: `js/domain/fasting.js`
- `recitationChipsHTML`: `js/ui/recitationConsole.js`
- `recitationEchoHTML`: `js/ui/recitationConsole.js`
- `reciterDisplayName`: `js/core/config/quran.js`
- `reciterShortLabel`: `js/ui/recitationConsole.js`
- `recommendedAdhkarWindow`: `js/domain/adhkarTiming.js`
- `reconcilePending`: `js/domain/audioBatch.js`
- `recordEffect`: `js/services/gapTelemetry.js`
- `recordInstallDeferral`: `js/domain/install.js`
- `recordQuizMiss`: `js/domain/quiz.js`
- `reduce`: `js/core/state/reducer.js`, `js/core/state.js`
- `reduceAudio`: `js/core/state/slices/audio.js`
- `reduceHadith`: `js/core/state/slices/hadith.js`
- `reduceLibrary`: `js/core/state/slices/library.js`
- `reduceQuran`: `js/core/state/slices/quran.js`
- `reduceShell`: `js/core/state/slices/shell.js`
- `reduceWorship`: `js/core/state/slices/worship.js`
- `referenceLineFor`: `js/domain/localeContent.js`
- `referencePartsFor`: `js/domain/localeContent.js`
- `refocusZakatInput`: `js/app/inputs.js`
- `refreshAppBadge`: `js/services/appBadge.js`
- `refreshCustomAdhanFlags`: `js/services/prayerSound.js`
- `refreshLibraryIndex`: `js/app/net.js`
- `refreshMushafFit`: `js/app/autoFit.js`
- `registerServiceWorker`: `js/app/triggers.js`
- `releaseMushafNativeFullscreen`: `js/app/fullscreen.js`
- `remainingAfter`: `js/domain/audioBatch.js`
- `remindCategoriesFor`: `js/domain/fasting.js`
- `reminderFormHTML`: `js/app/forms.js`
- `render`: `js/app/renderer.js`
- `renderAbout`: `js/views/about.js`
- `renderAmbient`: `js/views/ambient.js`
- `renderAudio`: `js/views/audioManager.js`
- `renderAyahCardCanvas`: `js/services/shareCard.js`
- `renderAyahWords`: `js/views/tafsirPanel.js`
- `renderCalendar`: `js/views/calendar.js`
- `renderCategory`: `js/views/category.js`
- `renderCertificate`: `js/views/certificate.js`
- `renderChecklist`: `js/views/checklist.js`
- `renderClassifyRound`: `js/app/practice.js`
- `renderClassifyRoundHtml`: `js/views/tajweedPracticeView.js`
- `renderCollection`: `js/views/collection.js`
- `renderCollections`: `js/views/collections.js`
- `renderDuaCardCanvas`: `js/services/shareCard.js`
- `renderEditor`: `js/views/editor.js`
- `renderErrorScreen`: `js/app/drawer.js`
- `renderFavorites`: `js/views/favorites.js`
- `renderFocus`: `js/views/focus.js`
- `renderGarden`: `js/views/garden.js`
- `renderHadith`: `js/views/hadith.js`
- `renderHome`: `js/views/home.js`
- `renderJournal`: `js/views/journal.js`
- `renderKids`: `js/views/kids.js`
- `renderLibrary`: `js/views/library.js`
- `renderMood`: `js/views/mood.js`
- `renderMushaf`: `js/views/mushafReader.js`
- `renderMushafPageFindResults`: `js/views/mushafPageFind.js`
- `renderMutashabihat`: `js/views/mutashabihat.js`
- `renderNav`: `js/ui/shell.js`
- `renderOffline`: `js/views/offline.js`
- `renderPlayerBar`: `js/views/playerBar.js`
- `renderPracticeRound`: `js/app/practice.js`
- `renderPracticeSummary`: `js/app/practice.js`
- `renderPrayer`: `js/views/prayer.js`
- `renderQibla`: `js/views/qibla.js`
- `renderQuiz`: `js/views/quiz.js`
- `renderQuran`: `js/views/quran.js`
- `renderRamadan`: `js/views/ramadan.js`
- `renderRoots`: `js/views/roots.js`
- `renderSearch`: `js/views/search.js`
- `renderSettings`: `js/views/settings.js`
- `renderStatistics`: `js/views/statistics.js`
- `renderTajweedCourse`: `js/views/tajweedCourseView.js`
- `renderTasbih`: `js/views/tasbih.js`
- `renderTopBar`: `js/ui/shell.js`
- `renderZakat`: `js/views/zakat.js`
- `replaceGo`: `js/core/router.js`
- `requestMushafNativeFullscreen`: `js/app/fullscreen.js`
- `requestPermission`: `js/domain/compass.js`, `js/services/notifications.js`
- `reset`: `js/services/tasbih.js`
- `resetAyahCardMemoForTests`: `js/views/quran.js`
- `resetCatalogForTests`: `js/services/audioCatalog.js`
- `resetDhikrAudioForTests`: `js/services/dhikrAudio.js`
- `resetEphemeralCaches`: `js/app/stateSub.js`
- `resetFailedLibrariesForTests`: `js/app/net.js`
- `resetFsControlsIdleTimer`: `js/app/fullscreen.js`
- `resetGapTelemetryForTests`: `js/services/gapTelemetry.js`
- `resetHadithBookFetches`: `js/app/hadithData.js`
- `resetHadithIndex`: `js/domain/hadithSearch.js`
- `resetIdbForTests`: `js/core/idb/openDB.js`
- `resetLazyViewsForTests`: `js/app/renderer.js`
- `resetMutashabihatCache`: `js/domain/mutashabihat.js`
- `resetPersistForTests`: `js/services/audioStore.js`
- `resetPlaybackNetStatsForTests`: `js/services/surahPlayback.js`
- `resetPlayerForTests`: `js/services/player.js`
- `resetPlayerIdleTimer`: `js/app/audioEngine.js`
- `resetQuranIndex`: `js/domain/quranSearch.js`
- `resetReadingTokensForTests`: `js/ui/readingTokens.js`
- `resetRecitationForTests`: `js/services/recitation.js`
- `resetSessionFlagsForTests`: `js/domain/sessionFlags.js`
- `resetStaleFetchGuards`: `js/app/stateSub.js`
- `resetTafsirIndex`: `js/domain/tafsirSearch.js`
- `resolveAlertSource`: `js/services/prayerSound.js`
- `resolveAntonymState`: `js/domain/lexicalProvenance.js`
- `resolveBrowserWindow`: `js/views/home.js`
- `resolveCompareText`: `js/domain/translationCompare.js`
- `resolveCompareTexts`: `js/domain/translationCompare.js`
- `resolveContextProvenance`: `js/domain/lexicalProvenance.js`
- `resolveHomePanels`: `js/domain/homePanels.js`
- `resolveIrabProvenance`: `js/domain/lexicalProvenance.js`
- `resolveKidsView`: `js/core/config/views.js`
- `resolveLemmaProvenance`: `js/domain/lexicalProvenance.js`
- `resolveLexicalListState`: `js/domain/lexicalProvenance.js`
- `resolveMinControl`: `js/domain/gestures.js`
- `resolveNextFullSurah`: `js/domain/audioQueue.js`
- `resolveOnboardingStep`: `js/domain/onboarding.js`
- `resolvePage`: `js/services/mushaf.js`
- `resolveQueueItem`: `js/services/surahPlayback.js`
- `resolveQuickTiles`: `js/domain/quickTiles.js`
- `resolveRangeSave`: `js/app/handlers/audio.js`
- `resolveRootProvenance`: `js/domain/lexicalProvenance.js`
- `resolveScopePage`: `js/domain/searchPagination.js`
- `resolveSynonymState`: `js/domain/lexicalProvenance.js`
- `resolveTafsirSearchEdition`: `js/app/tafsirSearch.js`
- `restoreAll`: `js/services/contentPrefs.js`
- `restoreCategory`: `js/services/contentPrefs.js`
- `restoreItem`: `js/services/contentPrefs.js`
- `restoreLibrary`: `js/services/contentPrefs.js`
- `resume`: `js/services/recitation.js`, `js/services/surahPlayback.js`
- `resumeBannerHTML`: `js/views/audioManager.js`
- `resumePanelHTML`: `js/views/home.js`
- `retryLibraryLoad`: `js/app/net.js`
- `reviewDigestCardHTML`: `js/views/home.js`
- `reviewIsEmpty`: `js/domain/review.js`
- `rewayaAr`: `js/services/audioCatalog.js`
- `romanizeArabic`: `js/domain/rootAwareSearch.js`
- `rootForms`: `js/domain/roots.js`
- `rootList`: `js/domain/roots.js`
- `rootMeaningFor`: `js/domain/wordStudy.js`
- `rootOccurrences`: `js/domain/wordStudy.js`
- `rootOccurrencesAll`: `js/domain/roots.js`
- `rootStats`: `js/domain/roots.js`
- `rootStudyEntryFor`: `js/domain/wordStudy.js`
- `roundUpToUnit`: `js/domain/zakat.js`
- `routeWorkerReply`: `js/app/hadithData.js`
- `rt`: `js/app/rt.js`
- `ruleEnabled`: `js/domain/tajweed.js`
- `runEditionSwitch`: `js/app/quranData.js`
- `runInstallPrompt`: `js/domain/install.js`
- `runOfflineBatch`: `js/app/offlineJobs.js`
- `sadaqahGivenToday`: `js/domain/worship.js`
- `safe`: `js/core/utils.js`
- `safeDecode`: `js/core/router.js`
- `sameSurfaceWord`: `js/domain/tajweed.js`
- `sanitizeAyahRecords`: `js/domain/hifz.js`
- `sanitizeDuaJournal`: `js/domain/duaJournal.js`
- `sanitizeFastingPrefs`: `js/domain/fasting.js`
- `sanitizeHifzRecords`: `js/domain/hifz.js`
- `sanitizeHijriDayLog`: `js/domain/ramadanPlanner.js`
- `sanitizeInstallDeferral`: `js/domain/install.js`
- `sanitizeLastPosition`: `js/domain/lastPosition.js`
- `sanitizeLocationProfiles`: `js/domain/locations.js`
- `sanitizeMemRecords`: `js/domain/hifz.js`
- `sanitizeMushafPrefs`: `js/core/config/sanitize.js`
- `sanitizeNudgeState`: `js/domain/nudge.js`
- `sanitizePlan`: `js/domain/planExport.js`, `js/services/alertTriggers.js`
- `sanitizeQadaLog`: `js/domain/qada.js`
- `sanitizeQuizMissRecords`: `js/domain/quiz.js`
- `sanitizeReflections`: `js/domain/duaJournal.js`
- `sanitizeRestoredPayload`: `js/core/state/restore.js`, `js/core/state.js`
- `sanitizeRootParam`: `js/domain/roots.js`
- `sanitizeSadaqahLog`: `js/domain/worship.js`
- `sanitizeSettings`: `js/core/config/sanitize.js`
- `sanitizeSunnahLog`: `js/domain/sunnah.js`
- `sanitizeTajweedCourseProgress`: `js/domain/tajweedCourse.js`
- `sanitizeWindow`: `js/domain/readerWindow.js`
- `saveAdhanAudio`: `js/services/audioStore.js`
- `saveAudio`: `js/services/audioStore.js`
- `saveBackupHandle`: `js/services/backup.js`
- `saveBatchQueue`: `js/services/audioStore.js`
- `saveItem`: `js/services/editor.js`
- `saveState`: `js/core/storage.js`
- `saveVerseAudio`: `js/services/audioStore.js`
- `scheduleAutoAdvance`: `js/app/focusRuntime.js`
- `scheduleTriggerArm`: `js/app/triggers.js`
- `scoreRound`: `js/domain/tajweedPractice.js`
- `scoreWordRound`: `js/domain/tajweedPractice.js`
- `scrollBehavior`: `js/core/utils.js`
- `scrollToHadithListTop`: `js/app/hadithData.js`
- `search`: `js/domain/search.js`
- `searchHadith`: `js/domain/hadithSearch.js`
- `searchLibrary`: `js/views/palette.js`
- `searchQuran`: `js/domain/quranSearch.js`, `js/views/palette.js`
- `searchQuranExpanded`: `js/domain/quranSearch.js`
- `searchReciters`: `js/services/audioCatalog.js`, `js/views/palette.js`
- `searchRoots`: `js/domain/roots.js`
- `searchSessions`: `js/domain/tajweedCourse.js`
- `searchSurahs`: `js/domain/search.js`, `js/views/palette.js`
- `searchTafsir`: `js/domain/tafsirSearch.js`
- `seek`: `js/services/player.js`
- `seekBy`: `js/services/player.js`
- `selectDueAlerts`: `js/services/alertTriggers.js`
- `selectors`: `js/core/state/selectors.js`, `js/core/state.js`
- `sendTriggerPlan`: `js/app/triggers.js`
- `sessionFlag`: `js/domain/sessionFlags.js`
- `sessionValue`: `js/domain/sessionFlags.js`
- `sessionsForRule`: `js/domain/tajweedCourse.js`
- `setAudioCacheCapForTests`: `js/services/audioStore.js`
- `setAudioFetcher`: `js/services/player.js`
- `setAudioMuted`: `js/app/audioEngine.js`
- `setBaseVolume`: `js/services/surahPlayback.js`
- `setCategoryDeleted`: `js/services/contentPrefs.js`
- `setCategoryHidden`: `js/services/contentPrefs.js`
- `setCompare`: `js/services/surahPlayback.js`
- `setContinuous`: `js/services/surahPlayback.js`
- `setEnabled`: `js/services/gapTelemetry.js`
- `setFlipDirection`: `js/ui/readingTokens.js`, `js/views/mushafReader.js`
- `setFollow`: `js/services/surahPlayback.js`
- `setFullscreenAnim`: `js/ui/readingTokens.js`, `js/views/mushafReader.js`
- `setItemDeleted`: `js/services/contentPrefs.js`
- `setItemHidden`: `js/services/contentPrefs.js`
- `setItemTarget`: `js/services/contentPrefs.js`
- `setLibraryDeleted`: `js/services/contentPrefs.js`
- `setLibraryFieldToggles`: `js/services/contentPrefs.js`
- `setLibraryHidden`: `js/services/contentPrefs.js`
- `setListenRepeat`: `js/services/surahPlayback.js`
- `setLoop`: `js/services/surahPlayback.js`
- `setMushafTarget`: `js/ui/readingTokens.js`
- `setMushafWideLayout`: `js/services/mushaf.js`
- `setMuted`: `js/services/player.js`, `js/services/recitation.js`
- `setPlaybackRate`: `js/services/recitation.js`
- `setQuranIndexReady`: `js/domain/quranSearch.js`
- `setRate`: `js/services/player.js`
- `setReciter`: `js/services/surahPlayback.js`
- `setReciterB`: `js/services/surahPlayback.js`
- `setRepeat`: `js/services/surahPlayback.js`
- `setSessionFlag`: `js/domain/sessionFlags.js`
- `setSessionValue`: `js/domain/sessionFlags.js`
- `setSpeed`: `js/services/surahPlayback.js`
- `setTarget`: `js/services/tasbih.js`
- `setVolume`: `js/services/player.js`, `js/services/recitation.js`
- `settingRow`: `js/views/settings.js`
- `settingsSectionForSlug`: `js/views/settings.js`
- `settingsSectionIds`: `js/views/settings.js`
- `settingsSectionScrollTarget`: `js/app/renderer.js`
- `settingsSlugForSection`: `js/views/settings.js`
- `shareAyahCard`: `js/app/handlers/items.js`
- `sheetLinkRow`: `js/ui/viewSheet.js`
- `sheetRow`: `js/ui/viewSheet.js`
- `sheetToggleRow`: `js/ui/viewSheet.js`
- `shortcutActionForKey`: `js/domain/playerShortcuts.js`
- `shouldFire`: `js/services/notifications.js`
- `shouldMarkViewEnter`: `js/app/renderer.js`
- `shouldReofferInstall`: `js/domain/install.js`
- `shouldShowInvite`: `js/domain/homeInvitations.js`
- `shouldShowNudge`: `js/domain/nudge.js`
- `shouldShowOnboarding`: `js/domain/onboarding.js`
- `showToast`: `js/ui/toast.js`
- `showTranslationFor`: `js/domain/localeContent.js`
- `showTransliterationFor`: `js/domain/localeContent.js`
- `shuffled`: `js/app/quizDeck.js`
- `skeletonAyahCards`: `js/ui/skeleton.js`
- `skeletonHadithCard`: `js/ui/skeleton.js`
- `skeletonLines`: `js/ui/skeleton.js`
- `skeletonMushafPage`: `js/ui/skeleton.js`
- `skeletonReciterRows`: `js/ui/skeleton.js`
- `skeletonSurahList`: `js/ui/skeleton.js`
- `skip`: `js/services/surahPlayback.js`
- `sleepSnapshot`: `js/services/player.js`, `js/services/surahPlayback.js`
- `smoothK`: `js/services/surahPlayback.js`
- `snapshot`: `js/services/surahPlayback.js`
- `sortFavorites`: `js/views/favorites.js`
- `spanBetween`: `js/domain/prayerTimeline.js`
- `speakItem`: `js/services/speech.js`
- `splitAyahWord`: `js/domain/roots.js`
- `splitEditions`: `js/domain/wordStudy.js`
- `spreadLeftPage`: `js/services/mushaf.js`
- `spreadRightPage`: `js/services/mushaf.js`
- `stageProgress`: `js/domain/tajweedCourse.js`
- `start`: `js/domain/compass.js`, `js/services/surahPlayback.js`
- `startAdhan`: `js/services/prayerSound.js`
- `startAudioPlay`: `js/app/audioEngine.js`
- `startClassifyRound`: `js/app/practice.js`
- `startCompassIfNeeded`: `js/app/compassRuntime.js`
- `startPracticeRound`: `js/app/practice.js`
- `startScheduler`: `js/services/notifications.js`
- `startVerseSurah`: `js/app/handlers/quranAudio.js`
- `stats`: `js/services/gapTelemetry.js`
- `statsCSVFilename`: `js/domain/statistics.js`
- `stop`: `js/domain/compass.js`, `js/services/player.js`, `js/services/recitation.js`, `js/services/speech.js`, `js/services/surahPlayback.js`
- `stopAdhan`: `js/services/prayerSound.js`
- `stopCompass`: `js/app/compassRuntime.js`
- `stopDhikrAudio`: `js/services/dhikrAudio.js`
- `stopOfflineBatch`: `js/app/offlineJobs.js`
- `stopScheduler`: `js/services/notifications.js`
- `storageAvailable`: `js/core/utils.js`
- `store`: `js/core/state/store.js`, `js/core/state.js`
- `streakCoaching`: `js/domain/statistics.js`
- `stripCategoryItemKeys`: `js/domain/contentLens.js`
- `stripCategoryKeys`: `js/domain/contentLens.js`
- `stripLibraryKeys`: `js/domain/contentLens.js`
- `stripPosition`: `js/domain/prayerTimeline.js`
- `stripQuranAnnotations`: `js/core/utils.js`
- `structuralKey`: `js/app/renderer.js`
- `studyContextHTML`: `js/views/studyContext.js`
- `studyContextOf`: `js/views/studyContext.js`
- `studyContextParams`: `js/views/studyContext.js`
- `studyHadithQuery`: `js/domain/hadithSearch.js`
- `studyTrayKey`: `js/views/studyTray.js`
- `suggestDailyTarget`: `js/domain/khatma.js`
- `suggestFromKhatma`: `js/domain/hifz.js`
- `summarize`: `js/services/gapTelemetry.js`
- `sunnahCount`: `js/domain/sunnah.js`
- `sunnahPanelHTML`: `js/views/prayer.js`
- `sunnahToday`: `js/domain/sunnah.js`
- `sunnahWeek`: `js/domain/sunnah.js`
- `surahPageCounts`: `js/domain/statistics.js`
- `surahPageRange`: `js/domain/hifz.js`
- `surahStartPage`: `js/services/mushaf.js`
- `surahUrl`: `js/services/audioCatalog.js`
- `swInstallMessageAction`: `js/domain/install.js`
- `syncAppBadge`: `js/services/appBadge.js`
- `syncMetadata`: `js/services/mediaSession.js`
- `syncPlayerIdleArmed`: `js/app/audioEngine.js`
- `syncPlayingState`: `js/services/mediaSession.js`
- `syncReadingTimer`: `js/app/readingTimer.js`
- `t`: `js/core/i18n.js`
- `tafsirIndexEdition`: `js/domain/tafsirSearch.js`
- `tafsirIndexSize`: `js/domain/tafsirSearch.js`
- `tafsirUrls`: `js/domain/offline.js`
- `tajweedCitation`: `js/domain/tajweedSources.js`
- `tajweedLessonExamples`: `js/domain/tajweedLessons.js`
- `tajweedLessonRule`: `js/domain/tajweedLessons.js`
- `tajweedMissClear`: `js/domain/tajweedPractice.js`
- `tajweedMissRecord`: `js/domain/tajweedPractice.js`
- `tajweedPrefsOf`: `js/domain/tajweed.js`
- `tajweedRule`: `js/domain/tajweed.js`
- `takeoverManualZoom`: `js/app/autoFit.js`
- `taraweehCount`: `js/domain/ramadanPlanner.js`
- `throttle`: `js/core/utils.js`
- `tickForTests`: `js/services/notifications.js`
- `timetableCell`: `js/domain/prayerExport.js`
- `tint`: `js/services/shareCard.js`
- `toEasternArabicNumerals`: `js/core/utils.js`
- `toGregorian`: `js/domain/calendar.js`
- `toHijri`: `js/domain/calendar.js`
- `todayReadingSec`: `js/views/statistics.js`
- `toggle`: `js/services/player.js`
- `toggleAudioMute`: `js/app/audioEngine.js`
- `topSurahsByPages`: `js/domain/statistics.js`
- `totalInLastDays`: `js/domain/statistics.js`
- `translationBMap`: `js/app/quranData.js`, `js/domain/translationCompare.js`
- `translationFor`: `js/domain/localeContent.js`
- `translationLabel`: `js/services/audioCatalog.js`
- `translationUrls`: `js/domain/offline.js`
- `triggerRipple`: `js/app/handlers/items.js`
- `triggersSupported`: `js/services/alertTriggers.js`
- `uid`: `js/core/utils.js`
- `uncitedSessions`: `js/domain/tajweedCourse.js`
- `uncitedTajweedRules`: `js/domain/tajweedSources.js`
- `undo`: `js/services/editor.js`
- `unifiedSearch`: `js/domain/rootAwareSearch.js`
- `unwireAudioShortcutsForTests`: `js/app/audioEngine.js`
- `upcomingFastingDays`: `js/domain/fasting.js`
- `updateAmbientTickerLifecycle`: `js/app/tickers.js`
- `updateAmbientWakeLifecycle`: `js/app/fullscreen.js`
- `updateCategory`: `js/services/editor.js`
- `updateCompassLifecycle`: `js/app/audioEngine.js`
- `updateFloatingCounter`: `js/services/floatingCounter.js`
- `updateHomeTickerLifecycle`: `js/app/tickers.js`
- `updateLibrary`: `js/services/editor.js`
- `updateMushafAutoFitLifecycle`: `js/app/autoFit.js`
- `updatePalette`: `js/app/palette.js`
- `updatePrayerTickerLifecycle`: `js/app/tickers.js`
- `updateQiblaCompassDOM`: `js/views/qibla.js`
- `updateRamadanLifecycle`: `js/app/tickers.js`
- `usageTileOrder`: `js/domain/quickTiles.js`
- `userVolume`: `js/services/player.js`
- `validDayKey`: `js/core/state/streak.js`
- `validateAdhanFile`: `js/services/audioStore.js`, `js/services/prayerSound.js`
- `validateCustomServer`: `js/services/audioCatalog.js`
- `validateDocument`: `js/core/schema.js`
- `validateHadithDoc`: `js/services/hadith.js`
- `validateHadithIndex`: `js/services/hadith.js`
- `verseAudioCandidates`: `js/services/surahPlayback.js`
- `verseDownloadCandidates`: `js/services/surahPlayback.js`
- `verseKey`: `js/services/audioStore.js`
- `verseMetadata`: `js/services/mediaSession.js`
- `vibrate`: `js/core/utils.js`
- `viewKeyOf`: `js/app/renderer.js`
- `viewMenuButton`: `js/ui/viewSheet.js`
- `viewSheet`: `js/ui/viewSheet.js`
- `virtueFor`: `js/domain/localeContent.js`
- `visibleCategoryItems`: `js/services/contentPrefs.js`
- `volumeAt`: `js/domain/sleepTimer.js`
- `voluntaryFastCount`: `js/domain/fasting.js`
- `warmHadithDaily`: `js/app/hadithData.js`
- `warmVoices`: `js/services/speech.js`
- `wasCelebrated`: `js/domain/celebrate.js`
- `wasCompletedRecently`: `js/domain/completedCards.js`
- `wasDayFired`: `js/services/notifications.js`
- `wasJustCompleted`: `js/services/tasbih.js`
- `watchSystemTheme`: `js/core/theme.js`
- `weakQuizIds`: `js/domain/quiz.js`
- `weakTajweedRules`: `js/domain/tajweedPractice.js`
- `weekWindow`: `js/domain/statistics.js`
- `wipeAppDataForReset`: `js/app/drawer.js`
- `wireAudioShortcuts`: `js/app/audioEngine.js`
- `wireInstallPrompt`: `js/app/installPrompt.js`
- `wirePlayer`: `js/app/audioEngine.js`
- `withEffectiveTargets`: `js/services/contentPrefs.js`
- `withStore`: `js/core/idb/openDB.js`
- `witrStreak`: `js/domain/sunnah.js`
- `wizardStepIndex`: `js/domain/onboarding.js`
- `wordAffixLabels`: `js/domain/wordStudy.js`
- `wordBookmarkKey`: `js/domain/wordStudy.js`
- `wordDetailTags`: `js/domain/wordStudy.js`
- `wordGrammarSummary`: `js/domain/wordStudy.js`
- `wordIrabLine`: `js/domain/wordStudy.js`
- `wordSourcesHTML`: `js/views/tafsirPanel.js`
- `wordUnits`: `js/domain/tajweed.js`
- `wordsUrls`: `js/domain/offline.js`
- `worshipReview`: `js/domain/review.js`
- `worshipTodayCardHTML`: `js/views/home.js`
- `worshipTodayRows`: `js/domain/worship.js`
- `wrapText`: `js/services/shareCard.js`
- `writeAutoSnapshot`: `js/services/backup.js`
- `writeBackupToHandle`: `js/services/backup.js`
- `writeScrollTop`: `js/app/renderer.js`
- `yieldFullSurahPlayer`: `js/app/audioEngine.js`

## Reverse index: job keyword → files

- `13th`: `js/domain/fasting.js`
- `14th`: `js/domain/fasting.js`
- `15th`: `js/domain/fasting.js`
- `2024`: `js/domain/wmm-coefs.js`
- `2025`: `js/domain/wmm-coefs.js`
- `2030`: `js/domain/wmm-coefs.js`
- `50ms`: `js/domain/search.js`
- `6236`: `js/services/mushaf.js`
- `960px`: `js/ui/shell.js`
- `above`: `js/views/playerBar.js`
- `absence`: `js/ui/missingData.js`
- `access`: `js/services/calendarNotes.js`, `js/services/tasbih.js`
- `accessibility`: `js/core/theme.js`
- `account`: `js/domain/planExport.js`
- `accumulate`: `js/app/readingTimer.js`
- `accuracyfor`: `js/domain/tajweedPractice.js`
- `across`: `js/app/shared.js`, `js/domain/hadithSearch.js`, `js/domain/quranSearch.js`, `js/views/roots.js`, `js/views/tafsirPanel.js`
- `action`: `js/core/state/reducer.js`, `js/core/state/slices/hadith.js`, `js/domain/quickTiles.js`, `js/services/speech.js`, `js/ui/menus.js`, `js/views/installRow.js`
- `actions`: `js/app/handlers/content.js`, `js/core/state/actions.js`, `js/core/state.js`, `js/domain/statistics.js`, `js/services/soundDesign.js`, `js/views/ayahStudy.js`
- `activatemushafautofit`: `js/app/autoFit.js`
- `active`: `js/domain/locations.js`
- `activedays`: `js/domain/statistics.js`
- `activedaysinlastdays`: `js/domain/statistics.js`
- `activefastingcategories`: `js/domain/fasting.js`
- `activeview`: `js/app/renderer.js`
- `actual`: `js/domain/mutashabihat.js`, `js/views/ramadan.js`
- `actually`: `js/domain/statistics.js`, `js/views/about.js`, `js/views/installRow.js`
- `addbacklog`: `js/domain/qada.js`
- `addcategory`: `js/services/editor.js`
- `addcategorytolibrary`: `js/services/contentPrefs.js`
- `adddays`: `js/core/utils.js`
- `added`: `js/services/audioCatalog.js`
- `additemtocategory`: `js/services/contentPrefs.js`
- `additions`: `js/domain/contentLens.js`
- `adhan`: `js/app/fileImports.js`, `js/app/triggers.js`, `js/services/alertTriggers.js`, `js/services/audioStore.js`, `js/services/prayerSound.js`, `js/views/prayer.js`
- `adhanpanelhtml`: `js/views/prayer.js`
- `adhkar`: `js/domain/adhkarTiming.js`, `js/domain/grades.js`, `js/services/checklist.js`, `js/services/shareCard.js`, `js/views/checklist.js`, `js/views/library.js`, `js/views/mood.js`, `js/views/palette.js`, `js/views/search.js`
- `adhkarbrowserhtml`: `js/views/home.js`, `js/views/library.js`
- `adhkarwindowlabel`: `js/views/home.js`
- `advance`: `js/app/focusRuntime.js`, `js/services/surahPlayback.js`
- `advanceclassifyround`: `js/app/practice.js`
- `advancepracticeround`: `js/app/practice.js`
- `advancequeue`: `js/domain/audioQueue.js`
- `affects`: `js/app/renderer.js`
- `affordance`: `js/views/mood.js`
- `again`: `js/views/tajweedPracticeView.js`
- `against`: `js/domain/tajweed.js`
- `agents`: `js/core/config/nav.js`, `js/views/mushafJump.js`
- `aggregation`: `js/domain/review.js`, `js/domain/worship.js`, `js/domain/zakat.js`
- `ahadeeth`: `js/app/hadithData.js`, `js/services/hadith.js`, `js/views/hadith.js`
- `alert`: `js/app/triggers.js`, `js/core/state/slices/shell.js`, `js/services/alertTriggers.js`, `js/services/prayerSound.js`
- `alerts`: `js/app/triggers.js`, `js/services/alertTriggers.js`, `js/services/prayerSound.js`, `js/views/prayer.js`
- `alertstatushtml`: `js/views/prayer.js`
- `aliases`: `js/core/icons.js`
- `alignment`: `js/domain/tajweed.js`
- `alike`: `js/app/handlers/journal.js`, `js/domain/mutashabihat.js`, `js/views/mutashabihat.js`
- `allah`: `js/views/quiz.js`
- `allim`: `js/services/moshafAvailability.js`
- `allowed`: `js/core/config/views.js`, `js/core/storage.js`
- `allsessions`: `js/domain/tajweedCourse.js`
- `along`: `js/domain/tajweedCourse.js`, `js/services/surahPlayback.js`
- `alongside`: `js/views/collection.js`
- `alpha`: `js/views/favorites.js`
- `already`: `js/core/i18n.js`, `js/domain/nudge.js`, `js/domain/review.js`, `js/domain/worship.js`
- `always`: `js/domain/gestures.js`, `js/domain/locations.js`, `js/views/studyContext.js`
- `amber`: `js/domain/ambient.js`
- `ambient`: `js/core/config/views.js`, `js/views/ambient.js`
- `ambientdhikr`: `js/domain/ambient.js`
- `ambientmode`: `js/views/ambient.js`
- `ambienttick`: `js/app/tickers.js`
- `ambientverse`: `js/domain/ambient.js`
- `amount`: `js/domain/worship.js`, `js/domain/zakat.js`
- `anchored`: `js/domain/reminderPresets.js`
- `angle`: `js/domain/wmm.js`
- `angledelta`: `js/domain/qibla.js`
- `anic`: `js/views/roots.js`
- `animation`: `js/ui/readingTokens.js`
- `annotat`: `js/domain/tajweed.js`
- `announced`: `js/ui/toast.js`
- `answer`: `js/domain/quiz.js`, `js/domain/tajweedPractice.js`, `js/views/quiz.js`
- `answerclassify`: `js/app/practice.js`
- `answers`: `js/domain/search.js`, `js/services/calendarNotes.js`, `js/views/about.js`
- `anti`: `js/domain/milestones.js`
- `antonyms`: `js/domain/lexicalProvenance.js`
- `anxious`: `js/domain/moods.js`
- `anywhere`: `js/domain/garden.js`, `js/views/garden.js`
- `appears`: `js/ui/card.js`
- `apple`: `js/domain/prayerExport.js`
- `application`: `js/app/stateSub.js`, `js/app.js`
- `applied`: `js/services/contentPrefs.js`
- `applies`: `js/core/theme.js`, `js/services/calendarNotes.js`
- `appliestodate`: `js/services/calendarNotes.js`
- `applyaudiocachecapfromsettings`: `js/services/audioStore.js`
- `applycategoryfields`: `js/services/contentPrefs.js`
- `applyitemfields`: `js/services/contentPrefs.js`
- `applyitemoverrides`: `js/domain/contentLens.js`
- `applylibraryfields`: `js/services/contentPrefs.js`
- `applyprayeroffsets`: `js/domain/prayer.js`
- `applytajweedcolors`: `js/app/handlers/quran.js`
- `applytheme`: `js/core/theme.js`
- `applytranslationedition`: `js/app/quranData.js`
- `approximation`: `js/domain/calendar.js`
- `apps`: `js/domain/nudge.js`, `js/views/mushafReader.js`
- `arabic`: `js/core/config/views.js`, `js/core/i18n/ar.js`, `js/domain/gestures.js`, `js/domain/localeContent.js`, `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`, `js/services/speech.js`, `js/views/ayahStudy.js`, `js/views/quran.js`, `js/views/search.js`
- `arabic101`: `js/domain/tajweedCourse.js`
- `arafah`: `js/domain/fasting.js`
- `arguments`: `js/domain/khatma.js`, `js/domain/wordStudy.js`
- `aria`: `js/ui/toast.js`
- `arithmetic`: `js/domain/calendar.js`, `js/domain/zakat.js`
- `armed`: `js/services/notifications.js`
- `armfscontrolsafterenter`: `js/app/fullscreen.js`
- `armpaletteshortcut`: `js/app/palette.js`
- `armprayertriggers`: `js/app/triggers.js`
- `arms`: `js/app/triggers.js`
- `armsleeptimer`: `js/services/player.js`, `js/services/surahPlayback.js`
- `armtimer`: `js/domain/sleepTimer.js`
- `around`: `js/domain/compass.js`, `js/services/speech.js`
- `array`: `js/domain/homePanels.js`
- `arrowleft`: `js/domain/playerShortcuts.js`
- `artwork`: `js/services/mediaSession.js`
- `ashura`: `js/domain/fasting.js`
- `asked`: `js/domain/onboarding.js`
- `asks`: `js/views/about.js`
- `asma`: `js/views/quiz.js`
- `asset`: `js/views/zakat.js`
- `assumed`: `js/services/moshafAvailability.js`
- `astranslationedition`: `js/core/config/quran.js`
- `astronomical`: `js/domain/calendar.js`
- `astronomy`: `js/domain/prayer.js`
- `attributes`: `js/core/theme.js`
- `audio`: `js/app/audioEngine.js`, `js/app/fileImports.js`, `js/core/config/quran.js`, `js/core/state/slices/audio.js`, `js/domain/sleepTimer.js`, `js/services/audioStore.js`, `js/services/mushaf.js`, `js/services/player.js`, `js/services/prayerSound.js`, `js/services/recitation.js`, `js/views/offline.js`
- `audiocacheusage`: `js/services/audioStore.js`
- `audiocontext`: `js/services/audioContext.js`
- `audiocontexts`: `js/services/audioContext.js`
- `audiokey`: `js/services/audioStore.js`
- `audiostore`: `js/domain/audioBatch.js`
- `audit`: `js/app/autoFit.js`, `js/app/practice.js`, `js/domain/localeContent.js`
- `authored`: `js/services/editor.js`
- `authority`: `js/app/handlers/content.js`, `js/domain/contentLens.js`
- `auto`: `js/app/autoFit.js`, `js/app/focusRuntime.js`, `js/services/backup.js`, `js/ui/toast.js`
- `autobackupdue`: `js/services/backup.js`
- `automatic`: `js/services/surahPlayback.js`
- `availability`: `js/services/moshafAvailability.js`
- `available`: `js/services/prayerSound.js`
- `availablelanguages`: `js/core/i18n.js`
- `availablesessions`: `js/domain/tajweedCourse.js`
- `averageperday`: `js/domain/statistics.js`
- `aware`: `js/domain/lexicalProvenance.js`, `js/domain/rootAwareSearch.js`
- `ayah`: `js/core/state/slices/quran.js`, `js/domain/mutashabihat.js`, `js/domain/playerShortcuts.js`, `js/domain/readerWindow.js`, `js/domain/tajweedPractice.js`, `js/services/mushaf.js`, `js/views/ayahStudy.js`, `js/views/search.js`, `js/views/studyContext.js`, `js/views/studyTray.js`, `js/views/tafsirPanel.js`
- `ayahaudiourl`: `js/services/mushaf.js`
- `ayahcardfilename`: `js/services/shareCard.js`
- `ayahcardmemostats`: `js/views/quran.js`
- `ayahcountphrase`: `js/core/utils.js`
- `ayahkey`: `js/services/surahPlayback.js`
- `ayahmistakes`: `js/domain/hifz.js`
- `ayahs`: `js/app/quranSearch.js`, `js/domain/tajweedLessons.js`, `js/services/mushaf.js`, `js/views/palette.js`
- `ayahtranslit`: `js/domain/wordStudy.js`
- `ayat`: `js/app/handlers/journal.js`, `js/views/mutashabihat.js`
- `azkar`: `js/views/library.js`, `js/views/mushafReader.js`
- `back`: `js/core/router.js`, `js/services/backup.js`, `js/services/speech.js`
- `backend`: `js/services/appBadge.js`, `js/services/mediaSession.js`
- `backfilltajweedpool`: `js/domain/tajweedPractice.js`
- `backlog`: `js/domain/qada.js`, `js/views/prayer.js`
- `backup`: `js/app/fileImports.js`, `js/services/backup.js`, `js/views/backupSummary.js`
- `backuperrortext`: `js/app/fileImports.js`
- `backupfiletext`: `js/services/backup.js`
- `backups`: `js/services/dataHealth.js`
- `backupstale`: `js/services/backup.js`
- `backupsummaryhtml`: `js/views/backupSummary.js`
- `badge`: `js/services/appBadge.js`
- `badgecountfor`: `js/services/appBadge.js`
- `badges`: `js/domain/milestones.js`, `js/views/certificate.js`
- `badging`: `js/services/appBadge.js`
- `bare`: `js/app/rt.js`, `js/services/shareCard.js`
- `base`: `js/domain/calendar.js`
- `based`: `js/app/autoFit.js`
- `batch`: `js/app/offlineJobs.js`, `js/domain/audioBatch.js`, `js/domain/offline.js`
- `batchqueue`: `js/domain/audioBatch.js`
- `beautiful`: `js/services/shareCard.js`
- `because`: `js/domain/sessionFlags.js`, `js/domain/tajweedSources.js`, `js/views/backupSummary.js`
- `been`: `js/domain/nudge.js`
- `beforeinstallprompt`: `js/app/installPrompt.js`, `js/domain/install.js`
- `behaviors`: `js/app/handlers/viewMenus.js`
- `behaviour`: `js/ui/missingData.js`
- `behind`: `js/services/player.js`, `js/ui/viewSheet.js`
- `being`: `js/domain/review.js`
- `below`: `js/domain/homeInvitations.js`, `js/domain/khatma.js`, `js/views/prayer.js`
- `best`: `js/app/fullscreen.js`, `js/services/speech.js`
- `beyond`: `js/app/quizDeck.js`
- `biased`: `js/domain/dailyAyah.js`
- `bilingual`: `js/domain/wordStudy.js`
- `bind`: `js/app/inputs.js`
- `bindglobalevents`: `js/app/events.js`
- `bindings`: `js/app/rt.js`
- `bismillah`: `js/core/config/sanitize.js`, `js/domain/tajweed.js`, `js/views/tafsirPanel.js`
- `bitrates`: `js/core/config/quran.js`
- `blankcategory`: `js/core/schema.js`
- `blankitem`: `js/core/schema.js`
- `blankitemtemplate`: `js/services/editor.js`
- `bleed`: `js/app/fullscreen.js`, `js/views/focus.js`
- `blob`: `js/services/audioStore.js`
- `blocked`: `js/core/idb/openDB.js`
- `blocking`: `js/ui/toast.js`
- `blueprint`: `js/ui/recitationConsole.js`, `js/views/ayahStudy.js`, `js/views/khatma.js`, `js/views/mushafBookmarks.js`, `js/views/mushafPlayer.js`
- `body`: `js/views/installRow.js`
- `book`: `js/app/hadithData.js`, `js/core/config/quran.js`, `js/core/state/slices/hadith.js`, `js/domain/gestures.js`, `js/domain/hadithSearch.js`, `js/domain/hadithStudy.js`, `js/domain/homePanels.js`, `js/services/hadith.js`, `js/views/hadith.js`
- `bookkeeping`: `js/core/state/slices/audio.js`, `js/domain/ramadan.js`
- `bookmark`: `js/views/mushafBookmarks.js`
- `bookmarks`: `js/core/state/slices/library.js`, `js/core/state/slices/quran.js`
- `books`: `js/core/state/slices/hadith.js`, `js/services/hadith.js`, `js/ui/skeleton.js`, `js/views/palette.js`
- `bookstanding`: `js/services/hadith.js`
- `boot`: `js/app/boot.js`, `js/app/net.js`, `js/app.js`, `js/core/state/slices/shell.js`, `js/views/quran.js`
- `bottom`: `js/views/playerBar.js`
- `boundary`: `js/app/boot.js`, `js/core/config/sanitize.js`, `js/core/idb/openDB.js`
- `bounded`: `js/ui/calendarModals.js`
- `bounds`: `js/services/mushaf.js`
- `breakdown`: `js/views/kids.js`
- `brief`: `js/ui/toast.js`
- `briefly`: `js/services/alertTriggers.js`
- `broken`: `js/domain/nudge.js`, `js/services/audioStore.js`
- `browse`: `js/domain/moods.js`, `js/views/editor.js`, `js/views/mood.js`
- `browser`: `js/app/fullscreen.js`, `js/core/router.js`, `js/domain/install.js`, `js/domain/roots.js`, `js/views/installRow.js`, `js/views/library.js`, `js/views/roots.js`
- `browsers`: `js/services/audioContext.js`
- `budget`: `js/services/gapTelemetry.js`
- `buffered`: `js/views/playerBar.js`
- `build`: `js/app/quranSearch.js`, `js/app/tafsirSearch.js`
- `buildanswerkey`: `js/domain/tajweedPractice.js`
- `buildayahcardpayload`: `js/services/shareCard.js`
- `buildayahquicksheet`: `js/views/quran.js`
- `buildayahstudyextras`: `js/views/tafsirPanel.js`
- `buildbackuppayload`: `js/services/backup.js`
- `buildbismillahhtml`: `js/views/tafsirPanel.js`
- `buildcalendarsheet`: `js/views/viewSheets.js`
- `buildcardmenu`: `js/ui/menus.js`
- `buildcategoryform`: `js/views/editor.js`
- `buildcategorysheet`: `js/views/viewSheets.js`
- `buildchecklistsheet`: `js/views/viewSheets.js`
- `buildclassifyquestion`: `js/domain/tajweedPractice.js`
- `buildcollectionpicker`: `js/ui/menus.js`
- `buildcollectionsharetext`: `js/views/collection.js`
- `buildconfirm`: `js/ui/menus.js`
- `builddaydetail`: `js/ui/calendarModals.js`
- `builddeck`: `js/domain/grammarDrill.js`
- `builddrillround`: `js/domain/mutashabihat.js`
- `buildeditorsheet`: `js/views/viewSheets.js`
- `builder`: `js/services/appBadge.js`, `js/ui/emptyState.js`, `js/views/viewSheets.js`
- `builders`: `js/domain/offline.js`, `js/services/mediaSession.js`, `js/ui/calendarModals.js`, `js/ui/menus.js`, `js/ui/recitationConsole.js`, `js/views/hadithCard.js`
- `buildfieldtogglessheet`: `js/views/viewSheets.js`
- `buildfullscreenconsole`: `js/views/mushafPlayer.js`
- `buildgardenhowsheet`: `js/views/viewSheets.js`
- `buildgardensheet`: `js/views/viewSheets.js`
- `buildhadithbooksheet`: `js/views/viewSheets.js`
- `buildhadithindex`: `js/domain/hadithSearch.js`
- `buildhadithsheet`: `js/views/viewSheets.js`
- `buildhash`: `js/core/router.js`
- `buildindex`: `js/domain/search.js`
- `building`: `js/app/quizDeck.js`, `js/domain/grammarDrill.js`, `js/domain/prayerExport.js`, `js/domain/tajweedPractice.js`
- `builditemform`: `js/views/editor.js`
- `builditemindex`: `js/app/net.js`
- `buildkhatmaplanform`: `js/views/khatma.js`, `js/views/mushafReader.js`
- `buildlibraryform`: `js/views/editor.js`
- `buildlibrarysheet`: `js/views/viewSheets.js`
- `buildmcqoptions`: `js/domain/hifz.js`
- `buildmonthics`: `js/domain/prayerExport.js`
- `buildmonthmodal`: `js/views/prayer.js`
- `buildmonthtimetable`: `js/domain/prayerExport.js`
- `buildmovepicker`: `js/ui/menus.js`
- `buildmushafayahdetail`: `js/views/ayahStudy.js`, `js/views/mushafReader.js`
- `buildmushafbookmarks`: `js/views/mushafBookmarks.js`, `js/views/mushafReader.js`
- `buildmushafjump`: `js/views/mushafJump.js`, `js/views/mushafReader.js`
- `buildmushafpagefind`: `js/views/mushafPageFind.js`
- `buildmushafplaypick`: `js/views/mushafPlayer.js`, `js/views/mushafReader.js`
- `buildmushafsettingspanel`: `js/views/tafsirPanel.js`
- `buildmushafsheet`: `js/views/mushafReader.js`
- `buildmushaftrack`: `js/views/khatma.js`, `js/views/mushafReader.js`
- `buildnoteform`: `js/ui/calendarModals.js`
- `buildonboardingsteps`: `js/domain/onboarding.js`
- `buildpalettegroups`: `js/views/palette.js`
- `buildplan`: `js/domain/planExport.js`
- `buildpracticelesson`: `js/views/tajweedPracticeView.js`
- `buildpracticepicker`: `js/views/tajweedPracticeView.js`
- `buildpracticeround`: `js/views/tajweedPracticeView.js`
- `buildpracticesummary`: `js/views/tajweedPracticeView.js`
- `buildprayerics`: `js/domain/prayerExport.js`
- `buildprayersheet`: `js/views/viewSheets.js`
- `buildqiblasheet`: `js/views/viewSheets.js`
- `buildquizdeck`: `js/app/quizDeck.js`
- `buildquranindex`: `js/domain/quranSearch.js`
- `buildramadansheet`: `js/views/viewSheets.js`
- `buildreciterpick`: `js/app/handlers/quranAudio.js`
- `builds`: `js/domain/search.js`
- `buildsadaqaheditor`: `js/views/home.js`
- `buildsavedwordspanel`: `js/views/tafsirPanel.js`
- `buildscheduleform`: `js/views/editor.js`
- `buildschedulemanagersheet`: `js/views/viewSheets.js`
- `buildsimilarpairs`: `js/domain/mutashabihat.js`
- `buildstatisticssheet`: `js/views/viewSheets.js`
- `buildstatscsv`: `js/domain/statistics.js`
- `buildstudyhadithsection`: `js/views/ayahStudy.js`
- `buildstudytray`: `js/views/studyTray.js`
- `buildtafsirindex`: `js/domain/tafsirSearch.js`
- `buildtafsirpanel`: `js/views/tafsirPanel.js`
- `buildtajweedsettingspanel`: `js/views/tajweedSettings.js`
- `buildtasbihsheet`: `js/views/viewSheets.js`
- `buildtextprompt`: `js/ui/menus.js`
- `buildtimeline`: `js/domain/prayerTimeline.js`
- `buildtriggerplan`: `js/services/alertTriggers.js`
- `buildweeksummary`: `js/domain/statistics.js`
- `buildwordanswerkey`: `js/domain/tajweedPractice.js`
- `buildwordstudyloadingpanel`: `js/views/tafsirPanel.js`
- `buildwordstudypanel`: `js/views/tafsirPanel.js`
- `buildzakatsheet`: `js/views/viewSheets.js`
- `built`: `js/domain/sunnah.js`, `js/services/editor.js`
- `bulk`: `js/app/tafsirSearch.js`, `js/views/collection.js`, `js/views/offline.js`
- `bundled`: `js/app/handlers/content.js`, `js/app/tafsirSearch.js`, `js/domain/contentLens.js`, `js/domain/grammarDrill.js`, `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`, `js/services/contentPrefs.js`, `js/services/prayerSound.js`, `js/views/tafsirPanel.js`
- `button`: `js/ui/viewSheet.js`
- `buttons`: `js/core/router.js`
- `byte`: `js/app/fileImports.js`
- `bytes`: `js/services/audioStore.js`, `js/views/backupSummary.js`
- `cache`: `js/app/offlineJobs.js`, `js/services/audioStore.js`
- `cached`: `js/app/offlineJobs.js`, `js/views/quran.js`
- `caching`: `js/app/quranData.js`
- `calc`: `js/views/prayer.js`
- `calcpanelhtml`: `js/views/prayer.js`
- `calculatetimes`: `js/domain/prayer.js`
- `calculation`: `js/domain/prayer.js`
- `calculator`: `js/views/zakat.js`
- `calendar`: `js/core/state/slices/library.js`, `js/core/state/slices/shell.js`, `js/domain/calendar.js`, `js/domain/prayerExport.js`, `js/domain/reminderPresets.js`, `js/services/calendarNotes.js`, `js/ui/calendarModals.js`, `js/views/calendar.js`
- `call`: `js/app/quizDeck.js`, `js/ui/modal.js`
- `caller`: `js/domain/grammarDrill.js`, `js/views/tajweedCourseView.js`
- `calls`: `js/domain/prayer.js`, `js/services/tasbih.js`
- `calm`: `js/views/kids.js`, `js/views/mushafReader.js`, `js/views/settings.js`
- `canonicalwordtokens`: `js/domain/tajweed.js`
- `canvas`: `js/services/shareCard.js`
- `capabilities`: `js/app/fullscreen.js`
- `capped`: `js/domain/roots.js`
- `capture`: `js/services/gapTelemetry.js`
- `card`: `js/domain/completedCards.js`, `js/domain/contentLens.js`, `js/domain/dailyAyah.js`, `js/services/tasbih.js`, `js/ui/card.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/views/backupSummary.js`, `js/views/category.js`, `js/views/hadithCard.js`, `js/views/mood.js`
- `cardfilename`: `js/services/shareCard.js`
- `cardhtml`: `js/ui/card.js`
- `cardinallabel`: `js/domain/qibla.js`
- `cards`: `js/domain/garden.js`, `js/services/speech.js`, `js/services/tasbih.js`, `js/views/certificate.js`, `js/views/collection.js`
- `caret`: `js/app/inputs.js`
- `carries`: `js/app/installPrompt.js`, `js/domain/grades.js`
- `carry`: `js/domain/hadithStudy.js`
- `carrying`: `js/views/settings.js`
- `case`: `js/domain/grammarDrill.js`, `js/domain/wordStudy.js`, `js/services/speech.js`
- `catalog`: `js/app/audioEngine.js`, `js/core/config/app.js`, `js/core/state/slices/audio.js`, `js/services/audioCatalog.js`, `js/services/moshafAvailability.js`, `js/ui/skeleton.js`, `js/views/audioManager.js`
- `catch`: `js/app/triggers.js`
- `categories`: `js/domain/fasting.js`, `js/views/editor.js`
- `category`: `js/views/category.js`, `js/views/editor.js`, `js/views/focus.js`, `js/views/mood.js`
- `categorydisplayname`: `js/core/utils.js`
- `cdns`: `js/services/mushaf.js`
- `celebrate`: `js/domain/milestones.js`
- `celebration`: `js/domain/celebrate.js`, `js/domain/khatma.js`
- `cell`: `js/views/calendar.js`
- `central`: `js/core/config.js`
- `certificate`: `js/app/handlers/journal.js`, `js/views/certificate.js`
- `certificatedata`: `js/domain/milestones.js`
- `chains`: `js/services/notifications.js`
- `change`: `js/app/handlers/content.js`, `js/app/renderer.js`, `js/app/stateSub.js`
- `changehandlers`: `js/app/handlers/audio.js`, `js/app/handlers/content.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/offline.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/worship.js`
- `changeregistry`: `js/app/events.js`
- `changes`: `js/domain/contentLens.js`
- `chapter`: `js/services/hadith.js`, `js/views/hadith.js`
- `character`: `js/domain/tajweed.js`
- `chart`: `js/domain/kids.js`, `js/views/kids.js`, `js/views/tajweedSettings.js`
- `cheap`: `js/app/renderer.js`
- `check`: `js/services/alertTriggers.js`, `js/services/checklist.js`, `js/services/dataHealth.js`, `js/services/notifications.js`, `js/views/checklist.js`
- `checklist`: `js/core/config/app.js`, `js/domain/planExport.js`, `js/domain/ramadanPlanner.js`, `js/services/checklist.js`
- `checkliststreak`: `js/services/checklist.js`
- `checkofflineroom`: `js/app/offlineJobs.js`
- `chip`: `js/ui/missingData.js`
- `choice`: `js/core/config/app.js`, `js/views/mushafBookmarks.js`, `js/views/quiz.js`
- `choices`: `js/core/config/views.js`, `js/domain/sleepTimer.js`, `js/domain/tajweed.js`, `js/services/surahPlayback.js`
- `chrome`: `js/core/config/nav.js`, `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/i18n.js`, `js/views/ambient.js`
- `chunked`: `js/app/tafsirSearch.js`
- `circle`: `js/domain/qibla.js`
- `citation`: `js/domain/tajweedSources.js`
- `city`: `js/domain/locations.js`
- `civil`: `js/domain/calendar.js`
- `claimspeaker`: `js/app/audioEngine.js`
- `clamp`: `js/core/utils.js`, `js/domain/gestures.js`
- `clampjournalpage`: `js/views/journal.js`
- `clamppage`: `js/services/hadith.js`, `js/services/mushaf.js`
- `clampslidernum`: `js/app/inputs.js`
- `classic`: `js/core/state/slices/quran.js`, `js/domain/lastPosition.js`, `js/domain/mutashabihat.js`, `js/domain/readerWindow.js`, `js/domain/translationCompare.js`
- `classical`: `js/domain/tajweedCourse.js`
- `classifier`: `js/domain/tajweed.js`, `js/domain/tajweedPractice.js`
- `classify`: `js/domain/tajweed.js`
- `classifyayahtajweed`: `js/domain/tajweed.js`
- `classifymemosizefortests`: `js/domain/tajweed.js`
- `classifywordtajweed`: `js/domain/tajweed.js`
- `cleanobject`: `js/core/utils.js`
- `cleansadaqahamount`: `js/domain/worship.js`
- `cleansnapshotbytes`: `js/views/backupSummary.js`
- `clear`: `js/services/gapTelemetry.js`
- `clearappbadge`: `js/services/appBadge.js`
- `clearbackuphandle`: `js/services/backup.js`
- `clearbatchqueue`: `js/services/audioStore.js`
- `clearcelebrations`: `js/domain/celebrate.js`
- `clearclassifymemo`: `js/domain/tajweed.js`
- `cleardismissed`: `js/domain/completedCards.js`
- `clearlazyinflightfetches`: `js/app/lazyData.js`
- `clearmetadata`: `js/services/mediaSession.js`
- `clearmoshafavailability`: `js/services/moshafAvailability.js`
- `clearmushaftarget`: `js/ui/readingTokens.js`
- `clearquizmiss`: `js/domain/quiz.js`
- `clearqurandatafetches`: `js/app/quranData.js`
- `clearscrollmemory`: `js/app/renderer.js`
- `clearsleeptimer`: `js/services/player.js`, `js/services/surahPlayback.js`
- `clearstudydata`: `js/app/offlineJobs.js`
- `cleartextcache`: `js/app/offlineJobs.js`
- `cleartimer`: `js/domain/sleepTimer.js`
- `click`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/offline.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `clickhandlers`: `js/app/handlers/audio.js`, `js/app/handlers/content.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/offline.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/viewMenus.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `client`: `js/services/notifications.js`
- `clipboard`: `js/ui/toast.js`
- `clips`: `js/services/dhikrAudio.js`
- `clock`: `js/app/readingTimer.js`
- `clone`: `js/core/utils.js`
- `close`: `js/app/drawer.js`
- `closeaudiostoreforreset`: `js/services/audioStore.js`
- `closed`: `js/domain/grades.js`, `js/services/alertTriggers.js`
- `closefloatingcounter`: `js/services/floatingCounter.js`
- `closelivedatabases`: `js/core/idb/openDB.js`
- `closemodal`: `js/ui/modal.js`
- `closenavdrawer`: `js/app/drawer.js`
- `closes`: `js/domain/quranSearch.js`, `js/services/surahPlayback.js`
- `clozeayahhtml`: `js/domain/hifz.js`
- `clozewords`: `js/domain/hifz.js`
- `coef`: `js/domain/wmm-coefs.js`
- `coefficient`: `js/domain/wmm-coefs.js`
- `coercegoal`: `js/core/state/streak.js`
- `collectdrillwords`: `js/domain/grammarDrill.js`
- `collection`: `js/core/config/app.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/views/collection.js`, `js/views/favorites.js`
- `collectionfor`: `js/domain/localeContent.js`
- `collections`: `js/core/state/slices/library.js`, `js/domain/moods.js`, `js/services/hadith.js`, `js/ui/card.js`
- `color`: `js/domain/tajweed.js`, `js/views/tajweedSettings.js`
- `coloring`: `js/domain/tajweedPractice.js`
- `colors`: `js/views/tajweedSettings.js`
- `combined`: `js/domain/worship.js`
- `come`: `js/views/about.js`
- `comes`: `js/domain/khatma.js`, `js/domain/wordStudy.js`, `js/services/mushaf.js`
- `comfort`: `js/domain/onboarding.js`
- `command`: `js/app/palette.js`, `js/views/palette.js`
- `comment`: `js/app/events.js`, `js/app/forms.js`, `js/app/handlers/quran.js`, `js/app/lazyData.js`, `js/app/recitationFollow.js`
- `compactprayermethodline`: `js/domain/prayer.js`
- `companion`: `js/domain/homeInvitations.js`, `js/domain/ramadan.js`, `js/views/ramadan.js`
- `compare`: `js/domain/translationCompare.js`
- `comparevisible`: `js/domain/translationCompare.js`
- `compass`: `js/app/compassRuntime.js`, `js/app/stateSub.js`, `js/domain/compass.js`, `js/domain/qibla.js`
- `complete`: `js/views/quran.js`
- `completed`: `js/core/utils.js`
- `completedcount`: `js/services/checklist.js`
- `completeoldest`: `js/domain/qada.js`
- `completion`: `js/app/handlers/offline.js`, `js/domain/celebrate.js`, `js/domain/reflections.js`, `js/domain/sunnah.js`, `js/services/tasbih.js`, `js/views/khatma.js`, `js/views/onboardingPanel.js`
- `component`: `js/views/library.js`
- `composer`: `js/views/viewSheets.js`
- `composition`: `js/app/boot.js`, `js/app/net.js`, `js/app.js`
- `computation`: `js/domain/prayerTimeline.js`, `js/views/certificate.js`
- `computed`: `js/domain/mutashabihat.js`, `js/domain/review.js`, `js/domain/tajweed.js`, `js/views/mutashabihat.js`
- `computefitr`: `js/domain/zakat.js`
- `computefitscale`: `js/app/autoFit.js`
- `computenisab`: `js/domain/zakat.js`
- `computenudge`: `js/domain/nudge.js`
- `computereaderwindow`: `js/domain/readerWindow.js`
- `computes`: `js/app/triggers.js`, `js/domain/wmm.js`
- `computestreak`: `js/core/state/streak.js`
- `computewarmtriples`: `js/services/surahPlayback.js`
- `computezakat`: `js/domain/zakat.js`
- `concurrent`: `js/services/audioContext.js`
- `config`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/core/config.js`, `js/domain/grades.js`, `js/domain/offline.js`, `js/services/recitation.js`
- `configuration`: `js/core/config.js`
- `configuredriver`: `js/services/recitation.js`
- `confirm`: `js/app/fileImports.js`, `js/domain/onboarding.js`
- `confirmation`: `js/ui/menus.js`, `js/ui/modal.js`
- `confirmed`: `js/views/favorites.js`
- `confirmhadithindexall`: `js/app/hadithData.js`
- `confusablepairsfor`: `js/domain/mutashabihat.js`
- `consistent`: `js/domain/milestones.js`
- `console`: `js/ui/recitationConsole.js`
- `consolesnapshot`: `js/ui/recitationConsole.js`
- `consonantskeleton`: `js/domain/rootAwareSearch.js`
- `constants`: `js/core/config.js`
- `consumed`: `js/app/installPrompt.js`, `js/domain/install.js`
- `consumeflipdirection`: `js/ui/readingTokens.js`
- `consumefullscreenanim`: `js/ui/readingTokens.js`
- `consumelastfinish`: `js/services/surahPlayback.js`
- `consumemushaftarget`: `js/ui/readingTokens.js`
- `consumepopnavigation`: `js/core/router.js`
- `containment`: `js/app/drawer.js`
- `containsarabic`: `js/domain/localeContent.js`
- `containssurfaceword`: `js/domain/tajweed.js`
- `content`: `js/app/boot.js`, `js/app/handlers/content.js`, `js/core/i18n.js`, `js/core/schema.js`, `js/core/state/slices/library.js`, `js/domain/ambient.js`, `js/domain/contentLens.js`, `js/domain/grades.js`, `js/domain/localeContent.js`, `js/domain/offline.js`, `js/services/contentPrefs.js`, `js/services/editor.js`, `js/ui/calendarModals.js`, `js/views/about.js`, `js/views/category.js`, `js/views/editor.js`, `js/views/playerBar.js`
- `contentprefs`: `js/app/handlers/content.js`
- `contentprefsof`: `js/services/contentPrefs.js`
- `contenttitlefor`: `js/domain/localeContent.js`
- `context`: `js/app/rt.js`, `js/services/audioContext.js`, `js/views/studyContext.js`
- `contextual`: `js/ui/modal.js`
- `continuous`: `js/domain/sleepTimer.js`, `js/services/surahPlayback.js`
- `contract`: `js/domain/localeContent.js`, `js/domain/nudge.js`, `js/domain/review.js`
- `control`: `js/app/boot.js`, `js/views/studyTray.js`
- `controller`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `controls`: `js/app/handlers/offline.js`, `js/services/mediaSession.js`, `js/ui/recitationConsole.js`, `js/views/collection.js`
- `convention`: `js/domain/ramadanPlanner.js`
- `conversion`: `js/domain/calendar.js`
- `converts`: `js/core/migration.js`
- `cooking`: `js/services/floatingCounter.js`
- `copied`: `js/core/icons.js`, `js/ui/toast.js`
- `copy`: `js/domain/nudge.js`, `js/services/player.js`, `js/ui/recitationConsole.js`, `js/views/ayahStudy.js`, `js/views/installRow.js`
- `core`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/core/config.js`, `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/reducer.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/core/state.js`, `js/domain/grades.js`, `js/domain/offline.js`
- `corpus`: `js/app/offlineJobs.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/views/offline.js`, `js/views/roots.js`
- `correction`: `js/app/compassRuntime.js`
- `corrupt`: `js/services/audioStore.js`
- `cors`: `js/services/audioCatalog.js`
- `costs`: `js/services/gapTelemetry.js`
- `count`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/domain/searchPagination.js`, `js/domain/tajweedLessons.js`, `js/services/appBadge.js`, `js/views/kids.js`, `js/views/mood.js`
- `countdown`: `js/domain/ambient.js`, `js/domain/homeInvitations.js`, `js/domain/ramadan.js`, `js/domain/ramadanPlanner.js`, `js/views/ambient.js`, `js/views/ramadan.js`
- `countdownlabel`: `js/domain/sleepTimer.js`
- `countdowns`: `js/app/tickers.js`, `js/domain/milestones.js`
- `counted`: `js/domain/garden.js`, `js/views/garden.js`
- `counter`: `js/domain/completedCards.js`, `js/domain/lexicalProvenance.js`, `js/domain/reflections.js`, `js/services/floatingCounter.js`, `js/services/tasbih.js`
- `counters`: `js/core/state/slices/library.js`, `js/domain/completedCards.js`
- `counting`: `js/services/floatingCounter.js`, `js/services/tasbih.js`, `js/views/focus.js`, `js/views/settings.js`
- `countmemorized`: `js/domain/hifz.js`
- `course`: `js/domain/tajweedCourse.js`, `js/views/tajweedCourseView.js`
- `courseprogress`: `js/domain/tajweedCourse.js`
- `courserules`: `js/domain/tajweedCourse.js`
- `coverage`: `js/domain/lexicalProvenance.js`
- `create`: `js/services/editor.js`, `js/views/editor.js`
- `created`: `js/services/audioContext.js`, `js/services/calendarNotes.js`
- `createlibrary`: `js/services/editor.js`
- `creation`: `js/views/editor.js`
- `critical`: `js/services/surahPlayback.js`
- `cross`: `js/domain/hadithSearch.js`, `js/domain/moods.js`, `js/domain/quiz.js`, `js/views/mood.js`
- `crossed`: `js/views/mushafJump.js`
- `curated`: `js/domain/moods.js`, `js/domain/mutashabihat.js`, `js/domain/tajweedPractice.js`, `js/views/mood.js`, `js/views/mutashabihat.js`, `js/views/tajweedSettings.js`
- `currency`: `js/domain/zakat.js`
- `current`: `js/app/handlers/viewMenus.js`, `js/core/migration.js`, `js/core/theme.js`, `js/views/mushafPageFind.js`
- `currentayahdetailpage`: `js/app/lazyData.js`
- `currentdhikraudioitemid`: `js/services/dhikrAudio.js`
- `currentdhikraudiourl`: `js/services/dhikrAudio.js`
- `currently`: `js/services/floatingCounter.js`, `js/views/mushafPageFind.js`
- `currentlyplayingkey`: `js/services/recitation.js`
- `currentprayer`: `js/domain/prayer.js`
- `currentreciterid`: `js/services/surahPlayback.js`
- `currentsrc`: `js/services/player.js`
- `custo`: `js/services/audioCatalog.js`
- `custom`: `js/app/fileImports.js`, `js/core/state/slices/audio.js`, `js/core/state/slices/library.js`, `js/core/theme.js`, `js/services/contentPrefs.js`, `js/services/editor.js`, `js/views/audioManager.js`, `js/views/category.js`, `js/views/editor.js`
- `customadhanflags`: `js/services/prayerSound.js`
- `customcontent`: `js/services/editor.js`
- `custommoshafid`: `js/services/audioCatalog.js`
- `cycle`: `js/domain/celebrate.js`, `js/services/surahPlayback.js`, `js/services/tasbih.js`, `js/ui/recitationConsole.js`
- `cyclerepeatmode`: `js/domain/audioQueue.js`
- `cycles`: `js/core/utils.js`
- `cyclestate`: `js/domain/prayerLog.js`
- `cycletabfocus`: `js/ui/modal.js`
- `daily`: `js/app/hadithData.js`, `js/core/state/slices/hadith.js`, `js/core/state/streak.js`, `js/domain/dailyAyah.js`, `js/domain/prayerLog.js`, `js/domain/reminderPresets.js`, `js/services/checklist.js`, `js/services/hadith.js`, `js/ui/calendarModals.js`, `js/views/checklist.js`
- `dailychecklist`: `js/domain/prayerLog.js`, `js/services/checklist.js`
- `dailyeligibleentries`: `js/domain/dailyAyah.js`
- `dailyhadithcardhtml`: `js/views/hadithCard.js`
- `dailyhistory`: `js/app/readingTimer.js`
- `dailyversereminder`: `js/domain/reminderPresets.js`
- `database`: `js/services/audioStore.js`
- `dataset`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `date`: `js/domain/homeInvitations.js`, `js/domain/prayer.js`, `js/domain/prayerTimeline.js`, `js/domain/qada.js`, `js/domain/wmm.js`, `js/services/calendarNotes.js`
- `datekey`: `js/core/utils.js`
- `dates`: `js/domain/prayerExport.js`
- `dateswithnotesinrange`: `js/services/calendarNotes.js`
- `daycomplete`: `js/domain/prayerLog.js`
- `daykey`: `js/domain/reminderPresets.js`
- `days`: `js/domain/fasting.js`, `js/domain/homeInvitations.js`, `js/domain/install.js`, `js/domain/nudge.js`, `js/domain/zakat.js`, `js/services/backup.js`, `js/ui/calendarModals.js`
- `dayseed`: `js/services/hadith.js`
- `daysinhijrimonth`: `js/domain/calendar.js`
- `dayssincebackup`: `js/services/dataHealth.js`
- `daysuntilhawl`: `js/domain/zakat.js`
- `deactivatemushafautofit`: `js/app/autoFit.js`
- `debounce`: `js/core/utils.js`
- `debouncecollectionsearchnavigate`: `js/app/inputs.js`
- `debounced`: `js/app/inputs.js`
- `debouncefavoritessearchnavigate`: `js/app/inputs.js`
- `debouncehadithgridquery`: `js/app/inputs.js`
- `debouncehadithquery`: `js/app/inputs.js`
- `debouncejournalsearchnavigate`: `js/app/inputs.js`
- `debouncequransearchnavigate`: `js/app/inputs.js`
- `debouncerootssearchnavigate`: `js/app/inputs.js`
- `debouncesearchnavigate`: `js/app/inputs.js`
- `debouncesettingssearchnavigate`: `js/app/inputs.js`
- `debouncetajweedcoursesearchnavigate`: `js/app/inputs.js`
- `decimal`: `js/domain/prayerExport.js`
- `decimalhourstodate`: `js/domain/prayer.js`
- `decimalyear`: `js/domain/wmm.js`
- `decisions`: `js/domain/gestures.js`, `js/domain/onboarding.js`, `js/views/onboardingPanel.js`
- `deck`: `js/app/quizDeck.js`, `js/domain/grammarDrill.js`
- `declination`: `js/app/compassRuntime.js`, `js/domain/wmm.js`
- `declinationat`: `js/domain/wmm.js`
- `declinationcached`: `js/domain/wmm.js`
- `declinationlabel`: `js/domain/wmm.js`
- `dedicated`: `js/services/audioStore.js`, `js/views/roots.js`
- `dedup`: `js/services/notifications.js`
- `dedupeentries`: `js/domain/reflections.js`
- `deep`: `js/app/hadithData.js`, `js/core/router.js`, `js/views/favorites.js`
- `default`: `js/core/config/quran.js`, `js/core/config/views.js`, `js/domain/homePanels.js`, `js/domain/quickTiles.js`, `js/domain/tajweedCourse.js`, `js/services/audioStore.js`, `js/services/editor.js`, `js/services/soundDesign.js`, `js/services/surahPlayback.js`, `js/views/tajweedSettings.js`
- `defaultbackupstorage`: `js/services/backup.js`
- `defaultfastingprefs`: `js/domain/fasting.js`
- `defaulthiddenhome`: `js/domain/homePanels.js`
- `defaultinstalldeferral`: `js/domain/install.js`
- `defaultlastposition`: `js/domain/lastPosition.js`
- `defaultnudgestate`: `js/domain/nudge.js`
- `defaults`: `js/app/handlers/content.js`, `js/domain/quickTiles.js`
- `defaultsearchedition`: `js/domain/tafsirSearch.js`
- `defaulttajweedpracticestats`: `js/domain/tajweedPractice.js`
- `defer`: `js/app/offlineJobs.js`
- `deferrals`: `js/domain/install.js`
- `deferred`: `js/domain/onboarding.js`
- `deferredsetuphtml`: `js/views/settings.js`
- `definition`: `js/domain/tajweedLessons.js`
- `definitions`: `js/core/config.js`
- `defs`: `js/domain/quickTiles.js`
- `degamified`: `js/domain/kids.js`, `js/views/kids.js`
- `dele`: `js/views/category.js`
- `delegated`: `js/app.js`
- `delegation`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `delete`: `js/services/editor.js`, `js/views/collection.js`, `js/views/editor.js`
- `deleteadhanaudio`: `js/services/audioStore.js`
- `deleteaudio`: `js/services/audioStore.js`
- `deletecategory`: `js/services/editor.js`
- `deleteitem`: `js/services/editor.js`
- `deletelibrary`: `js/services/editor.js`
- `deletemoshafaudio`: `js/services/audioStore.js`
- `deletes`: `js/domain/contentLens.js`
- `deleteverseaudio`: `js/services/audioStore.js`
- `deliberate`: `js/core/icons.js`
- `deliberately`: `js/domain/prayerLog.js`, `js/domain/qada.js`, `js/domain/worship.js`, `js/services/dhikrAudio.js`, `js/services/hadith.js`, `js/views/checklist.js`, `js/views/mushafPageFind.js`
- `demand`: `js/app/offlineJobs.js`, `js/views/offline.js`, `js/views/tafsirPanel.js`
- `dependency`: `js/core/utils.js`
- `derive`: `js/core/config/nav.js`, `js/domain/statistics.js`
- `derived`: `js/domain/hadithStudy.js`
- `describebackupsummary`: `js/views/backupSummary.js`
- `design`: `js/domain/sunnah.js`, `js/services/soundDesign.js`
- `desiredplayingstate`: `js/services/mediaSession.js`
- `desktop`: `js/ui/shell.js`, `js/views/playerBar.js`
- `destinations`: `js/views/palette.js`
- `detail`: `js/ui/calendarModals.js`, `js/views/ayahStudy.js`
- `detectinstallplatform`: `js/domain/install.js`
- `detection`: `js/domain/ramadan.js`
- `deterministic`: `js/app/quizDeck.js`, `js/domain/tajweed.js`, `js/domain/tajweedPractice.js`, `js/services/hadith.js`
- `device`: `js/domain/duaJournal.js`, `js/views/journal.js`
- `deviceorientationevent`: `js/domain/compass.js`
- `devices`: `js/services/backup.js`, `js/services/gapTelemetry.js`
- `devotional`: `js/domain/localeContent.js`, `js/services/shareCard.js`
- `dhikr`: `js/core/config.js`, `js/core/state/streak.js`, `js/core/state.js`, `js/domain/garden.js`, `js/services/dhikrAudio.js`, `js/views/garden.js`
- `diacritic`: `js/domain/quranSearch.js`, `js/views/search.js`
- `dialog`: `js/domain/install.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/views/installRow.js`
- `dialogs`: `js/ui/modal.js`
- `dict`: `js/core/config/quran.js`
- `dictentryfor`: `js/domain/wordStudy.js`
- `dictionary`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/i18n.js`
- `diffable`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`
- `diffdays`: `js/domain/hifz.js`
- `diffwords`: `js/domain/mutashabihat.js`
- `direction`: `js/core/theme.js`, `js/domain/gestures.js`, `js/domain/qibla.js`, `js/ui/readingTokens.js`, `js/views/qibla.js`
- `directl`: `js/services/hadith.js`
- `directly`: `js/core/fetch.js`, `js/core/storage.js`, `js/core/utils.js`, `js/domain/tajweed.js`
- `disagree`: `js/views/certificate.js`
- `discarded`: `js/core/migration.js`
- `disclosurehtml`: `js/ui/card.js`
- `disk`: `js/domain/contentLens.js`
- `dismiss`: `js/domain/gestures.js`
- `dismisscompleted`: `js/domain/completedCards.js`
- `dismisses`: `js/ui/toast.js`
- `dispatch`: `js/app/autoFit.js`, `js/app/tafsirSearch.js`
- `dispatched`: `js/domain/statistics.js`
- `dispatcher`: `js/core/state/reducer.js`, `js/domain/playerShortcuts.js`
- `dispatches`: `js/app/handlers/content.js`, `js/core/router.js`, `js/domain/compass.js`, `js/services/checklist.js`
- `dispatchregistry`: `js/app/events.js`
- `dispatchsurahdoc`: `js/app/quranData.js`
- `displ`: `js/views/tafsirPanel.js`
- `display`: `js/views/ambient.js`
- `distance`: `js/domain/qibla.js`
- `distancetokaabakm`: `js/domain/qibla.js`
- `distinct`: `js/services/prayerSound.js`
- `distraction`: `js/views/focus.js`
- `doccorpuscount`: `js/views/home.js`
- `docked`: `js/views/playerBar.js`
- `docs`: `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/ui/skeleton.js`
- `document`: `js/app/quranData.js`, `js/domain/hadithSearch.js`
- `documented`: `js/views/mushafJump.js`
- `documents`: `js/core/migration.js`
- `does`: `js/views/about.js`, `js/views/settings.js`
- `doing`: `js/services/floatingCounter.js`
- `domain`: `js/app/handlers/grammar.js`, `js/app/practice.js`, `js/domain/ambient.js`, `js/domain/dailyAyah.js`, `js/domain/rootAwareSearch.js`, `js/domain/sunnah.js`, `js/domain/tajweedLessons.js`, `js/domain/wmm-coefs.js`, `js/views/backupSummary.js`, `js/views/certificate.js`, `js/views/garden.js`, `js/views/khatma.js`, `js/views/mutashabihat.js`, `js/views/onboardingPanel.js`, `js/views/tajweedCourseView.js`
- `done`: `js/domain/completedCards.js`, `js/domain/onboarding.js`, `js/views/onboardingPanel.js`
- `door`: `js/core/config/nav.js`, `js/views/hadith.js`
- `doors`: `js/core/config/nav.js`
- `down`: `js/domain/qada.js`, `js/views/collection.js`
- `download`: `js/core/state/slices/audio.js`, `js/domain/duaJournal.js`, `js/views/offline.js`
- `downloadable`: `js/services/backup.js`
- `downloadbackup`: `js/services/backup.js`
- `downloadblob`: `js/services/shareCard.js`
- `downloadone`: `js/app/audioEngine.js`
- `downloadplan`: `js/services/backup.js`
- `downloads`: `js/app/audioEngine.js`, `js/app/offlineJobs.js`, `js/views/audioManager.js`, `js/views/offline.js`
- `downloadsurah`: `js/services/audioStore.js`
- `downloadversefile`: `js/services/audioStore.js`
- `drag`: `js/domain/gestures.js`
- `drawer`: `js/app/drawer.js`, `js/core/config/nav.js`, `js/views/mushafJump.js`
- `drawersectionshtml`: `js/ui/shell.js`
- `drawn`: `js/core/icons.js`, `js/domain/tajweedLessons.js`, `js/views/quiz.js`
- `drill`: `js/app/handlers/grammar.js`, `js/app/handlers/journal.js`, `js/app/practice.js`, `js/domain/grammarDrill.js`, `js/domain/mutashabihat.js`, `js/domain/tajweedLessons.js`, `js/domain/tajweedPractice.js`, `js/views/mutashabihat.js`, `js/views/tajweedPracticeView.js`
- `drillhtml`: `js/views/roots.js`
- `drills`: `js/domain/playerShortcuts.js`
- `driven`: `js/domain/quickTiles.js`, `js/views/garden.js`, `js/views/ramadan.js`
- `driverhasended`: `js/services/recitation.js`
- `driveroffended`: `js/services/recitation.js`
- `driverofferror`: `js/services/recitation.js`
- `driveronended`: `js/services/recitation.js`
- `driveronerror`: `js/services/recitation.js`
- `driverpause`: `js/services/recitation.js`
- `driverplay`: `js/services/recitation.js`
- `driverpreload`: `js/services/recitation.js`
- `driverresume`: `js/services/recitation.js`
- `driversetrate`: `js/services/recitation.js`
- `driversetvolume`: `js/services/recitation.js`
- `driverstop`: `js/services/recitation.js`
- `drives`: `js/app/palette.js`, `js/domain/sleepTimer.js`
- `dryrunrestore`: `js/core/state/restore.js`, `js/core/state.js`
- `dryrunverdict`: `js/services/dataHealth.js`
- `dual`: `js/views/calendar.js`
- `duamonthstats`: `js/domain/duaJournal.js`
- `duas`: `js/app/handlers/journal.js`, `js/views/journal.js`, `js/views/mood.js`, `js/views/palette.js`, `js/views/search.js`
- `dueayahs`: `js/domain/hifz.js`
- `duecounts`: `js/domain/hifz.js`
- `duememrecords`: `js/domain/hifz.js`
- `duesurahs`: `js/domain/hifz.js`
- `duha`: `js/domain/sunnah.js`
- `duplicate`: `js/views/category.js`
- `duplicated`: `js/domain/worship.js`
- `duplicateitem`: `js/services/editor.js`
- `duration`: `js/services/player.js`
- `during`: `js/core/storage.js`, `js/domain/mutashabihat.js`
- `earth`: `js/domain/qibla.js`
- `echo`: `js/services/surahPlayback.js`
- `echopauseoptions`: `js/app/handlers/quranAudio.js`
- `edge`: `js/domain/audioBatch.js`
- `edit`: `js/ui/calendarModals.js`, `js/views/category.js`, `js/views/editor.js`
- `editable`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/domain/quickTiles.js`
- `edition`: `js/app/quranData.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/domain/tafsirSearch.js`, `js/domain/translationCompare.js`, `js/views/tafsirPanel.js`
- `editionbodyhtml`: `js/views/tafsirPanel.js`
- `editions`: `js/core/config/quran.js`
- `editor`: `js/ui/modal.js`, `js/views/editor.js`, `js/views/khatma.js`
- `edits`: `js/domain/contentLens.js`
- `effect`: `js/app/fullscreen.js`
- `effectiveadhanvolume`: `js/services/prayerSound.js`
- `effectiverulecolor`: `js/domain/tajweed.js`
- `effort`: `js/app/fullscreen.js`, `js/services/speech.js`
- `eight`: `js/domain/tajweedCourse.js`
- `either`: `js/app/renderer.js`, `js/domain/lexicalProvenance.js`
- `elapsedseconds`: `js/app/readingTimer.js`
- `elapses`: `js/domain/sleepTimer.js`
- `element`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/services/player.js`
- `eligible`: `js/domain/dailyAyah.js`
- `else`: `js/domain/onboarding.js`, `js/services/floatingCounter.js`
- `elsewhere`: `js/domain/roots.js`
- `empty`: `js/app/forms.js`, `js/ui/card.js`, `js/ui/emptyState.js`
- `emptystate`: `js/ui/missingData.js`
- `emptystatehtml`: `js/ui/emptyState.js`
- `emulates`: `js/domain/gestures.js`
- `enforceaudiocachecap`: `js/services/audioStore.js`
- `engine`: `js/app/autoFit.js`, `js/app/practice.js`, `js/core/icons.js`, `js/domain/audioQueue.js`, `js/domain/offline.js`, `js/domain/prayerExport.js`, `js/domain/prayerTimeline.js`, `js/domain/sleepTimer.js`, `js/services/hadith.js`, `js/services/player.js`, `js/views/playerBar.js`, `js/views/ramadan.js`
- `english`: `js/core/i18n/en.js`
- `enough`: `js/domain/nudge.js`
- `ensurehadithbook`: `js/app/hadithData.js`
- `ensurehadithdata`: `js/app/hadithData.js`
- `ensurehadithindex`: `js/app/hadithData.js`
- `ensurehadithsearchindex`: `js/app/hadithData.js`
- `ensuremushafdata`: `js/app/lazyData.js`
- `ensuremushafmeta`: `js/app/lazyData.js`
- `ensuremushafnavigationpages`: `js/app/lazyData.js`
- `ensuremushafsurahdocs`: `js/app/lazyData.js`
- `ensureofflinequota`: `js/app/offlineJobs.js`
- `ensurepersistentstorage`: `js/services/audioStore.js`
- `ensurequrancss`: `js/app/renderer.js`
- `ensurequrandata`: `js/app/lazyData.js`
- `ensurequranmeta`: `js/app/lazyData.js`
- `ensurequranroots`: `js/app/lazyData.js`
- `ensurequranrootsfull`: `js/app/lazyData.js`
- `ensurequransearchdata`: `js/app/quranSearch.js`
- `ensurequranwordsdata`: `js/app/lazyData.js`
- `ensurerecitersdata`: `js/app/audioEngine.js`
- `ensurerootsmeaning`: `js/app/lazyData.js`
- `ensures`: `js/domain/grammarDrill.js`
- `ensuretafsireditions`: `js/app/lazyData.js`
- `ensuretafsirsearchdata`: `js/app/tafsirSearch.js`
- `ensuretafsirtext`: `js/app/lazyData.js`
- `ensuretajweedpool`: `js/app/lazyData.js`
- `ensuretranslationbdoc`: `js/app/quranData.js`
- `ensuretranslationcdoc`: `js/app/quranData.js`
- `ensureworddict`: `js/app/lazyData.js`
- `enter`: `js/app/palette.js`, `js/app/renderer.js`
- `entered`: `js/views/studyContext.js`
- `entire`: `js/domain/quranSearch.js`, `js/views/search.js`
- `entirely`: `js/domain/review.js`, `js/services/speech.js`
- `entries`: `js/core/config/nav.js`, `js/domain/qada.js`
- `entry`: `js/app/handlers/viewMenus.js`, `js/app/readingTimer.js`, `js/app.js`, `js/domain/launchIntents.js`, `js/views/qibla.js`
- `ephemeral`: `js/core/state/slices/hadith.js`
- `epoch`: `js/domain/calendar.js`, `js/domain/wmm-coefs.js`
- `equivalent`: `js/views/calendar.js`
- `erase`: `js/views/kids.js`
- `error`: `js/app/boot.js`, `js/core/storage.js`
- `errors`: `js/services/backup.js`
- `escapehtml`: `js/core/utils.js`
- `essential`: `js/app/offlineJobs.js`
- `essentials`: `js/app/offlineJobs.js`
- `essentialsautoblocker`: `js/app/offlineJobs.js`
- `established`: `js/domain/calendar.js`
- `estimate`: `js/app/tickers.js`
- `estimated`: `js/domain/qada.js`
- `etymology`: `js/domain/lexicalProvenance.js`
- `even`: `js/domain/search.js`
- `evening`: `js/domain/adhkarTiming.js`, `js/services/checklist.js`, `js/views/checklist.js`
- `event`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/app.js`, `js/domain/calendar.js`
- `events`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/app.js`, `js/domain/compass.js`
- `ever`: `js/core/migration.js`, `js/core/router.js`, `js/domain/hadithSearch.js`
- `everything`: `js/app/handlers/content.js`, `js/core/storage.js`, `js/domain/contentLens.js`, `js/domain/duaJournal.js`, `js/domain/install.js`, `js/domain/onboarding.js`, `js/domain/ramadan.js`, `js/domain/search.js`, `js/views/journal.js`, `js/views/palette.js`, `js/views/prayer.js`
- `everywhere`: `js/ui/card.js`
- `ewmaupdate`: `js/services/surahPlayback.js`
- `exact`: `js/domain/rootAwareSearch.js`, `js/services/editor.js`, `js/views/studyContext.js`
- `exactly`: `js/app/installPrompt.js`, `js/domain/install.js`, `js/domain/locations.js`
- `example`: `js/domain/tajweedLessons.js`
- `except`: `js/core/utils.js`
- `existing`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/domain/ramadanPlanner.js`, `js/domain/reminderPresets.js`, `js/views/mood.js`, `js/views/quiz.js`
- `exists`: `js/domain/sessionFlags.js`, `js/domain/worship.js`
- `expandquerywithroots`: `js/domain/rootAwareSearch.js`
- `expandwindow`: `js/domain/readerWindow.js`
- `expansion`: `js/domain/rootAwareSearch.js`
- `expect`: `js/services/shareCard.js`
- `expiresleepfortests`: `js/services/surahPlayback.js`
- `explicit`: `js/domain/searchPagination.js`, `js/services/recitation.js`, `js/views/mushafBookmarks.js`, `js/views/mushafJump.js`
- `explicitly`: `js/core/utils.js`, `js/domain/grades.js`
- `export`: `js/app/handlers/grammar.js`, `js/domain/duaJournal.js`, `js/domain/prayerExport.js`, `js/services/backup.js`, `js/views/journal.js`
- `exportable`: `js/domain/planExport.js`, `js/views/certificate.js`
- `exported`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/services/backup.js`
- `exports`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/core/state.js`, `js/domain/planExport.js`
- `extracted`: `js/app/net.js`, `js/views/ayahStudy.js`, `js/views/hadithCard.js`, `js/views/khatma.js`, `js/views/mushafBookmarks.js`, `js/views/mushafJump.js`, `js/views/mushafPlayer.js`
- `fabricate`: `js/domain/lexicalProvenance.js`
- `facade`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/core/state.js`
- `faces`: `js/views/hadith.js`
- `factors`: `js/domain/prayer.js`
- `fade`: `js/domain/sleepTimer.js`
- `fail`: `js/core/utils.js`
- `failedlibraryids`: `js/app/net.js`
- `fajr`: `js/views/ramadan.js`
- `fall`: `js/services/speech.js`
- `families`: `js/domain/tajweed.js`
- `family`: `js/app/fileImports.js`, `js/core/config/quran.js`, `js/domain/planExport.js`, `js/domain/roots.js`, `js/domain/tajweed.js`, `js/views/mushafReader.js`, `js/views/roots.js`, `js/views/tajweedSettings.js`
- `fans`: `js/core/state/reducer.js`
- `fard`: `js/domain/qada.js`, `js/domain/sunnah.js`
- `fastedtoday`: `js/domain/worship.js`
- `fasting`: `js/core/state/slices/worship.js`, `js/domain/fasting.js`, `js/domain/ramadan.js`, `js/views/ramadan.js`
- `fastingcategoriesfordate`: `js/domain/fasting.js`
- `fastphase`: `js/domain/ramadan.js`
- `fasttrackerdays`: `js/domain/ramadan.js`
- `favo`: `js/views/mood.js`
- `favorite`: `js/views/favorites.js`
- `favorites`: `js/core/state/slices/library.js`, `js/ui/card.js`, `js/views/collection.js`, `js/views/favorites.js`
- `favoritesortfor`: `js/views/favorites.js`
- `feature`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/core/state/reducer.js`, `js/services/shareCard.js`
- `features`: `js/views/tafsirPanel.js`
- `feed`: `js/domain/reflections.js`
- `feedback`: `js/views/settings.js`
- `feeds`: `js/app/palette.js`
- `feeling`: `js/views/mood.js`
- `fetch`: `js/app/net.js`, `js/app/tafsirSearch.js`, `js/core/fetch.js`, `js/domain/tajweedSources.js`
- `fetchdataresponse`: `js/app/net.js`
- `fetched`: `js/views/quran.js`
- `fetching`: `js/domain/offline.js`, `js/views/tajweedCourseView.js`
- `fetchjson`: `js/app/net.js`, `js/app/offlineJobs.js`, `js/domain/offline.js`
- `fetchtranslationoverlay`: `js/app/quranData.js`
- `fetchwithtimeout`: `js/app/net.js`, `js/core/fetch.js`
- `field`: `js/domain/contentLens.js`, `js/domain/lexicalProvenance.js`, `js/views/viewSheets.js`
- `fields`: `js/core/migration.js`, `js/domain/contentLens.js`, `js/ui/card.js`
- `fieldtogglesfor`: `js/domain/contentLens.js`
- `fileconsole`: `js/views/mushafPlayer.js`
- `filepickersupported`: `js/services/backup.js`
- `files`: `js/app/tafsirSearch.js`, `js/domain/hadithStudy.js`, `js/services/audioCatalog.js`, `js/services/contentPrefs.js`, `js/services/mushaf.js`, `js/services/prayerSound.js`
- `filte`: `js/views/collection.js`
- `filter`: `js/domain/hadithSearch.js`, `js/services/hadith.js`, `js/views/hadith.js`, `js/views/mushafBookmarks.js`
- `filtered`: `js/services/soundDesign.js`
- `filterentries`: `js/domain/search.js`
- `filterhadiths`: `js/services/hadith.js`
- `filtering`: `js/views/collection.js`
- `filterlapsedpairs`: `js/domain/mutashabihat.js`
- `filterspansbyprefs`: `js/domain/tajweed.js`
- `find`: `js/domain/tajweedPractice.js`, `js/views/mushafPageFind.js`, `js/views/tajweedPracticeView.js`
- `findcategorybyid`: `js/services/contentPrefs.js`
- `findedition`: `js/domain/wordStudy.js`
- `finding`: `js/domain/qibla.js`
- `findmoshaf`: `js/services/audioCatalog.js`
- `finds`: `js/views/qibla.js`
- `findsession`: `js/domain/tajweedCourse.js`
- `findstage`: `js/domain/tajweedCourse.js`
- `findtouch`: `js/domain/gestures.js`
- `finished`: `js/domain/completedCards.js`, `js/domain/kids.js`
- `fire`: `js/services/notifications.js`
- `fired`: `js/services/alertTriggers.js`
- `fires`: `js/domain/install.js`
- `first`: `js/domain/onboarding.js`, `js/domain/tajweedCourse.js`, `js/views/onboardingPanel.js`
- `firstayahonpage`: `js/views/mushafPlayer.js`
- `firstpendingitem`: `js/domain/reflections.js`
- `firsttrackedkey`: `js/domain/review.js`
- `firstweakruleforayah`: `js/domain/tajweedPractice.js`
- `fitr`: `js/domain/zakat.js`, `js/views/zakat.js`
- `five`: `js/app/practice.js`, `js/domain/prayerLog.js`, `js/domain/sunnah.js`, `js/services/checklist.js`, `js/views/checklist.js`
- `flags`: `js/app/installPrompt.js`, `js/core/theme.js`, `js/domain/sessionFlags.js`
- `flash`: `js/domain/celebrate.js`
- `flashcard`: `js/app/handlers/grammar.js`
- `flashcards`: `js/domain/grammarDrill.js`
- `flat`: `js/views/favorites.js`
- `flight`: `js/app/quranData.js`
- `flip`: `js/services/soundDesign.js`, `js/ui/readingTokens.js`
- `floating`: `js/services/floatingCounter.js`
- `floatingcounterhtml`: `js/services/floatingCounter.js`
- `flow`: `js/app/installPrompt.js`, `js/domain/completedCards.js`, `js/domain/install.js`, `js/views/qibla.js`
- `flows`: `js/app/stateSub.js`
- `flushreading`: `js/app/readingTimer.js`
- `focus`: `js/app/drawer.js`, `js/app/focusRuntime.js`, `js/domain/gestures.js`, `js/services/tasbih.js`, `js/ui/card.js`
- `focused`: `js/core/config.js`, `js/core/state/reducer.js`, `js/core/state.js`, `js/views/prayer.js`
- `focusenterclass`: `js/views/focus.js`
- `focussignature`: `js/app/renderer.js`
- `focusswipeturn`: `js/domain/gestures.js`
- `fold`: `js/domain/homeInvitations.js`, `js/domain/tafsirSearch.js`
- `folder`: `js/views/mushafBookmarks.js`
- `folders`: `js/core/state/slices/quran.js`, `js/views/mushafBookmarks.js`
- `foldroot`: `js/domain/roots.js`
- `foldtranslit`: `js/domain/rootAwareSearch.js`
- `follow`: `js/domain/ramadanPlanner.js`, `js/services/gapTelemetry.js`, `js/services/surahPlayback.js`
- `font`: `js/app/inputs.js`, `js/core/config/views.js`, `js/core/theme.js`
- `fonts`: `js/core/config/views.js`
- `forever`: `js/core/fetch.js`, `js/core/idb/openDB.js`
- `forgiveness`: `js/domain/moods.js`
- `form`: `js/domain/grammarDrill.js`, `js/domain/wordStudy.js`, `js/ui/calendarModals.js`, `js/ui/modal.js`
- `formatamount`: `js/domain/zakat.js`
- `formatarabiccommentary`: `js/views/tafsirPanel.js`
- `formatbytes`: `js/core/utils.js`, `js/services/audioStore.js`, `js/services/dataHealth.js`
- `formatclock`: `js/domain/prayer.js`
- `formatcountdown`: `js/domain/ramadan.js`
- `formatenglishcommentary`: `js/views/tafsirPanel.js`
- `formatreadingminutes`: `js/views/statistics.js`
- `formatting`: `js/domain/wordStudy.js`
- `former`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`
- `formhandlers`: `js/app/forms.js`
- `forms`: `js/domain/rootAwareSearch.js`, `js/views/roots.js`
- `forward`: `js/core/router.js`
- `four`: `js/app/handlers/content.js`, `js/domain/contentLens.js`, `js/domain/fasting.js`, `js/views/ambient.js`
- `fragments`: `js/ui/missingData.js`
- `frame`: `js/app/compassRuntime.js`
- `framing`: `js/domain/milestones.js`, `js/domain/nudge.js`, `js/domain/review.js`, `js/services/dataHealth.js`
- `free`: `js/core/router.js`, `js/core/utils.js`, `js/domain/fasting.js`, `js/domain/hifz.js`, `js/domain/nudge.js`, `js/domain/planExport.js`, `js/domain/reflections.js`, `js/services/dataHealth.js`, `js/services/hadith.js`, `js/views/ambient.js`, `js/views/focus.js`
- `freezikr`: `js/views/mushafReader.js`
- `fresh`: `js/domain/nudge.js`, `js/views/tajweedPracticeView.js`
- `freshsessioncounters`: `js/core/state/restore.js`
- `friday`: `js/domain/homeInvitations.js`, `js/domain/reminderPresets.js`, `js/views/journal.js`
- `fridayanchor`: `js/domain/reminderPresets.js`
- `fridayof`: `js/domain/homeInvitations.js`
- `front`: `js/services/floatingCounter.js`, `js/views/hadith.js`
- `fsplaybuttonhtml`: `js/views/mushafPlayer.js`
- `fsrecitationstate`: `js/views/mushafReader.js`
- `full`: `js/app/audioEngine.js`, `js/app/fullscreen.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/domain/audioQueue.js`, `js/domain/contentLens.js`, `js/domain/khatma.js`, `js/domain/prayerTimeline.js`, `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`, `js/services/audioCatalog.js`, `js/services/dhikrAudio.js`, `js/services/player.js`, `js/views/ambient.js`, `js/views/focus.js`, `js/views/playerBar.js`
- `fullscreen`: `js/app/autoFit.js`, `js/app/fullscreen.js`, `js/ui/recitationConsole.js`, `js/views/mushafPlayer.js`
- `fullsurahmetadata`: `js/services/mediaSession.js`
- `fully`: `js/domain/prayer.js`, `js/services/appBadge.js`, `js/services/mediaSession.js`
- `functions`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/core/schema.js`, `js/core/utils.js`
- `garden`: `js/domain/garden.js`, `js/views/garden.js`
- `gardenachievements`: `js/domain/garden.js`
- `gardenstate`: `js/domain/garden.js`
- `generalized`: `js/app/quizDeck.js`, `js/domain/celebrate.js`, `js/ui/viewSheet.js`
- `generateayahcardblob`: `js/services/shareCard.js`
- `generatecardblob`: `js/services/shareCard.js`
- `generated`: `js/domain/wmm-coefs.js`
- `generic`: `js/ui/menus.js`
- `genericsourcestate`: `js/domain/lexicalProvenance.js`
- `gentle`: `js/domain/nudge.js`, `js/views/checklist.js`
- `genuinely`: `js/views/calendar.js`
- `geodetic`: `js/domain/wmm.js`
- `geometry`: `js/domain/qibla.js`
- `gesture`: `js/domain/gestures.js`
- `getadhanaudio`: `js/services/audioStore.js`
- `getaudio`: `js/services/audioStore.js`
- `getaudiocontext`: `js/services/audioContext.js`
- `getcounter`: `js/services/tasbih.js`
- `getcustomlibrary`: `js/services/editor.js`
- `getitementry`: `js/app/shared.js`
- `getmodalgeneration`: `js/ui/modal.js`
- `gets`: `js/ui/emptyState.js`, `js/views/mushafJump.js`
- `getverseaudio`: `js/services/audioStore.js`
- `getword`: `js/domain/wordStudy.js`
- `given`: `js/domain/worship.js`, `js/services/calendarNotes.js`, `js/ui/card.js`
- `glance`: `js/domain/prayerTimeline.js`, `js/views/checklist.js`
- `global`: `js/core/config/app.js`, `js/services/mushaf.js`, `js/views/mushafPageFind.js`, `js/views/search.js`
- `globalayahnumber`: `js/services/mushaf.js`
- `gloss`: `js/domain/grammarDrill.js`
- `goal`: `js/core/state/streak.js`
- `goalprogress`: `js/domain/statistics.js`
- `goes`: `js/app/offlineJobs.js`, `js/core/fetch.js`
- `gold`: `js/domain/zakat.js`, `js/views/mushafReader.js`, `js/views/zakat.js`
- `gone`: `js/domain/sessionFlags.js`
- `good`: `js/domain/celebrate.js`
- `google`: `js/domain/prayerExport.js`
- `grade`: `js/core/config/views.js`, `js/domain/grades.js`, `js/domain/hadithStudy.js`
- `gradechiphtml`: `js/domain/grades.js`
- `graded`: `js/domain/hadithStudy.js`
- `grades`: `js/core/config/views.js`, `js/domain/grades.js`, `js/domain/hifz.js`, `js/services/hadith.js`, `js/ui/missingData.js`
- `gradestateof`: `js/domain/grades.js`
- `gradestep`: `js/domain/hifz.js`
- `gradient`: `js/domain/tajweedCourse.js`
- `grammar`: `js/app/handlers/grammar.js`, `js/domain/grammarDrill.js`, `js/domain/wordStudy.js`, `js/views/tafsirPanel.js`
- `grammardrill`: `js/app/handlers/grammar.js`
- `grams`: `js/domain/zakat.js`
- `great`: `js/domain/qibla.js`
- `green`: `js/views/mushafReader.js`
- `gregorian`: `js/domain/calendar.js`, `js/views/calendar.js`
- `grid`: `js/views/calendar.js`, `js/views/hadith.js`
- `ground`: `js/domain/ambient.js`
- `group`: `js/domain/offline.js`, `js/domain/roots.js`, `js/views/offline.js`
- `grouped`: `js/ui/viewSheet.js`, `js/views/roots.js`
- `groups`: `js/app/offlineJobs.js`, `js/core/config/nav.js`, `js/domain/offline.js`, `js/ui/shell.js`, `js/views/settings.js`
- `growth`: `js/domain/garden.js`, `js/views/garden.js`
- `guarantees`: `js/core/idb/openDB.js`
- `guard`: `js/app/stateSub.js`, `js/domain/gestures.js`
- `guarded`: `js/services/appBadge.js`, `js/services/mediaSession.js`
- `guide`: `js/domain/hadithStudy.js`
- `guided`: `js/domain/tajweedLessons.js`
- `guilt`: `js/domain/milestones.js`, `js/domain/nudge.js`
- `habit`: `js/domain/nudge.js`, `js/domain/prayerLog.js`, `js/services/checklist.js`
- `hadith`: `js/core/config/quran.js`, `js/core/config/views.js`, `js/core/state/slices/hadith.js`, `js/core/state/slices/library.js`, `js/domain/hadithSearch.js`, `js/domain/hadithStudy.js`, `js/services/hadith.js`, `js/ui/skeleton.js`, `js/views/hadithCard.js`, `js/views/palette.js`
- `hadithcardhtml`: `js/views/hadithCard.js`
- `hadithindexstats`: `js/domain/hadithSearch.js`
- `hadithnarrator`: `js/domain/hadithStudy.js`
- `hadithnarratorfromar`: `js/domain/hadithStudy.js`
- `hadithnarratorfromen`: `js/domain/hadithStudy.js`
- `hadithurls`: `js/domain/offline.js`
- `half`: `js/app/palette.js`, `js/domain/quiz.js`
- `halves`: `js/domain/hifz.js`
- `hamburger`: `js/ui/shell.js`
- `hand`: `js/app/boot.js`, `js/core/icons.js`, `js/domain/mutashabihat.js`, `js/views/mutashabihat.js`
- `handful`: `js/app/handlers/viewMenus.js`, `js/services/prayerSound.js`
- `handleadhanimport`: `js/app/fileImports.js`
- `handlecompassheading`: `js/app/compassRuntime.js`
- `handledayfiredstorageevent`: `js/services/notifications.js`
- `handlefocuskeydown`: `js/app/focusRuntime.js`
- `handleimportfile`: `js/app/fileImports.js`
- `handleimportplanfile`: `js/app/fileImports.js`
- `handlepromptform`: `js/app/forms.js`
- `handlermaps`: `js/app/events.js`
- `handlers`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/offline.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/domain/launchIntents.js`, `js/views/viewSheets.js`
- `handlezakatinput`: `js/app/inputs.js`
- `handoff`: `js/core/fetch.js`
- `hands`: `js/views/journal.js`
- `hang`: `js/core/fetch.js`
- `happen`: `js/domain/statistics.js`
- `happened`: `js/domain/celebrate.js`
- `happens`: `js/views/editor.js`
- `haram`: `js/domain/qibla.js`
- `hard`: `js/domain/sleepTimer.js`
- `hardcoded`: `js/domain/quickTiles.js`
- `hardened`: `js/core/idb/openDB.js`
- `hasanylastposition`: `js/domain/lastPosition.js`
- `hasended`: `js/services/recitation.js`
- `hash`: `js/core/router.js`
- `haspendingscholarlyreview`: `js/domain/contentLens.js`, `js/domain/localeContent.js`
- `haspreset`: `js/domain/reminderPresets.js`
- `hasresumablework`: `js/domain/audioBatch.js`
- `hasverifieddhikraudio`: `js/core/schema.js`
- `hawl`: `js/domain/zakat.js`
- `hawlduefor`: `js/domain/zakat.js`
- `haystackbuildsfortests`: `js/services/hadith.js`
- `header`: `js/app/events.js`, `js/app/forms.js`, `js/app/handlers/quran.js`, `js/app/lazyData.js`, `js/app/recitationFollow.js`, `js/ui/viewSheet.js`, `js/views/category.js`, `js/views/collection.js`, `js/views/collections.js`, `js/views/home.js`, `js/views/settings.js`, `js/views/statistics.js`, `js/views/tasbih.js`
- `heading`: `js/domain/compass.js`, `js/services/moshafAvailability.js`
- `headless`: `js/services/gapTelemetry.js`
- `headset`: `js/services/mediaSession.js`
- `health`: `js/core/state/slices/shell.js`, `js/services/dataHealth.js`
- `held`: `js/views/mushafBookmarks.js`
- `helper`: `js/core/utils.js`
- `helpers`: `js/core/config/quran.js`, `js/domain/adhkarTiming.js`, `js/domain/homePanels.js`, `js/domain/kids.js`, `js/domain/localeContent.js`, `js/domain/prayerLog.js`, `js/domain/quiz.js`, `js/domain/ramadanPlanner.js`, `js/domain/reflections.js`, `js/domain/statistics.js`, `js/domain/tajweedPractice.js`, `js/domain/translationCompare.js`, `js/domain/wordStudy.js`, `js/services/checklist.js`, `js/services/contentPrefs.js`, `js/services/dataHealth.js`, `js/services/hadith.js`, `js/services/mushaf.js`
- `here`: `js/app/fullscreen.js`, `js/app/quizDeck.js`, `js/app/stateSub.js`, `js/core/config.js`, `js/core/schema.js`, `js/domain/compass.js`, `js/domain/ramadan.js`, `js/services/tasbih.js`, `js/ui/emptyState.js`, `js/views/mutashabihat.js`
- `hero`: `js/views/prayer.js`
- `hiddencategoryitems`: `js/services/contentPrefs.js`
- `hiddenhome`: `js/domain/homePanels.js`
- `hide`: `js/services/contentPrefs.js`, `js/views/category.js`
- `hides`: `js/views/collection.js`
- `hifz`: `js/core/state/slices/quran.js`, `js/domain/hifz.js`, `js/domain/mutashabihat.js`, `js/views/ayahStudy.js`, `js/views/mutashabihat.js`
- `hifzheatmaphtml`: `js/views/quran.js`
- `hifzreviewcardhtml`: `js/views/home.js`
- `hifztoolbarhtml`: `js/views/quran.js`
- `highlight`: `js/domain/homePanels.js`
- `highlightmatch`: `js/core/utils.js`
- `hijri`: `js/domain/calendar.js`, `js/domain/fasting.js`, `js/domain/homeInvitations.js`, `js/ui/calendarModals.js`, `js/views/calendar.js`
- `hijriinvitestate`: `js/domain/homeInvitations.js`
- `hijrimo`: `js/domain/ramadanPlanner.js`
- `hijriyear`: `js/domain/ramadanPlanner.js`
- `hint`: `js/ui/emptyState.js`
- `history`: `js/core/state/slices/shell.js`, `js/views/favorites.js`, `js/views/khatma.js`
- `hizbstartpage`: `js/services/mushaf.js`
- `holding`: `js/services/audioStore.js`
- `holds`: `js/core/router.js`
- `home`: `js/app/net.js`, `js/core/i18n.js`, `js/domain/adhkarTiming.js`, `js/domain/dailyAyah.js`, `js/domain/homeInvitations.js`, `js/domain/homePanels.js`, `js/domain/locations.js`, `js/domain/onboarding.js`, `js/domain/quickTiles.js`, `js/domain/reflections.js`, `js/ui/readingTokens.js`, `js/views/hadithCard.js`, `js/views/kids.js`, `js/views/library.js`, `js/views/onboardingPanel.js`
- `homeinviteshtml`: `js/views/home.js`
- `homeorder`: `js/domain/homePanels.js`
- `hometick`: `js/app/tickers.js`
- `hometodaystriphtml`: `js/views/home.js`
- `honest`: `js/core/state/streak.js`, `js/domain/grades.js`, `js/domain/lastPosition.js`, `js/domain/worship.js`, `js/ui/missingData.js`, `js/views/installRow.js`
- `honestly`: `js/domain/review.js`
- `hopes`: `js/services/dataHealth.js`
- `horizon`: `js/domain/fasting.js`
- `host`: `js/services/moshafAvailability.js`, `js/ui/modal.js`
- `hosted`: `js/ui/menus.js`, `js/ui/viewSheet.js`
- `hours`: `js/domain/prayer.js`, `js/domain/prayerExport.js`, `js/domain/prayerTimeline.js`
- `hourstoclock`: `js/domain/prayer.js`
- `household`: `js/domain/zakat.js`, `js/views/zakat.js`
- `html`: `js/core/theme.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/ui/toast.js`
- `husna`: `js/views/quiz.js`
- `hydrate`: `js/app/boot.js`, `js/services/gapTelemetry.js`
- `i18n`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/i18n.js`, `js/domain/localeContent.js`
- `icon`: `js/core/config/app.js`, `js/core/icons.js`, `js/services/appBadge.js`, `js/ui/emptyState.js`, `js/ui/viewSheet.js`, `js/views/settings.js`
- `icons`: `js/core/icons.js`, `js/views/onboardingPanel.js`, `js/views/prayer.js`, `js/views/viewSheets.js`
- `icsescape`: `js/domain/prayerExport.js`
- `icslocal`: `js/domain/prayerExport.js`
- `identity`: `js/core/config/app.js`
- `idle`: `js/app/audioEngine.js`
- `iftar`: `js/domain/ramadan.js`, `js/domain/ramadanPlanner.js`, `js/views/ramadan.js`
- `image`: `js/services/shareCard.js`
- `immersive`: `js/ui/recitationConsole.js`
- `immutable`: `js/domain/contentLens.js`, `js/services/contentPrefs.js`
- `import`: `js/core/config/app.js`, `js/core/config/sanitize.js`, `js/core/config.js`, `js/core/i18n.js`, `js/domain/prayerExport.js`, `js/domain/sessionFlags.js`, `js/services/backup.js`, `js/views/backupSummary.js`, `js/views/collection.js`
- `imported`: `js/app/net.js`
- `importing`: `js/views/hadithCard.js`
- `imports`: `js/app/fileImports.js`, `js/core/utils.js`, `js/domain/khatma.js`
- `inclusivedays`: `js/domain/khatma.js`
- `increment`: `js/services/tasbih.js`
- `index`: `js/app/hadithData.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/core/state/slices/hadith.js`, `js/domain/rootAwareSearch.js`, `js/domain/search.js`, `js/domain/tajweed.js`, `js/ui/modal.js`, `js/ui/toast.js`, `js/views/search.js`
- `indexeddb`: `js/app/audioEngine.js`, `js/core/idb/openDB.js`, `js/services/audioStore.js`, `js/services/player.js`
- `indexes`: `js/domain/hadithSearch.js`
- `indicator`: `js/domain/prayerTimeline.js`
- `inducing`: `js/domain/nudge.js`
- `inflate`: `js/domain/sunnah.js`
- `infra`: `js/domain/reminderPresets.js`, `js/services/dhikrAudio.js`
- `initfullscreensync`: `js/app/fullscreen.js`
- `initialreaderwindow`: `js/domain/readerWindow.js`
- `initialstate`: `js/core/state/initial.js`, `js/core/state.js`
- `initialtimerstate`: `js/domain/sleepTimer.js`
- `initrouter`: `js/core/router.js`
- `inline`: `js/core/icons.js`, `js/views/studyTray.js`
- `input`: `js/app/palette.js`, `js/app/renderer.js`
- `inputhandlers`: `js/app/handlers/audio.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quran.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/zakat.js`
- `inputregistry`: `js/app/events.js`
- `inputs`: `js/app/inputs.js`
- `insensitive`: `js/domain/quranSearch.js`, `js/views/search.js`
- `inside`: `js/app/rt.js`
- `install`: `js/app/installPrompt.js`, `js/domain/install.js`, `js/views/installRow.js`
- `installable`: `js/services/appBadge.js`
- `installmediahandlers`: `js/services/mediaSession.js`
- `installrow`: `js/views/backupSummary.js`
- `installrowhtml`: `js/views/installRow.js`
- `installstepskey`: `js/domain/install.js`
- `instant`: `js/domain/onboarding.js`, `js/views/onboardingPanel.js`
- `intensitybucket`: `js/domain/statistics.js`
- `intent`: `js/domain/launchIntents.js`, `js/views/settings.js`
- `intentionally`: `js/app.js`
- `interaction`: `js/domain/celebrate.js`, `js/ui/viewSheet.js`
- `interactive`: `js/views/tajweedPracticeView.js`
- `internal`: `js/ui/shell.js`
- `international`: `js/domain/quranSearch.js`, `js/views/quran.js`, `js/views/search.js`
- `interval`: `js/domain/reminderPresets.js`, `js/services/alertTriggers.js`
- `intervals`: `js/domain/hifz.js`
- `invalidatelazyfetches`: `js/app/lazyData.js`
- `invented`: `js/domain/tajweedLessons.js`
- `inventory`: `js/domain/offline.js`
- `invitation`: `js/domain/homeInvitations.js`
- `invitations`: `js/domain/homeInvitations.js`, `js/views/library.js`
- `invite`: `js/domain/homeInvitations.js`
- `invitedaykey`: `js/domain/homeInvitations.js`
- `isactive`: `js/services/surahPlayback.js`
- `isautoadvancependingfor`: `js/app/focusRuntime.js`
- `isbackupfile`: `js/domain/launchIntents.js`
- `isbulkaborterror`: `js/app/net.js`
- `iscategoryhidden`: `js/services/contentPrefs.js`
- `iscompletedtoday`: `js/domain/reflections.js`
- `isdaycomplete`: `js/services/checklist.js`
- `isdismissed`: `js/domain/completedCards.js`
- `isdrivable`: `js/domain/tajweedCourse.js`
- `isenabled`: `js/services/gapTelemetry.js`
- `isenglishedition`: `js/views/tafsirPanel.js`
- `isfirstpage`: `js/services/mushaf.js`
- `isfridayinviteday`: `js/domain/homeInvitations.js`
- `isfunctiontoken`: `js/domain/lexicalProvenance.js`
- `isfuturepayload`: `js/core/state/restore.js`
- `ishadithindexallconfirmed`: `js/app/hadithData.js`
- `isinvitedismissed`: `js/domain/homeInvitations.js`
- `iskidsallowedview`: `js/core/config/views.js`
- `islamic`: `js/domain/calendar.js`
- `islamiceventsforyear`: `js/domain/calendar.js`
- `islastpage`: `js/services/mushaf.js`
- `islasttennights`: `js/domain/ramadanPlanner.js`
- `ismissingresourceerror`: `js/app/net.js`
- `ismodalopen`: `js/ui/modal.js`
- `ismuted`: `js/services/player.js`, `js/services/recitation.js`
- `isnad`: `js/domain/hadithStudy.js`
- `isolation`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`
- `isopen`: `js/services/floatingCounter.js`
- `isoweekkey`: `js/domain/duaJournal.js`
- `isplanfile`: `js/domain/planExport.js`
- `isplayerdismissswipe`: `js/domain/gestures.js`
- `isplaying`: `js/services/recitation.js`
- `isplayingdhikraudioitem`: `js/services/dhikrAudio.js`
- `isquietnow`: `js/services/prayerSound.js`
- `isquizitemid`: `js/domain/quiz.js`
- `isquransearchready`: `js/domain/quranSearch.js`
- `isreadingview`: `js/app/readingTimer.js`
- `isreturninguser`: `js/domain/onboarding.js`
- `isrtl`: `js/core/i18n.js`
- `issafekey`: `js/core/utils.js`
- `issajdaayah`: `js/services/mushaf.js`
- `isspeaking`: `js/services/speech.js`
- `isspeakingitem`: `js/services/speech.js`
- `isstreakday`: `js/core/state/streak.js`
- `isstudytrayopen`: `js/views/studyTray.js`
- `issues`: `js/services/dhikrAudio.js`
- `issupported`: `js/domain/compass.js`, `js/services/floatingCounter.js`, `js/services/speech.js`
- `issurahmissing`: `js/services/moshafAvailability.js`
- `isswipeguardtarget`: `js/domain/gestures.js`
- `istafsirloaded`: `js/domain/wordStudy.js`
- `istafsirsearchable`: `js/domain/tafsirSearch.js`
- `istafsirsearchready`: `js/domain/tafsirSearch.js`
- `istajweedruleid`: `js/domain/tajweedPractice.js`
- `istimeouterror`: `js/app/net.js`
- `isunlocked`: `js/domain/tajweedCourse.js`
- `isvalidcitation`: `js/domain/lexicalProvenance.js`
- `iswhiteday`: `js/domain/calendar.js`
- `item`: `js/domain/audioQueue.js`, `js/domain/contentLens.js`, `js/domain/homeInvitations.js`, `js/domain/kids.js`, `js/domain/lastPosition.js`, `js/domain/launchIntents.js`, `js/domain/quiz.js`, `js/domain/rootAwareSearch.js`, `js/domain/roots.js`, `js/services/soundDesign.js`, `js/services/surahPlayback.js`, `js/ui/card.js`, `js/ui/missingData.js`, `js/views/backupSummary.js`, `js/views/collection.js`, `js/views/editor.js`, `js/views/focus.js`, `js/views/kids.js`, `js/views/studyTray.js`
- `itemclipboardtext`: `js/app/shared.js`
- `itemindex`: `js/domain/search.js`
- `itemiscustomized`: `js/domain/contentLens.js`
- `items`: `js/core/config/app.js`, `js/core/i18n.js`, `js/domain/ramadanPlanner.js`, `js/domain/search.js`, `js/domain/sunnah.js`, `js/views/editor.js`
- `itemsformood`: `js/domain/moods.js`
- `itemtargetof`: `js/services/contentPrefs.js`
- `itikafcount`: `js/domain/ramadanPlanner.js`
- `itself`: `js/app/stateSub.js`, `js/domain/ambient.js`, `js/domain/dailyAyah.js`, `js/domain/tajweedLessons.js`, `js/views/editor.js`
- `jointranslitline`: `js/views/quran.js`
- `journal`: `js/app/handlers/journal.js`, `js/core/state/slices/worship.js`, `js/domain/duaJournal.js`, `js/domain/planExport.js`, `js/views/journal.js`
- `journalexporttext`: `js/domain/duaJournal.js`
- `journalmonthfooter`: `js/views/journal.js`
- `json`: `js/app/fileImports.js`, `js/domain/planExport.js`, `js/domain/roots.js`, `js/domain/tajweedSources.js`, `js/services/audioCatalog.js`, `js/services/backup.js`, `js/views/quiz.js`
- `julian`: `js/domain/calendar.js`
- `july`: `js/domain/calendar.js`
- `jump`: `js/views/mushafJump.js`, `js/views/search.js`
- `jumu`: `js/domain/reminderPresets.js`
- `jumuah`: `js/domain/reminderPresets.js`
- `jumuahnote`: `js/domain/reminderPresets.js`
- `justcompletedjuz`: `js/domain/khatma.js`
- `justcompletedkhatma`: `js/domain/khatma.js`
- `juzeighth`: `js/services/mushaf.js`
- `juzmilestonerow`: `js/views/khatma.js`
- `juzpageranges`: `js/domain/milestones.js`, `js/services/mushaf.js`
- `juzprogress`: `js/domain/khatma.js`
- `juzreadstates`: `js/services/mushaf.js`
- `juzstartpage`: `js/services/mushaf.js`
- `kaaba`: `js/domain/qibla.js`, `js/views/qibla.js`
- `kahf`: `js/domain/homeInvitations.js`, `js/domain/reminderPresets.js`
- `keep`: `js/services/floatingCounter.js`, `js/views/about.js`, `js/views/studyContext.js`
- `kept`: `js/domain/adhkarTiming.js`, `js/domain/qibla.js`, `js/domain/readerWindow.js`, `js/domain/review.js`
- `keptfastcount`: `js/domain/ramadan.js`
- `kernel`: `js/core/fetch.js`
- `keyboard`: `js/app/focusRuntime.js`, `js/domain/playerShortcuts.js`
- `keyed`: `js/core/icons.js`, `js/services/editor.js`
- `keys`: `js/app/renderer.js`, `js/core/config/app.js`, `js/core/config/nav.js`, `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/state/initial.js`, `js/core/state.js`, `js/domain/contentLens.js`, `js/domain/prayerLog.js`, `js/domain/ramadanPlanner.js`, `js/domain/searchPagination.js`
- `keytodate`: `js/domain/review.js`
- `keywords`: `js/domain/dailyAyah.js`
- `khatma`: `js/domain/khatma.js`, `js/domain/planExport.js`, `js/views/khatma.js`
- `khatmpanel`: `js/views/ramadan.js`
- `kids`: `js/core/config/views.js`, `js/domain/kids.js`, `js/views/kids.js`
- `kidsquizround`: `js/domain/kids.js`
- `kidsreroutehash`: `js/app/stateSub.js`
- `kind`: `js/domain/planExport.js`, `js/services/audioStore.js`
- `kinds`: `js/ui/missingData.js`
- `kiosk`: `js/views/ambient.js`
- `label`: `js/core/config/nav.js`
- `labels`: `js/core/config/views.js`, `js/core/i18n.js`, `js/domain/calendar.js`
- `lack`: `js/services/moshafAvailability.js`, `js/services/speech.js`
- `lamp`: `js/domain/ambient.js`
- `lampautoadvancedefault`: `js/domain/ambient.js`
- `lampisbluedominant`: `js/domain/ambient.js`
- `lampluminance`: `js/domain/ambient.js`
- `lamppaletteholdscap`: `js/domain/ambient.js`
- `lampshouldautoadvance`: `js/domain/ambient.js`
- `language`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/i18n.js`, `js/core/theme.js`, `js/domain/localeContent.js`, `js/domain/onboarding.js`, `js/ui/viewSheet.js`, `js/views/mushafReader.js`, `js/views/onboardingPanel.js`
- `languagelabel`: `js/core/i18n.js`
- `languagetogglehtml`: `js/ui/shell.js`
- `lapsedayahkeys`: `js/domain/mutashabihat.js`
- `last`: `js/domain/lastPosition.js`, `js/domain/quiz.js`, `js/domain/ramadanPlanner.js`, `js/domain/readerWindow.js`, `js/domain/sleepTimer.js`, `js/services/surahPlayback.js`
- `lastactivity`: `js/domain/nudge.js`
- `lastplayswapped`: `js/services/recitation.js`
- `latch`: `js/domain/readerWindow.js`
- `lateness`: `js/services/alertTriggers.js`
- `latitude`: `js/domain/locations.js`, `js/domain/prayer.js`, `js/views/qibla.js`
- `launch`: `js/domain/launchIntents.js`
- `layer`: `js/app/hadithData.js`, `js/app/net.js`, `js/app/palette.js`, `js/domain/sessionFlags.js`, `js/services/contentPrefs.js`
- `layla`: `js/views/ramadan.js`
- `layout`: `js/app/fullscreen.js`
- `lazily`: `js/services/audioCatalog.js`, `js/services/audioContext.js`, `js/ui/skeleton.js`, `js/views/quran.js`
- `lazy`: `js/app/hadithData.js`, `js/app/quranSearch.js`, `js/app/renderer.js`, `js/app/stateSub.js`, `js/app/tafsirSearch.js`, `js/services/hadith.js`, `js/views/tajweedCourseView.js`
- `lazydata`: `js/app/net.js`
- `leak`: `js/domain/tafsirSearch.js`
- `lean`: `js/views/mushafPlayer.js`
- `learned`: `js/services/moshafAvailability.js`
- `learner`: `js/views/studyContext.js`
- `leave`: `js/domain/completedCards.js`
- `left`: `js/domain/gestures.js`
- `legacy`: `js/core/migration.js`, `js/domain/onboarding.js`, `js/domain/searchPagination.js`
- `legend`: `js/domain/tajweedSources.js`
- `length`: `js/core/config/app.js`
- `lens`: `js/app/handlers/content.js`, `js/domain/contentLens.js`
- `lenscategoryitems`: `js/domain/contentLens.js`
- `lensdocumentcategories`: `js/domain/contentLens.js`
- `lenslibrary`: `js/domain/contentLens.js`
- `lesson`: `js/domain/tajweedLessons.js`
- `lessons`: `js/domain/tajweedLessons.js`
- `level`: `js/app/handlers/content.js`, `js/core/config/nav.js`, `js/core/fetch.js`, `js/core/migration.js`, `js/domain/contentLens.js`
- `levels`: `js/domain/hifz.js`, `js/domain/kids.js`, `js/views/kids.js`
- `lexical`: `js/domain/lexicalProvenance.js`
- `lexicon`: `js/domain/lexicalProvenance.js`
- `liabilities`: `js/views/zakat.js`
- `libraries`: `js/app/boot.js`, `js/app/handlers/content.js`, `js/domain/contentLens.js`, `js/domain/dailyAyah.js`, `js/services/contentPrefs.js`, `js/services/editor.js`, `js/views/editor.js`
- `library`: `js/app/hadithData.js`, `js/app/handlers/offline.js`, `js/app/offlineJobs.js`, `js/app/quizDeck.js`, `js/core/config/app.js`, `js/core/state/slices/library.js`, `js/domain/moods.js`, `js/domain/offline.js`, `js/domain/rootAwareSearch.js`, `js/domain/search.js`, `js/services/editor.js`, `js/services/hadith.js`, `js/services/tasbih.js`, `js/ui/card.js`, `js/views/hadith.js`, `js/views/mood.js`, `js/views/offline.js`, `js/views/quiz.js`, `js/views/search.js`
- `libraryiscustomized`: `js/services/contentPrefs.js`
- `licensed`: `js/services/dhikrAudio.js`
- `lifecycle`: `js/app/compassRuntime.js`
- `lifecycles`: `js/app/stateSub.js`
- `lifetime`: `js/domain/garden.js`, `js/views/garden.js`
- `lift`: `js/domain/gestures.js`
- `lightweight`: `js/domain/hifz.js`, `js/domain/search.js`
- `like`: `js/domain/tajweedCourse.js`, `js/services/shareCard.js`, `js/views/backupSummary.js`
- `line`: `js/app/rt.js`, `js/core/icons.js`, `js/domain/nudge.js`, `js/views/collections.js`, `js/views/home.js`, `js/views/mushafJump.js`, `js/views/settings.js`, `js/views/statistics.js`, `js/views/tajweedSettings.js`, `js/views/tasbih.js`
- `lines`: `js/domain/hadithStudy.js`, `js/views/zakat.js`
- `linkable`: `js/views/favorites.js`
- `links`: `js/app/hadithData.js`, `js/core/router.js`
- `list`: `js/domain/kids.js`, `js/domain/lexicalProvenance.js`, `js/domain/reflections.js`, `js/domain/roots.js`, `js/views/favorites.js`, `js/views/mood.js`, `js/views/quran.js`
- `listcompletion`: `js/domain/reflections.js`
- `listen`: `js/domain/sleepTimer.js`, `js/services/speech.js`, `js/services/surahPlayback.js`
- `listening`: `js/domain/kids.js`
- `lists`: `js/core/config/app.js`, `js/domain/offline.js`, `js/ui/card.js`
- `listverseayahs`: `js/services/audioStore.js`
- `live`: `js/app/handlers/offline.js`, `js/app/inputs.js`, `js/app/palette.js`, `js/app/rt.js`, `js/app/tickers.js`, `js/core/config.js`, `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/reducer.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/domain/ambient.js`, `js/domain/compass.js`, `js/ui/readingTokens.js`, `js/ui/toast.js`, `js/views/ambient.js`, `js/views/ramadan.js`, `js/views/tajweedSettings.js`, `js/views/zakat.js`
- `livecollectioncount`: `js/views/collections.js`
- `lived`: `js/domain/locations.js`
- `liveinstallplatform`: `js/views/installRow.js`
- `lives`: `js/app/practice.js`, `js/app/quizDeck.js`, `js/app.js`, `js/domain/audioBatch.js`, `js/domain/qibla.js`, `js/services/editor.js`, `js/views/onboardingPanel.js`, `js/views/tajweedPracticeView.js`
- `liveua`: `js/views/installRow.js`
- `load`: `js/app/boot.js`, `js/domain/searchPagination.js`
- `loadallbatchqueues`: `js/services/audioStore.js`
- `loadbackuphandle`: `js/services/backup.js`
- `loadbatchqueue`: `js/services/audioStore.js`
- `loadcatalog`: `js/services/audioCatalog.js`
- `loaded`: `js/app/quizDeck.js`, `js/domain/hadithSearch.js`, `js/domain/search.js`, `js/services/audioCatalog.js`, `js/ui/skeleton.js`, `js/views/tajweedCourseView.js`
- `loaderror`: `js/ui/missingData.js`
- `loaderrorstatehtml`: `js/ui/emptyState.js`
- `loading`: `js/app/hadithData.js`, `js/app/quranData.js`, `js/services/hadith.js`
- `loadlibraries`: `js/app/net.js`
- `loadstate`: `js/core/storage.js`
- `loadsurahdoc`: `js/app/quranData.js`
- `local`: `js/services/appBadge.js`, `js/services/gapTelemetry.js`, `js/services/mediaSession.js`, `js/services/notifications.js`, `js/views/checklist.js`, `js/views/journal.js`, `js/views/mushafPageFind.js`
- `localdaykey`: `js/domain/duaJournal.js`
- `localized`: `js/core/i18n.js`
- `localstorage`: `js/core/storage.js`
- `location`: `js/core/state/slices/worship.js`, `js/domain/locations.js`, `js/domain/onboarding.js`, `js/views/onboardingPanel.js`, `js/views/qibla.js`
- `locationpermissionguidancehtml`: `js/app/forms.js`
- `lock`: `js/services/mediaSession.js`
- `logayahreview`: `js/domain/hifz.js`
- `logged`: `js/domain/qada.js`
- `loggedcount`: `js/domain/prayerLog.js`
- `logic`: `js/core/config.js`, `js/domain/audioBatch.js`, `js/domain/fasting.js`, `js/domain/install.js`, `js/domain/onboarding.js`, `js/domain/ramadan.js`, `js/domain/roots.js`, `js/services/calendarNotes.js`, `js/services/editor.js`, `js/services/tasbih.js`, `js/views/onboardingPanel.js`
- `logreview`: `js/domain/hifz.js`
- `logreviewkey`: `js/domain/hifz.js`
- `logs`: `js/domain/ramadanPlanner.js`
- `longestdaystreak`: `js/domain/review.js`
- `longitude`: `js/domain/prayer.js`, `js/views/qibla.js`
- `look`: `js/app/handlers/journal.js`, `js/domain/mutashabihat.js`, `js/views/mutashabihat.js`
- `lookahead`: `js/services/surahPlayback.js`
- `lookaheadfor`: `js/services/surahPlayback.js`
- `looks`: `js/views/mushafReader.js`
- `lookslikeaudio`: `js/services/audioStore.js`, `js/services/prayerSound.js`
- `lookups`: `js/app/shared.js`, `js/domain/ramadan.js`, `js/domain/wordStudy.js`
- `loop`: `js/services/surahPlayback.js`, `js/ui/recitationConsole.js`
- `luminance`: `js/domain/ambient.js`
- `machine`: `js/domain/sleepTimer.js`
- `madani`: `js/services/mushaf.js`, `js/views/mushafReader.js`
- `madd`: `js/domain/tajweedCourse.js`
- `made`: `js/views/garden.js`
- `maghrib`: `js/views/ramadan.js`
- `magic`: `js/app/fileImports.js`
- `magnetic`: `js/domain/compass.js`, `js/domain/wmm-coefs.js`, `js/domain/wmm.js`
- `make`: `js/domain/qada.js`
- `makeprofile`: `js/domain/locations.js`
- `makeqadaentry`: `js/domain/qada.js`
- `makereminder`: `js/services/notifications.js`
- `manage`: `js/services/contentPrefs.js`, `js/views/category.js`
- `management`: `js/app/drawer.js`, `js/views/category.js`
- `manager`: `js/core/state/slices/audio.js`, `js/views/mushafBookmarks.js`
- `mandatory`: `js/domain/zakat.js`
- `manual`: `js/views/qibla.js`
- `manuallocationformhtml`: `js/app/forms.js`
- `many`: `js/services/speech.js`
- `markapplied`: `js/services/gapTelemetry.js`
- `markayahmemorized`: `js/domain/hifz.js`
- `markcelebration`: `js/domain/celebrate.js`
- `markdayfired`: `js/services/notifications.js`
- `markdispatch`: `js/services/gapTelemetry.js`
- `marked`: `js/domain/hifz.js`
- `marking`: `js/app/tickers.js`
- `markmemorized`: `js/domain/hifz.js`
- `markmemorizedkey`: `js/domain/hifz.js`
- `marks`: `js/domain/tafsirSearch.js`
- `marksurahmissing`: `js/services/moshafAvailability.js`
- `masjid`: `js/domain/qibla.js`
- `mastery`: `js/domain/milestones.js`
- `matchchildren`: `js/app/renderer.js`
- `matchchildrendeep`: `js/app/renderer.js`
- `matched`: `js/domain/rootAwareSearch.js`
- `matches`: `js/domain/moods.js`
- `matchesaccentword`: `js/domain/tajweed.js`
- `matchestheme`: `js/domain/dailyAyah.js`
- `matchregistry`: `js/app/events.js`
- `matchsettingssection`: `js/views/settings.js`
- `materializewordstudy`: `js/domain/wordStudy.js`
- `math`: `js/core/state/streak.js`, `js/domain/ambient.js`, `js/domain/audioQueue.js`, `js/domain/khatma.js`, `js/domain/prayerTimeline.js`, `js/domain/reflections.js`, `js/views/mushafPlayer.js`
- `matn`: `js/domain/hadithStudy.js`, `js/domain/localeContent.js`
- `maybeautobackupnow`: `js/services/backup.js`
- `maybeautodownloadessentials`: `js/app/offlineJobs.js`
- `maybefollowrecitation`: `js/app/recitationFollow.js`
- `maybemarknudgeshown`: `js/app/tickers.js`
- `maybeprobestorage`: `js/app/tickers.js`
- `maybescrolltofocusayah`: `js/app/quranSearch.js`
- `maybescrolltofocushadith`: `js/app/hadithData.js`
- `maybestarthadithsearchbuild`: `js/app/hadithData.js`
- `maybestarthifzfromparam`: `js/app/quranSearch.js`
- `maybestartquransearchbuild`: `js/app/quranSearch.js`
- `maybestarttafsirsearchbuild`: `js/app/tafsirSearch.js`
- `maybesyncbatchresume`: `js/app/audioEngine.js`
- `maybesyncversestatus`: `js/app/audioEngine.js`
- `meaning`: `js/core/config/quran.js`
- `mecca`: `js/domain/qibla.js`
- `medallion`: `js/ui/emptyState.js`
- `media`: `js/services/mediaSession.js`, `js/views/certificate.js`
- `meet`: `js/domain/moods.js`
- `meets`: `js/core/state/streak.js`
- `member`: `js/domain/planExport.js`
- `memo`: `js/domain/tajweed.js`
- `memorization`: `js/app/handlers/journal.js`, `js/domain/hifz.js`, `js/views/certificate.js`
- `memorizationpanel`: `js/views/statistics.js`
- `memorized`: `js/domain/hifz.js`, `js/domain/milestones.js`
- `memorizing`: `js/views/quiz.js`
- `memory`: `js/domain/celebrate.js`, `js/domain/completedCards.js`, `js/domain/kids.js`, `js/domain/quiz.js`, `js/domain/search.js`
- `menu`: `js/app/handlers/viewMenus.js`, `js/core/config/nav.js`, `js/ui/modal.js`, `js/ui/viewSheet.js`, `js/views/viewSheets.js`
- `menus`: `js/app/handlers/viewMenus.js`, `js/ui/menus.js`
- `merged`: `js/app/handlers/grammar.js`, `js/domain/homeInvitations.js`, `js/domain/kids.js`, `js/domain/lastPosition.js`, `js/domain/rootAwareSearch.js`, `js/ui/missingData.js`, `js/views/backupSummary.js`, `js/views/kids.js`, `js/views/studyTray.js`
- `mergedclickhandlers`: `js/app/events.js`
- `mergequranhits`: `js/domain/rootAwareSearch.js`
- `merges`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `mergestudycontextparams`: `js/views/studyContext.js`
- `messages`: `js/ui/toast.js`
- `meta`: `js/core/config/quran.js`
- `metadata`: `js/services/mediaSession.js`
- `metal`: `js/views/zakat.js`
- `meter`: `js/views/offline.js`
- `methods`: `js/domain/prayer.js`
- `micro`: `js/domain/celebrate.js`
- `migrate`: `js/core/migration.js`
- `migratefocusautoadvancesetting`: `js/core/state/store.js`
- `milestone`: `js/views/certificate.js`
- `milestonebadges`: `js/domain/milestones.js`
- `milestonehit`: `js/domain/celebrate.js`
- `milestones`: `js/core/config/app.js`, `js/domain/statistics.js`, `js/views/certificate.js`
- `minicardhtml`: `js/ui/card.js`
- `minimal`: `js/core/router.js`
- `mirror`: `js/domain/tajweedSources.js`
- `mirroring`: `js/services/appBadge.js`, `js/ui/skeleton.js`
- `mirrors`: `js/app/tafsirSearch.js`, `js/views/mood.js`
- `miss`: `js/domain/quiz.js`, `js/domain/tajweedPractice.js`
- `missed`: `js/domain/qada.js`
- `misses`: `js/domain/quiz.js`
- `missing`: `js/ui/missingData.js`, `js/views/collection.js`
- `missingdatahtml`: `js/ui/missingData.js`
- `missingdatakeyfor`: `js/ui/missingData.js`
- `missingsurahs`: `js/services/moshafAvailability.js`
- `mistakes`: `js/domain/quiz.js`
- `mixing`: `js/domain/sunnah.js`
- `mobile`: `js/app/drawer.js`, `js/core/fetch.js`
- `modal`: `js/app/palette.js`, `js/ui/calendarModals.js`, `js/ui/menus.js`, `js/ui/modal.js`, `js/ui/viewSheet.js`, `js/views/ayahStudy.js`, `js/views/editor.js`, `js/views/tafsirPanel.js`
- `mode`: `js/app/focusRuntime.js`, `js/app/practice.js`, `js/core/theme.js`, `js/domain/kids.js`, `js/domain/playerShortcuts.js`, `js/domain/sleepTimer.js`, `js/domain/tajweedCourse.js`, `js/domain/tajweedPractice.js`, `js/services/surahPlayback.js`, `js/services/tasbih.js`, `js/ui/card.js`, `js/views/focus.js`, `js/views/kids.js`, `js/views/library.js`, `js/views/mutashabihat.js`, `js/views/prayer.js`, `js/views/tajweedPracticeView.js`
- `model`: `js/domain/duaJournal.js`, `js/domain/wmm-coefs.js`, `js/domain/wmm.js`, `js/ui/viewSheet.js`
- `modeled`: `js/views/mushafReader.js`
- `modern`: `js/domain/tafsirSearch.js`
- `modes`: `js/core/config/views.js`, `js/domain/ambient.js`, `js/domain/audioQueue.js`, `js/domain/tajweedCourse.js`, `js/domain/tajweedPractice.js`, `js/services/prayerSound.js`, `js/views/ambient.js`
- `modules`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/app/net.js`, `js/app/palette.js`, `js/app/shared.js`, `js/core/config.js`, `js/core/state/reducer.js`, `js/core/state.js`
- `moment`: `js/domain/adhkarTiming.js`
- `mondays`: `js/domain/fasting.js`
- `monolith`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`
- `month`: `js/domain/fasting.js`, `js/domain/ramadan.js`, `js/views/calendar.js`
- `monthentry`: `js/domain/ramadanPlanner.js`
- `monthly`: `js/ui/calendarModals.js`
- `monthtotal`: `js/domain/statistics.js`
- `monthwindow`: `js/domain/statistics.js`
- `mood`: `js/domain/grammarDrill.js`, `js/domain/moods.js`, `js/domain/wordStudy.js`, `js/views/library.js`
- `moodbyid`: `js/domain/moods.js`
- `moods`: `js/domain/moods.js`
- `morning`: `js/domain/adhkarTiming.js`, `js/services/checklist.js`, `js/views/checklist.js`
- `morphology`: `js/domain/grammarDrill.js`
- `moshaf`: `js/services/audioStore.js`, `js/views/playerBar.js`
- `moshafid`: `js/services/audioStore.js`
- `mostreadcategories`: `js/domain/statistics.js`
- `mounted`: `js/ui/modal.js`, `js/ui/toast.js`
- `mountshell`: `js/app/renderer.js`
- `move`: `js/services/backup.js`, `js/views/favorites.js`
- `movecategory`: `js/services/contentPrefs.js`
- `moved`: `js/views/library.js`
- `movehomepanel`: `js/domain/homePanels.js`
- `moveitem`: `js/services/contentPrefs.js`
- `movelibrary`: `js/services/contentPrefs.js`
- `movequicktile`: `js/domain/quickTiles.js`
- `moving`: `js/domain/prayerTimeline.js`, `js/views/collection.js`
- `mp3quran`: `js/services/audioCatalog.js`, `js/views/audioManager.js`
- `muharram`: `js/domain/calendar.js`
- `mulberry32`: `js/services/hadith.js`
- `multi`: `js/domain/sleepTimer.js`, `js/views/tafsirPanel.js`
- `multiple`: `js/domain/locations.js`, `js/views/quiz.js`
- `mushaf`: `js/app/autoFit.js`, `js/app/fullscreen.js`, `js/app/readingTimer.js`, `js/core/config/quran.js`, `js/core/config/views.js`, `js/core/state/slices/quran.js`, `js/domain/gestures.js`, `js/domain/khatma.js`, `js/domain/tajweedSources.js`, `js/services/mushaf.js`, `js/services/soundDesign.js`, `js/ui/recitationConsole.js`, `js/ui/skeleton.js`, `js/ui/viewSheet.js`, `js/views/mushafBookmarks.js`, `js/views/mushafPageFind.js`, `js/views/mushafPlayer.js`, `js/views/mushafReader.js`, `js/views/studyContext.js`, `js/views/tafsirPanel.js`
- `mushafdragstyle`: `js/domain/gestures.js`
- `mushafreader`: `js/ui/readingTokens.js`, `js/views/ayahStudy.js`, `js/views/khatma.js`, `js/views/mushafBookmarks.js`, `js/views/mushafJump.js`, `js/views/mushafPlayer.js`
- `mushafroutepage`: `js/services/mushaf.js`, `js/views/mushafJump.js`, `js/views/mushafReader.js`
- `mushafs`: `js/services/audioCatalog.js`, `js/views/audioManager.js`
- `mushafspreadactive`: `js/services/mushaf.js`
- `mushafswipeturn`: `js/domain/gestures.js`
- `mushafurls`: `js/domain/offline.js`
- `must`: `js/domain/lexicalProvenance.js`, `js/domain/sessionFlags.js`
- `mutable`: `js/app/practice.js`, `js/app/rt.js`
- `mutashabihat`: `js/app/handlers/journal.js`, `js/domain/mutashabihat.js`, `js/views/mutashabihat.js`
- `mutated`: `js/domain/readerWindow.js`
- `mutation`: `js/views/tajweedCourseView.js`
- `mute`: `js/domain/playerShortcuts.js`
- `name`: `js/core/config/app.js`, `js/core/icons.js`, `js/domain/kids.js`, `js/domain/wmm-coefs.js`, `js/views/calendar.js`, `js/views/palette.js`
- `named`: `js/domain/fasting.js`, `js/services/prayerSound.js`
- `names`: `js/app/quizDeck.js`, `js/ui/emptyState.js`, `js/views/collections.js`, `js/views/home.js`, `js/views/quiz.js`, `js/views/search.js`, `js/views/statistics.js`, `js/views/tasbih.js`
- `narrator`: `js/domain/hadithStudy.js`
- `narratorfor`: `js/domain/localeContent.js`
- `narrators`: `js/domain/hadithStudy.js`
- `narrows`: `js/domain/dailyAyah.js`
- `native`: `js/services/floatingCounter.js`
- `navigable`: `js/views/calendar.js`
- `navigate`: `js/core/router.js`
- `navigatefocusadjacent`: `js/app/focusRuntime.js`
- `navigatemushafpage`: `js/app/handlers/quran.js`
- `navigation`: `js/app/focusRuntime.js`, `js/app/inputs.js`, `js/core/state/slices/shell.js`, `js/services/mushaf.js`, `js/ui/shell.js`, `js/views/focus.js`, `js/views/palette.js`
- `near`: `js/views/mushafJump.js`
- `nearbymosquemapurl`: `js/domain/locations.js`
- `need`: `js/domain/moods.js`, `js/domain/tajweedSources.js`, `js/views/mood.js`
- `needed`: `js/services/prayerSound.js`
- `needs`: `js/app/fullscreen.js`, `js/views/backupSummary.js`
- `needspermission`: `js/domain/compass.js`
- `network`: `js/core/fetch.js`, `js/core/schema.js`, `js/domain/prayer.js`, `js/domain/ramadan.js`, `js/services/player.js`
- `neutral`: `js/ui/readingTokens.js`
- `never`: `js/app/handlers/content.js`, `js/core/idb/openDB.js`, `js/core/storage.js`, `js/core/utils.js`, `js/domain/install.js`, `js/domain/lexicalProvenance.js`, `js/domain/localeContent.js`, `js/domain/milestones.js`, `js/domain/sessionFlags.js`, `js/domain/tajweedLessons.js`, `js/services/audioStore.js`, `js/services/dataHealth.js`, `js/services/gapTelemetry.js`, `js/views/certificate.js`, `js/views/quran.js`
- `next`: `js/app/tickers.js`, `js/app/triggers.js`, `js/domain/playerShortcuts.js`, `js/domain/ramadan.js`, `js/ui/emptyState.js`, `js/views/ambient.js`, `js/views/focus.js`, `js/views/prayer.js`
- `nextayah`: `js/services/surahPlayback.js`
- `nexteidalfitr`: `js/domain/ramadan.js`
- `nextfreshindex`: `js/domain/reflections.js`
- `nextloop`: `js/services/surahPlayback.js`
- `nextpage`: `js/services/mushaf.js`
- `nextprayer`: `js/domain/prayer.js`
- `nextprayercountdown`: `js/domain/prayerTimeline.js`
- `nextramadan`: `js/domain/ramadan.js`
- `nextremindtime`: `js/domain/fasting.js`
- `nextrepeat`: `js/services/surahPlayback.js`
- `nextsession`: `js/domain/tajweedCourse.js`
- `nextsleeprung`: `js/domain/sleepTimer.js`
- `nextspeed`: `js/services/surahPlayback.js`
- `nextspreadpage`: `js/services/mushaf.js`
- `nextstats`: `js/domain/tajweedPractice.js`
- `nf03`: `js/domain/audioBatch.js`
- `nights`: `js/domain/ramadanPlanner.js`
- `nightstand`: `js/domain/ambient.js`, `js/views/ambient.js`
- `nisab`: `js/domain/zakat.js`, `js/views/zakat.js`
- `noaa`: `js/domain/wmm-coefs.js`
- `nobody`: `js/views/qibla.js`
- `nodekey`: `js/app/renderer.js`
- `none`: `js/app/fullscreen.js`
- `normal`: `js/core/storage.js`
- `normalization`: `js/core/migration.js`, `js/core/schema.js`
- `normalizearabic`: `js/core/utils.js`
- `normalizeayahkey`: `js/domain/hifz.js`
- `normalizecategory`: `js/core/schema.js`
- `normalizecustomcontentmap`: `js/core/schema.js`
- `normalized`: `js/domain/rootAwareSearch.js`, `js/services/editor.js`
- `normalizedhikraudio`: `js/core/schema.js`
- `normalizedocument`: `js/core/schema.js`
- `normalizeechopause`: `js/services/surahPlayback.js`
- `normalizeeditionkey`: `js/domain/translationCompare.js`
- `normalizegrade`: `js/domain/grades.js`
- `normalizehadithgrade`: `js/services/hadith.js`
- `normalizehifzgrade`: `js/domain/hifz.js`
- `normalizehifzlevel`: `js/domain/hifz.js`
- `normalizehifztest`: `js/domain/hifz.js`
- `normalizeinstalloutcome`: `js/domain/install.js`
- `normalizeitem`: `js/core/schema.js`
- `normalizeloop`: `js/services/surahPlayback.js`
- `normalizenarrator`: `js/services/hadith.js`
- `normalizequeue`: `js/domain/audioQueue.js`, `js/services/surahPlayback.js`
- `normalizerepeat`: `js/services/surahPlayback.js`
- `normalizerepeatmode`: `js/domain/audioQueue.js`
- `normalizesearch`: `js/core/utils.js`, `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`
- `normalizespeed`: `js/services/surahPlayback.js`
- `normalizetajweedanswermode`: `js/domain/tajweedPractice.js`
- `north`: `js/domain/wmm.js`
- `note`: `js/domain/homeInvitations.js`, `js/domain/reminderPresets.js`, `js/services/calendarNotes.js`, `js/ui/calendarModals.js`
- `notecompleted`: `js/domain/completedCards.js`
- `notefor`: `js/domain/localeContent.js`
- `notelongtask`: `js/services/gapTelemetry.js`
- `notepreloadsample`: `js/services/surahPlayback.js`
- `notes`: `js/core/state/slices/library.js`, `js/core/state/slices/shell.js`
- `notesfordate`: `js/services/calendarNotes.js`
- `notfound`: `js/ui/missingData.js`
- `notfoundstatehtml`: `js/ui/emptyState.js`
- `nothing`: `js/core/migration.js`, `js/core/schema.js`, `js/domain/mutashabihat.js`, `js/services/recitation.js`, `js/ui/card.js`, `js/ui/emptyState.js`, `js/views/mutashabihat.js`
- `notification`: `js/domain/reminderPresets.js`, `js/services/mediaSession.js`, `js/services/notifications.js`
- `notifications`: `js/services/alertTriggers.js`
- `nudge`: `js/app/tickers.js`, `js/core/state/slices/shell.js`, `js/domain/milestones.js`, `js/domain/nudge.js`
- `nudgecardhtml`: `js/views/home.js`
- `null`: `js/core/idb/openDB.js`, `js/domain/homePanels.js`
- `number`: `js/domain/compass.js`, `js/domain/searchPagination.js`, `js/services/mushaf.js`, `js/views/calendar.js`, `js/views/palette.js`
- `numbers`: `js/services/gapTelemetry.js`
- `object`: `js/domain/audioBatch.js`
- `occurrence`: `js/domain/wordStudy.js`, `js/views/roots.js`
- `occurrenceayah`: `js/domain/roots.js`
- `occurrencegloss`: `js/domain/roots.js`
- `official`: `js/domain/wmm-coefs.js`, `js/domain/wmm.js`
- `offlin`: `js/views/about.js`
- `offline`: `js/app/audioEngine.js`, `js/app/handlers/offline.js`, `js/app/offlineJobs.js`, `js/core/state/slices/audio.js`, `js/domain/offline.js`, `js/domain/prayer.js`, `js/domain/tajweedSources.js`, `js/domain/wmm.js`, `js/services/audioStore.js`, `js/services/player.js`, `js/views/audioManager.js`, `js/views/backupSummary.js`, `js/views/offline.js`
- `offlinejobs`: `js/app/handlers/offline.js`, `js/domain/offline.js`
- `offplaybackended`: `js/services/recitation.js`
- `offplaybackerror`: `js/services/recitation.js`
- `offset`: `js/domain/onboarding.js`, `js/domain/prayer.js`, `js/views/onboardingPanel.js`
- `offsets`: `js/core/config/app.js`
- `often`: `js/services/moshafAvailability.js`
- `omitted`: `js/ui/card.js`
- `onadhanstart`: `js/services/prayerSound.js`
- `onayahchange`: `js/services/surahPlayback.js`
- `onboarding`: `js/views/installRow.js`, `js/views/onboardingPanel.js`
- `onboardingcomplete`: `js/domain/onboarding.js`
- `onboardingpanelhtml`: `js/views/onboardingPanel.js`
- `once`: `js/app/installPrompt.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/domain/hifz.js`, `js/domain/install.js`, `js/ui/calendarModals.js`, `js/ui/modal.js`, `js/views/playerBar.js`
- `onerror`: `js/services/surahPlayback.js`
- `onplaybackchange`: `js/services/recitation.js`
- `onplaybackended`: `js/services/recitation.js`
- `onplaybackerror`: `js/services/recitation.js`
- `onplayererror`: `js/services/player.js`
- `onplayerpatch`: `js/services/player.js`
- `onplayingstatechange`: `js/services/player.js`
- `onpreloadsample`: `js/services/recitation.js`
- `onsleeptick`: `js/services/player.js`
- `onstatechange`: `js/app/stateSub.js`
- `ontrackended`: `js/services/player.js`
- `open`: `js/app/drawer.js`, `js/domain/hadithSearch.js`, `js/services/alertTriggers.js`, `js/services/audioCatalog.js`, `js/services/dhikrAudio.js`, `js/services/notifications.js`, `js/views/about.js`
- `openayahstudy`: `js/app/lazyData.js`
- `opendb`: `js/core/idb/openDB.js`
- `opened`: `js/views/viewSheets.js`
- `openfloatingcounter`: `js/services/floatingCounter.js`
- `opening`: `js/app/handlers/viewMenus.js`
- `openlazymodal`: `js/ui/modal.js`
- `openmodal`: `js/ui/modal.js`, `js/views/tajweedPracticeView.js`
- `opennavdrawer`: `js/app/drawer.js`
- `openpalette`: `js/app/palette.js`
- `openparentgate`: `js/app/events.js`
- `openpracticepicker`: `js/app/practice.js`
- `opens`: `js/app/handlers/viewMenus.js`, `js/app/palette.js`
- `opensettingssectionfor`: `js/views/settings.js`
- `operation`: `js/core/storage.js`
- `optional`: `js/services/soundDesign.js`, `js/services/speech.js`
- `orchestration`: `js/domain/audioBatch.js`, `js/services/hadith.js`
- `order`: `js/domain/gestures.js`, `js/domain/homePanels.js`, `js/domain/onboarding.js`, `js/domain/prayer.js`, `js/domain/prayerExport.js`, `js/domain/quickTiles.js`, `js/services/alertTriggers.js`, `js/services/player.js`
- `origin`: `js/views/studyContext.js`
- `ornamenttokenkind`: `js/domain/tajweed.js`
- `otherwise`: `js/app/triggers.js`
- `output`: `js/app/renderer.js`
- `overlay`: `js/app/palette.js`, `js/views/palette.js`
- `overlays`: `js/app/quranData.js`
- `overlaytranslation`: `js/core/config/quran.js`
- `override`: `js/domain/contentLens.js`
- `owner`: `js/app/fullscreen.js`
- `owns`: `js/core/state/slices/audio.js`, `js/core/state/slices/hadith.js`, `js/core/state/slices/library.js`, `js/core/state/slices/quran.js`, `js/core/state/slices/shell.js`, `js/core/state/slices/worship.js`, `js/domain/ambient.js`, `js/domain/audioQueue.js`, `js/domain/duaJournal.js`, `js/domain/install.js`, `js/domain/playerShortcuts.js`, `js/services/calendarNotes.js`, `js/services/checklist.js`, `js/views/category.js`
- `package`: `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/core/state.js`
- `pad3`: `js/services/audioCatalog.js`
- `page`: `js/core/config/quran.js`, `js/domain/gestures.js`, `js/domain/roots.js`, `js/domain/searchPagination.js`, `js/services/audioContext.js`, `js/services/hadith.js`, `js/services/mushaf.js`, `js/services/soundDesign.js`, `js/ui/readingTokens.js`, `js/views/about.js`, `js/views/journal.js`, `js/views/mushafPageFind.js`, `js/views/mushafPlayer.js`, `js/views/mushafReader.js`, `js/views/prayer.js`
- `pagechapters`: `js/views/mushafPlayer.js`, `js/views/mushafReader.js`
- `pagecount`: `js/services/hadith.js`
- `pagecountfor`: `js/domain/searchPagination.js`
- `pagefornumber`: `js/services/hadith.js`
- `pages`: `js/ui/skeleton.js`, `js/views/mushafPageFind.js`
- `pagesize`: `js/domain/searchPagination.js`
- `pagesizefor`: `js/domain/searchPagination.js`
- `pagesreadtoday`: `js/domain/worship.js`
- `paginate`: `js/domain/searchPagination.js`
- `pagination`: `js/domain/searchPagination.js`, `js/services/hadith.js`
- `pain`: `js/domain/mutashabihat.js`
- `pair`: `js/services/soundDesign.js`
- `pairforayah`: `js/domain/mutashabihat.js`
- `pairs`: `js/domain/mutashabihat.js`, `js/views/mutashabihat.js`
- `palette`: `js/app/palette.js`, `js/core/theme.js`, `js/views/palette.js`
- `palettegroupshtml`: `js/views/palette.js`
- `paletterowcount`: `js/views/palette.js`
- `palettes`: `js/core/config/views.js`
- `paletteshellhtml`: `js/views/palette.js`
- `panel`: `js/domain/homePanels.js`, `js/domain/tajweedSources.js`, `js/views/khatma.js`, `js/views/settings.js`, `js/views/studyTray.js`, `js/views/tafsirPanel.js`, `js/views/tajweedSettings.js`, `js/views/zakat.js`
- `panels`: `js/app/handlers/viewMenus.js`
- `paper`: `js/core/config/views.js`, `js/views/certificate.js`, `js/views/mushafReader.js`
- `papers`: `js/core/config/views.js`
- `params`: `js/domain/launchIntents.js`, `js/views/hadith.js`
- `parsebackup`: `js/services/backup.js`
- `parseprotocollaunch`: `js/domain/launchIntents.js`
- `parsesharetarget`: `js/domain/launchIntents.js`
- `parsing`: `js/domain/launchIntents.js`
- `part`: `js/views/mushafPlayer.js`
- `partial`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/views/backupSummary.js`
- `partially`: `js/core/migration.js`
- `party`: `js/domain/tajweed.js`
- `passages`: `js/domain/mutashabihat.js`
- `passes`: `js/views/tajweedCourseView.js`
- `pasted`: `js/ui/recitationConsole.js`
- `patch`: `js/core/icons.js`
- `patched`: `js/views/playerBar.js`
- `patchhtml`: `js/app/renderer.js`
- `patching`: `js/app/compassRuntime.js`
- `path`: `js/domain/install.js`, `js/domain/tajweedCourse.js`, `js/views/kids.js`
- `paths`: `js/core/icons.js`
- `pattern`: `js/ui/missingData.js`, `js/views/mood.js`
- `pause`: `js/domain/playerShortcuts.js`, `js/services/player.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`
- `peeknexttriples`: `js/services/surahPlayback.js`
- `peeknexturl`: `js/services/surahPlayback.js`
- `pending`: `js/app/focusRuntime.js`, `js/core/idb/openDB.js`
- `pendingbyprayer`: `js/domain/qada.js`
- `pendingqada`: `js/domain/qada.js`
- `people`: `js/services/dataHealth.js`, `js/services/shareCard.js`
- `percentile`: `js/services/gapTelemetry.js`
- `periodicsync`: `js/app/triggers.js`
- `permission`: `js/app/compassRuntime.js`
- `permissionstate`: `js/services/notifications.js`
- `persisted`: `js/core/state/initial.js`, `js/core/state.js`, `js/domain/homePanels.js`, `js/domain/sessionFlags.js`, `js/services/backup.js`
- `persistedsnapshot`: `js/core/state/restore.js`, `js/core/state.js`
- `persistence`: `js/domain/audioBatch.js`
- `persistent`: `js/services/player.js`, `js/ui/shell.js`, `js/views/installRow.js`, `js/views/playerBar.js`
- `person`: `js/app/readingTimer.js`, `js/domain/moods.js`, `js/views/about.js`, `js/views/mood.js`, `js/views/qibla.js`, `js/views/ramadan.js`
- `phase`: `js/services/soundDesign.js`, `js/ui/emptyState.js`, `js/ui/skeleton.js`
- `phases`: `js/domain/ramadan.js`
- `philosophy`: `js/domain/adhkarTiming.js`, `js/domain/khatma.js`
- `phone`: `js/domain/prayerExport.js`, `js/services/gapTelemetry.js`
- `physical`: `js/domain/gestures.js`, `js/services/soundDesign.js`
- `pick`: `js/app/hadithData.js`
- `pickbackupfile`: `js/services/backup.js`
- `pickdailyhadith`: `js/services/hadith.js`
- `pickdailyitem`: `js/domain/dailyAyah.js`
- `pickdailyitemthemed`: `js/domain/dailyAyah.js`
- `picked`: `js/views/tajweedSettings.js`
- `picker`: `js/services/hadith.js`, `js/ui/menus.js`, `js/ui/modal.js`
- `picking`: `js/domain/tajweedPractice.js`
- `picklocale`: `js/core/utils.js`
- `pickpersisted`: `js/core/state/initial.js`, `js/core/state.js`
- `pickrandomhadith`: `js/services/hadith.js`
- `pickroundentries`: `js/domain/tajweedPractice.js`
- `pickroundentry`: `js/domain/tajweedPractice.js`
- `picks`: `js/domain/ambient.js`, `js/domain/launchIntents.js`
- `pickstrict`: `js/core/utils.js`, `js/domain/localeContent.js`
- `piece`: `js/app/rt.js`
- `pipeline`: `js/domain/hadithStudy.js`
- `pipelines`: `js/domain/tafsirSearch.js`
- `place`: `js/services/contentPrefs.js`, `js/services/tasbih.js`, `js/views/ambient.js`
- `placeholders`: `js/ui/skeleton.js`
- `plain`: `js/domain/duaJournal.js`, `js/domain/khatma.js`, `js/domain/kids.js`, `js/domain/sessionFlags.js`, `js/domain/wordStudy.js`, `js/views/journal.js`, `js/views/kids.js`
- `plan`: `js/domain/homeInvitations.js`, `js/domain/kids.js`, `js/domain/lastPosition.js`, `js/domain/planExport.js`, `js/domain/rootAwareSearch.js`, `js/services/alertTriggers.js`, `js/ui/missingData.js`, `js/views/backupSummary.js`, `js/views/khatma.js`, `js/views/kids.js`, `js/views/studyTray.js`
- `plancacheeviction`: `js/services/audioStore.js`
- `planfingerprint`: `js/services/alertTriggers.js`
- `planner`: `js/domain/khatma.js`, `js/domain/ramadanPlanner.js`
- `plannerpanel`: `js/views/ramadan.js`
- `plans`: `js/app/fileImports.js`
- `planstatus`: `js/domain/khatma.js`
- `plant`: `js/domain/garden.js`, `js/views/garden.js`
- `platform`: `js/views/installRow.js`
- `platforms`: `js/services/speech.js`
- `play`: `js/domain/playerShortcuts.js`, `js/services/player.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`, `js/views/ayahStudy.js`
- `playalert`: `js/services/prayerSound.js`
- `playback`: `js/core/state/slices/shell.js`, `js/domain/sleepTimer.js`, `js/services/dhikrAudio.js`, `js/services/recitation.js`
- `playdhikraudio`: `js/services/dhikrAudio.js`
- `player`: `js/app/audioEngine.js`, `js/core/state/slices/audio.js`, `js/domain/audioQueue.js`, `js/domain/gestures.js`, `js/services/dhikrAudio.js`, `js/services/player.js`, `js/ui/recitationConsole.js`, `js/views/mushafPlayer.js`, `js/views/playerBar.js`
- `players`: `js/domain/playerShortcuts.js`
- `playflipsound`: `js/app/inputs.js`
- `playkhatmachime`: `js/services/soundDesign.js`
- `playpageturn`: `js/services/soundDesign.js`
- `plays`: `js/services/recitation.js`
- `playsound`: `js/services/prayerSound.js`
- `playtick`: `js/services/tasbih.js`
- `plus`: `js/app/handlers/viewMenus.js`, `js/core/state/slices/hadith.js`, `js/domain/ramadanPlanner.js`, `js/domain/tajweedLessons.js`, `js/domain/worship.js`, `js/services/audioCatalog.js`, `js/services/audioStore.js`, `js/views/category.js`, `js/views/checklist.js`, `js/views/search.js`
- `plusdays`: `js/domain/hifz.js`
- `point`: `js/app/handlers/viewMenus.js`, `js/app.js`, `js/domain/mutashabihat.js`, `js/domain/qibla.js`
- `pointer`: `js/views/offline.js`
- `points`: `js/domain/kids.js`, `js/domain/launchIntents.js`, `js/views/kids.js`
- `policy`: `js/domain/milestones.js`
- `pool`: `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/domain/dailyAyah.js`, `js/domain/tajweedLessons.js`, `js/domain/tajweedPractice.js`
- `popover`: `js/domain/roots.js`, `js/domain/wordStudy.js`, `js/views/tafsirPanel.js`
- `popular`: `js/views/mushafReader.js`
- `ported`: `js/app/autoFit.js`, `js/app/practice.js`
- `portion`: `js/services/backup.js`
- `positi`: `js/domain/prayerTimeline.js`
- `position`: `js/domain/lastPosition.js`, `js/domain/prayer.js`, `js/domain/wmm.js`, `js/views/ramadan.js`
- `positive`: `js/domain/milestones.js`
- `powers`: `js/domain/roots.js`
- `practice`: `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/core/state/slices/worship.js`, `js/domain/tajweedPractice.js`, `js/views/mutashabihat.js`, `js/views/tajweedPracticeView.js`
- `practicelevel`: `js/domain/tajweedPractice.js`
- `prayer`: `js/app/handlers/viewMenus.js`, `js/app/tickers.js`, `js/app/triggers.js`, `js/domain/locations.js`, `js/domain/prayer.js`, `js/domain/prayerExport.js`, `js/domain/prayerLog.js`, `js/domain/prayerTimeline.js`, `js/domain/qada.js`, `js/domain/sunnah.js`, `js/services/alertTriggers.js`, `js/services/prayerSound.js`, `js/views/ambient.js`, `js/views/prayer.js`, `js/views/qibla.js`, `js/views/ramadan.js`
- `prayerbeststreak`: `js/domain/prayerLog.js`
- `prayericsfilename`: `js/domain/prayerExport.js`
- `prayerinsights`: `js/domain/prayerLog.js`
- `prayerlog`: `js/domain/sunnah.js`
- `prayermethodline`: `js/domain/prayer.js`
- `prayermonthcount`: `js/domain/prayerLog.js`
- `prayermonthicsfilename`: `js/domain/prayerExport.js`
- `prayerribbonhtml`: `js/views/home.js`
- `prayers`: `js/domain/prayer.js`, `js/domain/prayerLog.js`, `js/domain/qada.js`, `js/services/checklist.js`, `js/views/checklist.js`
- `prayersloggedtoday`: `js/domain/worship.js`
- `prayersound`: `js/services/audioContext.js`
- `prayerstate`: `js/domain/prayerLog.js`
- `prayerstreak`: `js/domain/prayerLog.js`
- `prayertick`: `js/app/tickers.js`
- `prayertimeline`: `js/domain/ambient.js`
- `prayerweek`: `js/domain/prayerLog.js`
- `precision`: `js/domain/prayer.js`
- `precomputed`: `js/domain/search.js`
- `predates`: `js/domain/dailyAyah.js`
- `preferences`: `js/services/contentPrefs.js`
- `prefetchtrack`: `js/services/player.js`
- `prefix`: `js/services/alertTriggers.js`
- `prefs`: `js/core/state/slices/audio.js`, `js/core/state/slices/worship.js`
- `prefsof`: `js/domain/contentLens.js`
- `preload`: `js/services/recitation.js`
- `presentation`: `js/domain/grades.js`, `js/ui/missingData.js`
- `presented`: `js/domain/review.js`
- `preserved`: `js/core/migration.js`
- `preset`: `js/domain/reminderPresets.js`
- `presets`: `js/domain/locations.js`, `js/domain/reminderPresets.js`, `js/views/tasbih.js`
- `prev`: `js/domain/playerShortcuts.js`
- `preview`: `js/domain/roots.js`, `js/services/prayerSound.js`
- `previewalert`: `js/services/prayerSound.js`
- `previous`: `js/views/focus.js`
- `previously`: `js/services/backup.js`
- `prevpage`: `js/services/mushaf.js`
- `prevspreadpage`: `js/services/mushaf.js`
- `priced`: `js/views/zakat.js`
- `primary`: `js/domain/homePanels.js`, `js/domain/translationCompare.js`, `js/ui/shell.js`
- `primitive`: `js/core/fetch.js`, `js/domain/planExport.js`
- `primitives`: `js/services/hadith.js`
- `print`: `js/views/certificate.js`
- `printable`: `js/app/handlers/journal.js`, `js/views/certificate.js`
- `printed`: `js/views/mushafReader.js`
- `privacy`: `js/domain/duaJournal.js`, `js/views/about.js`
- `private`: `js/app/handlers/journal.js`, `js/domain/duaJournal.js`, `js/views/checklist.js`, `js/views/journal.js`
- `probe`: `js/app/tickers.js`
- `processdocument`: `js/core/schema.js`
- `produces`: `js/app/renderer.js`
- `profilematchesactive`: `js/domain/locations.js`
- `profiles`: `js/core/state/slices/worship.js`, `js/domain/locations.js`
- `profilespanelhtml`: `js/views/prayer.js`
- `profiletoprayerpatch`: `js/domain/locations.js`
- `programme`: `js/domain/tajweedCourse.js`
- `progress`: `js/app/handlers/offline.js`, `js/core/state/slices/quran.js`, `js/views/certificate.js`, `js/views/khatma.js`
- `prompt`: `js/views/journal.js`
- `promptfordate`: `js/domain/duaJournal.js`
- `prompts`: `js/domain/duaJournal.js`, `js/views/journal.js`
- `properties`: `js/core/theme.js`
- `prose`: `js/domain/tafsirSearch.js`
- `protocol`: `js/domain/launchIntents.js`
- `provenance`: `js/domain/lexicalProvenance.js`
- `providers`: `js/app/palette.js`, `js/core/config/quran.js`
- `proxied`: `js/services/recitation.js`
- `prunefiredmap`: `js/services/alertTriggers.js`
- `prunepool`: `js/services/recitation.js`
- `public`: `js/core/state/reducer.js`, `js/core/state.js`, `js/domain/wmm-coefs.js`, `js/services/recitation.js`
- `published`: `js/domain/tajweedCourse.js`
- `pulled`: `js/views/mushafJump.js`
- `punish`: `js/domain/nudge.js`
- `purposeful`: `js/views/settings.js`
- `push`: `js/services/notifications.js`
- `qada`: `js/core/state/slices/worship.js`, `js/domain/qada.js`, `js/views/prayer.js`
- `qadapanelhtml`: `js/views/prayer.js`
- `qadasummary`: `js/domain/qada.js`
- `qadrnightfor`: `js/domain/ramadan.js`
- `qadrnightinfo`: `js/domain/ramadan.js`
- `qibla`: `js/app/compassRuntime.js`
- `qiblabearing`: `js/domain/qibla.js`
- `queries`: `js/domain/search.js`
- `query`: `js/core/state/slices/audio.js`
- `question`: `js/views/quiz.js`
- `queue`: `js/domain/audioBatch.js`, `js/domain/audioQueue.js`, `js/domain/reflections.js`
- `queuesignature`: `js/services/surahPlayback.js`
- `quick`: `js/domain/locations.js`, `js/domain/quickTiles.js`
- `quicktileshtml`: `js/views/home.js`
- `quiz`: `js/app/quizDeck.js`, `js/core/config/app.js`, `js/domain/kids.js`, `js/domain/quiz.js`, `js/domain/tajweedPractice.js`, `js/views/quiz.js`
- `quizmissrecords`: `js/domain/quiz.js`
- `quran`: `js/app/renderer.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/domain/grammarDrill.js`, `js/domain/lastPosition.js`, `js/domain/readerWindow.js`, `js/domain/rootAwareSearch.js`, `js/domain/roots.js`, `js/domain/tafsirSearch.js`, `js/services/mushaf.js`, `js/views/palette.js`, `js/views/quran.js`
- `quranaudiosurahurl`: `js/core/config/quran.js`
- `quranaudiourl`: `js/core/config/quran.js`, `js/services/recitation.js`
- `quranbookmark`: `js/domain/lastPosition.js`
- `quranicaudio`: `js/services/audioCatalog.js`, `js/views/audioManager.js`
- `quranindexsize`: `js/domain/quranSearch.js`
- `quranurls`: `js/domain/offline.js`
- `race`: `js/app/focusRuntime.js`
- `rail`: `js/core/config/nav.js`, `js/ui/shell.js`
- `raise`: `js/domain/lexicalProvenance.js`
- `ramadan`: `js/app/tickers.js`, `js/domain/adhkarTiming.js`, `js/domain/fasting.js`, `js/domain/homeInvitations.js`, `js/domain/ramadan.js`, `js/domain/ramadanPlanner.js`, `js/views/ramadan.js`
- `ramadanalerttimes`: `js/domain/ramadan.js`
- `ramadaninfo`: `js/domain/ramadan.js`
- `ramadaninvitestate`: `js/domain/homeInvitations.js`
- `ramadankhatmapreset`: `js/domain/khatma.js`
- `ramadankhatmplan`: `js/domain/ramadanPlanner.js`
- `ramadanlength`: `js/domain/ramadan.js`
- `ramadanlog`: `js/domain/ramadanPlanner.js`
- `ramadanlogkey`: `js/domain/ramadan.js`
- `ramadanstartforhijriyear`: `js/domain/ramadan.js`
- `ramadantick`: `js/app/tickers.js`
- `randomness`: `js/app/quizDeck.js`
- `range`: `js/domain/audioQueue.js`, `js/ui/calendarModals.js`
- `rankbrowsercategories`: `js/views/home.js`
- `rankbrowserdocuments`: `js/views/home.js`
- `ranked`: `js/domain/hadithSearch.js`, `js/views/library.js`
- `ranks`: `js/domain/hadithSearch.js`
- `rate`: `js/domain/zakat.js`
- `rates`: `js/services/surahPlayback.js`
- `rather`: `js/services/moshafAvailability.js`
- `ratio`: `js/domain/gestures.js`
- `rawatib`: `js/domain/sunnah.js`
- `reach`: `js/core/migration.js`, `js/views/palette.js`
- `reaching`: `js/domain/completedCards.js`
- `reacquirewakelockiffullscreen`: `js/app/fullscreen.js`
- `reactive`: `js/app/installPrompt.js`
- `reactively`: `js/app/handlers/offline.js`
- `reacts`: `js/core/theme.js`
- `read`: `js/app/renderer.js`, `js/domain/milestones.js`, `js/domain/statistics.js`, `js/services/editor.js`, `js/views/favorites.js`
- `readautosnapshot`: `js/services/backup.js`
- `reader`: `js/core/state/slices/hadith.js`, `js/core/state/slices/quran.js`, `js/domain/lastPosition.js`, `js/domain/readerWindow.js`, `js/domain/translationCompare.js`, `js/services/floatingCounter.js`, `js/services/mushaf.js`, `js/ui/recitationConsole.js`, `js/views/hadith.js`, `js/views/quran.js`
- `readers`: `js/app/readingTimer.js`, `js/ui/toast.js`
- `readerwindow`: `js/domain/readerWindow.js`
- `readfileastext`: `js/services/backup.js`
- `reading`: `js/app/fullscreen.js`, `js/app/readingTimer.js`, `js/domain/khatma.js`, `js/domain/planExport.js`, `js/domain/tajweedPractice.js`, `js/services/speech.js`, `js/services/surahPlayback.js`, `js/ui/readingTokens.js`, `js/views/focus.js`, `js/views/library.js`, `js/views/mushafPageFind.js`
- `readinginlastdays`: `js/domain/statistics.js`
- `readingsec`: `js/app/readingTimer.js`
- `readingsincefortests`: `js/app/readingTimer.js`
- `readingstreak`: `js/domain/worship.js`
- `readlastpositions`: `js/domain/lastPosition.js`
- `reads`: `js/views/tajweedCourseView.js`
- `readscrolltop`: `js/app/renderer.js`
- `readwindow`: `js/domain/readerWindow.js`
- `real`: `js/domain/install.js`, `js/views/mushafReader.js`
- `reason`: `js/domain/qada.js`
- `recall`: `js/domain/mutashabihat.js`
- `recent`: `js/views/favorites.js`
- `recenthistory`: `js/services/checklist.js`
- `recentvoluntaryfasts`: `js/domain/fasting.js`
- `recitation`: `js/core/state/slices/audio.js`, `js/domain/garden.js`, `js/domain/statistics.js`, `js/domain/tajweed.js`, `js/services/audioStore.js`, `js/services/dhikrAudio.js`, `js/services/mediaSession.js`, `js/services/mushaf.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`, `js/ui/recitationConsole.js`, `js/views/garden.js`
- `recitationchipshtml`: `js/ui/recitationConsole.js`
- `recitationechohtml`: `js/ui/recitationConsole.js`
- `recitations`: `js/core/utils.js`
- `reciter`: `js/app/audioEngine.js`, `js/core/config/quran.js`, `js/domain/onboarding.js`, `js/services/audioCatalog.js`, `js/views/offline.js`, `js/views/onboardingPanel.js`
- `reciterdisplayname`: `js/core/config/quran.js`
- `reciters`: `js/core/config/quran.js`, `js/core/state/slices/audio.js`, `js/services/audioCatalog.js`, `js/ui/skeleton.js`, `js/views/audioManager.js`, `js/views/palette.js`
- `recitershortlabel`: `js/ui/recitationConsole.js`
- `recommendedadhkarwindow`: `js/domain/adhkarTiming.js`
- `reconcilepending`: `js/domain/audioBatch.js`
- `record`: `js/domain/statistics.js`
- `recorded`: `js/domain/statistics.js`
- `recordeffect`: `js/services/gapTelemetry.js`
- `recordinstalldeferral`: `js/domain/install.js`
- `recordquizmiss`: `js/domain/quiz.js`
- `records`: `js/domain/grades.js`, `js/domain/hifz.js`, `js/domain/tafsirSearch.js`
- `recurrence`: `js/services/calendarNotes.js`, `js/ui/calendarModals.js`
- `recurring`: `js/domain/reminderPresets.js`
- `redesign`: `js/views/mushafReader.js`
- `reduce`: `js/core/state/reducer.js`, `js/core/state.js`
- `reduceaudio`: `js/core/state/slices/audio.js`
- `reducehadith`: `js/core/state/slices/hadith.js`
- `reducelibrary`: `js/core/state/slices/library.js`
- `reducequran`: `js/core/state/slices/quran.js`
- `reducer`: `js/app/quizDeck.js`, `js/core/state/slices/audio.js`, `js/core/state/slices/hadith.js`, `js/core/state/slices/library.js`, `js/core/state/slices/quran.js`, `js/core/state/slices/shell.js`, `js/core/state/slices/worship.js`, `js/core/state/streak.js`
- `reduceshell`: `js/core/state/slices/shell.js`
- `reduceworship`: `js/core/state/slices/worship.js`
- `reference`: `js/domain/garden.js`
- `referencelinefor`: `js/domain/localeContent.js`
- `referencepartsfor`: `js/domain/localeContent.js`
- `reflection`: `js/domain/duaJournal.js`, `js/views/journal.js`
- `reflections`: `js/app/handlers/journal.js`, `js/domain/duaJournal.js`, `js/views/journal.js`
- `refocuszakatinput`: `js/app/inputs.js`
- `refreshappbadge`: `js/services/appBadge.js`
- `refreshcustomadhanflags`: `js/services/prayerSound.js`
- `refreshlibraryindex`: `js/app/net.js`
- `refreshmushaffit`: `js/app/autoFit.js`
- `refs`: `js/domain/tajweedLessons.js`
- `regions`: `js/domain/locations.js`
- `registerserviceworker`: `js/app/triggers.js`
- `registry`: `js/domain/celebrate.js`, `js/services/hadith.js`
- `related`: `js/views/studyContext.js`
- `relative`: `js/domain/prayer.js`, `js/domain/prayerExport.js`, `js/domain/prayerTimeline.js`
- `released`: `js/domain/wmm-coefs.js`
- `releasemushafnativefullscreen`: `js/app/fullscreen.js`
- `reliability`: `js/app/triggers.js`, `js/services/alertTriggers.js`
- `reload`: `js/domain/sessionFlags.js`
- `remainingafter`: `js/domain/audioBatch.js`
- `remind`: `js/domain/fasting.js`
- `remindcategoriesfor`: `js/domain/fasting.js`
- `reminder`: `js/domain/fasting.js`, `js/views/checklist.js`
- `reminderformhtml`: `js/app/forms.js`
- `reminders`: `js/core/state/slices/library.js`, `js/core/state/slices/shell.js`, `js/services/notifications.js`
- `remote`: `js/core/config/quran.js`
- `rename`: `js/views/collection.js`
- `renames`: `js/domain/contentLens.js`
- `rende`: `js/ui/card.js`
- `renderabout`: `js/views/about.js`
- `renderambient`: `js/views/ambient.js`
- `renderaudio`: `js/views/audioManager.js`
- `renderayahcardcanvas`: `js/services/shareCard.js`
- `renderayahwords`: `js/views/tafsirPanel.js`
- `rendercalendar`: `js/views/calendar.js`
- `rendercategory`: `js/views/category.js`
- `rendercertificate`: `js/views/certificate.js`
- `renderchecklist`: `js/views/checklist.js`
- `renderclassifyround`: `js/app/practice.js`
- `renderclassifyroundhtml`: `js/views/tajweedPracticeView.js`
- `rendercollection`: `js/views/collection.js`
- `rendercollections`: `js/views/collections.js`
- `renderduacardcanvas`: `js/services/shareCard.js`
- `rendered`: `js/app/renderer.js`, `js/ui/recitationConsole.js`, `js/views/certificate.js`, `js/views/mushafReader.js`, `js/views/playerBar.js`, `js/views/tajweedPracticeView.js`, `js/views/viewSheets.js`
- `rendereditor`: `js/views/editor.js`
- `renderer`: `js/app/boot.js`, `js/services/tasbih.js`
- `rendererrorscreen`: `js/app/drawer.js`
- `renderfavorites`: `js/views/favorites.js`
- `renderfocus`: `js/views/focus.js`
- `rendergarden`: `js/views/garden.js`
- `renderhadith`: `js/views/hadith.js`
- `renderhome`: `js/views/home.js`
- `rendering`: `js/domain/localeContent.js`, `js/domain/readerWindow.js`, `js/services/calendarNotes.js`
- `renderjournal`: `js/views/journal.js`
- `renderkids`: `js/views/kids.js`
- `renderlibrary`: `js/views/library.js`
- `rendermood`: `js/views/mood.js`
- `rendermushaf`: `js/views/mushafReader.js`
- `rendermushafpagefindresults`: `js/views/mushafPageFind.js`
- `rendermutashabihat`: `js/views/mutashabihat.js`
- `rendernav`: `js/ui/shell.js`
- `renderoffline`: `js/views/offline.js`
- `renderplayerbar`: `js/views/playerBar.js`
- `renderpracticeround`: `js/app/practice.js`
- `renderpracticesummary`: `js/app/practice.js`
- `renderprayer`: `js/views/prayer.js`
- `renderqibla`: `js/views/qibla.js`
- `renderquiz`: `js/views/quiz.js`
- `renderquran`: `js/views/quran.js`
- `renderramadan`: `js/views/ramadan.js`
- `renderroots`: `js/views/roots.js`
- `renders`: `js/app/handlers/offline.js`, `js/services/shareCard.js`, `js/views/studyTray.js`
- `rendersearch`: `js/views/search.js`
- `rendersettings`: `js/views/settings.js`
- `renderstatistics`: `js/views/statistics.js`
- `rendertajweedcourse`: `js/views/tajweedCourseView.js`
- `rendertasbih`: `js/views/tasbih.js`
- `rendertopbar`: `js/ui/shell.js`
- `renderzakat`: `js/views/zakat.js`
- `reoffer`: `js/domain/install.js`
- `reorder`: `js/services/contentPrefs.js`, `js/views/category.js`, `js/views/collection.js`
- `reordering`: `js/domain/contentLens.js`
- `reorganized`: `js/views/settings.js`
- `repeat`: `js/domain/audioQueue.js`, `js/domain/nudge.js`, `js/services/surahPlayback.js`, `js/ui/recitationConsole.js`
- `repetition`: `js/domain/hifz.js`
- `replacego`: `js/core/router.js`, `js/views/favorites.js`
- `replaces`: `js/domain/searchPagination.js`
- `replacing`: `js/app/autoFit.js`
- `report`: `js/domain/gestures.js`
- `request`: `js/views/qibla.js`
- `requestmushafnativefullscreen`: `js/app/fullscreen.js`
- `requestpermission`: `js/domain/compass.js`, `js/services/notifications.js`
- `resemble`: `js/views/mutashabihat.js`
- `reset`: `js/core/state/slices/shell.js`, `js/services/tasbih.js`, `js/views/category.js`
- `resetappbadgefortests`: `js/services/appBadge.js`
- `resetaudiocontextfortests`: `js/services/audioContext.js`
- `resetaudiostorefortests`: `js/services/audioStore.js`
- `resetavailabilityfortests`: `js/services/moshafAvailability.js`
- `resetayahcardmemofortests`: `js/views/quran.js`
- `resetcatalogfortests`: `js/services/audioCatalog.js`
- `resetdhikraudiofortests`: `js/services/dhikrAudio.js`
- `resetephemeralcaches`: `js/app/stateSub.js`
- `resetfailedlibrariesfortests`: `js/app/net.js`
- `resetfortests`: `js/services/soundDesign.js`
- `resetfscontrolsidletimer`: `js/app/fullscreen.js`
- `resetgaptelemetryfortests`: `js/services/gapTelemetry.js`
- `resethadithbookfetches`: `js/app/hadithData.js`
- `resethadithindex`: `js/domain/hadithSearch.js`
- `resetidbfortests`: `js/core/idb/openDB.js`
- `resetlazyviewsfortests`: `js/app/renderer.js`
- `resetmediahandlersfortests`: `js/services/mediaSession.js`
- `resetmutashabihatcache`: `js/domain/mutashabihat.js`
- `resetpersistfortests`: `js/services/audioStore.js`
- `resetplaybacknetstatsfortests`: `js/services/surahPlayback.js`
- `resetplayerfortests`: `js/services/player.js`
- `resetplayeridletimer`: `js/app/audioEngine.js`
- `resetplayingstatefortests`: `js/services/mediaSession.js`
- `resetquranindex`: `js/domain/quranSearch.js`
- `resetreadingtokensfortests`: `js/ui/readingTokens.js`
- `resetrecitationfortests`: `js/services/recitation.js`
- `resets`: `js/app/stateSub.js`
- `resetsessionflagsfortests`: `js/domain/sessionFlags.js`
- `resetstalefetchguards`: `js/app/stateSub.js`
- `resettafsirindex`: `js/domain/tafsirSearch.js`
- `resident`: `js/views/mushafPageFind.js`
- `resolution`: `js/services/player.js`
- `resolvealertsource`: `js/services/prayerSound.js`
- `resolveantonymstate`: `js/domain/lexicalProvenance.js`
- `resolvebrowserwindow`: `js/views/home.js`
- `resolvecomparetext`: `js/domain/translationCompare.js`
- `resolvecomparetexts`: `js/domain/translationCompare.js`
- `resolvecontextprovenance`: `js/domain/lexicalProvenance.js`
- `resolvehomepanels`: `js/domain/homePanels.js`
- `resolveirabprovenance`: `js/domain/lexicalProvenance.js`
- `resolvekidsview`: `js/core/config/views.js`
- `resolvelemmaprovenance`: `js/domain/lexicalProvenance.js`
- `resolvelexicalliststate`: `js/domain/lexicalProvenance.js`
- `resolvemincontrol`: `js/domain/gestures.js`
- `resolvenextfullsurah`: `js/domain/audioQueue.js`
- `resolveonboardingstep`: `js/domain/onboarding.js`
- `resolvepage`: `js/services/mushaf.js`
- `resolvequeueitem`: `js/services/surahPlayback.js`
- `resolvequicktiles`: `js/domain/quickTiles.js`
- `resolverangesave`: `js/app/handlers/audio.js`
- `resolverootprovenance`: `js/domain/lexicalProvenance.js`
- `resolves`: `js/core/idb/openDB.js`, `js/domain/lexicalProvenance.js`
- `resolvescopepage`: `js/domain/searchPagination.js`
- `resolvesynonymstate`: `js/domain/lexicalProvenance.js`
- `resolvetafsirsearchedition`: `js/app/tafsirSearch.js`
- `resolving`: `js/services/calendarNotes.js`
- `respect`: `js/views/about.js`
- `rest`: `js/views/focus.js`
- `restore`: `js/app/handlers/content.js`, `js/core/state/slices/shell.js`, `js/core/state/streak.js`
- `restoreall`: `js/services/contentPrefs.js`
- `restorecategory`: `js/services/contentPrefs.js`
- `restored`: `js/domain/garden.js`
- `restoreitem`: `js/services/contentPrefs.js`
- `restorelibrary`: `js/services/contentPrefs.js`
- `result`: `js/core/storage.js`, `js/views/zakat.js`
- `resultpagecount`: `js/domain/searchPagination.js`
- `results`: `js/ui/card.js`
- `resulttotal`: `js/domain/searchPagination.js`
- `resume`: `js/domain/audioBatch.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`
- `resumebannerhtml`: `js/views/audioManager.js`
- `resumepanelhtml`: `js/views/home.js`
- `resurfaces`: `js/domain/hifz.js`
- `retry`: `js/app/hadithData.js`
- `retrylibraryload`: `js/app/net.js`
- `return`: `js/views/studyContext.js`
- `returns`: `js/core/state/slices/hadith.js`, `js/core/storage.js`, `js/domain/prayer.js`
- `reusable`: `js/ui/modal.js`
- `reused`: `js/views/installRow.js`
- `reuses`: `js/domain/prayerLog.js`, `js/views/qibla.js`
- `reusin`: `js/domain/hadithSearch.js`
- `review`: `js/domain/hifz.js`, `js/domain/quiz.js`, `js/domain/review.js`
- `reviewdigestcardhtml`: `js/views/home.js`
- `reviewisempty`: `js/domain/review.js`
- `rewayaar`: `js/services/audioCatalog.js`
- `rides`: `js/views/favorites.js`
- `right`: `js/app/handlers/viewMenus.js`, `js/domain/adhkarTiming.js`, `js/domain/gestures.js`, `js/domain/playerShortcuts.js`, `js/views/mood.js`
- `rolls`: `js/views/calendar.js`
- `romanizearabic`: `js/domain/rootAwareSearch.js`
- `root`: `js/app/boot.js`, `js/app/net.js`, `js/app.js`, `js/core/state/actions.js`, `js/core/state/initial.js`, `js/core/state/restore.js`, `js/core/state/selectors.js`, `js/core/state/store.js`, `js/domain/rootAwareSearch.js`, `js/domain/roots.js`, `js/domain/wordStudy.js`, `js/ui/modal.js`, `js/ui/toast.js`, `js/views/roots.js`
- `rootforms`: `js/domain/roots.js`
- `rootlist`: `js/domain/roots.js`
- `rootmeaningfor`: `js/domain/wordStudy.js`
- `rootoccurrences`: `js/domain/wordStudy.js`
- `rootoccurrencesall`: `js/domain/roots.js`
- `roots`: `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/domain/rootAwareSearch.js`, `js/domain/roots.js`
- `rootstats`: `js/domain/roots.js`
- `rootstudyentryfor`: `js/domain/wordStudy.js`
- `rotation`: `js/domain/ambient.js`
- `round`: `js/app/practice.js`, `js/domain/tajweedPractice.js`, `js/domain/zakat.js`, `js/views/tajweedPracticeView.js`
- `rounduptounit`: `js/domain/zakat.js`
- `route`: `js/app/renderer.js`
- `router`: `js/app/boot.js`, `js/core/router.js`
- `routes`: `js/app/renderer.js`, `js/core/config/views.js`, `js/ui/shell.js`
- `routeworkerreply`: `js/app/hadithData.js`
- `routing`: `js/app/inputs.js`
- `rows`: `js/views/category.js`
- `rule`: `js/core/config/nav.js`, `js/core/config/quran.js`, `js/domain/khatma.js`, `js/domain/sessionFlags.js`, `js/domain/tajweed.js`, `js/domain/tajweedLessons.js`, `js/domain/tajweedPractice.js`, `js/views/tajweedPracticeView.js`, `js/views/tajweedSettings.js`
- `ruleenabled`: `js/domain/tajweed.js`
- `rules`: `js/core/state/streak.js`, `js/domain/tajweed.js`, `js/views/tajweedSettings.js`
- `runeditionswitch`: `js/app/quranData.js`
- `runinstallprompt`: `js/domain/install.js`
- `running`: `js/services/alertTriggers.js`
- `runofflinebatch`: `js/app/offlineJobs.js`
- `runs`: `js/domain/sleepTimer.js`, `js/domain/tajweed.js`
- `runtime`: `js/app/boot.js`, `js/app/focusRuntime.js`, `js/app/net.js`, `js/app/rt.js`, `js/core/fetch.js`, `js/domain/tajweedSources.js`
- `sadaqah`: `js/core/state/slices/worship.js`, `js/domain/worship.js`
- `sadaqahgiventoday`: `js/domain/worship.js`
- `safari`: `js/domain/install.js`
- `safe`: `js/core/utils.js`
- `safedecode`: `js/core/router.js`
- `sahih`: `js/domain/quranSearch.js`, `js/services/hadith.js`, `js/views/quran.js`, `js/views/search.js`
- `sajda`: `js/services/mushaf.js`
- `salawat`: `js/domain/reminderPresets.js`
- `salvage`: `js/app/inputs.js`
- `same`: `js/domain/adhkarTiming.js`, `js/domain/ambient.js`, `js/domain/khatma.js`, `js/domain/roots.js`, `js/domain/tajweedPractice.js`, `js/services/editor.js`, `js/ui/emptyState.js`, `js/ui/recitationConsole.js`, `js/ui/viewSheet.js`, `js/views/certificate.js`, `js/views/library.js`, `js/views/qibla.js`, `js/views/ramadan.js`, `js/views/studyTray.js`
- `samesurfaceword`: `js/domain/tajweed.js`
- `sample`: `js/domain/roots.js`, `js/views/tajweedSettings.js`
- `samples`: `js/services/gapTelemetry.js`
- `sanitization`: `js/core/config/sanitize.js`
- `sanitizeayahrecords`: `js/domain/hifz.js`
- `sanitizeduajournal`: `js/domain/duaJournal.js`
- `sanitizefastingprefs`: `js/domain/fasting.js`
- `sanitizehifzrecords`: `js/domain/hifz.js`
- `sanitizehijridaylog`: `js/domain/ramadanPlanner.js`
- `sanitizeinstalldeferral`: `js/domain/install.js`
- `sanitizelastposition`: `js/domain/lastPosition.js`
- `sanitizelocationprofiles`: `js/domain/locations.js`
- `sanitizememrecords`: `js/domain/hifz.js`
- `sanitizemushafprefs`: `js/core/config/sanitize.js`
- `sanitizenudgestate`: `js/domain/nudge.js`
- `sanitizeplan`: `js/domain/planExport.js`, `js/services/alertTriggers.js`
- `sanitizeqadalog`: `js/domain/qada.js`
- `sanitizequizmissrecords`: `js/domain/quiz.js`
- `sanitizereflections`: `js/domain/duaJournal.js`
- `sanitizerestoredpayload`: `js/core/state/restore.js`, `js/core/state.js`
- `sanitizerootparam`: `js/domain/roots.js`
- `sanitizesadaqahlog`: `js/domain/worship.js`
- `sanitizesettings`: `js/core/config/sanitize.js`
- `sanitizesunnahlog`: `js/domain/sunnah.js`
- `sanitizetajweedcourseprogress`: `js/domain/tajweedCourse.js`
- `sanitizewindow`: `js/domain/readerWindow.js`
- `sarf`: `js/views/tafsirPanel.js`
- `saveadhanaudio`: `js/services/audioStore.js`
- `saveaudio`: `js/services/audioStore.js`
- `savebackuphandle`: `js/services/backup.js`
- `savebatchqueue`: `js/services/audioStore.js`
- `saved`: `js/ui/toast.js`, `js/views/zakat.js`
- `saveitem`: `js/services/editor.js`
- `savestate`: `js/core/storage.js`
- `saveverseaudio`: `js/services/audioStore.js`
- `scale`: `js/app/inputs.js`, `js/core/theme.js`
- `scanned`: `js/domain/rootAwareSearch.js`
- `schedule`: `js/domain/planExport.js`
- `scheduleautoadvance`: `js/app/focusRuntime.js`
- `scheduler`: `js/domain/hifz.js`, `js/domain/reminderPresets.js`
- `schedules`: `js/services/notifications.js`
- `scheduletriggerarm`: `js/app/triggers.js`
- `schem`: `js/services/editor.js`
- `schema`: `js/core/config/app.js`, `js/core/migration.js`, `js/core/schema.js`
- `scholarly`: `js/domain/tajweedLessons.js`
- `scope`: `js/app/rt.js`
- `scoped`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/grammar.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/journal.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/domain/readerWindow.js`, `js/domain/sessionFlags.js`, `js/views/tajweedPracticeView.js`
- `scopepage`: `js/domain/searchPagination.js`
- `scoreround`: `js/domain/tajweedPractice.js`
- `scorewordround`: `js/domain/tajweedPractice.js`
- `scoring`: `js/app/practice.js`
- `screen`: `js/domain/garden.js`, `js/services/mediaSession.js`, `js/services/tasbih.js`, `js/ui/toast.js`, `js/views/ambient.js`, `js/views/editor.js`, `js/views/garden.js`, `js/views/qibla.js`, `js/views/tajweedCourseView.js`
- `screens`: `js/views/hadith.js`
- `screenshot`: `js/services/shareCard.js`
- `scripts`: `js/domain/wmm-coefs.js`
- `scrollbehavior`: `js/core/utils.js`
- `scrolltohadithlisttop`: `js/app/hadithData.js`
- `seam`: `js/views/calendar.js`
- `search`: `js/app/inputs.js`, `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/domain/hadithSearch.js`, `js/domain/launchIntents.js`, `js/domain/quranSearch.js`, `js/domain/rootAwareSearch.js`, `js/domain/search.js`, `js/domain/searchPagination.js`, `js/domain/tafsirSearch.js`, `js/ui/card.js`, `js/ui/shell.js`, `js/views/hadith.js`, `js/views/mushafPageFind.js`, `js/views/palette.js`, `js/views/search.js`
- `searchable`: `js/views/audioManager.js`, `js/views/quran.js`
- `searches`: `js/views/mushafPageFind.js`
- `searchhadith`: `js/domain/hadithSearch.js`
- `searchlibrary`: `js/views/palette.js`
- `searchquran`: `js/domain/quranSearch.js`, `js/views/palette.js`
- `searchquranexpanded`: `js/domain/quranSearch.js`
- `searchreciters`: `js/services/audioCatalog.js`, `js/views/palette.js`
- `searchroots`: `js/domain/roots.js`
- `searchsessions`: `js/domain/tajweedCourse.js`
- `searchsurahs`: `js/domain/search.js`, `js/views/palette.js`
- `searchtafsir`: `js/domain/tafsirSearch.js`
- `second`: `js/domain/translationCompare.js`, `js/views/mushafPageFind.js`
- `seconds`: `js/app/readingTimer.js`, `js/domain/sleepTimer.js`
- `section`: `js/core/config/nav.js`, `js/core/config/sanitize.js`, `js/ui/shell.js`, `js/views/library.js`
- `sections`: `js/ui/shell.js`, `js/views/category.js`, `js/views/settings.js`
- `seed`: `js/services/surahPlayback.js`, `js/views/garden.js`
- `seeds`: `js/views/garden.js`
- `seek`: `js/app/audioEngine.js`, `js/domain/playerShortcuts.js`, `js/services/player.js`, `js/views/playerBar.js`
- `seekby`: `js/services/player.js`
- `sees`: `js/domain/hadithSearch.js`
- `seg1`: `js/core/router.js`
- `seg2`: `js/core/router.js`
- `selectduealerts`: `js/services/alertTriggers.js`
- `selected`: `js/views/playerBar.js`
- `selection`: `js/domain/dailyAyah.js`
- `selector`: `js/domain/gestures.js`
- `selectors`: `js/core/state/selectors.js`, `js/core/state.js`
- `selects`: `js/views/quiz.js`
- `semantics`: `js/domain/rootAwareSearch.js`
- `send`: `js/services/shareCard.js`
- `sendtriggerplan`: `js/app/triggers.js`
- `sensor`: `js/app/compassRuntime.js`, `js/domain/compass.js`
- `sensors`: `js/domain/qibla.js`
- `separate`: `js/domain/adhkarTiming.js`, `js/domain/qibla.js`, `js/domain/sunnah.js`, `js/services/audioStore.js`
- `separation`: `js/domain/localeContent.js`
- `sequenced`: `js/domain/tajweedCourse.js`
- `server`: `js/services/notifications.js`
- `servers`: `js/services/moshafAvailability.js`
- `service`: `js/app/offlineJobs.js`, `js/app/triggers.js`, `js/domain/lastPosition.js`, `js/services/notifications.js`
- `services`: `js/app/handlers/content.js`, `js/domain/audioBatch.js`, `js/domain/hadithSearch.js`, `js/services/dhikrAudio.js`, `js/views/backupSummary.js`
- `serving`: `js/services/audioCatalog.js`
- `session`: `js/app/practice.js`, `js/app/readingTimer.js`, `js/domain/completedCards.js`, `js/domain/quiz.js`, `js/domain/sessionFlags.js`, `js/services/dhikrAudio.js`, `js/services/mediaSession.js`, `js/views/tajweedCourseView.js`, `js/views/tajweedPracticeView.js`
- `sessionflag`: `js/domain/sessionFlags.js`
- `sessions`: `js/domain/tajweedCourse.js`
- `sessionsforrule`: `js/domain/tajweedCourse.js`
- `sessionvalue`: `js/domain/sessionFlags.js`
- `setaudiocachecapfortests`: `js/services/audioStore.js`
- `setaudiofetcher`: `js/services/player.js`
- `setaudiomuted`: `js/app/audioEngine.js`
- `setbasevolume`: `js/services/surahPlayback.js`
- `setcategorydeleted`: `js/services/contentPrefs.js`
- `setcategoryhidden`: `js/services/contentPrefs.js`
- `setcompare`: `js/services/surahPlayback.js`
- `setcontinuous`: `js/services/surahPlayback.js`
- `setenabled`: `js/services/gapTelemetry.js`
- `setflipdirection`: `js/ui/readingTokens.js`, `js/views/mushafReader.js`
- `setfollow`: `js/services/surahPlayback.js`
- `setfullscreenanim`: `js/ui/readingTokens.js`, `js/views/mushafReader.js`
- `setitemdeleted`: `js/services/contentPrefs.js`
- `setitemhidden`: `js/services/contentPrefs.js`
- `setitemtarget`: `js/services/contentPrefs.js`
- `setlibrarydeleted`: `js/services/contentPrefs.js`
- `setlibraryfieldtoggles`: `js/services/contentPrefs.js`
- `setlibraryhidden`: `js/services/contentPrefs.js`
- `setlistenrepeat`: `js/services/surahPlayback.js`
- `setloop`: `js/services/surahPlayback.js`
- `setmushaftarget`: `js/ui/readingTokens.js`
- `setmushafwidelayout`: `js/services/mushaf.js`
- `setmuted`: `js/services/player.js`, `js/services/recitation.js`
- `setplaybackrate`: `js/services/recitation.js`
- `setquranindexready`: `js/domain/quranSearch.js`
- `setrate`: `js/services/player.js`
- `setreciter`: `js/services/surahPlayback.js`
- `setreciterb`: `js/services/surahPlayback.js`
- `setrepeat`: `js/services/surahPlayback.js`
- `setsessionflag`: `js/domain/sessionFlags.js`
- `setsessionvalue`: `js/domain/sessionFlags.js`
- `setspeed`: `js/services/surahPlayback.js`
- `settarget`: `js/services/tasbih.js`
- `settimeout`: `js/services/notifications.js`
- `settingrow`: `js/views/settings.js`
- `settings`: `js/app/renderer.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/core/i18n.js`, `js/core/state/slices/shell.js`, `js/core/theme.js`, `js/domain/homePanels.js`, `js/domain/locations.js`, `js/domain/tajweedSources.js`, `js/services/dataHealth.js`, `js/services/prayerSound.js`, `js/views/ambient.js`, `js/views/installRow.js`, `js/views/qibla.js`, `js/views/settings.js`
- `settingssectionforslug`: `js/views/settings.js`
- `settingssectionids`: `js/views/settings.js`
- `settingssectionscrolltarget`: `js/app/renderer.js`
- `settingsslugforsection`: `js/views/settings.js`
- `settles`: `js/core/idb/openDB.js`
- `setvolume`: `js/services/player.js`, `js/services/recitation.js`
- `seven`: `js/core/config/nav.js`, `js/domain/lastPosition.js`, `js/ui/shell.js`, `js/views/zakat.js`
- `seventeen`: `js/domain/tajweedCourse.js`
- `several`: `js/domain/search.js`
- `shade`: `js/services/mediaSession.js`
- `shape`: `js/core/router.js`, `js/core/theme.js`, `js/services/editor.js`, `js/ui/skeleton.js`
- `shaped`: `js/core/migration.js`, `js/domain/tajweedCourse.js`
- `shapes`: `js/core/config/views.js`
- `share`: `js/domain/launchIntents.js`, `js/views/ayahStudy.js`, `js/views/collection.js`
- `shareable`: `js/services/shareCard.js`
- `shareayahcard`: `js/app/handlers/items.js`
- `shared`: `js/app/audioEngine.js`, `js/app/fileImports.js`, `js/app/shared.js`, `js/core/state/streak.js`, `js/domain/audioQueue.js`, `js/domain/celebrate.js`, `js/services/recitation.js`, `js/ui/emptyState.js`, `js/views/backupSummary.js`, `js/views/hadithCard.js`, `js/views/installRow.js`, `js/views/studyContext.js`, `js/views/tafsirPanel.js`, `js/views/viewSheets.js`
- `sharing`: `js/domain/planExport.js`
- `sheet`: `js/app/handlers/viewMenus.js`, `js/ui/menus.js`, `js/ui/viewSheet.js`
- `sheetlinkrow`: `js/ui/viewSheet.js`
- `sheetrow`: `js/ui/viewSheet.js`
- `sheets`: `js/views/viewSheets.js`
- `sheettogglerow`: `js/ui/viewSheet.js`
- `shell`: `js/app/renderer.js`, `js/core/state/slices/shell.js`, `js/ui/shell.js`
- `shimmer`: `js/ui/skeleton.js`
- `ship`: `js/services/dhikrAudio.js`
- `shipped`: `js/domain/hadithStudy.js`
- `ships`: `js/services/floatingCounter.js`
- `short`: `js/services/soundDesign.js`, `js/ui/emptyState.js`, `js/views/kids.js`, `js/views/quiz.js`
- `shortcut`: `js/app/audioEngine.js`, `js/ui/shell.js`
- `shortcutactionforkey`: `js/domain/playerShortcuts.js`
- `shot`: `js/app/tickers.js`, `js/domain/sessionFlags.js`, `js/services/dhikrAudio.js`, `js/ui/readingTokens.js`
- `shouldfire`: `js/services/notifications.js`
- `shouldmarkviewenter`: `js/app/renderer.js`
- `shouldreofferinstall`: `js/domain/install.js`
- `shouldshowinvite`: `js/domain/homeInvitations.js`
- `shouldshownudge`: `js/domain/nudge.js`
- `shouldshowonboarding`: `js/domain/onboarding.js`
- `show`: `js/ui/modal.js`
- `showing`: `js/domain/translationCompare.js`
- `shown`: `js/app/readingTimer.js`, `js/app/tickers.js`, `js/domain/prayerLog.js`, `js/domain/searchPagination.js`
- `shows`: `js/views/calendar.js`, `js/views/journal.js`, `js/views/roots.js`
- `showtoast`: `js/ui/toast.js`
- `showtranslationfor`: `js/domain/localeContent.js`
- `showtransliterationfor`: `js/domain/localeContent.js`
- `shuffle`: `js/views/quiz.js`
- `shuffled`: `js/app/quizDeck.js`
- `side`: `js/app/fullscreen.js`, `js/domain/audioQueue.js`, `js/domain/statistics.js`, `js/services/notifications.js`, `js/ui/shell.js`
- `silence`: `js/domain/sleepTimer.js`
- `silently`: `js/core/migration.js`, `js/services/alertTriggers.js`
- `silver`: `js/domain/zakat.js`, `js/views/zakat.js`
- `similar`: `js/domain/mutashabihat.js`
- `simple`: `js/domain/qada.js`, `js/views/checklist.js`
- `simply`: `js/ui/card.js`
- `since`: `js/app.js`, `js/core/config.js`, `js/core/state/reducer.js`, `js/core/state.js`, `js/domain/search.js`, `js/views/search.js`
- `single`: `js/app/audioEngine.js`, `js/app/focusRuntime.js`, `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`, `js/app/quranData.js`, `js/app/stateSub.js`, `js/app/tafsirSearch.js`, `js/core/config/nav.js`, `js/core/state/reducer.js`, `js/core/state.js`, `js/domain/compass.js`, `js/services/dhikrAudio.js`, `js/ui/modal.js`, `js/ui/readingTokens.js`, `js/views/calendar.js`, `js/views/collection.js`, `js/views/viewSheets.js`
- `site`: `js/app/quizDeck.js`
- `sits`: `js/app/readingTimer.js`
- `sitting`: `js/domain/completedCards.js`
- `size`: `js/domain/grammarDrill.js`, `js/domain/readerWindow.js`, `js/domain/roots.js`, `js/domain/tajweedPractice.js`, `js/services/hadith.js`, `js/views/journal.js`
- `sizes`: `js/core/config/app.js`, `js/domain/searchPagination.js`
- `skeletonayahcards`: `js/ui/skeleton.js`
- `skeletonhadithcard`: `js/ui/skeleton.js`
- `skeletonlines`: `js/ui/skeleton.js`
- `skeletonmushafpage`: `js/ui/skeleton.js`
- `skeletonreciterrows`: `js/ui/skeleton.js`
- `skeletonsurahlist`: `js/ui/skeleton.js`
- `skip`: `js/domain/onboarding.js`, `js/services/surahPlayback.js`, `js/views/onboardingPanel.js`
- `skipped`: `js/services/alertTriggers.js`
- `sleep`: `js/domain/sleepTimer.js`, `js/services/surahPlayback.js`
- `sleepsnapshot`: `js/services/player.js`, `js/services/surahPlayback.js`
- `sleeptickfortests`: `js/services/player.js`
- `slice`: `js/core/state/reducer.js`, `js/core/state/slices/audio.js`, `js/core/state/slices/hadith.js`, `js/core/state/slices/library.js`, `js/core/state/slices/quran.js`, `js/core/state/slices/shell.js`, `js/core/state/slices/worship.js`, `js/services/checklist.js`
- `slices`: `js/core/state/reducer.js`, `js/core/state/slices/hadith.js`
- `sliders`: `js/app/inputs.js`
- `slots`: `js/domain/lastPosition.js`, `js/services/audioStore.js`
- `slow`: `js/domain/ambient.js`
- `slugs`: `js/core/config/sanitize.js`
- `small`: `js/core/config/app.js`, `js/core/icons.js`, `js/core/utils.js`, `js/domain/planExport.js`, `js/ui/menus.js`, `js/ui/viewSheet.js`, `js/views/zakat.js`
- `smoothing`: `js/app/compassRuntime.js`
- `smoothk`: `js/services/surahPlayback.js`
- `snapshot`: `js/services/surahPlayback.js`, `js/views/backupSummary.js`
- `snapshots`: `js/views/zakat.js`
- `soft`: `js/services/soundDesign.js`, `js/ui/emptyState.js`
- `solar`: `js/domain/prayer.js`, `js/views/ramadan.js`
- `something`: `js/domain/celebrate.js`, `js/services/floatingCounter.js`
- `sort`: `js/views/favorites.js`
- `sortable`: `js/views/favorites.js`
- `sortfavorites`: `js/views/favorites.js`
- `sorts`: `js/views/favorites.js`
- `sound`: `js/domain/mutashabihat.js`, `js/services/prayerSound.js`, `js/services/soundDesign.js`, `js/views/settings.js`
- `sounddesign`: `js/services/audioContext.js`
- `sounds`: `js/services/soundDesign.js`
- `source`: `js/app/fullscreen.js`, `js/core/config/nav.js`, `js/core/state.js`, `js/domain/wmm-coefs.js`, `js/views/tafsirPanel.js`
- `sourced`: `js/domain/lexicalProvenance.js`
- `sources`: `js/domain/tajweedSources.js`, `js/domain/worship.js`
- `space`: `js/domain/playerShortcuts.js`
- `spaced`: `js/domain/hifz.js`
- `spam`: `js/views/favorites.js`
- `spanbetween`: `js/domain/prayerTimeline.js`
- `spans`: `js/domain/prayerTimeline.js`
- `speakitem`: `js/services/speech.js`
- `spec`: `js/services/dataHealth.js`
- `specific`: `js/domain/tafsirSearch.js`
- `speech`: `js/core/state/slices/library.js`
- `speechsynthesis`: `js/services/speech.js`
- `speed`: `js/ui/recitationConsole.js`
- `spin`: `js/services/audioContext.js`
- `spine`: `js/domain/tajweedCourse.js`, `js/views/tajweedCourseView.js`
- `split`: `js/core/config/app.js`, `js/core/config/quran.js`, `js/core/config/sanitize.js`, `js/core/config/views.js`, `js/core/i18n/ar.js`, `js/core/i18n/en.js`, `js/core/state.js`
- `splitayahword`: `js/domain/roots.js`
- `spliteditions`: `js/domain/wordStudy.js`
- `spotlight`: `js/app/palette.js`, `js/views/palette.js`
- `spreadleftpage`: `js/services/mushaf.js`
- `spreadrightpage`: `js/services/mushaf.js`
- `sprite`: `js/core/icons.js`
- `stack`: `js/views/prayer.js`
- `stage`: `js/domain/tajweedCourse.js`
- `stageprogress`: `js/domain/tajweedCourse.js`
- `stages`: `js/domain/garden.js`, `js/domain/tajweedCourse.js`
- `stale`: `js/domain/homePanels.js`, `js/services/backup.js`
- `standalone`: `js/services/tasbih.js`
- `standard`: `js/domain/prayer.js`, `js/views/tajweedSettings.js`
- `standards`: `js/domain/reflections.js`
- `stars`: `js/domain/kids.js`, `js/views/kids.js`
- `start`: `js/app/quizDeck.js`, `js/domain/compass.js`, `js/services/surahPlayback.js`, `js/views/mushafPlayer.js`
- `startadhan`: `js/services/prayerSound.js`
- `startaudioplay`: `js/app/audioEngine.js`
- `startclassifyround`: `js/app/practice.js`
- `startcompassifneeded`: `js/app/compassRuntime.js`
- `startpracticeround`: `js/app/practice.js`
- `startscheduler`: `js/services/notifications.js`
- `startversesurah`: `js/app/handlers/quranAudio.js`
- `states`: `js/domain/lexicalProvenance.js`, `js/ui/missingData.js`
- `static`: `js/core/config.js`
- `statically`: `js/views/hadithCard.js`
- `statistics`: `js/app/readingTimer.js`, `js/core/state/slices/library.js`, `js/domain/statistics.js`
- `stats`: `js/core/state/slices/quran.js`, `js/services/gapTelemetry.js`
- `statscsvfilename`: `js/domain/statistics.js`
- `status`: `js/core/state/slices/shell.js`, `js/ui/toast.js`, `js/views/installRow.js`, `js/views/khatma.js`, `js/views/offline.js`
- `stay`: `js/domain/contentLens.js`, `js/views/offline.js`
- `step`: `js/domain/onboarding.js`, `js/domain/playerShortcuts.js`, `js/ui/recitationConsole.js`, `js/views/ayahStudy.js`, `js/views/installRow.js`, `js/views/khatma.js`, `js/views/mushafBookmarks.js`, `js/views/onboardingPanel.js`
- `steps`: `js/domain/onboarding.js`
- `stop`: `js/domain/compass.js`, `js/domain/sleepTimer.js`, `js/services/player.js`, `js/services/recitation.js`, `js/services/speech.js`, `js/services/surahPlayback.js`
- `stopadhan`: `js/services/prayerSound.js`
- `stopcompass`: `js/app/compassRuntime.js`
- `stopdhikraudio`: `js/services/dhikrAudio.js`
- `stopofflinebatch`: `js/app/offlineJobs.js`
- `stopscheduler`: `js/services/notifications.js`
- `stor`: `js/domain/zakat.js`
- `storage`: `js/app/tickers.js`, `js/core/config/app.js`, `js/core/schema.js`, `js/core/utils.js`, `js/domain/prayerLog.js`, `js/services/audioStore.js`, `js/services/calendarNotes.js`, `js/views/offline.js`
- `storageavailable`: `js/core/utils.js`
- `store`: `js/app/boot.js`, `js/app/handlers/offline.js`, `js/app/installPrompt.js`, `js/app/palette.js`, `js/app/stateSub.js`, `js/core/state/reducer.js`, `js/core/state/slices/audio.js`, `js/core/state/slices/hadith.js`, `js/core/state/slices/library.js`, `js/core/state/slices/quran.js`, `js/core/state/slices/shell.js`, `js/core/state/slices/worship.js`, `js/core/state/store.js`, `js/core/state.js`, `js/domain/audioBatch.js`, `js/domain/prayerExport.js`, `js/domain/quiz.js`, `js/domain/ramadan.js`, `js/domain/translationCompare.js`, `js/services/backup.js`
- `stored`: `js/core/config/sanitize.js`
- `streak`: `js/core/state/streak.js`, `js/domain/nudge.js`, `js/domain/statistics.js`, `js/domain/sunnah.js`
- `streakcoaching`: `js/domain/statistics.js`
- `streaming`: `js/services/recitation.js`
- `strict`: `js/domain/localeContent.js`
- `strictly`: `js/app/fullscreen.js`
- `string`: `js/domain/launchIntents.js`, `js/domain/prayerExport.js`, `js/views/khatma.js`, `js/views/mushafBookmarks.js`
- `strings`: `js/core/icons.js`
- `strip`: `js/domain/prayerTimeline.js`, `js/views/prayer.js`
- `stripcategoryitemkeys`: `js/domain/contentLens.js`
- `stripcategorykeys`: `js/domain/contentLens.js`
- `striplibrarykeys`: `js/domain/contentLens.js`
- `stripposition`: `js/domain/prayerTimeline.js`
- `stripquranannotations`: `js/core/utils.js`, `js/domain/quranSearch.js`
- `structuralkey`: `js/app/renderer.js`
- `study`: `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/views/ayahStudy.js`, `js/views/studyContext.js`, `js/views/studyTray.js`, `js/views/tafsirPanel.js`
- `studycontexthtml`: `js/views/studyContext.js`
- `studycontextof`: `js/views/studyContext.js`
- `studycontextparams`: `js/views/studyContext.js`
- `studyhadithquery`: `js/domain/hadithSearch.js`
- `studytraykey`: `js/views/studyTray.js`
- `style`: `js/app/palette.js`, `js/views/palette.js`
- `styled`: `js/services/shareCard.js`
- `styles`: `js/core/config/sanitize.js`
- `subscriber`: `js/app/stateSub.js`
- `substring`: `js/domain/hadithSearch.js`
- `substrings`: `js/domain/rootAwareSearch.js`
- `subsystem`: `js/app/boot.js`
- `subtle`: `js/services/soundDesign.js`
- `success`: `js/core/storage.js`
- `suggestdailytarget`: `js/domain/khatma.js`
- `suggestfromkhatma`: `js/domain/hifz.js`
- `suggestions`: `js/core/config/app.js`
- `suhoor`: `js/core/config/app.js`, `js/domain/ramadan.js`, `js/domain/ramadanPlanner.js`, `js/views/ramadan.js`
- `summaries`: `js/domain/wordStudy.js`
- `summarize`: `js/services/gapTelemetry.js`
- `summary`: `js/domain/review.js`, `js/views/backupSummary.js`
- `sunnah`: `js/core/state/slices/worship.js`, `js/domain/fasting.js`, `js/domain/sunnah.js`, `js/views/prayer.js`
- `sunnahcount`: `js/domain/sunnah.js`
- `sunnahpanelhtml`: `js/views/prayer.js`
- `sunnahtoday`: `js/domain/sunnah.js`
- `sunnahweek`: `js/domain/sunnah.js`
- `supplied`: `js/domain/garden.js`
- `support`: `js/domain/hifz.js`
- `supported`: `js/app/triggers.js`, `js/services/backup.js`
- `surah`: `js/app/audioEngine.js`, `js/app/quranData.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/domain/audioQueue.js`, `js/domain/grammarDrill.js`, `js/domain/hifz.js`, `js/domain/kids.js`, `js/domain/lastPosition.js`, `js/domain/milestones.js`, `js/domain/reminderPresets.js`, `js/domain/sleepTimer.js`, `js/services/audioCatalog.js`, `js/services/dhikrAudio.js`, `js/services/moshafAvailability.js`, `js/services/player.js`, `js/services/surahPlayback.js`, `js/ui/skeleton.js`, `js/views/kids.js`, `js/views/playerBar.js`, `js/views/quran.js`
- `surahnumber`: `js/services/audioStore.js`
- `surahpagecounts`: `js/domain/statistics.js`
- `surahpagerange`: `js/domain/hifz.js`
- `surahplayback`: `js/domain/audioQueue.js`
- `surahs`: `js/domain/kids.js`, `js/services/moshafAvailability.js`, `js/views/kids.js`, `js/views/palette.js`, `js/views/quran.js`
- `surahstartpage`: `js/services/mushaf.js`
- `surahurl`: `js/services/audioCatalog.js`
- `surface`: `js/core/config/nav.js`, `js/core/fetch.js`, `js/core/state/reducer.js`, `js/core/state.js`, `js/domain/gestures.js`, `js/ui/emptyState.js`, `js/views/mushafPageFind.js`, `js/views/studyContext.js`
- `surfaces`: `js/ui/skeleton.js`, `js/views/mushafPlayer.js`
- `surfacing`: `js/domain/adhkarTiming.js`
- `swapped`: `js/domain/mutashabihat.js`
- `swatch`: `js/views/tajweedSettings.js`
- `swinstallmessageaction`: `js/domain/install.js`
- `swipe`: `js/domain/gestures.js`
- `switch`: `js/core/state/reducer.js`
- `switched`: `js/domain/locations.js`, `js/views/ambient.js`
- `switching`: `js/app/quranData.js`
- `sync`: `js/services/appBadge.js`, `js/services/mediaSession.js`
- `syncappbadge`: `js/services/appBadge.js`
- `synced`: `js/domain/sessionFlags.js`
- `synchronously`: `js/domain/tajweedSources.js`
- `syncmetadata`: `js/services/mediaSession.js`
- `syncplayeridlearmed`: `js/app/audioEngine.js`
- `syncplayingstate`: `js/services/mediaSession.js`
- `syncreadingtimer`: `js/app/readingTimer.js`
- `synonyms`: `js/domain/lexicalProvenance.js`
- `synthesized`: `js/services/prayerSound.js`
- `system`: `js/app.js`, `js/core/icons.js`, `js/domain/prayerExport.js`
- `table`: `js/app/handlers/audio.js`, `js/app/handlers/editor.js`, `js/app/handlers/hifz.js`, `js/app/handlers/items.js`, `js/app/handlers/location.js`, `js/app/handlers/navigation.js`, `js/app/handlers/quiz.js`, `js/app/handlers/quranAudio.js`, `js/app/handlers/system.js`, `js/app/handlers/tasbih.js`, `js/app/handlers/worship.js`, `js/app/handlers/zakat.js`
- `tabs`: `js/views/journal.js`, `js/views/tafsirPanel.js`
- `tabular`: `js/domain/calendar.js`
- `tafsir`: `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/domain/tafsirSearch.js`, `js/ui/skeleton.js`, `js/views/ayahStudy.js`, `js/views/tafsirPanel.js`
- `tafsirindexedition`: `js/domain/tafsirSearch.js`
- `tafsirindexsize`: `js/domain/tafsirSearch.js`
- `tafsirurls`: `js/domain/offline.js`
- `tahajjud`: `js/domain/sunnah.js`
- `tajweed`: `js/app/practice.js`, `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/domain/tajweed.js`, `js/domain/tajweedLessons.js`, `js/domain/tajweedPractice.js`, `js/domain/tajweedSources.js`, `js/views/tajweedCourseView.js`, `js/views/tajweedSettings.js`
- `tajweedcitation`: `js/domain/tajweedSources.js`
- `tajweedcourse`: `js/views/tajweedCourseView.js`
- `tajweedlessonexamples`: `js/domain/tajweedLessons.js`
- `tajweedlessonrule`: `js/domain/tajweedLessons.js`
- `tajweedmissclear`: `js/domain/tajweedPractice.js`
- `tajweedmissrecord`: `js/domain/tajweedPractice.js`
- `tajweedpractice`: `js/app/practice.js`
- `tajweedprefsof`: `js/domain/tajweed.js`
- `tajweedrule`: `js/domain/tajweed.js`
- `takeovermanualzoom`: `js/app/autoFit.js`
- `tapping`: `js/views/studyTray.js`
- `taraweeh`: `js/domain/ramadanPlanner.js`, `js/services/moshafAvailability.js`
- `taraweehcount`: `js/domain/ramadanPlanner.js`
- `target`: `js/domain/completedCards.js`, `js/domain/launchIntents.js`, `js/services/contentPrefs.js`, `js/views/category.js`
- `targets`: `js/domain/planExport.js`
- `tasbih`: `js/core/config/app.js`, `js/core/state/slices/library.js`, `js/domain/celebrate.js`, `js/domain/planExport.js`, `js/services/audioContext.js`, `js/services/tasbih.js`
- `telemetry`: `js/services/gapTelemetry.js`
- `template`: `js/ui/card.js`
- `templates`: `js/views/khatma.js`, `js/views/mushafBookmarks.js`, `js/views/tafsirPanel.js`, `js/views/tajweedCourseView.js`, `js/views/tajweedPracticeView.js`
- `test`: `js/app/offlineJobs.js`, `js/services/dataHealth.js`, `js/services/prayerSound.js`
- `testable`: `js/domain/adhkarTiming.js`, `js/domain/khatma.js`
- `tested`: `js/domain/reflections.js`, `js/services/appBadge.js`, `js/services/mediaSession.js`, `js/views/onboardingPanel.js`
- `tests`: `js/domain/hifz.js`, `js/services/notifications.js`
- `text`: `js/app/quranSearch.js`, `js/app/tafsirSearch.js`, `js/core/config/quran.js`, `js/core/config/views.js`, `js/domain/duaJournal.js`, `js/domain/gestures.js`, `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`, `js/domain/tajweed.js`, `js/views/ambient.js`, `js/views/journal.js`, `js/views/mushafPageFind.js`, `js/views/mutashabihat.js`, `js/views/offline.js`, `js/views/studyContext.js`
- `texts`: `js/domain/hadithStudy.js`
- `theme`: `js/app/stateSub.js`, `js/core/config/views.js`, `js/core/theme.js`, `js/domain/dailyAyah.js`, `js/ui/shell.js`
- `themes`: `js/domain/dailyAyah.js`
- `themselves`: `js/services/shareCard.js`
- `thin`: `js/app/handlers/offline.js`, `js/domain/compass.js`, `js/services/appBadge.js`, `js/services/mediaSession.js`, `js/services/speech.js`
- `things`: `js/views/palette.js`
- `third`: `js/domain/tajweed.js`
- `thousand`: `js/domain/search.js`
- `three`: `js/app/fullscreen.js`, `js/domain/homeInvitations.js`, `js/domain/onboarding.js`, `js/domain/ramadanPlanner.js`, `js/domain/reflections.js`, `js/ui/recitationConsole.js`, `js/views/onboardingPanel.js`
- `thresholds`: `js/domain/zakat.js`
- `throttle`: `js/app/triggers.js`, `js/core/utils.js`
- `through`: `js/app/handlers/content.js`, `js/app/offlineJobs.js`, `js/app/stateSub.js`, `js/core/fetch.js`, `js/domain/offline.js`, `js/domain/statistics.js`, `js/services/recitation.js`, `js/views/focus.js`, `js/views/viewSheets.js`
- `throughout`: `js/ui/menus.js`
- `throws`: `js/core/storage.js`
- `thursdays`: `js/domain/fasting.js`
- `tick`: `js/views/settings.js`
- `ticker`: `js/app/stateSub.js`
- `tickers`: `js/app/tickers.js`
- `tickfortests`: `js/services/notifications.js`
- `tier`: `js/services/soundDesign.js`
- `tiers`: `js/app/renderer.js`
- `tighter`: `js/services/audioContext.js`
- `tikaf`: `js/domain/ramadanPlanner.js`
- `tile`: `js/domain/quickTiles.js`
- `tiles`: `js/domain/quickTiles.js`, `js/views/kids.js`, `js/views/library.js`
- `time`: `js/domain/adhkarTiming.js`, `js/domain/prayer.js`, `js/domain/qada.js`, `js/services/prayerSound.js`, `js/views/focus.js`, `js/views/playerBar.js`
- `timeline`: `js/domain/prayerTimeline.js`
- `timeout`: `js/app/net.js`, `js/core/fetch.js`
- `timer`: `js/app/focusRuntime.js`, `js/app/readingTimer.js`, `js/domain/sleepTimer.js`, `js/services/surahPlayback.js`
- `times`: `js/domain/fasting.js`, `js/domain/locations.js`, `js/domain/prayerExport.js`, `js/domain/prayerTimeline.js`, `js/views/prayer.js`, `js/views/qibla.js`, `js/views/ramadan.js`
- `timestamptriggers`: `js/app/triggers.js`
- `timetablecell`: `js/domain/prayerExport.js`
- `tint`: `js/services/shareCard.js`
- `tiny`: `js/app.js`
- `title`: `js/ui/emptyState.js`, `js/ui/shell.js`, `js/views/installRow.js`
- `toast`: `js/ui/toast.js`
- `today`: `js/app/readingTimer.js`, `js/domain/worship.js`
- `todayreadingsec`: `js/views/statistics.js`
- `todo`: `js/domain/fasting.js`, `js/domain/nudge.js`, `js/domain/review.js`, `js/services/dataHealth.js`, `js/services/surahPlayback.js`
- `toeasternarabicnumerals`: `js/core/utils.js`
- `toggle`: `js/services/player.js`, `js/ui/shell.js`, `js/views/category.js`, `js/views/tajweedSettings.js`
- `toggleaudiomute`: `js/app/audioEngine.js`
- `togregorian`: `js/domain/calendar.js`
- `tohijri`: `js/domain/calendar.js`
- `tokens`: `js/ui/readingTokens.js`
- `tones`: `js/services/prayerSound.js`
- `topbar`: `js/app/renderer.js`
- `topsurahsbypages`: `js/domain/statistics.js`
- `total`: `js/core/utils.js`
- `totalinlastdays`: `js/domain/statistics.js`
- `touch`: `js/core/storage.js`, `js/domain/gestures.js`, `js/services/mediaSession.js`
- `touches`: `js/core/schema.js`
- `track`: `js/services/player.js`
- `tracked`: `js/domain/review.js`
- `tracker`: `js/domain/fasting.js`, `js/domain/qada.js`, `js/domain/sunnah.js`, `js/views/checklist.js`, `js/views/khatma.js`, `js/views/prayer.js`, `js/views/ramadan.js`
- `transient`: `js/core/state/slices/hadith.js`, `js/domain/celebrate.js`, `js/views/tajweedPracticeView.js`
- `transients`: `js/core/state/slices/audio.js`, `js/core/state/slices/library.js`, `js/ui/readingTokens.js`
- `transitions`: `js/core/state/reducer.js`
- `translation`: `js/app/quranData.js`, `js/app/quranSearch.js`, `js/core/config/quran.js`, `js/core/i18n.js`, `js/domain/localeContent.js`, `js/domain/quranSearch.js`, `js/domain/translationCompare.js`, `js/services/moshafAvailability.js`, `js/views/ayahStudy.js`, `js/views/quran.js`, `js/views/search.js`
- `translationbmap`: `js/app/quranData.js`, `js/domain/translationCompare.js`
- `translationfor`: `js/domain/localeContent.js`
- `translationlabel`: `js/services/audioCatalog.js`
- `translations`: `js/core/i18n/ar.js`, `js/core/i18n/en.js`
- `translationurls`: `js/domain/offline.js`
- `transliterati`: `js/services/speech.js`
- `transliteration`: `js/domain/localeContent.js`, `js/domain/rootAwareSearch.js`
- `transport`: `js/core/fetch.js`
- `travel`: `js/domain/locations.js`
- `traveler`: `js/views/prayer.js`
- `traveling`: `js/domain/moods.js`
- `tray`: `js/views/studyTray.js`
- `treatment`: `js/ui/emptyState.js`
- `treats`: `js/app/renderer.js`
- `tree`: `js/core/config/views.js`, `js/domain/garden.js`
- `trigger`: `js/app/triggers.js`, `js/core/state/slices/shell.js`, `js/services/alertTriggers.js`
- `triggerripple`: `js/app/handlers/items.js`
- `triggers`: `js/app/stateSub.js`
- `triggerssupported`: `js/services/alertTriggers.js`
- `trivial`: `js/domain/ramadan.js`
- `trivially`: `js/domain/adhkarTiming.js`, `js/domain/khatma.js`
- `true`: `js/app/fullscreen.js`, `js/domain/contentLens.js`, `js/domain/homePanels.js`, `js/domain/rootAwareSearch.js`, `js/domain/wmm.js`
- `truth`: `js/app/fullscreen.js`, `js/core/config/nav.js`, `js/core/state.js`
- `turn`: `js/domain/gestures.js`, `js/services/soundDesign.js`
- `turns`: `js/domain/compass.js`, `js/views/category.js`
- `type`: `js/core/config/views.js`
- `types`: `js/services/calendarNotes.js`
- `uncitedsessions`: `js/domain/tajweedCourse.js`
- `uncitedtajweedrules`: `js/domain/tajweedSources.js`
- `undefined`: `js/core/state/slices/hadith.js`
- `undo`: `js/services/editor.js`
- `unfavorite`: `js/views/favorites.js`
- `unified`: `js/core/migration.js`, `js/core/schema.js`, `js/domain/lastPosition.js`, `js/views/backupSummary.js`
- `unifiedsearch`: `js/domain/rootAwareSearch.js`
- `unifies`: `js/ui/missingData.js`
- `unit`: `js/domain/khatma.js`, `js/domain/launchIntents.js`, `js/domain/reflections.js`, `js/services/appBadge.js`, `js/services/mediaSession.js`
- `units`: `js/domain/zakat.js`
- `unkn`: `js/views/favorites.js`
- `unknown`: `js/core/migration.js`, `js/domain/grades.js`, `js/domain/homePanels.js`, `js/ui/missingData.js`
- `until`: `js/domain/sleepTimer.js`, `js/services/alertTriggers.js`
- `unwireaudioshortcutsfortests`: `js/app/audioEngine.js`
- `upcomingfastingdays`: `js/domain/fasting.js`
- `update`: `js/services/editor.js`
- `updateambienttickerlifecycle`: `js/app/tickers.js`
- `updateambientwakelifecycle`: `js/app/fullscreen.js`
- `updatecategory`: `js/services/editor.js`
- `updatecompasslifecycle`: `js/app/audioEngine.js`
- `updatefloatingcounter`: `js/services/floatingCounter.js`
- `updatehometickerlifecycle`: `js/app/tickers.js`
- `updatelibrary`: `js/services/editor.js`
- `updatemushafautofitlifecycle`: `js/app/autoFit.js`
- `updatepalette`: `js/app/palette.js`
- `updateprayertickerlifecycle`: `js/app/tickers.js`
- `updateqiblacompassdom`: `js/views/qibla.js`
- `updateramadanlifecycle`: `js/app/tickers.js`
- `updates`: `js/app/palette.js`
- `upgrade`: `js/core/idb/openDB.js`
- `upserts`: `js/domain/quiz.js`
- `urls`: `js/core/config/quran.js`, `js/domain/launchIntents.js`
- `usage`: `js/core/i18n.js`, `js/domain/quickTiles.js`
- `usagetileorder`: `js/domain/quickTiles.js`
- `user`: `js/app/fileImports.js`, `js/domain/contentLens.js`, `js/domain/dailyAyah.js`, `js/domain/duaJournal.js`, `js/domain/garden.js`, `js/services/audioCatalog.js`, `js/services/audioStore.js`, `js/services/calendarNotes.js`, `js/services/contentPrefs.js`, `js/services/editor.js`, `js/views/audioManager.js`, `js/views/journal.js`, `js/views/mushafBookmarks.js`
- `uservolume`: `js/services/player.js`
- `uthmani`: `js/domain/quranSearch.js`, `js/domain/tafsirSearch.js`, `js/domain/tajweed.js`, `js/views/search.js`
- `validate`: `js/services/backup.js`
- `validateadhanfile`: `js/services/audioStore.js`, `js/services/prayerSound.js`
- `validatecustomserver`: `js/services/audioCatalog.js`
- `validated`: `js/app/fileImports.js`
- `validatedocument`: `js/core/schema.js`
- `validatehadithdoc`: `js/services/hadith.js`
- `validatehadithindex`: `js/services/hadith.js`
- `validating`: `js/app/offlineJobs.js`
- `validation`: `js/core/schema.js`
- `validdaykey`: `js/core/state/streak.js`
- `value`: `js/core/storage.js`, `js/domain/prayerLog.js`
- `values`: `js/domain/grades.js`
- `variables`: `js/core/theme.js`
- `variants`: `js/services/moshafAvailability.js`
- `vars`: `js/domain/tajweed.js`
- `verb`: `js/domain/grammarDrill.js`, `js/domain/wordStudy.js`
- `verbatim`: `js/views/quiz.js`
- `verse`: `js/core/config/quran.js`, `js/domain/ambient.js`, `js/domain/audioQueue.js`, `js/domain/dailyAyah.js`, `js/domain/playerShortcuts.js`, `js/domain/reminderPresets.js`, `js/services/recitation.js`, `js/services/surahPlayback.js`, `js/views/ambient.js`
- `verseaudiocandidates`: `js/services/surahPlayback.js`
- `versedownloadcandidates`: `js/services/surahPlayback.js`
- `versekey`: `js/services/audioStore.js`
- `versemetadata`: `js/services/mediaSession.js`
- `version`: `js/core/config/app.js`, `js/core/config.js`, `js/core/schema.js`, `js/domain/planExport.js`
- `vibrate`: `js/core/utils.js`
- `vibration`: `js/views/settings.js`
- `viewkeyof`: `js/app/renderer.js`
- `viewmenubutton`: `js/ui/viewSheet.js`
- `viewmenus`: `js/views/viewSheets.js`
- `views`: `js/app/palette.js`, `js/core/config/views.js`, `js/domain/adhkarTiming.js`, `js/domain/dailyAyah.js`, `js/domain/grades.js`, `js/domain/quickTiles.js`, `js/domain/readerWindow.js`, `js/domain/sessionFlags.js`, `js/domain/statistics.js`, `js/ui/modal.js`, `js/ui/readingTokens.js`, `js/views/ayahStudy.js`, `js/views/hadithCard.js`, `js/views/khatma.js`, `js/views/library.js`, `js/views/mood.js`, `js/views/mushafBookmarks.js`
- `viewsheet`: `js/ui/viewSheet.js`, `js/views/viewSheets.js`
- `virtuefor`: `js/domain/localeContent.js`
- `visibility`: `js/domain/homePanels.js`, `js/domain/quickTiles.js`
- `visible`: `js/domain/homePanels.js`, `js/views/garden.js`, `js/views/mushafPageFind.js`
- `visiblecategoryitems`: `js/services/contentPrefs.js`
- `visual`: `js/ui/viewSheet.js`
- `visualization`: `js/domain/garden.js`
- `vocabulary`: `js/domain/grades.js`
- `voice`: `js/services/speech.js`
- `voices`: `js/app/audioEngine.js`
- `volumeat`: `js/domain/sleepTimer.js`
- `volumes`: `js/ui/skeleton.js`
- `voluntary`: `js/domain/fasting.js`
- `voluntaryfastcount`: `js/domain/fasting.js`
- `walking`: `js/services/floatingCounter.js`
- `walks`: `js/domain/offline.js`
- `wall`: `js/app/readingTimer.js`
- `warm`: `js/app/hadithData.js`, `js/domain/nudge.js`
- `warmhadithdaily`: `js/app/hadithData.js`
- `warms`: `js/app/offlineJobs.js`, `js/domain/offline.js`
- `warmvoices`: `js/services/speech.js`
- `wascelebrated`: `js/domain/celebrate.js`
- `wascompletedrecently`: `js/domain/completedCards.js`
- `wasdayfired`: `js/services/notifications.js`
- `wasjustcompleted`: `js/services/tasbih.js`
- `watchsystemtheme`: `js/core/theme.js`
- `wave`: `js/domain/completedCards.js`, `js/domain/gestures.js`, `js/domain/reflections.js`
- `weakquizids`: `js/domain/quiz.js`
- `weaktajweedrules`: `js/domain/tajweedPractice.js`
- `wealth`: `js/domain/zakat.js`
- `webp7`: `js/domain/garden.js`
- `week`: `js/domain/kids.js`, `js/views/checklist.js`, `js/views/journal.js`, `js/views/kids.js`
- `weekly`: `js/app/handlers/journal.js`, `js/domain/duaJournal.js`, `js/ui/calendarModals.js`, `js/views/journal.js`
- `weekwindow`: `js/domain/statistics.js`
- `well`: `js/domain/calendar.js`, `js/domain/search.js`
- `were`: `js/app/rt.js`
- `whatever`: `js/domain/grammarDrill.js`
- `whether`: `js/services/calendarNotes.js`
- `white`: `js/domain/fasting.js`, `js/ui/calendarModals.js`
- `whole`: `js/domain/duaJournal.js`, `js/domain/zakat.js`, `js/services/player.js`, `js/services/surahPlayback.js`, `js/views/hadithCard.js`, `js/views/roots.js`
- `wide`: `js/domain/tafsirSearch.js`
- `window`: `js/domain/adhkarTiming.js`, `js/domain/ramadan.js`, `js/domain/readerWindow.js`, `js/domain/searchPagination.js`, `js/services/alertTriggers.js`, `js/services/floatingCounter.js`, `js/services/speech.js`
- `windowing`: `js/domain/readerWindow.js`
- `wipeappdataforreset`: `js/app/drawer.js`
- `wire`: `js/app/boot.js`
- `wireaudioshortcuts`: `js/app/audioEngine.js`
- `wireinstallprompt`: `js/app/installPrompt.js`
- `wireplayer`: `js/app/audioEngine.js`
- `wiring`: `js/app/palette.js`
- `witheffectivetargets`: `js/services/contentPrefs.js`
- `within`: `js/views/mushafPageFind.js`
- `without`: `js/services/recitation.js`, `js/views/calendar.js`, `js/views/hadithCard.js`
- `withstore`: `js/core/idb/openDB.js`
- `witr`: `js/domain/sunnah.js`
- `witrstreak`: `js/domain/sunnah.js`
- `wizard`: `js/domain/onboarding.js`, `js/views/onboardingPanel.js`
- `wizardstepindex`: `js/domain/onboarding.js`
- `wmm2025`: `js/domain/wmm-coefs.js`, `js/domain/wmm.js`
- `wmm2025cof`: `js/domain/wmm-coefs.js`
- `word`: `js/core/config/quran.js`, `js/core/state/slices/quran.js`, `js/domain/grammarDrill.js`, `js/domain/roots.js`, `js/domain/wordStudy.js`, `js/views/roots.js`, `js/views/tafsirPanel.js`
- `wordaffixlabels`: `js/domain/wordStudy.js`
- `wordbookmarkkey`: `js/domain/wordStudy.js`
- `worddetailtags`: `js/domain/wordStudy.js`
- `wordgrammarsummary`: `js/domain/wordStudy.js`
- `wording`: `js/domain/hadithStudy.js`
- `wordirabline`: `js/domain/wordStudy.js`
- `words`: `js/core/config/quran.js`, `js/domain/grammarDrill.js`, `js/services/shareCard.js`
- `wordsourceshtml`: `js/views/tafsirPanel.js`
- `wordstudy`: `js/domain/roots.js`
- `wordsurls`: `js/domain/offline.js`
- `wordunits`: `js/domain/tajweed.js`
- `work`: `js/core/router.js`, `js/domain/locations.js`, `js/domain/qada.js`
- `worker`: `js/app/offlineJobs.js`, `js/app/triggers.js`
- `working`: `js/core/config/app.js`, `js/core/config/sanitize.js`, `js/services/floatingCounter.js`
- `works`: `js/domain/tajweedSources.js`, `js/services/player.js`, `js/services/surahPlayback.js`
- `world`: `js/domain/wmm-coefs.js`, `js/domain/wmm.js`
- `worship`: `js/core/state/slices/worship.js`, `js/domain/review.js`, `js/domain/worship.js`
- `worshipreview`: `js/domain/review.js`
- `worshiptodaycardhtml`: `js/views/home.js`
- `worshiptodayrows`: `js/domain/worship.js`
- `would`: `js/domain/sunnah.js`
- `wrapped`: `js/app/fullscreen.js`
- `wrapper`: `js/domain/compass.js`, `js/services/speech.js`
- `wraptext`: `js/services/shareCard.js`
- `writeautosnapshot`: `js/services/backup.js`
- `writebackuptohandle`: `js/services/backup.js`
- `writes`: `js/domain/compass.js`, `js/domain/statistics.js`
- `writescrolltop`: `js/app/renderer.js`
- `wrong`: `js/domain/quiz.js`
- `year`: `js/domain/review.js`
- `yearly`: `js/ui/calendarModals.js`
- `yieldfullsurahplayer`: `js/app/audioEngine.js`
- `zaka`: `js/domain/khatma.js`
- `zakat`: `js/app/inputs.js`, `js/domain/adhkarTiming.js`, `js/domain/zakat.js`, `js/views/zakat.js`
- `zakatable`: `js/domain/zakat.js`
- `zero`: `js/domain/planExport.js`, `js/services/dhikrAudio.js`, `js/services/player.js`

## Tests: what each pins

Each unit test file, its header job, and the `js/` modules it imports (its pins).

- `tests/a11y-budget.test.js` — (v5.17.2) audit ACCESS follow-up, step 1. Static budget gates that run in unit CI (no browser needed): touch target >= 44px, visible focus, reduced-motion kill rule, (pins: —)
- `tests/a11yPrefs.test.js` — item 16 (theming/a11y) gates: 1. the two reading-comfort prefs sanitize to false and ride updateSettings like every other setting; (pins: `../js/core/config.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/views/settings.js`)
- `tests/about-hierarchy.test.js` — (no header comment) (pins: `../js/views/about.js`)
- `tests/adaptive-lookahead.test.js` — (v5.10.4) adaptive prefetch depth: the EWMA weighting, the fetch/ayah ratio bands, the passive sample intake, and the plain-path triple walk (with complex-mode bail). (pins: `../js/services/recitation.js`, `../js/services/surahPlayback.js`)
- `tests/adhan-cache.test.js` — OPEN-ISSUES #8 (v5.17.25) assets/audio/adhan/adhan.mp3 is ~2.4MB — roughly 40% of the install — for a file only needed when a prayer alert fires. It must NOT be (pins: —)
- `tests/adhanYield.test.js` — v5.2.72 (adhan owns the speaker) gates: 1. playAlert fires the start hook on the tone path (node-safe: the WebAudio attempt degrades silently, the hook still runs); (pins: `../js/services/prayerSound.js`)
- `tests/adhkar-browser.test.js` — the Azkar section browser (IA-7). The AZKAR section (#/library) IS the adhkar browser: named category tiles with live counts and a Read-now action per tile; the 12 moods ride (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/router.js`, `../js/core/schema.js`, `../js/core/state/initial.js`, `../js/core/utils.js`, `../js/domain/moods.js`, `../js/views/home.js`, `../js/views/library.js`)
- `tests/adhkar-gates.test.js` — (no header comment) (pins: `../js/core/schema.js`, `./helpers/seedMode.mjs`)
- `tests/adhkar-session.test.js` — merged-plan item 5 (v5.17.52), permanent. Adhkar session player + progressive disclosure: 1. Disclosure render — translation/virtue/grade/transliteration ride ONE (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/core/utils.js`, `../js/domain/grades.js`, `../js/domain/reflections.js`, `../js/ui/card.js`, `../js/views/category.js`, `../js/views/focus.js`)
- `tests/adhkarTiming.test.js` — time-of-day recommendation windows (pins: `../js/domain/adhkarTiming.js`)
- `tests/agent-map.test.js` — The agent map is generated, not hand-written: scripts/agent-map.mjs walks js/ + data/.json and emits TWO files. docs/AGENT-MAP.md the index an agent actually reads (spine, lookup (pins: —)
- `tests/alertTriggers.test.js` — v3.20 prayer-alert reliability. The pure plan builder (next-24h of adhan alerts from the real settings shape), the hostile-shape sanitizer, the catch-up due-alert selector, (pins: `../js/core/state.js`, `../js/services/alertTriggers.js`)
- `tests/ambientLamp.test.js` — (v5.17.55, merged-plan item 8) nightstand lamp mode: warm low-light recitation shelf with big transport (prev / play-pause / next, ayah by ayah) and the listen-mode sleep chip. (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/domain/ambient.js`, `../js/domain/sleepTimer.js`, `../js/views/ambient.js`)
- `tests/ambientModes.test.js` — (v5.10.1) nightstand display modes: the deterministic verse/dhikr slide picks, the ambientMode sanitizer allowlist, and per-mode ambient renders with honest corpus fallback. (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/domain/ambient.js`, `../js/views/ambient.js`)
- `tests/appBadge.test.js` — item 1 (App-badge API) gates: 1. badgeCountFor is pure and honest (remaining prayers → streak-at-risk → cleared), degrading to the full five on hostile state; (pins: `../js/core/state/streak.js`, `../js/core/utils.js`, `../js/services/appBadge.js`)
- `tests/appEntry.test.js` — the entry-module link gate (v3.12). v3.10 shipped a broken app: js/app.js imported resolvePage from js/mushaf.js, but that export never existed, so the ENTRY MODULE failed (pins: —)
- `tests/arabic-typeface.test.js` — the Arabic reading-text typeface choice (v5.17.16). The Mushaf has always had a typeface choice. The adhkar, the duas and the (pins: `../js/core/config.js`, `../js/core/config/sanitize.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/views/settings.js`)
- `tests/audio-batch-resume.test.js` — (no header comment) (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state.js`, `../js/domain/audioBatch.js`, `../js/views/audioManager.js`)
- `tests/audio-deslopify.test.js` — (no header comment) (pins: —)
- `tests/audio-mirrors-590.test.js` — (v5.9.0) ayah-audio mirror chain. One dead CDN file must not kill a recitation session: each ayah resolves to an ordered candidate list (128kbps primary → 64kbps (pins: `../js/core/config.js`, `../js/services/recitation.js`, `../js/services/surahPlayback.js`)
- `tests/audio-picker-timing-badge.test.js` — OPEN-ISSUES #13: voices without per-ayah timings must say so IN the picker, not only after selection. Both moshaf pickers (the in-player buildReciterPick and the Audio view's (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`)
- `tests/audio-recovery-and-spacing.test.js` — two fixes that had no test (v5.17.24) A backlog consistency check asked every row marked "fixed" to name a real test, and two rows had none: the recitation Retry action and the widened (pins: `../js/ui/card.js`)
- `tests/audio-session.test.js` — UX-7: one session from two engines. Verse wins when active; the tile glyph can never claim "paused" while the other engine is sounding. (pins: `../js/core/state.js`)
- `tests/audio.test.js` — pure-logic tests for the v2.6 audio engine: catalog URL building, Arabic-normalized search, custom-server validation, byte formatting, and the downloads/player reducers. (pins: `../js/domain/ramadan.js`, `../js/services/audioCatalog.js`, `../js/services/audioStore.js`)
- `tests/audioQueue.test.js` — item 23 (unified audio queue) gates: 1. full-surah advance math is shared and pure (repeat one holds, repeat all wraps 114→1, off ends; junk fails closed; the repeat (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/audioQueue.js`, `../js/services/mediaSession.js`)
- `tests/audit-fixes-5.2.77.test.js` — regression pins for the 360° audit wave. Pure reducer/sanitizer/selector checks only (no DOM, no network). (pins: `../js/app/renderer.js`, `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`)
- `tests/audit-p0-52186.test.js` — Agent-3 (v5.2.86) P0 regression pins, unified in v5.4.0 with the v5.3.0 audit's richer implementations: P0-1: the word-study popup renders four labeled study blocks (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/tajweed.js`, `../js/domain/tajweedPractice.js`, `../js/views/tafsirPanel.js`)
- `tests/auditFixes.test.js` — regression pins for the independent audit round (scheduler guard, journal dates, stats, restore clamps, scroll keys, collection counts). Each test names the defect it guards. (pins: `../js/app/renderer.js`, `../js/core/state/restore.js`, `../js/domain/duaJournal.js`, `../js/domain/statistics.js`, `../js/domain/zakat.js`, `../js/services/notifications.js`, `../js/views/collections.js`)
- `tests/backlog-consistency.test.js` — the backlog must be true (v5.17.24) The owner asked for the goals, the backlog and the open issues to be durable artefacts rather than something living in one agent's memory. That (pins: —)
- `tests/backup-summary.test.js` — merged-plan item 12 (v5.17.59): the ONE unified offline+backup summary card. The Offline view and the Settings data section render the same builder (pins: `../js/core/i18n.js`, `../js/core/state.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/services/backup.js`, `../js/views/backupSummary.js`, `../js/views/offline.js`, `../js/views/settings.js`)
- `tests/backupAuto.test.js` — item 10 (backup) gates: 1. autoBackupDue fires for returning users past the interval only; backupStale flags never/old manual exports; (pins: `../js/core/state.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/services/backup.js`, `../js/views/settings.js`)
- `tests/byHeart.test.js` — adhkar-by-heart mode: session walk + SRS records over item ids + restore boundary. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/domain/hifz.js`)
- `tests/calendar-deslopify.test.js` — (no header comment) (pins: —)
- `tests/calendarRecurrence.test.js` — item 12 (calendar recurrence) gates: 1. weekly/monthly/yearly match calendar fields (short months skip, Feb 29 keeps leap years), floored at startDate and capped by endDate; (pins: `../js/domain/calendar.js`, `../js/services/calendarNotes.js`, `../js/ui/calendarModals.js`)
- `tests/category-hierarchy.test.js` — (no header comment) (pins: —)
- `tests/chaos-matrix.test.js` — (v5.17.2) audit CHAOS follow-up. Pins the fault catalog and proves the harness invariants against stubs: network faults surface structured errors, storage faults keep cache data. (pins: —)
- `tests/checkbox-pipeline.test.js` — a switch must actually switch (v5.17.17) The delegated click listener calls e.preventDefault() before dispatching (events.js) so links and buttons behave. On a checkbox that preventDefault (pins: —)
- `tests/checklist-deslopify.test.js` — (no header comment) (pins: —)
- `tests/checklist.test.js` — (no header comment) (pins: `../js/core/config.js`, `../js/core/utils.js`, `../js/services/checklist.js`)
- `tests/city-presets.test.js` — the offline city directory: unique ids, sane coordinates, known regions, both languages named. A wrong coordinate is a wrong Fajr; this gate keeps the directory honest. (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/locations.js`)
- `tests/collections.test.js` — item 7 (collections) gates: 1. COLLECTION_MOVE_ITEM swaps neighbors; edges, unknown ids and hostile dirs no-op; (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/views/collection.js`)
- `tests/compare-c-5.2.78.test.js` — UP-06 second compare slot. Pure reducer/sanitizer/domain checks only (no DOM, no network). (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/translationCompare.js`)
- `tests/compass.test.js` — (v5.17.4, real-phone pass) the iOS permission gate. Android Chrome exposes DeviceOrientationEvent WITHOUT requestPermission: the wrapper must resolve true there (nothing to ask) instead of (pins: `../js/domain/compass.js`)
- `tests/content-authority-depth.test.js` — the content-authority depth gates for the fix wave: 1. banner reordering reaches ACROSS the bundled/custom boundary (the (pins: `../js/core/config.js`, `../js/core/schema.js`, `../js/domain/dailyAyah.js`, `../js/services/contentPrefs.js`, `../js/views/library.js`)
- `tests/content-i18n-audit.test.js` — Content & i18n audit gates. Part 1 pins the strict language-separation contract at the unit level: AR UI → Arabic matn + Arabic virtue/source only. Transliteration and (pins: `../js/domain/contentLens.js`, `../js/domain/localeContent.js`, `../js/ui/card.js`)
- `tests/contentManage.test.js` — v4.5.2, the in-place content manage layer. The prefs lens (ordering math, hide, targets), the reducer contract (manage mode is transient + dies on navigation), the sanitizer (hostile (pins: `../js/core/config.js`, `../js/core/schema.js`, `../js/core/state/reducer.js`, `../js/services/contentPrefs.js`, `../js/views/category.js`, `../js/views/focus.js`, `../js/views/library.js`)
- `tests/contracts.test.js` — structural gates for release protocols that previously relied on reviewer memory (v4.3). Each test pins a contract whose violation shipped a real bug in this app's history: (pins: `../js/app/events.js`, `../js/app/forms.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `./helpers/data-manifest.mjs`, `./helpers/seedMode.mjs`, `./helpers/shell-hash.mjs`)
- `tests/counter-feel.test.js` — the counter is a FEEL contract, and a feel cannot be asserted by a screenshot review that nobody re-runs. (v5.17.15) Measured against azkar.me's counter, ours was a 10px ring around (pins: —)
- `tests/counter-flow.test.js` — v5.2.24 counter/accordion/focus wave, permanent. 1. Accordion memory (v5.2.48: persisted settings.settingsSection + #/settings/<slug> deep links): slug helpers round-trip, unknown (pins: `../js/domain/completedCards.js`, `../js/ui/card.js`, `../js/views/focus.js`, `../js/views/settings.js`)
- `tests/counter-rules.test.js` — v5.2.25 counter-standards wave, permanent. Rule 1 (threshold): taps increment 1/3 → 2/3 → 3/3; nothing dismisses before count == target; completion stamps the day and completes. (pins: `../js/core/state.js`, `../js/core/state/restore.js`, `../js/core/utils.js`, `../js/domain/reflections.js`, `../js/services/tasbih.js`, `../js/ui/card.js`)
- `tests/cssDesign.test.js` — Phase A (v3.11) design-system gates. These tests make the v3.11 token/contrast/focus/touch-target work permanent policy: (pins: `../js/core/config.js`)
- `tests/custom-card-reorder.test.js` — OPEN-ISSUES #10 verification: custom library card-level reorder under the shared lens. moveItem pool + visibleCategoryItems reader + category.js buttons (pins: `../js/core/config.js`, `../js/core/schema.js`, `../js/services/contentPrefs.js`, `../js/views/category.js`)
- `tests/dailyAyah.test.js` — B-4: the restored verse-of-the-day theme bias. Keyword matching is substring on plain text (no network, no curated lists that could drift); hostile shapes degrade, never throw. (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/domain/dailyAyah.js`, `../js/views/home.js`, `../js/views/settings.js`)
- `tests/dataHealth.test.js` — v3.26.0, the Settings data health check. "Backups people never test are hopes, not backups." The dry run's whole contract: the exact bytes an export would produce go through the SAME (pins: `../js/core/i18n.js`, `../js/core/state.js`, `../js/services/dataHealth.js`, `../js/views/settings.js`)
- `tests/declination.test.js` — v3.26.0, the World Magnetic Model in the app. The gold standard: NOAA/NCEI publishes official WMM2025 test values (scripts/WMM2025COF/WMM2025_TestValues.txt). A qibla needle correction (pins: `../js/core/i18n.js`, `../js/domain/wmm.js`, `../js/views/qibla.js`)
- `tests/desktop-blowout.test.js` — a grid track may not exceed its container. The desktop contract this pins is now intentionally simple: Home is one editorial column. Historical desktop.css grid rules caused the real browser (pins: —)
- `tests/deslopify-regressions.test.js` — (no header comment) (pins: —)
- `tests/dhikr-audio.test.js` — per-dhikr recitation INFRA ONLY (v5.17.30, OPEN-ISSUES #15 + #37). Zero real clips ship and none are fetched here: every case uses fixture (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/core/schema.js`, `../js/services/dhikrAudio.js`, `../js/ui/card.js`, `../js/views/focus.js`)
- `tests/docs-honesty.test.js` — F-003: docs must never hardcode a passing claim the tree cannot prove. Counts live in ARCHITECTURE/README tables, regenerated from actual runs per the release protocol; the badge and (pins: —)
- `tests/editorReference.test.js` — audit rank 7 (v5.2.71) gates: 1. the item form carries book/chapter/reference-notes/Arabic-source inputs prefilled from the item (both languages render labels); (pins: `../js/core/config/sanitize.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/localeContent.js`, `../js/views/editor.js`)
- `tests/event-registries.test.js` — Blueprint D gates: the change/input arms moved out of events.js into feature-owned { sel, run } registries. Pins completeness (no arm lost in the move), selector uniqueness (pins: `../js/app/events.js`, `../js/core/state.js`)
- `tests/fasting.test.js` — (no header comment) (pins: `../js/domain/calendar.js`, `../js/domain/fasting.js`)
- `tests/favorites.test.js` — item 8 (favorites bulk) gates: 1. favoriteSortFor resolves valid sorts, hostile ones fall back; 2. sortFavorites orders recent (newest first), alpha (EN + AR locale (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/ui/menus.js`, `../js/views/favorites.js`)
- `tests/feature-interiors.test.js` — (no header comment) (pins: —)
- `tests/fetch-timeout-catalog.test.js` — B2/B8 regressions: fetchJSON escapes a hung socket via timeout; loadCatalog shares one in-flight promise instead of returning null to the second caller. (pins: `../js/app/net.js`)
- `tests/first-run-language.test.js` — the two "an Arabic-only reader is stranded in English chrome" verdicts, pinned by EXECUTION (not by a source-grep), because both used to be believed fixed while one was (pins: `../js/app/fileImports.js`, `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/services/backup.js`)
- `tests/floating-counter.test.js` — the floating counter (v5.17.15). The feature exists because azkar.me ships an Android overlay and we cannot: "no build step, no app store" is a standing constraint (ADR 0002). The web (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/services/floatingCounter.js`)
- `tests/focus-cycle.test.js` — v5.2.20 (F-015), permanent. The modal trap and the nav-drawer containment ran two hand-rolled copies of the same three Tab-cycling branches. Both call (pins: `../js/ui/modal.js`)
- `tests/focus-interactions.test.js` — (no header comment) (pins: —)
- `tests/gap-telemetry.test.js` — (v5.11.0 C) opt-in, local-only follow-gap telemetry: pure math, the disabled-by-default gate, sample lifecycle, hostile storage/sanitize input, and the ring-buffer cap. (pins: `../js/core/config.js`, `../js/services/gapTelemetry.js`)
- `tests/garden.test.js` — v4.5.2, the Garden. The growth computation (thresholds, spans, achievements) and the view contract: positive framing, both languages, locale-aware numerals, and (pins: `../js/core/config.js`, `../js/domain/garden.js`, `../js/views/garden.js`)
- `tests/gentle-ledger.test.js` — (v5.17.57, merged-plan item 10) the gentle memorization queue + private practice ledger. The contract, in one place: (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/views/home.js`, `../js/views/khatma.js`, `../js/views/statistics.js`)
- `tests/gestures.test.js` — v5.2.22 bug-report wave, permanent. 1. RTL swipe pin: the Mushaf swipe emulates a physical Arabic book, so right-to-left travel (dx < 0) is ALWAYS the next page and (pins: `../js/domain/gestures.js`, `../js/views/mushafReader.js`, `../js/views/playerBar.js`, `../js/views/settings.js`)
- `tests/grade-consistency.test.js` — grade must not deny what the record itself cites. The failure this pins was not subtle to a reader and was invisible to the suite. 61 records carried grade: "Unknown" next to a reference reading (pins: `../js/core/config.js`)
- `tests/grades.test.js` — (no header comment) (pins: `../js/domain/grades.js`)
- `tests/grammarDrill.test.js` — grammar flashcards: pure deck building (deterministic shuffle, candidate filtering, caps) + the ephemeral session reducer walk. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/grammarDrill.js`)
- `tests/growth-delights.test.js` — (no header comment) (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/utils.js`, `../js/domain/sessionFlags.js`, `../js/views/checklist.js`)
- `tests/hadith-p1.test.js` — (no header comment) (pins: `../js/views/hadithCard.js`)
- `tests/hadith.test.js` — (no header comment) (pins: `../js/services/hadith.js`, `./helpers/seedMode.mjs`)
- `tests/hadithBookmarks.test.js` — hadith bookmarks (v5.2.0): the reducer toggle contract + the restore sanitizer boundary for "<bookId>:<n>" keys. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`)
- `tests/hadithDeepLink.test.js` — honest not-found states for hadith deep links (audit rank 8, completed v5.2.69): 1. an unknown book id says so (v5.2.32, pinned against regression); (pins: `../js/core/state/initial.js`, `../js/views/hadith.js`)
- `tests/hadithMemorize.test.js` — hadith memorization on the shared SRS ladder (domain key-agnostic twins + reducer + restore boundary). (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/domain/hifz.js`)
- `tests/hadithNotes.test.js` — personal hadith notes: the reducer contract (key shape, blank-deletes, caps) + the restore sanitizer boundary. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`)
- `tests/hadithReadingSurface.test.js` — (no header comment) (pins: `../js/services/hadith.js`, `../js/views/hadith.js`, `../js/views/hadithCard.js`)
- `tests/hadithSearch.test.js` — item 14 (cross-book hadith search) gates: 1. buildHadithIndex covers loaded books, skipping malformed docs/rows; 2. searchHadith ranks cross-book (AND terms, phrase bonus, both (pins: `../js/domain/hadithSearch.js`, `../js/views/hadith.js`)
- `tests/hadithStanding.test.js` — item 19 (hadith scholarship, honest slice) gates: 1. bookStanding names the Two Sahihs and nothing else (no invented (pins: `../js/services/hadith.js`, `../js/views/hadith.js`)
- `tests/hadithStudy.test.js` — (v5.10.1) narrator extraction + grade guide: high-confidence EN/AR patterns, enriched-field precedence, chain-style honesty (null over wrong), and card/guide rendering. (pins: `../js/domain/hadithStudy.js`, `../js/views/hadithCard.js`)
- `tests/hifz.test.js` — (no header comment) (pins: `../js/domain/hifz.js`)
- `tests/hifzAyah.test.js` — item 21 (ayah-level hifz SRS) gates: 1. four grades share one step math (again resets+lapses, hard holds, good climbs one, easy climbs two capped); (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/hifz.js`, `../js/views/ayahStudy.js`, `../js/views/quran.js`)
- `tests/home-design-c4.test.js` — C4 home design pass (HANDOFF §5d, B2.4). The review correction stands: home is 9 sections / 80 category tiles, not 560 items — so this pass ranks sections and tiles instead of (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/router.js`, `../js/core/schema.js`, `../js/core/state/initial.js`, `../js/views/home.js`, `../js/views/onboardingPanel.js`)
- `tests/home-invites.test.js` — (v5.17.56, merged-plan item 9) permanent. Browse-by-need below the fold + three calm home invitations (Hijri date note, Friday Al-Kahf, Ramadan countdown/companion): (pins: `../js/app/events.js`, `../js/app/handlers/worship.js`, `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/schema.js`, `../js/core/state.js`, `../js/core/state/initial.js`, `../js/core/utils.js`, `../js/domain/calendar.js`, `../js/domain/homeInvitations.js`, `../js/domain/moods.js`, `../js/domain/ramadan.js`, `../js/domain/reminderPresets.js`, `../js/views/home.js`)
- `tests/home-today-ribbon.test.js` — merged-plan item 3: time-aware Today. The Home hero grows from a next-only strip into a six-prayer ribbon (every prayer taps into the Prayer view; current/next highlighted), (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/router.js`, `../js/core/schema.js`, `../js/core/state/initial.js`, `../js/domain/prayer.js`, `../js/views/home.js`)
- `tests/homePanels.test.js` — home panel order + visibility: pure resolve/ move helpers and the settings sanitizer boundary. (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/domain/homePanels.js`)
- `tests/hostile-v125-remediation.test.js` — v5.17.126 hostile-review remediation contracts. These are source-level traps for defects found by the local Chromium pass on v5.17.125. They do not replace browser evidence; they prevent reintroducing (pins: —)
- `tests/hygiene-gates.test.js` — F-004/F-005, permanent: 1. every runtime fetch() goes through the timeout layer (js/core/fetch.js is the single legal site); (pins: —)
- `tests/icons-kill.test.js` — (no header comment) (pins: `../js/core/icons.js`, `./helpers/icon-audit.mjs`)
- `tests/icons.test.js` — (no header comment) (pins: `../js/core/icons.js`, `./helpers/icon-audit.mjs`)
- `tests/idb-boundary.test.js` — B4 regressions: a blocked upgrade settles (never a forever-pending promise), a failed open is retried (never memoized), and a version-changed connection is evicted. (pins: `../js/core/idb/openDB.js`)
- `tests/install-path.test.js` — the install-path gap pins: 1. deferral memory is pure and hostile-safe (default / sanitize / record / cooldown), with the clock injected; (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/core/config/sanitize.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/install.js`, `../js/domain/onboarding.js`, `../js/views/about.js`, `../js/views/installRow.js`, `../js/views/onboardingPanel.js`, `../js/views/settings.js`)
- `tests/journalEdit.test.js` — item 6 (journal edit + pagination) gates: 1. DUA_JOURNAL_EDIT / REFLECTION_EDIT update text in place (order and timestamps untouched; empty or unknown edits no-op; caps hold); (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/views/journal.js`)
- `tests/khatma-row-5.2.80.test.js` — UP-05: statistics closes the loop with a khatma % line linking back into the Mushaf. Pure render checks. (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/views/statistics.js`)
- `tests/khatma.test.js` — pure planner math for the Khatma scheduler (pins: `../js/domain/khatma.js`)
- `tests/kids-degamified.test.js` — (v5.17.58, merged-plan item 11) kids mode degamified, gate kept. Permanent. No-star/level/award pins: the domain exports no level ladder, no week (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/kids.js`, `../js/views/kids.js`)
- `tests/kids.test.js` — Kids mode (v5.17.58, merged-plan item 11) degamified: a plain heard count + restore boundary, the engine's natural-finish flag, and the Kids home render. No stars, no levels, no awards. (pins: `../js/core/config.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`)
- `tests/kidsLevels.test.js` — (v5.17.58, merged-plan item 11) kids quiz without awards: seeded memory-quiz rounds and the quiz session reducer (shape validation, hostile-input safety). The level ladder and the week (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/kids.js`, `../js/views/kids.js`)
- `tests/kidsScope.test.js` — item 22 (kids-mode scope-cut) gates: 1. the allowlist holds exactly Kids + Tasbih and the resolver passes them through while rerouting everything else to Kids (mode off = (pins: `../js/core/config/views.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/ui/shell.js`)
- `tests/language-switch-coverage.test.js` — the completeness trap. The rule: a surface that hides the shell still owes the reader the language switch. My first implementation covered THREE chrome-hiding modes and (pins: —)
- `tests/lastPosition.test.js` — merged-plan item 2: the unified last-position service. Seven slots, one honest record (js/domain/lastPosition.js): Qur'an + (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/domain/lastPosition.js`, `../js/domain/sessionFlags.js`, `../js/services/backup.js`, `../js/views/home.js`)
- `tests/launchIntents.test.js` — item 24 (manifest handlers) gates: 1. share_target params route at Search with the body text preferred, capped and trimmed; empty shares fail closed; (pins: `../js/core/config/views.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/launchIntents.js`)
- `tests/lazy-modal.test.js` — v5.2.19, permanent. The v5.2.18 lazy wave left fire-and-forget import().then(openModal) chains with no rejection path (a failed chunk was an unhandled (pins: `../js/core/state.js`, `../js/ui/modal.js`)
- `tests/lex-gap-probe.test.js` — TEMPORARY LEX-01 gap probe (TEST-ONLY, do not commit). Asserts: particle→NOT_APPLICABLE, missing content word→NOT_ATTESTED, malformed citation→INVALID_CITATION/CORPUS, tracking URL rejected. (pins: `../js/domain/lexicalProvenance.js`)
- `tests/lexical-provenance.test.js` — (v5.17.2) audit F-02/F-03 follow-up. Pins the provenance contract without fabricating scholarship: - the citation schema exists and requires sourceId/work/author/edition; (pins: —)
- `tests/lexicon-field-aware.test.js` — (LEX-01..LEX-05) field-aware lexicon contract. Pins: applicability states (never fabricated), provenance plumbing from dict/root tiers into materialized records, and bilingual renderer labels. (pins: `../js/domain/lexicalProvenance.js`, `../js/domain/wordStudy.js`, `../js/views/tafsirPanel.js`)
- `tests/library-jump.test.js` — (v5.2.88, P2) library section jump chips: one chip per rendered section, targets matching section ids, EN+AR labels, sticky-row CSS with topbar-offset landings. (pins: `../js/core/config.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/schema.js`, `../js/views/library.js`)
- `tests/main-menu-hierarchy.test.js` — (no header comment) (pins: `../js/core/config/nav.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`)
- `tests/manifest.test.js` — (no header comment) (pins: `./helpers/data-manifest.mjs`)
- `tests/mediaSession.test.js` — (no header comment) (pins: `../js/services/mediaSession.js`)
- `tests/milestone.test.js` — tasbih milestone pings (v5.2.0): the pure "buzz every Nth count" predicate used by services/tasbih.js. (pins: `../js/domain/celebrate.js`)
- `tests/missing-data.test.js` — merged-plan item 6 (v5.17.53), permanent. ONE honest-absence pattern (js/ui/missingData.js): dashed warm-gray, plain words, calm — never red — bilingual EN+AR, unifying unknown grade / (pins: `../js/core/i18n.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/grades.js`, `../js/ui/card.js`, `../js/ui/emptyState.js`, `../js/ui/missingData.js`)
- `tests/moods.test.js` — "Browse by need" cross-library matcher (pins: `../js/domain/moods.js`)
- `tests/motion.test.js` — v3.12 UI/UX Phase B gates. Three layers are pinned here: 1. js/celebrate.js — the transient celebration registry (behavioral). (pins: `../js/app/renderer.js`, `../js/domain/celebrate.js`, `../js/domain/khatma.js`)
- `tests/mushaf-cache-settings-590.test.js` — (v5.9.0) P2/E gates. 1. The mushaf page store stays bounded (48 most-recent docs) no matter how far a reading session flips. (pins: `../js/core/config.js`, `../js/core/state.js`, `../js/views/tafsirPanel.js`)
- `tests/mushaf-page-find.test.js` — (no header comment) (pins: `../js/views/mushafPageFind.js`)
- `tests/mushaf-reorg.test.js` — regroup guards for the Mushaf reorganization: navigation stays pure navigation, progress lives in its own TRACK panel, study owns memorize/hifz, and the two historic losses can never recur (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/views/mushafReader.js`, `../js/views/playerBar.js`, `../js/views/studyTray.js`, `../js/views/tafsirPanel.js`, `../js/views/tajweedPracticeView.js`, `../js/views/tajweedSettings.js`)
- `tests/mushaf-route-resolution.test.js` — v5.17.21, the APP layer half of the "open the mushaf at 2:255" fix. The view layer was corrected first: mushafRoutePage() resolves a mushaf (pins: `../js/app/rt.js`, `../js/core/config.js`, `../js/core/state.js`, `../js/services/mushaf.js`, `../js/ui/readingTokens.js`, `../js/views/mushafJump.js`, `../js/views/mushafPlayer.js`, `../js/views/mushafReader.js`)
- `tests/mushaf-search.test.js` — the mushaf-search gap (v5.17.28): 1. resolvePage lives ONLY in services/mushaf.js — search.js imports it from there (v5.17.41 removed the deprecated surahPlayback re-export, (pins: `../js/domain/quranSearch.js`, `../js/services/mushaf.js`, `../js/services/surahPlayback.js`, `../js/views/search.js`)
- `tests/mushaf-session.test.js` — v5.2.9: the last multi-owner transients live in state.mushafSession (bookmark folder filter, study tafsir tab): sanitized at the reducer boundary, invisible to persistence, read by (pins: `../js/core/state.js`, `../js/core/state/initial.js`, `../js/views/mushafBookmarks.js`)
- `tests/mushaf-structure.test.js` — Blueprint E step 2 pins: mushafReader.js stays a page-render module (no re-growth), its parts live in their own view modules with no back-edges, and the facade re-exports resolve so (pins: —)
- `tests/mushaf-study-rail.test.js` — (no header comment) (pins: `../js/core/config.js`, `../js/views/mushafReader.js`)
- `tests/mushaf.test.js` — (no header comment) (pins: `../js/services/mushaf.js`)
- `tests/mushafBismillah.test.js` — the Bismillah is a header for every surah that opens with one, and that is not every surah. The guard that decides this used to exclude only At-Tawbah, so Al-Fatiha (pins: `../js/domain/tajweed.js`)
- `tests/mushafHizb.test.js` — item 15 (Mushaf parity) gates: 1. hizbStartPage maps 1..60 onto juz halves monotonically, never overtaking the next juz, degrading to null on hostile input; (pins: `../js/domain/quranSearch.js`, `../js/services/mushaf.js`, `../js/views/mushafReader.js`, `../js/views/search.js`)
- `tests/nav-chrome.test.js` — (no header comment) (pins: `../js/core/config.js`, `../js/core/config/nav.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/ui/shell.js`)
- `tests/nav-reachability.test.js` — REORGANISATION-PLAN.md Phase 0 + IA-7. INSTRUMENT BEFORE MOVING. This file is TEST-ONLY: it imports the real route→section map (DOORS from js/core/config/nav.js — the single source (pins: `../js/core/config.js`, `../js/core/config/nav.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`)
- `tests/notifications-dedup.test.js` — F-007: the persisted day-dedup is shared across tabs. A sibling tab's write must invalidate our cache (storage event) and never be clobbered by ours (merge-on-write). (pins: `../js/services/notifications.js`)
- `tests/notifications.test.js` — reminder catch-up window (pure helper) (pins: `../js/services/notifications.js`)
- `tests/nudge.test.js` — v3.25.0, the gentle "it's been a while" line. Three layers, mirroring the feature's shape: 1. pure decision logic (js/nudge.js) against hostile shapes; (pins: `../js/core/i18n.js`, `../js/core/state.js`, `../js/core/utils.js`, `../js/domain/nudge.js`, `../js/views/home.js`)
- `tests/offline-deslopify.test.js` — (no header comment) (pins: —)
- `tests/offline-essentials.test.js` — the "works offline" promise (v5.17.17) The About copy says "Everything lives on your device and works offline". An independent audit found that false for the corpus people (pins: `../js/app/offlineJobs.js`, `../js/core/config.js`, `../js/core/config/sanitize.js`)
- `tests/offline-gzip.test.js` — compressed downloads (v5.3.0): transparent .json.gz fetching with plain fallback, the storage-mode toggle, and the packaging script. (pins: `../js/app/handlers/offline.js`, `../js/app/net.js`, `../js/app/offlineJobs.js`, `../js/core/config.js`, `../js/core/state.js`, `../js/core/state/initial.js`, `../js/views/offline.js`)
- `tests/offline-library.test.js` — one-tap offline downloads: inventory shape, progress-slice discipline, sanitizer boundary, and view rendering. (pins: `../js/core/config.js`, `../js/core/state.js`, `../js/core/state/initial.js`, `../js/domain/offline.js`, `../js/views/offline.js`, `./helpers/seedMode.mjs`)
- `tests/onboarding.test.js` — first-run wizard logic (pure module, v5.17.48: three decisions — language, location-or-offset, reciter — with the other five legacy steps deferred to Settings). (pins: `../js/core/config.js`, `../js/domain/onboarding.js`)
- `tests/onboardingWizard.test.js` — item 9 (onboarding wizard) gates, v5.17.48 (3-step wizard: language → location-or-offset → reciter): 1. ONBOARDING_STEP_SEEN records only live confirms; legacy confirms (pins: `../js/core/config/quran.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/views/onboardingPanel.js`, `../js/views/settings.js`)
- `tests/one-voice.test.js` — "one voice at a time" must mean all five pairs. THE DEFECT THIS PINS docs/PROJECT-PICTURE.md §3 lists "One voice at a time" as a standing (pins: —)
- `tests/open-issues-ledger.test.js` — the ledger must not lie about itself (v5.17.23) docs/OPEN-ISSUES.md states its own totals in a header AND in a summary (pins: —)
- `tests/orphan-actions.test.js` — Every static data-action emitted by js/views + js/ui + js/app must resolve somewhere: the click delegation table, a change/input registry entry, or the explicit allowlist (hold-gestures, overlay dism… (pins: `../js/app/events.js`)
- `tests/overhaulP0Contract.test.js` — (no header comment) (pins: —)
- `tests/p0-mushaf-core.test.js` — P0-1 … P0-4 gates (v5.3.0). Every acceptance criterion below is checkable from pure templates, the domain classifier, or the shipped CSS — no browser required: (pins: `../js/app/autoFit.js`, `../js/core/config.js`, `../js/core/state.js`, `../js/domain/tajweed.js`, `../js/domain/wordStudy.js`, `../js/views/mushafJump.js`, `../js/views/mushafReader.js`, `../js/views/tafsirPanel.js`)
- `tests/p0-roadmap-fixes.test.js` — v5.2.73 P0 regressions for Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72: 1. BUG-01: a library that fails to load must never cause its favorites / (pins: `../js/app/net.js`, `../js/app/renderer.js`, `../js/app/rt.js`, `../js/app/stateSub.js`, `../js/core/state.js`, `../js/domain/quranSearch.js`)
- `tests/p0-tajweed-rounds.test.js` — P0-5 gates (v5.3.0): 1. shipped pool covers EVERY TAJWEED_RULES id with >= 5 real corpus rows (the "لا توجد آيات تدريب لهذا الحكم بعد" dead end is dead); (pins: `../js/core/config.js`, `../js/core/state.js`, `../js/domain/quiz.js`, `../js/domain/tajweed.js`, `../js/domain/tajweedPractice.js`, `../js/views/tajweedPracticeView.js`, `./helpers/seedMode.mjs`)
- `tests/p1-roadmap-fixes.test.js` — v5.2.74 P1 regressions for Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72: 1. BUG-05: Arabic scripture runs carry lang="ar" (WCAG 3.1.2). (pins: `../js/core/config.js`, `../js/core/state.js`, `../js/core/state/restore.js`, `../js/core/state/store.js`, `../js/core/storage.js`, `../js/domain/gestures.js`, `../js/domain/tafsirSearch.js`, `../js/domain/translationCompare.js`, `../js/services/backup.js`, `../js/views/ayahStudy.js`, `../js/views/kids.js`, `../js/views/quran.js`, `../js/views/ramadan.js`, `../js/views/search.js`, `../js/views/tafsirPanel.js`)
- `tests/p2-roadmap-fixes.test.js` — v5.2.75 P2 regressions for Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72: 1. BUG-08: rapid double-tap on two ayah play buttons must not toast a (pins: `../js/app/drawer.js`, `../js/app/hadithData.js`, `../js/core/config.js`, `../js/core/i18n.js`, `../js/core/state.js`, `../js/domain/hifz.js`, `../js/services/alertTriggers.js`, `../js/services/audioStore.js`, `../js/services/mushaf.js`, `../js/services/prayerSound.js`, `../js/services/recitation.js`, `../js/views/hadithCard.js`, `../js/views/qibla.js`, `../js/views/quran.js`, `../js/views/statistics.js`, `./helpers/seedMode.mjs`)
- `tests/palette-glass.test.js` — v5.17.62 palette + liquid-glass upgrade (HANDOFF §5d: worship instrument, paper-not-screen, gilt restraint; 4-LLM consensus: cream paper, deep green ink, gold only for now/here, (pins: `../js/core/config.js`)
- `tests/palette.test.js` — command-palette providers (pure, store-free). Pins the Spotlight-style overlay logic: literal-match highlighting, provider grouping/caps, surah names in every script, translation-aware (pins: `../js/core/utils.js`, `../js/domain/search.js`, `../js/views/palette.js`)
- `tests/phaseC.test.js` — v3.14 Phase C (loading & feedback) gates: - skeleton builders: shape, bounds, sr-only signal, no raw HTML leakage - empty-state builder: escaping, optional hint/action (pins: `../js/core/config.js`, `../js/core/state.js`, `../js/services/soundDesign.js`, `../js/ui/emptyState.js`, `../js/ui/skeleton.js`)
- `tests/planExport.test.js` — B-5: the restored family plan-sharing primitive. Pure builders/sanitizers: hostile shapes degrade to null, never throw, never invent data. (pins: `../js/core/state/slices/worship.js`, `../js/domain/planExport.js`)
- `tests/player-chrome.test.js` — (v5.12.0) player chrome: minimize pill, M-mute, keyboard guards, from-here affordances, and the fullscreen file-player row. One player, every side. (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/core/state.js`, `../js/domain/playerShortcuts.js`, `../js/services/player.js`, `../js/services/recitation.js`, `../js/ui/recitationConsole.js`, `../js/views/mushafPlayer.js`, `../js/views/mushafReader.js`, `../js/views/playerBar.js`)
- `tests/player-pause.test.js` — F-001/U-01: pause() must win over an in-flight play(). Two windows: pause during the offline-blob lookup must not be overridden when it resolves; pause during a pending a.play() must not (pins: —)
- `tests/player-race.test.js` — B1 regression: concurrent play() calls must be safe. Loser unwinds silently (no ghost error), winner owns the element src, and blob URLs are never leaked. (pins: —)
- `tests/playlists.test.js` — recitation queues: the reducer contract (create/rename/delete/add/remove with hostile-shape guards) + the restore sanitizer boundary. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`)
- `tests/practice-retry-action.test.js` — (no header comment) (pins: —)
- `tests/prayer-method-line.test.js` — merged-plan item 4: the active prayer method in plain text. The method lived only in the calc sheet and onboarding; the prayer hero (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/initial.js`, `../js/domain/prayer.js`, `../js/views/home.js`, `../js/views/prayer.js`)
- `tests/prayer-methods.test.js` — pins the three prayer-times controls that capability-parity work identified, by EXECUTION: 1. Calculation method (7 published conventions, angles sourced from (pins: `../js/core/config/sanitize.js`, `../js/domain/prayer.js`)
- `tests/prayer.test.js` — the prayer-time engine's first direct test file (v4.3). The engine had ZERO tests through v4.2 despite being the app's daily-critical computation, which is exactly how the wrapped-midnight (pins: `../js/domain/adhkarTiming.js`, `../js/domain/prayer.js`, `../js/domain/ramadan.js`)
- `tests/prayerAlert.test.js` — v3.8 real-Adhan alert logic: the pure source-resolution matrix, user-file validation, and the sanitized adhanMode setting. Playback itself (HTMLAudio/AudioContext) (pins: `../js/core/config.js`, `../js/services/audioStore.js`, `../js/services/prayerSound.js`)
- `tests/prayerAlerts.test.js` — item 17 (prayer alerts, honest path) gates: 1. every ICS event carries an at-time VALARM (both builders, one shared definition — the calendar fallback must actually alert); (pins: `../js/domain/prayerExport.js`, `../js/views/prayer.js`)
- `tests/prayerExport.test.js` — .ics prayer-times export (v5.2.0). Pure domain: event counts, midnight-wrap dates, escaping, filenames. (pins: `../js/domain/prayerExport.js`)
- `tests/prayerInsights.test.js` — (v5.10.1) prayer-log analytics (best streak, 30-day insights) plus the iqama-wait sanitizer allowlist. (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/domain/prayerLog.js`)
- `tests/prayerLog.test.js` — tri-state five-prayer log (pure module) (pins: `../js/domain/prayerLog.js`)
- `tests/prayerTimeline.test.js` — full-day timeline strip math (v5.2.0). (pins: `../js/domain/prayerTimeline.js`)
- `tests/product-cycle-85.test.js` — (no header comment) (pins: —)
- `tests/product-cycle-86.test.js` — (no header comment) (pins: —)
- `tests/product-cycle-87.test.js` — (no header comment) (pins: `../js/views/tajweedCourseView.js`, `../js/views/tajweedPracticeView.js`)
- `tests/product-cycle-88.test.js` — (no header comment) (pins: `../js/views/studyTray.js`)
- `tests/product-cycle-90.test.js` — (no header comment) (pins: `../js/views/tajweedPracticeView.js`)
- `tests/product-cycle-92.test.js` — (no header comment) (pins: `../js/views/studyTray.js`)
- `tests/profiles.test.js` — app-wide progress profiles: create/switch/ delete isolation (no streak leakage) + restore boundary. (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`)
- `tests/protoGuard.test.js` — prototype-pollution regression tests (S3). A crafted backup / hand-edited localStorage passes through sanitizeRestoredPayload, sanitizeSettings (contentPrefs) and (pins: `../js/app/net.js`, `../js/core/config.js`, `../js/core/schema.js`, `../js/core/state/restore.js`, `../js/core/utils.js`, `../js/domain/contentLens.js`)
- `tests/provenance.test.js` — (no header comment) (pins: —)
- `tests/qibla.test.js` — (no header comment) (pins: `../js/domain/qibla.js`)
- `tests/quickTiles.test.js` — item 11 (home quick-actions) gates: 1. the registry holds the 8 historic tiles (ids, destinations, icons, labels resolving EN + AR, accents); (pins: `../js/core/config.js`, `../js/core/i18n.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/domain/quickTiles.js`, `../js/views/home.js`, `../js/views/settings.js`)
- `tests/quiz-memory-5.2.85.test.js` — UP-08 cross-session weak-item memory. Pure domain + reducer + restore checks (no DOM, no network). (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/domain/quiz.js`)
- `tests/quiz-mistakes-5.2.80.test.js` — UP-08: missed ids feed a review round. Pure reducer + deck-builder checks (randomness only shuffles; membership assertions stay deterministic). (pins: `../js/app/quizDeck.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`)
- `tests/quran-invalid-route.test.js` — (no header comment) (pins: `../js/core/state/initial.js`, `../js/views/quran.js`)
- `tests/quranSearch.test.js` — v3.6 — full-text Qur'an search: diacritic-insensitive Arabic matching, translation matching, hostile-input safety, and the bulk reducer. (pins: `../js/core/state.js`, `../js/core/utils.js`, `../js/domain/quranSearch.js`)
- `tests/quranWordStudyCoverage.test.js` — / Full-corpus Quran word-study coverage gate. (pins: `../js/domain/wordStudy.js`, `./helpers/seedMode.mjs`)
- `tests/ramadan-dedup.test.js` — B5 regression: a reload inside the suhoor/iftar catch-up window must not re-fire the adhan. Simulated by loading two fresh module instances sharing one localStorage (a "reload" wipes the (pins: `../js/domain/calendar.js`, `../js/domain/prayer.js`, `../js/domain/ramadan.js`)
- `tests/ramadan-deslopify.test.js` — (no header comment) (pins: —)
- `tests/ramadan.test.js` — pure-logic tests for the Ramadan companion module. Run: node --test tests/ramadan.test.js (pins: `../js/core/state/slices/worship.js`, `../js/domain/calendar.js`, `../js/domain/ramadan.js`, `../js/domain/ramadanPlanner.js`, `../js/views/ramadan.js`)
- `tests/reader-window.test.js` — v5.2.17 (B12), permanent. The classic reader's window memory was the last module-scoped view state: render mutated it while rendering, so the store, the (pins: `../js/core/state.js`, `../js/domain/readerWindow.js`)
- `tests/readingTimer.test.js` — the reading session timer: pure view/sync decisions, the reducer accumulation contract, and the duration format. (pins: `../js/app/readingTimer.js`, `../js/app/rt.js`, `../js/core/config.js`, `../js/core/state.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/utils.js`, `../js/views/statistics.js`)
- `tests/recitation-console.test.js` — Blueprint E step 1: one console builder, three hosts. Pins the 13-action set (exactly once each), non-empty labels, mushaf-order chevrons on every host, and snapshot normalization. (pins: `../js/services/surahPlayback.js`, `../js/ui/recitationConsole.js`)
- `tests/recitation-gapless.test.js` — (v5.10.3) ping-pong handoff + URL walk: preload() buffers the next file on the spare, play() swaps onto it when ready, mirror deaths walk silently, and only the final failure speaks. (pins: —)
- `tests/recitation-honesty.test.js` — two claims that audits have reported as open, repeatedly, and which are in fact shipped. Both are pinned here by EXECUTION so the report stops costing time: (pins: `../js/core/config/sanitize.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/views/playerBar.js`)
- `tests/recitation-listeners.test.js` — B3 regression: verse-failure listeners coexist (toast wiring + verse session) instead of clobbering one slot, and a stopped session unregisters so later single-ayah failures still (pins: —)
- `tests/referenceAr.test.js` — audit §5.4 first light (v5.2.70) gates: 1. collection matching folds diacritics + curly quotes (Ṣaḥīḥ, Aḥmad, Tirmidhī, Jami’, Qur’an) with byte-identical remainders from RAW; (pins: `../js/core/schema.js`, `../js/domain/localeContent.js`)
- `tests/reminder-settings.test.js` — B-2: the first-class clock settings (Jumu'ah, daily verse, Zakat al-Fitr) persisted since v4.4 now fire through the scheduler. Firing is observed two ways: captured (pins: `../js/core/utils.js`, `../js/domain/calendar.js`, `../js/services/notifications.js`)
- `tests/reminderPresets.test.js` — Jumu'ah + daily-verse presets (v5.2.0). Date math, recurrence shape, dedupe, and null-safety. Pure domain. (pins: `../js/domain/reminderPresets.js`, `../js/services/calendarNotes.js`)
- `tests/renderPatch.test.js` — (no header comment) (pins: `../js/app/renderer.js`)
- `tests/rendered-text-integrity.test.js` — nothing renders as source code (v5.17.22) A hostile review found two things reaching the screen as literal markup: (pins: —)
- `tests/review-v3.21-fixes.test.js` — adversarial pass over v3.17–v3.20 (the 4-feature hostile review). Every test here pins a real finding: stored XSS via the quran bookmark, a mirror-drift the marker-grep test (pins: `../js/core/i18n.js`, `../js/core/state.js`, `../js/domain/fasting.js`, `../js/services/alertTriggers.js`, `../js/services/notifications.js`, `../js/views/home.js`)
- `tests/review-v3.3-fixes.test.js` — Regression tests for the v3.3.0 adversarial-review fixes (see REVIEW-v3.3.0.md): settings sanitization, zakat symbol escaping, router malformed-hash resilience, and the service-worker precache (pins: `../js/core/config.js`, `../js/core/router.js`, `../js/core/state/initial.js`, `../js/domain/zakat.js`, `../js/views/settings.js`)
- `tests/review-v3.4-fixes.test.js` — Regression tests for the v3.4.0 live-walkthrough fixes (see REVIEW-v3.4.0.md): the completed-cycle counter badge, the zakat nisab-threshold double-escape, and reminder-time validation at the (pins: `../js/core/state.js`, `../js/domain/zakat.js`, `../js/services/notifications.js`, `../js/ui/card.js`, `../js/views/zakat.js`)
- `tests/review.test.js` — v3.23.0 worship "year in review". Layers: 1. pure aggregation (js/review.js) against a synthetic state with (pins: `../js/core/utils.js`, `../js/domain/calendar.js`, `../js/domain/review.js`, `../js/views/statistics.js`)
- `tests/root-aware-search.test.js` — (no header comment) (pins: `../js/domain/quranSearch.js`, `../js/domain/rootAwareSearch.js`, `../js/views/search.js`)
- `tests/roots-error-5.2.78.test.js` — BUG-02 completion: the roots tiers render error + Retry (not a forever skeleton) when flagged. Pure string-template checks (no DOM, no network). (pins: `../js/core/state/initial.js`, `../js/views/roots.js`)
- `tests/roots.test.js` — v3.22.0 root-family browser. Three layers, mirroring the wordStudy split: 1. pure-logic units (folding, search, form grouping, stats, sanitize) (pins: `../js/domain/roots.js`, `../js/views/roots.js`)
- `tests/rootsBrowse.test.js` — item 13 (roots browser) gates: 1. occurrenceGloss/occurrenceAyah resolve loaded data only (hostile shapes degrade to ''/null — never invented content); (pins: `../js/domain/roots.js`, `../js/views/roots.js`)
- `tests/rtl-mirror.test.js` — F-002/F-006: every hardcoded directional chevron is either mirrored by UI language (isRTL) or explicitly allowlisted with its reason. Book-order page turns (mushaf), surah sequence, (pins: —)
- `tests/rtlCss.test.js` — RTL discipline gate. User-facing CSS must use logical properties (margin-inline, padding-inline, inset-inline, text-align: start) so Arabic RTL mirrors correctly. Physical (pins: —)
- `tests/savedWords.test.js` — (no header comment) (pins: `../js/views/tafsirPanel.js`)
- `tests/schema.test.js` — (no header comment) (pins: `../js/core/config.js`, `../js/core/schema.js`)
- `tests/scripture-text-integrity.test.js` — (no header comment) (pins: —)
- `tests/search-cancel-5.2.82.test.js` — BUG-09: background corpus builds stop scheduling chunks once the person leaves Search (no network here: 113 warm surahs + the cancel check runs before any fetch). (pins: `../js/app/quranSearch.js`, `../js/app/rt.js`, `../js/app/tafsirSearch.js`, `../js/core/state.js`)
- `tests/search-offline-honesty.test.js` — an empty list and a failed fetch are different truths. THE DEFECT THIS PINS (pins: —)
- `tests/search-pagination-590.test.js` — (v5.9.0 origins, SEARCH-01 rework) explicit page-number contracts. No hard truncation: over-limit scopes render "Page X of Y" with (pins: `../js/domain/quranSearch.js`, `../js/views/search.js`)
- `tests/search-pagination-pages.test.js` — (SEARCH-01) explicit page-number contract. - "Page X of Y" + Previous/Next per scope (no Load More); - page count correct, no duplicated results across pages; (pins: `../js/domain/quranSearch.js`, `../js/domain/searchPagination.js`, `../js/views/search.js`)
- `tests/search-root-empty.test.js` — (no header comment) (pins: —)
- `tests/seedBundle.test.js` — / Seed-bundle contract: the slim archive is intentionally tiny but runnable. (pins: `./helpers/seedMode.mjs`)
- `tests/separation-renderers.test.js` — template-level language-separation gates (takeover audit A1-A4, A6, B2). The v5.2.31 audit pinned the contract at five renderers; the takeover (pins: `../js/domain/localeContent.js`, `../js/ui/card.js`, `../js/views/editor.js`, `../js/views/hadith.js`, `../js/views/quiz.js`)
- `tests/session-start-warm.test.js` — (v5.11.0 A) tap-parallel warm: start() fires the lookahead horizon's probes+preloads synchronously at tap time (concurrent with the first ayah's own storage probe), instead (pins: `../js/services/mushaf.js`, `../js/services/recitation.js`, `../js/services/surahPlayback.js`)
- `tests/settings-groups.test.js` — (v5.17.63) professional Settings sections. Arrangement only: the same 12 accordions, the same controls, the same contracts — now shelved into seven labelled groups (Setup & about · (pins: `../js/core/i18n.js`, `../js/core/utils.js`, `../js/views/settings.js`)
- `tests/settings-reciter-overflow.test.js` — (no header comment) (pins: —)
- `tests/settingsSection.test.js` — item 5 (settings accordion persistence + deep links) gates: 1. the sanitize allowlist mirrors the view's section slugs exactly (no (pins: `../js/core/config.js`, `../js/views/palette.js`, `../js/views/settings.js`)
- `tests/shahada-banner.test.js` — Home sacred-text contract. The Shahada is content, not decorative Home chrome. Home must not render it as a banner/footer/separator. (pins: `../js/core/state/initial.js`, `../js/views/home.js`)
- `tests/shareCard.test.js` — pure pieces of the image-card renderer (pins: `../js/services/shareCard.js`)
- `tests/shell-chrome.test.js` — static-shell + sheet-host contracts (v5.12.0 hostile review): 1. the skip link exists and the renderer localizes it on boot (H1 — (pins: `../js/ui/viewSheet.js`)
- `tests/sleepTimer.test.js` — sleep timers for both audio engines. Domain math (volume curve, countdown, arm/clear) plus the full-surah player wiring: arm/clear/snapshot, volume ownership, tick subscription. (pins: `../js/domain/sleepTimer.js`)
- `tests/startup-budget.test.js` — F-013, permanent. First-visit parse cost is the reason lazy views exist: every static views/ import in js/app/renderer.js is parsed before first paint. (pins: —)
- `tests/statistics-deslopify.test.js` — (no header comment) (pins: —)
- `tests/statistics.test.js` — derived-stats helpers added in v2.7.0 (pins: `../js/domain/statistics.js`)
- `tests/statisticsDepth.test.js` — (v5.10.1) statistics depth: daily-goal progress, streak coaching milestones, and the derived per-surah reading breakdown (pages read → surahs on those pages). (pins: `../js/domain/statistics.js`)
- `tests/statsExport.test.js` — item 4 (statistics export) gates: 1. buildStatsCSV emits the daily grain oldest-first (header + all four counters), coercing hostile values and skipping junk/rolled keys; (pins: `../js/core/utils.js`, `../js/domain/statistics.js`)
- `tests/streak.test.js` — item 2 (streak inflation) gates for the v5.2.45 rules in core/state/streak.js: 1. an idle today never inflates or breaks: empty history reads 0 (was (pins: `../js/core/state.js`, `../js/core/state/streak.js`, `../js/core/utils.js`)
- `tests/study-context.test.js` — (no header comment) (pins: `../js/core/router.js`, `../js/views/studyContext.js`)
- `tests/study-mode.test.js` — (no header comment) (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/domain/hadithSearch.js`, `../js/views/ayahStudy.js`)
- `tests/study-tray.test.js` — merged-plan item 7 (v5.17.54), permanent. The inline Qur'an study tray: tapping an ayah's Study control renders the SAME study panel inline UNDER the tapped ayah row (classic reader cards + (pins: `../js/app/events.js`, `../js/core/config.js`, `../js/core/i18n.js`, `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/reducer.js`, `../js/views/mushafReader.js`, `../js/views/quran.js`, `../js/views/studyTray.js`)
- `tests/studyLanguage.test.js` — item v5.2.68 (study in your language) gates: 1. the Settings tafsir picker lists bundled editions (native names), marks the active default, and dispatches mushaf-set-tafsir; (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/domain/grammarDrill.js`, `../js/domain/roots.js`, `../js/views/ayahStudy.js`, `../js/views/kids.js`, `../js/views/palette.js`, `../js/views/quran.js`, `../js/views/roots.js`, `../js/views/settings.js`, `../js/views/tafsirPanel.js`)
- `tests/surahPlayback.test.js` — (no header comment) (pins: `../js/services/mushaf.js`, `../js/services/recitation.js`, `../js/services/surahPlayback.js`)
- `tests/sw-migration.test.js` — (v5.17.2) audit F-04/F-05 follow-up. Static contract on the service-worker migration path (browser execution stays in CI): migration MUST be entry-bounded and MUST drop a fully (pins: —)
- `tests/symbols.test.js` — (no header comment) (pins: —)
- `tests/tafsir-study-context.test.js` — (no header comment) (pins: `../js/views/tafsirPanel.js`)
- `tests/tafsirEnglish.test.js` — item 20 (English tafsir) gates: 1. the en-mukhtasar catalog entry is bundled with names, slug and an explicit lang marker (neighbors and defaults untouched); (pins: `../js/views/tafsirPanel.js`, `./helpers/seedMode.mjs`)
- `tests/tafsirSearch.test.js` — bundled-edition full-text tafsir search. Pins the pure index (diacritic-insensitive AND + phrase bonus, hostile input, malformed files) and the hard rule: remote editions are never (pins: `../js/domain/tafsirSearch.js`)
- `tests/tajweed-classify.test.js` — the finished generator is finally reachable (v5.17.20) buildClassifyQuestion was written, tested and provenance-tagged when the (pins: `../js/domain/tajweed.js`, `../js/domain/tajweedPractice.js`, `../js/domain/tajweedSources.js`)
- `tests/tajweed-coherence.test.js` — (no header comment) (pins: `../js/domain/tajweed.js`, `../js/views/tafsirPanel.js`, `../js/views/tajweedPracticeView.js`, `../js/views/tajweedSettings.js`)
- `tests/tajweed-course.test.js` — the course spine, and both progression modes Two things are being protected here. First, honesty. The course must not become a place where religious prose (pins: `../js/domain/tajweed.js`, `../js/domain/tajweedCourse.js`, `../js/domain/tajweedSources.js`)
- `tests/tajweed-makharij.test.js` — the makharij/sifat spreads (v5.17.32) Handoff §8.4: render the 17/16/14 spread, never resolve it. There is no TAJ-09 ruling anywhere in the tree (docs/TRUSTED-SOURCES.md §1c and (pins: `../js/domain/tajweedCourse.js`, `../js/domain/tajweedSources.js`, `../js/views/tajweedCourseView.js`)
- `tests/tajweed-quiz-modes.test.js` — (TAJ-QUIZ-01) unified quiz modes on the existing classifier engine (no second quiz system). Modes: find-spans (existing) / find-word / classify / review. (pins: `../js/domain/tajweed.js`, `../js/domain/tajweedPractice.js`)
- `tests/tajweed-sources.test.js` — no rule may be taught without a citation (v5.17.18) The app teaches 20 tajweed rules with a one-sentence description each and no source field. A rule description is religious teaching, so AGENTS.md (pins: `../js/domain/tajweed.js`, `../js/domain/tajweedSources.js`)
- `tests/tajweed-words.test.js` — word-tap pop-up integrity (bug 1) + engine coverage for corpus-attested marks and rules (bug 2). Bug 1: mushaf pages, classic docs, and grammar records tokenize (pins: `../js/domain/tajweed.js`, `../js/domain/wordStudy.js`, `../js/views/tafsirPanel.js`, `./helpers/seedMode.mjs`)
- `tests/tajweed.test.js` — the deterministic Tajweed rule classifier. Test cases are chosen from well-known textbook examples so each assertion doubles as documentation of the rule it's checking. (pins: `../js/domain/tajweed.js`)
- `tests/tajweedLessons.test.js` — (v5.10.1) guided rule lessons: validated pool-drawn examples, unknown-id safety, and the lesson modal render (definition, example deep links, drill CTA). (pins: `../js/core/state/initial.js`, `../js/domain/tajweedLessons.js`, `../js/views/tajweedPracticeView.js`)
- `tests/tajweedPractice.test.js` — (no header comment) (pins: `../js/domain/tajweedPractice.js`)
- `tests/tasbihCaps.test.js` — OPEN-ISSUES #19: tasbih lifetime counters are unbounded. count is bounded by its target, but completedCycles and totalRecitations grew without end — a mashed dial (or a crafted (pins: `../js/core/state.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/core/utils.js`, `../js/services/tasbih.js`)
- `tests/tasbihCustom.test.js` — item 3 (tasbih custom dhikr) gates: 1. TASBIH_CUSTOM_ADD builds a capped entry (trimmed text, clamped named goal) and no-ops on empty input; (pins: `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/core/state/restore.js`, `../js/services/tasbih.js`, `../js/views/tasbih.js`)
- `tests/tier-log-hygiene.test.js` — (v5.2.87, P1-1) missing optional tiers (seed/slim bundle, pruned install) warn instead of erroring, so the e2e zero-console-error hygiene keeps catching real defects. Genuine failures (pins: `../js/app/net.js`)
- `tests/translationCompare.test.js` — translation-compare view helpers (v5.2.0): overlay reduction + visibility rules. Pure domain, no store. (pins: `../js/domain/translationCompare.js`)
- `tests/translations.test.js` — v3.15 "More Qur'an translations" gates: - config: TRANSLATION_EDITIONS allowlist, asTranslationEdition sanitize (garbage/prototype-ish/unknown → en-sahih), TRANSLATION_URL shape (pins: `../js/core/config.js`, `./helpers/seedMode.mjs`)
- `tests/trigger-plan.test.js` — B10 regression: one channel per arm must not leak an entangled port with a live handler. First worker reply wins; later duplicates are ignored. (pins: `../js/app/rt.js`, `../js/app/triggers.js`)
- `tests/utils.test.js` — (no header comment) (pins: `../js/core/utils.js`)
- `tests/v4.2-fixes.test.js` — Second improvement wave (v4.2) gates — one test per shipped fix, written against the exact regression it prevents: 1. restore.js allowlist + per-value sanitizers (the stored-XSS class: (pins: `../js/core/i18n.js`, `../js/core/state.js`, `../js/core/state/restore.js`, `../js/core/state/streak.js`, `../js/domain/readerWindow.js`, `../js/services/hadith.js`)
- `tests/v4.3-fixes.test.js` — third improvement wave (v4.3) gates, one test per shipped fix, each written against the exact regression it prevents: 1. longestDayStreak DST double-count (review.js key-based walk) (pins: `../js/app/events.js`, `../js/app/hadithData.js`, `../js/app/net.js`, `../js/core/state.js`, `../js/core/state/streak.js`, `../js/domain/calendar.js`, `../js/domain/fasting.js`, `../js/domain/ramadan.js`, `../js/domain/readerWindow.js`, `../js/domain/review.js`)
- `tests/v4.5-fixes.test.js` — regression suite for the v4.5 wave: - double-page spread math (right/left/next/prev) and its gating, - juz eighths ("Juz 18 · 3/8") from the real mushaf-meta index, (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/services/mushaf.js`, `../js/views/mushafReader.js`, `../js/views/quran.js`, `../js/views/tafsirPanel.js`)
- `tests/v4.5-flow.test.js` — the APP-FLOW.md invariant suite (v4.5). docs/APP-FLOW.md specifies the app as a DFA with eight navigation invariants (I1–I8). These tests pin the machine-checkable ones: (pins: `../js/core/config.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/ui/card.js`, `../js/views/focus.js`, `../js/views/mushafReader.js`, `../js/views/quran.js`, `../js/views/tasbih.js`)
- `tests/validate-lexicon-parity.test.js` — validator/domain citation parity. Pins that scripts/validate-lexicon.mjs isValidCitation rejects everything js/domain/lexicalProvenance.js isValidCitation rejects: tracking/beacon (pins: `../js/domain/lexicalProvenance.js`)
- `tests/verseAudio.test.js` — item 18 (verse audio offline) gates: 1. verseKey shapes IDs; the verse layer degrades silently without IndexedDB (no-idb / null / false / []); (pins: `../js/core/config.js`, `../js/core/config/quran.js`, `../js/core/state/actions.js`, `../js/core/state/initial.js`, `../js/core/state/reducer.js`, `../js/services/audioStore.js`, `../js/views/audioManager.js`)
- `tests/view-boundary.test.js` — F-013 prerequisite, permanent. The Mushaf view is the heaviest module in the app, and five app-layer modules used to import it just to set two one-shot animation tokens — (pins: `../js/ui/readingTokens.js`)
- `tests/word-follow-spike.test.js` — (v5.11.0 B) pins the pure shapes behind the word-follow spike: segment normalization (drop hostile rows, never repair), audio URL validation, and the feasibility verdict. The live (pins: —)
- `tests/wordStudy.test.js` — (no header comment) (pins: `../js/domain/wordStudy.js`)
- `tests/wordStudyRender.test.js` — integration smoke test for the Qur'an word-study + multi-tafsir + Mushaf-settings templates. Unlike wordStudy.test.js (pure logic), this exercises the actual HTML-template (pins: `../js/core/config.js`, `../js/domain/tajweedPractice.js`, `../js/views/mushafReader.js`, `../js/views/quran.js`, `../js/views/tafsirPanel.js`, `../js/views/tajweedPracticeView.js`)
- `tests/worship.test.js` — (no header comment) (pins: `../js/core/state/slices/worship.js`, `../js/core/utils.js`, `../js/domain/calendar.js`, `../js/domain/worship.js`, `../js/views/home.js`)
- `tests/zakat-deslopify.test.js` — (no header comment) (pins: `../js/core/i18n/ar.js`, `../js/core/i18n/en.js`, `../js/views/zakat.js`)
- `tests/zakat.test.js` — pure-logic tests for the Zakat calculator module. Run: node --test tests/zakat.test.js (pins: `../js/domain/zakat.js`)

## Allowlist

No allowlisted actions: every static `data-action` resolves to a handler above.
