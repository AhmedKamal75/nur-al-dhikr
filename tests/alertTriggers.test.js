/**
 * tests/alertTriggers.test.js — v3.20 prayer-alert reliability.
 * The pure plan builder (next-24h of adhan alerts from the real settings
 * shape), the hostile-shape sanitizer, the catch-up due-alert selector,
 * the fired-map pruner, and the ephemeral state slice. Also gates the
 * sw.js side: since sw.js is a CLASSIC worker that cannot import ES
 * modules, it carries inline mirrors of the pure helpers — static markers
 * assert those mirrors (and the message/periodicsync handlers) exist so
 * the two cannot silently diverge.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildTriggerPlan,
  planFingerprint,
  sanitizePlan,
  selectDueAlerts,
  pruneFiredMap,
  triggersSupported,
  PRAYER_ORDER,
  PLAN_WINDOW_MS,
  MAX_PLAN,
} from '../js/services/alertTriggers.js';
import { PERSISTED_KEYS, store, actions } from '../js/core/state.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const swSource = readFileSync(join(ROOT, 'sw.js'), 'utf8');
// (v4.2) the dictionary split into i18n/en.js + i18n/ar.js — the key-count
// checks below read the concatenated dictionary sources.
const i18nSource =
  readFileSync(join(ROOT, 'js/core/i18n.js'), 'utf8') +
  readFileSync(join(ROOT, 'js/core/i18n/en.js'), 'utf8') +
  readFileSync(join(ROOT, 'js/core/i18n/ar.js'), 'utf8');

/** Deterministic solar engine: fixed decimal hours on the local clock. */
const FAKE_TIMES = {
  fajr: 4.5, // 04:30
  sunrise: 6, // 06:00
  dhuhr: 12, // 12:00
  asr: 15.5, // 15:30
  maghrib: 18.75, // 18:45
  isha: 20, // 20:00
};
const fakeCalc = () => ({ ...FAKE_TIMES });

const ALL_ON = {
  latitude: 30.0444,
  longitude: 31.2357,
  method: 'MWL',
  asr: 'Standard',
  alerts: { fajr: true, sunrise: true, dhuhr: true, asr: true, maghrib: true, isha: true },
};
const TEN_AM = new Date(2026, 7, 29, 10, 0, 0); // Aug 29 2026, 10:00 local

