import test from 'node:test';
import assert from 'node:assert/strict';
import { store, actions } from '../js/core/state.js';
import { rt } from '../js/app/rt.js';
import * as lazy from '../js/app/lazyData.js';
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const json = (value) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const configs = [
  ['QuranMeta', 'quran-meta', 'quran', 'meta', null, null, {}],
  ['MushafMeta', 'mushaf-meta', 'mushaf', 'meta', null, null, {}],
  ['WordDict', 'word-dict', 'wordDict', 'index', null, null, { entries: {} }],
  ['RootsMeaning', 'roots-meaning', 'rootsMeaning', 'index', null, null, { entries: {} }],
  [
    'QuranRoots',
    'quran-roots',
    'quranRoots',
    null,
    'quranRootsCooldownUntil',
    'quranRootsFetchStarted',
    {},
  ],
  [
    'QuranRootsFull',
    'quran-roots-full',
    'quranRootsFull',
    null,
    'quranRootsFullCooldownUntil',
    'quranRootsFullFetchStarted',
    {},
  ],
  [
    'TafsirEditions',
    'tafsir-editions',
    'tafsirEditions',
    null,
    'tafsirEditionsCooldownUntil',
    'tafsirEditionsFetchStarted',
    {},
  ],
  [
    'TajweedPool',
    'tajweed-pool',
    'tajweedPool',
    null,
    'tajweedPoolCooldownUntil',
    'tajweedPoolFetchStarted',
    {},
  ],
];
const reset = () => {
  store.dispatch(actions.resetAll());
  lazy.invalidateLazyFetches();
  for (const [, , , , c] of configs) if (c) rt[c] = 0;
};
for (const [name, tier, slice, prop, cooldown, latch, doc] of configs) {
  test(`${name}: dedupe, valid empty ready, failure return/cooldown parity`, async () => {
    const fetch = globalThis.fetch,
      now = Date.now,
      warn = console.warn,
      error = console.error;
    let time = 100000,
      calls = 0;
    Date.now = () => time;
    console.warn = () => {};
    console.error = () => {};
    try {
      reset();
      const d = deferred();
      globalThis.fetch = async () => {
        calls++;
        await d.promise;
        return json(doc);
      };
      const run = () => lazy[`ensure${name}`](store.getState());
      const a = run(),
        b = run();
      d.resolve();
      assert.equal(await a, true);
      assert.equal(await b, true);
      assert.equal(calls, 1);
      assert.equal(await run(), true);
      assert.equal(calls, 1, 'empty cached document ready');
      reset();
      globalThis.fetch = async () => {
        calls++;
        return new Response('', { status: 404 });
      };
      const before = calls;
      // fetchJSON probes .gz then plain JSON on a missing file.
      const failureCalls = 2;
      if (name === 'MushafMeta') await assert.rejects(run());
      else assert.equal(await run(), false);
      assert.equal(store.getState().loadErrors[tier], true);
      if (cooldown) {
        assert.equal(rt[cooldown], time + 30000);
        assert.equal(rt[latch], false);
        assert.equal(await run(), false);
        assert.equal(calls, before + failureCalls);
        time += 30000;
        globalThis.fetch = async () => {
          calls++;
          return json(doc);
        };
        assert.equal(await run(), true);
        assert.equal(calls, before + failureCalls + 1);
      } else {
        globalThis.fetch = async () => {
          calls++;
          return json(doc);
        };
        assert.equal(await run(), true);
        assert.equal(calls, before + failureCalls + 1);
      }
      assert.equal(store.getState().loadErrors[tier], undefined);
      const ready = prop ? store.getState()[slice][prop] : store.getState()[slice];
      assert.ok(ready);
    } finally {
      reset();
      globalThis.fetch = fetch;
      Date.now = now;
      console.warn = warn;
      console.error = error;
    }
  });
  for (const order of ['old-first', 'new-first'])
    test(`${name}: stale generation ${order}`, async () => {
      const fetch = globalThis.fetch;
      try {
        reset();
        const gates = [deferred(), deferred()];
        let calls = 0;
        globalThis.fetch = async () => {
          const d = gates[calls++];
          await d.promise;
          return json(doc);
        };
        const run = () => lazy[`ensure${name}`](store.getState());
        const old = run();
        lazy.invalidateLazyFetches();
        const fresh = run();
        if (order === 'old-first') {
          gates[0].resolve();
          assert.equal(await old, false);
          assert.equal(run() instanceof Promise, true);
          assert.equal(calls, 2);
          gates[1].resolve();
        } else {
          gates[1].resolve();
          assert.equal(await fresh, true);
          gates[0].resolve();
        }
        assert.equal(await fresh, true);
        assert.equal(await old, false);
        assert.equal(calls, 2);
      } finally {
        reset();
        globalThis.fetch = fetch;
      }
    });
}
for (const name of ['WordDict', 'RootsMeaning'])
  test(`${name}: malformed entries flags and clears slice`, async () => {
    const fetch = globalThis.fetch,
      error = console.error;
    try {
      reset();
      console.error = () => {};
      globalThis.fetch = async () => json({ entries: [] });
      assert.equal(await lazy[`ensure${name}`](), false);
      assert.equal(store.getState()[name === 'WordDict' ? 'wordDict' : 'rootsMeaning'].index, null);
    } finally {
      reset();
      globalThis.fetch = fetch;
      console.error = error;
    }
  });

for (const [name, tier, , , cooldown] of configs)
  test(`${name}: stale rejection never flags or cools newer owner`, async () => {
    const fetch = globalThis.fetch,
      error = console.error,
      warn = console.warn;
    try {
      reset();
      console.error = () => {};
      console.warn = () => {};
      let rejectOld;
      const oldGate = new Promise((_, reject) => (rejectOld = reject));
      const freshGate = deferred();
      let calls = 0;
      globalThis.fetch = async () => {
        if (++calls === 1) {
          await oldGate;
        } else {
          await freshGate.promise;
          return json(configs.find((x) => x[0] === name)[6]);
        }
      };
      const run = () => lazy[`ensure${name}`](store.getState());
      const old = run();
      lazy.invalidateLazyFetches();
      const fresh = run();
      rejectOld(Error('stale failure'));
      assert.equal(await old, false);
      assert.equal(store.getState().loadErrors[tier], undefined);
      if (cooldown) assert.equal(rt[cooldown], 0);
      freshGate.resolve();
      assert.equal(await fresh, true);
    } finally {
      reset();
      globalThis.fetch = fetch;
      console.error = error;
      console.warn = warn;
    }
  });
test('marker-only clear does not invalidate singleton ownership; invalidate retains cooldown values', async () => {
  const fetch = globalThis.fetch;
  try {
    reset();
    const gate = deferred();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      await gate.promise;
      return json({});
    };
    const a = lazy.ensureQuranMeta();
    lazy.clearLazyInFlightFetches();
    const b = lazy.ensureQuranMeta();
    assert.equal(a, b);
    assert.equal(calls, 1);
    gate.resolve();
    assert.equal(await a, true);
    rt.quranRootsCooldownUntil = 123456;
    lazy.invalidateLazyFetches();
    assert.equal(rt.quranRootsCooldownUntil, 123456);
  } finally {
    reset();
    globalThis.fetch = fetch;
  }
});
