import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  pagesReadToday,
  readingStreak,
  prayersLoggedToday,
  sadaqahGivenToday,
  sanitizeSadaqahLog,
  fastedToday,
  worshipTodayRows,
} from '../js/domain/worship.js';
import { toHijri } from '../js/domain/calendar.js';
import { dateKey, addDays } from '../js/core/utils.js';

/**
 * The combined worship aggregation, pure: every source degrades to zeros
 * on hostile input, and the streak walks only days with pages > 0.
 */

const TODAY = new Date(2026, 7, 29); // Saturday Aug 29 2026
const KEY = (d) => dateKey(d);

function historyFor(days) {
  // days: { offsetFromToday: pages }
  const out = {};
  for (const [off, pages] of Object.entries(days)) {
    out[KEY(addDays(TODAY, Number(off)))] = { recitations: 0, sessions: 0, itemIds: [], pages };
  }
  return out;
}

describe('prayers logged today', () => {
  test('counts the five fard prayers, tri-state aware', () => {
    const entry = {
      fajr: 'jamaah',
      dhuhr: 'prayed',
      asr: true, // legacy boolean normalizes to prayed
      maghrib: undefined,
      isha: false,
      morningAdhkar: true, // non-prayer keys don't count
    };
    assert.deepEqual(prayersLoggedToday(entry), { count: 3, jamaah: 1 });
    assert.deepEqual(prayersLoggedToday(null), { count: 0, jamaah: 0 });
    assert.deepEqual(prayersLoggedToday('x'), { count: 0, jamaah: 0 });
  });
});

describe('pages today + reading streak', () => {
  test('pagesReadToday reads only today, defensively', () => {
    const history = historyFor({ 0: 5, [-1]: 12 });
    assert.equal(pagesReadToday(history, TODAY), 5);
    assert.equal(pagesReadToday({}, TODAY), 0);
    assert.equal(pagesReadToday(null, TODAY), 0);
    assert.equal(pagesReadToday({ [KEY(TODAY)]: 'junk' }, TODAY), 0);
    assert.equal(pagesReadToday({ [KEY(TODAY)]: { pages: -3 } }, TODAY), 0);
    assert.equal(pagesReadToday({ [KEY(TODAY)]: { pages: 2.9 } }, TODAY), 2);
  });

  test('readingStreak walks consecutive reading days', () => {
    const history = historyFor({ 0: 3, [-1]: 4, [-2]: 1, [-3]: 0, [-4]: 9 });
    assert.equal(readingStreak(history, TODAY), 3);
  });

  test('an unread morning does not break yesterday\u2019s streak', () => {
    const history = historyFor({ [-1]: 4, [-2]: 1 });
    assert.equal(readingStreak(history, TODAY), 2);
  });

  test('streak caps hostile history and survives junk', () => {
    assert.equal(readingStreak(null, TODAY), 0);
    assert.equal(readingStreak('x', TODAY), 0);
    const huge = {};
    for (let i = 1; i <= 4000; i++) huge[KEY(addDays(TODAY, -i))] = { pages: 1 };
    assert.equal(readingStreak(huge, TODAY), 3650, 'bounded walk');
  });
});

describe('sadaqah quick-log', () => {
  const log = [
    { id: 'a', ts: new Date(2026, 7, 29, 10).getTime(), note: '' },
    { id: 'b', ts: new Date(2026, 7, 29, 9).getTime(), note: 'for the masjid' },
    { id: 'c', ts: new Date(2026, 7, 28).getTime(), note: '' },
  ];

  test('givenToday counts only today\u2019s entries', () => {
    assert.equal(sadaqahGivenToday(log, TODAY), 2);
    assert.equal(sadaqahGivenToday(log, new Date(2026, 7, 28)), 1);
    assert.equal(sadaqahGivenToday([], TODAY), 0);
    assert.equal(sadaqahGivenToday(null, TODAY), 0);
    assert.equal(sadaqahGivenToday('x', TODAY), 0);
  });

  test('sanitize keeps timestamped entries, sorts newest first, caps', () => {
    const clean = sanitizeSadaqahLog([
      { id: 'b', ts: 2, note: 'x'.repeat(500) },
      { ts: 3, note: 'no id' },
      { id: 'old', ts: 1 },
      null,
      'junk',
      { id: 'no-ts' },
    ]);
    assert.deepEqual(
      clean.map((e) => e.ts),
      [3, 2, 1]
    );
    assert.equal(clean[1].id, 'b');
    assert.equal(clean[0].id, 'sadaqah-3', 'missing id falls back to ts-based');
    assert.equal(clean[1].note.length, 200, 'note clamped');
    const many = Array.from({ length: 600 }, (_, i) => ({ id: `s${i}`, ts: i }));
    assert.equal(sanitizeSadaqahLog(many).length, 500);
    assert.deepEqual(sanitizeSadaqahLog(null), []);
  });
});

describe('fastedToday reads the shared fasting log', () => {
  test('matches whatever the fasting/Ramadan panels would write', () => {
    const h = toHijri(TODAY);
    const key = `${h.year}-${h.month}`;
    assert.equal(fastedToday({ [key]: { [String(h.day)]: true } }, TODAY), true);
    assert.equal(fastedToday({ [key]: { [String(h.day)]: false } }, TODAY), false);
    assert.equal(fastedToday({}, TODAY), false);
    assert.equal(fastedToday(null, TODAY), false);
  });
});

describe('worshipTodayRows aggregation', () => {
  test('builds the five rows with honest done flags', () => {
    const input = {
      statistics: { dailyHistory: historyFor({ 0: 4, [-1]: 6, [-2]: 2 }) },
      dailyChecklist: {
        [KEY(TODAY)]: { fajr: 'jamaah', dhuhr: 'prayed', asr: 'prayed' },
      },
      ramadanLog: {},
      sadaqahLog: [{ id: 'a', ts: TODAY.getTime(), note: '' }],
    };
    const rows = worshipTodayRows(input, TODAY);
    assert.deepEqual(
      rows.map((r) => r.id),
      ['prayers', 'quran', 'dhikr', 'fasting', 'sadaqah']
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.deepEqual([byId.prayers.count, byId.prayers.total], [3, 5]);
    assert.equal(byId.prayers.done, false);
    assert.deepEqual([byId.quran.count, byId.quran.streak], [4, 3]);
    assert.equal(byId.quran.done, true);
    assert.deepEqual([byId.dhikr.count, byId.dhikr.done], [0, false]);
    assert.deepEqual([byId.fasting.done, byId.sadaqah.count], [false, 1]);
    assert.equal(byId.sadaqah.done, true);
  });

  test('fully hostile input yields five zeroed rows, never throws', () => {
    for (const bad of [null, undefined, 42, 'x']) {
      const rows = worshipTodayRows(bad, TODAY);
      assert.equal(rows.length, 5);
      assert.ok(rows.every((r) => r.count === 0 && r.done === false));
    }
  });
});