describe('buildTriggerPlan', () => {
  test('plans only future alerts within the 24h window, sorted, deduped', () => {
    const plan = buildTriggerPlan({ now: TEN_AM, prayerSettings: ALL_ON, calcTimes: fakeCalc });
    assert.ok(plan.length > 0);
    const seen = new Set();
    let lastTs = TEN_AM.getTime() - 1;
    for (const e of plan) {
      assert.ok(e.ts > TEN_AM.getTime(), `entry ${e.key} must be in the future`);
      assert.ok(
        e.ts <= TEN_AM.getTime() + PLAN_WINDOW_MS,
        `entry ${e.key} must be within the 24h window`
      );
      assert.ok(e.ts >= lastTs, 'plan must be sorted ascending by ts');
      lastTs = e.ts;
      assert.ok(!seen.has(e.key), 'keys must be unique');
      seen.add(e.key);
      assert.equal(e.kind, 'prayer');
      assert.equal(e.tag, `prayer-${e.name}`);
      assert.equal(e.title, t_name(e.name));
      assert.ok(e.body.length > 0);
    }
    // At 10:00 today's fajr/sunrise already passed; today's four remain,
    // and tomorrow's fajr/sunrise land inside the window.
    assert.deepEqual(
      plan.map((e) => `${e.name}@${e.key.split('|')[1]}`),
      [
        'dhuhr@2026-8-29',
        'asr@2026-8-29',
        'maghrib@2026-8-29',
        'isha@2026-8-29',
        'fajr@2026-8-30',
        'sunrise@2026-8-30',
      ]
    );
  });

  test('per-prayer toggles are respected (only enabled prayers planned)', () => {
    const p = {
      ...ALL_ON,
      alerts: { fajr: false, sunrise: false, dhuhr: true, asr: true, maghrib: false, isha: false },
    };
    const plan = buildTriggerPlan({ now: TEN_AM, prayerSettings: p, calcTimes: fakeCalc });
    assert.deepEqual(
      plan.map((e) => e.name),
      ['dhuhr', 'asr']
    );
  });

  test('midnight edge: an alert exactly now is excluded, a stale one never planned', () => {
    // now == sunrise: `ts <= now` is excluded (it just fired / the in-tab
    // scheduler's 2-minute catch-up owns the "just now" case).
    const now = new Date(2026, 7, 29, 6, 0, 0);
    const plan = buildTriggerPlan({ now, prayerSettings: ALL_ON, calcTimes: fakeCalc });
    assert.ok(!plan.some((e) => e.name === 'sunrise' && e.key.includes('2026-8-29')));
    // Window ends 06:00 tomorrow: tomorrow's fajr (04:30) is in, dhuhr (12:00) is out.
    assert.ok(plan.some((e) => e.name === 'fajr' && e.key.includes('2026-8-30')));
    assert.ok(!plan.some((e) => e.name === 'dhuhr' && e.key.includes('2026-8-30')));
  });

  test('hostile shapes return an empty plan, never throw', () => {
    assert.deepEqual(buildTriggerPlan({ now: null, prayerSettings: ALL_ON }), []);
    assert.deepEqual(buildTriggerPlan({ now: new Date('nonsense'), prayerSettings: ALL_ON }), []);
    assert.deepEqual(buildTriggerPlan({ now: TEN_AM, prayerSettings: null }), []);
    assert.deepEqual(buildTriggerPlan({ now: TEN_AM, prayerSettings: 'garbage' }), []);
    assert.deepEqual(
      buildTriggerPlan({ now: TEN_AM, prayerSettings: { ...ALL_ON, latitude: null } }),
      []
    );
    assert.deepEqual(
      buildTriggerPlan({ now: TEN_AM, prayerSettings: { ...ALL_ON, alerts: null } }),
      []
    );
    assert.deepEqual(
      buildTriggerPlan({ now: TEN_AM, prayerSettings: { ...ALL_ON, alerts: {} } }),
      []
    );
    // A crashing solar engine degrades to an empty plan.
    assert.deepEqual(
      buildTriggerPlan({
        now: TEN_AM,
        prayerSettings: ALL_ON,
        calcTimes: () => {
          throw new Error('boom');
        },
      }),
      []
    );
    // …and so does a null one (calculateTimes returns null without coords).
    assert.deepEqual(
      buildTriggerPlan({ now: TEN_AM, prayerSettings: ALL_ON, calcTimes: () => null }),
      []
    );
  });

  test('real solar engine (sanity, not tz-pinned): plan is well-formed', () => {
    const plan = buildTriggerPlan({ now: TEN_AM, prayerSettings: ALL_ON });
    assert.ok(plan.length >= 4 && plan.length <= 6, 'Cairo at 10:00 has 4-6 alerts in 24h');
    for (const e of plan) {
      assert.ok(PRAYER_ORDER.includes(e.name));
      assert.ok(e.ts > TEN_AM.getTime());
    }
  });

  test('plan never exceeds MAX_PLAN', () => {
    // 3 days of fake alerts cannot exceed the cap because the window is 24h,
    // so force it through the sanitizer instead (same cap, same code path).
    const many = [];
    for (let i = 0; i < MAX_PLAN + 5; i++) {
      many.push({
        key: `k${i}`,
        kind: 'prayer',
        name: 'fajr',
        ts: 1000 + i,
        title: 't',
        body: 'b',
        tag: 'prayer-x',
      });
    }
    assert.equal(sanitizePlan(many).length, MAX_PLAN);
  });
});

function t_name(name) {
  // The plan localizes via i18n's t(); keys are shared with the in-tab
  // scheduler, so titles are exactly the prayer display names.
  const titles = {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  };
  return titles[name];
}

