import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncResource } from '../js/app/asyncResource.js';
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

test('registers before synchronous start/load reentry and shares exact pending promise', async () => {
  let inner,
    calls = 0;
  const resource = createAsyncResource({
    start: () => {
      inner = resource.run(() => {
        throw Error('duplicate');
      });
    },
  });
  const d = deferred();
  const outer = resource.run(() => {
    calls++;
    assert.equal(resource.pending, inner);
    return d.promise;
  });
  assert.equal(inner, outer);
  assert.equal(
    resource.run(() => {
      calls++;
    }),
    outer
  );
  d.resolve('ok');
  assert.equal(await outer, 'ok');
  assert.equal(calls, 1);
  assert.equal(resource.pending, null);
});
test('synchronous throws settle through failure and release ownership', async () => {
  const resource = createAsyncResource();
  assert.equal(
    await resource.run(
      () => {
        throw Error('sync');
      },
      { failure: () => false }
    ),
    false
  );
  assert.equal(resource.pending, null);
  assert.equal(await resource.run(() => 3), 3);
});
for (const order of ['old-first', 'new-first'])
  for (const stale of ['resolve', 'reject'])
    test(`invalidate/re-request ${order} stale ${stale}`, async () => {
      let generation = 0,
        finishes = 0,
        failures = 0;
      const values = [];
      const resource = createAsyncResource({
        generation: () => generation,
        finish: () => finishes++,
      });
      const a = deferred(),
        b = deferred();
      const hooks = {
        success: (v) => {
          values.push(v);
          return v;
        },
        failure: () => {
          failures++;
          return false;
        },
      };
      const first = resource.run(() => a.promise, hooks);
      generation++;
      resource.invalidate();
      const second = resource.run(() => b.promise, hooks);
      if (order === 'old-first') {
        a[stale](stale === 'resolve' ? 'old' : Error('old'));
        assert.equal(await first, false);
        assert.equal(resource.pending, second);
        b.resolve('new');
      } else {
        b.resolve('new');
        await second;
        a[stale](stale === 'resolve' ? 'old' : Error('old'));
      }
      assert.equal(await second, 'new');
      assert.equal(await first, false);
      assert.deepEqual(values, ['new']);
      assert.equal(failures, 0);
      assert.equal(finishes, 1);
      assert.equal(resource.pending, null);
    });
test('cooldown exact boundary and no pending invocation while cooling', async () => {
  const real = Date.now;
  let now = 100,
    until = 0,
    calls = 0;
  Date.now = () => now;
  try {
    const r = createAsyncResource({ cooldownUntil: () => until });
    const load = () => {
      calls++;
      throw Error('fail');
    };
    await r.run(load, {
      failure: () => {
        until = now + 30000;
        return false;
      },
    });
    now = 30099;
    assert.equal(await r.run(load), false);
    assert.equal(calls, 1);
    now = 30100;
    assert.equal(await r.run(() => ++calls), 2);
  } finally {
    Date.now = real;
  }
});
test('exit releases before abort event reentry; old finally cannot erase/abort replacement', async () => {
  let live = null;
  const r = createAsyncResource({
    abortable: true,
    start: ({ controller }) => (live = controller),
    reset: () => (live = null),
    finish: () => (live = null),
  });
  const a = deferred(),
    b = deferred();
  let replacement, oldSignal;
  const first = r.run(({ signal }) => {
    oldSignal = signal;
    signal.addEventListener('abort', () => {
      replacement = r.run(() => b.promise);
    });
    return a.promise;
  });
  r.invalidate();
  const next = live;
  assert.equal(oldSignal.aborted, true);
  assert.equal(next.signal.aborted, false);
  a.resolve(1);
  assert.equal(await first, false);
  assert.equal(live, next);
  assert.equal(r.pending, replacement);
  b.resolve(2);
  assert.equal(await replacement, 2);
  assert.equal(live, null);
});
