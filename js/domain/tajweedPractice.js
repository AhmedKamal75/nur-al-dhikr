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
  return weakQuizIds(records, limit).filter(isTajweedRuleId);
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
 * Bridge the generated v2 pool across a newly introduced rare rule.
 *
 * Madd al-Līn of ʿAyn occurs in two distinct ayahs in this bundled Hafs
 * corpus: 19:1 (كٓهيعٓصٓ) and 42:2 (عٓسٓقٓ). Older generated pool files
 * already contain these ayahs in their mixed pool via other rules, but they
 * predate the separate madd_4_6 rule. Add only these source-grounded rows
 * when the metadata identifies the complete 114-surah corpus. A seed pool
 * must never receive rows for surahs it does not bundle. Rebuilding the
 * generated artifact with scripts/build-tajweed-practice.mjs makes this
 * compatibility bridge a no-op and is the preferred long-term state.
 */
const MADDAIN_AYN_CORPUS_ROWS = Object.freeze([
  Object.freeze({ s: 19, a: 1, w: 1, c: 1 }),
  Object.freeze({ s: 42, a: 2, w: 1, c: 1 }),
]);

export function normalizeTajweedPracticePool(pool) {
  if (!pool || typeof pool !== 'object' || Array.isArray(pool)) return pool;
  const corpus = pool.corpus;
  if (Number(corpus?.surahs) !== 114 || Number(corpus?.ayahs) < 6000) return pool;

  const priorRuleRows = Array.isArray(pool.byRule?.madd_4_6) ? pool.byRule.madd_4_6 : [];
  const nextRuleRows = [...priorRuleRows];
  const seenRuleRows = new Set(
    nextRuleRows.map((row) => (row ? `${row.s}:${row.a}` : ''))
  );
  for (const row of MADDAIN_AYN_CORPUS_ROWS) {
    const key = `${row.s}:${row.a}`;
    if (!seenRuleRows.has(key)) {
      nextRuleRows.push({ ...row });
      seenRuleRows.add(key);
    }
  }

  const priorCoverage = pool.coverage && typeof pool.coverage === 'object' ? pool.coverage : {};
  const priorLevels = pool.levels && typeof pool.levels === 'object' ? pool.levels : {};
  const expectedLevels = {
    '1': nextRuleRows.slice(0, 10),
    '2': nextRuleRows.slice(0, 25),
    '3': [...nextRuleRows],
  };
  const expectedSpanCount = nextRuleRows.reduce((sum, row) => sum + Number(row?.c || 0), 0);
  const needsRuleRows = nextRuleRows.length !== priorRuleRows.length;
  const needsCoverage =
    Number(priorCoverage.madd_4_6?.ayahs) !== nextRuleRows.length ||
    Number(priorCoverage.madd_4_6?.spans) !== expectedSpanCount;
  const needsLevels = ['1', '2', '3'].some(
    (level) =>
      JSON.stringify(priorLevels[level]?.madd_4_6 || []) !== JSON.stringify(expectedLevels[level])
  );
  if (
    !needsRuleRows &&
    !needsCoverage &&
    !needsLevels &&
    Number(corpus.ruleCount) === TAJWEED_RULES.length
  ) {
    return pool;
  }

  return {
    ...pool,
    corpus: { ...corpus, ruleCount: TAJWEED_RULES.length },
    byRule: {
      ...(pool.byRule && typeof pool.byRule === 'object' ? pool.byRule : {}),
      madd_4_6: nextRuleRows,
    },
    coverage: {
      ...priorCoverage,
      madd_4_6: {
        ayahs: nextRuleRows.length,
        spans: nextRuleRows.reduce((sum, row) => sum + Number(row?.c || 0), 0),
      },
    },
    levels: {
      ...priorLevels,
      '1': { ...(priorLevels['1'] || {}), madd_4_6: expectedLevels['1'] },
      '2': { ...(priorLevels['2'] || {}), madd_4_6: expectedLevels['2'] },
      '3': { ...(priorLevels['3'] || {}), madd_4_6: expectedLevels['3'] },
    },
  };
}

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
  const base = pool && typeof pool === 'object' && !Array.isArray(pool) ? pool : {};
  const priorByRule =
    base.byRule && typeof base.byRule === 'object' && !Array.isArray(base.byRule)
      ? base.byRule
      : {};
  const byRule = { ...priorByRule };
  const mixedSource = Array.isArray(base.mixed) ? base.mixed : [];
  const mixedKeys = new Set(mixedSource.map((e) => (e ? `${e.s}:${e.a}` : '')));
  const mixed = [...mixedSource];
  const docs =
    surahDocs && typeof surahDocs === 'object' && !Array.isArray(surahDocs) ? surahDocs : {};
  const numericOption = (value, fallback) =>
    Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
  // Callers cannot turn a convenience backfill into an unbounded corpus scan.
  const capRows = Math.min(PRACTICE_POOL_CAP, Math.max(0, numericOption(cap, PRACTICE_POOL_CAP)));
  const minRows = Math.min(capRows, Math.max(0, numericOption(min, PRACTICE_POOL_MIN)));
  const onlySet = Array.isArray(only) && only.length ? new Set(only) : null;
  const addedByRule = {};
  const surahKeys = Array.from({ length: 114 }, (_, i) => String(i + 1)).filter((key) =>
    Object.hasOwn(docs, key)
  );
  for (const rule of TAJWEED_RULES) {
    if (onlySet && !onlySet.has(rule.id)) continue;
    const list = Array.isArray(byRule[rule.id]) ? byRule[rule.id] : [];
    if (list.length >= minRows && !onlySet) continue;
    // One ayah can legitimately exercise MANY rules — dedupe is per rule,
    // never global, or the first rule processed would starve the rest.
    const seen = new Set(list.map((e) => (e ? `${e.s}:${e.a}` : '')));
    const additions = [];
    for (const sKey of surahKeys) {
      const surah = Number(sKey);
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) continue;
      const doc = docs[sKey];
      if (!doc || !Array.isArray(doc.ayahs)) continue;
      for (const ayah of doc.ayahs) {
        if (list.length + additions.length >= capRows) break;
        if (!ayah || typeof ayah.text !== 'string') continue;
        const ayahNumber = Number(ayah.number);
        if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > 286) continue;
        const key = `${surah}:${ayahNumber}`;
        if (seen.has(key)) continue;
        const perWord = classifyAyahTajweed(ayah.text);
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
          const row = { s: surah, a: ayahNumber, w: firstWord, c: count };
          additions.push(row);
          seen.add(key);
          if (!mixedKeys.has(key)) {
            mixedKeys.add(key);
            mixed.push(row);
          }
        }
      }
      if (list.length + additions.length >= capRows) break;
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

