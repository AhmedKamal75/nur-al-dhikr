/**
 * domain/kids.js — Kids-mode progression: levels, weekly activity, and the
 * surah-name memory quiz. All pure (seeded RNG for the quiz so tests are
 * deterministic); the store owns the session, the view owns the markup.
 */
import { dateKey, addDays } from '../core/utils.js';

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

/** Star thresholds for kids levels — name keys resolve via kids.level.<id>. */
export const KIDS_LEVELS = Object.freeze([
  { id: 'seed', at: 0 },
  { id: 'sprout', at: 5 },
  { id: 'explorer', at: 15 },
  { id: 'star', at: 30 },
  { id: 'moon', at: 60 },
  { id: 'crown', at: 100 },
]);

/**
 * Level for a star total: { level, next, progress } where `next` is null
 * at the final form and progress is 0..1 toward it. Hostile totals clamp
 * to zero so a forged blob can never crash the banner.
 */
export function kidsLevelFor(total) {
  const n = Number.isFinite(Math.floor(Number(total))) && total > 0 ? Math.floor(Number(total)) : 0;
  let idx = 0;
  for (let i = 0; i < KIDS_LEVELS.length; i += 1) {
    if (n >= KIDS_LEVELS[i].at) idx = i;
  }
  const level = KIDS_LEVELS[idx];
  const next = KIDS_LEVELS[idx + 1] || null;
  const progress = next ? Math.min(1, Math.max(0, (n - level.at) / (next.at - level.at))) : 1;
  return { level, next, progress };
}

/**
 * Last-7-day activity ending today (or `now`): [{ key, count }] oldest
 * first. Keys outside the calendar shape count as zero — a hostile days
 * map degrades to an empty week, never a crash.
 */
export function kidsWeek(days, now = new Date()) {
  const src = days && typeof days === 'object' ? days : {};
  const base = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = dateKey(addDays(base, -i));
    const c = Math.floor(Number(src[key]));
    out.push({ key, count: Number.isFinite(c) && c > 0 ? Math.min(c, 10000) : 0 });
  }
  return out;
}

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
