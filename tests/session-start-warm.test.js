/**
 * tests/session-start-warm.test.js — (v5.11.0 A) tap-parallel warm:
 * start() fires the lookahead horizon's probes+preloads synchronously at
 * tap time (concurrent with the first ayah's own storage probe), instead
 * of waiting behind it. Pins the horizon URLs, the connection-window cap,
 * and the quota discipline (the audible file itself is never pre-warmed).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  start,
  stop,
  resetPlaybackNetStatsForTests,
  MAX_LOOKAHEAD,
} from '../js/services/surahPlayback.js';
import { configureDriver, resetRecitationForTests } from '../js/services/recitation.js';
import { ayahAudioUrl } from '../js/services/mushaf.js';

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
const settle = async () => {
  await tick();
  await tick();
};

function setup() {
  const d = makeDriver();
  configureDriver(d);
  resetPlaybackNetStatsForTests();
  return d;
}

function teardown() {
  stop();
  configureDriver(null);
  resetRecitationForTests();
}

describe('tap-parallel warm at session start', () => {
  test('start() warms the upcoming ayahs (seed horizon, in order)', async () => {
    const d = setup();
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle();
      const want = [2, 3, 4, 5, 6].map((a) => ayahAudioUrl(SURAHS, 'ar.alafasy', 1, a));
      const unique = [...new Set(d.preloaded)];
      assert.deepEqual(unique, want, 'horizon preloads the next ayahs in order');
    } finally {
      teardown();
    }
  });

  test('burst stays inside the connection window', async () => {
    const d = setup();
    try {
      start({ surah: 2, total: 286, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle();
      const unique = [...new Set(d.preloaded)];
      assert.ok(unique.length <= MAX_LOOKAHEAD, `unique warms cap at ${MAX_LOOKAHEAD}`);
      // Sync tap warm + post-dispatch prefetch cover the same horizon —
      // the pool dedupes in production; the fake just records both passes.
      assert.ok(
        d.preloaded.length <= 2 * MAX_LOOKAHEAD,
        'at most two passes over the same horizon'
      );
    } finally {
      teardown();
    }
  });

  test('mid-surah starts warm forward from the tap point', async () => {
    const d = setup();
    try {
      start({ surah: 1, from: 3, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle();
      const want = [4, 5, 6, 7].map((a) => ayahAudioUrl(SURAHS, 'ar.alafasy', 1, a));
      assert.deepEqual([...new Set(d.preloaded)], want);
    } finally {
      teardown();
    }
  });

  test('the audible first ayah is never pre-warmed (quota discipline)', async () => {
    const d = setup();
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle();
      const first = ayahAudioUrl(SURAHS, 'ar.alafasy', 1, 1);
      assert.ok(!d.preloaded.includes(first), 'first ayah plays via dispatch only');
      assert.ok(
        d.played.some((p) => p.key === '1:1'),
        'first ayah still dispatched to the driver'
      );
    } finally {
      teardown();
    }
  });

  test('single-ayah bounds warm nothing; repeat keeps the single triple', async () => {
    const d = setup();
    try {
      start({ surah: 114, from: 6, total: 6, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await settle();
      assert.deepEqual(d.preloaded, [], 'nowhere ahead to warm');
      stop();
      start({
        surah: 1,
        total: 7,
        reciterId: 'ar.alafasy',
        surahsMeta: SURAHS,
        repeat: 3,
      });
      await settle();
      assert.deepEqual(
        [...new Set(d.preloaded)],
        [ayahAudioUrl(SURAHS, 'ar.alafasy', 1, 1)],
        'repeat sessions warm the looping (current) ayah for instant replays'
      );
    } finally {
      teardown();
    }
  });
});
