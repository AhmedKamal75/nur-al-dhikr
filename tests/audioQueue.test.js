/**
 * tests/audioQueue.test.js — item 23 (unified audio queue) gates:
 *  1. full-surah advance math is shared and pure (repeat one holds,
 *     repeat all wraps 114→1, off ends; junk fails closed; the repeat
 *     ladder cycles off → one → all → off);
 *  2. the player prefetches one bounded next track (consumed on exact
 *     key match, ignored on mismatch, old URLs revoked on replace) and
 *     stop() clears a stale sleep timer;
 *  3. yieldFullSurahPlayer pauses a playing track and reports it (live
 *     engine + real store), silent when idle;
 *  4. the lock-screen transport state derives from the store (verse wins,
 *     echo waits count as paused) and publishes only on change;
 *  5. every overlap fix is wired at its call site (source-pinned) and the
 *     repeat-all strings exist in both languages.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  REPEAT_MODES,
  cycleRepeatMode,
  normalizeRepeatMode,
  resolveNextFullSurah,
} from '../js/domain/audioQueue.js';
import {
  _resetPlayingStateForTests,
  desiredPlayingState,
  syncPlayingState,
} from '../js/services/mediaSession.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/* ---- shared FakeAudio (mirrors tests/player-race.test.js) ---- */

