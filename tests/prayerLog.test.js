/**
 * tests/prayerLog.test.js — tri-state five-prayer log (pure module)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRAYER_KEYS,
  cycleState,
  prayerState,
  loggedCount,
  dayComplete,
  prayerStreak,
  prayerWeek,
  prayerMonthCount,
} from '../js/prayerLog.js';

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const at = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);

function fullDay(kind = 'prayed') {
  const o = {};
  for (const k of PRAYER_KEYS) o[k] = kind;
  return o;
}

test('PRAYER_KEYS lists the five fard prayers in day order (no sunrise)', () => {
  assert.deepEqual([...PRAYER_KEYS], ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
});

test('cycleState: unset → prayed → jamaah → unset', () => {
  assert.equal(cycleState(undefined), 'prayed');
  assert.equal(cycleState(null), 'prayed');
  assert.equal(cycleState(false), 'prayed');
  assert.equal(cycleState('prayed'), 'jamaah');
  assert.equal(cycleState(true), 'jamaah'); // legacy checklist boolean
  assert.equal(cycleState('jamaah'), null);
});

test('prayerState normalizes legacy and unknown values honestly', () => {
  assert.equal(prayerState({ fajr: 'jamaah' }, 'fajr'), 'jamaah');
  assert.equal(prayerState({ fajr: 'prayed' }, 'fajr'), 'prayed');
  assert.equal(prayerState({ fajr: true }, 'fajr'), 'prayed'); // pre-v3.0 data
  assert.equal(prayerState({ fajr: 'whatever' }, 'fajr'), 'prayed'); // truthy → prayed
  assert.equal(prayerState({ fajr: false }, 'fajr'), null);
  assert.equal(prayerState({}, 'fajr'), null);
  assert.equal(prayerState(null, 'fajr'), null);
});

test('loggedCount counts only the five fard prayers', () => {
  const day = { fajr: true, dhuhr: 'prayed', asr: 'jamaah', sunrise: true, quran: true };
  assert.equal(loggedCount(day), 3); // sunrise/quran excluded
  assert.equal(loggedCount(fullDay()), 5);
  assert.equal(loggedCount({}), 0);
  assert.equal(loggedCount(null), 0);
});

test('dayComplete requires all five, however they were logged', () => {
  assert.equal(dayComplete(fullDay('prayed')), true);
  assert.equal(dayComplete(fullDay('jamaah')), true);
  const missing = fullDay();
  delete missing.isha;
  assert.equal(dayComplete(missing), false);
  // Non-prayer keys never complete a day.
  assert.equal(dayComplete({ fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1, quran: 1 }), true);
});

test('prayerStreak: incomplete today does not break a streak through yesterday', () => {
  const log = {
    [iso(2026, 8, 21)]: fullDay(),
    [iso(2026, 8, 22)]: fullDay(),
    [iso(2026, 8, 23)]: fullDay('jamaah'),
    [iso(2026, 8, 24)]: { fajr: 'prayed' }, // today, partial
  };
  assert.equal(prayerStreak(log, at(2026, 8, 24)), 3);
});

test('prayerStreak: complete today extends the streak', () => {
  const log = {
    [iso(2026, 8, 23)]: fullDay(),
    [iso(2026, 8, 24)]: fullDay(),
  };
  assert.equal(prayerStreak(log, at(2026, 8, 24)), 2);
});

test('prayerStreak: zero when nothing qualifies', () => {
  assert.equal(prayerStreak({}, at(2026, 8, 24)), 0);
  assert.equal(prayerStreak(null, at(2026, 8, 24)), 0);
});

test('prayerWeek: seven days oldest-first with per-prayer states', () => {
  const log = { [iso(2026, 8, 24)]: { fajr: 'jamaah', dhuhr: 'prayed' } };
  const week = prayerWeek(log, 7, at(2026, 8, 24));
  assert.equal(week.length, 7);
  assert.equal(week[6].dateKey, iso(2026, 8, 24)); // today last
  assert.equal(week[6].count, 2);
  assert.equal(week[6].states.fajr, 'jamaah');
  assert.equal(week[6].states.isha, null);
  assert.equal(week[0].count, 0);
  assert.equal(
    week.every((d) => d.total === 5),
    true
  );
});

test('prayerWeek: legacy true values read as prayed', () => {
  const log = { [iso(2026, 8, 24)]: { fajr: true } };
  const week = prayerWeek(log, 1, at(2026, 8, 24));
  assert.equal(week[0].states.fajr, 'prayed');
});

test('prayerMonthCount sums only the focused calendar month', () => {
  const log = {
    [iso(2026, 8, 1)]: fullDay(),
    [iso(2026, 8, 24)]: { fajr: 'prayed', dhuhr: 'jamaah' },
    [iso(2026, 7, 31)]: fullDay(), // previous month — excluded
  };
  assert.equal(prayerMonthCount(log, at(2026, 8, 24)), 7);
  assert.equal(prayerMonthCount(log, at(2026, 7, 31)), 5);
  assert.equal(prayerMonthCount({}, at(2026, 8, 24)), 0);
});
