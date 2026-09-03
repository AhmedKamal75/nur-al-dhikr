/**
 * app/quranData.js — Qur'an surah document loading with translation
 * edition overlays (single-flight switching, per-edition caching).
 */

import { rt } from './rt.js';
import { fetchJSON } from './net.js';
import { overlayTranslation, QURAN_SURAH_URL, TRANSLATION_URL } from '../core/config.js';
import { actions, store } from '../core/state.js';
import { setQuranIndexReady } from '../domain/quranSearch.js';

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

export async function fetchTranslationOverlay(edKey, n) {
  const key = `${edKey}:${n}`;
  let tdoc = translationDocCache.get(key);
  if (!tdoc) {
    tdoc = await fetchJSON(TRANSLATION_URL(edKey, n));
    translationDocCache.set(key, tdoc);
  }
  return tdoc;
}

export async function loadSurahDoc(n) {
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
export async function dispatchSurahDoc(id) {
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
 * switch runs, later requests just update `rt.editionSwitchTarget`; the
 * running loop re-checks after each await and the collapsed runner
 * re-executes once with the final target if it moved.
 */

export async function runEditionSwitch(edKey) {
  const existing = store.getState().quran.surahs;
  const ids = Object.keys(existing);
  if (!ids.length) return;
  const merged = {};
  for (const id of ids) {
    // collapse: a newer switch request supersedes this pass mid-loop
    if (rt.editionSwitchTarget !== null && rt.editionSwitchTarget !== edKey) return;
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
  if (rt.editionSwitchTarget !== null && rt.editionSwitchTarget !== edKey) return;
  store.dispatch(actions.setQuranSurahsBulk(merged));
  setQuranIndexReady(false);
  rt.quranSearchBuildStarted = false;
}

export async function applyTranslationEdition(edKey) {
  if (rt.editionSwitchRunning) {
    rt.editionSwitchTarget = edKey; // latest target wins; runner picks it up
    return;
  }
  rt.editionSwitchRunning = true;
  rt.editionSwitchTarget = edKey;
  try {
    // Collapse loop: keep running until the target stops moving.
    while (rt.editionSwitchTarget !== null) {
      const target = rt.editionSwitchTarget;
      try {
        await runEditionSwitch(target);
      } catch (err) {
        console.error('[quran] applyTranslationEdition failed', err);
      }
      if (rt.editionSwitchTarget === target) rt.editionSwitchTarget = null;
    }
  } finally {
    rt.editionSwitchRunning = false;
    rt.editionSwitchTarget = null;
  }
}

// Tracks the last edition seen by the store subscriber so every change
// path (settings UI, backup restore, factory reset) triggers exactly one
// re-merge. null = first run (boot), never triggers.

/* ------------------------------------------------------------------ */
