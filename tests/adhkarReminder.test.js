/**
 * adhkarReminder.test.js (v5.17.188, C18) — the adhkar window reminders:
 * opt-in per window, once per day per window at window start + lead
 * (default 30 min), quiet-hours cancel, silent rather than late when the
 * window has closed or times can't be computed, clock fallback without a
 * location, high-latitude wrap.
 *
 * Each scheduler test uses its OWN calendar date: the module-level
 * day-fired cache is per-day, so sharing a date across tests would leak
 * dedup state between them.
 * Run: node --test tests/adhkarReminder.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { tickForTests, wasDayFired } from '../js/services/notifications.js';
import {
  adhkarReminderState,
  adhkarWindowTimes,
  MORNING_WINDOW,
  EVENING_WINDOW,
} from '../js/domain/adhkarTiming.js';
import { calculateTimes } from '../js/domain/prayer.js';
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

// Plain mid-August days; hours are local clock time.
const mkDay = (d) => (h, m) => new Date(2026, 7, d, h, m, 0, 0);

const LOC = { latitude: 30.04, longitude: 31.24, method: 'MWL', asr: 'Standard', alerts: {} };

// The REAL computed sun times for a date (what the scheduler will use).
function sunFor(date) {
  return calculateTimes({
    date,
    latitude: LOC.latitude,
    longitude: LOC.longitude,
    timezoneOffsetHours: -date.getTimezoneOffset() / 60,
    method: LOC.method,
    asr: LOC.asr,
  });
}

// Minute-of-day based date construction: new Date(y, m, d, h, 60)
// silently rolls into the next hour, which once put a "4:60" tick past a
// 05:00 quiet-hours boundary and fired when it should have been cancelled.
const atMin = (day) => (mins) => {
  const base = day(0, 0);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, mins, 0, 0);
};

test('window bounds: sun times with a location, clock windows without', () => {
  const SUN = { fajr: 4.5, dhuhr: 11.75, asr: 15, isha: 19.25 };
  assert.deepEqual(adhkarWindowTimes('morning', SUN), { start: 4.5, end: 11.75 });
  assert.deepEqual(adhkarWindowTimes('evening', SUN), { start: 15, end: 19.25 });
  assert.deepEqual(adhkarWindowTimes('morning', null), {
    start: MORNING_WINDOW.startHour,
    end: MORNING_WINDOW.endHour,
  });
  assert.deepEqual(adhkarWindowTimes('evening', null), {
    start: EVENING_WINDOW.startHour,
    end: EVENING_WINDOW.endHour,
  });
  // Uncomputable sun times fall back to the clock windows in the helper…
  assert.deepEqual(adhkarWindowTimes('morning', { fajr: NaN }), {
    start: MORNING_WINDOW.startHour,
    end: MORNING_WINDOW.endHour,
  });
  // …and an unknown window name stays silent.
  assert.equal(adhkarWindowTimes('night', SUN), null);
  assert.equal(adhkarReminderState('night', mkDay(15)(10, 0), SUN, 30), null);
});

test('boundary: due exactly at window start + lead, pending one minute before', () => {
  installFakes();
  const day = mkDay(16);
  try {
    const appSettings = { adhkarReminders: { morning: true, evening: false, lead: 30 } };
    // No location → clock window 4:00–12:00, fire at 4:30.
    tickForTests([], 'en', [], null, [], null, appSettings, day(4, 29));
    assert.equal(shown.length, 0);
    tickForTests([], 'en', [], null, [], null, appSettings, day(4, 30));
    assert.equal(shown.length, 1);
    assert.match(shown[0].body, /Morning adhkar/);
    // Lead 0 fires at the window start itself.
    shown.length = 0;
    const atStart = { adhkarReminders: { morning: false, evening: true, lead: 0 } };
    tickForTests([], 'en', [], null, [], null, atStart, day(14, 59));
    assert.equal(shown.length, 0);
    tickForTests([], 'en', [], null, [], null, atStart, day(15, 0));
    assert.equal(shown.length, 1);
  } finally {
    removeFakes();
  }
});

test('dedup: one fire per window per day across repeated ticks', () => {
  installFakes();
  const day = mkDay(17);
  try {
    const appSettings = { adhkarReminders: { morning: true, evening: true, lead: 30 } };
    for (const m of [30, 31, 45, 90]) {
      tickForTests([], 'en', [], null, [], null, appSettings, day(4, m));
    }
    assert.equal(shown.length, 1);
    const key = dateKey(day(4, 30));
    assert.equal(wasDayFired(`adhkar-morning|${key}`, key), true);
    // The evening window is a separate fire key.
    tickForTests([], 'en', [], null, [], null, appSettings, day(15, 30));
    assert.equal(shown.length, 2);
  } finally {
    removeFakes();
  }
});

test('follows the sun with a location; silent once the window has closed', () => {
  installFakes();
  const day = mkDay(18);
  try {
    const sun = sunFor(day(12, 0));
    const appSettings = { adhkarReminders: { morning: true, evening: true, lead: 30 } };
    const fireMin = Math.floor((sun.fajr + 0.5) * 60) + 2;
    // One minute before the sun-based fire time: pending (the clock
    // fallback's 4:30 has already passed — proof the sun won).
    tickForTests([], 'en', [], LOC, [], null, appSettings, day(4, 45));
    assert.equal(shown.length, 0);
    tickForTests([], 'en', [], LOC, [], null, appSettings, atMin(day)(fireMin));
    assert.equal(shown.length, 1);
    // Evening opened at asr and closed at isha; after isha the window is
    // closed — silent rather than late, and nothing is marked fired.
    shown.length = 0;
    const eveningOnly = { adhkarReminders: { morning: false, evening: true, lead: 30 } };
    const lateMin = Math.floor((sun.isha + 0.75) * 60);
    tickForTests([], 'en', [], LOC, [], null, eveningOnly, atMin(day)(lateMin));
    assert.equal(shown.length, 0);
    assert.equal(wasDayFired(`adhkar-evening|${dateKey(day(12, 0))}`, dateKey(day(12, 0))), false);
  } finally {
    removeFakes();
  }
});

test('quiet hours cancel (opt-in), including quiet hours crossing midnight', () => {
  installFakes();
  const day = mkDay(19);
  try {
    const sun = sunFor(day(12, 0));
    const appSettings = { adhkarReminders: { morning: true, evening: false, lead: 0 } };
    const fireMin = Math.floor(sun.fajr * 60) + 1;
    // Quiet 22:00–05:30 crosses midnight; the morning fire lands inside it.
    const quiet = {
      ...LOC,
      quietEnabled: true,
      quietStart: '22:00',
      quietEnd: '05:30',
      quietCancels: true,
    };
    tickForTests([], 'en', [], quiet, [], null, appSettings, atMin(day)(fireMin));
    assert.equal(shown.length, 0);
    // Not marked fired: quiet ends at 5:30 and the window is still open
    // (runs to dhuhr), so it fires then.
    tickForTests([], 'en', [], quiet, [], null, appSettings, atMin(day)(5 * 60 + 31));
    assert.equal(shown.length, 1);
  } finally {
    removeFakes();
  }
});

test('quietCancels off (default): quiet hours do not touch adhkar alerts', () => {
  installFakes();
  const day = mkDay(20);
  try {
    const sun = sunFor(day(12, 0));
    const appSettings = { adhkarReminders: { morning: true, evening: false, lead: 0 } };
    const fireMin = Math.floor(sun.fajr * 60) + 1;
    const loud = { ...LOC, quietEnabled: true, quietStart: '22:00', quietEnd: '05:00' };
    tickForTests([], 'en', [], loud, [], null, appSettings, atMin(day)(fireMin));
    assert.equal(shown.length, 1);
  } finally {
    removeFakes();
  }
});

test('high-latitude wrap: evening window open past midnight fires and closes correctly', () => {
  // Summer at polar latitudes: Isha folds to 25.5 (= 1:30 next clock day).
  const wrapped = { fajr: 2.1, dhuhr: 12, asr: 18.5, isha: 25.5 };
  const day = mkDay(21);
  assert.equal(adhkarReminderState('evening', day(18, 50), wrapped, 30), 'pending');
  assert.equal(adhkarReminderState('evening', day(19, 0), wrapped, 30), 'due');
  // 01:00 next clock day: the window is still open (closes 1:30) and the
  // fire time is behind us — due (fires under the NEW day's key, so the
  // coming evening's own fire is consumed: still once per day).
  assert.equal(adhkarReminderState('evening', day(1, 0), wrapped, 30), 'due');
  // 01:45: the wrapped window has closed, and today's own window opens at
  // 18:30 — pending for today, never a late fire for yesterday.
  assert.equal(adhkarReminderState('evening', day(1, 45), wrapped, 30), 'pending');
});

test('polar-unreachable boundaries stay silent behind a configured location', () => {
  installFakes();
  try {
    // 21 June at 68N: the engine marks fajr and isha unreachable (the
    // sun never clears/depresses the angle). The scheduler must stay
    // silent — never fall back to the clock windows behind a configured
    // location's back (times.unreachable, the flag the prayer path uses).
    const polar = { ...LOC, latitude: 68, longitude: 18 };
    const june21 = (h, m) => new Date(2026, 5, 21, h, m, 0, 0);
    const probe = sunFor(june21(12, 0)) && null; // date sanity only
    void probe;
    const both = { adhkarReminders: { morning: true, evening: true, lead: 0 } };
    // Clock fallback would fire morning at 4:00 and evening at 15:00 —
    // with unreachable sun boundaries neither may fire.
    tickForTests([], 'en', [], polar, [], null, both, june21(4, 1));
    tickForTests([], 'en', [], polar, [], null, both, june21(15, 1));
    tickForTests([], 'en', [], polar, [], null, both, june21(18, 1));
    assert.equal(shown.length, 0);
    // Disabled toggles / missing settings are a plain no-op.
    const off = { adhkarReminders: { morning: false, evening: false, lead: 30 } };
    tickForTests([], 'en', [], null, [], null, off, mkDay(22)(5, 0));
    tickForTests([], 'en', [], null, [], null, {}, mkDay(22)(5, 0));
    assert.equal(shown.length, 0);
  } finally {
    removeFakes();
  }
});

test('garbage settings never throw inside the tick', () => {
  installFakes();
  const day = mkDay(23);
  try {
    tickForTests([], 'en', [], null, [], null, { adhkarReminders: 'yes' }, day(5, 0));
    tickForTests([], 'en', [], null, [], null, { adhkarReminders: { morning: 1 } }, day(5, 0));
    tickForTests(
      [],
      'en',
      [],
      null,
      [],
      null,
      { adhkarReminders: { morning: true, lead: 'banana' } },
      day(4, 45)
    );
    // 'banana' lead falls back to the 30-minute default → due at 4:30+.
    assert.equal(shown.length, 1);
  } finally {
    removeFakes();
  }
});
