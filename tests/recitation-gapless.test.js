/**
 * tests/recitation-gapless.test.js — (v5.10.3) ping-pong handoff + URL walk:
 * preload() buffers the next file on the spare, play() swaps onto it when
 * ready, mirror deaths walk silently, and only the final failure speaks.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

class FakeAudio {
  constructor() {
    this._listeners = {};
    this.paused = true;
    this.preload = '';
    this.readyState = 0;
    this.volume = 1;
    this.playbackRate = 1;
    this.currentSrc = '';
    globalThis.__reciteAudios.push(this);
  }

  set src(v) {
    this._src = String(v);
    this.currentSrc = String(v);
    this.readyState = 4; // buffered (post-load)
  }

  get src() {
    return this._src;
  }

  removeAttribute() {
    this._src = '';
    this.currentSrc = '';
  }

  load() {
    this.readyState = 4;
  }

  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }

  async play() {
    this.playCalls = (this.playCalls || 0) + 1;
    this.paused = false;
    if (String(this._src).includes('/dead')) throw new Error('nope');
  }

  pause() {
    this.paused = true;
  }

  fire(type) {
    for (const fn of this._listeners[type] || []) fn();
  }
}

const flush = () => new Promise((r) => setTimeout(r, 10));

// Fresh module per test (query-string cache bust): element identity
// assertions need pristine front/back state, which resetRecitationForTests
// deliberately does not clear (production elements persist too).
let freshN = 0;
async function freshRec() {
  globalThis.__reciteAudios = [];
  globalThis.Audio = FakeAudio;
  const rec = await import(`../js/services/recitation.js?gapless=${++freshN}`);
  return rec;
}

async function done() {
  delete globalThis.__reciteAudios;
}

describe('preload + swap', () => {
  test('play() swaps onto the preloaded spare', async () => {
    const rec = await freshRec();
    try {
      rec.preload('https://cdn/2.mp3');
      assert.equal(globalThis.__reciteAudios.length, 1, 'spare created by preload only');
      const spare = globalThis.__reciteAudios[0];
      assert.equal(spare.src, 'https://cdn/2.mp3');
      rec.play('https://cdn/1.mp3', '1:1'); // cold: spare holds another URL
      await flush();
      assert.equal(globalThis.__reciteAudios.length, 2, 'front created on play');
      assert.ok(rec.isPlaying('1:1'));
      rec.play('https://cdn/2.mp3', '1:2'); // swap-hit
      await flush();
      assert.ok(rec.isPlaying('1:2'));
      // The swap played the SPARE element (still first in creation order
      // only if... assert via src identity instead).
      const frontSrc = globalThis.__reciteAudios.find((a) => a.src === 'https://cdn/2.mp3');
      assert.ok(frontSrc, 'spare element now carries the current file');
      assert.equal(frontSrc.paused, false, 'spare actually started');
    } finally {
      await done();
    }
  });

  test('unready spare is not used; volume/rate carry over on swap', async () => {
    const rec = await freshRec();
    try {
      rec.preload('https://cdn/9.mp3');
      const spare = globalThis.__reciteAudios[0];
      spare.readyState = 0; // still buffering
      rec.play('https://cdn/9.mp3', '9:9');
      await flush();
      assert.ok(rec.isPlaying('9:9'));
      assert.equal(globalThis.__reciteAudios.length, 2, 'cold front, no swap');
      rec.setVolume(0.4);
      rec.setPlaybackRate(1.5);
      spare.readyState = 4;
      rec.play('https://cdn/9.mp3', '9:9'); // same URL, spare now ready
      await flush();
      const front = globalThis.__reciteAudios.find(
        (a) => a.src === 'https://cdn/9.mp3' && !a.paused
      );
      assert.equal(front.volume, 0.4, 'volume carried');
      assert.equal(front.playbackRate, 1.5, 'rate carried');
    } finally {
      await done();
    }
  });

  test('spare failure is silent; blobs never preload', async () => {
    const rec = await freshRec();
    try {
      const errs = [];
      rec.onPlaybackError((k) => errs.push(k));
      rec.preload('blob:https://x/y');
      assert.equal(globalThis.__reciteAudios.length, 0, 'no element for blobs');
      rec.preload('https://cdn/dead.mp3');
      const spare = globalThis.__reciteAudios[0];
      spare.fire('error'); // spare death: silent
      await flush();
      assert.deepEqual(errs, [], 'no toast for spare failures');
      rec.play('https://cdn/dead.mp3', '1:1'); // unpromotable → cold → fails
      await flush();
      assert.deepEqual(errs, ['1:1'], 'final failure still speaks');
      assert.ok(!rec.isPlaying('1:1'));
    } finally {
      await done();
    }
  });
});

describe('prime-to-parked (v5.10.7)', () => {
  test('buffered spare is played muted then parked at 0', async () => {
    const rec = await freshRec();
    try {
      rec.preload('https://cdn/prime.mp3');
      const spare = globalThis.__reciteAudios[0];
      spare.fire('canplaythrough');
      await flush();
      assert.equal(spare.playCalls, 1, 'prime play attempted');
      assert.equal(spare.volume, 0, 'priming runs muted');
      spare.fire('playing');
      assert.equal(spare.paused, true, 'parked after pipeline runs');
      assert.equal(spare.currentTime, 0, 'rewound to the start');
    } finally {
      await done();
    }
  });

  test('promoting a parked spare restores volume and resumes hot', async () => {
    const rec = await freshRec();
    try {
      rec.play('https://cdn/first.mp3', '1:1'); // front exists to carry from
      await flush();
      rec.setVolume(0.6);
      rec.preload('https://cdn/parked.mp3');
      const spare = globalThis.__reciteAudios.find((a) => a.src === 'https://cdn/parked.mp3');
      spare.fire('canplaythrough');
      await flush();
      spare.fire('playing'); // parked muted at 0
      rec.play('https://cdn/parked.mp3', '9:9');
      await flush();
      assert.ok(rec.isPlaying('9:9'));
      assert.equal(spare.volume, 0.6, 'carried volume replaces prime mute');
      assert.equal(spare.paused, false, 'resumed from parked state');
    } finally {
      await done();
    }
  });

  test('rejected prime (autoplay policy) falls back to buffered swap', async () => {
    const rec = await freshRec();
    try {
      const errs = [];
      rec.onPlaybackError((k) => errs.push(k));
      // Prime attempt on a dead file: play() rejects AND buffers nothing.
      rec.preload('https://cdn/dead.mp3');
      const spare = globalThis.__reciteAudios[0];
      spare.fire('canplaythrough');
      await flush();
      assert.equal(spare.volume, 1, 'volume restored after refusal');
      rec.play('https://cdn/dead.mp3', '1:1');
      await flush();
      assert.deepEqual(errs, ['1:1'], 'unpromotable file still fails honestly');
    } finally {
      await done();
    }
  });
});

describe('URL walk', () => {
  test('dead primary walks to the mirror with no intermediate toast', async () => {
    const rec = await freshRec();
    try {
      const errs = [];
      rec.onPlaybackError((k) => errs.push(k));
      rec.play(['https://cdn/dead.mp3', 'https://cdn/live.mp3'], '2:2');
      await flush();
      assert.deepEqual(errs, [], 'mirror rescue is silent');
      assert.ok(rec.isPlaying('2:2'));
      const front = globalThis.__reciteAudios.find((a) => !a.paused);
      assert.equal(front.src, 'https://cdn/live.mp3');
    } finally {
      await done();
    }
  });

  test('all mirrors dead → one error, key cleared', async () => {
    const rec = await freshRec();
    try {
      const errs = [];
      rec.onPlaybackError((k) => errs.push(k));
      rec.play(['https://cdn/dead.mp3', 'https://cdn/dead2.mp3'], '3:3');
      await flush();
      assert.deepEqual(errs, ['3:3'], 'exactly one failure report');
      assert.ok(!rec.isPlaying('3:3'));
    } finally {
      await done();
    }
  });

  test('stop() cancels an in-flight walk', async () => {
    const rec = await freshRec();
    try {
      const errs = [];
      rec.onPlaybackError((k) => errs.push(k));
      rec.play(['https://cdn/dead.mp3', 'https://cdn/live.mp3'], '4:4');
      rec.stop();
      await flush();
      assert.deepEqual(errs, [], 'stopped walk stays silent');
      assert.ok(!rec.isPlaying('4:4'));
    } finally {
      await done();
    }
  });
});
