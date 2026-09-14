/**
 * tests/statsExport.test.js — item 4 (statistics export) gates:
 *  1. buildStatsCSV emits the daily grain oldest-first (header + all four
 *     counters), coercing hostile values and skipping junk/rolled keys;
 *  2. header-only (no trailing newline) when nothing is recorded, so the
 *     handlers can gate the empty toast on the line count;
 *  3. statsCSVFilename is stable and date-stamped;
 *  4. both actions are registered (handlers) and surfaced (sheet rows),
 *     with EN + AR strings.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildStatsCSV, statsCSVFilename } from '../js/domain/statistics.js';
import { dateKey } from '../js/core/utils.js';

describe('buildStatsCSV: daily grain, oldest first', () => {
  test('header plus one row per recorded day, all counters', () => {
    const csv = buildStatsCSV({
      dailyHistory: {
        '2026-05-10': { recitations: 100, sessions: 2, pages: 4, readingSec: 90 },
        '2026-05-08': { recitations: 33, sessions: 1 },
      },
    });
    assert.deepEqual(csv.split('\n'), [
      'date,recitations,sessions,pages,reading_seconds',
      '2026-05-08,33,1,0,0',
      '2026-05-10,100,2,4,90',
    ]);
  });

  test('hostile values coerce to 0, junk and rolled keys drop out', () => {
    const csv = buildStatsCSV({
      dailyHistory: {
        '2026-05-10': { recitations: -5, sessions: 1.9, pages: 'x', readingSec: NaN },
        '2026-05-09': null,
        notADate: { recitations: 999 },
        '2026-02-30': { recitations: 777 },
        '2026-05-11': 'junk-entry',
      },
    });
    assert.deepEqual(csv.split('\n'), [
      'date,recitations,sessions,pages,reading_seconds',
      '2026-05-09,0,0,0,0',
      '2026-05-10,0,1,0,0',
      '2026-05-11,0,0,0,0',
    ]);
  });

  test('empty or hostile history yields header-only with no trailing newline', () => {
    for (const bad of [{ dailyHistory: {} }, {}, null, { dailyHistory: 'x' }]) {
      const csv = buildStatsCSV(bad);
      assert.equal(csv, 'date,recitations,sessions,pages,reading_seconds');
      assert.equal(csv.split('\n').length, 1);
    }
  });
});

describe('statsCSVFilename: stable date-stamped name', () => {
  test('formats the given day, degrades sanely', () => {
    assert.equal(statsCSVFilename(new Date(2026, 4, 10)), 'nur-al-dhikr-stats-2026-05-10.csv');
    const fallback = statsCSVFilename('junk');
    assert.match(fallback, /^nur-al-dhikr-stats-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.equal(fallback, `nur-al-dhikr-stats-${dateKey(new Date())}.csv`);
  });
});

describe('stats export wiring: handlers, sheet rows, strings', () => {
  const menus = readFileSync(new URL('../js/app/handlers/viewMenus.js', import.meta.url), 'utf8');
  const sheets = readFileSync(new URL('../js/views/viewSheets.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('both actions are registered handlers', () => {
    assert.ok(menus.includes("'statistics-export-csv'"), 'export handler missing');
    assert.ok(menus.includes("'statistics-share-csv'"), 'share handler missing');
  });

  test('both actions ride sheet rows with download/share icons', () => {
    assert.ok(
      sheets.includes("sheetRow('statistics-export-csv', 'stats.sheet.exportCsv', 'download'"),
      'export row missing'
    );
    assert.ok(
      sheets.includes("sheetRow('statistics-share-csv', 'stats.sheet.shareCsv', 'share'"),
      'share row missing'
    );
  });

  test('export strings ship EN + AR', () => {
    for (const key of [
      'stats.sheet.exportCsv',
      'stats.sheet.shareCsv',
      'stats.exportEmpty',
      'stats.exportedCsv',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
