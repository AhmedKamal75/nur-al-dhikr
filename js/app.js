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

import { CATALOG_URL, QURAN_META_URL, QURAN_SURAH_URL, VIEWS, QUIZ_LENGTH, QUIZ_CHOICE_COUNT, QUIZ_LIBRARY_ID } from './config.js';
import { store, actions, persistedSnapshot } from './state.js';
import { migrate } from './migration.js';
import { processDocument } from './schema.js';
import { buildIndex } from './search.js';
import { render, mountShell } from './renderer.js';
import { applyTheme, watchSystemTheme } from './theme.js';
import { initRouter, go, replaceGo } from './router.js';
import { t } from './i18n.js';
import { pickLocale, uid, vibrate } from './utils.js';
import * as tasbih from './tasbih.js';
import * as speech from './speech.js';
import * as backup from './backup.js';
import * as notifications from './notifications.js';
import * as editorApi from './editor.js';
import * as compass from './compass.js';
import { qiblaBearing } from './qibla.js';
import { updateQiblaCompassDOM } from './views/qibla.js';
import { openModal, closeModal } from './components/modal.js';
import { showToast } from './components/toast.js';
import { buildCardMenu, buildCollectionPicker, buildConfirm, buildTextPrompt } from './components/menus.js';
import { buildItemForm, buildCategoryForm, buildLibraryForm } from './views/editor.js';
import { buildDayDetail, buildNoteForm } from './components/calendarModals.js';
import { PRESETS as TASBIH_PRESETS } from './views/tasbih.js';
import { playSound } from './prayerSound.js';

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
    const libs = (catalog.libraries || []).filter((l) => l.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Fetch every library file in parallel (they're independent), then apply
    // results back in catalog order so display order stays deterministic
    // regardless of which network request happens to resolve first.
    const results = await Promise.all(libs.map(async (lib) => {
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
    }));

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
}

let lastCustomContentRef = null;

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
  document.getElementById('error-reload-btn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('error-reset-btn')?.addEventListener('click', () => {
    try { localStorage.removeItem('nurAlDhikr:v2:state'); } catch { /* ignore */ }
    window.location.hash = '';
    window.location.reload();
  });
}

function onStateChange(stateArg) {
  try {
    let state = stateArg;
    if (state.customContent !== lastCustomContentRef) {
      lastCustomContentRef = state.customContent;
      refreshLibraryIndex();
      state = store.getState();
    }
    applyTheme(state.settings);
    if (state.activeView === VIEWS.QURAN) ensureQuranData(state);
    updateCompassLifecycle(state);
    render(state);
  } catch (err) {
    renderErrorScreen(err);
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
  if (compassRAFHandle) { cancelAnimationFrame(compassRAFHandle); compassRAFHandle = null; }
  compass.stop();
}

function updateCompassLifecycle(state) {
  const onQibla = state.activeView === VIEWS.QIBLA;
  if (!onQibla) { stopCompass(); return; }
  // On browsers that require an explicit permission prompt (iOS Safari),
  // wait for the person to tap "Enable Compass" (see clickHandlers below)
  // rather than starting automatically.
  if (compass.isSupported() && !compass.needsPermission()) startCompassIfNeeded();
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
      const surah = await fetchJSON(QURAN_SURAH_URL(id));
      store.dispatch(actions.setQuranSurah(id, surah));
    } catch (err) {
      console.error('[quran] failed to load surah', id, err);
    } finally {
      quranSurahFetchesInFlight.delete(id);
    }
  }
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
    notifications.startScheduler(
      () => store.getState().reminders,
      store.getState().settings.language,
      () => store.getState().calendarNotes,
      () => store.getState().settings.prayer
    );

    store.subscribe(onStateChange);
    initRouter(); // dispatches the first NAVIGATE
    render(store.getState());

    registerServiceWorker();
    bindGlobalEvents();
  } catch (err) {
    renderErrorScreen(err);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const doRegister = () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[sw] registration failed', err));
  };
  // boot() is async and may finish well after window's 'load' event already fired
  // (e.g. slow catalog fetch), so check readyState instead of blindly awaiting 'load'.
  if (document.readyState === 'complete') doRegister();
  else window.addEventListener('load', doRegister);
}

/* ------------------------------------------------------------------ */
/* Shared lookups                                                      */
/* ------------------------------------------------------------------ */

function getItemEntry(itemId) {
  return store.getState().library.itemIndex[itemId] || null;
}

