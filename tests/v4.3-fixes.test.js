/**
 * tests/v4.3-fixes.test.js — third improvement wave (v4.3) gates, one test
 * per shipped fix, each written against the exact regression it prevents:
 *  1. longestDayStreak DST double-count (review.js key-based walk)
 *  2. computeStreak longest run no longer counts an idle today
 *  3. khatma completion counts pure calendar days (spring-forward safe)
 *  4. reader windowing semantics (bounds, deep-link recenter, slide-ahead,
 *     recenter-once latch) — replacing the vacuous no-throw smoke test
 *  5. qadr-night Maghrib attribution (qadrNightFor)
 *  6. fasting horizon reaches the next annual fast; history excludes tomorrow
 *  7. hadith worker reply routing (cross-resolution class)
 *  8. fetchJSON rejects the offline stub / 503 (loadErrors path engages)
 *  9. store.flushPersist runs the pending debounced save exactly once
 * 10. handler-map merge is collision-free
 */

import { test, describe, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { longestDayStreak } from '../js/domain/review.js';
import { computeStreak } from '../js/core/state/streak.js';
import { qadrNightFor } from '../js/domain/ramadan.js';
import {
  upcomingFastingDays,
  recentVoluntaryFasts,
  FASTING_HORIZON_DAYS,
} from '../js/domain/fasting.js';
import { toHijri } from '../js/domain/calendar.js';
import { store, actions } from '../js/core/state.js';
import { fetchJSON } from '../js/app/net.js';
import { routeWorkerReply } from '../js/app/hadithData.js';
import { handlerMaps, mergedClickHandlers } from '../js/app/events.js';
import {
  currentWindow,
  expandReaderWindow,
  _resetReaderWindowForTests,
} from '../js/views/quran.js';

/* ------------------------------------------------------------------ */
/* 1. longestDayStreak — DST-safe key arithmetic                       */
/* ------------------------------------------------------------------ */

describe('v4.3 longestDayStreak: calendar-day walks', () => {
  test('a genuine 3-day run across the US fall-back reports 3, not 4', () => {
    // The exact case the audit proved broken under TZ=America/New_York:
    // raw-ms arithmetic made Nov 1 + 24h land on Nov 1 23:00 (same dateKey),
    // counting the first day twice.
    assert.equal(longestDayStreak(['2025-11-01', '2025-11-02', '2025-11-03']), 3);
  });

  test('runs across spring-forward and month/year boundaries stay exact', () => {
    assert.equal(longestDayStreak(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']), 4);
    assert.equal(longestDayStreak(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']), 4);
  });

  test('gaps still sever runs; junk keys still drop out', () => {
    assert.equal(longestDayStreak(['2025-01-01', '2025-01-02', '2025-01-04', '2025-01-05']), 2);
    assert.equal(longestDayStreak(['2025-02-30', 'junk']), 0);
  });
});

/* ------------------------------------------------------------------ */
/* 2. computeStreak — longest run is activity-based                    */
/* ------------------------------------------------------------------ */

describe('v4.3 computeStreak: idle today cannot inflate the longest run', () => {
  test('3-day run ending yesterday + idle today = longest 3 (was 4)', () => {
    const today = '2025-06-10';
    const stats = {
      dailyHistory: {
        '2025-06-07': { recitations: 1 },
        '2025-06-08': { recitations: 1 },
        '2025-06-09': { recitations: 1 },
      },
    };
    const { longestStreak, currentStreak } = computeStreak(stats, today);
    // The LONGEST run must not absorb an idle today (was 4 before v4.3).
    assert.equal(longestStreak, 3);
    // The CURRENT streak convention (unchanged, documented in streak.js):
    // today counts as "live" until midnight, so the run reads 3+1 = 4.
    assert.equal(currentStreak, 4);
  });

  test('an active today extends its own run', () => {
    const today = '2025-06-10';
    const stats = {
      dailyHistory: {
        '2025-06-08': { recitations: 1 },
        '2025-06-09': { recitations: 1 },
        '2025-06-10': { recitations: 2 },
      },
    };
    assert.deepEqual(computeStreak(stats, today), { currentStreak: 3, longestStreak: 3 });
  });
});

/* ------------------------------------------------------------------ */
/* 3. Khatma completion — pure calendar-day count                      */
/* ------------------------------------------------------------------ */

describe('v4.3 khatma completion: calendar days across DST', () => {
  // Freeze the wall clock: the reducer stamps completions with Date.now()
  // and new Date(), so the completion "date" must be pinned to test a
  // multi-day span deterministically.
  const RealDate = Date;
  const FROZEN_TS = new RealDate(2026, 2, 10, 12, 0, 0).getTime();
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(FROZEN_TS);
      else super(...args);
    }
    static now() {
      return FROZEN_TS;
    }
  }
  before(() => {
    globalThis.Date = FrozenDate;
  });
  after(() => {
    globalThis.Date = RealDate;
  });

  // Seed the real store through RESTORE_STATE, then complete a khatma with
  // the final page dispatch and inspect the recorded history entry.
  function completeWith(startDate) {
    const pages = {};
    for (let p = 1; p <= 603; p += 1) pages[String(p)] = true;
    store.dispatch(
      actions.restoreState({
        khatmaPlan: { startDate, targetDate: null, dailyTarget: 5 },
        mushafPagesRead: pages,
        khatmaHistory: [],
      })
    );
    const before = store.getState().khatmaHistory.length;
    store.dispatch(actions.markMushafPageVisited(604));
    const entry = store.getState().khatmaHistory[0];
    assert.equal(store.getState().khatmaHistory.length, before + 1);
    return entry;
  }

  test('started and finished today → days === 1', () => {
    const entry = completeWith('2026-03-10');
    assert.equal(entry.days, 1);
    assert.equal(entry.pages, 604);
  });

  test('spanning the 2026 US spring-forward weekend counts pure calendar days', () => {
    // Start Sat Mar 7, complete Tue Mar 10: 4 calendar dates. The v4.2
    // noon-anchor millisecond division crossed a 23h day and said 3.
    const entry = completeWith('2026-03-07');
    assert.equal(entry.days, 4);
  });

  test('second completion dispatch is idempotent (page already ever-read)', () => {
    const before = store.getState().khatmaHistory.length;
    store.dispatch(actions.markMushafPageVisited(604));
    assert.equal(store.getState().khatmaHistory.length, before);
    // Clean the seeded progress so later suites see a sane store.
    store.dispatch(actions.restoreState({ mushafPagesRead: {}, khatmaPlan: null }));
  });
});

/* ------------------------------------------------------------------ */
/* 4. Reader windowing semantics (replacing the vacuous smoke test)    */
/* ------------------------------------------------------------------ */

describe('v4.3 quran reader window: bounds, recenter, slide-ahead, latch', () => {
  const TOTAL = 286; // Al-Baqarah
  const stateFor = (params, recitingKey) => ({
    activeParams: params,
    recitingAyahKey: recitingKey || null,
  });

  test('fresh open of a long surah renders the first 30 ayahs', () => {
    _resetReaderWindowForTests();
    const win = currentWindow(stateFor({}), '2', TOTAL);
    assert.deepEqual([win.from, win.to], [1, 30]);
  });

  test('deep link ?ay=200 centers the window on 190–219', () => {
    _resetReaderWindowForTests();
    const win = currentWindow(stateFor({ ay: '200' }), '2', TOTAL);
    assert.deepEqual([win.from, win.to], [190, 219]);
  });

  test('recitation slide-ahead: reciting ayah near the lower edge re-centers', () => {
    _resetReaderWindowForTests();
    currentWindow(stateFor({ ay: '200' }), '2', TOTAL); // window [190, 219]
    // 212 is within 5 of the edge (219-5=214)? 212 <= 214 → no slide yet.
    let win = currentWindow(stateFor({ ay: '200' }, '2:212'), '2', TOTAL);
    assert.deepEqual([win.from, win.to], [190, 219]);
    // 215 crosses the threshold → re-centered on 215.
    win = currentWindow(stateFor({ ay: '200' }, '2:215'), '2', TOTAL);
    assert.deepEqual([win.from, win.to], [205, 234]);
  });

  test('the same deep link does NOT re-center twice (latch); manual expand wins', () => {
    _resetReaderWindowForTests();
    currentWindow(stateFor({ ay: '200' }), '2', TOTAL); // [190, 219]
    expandReaderWindow('down'); // manual extension to ~249
    const win = currentWindow(stateFor({ ay: '200' }), '2', TOTAL); // same ay param
    assert.equal(win.to, Math.min(TOTAL, 219 + 30));
    assert.equal(win.from, 190); // latch held: not re-centered
  });

  test('expandReaderWindow up clamps at ayah 1; short surahs render whole', () => {
    _resetReaderWindowForTests();
    expandReaderWindow('up');
    expandReaderWindow('up');
    const win = currentWindow(stateFor({}), '2', TOTAL);
    assert.equal(win.from, 1);
    // A 17-ayah surah's window is bounded by its own total.
    _resetReaderWindowForTests();
    const short = currentWindow(stateFor({}), '108', 3);
    assert.deepEqual([short.from, short.to], [1, 3]);
    _resetReaderWindowForTests();
  });
});

/* ------------------------------------------------------------------ */
/* 5. Qadr-night attribution                                           */
/* ------------------------------------------------------------------ */

describe('v4.3 qadrNightFor: the Islamic night starts at Maghrib', () => {
  const times = { fajr: 4.5, maghrib: 18.3, isha: 19.8 };

  test('day 26 before Maghrib → tonight is the 27th (likely Qadr)', () => {
    const q = qadrNightFor({ day: 26 }, times, 14, 30); // 2pm on day 26
    assert.equal(q.dayOfRamadan, 27);
    assert.equal(q.isLikelyQadrNight, true);
  });

  test('day 27 daytime → tonight is the 28th (the 27th already ended at Fajr)', () => {
    const q = qadrNightFor({ day: 27 }, times, 10, 30); // 10am on day 27
    assert.equal(q.dayOfRamadan, 28);
    assert.equal(q.isLikelyQadrNight, false);
  });

  test('post-midnight before Fajr → still the ongoing night (day already rolled)', () => {
    const q = qadrNightFor({ day: 27 }, times, 2, 30); // 2am on day 27
    assert.equal(q.dayOfRamadan, 27);
    assert.equal(q.isLikelyQadrNight, true);
  });

  test('Eid eve (day 30 evening) → no Ramadan night at all', () => {
    assert.equal(qadrNightFor({ day: 30 }, times, 20, 30), null);
  });
});

/* ------------------------------------------------------------------ */
/* 6. Fasting horizon + history boundary                               */
/* ------------------------------------------------------------------ */

describe('v4.3 fasting: horizon and history honesty', () => {
  test('horizon spans a full Hijri year so the next Ashura is always found', () => {
    assert.ok(FASTING_HORIZON_DAYS >= 360);
    const prefs = {
      ashura: { enabled: true, remind: false },
      monThu: { enabled: false, remind: false },
      whiteDays: { enabled: false, remind: false },
      arafah: { enabled: false, remind: false },
    };
    // From 2025-07-06 the next Ashura (10 Muharram 1448) is ~a year out —
    // the old 60-day horizon honestly-said "none upcoming".
    const out = upcomingFastingDays(prefs, new Date(2025, 6, 6), 3);
    assert.ok(out.length >= 1, 'found at least one upcoming fast');
    assert.ok(out.every((e) => e.categories.includes('ashura')));
  });

  test('recentVoluntaryFasts excludes a fast logged for tomorrow', () => {
    // A fast logged on the hijri date that maps to 2026-01-02: "recent"
    // viewed from 2026-01-01 must NOT show it (it hasn't happened yet),
    // but viewed from 2026-01-02 it appears.
    const h = toHijri(new Date(2026, 0, 2));
    const log = { [`${h.year}-${h.month}`]: { [String(h.day)]: true } };
    const before = recentVoluntaryFasts(log, 8, new Date(2026, 0, 1));
    assert.equal(before.length, 0);
    const sameDay = recentVoluntaryFasts(log, 8, new Date(2026, 0, 2));
    assert.equal(sameDay.length, 1);
  });
});

/* ------------------------------------------------------------------ */
/* 7. Hadith worker reply routing                                      */
/* ------------------------------------------------------------------ */

describe('v4.3 routeWorkerReply: parallel parses never cross-resolve', () => {
  test('each reply resolves only its own request, exactly once', async () => {
    const pending = new Map();
    const calls = { a: 0, b: 0 };
    const a = new Promise((resolve) => {
      pending.set(1, {
        resolve: (v) => {
          calls.a += 1;
          resolve(v);
        },
        reject: () => {},
      });
    });
    const b = new Promise((resolve, reject) => {
      pending.set(2, {
        resolve: (v) => {
          calls.b += 1;
          resolve(v);
        },
        reject,
      });
    });
    // Replies arrive out of order and duplicated/unknown.
    assert.equal(routeWorkerReply(pending, { id: 2, ok: true, value: 'docB' }), true);
    assert.equal(routeWorkerReply(pending, { id: 1, ok: true, value: 'docA' }), true);
    assert.equal(routeWorkerReply(pending, { id: 1, ok: true, value: 'docA-again' }), false);
    assert.equal(routeWorkerReply(pending, { id: 99, ok: true, value: 'junk' }), false);
    assert.equal(routeWorkerReply(pending, null), false);
    assert.equal(pending.size, 0);
    assert.equal(await a, 'docA');
    assert.equal(await b, 'docB');
    assert.equal(calls.a, 1);
    assert.equal(calls.b, 1);
  });

  test('a failed parse rejects its own request with the worker message', async () => {
    const pending = new Map();
    const p = new Promise((resolve, reject) => {
      pending.set(7, { resolve, reject });
    });
    routeWorkerReply(pending, { id: 7, ok: false, message: 'Unexpected token' });
    await assert.rejects(p, /Unexpected token/);
  });
});

/* ------------------------------------------------------------------ */
/* 8. fetchJSON rejects the offline stub and non-2xx                   */
/* ------------------------------------------------------------------ */

describe('v4.3 fetchJSON: offline stubs never masquerade as data', () => {
  const realFetch = globalThis.fetch;
  after(() => {
    globalThis.fetch = realFetch;
  });

  test('a 200 body of {"error":"offline"} throws (old SW stub defense)', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    await assert.rejects(fetchJSON('data/catalog.json'), /offline stub/);
  });

  test('a 503 throws (the SW stub is 503 now)', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'offline' }), { status: 503, statusText: 'Offline' });
    await assert.rejects(fetchJSON('data/quran/2.json'), /503/);
  });

  test('a genuine 200 document passes through', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    assert.deepEqual(await fetchJSON('data/catalog.json'), { ok: true });
  });
});

