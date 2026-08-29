/**
 * app.js
 * Entry point. Responsibilities:
 *  1. Boot: hydrate persisted state, fetch + migrate + normalize + validate
 *     every catalog library, build the search index, mount the shell.
 *  2. Wire the store -> renderer subscription.
 *  3. Own the single delegated DOM event listener for the entire app
 *     (click / input / change / submit / keydown) so no view module ever
 *     attaches its own listeners.
 */

import {
  CATALOG_URL,
  QURAN_META_URL,
  QURAN_SURAH_URL,
  TRANSLATION_URL,
  overlayTranslation,
  MUSHAF_META_URL,
  MUSHAF_PAGE_URL,
  VIEWS,
  QUIZ_LENGTH,
  QUIZ_CHOICE_COUNT,
  QUIZ_LIBRARY_ID,
  MUSHAF_PAGE_COUNT,
  QURAN_WORDS_URL,
  QURAN_ROOTS_URL,
  TAFSIR_EDITIONS_URL,
  TAFSIR_TEXT_URL,
  TAFSIR_REMOTE_URL,
  TAJWEED_PRACTICE_POOL_URL,
  HADITH_INDEX_URL,
  HADITH_BOOK_URL,
} from './config.js';
import { store, actions, persistedSnapshot } from './state.js';
import { migrate } from './migration.js';
import { processDocument } from './schema.js';
import { buildIndex } from './search.js';
import { buildQuranIndex, isQuranSearchReady, setQuranIndexReady } from './quranSearch.js';
import { render, mountShell } from './renderer.js';
import { applyTheme, watchSystemTheme } from './theme.js';
import { initRouter, go, replaceGo } from './router.js';
import { pickRoundEntry, buildAnswerKey, scoreRound } from './tajweedPractice.js';
import { buildPracticePicker, buildPracticeRound } from './views/tajweedPracticeView.js';
import { t } from './i18n.js';
import { pickLocale, uid, vibrate, dateKey } from './utils.js';
import {
  validateHadithIndex,
  validateHadithDoc,
  pickDailyHadith,
  pageForNumber,
} from './hadith.js';
import * as tasbih from './tasbih.js';
import * as soundDesign from './soundDesign.js';
import { markCelebration } from './celebrate.js';
import * as speech from './speech.js';
import * as backup from './backup.js';
import * as notifications from './notifications.js';
import * as editorApi from './editor.js';
import * as compass from './compass.js';
import { qiblaBearing } from './qibla.js';
import { updateQiblaCompassDOM } from './views/qibla.js';
import {
  clampPage,
  nextPage as mushafNextPage,
  prevPage as mushafPrevPage,
  resolvePage as resolveMushafPage,
} from './mushaf.js';
import * as recitation from './recitation.js';
import * as surahPlayback from './surahPlayback.js';
import {
  buildMushafJump,
  buildMushafAyahDetail,
  buildMushafBookmarks,
  setBookmarkFolderFilter,
  buildKhatmaPlanForm,
  setFlipDirection,
  setActiveTafsirTab,
  getActiveTafsirTab,
} from './views/mushafReader.js';
import { buildWordStudyPanel, buildMushafSettingsPanel } from './views/tafsirPanel.js';
import { calculateTimes, nextPrayer } from './prayer.js';
import { fastPhase, formatCountdown } from './ramadan.js';
import { computeZakat, computeFitr, hawlDueFor } from './zakat.js';
import {
  loadCatalog,
  findMoshaf,
  surahUrl,
  customMoshafId,
  validateCustomServer,
  searchReciters,
} from './audioCatalog.js';
import * as audioStore from './audioStore.js';
import * as player from './player.js';
import { openModal, closeModal, isModalOpen } from './components/modal.js';
import { showToast } from './components/toast.js';
import {
  buildCardMenu,
  buildCollectionPicker,
  buildConfirm,
  buildTextPrompt,
} from './components/menus.js';
import { buildItemForm, buildCategoryForm, buildLibraryForm } from './views/editor.js';
import { buildDayDetail, buildNoteForm } from './components/calendarModals.js';
import { PRESETS as TASBIH_PRESETS } from './views/tasbih.js';
import { playSound, previewAlert, refreshCustomAdhanFlags, stopAdhan } from './prayerSound.js';
import { dayComplete } from './prayerLog.js';
import { generateCardBlob, downloadBlob, cardFilename } from './shareCard.js';
import { ramadanKhatmaPreset } from './khatma.js';

