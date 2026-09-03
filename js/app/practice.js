/**
 * app/practice.js — the Tajweed drill-mode session engine (pure scoring
 * lives in domain/tajweedPractice.js; this is the mutable session).
 */

import { rt } from './rt.js';
import { ensureTajweedPool } from './lazyData.js';
import { dispatchSurahDoc } from './quranData.js';
import { t } from '../core/i18n.js';
import { store } from '../core/state.js';
import { buildAnswerKey, pickRoundEntry } from '../domain/tajweedPractice.js';
import { openModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { buildPracticeRound } from '../views/tajweedPracticeView.js';

/* Tajweed practice / drill mode                                       */
/* ------------------------------------------------------------------ */

// Transient round state — a half-tapped quiz has no business being
// persisted or undo-able, same reasoning as flipDirection/activeTafsirTab.

export function renderPracticeRound() {
  openModal(buildPracticeRound(store.getState(), rt.practiceSession), {
    labelledBy: 'modal-title-practice',
  });
}

export async function startPracticeRound(ruleId) {
  const state = store.getState();
  await ensureTajweedPool(state);
  const pool = store.getState().tajweedPool;
  const avoid =
    rt.practiceSession && rt.practiceSession.ruleId === ruleId
      ? { s: rt.practiceSession.surah, a: rt.practiceSession.ayah }
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
  rt.practiceSession = {
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
