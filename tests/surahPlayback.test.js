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
  setListenRepeat,
  normalizeEchoPause,
  ECHO_PAUSE_DEFAULT_MS,
  setContinuous,
  setReciter,
  setReciterB,
  setCompare,
  currentReciterId,
  peekNextUrl,
  setLoop,
  setSpeed,
  normalizeLoop,
  nextLoop,
  LOOP_CYCLE,
  normalizeSpeed,
  nextSpeed,
  VERSE_RATES,
  normalizeQueue,
  resolveQueueItem,
  queueSignature,
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
    rates: [], // playback rates applied per play
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
  d.setRate = (v) => d.rates.push(v);
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
    // (v5.2.0) echo mode adds `listenRepeat` + `waiting` keys.
    assert.deepEqual(snapshot(), {
      active: true,
      surah: 1,
      ayah: 1,
      total: 7,
      end: 7,
      repeat: 1,
      continuous: false,
      listenRepeat: false,
      waiting: false,
      reciterId: 'ar.alafasy',
      reciterIdB: null,
      compare: false,
      loop: 1,
      speed: 1,
      queue: null,
      qIndex: 0,
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

  test('normalizeEchoPause clamps into the sane window', () => {
    assert.equal(normalizeEchoPause(8000), 8000);
    assert.equal(normalizeEchoPause(1), 3000, 'floor');
    assert.equal(normalizeEchoPause(999999), 30000, 'ceiling');
    assert.equal(normalizeEchoPause('x'), ECHO_PAUSE_DEFAULT_MS);
    assert.equal(normalizeEchoPause(NaN), ECHO_PAUSE_DEFAULT_MS);
  });

  test('echo mode holds a recite-back pause, then advances', async () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    setListenRepeat(true, 3000);
    assert.equal(snapshot().listenRepeat, true);
    d.end('1:1');
    assert.equal(snapshot().ayah, 1, 'no instant advance');
    assert.equal(snapshot().waiting, true, 'your-turn state');
    assert.equal(d.played.length, 1, 'nothing replayed during the pause');
    await new Promise((r) => setTimeout(r, 3300));
    assert.equal(snapshot().ayah, 2, 'advance lands after the pause');
    assert.equal(snapshot().waiting, false);
    assert.equal(d.played.at(-1).key, '1:2');
    stop();
    configureDriver(null);
  });

  test('skip cancels a pending echo pause without double-advance', async () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    setListenRepeat(true, 3000);
    d.end('1:1');
    assert.equal(snapshot().waiting, true);
    skip(1);
    assert.equal(snapshot().ayah, 2, 'skip moves now');
    assert.equal(snapshot().waiting, false);
    const played = d.played.length;
    await new Promise((r) => setTimeout(r, 3300));
    assert.equal(d.played.length, played, 'stale pause never fires');
    assert.equal(snapshot().ayah, 2);
    stop();
    configureDriver(null);
  });

  test('echo mode ends the session at the last ayah (no trailing pause)', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 114, from: 6, total: 6, reciterId: 'x', surahsMeta: SURAHS });
    setListenRepeat(true, 3000);
    d.end('114:6');
    assert.equal(isActive(), false, 'session closes at the surah end');
    assert.equal(snapshot().waiting, false, 'no pause scheduled past the end');
    stop();
    configureDriver(null);
  });

  test('continuous listen mode rolls into the next surah with fresh bounds', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    setContinuous(true);
    assert.equal(snapshot().continuous, true);
    for (let i = 1; i <= 7; i++) d.end(`1:${i}`);
    assert.equal(snapshot().surah, 2, 'rolled into Al-Baqarah');
    assert.equal(snapshot().ayah, 1);
    assert.equal(snapshot().end, 286, 'end reset to the new surah total (was 7)');
    assert.equal(snapshot().total, 286);
    // …and it keeps playing past ayah 7 of the new surah.
    for (let i = 1; i <= 7; i++) d.end(`2:${i}`);
    assert.equal(snapshot().surah, 2);
    assert.equal(snapshot().ayah, 8);
    assert.equal(isActive(), true);
    stop();
    configureDriver(null);
  });

  test('a bounded range never rolls into the next surah, even in listen mode', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, from: 1, to: 3, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    setContinuous(true);
    d.end('1:1');
    d.end('1:2');
    d.end('1:3');
    assert.equal(isActive(), false, 'range end stops the session');
    stop();
    configureDriver(null);
  });

  test('setReciter live-switches the voice and restarts the current ayah', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    const before = d.played.length;
    setReciter('ar.husary');
    assert.equal(snapshot().reciterId, 'ar.husary');
    assert.equal(d.played.length, before + 1);
    assert.equal(d.played.at(-1).key, '1:1', 'same ayah, new voice');
    assert.ok(d.played.at(-1).url.includes('ar.husary'), 'URL carries the new reciter');
    stop();
    configureDriver(null);
  });

  test('compare mode plays each ayah with A then the same ayah with B', () => {
    const d = makeDriver();
    configureDriver(d);
    start({
      surah: 1,
      total: 7,
      reciterId: 'ar.alafasy',
      reciterIdB: 'ar.husary',
      surahsMeta: SURAHS,
    });
    assert.equal(setCompare(true).compare, true);
    assert.equal(d.played.at(-1).key, '1:1', 'enabling restarts the ayah with A');
    assert.ok(d.played.at(-1).url.includes('ar.alafasy'));
    d.end('1:1'); // A finished → same ayah with B
    assert.equal(snapshot().ayah, 1, 'no advance yet');
    assert.equal(d.played.at(-1).key, '1:1');
    assert.ok(d.played.at(-1).url.includes('ar.husary'), 'B voice for the second pass');
    assert.equal(currentReciterId(), 'ar.husary');
    d.end('1:1'); // B finished → advance with A
    assert.equal(snapshot().ayah, 2);
    assert.ok(d.played.at(-1).url.includes('ar.alafasy'), 'back to A for the next ayah');
    stop();
    configureDriver(null);
  });

  test('compare without a B voice stays off; peekNextUrl warms the next file', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
    assert.equal(setCompare(true).compare, false, 'no B voice → no-op');
    const next = peekNextUrl();
    assert.ok(next && next.includes('ar.alafasy/2.mp3'), 'prefetch targets ayah 2 while 1 plays');
    stop();
    assert.equal(peekNextUrl(), null, 'nothing to prefetch when idle');
    configureDriver(null);
  });

  test('range loop ×N replays the bounds then closes', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, from: 2, to: 3, total: 7, reciterId: 'x', surahsMeta: SURAHS, loop: 2 });
    assert.equal(snapshot().loop, 2);
    d.end('1:2');
    d.end('1:3'); // end of pass 1 → restart at `from`
    assert.equal(isActive(), true);
    assert.equal(snapshot().ayah, 2, 'looped back to the range start');
    assert.equal(d.played.at(-1).key, '1:2');
    d.end('1:2');
    d.end('1:3'); // pass 2 spent → session closes
    assert.equal(isActive(), false, 'loop budget exhausted');
    stop();
    configureDriver(null);
  });

  test('loop helpers normalize and cycle; manual skip still ends', () => {
    assert.deepEqual(LOOP_CYCLE, [1, 2, 3, 5, 10]);
    assert.equal(normalizeLoop(7), 1);
    assert.equal(normalizeLoop('x'), 1);
    assert.equal(nextLoop(1), 2);
    assert.equal(nextLoop(10), 1, 'cycle wraps');
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 114, from: 5, to: 6, total: 6, reciterId: 'x', surahsMeta: SURAHS, loop: 3 });
    setLoop(2);
    assert.equal(snapshot().loop, 2);
    skip(1); // manual navigation past the end ends — only natural play loops
    skip(1);
    assert.equal(isActive(), false);
    configureDriver(null);
  });

  test('verse speed applies per play and live-switches without restart', () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS, speed: 1.25 });
    assert.equal(snapshot().speed, 1.25);
    assert.ok(d.rates.includes(1.25), 'rate applied on play');
    const played = d.played.length;
    setSpeed(1.5);
    assert.equal(snapshot().speed, 1.5);
    assert.equal(d.played.length, played, 'no restart on speed change');
    assert.equal(d.rates.at(-1), 1.5, 'rate pushed live to the element');
    assert.deepEqual(VERSE_RATES, [1, 1.25, 1.5, 0.75]);
    assert.equal(normalizeSpeed('junk'), 1);
    assert.equal(normalizeSpeed(99), 2, 'clamped');
    assert.equal(normalizeSpeed(0.1), 0.5, 'clamped');
    assert.equal(nextSpeed(1), 1.25);
    assert.equal(nextSpeed(0.75), 1, 'cycle wraps');
    stop();
    configureDriver(null);
  });

  test('queue rolls through ranges in order, skipping junk', () => {
    const d = makeDriver();
    configureDriver(d);
    const queue = [
      { surah: 1, from: 6, to: 7 },
      { surah: 999, from: 1, to: 2 }, // junk: skipped
      { surah: 114, from: 1, to: 2 },
    ];
    start({
      surah: 1,
      from: 6,
      to: 7,
      total: 7,
      reciterId: 'x',
      surahsMeta: SURAHS,
      queue,
      qIndex: 0,
    });
    assert.equal(snapshot().qIndex, 0);
    d.end('1:6');
    d.end('1:7'); // bounds end → next queue item (junk stripped at start)
    assert.equal(snapshot().surah, 114, 'junk entry skipped');
    assert.equal(snapshot().ayah, 1);
    assert.equal(snapshot().qIndex, 1);
    assert.equal(d.played.at(-1).key, '114:1');
    d.end('114:1');
    d.end('114:2'); // queue spent → session closes
    assert.equal(isActive(), false);
    stop();
    configureDriver(null);
  });

  test('queue helpers sanitize and resolve against meta', () => {
    assert.equal(normalizeQueue(null), null);
    assert.equal(normalizeQueue([]), null);
    assert.equal(normalizeQueue([{ surah: 999 }, 'x', null]), null, 'all junk → null');
    const q = normalizeQueue([{ surah: 1, from: 2, to: 3 }, { surah: 200, from: 1 }, null]);
    assert.deepEqual(q, [{ surah: 1, from: 2, to: 3 }]);
    assert.deepEqual(resolveQueueItem(q, 0, SURAHS), { surah: 1, from: 2, end: 3, total: 7 });
    assert.equal(resolveQueueItem(q, 5, SURAHS), null, 'out of range');
    assert.equal(resolveQueueItem(q, 0, []), null, 'no meta, no resolve');
    assert.equal(queueSignature(q), queueSignature([{ surah: 1, from: 2, to: 3 }]));
  });

  test('setListenRepeat off cancels the pause and replays nothing', async () => {
    const d = makeDriver();
    configureDriver(d);
    start({ surah: 1, total: 7, reciterId: 'x', surahsMeta: SURAHS });
    setListenRepeat(true, 3000);
    d.end('1:1');
    assert.equal(snapshot().waiting, true);
    setListenRepeat(false);
    assert.equal(snapshot().waiting, false);
    assert.equal(snapshot().listenRepeat, false);
    const played = d.played.length;
    await new Promise((r) => setTimeout(r, 3300));
    assert.equal(d.played.length, played, 'cancelled pause stays silent');
    assert.equal(snapshot().ayah, 1, 'still parked on the ayah');
    stop();
    configureDriver(null);
  });
});