function itemClipboardText(item, lang) {
  const parts = [item.arabic, item.transliteration, pickLocale(item.translation, lang)].filter(Boolean);
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
    const distractors = shuffled(allIds.filter((id) => id !== itemId)).slice(0, QUIZ_CHOICE_COUNT - 1);
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
    if (result.cycleCompleted && state.activeView === VIEWS.FOCUS && state.settings.autoAdvanceFocus) {
      setTimeout(() => navigateFocusAdjacent(1), 550);
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

  'share-item': async (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const lang = store.getState().settings.language;
    const text = itemClipboardText(entry.item, lang);
    const title = pickLocale(entry.item.title, lang);
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast(t('card.copied', lang));
      } catch {
        showToast(t('card.copyFailed', lang));
      }
    }
    closeModal();
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
      }
    });
    closeModal();
  },

  'open-collection-picker': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    openModal(buildCollectionPicker(entry.item, store.getState()), { labelledBy: 'modal-title-picker' });
  },

  'create-collection': () => {
    const lang = store.getState().settings.language;
    openModal(buildTextPrompt({ title: t('collections.namePrompt', lang), confirmAction: 'submit-new-collection', lang }), { labelledBy: 'modal-title-prompt' });
  },

  'create-collection-suggested': (ds) => {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: ds.nameEn, ar: ds.nameAr || ds.nameEn }));
    go(VIEWS.COLLECTION, { id });
  },

  'create-collection-inline': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildTextPrompt({ title: t('collections.namePrompt', lang), confirmAction: 'submit-new-collection-inline', confirmData: { itemId: ds.itemId }, lang }), { labelledBy: 'modal-title-prompt' });
  },

  'delete-collection': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildConfirm({ message: t('editor.deleteConfirm', lang), confirmAction: 'confirm-delete-collection', confirmData: { id: ds.id }, lang }));
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

  'export-backup': () => {
    backup.downloadBackup(persistedSnapshot(store.getState()));
    showToast(t('common.done', store.getState().settings.language));
  },

  'import-backup': () => {
    const input = document.getElementById('backup-file-input');
    input.value = '';
    input.click();
  },

  'reset-all-data': () => {
    const lang = store.getState().settings.language;
    openModal(buildConfirm({ message: t('settings.resetConfirm', lang), confirmAction: 'confirm-reset-all', lang }));
  },

  'confirm-reset-all': () => {
    store.dispatch(actions.resetAll());
    closeModal();
    go(VIEWS.HOME);
  },

  'prayer-request-location': () => {
    const lang = store.getState().settings.language;
    if (!navigator.geolocation) { showToast(t('prayer.locationUnavailable', lang)); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        store.dispatch(actions.updatePrayerSettings({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locationName: ''
        }));
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
  },

  'quiz-exit-link': () => {
    store.dispatch(actions.exitQuiz());
    go(VIEWS.LIBRARY);
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
    openModal(buildNoteForm(ds.date || note.startDate, note, lang), { labelledBy: 'modal-title-note' });
  },

  'calendar-delete-note': (ds) => {
    store.dispatch(actions.deleteCalendarNote(ds.id));
    closeModal();
  },

  'toggle-prayer-alert': (ds) => {
    const current = store.getState().settings.prayer.alerts || {};
    store.dispatch(actions.updatePrayerSettings({ alerts: { ...current, [ds.prayer]: !current[ds.prayer] } }));
  },

  'prayer-test-sound': () => {
    playSound(store.getState().settings.prayer.alertSound);
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
    openModal(buildCategoryForm({ libraryId: ds.libraryId, lang }), { labelledBy: 'modal-title-category' });
  },

  'editor-delete-category': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildConfirm({ message: t('editor.deleteConfirm', lang), confirmAction: 'confirm-delete-category', confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId }, lang }));
  },

  'confirm-delete-category': (ds) => {
    editorApi.deleteCategory(ds.libraryId, ds.categoryId);
    closeModal();
  },

  'editor-new-item': (ds) => {
    const lang = store.getState().settings.language;
    const blank = editorApi.blankItemTemplate(ds.categoryId);
    openModal(buildItemForm(blank, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), { labelledBy: 'modal-title-item' });
  },

  'editor-edit-item': (ds) => {
    const lang = store.getState().settings.language;
    const lib = editorApi.getCustomLibrary(ds.libraryId);
    const cat = lib?.categories.find((c) => c.id === ds.categoryId);
    const item = cat?.items.find((i) => i.id === ds.itemId);
    if (!item) return;
    openModal(buildItemForm(item, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), { labelledBy: 'modal-title-item' });
  },

  'editor-duplicate-item': (ds) => {
    editorApi.duplicateItem(ds.libraryId, ds.categoryId, ds.itemId);
  },

  'editor-delete-item': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildConfirm({ message: t('editor.deleteConfirm', lang), confirmAction: 'confirm-delete-item', confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId, itemId: ds.itemId }, lang }));
  },

  'confirm-delete-item': (ds) => {
    editorApi.deleteItem(ds.libraryId, ds.categoryId, ds.itemId);
    closeModal();
  },

  'modal-close': () => closeModal()
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
        notes: ''
      },
      grade: fd.get('grade') || 'Unknown',
      custom_grade: { en: fd.get('customGradeEn') || '', ar: '' },
      repetitions: parseInt(fd.get('repetitions'), 10) || 1,
      virtues: { en: fd.get('virtuesEn') || '', ar: '' },
      tags: (fd.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean),
      notes: fd.get('notes') || ''
    };
    const result = editorApi.saveItem(form.dataset.libraryId, form.dataset.categoryId, fields, form.dataset.itemId || null);
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
    editorApi.addCategory(form.dataset.libraryId, { nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr') });
    closeModal();
  },

  library: (form) => {
    const fd = new FormData(form);
    editorApi.createLibrary({ nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr') });
    closeModal();
  },

  reminder: (form) => {
    const fd = new FormData(form);
    store.dispatch(actions.addReminder(notifications.makeReminder({ id: uid('rem'), time: fd.get('time'), label: fd.get('label') })));
    closeModal();
  },

  'prayer-location': (form) => {
    const fd = new FormData(form);
    const lat = parseFloat(fd.get('latitude'));
    const lng = parseFloat(fd.get('longitude'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) { showToast(t('common.error', store.getState().settings.language)); return; }
    store.dispatch(actions.updatePrayerSettings({
      latitude: lat,
      longitude: lng,
      locationName: fd.get('locationName') || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }));
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
      intervalDays: recurrence === 'interval' ? Math.max(2, parseInt(fd.get('intervalDays'), 10) || 3) : null,
      endDate: recurrence === 'range' ? (fd.get('endDateRange') || null)
        : recurrence === 'daily' ? (fd.get('endDateDaily') || null)
        : null,
      reminder: fd.get('reminder') === 'on',
      reminderTime: fd.get('reminder') === 'on' ? (fd.get('reminderTime') || '08:00') : null,
      createdAt: form.dataset.noteId ? undefined : Date.now()
    };

    if (recurrence === 'range' && !note.endDate) { showToast(t('calendar.untilDate', store.getState().settings.language)); return; }

    if (form.dataset.noteId) {
      store.dispatch(actions.updateCalendarNote(form.dataset.noteId, note));
    } else {
      note.createdAt = Date.now();
      store.dispatch(actions.addCalendarNote(note));
    }
    closeModal();
    showToast(t('common.done', store.getState().settings.language));
  }
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

    if (target.matches('[data-action="toggle-setting"]')) {
      store.dispatch(actions.updateSettings({ [target.dataset.key]: target.checked }));
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
      store.dispatch(actions.updateSettings({ dailyGoal: Math.max(1, parseInt(target.value, 10) || 100) }));
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
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.matches('[data-bind="fontScale"]')) {
      store.dispatch(actions.updateSettings({ fontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="arabicFontScale"]')) {
      store.dispatch(actions.updateSettings({ arabicFontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="search-query"]')) {
      debounceSearchNavigate(target.value);
    } else if (target.matches('[data-bind="quran-search"]')) {
      debounceQuranSearchNavigate(target.value);
    }
  });

  document.addEventListener('keydown', (e) => {
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
    if (form.dataset.action?.startsWith('submit-new-collection')) {
      e.preventDefault();
      handlePromptForm(form);
    }
  });

  let touchStartX = null;
  document.addEventListener('touchstart', (e) => {
    if (!document.body.classList.contains('is-focus-mode')) return;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchStartX == null || !document.body.classList.contains('is-focus-mode')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 60) return;
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    // In LTR, swiping left means "forward" (next). In RTL, reading and
    // navigation flow the opposite way, so the same physical swipe should
    // move in the opposite logical direction.
    const swipedTowardStart = dx < 0; // physically swiped leftward
    const dir = isRTL ? (swipedTowardStart ? -1 : 1) : (swipedTowardStart ? 1 : -1);
    navigateFocusAdjacent(dir);
  }, { passive: true });
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

function handleFocusKeydown(e) {
  const state = store.getState();
  if (state.activeView !== VIEWS.FOCUS) return;
  if (e.key === 'ArrowRight') navigateFocusAdjacent(1);
  else if (e.key === 'ArrowLeft') navigateFocusAdjacent(-1);
  else if (e.key === ' ' || e.key === 'Enter') {
    const btn = document.querySelector('.focus__counter');
    if (btn && document.activeElement !== btn) { e.preventDefault(); btn.click(); }
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

async function handleImportFile(file) {
  try {
    const text = await backup.readFileAsText(file);
    const result = backup.parseBackup(text);
    if (!result.success) { showToast(result.error); return; }
    store.dispatch(actions.restoreState(result.value));
    showToast(t('common.done', store.getState().settings.language));
    go(VIEWS.HOME);
  } catch (err) {
    showToast(t('common.error', store.getState().settings.language));
    console.error('[import]', err);
  }
}

boot();
