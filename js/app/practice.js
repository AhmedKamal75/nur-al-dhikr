/**
 * app/practice.js — the Tajweed drill-mode session engine (pure scoring
 * lives in domain/tajweedPractice.js; this is the mutable session).
 *
 * (v5.4.0, P0-5b — ported from the v5.3.0 audit) A round is FIVE
 * questions with a live streak and an end-of-round summary; mistakes
 * feed the persisted weak-rule memory (tajweedMissRecords, {m,l}, cap
 * 200) and a Review round re-drills the most-missed rules first.
 * 'practice-this-ayah' stays a single contextual question — it drills
 * the ayah in front of you, not a level (mode 'single': stats accrue,
 * the weak-rule map is untouched — 'mixed' is not a rule id).
 */

import { rt } from './rt.js';
import { ensureTajweedPool } from './lazyData.js';
import { dispatchSurahDoc } from './quranData.js';
import { t } from '../core/i18n.js';
import { store, actions } from '../core/state.js';
import {
  buildAnswerKey,
  buildWordAnswerKey,
  firstWeakRuleForAyah,
  isTajweedRuleId,
  normalizeTajweedAnswerMode,
  pickRoundEntries,
  backfillTajweedPool,
  weakTajweedRules,
  PRACTICE_ROUND_SIZE,
  PRACTICE_POOL_CAP,
} from '../domain/tajweedPractice.js';
import { openModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import {
  buildPracticeRound,
  buildPracticeSummary,
  buildPracticePicker,
} from '../views/tajweedPracticeView.js';

/* Tajweed practice / drill mode                                       */
/* ------------------------------------------------------------------ */

// Transient round state — a half-tapped quiz has no business being
// persisted or undo-able, same reasoning as flipDirection/activeTafsirTab.

export function renderPracticeRound() {
  openModal(buildPracticeRound(store.getState(), rt.practiceSession), {
    labelledBy: 'modal-title-practice',
  });
}

export function renderPracticeSummary() {
  openModal(buildPracticeSummary(store.getState(), rt.practiceSession), {
    labelledBy: 'modal-title-practice',
  });
}

/** Load one pool entry's surah doc, tolerant of offline tiers: a doc that
 *  cannot load is skipped (the pool has other rows) — the round never
 *  shows a broken question. Returns the question record or null. */
async function loadQuestion(entry, targetRuleId, answerMode, weakRules = null) {
  const state = store.getState();
  let surahDoc = state.quran.surahs[String(entry.s)];
  if (!surahDoc) {
    try {
      await dispatchSurahDoc(entry.s);
      surahDoc = store.getState().quran.surahs[String(entry.s)];
    } catch (err) {
      console.warn('[tajweed] practice question surah unavailable', entry.s, err?.message || err);
      return null;
    }
  }
  const ayahText = surahDoc?.ayahs?.find((a) => String(a.number) === String(entry.a))?.text;
  if (!ayahText) return null;
  const ruleId =
    targetRuleId === 'review' ? firstWeakRuleForAyah(ayahText, weakRules) : targetRuleId;
  if (!ruleId) return null;
  const targets = buildAnswerKey(ayahText, ruleId);
  const targetWords = buildWordAnswerKey(ayahText, ruleId);
  if (answerMode === 'find-word' && !targetWords.length) return null;
  if (answerMode === 'find-spans' && !targets.length) return null;
  return {
    s: entry.s,
    a: entry.a,
    text: ayahText,
    targetRuleId: ruleId,
    targets,
    targetWords,
  };
}

export async function startPracticeRound(ruleId, answerMode = 'find-spans') {
  const mode = normalizeTajweedAnswerMode(answerMode);
  if (!mode || (ruleId !== 'mixed' && ruleId !== 'review' && !isTajweedRuleId(ruleId))) return;
  const state = store.getState();
  await ensureTajweedPool(state);
  const pool = store.getState().tajweedPool;
  const isReview = ruleId === 'review';
  const weak = isReview ? weakTajweedRules(state.tajweedMissRecords) : null;
  if (isReview && (!weak || !weak.length)) {
    showToast(t('practice.nothingToReview', state.settings.language));
    return;
  }
  const candidates = pickRoundEntries(pool, ruleId, PRACTICE_POOL_CAP, null, weak);
  const wanted = PRACTICE_ROUND_SIZE;
  const pickedKeys = new Set();
  const questions = [];
  for (const entry of candidates) {
    if (questions.length >= wanted) break;
    const key = `${entry.s}:${entry.a}`;
    if (pickedKeys.has(key)) continue;
    const q = await loadQuestion(entry, ruleId, mode, weak);
    if (q) {
      questions.push(q);
      pickedKeys.add(key);
    }
  }
  if (questions.length < wanted && pool && !isReview) {
    const { pool: filled, addedByRule } = backfillTajweedPool(pool, store.getState().quran.surahs, {
      only: ruleId === 'mixed' ? null : [ruleId],
    });
    if (Object.keys(addedByRule).length) {
      store.dispatch(actions.setTajweedPool(filled));
      for (const [rid, n] of Object.entries(addedByRule)) {
        for (const entry of (filled.byRule[rid] || []).slice(-n)) {
          if (questions.length >= wanted) break;
          const key = `${entry.s}:${entry.a}`;
          if (pickedKeys.has(key)) continue;
          const q = await loadQuestion(entry, ruleId, mode, weak);
          if (q) {
            questions.push(q);
            pickedKeys.add(key);
          }
        }
      }
    }
  }
  if (!questions.length) {
    showToast(t('practice.loadFailed', state.settings.language));
    return;
  }
  const first = questions[0];
  rt.practiceSession = {
    ruleId,
    answerMode: mode,
    mode: 'round',
    questions,
    qIndex: 0,
    surah: first.s,
    ayah: first.a,
    text: first.text,
    selected: new Set(),
    checked: false,
    targetRuleId: first.targetRuleId,
    targets: first.targets,
    targetWords: first.targetWords,
    result: null,
    results: [],
    roundStreak: 0,
  };
  renderPracticeRound();
}

/** Advance to the next question, or to the summary when the round ends. */
export async function advancePracticeRound() {
  const session = rt.practiceSession;
  if (!session) return;
  if (session.mode === 'single') {
    openPracticePicker();
    return;
  }
  const nextIdx = session.qIndex + 1;
  if (nextIdx >= session.questions.length) {
    renderPracticeSummary();
    return;
  }
  const next = session.questions[nextIdx];
  session.qIndex = nextIdx;
  session.surah = next.s;
  session.ayah = next.a;
  session.text = next.text;
  session.selected = new Set();
  session.checked = false;
  session.targetRuleId = next.targetRuleId;
  session.targets = next.targets;
  session.targetWords = next.targetWords;
  session.result = null;
  renderPracticeRound();
}

export function openPracticePicker() {
  openModal(buildPracticePicker(store.getState(), rt.practicePickerMode), {
    labelledBy: 'modal-title-practice',
  });
}