class FakeAudio {
  constructor() {
    this._src = '';
    this.paused = true;
    this.playbackRate = 1;
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 0;
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

  addEventListener() {}

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

describe('shared advance math', () => {
  test('modes normalize; ladder cycles off → one → all → off', () => {
    assert.deepEqual([...REPEAT_MODES], ['off', 'one', 'all']);
    assert.equal(normalizeRepeatMode('all'), 'all');
    assert.equal(normalizeRepeatMode('loud'), 'off');
    assert.equal(normalizeRepeatMode(null), 'off');
    assert.equal(cycleRepeatMode('off'), 'one');
    assert.equal(cycleRepeatMode('one'), 'all');
    assert.equal(cycleRepeatMode('all'), 'off');
    assert.equal(cycleRepeatMode('junk'), 'one', 'junk normalizes to off first');
  });

  test('resolveNextFullSurah walks, holds, wraps, ends, refuses junk', () => {
    assert.equal(resolveNextFullSurah(5, 'off'), 6);
    assert.equal(resolveNextFullSurah(5, 'one'), 5);
    assert.equal(resolveNextFullSurah(5, 'all'), 6);
    assert.equal(resolveNextFullSurah(114, 'off'), null, 'real end');
    assert.equal(resolveNextFullSurah(114, 'one'), 114);
    assert.equal(resolveNextFullSurah(114, 'all'), 1, 'wrap');
    assert.equal(resolveNextFullSurah(1, 'junk'), 2, 'junk mode walks');
    assert.equal(resolveNextFullSurah(0, 'all'), null);
    assert.equal(resolveNextFullSurah(115, 'all'), null);
    assert.equal(resolveNextFullSurah('nope', 'all'), null);
  });
});

describe('player prefetch (gapless-lite)', () => {
  async function loadPlayer() {
    globalThis.Audio = FakeAudio;
    const created = [];
    const revoked = [];
    const OrigURL = globalThis.URL;
    globalThis.URL.createObjectURL = () => {
      const id = `blob:${created.length}`;
      created.push(id);
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

  test('play consumes a warmed slot and skips its own lookup', async () => {
    const { player, created, restore } = await loadPlayer();
    try {
      player.resetPlayerForTests();
      let lookups = 0;
      player.setAudioFetcher(async () => {
        lookups += 1;
        return { fake: 'blob' };
      });
      player.prefetchTrack('m', 7, 'https://cdn/007.mp3');
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(created.length, 1, 'warm created one blob URL');
      const warmedLookups = lookups;
      assert.equal(warmedLookups, 1, 'the warm itself ran one lookup');
      const res = await player.play('m', 7, 'https://cdn/007.mp3');
      assert.deepEqual(res, { offline: true, error: false });
      assert.equal(lookups, warmedLookups, 'no second lookup on the warmed track');
      assert.equal(player.currentSrc(), 'blob:0');
    } finally {
      player.resetPlayerForTests();
      restore();
    }
  });

  test('mismatched keys fall back to a fresh lookup; junk prefetches ignored', async () => {
    const { player, created, restore } = await loadPlayer();
    try {
      player.resetPlayerForTests();
      let lookups = 0;
      player.setAudioFetcher(async () => {
        lookups += 1;
        return null;
      });
      player.prefetchTrack('m', 8, 'https://cdn/008.mp3');
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(created.length, 0, 'streaming track warms nothing');
      const warmedLookups = lookups;
      const res = await player.play('m', 9, 'https://cdn/009.mp3');
      assert.deepEqual(res, { offline: false, error: false });
      assert.equal(lookups, warmedLookups + 1, 'fresh lookup for the unwarmed track');
      assert.equal(player.currentSrc(), 'https://cdn/009.mp3');
      player.prefetchTrack('m', 0, 'x');
      player.prefetchTrack(null, 3, 'x');
      player.prefetchTrack('m', 999, 'x');
    } finally {
      player.resetPlayerForTests();
      restore();
    }
  });

  test('a newer prefetch revokes the older URL; stop clears sleep + prefetch', async () => {
    const { player, revoked, restore } = await loadPlayer();
    try {
      player.resetPlayerForTests();
      player.setAudioFetcher(async () => ({ fake: 'blob' }));
      player.prefetchTrack('m', 10, 'https://cdn/010.mp3');
      await new Promise((r) => setTimeout(r, 0));
      player.prefetchTrack('m', 11, 'https://cdn/011.mp3');
      await new Promise((r) => setTimeout(r, 0));
      assert.deepEqual(revoked, ['blob:0'], 'superseded warm revoked');
      player.armSleepTimer(15);
      assert.equal(player.sleepSnapshot().enabled, true);
      player.stop();
      assert.equal(player.sleepSnapshot().enabled, false, 'no stale fade onto the next track');
      assert.deepEqual(revoked, ['blob:0', 'blob:1'], 'stop drops the pending warm');
    } finally {
      player.resetPlayerForTests();
      restore();
    }
  });
});

describe('yieldFullSurahPlayer (one voice)', () => {
  test('pauses a playing track and reports it; silent when idle', async () => {
    globalThis.Audio = FakeAudio;
    const { yieldFullSurahPlayer } = await import('../js/app/audioEngine.js');
    const { store, actions } = await import('../js/core/state.js');
    store.dispatch(
      actions.setAudioPlayer({ moshafId: 'voice', surah: 3, playing: true, offline: false })
    );
    assert.equal(yieldFullSurahPlayer(), true);
    const p = store.getState().player;
    assert.equal(p.playing, false, 'store follows the yield');
    assert.equal(p.surah, 3, 'track stays docked, position kept');
    assert.equal(yieldFullSurahPlayer(), false, 'idle yields nothing');
    store.dispatch(actions.setAudioPlayer({ moshafId: null, surah: null, playing: false }));
  });
});

describe('lock-screen transport state', () => {
  test('verse wins; waits pause; idle is none', () => {
    const verse = (over) => ({ surahPlayback: { active: true, ...over }, player: {} });
    assert.equal(desiredPlayingState(verse({})), 'playing');
    assert.equal(desiredPlayingState(verse({ paused: true })), 'paused');
    assert.equal(desiredPlayingState(verse({ waiting: true })), 'paused');
    assert.equal(
      desiredPlayingState({
        surahPlayback: { active: false },
        player: { moshafId: 'v', playing: true },
      }),
      'playing'
    );
    assert.equal(
      desiredPlayingState({
        surahPlayback: { active: false },
        player: { moshafId: 'v', playing: false },
      }),
      'paused'
    );
    assert.equal(desiredPlayingState({ surahPlayback: {}, player: {} }), 'none');
    assert.equal(desiredPlayingState(null), 'none');
  });

  test('sync publishes only on change', () => {
    _resetPlayingStateForTests();
    const seen = [];
    // (v5.2.74, BUG-07) Node ≥21 ships a getter-only global `navigator` —
    // a plain assignment throws. Define the stub property instead and
    // restore the exact original descriptor afterwards.
    const prevDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaSession: {
          set playbackState(v) {
            seen.push(v);
          },
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      const on = { surahPlayback: {}, player: { moshafId: 'v', playing: true } };
      assert.equal(syncPlayingState(on), 'playing');
      assert.equal(syncPlayingState(on), 'playing', 'same answer, no re-publish');
      assert.deepEqual(seen, ['playing']);
      assert.equal(
        syncPlayingState({ surahPlayback: {}, player: { moshafId: 'v', playing: false } }),
        'paused'
      );
      assert.deepEqual(seen, ['playing', 'paused']);
    } finally {
      if (prevDesc) Object.defineProperty(globalThis, 'navigator', prevDesc);
      else delete globalThis.navigator;
      _resetPlayingStateForTests();
    }
  });
});

describe('wiring + strings', () => {
  test('every overlap fix calls the yield at its site', () => {
    const audio = readProject('js/app/handlers/audio.js');
    const items = readProject('js/app/handlers/items.js');
    const worship = readProject('js/app/handlers/worship.js');
    const at = (src, marker) => {
      const i = src.indexOf(marker);
      assert.ok(i > -1, `${marker} exists`);
      return i;
    };
    assert.ok(audio.indexOf('yieldFullSurahPlayer()', at(audio, "'playlist-play'")) > -1);
    assert.ok(items.indexOf('yieldFullSurahPlayer()', at(items, "'toggle-speech'")) > -1);
    assert.ok(worship.indexOf('yieldFullSurahPlayer()', at(worship, "'prayer-test-sound'")) > -1);
    const del = at(audio, "'audio-remove-custom'");
    assert.ok(audio.indexOf('player.stop()', del) > -1, 'deleted voice stops sounding');
    const rep = at(audio, "'player-repeat'");
    assert.ok(audio.indexOf('cycleRepeatMode', rep) > -1, 'three-mode ladder');
    const engine = readProject('js/app/audioEngine.js');
    const ended = at(engine, 'onTrackEnded');
    assert.ok(engine.indexOf('resolveNextFullSurah', ended) > -1, 'one shared advance');
    assert.ok(engine.includes('prefetchTrack'), 'next track warmed on success');
    assert.ok(engine.includes('clearMetadata'), 'failed tracks own no lock-screen slot');
    const sub = readProject('js/app/stateSub.js');
    assert.ok(sub.includes('syncPlayingState'), 'transport state follows the store');
  });

  test('repeat-all strings exist in EN + AR', () => {
    assert.ok(EN_STRINGS['audio.repeatAll']);
    assert.ok(AR_STRINGS['audio.repeatAll']);
    assert.ok(EN_STRINGS['audio.repeatAllShort']);
    assert.ok(AR_STRINGS['audio.repeatAllShort']);
  });
});
