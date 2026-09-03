/**
 * tests/review-v3.21-fixes.test.js — adversarial pass over v3.17–v3.20
 * (the 4-feature hostile review). Every test here pins a real finding:
 * stored XSS via the quran bookmark, a mirror-drift the marker-grep test
 * could not see, once-ever vs per-day page counting, forged khatma
 * completions from junk keys, reload-duplicated day reminders, and the
 * smaller honesty/robustness gaps.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { store, actions } from '../js/core/state.js';
import { sanitizeFastingPrefs } from '../js/domain/fasting.js';
import {
  buildTriggerPlan,
  planFingerprint,
  sanitizePlan,
  selectDueAlerts,
  pruneFiredMap,
} from '../js/services/alertTriggers.js';
import { wasDayFired, markDayFired, permissionState } from '../js/services/notifications.js';
import { hifzReviewCardHTML } from '../js/views/quran.js';
import { worshipTodayCardHTML } from '../js/views/home.js';
import { t, availableLanguages } from '../js/core/i18n.js';

/* ------------------------------------------------------------------ */
/* 1. Stored XSS chain: quranBookmark.surah (finding #1, critical)     */
/* ------------------------------------------------------------------ */

describe('review v3.21: quranBookmark surah validation', () => {
  test('reducer only ever stores a canonical surah number string', () => {
    for (const hostile of [
      '2"><img src=x onerror=alert(1)>',
      '2:255',
      '999',
      'abc',
      '-1',
      '1.5',
      '',
      null,
      undefined,
      { surah: 2 },
    ]) {
      store.dispatch(actions.setQuranBookmark(hostile));
      assert.equal(
        store.getState().quranBookmark.surah,
        null,
        `hostile id must degrade to null: ${JSON.stringify(hostile)}`
      );
    }
    store.dispatch(actions.setQuranBookmark('2'));
    assert.equal(store.getState().quranBookmark.surah, '2');
    store.dispatch(actions.setQuranBookmark(114)); // numeric input normalized too
    assert.equal(store.getState().quranBookmark.surah, '114');
    // bounds
    store.dispatch(actions.setQuranBookmark('115'));
    assert.equal(store.getState().quranBookmark.surah, null);
    store.dispatch(actions.setQuranBookmark('1'));
    assert.equal(store.getState().quranBookmark.surah, '1');
  });

  test('a crafted backup cannot smuggle a hostile bookmark id past restore', () => {
    store.dispatch(
      actions.restoreState({
        quranBookmark: { surah: 'x" onmouseover="alert(1)" data-z="', ts: 1 },
        mushafPagesRead: { j0: true, j603: true, 2: true, 0: true, 605: true },
        quranWords: null,
        // session slices riding in a backup must be dropped
        hifzSession: { mode: true, surah: 2 },
        alertTriggerStatus: { mode: 'triggers', count: 99 },
        player: { playing: true },
        mushaf: { meta: { evil: true } },
      })
    );
    const s = store.getState();
    assert.equal(s.quranBookmark.surah, null);
    // junk keys dropped; only the in-range page survives; 0 and 605 are not pages
    assert.deepEqual(s.mushafPagesRead, { 2: true });
    assert.deepEqual(s.quranWords, {});
    assert.deepEqual(s.hifzSession, { mode: false, surah: null, level: 'word', revealed: {} });
    assert.deepEqual(s.alertTriggerStatus, { mode: 'unknown', count: 0 });
    assert.equal(s.player.playing, false);
    assert.equal(s.mushaf.meta, null);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Pages-today: per-day idempotency, not once-ever (finding, med)   */
/* ------------------------------------------------------------------ */

describe('review v3.21: MUSHAF_PAGE_VISITED counts once per DAY', () => {
  test('a re-read page still counts toward today, exactly once per page', () => {
    store.dispatch(actions.resetAll());
    store.dispatch(actions.restoreState({ statistics: {} }));
    const dayKey = new Date().toISOString().slice(0, 10); // via dateKey below
    const today = () => store.getState().statistics.dailyHistory;
    store.dispatch(actions.markMushafPageVisited(21)); // new ever-page
    assert.equal(today()[Object.keys(today())[0]].pages, 1);
    store.dispatch(actions.markMushafPageVisited(21)); // same page again → idempotent
    const entryKey = Object.keys(today())[0];
    assert.equal(today()[entryKey].pages, 1);
    assert.deepEqual(today()[entryKey].pagesVisited, { 21: true });
    store.dispatch(actions.markMushafPageVisited(22)); // distinct page → bumps
    assert.equal(today()[entryKey].pages, 2);
    // an ALREADY-read page (from before today) still counts today, once
    store.dispatch(actions.restoreState({ mushafPagesRead: { 30: true }, statistics: {} }));
    store.dispatch(actions.markMushafPageVisited(30));
    const e2 = Object.keys(today())[0];
    assert.equal(today()[e2].pages, 1);
    store.dispatch(actions.markMushafPageVisited(30));
    assert.equal(today()[e2].pages, 1, 'same page twice on one day counts once');
  });

  test('khatma completion is only recorded when a NEW ever-page crosses 604', () => {
    store.dispatch(actions.resetAll());
    store.dispatch(actions.restoreState({ statistics: {} }));
    // 603 pages already read (validated keys survive restore)
    const read = {};
    for (let p = 1; p <= 603; p++) read[String(p)] = true;
    store.dispatch(actions.restoreState({ mushafPagesRead: read, statistics: {} }));
    assert.equal(store.getState().khatmaHistory.length, 0);
    store.dispatch(actions.markMushafPageVisited(604)); // crossing dispatch
    assert.equal(store.getState().khatmaHistory.length, 1);
    store.dispatch(actions.markMushafPageVisited(604)); // re-visit: no second entry
    assert.equal(store.getState().khatmaHistory.length, 1);
  });
});

/* ------------------------------------------------------------------ */
/* 3. ALERT_TRIGGER_STATUS idempotency (finding, low)                  */
/* ------------------------------------------------------------------ */

describe('review v3.21: alert status reducer is idempotent', () => {
  test('same mode+count returns the SAME state object (no re-render churn)', () => {
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'triggers', count: 3 }));
    const before = store.getState();
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'triggers', count: 3 }));
    assert.equal(store.getState(), before);
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'triggers', count: 4 }));
    assert.notEqual(store.getState(), before);
    assert.equal(store.getState().alertTriggerStatus.count, 4);
  });
});