const { requestPermission } = notifications;

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function buildItemIndex(documents, customContent) {
  const index = {};
  const allDocs = [...Object.values(documents), ...Object.values(customContent)];
  for (const doc of allDocs) {
    for (const category of doc.categories) {
      for (const item of category.items) {
        index[item.id] = { item, category, document: doc };
      }
    }
  }
  return index;
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function loadLibraries() {
  const documents = {};
  const order = [];
  try {
    const catalog = await fetchJSON(CATALOG_URL);
    const libs = (catalog.libraries || [])
      .filter((l) => l.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Fetch every library file in parallel (they're independent), then apply
    // results back in catalog order so display order stays deterministic
    // regardless of which network request happens to resolve first.
    const results = await Promise.all(
      libs.map(async (lib) => {
        try {
          const raw = await fetchJSON(lib.file);
          const migrated = migrate(raw, lib.id);
          const result = processDocument(migrated);
          if (!result.success) {
            console.error(`[boot] ${lib.id} failed validation:`, result.error);
            return null;
          }
          return { id: lib.id, doc: result.value };
        } catch (err) {
          console.error(`[boot] Failed to load library "${lib.id}"`, err);
          return null;
        }
      })
    );

    for (const entry of results) {
      if (!entry) continue;
      documents[entry.id] = entry.doc;
      order.push(entry.id);
    }
  } catch (err) {
    console.error('[boot] Failed to load catalog.json', err);
  }
  return { documents, order };
}

function refreshLibraryIndex() {
  const state = store.getState();
  const itemIndex = buildItemIndex(state.library.documents, state.customContent);
  store.dispatch(actions.setLibraryIndex(itemIndex));
  buildIndex(itemIndex);
  // Content edits (bundled-library updates, imports) can remove item ids that
  // favorites/collections still reference. Prune those dead references so
  // counts stay honest and backups stay clean. Reducer no-ops when clean.
  store.dispatch(actions.pruneDanglingRefs(new Set(Object.keys(itemIndex))));
}

let lastCustomContentRef = null;

/* ------------------------------------------------------------------ */
/* Mobile nav drawer: open/close with focus management                 */
/* ------------------------------------------------------------------ */

let navDrawerOpener = null;

function openNavDrawer() {
  const active = document.activeElement;
  navDrawerOpener = active && typeof active.focus === 'function' ? active : null;
  document.body.classList.add('nav-drawer-open');
  // Move focus into the sheet so keyboard/SR users land inside it, not on
  // the covered page behind the overlay.
  requestAnimationFrame(() => {
    const closeBtn = document.querySelector('.nav-drawer [data-action="nav-drawer-close"]');
    closeBtn?.focus();
  });
}

function closeNavDrawer() {
  if (!document.body.classList.contains('nav-drawer-open')) return;
  document.body.classList.remove('nav-drawer-open');
  navDrawerOpener?.focus();
  navDrawerOpener = null;
}

/**
 * Renders directly to #main, bypassing renderer.js/views entirely, since
 * those are exactly what might be throwing. This is the last line of
 * defense: whatever broke, the user always gets a legible message and a
 * working way out, never a silent blank screen.
 */
function renderErrorScreen(err) {
  console.error('[app] Unrecoverable render error:', err);
  const main = document.getElementById('main') || document.body;
  main.innerHTML = `
    <div style="max-width:420px;margin:15vh auto;padding:24px;text-align:center;font-family:system-ui,sans-serif;">
      <p style="font-size:2rem;margin-bottom:8px;">\u26A0\uFE0F</p>
      <h1 style="font-size:1.25rem;margin-bottom:8px;">Something went wrong</h1>
      <p style="color:#666;font-size:0.9rem;margin-bottom:20px;">
        This usually means saved data on this device became corrupted (for
        example, from a bad backup import). Your favorites and settings are
        still on disk — reloading the page may fix it. If not, resetting
        will restore the app to a clean working state.
      </p>
      <button id="error-reload-btn" style="margin:4px;padding:10px 20px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;">Reload</button>
      <button id="error-reset-btn" style="margin:4px;padding:10px 20px;border-radius:8px;border:none;background:#B91C1C;color:#fff;cursor:pointer;">Reset app data</button>
    </div>`;
  document
    .getElementById('error-reload-btn')
    ?.addEventListener('click', () => window.location.reload());
  document.getElementById('error-reset-btn')?.addEventListener('click', () => {
    try {
      localStorage.removeItem('nurAlDhikr:v2:state');
    } catch {
      /* ignore */
    }
    window.location.hash = '';
    window.location.reload();
  });
}

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

function onStateChange(stateArg, action) {
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
    if (state.customContent !== lastCustomContentRef) {
      lastCustomContentRef = state.customContent;
      refreshLibraryIndex();
      state = store.getState();
    }
    // FIX (review v3.1 A1/B3): RESTORE_STATE / RESET_ALL wipe the ephemeral
    // quran/mushaf slices, but the lazy-fetch "started" guards below are
    // module-level and used to stay true — leaving the readers stuck on
    // "Loading…" for the rest of the session. Whenever the data is gone,
    // the guard is wrong: reset it so the next navigation refetches.
    if (!state.quran.meta) quranMetaFetchStarted = false;
    if (!state.mushaf.meta) mushafMetaFetchStarted = false;
    // v3.15: translation edition changed through ANY path (settings picker,
    // backup restore, reset) → re-merge loaded surah docs once, and reset
    // the search-index latch so the index re-warms in the new language.
    if (
      lastSeenTranslationEdition !== null &&
      state.settings.quranTranslation !== lastSeenTranslationEdition
    ) {
      applyTranslationEdition(state.settings.quranTranslation);
    }
    lastSeenTranslationEdition = state.settings.quranTranslation;
    applyTheme(state.settings);
    if (state.activeView === VIEWS.QURAN) ensureQuranData(state);
    if (state.activeView === VIEWS.MUSHAF) ensureMushafData(state);
    if (state.activeView === VIEWS.AUDIO) ensureRecitersData(state);
    if (state.activeView === VIEWS.HADITH) ensureHadithData(state);
    updateCompassLifecycle(state);
    updateRamadanLifecycle(state);
    updateHomeTickerLifecycle(state);
    maybeStartQuranSearchBuild(state);
    if (!isSelfRenderedSettingsUpdate(action)) render(state);
    maybeScrollToFocusAyah(state);
    maybeScrollToFocusHadith(state);
    maybeFollowRecitation(state);
  } catch (err) {
    renderErrorScreen(err);
  }
}

/* ------------------------------------------------------------------ */
/* Qur'an surah document loading (with translation overlay)            */
/* ------------------------------------------------------------------ */
// Every surah doc that enters the app flows through loadSurahDoc(): the
// corpus file (Uthmani text + inline Sahih International) is fetched once
// and kept in surahCorpusCache — the pristine copy — and when the user has
// selected a non-default translation edition, the matching overlay file
// from data/translations/{edition}/{n}.json is merged on top (pure
// overlayTranslation from config.js). Both readers, the mushaf ayah
// detail, the tajweed practice pool and the search index therefore all see
// the selected edition without a single per-view change. The overlay
// files ride the service worker's stale-while-revalidate data rule, so an
// edition works offline after its first use.

const surahCorpusCache = new Map();
const translationDocCache = new Map();

async function fetchTranslationOverlay(edKey, n) {
  const key = `${edKey}:${n}`;
  let tdoc = translationDocCache.get(key);
  if (!tdoc) {
    tdoc = await fetchJSON(TRANSLATION_URL(edKey, n));
    translationDocCache.set(key, tdoc);
  }
  return tdoc;
}

async function loadSurahDoc(n) {
  const id = String(n);
  let doc = surahCorpusCache.get(id);
  if (!doc) {
    doc = await fetchJSON(QURAN_SURAH_URL(id));
    surahCorpusCache.set(id, doc);
  }
  // Edition freshness: the setting can change while the corpus/overlay
  // fetches are in flight (rapid switching). A doc merged with a stale
  // edition must never be dispatched — re-check after every await and
  // redo the overlay if the target moved (bounded, converges because the
  // switch itself re-merges loaded surahs).
  for (let attempt = 0; attempt < 3; attempt++) {
    const edKey = store.getState().settings.quranTranslation;
    if (!edKey || edKey === 'en-sahih') return { ...doc, translationEdition: 'en-sahih' };
    try {
      const tdoc = await fetchTranslationOverlay(edKey, id);
      const merged = overlayTranslation(doc, tdoc);
      if (store.getState().settings.quranTranslation === edKey) {
        if (merged !== doc) return { ...merged, translationEdition: edKey };
        console.warn('[quran] translation overlay shape mismatch, keeping Sahih', edKey, id);
        return { ...doc, translationEdition: 'en-sahih' };
      }
      // edition moved mid-fetch — loop and merge against the new one
    } catch (err) {
      console.warn('[quran] translation file unavailable, keeping Sahih', edKey, id, err);
      return { ...doc, translationEdition: 'en-sahih' };
    }
  }
  console.warn('[quran] edition kept changing under surah load, giving up on overlay', id);
  return { ...doc, translationEdition: 'en-sahih' };
}

/**
 * Dispatch a surah doc only when its translation content matches the
 * CURRENT setting. loadSurahDoc stamps translationEdition on every doc;
 * if the setting moved between merge-start and dispatch (the one window
 * the in-load re-check cannot see), re-fetch/merge once against the
 * current edition, then dispatch whatever we have — the reader is never
 * blocked, worst case it shows the bundled Sahih text for one surah.
 */
async function dispatchSurahDoc(id) {
  let doc = await loadSurahDoc(id);
  const want = store.getState().settings.quranTranslation || 'en-sahih';
  if ((doc.translationEdition || 'en-sahih') !== want) {
    doc = await loadSurahDoc(id);
  }
  store.dispatch(actions.setQuranSurah(String(id), doc));
  return doc;
}

/**
 * Edition switch (settings change, backup restore, reset): re-derive every
 * already-loaded surah doc from its pristine corpus copy with the new
 * edition overlaid, in ONE bulk dispatch, and reset the full-text search
 * latch so the index re-warms in the new language on next search open
 * (already-cached surahs make that re-warm nearly free). Failures fall
 * back to the pristine doc per surah — a missing overlay file must never
 * blank or block the reader.
 *
 * SINGLE-FLIGHT: rapid switching must never run two re-merge loops
 * concurrently (their bulk dispatches would interleave and fight). While a
 * switch runs, later requests just update `editionSwitchTarget`; the
 * running loop re-checks after each await and the collapsed runner
 * re-executes once with the final target if it moved.
 */
let editionSwitchRunning = false;
let editionSwitchTarget = null;

async function runEditionSwitch(edKey) {
  const existing = store.getState().quran.surahs;
  const ids = Object.keys(existing);
  if (!ids.length) return;
  const merged = {};
  for (const id of ids) {
    // collapse: a newer switch request supersedes this pass mid-loop
    if (editionSwitchTarget !== null && editionSwitchTarget !== edKey) return;
    const pristine = surahCorpusCache.get(id) || existing[id];
    if (!edKey || edKey === 'en-sahih') {
      merged[id] = { ...pristine, translationEdition: 'en-sahih' };
      continue;
    }
    try {
      const tdoc = await fetchTranslationOverlay(edKey, id);
      merged[id] = { ...overlayTranslation(pristine, tdoc), translationEdition: edKey };
    } catch (err) {
      console.warn('[quran] edition switch: overlay unavailable for', edKey, id, err);
      merged[id] = { ...pristine, translationEdition: 'en-sahih' };
    }
  }
  if (editionSwitchTarget !== null && editionSwitchTarget !== edKey) return;
  store.dispatch(actions.setQuranSurahsBulk(merged));
  setQuranIndexReady(false);
  quranSearchBuildStarted = false;
}

async function applyTranslationEdition(edKey) {
  if (editionSwitchRunning) {
    editionSwitchTarget = edKey; // latest target wins; runner picks it up
    return;
  }
  editionSwitchRunning = true;
  editionSwitchTarget = edKey;
  try {
    // Collapse loop: keep running until the target stops moving.
    while (editionSwitchTarget !== null) {
      const target = editionSwitchTarget;
      try {
        await runEditionSwitch(target);
      } catch (err) {
        console.error('[quran] applyTranslationEdition failed', err);
      }
      if (editionSwitchTarget === target) editionSwitchTarget = null;
    }
  } finally {
    editionSwitchRunning = false;
    editionSwitchTarget = null;
  }
}

// Tracks the last edition seen by the store subscriber so every change
// path (settings UI, backup restore, factory reset) triggers exactly one
// re-merge. null = first run (boot), never triggers.
let lastSeenTranslationEdition = null;

/* ------------------------------------------------------------------ */
/* Qur'an full-text search corpus                                       */
/* ------------------------------------------------------------------ */
// The classic reader fetches surah documents lazily, one at a time — fine
// for reading, useless for searching. The first full-text search therefore
// fetches the whole corpus (~2.7MB of local JSON) in one batch, dispatches
// a single bulk action so the view re-renders exactly once, and builds the
// index in quranSearch.js. The service worker caches every surah file on
// its way through, so this whole flow works offline after the first use.

let quranSearchBuildStarted = false;

async function ensureQuranSearchData() {
  if (quranSearchBuildStarted || isQuranSearchReady()) return;
  quranSearchBuildStarted = true;
  try {
    if (!store.getState().quran.meta) {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
    }
    const existing = store.getState().quran.surahs;
    const missing = [];
    for (let n = 1; n <= 114; n++) {
      if (!existing[String(n)]) missing.push(n);
    }
    // Fetch in modest chunks so a flaky connection surfaces errors early
    // instead of after 114 parallel requests.
    const CHUNK = 24;
    const fetched = {};
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      const docs = await Promise.all(
        chunk.map(async (n) => {
          try {
            let doc = await loadSurahDoc(n);
            const want = store.getState().settings.quranTranslation || 'en-sahih';
            if ((doc.translationEdition || 'en-sahih') !== want) {
              doc = await loadSurahDoc(n);
            }
            return doc;
          } catch (err) {
            console.error('[quran-search] failed to load surah', n, err);
            return null;
          }
        })
      );
      chunk.forEach((n, j) => {
        if (docs[j]) fetched[n] = docs[j];
      });
    }
    buildQuranIndex({ ...existing, ...fetched });
    setQuranIndexReady(true);
    // Bulk-warm the reader cache too (one dispatch, one re-render): search
    // results link into the per-surah reader, which should never have to
    // re-fetch something already on screen.
    store.dispatch(actions.setQuranSurahsBulk(fetched));
  } catch (err) {
    console.error('[quran-search] corpus load failed', err);
    quranSearchBuildStarted = false; // allow a retry on the next query
  }
}

/* Deep-link scroll target: '#/quran/36?ay=12' focuses ayah 12 once its
 * element exists. Because the surah document may still be in flight when
 * NAVIGATE fires, attempts repeat across subsequent renders until success
 * or until the user navigates elsewhere (whichever comes first). */
let pendingAyahScroll = null;
let ayahScrollAttempts = 0;

function maybeScrollToFocusAyah(state) {
  if (state.activeView !== VIEWS.QURAN || state.activeParams?.ay == null) {
    pendingAyahScroll = null;
    return;
  }
  const want = String(state.activeParams.ay);
  if (
    pendingAyahScroll === null ||
    pendingAyahScroll.queryKey !== `${state.activeParams.id}:${want}`
  ) {
    pendingAyahScroll = { ay: want, queryKey: `${state.activeParams.id}:${want}` };
    ayahScrollAttempts = 0;
  }
  requestAnimationFrame(() => {
    if (!pendingAyahScroll) return;
    const el = document.getElementById(`ayah-${pendingAyahScroll.ay}`);
    if (el) {
      pendingAyahScroll = null;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (++ayahScrollAttempts > 20) {
      pendingAyahScroll = null; // give up silently — never wedge the app
    }
  });
}

function maybeStartQuranSearchBuild(state) {
  if (
    state.activeView === VIEWS.SEARCH &&
    (state.activeParams?.q || '').trim() &&
    !isQuranSearchReady()
  ) {
    ensureQuranSearchData();
  }
}

/* ------------------------------------------------------------------ */
/* Ahadeeth library (v3.9)                                             */
/* ------------------------------------------------------------------ */
// Lazy-loading mirrors the Qur'an corpus pattern: the index (book registry)
// and the small bundled books are SW-precached; each big Sahih is fetched
// the first time its book is opened and cached offline forever after.
// Fetched JSON is untrusted: validateHadith*() degrades malformed documents
// to a load failure (with an in-app retry) instead of crashing a render.

let hadithIndexStarted = false;
const hadithBookFetches = new Map();
let hadithBookViewLastId = null;
let hadithDeepRef = null;

async function ensureHadithIndex(force = false) {
  if (store.getState().hadith.index) return true;
  if (hadithIndexStarted && !force) return false;
  hadithIndexStarted = true;
  try {
    const raw = await fetchJSON(HADITH_INDEX_URL);
    const index = validateHadithIndex(raw);
    if (!index) throw new Error('malformed hadith index');
    store.dispatch(actions.setHadithIndex(index));
    return true;
  } catch (err) {
    console.error('[hadith] index load failed', err);
    store.dispatch(actions.hadithIndexFailed());
    hadithIndexStarted = false; // the Retry button calls again with force
    return false;
  }
}

async function ensureHadithBook(id, force = false) {
  const bookId = String(id || '');
  if (!/^[a-z0-9-]{1,40}$/.test(bookId)) return false; // id is also a path segment
  if (store.getState().hadith.docs[bookId]) return true;
  if (hadithBookFetches.has(bookId) && !force) return hadithBookFetches.get(bookId);
  const p = (async () => {
    try {
      const raw = await fetchJSON(HADITH_BOOK_URL(bookId));
      const doc = validateHadithDoc(raw);
      if (!doc || doc.id !== bookId) throw new Error('malformed book document');
      store.dispatch(actions.setHadithBook(bookId, doc));
      return true;
    } catch (err) {
      console.error('[hadith] book load failed', bookId, err);
      store.dispatch(actions.hadithBookFailed(bookId));
      hadithBookFetches.delete(bookId); // allow a retry
      return false;
    }
  })();
  hadithBookFetches.set(bookId, p);
  return p;
}

/** Per-view loader: runs on every render of the Ahadeeth screens. */
function ensureHadithData(state) {
  ensureHadithIndex();
  const bookId = String(state.activeParams?.id || '');
  if (!bookId) {
    hadithBookViewLastId = null;
    hadithDeepRef = null;
    return;
  }
  // Reset the reader's search/chapter/pager state when switching books —
  // a stale query from Bukhari must never pre-filter Muslim.
  if (hadithBookViewLastId !== bookId) {
    hadithBookViewLastId = bookId;
    hadithDeepRef = null;
    store.dispatch(actions.setHadithView({ query: '', section: 'all', page: 1, consumedN: null }));
  }
  const doc = state.hadith.docs[bookId];
  const deepN = state.activeParams?.n;
  // Deep link ?n=<number>: resolve its page once per (book, number) pair.
  // The book document may still be in flight on the first render — the
  // key guard keeps retrying on subsequent renders like the ayah scroller.
  if (doc && deepN != null && hadithDeepRef !== `${bookId}:${deepN}`) {
    hadithDeepRef = `${bookId}:${deepN}`;
    const page = pageForNumber(
      doc,
      Number(deepN),
      state.hadith.bookView.section,
      state.hadith.bookView.query
    );
    store.dispatch(actions.setHadithView({ page: page ?? 1, consumedN: String(deepN) }));
  }
}

/** Deterministic daily hadith for the Home card: index + bundled books
 *  (both SW-precached, so this never forces a big-Sahih download), then one
 *  HADITH_DAILY_SET dispatch. Same (date, data) → same hadith, forever. */
let hadithDailyStarted = false;
async function warmHadithDaily() {
  if (hadithDailyStarted) return;
  hadithDailyStarted = true;
  try {
    const gotIndex = await ensureHadithIndex();
    if (!gotIndex) return;
    const bundled = (store.getState().hadith.index?.books || []).filter((b) => b.bundled);
    await Promise.all(bundled.map((b) => ensureHadithBook(b.id)));
    const st = store.getState();
    const daily = pickDailyHadith(
      st.hadith.index?.books || [],
      st.hadith.docs,
      dateKey(new Date())
    );
    if (daily) store.dispatch(actions.setHadithDaily({ bookId: daily.bookId, n: daily.hadith.n }));
  } catch (err) {
    console.error('[hadith] daily warm failed', err);
    hadithDailyStarted = false; // next boot/session retries
  }
}

/** Deep-link scroll for '#/hadith/<book>?n=<n>' — the hadith card may still
 *  be loading when the view first renders, so attempts repeat across
 *  renders until success or navigation away (same contract as the ayah one). */
let pendingHadithScroll = null;
let hadithScrollAttempts = 0;

function maybeScrollToFocusHadith(state) {
  if (state.activeView !== VIEWS.HADITH || state.activeParams?.n == null) {
    pendingHadithScroll = null;
    return;
  }
  const want = String(state.activeParams.n);
  const key = `${state.activeParams?.id}:${want}`;
  if (pendingHadithScroll === null || pendingHadithScroll.queryKey !== key) {
    pendingHadithScroll = { n: want, queryKey: key };
    hadithScrollAttempts = 0;
  }
  requestAnimationFrame(() => {
    if (!pendingHadithScroll) return;
    const el = document.getElementById(`hadith-${CSS.escape(pendingHadithScroll.n)}`);
    if (el) {
      pendingHadithScroll = null;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (++hadithScrollAttempts > 20) {
      pendingHadithScroll = null;
    }
  });
}

/** Page flips land the list's top in view — otherwise the pager buttons
 *  scroll away underneath the reader's thumb/finger. */
function scrollToHadithListTop() {
  requestAnimationFrame(() => {
    document.querySelector('.hadith-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

/* ------------------------------------------------------------------ */
/* Continuous recitation: follow effects (v3.10)                        */
/* ------------------------------------------------------------------ */
// The engine mirrors progress into state.surahPlayback; this effect keeps
// the VIEW synced when "follow" is on: the classic reader scrolls to the
// reciting ayah, the Mushaf flips to the right PAGE and then scrolls the
// ayah into view. Fires only on ayah CHANGES — never on every render — so
// the person can still scroll freely between verses.
let lastFollowedAyahKey = null;

function maybeFollowRecitation(state) {
  const sp = state.surahPlayback;
  if (!sp.active || !sp.ayah) {
    lastFollowedAyahKey = null;
    return;
  }
  if (!(state.settings.audio.ayahFollow ?? true)) return;
  const key = `${sp.surah}:${sp.ayah}`;
  if (key === lastFollowedAyahKey) return;
  lastFollowedAyahKey = key;

  if (
    state.activeView === VIEWS.QURAN &&
    String(state.activeParams?.id || '') === String(sp.surah)
  ) {
    requestAnimationFrame(() => {
      document
        .getElementById(`ayah-${CSS.escape(String(sp.ayah))}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return;
  }

  if (state.activeView === VIEWS.MUSHAF) {
    const meta = state.mushaf.meta;
    const page = meta ? resolveMushafPage(meta.ayahPages, sp.surah, sp.ayah) : null;
    if (!page) return;
    const current = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    if (page !== current) {
      setFlipDirection(page > current ? 'next' : 'prev');
      playFlipSound();
      go(VIEWS.MUSHAF, { page: String(page) });
      return;
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`.mushaf-ayah[data-surah="${sp.surah}"][data-ayah="${sp.ayah}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Qibla: device compass lifecycle                                     */
/* ------------------------------------------------------------------ */
// deviceorientation fires at native sensor frequency (often 30-60Hz), so
// the heading is smoothed and DOM-patched directly via rAF rather than
// dispatched through the store — see the header comment in compass.js.

let compassRunning = false;
let compassRAFHandle = null;
let smoothedHeading = null;
let headingIsAccurate = false;

function handleCompassHeading(heading, accurate) {
  if (smoothedHeading == null) {
    smoothedHeading = heading;
  } else {
    let diff = heading - smoothedHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    smoothedHeading = (smoothedHeading + diff * 0.25 + 360) % 360;
  }
  headingIsAccurate = accurate;
  if (compassRAFHandle) return;
  compassRAFHandle = requestAnimationFrame(() => {
    compassRAFHandle = null;
    const state = store.getState();
    if (state.activeView !== VIEWS.QIBLA) return;
    const p = state.settings.prayer;
    if (p.latitude == null || p.longitude == null) return;
    const bearing = qiblaBearing(p.latitude, p.longitude);
    updateQiblaCompassDOM(bearing, smoothedHeading, headingIsAccurate, state.settings.language);
  });
}

function startCompassIfNeeded() {
  if (compassRunning) return;
  compassRunning = true;
  smoothedHeading = null;
  compass.start(handleCompassHeading);
}

function stopCompass() {
  if (!compassRunning) return;
  compassRunning = false;
  if (compassRAFHandle) {
    cancelAnimationFrame(compassRAFHandle);
    compassRAFHandle = null;
  }
  compass.stop();
}

/* ------------------------------------------------------------------ */
/* Full-surah audio: catalog + player + offline downloads              */
/* ------------------------------------------------------------------ */

let batchCancelled = false;

async function startAudioPlay(moshafId, surah) {
  const state = store.getState();
  // FIX (review A1): the reciters catalog is lazily loaded by the Audio
  // view — but this path runs from the Qur'an view, the player bar, and
  // auto-advance. Guarantee the catalog before resolving any moshaf.
  // loadCatalog() is idempotent and cached; it never throws.
  await loadCatalog();
  const customs = state.settings.customReciters || [];
  let moshaf = findMoshaf(moshafId, customs);
  if (!moshaf) {
    // First launch (no preference yet) or a stale/removed id: fall back to
    // Al-Husary murattal, then to the first entry in the catalog.
    const husary = findMoshaf('mp3-118-118', customs);
    moshafId = husary ? husary.id : searchReciters('', customs)[0]?.id;
    moshaf = findMoshaf(moshafId, customs);
  }
  if (!moshaf) {
    showToast(t('audio.playFailed', state.settings.language));
    store.dispatch(actions.setAudioPlayer({ moshafId: null, surah: null, playing: false }));
    return;
  }
  // FIX (review A3): one voice at a time — starting a surah stops any
  // verse-by-verse recitation in flight.
  if (recitation.currentlyPlayingKey()) recitation.stop();
  store.dispatch(actions.setAudioPlayer({ moshafId, surah, playing: true }));
  store.dispatch(actions.setAudioPrefs({ moshafId }));
  try {
    const { offline, error } = await player.play(moshafId, surah, surahUrl(moshaf.server, surah));
    store.dispatch(actions.setAudioPlayer({ offline }));
    // FIX (review A2/B4): playback could not start (dead URL, autoplay
    // rejection, storage failure) — revert the optimistic state and say
    // so, instead of a player bar that mimes playing forever.
    if (error) {
      store.dispatch(actions.setAudioPlayer({ playing: false }));
      showToast(t('audio.playFailed', state.settings.language));
    }
  } catch (err) {
    console.error('[app] startAudioPlay failed', err);
    store.dispatch(actions.setAudioPlayer({ playing: false }));
    showToast(t('audio.playFailed', state.settings.language));
  }
}

function wirePlayer() {
  player.onPlayerPatch((info) => {
    // DOM patches only — never the store — while audio is running.
    const bar = document.querySelector('.player-bar');
    if (!bar) return;
    const timeEl = bar.querySelector('[data-player-time]');
    const durEl = bar.querySelector('[data-player-dur]');
    const seek = bar.querySelector('[data-player-seek]');
    const bufEl = bar.querySelector('[data-player-buffer]');
    const fmt = (s) => {
      const n = Math.max(0, Math.floor(s || 0));
      return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
    };
    // While the seek thumb is being dragged (it has focus), the live preview
    // written by the input handler owns the time label — don't let the
    // timeupdate patches overwrite it until the drag ends.
    if (timeEl && !(seek && document.activeElement === seek))
      timeEl.textContent = fmt(info.currentTime);
    if (durEl) durEl.textContent = fmt(info.duration);
    if (seek && document.activeElement !== seek && info.duration > 0) {
      seek.value = String((info.currentTime / info.duration) * 100);
    }
    // FIX (review A6): honest buffering state — shown only when the element
    // wants to play but has no data yet, never as a false "playing".
    if (bufEl) bufEl.hidden = !info.buffering;
  });
  // FIX (review A10): the element is the source of truth — if the OS,
  // headphones, or a suspended tab pause playback, the store follows.
  player.onPlayingStateChange((playing) => {
    const p = store.getState().player;
    if (p?.moshafId && p.playing !== playing) {
      store.dispatch(actions.setAudioPlayer({ playing }));
    }
  });
  // FIX (review A2/R12): a mid-stream drop (tunnel Wi-Fi) reverts the UI
  // and tells the person — no silent lying bar.
  player.onPlayerError(() => {
    const p = store.getState().player;
    if (p?.moshafId && p.playing) {
      store.dispatch(actions.setAudioPlayer({ playing: false }));
      showToast(t('audio.playFailed', store.getState().settings.language));
    }
  });
  // FIX (review A7/B8): verse playback failures are spoken, not swallowed.
  recitation.onPlaybackError(() => {
    showToast(t('audio.playFailed', store.getState().settings.language));
  });
  player.onTrackEnded(() => {
    const state = store.getState();
    const p = state.player;
    if (!p?.moshafId || p.surah == null) return;
    if (state.settings.audio.repeat === 'one') {
      startAudioPlay(p.moshafId, p.surah);
      return;
    }
    if (p.surah < 114) startAudioPlay(p.moshafId, p.surah + 1);
    else store.dispatch(actions.setAudioPlayer({ playing: false }));
  });
}

async function ensureRecitersData(state) {
  if (state.activeView !== VIEWS.AUDIO) return;
  const doc = await loadCatalog();
  // Flip catalogReady exactly once: true state change → one re-render that
  // drops the loading hint. Reducer no-ops on every later call.
  if (doc) store.dispatch(actions.setAudioCatalogReady());
}

async function downloadOne(moshafId, surah) {
  const state = store.getState();
  const moshaf = findMoshaf(moshafId, state.settings.customReciters || []);
  if (!moshaf) return { ok: false, error: 'no-moshaf' };
  const res = await audioStore.downloadSurah(moshafId, surah, surahUrl(moshaf.server, surah));
  if (res.ok)
    store.dispatch(actions.markAudioDownload(audioStore.audioKey(moshafId, surah), res.bytes));
  return res;
}

function updateCompassLifecycle(state) {
  const onQibla = state.activeView === VIEWS.QIBLA;
  if (!onQibla) {
    stopCompass();
    return;
  }
  // On browsers that require an explicit permission prompt (iOS Safari),
  // wait for the person to tap "Enable Compass" (see clickHandlers below)
  // rather than starting automatically.
  if (compass.isSupported() && !compass.needsPermission()) startCompassIfNeeded();
}

/* ------------------------------------------------------------------ */
/* Ramadan: live Suhoor/Iftar countdown                                */
/* ------------------------------------------------------------------ */
// A per-second countdown must not flow through the store — dispatching
// every second would re-render the whole view and hammer localStorage
// (the store persists on every action). Instead, exactly like the Qibla
// compass heading, a single interval patches the countdown DOM node's
// text directly; the view itself only re-renders on real state changes.

let ramadanTickerHandle = null;

function ramadanTick() {
  const state = store.getState();
  if (state.activeView !== VIEWS.RAMADAN) return;
  const el = document.querySelector('[data-ramadan-countdown]');
  if (!el) return;

  const p = state.settings.prayer;
  if (p.latitude == null || p.longitude == null) return;

  const now = new Date();
  const tz = -now.getTimezoneOffset() / 60;
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowTimes = calculateTimes({
    date: tomorrow,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });

  const phase = fastPhase(now, times, tomorrowTimes.fajr);
  const nowMs =
    now.getHours() * 3600000 +
    now.getMinutes() * 60000 +
    now.getSeconds() * 1000 +
    now.getMilliseconds();
  let targetMs = phase.targetHours * 3600000;
  if (targetMs <= nowMs) targetMs += 86400000; // night phase counting into tomorrow
  el.textContent = formatCountdown(targetMs - nowMs);

  // Phase rollover (Iftar reached, or Suhoor end reached): the label data
  // is stale, so nudge a cheap re-render through a no-op-ish store action.
  if (targetMs - nowMs < 1000) store.dispatch(actions.setSpeakingItem(null));
}

function updateRamadanLifecycle(state) {
  const onRamadan = state.activeView === VIEWS.RAMADAN;
  if (onRamadan && ramadanTickerHandle == null) {
    ramadanTick();
    ramadanTickerHandle = setInterval(ramadanTick, 1000);
  } else if (!onRamadan && ramadanTickerHandle != null) {
    clearInterval(ramadanTickerHandle);
    ramadanTickerHandle = null;
  }
}

/* ------------------------------------------------------------------ */
/* Home: live next-prayer countdown                                    */
/* ------------------------------------------------------------------ */
// Same discipline as the Ramadan ticker: a per-second clock must not flow
// through the store (it would re-render Home and hit localStorage every
// second). One interval patches [data-home-countdown] directly; the view
// re-renders only on genuine state changes.

let homeTickerHandle = null;

function homeTick() {
  const state = store.getState();
  if (state.activeView !== VIEWS.HOME) return;
  const el = document.querySelector('[data-home-countdown]');
  if (!el) return;

  const p = state.settings.prayer;
  if (p.latitude == null || p.longitude == null) return;

  const now = new Date();
  const tz = -now.getTimezoneOffset() / 60;
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });
  if (!times) return;
  const next = nextPrayer(times, now);

  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const diffHours = (next.hours - nowHours + 24) % 24;
  const totalSec = Math.round(diffHours * 3600);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  el.textContent =
    h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;

  // Prayer rollover: the name/clock-time next to the countdown is now stale.
  // Nudge a cheap re-render the same way the Ramadan ticker does.
  if (totalSec < 1) store.dispatch(actions.setSpeakingItem(null));
}

function updateHomeTickerLifecycle(state) {
  const onHome = state.activeView === VIEWS.HOME;
  if (onHome && homeTickerHandle == null) {
    homeTick();
    homeTickerHandle = setInterval(homeTick, 1000);
  } else if (!onHome && homeTickerHandle != null) {
    clearInterval(homeTickerHandle);
    homeTickerHandle = null;
  }
}

/* ------------------------------------------------------------------ */
/* Qur'an: lazy data loading                                           */
/* ------------------------------------------------------------------ */
// The Qur'an is intentionally excluded from loadLibraries()/boot() — at
// ~2.4MB across 114 surah files it would slow every app launch for a
// feature most sessions never open. Instead it's fetched on demand, the
// first time the person actually navigates to the Qur'an view, and cached
// in state.quran for the rest of the session.

let quranMetaFetchStarted = false;
const quranSurahFetchesInFlight = new Set();
let mushafMetaFetchStarted = false;
const mushafPageFetchesInFlight = new Set();

async function ensureQuranData(state) {
  if (!state.quran.meta && !quranMetaFetchStarted) {
    quranMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
    } catch (err) {
      console.error('[quran] failed to load meta', err);
      quranMetaFetchStarted = false; // allow a retry on the next navigation
    }
  }

  const id = state.activeParams.id;
  if (!id) return;

  if (state.quranBookmark.surah !== id) {
    store.dispatch(actions.setQuranBookmark(id));
  }

  if (!state.quran.surahs[id] && !quranSurahFetchesInFlight.has(id)) {
    quranSurahFetchesInFlight.add(id);
    try {
      await dispatchSurahDoc(id);
    } catch (err) {
      console.error('[quran] failed to load surah', id, err);
    } finally {
      quranSurahFetchesInFlight.delete(id);
    }
  }

  if (state.settings.mushafPrefs.wordByWordStudy) {
    ensureQuranWordsData(store.getState(), id);
  }
}

async function ensureMushafData(state) {
  // The ayah-detail audio button needs quran-meta.json's per-surah ayah
  // counts to compute the global ayah number the recitation CDN keys audio
  // by. Only the classic reader normally triggers that fetch (via
  // ensureQuranData), so make sure it happens here too — otherwise opening
  // the Mushaf reader before ever visiting the classic reader would leave
  // the Listen button unable to resolve a URL.
  if (!state.quran.meta && !quranMetaFetchStarted) {
    quranMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
    } catch (err) {
      console.error('[quran] failed to load meta', err);
      quranMetaFetchStarted = false;
    }
  }

  if (!state.mushaf.meta && !mushafMetaFetchStarted) {
    mushafMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(MUSHAF_META_URL);
      store.dispatch(actions.setMushafMeta(meta));
    } catch (err) {
      console.error('[mushaf] failed to load page index', err);
      mushafMetaFetchStarted = false; // allow a retry on the next navigation
    }
  }

  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const key = String(page);

  if (state.mushafBookmark.page !== page) {
    store.dispatch(actions.setMushafBookmark(page));
  }

  // Khatma progress: opening a page counts as having read it. Idempotent
  // (the reducer no-ops when already marked), so it's safe on every render.
  if (!state.mushafPagesRead[key]) {
    store.dispatch(actions.markMushafPageVisited(key));
    // The reducer just recorded a khatma completion if this was the final
    // page — celebrate once, here, where side effects belong.
    if (Object.keys(store.getState().mushafPagesRead).length >= MUSHAF_PAGE_COUNT) {
      showToast(t('khatma.completeToast', store.getState().settings.language), { duration: 6000 });
      // v3.14 Phase C: optional (off-by-default) completion chime — see
      // js/soundDesign.js. Fires in the same once-only window as the toast.
      soundDesign.playKhatmaChime(store.getState().settings.khatmaChimeSound);
    }
  }

  if (!state.mushaf.pages[key] && !mushafPageFetchesInFlight.has(key)) {
    mushafPageFetchesInFlight.add(key);
    try {
      const doc = await fetchJSON(MUSHAF_PAGE_URL(key));
      store.dispatch(actions.setMushafPage(key, doc));
    } catch (err) {
      console.error('[mushaf] failed to load page', key, err);
    } finally {
      mushafPageFetchesInFlight.delete(key);
    }
  }

  // Prefetch the adjacent page too, so tapping next/prev (or swiping) feels
  // instant most of the time instead of showing the loading state on every
  // single page turn — the whole point of a "flip through it" reader.
  for (const adj of [mushafNextPage(page), mushafPrevPage(page)]) {
    const adjKey = String(adj);
    if (adjKey !== key && !state.mushaf.pages[adjKey] && !mushafPageFetchesInFlight.has(adjKey)) {
      mushafPageFetchesInFlight.add(adjKey);
      fetchJSON(MUSHAF_PAGE_URL(adjKey))
        .then((doc) => store.dispatch(actions.setMushafPage(adjKey, doc)))
        .catch(() => {
          /* best-effort prefetch; a real navigation there will retry */
        })
        .finally(() => mushafPageFetchesInFlight.delete(adjKey));
    }
  }

  // Word-by-word study data for every surah touched by this page, so the
  // words render as tappable spans immediately rather than only after a
  // separate fetch triggered by the first tap.
  if (state.settings.mushafPrefs.wordByWordStudy) {
    const freshDoc = store.getState().mushaf.pages[key];
    if (freshDoc) {
      for (const chapter of freshDoc.chapters) {
        ensureQuranWordsData(store.getState(), chapter.number);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Word study + tafsir: lazy data loading                              */
/* ------------------------------------------------------------------ */

const quranWordsFetchesInFlight = new Set();
let quranRootsFetchStarted = false;
let tafsirEditionsFetchStarted = false;
const tafsirTextFetchesInFlight = new Set();

async function ensureQuranWordsData(state, surahNumber) {
  const id = String(surahNumber);
  if (state.quranWords[id] || quranWordsFetchesInFlight.has(id)) return;
  quranWordsFetchesInFlight.add(id);
  try {
    const words = await fetchJSON(QURAN_WORDS_URL(id));
    store.dispatch(actions.setQuranWords(id, words));
  } catch (err) {
    console.error('[wordStudy] failed to load word data', id, err);
  } finally {
    quranWordsFetchesInFlight.delete(id);
  }
}

async function ensureQuranRoots(state) {
  if (state.quranRoots || quranRootsFetchStarted) return;
  quranRootsFetchStarted = true;
  try {
    const roots = await fetchJSON(QURAN_ROOTS_URL);
    store.dispatch(actions.setQuranRoots(roots));
  } catch (err) {
    console.error('[wordStudy] failed to load root index', err);
    quranRootsFetchStarted = false;
  }
}

async function ensureTafsirEditions(state) {
  if (state.tafsirEditions || tafsirEditionsFetchStarted) return;
  tafsirEditionsFetchStarted = true;
  try {
    const editions = await fetchJSON(TAFSIR_EDITIONS_URL);
    store.dispatch(actions.setTafsirEditions(editions));
  } catch (err) {
    console.error('[tafsir] failed to load editions catalog', err);
    tafsirEditionsFetchStarted = false;
  }
}

let tajweedPoolFetchStarted = false;
async function ensureTajweedPool(state) {
  if (state.tajweedPool || tajweedPoolFetchStarted) return;
  tajweedPoolFetchStarted = true;
  try {
    const pool = await fetchJSON(TAJWEED_PRACTICE_POOL_URL);
    store.dispatch(actions.setTajweedPool(pool));
  } catch (err) {
    console.error('[tajweed] failed to load practice pool', err);
    tajweedPoolFetchStarted = false;
  }
}

/** Bundled editions fetch from the app's own data/ folder; on-demand
 *  ("remote") editions only ever fetch when `allowRemote` is explicitly
 *  passed (the person tapped "Download") — never silently over the network. */
async function ensureTafsirText(state, editionId, surahNumber, allowRemote = false) {
  const id = String(surahNumber);
  const key = `${editionId}:${id}`;
  if (state.tafsir?.[editionId]?.[id] || tafsirTextFetchesInFlight.has(key)) return true;
  const edition = (state.tafsirEditions?.editions || []).find((e) => e.id === editionId);
  if (!edition) return false;
  if (!edition.bundled && !allowRemote) return false;
  tafsirTextFetchesInFlight.add(key);
  try {
    const url = edition.bundled
      ? TAFSIR_TEXT_URL(editionId, id)
      : TAFSIR_REMOTE_URL(edition.slug, id);
    const raw = await fetchJSON(url);
    // The remote spa5k/tafsir_api shape is an array of {text, ayah, surah};
    // the bundled shape is already {ayah: text}. Normalize once here.
    const text = Array.isArray(raw)
      ? Object.fromEntries(
          raw.filter((r) => r.ayah != null && r.text).map((r) => [String(r.ayah), r.text.trim()])
        )
      : raw;
    store.dispatch(actions.setTafsirText(editionId, id, text));
    return true;
  } catch (err) {
    console.error('[tafsir] failed to load text', key, err);
    return false;
  } finally {
    tafsirTextFetchesInFlight.delete(key);
  }
}

/** Open the shared ayah-detail + tafsir modal from anywhere (Mushaf tap,
 *  classic reader's Tafsir button, or the word-study popover's "open
 *  tafsir" shortcut). `page` is the Mushaf page to record on a new
 *  bookmark, or null when opened from a context with no page concept. */
/** Best-effort page lookup for contexts where we don't already know the
 *  page (root-jump, tafsir tab switches, the classic reader's Tafsir
 *  button): search pages already in memory first, then fall back to the
 *  Mushaf index's "first page of this surah" if it's loaded, else null
 *  (in which case the ayah-detail modal simply omits the bookmark button). */
function currentAyahDetailPage(surah, ayah) {
  const state = store.getState();
  for (const [pageNum, doc] of Object.entries(state.mushaf.pages)) {
    const chapter = doc.chapters.find((c) => String(c.number) === String(surah));
    if (chapter?.verses.some((v) => String(v.number) === String(ayah))) return Number(pageNum);
  }
  return state.mushaf.meta?.surahFirstPage?.[String(surah)] || null;
}

async function openAyahStudy(surah, ayah, page = null) {
  let state = store.getState();
  if (!state.quran.meta) {
    try {
      store.dispatch(actions.setQuranMeta(await fetchJSON(QURAN_META_URL)));
    } catch {
      /* best effort */
    }
  }
  if (!state.quran.surahs[String(surah)]) {
    try {
      await dispatchSurahDoc(surah);
    } catch {
      /* best effort */
    }
  }
  await ensureTafsirEditions(store.getState());
  state = store.getState();
  const defaultId = getActiveTafsirTab() || state.settings.mushafPrefs.defaultTafsir;
  setActiveTafsirTab(defaultId);
  if (defaultId) await ensureTafsirText(store.getState(), defaultId, surah);
  state = store.getState();
  const surahDoc = state.quran.surahs[String(surah)];
  const arabicText = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayah))?.text || '';
  openModal(buildMushafAyahDetail(arabicText, surahDoc, surah, ayah, state, page), {
    labelledBy: 'modal-title-mushaf-ayah',
  });
}

/* ------------------------------------------------------------------ */
/* Tajweed practice / drill mode                                       */
/* ------------------------------------------------------------------ */

// Transient round state — a half-tapped quiz has no business being
// persisted or undo-able, same reasoning as flipDirection/activeTafsirTab.
let practiceSession = null;

function renderPracticeRound() {
  openModal(buildPracticeRound(store.getState(), practiceSession), {
    labelledBy: 'modal-title-practice',
  });
}

async function startPracticeRound(ruleId) {
  const state = store.getState();
  await ensureTajweedPool(state);
  const pool = store.getState().tajweedPool;
  const avoid =
    practiceSession && practiceSession.ruleId === ruleId
      ? { s: practiceSession.surah, a: practiceSession.ayah }
      : null;
  const entry = pickRoundEntry(pool, ruleId, avoid);
  if (!entry) {
    showToast(t('practice.noneAvailable', state.settings.language));
    return;
  }
  if (!store.getState().quran.surahs[String(entry.s)]) {
    try {
      await dispatchSurahDoc(entry.s);
    } catch (err) {
      console.error('[tajweed] failed to load surah for practice', entry.s, err);
      showToast(t('practice.loadFailed', state.settings.language));
      return;
    }
  }
  const surahDoc = store.getState().quran.surahs[String(entry.s)];
  const ayahText = surahDoc?.ayahs?.find((a) => String(a.number) === String(entry.a))?.text;
  if (!ayahText) {
    showToast(t('practice.loadFailed', state.settings.language));
    return;
  }
  practiceSession = {
    ruleId,
    surah: entry.s,
    ayah: entry.a,
    text: ayahText,
    selected: new Set(),
    checked: false,
    targets: buildAnswerKey(ayahText, ruleId),
    result: null,
  };
  renderPracticeRound();
}

async function boot() {
  mountShell();
  try {
    store.hydrate();

    const { documents, order } = await loadLibraries();
    store.dispatch(actions.bootComplete({ documents, order, itemIndex: {} }));
    refreshLibraryIndex();
    lastCustomContentRef = store.getState().customContent;

    applyTheme(store.getState().settings);
    watchSystemTheme(() => applyTheme(store.getState().settings));
    speech.warmVoices();
    // Reflect the shared recitation <audio> element's play/stop state back
    // into the store so any card/button showing that ayah re-renders with
    // the right "now playing" affordance, the same way speakingItemId does
    // for text-to-speech.
    recitation.onPlaybackChange((key) => store.dispatch(actions.setRecitingAyah(key)));
    // Continuous recitation: the engine owns the audio; this mirrors its
    // progress into the store so every view (reader, Mushaf, player bar)
    // renders the moving highlight reactively.
    surahPlayback.onAyahChange((surah, ayah) => {
      store.dispatch(actions.setSurahPlayback({ active: ayah != null, surah, ayah }));
    });
    surahPlayback.onError((surah, ayah) => {
      console.error('[surah-playback] verse failed', surah, ayah);
      showToast(t('audio.reciteVerseFailed', store.getState().settings.language));
    });
    notifications.startScheduler(
      () => store.getState().reminders,
      store.getState().settings.language,
      () => store.getState().calendarNotes,
      () => store.getState().settings.prayer,
      () => store.getState().zakatHistory
    );

    store.subscribe(onStateChange);
    // FIX (review v3.1 A4): persistence failures (e.g. storage quota
    // exceeded) were silent — the app looked like it was saving while every
    // write was lost. One honest toast, once per broken session.
    store.onPersistError = () => {
      showToast(t('storage.persistFailed', store.getState().settings.language), { duration: 6000 });
    };
    wirePlayer();
    initRouter(); // dispatches the first NAVIGATE
    render(store.getState());

    // Warm today's daily hadith (index + small bundled books — never the
    // multi-MB Sahihs). Fire-and-forget: the Home card appears when ready.
    warmHadithDaily();

    registerServiceWorker();
    wireInstallPrompt();
    bindGlobalEvents();
  } catch (err) {
    renderErrorScreen(err);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const doRegister = () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registration) => {
        // PWA update flow: without this, a cache-first worker means people
        // who installed the app keep running the old build indefinitely —
        // the exact failure mode this app's changelog has had to fix by
        // hand before. When a freshly installed worker is *waiting* (i.e.
        // the person has already used the app before — controller exists),
        // offer a one-tap refresh. The worker itself answers SKIP_WAITING
        // (sw.js) and the reload lands in the new version.
        const offerUpdate = (worker) => {
          if (!navigator.serviceWorker.controller) return; // first install, nothing to update
          showToast(t('update.available', store.getState().settings.language), {
            duration: 0, // no auto-dismiss: an update notice should stay tappable
            actionLabel: t('update.refresh', store.getState().settings.language),
            onAction: () => {
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => window.location.reload(),
                { once: true }
              );
              worker.postMessage('SKIP_WAITING');
              // Belt-and-braces: if controllerchange never fires (e.g. the
              // browser decided otherwise), still reload after a grace period.
              setTimeout(() => window.location.reload(), 4000);
            },
          });
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          offerUpdate(registration.waiting);
        } else {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                offerUpdate(newWorker);
              }
            });
          });
        }

        // Also poll on regaining focus/network — installed PWAs can sit in
        // the background for weeks; this catches updates shipped meanwhile.
        const checkForUpdate = () => registration.update().catch(() => {});
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
        setInterval(checkForUpdate, 6 * 60 * 60 * 1000); // every 6h
      })
      .catch((err) => console.warn('[sw] registration failed', err));
  };
  // boot() is async and may finish well after window's 'load' event already fired
  // (e.g. slow catalog fetch), so check readyState instead of blindly awaiting 'load'.
  if (document.readyState === 'complete') doRegister();
  else window.addEventListener('load', doRegister);
}

/* ------------------------------------------------------------------ */
/* Install prompt (onboarding "Install the app" step)                  */
/* ------------------------------------------------------------------ */
// beforeinstallprompt can be consumed exactly once, so the event itself
// lives here; the store only carries the reactive flags (state.install)
// so the onboarding panel re-renders when availability changes. Browsers
// without the event (iOS Safari) simply show the manual hint instead.

let deferredInstallPrompt = null;

function wireInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's own mini-infobar out of the way
    deferredInstallPrompt = e;
    store.dispatch(actions.installPromptReady());
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    store.dispatch(actions.markAppInstalled());
  });
  // Already running standalone (launched from a home-screen icon)?
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) store.dispatch(actions.markAppInstalled());
}