/* ------------------------------------------------------------------ */
/* (TAJ-QUIZ-01) unified educational quiz modes on the SAME classifier   */
/* engine — no second quiz system. Modes:                               */
/*  1. 'find-spans' — tap the marked units (existing drill);            */
/*  2. 'find-word' — tap the word(s) carrying the rule (word-level);    */
/*  3. 'classify' — given the ayah, choose the rule from options;       */
/*  4. 'review' — re-drill most-missed rules (existing weak memory).    */
/* Every question carries: rule id, source ayah, correct answer,        */
/* distractor provenance, explanation, scholar-review state. A question  */
/* is NEVER built from an unsourced rule definition: distractors and    */
/* answers come only from TAJWEED_RULES ids + classifier output on a    */
/* real corpus ayah.                                                     */
/* ------------------------------------------------------------------ */

export const TAJWEED_QUIZ_MODES = Object.freeze(['find-spans', 'find-word', 'classify', 'review']);
export const TAJWEED_ANSWER_MODES = Object.freeze(['find-spans', 'find-word']);

export function normalizeTajweedAnswerMode(mode) {
  return TAJWEED_ANSWER_MODES.includes(mode) ? mode : null;
}

/** Word-level answer key: 1-based word indices carrying `ruleId`. */
export function buildWordAnswerKey(ayahText, ruleId) {
  const perWord = classifyAyahTajweed(ayahText);
  const words = [];
  for (const { wordIndex, spans } of perWord) {
    if (spans.some((s) => ruleId === 'mixed' || s.rule === ruleId)) words.push(wordIndex);
  }
  return words;
}

export function firstWeakRuleForAyah(ayahText, weakRules) {
  for (const ruleId of Array.isArray(weakRules) ? weakRules : []) {
    if (isTajweedRuleId(ruleId) && buildAnswerKey(ayahText, ruleId).length) return ruleId;
  }
  return null;
}

/** Score a find-word round: selected = iterable of word indices. */
export function scoreWordRound(targetWords, selected) {
  const targets = new Set((targetWords || []).map(Number));
  const picked = new Set([...(selected || [])].map(Number));
  const correct = [...picked].filter((w) => targets.has(w));
  const wrong = [...picked].filter((w) => !targets.has(w));
  const missed = [...targets].filter((w) => !picked.has(w));
  return {
    correct,
    wrong,
    missed,
    perfect: targets.size > 0 && wrong.length === 0 && missed.length === 0,
    targetCount: targets.size,
  };
}

/**
 * Build a classify question for a real corpus ayah. The correct answer is
 * the rule actually present (verified by the classifier); distractors are
 * the next rule ids in TAJWEED_RULES order (deterministic, provenance:
 * 'tajweed-rule-index'). Returns null when the ayah carries no marked
 * rule or the rule id is unsourced — never a guessed question.
 */
export function buildClassifyQuestion(ayahText, { surah = null, ayah = null, options = 4 } = {}) {
  const perWord = classifyAyahTajweed(String(ayahText || ''));
  const present = [];
  for (const { spans } of perWord) {
    for (const s of spans) {
      if (s && s.rule && !present.includes(s.rule)) present.push(s.rule);
    }
  }
  if (!present.length) return null;
  const correctId = present[0];
  const rule = TAJWEED_RULES.find((r) => r.id === correctId);
  if (!rule) return null;
  const n = Math.max(2, Math.min(6, Math.floor(Number(options)) || 4));
  const idx = TAJWEED_RULES.findIndex((r) => r.id === correctId);
  const distractors = [];
  for (let i = 1; distractors.length < n - 1 && i < TAJWEED_RULES.length + 1; i += 1) {
    const cand = TAJWEED_RULES[(idx + i) % TAJWEED_RULES.length];
    if (cand && cand.id !== correctId && !distractors.includes(cand.id)) distractors.push(cand.id);
  }
  // Deterministic option order: rotate so the correct answer is not
  // always first, but identically for the same rule id.
  const all = [correctId, ...distractors];
  const rot = correctId.length % all.length;
  const ordered = all.map((_, i) => all[(i + rot) % all.length]);
  return {
    mode: 'classify',
    ruleId: correctId,
    sourceAyah: surah != null && ayah != null ? { s: Number(surah), a: Number(ayah) } : null,
    ayahText: String(ayahText),
    correctAnswer: correctId,
    options: ordered,
    distractorProvenance: 'tajweed-rule-index',
    explanation: rule.desc || null,
    reviewStatus: 'CURATED',
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
