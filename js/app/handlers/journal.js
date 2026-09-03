/**
 * app/handlers/journal.js (v4.4)
 * Feature-scoped controller module for the private journal (duas +
 * weekly reflections), the printable memorization certificate, and the
 * mutashabihat (look-alike ayat) drill. Pure (dataset) functions merged
 * into the single delegation table by app/events.js.
 */

import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
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
};
