/**
 * core/state/reducer.js — the store's single action switch (dispatcher).
 *
 * Since v5.2 the per-feature transitions live in focused slice modules
 * under core/state/slices/ (this file only fans out). The public surface
 * is unchanged: `reduce(state, action)` stays pure, returns a new root
 * (or the same reference for a no-op the store then skips), and every
 * test imports it from this exact path.
 *
 * Slice map:
 *   slices/shell.js    navigation, settings, boot/restore/reset, history,
 *                      reminders, calendar notes, nudge, data-health, alert
 *                      status, dangling-ref prune
 *   slices/library.js  favorites, hadith bookmarks, collections, counters,
 *                      statistics, custom content, tasbih/speech transients
 *   slices/quran.js    reader, Mushaf, tafsir, word study, roots, tajweed,
 *                      ayah bookmarks + folders, hifz, khatma, mutashabihat
 *   slices/hadith.js   hadith index/books/daily + book-view transient
 *   slices/worship.js  fasting, sadaqah, sunnah, qada, locations, dua
 *                      journal, reflections, Ramadan, zakat, checklist,
 *                      prayer log, quiz, plan import
 *   slices/audio.js    player, audio prefs/custom reciters, offline
 *                      downloads, audio-manager transients, surah playback
 */

import { reduceShell } from './slices/shell.js';
import { reduceLibrary } from './slices/library.js';
import { reduceQuran } from './slices/quran.js';
import { reduceHadith } from './slices/hadith.js';
import { reduceWorship } from './slices/worship.js';
import { reduceAudio } from './slices/audio.js';

/* ---------------------------------------------------------------- */
/* Reducer — one pure function over (state, action). Views and      */
/* handlers never mutate state; every transition returns a new root */
/* (or the same reference for a no-op the store then skips).        */
/* ---------------------------------------------------------------- */

export function reduce(state, action) {
  return (
    reduceShell(state, action) ??
    reduceLibrary(state, action) ??
    reduceQuran(state, action) ??
    reduceHadith(state, action) ??
    reduceWorship(state, action) ??
    reduceAudio(state, action) ??
    state
  );
}
