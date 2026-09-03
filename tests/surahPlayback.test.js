import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextAyah,
  resolvePage,
  ayahKey,
  start,
  stop,
  isActive,
  snapshot,
  onAyahChange,
  onError,
  setFollow,
  follow,
  setRepeat,
  skip,
  normalizeRepeat,
  nextRepeat,
  REPEAT_CYCLE,
} from '../js/services/surahPlayback.js';
import { configureDriver } from '../js/services/recitation.js';

/**
 * The continuous-surah-recitation engine, tested through a fake audio
 * driver: start() → play ayah 1 → fake 'ended' → engine plays ayah 2 → …
 * until the surah ends and the session closes itself. Also covers the
 * one-voice contract, follow toggling, error teardown, and hostile input.
 */

const SURAHS = [
  { number: 1, ayahCount: 7 },
  { number: 2, ayahCount: 286 },
  { number: 114, ayahCount: 6 },
];

function makeDriver() {
  const d = {
    played: [], // keys in order
    stopped: 0,
    endedCb: null,
    errorCb: null,
    end(key) {
      d.endedCb?.(key);
    },
    fail() {
      d.errorCb?.();
    },
  };
  d.play = (url, key) => d.played.push({ url, key });
  d.stop = () => {
    d.stopped += 1;
  };
  d.onEnded = (cb) => {
    d.endedCb = cb;
  };
  d.onError = (cb) => {
    d.errorCb = cb;
  };
  return d;
}

const MEDIA_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/';

describe('pure helpers', () => {
  test('nextAyah advances within the surah and stops at the last ayah', () => {
    assert.equal(nextAyah(1, 7), 2);
    assert.equal(nextAyah(6, 7), 7);
    assert.equal(nextAyah(7, 7), null, 'surah-scoped: last ayah ends the session');
    assert.equal(nextAyah(2, 286), 3);
  });

  test('nextAyah survives hostile input', () => {
    assert.equal(nextAyah('x', 7), null);
    assert.equal(nextAyah(1, 'y'), null);
    assert.equal(nextAyah(-5, 7), null);
    assert.equal(nextAyah(0, 7), null);
    assert.equal(nextAyah(NaN, NaN), null);
    assert.equal(nextAyah(1.9, 7), 2, 'floors fractional input');
  });

  test('resolvePage reads the mushaf ayahPages map with bounds', () => {
    const map = { '2:255': 42, '1:1': 1, '114:6': 604 };
    assert.equal(resolvePage(map, 2, 255), 42);
    assert.equal(resolvePage(map, 1, 1), 1);
    assert.equal(resolvePage(null, 2, 255), null);
    assert.equal(resolvePage({}, 2, 255), null);
    assert.equal(resolvePage({ '2:255': 99999 }, 2, 255), null, 'out-of-range page refused');
    assert.equal(resolvePage({ '2:255': 'x' }, 2, 255), null);
  });

  test('ayahKey matches the recitation key shape', () => {
    assert.equal(ayahKey(2, 255), '2:255');
  });
});

describe('engine (fake driver)', () => {
  test('plays ayah 1 immediately and reports it', () => {
    const d = makeDriver();
    configureDriver(d);
    const seen = [];
    onAyahChange((s, a) => seen.push([s, a]));
    start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    assert.equal(d.played.length, 1);
    assert.ok(d.played[0].url.startsWith(`${MEDIA_BASE}1.mp3`), 'ayah 1 global number = 1');
    assert.equal(d.played[0].key, '1:1');
    assert.equal(seen.at(-1)[1], 1);
    assert.equal(isActive(), true);
    // (v4.4) the snapshot grew a `continuous` flag (listen mode) — the old
    // deepEqual predates it and failed on the extra property.
    // (v5.0.0) the snapshot grew an `end` key (ayah-range playback); the
    // session's effective end defaults to the surah's total.
    assert.deepEqual(snapshot(), {
      active: true,
      surah: 1,
      ayah: 1,
      total: 7,
      end: 7,
      repeat: 1,
      continuous: false,
    });
    stop();
    configureDriver(null);
  });

  test('auto-advances verse by verse and closes at the last ayah', () => {
    const d = makeDriver();
    configureDriver(d);
    const seen = [];
    onAyahChange((s, a) => seen.push([s, a]));
    start({ surah: 114, total: 6, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    d.end('114:1');
    d.end('114:2');
    d.end('114:3');
    assert.equal(d.played.at(-1).key, '114:4');
    assert.equal(isActive(), true);
    d.end('114:4');
    d.end('114:5');
    d.end('114:6');
    assert.equal(isActive(), false, 'session ends at the last ayah');
    assert.deepEqual(seen.at(-1), [null, null], 'closure notifies null');
    assert.equal(d.stopped >= 1, true, 'audio is stopped on close');
    configureDriver(null);
  });

  test('a stale ended event does not advance', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    d.end('2:5'); // some other ayah finished — not ours
    assert.equal(snapshot().ayah, 1, 'no advance');
    d.end('1:1'); // the real one
    assert.equal(snapshot().ayah, 2);
    stop();
    configureDriver(null);
  });

  test('stop() tears down and notifies closure once', () => {
    const d = makeDriver();
    configureDriver(d);
    const seen = [];
    onAyahChange((s, a) => seen.push([s, a]));
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    stop();
    assert.equal(isActive(), false);
    assert.equal(seen.filter((x) => x[0] === null).length, 1);
    const before = d.stopped;
    stop(); // idempotent
    assert.equal(d.stopped, before);
    configureDriver(null);
  });

  test('restarting replaces the session cleanly (one voice, one engine)', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    start({ surah: 2, total: 286, reciterId: 'x', surahsMeta: SURAHS });
    assert.equal(snapshot().surah, 2);
    assert.equal(snapshot().ayah, 1);
    assert.equal(d.played.at(-1).key, '2:1');
    assert.ok(d.played.at(-1).url.endsWith('/8.mp3'), '2:1 = global ayah 8');
    stop();
    configureDriver(null);
  });

  test('verse failure tears the session down and reports the error', () => {
    const d = makeDriver();
    configureDriver(d);
    const errs = [];
    onError((s, a) => errs.push([s, a]));
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    d.fail();
    assert.equal(isActive(), false, 'session does not hang on a failed verse');
    assert.equal(errs.at(-1)[0], 1);
    configureDriver(null);
  });

  test('(v5.0.0) a range session plays from X to Y and stops at Y', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, from: 2, to: 4, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    assert.equal(d.played[0].key, '1:2');
    assert.equal(snapshot().end, 4);
    assert.equal(snapshot().total, 4);
    // a hostile `to` beyond total clamps to total
    start({ surah: 1, from: 1, to: 99, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    assert.equal(snapshot().end, 7);
  });

  test('from > total clamps to ayah 1; start refuses invalid surahs', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, from: 99, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    assert.equal(snapshot().ayah, 1);
    stop();
    assert.throws(() => start({ surah: 115, total: 3, reciterId: 'x', surahsMeta: SURAHS }));
    assert.throws(() => start({ surah: 1, total: 0, reciterId: 'x', surahsMeta: SURAHS }));
    configureDriver(null);
  });

  test('setFollow toggles without touching the session', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    setFollow(false);
    assert.equal(follow(), false);
    setFollow(true);
    assert.equal(follow(), true);
    assert.equal(isActive(), true);
    stop();
    configureDriver(null);
  });
});

