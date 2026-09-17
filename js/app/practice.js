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
async function loadQuestion(entry) {
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
  return { s: entry.s, a: entry.a, text: ayahText };
}

export async function startPracticeRound(ruleId) {
  const state = store.getState();
  await ensureTajweedPool(state);
  const pool = store.getState().tajweedPool;
  const isReview = ruleId === 'review';
  const weak = isReview ? weakTajweedRules(state.tajweedMissRecords) : null;
  if (isReview && (!weak || !weak.length)) {
    showToast(t('practice.nothingToReview', state.settings.language));
    return;
  }
  // Ordered candidates: the shipped pool first (weak-first for review),
  // walking the WHOLE rule list before giving up — on a seed bundle most
  // curated rows point at surahs that aren't bundled, so an honest round
  // needs every loadable row plus a classifier top-up from memory.
  const candidates = pickRoundEntries(pool, ruleId, PRACTICE_POOL_CAP, null, weak);
  const wanted = PRACTICE_ROUND_SIZE;
  const pickedKeys = new Set();
  const questions = [];
  for (const entry of candidates) {
    if (questions.length >= wanted) break;
    const key = `${entry.s}:${entry.a}`;
    if (pickedKeys.has(key)) continue;
    const q = await loadQuestion(entry);
    if (q) {
      questions.push(q);
      pickedKeys.add(key);
    }
  }
  // Short round: top the pool up from docs ALREADY in memory with the same
  // deterministic classifier the drill scores with (never invented rows),
  // persist the richer pool for the session, then load the additions.
  if (questions.length < wanted && pool) {
    const { pool: filled, addedByRule } = backfillTajweedPool(pool, store.getState().quran.surahs, {
      only: ruleId === 'mixed' || isReview ? null : [ruleId],
    });
    if (Object.keys(addedByRule).length) {
      store.dispatch(actions.setTajweedPool(filled));
      const fresh = [];
      for (const [rid, n] of Object.entries(addedByRule)) {
        const list = filled.byRule[rid] || [];
        fresh.push(...list.slice(-n));
      }
      for (const entry of fresh) {
        if (questions.length >= wanted) break;
        const key = `${entry.s}:${entry.a}`;
        if (pickedKeys.has(key)) continue;
        const q = await loadQuestion(entry);
        if (q) {
          questions.push(q);
          pickedKeys.add(key);
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
    mode: 'round',
    questions,
    qIndex: 0,
    surah: first.s,
    ayah: first.a,
    text: first.text,
    selected: new Set(),
    checked: false,
    targets: buildAnswerKey(first.text, ruleId === 'review' ? 'mixed' : ruleId),
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
  session.targets = buildAnswerKey(
    next.text,
    session.ruleId === 'review' ? 'mixed' : session.ruleId
  );
  session.result = null;
  renderPracticeRound();
}

export function openPracticePicker() {
  openModal(buildPracticePicker(store.getState()), { labelledBy: 'modal-title-practice' });
}
