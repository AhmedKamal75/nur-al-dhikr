/**
 * domain/garden.js (v4.5.2)
 * The Garden — a growth visualization of a lifetime of dhikr, restored
 * from the reference app the user supplied (webp7: the plant-a-tree
 * screen). Every recitation counted anywhere in the app (cards, focus
 * mode, the tasbih dial) is a seed; the garden's plant grows through
 * fixed lifetime milestones.
 *
 * Framing follows the app's anti-guilt nudge policy (see
 * domain/milestones.js): the garden celebrates what IS planted — it never
 * scolds, never counts down what "should" have been. The progress line
 * is phrased as growth ("growing toward…"), and an empty garden shows a
 * seed and a welcome, not a deficit.
 */

/**
 * The growth stages. `at` is the lifetime-recitation threshold; the last
 * stage has no threshold beyond its own — it is the final form.
 * Order matters (display + computation).
 */
export const GARDEN_STAGES = Object.freeze([
  { id: 'seed', at: 0, icon: 'seed' },
  { id: 'sprout', at: 100, icon: 'sprout' },
  { id: 'sapling', at: 500, icon: 'sprout' },
  { id: 'youngTree', at: 2000, icon: 'tree' },
  { id: 'tree', at: 8000, icon: 'tree' },
  { id: 'grove', at: 25000, icon: 'tree' },
]);

/**
 * Compute the garden state from a lifetime recitation count.
 * Returns { stage, stageIndex, next, toNext, progress, planted } where:
 *  - stage: the current stage object
 *  - next: the next stage object or null at the final form
 *  - toNext: recitations still needed for the next stage (null at the end)
 *  - progress: 0..1 progress from the current stage's threshold to the
 *    next stage's threshold (1 at the final form)
 *  - planted: the lifetime count, passed through for display
 */
export function gardenState(totalRecitations = 0) {
  const planted = Number.isFinite(totalRecitations) ? Math.max(0, totalRecitations) : 0;
  let stageIndex = 0;
  for (let i = 0; i < GARDEN_STAGES.length; i += 1) {
    if (planted >= GARDEN_STAGES[i].at) stageIndex = i;
  }
  const stage = GARDEN_STAGES[stageIndex];
  const next = GARDEN_STAGES[stageIndex + 1] || null;
  const span = next ? next.at - stage.at : 0;
  const progress = next ? Math.min(1, (planted - stage.at) / Math.max(1, span)) : 1;
  return {
    stage,
    stageIndex,
    next,
    toNext: next ? Math.max(0, next.at - planted) : null,
    progress,
    planted,
  };
}

/**
 * How many milestones the garden has already passed — the "harvest"
 * count for the achievements row (the achieved stages excluding the seed
 * everyone starts with).
 */
export function gardenAchievements(totalRecitations = 0) {
  const planted = Number.isFinite(totalRecitations) ? Math.max(0, totalRecitations) : 0;
  return GARDEN_STAGES.filter((s) => s.at > 0 && planted >= s.at);
}