/* ------------------------------------------------------------------ */
/* Shared lookups                                                      */
/* ------------------------------------------------------------------ */

function getItemEntry(itemId) {
  return store.getState().library.itemIndex[itemId] || null;
}

function itemClipboardText(item, lang) {
  const parts = [item.arabic, item.transliteration, pickLocale(item.translation, lang)].filter(
    Boolean
  );
  return parts.join('\n\n');
}

/* ------------------------------------------------------------------ */
/* Action handlers (click)                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Quiz: deck building                                                 */
/* ------------------------------------------------------------------ */
// Randomness lives here (the click handler), not in the reducer, so
// QUIZ_START itself stays a pure, deterministic action — consistent with
// how ids/random data are generated at the call site elsewhere in this
// file (e.g. uid() before COLLECTION_CREATE).

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuizDeck(state) {
  const doc = state.library.documents[QUIZ_LIBRARY_ID];
  const allIds = doc ? doc.categories.flatMap((c) => c.items.map((i) => i.id)) : [];
  if (allIds.length < QUIZ_CHOICE_COUNT) return [];
  const questionIds = shuffled(allIds).slice(0, Math.min(QUIZ_LENGTH, allIds.length));
  return questionIds.map((itemId) => {
    const distractors = shuffled(allIds.filter((id) => id !== itemId)).slice(
      0,
      QUIZ_CHOICE_COUNT - 1
    );
    return { itemId, choices: shuffled([itemId, ...distractors]) };
  });
}

