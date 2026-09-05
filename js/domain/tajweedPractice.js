/**
 * tajweedPractice.js
 * Pure helpers for the "find the rule" drill mode: picking a practice
 * ayah from the curated pool, building the answer key from the same
 * deterministic classifier used for the reading-mode coloring (so the
 * quiz can never disagree with what the app itself would color), scoring
 * a round, and updating streak/accuracy stats. No DOM — the view layer
 * (views/tajweedPracticeView.js) is a thin template shell around this.
 */
import { classifyAyahTajweed } from './tajweed.js';

/** Pick a random pool entry for a rule id ('mixed' uses the mixed pool),
 *  preferring one that isn't the ayah just shown so two rounds in a row
 *  don't repeat when the pool has other options. */
export function pickRoundEntry(pool, ruleId, avoid = null) {
  const list = ruleId === 'mixed' ? pool?.mixed : pool?.byRule?.[ruleId];
  if (!list || !list.length) return null;
  const candidates = avoid ? list.filter((e) => !(e.s === avoid.s && e.a === avoid.a)) : list;
  const useList = candidates.length ? candidates : list;
  return useList[Math.floor(Math.random() * useList.length)];
}

function keyOf(t) {
  return `${t.word}:${t.start}:${t.end}`;
}

/** The answer key for a round: every (word, start, end) unit that carries
 *  the target rule in this ayah. 'mixed' mode targets every rule found. */
export function buildAnswerKey(ayahText, ruleId) {
  const perWord = classifyAyahTajweed(ayahText);
  const targets = [];
  for (const { wordIndex, spans } of perWord) {
    for (const s of spans) {
      if (ruleId === 'mixed' || s.rule === ruleId) {
        targets.push({ word: wordIndex, start: s.start, end: s.end, rule: s.rule });
      }
    }
  }
  return targets;
}

/**
 * Score a round. `selected` is an iterable of "word:start:end" keys (what
 * the person tapped). Returns which taps were right/wrong and which
 * targets were missed, plus whether it was a clean sweep.
 */
export function scoreRound(targets, selected) {
  const targetKeys = new Set(targets.map(keyOf));
  const selectedSet = new Set(selected);
  const correct = [...selectedSet].filter((k) => targetKeys.has(k));
  const wrong = [...selectedSet].filter((k) => !targetKeys.has(k));
  const missed = targets.filter((t) => !selectedSet.has(keyOf(t)));
  const perfect = targets.length > 0 && wrong.length === 0 && missed.length === 0;
  return { correct, wrong, missed, perfect, targetCount: targets.length };
}

const EMPTY_STATS = Object.freeze({
  totalCorrect: 0,
  totalAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
  byRule: {},
});

export function defaultTajweedPracticeStats() {
  return { ...EMPTY_STATS, byRule: {} };
}

/** How the persisted stats should change after a round finishes. Pure —
 *  the caller is responsible for actually dispatching/saving the result. */
export function nextStats(stats, ruleId, perfect) {
  const base = stats || defaultTajweedPracticeStats();
  const byRule = { ...base.byRule };
  const prev = byRule[ruleId] || { correct: 0, attempts: 0 };
  byRule[ruleId] = { correct: prev.correct + (perfect ? 1 : 0), attempts: prev.attempts + 1 };
  const currentStreak = perfect ? base.currentStreak + 1 : 0;
  return {
    totalCorrect: base.totalCorrect + (perfect ? 1 : 0),
    totalAttempts: base.totalAttempts + 1,
    currentStreak,
    bestStreak: Math.max(base.bestStreak, currentStreak),
    byRule,
  };
}

/** Accuracy percentage for a rule (or overall with ruleId=null), rounded
 *  to the nearest whole percent. Null when there's no data yet, so the
 *  view can show "not practiced yet" instead of a misleading 0%. */
export function accuracyFor(stats, ruleId = null) {
  const entry = ruleId ? stats?.byRule?.[ruleId] : stats;
  const attempts = ruleId ? entry?.attempts : stats?.totalAttempts;
  const correct = ruleId ? entry?.correct : stats?.totalCorrect;
  if (!attempts) return null;
  return Math.round((100 * correct) / attempts);
}
