/**
 * tests/calendarRecurrence.test.js — item 12 (calendar recurrence) gates:
 *  1. weekly/monthly/yearly match calendar fields (short months skip, Feb
 *     29 keeps leap years), floored at startDate and capped by endDate;
 *  2. hijri-monthly repeats the anchor Hijri day; whitedays fire on
 *     13/14/15 via isWhiteDay — both through the tabular converter;
 *  3. old types and hostile input are unchanged (safe defaults);
 *  4. the note form offers all nine types with the shared bounded
 *     end-date input; the submit path reads it; strings ship EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { appliesToDate, RECURRENCE_TYPES } from '../js/services/calendarNotes.js';
import { toHijri, isWhiteDay } from '../js/domain/calendar.js';
import { buildNoteForm } from '../js/ui/calendarModals.js';

function keyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** First date on/after `from` whose Hijri day-of-month equals `want`. */
function findHijriDay(from, want, limit = 60) {
  for (let i = 0; i < limit; i += 1) {
    const key = addDays(from, i);
    if (toHijri(new Date(key + 'T00:00:00')).day === want) return key;
  }
  throw new Error(`no Hijri day ${want} near ${from}`);
}

describe('RECURRENCE_TYPES: nine documented types', () => {
  test('lists old + new in order', () => {
    assert.deepEqual(
      [...RECURRENCE_TYPES],
      [
        'once',
        'daily',
        'interval',
        'range',
        'weekly',
        'monthly',
        'yearly',
        'hijri-monthly',
        'whitedays',
      ]
    );
  });
});

describe('weekly/monthly/yearly: calendar-field matching', () => {
  test('weekly follows the startDate weekday', () => {
    const note = { startDate: '2026-09-07', recurrence: 'weekly' }; // a Monday
    assert.equal(appliesToDate(note, '2026-09-14'), true);
    assert.equal(appliesToDate(note, '2026-09-21'), true);
    assert.equal(appliesToDate(note, '2026-09-15'), false);
    assert.equal(appliesToDate(note, '2026-09-06'), false, 'floored at start');
  });

  test('monthly follows the month-day; short months skip', () => {
    const note = { startDate: '2026-01-31', recurrence: 'monthly' };
    assert.equal(appliesToDate(note, '2026-03-31'), true);
    assert.equal(appliesToDate(note, '2026-02-28'), false, 'no phantom 28th');
    assert.equal(appliesToDate(note, '2026-01-31'), true, 'anchor fires');
  });

  test('yearly follows month+day; Feb 29 keeps leap years', () => {
    const note = { startDate: '2024-02-29', recurrence: 'yearly' };
    assert.equal(appliesToDate(note, '2028-02-29'), true);
    assert.equal(appliesToDate(note, '2026-02-28'), false);
    assert.equal(appliesToDate(note, '2028-03-01'), false);
    const plain = { startDate: '2026-05-10', recurrence: 'yearly' };
    assert.equal(appliesToDate(plain, '2027-05-10'), true);
    assert.equal(appliesToDate(plain, '2027-05-11'), false);
  });

  test('new types honor the endDate cap', () => {
    assert.equal(
      appliesToDate(
        { startDate: '2026-09-07', recurrence: 'weekly', endDate: '2026-09-10' },
        '2026-09-14'
      ),
      false
    );
    assert.equal(
      appliesToDate(
        { startDate: '2026-01-31', recurrence: 'monthly', endDate: '2026-12-31' },
        '2026-03-31'
      ),
      true
    );
    assert.equal(
      appliesToDate(
        { startDate: '2026-05-10', recurrence: 'yearly', endDate: '2026-05-10' },
        '2027-05-10'
      ),
      false
    );
  });
});

