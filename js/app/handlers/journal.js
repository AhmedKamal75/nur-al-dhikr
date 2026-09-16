/**
 * app/handlers/journal.js (v4.4)
 * Feature-scoped controller module for the private journal (duas +
 * weekly reflections), the printable memorization certificate, and the
 * mutashabihat (look-alike ayat) drill. Pure (dataset) functions merged
 * into the single delegation table by app/events.js.
 */

import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { replaceGo } from '../../core/router.js';
import { VIEWS } from '../../core/config.js';
import { vibrate } from '../../core/utils.js';
import { journalExportText } from '../../domain/duaJournal.js';
import { buildDrillRound, buildSimilarPairs } from '../../domain/mutashabihat.js';
import { showToast } from '../../ui/toast.js';

/** Read the journal textarea for `bind` and clear it after a successful
 *  save — the panel re-renders with the new entry, so a stale value in the
 *  box would look like the save silently failed. */
function takeTextareaValue(bind) {
  const el = document.querySelector(`[data-bind="${bind}"]`);
  if (!el) return '';
  const value = el.value.trim();
  el.value = '';
  return value;
}

/** Plain-text journal export — a .txt download the user owns. */
function downloadJournalExport() {
  const state = store.getState();
  const text = journalExportText({ duas: state.duaJournal, reflections: state.reflections });
  if (!text.trim() || text === 'Nur al-Dhikr — Journal export') {
    showToast(t('journal.exportEmpty', state.settings.language));
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nur-al-dhikr-journal-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------- In-place edit + pagination (v5.2.49) ---------------- */
// Edit mode rides on `?edit=<id>` (no new state — Back exits it, reloads
// never resurrect a half-typed draft). Paging rides on `?page=` via
// replaceGo, the same no-history-spam discipline as the search box.

/** Params for a journal replace-navigation: current tab + filter kept. */
function journalNavParams(extra = {}) {
  const params = store.getState().activeParams || {};
  const tab = params.tab === 'reflections' ? 'reflections' : null;
  const q = typeof params.q === 'string' && params.q ? params.q : null;
  return { ...(tab ? { tab } : {}), ...(q ? { q } : {}), ...extra };
}

export const clickHandlers = {
  /* ---------------- Dua journal ---------------- */

  'dua-save': () => {
    const text = takeTextareaValue('dua-text');
    if (!text) {
      showToast(t('journal.duaEmptyInput', store.getState().settings.language));
      return;
    }
    store.dispatch(actions.addDua(text));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
    showToast(t('journal.duaSaved', state.settings.language));
  },

  'dua-toggle-answered': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.toggleDuaAnswered(ds.id));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(8);
  },

  'dua-remove': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.removeDua(ds.id));
  },

  'journal-edit-open': (ds) => {
    if (!ds.id) return;
    replaceGo(VIEWS.JOURNAL, journalNavParams({ edit: ds.id }));
  },

  'journal-edit-cancel': () => {
    replaceGo(VIEWS.JOURNAL, journalNavParams());
  },

  'journal-page': (ds) => {
    const page = Math.max(1, Math.floor(Number(ds.page)) || 1);
    replaceGo(VIEWS.JOURNAL, journalNavParams(page > 1 ? { page: String(page) } : {}));
  },

  'dua-edit-save': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const id = state.activeParams?.edit;
    const entry = Array.isArray(state.duaJournal)
      ? state.duaJournal.find((e) => e && e.id === id)
      : null;
    if (!entry) return;
    const el = document.querySelector('[data-bind="journal-edit-text"]');
    const text = String(el?.value || '').trim();
    if (!text) {
      showToast(t('journal.duaEmptyInput', lang));
      return;
    }
    store.dispatch(actions.editDua(id, text));
    replaceGo(VIEWS.JOURNAL, journalNavParams());
    const after = store.getState();
    if (after.settings.hapticsEnabled) vibrate(10);
    showToast(t('journal.duaSaved', after.settings.language));
  },

  /* ---------------- Weekly reflections ---------------- */

  'reflection-save': (ds) => {
    const text = takeTextareaValue('reflection-text');
    if (!text) {
      showToast(t('journal.reflectionEmptyInput', store.getState().settings.language));
      return;
    }
    store.dispatch(actions.addReflection(text, ds.week || '', ds.prompt || ''));
    showToast(t('journal.reflectionSaved', store.getState().settings.language));
  },

  'reflection-remove': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.removeReflection(ds.id));
  },

  'reflection-edit-save': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const id = state.activeParams?.edit;
    const entry = Array.isArray(state.reflections)
      ? state.reflections.find((e) => e && e.id === id)
      : null;
    if (!entry) return;
    const el = document.querySelector('[data-bind="journal-edit-text"]');
    const text = String(el?.value || '').trim();
    if (!text) {
      showToast(t('journal.reflectionEmptyInput', lang));
      return;
    }
    store.dispatch(actions.editReflection(id, text));
    replaceGo(VIEWS.JOURNAL, journalNavParams());
    const after = store.getState();
    if (after.settings.hapticsEnabled) vibrate(10);
    showToast(t('journal.reflectionSaved', after.settings.language));
  },

  'journal-export': () => {
    downloadJournalExport();
  },

  /* ---------------- Certificate ---------------- */

  'certificate-print': () => {
    window.print();
  },

  /* ---------------- Mutashabihat drill ---------------- */

  'mutashabihat-pick': (ds) => {
    const state = store.getState();
    const picked = parseInt(ds.surah, 10);
    if (!Number.isFinite(picked)) return;
    const pairs = buildSimilarPairs(state.quran.surahs);
    if (!pairs.length) return;
    const seed = state.mutashabihat.seed ?? null;
    const names = {};
    for (let i = 1; i <= 114; i++) {
      const meta = state.quran.meta?.surahs?.find((s) => s.number === i);
      names[i] = meta ? meta.nameTransliteration || meta.nameEn : `Surah ${i}`;
    }
    const round = buildDrillRound(pairs, { seed, surahNames: names });
    if (!round) return;
    const right = picked === round.answer;
    store.dispatch(
      actions.updateMutashabihat({
        seed,
        picked,
        reveal: true,
        right: state.mutashabihat.right + (right ? 1 : 0),
        wrong: state.mutashabihat.wrong + (right ? 0 : 1),
      })
    );
    const after = store.getState();
    if (after.settings.hapticsEnabled) vibrate(right ? 12 : [10, 40, 10]);
  },

  'mutashabihat-next': () => {
    const state = store.getState();
    // Next round = new seed (today's base + a salt so consecutive taps
    // always move on), verdict cleared, selection cleared.
    const salt = (state.mutashabihat.salt ?? 0) + 1;
    const d = new Date();
    const seed = d.getFullYear() + (d.getMonth() + 1) * 31 + d.getDate() * 7 + salt;
    store.dispatch(
      actions.updateMutashabihat({
        seed,
        salt,
        picked: null,
        reveal: false,
      })
    );
  },

  // (v5.2.75, UP-09) drill pool switch: all pairs vs. pairs touching
  // ayahs with recorded lapses. A fresh seed starts the new pool's deck.
  'mutashabihat-pool': (ds) => {
    const pool = ds.pool === 'lapsed' ? 'lapsed' : 'all';
    store.dispatch(
      actions.updateMutashabihat({
        pool,
        seed: Date.now() % 100000,
        picked: null,
        reveal: false,
      })
    );
  },
};