describe('sanitizePlan', () => {
  test('drops junk, keeps well-formed entries, clamps strings', () => {
    const good = {
      key: 'prayer-fajr|2026-8-30',
      kind: 'prayer',
      name: 'fajr',
      ts: 123.4,
      title: 'Fajr',
      body: 'b'.repeat(500),
      tag: 'prayer-fajr',
    };
    const out = sanitizePlan([
      null,
      'string',
      42,
      {},
      { ts: 'NaN' },
      { ts: Number.POSITIVE_INFINITY },
      { ts: -5, key: 'neg' },
      { ts: 100, key: '' },
      { ts: 100, key: 'dup' },
      { ts: 200, key: 'dup' }, // first wins
      { ...good },
      { ts: 300, key: 'notag' },
    ]);
    assert.equal(out.length, 3);
    assert.equal(out[0].key, 'dup');
    assert.equal(out[0].ts, 100);
    assert.equal(out[1].key, 'prayer-fajr|2026-8-30');
    assert.equal(out[1].body.length, 300); // clamped
    assert.equal(out[1].ts, 123.4); // Number()-ed finite
    assert.equal(out[2].tag, '');
    // Non-array inputs → [].
    assert.deepEqual(sanitizePlan(null), []);
    assert.deepEqual(sanitizePlan('x'), []);
  });
});

describe('selectDueAlerts (periodicsync catch-up)', () => {
  const NOW = 1_000_000;
  const plan = [
    { key: 'due', ts: NOW - 60_000, tag: 'prayer-a' },
    { key: 'late', ts: NOW - 20 * 60_000, tag: 'prayer-b' },
    { key: 'future', ts: NOW + 60_000, tag: 'prayer-c' },
    { key: 'done', ts: NOW - 30_000, tag: 'prayer-d' },
  ];
  const fired = { done: NOW - 10_000 };

  test('fires passed-but-fresh, unfired alerts only', () => {
    assert.deepEqual(
      selectDueAlerts(plan, NOW, fired).map((e) => e.key),
      ['due']
    );
  });

  test('respects the lateness window', () => {
    const custom = [...plan, { key: 'almost', ts: NOW - 5 * 60_000, tag: 'prayer-e' }];
    // 3-minute window: 'due' (1 min old) still fires, 'almost' (5 min) doesn't.
    assert.deepEqual(
      selectDueAlerts(custom, NOW, fired, 3 * 60_000).map((e) => e.key),
      ['due']
    );
    // Widening to 6 minutes catches 'almost' too — but never 'late' (20 min).
    assert.deepEqual(
      selectDueAlerts(custom, NOW, fired, 6 * 60_000).map((e) => e.key),
      ['due', 'almost']
    );
  });

  test('hostile shapes degrade to empty, never throw', () => {
    assert.deepEqual(selectDueAlerts(null, NOW, null), []);
    assert.deepEqual(selectDueAlerts('x', NOW, fired), []);
    assert.deepEqual(selectDueAlerts(plan, NaN, null), []);
    // Garbage fired-map (prototype pollution attempt) is treated as plain keys.
    const evil = JSON.parse('{"__proto__":1}');
    assert.deepEqual(
      selectDueAlerts([plan[0]], NOW, evil).map((e) => e.key),
      ['due']
    );
    assert.equal(Object.getPrototypeOf({}).polluted, undefined);
  });
});

describe('pruneFiredMap', () => {
  test('drops stale entries and caps size, keeping the newest', () => {
    const NOW = 10_000_000;
    const fired = { fresh: NOW - 1000, old: NOW - 72 * 3600_000, edge: NOW - 47 * 3600_000 };
    const pruned = pruneFiredMap(fired, NOW);
    assert.deepEqual(Object.keys(pruned).sort(), ['edge', 'fresh']);
    const capped = pruneFiredMap({ a: 1, b: 2, c: 3 }, NOW, 48 * 3600_000, 2);
    assert.deepEqual(Object.keys(capped).sort(), ['b', 'c']);
    assert.deepEqual(pruneFiredMap(null, NOW), {});
    assert.deepEqual(pruneFiredMap({ x: 'NaN' }, NOW), {});
  });
});

describe('planFingerprint', () => {
  test('same plan, same fingerprint; any ts change changes it', () => {
    const p = [
      { key: 'a', ts: 1 },
      { key: 'b', ts: 2 },
    ];
    assert.equal(
      planFingerprint(p),
      planFingerprint([
        { key: 'a', ts: 1 },
        { key: 'b', ts: 2 },
      ])
    );
    assert.notEqual(
      planFingerprint(p),
      planFingerprint([
        { key: 'a', ts: 1 },
        { key: 'b', ts: 3 },
      ])
    );
    assert.notEqual(planFingerprint(p), planFingerprint([{ key: 'a', ts: 1 }]));
    assert.equal(planFingerprint(null), '');
    assert.equal(planFingerprint([]), '');
  });
});