describe('hijri-monthly/whitedays: tabular Hijri matching', () => {
  test('hijri-monthly repeats the anchor Hijri day', () => {
    const anchor = '2026-09-01';
    const anchorDay = toHijri(new Date(anchor + 'T00:00:00')).day;
    const note = { startDate: anchor, recurrence: 'hijri-monthly' };
    const next = findHijriDay(addDays(anchor, 20), anchorDay);
    assert.ok(next > anchor, 'found the next Hijri month');
    assert.equal(appliesToDate(note, next), true);
    const other = findHijriDay(addDays(anchor, 1), anchorDay === 1 ? 2 : 1);
    assert.equal(appliesToDate(note, other), false, 'other Hijri days stay quiet');
    assert.equal(
      appliesToDate({ ...note, endDate: anchor }, next),
      false,
      'endDate caps Hijri matches'
    );
  });

  test('whitedays fire exactly on 13/14/15', () => {
    const note = { startDate: '2026-01-01', recurrence: 'whitedays' };
    for (const day of [13, 14, 15]) {
      const key = findHijriDay('2026-09-01', day);
      assert.ok(isWhiteDay(toHijri(new Date(key + 'T00:00:00')).day), 'sanity: test helper agrees');
      assert.equal(appliesToDate(note, key), true, `${key} is a White Day`);
    }
    const plain = findHijriDay('2026-09-01', 10);
    assert.equal(appliesToDate(note, plain), false, 'the 10th stays quiet');
    assert.equal(appliesToDate(note, '2025-12-31'), false, 'floored at startDate');
  });
});

describe('old types and hostile input are unchanged', () => {
  test('once/daily/interval/range keep their semantics', () => {
    assert.equal(
      appliesToDate({ startDate: '2026-05-10', recurrence: 'once' }, '2026-05-10'),
      true
    );
    assert.equal(
      appliesToDate({ startDate: '2026-05-10', recurrence: 'once' }, '2026-05-11'),
      false
    );
    assert.equal(
      appliesToDate(
        { startDate: '2026-05-10', recurrence: 'daily', endDate: '2026-05-12' },
        '2026-05-12'
      ),
      true
    );
    assert.equal(
      appliesToDate(
        { startDate: '2026-05-10', recurrence: 'interval', intervalDays: 3 },
        '2026-05-13'
      ),
      true
    );
    assert.equal(
      appliesToDate(
        { startDate: '2026-05-10', recurrence: 'range', endDate: '2026-05-12' },
        '2026-05-11'
      ),
      true
    );
  });

  test('unknown types and junk degrade to false', () => {
    assert.equal(
      appliesToDate({ startDate: '2026-05-10', recurrence: 'minutely' }, '2026-05-10'),
      false
    );
    assert.equal(appliesToDate(null, '2026-05-10'), false);
    assert.equal(appliesToDate({ recurrence: 'weekly' }, '2026-05-10'), false);
  });
});

describe('note form: nine options, one bounded end-date', () => {
  test('every type is selectable with the shared cap input', () => {
    for (const lang of ['en', 'ar']) {
      const html = buildNoteForm('2026-09-10', null, lang);
      for (const r of RECURRENCE_TYPES) {
        assert.ok(html.includes(`<option value="${r}"`), `${r} option (${lang})`);
      }
      assert.ok(html.includes('name="endDateBounded"'), `bounded input (${lang})`);
    }
    const edit = buildNoteForm(
      '2026-09-10',
      { recurrence: 'monthly', endDate: '2026-12-31' },
      'en'
    );
    assert.ok(edit.includes('<option value="monthly" selected'), 'edit preselects');
    assert.ok(edit.includes('value="2026-12-31"'), 'edit prefill the cap');
  });
});

describe('recurrence wiring: submit, toggle, strings', () => {
  const forms = readFileSync(new URL('../js/app/forms.js', import.meta.url), 'utf8');
  const worship = readFileSync(new URL('../js/app/handlers/worship.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('submit reads the bounded cap; toggle reveals its group', () => {
    assert.ok(forms.includes('endDateBounded'), 'submit must read the shared cap');
    assert.ok(worship.includes('BOUNDED_RECURRENCE'), 'toggle must reveal the shared group');
  });

  test('new recurrence strings ship EN + AR', () => {
    for (const key of [
      'calendar.recurWeekly',
      'calendar.recurMonthly',
      'calendar.recurYearly',
      'calendar.recurHijriMonthly',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
    assert.ok(en.includes("'calendar.whiteDays'"), 'whitedays reuses the White Days label');
  });
});
