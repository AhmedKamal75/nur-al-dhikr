/**
 * tests/reminderPresets.test.js — Jumu'ah + daily-verse presets (v5.2.0).
 * Date math, recurrence shape, dedupe, and null-safety. Pure domain.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_VERSE_PRESET_ID,
  JUMUAH_PRESET_ID,
  dailyVerseReminder,
  dayKey,
  fridayAnchor,
  hasPreset,
  jumuahNote,
} from '../js/domain/reminderPresets.js';
import { appliesToDate } from '../js/services/calendarNotes.js';

test('fridayAnchor lands on the most recent Friday (or today)', () => {
  assert.equal(fridayAnchor('2026-09-04'), '2026-09-04'); // a Friday
  assert.equal(fridayAnchor('2026-09-05'), '2026-09-04'); // Saturday
  assert.equal(fridayAnchor('2026-09-07'), '2026-09-04'); // Monday
  assert.equal(fridayAnchor('2026-09-10'), '2026-09-04'); // Thursday
  assert.equal(fridayAnchor('2026-09-11'), '2026-09-11'); // next Friday
  assert.equal(fridayAnchor('garbage'), null);
});

test('jumuah note recurs every Friday via the existing interval rule', () => {
  const note = jumuahNote('2026-09-07', { title: 'Jumuah', body: 'Read Al-Kahf' });
  assert.equal(note.id, JUMUAH_PRESET_ID);
  assert.equal(note.recurrence, 'interval');
  assert.equal(note.intervalDays, 7);
  assert.equal(note.reminder, true);
  // Fires this Friday, next Friday, and never on a Saturday.
  assert.equal(appliesToDate(note, '2026-09-11'), true);
  assert.equal(appliesToDate(note, '2026-09-18'), true);
  assert.equal(appliesToDate(note, '2026-09-12'), false);
  assert.equal(appliesToDate(note, '2026-09-10'), false); // before anchor
  assert.equal(jumuahNote('2026-09-07', {}), null);
});

test('daily verse reminder is a valid daily scheduler entry', () => {
  const r = dailyVerseReminder({ label: 'Daily verse', body: 'Open it' });
  assert.equal(r.id, DAILY_VERSE_PRESET_ID);
  assert.equal(r.time, '08:00');
  assert.equal(r.targetView, '#/');
  assert.equal(r.enabled, true);
  assert.equal(dailyVerseReminder({}), null);
});

test('hasPreset dedupes by stable id', () => {
  assert.equal(hasPreset([{ id: JUMUAH_PRESET_ID }], JUMUAH_PRESET_ID), true);
  assert.equal(hasPreset([], JUMUAH_PRESET_ID), false);
  assert.equal(hasPreset(null, JUMUAH_PRESET_ID), false);
});

test('dayKey formats local dates', () => {
  assert.equal(dayKey(new Date(2026, 8, 4, 23, 59)), '2026-09-04');
});