describe('per-ayah repeat (v3.17 hifz)', () => {
  test('repeat=3 plays each ayah three times before advancing', () => {
    const d = makeDriver();
    configureDriver(d);
    const seen = [];
    onAyahChange((s, a) => seen.push([s, a]));
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS, repeat: 3 });
    assert.equal(d.played.filter((p) => p.key === '1:1').length, 1, 'first play');
    d.end('1:1'); // play 2 of 3
    assert.equal(d.played.filter((p) => p.key === '1:1').length, 2);
    assert.equal(snapshot().ayah, 1, 'still on ayah 1');
    d.end('1:1'); // play 3 of 3
    assert.equal(d.played.filter((p) => p.key === '1:1').length, 3);
    d.end('1:1'); // budget spent → advance
    assert.equal(snapshot().ayah, 2);
    assert.equal(d.played.at(-1).key, '1:2');
    // the replay key is the SAME key, so a stale ended from ayah 1 arriving
    // after the advance can never trigger a bogus replay of ayah 2's budget
    d.end('1:1');
    assert.equal(snapshot().ayah, 2);
    // ayah 2 also gets a fresh ×3 budget
    d.end('1:2');
    d.end('1:2');
    assert.equal(d.played.filter((p) => p.key === '1:2').length, 3);
    stop();
    configureDriver(null);
  });

  test('repeat=-1 loops the current ayah until skipped', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS, repeat: -1 });
    for (let i = 0; i < 10; i++) d.end('1:1');
    assert.equal(snapshot().ayah, 1, 'never advances on its own');
    assert.ok(d.played.length >= 11, 'looped many times');
    skip(1); // the exit hatch
    assert.equal(snapshot().ayah, 2);
    assert.equal(d.played.at(-1).key, '1:2');
    stop();
    configureDriver(null);
  });

  test('skip navigation clamps and ends past the last ayah', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 114, total: 6, reciterId: 'x', surahsMeta: SURAHS, repeat: 3 });
    skip(-1); // at ayah 1, prev clamps (stays, replays)
    assert.equal(snapshot().ayah, 1);
    skip(2.9); // sign-based contract: any positive step = next ayah
    assert.equal(snapshot().ayah, 2);
    skip('garbage'); // no-op
    assert.equal(snapshot().ayah, 2);
    skip(-5); // sign-based: previous ayah
    assert.equal(snapshot().ayah, 1, 'clamped to first');
    skip(99); // sign-based: still just "next ayah" — never a jump
    assert.equal(snapshot().ayah, 2);
    stop();
    // from the LAST ayah, one skip forward ends the session (surah-scoped)
    start({ surah: 114, from: 6, total: 6, reciterId: 'x', surahsMeta: SURAHS, repeat: 3 });
    skip(1);
    assert.equal(isActive(), false, 'surah-scoped: skipping past ends the session');
    assert.equal(skip(1).active, false, 'skip is a safe no-op when inactive');
    configureDriver(null);
  });

  test('setRepeat mid-session resets the current ayah budget', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS, repeat: 1 });
    setRepeat(5);
    assert.equal(snapshot().repeat, 5);
    d.end('1:1');
    d.end('1:1');
    d.end('1:1');
    assert.equal(snapshot().ayah, 1, 'budget active after live change');
    d.end('1:1');
    d.end('1:1');
    assert.equal(snapshot().ayah, 2, '5 plays then advance');
    stop();
    configureDriver(null);
  });

  test('repeat helpers normalize and cycle', () => {
    assert.deepEqual(REPEAT_CYCLE, [1, 3, 5, 10, -1]);
    assert.equal(normalizeRepeat(7), 1);
    assert.equal(normalizeRepeat(-1), -1);
    assert.equal(normalizeRepeat('x'), 1);
    assert.equal(nextRepeat(1), 3);
    assert.equal(nextRepeat(10), -1);
    assert.equal(nextRepeat(-1), 1, 'cycle wraps');
    assert.equal(nextRepeat('junk'), 3, 'normalizes first');
  });
});
