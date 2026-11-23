import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusWakeLock } from '../js/app/focusWakeLock.js';
import { initialState, pickPersisted } from '../js/core/state/initial.js';

function fixture(supported = true) {
  let visible = true;
  const pending = [],
    statuses = [];
  const owner = createFocusWakeLock({
    request: supported
      ? () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
      : null,
    visible: () => visible,
    publish: (value) => statuses.push(value),
  });
  const grant = () => {
    const listeners = [];
    return {
      released: false,
      releases: 0,
      addEventListener: (event, fn) => listeners.push(fn),
      release() {
        this.releases++;
        this.released = true;
        listeners.forEach((fn) => fn());
      },
    };
  };
  return {
    owner,
    pending,
    statuses,
    grant,
    hide: () => {
      visible = false;
      owner.visibilityChanged();
    },
    show: () => {
      visible = true;
      owner.visibilityChanged();
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('off by default, grant only then active, exit releases only its sentinel', async () => {
  const f = fixture();
  f.owner.sync('category:morning');
  assert.equal(f.pending.length, 0);
  f.owner.toggle();
  assert.equal(f.owner.snapshot().status, 'requesting');
  const lock = f.grant();
  f.pending[0].resolve(lock);
  await flush();
  assert.equal(f.owner.snapshot().status, 'active');
  f.owner.sync(null);
  assert.equal(lock.releases, 1);
  assert.deepEqual(f.owner.snapshot(), { enabled: false, status: 'off' });
});
test('same collection stays enabled across category transitions, different session resets', async () => {
  const f = fixture();
  f.owner.sync('collection:a');
  f.owner.toggle();
  const lock = f.grant();
  f.pending[0].resolve(lock);
  await flush();
  f.owner.sync('collection:a');
  assert.equal(lock.releases, 0);
  assert.equal(f.pending.length, 1);
  f.owner.sync('category:evening');
  assert.equal(lock.releases, 1);
  assert.equal(f.owner.snapshot().enabled, false);
});
test('hidden tab releases, returning re-requests only while opted in', async () => {
  const f = fixture();
  f.owner.sync('a');
  f.owner.toggle();
  const lock = f.grant();
  f.pending[0].resolve(lock);
  await flush();
  f.hide();
  assert.equal(lock.releases, 1);
  assert.equal(f.owner.snapshot().status, 'waiting');
  f.show();
  assert.equal(f.pending.length, 2);
  f.owner.toggle();
  const late = f.grant();
  f.pending[1].resolve(late);
  await flush();
  assert.equal(late.releases, 1);
  f.show();
  assert.equal(f.pending.length, 2);
});
test('late grant after exit or new session is immediately released', async () => {
  const f = fixture();
  f.owner.sync('a');
  f.owner.toggle();
  f.owner.sync(null);
  f.owner.sync('b');
  f.owner.toggle();
  const stale = f.grant();
  f.pending[0].resolve(stale);
  await flush();
  assert.equal(stale.releases, 1);
  assert.equal(f.owner.snapshot().status, 'requesting');
  const live = f.grant();
  f.pending[1].resolve(live);
  await flush();
  assert.equal(f.owner.snapshot().status, 'active');
});
test('denial and unsupported never claim active; stale denial cannot overwrite grant', async () => {
  const f = fixture();
  f.owner.sync('a');
  f.owner.toggle();
  f.pending[0].reject(new Error('denied'));
  await flush();
  assert.equal(f.owner.snapshot().status, 'denied');
  const u = fixture(false);
  u.owner.sync('a');
  u.owner.toggle();
  assert.equal(u.owner.snapshot().status, 'unsupported');
  f.owner.toggle();
  f.owner.toggle();
  f.owner.stop();
  f.pending[1].reject(new Error('late'));
  await flush();
  assert.equal(f.owner.snapshot().status, 'off');
});
test('platform release updates status without retry loop or losing opt-in', async () => {
  const f = fixture();
  f.owner.sync('a');
  f.owner.toggle();
  const lock = f.grant();
  f.pending[0].resolve(lock);
  await flush();
  lock.release();
  assert.deepEqual(f.owner.snapshot(), { enabled: true, status: 'released' });
  assert.equal(f.pending.length, 1);
  f.hide();
  f.show();
  assert.equal(f.pending.length, 2);
});
test('request duplicates are suppressed and state is never persisted', async () => {
  const f = fixture();
  f.owner.sync('a');
  f.owner.toggle();
  f.show();
  f.show();
  assert.equal(f.pending.length, 1);
  const state = initialState();
  assert.deepEqual(state.focusWake, { enabled: false, status: 'off' });
  assert.ok(
    !('focusWake' in pickPersisted({ ...state, focusWake: { enabled: true, status: 'active' } }))
  );
});
