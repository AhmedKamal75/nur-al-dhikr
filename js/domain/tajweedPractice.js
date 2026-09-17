/**
 * tajweedPractice.js
 * Pure helpers for the "find the rule" drill mode: picking a practice
 * ayah from the curated pool, building the answer key from the same
 * deterministic classifier used for the reading-mode coloring (so the
 * quiz can never disagree with what the app itself would color), scoring
 * a round, and updating streak/accuracy stats. No DOM — the view layer
 * (views/tajweedPracticeView.js) is a thin template shell around this.
 */
import { classifyAyahTajweed, TAJWEED_RULES } from './tajweed.js';
import { recordQuizMiss, clearQuizMiss, weakQuizIds, isQuizItemId } from './quiz.js';

/** (v5.4.0, P0-5b — ported from the v5.3.0 audit) A practice ROUND is 5
 *  questions, not one ayah. */
export const PRACTICE_ROUND_SIZE = 5;

/** (P0-5b) Miss-record ids are the RULE ids (review re-drills a rule).
 *  Reuses the 99-names quiz memory shape {m: misses, l: last-miss day},
 *  cap 200, sanitized on restore — one bounded, tested implementation. */
export const TAJWEED_MISS_CAP = 200;

export function tajweedMissRecord(records, ruleId, today) {
  return recordQuizMiss(records, ruleId, today);
}

export function tajweedMissClear(records, ruleId) {
  return clearQuizMiss(records, ruleId);
}

export function weakTajweedRules(records, limit = 10) {
  return weakQuizIds(records, limit);
}

/* ------------------------------------------------------------------ */
/* Pool coverage (P0-5a): no rule may strand its drill with an          */
/* "no ayahs yet" dead end. The shipped pool is curated; when a rule     */
/* is missing entries (a seed bundle, a future rule), the loader        */
/* backfills from whatever surah docs are already in memory using the   */
/* SAME deterministic classifier the drill scores with — real corpus    */
/* ayahs only, never invented rows. Pure: returns a NEW pool object.    */
/* ------------------------------------------------------------------ */

export const PRACTICE_POOL_MIN = 5;
export const PRACTICE_POOL_CAP = 25;

/**
 * Backfill `pool.byRule` for every TAJWEED_RULES id with fewer than `min`
 * entries, scanning `surahDocs` ({ surahNumber: {ayahs:[{number,text}]}}).
 * Rules named in `only` bypass the min check (top-up mode: the session
 * engine asks for more LOADABLE rows than the shipped pool can serve,
 * e.g. on a seed bundle where most pool ayahs' surahs aren't bundled).
 * Dedupes against existing entries, caps each rule at `cap`, and extends
 * the mixed list so 'mixed' drills see the additions too. Deterministic:
 * document/ayah order, no randomness. Returns { pool, addedByRule }.
 */
export function backfillTajweedPool(
  pool,
  surahDocs,
  { min = PRACTICE_POOL_MIN, cap = PRACTICE_POOL_CAP, only = null } = {}
) {
  const base = pool && typeof pool === 'object' ? pool : {};
  const byRule = { ...(base.byRule || {}) };
  const mixedKeys = new Set((base.mixed || []).map((e) => (e ? `${e.s}:${e.a}` : '')));
  const mixed = [...(base.mixed || [])];
  const onlySet = Array.isArray(only) && only.length ? new Set(only) : null;
  const addedByRule = {};
  for (const rule of TAJWEED_RULES) {
    const list = byRule[rule.id] || [];
    if (list.length >= min && !(onlySet && onlySet.has(rule.id))) continue;
    // One ayah can legitimately exercise MANY rules — dedupe is per rule,
    // never global, or the first rule processed would starve the rest.
    const seen = new Set(list.map((e) => (e ? `${e.s}:${e.a}` : '')));
    const additions = [];
    for (const sKey of Object.keys(surahDocs)) {
      const surah = Number(sKey);
      const doc = surahDocs[sKey];
      if (!doc || !Array.isArray(doc.ayahs)) continue;
      for (const ayah of doc.ayahs) {
        if (list.length + additions.length >= cap) break;
        const key = `${surah}:${ayah.number}`;
        if (seen.has(key)) continue;
        const perWord = classifyAyahTajweed(String(ayah.text || ''));
        let firstWord = 0;
        let count = 0;
        for (const w of perWord) {
          const spans = w.spans.filter((sp) => sp.rule === rule.id);
          if (spans.length) {
            if (!firstWord) firstWord = w.wordIndex;
            count += spans.length;
          }
        }
        if (firstWord) {
          const row = { s: surah, a: Number(ayah.number), w: firstWord, c: count };
          additions.push(row);
          seen.add(key);
          if (!mixedKeys.has(key)) {
            mixedKeys.add(key);
            mixed.push(row);
          }
        }
      }
      if (list.length + additions.length >= cap) break;
    }
    if (additions.length) {
      byRule[rule.id] = [...list, ...additions];
      addedByRule[rule.id] = additions.length;
    }
  }
  if (!Object.keys(addedByRule).length) return { pool: base, addedByRule };
  return { pool: { ...base, byRule, mixed }, addedByRule };
}

