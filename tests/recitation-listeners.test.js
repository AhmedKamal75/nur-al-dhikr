/**
 * recitation-listeners.test.js — B3 regression: verse-failure listeners
 * coexist (toast wiring + verse session) instead of clobbering one slot,
 * and a stopped session unregisters so later single-ayah failures still
 * speak.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudio {
  constructor() {
    this._listeners = {};
    this.paused = true;
    this.preload = '';
    globalThis.__lastReciteAudio = this;
  }

  set src(v) {
    this._src = String(v);
  }

  get src() {
    return this._src;
  }

  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }

  async play() {
    throw new Error('network down');
  }
}

const flush = () => new Promise((r) => setTimeout(r, 10));

test('B3: two error owners coexist — no clobber', async () => {
  globalThis.Audio = FakeAudio;
  const rec = await import('../js/services/recitation.js');
  rec.resetRecitationForTests();
  try {
    const toastCalls = [];
    const sessionCalls = [];
    const toastHandler = (k) => toastCalls.push(k);
    const sessionHandler = (k) => sessionCalls.push(k);
    rec.onPlaybackError(toastHandler);
    rec.onPlaybackError(sessionHandler); // surahPlayback.start() used to kill toastHandler
    rec.play('https://cdn/1.mp3', '1:1');
    await flush();
    assert.deepEqual(toastCalls, ['1:1']);
    assert.deepEqual(sessionCalls, ['1:1']);
  } finally {
    rec.resetRecitationForTests();
  }
});

test('B3: removed session handler stops hearing failures', async () => {
  const rec = await import('../js/services/recitation.js');
  rec.resetRecitationForTests();
  try {
    const toastCalls = [];
    const sessionCalls = [];
    const toastHandler = (k) => toastCalls.push(k);
    const sessionHandler = (k) => sessionCalls.push(k);
    rec.onPlaybackError(toastHandler);
    rec.onPlaybackError(sessionHandler);
    rec.offPlaybackError(sessionHandler); // surahPlayback.stop()
    rec.play('https://cdn/2.mp3', '1:2');
    await flush();
    assert.deepEqual(toastCalls, ['1:2']);
    assert.deepEqual(sessionCalls, []);
  } finally {
    rec.resetRecitationForTests();
  }
});

test('B3: ended listeners coexist too', async () => {
  const rec = await import('../js/services/recitation.js');
  rec.resetRecitationForTests();
  try {
    const a = [];
    const b = [];
    const hA = (k) => a.push(k);
    const hB = (k) => b.push(k);
    rec.onPlaybackEnded(hA);
    rec.onPlaybackEnded(hB);
    rec.offPlaybackEnded(hB); // one owner leaves; the other keeps hearing
    rec.play('https://cdn/3.mp3', '2:255');
    // Fire before the rejected play() settles, so the finished key is live.
    for (const fn of globalThis.__lastReciteAudio._listeners.ended || []) fn();
    await flush();
    assert.deepEqual(a, ['2:255']);
    assert.deepEqual(b, []);
  } finally {
    rec.resetRecitationForTests();
    delete globalThis.__lastReciteAudio;
  }
});