describe('triggersSupported', () => {
  test('false in node (no Notification API)', () => {
    assert.equal(triggersSupported(), false);
  });
});

describe('state slice', () => {
  test('alertTriggerStatus is ephemeral — never in PERSISTED_KEYS', () => {
    assert.ok(!PERSISTED_KEYS.includes('alertTriggerStatus'));
  });

  test('ALERT_TRIGGER_STATUS sanitizes mode/count; garbage cannot corrupt', () => {
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'triggers', count: 6 }));
    assert.deepEqual(store.getState().alertTriggerStatus, { mode: 'triggers', count: 6 });
    store.dispatch(actions.setAlertTriggerStatus({ mode: '<script>', count: -5 }));
    assert.deepEqual(store.getState().alertTriggerStatus, { mode: 'unknown', count: 0 });
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 1e9 }));
    assert.deepEqual(store.getState().alertTriggerStatus, { mode: 'tab', count: 64 });
    store.dispatch(actions.setAlertTriggerStatus(null));
    assert.deepEqual(store.getState().alertTriggerStatus, { mode: 'unknown', count: 0 });
    store.dispatch(actions.setAlertTriggerStatus({ mode: 'off', count: 0 }));
    assert.deepEqual(store.getState().alertTriggerStatus, { mode: 'off', count: 0 });
  });
});

describe('sw.js mirror gates (classic worker cannot import ES modules)', () => {
  test('sw.js carries the scheduling message handler and the periodicsync handler', () => {
    assert.ok(swSource.includes("'schedule-prayer-triggers'"), 'message handler missing');
    assert.ok(swSource.includes('schedule-prayer-triggers-result'), 'reply missing');
    assert.ok(
      swSource.includes("addEventListener('periodicsync'"),
      'periodicsync listener missing'
    );
    assert.ok(swSource.includes("'prayer-alert-sync'"), 'sync tag missing');
  });

  test('sw.js arms real timestamped triggers and cancels stale ones', () => {
    assert.ok(swSource.includes('TimestampTrigger'), 'showTrigger arm missing');
    assert.ok(swSource.includes('includeTriggered'), 'stale-trigger cancellation missing');
  });

  test('sw.js stores the plan in IndexedDB under the dedicated db', () => {
    assert.ok(swSource.includes("ALERT_DB = 'nur-alerts'"), 'alert IDB missing');
    assert.ok(
      swSource.includes('alertKvPut(') && swSource.includes('alertKvGet('),
      'kv helpers missing'
    );
  });

  test('sw.js inline mirrors exist and are marked keep-in-sync', () => {
    assert.ok(swSource.includes('inline mirrors of js/alertTriggers.js'), 'mirror marker missing');
    assert.ok(swSource.includes('function sanitizePlan('), 'sanitizePlan mirror missing');
    assert.ok(swSource.includes('function selectDueAlerts('), 'selectDueAlerts mirror missing');
    assert.ok(swSource.includes('function pruneFiredMap('), 'pruneFiredMap mirror missing');
    // Mirror constants must match the module's contract.
    assert.ok(swSource.includes('15 * 60 * 1000'), 'MAX_LATENESS mirror missing');
    assert.ok(swSource.includes('48 * 60 * 60 * 1000'), 'fired-map age mirror missing');
  });

  test('the alertTriggers module is in the SW precache shell', () => {
    assert.ok(
      /'js\/services\/alertTriggers\.js'/.test(swSource),
      'APP_SHELL missing alertTriggers.js'
    );
  });
});

describe('i18n keys exist in both languages', () => {
  test('reliability status keys ship EN + AR', () => {
    for (const key of [
      'prayer.reliabilityArmed',
      'prayer.reliabilityTab',
      'prayer.reliabilityPermission',
      'prayer.enableNotifications',
      'prayer.notifGranted',
      'prayer.notifDenied',
    ]) {
      const count = i18nSource.split(`'${key}'`).length - 1;
      assert.equal(count, 2, `${key} must appear exactly twice (EN + AR), found ${count}`);
    }
  });
});