/* ------------------------------------------------------------------ */
/* 4. sw.js mirrors: BEHAVIORAL equality, not marker-grep (finding #2) */
/* ------------------------------------------------------------------ */

function extractSwMirrors() {
  const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const a = src.indexOf('// --- inline mirrors of js/alertTriggers.js');
  const b = src.indexOf('// -----', a + 10);
  assert.ok(a > 0 && b > a, 'mirror region markers must exist in sw.js');
  const body =
    'const ALERT_MAX_LATENESS_MS = 15 * 60 * 1000;\n' +
    src
      .slice(a, b)
      // export the three mirrored functions; alertCleanStr stays a plain
      // declaration so it remains in scope as their helper.
      .replace(
        /^function (sanitizePlan|selectDueAlerts|pruneFiredMap)\b/gm,
        'exports.$1 = function $1'
      );
  return new Function('exports', `${body}; return exports;`)({});
}

describe('review v3.21: sw.js mirror functions match the module behaviorally', () => {
  const m = extractSwMirrors();

  test('sanitizePlan: identical output on hostile input batteries', () => {
    const batteries = [
      undefined,
      null,
      42,
      'nope',
      [],
      [null, 0, 'x', {}, { ts: -5, key: 'a' }, { ts: Number.NaN, key: 'b' }],
      [
        {
          ts: 300,
          key: 'k1',
          title: 't'.repeat(500),
          body: 'b',
          tag: 'g',
          kind: 'prayer',
          name: 'fajr',
        },
        { ts: 100, key: 'k1', title: 'dup key dropped' },
        { ts: 200, key: 'k2' },
        { ts: 100, key: 'k3' },
      ],
      Array.from({ length: 25 }, (_, i) => ({ ts: i + 1, key: `k${i}` })),
    ];
    for (const input of batteries) {
      assert.deepEqual(m.sanitizePlan(input), sanitizePlan(input), JSON.stringify(input));
    }
    const clean = sanitizePlan(batteries[6]);
    assert.equal(clean.length, 3); // dup key dropped, sorted by ts
    assert.deepEqual(m.sanitizePlan(batteries[6]), clean);
  });

  test('selectDueAlerts: identical output, including prototype-key safety', () => {
    const plan = [
      { ts: 1000, key: 'a' },
      { ts: 2000, key: 'b' },
      { ts: 3000, key: 'c' },
    ];
    const fired = { a: 1 };
    const protoFired = JSON.parse('{"__proto__": {"x": 1}, "b": 2}');
    for (const [now, map] of [
      [1500, fired],
      [2500, protoFired],
      [3000 + 15 * 60 * 1000, fired],
      [3000 + 15 * 60 * 1000 + 1, fired],
    ]) {
      assert.deepEqual(m.selectDueAlerts(plan, now, map), selectDueAlerts(plan, now, map));
    }
  });

  test('pruneFiredMap: identical output INCLUDING the 200-key cap (the drift)', () => {
    const now = 1_000_000_000_000;
    const big = {};
    for (let i = 0; i < 250; i++) big[`k${String(i).padStart(3, '0')}`] = now - i * 1000;
    assert.deepEqual(m.pruneFiredMap(big, now), pruneFiredMap(big, now));
    assert.equal(Object.keys(pruneFiredMap(big, now)).length, 200, 'cap enforced');
    const aged = { old: now - 49 * 60 * 60 * 1000, fresh: now - 1000 };
    assert.deepEqual(m.pruneFiredMap(aged, now), pruneFiredMap(aged, now));
    assert.deepEqual(Object.keys(pruneFiredMap(aged, now)), ['fresh']);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Language-aware re-arm: fingerprint + body copy (findings, low)   */
/* ------------------------------------------------------------------ */

describe('review v3.21: trigger plan fingerprint and copy', () => {
  const settings = {
    latitude: 30.0444,
    longitude: 31.2357,
    method: 'egypt',
    asr: 'standard',
    alerts: { fajr: true, dhuhr: true },
  };

  test('plans differing only in title/body produce different fingerprints', () => {
    const p1 = [{ key: 'prayer-fajr|2026-1-1', ts: 1000, title: 'Fajr', body: 'old' }];
    const p2 = [{ key: 'prayer-fajr|2026-1-1', ts: 1000, title: 'الفجر', body: 'new' }];
    assert.notEqual(planFingerprint(p1), planFingerprint(p2));
  });

  test('the pre-scheduled notification says the prayer TIME has come', () => {
    const plan = buildTriggerPlan({
      now: new Date(2026, 0, 1, 3, 0, 0, 0),
      prayerSettings: settings,
      lang: 'en',
      calcTimes: ({ date }) => ({
        fajr: date.getHours() + 5 + 0.5 / 60,
        sunrise: 99,
        dhuhr: date.getHours() + 7,
        asr: 99,
        maghrib: 99,
        isha: 99,
      }),
    });
    assert.ok(plan.length >= 1);
    assert.equal(plan[0].body, 'It is time for Fajr');
    assert.equal(plan[0].title, 'Fajr');
  });

  test('prayer.timeFor exists in BOTH languages, like calendar.ah', () => {
    for (const key of ['prayer.timeFor', 'calendar.ah']) {
      for (const lang of availableLanguages()) {
        // t() falls back to the raw key when missing — assert real copy
        assert.notEqual(t(key, lang), key, `${key} missing in ${lang}`);
        assert.ok(
          t(key, lang).includes(lang === 'ar' && key === 'calendar.ah' ? 'هـ' : ''),
          `calendar.ah ar must be the Arabic suffix`
        );
      }
    }
    assert.equal(t('prayer.timeFor', 'ar', { name: t('prayer.fajr', 'ar') }), 'حان وقت الفجر');
  });
});

/* ------------------------------------------------------------------ */
/* 6. Fasting remindTime: membership, not just shape                   */
/* ------------------------------------------------------------------ */

describe('review v3.21: fasting remindTime snaps to the offered cycle', () => {
  test('off-cycle but well-formed times reset to the default', () => {
    assert.equal(sanitizeFastingPrefs({ remindTime: '03:45' }).remindTime, '18:00');
    assert.equal(sanitizeFastingPrefs({ remindTime: '25:99' }).remindTime, '18:00');
    assert.equal(sanitizeFastingPrefs({ remindTime: '19:00' }).remindTime, '19:00');
    assert.equal(sanitizeFastingPrefs({}).remindTime, '18:00');
  });
});

/* ------------------------------------------------------------------ */
/* 7. Day-granular reminders survive reloads without re-firing         */
/* ------------------------------------------------------------------ */

describe('review v3.21: persisted day-dedup helpers', () => {
  test('markDayFired/wasDayFired round-trip and stay day-scoped', () => {
    const day = '2026-08-29';
    const key = `fasting-day-before|${day}`;
    assert.equal(wasDayFired(key, day), false);
    markDayFired(key, day);
    assert.equal(wasDayFired(key, day), true, 'same day: fired');
    assert.equal(
      wasDayFired(`fasting-day-before|${day}-b`, day),
      false,
      'a different fireKey is untouched'
    );
  });

  test('permissionState is node-safe (no window ReferenceError)', () => {
    assert.equal(permissionState(), 'unsupported');
  });
});

/* ------------------------------------------------------------------ */
/* 8. Honest counts and hostile-shape views                            */
/* ------------------------------------------------------------------ */

describe('review v3.21: view honesty under real data shapes', () => {
  test('hifz card reports the TRUE due count, not the display cap', () => {
    const today = new Date();
    const iso = (offset) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    };
    const records = {};
    for (let i = 0; i < 6; i++)
      records[String(i + 1)] = {
        level: 0,
        due: iso(-i - 1),
        since: iso(-9),
        reviews: 0,
        lapses: 0,
      };
    const html = hifzReviewCardHTML({
      settings: { language: 'en' },
      hifzRecords: records,
      quran: {},
      mushaf: {},
    });
    assert.ok(
      html.includes('6 due for review'),
      `expected true count in HTML; got: ${html.match(/[^]*panel__subtext[^]*?</)?.[0]}`
    );
    assert.equal((html.match(/class="chip"/g) || []).length, 4, 'display stays capped at 4 chips');
  });

  test('worship card tolerates a non-array sadaqahLog', () => {
    const html = worshipTodayCardHTML({
      settings: { language: 'en' },
      sadaqahLog: 'nonsense',
    });
    assert.ok(typeof html === 'string' && html.length > 0);
  });
});

/* ------------------------------------------------------------------ */
/* 9. sw.js static gates for the new hardening                         */
/* ------------------------------------------------------------------ */

describe('review v3.21: sw.js hardening present', () => {
  const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  test('notificationclick focuses/opens the app', () => {
    assert.ok(src.includes("addEventListener('notificationclick'"));
    assert.ok(src.includes('clients.openWindow'));
  });

  test('periodicsync never shows from a stale persisted plan', () => {
    assert.ok(src.includes('stored.savedAt'));
    assert.ok(src.includes('30 * 60 * 60 * 1000'));
  });
});