/* ------------------------------------------------------------------ */
/* 9. store.flushPersist — the pagehide data-loss window               */
/* ------------------------------------------------------------------ */

describe('v4.3 store.flushPersist: pending debounced save runs immediately', () => {
  test('a persisted change is flusable before the 200ms debounce fires', () => {
    // Earlier suites in this file dispatched persisted actions — flush any
    // residue first so the pending flag starts clean.
    store.flushPersist();
    assert.equal(store._persistPending, false);
    store.dispatch(
      actions.updateSettings({ navCollapsed: !store.getState().settings.navCollapsed })
    );
    assert.equal(store._persistPending, true);
    // flushPersist must clear the pending state synchronously and be a
    // no-op when nothing is pending.
    store.flushPersist();
    assert.equal(store._persistPending, false);
    store.flushPersist(); // second call: no-op, no throw
    // restore the setting we flipped
    store.dispatch(
      actions.updateSettings({ navCollapsed: !store.getState().settings.navCollapsed })
    );
    store.flushPersist();
  });
});

/* ------------------------------------------------------------------ */
/* 10. Handler-map merge is collision-free                             */
/* ------------------------------------------------------------------ */

describe('v4.3 events: handler maps merge without collisions', () => {
  test('merged table size equals the sum of its source maps', () => {
    const total = handlerMaps.reduce((n, [, m]) => n + Object.keys(m).length, 0);
    assert.equal(Object.keys(mergedClickHandlers).length, total);
  });

  test('every handler is a function and every map is an object', () => {
    for (const [name, m] of handlerMaps) {
      assert.equal(typeof m, 'object', `${name} map`);
      for (const [key, fn] of Object.entries(m)) {
        assert.equal(typeof fn, 'function', `${name}.${key}`);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* 11. sw.js wave-3 contracts (static text gates)                      */
/* ------------------------------------------------------------------ */

describe('v4.3 sw.js: offline stub + precache discipline', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  test('the offline stub is served with HTTP 503, not 200', () => {
    const stubs = sw.match(/new Response\(JSON\.stringify\(\{ error: 'offline' \}\)/g) || [];
    assert.ok(stubs.length >= 2, 'both stub sites present');
    assert.ok(/status: 503/.test(sw), 'stub carries status: 503');
  });

  test('precache failure rethrows so install fails (old shell survives)', () => {
    assert.ok(/throw err;/.test(sw), 'precacheShell rethrows');
    assert.ok(/PRECACHE_RETRY/.test(sw), 'manual retry message handler exists');
  });

  test('activate refuses to delete old caches when the new shell is incomplete', () => {
    assert.ok(/new shell incomplete/.test(sw), 'completeness guard present');
  });

  test('LRU re-insertion on cache hit (recency bookkeeping)', () => {
    // Whitespace-tolerant: prettier may wrap the delete→put chain.
    assert.match(
      sw,
      /cache\s*\.\s*delete\(request\)\s*\.\s*then\(\s*\(\)\s*=>\s*cache\s*\.\s*put\(request,\s*copy\)/s
    );
  });
});
