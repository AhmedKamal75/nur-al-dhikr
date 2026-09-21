/**
 * scripts/chaos-matrix.mjs — fault-injection scenario catalog (v5.17.2,
 * audit CHAOS follow-up). Browser execution lives in CI (see
 * .github/workflows/check.yml `browser-evidence`); this module stays
 * runtime-agnostic so unit tests can pin the scenario contract and run
 * the pure probes against stubs.
 *
 * Invariants (must hold under EVERY scenario):
 *   - no white screen: the probe resolves a structured {ok, error} result;
 *   - no silent data loss: pre-existing cache entries survive the fault.
 */

export const CHAOS_SCENARIOS = [
  { id: 'http-500', kind: 'network', fault: 'status:500', invariant: 'structured-error' },
  { id: 'http-404', kind: 'network', fault: 'status:404', invariant: 'structured-error' },
  { id: 'latency-3s', kind: 'network', fault: 'delay:3000ms', invariant: 'structured-error' },
  { id: 'fetch-reject', kind: 'network', fault: 'throw:TypeError', invariant: 'structured-error' },
  { id: 'storage-wipe', kind: 'storage', fault: 'caches.delete(data)', invariant: 'no-data-loss' },
  {
    id: 'quota-exceeded',
    kind: 'storage',
    fault: 'put:QuotaExceededError',
    invariant: 'no-data-loss',
  },
  { id: 'cpu-throttle-4x', kind: 'compute', fault: 'throttle:4x', invariant: 'structured-error' },
];

const INVARIANTS = new Set(['structured-error', 'no-data-loss']);

/**
 * Run one scenario against injected stubs.
 * stubs: { fetch(url) -> Response-ish | throws, cache: Map(url -> body) }
 * probe: async ({fetch, cache}) -> { ok: true } | { ok: false, error: string }
 * Returns { scenario, passed, detail } — never throws (a throw IS the
 * white-screen the harness exists to catch).
 */
export async function runChaosScenario(scenario, stubs, probe) {
  if (!scenario || !INVARIANTS.has(scenario.invariant)) {
    return { scenario: scenario?.id || '?', passed: false, detail: 'unknown-invariant' };
  }
  const before = new Map(stubs.cache);
  try {
    const result = await probe(stubs);
    if (!result || typeof result.ok !== 'boolean') {
      return { scenario: scenario.id, passed: false, detail: 'unstructured-result' };
    }
    if (scenario.invariant === 'no-data-loss') {
      for (const [k, v] of before) {
        if (stubs.cache.get(k) !== v) {
          return { scenario: scenario.id, passed: false, detail: `cache-entry-lost:${k}` };
        }
      }
    }
    return { scenario: scenario.id, passed: true, detail: result.ok ? 'ok' : result.error };
  } catch (err) {
    return { scenario: scenario.id, passed: false, detail: `threw:${err?.message || err}` };
  }
}
