/**
 * planExport.js (v4.4)
 * Exportable reading/checklist plan — the zero-account sharing primitive.
 * A family member exports their plan (khatma schedule, checklist targets,
 * tasbih targets, dua-journal-free) as a small JSON file; the other device
 * imports it manually and the plan lands on top of THEIR data. No server,
 * no identity, no merge of personal logs — plan only, never history.
 */

export const PLAN_KIND = 'nur-al-dhikr-plan';
export const PLAN_VERSION = 1;

/** Build the exportable plan object from state. */
export function buildPlan(state, { now = Date.now() } = {}) {
  const s = state && typeof state === 'object' ? state : {};
  const tasbihTargets = {};
  const counters = s.counters && typeof s.counters === 'object' ? s.counters : {};
  for (const [id, c] of Object.entries(counters)) {
    if (c && typeof c === 'object' && Number.isFinite(Number(c.target)) && c.target > 0) {
      tasbihTargets[id] = Math.floor(c.target);
    }
  }
  return {
    kind: PLAN_KIND,
    version: PLAN_VERSION,
    exportedAt: new Date(now).toISOString(),
    plan: {
      khatmaPlan: s.khatmaPlan && typeof s.khatmaPlan === 'object' ? s.khatmaPlan : null,
      dailyGoal: Number.isFinite(Number(s.settings?.dailyGoal))
        ? Number(s.settings.dailyGoal)
        : 100,
      tasbihTargets,
      checklistPlan: null,
    },
  };
}

/** True when the parsed JSON looks like one of our plan files. */
export function isPlanFile(obj) {
  return !!obj && typeof obj === 'object' && obj.kind === PLAN_KIND && !!obj.plan;
}

/** Defensively coerce an imported plan; null when unusable. */
export function sanitizePlan(obj) {
  if (!isPlanFile(obj)) return null;
  const p = obj.plan;
  const out = {};
  if (p.khatmaPlan && typeof p.khatmaPlan === 'object') {
    const kp = p.khatmaPlan;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    out.khatmaPlan = {
      startDate: dateRe.test(kp.startDate) ? kp.startDate : null,
      targetDate: dateRe.test(kp.targetDate) ? kp.targetDate : null,
      dailyTarget: Number.isFinite(Number(kp.dailyTarget)) ? Math.floor(kp.dailyTarget) : null,
    };
    if (!out.khatmaPlan.startDate) out.khatmaPlan = null;
    if (out.khatmaPlan && !out.khatmaPlan.targetDate && !out.khatmaPlan.dailyTarget) {
      out.khatmaPlan = null;
    }
  }
  const dg = Number(p.dailyGoal);
  out.dailyGoal = Number.isFinite(dg) && dg >= 10 && dg <= 10000 ? Math.floor(dg) : null;
  if (p.tasbihTargets && typeof p.tasbihTargets === 'object') {
    const tt = {};
    for (const [id, n] of Object.entries(p.tasbihTargets)) {
      const v = Number(n);
      if (
        typeof id === 'string' &&
        id.length <= 120 &&
        Number.isFinite(v) &&
        v > 0 &&
        v <= 100000
      ) {
        tt[id] = Math.floor(v);
      }
    }
    if (Object.keys(tt).length) out.tasbihTargets = tt;
  }
  return Object.keys(out).length ? out : null;
}
