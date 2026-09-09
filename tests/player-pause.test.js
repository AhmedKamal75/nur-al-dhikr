/**
 * player-pause.test.js — F-001/U-01: pause() must win over an in-flight
 * play(). Two windows: pause during the offline-blob lookup must not be
 * overridden when it resolves; pause during a pending a.play() must not
 * surface as a playback failure. Plus a guard: pause/resume never breaks
 * the ended chain (repeat/autoplay survive).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudio {
  constructor() {
    this._src = '';
    this.paused = true;
    this.ended = false;
    this.playbackRate = 1;
    this.currentTime = 0;
    this.duration = 0;
    this.readyState = 4;
    this.buffered = { length: 0 };
    this.__nurWired = false;
    this.__nurSeq = 0;
    this._listeners = {};
    this.playCalls = 0;
    this._pendingPlays = [];
  }

  get src() {
    return this._src;
  }

  set src(v) {
    this._src = String(v);
  }

  get currentSrc() {
    return this._src;
  }

  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }

  fire(type) {
    for (const fn of this._listeners[type] || []) fn();
  }

  pause() {
    this.paused = true;
    // Browser behavior: pausing while play() is pending aborts it.
    const pending = this._pendingPlays.splice(0);
    for (const { reject } of pending) {
      const err = new Error('The play() request was interrupted by a call to pause().');
      err.name = 'AbortError';
      reject(err);
    }
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    return new Promise((resolve, reject) => {
      this._pendingPlays.push({ resolve, reject });
    });
  }

  removeAttribute(name) {
    if (name === 'src') this._src = '';
  }

  load() {
    this.paused = true;
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function loadPlayer() {
  globalThis.Audio = FakeAudio;
  const player = await import('../js/services/player.js');
  return { player };
}

const flush = () => new Promise((r) => setTimeout(r, 10));

// A hung play() (the old bug: pause overridden, element left playing) must
// fail the test instead of hanging the file.
async function settled(promise, label) {
  const r = await Promise.race([
    promise,
    new Promise((res) => setTimeout(() => res('HUNG'), 2000)),
  ]);
  assert.notEqual(r, 'HUNG', `${label}: play() never settled`);
  return r;
}

test('F-001a: pause during a resolving track is honored (no src, no play)', async () => {
  const { player } = await loadPlayer();
  try {
    player.resetPlayerForTests();
    const gate = deferred();
    player.setAudioFetcher(() => gate.promise);
    const p = player.play('m', 1, 'https://cdn/001.mp3');
    await flush();
    player.pause();
    gate.resolve(null);
    const r = await settled(p, 'pause-during-resolve');
    assert.deepEqual(r, { offline: false, error: false });
    assert.equal(player.currentSrc(), '', 'no src may be attached after a user pause');
  } finally {
    player.resetPlayerForTests();
  }
});

test('F-001b: pause while play() is pending is silent, not an error', async () => {
  const { player } = await loadPlayer();
  try {
    player.resetPlayerForTests();
    player.setAudioFetcher(async () => null);
    const p = player.play('m', 1, 'https://cdn/001.mp3');
    await flush();
    await flush();
    player.pause();
    const r = await settled(p, 'pause-during-pending-play');
    assert.deepEqual(r, { offline: false, error: false });
  } finally {
    player.resetPlayerForTests();
  }
});

test('guard: resume after pause still fires ended (repeat/autoplay survive)', async () => {
  const created = [];
  class TrackedAudio extends FakeAudio {
    constructor() {
      super();
      created.push(this);
    }
  }
  globalThis.Audio = TrackedAudio;
  const { player } = await loadPlayer();
  globalThis.Audio = TrackedAudio; // loadPlayer installs its own FakeAudio; re-assert ours
  try {
    player.resetPlayerForTests();
    player.setAudioFetcher(async () => null);
    let ended = 0;
    player.onTrackEnded(() => {
      ended += 1;
    });
    const p = player.play('m', 1, 'https://cdn/001.mp3');
    await flush();
    await flush();
    const el = created[created.length - 1];
    el._pendingPlays.splice(0).forEach(({ resolve }) => resolve());
    assert.deepEqual(await settled(p, 'initial play'), { offline: false, error: false });
    player.pause();
    player.toggle();
    await flush();
    el._pendingPlays.splice(0).forEach(({ resolve }) => resolve());
    await flush();
    el.fire('ended');
    assert.equal(ended, 1, 'ended must survive a pause/resume cycle');
  } finally {
    player.resetPlayerForTests();
  }
});
