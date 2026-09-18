/**
 * tests/adaptive-lookahead.test.js — (v5.10.4) adaptive prefetch depth:
 * the EWMA weighting, the fetch/ayah ratio bands, the passive sample
 * intake, and the plain-path triple walk (with complex-mode bail).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  start,
  stop,
  ewmaUpdate,
  lookaheadFor,
  smoothK,
  notePreloadSample,
  peekNextTriples,
  resetPlaybackNetStatsForTests,
  MAX_LOOKAHEAD,
  MIN_LOOKAHEAD,
  SEED_LOOKAHEAD,
  setRepeat,
  setCompare,
  setReciterB,
} from '../js/services/surahPlayback.js';
import { configureDriver, resetRecitationForTests } from '../js/services/recitation.js';

const SURAHS = [
  { number: 1, ayahCount: 7 },
  { number: 2, ayahCount: 286 },
  { number: 114, ayahCount: 6 },
];

function makeDriver() {
  const d = { played: [], preloaded: [] };
  d.play = (url, key) => d.played.push({ url, key });
  d.stop = () => {};
  d.setRate = () => {};
  d.preload = (url) => d.preloaded.push(url);
  d.onEnded = () => {};
  d.onError = () => {};
  d.offEnded = () => {};
  d.offError = () => {};
  return d;
}

describe('ewmaUpdate', () => {
  test('weighting, clamps, hostile input', () => {
    assert.equal(ewmaUpdate(1000, 2000, 0.3), 1300);
    assert.equal(ewmaUpdate(null, 2000, 0.3), 2000, 'first sample seeds');
    assert.equal(ewmaUpdate(1000, 'junk', 0.3), 1000, 'hostile sample kept out');
    assert.equal(ewmaUpdate(1000, -5, 0.3), 1000, 'negatives kept out');
    assert.equal(ewmaUpdate(1000, 2000, 99), 2000, 'alpha clamps to 1');
  });
});

describe('lookaheadFor bands', () => {
  test('unlearned network seeds 5 (bounded startup cover)', () => {
    assert.equal(lookaheadFor(null, 6000), SEED_LOOKAHEAD);
    assert.equal(lookaheadFor(0, 6000), SEED_LOOKAHEAD);
    assert.equal(lookaheadFor(NaN, 6000), SEED_LOOKAHEAD);
    assert.equal(SEED_LOOKAHEAD, 5);
  });

  test('ratio bands with cap', () => {
    assert.equal(lookaheadFor(1000, 6000), 1, 'fast network, no waste');
    assert.equal(lookaheadFor(4000, 6000), 2, 'fetch near ayah length');
    assert.equal(lookaheadFor(9000, 6000), 3, 'fetch outlasts the ayah');
    assert.equal(lookaheadFor(20000, 6000), 5, 'dire network holds deep');
    assert.equal(lookaheadFor(10 ** 9, 10), 8, 'capped, never unbounded');
    assert.equal(MAX_LOOKAHEAD, 8);
    assert.equal(MIN_LOOKAHEAD, 2);
  });
});

describe('smoothK: k = α·k_prev + (1−α)·target', () => {
  test('glides instead of jumping; converges in ~2 samples', () => {
    assert.equal(smoothK(3, 1), 2);
    assert.equal(smoothK(2, 1), 1.5);
    assert.equal(smoothK(1.5, 1), 1.25);
    assert.equal(smoothK(1, 3), 2, 'rises symmetrically');
    assert.equal(smoothK(1, 1), 1, 'steady state rests');
  });

  test('clamps and hostile input', () => {
    assert.equal(smoothK(99, 99), MAX_LOOKAHEAD);
    assert.equal(smoothK(-5, -5), 1);
    assert.equal(smoothK(null, 2), 2, 'unseeded takes target');
    assert.equal(smoothK(2, 2, 'junk'), 2, 'hostile alpha falls back to 0.5 path');
  });
});

describe('peekNextTriples walk', () => {
  test('plain session walks k sequential triples', () => {
    const d = makeDriver();
    configureDriver(d);
    resetPlaybackNetStatsForTests();
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      const t = peekNextTriples(3);
      assert.deepEqual(
        t.map((x) => [x.surah, x.ayah]),
        [
          [1, 2],
          [1, 3],
          [1, 4],
        ]
      );
      assert.ok(t.every((x) => x.reciter === 'ar.alafasy'));
    } finally {
      stop();
      configureDriver(null);
      resetRecitationForTests();
    }
  });

  test('stops at bounds; complex modes bail to []', () => {
    const d = makeDriver();
    configureDriver(d);
    resetPlaybackNetStatsForTests();
    try {
      // Single-ayah bounds (end == from): nothing ahead to warm.
      start({ surah: 1, total: 1, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      assert.deepEqual(peekNextTriples(3), []);
      stop();
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      setRepeat(3);
      const r = peekNextTriples(3);
      assert.deepEqual(r, [], 'repeat keeps single-triple behavior');
      setRepeat(1);
      setReciterB('ar.husary');
      setCompare(true);
      assert.deepEqual(peekNextTriples(3), [], 'compare keeps single-triple behavior');
    } finally {
      stop();
      configureDriver(null);
      resetRecitationForTests();
    }
  });
});

describe('prefetch depth follows the learned ratio', () => {
  // The offline IDB probe settles async — two ticks so both chained
  // resolutions land even on a loaded runner (one tick flaked).
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  const settle = async () => {
    await tick();
    await tick();
  };

  test('slow network settles at full depth without overshoot', async () => {
    const d = makeDriver();
    configureDriver(d);
    resetPlaybackNetStatsForTests();
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle(); // drain start()'s own async prefetch first
      d.preloaded.length = 0;
      // Simulate learned slowness: fetches outlast ayahs 2:1.
      notePreloadSample(12000);
      notePreloadSample(12000);
      // Re-trigger prefetch (setSpeed re-warms without disturbing audio).
      const { setSpeed } = await import('../js/services/surahPlayback.js');
      const counts = [];
      for (let i = 0; i < 3; i += 1) {
        d.preloaded.length = 0;
        setSpeed(1);
        await settle();
        counts.push(d.preloaded.length);
      }
      assert.deepEqual(counts, [4, 4, 3], 'glides 5-seed down to full depth');
      assert.ok(
        counts.every((n) => n <= MAX_LOOKAHEAD),
        'never exceeds the cap'
      );
    } finally {
      stop();
      configureDriver(null);
      resetRecitationForTests();
    }
  });

  test('fast network converges to one without flapping (k-smoothing)', async () => {
    const d = makeDriver();
    configureDriver(d);
    resetPlaybackNetStatsForTests();
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle(); // drain start()'s own async prefetch first
      d.preloaded.length = 0;
      notePreloadSample(400); // fast fetches → target 1, k glides 5→3→2→2→2 (floor 2)
      const { setSpeed } = await import('../js/services/surahPlayback.js');
      const counts = [];
      for (let i = 0; i < 4; i += 1) {
        d.preloaded.length = 0;
        setSpeed(1);
        await settle();
        counts.push(d.preloaded.length);
      }
      assert.deepEqual(counts, [3, 2, 2, 2], 'glides to the floor, never flaps');
    } finally {
      stop();
      configureDriver(null);
      resetRecitationForTests();
    }
  });
});
