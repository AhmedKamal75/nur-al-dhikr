/**
 * player-race.test.js — B1 regression: concurrent play() calls must be safe.
 * Loser unwinds silently (no ghost error), winner owns the element src,
 * and blob URLs are never leaked.
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

  pause() {
    this.paused = true;
  }

  async play() {
    this.paused = false;
    return undefined;
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
  // Stub blob-URL accounting (Node's URL.createObjectURL needs real Blobs).
  const created = [];
  const revoked = [];
  const OrigURL = globalThis.URL;
  globalThis.URL.createObjectURL = (b) => {
    const id = `blob:${created.length}`;
    created.push({ id, blob: b });
    return id;
  };
  globalThis.URL.revokeObjectURL = (id) => {
    revoked.push(id);
  };
  const player = await import('../js/services/player.js');
  return {
    player,
    created,
    revoked,
    restore() {
      globalThis.URL.createObjectURL = OrigURL.createObjectURL.bind(OrigURL);
      globalThis.URL.revokeObjectURL = OrigURL.revokeObjectURL.bind(OrigURL);
    },
  };
}

test('B1: superseded play() resolves silent, winner owns src', async () => {
  const { player, restore } = await loadPlayer();
  try {
    player.resetPlayerForTests();
    const gateA = deferred();
    player.setAudioFetcher((moshaf, surah) =>
      surah === 1 ? gateA.promise : Promise.resolve(null)
    );
    const pA = player.play('m', 1, 'https://cdn/001.mp3');
    const pB = player.play('m', 2, 'https://cdn/002.mp3');
    gateA.resolve(null);
    const [rA, rB] = await Promise.all([pA, pB]);
    // Loser must NOT report a ghost failure.
    assert.deepEqual(rA, { offline: false, error: false });
    assert.deepEqual(rB, { offline: false, error: false });
    assert.equal(player.currentSrc(), 'https://cdn/002.mp3');
  } finally {
    player.resetPlayerForTests();
    restore();
  }
});

test('B1: late-resolving loser never creates a blob URL (no leak)', async () => {
  const { player, created, revoked, restore } = await loadPlayer();
  try {
    player.resetPlayerForTests();
    const gateA = deferred();
    const blobA = { tag: 'A' };
    const blobB = { tag: 'B' };
    player.setAudioFetcher((moshaf, surah) =>
      surah === 1 ? gateA.promise : Promise.resolve(blobB)
    );
    const pA = player.play('m', 1, 'https://cdn/001.mp3');
    const pB = player.play('m', 2, 'https://cdn/002.mp3');
    gateA.resolve(blobA);
    const [rA, rB] = await Promise.all([pA, pB]);
    assert.deepEqual(rA, { offline: false, error: false });
    assert.deepEqual(rB, { offline: true, error: false });
    // Only the winner minted a URL; the loser returned before creating one.
    assert.equal(created.length, 1);
    assert.equal(created[0].blob, blobB);
    assert.deepEqual(revoked, []);
    player.stop();
    assert.deepEqual(revoked, [created[0].id]);
  } finally {
    player.resetPlayerForTests();
    restore();
  }
});

test('B1: sequential supersede revokes the previous track URL', async () => {
  const { player, created, revoked, restore } = await loadPlayer();
  try {
    player.resetPlayerForTests();
    player.setAudioFetcher(async () => ({ tag: 'x' }));
    await player.play('m', 1, 'https://cdn/001.mp3');
    const firstUrl = player.currentSrc();
    assert.ok(firstUrl.startsWith('blob:'));
    await player.play('m', 2, 'https://cdn/002.mp3');
    assert.deepEqual(revoked, [firstUrl]);
    assert.notEqual(player.currentSrc(), firstUrl);
    assert.equal(created.length, 2);
  } finally {
    player.resetPlayerForTests();
    restore();
  }
});