/** Practice level for a rule from persisted stats — 1 learner, 2 steady,
 *  3 strong. Derived, never persisted; a low level is a starting point,
 *  not a grade (shame-free copy lives in the i18n strings). */
export function practiceLevel(stats, ruleId) {
  const acc = accuracyFor(stats, ruleId);
  const attempts = stats?.byRule?.[ruleId]?.attempts || 0;
  if (acc == null) return 1;
  if (acc >= 80 && attempts >= 8) return 3;
  if (acc >= 50) return 2;
  return 1;
}

/** Pick `count` pool entries for a rule, avoiding immediate repeats.
 *  `weakFirst` (review rounds) shuffles entries from the most-missed
 *  rules to the front of the mixed pool. Pure. */
export function pickRoundEntries(
  pool,
  ruleId,
  count = PRACTICE_ROUND_SIZE,
  avoid = null,
  weakRules = null
) {
  const n = Math.max(1, Math.floor(Number(count)) || PRACTICE_ROUND_SIZE);
  const byRuleList = pool?.byRule || {};
  const source =
    ruleId === 'mixed' || ruleId === 'review'
      ? pool?.mixed?.length
        ? pool.mixed
        : Object.values(byRuleList).flat() // review must never strand on an empty mixed list
      : byRuleList[ruleId] || [];
  if (!source.length) return [];
  let candidates = source.filter((e) => !(avoid && e.s === avoid.s && e.a === avoid.a));
  if (!candidates.length) candidates = source;
  if (ruleId === 'review' && Array.isArray(weakRules) && weakRules.length) {
    const weakEntries = [];
    for (const id of weakRules) {
      for (const e of byRuleList[id] || []) weakEntries.push(e);
    }
    const seen = new Set();
    const deduped = weakEntries.filter((e) => {
      const k = `${e.s}:${e.a}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (deduped.length >= n) candidates = deduped;
    else {
      // Top up from the general mixed pool.
      const poolSeen = new Set(deduped.map((e) => `${e.s}:${e.a}`));
      candidates = [...deduped, ...source.filter((e) => !poolSeen.has(`${e.s}:${e.a}`))];
    }
  }
  // Deterministic spread when the pool is big enough, random start for
  // variety: stride keeps two consecutive questions from neighboring rows.
  const picked = [];
  const n2 = candidates.length;
  const start = Math.floor(Math.random() * n2);
  const stride = n2 >= n ? Math.max(1, Math.floor(n2 / n)) : 1;
  for (let i = 0; picked.length < n && i < n2 * 2 && stride > 0; i += 1) {
    const e = candidates[(start + i * stride) % n2];
    const k = `${e.s}:${e.a}`;
    if (picked.some((p) => `${p.s}:${p.a}` === k)) continue;
    picked.push(e);
  }
  let i = 0;
  while (picked.length < n && i < n2) {
    const e = candidates[i];
    const k = `${e.s}:${e.a}`;
    if (!picked.some((p) => `${p.s}:${p.a}` === k)) picked.push(e);
    i += 1;
  }
  return picked;
}

/** Is this pool row a real, safe id? Guards review keys. */
export function isTajweedRuleId(id) {
  if (!isQuizItemId(id)) return false;
  return TAJWEED_RULES.some((r) => r.id === id);
}

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
