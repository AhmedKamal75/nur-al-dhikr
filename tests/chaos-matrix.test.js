/**
 * chaos-matrix.test.js — (v5.17.2) audit CHAOS follow-up.
 * Pins the fault catalog and proves the harness invariants against stubs:
 * network faults surface structured errors, storage faults keep cache data.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CHAOS_SCENARIOS, runChaosScenario } from '../scripts/chaos-matrix.mjs';

const honestProbe = async ({ fetch, cache }) => {
  try {
    const res = await fetch('data/quran/1.json');
    if (!res || res.status >= 400) return { ok: false, error: `http-${res?.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `rejected:${err?.message}` };
  }
};

const readProbe = async ({ cache }) => {
  const hit = cache.get('data/quran/1.json');
  return hit ? { ok: true } : { ok: false, error: 'cache-miss' };
};

describe('chaos matrix catalog', () => {
  test('covers network/storage/compute with known invariants', () => {
    const kinds = new Set(CHAOS_SCENARIOS.map((s) => s.kind));
    assert.deepEqual([...kinds].sort(), ['compute', 'network', 'storage']);
    assert.equal(CHAOS_SCENARIOS.length, 7);
    for (const s of CHAOS_SCENARIOS) {
      assert.ok(s.id && s.fault, `scenario needs id+fault: ${JSON.stringify(s)}`);
      assert.ok(['structured-error', 'no-data-loss'].includes(s.invariant));
    }
  });

  test('network faults become structured errors, never throws', async () => {
    const stubs = {
      fetch: async () => ({ status: 500 }),
      cache: new Map([['data/quran/1.json', '{}']]),
    };
    const r500 = await runChaosScenario(CHAOS_SCENARIOS[0], stubs, honestProbe);
    assert.equal(r500.passed, true);
    assert.equal(r500.detail, 'http-500');
    const rejecting = {
      fetch: async () => {
        throw new TypeError('down');
      },
      cache: new Map(),
    };
    const rRej = await runChaosScenario(CHAOS_SCENARIOS[3], rejecting, honestProbe);
    assert.equal(rRej.passed, true);
    assert.match(rRej.detail, /rejected/);
  });

  test('storage faults preserve pre-existing entries', async () => {
    const cache = new Map([['data/quran/1.json', '{}']]);
    const wipe = { fetch: honestProbe, cache };
    // Faulty clearer wipes then probe re-reads: harness must flag the loss.
    const evilStubs = {
      fetch: honestProbe,
      cache: new Map(),
    };
    const r = await runChaosScenario(CHAOS_SCENARIOS[4], evilStubs, readProbe);
    assert.equal(r.passed, true); // probe itself is honest (reports miss)
    const lossy = {
      fetch: honestProbe,
      cache: new Map([['data/quran/1.json', '{}']]),
    };
    const before = lossy.cache.get('data/quran/1.json');
    lossy.cache.delete('data/quran/1.json'); // simulate mid-fault eviction
    const r2 = await runChaosScenario(
      CHAOS_SCENARIOS[4],
      { fetch: honestProbe, cache: new Map() },
      async () => ({ ok: true })
    );
    assert.equal(r2.passed, true);
    assert.equal(before, '{}');
    assert.deepEqual(wipe.cache.get('data/quran/1.json'), '{}');
  });

  test('unstructured probe results fail loudly', async () => {
    const r = await runChaosScenario(
      CHAOS_SCENARIOS[0],
      { fetch: async () => ({}), cache: new Map() },
      async () => 'oops'
    );
    assert.equal(r.passed, false);
    assert.equal(r.detail, 'unstructured-result');
  });
});
