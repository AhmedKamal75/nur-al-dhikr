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
  buildClassifyQuestion,
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
  renderClassifyRoundHtml,
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

/**
 * (v5.17.20) The classify round — reachability for work that was already
 * finished.
 *
 * `buildClassifyQuestion` has been written, tested and provenance-tagged since
 * the quiz engine landed, and no user could ever reach it: the answer-mode
 * allowlist excluded 'classify' and the picker offered only the two
 * tap-the-letters modes. A complete, curated multiple-choice generator was
 * sitting in the codebase doing nothing.
 *
 * A third ROUND TYPE rather than a third answer mode, deliberately. The two
 * existing modes both ask "tap the letters"; classify asks "which rule is
 * this?", which has a different answer shape and a different wrong-answer
 * path. It shares the pool, the stats dispatch and the summary, so nothing is
 * duplicated and neither simple mode grows a branch it never takes.
 */
export async function startClassifyRound(ruleId = 'mixed') {
  const state = store.getState();
  const lang = state.settings.language;
  if (ruleId !== 'mixed' && !isTajweedRuleId(ruleId)) return null;
  await ensureTajweedPool(state);
  const pool = store.getState().tajweedPool;
  if (!pool) return null;

  // Draw ayahs from the rule's own rows when a rule was named, else from the
  // mixed pool. The question then asks which rule this ayah carries.
  const source =
    ruleId === 'mixed'
      ? Array.isArray(pool.mixed)
        ? pool.mixed
        : []
      : Array.isArray(pool.byRule?.[ruleId])
        ? pool.byRule[ruleId]
        : [];
  if (!source.length) return null;

  const wanted = Math.min(PRACTICE_ROUND_SIZE, 5);
  const questions = [];
  const seen = new Set();
  const maxTries = Math.min(source.length, 60);
  for (let i = 0; i < maxTries && questions.length < wanted; i++) {
    // Deterministic stride spread, same idea as pickRoundEntries, so a round
    // is not five ayahs from the same corner of the corpus.
    const entry = source[Math.floor((i * source.length) / maxTries) % source.length];
    if (!entry) continue;
    const key = `${entry.s}:${entry.a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const q = loadQuestion(entry, null, 'find-spans');
    if (!q) continue;
    const mcq = buildClassifyQuestion(q.text, { surah: q.s, ayah: q.a });
    // Fewer than two options is not a question, and a single-rule ayah makes
    // it guessable by elimination.
    if (!mcq || mcq.options.length < 2) continue;
    questions.push({ ...mcq, s: q.s, a: q.a, text: q.text });
  }
  if (!questions.length) {
    showToast(t('practice.nothingToReview', lang));
    return null;
  }

  rt.practiceSession = {
    mode: 'classify',
    answerMode: 'classify',
    ruleId,
    questions,
    qIndex: 0,
    checked: false,
    answer: null,
    correct: 0,
    roundStreak: 0,
    bestRoundStreak: 0,
  };
  renderClassifyRound();
  return rt.practiceSession;
}

/** Answer the current classify question. Records through the same one dispatch
 *  the tap modes use, so stats and the weak-rule memory stay a single truth. */
export function answerClassify(ruleId) {
  const session = rt.practiceSession;
  if (!session || session.mode !== 'classify' || session.checked) return;
  if (typeof ruleId !== 'string' || !ruleId) return;
  const q = session.questions[session.qIndex];
  // An option that is not on the question is a crafted click, not an answer.
  if (!q || !q.options.includes(ruleId)) return;
  session.checked = true;
  session.answer = ruleId;
  const perfect = ruleId === q.correctAnswer;
  if (perfect) {
    session.correct += 1;
    session.roundStreak = (session.roundStreak || 0) + 1;
    session.bestRoundStreak = Math.max(session.bestRoundStreak || 0, session.roundStreak);
  } else {
    session.roundStreak = 0;
  }
  store.dispatch(actions.recordTajweedPracticeResult(q.correctAnswer, perfect));
  renderClassifyRound();
}

/** Advance to the next classify question, or finish the round. */
export function advanceClassifyRound() {
  const session = rt.practiceSession;
  if (!session || session.mode !== 'classify') return;
  if (session.qIndex + 1 >= session.questions.length) {
    renderPracticeSummary();
    return;
  }
  session.qIndex += 1;
  session.checked = false;
  session.answer = null;
  renderClassifyRound();
}

export function renderClassifyRound() {
  openModal(renderClassifyRoundHtml(store.getState(), rt.practiceSession), {
    labelledBy: 'modal-title-practice',
  });
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
    const retryLang = state.settings.language;
    showToast(t('practice.loadFailed', retryLang), {
      assertive: true,
      actionLabel: t('common.retry', retryLang),
      onAction: () => {
        void startPracticeRound(ruleId, mode);
      },
    });
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
