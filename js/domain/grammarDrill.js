/**
 * domain/grammarDrill.js — grammar flashcards from the bundled word
 * morphology (`data/quran-words/`: POS, case, mood, verb form, gloss per
 * word). Pure deck building: the caller ensures whatever per-surah word
 * docs it wants in the pool, this module turns the cache into shuffled
 * self-graded cards. No DOM, no state — randomness is injected so tests
 * can pin the shuffle.
 */

export const DRILL_SIZE = 10;

/** Flatten the quranWords cache into candidate cards (words with a known
 *  part of speech — untagged fragments can't be quizzed honestly). */
export function collectDrillWords(wordsCache) {
  const out = [];
  if (!wordsCache || typeof wordsCache !== 'object') return out;
  for (const [surah, ayahs] of Object.entries(wordsCache)) {
    const s = Math.floor(Number(surah));
    if (!Number.isFinite(s) || s < 1 || s > 114 || !ayahs || typeof ayahs !== 'object') continue;
    for (const [ayah, words] of Object.entries(ayahs)) {
      const a = Math.floor(Number(ayah));
      if (!Number.isFinite(a) || a < 1 || !Array.isArray(words)) continue;
      words.forEach((w, i) => {
        if (!w || typeof w !== 'object' || typeof w.text !== 'string' || !w.text) return;
        if (typeof w.posEn !== 'string' || !w.posEn) return;
        const feats = [w.caseEn, w.moodEn, w.verbPattern].filter((x) => typeof x === 'string' && x);
        out.push({
          id: `${s}:${a}:${i}`,
          surah: s,
          ayah: a,
          text: w.text,
          translit: typeof w.translit === 'string' ? w.translit : '',
          posEn: w.posEn,
          posAr: typeof w.posAr === 'string' ? w.posAr : '',
          gloss: typeof w.en === 'string' ? w.en : '',
          root: typeof w.root === 'string' ? w.root : '',
          feats,
        });
      });
    }
  }
  return out;
}

/** Shuffle (Fisher–Yates) + cap. `rng` defaults to Math.random. */
export function buildDeck(wordsCache, { count = DRILL_SIZE, rng = Math.random } = {}) {
  const pool = collectDrillWords(wordsCache);
  const n = Math.max(1, Math.min(50, Math.floor(Number(count)) || DRILL_SIZE));
  const rand = typeof rng === 'function' ? rng : Math.random;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
