/**
 * core/state — package root docs live in core/state.js (the facade).
 */

import { DEFAULT_SETTINGS, DEFAULT_VIEW, SCHEMA_VERSION } from '../config.js';
import { clone } from '../utils.js';
import { defaultTajweedPracticeStats } from '../../domain/tajweedPractice.js';
import { defaultFastingPrefs } from '../../domain/fasting.js';
import { defaultNudgeState } from '../../domain/nudge.js';

export function initialState() {
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
    // (v5.2.0) Hadith bookmarks: ["<bookId>:<n>"] — the ayah-bookmark
    // equivalent for the hadith reader (hadith docs are ephemeral, so the
    // key carries everything needed to deep-link back).
    hadithBookmarks: [],
    // Personal notes on individual hadiths: { "<bookId>:<n>": text }.
    // Persisted + restore-sanitized like bookmarks (capped, key-shaped).
    hadithNotes: {},
    // Recitation queues (playlists): [{ id, name, items: [{ surah, from,
    // to }], createdAt }]. Persisted + restore-sanitized (capped counts,
    // clamped surah/ayah ints). Played in order through the verse engine.
    playlists: [],
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
    // (v4.5.2) Transient UI state — deliberately NOT in PERSISTED_KEYS:
    // manage mode is per-visit, never restored across reloads.
    ui: { contentManage: false },
    tasbih: { activeItemId: null, activePhrase: null },
    // Complete Qur'an text/meta, fetched lazily (never at boot) and cached
    // here in memory only — it's large enough (2.4MB across 114 files) that
    // persisting it to localStorage on every dispatch would be wasteful;
    // the browser HTTP cache / service worker already makes repeat visits fast.
    quran: { meta: null, surahs: {} },
    // v4.1 — transient per-tier fetch failure flags so views can render an
    // error + Retry instead of an infinite skeleton (keys like
    // 'quran-meta', 'mushaf-page', 'tafsir-editions', …). Ephemeral.
    loadErrors: {},
    loadRetryCount: 0,
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
    // Root-family browser index (v3.22.0, data/quran-roots-full.json):
    // UNCAPPED occurrence lists, fetched once on first open of the roots
    // view. Ephemeral like quranRoots — refetchable cached data, never
    // persisted, never restored from a backup.
    quranRootsFull: null,
    // Tafsir/i'rab/sarf/gharib catalog (data/tafsir-editions.json) + cached
    // per-(edition, surah) text. { [editionId]: { [surahNumber]: {ayah:text} } }
    tafsirEditions: null,
    tafsir: {},
    // Ephemeral — which word's grammar popover is open, if any:
    // { surah, ayah, i } | null. Never persisted; closes on navigation.
    activeWordStudy: null,
    // Curated ayah pool for the Tajweed practice/drill mode, fetched once.
    tajweedPool: null,
    // Persisted streak/accuracy stats for the drill mode.
    tajweedPracticeStats: defaultTajweedPracticeStats(),
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
    // v3.14 Phase C: in-flight surah-audio downloads (key -> true) so the
    // per-surah grid can show a busy spinner instead of a dead-looking tap.
    // Ephemeral by design — a reload simply forgets what was mid-flight.
    audioDownloading: {},
    // Ephemeral full-surah player state (DOM-patched per tick; only coarse
    // changes dispatch through here).
    player: { moshafId: null, surah: null, playing: false, offline: false },
    // Ephemeral download manager UI state (selected moshaf, search text,
    // and whether the catalog finished loading — flip once → one re-render).
    audioManager: { query: '', catalogReady: false, batchRunning: false },
    // Ahadeeth library (v3.9): lazy-loaded like the Qur'an corpus, never
    // persisted — the service worker caches the JSON files themselves, so a
    // fresh session refetches from cache at zero cost. `index` is the book
    // registry; `docs` holds loaded book documents; `daily` is today's
    // deterministic { bookId, n } pick for the Home card; bookView carries
    // the reader's in-book search/chapter/pager state; errors keys books
    // whose fetch failed so the reader can offer a retry instead of spinning.
    hadith: {
      index: null,
      indexFailed: false,
      docs: {},
      errors: {},
      daily: null,
      bookView: { query: '', section: 'all', page: 1 },
    },
    // Continuous surah recitation (v3.10): the "listen and follow along"
    // session driven by js/surahPlayback.js over the shared per-ayah audio
    // element. Ephemeral — a half-finished listening session has exactly
    // the same lifetime as a half-finished quiz. The engine module owns
    // the truth; this slice mirrors it so views render reactively.
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    // (v4.4) TRUE fullscreen Mushaf reading: the book fills the whole
    // viewport (width AND height), all app chrome hidden, controls
    // auto-fade. Ephemeral on purpose — it is a reading *gesture*, not a
    // preference; a reload (or navigating anywhere else) starts windowed.
    // NAVIGATE resets it (see reducer) and PERSISTED_KEYS ignores it.
    mushafFullscreen: false,
    // (v4.5) Classic-reader immersive mode: the study reader hides the
    // app chrome (topbar / nav, playerbar stays for recitation sessions)
    // and widens the reading column — the reader-side sibling of the
    // Mushaf's TRUE fullscreen. Ephemeral gesture, not a preference:
    // NAVIGATE resets it and PERSISTED_KEYS ignores it.
    readerImmersive: false,
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
    // Hifz (memorization, v3.17): per-surah spaced-repetition records —
    // PERSISTED (small, user-earned progress; see js/hifz.js for the
    // interval ladder and the hostile-shape sanitize rules).
    hifzRecords: {},
    // Voluntary (sunnah) fasting prefs, v3.18 — PERSISTED. The fasts
    // themselves share the ramadanLog map (month keys ≠ 9); only the
    // category/reminder preferences live here. See js/fasting.js.
    fastingPrefs: defaultFastingPrefs(),
    // Quick-log sadaqah, v3.19 — PERSISTED. [{ id, ts, note }] newest-first,
    // capped. The "given today" counter for the combined worship card; a
    // full amount/note editor is a recorded follow-up (TODO residual).
    sadaqahLog: [],
    // (v4.4) Sunnah prayer tracker — { 'YYYY-MM-DD': { tahajjud, duha,
    // rawatib, witr } }. Separate from dailyChecklist so the fard log and
    // its streaks stay untouched. See domain/sunnah.js.
    sunnahLog: {},
    // (v4.4) Qada' (make-up) tracker — [{ id, prayer, reason, date, ts,
    // doneAt }], newest-first, capped. See domain/qada.js.
    qadaLog: [],
    // (v4.4) Named location profiles for prayer times (home/work/travel).
    // The ACTIVE location stays in settings.prayer; profiles are snapshots
    // the user re-applies in one tap. Capped at 5. See domain/locations.js.
    locationProfiles: [],
    // (v4.4) Private dua journal — [{ id, ts, date, text, answered,
    // answeredTs }] newest-first, capped. See domain/duaJournal.js.
    duaJournal: [],
    // (v4.4) Weekly reflections — [{ id, ts, week, promptId, text }].
    reflections: [],
    // (v4.4) Ramadan planner logs, same hijri-keyed shape as ramadanLog:
    // taraweeh nights, i'tikaf days, last-ten-nights checklist.
    // See domain/ramadanPlanner.js.
    taraweehLog: {},
    itikafLog: {},
    lastTenLog: {},
    // (v4.4) Multi-profile hifz: records for every NON-active profile
    // ({ [profileId]: recordsMap }); the active profile's records live in
    // hifzRecords untouched, so every existing consumer keeps working.
    hifzProfileStore: {},
    hifzActiveProfile: 'main',
    // Ephemeral (v4.4) — the look-alike (mutashabihat) drill session:
    // today's seed, the picked option, reveal flag, and the running score.
    mutashabihat: { seed: null, picked: null, reveal: false, right: 0, wrong: 0 },
    // Ephemeral (v4.4) — reader immersion mode (hides app chrome while on).
    immersiveReader: false,
    // Gentle "it's been a while" nudge (v3.25) — the day the card last
    // actually painted (or was dismissed), as 'YYYY-MM-DD'. One small
    // persisted write; every decision rule and the anti-guilt contract
    // live in js/nudge.js.
    nudge: defaultNudgeState(),
    // Data health (v3.26) — the timestamp of the last backup EXPORT (the
    // only honest "backed up" this zero-server app can know). PERSISTED;
    // sanitized in restore. Written by the export-backup action.
    backupMeta: { lastBackupAt: null },
    // Ephemeral (v3.26) — the Settings data-health readouts: the storage
    // estimate for this session's device and the last restore-dry-run
    // report. Describes this session, never persisted.
    dataHealth: { storage: null, dryRun: null },
    // Ephemeral (v3.25) — the nudge was dismissed this session; a reload
    // starts a new session, and the 7-day quiet-stretch spacing (not the
    // dismissal) governs any future showing.
    nudgeDismissed: false,
    // Ephemeral memorize session for the classic reader: which surah is in
    // memorize mode, the cloze level ('word' | 'ayah'), and what has been
    // revealed this session ({ [ayah]: { all } | { words: {[i]: true} } }).
    // Never persisted — a study session has quiz-session lifetime.
    hifzSession: { mode: false, surah: null, level: 'word', revealed: {} },
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
    // Ephemeral (v3.20) — prayer-alert reliability status for the honest
    // status row in the Prayer view: how the next adhan alerts will actually
    // fire in THIS session's browser. modes: 'unknown' (not measured yet,
    // row hidden) | 'off' (no alert enabled) | 'permission' (notifications
    // not granted) | 'tab' (in-tab scheduler only) | 'triggers' (next 24h
    // pre-scheduled with the browser; count = armed alerts). Never
    // persisted — it describes this session, not the user's progress.
    alertTriggerStatus: { mode: 'unknown', count: 0 },
  };
}

export const PERSISTED_KEYS = [
  // exported for the v3.14 ephemeral-state gate
  'settings',
  'favorites',
  'hadithBookmarks',
  'hadithNotes',
  'playlists',
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
  'tajweedPracticeStats',
  'hifzRecords',
  'fastingPrefs',
  'sadaqahLog',
  'sunnahLog',
  'qadaLog',
  'locationProfiles',
  'duaJournal',
  'reflections',
  'taraweehLog',
  'itikafLog',
  'lastTenLog',
  'hifzProfileStore',
  'hifzActiveProfile',
  'nudge',
  'backupMeta',
];

export function pickPersisted(state) {
  const out = {};
  for (const key of PERSISTED_KEYS) out[key] = state[key];
  return out;
}
