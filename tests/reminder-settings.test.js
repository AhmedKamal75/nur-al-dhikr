/**
 * reminder-settings.test.js (v5.2.28) — B-2: the first-class clock
 * settings (Jumu'ah, daily verse, Zakat al-Fitr) persisted since v4.4 now
 * fire through the scheduler. Firing is observed two ways: captured
 * Notifications and the day-persisted dedup keys.
 * Run: node --test tests/reminder-settings.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { tickForTests, wasDayFired } from '../js/services/notifications.js';
import { toGregorian, toHijri } from '../js/domain/calendar.js';
import { dateKey } from '../js/core/utils.js';

const shown = [];

class FakeNotification {
  static permission = 'granted';
  constructor(title, opts) {
    shown.push({ title, ...opts });
    this.onclick = null;
  }
  close() {}
}

function installFakes(storage = {}) {
  shown.length = 0;
  globalThis.Notification = FakeNotification;
  globalThis.window = { Notification: FakeNotification, focus: () => {} };
  globalThis.document = { visibilityState: 'hidden' };
  const mem = { ...storage };
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
  return mem;
}

function removeFakes() {
  delete globalThis.Notification;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
}

// 2026-09-11 is a Friday; the 12th a Saturday.
const friday = (h, m) => new Date(2026, 8, 11, h, m, 0, 0);
const saturday = (h, m) => new Date(2026, 8, 12, h, m, 0, 0);

function ramadanDay(hijriDay, h, m, hijriYear = 1447) {
  const g = toGregorian(hijriYear, 9, hijriDay);
  assert.equal(toHijri(g).month, 9, 'test-date sanity: inside Ramadan');
  return new Date(g.getFullYear(), g.getMonth(), g.getDate(), h, m, 0, 0);
}

test('jumuah: fires Friday in the catch-up window, deduped for the day', () => {
  installFakes();
  try {
    const settings = { jumuahReminder: { enabled: true, time: '09:00' } };
    tickForTests([], 'en', [], null, [], null, settings, friday(9, 1));
    assert.equal(shown.length, 1);
    assert.match(shown[0].title, /Kahf|Jumu/i);
    assert.equal(wasDayFired(`jumuah|${dateKey(friday(9, 1))}`, dateKey(friday(9, 1))), true);
    // Second pass the same morning: dedup, no double notification.
    tickForTests([], 'en', [], null, [], null, settings, friday(9, 1));
    assert.equal(shown.length, 1);
  } finally {
    removeFakes();
  }
});

test('jumuah: silent on Saturdays, when disabled, and on garbage time', () => {
  installFakes();
  try {
    const on = { jumuahReminder: { enabled: true, time: '09:00' } };
    tickForTests([], 'en', [], null, [], null, on, saturday(9, 1));
    assert.equal(shown.length, 0, 'no Friday fire on a Saturday');
    tickForTests(
      [],
      'en',
      [],
      null,
      [],
      null,
      { jumuahReminder: { enabled: false, time: '09:00' } },
      friday(9, 1)
    );
    assert.equal(shown.length, 0, 'disabled never fires');
    // Garbage time degrades to silent (shouldFire never throws).
    tickForTests(
      [],
      'en',
      [],
      null,
      [],
      null,
      { jumuahReminder: { enabled: true, time: 'xx' } },
      friday(9, 1)
    );
    assert.equal(shown.length, 0, 'corrupt time never fires, never throws');
    // Absent settings entirely: no fire, no throw.
    tickForTests([], 'en', [], null, [], null, null, friday(9, 1));
    tickForTests([], 'en', [], null, [], null, {}, friday(9, 1));
    assert.equal(shown.length, 0);
  } finally {
    removeFakes();
  }
});

test('daily verse: fires in-window with a home deep link, deduped', () => {
  installFakes();
  try {
    const settings = { dailyVerseNotification: { enabled: true, time: '08:00' } };
    tickForTests([], 'en', [], null, [], null, settings, saturday(8, 1));
    assert.equal(shown.length, 1, 'day-agnostic: fires any morning');
    tickForTests([], 'en', [], null, [], null, settings, saturday(8, 1));
    assert.equal(shown.length, 1, 'deduped for the day');
    tickForTests(
      [],
      'en',
      [],
      null,
      [],
      null,
      { dailyVerseNotification: { enabled: false, time: '08:00' } },
      saturday(8, 1)
    );
    assert.equal(shown.length, 1, 'disabled stays silent');
  } finally {
    removeFakes();
  }
});

test('zakat al-fitr: fires once on the morning of 28 Ramadan only', () => {
  installFakes();
  try {
    const settings = { zakatFitrReminder: true };
    tickForTests([], 'en', [], null, [], null, settings, ramadanDay(28, 9, 0));
    assert.equal(shown.length, 1);
    assert.match(shown[0].title, /Fitr/i);
    tickForTests([], 'en', [], null, [], null, settings, ramadanDay(28, 9, 0));
    assert.equal(shown.length, 1, 'deduped for the day');
    // Before the 08:00 morning gate: silent.
    tickForTests([], 'en', [], null, [], null, settings, ramadanDay(28, 7, 0));
    assert.equal(shown.length, 1, 'silent before 08:00 on the 28th');
    // Wrong day: silent.
    tickForTests([], 'en', [], null, [], null, settings, ramadanDay(27, 9, 0));
    assert.equal(shown.length, 1, 'silent on the 27th');
    // Disabled: silent.
    tickForTests([], 'en', [], null, [], null, { zakatFitrReminder: false }, ramadanDay(28, 9, 0));
    assert.equal(shown.length, 1, 'disabled stays silent');
  } finally {
    removeFakes();
  }
});
