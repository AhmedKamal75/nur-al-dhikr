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
} from '../js/surahPlayback.js';
import { configureDriver } from '../js/recitation.js';

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
    assert.deepEqual(snapshot(), { active: true, surah: 1, ayah: 1, total: 7 });
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
