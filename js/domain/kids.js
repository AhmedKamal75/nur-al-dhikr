/**
 * domain/kids.js — Kids-mode helpers: the surah list and the surah-name
 * memory quiz. Degamified (v5.17.58, merged-plan item 11): no points,
 * no stars, no levels, no week chart — listening keeps a plain finished
 * count in the store and the quiz is play without awards. All pure
 * (seeded RNG for the quiz so tests are deterministic); the store owns
 * the session, the view owns the markup.
 */

/**
 * The kids' surah list: Al-Fatiha + the short closing surahs. Lives in
 * domain (not views/kids.js) so feature handlers can build quiz pools
 * without statically re-coupling the lazy kids view into the boot parse
 * (startup-budget gate); the view re-exports it for existing importers.
 */
export const KIDS_SURAHS = Object.freeze([
  1, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
  113, 114,
]);

/** Deterministic PRNG (mulberry32) so quiz rounds are test-reproducible. */
function mulberry32(seed) {
  let a = Math.floor(Number(seed)) || 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One memory-quiz round: "tap the surah named X" with 4 options.
 * `surahs` is [{ n, nameAr, nameEn }]; needs ≥4 distinct entries.
 * Returns { target, options } (options shuffled) or null when the pool
 * is too small. Pure — the handler builds the entry list from live meta.
 */
export function kidsQuizRound(surahs, seed = Date.now()) {
  const pool = (Array.isArray(surahs) ? surahs : []).filter(
    (s) => s && Number.isFinite(Number(s.n)) && typeof s.nameAr === 'string' && s.nameAr
  );
  if (pool.length < 4) return null;
  const rnd = mulberry32(seed);
  const target = pool[Math.floor(rnd() * pool.length)];
  const others = pool.filter((s) => Number(s.n) !== Number(target.n));
  // Fisher–Yates (seeded) then take 3 distractors.
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const options = [target, ...others.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { target, options };
}