const clickHandlers = {
  navigate: (ds) => {
    const params = {};
    if (ds.id) params.id = ds.id;
    if (ds.subId) params.subId = ds.subId;
    if (ds.month) params.month = ds.month;
    go(ds.view, params);
  },

  /* ---------------- Shell: collapsible nav ---------------- */

  'nav-toggle': () => {
    // Desktop: collapse/expand the side rail (persisted). Mobile: open the
    // grouped drawer sheet (transient body class — not worth persisting).
    const isDesktop = window.matchMedia('(min-width: 960px)').matches;
    if (isDesktop) {
      const next = !store.getState().settings.navCollapsed;
      store.dispatch(actions.updateSettings({ navCollapsed: next }));
    } else {
      openNavDrawer();
    }
  },

  'nav-drawer-close': () => {
    closeNavDrawer();
  },

  'nav-drawer-go': (ds) => {
    closeNavDrawer();
    go(ds.view, {});
  },

  'quick-theme-toggle': () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    store.dispatch(actions.updateSettings({ themeMode: isDark ? 'light' : 'dark' }));
  },

  'toggle-favorite': (ds) => {
    store.dispatch(actions.toggleFavorite(ds.itemId));
  },

  'counter-tap': (ds) => {
    const target = parseInt(ds.target, 10) || 1;
    const result = tasbih.increment(ds.itemId, ds.categoryId || null, target);
    tasbih.playTick(result.cycleCompleted ? 'complete' : 'tick');

    const state = store.getState();
    if (
      result.cycleCompleted &&
      state.activeView === VIEWS.FOCUS &&
      state.settings.autoAdvanceFocus
    ) {
      scheduleAutoAdvance();
    }
  },

  'open-focus': (ds) => {
    go(VIEWS.FOCUS, { id: ds.categoryId, subId: ds.itemId });
  },

  'focus-exit': (ds) => {
    go(VIEWS.CATEGORY, { id: ds.categoryId });
  },

  'focus-reset': (ds) => {
    tasbih.reset(ds.itemId, parseInt(ds.target, 10) || 1);
  },

  'open-card-menu': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const lang = store.getState().settings.language;
    openModal(buildCardMenu(entry.item, ds.categoryId, lang), { labelledBy: 'modal-title-menu' });
  },

  'copy-item': async (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const lang = store.getState().settings.language;
    const text = itemClipboardText(entry.item, lang);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
    closeModal();
  },

  'copy-ayah': async (ds) => {
    const state = store.getState();
    const surah = state.quran.surahs[ds.surah];
    if (!surah) return;
    const ayah = surah.ayahs.find((a) => String(a.number) === String(ds.ayah));
    if (!ayah) return;
    const lang = state.settings.language;
    const text = `${ayah.text}\n\n${ayah.translation}\n\n\u2014 ${t('quran.surah', lang)} ${surah.nameEn} (${surah.number}:${ayah.number})`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  // ---- Ahadeeth (v3.9) ----
  'hadith-copy': async (ds) => {
    const st = store.getState();
    const bookId = String(st.activeParams?.id || '');
    const doc = st.hadith.docs[bookId];
    const h = doc?.hadiths.find((x) => String(x.n) === String(ds.n));
    if (!h) return;
    const lang = st.settings.language;
    const text = `${h.ar}\n\n${h.en}\n\n\u2014 ${pickLocale(doc.name, lang)} \u2116${h.n}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  'hadith-section': (ds) => {
    store.dispatch(actions.setHadithView({ section: String(ds.id || 'all'), page: 1 }));
  },

  'hadith-page-prev': () => {
    const page = Math.max(1, (store.getState().hadith.bookView.page || 1) - 1);
    store.dispatch(actions.setHadithView({ page }));
    scrollToHadithListTop();
  },

  'hadith-page-next': () => {
    const page = (store.getState().hadith.bookView.page || 1) + 1;
    store.dispatch(actions.setHadithView({ page }));
    scrollToHadithListTop();
  },

  'hadith-retry': (ds) => {
    ensureHadithBook(ds.id, true);
  },

  'hadith-retry-index': () => {
    ensureHadithIndex(true);
  },

  'share-item': async (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const state = store.getState();
    const lang = state.settings.language;
    const text = itemClipboardText(entry.item, lang);
    const title = pickLocale(entry.item.title, lang);
    closeModal();

    // v3.0: share as a rendered image card when possible (Web Share with
    // files), fall back to a PNG download, and keep the old text-share path
    // as the last resort so sharing never regresses.
    let handled = false;
    try {
      const blob = await generateCardBlob(entry.item, state);
      const file = new File([blob], cardFilename(entry.item), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        handled = true;
      } else {
        downloadBlob(blob, cardFilename(entry.item));
        showToast(t('card.imageSaved', lang));
        handled = true;
      }
    } catch (err) {
      // The person dismissing the OS share sheet is not an error — abort cleanly.
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) handled = true;
    }

    if (!handled) {
      if (navigator.share) {
        try {
          await navigator.share({ title, text });
        } catch {
          /* user cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          showToast(t('card.copied', lang));
        } catch {
          showToast(t('card.copyFailed', lang));
        }
      }
    }
  },

  'toggle-speech': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    if (speech.isSpeakingItem(ds.itemId)) {
      speech.stop();
      store.dispatch(actions.setSpeakingItem(null));
      closeModal();
      return;
    }
    store.dispatch(actions.setSpeakingItem(ds.itemId));
    speech.speakItem(entry.item, {
      onEnd: () => {
        if (store.getState().speakingItemId === ds.itemId) {
          store.dispatch(actions.setSpeakingItem(null));
        }
      },
    });
    closeModal();
  },

  'open-collection-picker': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    openModal(buildCollectionPicker(entry.item, store.getState()), {
      labelledBy: 'modal-title-picker',
    });
  },

  'create-collection': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('collections.namePrompt', lang),
        confirmAction: 'submit-new-collection',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'create-collection-suggested': (ds) => {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: ds.nameEn, ar: ds.nameAr || ds.nameEn }));
    go(VIEWS.COLLECTION, { id });
  },

  'create-collection-inline': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('collections.namePrompt', lang),
        confirmAction: 'submit-new-collection-inline',
        confirmData: { itemId: ds.itemId },
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'delete-collection': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-collection',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'confirm-delete-collection': (ds) => {
    store.dispatch(actions.deleteCollection(ds.id));
    closeModal();
    go(VIEWS.COLLECTIONS);
  },

  'run-search': (ds) => {
    store.dispatch(actions.addSearchHistory(ds.query));
    go(VIEWS.SEARCH, { q: ds.query });
  },

  'clear-search-history': () => {
    store.dispatch(actions.clearSearchHistory());
  },

  'set-setting': (ds) => {
    store.dispatch(actions.updateSettings({ [ds.key]: ds.value }));
  },

  'add-reminder': () => {
    const lang = store.getState().settings.language;
    openModal(reminderFormHTML(lang), { labelledBy: 'modal-title-reminder' });
  },

  'delete-reminder': (ds) => {
    store.dispatch(actions.deleteReminder(ds.id));
  },

  'import-backup-confirmed': () => {
    if (!pendingImportPayload) {
      closeModal();
      return;
    }
    const payload = pendingImportPayload;
    pendingImportPayload = null;
    store.dispatch(actions.restoreState(payload));
    closeModal();
    showToast(t('backup.importDone', store.getState().settings.language));
    go(VIEWS.HOME);
  },

  'export-backup': () => {
    backup.downloadBackup(persistedSnapshot(store.getState()));
    // FIX (review v3.3 A10): the browser's download bar was the only
    // acknowledgment — an in-app toast matching every other action here.
    showToast(t('settings.backupExported', store.getState().settings.language));
  },

  'import-backup': () => {
    const input = document.getElementById('backup-file-input');
    input.value = '';
    input.click();
  },

  'reset-all-data': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('settings.resetConfirm', lang),
        confirmAction: 'confirm-reset-all',
        lang,
      })
    );
  },

  'confirm-reset-all': () => {
    store.dispatch(actions.resetAll());
    closeModal();
    go(VIEWS.HOME);
  },

  'prayer-request-location': () => {
    const lang = store.getState().settings.language;
    if (!navigator.geolocation) {
      showToast(t('prayer.locationUnavailable', lang));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        store.dispatch(
          actions.updatePrayerSettings({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locationName: '',
          })
        );
      },
      () => showToast(t('prayer.locationDenied', lang)),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  },

  'prayer-manual-location': () => {
    const lang = store.getState().settings.language;
    const p = store.getState().settings.prayer;
    openModal(manualLocationFormHTML(lang, p), { labelledBy: 'modal-title-location' });
  },

  'qibla-enable-compass': async () => {
    const granted = await compass.requestPermission();
    const lang = store.getState().settings.language;
    if (granted) {
      startCompassIfNeeded();
    } else {
      showToast(t('qibla.permissionDenied', lang));
    }
  },

  'quiz-start': () => {
    const state = store.getState();
    const deck = buildQuizDeck(state);
    if (!deck.length) {
      showToast(t('quiz.unavailable', state.settings.language));
      return;
    }
    store.dispatch(actions.startQuiz(deck));
    go(VIEWS.QUIZ);
  },

  'quiz-answer': (ds) => {
    store.dispatch(actions.answerQuiz(ds.itemId));
    const state = store.getState();
    const q = state.quiz.deck[state.quiz.index];
    const correct = !!q && ds.itemId === q.itemId;
    if (state.settings.hapticsEnabled) vibrate(correct ? [10, 40, 10] : 15);
  },

  'quiz-next': () => {
    store.dispatch(actions.nextQuiz());
    // v3.12: the finish moment — the result screen blooms once via the
    // transient celebrate stamp; re-renders after the window stay silent.
    if (store.getState().quiz.finished) markCelebration('quiz');
  },

  'quiz-exit-link': () => {
    store.dispatch(actions.exitQuiz());
    go(VIEWS.LIBRARY);
  },

  'mushaf-prev': () => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    setFlipDirection('prev');
    playFlipSound();
    go(VIEWS.MUSHAF, { page: String(mushafPrevPage(page)) });
  },

  'mushaf-next': () => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    setFlipDirection('next');
    playFlipSound();
    go(VIEWS.MUSHAF, { page: String(mushafNextPage(page)) });
  },

  'mushaf-open-jump': () => {
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
  },

  'mushaf-jump-page': (ds) => {
    closeModal();
    go(VIEWS.MUSHAF, { page: String(clampPage(ds.page)) });
  },

  'mushaf-open-at-surah': async (ds) => {
    let state = store.getState();
    if (!state.mushaf.meta) {
      try {
        const meta = await fetchJSON(MUSHAF_META_URL);
        store.dispatch(actions.setMushafMeta(meta));
      } catch (err) {
        console.error('[mushaf] failed to load page index', err);
      }
      state = store.getState();
    }
    const page = state.mushaf.meta?.surahFirstPage?.[String(ds.surah)] || 1;
    go(VIEWS.MUSHAF, { page: String(page) });
  },

  'mushaf-ayah-tap': async (ds) => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    const pageDoc = state.mushaf.pages[String(page)];
    const chapter = pageDoc?.chapters.find((c) => String(c.number) === String(ds.surah));
    const verse = chapter?.verses.find((v) => String(v.number) === String(ds.ayah));
    if (!verse) return;
    setActiveTafsirTab(null); // fresh ayah -> fall back to the default tafsir source
    await openAyahStudy(ds.surah, ds.ayah, page);
  },

  'word-tap': async (ds) => {
    const surah = ds.surah,
      ayah = ds.ayah,
      i = Number(ds.i);
    store.dispatch(actions.openWordStudy(surah, ayah, i));
    await ensureQuranWordsData(store.getState(), surah);
    await ensureQuranRoots(store.getState());
    openModal(buildWordStudyPanel(store.getState()), { labelledBy: 'modal-title-word-study' });
  },

  'root-jump': async (ds) => {
    closeModal();
    setActiveTafsirTab(null);
    await openAyahStudy(ds.surah, ds.ayah, null);
  },

  'tafsir-open': async (ds) => {
    closeModal();
    await openAyahStudy(ds.surah, ds.ayah, null);
  },

  'tafsir-tab': async (ds) => {
    setActiveTafsirTab(ds.edition);
    await ensureTafsirText(store.getState(), ds.edition, ds.surah);
    await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
  },

  'tafsir-download': async (ds) => {
    const lang = store.getState().settings.language;
    const ok = await ensureTafsirText(store.getState(), ds.edition, ds.surah, true);
    showToast(t(ok ? 'tafsir.downloadDone' : 'tafsir.downloadFailed', lang));
    if (ok) {
      setActiveTafsirTab(ds.edition);
      await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
    }
  },

  'mushaf-open-settings': () => {
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'practice-open': async () => {
    await ensureTajweedPool(store.getState());
    openModal(buildPracticePicker(store.getState()), { labelledBy: 'modal-title-practice' });
  },

  'practice-start': async (ds) => {
    await startPracticeRound(ds.rule);
  },

  'practice-tap': (ds) => {
    if (!practiceSession || practiceSession.checked) return;
    const key = `${ds.word}:${ds.start}:${ds.end}`;
    if (practiceSession.selected.has(key)) practiceSession.selected.delete(key);
    else practiceSession.selected.add(key);
    renderPracticeRound();
  },

  'practice-check': () => {
    if (!practiceSession || practiceSession.checked) return;
    const result = scoreRound(practiceSession.targets, practiceSession.selected);
    practiceSession.checked = true;
    practiceSession.result = result;
    store.dispatch(actions.recordTajweedPracticeResult(practiceSession.ruleId, result.perfect));
    renderPracticeRound();
  },

  'practice-next': async () => {
    if (!practiceSession) return;
    await startPracticeRound(practiceSession.ruleId);
  },

  'practice-this-ayah': async (ds) => {
    const state = store.getState();
    const surahDoc = state.quran.surahs[String(ds.surah)];
    const ayahText = surahDoc?.ayahs?.find((a) => String(a.number) === String(ds.ayah))?.text;
    if (!ayahText) return;
    const targets = buildAnswerKey(ayahText, 'mixed');
    if (!targets.length) {
      showToast(t('practice.nothingHere', state.settings.language));
      return;
    }
    practiceSession = {
      ruleId: 'mixed',
      surah: Number(ds.surah),
      ayah: Number(ds.ayah),
      text: ayahText,
      selected: new Set(),
      checked: false,
      targets,
      result: null,
    };
    renderPracticeRound();
  },

  'mushaf-set-font': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ font: ds.font }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'mushaf-set-paper': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ paper: ds.paper }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'mushaf-set-bismillah': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ bismillahStyle: ds.style }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'mushaf-toggle-bookmark': async (ds) => {
    const key = `${ds.surah}:${ds.ayah}`;
    const state = store.getState();
    const wasMarked = state.ayahBookmarks.some((b) => b.key === key);
    store.dispatch(actions.toggleAyahBookmark(key, ds.surah, ds.ayah, clampPage(ds.page)));
    // Keep the modal open and re-render its content in place so the person
    // can also listen/copy right after (un)bookmarking without losing context.
    await openAyahStudy(ds.surah, ds.ayah, clampPage(ds.page));
    const lang = store.getState().settings.language;
    showToast(t(wasMarked ? 'mushaf.bookmarkRemoved' : 'mushaf.bookmarkAdded', lang));
  },

  'mushaf-open-bookmarks': () => {
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-remove-bookmark': (ds) => {
    store.dispatch(actions.removeAyahBookmark(ds.key));
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-reset-progress': () => {
    const lang = store.getState().settings.language;
    store.dispatch(actions.resetMushafProgress());
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
    showToast(t('mushaf.khatmaResetDone', lang));
  },

  'khatma-open-plan': () => {
    openModal(buildKhatmaPlanForm(store.getState()), { labelledBy: 'modal-title-khatma-plan' });
  },

  'khatma-clear-plan': () => {
    // Removing the schedule never touches reading progress — say so.
    store.dispatch(actions.clearKhatmaPlan());
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
    showToast(t('khatma.planCleared', store.getState().settings.language));
  },

  'mushaf-copy-ayah': async (ds) => {
    const lang = store.getState().settings.language;
    try {
      await navigator.clipboard.writeText(`${ds.text}\n\n\u2014 ${ds.surah}:${ds.ayah}`);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  'play-ayah': (ds) => {
    if (!ds.url) return;
    if (recitation.isPlaying(ds.key) || surahPlayback.isActive()) {
      surahPlayback.stop();
      if (recitation.isPlaying(ds.key)) recitation.stop();
    } else {
      // FIX (review A3): one voice at a time — starting a verse pauses the
      // full-surah player (kept in the bar, resumable).
      const p = store.getState().player;
      if (p?.moshafId && p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      }
      recitation.play(ds.url, ds.key);
    }
  },

  // ---- Continuous surah recitation (v3.10): "listen and follow along" ----
  'surah-play': async (ds) => {
    const surah = parseInt(ds.surah, 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const sp = store.getState().surahPlayback;
    if (sp.active && sp.surah === surah) {
      surahPlayback.stop();
      return;
    }
    // The engine needs surah ayahCounts (quran-meta) and, for Mushaf page
    // following, the ayahPages index (mushaf-meta) — both lazily loaded.
    let state = store.getState();
    try {
      if (!state.quran.meta) {
        const meta = await fetchJSON(QURAN_META_URL);
        store.dispatch(actions.setQuranMeta(meta));
        state = store.getState();
      }
      if (!state.mushaf.meta) {
        const meta = await fetchJSON(MUSHAF_META_URL);
        store.dispatch(actions.setMushafMeta(meta));
        state = store.getState();
      }
      // One voice: the full-surah player yields to recitation.
      const p = state.player;
      if (p?.moshafId && p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      }
      surahPlayback.start({
        surah,
        from: parseInt(ds.ayah, 10) || 1,
        total: state.quran.meta.surahs.find((x) => Number(x.number) === surah)?.ayahCount,
        reciterId: state.settings.reciter,
        surahsMeta: state.quran.meta.surahs,
      });
    } catch (err) {
      console.error('[surah-playback] failed to start', err);
      showToast(t('audio.reciteStartFailed', store.getState().settings.language));
    }
  },

  'recite-stop': () => {
    surahPlayback.stop();
  },

  'recite-follow-toggle': () => {
    const next = !(store.getState().settings.audio.ayahFollow ?? true);
    store.dispatch(
      actions.updateSettings({ audio: { ...store.getState().settings.audio, ayahFollow: next } })
    );
    surahPlayback.setFollow(next);
  },

  'calendar-open-day': (ds) => {
    openModal(buildDayDetail(ds.date, store.getState()), { labelledBy: 'modal-title-day' });
  },

  'calendar-new-note': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildNoteForm(ds.date, null, lang), { labelledBy: 'modal-title-note' });
  },

  'calendar-edit-note': (ds) => {
    const lang = store.getState().settings.language;
    const note = store.getState().calendarNotes.find((n) => n.id === ds.id);
    if (!note) return;
    openModal(buildNoteForm(ds.date || note.startDate, note, lang), {
      labelledBy: 'modal-title-note',
    });
  },

  'calendar-delete-note': (ds) => {
    store.dispatch(actions.deleteCalendarNote(ds.id));
    closeModal();
  },

  'toggle-prayer-alert': (ds) => {
    const current = store.getState().settings.prayer.alerts || {};
    store.dispatch(
      actions.updatePrayerSettings({ alerts: { ...current, [ds.prayer]: !current[ds.prayer] } })
    );
  },

  'prayer-log-cycle': (ds) => {
    const state = store.getState();
    const todayKey = dateKey(new Date());
    const wasComplete = dayComplete(state.dailyChecklist[todayKey]);
    store.dispatch(actions.cyclePrayerLog(ds.prayer));
    const nowComplete = dayComplete(store.getState().dailyChecklist[todayKey]);
    // v3.14 Phase C: haptic parity with the checklist toggle — a log tap
    // should be felt, not just seen. Kept AFTER the dispatch so the
    // vibration never lands on a rejected action.
    if (store.getState().settings.hapticsEnabled) vibrate(8);
    // Celebrate the moment the fifth prayer lands — once per day, not on
    // every later cycle (complete → complete never re-fires).
    if (nowComplete && !wasComplete) {
      markCelebration('plog-day');
      showToast(t('plog.allLoggedToast', state.settings.language), { duration: 3200 });
    }
  },

  'khatma-ramadan-preset': () => {
    const lang = store.getState().settings.language;
    const preset = ramadanKhatmaPreset(new Date());
    const set = (id, v) => {
      const input = document.getElementById(id);
      if (input) input.value = v;
    };
    set('khatma-start-date', preset.startDate);
    set('khatma-target-date', preset.targetDate);
    set('khatma-daily-target', String(preset.dailyTarget));
    showToast(t('khatma.presetFilled', lang), { duration: 3200 });
  },

  'stats-heatmap-shift': (ds) => {
    const now = new Date();
    const baseRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    store.dispatch(actions.shiftStatsHeatmapMonth(parseInt(ds.delta, 10) || 0, baseRef));
  },

  'onboarding-dismiss': () => {
    store.dispatch(actions.dismissOnboarding());
  },

  'onboarding-install': async () => {
    if (!deferredInstallPrompt) return;
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    store.dispatch(actions.installPromptClear());
    try {
      await prompt.prompt();
      // userChoice resolves after the person answers the browser dialog;
      // 'appinstalled' (wired above) flips the done flag on acceptance.
      await prompt.userChoice?.catch?.(() => {});
    } catch {
      /* the browser may refuse the second prompt — nothing to do */
    }
  },

  'prayer-test-sound': () => {
    // v3.8: previews EXACTLY what a real prayer alert would do right now
    // (adhan source chain or the chosen tone), Fajr-flavored to show the
    // Fajr variant when one exists.
    previewAlert(store.getState().settings.prayer, { fajr: true });
  },

  'prayer-set-alert-mode': (ds) => {
    if (!['adhan', 'tone', 'off'].includes(ds.mode)) return;
    stopAdhan(); // switching modes must never leave a half-playing file
    store.dispatch(actions.updatePrayerSettings({ adhanMode: ds.mode }));
  },

  'prayer-adhan-import': (ds) => {
    const kind = ds.kind === 'fajr' ? 'fajr' : 'standard';
    const input = document.getElementById('adhan-file-input');
    if (!input) return;
    input.dataset.kind = kind;
    input.value = ''; // allow re-selecting the same file
    input.click();
  },

  'prayer-adhan-clear': async (ds) => {
    const kind = ds.kind === 'fajr' ? 'fajr' : 'standard';
    const { deleteAdhanAudio } = await import('./audioStore.js');
    await deleteAdhanAudio(kind);
    await refreshCustomAdhanFlags();
    showToast(
      t(
        store.getState().settings.language === 'ar' ? 'prayer.adhanCleared' : 'prayer.adhanCleared',
        store.getState().settings.language
      )
    );
    render(store.getState());
  },

  /* ---------------- Ramadan companion ---------------- */

  'ramadan-toggle-fast': (ds) => {
    store.dispatch(actions.toggleRamadanFast(ds.logKey, ds.day));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'toggle-ramadan-alert': (ds) => {
    const current = store.getState().settings.prayer.ramadanAlerts || {
      suhoor: false,
      iftar: false,
      suhoorOffset: 30,
    };
    store.dispatch(
      actions.updatePrayerSettings({
        ramadanAlerts: { ...current, [ds.alert]: !current[ds.alert] },
      })
    );
  },

  'ramadan-enable-notifications': async () => {
    const lang = store.getState().settings.language;
    const perm = await requestPermission();
    showToast(
      t(perm === 'granted' ? 'ramadan.notificationsGranted' : 'ramadan.notificationsDenied', lang)
    );
    if (perm === 'granted') store.dispatch(actions.updateSettings({})); // force re-render of the permission banner
  },

  /* ---------------- Zakat calculator ------------------ */

  'zakat-set-basis': (ds) => {
    store.dispatch(actions.setZakatPrefs({ basis: ds.basis === 'silver' ? 'silver' : 'gold' }));
  },

  'zakat-clear-inputs': () => {
    store.dispatch(actions.clearZakatInputs());
    refocusZakatInput('in-cash');
  },

  'zakat-save-snapshot': () => {
    const state = store.getState();
    const r = computeZakat(state.zakat.inputs, state.zakat.prefs);
    const f = computeFitr(state.zakat.prefs.fitrPer || 0, state.zakat.prefs.fitrPeople || 0);
    const ts = Date.now();
    const snapshot = {
      id: uid('zak'),
      ts,
      hawlDue: hawlDueFor(ts),
      remind: true,
      due: r.due,
      currency: state.zakat.prefs.currency || '',
      netWealth: Math.round(r.netWealth * 100) / 100,
      nisabMet: r.nisabMet,
      fitrTotal: f.total,
    };
    store.dispatch(actions.saveZakatSnapshot(snapshot));
    showToast(t('zakat.snapshotSaved', state.settings.language));
  },

  'zakat-delete-snapshot': (ds) => {
    store.dispatch(actions.deleteZakatSnapshot(ds.id));
  },

  'zakat-toggle-hawl-remind': (ds) => {
    const snap = store.getState().zakatHistory.find((s) => s.id === ds.id);
    if (!snap) return;
    store.dispatch(actions.updateZakatSnapshot(ds.id, { remind: snap.remind === false }));
  },

  /* ---------------- Ayah bookmark folders/notes ---------------- */

  'bookmark-filter-folder': (ds) => {
    setBookmarkFolderFilter(ds.folder);
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'bookmark-new-folder': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('mushaf.newFolder', lang),
        placeholder: t('mushaf.folderNamePh', lang),
        confirmAction: 'submit-new-bookmark-folder',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
    // NOTE: the submit path routes through handlePromptForm (no click
    // handler with this name, so the form's native submit fires normally).
  },

  'bookmark-delete-folder': (ds) => {
    store.dispatch(actions.deleteBookmarkFolder(ds.folder));
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  /* ---------------- Reciters & offline audio ---------------- */

  'audio-select-moshaf': (ds) => {
    store.dispatch(actions.setAudioPrefs({ moshafId: ds.id }));
  },

  'audio-download-surah': async (ds) => {
    const lang = store.getState().settings.language;
    const key = audioStore.audioKey(ds.moshaf, parseInt(ds.surah, 10));
    if (store.getState().audioDownloading[key]) return; // already in flight
    store.dispatch(actions.markAudioDownloadStart(key));
    showToast(t('audio.downloading', lang));
    const res = await downloadOne(ds.moshaf, parseInt(ds.surah, 10));
    store.dispatch(actions.markAudioDownloadEnd(key));
    // FIX (review A5/B6): say how it ended — silence after "Downloading…"
    // left people guessing whether 2MB landed.
    showToast(t(res.ok ? 'audio.downloadDone' : 'audio.downloadFailed', lang));
  },

  'audio-delete-surah': async (ds) => {
    await audioStore.deleteAudio(ds.moshaf, parseInt(ds.surah, 10));
    store.dispatch(
      actions.markAudioDownload(audioStore.audioKey(ds.moshaf, parseInt(ds.surah, 10)), 0, true)
    );
  },

  'audio-download-all': async (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    batchCancelled = false;
    const missing = [];
    for (let n = 1; n <= 114; n += 1) {
      if (!state.audioDownloads[`${ds.moshaf}:${n}`]) missing.push(n);
    }
    if (!missing.length) {
      showToast(t('audio.allDone', lang));
      return;
    }
    showToast(t('audio.batchStarted', lang, { n: missing.length }));
    let ok = 0;
    for (const n of missing) {
      if (batchCancelled) break;
      const fileKey = audioStore.audioKey(ds.moshaf, n);
      if (store.getState().audioDownloading[fileKey]) continue;
      store.dispatch(actions.markAudioDownloadStart(fileKey));
      const res = await downloadOne(ds.moshaf, n);
      store.dispatch(actions.markAudioDownloadEnd(fileKey));
      if (res.ok) ok += 1;
      else if (res.error === 'quota') {
        showToast(t('audio.quota', lang));
        break;
      }
    }
    showToast(
      batchCancelled
        ? t('audio.batchCancelled', lang, { n: ok })
        : t('audio.batchDone', lang, { n: ok })
    );
  },

  'audio-delete-moshaf': async (ds) => {
    const n = await audioStore.deleteMoshafAudio(ds.moshaf);
    for (let s = 1; s <= 114; s += 1) {
      store.dispatch(actions.markAudioDownload(audioStore.audioKey(ds.moshaf, s), 0, true));
    }
    const lang = store.getState().settings.language;
    showToast(t('audio.deleted', lang, { n }));
  },

  'audio-remove-custom': (ds) => {
    store.dispatch(actions.removeCustomReciter(ds.id));
  },

  'quran-play-surah': (ds) => {
    const state = store.getState();
    const surah = parseInt(ds.surah, 10);
    const p = state.player;
    // If this exact track is playing → pause; if paused on it → resume;
    // otherwise start it. Moshaf resolution (incl. loading the lazily
    // fetched catalog) lives inside startAudioPlay — review A1.
    if (p?.moshafId && p.surah === surah) {
      if (p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      } else {
        player.toggle();
        store.dispatch(actions.setAudioPlayer({ playing: true }));
      }
      return;
    }
    surahPlayback.stop();
    startAudioPlay(state.settings.audio.moshafId, surah);
  },

  'audio-play-moshaf': (ds) => {
    startAudioPlay(ds.moshaf, 1);
  },

  /* ---------------- Player bar ---------------- */

  'player-toggle': () => {
    const p = store.getState().player;
    if (!p?.moshafId) return;
    if (p.playing) {
      player.pause();
      store.dispatch(actions.setAudioPlayer({ playing: false }));
    } else {
      player.toggle();
      store.dispatch(actions.setAudioPlayer({ playing: true }));
    }
  },

  'player-close': () => {
    player.stop();
    store.dispatch(
      actions.setAudioPlayer({ moshafId: null, surah: null, playing: false, offline: false })
    );
  },

  'player-next': () => {
    const p = store.getState().player;
    if (p?.surah != null && p.surah < 114) startAudioPlay(p.moshafId, p.surah + 1);
  },

  'player-prev': () => {
    const p = store.getState().player;
    if (p?.surah != null && p.surah > 1) startAudioPlay(p.moshafId, p.surah - 1);
  },

  'player-repeat': () => {
    const cur = store.getState().settings.audio.repeat === 'one' ? 'off' : 'one';
    store.dispatch(actions.setAudioPrefs({ repeat: cur }));
  },

  'player-rate': () => {
    const RATES = [1, 1.25, 1.5, 0.75];
    const cur = store.getState().settings.audio.rate || 1;
    const next = RATES[(RATES.indexOf(cur) + 1) % RATES.length];
    player.setRate(next);
    store.dispatch(actions.setAudioPrefs({ rate: next }));
  },

  'tasbih-select': (ds) => {
    store.dispatch(actions.setTasbihActive(ds.phraseId));
  },

  'tasbih-tap': (ds) => {
    const target = parseInt(ds.target, 10) || 33;
    const result = tasbih.increment('tasbih:' + ds.phraseId, 'tasbih-dhikr', target);
    tasbih.playTick(result.cycleCompleted ? 'complete' : 'tick');
  },

  'tasbih-reset': (ds) => {
    const preset = TASBIH_PRESETS.find((p) => p.id === ds.phraseId);
    tasbih.reset('tasbih:' + ds.phraseId, parseInt(ds.target, 10) || preset?.target || 33);
  },

  'tasbih-target-step': (ds) => {
    const key = 'tasbih:' + ds.phraseId;
    const counter = tasbih.getCounter(key, 33);
    const delta = parseInt(ds.delta, 10) || 0;
    const nextTarget = Math.max(1, counter.target + delta);
    tasbih.setTarget(key, nextTarget);
  },

  'editor-new-library': () => {
    const lang = store.getState().settings.language;
    openModal(buildLibraryForm({ lang }), { labelledBy: 'modal-title-library' });
  },

  'editor-new-category': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildCategoryForm({ libraryId: ds.libraryId, lang }), {
      labelledBy: 'modal-title-category',
    });
  },

  'editor-delete-category': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-category',
        confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId },
        lang,
      })
    );
  },

  'confirm-delete-category': (ds) => {
    editorApi.deleteCategory(ds.libraryId, ds.categoryId);
    closeModal();
  },

  'editor-new-item': (ds) => {
    const lang = store.getState().settings.language;
    const blank = editorApi.blankItemTemplate(ds.categoryId);
    openModal(buildItemForm(blank, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), {
      labelledBy: 'modal-title-item',
    });
  },

  'editor-edit-item': (ds) => {
    const lang = store.getState().settings.language;
    const lib = editorApi.getCustomLibrary(ds.libraryId);
    const cat = lib?.categories.find((c) => c.id === ds.categoryId);
    const item = cat?.items.find((i) => i.id === ds.itemId);
    if (!item) return;
    openModal(buildItemForm(item, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), {
      labelledBy: 'modal-title-item',
    });
  },

  'editor-duplicate-item': (ds) => {
    editorApi.duplicateItem(ds.libraryId, ds.categoryId, ds.itemId);
  },

  'editor-delete-item': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-item',
        confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId, itemId: ds.itemId },
        lang,
      })
    );
  },

  'confirm-delete-item': (ds) => {
    editorApi.deleteItem(ds.libraryId, ds.categoryId, ds.itemId);
    closeModal();
  },

  'modal-close': () => {
    recitation.stop();
    closeModal();
  },
};

function reminderFormHTML(lang) {
  return `
  <form class="editor-form" data-form="reminder">
    <h2 id="modal-title-reminder">${t('settings.addReminder', lang)}</h2>
    <label class="field">${t('editor.fieldTitleEn', lang)}<input class="input" name="label" placeholder="${t('reminder.labelPlaceholder', lang)}" required /></label>
    <label class="field">${t('reminder.time', lang)}<input class="input" type="time" name="time" value="06:00" required /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

function manualLocationFormHTML(lang, p) {
  return `
  <form class="editor-form" data-form="prayer-location">
    <h2 id="modal-title-location">${t('prayer.manualLocation', lang)}</h2>
    <label class="field">${t('prayer.locationName', lang)}<input class="input" name="locationName" value="${p.locationName || ''}" placeholder="${t('prayer.locationExample', lang)}" /></label>
    <label class="field">${t('prayer.latitude', lang)}<input class="input" type="number" step="any" min="-90" max="90" name="latitude" value="${p.latitude ?? ''}" required /></label>
    <label class="field">${t('prayer.longitude', lang)}<input class="input" type="number" step="any" min="-180" max="180" name="longitude" value="${p.longitude ?? ''}" required /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

/* ------------------------------------------------------------------ */
/* Form submit handlers                                                */
/* ------------------------------------------------------------------ */

const formHandlers = {
  'hadith-jump': (form) => {
    const input = form.querySelector('input');
    const raw = parseInt(input?.value, 10);
    const bookId = String(store.getState().activeParams?.id || '');
    if (!Number.isFinite(raw) || raw < 1 || !bookId) return;
    input.value = '';
    go(VIEWS.HADITH, { id: bookId, n: String(raw) });
  },

  'mushaf-jump-page': (form) => {
    const fd = new FormData(form);
    closeModal();
    go(VIEWS.MUSHAF, { page: String(clampPage(fd.get('page'))) });
  },

  'khatma-plan': (form) => {
    const fd = new FormData(form);
    const lang = store.getState().settings.language;
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    const todayISO = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const startDate = ISO.test(String(fd.get('startDate') || ''))
      ? String(fd.get('startDate'))
      : todayISO();
    const targetRaw = String(fd.get('targetDate') || '');
    const targetDate = ISO.test(targetRaw) ? targetRaw : null;
    const dailyRaw = parseInt(fd.get('dailyTarget'), 10);
    const dailyTarget = Number.isFinite(dailyRaw) && dailyRaw >= 1 ? Math.min(604, dailyRaw) : null;
    if (!targetDate && !dailyTarget) {
      showToast(t('khatma.needOne', lang));
      return; // keep the form open so the person can fix it
    }
    store.dispatch(actions.setKhatmaPlan({ startDate, targetDate, dailyTarget }));
    closeModal();
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
    showToast(t('khatma.planSaved', lang));
  },

  item: (form) => {
    const fd = new FormData(form);
    const fields = {
      title: { en: fd.get('titleEn') || '', ar: fd.get('titleAr') || '' },
      arabic: fd.get('arabic') || '',
      transliteration: fd.get('transliteration') || '',
      translation: { en: fd.get('translationEn') || '', ar: '' },
      reference: {
        collection: fd.get('reference') || '',
        book: '',
        chapter: '',
        hadith: fd.get('referenceHadith') || '',
        narrator: fd.get('referenceNarrator') || '',
        grading: fd.get('referenceGrading') || '',
        url: '',
        notes: '',
      },
      grade: fd.get('grade') || 'Unknown',
      custom_grade: { en: fd.get('customGradeEn') || '', ar: '' },
      repetitions: parseInt(fd.get('repetitions'), 10) || 1,
      virtues: { en: fd.get('virtuesEn') || '', ar: '' },
      tags: (fd.get('tags') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: fd.get('notes') || '',
    };
    const result = editorApi.saveItem(
      form.dataset.libraryId,
      form.dataset.categoryId,
      fields,
      form.dataset.itemId || null
    );
    if (result.success) {
      closeModal();
      // Save still succeeds either way — this is a heads-up, not a block —
      // but it's no longer silent (see product review: an item saved with
      // no Arabic text and no translation previously gave zero feedback).
      if (result.warnings?.length) {
        showToast(t('editor.savedWithWarning', store.getState().settings.language));
      }
    } else {
      showToast(result.error || t('editor.validationError', store.getState().settings.language));
    }
  },

  category: (form) => {
    const fd = new FormData(form);
    editorApi.addCategory(form.dataset.libraryId, {
      nameEn: fd.get('nameEn'),
      nameAr: fd.get('nameAr'),
    });
    closeModal();
  },

  library: (form) => {
    const fd = new FormData(form);
    editorApi.createLibrary({ nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr') });
    closeModal();
  },

  reminder: (form) => {
    const fd = new FormData(form);
    store.dispatch(
      actions.addReminder(
        notifications.makeReminder({ id: uid('rem'), time: fd.get('time'), label: fd.get('label') })
      )
    );
    closeModal();
  },

  'prayer-location': (form) => {
    const fd = new FormData(form);
    const lat = parseFloat(fd.get('latitude'));
    const lng = parseFloat(fd.get('longitude'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      showToast(t('common.error', store.getState().settings.language));
      return;
    }
    store.dispatch(
      actions.updatePrayerSettings({
        latitude: lat,
        longitude: lng,
        locationName: fd.get('locationName') || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    );
    closeModal();
  },

  'calendar-note': (form) => {
    const fd = new FormData(form);
    const recurrence = fd.get('recurrence') || 'once';
    const title = (fd.get('title') || '').trim();
    if (!title) return;

    const note = {
      id: form.dataset.noteId || uid('note'),
      title,
      body: fd.get('body') || '',
      startDate: form.dataset.date,
      recurrence,
      intervalDays:
        recurrence === 'interval' ? Math.max(2, parseInt(fd.get('intervalDays'), 10) || 3) : null,
      endDate:
        recurrence === 'range'
          ? fd.get('endDateRange') || null
          : recurrence === 'daily'
            ? fd.get('endDateDaily') || null
            : null,
      reminder: fd.get('reminder') === 'on',
      reminderTime: fd.get('reminder') === 'on' ? fd.get('reminderTime') || '08:00' : null,
      createdAt: form.dataset.noteId ? undefined : Date.now(),
    };

    if (recurrence === 'range' && !note.endDate) {
      showToast(t('calendar.untilDate', store.getState().settings.language));
      return;
    }

    if (form.dataset.noteId) {
      store.dispatch(actions.updateCalendarNote(form.dataset.noteId, note));
    } else {
      note.createdAt = Date.now();
      store.dispatch(actions.addCalendarNote(note));
    }
    closeModal();
    showToast(t('common.done', store.getState().settings.language));
  },

  'audio-custom-reciter': async (form) => {
    const fd = new FormData(form);
    const lang = store.getState().settings.language;
    const name = String(fd.get('name') || '').trim();
    const check = validateCustomServer(fd.get('server'));
    if (!name || !check.ok) {
      showToast(t('audio.customInvalid', lang));
      return;
    }
    showToast(t('audio.customChecking', lang));
    // Verify the server actually serves audio before accepting it.
    try {
      const res = await fetch(surahUrl(check.server, 1), { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !/audio|octet|mpeg|mp3/i.test(type)) {
        showToast(t('audio.customNotAudio', lang));
        return;
      }
    } catch {
      showToast(t('audio.customNotAudio', lang));
      return;
    }
    store.dispatch(
      actions.addCustomReciter({
        id: customMoshafId(check.server),
        nameEn: name,
        nameAr: name,
        rewaya: '',
        server: check.server,
      })
    );
    closeModal();
    showToast(t('common.done', lang));
  },
};

function handlePromptForm(form) {
  const action = form.dataset.action;
  const fd = new FormData(form);
  const value = (fd.get('value') || '').trim();
  if (!value) return;

  if (action === 'submit-new-collection') {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: value, ar: value }));
    closeModal();
    go(VIEWS.COLLECTION, { id });
  } else if (action === 'submit-new-collection-inline') {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: value, ar: value }));
    store.dispatch(actions.addToCollection(id, form.dataset.itemId));
    closeModal();
    showToast(t('common.done', store.getState().settings.language));
  } else if (action === 'submit-new-bookmark-folder') {
    const id = uid('bmf');
    store.dispatch(actions.createBookmarkFolder(id, value));
    closeModal();
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  }
}

/* ------------------------------------------------------------------ */
/* Global event delegation                                             */
/* ------------------------------------------------------------------ */

function bindGlobalEvents() {
  document.addEventListener('click', (e) => {
    // Backdrop-click-to-close: only when the overlay itself is the exact element clicked.
    // (Handled first and separately so that closest() below never treats an unrelated
    // descendant — e.g. a modal's submit button — as if it clicked the overlay.)
    if (e.target.classList?.contains('modal-overlay')) {
      recitation.stop();
      closeModal();
      return;
    }

    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'modal-close-overlay') return;

    const handler = clickHandlers[action];
    if (handler) {
      e.preventDefault();
      handler(target.dataset, e, target);
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target;

    if (target.matches('[data-player-seek]')) {
      const pct = parseFloat(target.value) || 0;
      player.seek((pct / 100) * player.duration());
      return;
    }
    if (target.matches('[data-action="toggle-setting"]')) {
      store.dispatch(actions.updateSettings({ [target.dataset.key]: target.checked }));
      return;
    }
    if (target.matches('[data-action="toggle-mushaf-pref"]')) {
      store.dispatch(actions.updateMushafPrefs({ [target.dataset.key]: target.checked }));
      // The legend only shows while tajweed coloring is on, and toggles in
      // general read better with instant feedback — refresh the panel in
      // place rather than waiting for the next unrelated re-render.
      openModal(buildMushafSettingsPanel(store.getState()), {
        labelledBy: 'modal-title-mushaf-settings',
      });
      return;
    }
    if (target.matches('[data-bind="mushaf-font-scale"]')) {
      store.dispatch(
        actions.updateMushafPrefs({ fontScale: clampSliderNum(target.value, 0.8, 1.6) })
      );
      return;
    }
    if (target.matches('[data-bind="mushaf-line-spacing"]')) {
      store.dispatch(
        actions.updateMushafPrefs({ lineSpacing: clampSliderNum(target.value, 0.85, 1.3) })
      );
      return;
    }
    if (target.matches('[data-bind="ramadan-suhoor-offset"]')) {
      const current = store.getState().settings.prayer.ramadanAlerts || {};
      const mins = parseInt(target.value, 10) || 30;
      store.dispatch(
        actions.updatePrayerSettings({ ramadanAlerts: { ...current, suhoorOffset: mins } })
      );
      return;
    }
    if (target.matches('[data-bind="bookmark-folder"]')) {
      store.dispatch(
        actions.updateAyahBookmark(target.dataset.key, { folderId: target.value || null })
      );
      openModal(buildMushafBookmarks(store.getState()), {
        labelledBy: 'modal-title-mushaf-bookmarks',
      });
      return;
    }
    if (target.matches('[data-action="checklist-toggle"]')) {
      store.dispatch(actions.toggleChecklistItem(target.dataset.item));
      const state = store.getState();
      if (state.settings.hapticsEnabled) vibrate(target.checked ? 10 : 6);
      return;
    }
    if (target.matches('[data-action="toggle-reminder"]')) {
      store.dispatch(actions.updateReminder(target.dataset.id, { enabled: target.checked }));
      return;
    }
    if (target.matches('[data-action="collection-picker-toggle"]')) {
      const { collectionId, itemId } = target.dataset;
      if (target.checked) store.dispatch(actions.addToCollection(collectionId, itemId));
      else store.dispatch(actions.removeFromCollection(collectionId, itemId));
      return;
    }
    if (target.matches('[data-bind="dailyGoal"]')) {
      store.dispatch(
        actions.updateSettings({ dailyGoal: Math.max(1, parseInt(target.value, 10) || 100) })
      );
      return;
    }
    if (target.matches('[data-bind="prayer-method"]')) {
      store.dispatch(actions.updatePrayerSettings({ method: target.value }));
      return;
    }
    if (target.matches('[data-bind="prayer-asr"]')) {
      store.dispatch(actions.updatePrayerSettings({ asr: target.value }));
      return;
    }
    if (target.matches('[data-bind="prayer-alert-sound"]')) {
      store.dispatch(actions.updatePrayerSettings({ alertSound: target.value }));
      playSound(target.value);
      return;
    }
    if (target.matches('[data-bind="note-recurrence"]')) {
      const form = target.closest('form');
      form.querySelectorAll('[data-recurrence-group]').forEach((el) => {
        el.hidden = el.dataset.recurrenceGroup !== target.value;
      });
      return;
    }
    if (target.matches('[data-bind="note-reminder-toggle"]')) {
      const form = target.closest('form');
      const group = form.querySelector('[data-reminder-group]');
      if (group) group.hidden = !target.checked;
      return;
    }
    if (target.id === 'backup-file-input' && target.files?.[0]) {
      handleImportFile(target.files[0]);
    }
    if (target.id === 'adhan-file-input' && target.files?.[0]) {
      handleAdhanImport(target.files[0], target.dataset.kind === 'fajr' ? 'fajr' : 'standard');
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    // FIX (review A8): live time preview while dragging the seek range —
    // the seek itself still commits on change (release), so streaming
    // isn't thrashed with range requests, but the thumb never feels dead.
    if (target.matches('[data-player-seek]')) {
      const dur = player.duration();
      const bar = document.querySelector('.player-bar');
      const timeEl = bar?.querySelector('[data-player-time]');
      if (timeEl && dur > 0) {
        const pct = parseFloat(target.value) || 0;
        const n = Math.max(0, Math.floor((pct / 100) * dur));
        timeEl.textContent = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
      }
      return;
    }
    if (target.matches('[data-bind="fontScale"]')) {
      store.dispatch(actions.updateSettings({ fontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="arabicFontScale"]')) {
      store.dispatch(actions.updateSettings({ arabicFontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="search-query"]')) {
      debounceSearchNavigate(target.value);
    } else if (target.matches('[data-bind="quran-search"]')) {
      debounceQuranSearchNavigate(target.value);
    } else if (target.matches('[data-bind="hadith-query"]')) {
      debounceHadithQuery(target.value);
    } else if (target.matches('[data-bind^="zakat-"]')) {
      handleZakatInput(target);
    } else if (target.matches('[data-bind="bookmark-note"]')) {
      // Modal inputs live outside #main, so re-renders never steal focus
      // here — dispatch straight through with no refocus dance.
      store.dispatch(actions.updateAyahBookmark(target.dataset.key, { note: target.value }));
    } else if (target.matches('[data-bind="audio-search"]')) {
      const v = target.value;
      clearTimeout(audioSearchTimer);
      audioSearchTimer = setTimeout(() => {
        store.dispatch(actions.setAudioManagerQuery(v));
        requestAnimationFrame(() => {
          const input = document.getElementById('audio-search-input');
          if (input && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }, 180);
    }
  });

  document.addEventListener('keydown', (e) => {
    // FIX (review A4/B5): elements exposed as role="button" (Mushaf ayahs)
    // must actually behave like buttons — Enter/Space activates them through
    // the same delegated path a click takes. Real <button>/<a> elements fire
    // native click events and are excluded, as are form fields.
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      e.target instanceof Element &&
      e.target.matches('[role="button"][data-action]') &&
      !e.target.matches('button, a[href], input, select, textarea, [contenteditable="true"]')
    ) {
      e.preventDefault();
      const handler = clickHandlers[e.target.dataset.action];
      if (handler) handler(e.target.dataset, e, e.target);
      return;
    }
    if (e.key === 'Escape') {
      if (document.body.classList.contains('nav-drawer-open')) {
        closeNavDrawer();
        return;
      }
    }
    // Basic focus containment for the mobile nav drawer: Tab cycles inside
    // it while open (the dialog is a small, flat list — a full trap isn't
    // needed, just keep Tab from escaping into the covered page).
    if (e.key === 'Tab' && document.body.classList.contains('nav-drawer-open')) {
      const drawer = document.querySelector('.nav-drawer');
      const focusables = drawer ? drawer.querySelectorAll('a[href], button:not([disabled])') : null;
      if (!focusables || !focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!drawer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.target.matches('[data-bind="search-query"]') && e.key === 'Enter') {
      const value = e.target.value.trim();
      if (value) store.dispatch(actions.addSearchHistory(value));
    }
    if (document.body.classList.contains('is-focus-mode')) {
      handleFocusKeydown(e);
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.form) {
      e.preventDefault();
      formHandlers[form.dataset.form]?.(form);
      return;
    }
    if (form.dataset.action) {
      e.preventDefault();
      handlePromptForm(form);
    }
  });

  let touchStartX = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (!document.body.classList.contains('is-focus-mode')) return;
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX == null || !document.body.classList.contains('is-focus-mode')) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 60) return;
      const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
      // In LTR, swiping left means "forward" (next). In RTL, reading and
      // navigation flow the opposite way, so the same physical swipe should
      // move in the opposite logical direction.
      const swipedTowardStart = dx < 0; // physically swiped leftward
      const dir = isRTL ? (swipedTowardStart ? -1 : 1) : swipedTowardStart ? 1 : -1;
      navigateFocusAdjacent(dir);
    },
    { passive: true }
  );

  // Mushaf page-flip swipe. Unlike the focus-mode swipe above, this is
  // *always* right-to-left reading order — it's emulating a physical Arabic
  // book, so the gesture direction doesn't follow the app's own UI
  // language the way focus mode's does.
  let mushafTouchStartX = null;
  let mushafTouchStartY = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF) return;
      mushafTouchStartX = e.touches[0].clientX;
      mushafTouchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (mushafTouchStartX == null || store.getState().activeView !== VIEWS.MUSHAF) return;
      const dx = e.changedTouches[0].clientX - mushafTouchStartX;
      const dy = e.changedTouches[0].clientY - mushafTouchStartY;
      mushafTouchStartX = null;
      mushafTouchStartY = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return; // ignore short/mostly-vertical swipes (scrolling)
      const state = store.getState();
      const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
      if (dx < 0) {
        setFlipDirection('next');
        playFlipSound();
        go(VIEWS.MUSHAF, { page: String(mushafNextPage(page)) });
      } else {
        setFlipDirection('prev');
        playFlipSound();
        go(VIEWS.MUSHAF, { page: String(mushafPrevPage(page)) });
      }
    },
    { passive: true }
  );
}

/** v3.14 Phase C: soft paper sound for Mushaf page flips (opt-in via
 * settings.pageTurnSound, off by default). Called from every flip path —
 * swipe, prev/next buttons, and recitation follow — so the sound always
 * pairs with the flip animation itself, never with anything else. */
function playFlipSound() {
  soundDesign.playPageTurn(store.getState().settings.pageTurnSound);
}

let searchDebounceTimer = null;
function debounceSearchNavigate(value) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    // Replace, don't push: typing shouldn't fill up browser history with one
    // entry per keystroke pause (see product review #2).
    replaceGo(VIEWS.SEARCH, value ? { q: value } : {});
    requestAnimationFrame(() => {
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }, 180);
}

let quranSearchDebounceTimer = null;
let audioSearchTimer = null;
function debounceQuranSearchNavigate(value) {
  clearTimeout(quranSearchDebounceTimer);
  quranSearchDebounceTimer = setTimeout(() => {
    replaceGo(VIEWS.QURAN, value ? { q: value } : {});
    requestAnimationFrame(() => {
      const input = document.getElementById('quran-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }, 180);
}

let hadithQueryTimer = null;
/** In-book hadith search: dispatch-only (no history churn — the book URL
 *  stays put), reset the page, and let the renderer's focus salvage keep
 *  the caret in the search box while the results re-render. */
function debounceHadithQuery(value) {
  clearTimeout(hadithQueryTimer);
  hadithQueryTimer = setTimeout(() => {
    store.dispatch(actions.setHadithView({ query: String(value || ''), page: 1 }));
  }, 200);
}

/*
 * Zakat inputs: every keystroke dispatches into the store (one-way data
 * flow), which re-renders the view — so focus + caret are restored on the
 * very same input right after, exactly the trick the search boxes use.
 * data-ref is stable across renders (unlike ids, which are avoided here
 * since several rows share markup shape). No per-field debounce: a shared
 * timer would swallow all but the last-edited field, and the store's own
 * debounced persistence already absorbs the write churn.
 */
/* Clamp a slider/number input's value into [min, max]; used wherever a
 * numeric preference is dispatched from the DOM so the store can never
 * hold a value outside its declared range (or a non-number at all). */
function clampSliderNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min + (max - min) / 2;
  return Math.min(max, Math.max(min, n));
}

function refocusZakatInput(ref, caret) {
  requestAnimationFrame(() => {
    const input = document.querySelector(`[data-ref="${ref}"]`);
    if (!input) return;
    // If the person (or an assistive tool) already moved to a DIFFERENT
    // zakat field before this frame, never steal focus back — only restore
    // it when focus was lost to <body> by the innerHTML swap.
    const active = document.activeElement;
    const activeRef = active?.dataset?.ref;
    if (active && active !== document.body && activeRef && activeRef !== ref) return;
    input.focus();
    // number inputs reject setSelectionRange (InvalidStateError) — they
    // manage the caret natively, so only restore it for text-like fields.
    if (
      input.type === 'text' ||
      input.type === 'search' ||
      input.type === 'url' ||
      input.type === 'tel' ||
      input.type === 'password'
    ) {
      const pos = caret != null ? caret : input.value.length;
      input.setSelectionRange(pos, pos);
      return;
    }
    // FIX (review v3.3 A1): number inputs used to keep their NATIVE caret,
    // which Chromium parks at position 0 after the innerHTML swap + focus —
    // so every digit typed after the first landed BEFORE the existing text.
    // Typing "50000" produced "00005", and the zakat was silently computed
    // on 5. Briefly switching the field to type="text" (a well-known
    // workaround; the value survives the swap) makes setSelectionRange
    // legal, so the caret returns exactly where the person was typing —
    // normally the end (number inputs report selectionStart as null, so
    // that is the fallback), mid-string for text-like fields.
    if (input.type === 'number') {
      const pos =
        caret != null && caret >= 0 ? Math.min(caret, input.value.length) : input.value.length;
      try {
        input.type = 'text';
        input.setSelectionRange(pos, pos);
        input.type = 'number';
      } catch {
        /* best effort — worst case the caret sits at the end */
      }
    }
  });
}

function handleZakatInput(target) {
  const caret = target.selectionStart;
  if (target.matches('[data-bind="zakat-input"]')) {
    store.dispatch(actions.setZakatInput(target.dataset.field, target.value));
    refocusZakatInput(target.dataset.ref, caret);
    return;
  }
  if (target.matches('[data-bind="zakat-gold-price"]')) {
    store.dispatch(actions.setZakatPrefs({ goldPricePerGram: target.value }));
  } else if (target.matches('[data-bind="zakat-silver-price"]')) {
    store.dispatch(actions.setZakatPrefs({ silverPricePerGram: target.value }));
  } else if (target.matches('[data-bind="zakat-currency"]')) {
    store.dispatch(actions.setZakatPrefs({ currency: target.value }));
  } else if (target.matches('[data-bind="zakat-fitr-per"]')) {
    store.dispatch(actions.setZakatPrefs({ fitrPer: target.value }));
  } else if (target.matches('[data-bind="zakat-fitr-people"]')) {
    store.dispatch(actions.setZakatPrefs({ fitrPeople: target.value }));
  } else {
    return; // nothing matched — don't refocus
  }
  refocusZakatInput(target.dataset.ref, caret);
}

function handleFocusKeydown(e) {
  const state = store.getState();
  if (state.activeView !== VIEWS.FOCUS) return;
  if (e.key === 'ArrowRight') navigateFocusAdjacent(1);
  else if (e.key === 'ArrowLeft') navigateFocusAdjacent(-1);
  else if (e.key === ' ' || e.key === 'Enter') {
    const btn = document.querySelector('.focus__counter');
    if (btn && document.activeElement !== btn) {
      e.preventDefault();
      btn.click();
    }
  } else if (e.key === 'Escape') {
    go(VIEWS.CATEGORY, { id: state.activeParams.id });
  }
}

function navigateFocusAdjacent(dir) {
  const state = store.getState();
  const categoryId = state.activeParams.id;
  const itemId = state.activeParams.subId;
  const entry = getItemEntry(itemId);
  if (!entry) return;
  const items = [...entry.category.items].sort((a, b) => a.order - b.order);
  const idx = items.findIndex((i) => i.id === itemId);
  const target = items[idx + dir];
  if (target) go(VIEWS.FOCUS, { id: categoryId, subId: target.id });
}

/* v3.7 FIX — auto-advance used to stack one anonymous setTimeout per
 * cycle completion with no cancellation. Two completions in quick succession
 * (small-target zikr chains tap fast by nature) armed TWO timers: the first
 * advanced to the next item, the second fired after that and advanced AGAIN —
 * landing on next-next and skipping the item in between entirely.
 *
 * Now a single pending timer exists at most ever; scheduling clears any prior
 * one, and when it fires it re-checks that the user is still on EXACTLY the
 * item/view the completion happened on, so a stale timer can never yank the
 * view away from somewhere new. */
let pendingAutoAdvanceTimer = null;
function scheduleAutoAdvance() {
  const origin = store.getState();
  const from = {
    view: origin.activeView,
    id: String(origin.activeParams?.id ?? ''),
    subId: String(origin.activeParams?.subId ?? ''),
  };
  clearTimeout(pendingAutoAdvanceTimer);
  pendingAutoAdvanceTimer = setTimeout(() => {
    pendingAutoAdvanceTimer = null;
    const now = store.getState();
    if (now.activeView !== from.view) return;
    if (String(now.activeParams?.id ?? '') !== from.id) return;
    if (String(now.activeParams?.subId ?? '') !== from.subId) return;
    navigateFocusAdjacent(1);
  }, 550);
}

let pendingImportPayload = null;

/* v3.8: import a user-provided adhan recording (standard or Fajr) into the
 * offline audio store. Validates size/type with the same defensive posture
 * as every other untrusted input, then refreshes the fire-path flags. */
async function handleAdhanImport(file, kind) {
  const lang = store.getState().settings.language;
  const { validateAdhanFile, looksLikeAudio, saveAdhanAudio } = await import('./audioStore.js');
  const code = validateAdhanFile(file);
  const errorKey = {
    invalid: 'prayer.adhanInvalid',
    empty: 'prayer.adhanInvalid',
    tooLarge: 'prayer.adhanTooLarge',
    notAudio: 'prayer.adhanInvalid',
  }[code];
  if (errorKey) {
    showToast(t(errorKey, lang));
    return;
  }
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!looksLikeAudio(head)) {
      showToast(t('prayer.adhanInvalid', lang));
      return;
    }
    const result = await saveAdhanAudio(kind, file);
    if (!result.ok) {
      showToast(
        t(result.error === 'quota' ? 'storage.persistFailed' : 'prayer.adhanImportFailed', lang)
      );
      return;
    }
    await refreshCustomAdhanFlags();
    showToast(t('prayer.adhanImported', lang));
    render(store.getState());
  } catch (err) {
    console.error('[adhan-import]', err);
    showToast(t('prayer.adhanImportFailed', lang));
  }
}

async function handleImportFile(file) {
  try {
    const text = await backup.readFileAsText(file);
    const result = backup.parseBackup(text);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    // FIX (review v3.1 A2/B1): importing replaces EVERYTHING on this device
    // — favorites, streaks, collections, statistics — with no undo. One
    // misclick used to wipe months of data with a cheerful "Done". Now the
    // person sees exactly what is about to happen and confirms first.
    const lang = store.getState().settings.language;
    pendingImportPayload = result.value;
    openModal(
      buildConfirm({
        message: t('backup.importConfirm', lang),
        confirmAction: 'import-backup-confirmed',
        lang,
        danger: true,
      }),
      { labelledBy: 'modal-title-confirm' }
    );
  } catch (err) {
    showToast(t('common.error', store.getState().settings.language));
    console.error('[import]', err);
  }
}

boot();
