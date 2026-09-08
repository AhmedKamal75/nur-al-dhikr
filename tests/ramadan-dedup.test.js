/**
 * ramadan-dedup.test.js — B5 regression: a reload inside the suhoor/iftar
 * catch-up window must not re-fire the adhan. Simulated by loading two
 * fresh module instances sharing one localStorage (a "reload" wipes the
 * in-memory Set but keeps the persisted day-dedup).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.TZ = 'UTC';

import { toHijri } from '../js/domain/calendar.js';
import { calculateTimes, formatClock } from '../js/domain/prayer.js';
import { ramadanAlertTimes } from '../js/domain/ramadan.js';

function installStubs() {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
  const shown = [];
  class FakeNotification {
    static permission = 'granted';

    constructor(title, opts) {
      shown.push({ title, opts });
      this.onclick = null;
    }

    close() {}
  }
  globalThis.Notification = FakeNotification;
  globalThis.window = { Notification: FakeNotification, focus: () => {} };
  // Adhan audio never plays in the test: hidden tab skips playAlert.
  globalThis.document = { visibilityState: 'hidden' };
  return shown;
}

function installFakeDate(ts) {
  const RealDate = Date;
  let nowTs = ts;
  class FakeDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [nowTs]));
    }

    static now() {
      return nowTs;
    }
  }
  globalThis.Date = FakeDate;
  return {
    set: (t) => {
      nowTs = t;
    },
    restore: () => {
      globalThis.Date = RealDate;
    },
  };
}

function findRamadanNoonUTC() {
  for (let d = 1; d <= 60; d += 1) {
    const noon = new Date(Date.UTC(2026, 1, d, 12, 0));
    if (toHijri(noon).month === 9) return noon;
  }
  throw new Error('no Ramadan day found in scan window');
}

test('B5: suhoor adhan fires once across a reload in the catch-up window', async () => {
  const shown = installStubs();
  const noon = findRamadanNoonUTC();
  const y = noon.getUTCFullYear();
  const m = noon.getUTCMonth();
  const d = noon.getUTCDate();

  const prayerBase = {
    latitude: 21.4225,
    longitude: 39.8262,
    method: 'MWL',
    asr: 'Standard',
    alerts: {},
    ramadanAlerts: { suhoor: true, iftar: false, suhoorOffset: 30 },
  };

  // Compute the suhoor wall clock with the same engine the scheduler uses.
  const times = calculateTimes({
    date: new Date(Date.UTC(y, m, d, 12, 0)),
    latitude: prayerBase.latitude,
    longitude: prayerBase.longitude,
    timezoneOffsetHours: 0,
    method: 'MWL',
    asr: 'Standard',
  });
  const suhoorClock = formatClock(ramadanAlertTimes(times, 30).suhoor, false);
  const [hh, mm] = suhoorClock.split(':').map(Number);
  const atSuhoor = Date.UTC(y, m, d, hh, mm, 0);

  const clock = installFakeDate(atSuhoor);
  try {
    const modA = await import('../js/services/notifications.js?b5-a');
    modA.tickForTests([], 'en', [], prayerBase, [], null);
    assert.equal(shown.length, 1);

    // "Reload": a fresh module instance (empty in-memory Set) sharing the
    // same persisted localStorage, same minute.
    clock.set(atSuhoor + 30 * 1000);
    const modB = await import('../js/services/notifications.js?b5-b');
    modB.tickForTests([], 'en', [], prayerBase, [], null);
    assert.equal(shown.length, 1);
  } finally {
    clock.restore();
    delete globalThis.localStorage;
    delete globalThis.Notification;
    delete globalThis.window;
    delete globalThis.document;
  }
});
