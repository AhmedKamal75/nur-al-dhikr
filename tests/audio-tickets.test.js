import test from 'node:test';
import assert from 'node:assert/strict';
import { createTickets } from '../js/domain/tickets.js';
import * as verse from '../js/services/surahPlayback.js';
import * as recitation from '../js/services/recitation.js';
import * as player from '../js/services/player.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const SURAHS = [{ number: 1, ayahCount: 7 }];
function setupVerse() {
  const requests = [];
  const played = [],
    rates = [],
    seen = [];
  let resumed = 0;
  verse.stop();
  recitation.configureDriver({
    play: (url, key) => played.push({ url, key }),
    stop() {},
    pause() {},
    resume() {
      resumed++;
    },
    setRate: (rate) => rates.push(rate),
    onEnded() {},
    onError() {},
  });
  verse.setVerseAudioFetcherForTests(() => {
    const gate = deferred();
    requests.push(gate);
    return gate.promise;
  });
  verse.onAyahChange((s, a) => seen.push([s, a]));
  const start = (from = 1) =>
    verse.start({ surah: 1, from, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
  const cleanup = () => {
    verse.stop();
    verse.setVerseAudioFetcherForTests(null);
    verse.onAyahChange(null);
    recitation.resetRecitationForTests();
  };
  return { requests, played, rates, seen, start, cleanup, resumed: () => resumed };
}

test('tickets are independent and never reuse invalidated ownership', () => {
  const a = createTickets(),
    b = createTickets();
  const old = a.mint(),
    other = b.mint();
  for (let i = 0; i < 10; i++) a.mint();
  assert.equal(a.isCurrent(old), false);
  assert.equal(b.isCurrent(other), true);
});

for (const action of ['pause', 'expiry', 'displacement', 'stop']) {
  test(`verse pending lookup cannot resurrect after ${action}`, async () => {
    const h = setupVerse();
    const created = [],
      revoked = [];
    const create = URL.createObjectURL,
      revoke = URL.revokeObjectURL;
    URL.createObjectURL = () => {
      const url = `blob:ticket-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => revoked.push(url);
    try {
      h.start();
      if (action === 'expiry') {
        verse.armSleepTimer(5);
        verse._expireSleepForTests();
      } else if (action === 'stop') verse.stop();
      else {
        verse.pause();
        if (action === 'displacement') {
          const { clearDisplacedSleep } = await import('../js/services/sleepTimerController.js');
          clearDisplacedSleep(new Set(['speech']));
        }
      }
      const notifications = h.seen.length;
      h.requests[0].resolve(new Blob(['old']));
      await tick();
      assert.deepEqual(h.played, []);
      assert.deepEqual(h.rates, []);
      assert.equal(h.seen.length, notifications);
      assert.deepEqual(revoked, created);
      assert.equal(verse.sleepSnapshot().enabled, false);
      if (action !== 'stop') {
        assert.equal(verse.snapshot().paused, true);
        assert.equal(verse.snapshot().ayah, 1);
      }
    } finally {
      h.cleanup();
      URL.createObjectURL = create;
      URL.revokeObjectURL = revoke;
    }
  });
}
for (const oldFirst of [true, false]) {
  for (const rejection of [true, false]) {
    test(`verse pause/resume owns fresh lookup, old first=${oldFirst}, reject=${rejection}`, async () => {
      const h = setupVerse();
      try {
        h.start();
        verse.pause();
        const notifications = h.seen.length;
        verse.resume();
        assert.equal(h.resumed(), 0, 'old element cannot stand in for unresolved ayah');
        assert.equal(h.requests.length, 2);
        assert.equal(h.seen.length, notifications, 'notify only after owned dispatch');
        const settleOld = () =>
          rejection ? h.requests[0].reject(new Error('old')) : h.requests[0].resolve(null);
        if (oldFirst) {
          settleOld();
          await tick();
          assert.equal(h.played.length, 0);
        }
        h.requests[1].resolve(null);
        await tick();
        if (!oldFirst) {
          settleOld();
          await tick();
        }
        assert.equal(h.played.length, 1);
        assert.equal(h.played[0].key, '1:1');
        assert.equal(h.rates.length, 1);
        assert.equal(h.seen.length, notifications + 1);
        assert.equal(verse.snapshot().paused, false);
      } finally {
        h.cleanup();
      }
    });
  }
}
for (const oldFirst of [true, false]) {
  test(`verse A stop B source ownership, old first=${oldFirst}`, async () => {
    const h = setupVerse();
    try {
      h.start();
      verse.stop();
      h.start(2);
      if (oldFirst) {
        h.requests[0].resolve(null);
        await tick();
      }
      h.requests[1].resolve(null);
      await tick();
      if (!oldFirst) {
        h.requests[0].resolve(null);
        await tick();
      }
      assert.deepEqual(
        h.played.map((x) => x.key),
        ['1:2']
      );
    } finally {
      h.cleanup();
    }
  });
}

class FakeAudio {
  constructor() {
    this.src = '';
    this.paused = true;
    this.playbackRate = 1;
    this.volume = 1;
    this.buffered = { length: 0 };
    FakeAudio.last = this;
  }
  get currentSrc() {
    return this.src;
  }
  addEventListener() {}
  pause() {
    this.paused = true;
  }
  play() {
    this.paused = false;
    return this.gate?.promise || Promise.resolve();
  }
  removeAttribute() {
    this.src = '';
  }
  load() {
    this.paused = true;
  }
}
for (const action of ['pause', 'play', 'stop-play', 'toggle']) {
  for (const reject of [true, false]) {
    test(`file stale resume ${reject ? 'rejection' : 'resolve'} after ${action}`, async () => {
      const oldAudio = globalThis.Audio;
      globalThis.Audio = FakeAudio;
      try {
        player.resetPlayerForTests();
        player.setAudioFetcher(async () => null);
        await player.play('m', 1, 'https://cdn/1.mp3');
        player.pause();
        const a = FakeAudio.last,
          old = deferred();
        a.gate = old;
        const pending = player.toggle();
        if (action === 'pause') player.pause();
        else if (action === 'toggle') {
          player.pause();
          a.gate = null;
          await player.toggle();
        } else {
          if (action === 'stop-play') player.stop();
          a.gate = null;
          await player.play('m', 2, 'https://cdn/2.mp3');
        }
        const before = player.currentSrc();
        const patches = [],
          states = [];
        player.onPlayerPatch((info) => patches.push(info));
        player.onPlayingStateChange((playing) => states.push(playing));
        player.armSleepTimer(5);
        const timerBefore = player.sleepSnapshot();
        if (reject) old.reject(new Error('old resume'));
        else old.resolve();
        assert.equal(await pending, false);
        assert.equal(player.currentSrc(), before);
        assert.deepEqual(patches, [], 'stale resume cannot patch winner UI');
        assert.deepEqual(states, [], 'stale resume cannot notify winner state');
        assert.deepEqual(player.sleepSnapshot(), timerBefore, 'stale resume cannot change sleep');
        assert.equal(a.paused, action === 'pause');
        if (action !== 'pause') {
          // Pending new lookup exposes intent even while element remains paused.
          const fresh = deferred();
          player.setAudioFetcher(() => fresh.promise);
          const p = player.play('m', 3, 'https://cdn/3.mp3');
          fresh.resolve(null);
          await p;
          assert.equal(a.paused, false);
        }
      } finally {
        player.stop();
        player.resetPlayerForTests();
        globalThis.Audio = oldAudio;
      }
    });
  }
}

test('file reset cannot let previous element resume rejection erase fresh intent', async () => {
  const oldAudio = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    player.resetPlayerForTests();
    player.setAudioFetcher(async () => null);
    await player.play('m', 1, 'https://cdn/1.mp3');
    player.pause();
    const old = deferred();
    FakeAudio.last.gate = old;
    const pending = player.toggle();
    player.resetPlayerForTests();
    player.setAudioFetcher(async () => null);
    await player.play('m', 2, 'https://cdn/2.mp3');
    old.reject(new Error('retired element'));
    assert.equal(await pending, false);
    assert.equal(player.currentSrc(), 'https://cdn/2.mp3');
    assert.equal(FakeAudio.last.paused, false);
  } finally {
    player.resetPlayerForTests();
    globalThis.Audio = oldAudio;
  }
});

for (const reset of [false, true]) {
  for (const oldFirst of [true, false]) {
    test(`recitation old rejection cannot walk winner mirrors, reset=${reset}, oldFirst=${oldFirst}`, async () => {
      const oldAudio = globalThis.Audio;
      globalThis.Audio = FakeAudio;
      try {
        recitation.resetRecitationForTests();
        // Create the front element, then attach a deferred play response.
        recitation.play('https://cdn/seed.mp3', '1:1');
        const front = FakeAudio.last,
          old = deferred();
        front.gate = old;
        recitation.play(['https://cdn/old.mp3', 'https://cdn/old-mirror.mp3'], '1:1');
        if (reset) recitation.resetRecitationForTests();
        const errors = [];
        recitation.onPlaybackError((key) => errors.push(key));
        const winner = deferred();
        front.gate = winner;
        recitation.play(['https://cdn/winner.mp3', 'https://cdn/winner-mirror.mp3'], '1:2');
        if (oldFirst) {
          old.reject(new Error('old'));
          await tick();
        }
        winner.resolve();
        await tick();
        if (!oldFirst) {
          old.reject(new Error('old'));
          await tick();
        }
        assert.equal(front.src, 'https://cdn/winner.mp3');
        assert.deepEqual(errors, []);
        assert.equal(recitation.isPlaying('1:2'), true);
      } finally {
        recitation.resetRecitationForTests();
        globalThis.Audio = oldAudio;
      }
    });
  }
}
