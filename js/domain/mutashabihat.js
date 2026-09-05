/**
 * mutashabihat.js (v4.4)
 * Look-alike (mutashabihat) drill — the classic hifz pain point: passages
 * that look or sound alike and get swapped during recall.
 *
 * NOTHING is hand-curated: similar-ayah pairs are COMPUTED from the actual
 * Qur'an text already in memory, so every pair is textually true by
 * construction. Two ayahs are "look-alikes" when they share a contiguous
 * normalized word-run of at least 5 words (the working definition hifz
 * teachers use for confusable passages). The famous high-frequency
 * refrains (Ar-Rahman's "fabayyi aalaaa…", Al-Mursalat's "waylun yawma'izin…")
 * fall out of this rule automatically.
 *
 * Pure module: build once from state.quran.surahs, cached at module scope.
 */

import { normalizeArabic, stripQuranAnnotations } from '../core/utils.js';

const MIN_WORDS = 5; // shared run that qualifies a pair
const MIN_AYAH_WORDS = 6; // ignore tiny ayahs (their n-grams are noise)
const MAX_PAIRS = 400; // deck pool cap; pairs are ranked by run length
const N = MIN_WORDS;

let pairCache = null; // built once per session
let cacheKey = '';

const ayahKey = (s, a) => `${s}:${a}`;

/** Normalize a Qur'anic word for comparison (shared by both sides). */
function normWord(w) {
  return normalizeArabic(stripQuranAnnotations(String(w || ''))).replace(
    /[\u064B-\u0652\u0670\u06D6-\u06ED]/g,
    ''
  );
}

function wordsOf(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(normWord)
    .filter(Boolean);
}

/**
 * Longest contiguous shared word-run between two ayahs' word arrays,
 * seeded from a known matching gram position. Returns {startA, startB, len}.
 */
function extendRun(wordsA, wordsB, posA, posB) {
  let startA = posA;
  let startB = posB;
  while (startA > 0 && startB > 0 && wordsA[startA - 1] === wordsB[startB - 1]) {
    startA -= 1;
    startB -= 1;
  }
  let endA = posA + N;
  let endB = posB + N;
  while (endA < wordsA.length && endB < wordsB.length && wordsA[endA] === wordsB[endB]) {
    endA += 1;
    endB += 1;
  }
  return { startA, startB, len: endA - startA };
}

/**
 * Compute the look-alike pairs. Returns [{ a:{s,a,text}, b:{…},
 * runLen: number, sharedWords: string[] }] sorted by longest run first.
 */
export function buildSimilarPairs(surahs, { force = false } = {}) {
  const key = surahs ? Object.keys(surahs).length + '-' + (surahs[1]?.ayahs?.length ?? 0) : '';
  if (!force && pairCache && cacheKey === key) return pairCache;

  // n-gram index: gram -> [{ key, idx }] (word position of the gram start)
  const grams = new Map();
  const texts = new Map(); // key -> { s, a, words, text, translation }
  for (const [sStr, doc] of Object.entries(surahs || {})) {
    const s = Number(sStr);
    if (!Number.isInteger(s) || s < 1 || s > 114 || !doc || !Array.isArray(doc.ayahs)) continue;
    for (const ay of doc.ayahs) {
      const words = wordsOf(ay.text);
      if (words.length < MIN_AYAH_WORDS) continue;
      const k = ayahKey(s, ay.number);
      texts.set(k, { s, a: ay.number, words, text: ay.text, translation: ay.translation || '' });
      for (let i = 0; i + N <= words.length; i++) {
        const g = words.slice(i, i + N).join(' ');
        if (!grams.has(g)) grams.set(g, []);
        grams.get(g).push({ key: k, idx: i });
      }
    }
  }

  // Expand grams into unique pairs, keeping the LONGEST extended run.
  const best = new Map(); // "k1|k2" (sorted keys) -> record
  for (const [, hits] of grams) {
    if (hits.length < 2) continue;
    // High-frequency refrains generate huge hit lists; sample the first
    // 8 so one famous refrain cannot dominate the whole deck pool.
    for (let i = 0; i < hits.length && i < 8; i++) {
      for (let j = i + 1; j < hits.length && j < 8; j++) {
        if (hits[i].key === hits[j].key) continue;
        const [k1, k2] = [hits[i].key, hits[j].key].sort();
        const id = `${k1}|${k2}`;
        const A = texts.get(k1);
        const B = texts.get(k2);
        if (!A || !B) continue;
        const run = extendRun(A.words, B.words, hits[i].idx, hits[j].idx);
        if (run.len < MIN_WORDS) continue;
        const cur = best.get(id);
        if (cur && cur.runLen >= run.len) continue;
        const sharedWords = A.words.slice(run.startA, run.startA + run.len);
        best.set(id, {
          a: { s: A.s, a: A.a, text: A.text, translation: A.translation },
          b: { s: B.s, a: B.a, text: B.text, translation: B.translation },
          runLen: run.len,
          sharedWords,
        });
      }
    }
  }

  const pairs = [...best.values()].sort((x, y) => y.runLen - x.runLen).slice(0, MAX_PAIRS);
  pairCache = pairs;
  cacheKey = key;
  return pairs;
}

/** Forget the cache (used when the corpus reloads / in tests). */
export function resetMutashabihatCache() {
  pairCache = null;
  cacheKey = '';
}

/** Small deterministic PRNG so a day's deck is stable. */
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build one drill round: the shown ayah, and 3 surah options (its own +
 * the sibling's + one distractor from elsewhere in the deck pool).
 * `seed` changes daily (dateKey sum, same convention as pickDailyItem).
 */
export function buildDrillRound(pairs, { seed = 1, surahNames = {} } = {}) {
  if (!Array.isArray(pairs) || pairs.length < 3) return null;
  const deck = seededShuffle(pairs, seed);
  const pair = deck[0];
  // Distractor: a surah from a DIFFERENT pair, never equal to either option.
  let distractS = deck[deck.length - 1].b.s;
  for (let i = 1; i < deck.length; i++) {
    const s = deck[i].a.s;
    if (s !== pair.a.s && s !== pair.b.s) {
      distractS = s;
      break;
    }
  }
  const options = [...new Set([pair.a.s, pair.b.s, distractS])].filter(
    (s) => Number.isInteger(s) && s >= 1 && s <= 114
  );
  if (options.length < 2) return null;
  const shuffledOpts = seededShuffle(options, seed + 7);
  return {
    question: pair.a,
    sibling: pair.b,
    sharedWords: pair.sharedWords,
    options: shuffledOpts.map((s) => ({ s, name: surahNames[s] || `Surah ${s}` })),
    answer: pair.a.s,
  };
}

/**
 * Which words of a RAW ayah text are part of the shared run (for the
 * side-by-side diff display). Each raw word is normalized with the exact
 * same fold used to build the pairs before membership is tested.
 */
export function diffWords(text, sharedWords) {
  const run = new Set((sharedWords || []).map(normWord).filter(Boolean));
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w, shared: run.has(normWord(w)) }));
}
