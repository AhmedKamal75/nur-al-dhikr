/**
 * services/gapTelemetry.js — (v5.11.0 C) opt-in, local-only follow-gap
 * telemetry for low-end devices.
 *
 * Headless numbers never capture budget-phone render costs, so the app can
 * measure itself: per ayah advance, the main-thread delay between the
 * engine's dispatch (audio moved on) and the follow effect executing
 * (scroll/page-flip decided), plus the effect's own sync cost and any
 * longtask the platform reports meanwhile.
 *
 * Privacy contract (hard): recording happens ONLY while the
 * `gapTelemetry` settings flag is on (default off); samples live in module
 * memory + one localStorage key and are NEVER uploaded anywhere — there is
 * no network call in this module. Clearing is one tap in Statistics.
 *
 * Honesty contract: the handoff gap stops at effect EXECUTION (rAF fire /
 * flip decision), not paint — full paint timing needs rAF-after-paint and
 * lies on throttled tabs, so we measure what we can defend. Longtask
 * observation is best-effort (Safari has no longtask entry type) and the
 * UI says so instead of showing a confident zero.
 *
 * Store-free by design (same rule as surahPlayback): call sites mark
 * dispatches/applies, the service owns math + persistence. Pure helpers
 * (percentile, summarize) are exported for unit tests.
 */

/** Ring-buffer cap: ~300 advances ≈ a long juz' session, bounded by design. */
export const MAX_SAMPLES = 300;
const STORAGE_KEY = 'nur.gapTelemetry.v1';
/** A handoff slower than this is a frozen tab, not a measurement. */
export const GAP_MAX_MS = 60000;

function nowMs() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function')
      return performance.now();
  } catch {
    /* fall through */
  }
  return Date.now();
}

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

let enabled = false;
let samples = []; // [{ t, gapMs, effectMs|null }] — oldest first
let longtaskCount = 0;
let longtaskTotalMs = 0;
let longtaskUnsupported = false;
let pending = new Map(); // ayah key -> dispatch perf-ms
let observer = null;

/** Nearest-rank percentile over a numeric array. Pure — tests pin it. */
export function percentile(values, p) {
  const xs = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!xs.length) return null;
  const rank = Math.min(xs.length - 1, Math.max(0, Math.ceil((p / 100) * xs.length) - 1));
  return xs[rank];
}

/** { count, p50, p95, max, last } over a numeric array (nulls when empty). */
export function summarize(values) {
  const xs = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!xs.length) return { count: 0, p50: null, p95: null, max: null, last: null };
  return {
    count: xs.length,
    p50: percentile(xs, 50),
    p95: percentile(xs, 95),
    max: Math.max(...xs),
    last: xs[xs.length - 1],
  };
}

function persist() {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    /* quota/privacy mode — memory still serves the session */
  }
}

/** Load persisted samples (hostile-guarded). Exported for tests. */
export function hydrate() {
  const store = storage();
  samples = [];
  if (!store) return samples;
  try {
    const raw = JSON.parse(store.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return samples;
    for (const s of raw.slice(0, MAX_SAMPLES)) {
      if (!s || typeof s !== 'object') continue;
      const t = Math.floor(Number(s.t));
      const gapMs = Math.floor(Number(s.gapMs));
      const e = s.effectMs == null ? null : Math.floor(Number(s.effectMs));
      if (!Number.isFinite(t) || t < 0) continue;
      if (!Number.isFinite(gapMs) || gapMs < 0 || gapMs > GAP_MAX_MS) continue;
      if (e !== null && (!Number.isFinite(e) || e < 0 || e > GAP_MAX_MS)) continue;
      samples.push({ t, gapMs, effectMs: e });
    }
  } catch {
    samples = [];
  }
  return samples;
}

function startObserver() {
  if (observer || typeof PerformanceObserver === 'undefined') {
    if (typeof PerformanceObserver === 'undefined') longtaskUnsupported = true;
    return;
  }
  try {
    const ob = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) noteLongtask(entry?.duration);
    });
    ob.observe({ entryTypes: ['longtask'] });
    observer = ob;
  } catch {
    // No longtask entry type (Safari) — honest absence, not a zero.
    observer = null;
    longtaskUnsupported = true;
  }
}

function stopObserver() {
  if (observer) {
    try {
      observer.disconnect();
    } catch {
      /* already gone */
    }
    observer = null;
  }
}

/** Mirror the settings flag (called per notify — idempotent, cheap). */
export function setEnabled(on) {
  const next = on === true;
  if (next === enabled) return enabled;
  enabled = next;
  if (enabled) {
    hydrate();
    startObserver();
  } else {
    stopObserver();
    pending.clear();
  }
  return enabled;
}

export function isEnabled() {
  return enabled;
}

export function longtaskSupported() {
  return !longtaskUnsupported;
}

/**
 * The engine advanced to `key` ("S:A"). Null (session over) drops pending
 * stamps — a stopped session must never credit its stop to the next tap.
 */
export function markDispatch(key) {
  if (!enabled) return;
  if (key == null) {
    pending.clear();
    return;
  }
  pending.set(String(key), nowMs());
  // A stuck stamp (effect never ran) must not leak memory across sessions.
  while (pending.size > 12) pending.delete(pending.keys().next().value);
}

/** The follow effect executed for `key` — close the handoff sample. */
export function markApplied(key) {
  if (!enabled || key == null) return;
  const t0 = pending.get(String(key));
  pending.delete(String(key));
  if (!Number.isFinite(t0)) return;
  const gap = Math.round(nowMs() - t0);
  if (gap < 0 || gap > GAP_MAX_MS) return;
  samples.push({ t: Date.now(), gapMs: gap, effectMs: null });
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  persist();
}

/** The follow effect's own sync cost (ms) — attaches to the latest open
 *  sample, or stands alone when the handoff already closed. */
export function recordEffect(ms) {
  if (!enabled) return;
  const v = Math.floor(Number(ms));
  if (!Number.isFinite(v) || v < 0 || v > GAP_MAX_MS) return;
  const open = samples.length ? samples[samples.length - 1] : null;
  if (open && open.effectMs == null && Date.now() - open.t < 5000) open.effectMs = v;
  else {
    samples.push({ t: Date.now(), gapMs: 0, effectMs: v });
    if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  }
  persist();
}

/** Longtask durations (ms) observed while enabled. Hostile input dropped. */
export function noteLongtask(ms) {
  if (!enabled) return;
  const v = Math.floor(Number(ms));
  if (!Number.isFinite(v) || v <= 0 || v > GAP_MAX_MS) return;
  longtaskCount += 1;
  longtaskTotalMs += v;
}

export function stats() {
  const gaps = samples.map((s) => s.gapMs);
  const effects = samples.map((s) => s.effectMs).filter((v) => v != null);
  return {
    count: samples.length,
    gap: summarize(gaps),
    effect: summarize(effects),
    longtasks: { count: longtaskCount, totalMs: longtaskTotalMs },
    unsupported: longtaskUnsupported,
  };
}

/** Drop samples + longtask counters (persisted copy too). */
export function clear() {
  samples = [];
  longtaskCount = 0;
  longtaskTotalMs = 0;
  pending.clear();
  const store = storage();
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      /* memory is already clean */
    }
  }
}

/** Test seam: full runtime reset (memory only — storage untouched). */
export function resetGapTelemetryForTests() {
  enabled = false;
  samples = [];
  longtaskCount = 0;
  longtaskTotalMs = 0;
  longtaskUnsupported = false;
  pending = new Map();
  stopObserver();
  observer = null;
}
