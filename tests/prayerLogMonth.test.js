/**
 * tests/prayerLogMonth.test.js — C16 "Prayer log month view" (v5.17.184):
 *  1. prayerMonthCells lays out a Sunday-first month off the
 *     dailyChecklist map, with loggedCount/dayComplete semantics;
 *  2. the neutral completeness buckets have fixed edges (0 / 1–2 / 3–4 /
 *     5) and clamp hostile counts;
 *  3. PRAYER_LOG_MONTH_SET keeps the ref inside the 12-month window,
 *     null returns to Today, malformed refs and bases change nothing;
 *  4. the Prayer view renders the grid read-only (no editing affordance
 *     in the month block), with heatmap-style a11y (role=img cells,
 *     labelled grid, DOW row hidden), month nav bounds, a Today button,
 *     and EN + AR chrome;
 *  5. the grid adds no streak mechanics and writes nothing.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state.js';
import { PRAYER_KEYS, prayerMonthCells, completenessBucket } from '../js/domain/prayerLog.js';
import { renderPrayer } from '../js/views/prayer.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');

const BASE_REF = (() => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
})();

function keyOf(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

describe('C16 month cells', () => {
  test('Sunday-first layout with per-day counts from the checklist map', () => {
    // November 2026 starts on a Sunday → no leading nulls, 30 cells.
    const map = {
      '2026-11-01': { fajr: 'prayed', dhuhr: 'jamaah' },
      '2026-11-15': {
        fajr: 'prayed',
        dhuhr: 'prayed',
        asr: 'prayed',
        maghrib: 'prayed',
        isha: true,
      },
      '2026-11-30': { fajr: 'jamaah', dhuhr: 'jamaah', asr: 'jamaah' },
    };
    const cells = prayerMonthCells(map, new Date(2026, 10, 15));
    assert.equal(cells.filter((c) => !c).length, 0);
    assert.equal(cells.filter(Boolean).length, 30);
    assert.equal(cells[0].key, '2026-11-01');
    assert.equal(cells[0].count, 2);
    assert.equal(cells[0].complete, false);
    assert.equal(cells[14].count, 5, 'legacy boolean true still counts');
    assert.equal(cells[14].complete, true);
    assert.equal(cells[29].count, 3);
    // A month not starting Sunday pads with leading nulls: Dec 2026 (Tue).
    const dec = prayerMonthCells({}, new Date(2026, 11, 1));
    assert.equal(dec.filter((c) => !c).length, 2);
    assert.equal(dec.filter(Boolean).length, 31);
  });

  test('February edge cases: leap 2028 (29 days) and common 2027 (28)', () => {
    const leap = prayerMonthCells({}, new Date(2028, 1, 1));
    assert.equal(leap.filter(Boolean).length, 29, 'Feb 2028 has 29 day cells');
    assert.equal(leap.filter((c) => !c).length, new Date(2028, 1, 1).getDay());
    assert.equal(leap.filter(Boolean).at(-1).key, '2028-02-29');
    const common = prayerMonthCells({}, new Date(2027, 1, 1));
    assert.equal(common.filter(Boolean).length, 28, 'Feb 2027 has 28 day cells');
    assert.equal(common.filter(Boolean).at(-1).key, '2027-02-28');
  });

  test('hostile maps and junk entries degrade to zeros', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      const cells = prayerMonthCells(bad, new Date(2026, 10, 1));
      assert.equal(cells.filter(Boolean).length, 30);
      assert.ok(cells.filter(Boolean).every((c) => c.count === 0));
    }
    const cells = prayerMonthCells(
      { '2026-11-05': { fajr: 'nonsense', __proto__: 'polluted' } },
      new Date(2026, 10, 1)
    );
    assert.equal(cells[4].count, 1, 'any truthy value normalizes to prayed');
  });
});

describe('C16 neutral buckets', () => {
  test('fixed edges 0 / 1-2 / 3-4 / 5, hostile counts clamp', () => {
    assert.equal(completenessBucket(0), 'b0');
    assert.equal(completenessBucket(1), 'b1');
    assert.equal(completenessBucket(2), 'b1');
    assert.equal(completenessBucket(3), 'b2');
    assert.equal(completenessBucket(4), 'b2');
    assert.equal(completenessBucket(5), 'b3');
    assert.equal(completenessBucket(99), 'b3');
    assert.equal(completenessBucket(-3), 'b0');
    assert.equal(completenessBucket(NaN), 'b0');
    assert.equal(completenessBucket('x'), 'b0');
    assert.equal(completenessBucket(undefined), 'b0');
  });
});

describe('C16 month ref reducer', () => {
  test('set, clamp to the 12-month window, null returns to Today', () => {
    const s0 = initialState();
    assert.equal(s0.prayerLogMonthRef, null);
    const s1 = reduce(s0, actions.setPrayerLogMonth('2026-01', BASE_REF));
    assert.equal(s1.prayerLogMonthRef, '2026-01');
    // Future clamps to the current month.
    const s2 = reduce(s1, actions.setPrayerLogMonth('2099-12', BASE_REF));
    assert.equal(s2.prayerLogMonthRef, BASE_REF);
    // Too far back clamps to current - 11.
    const [by, bm] = BASE_REF.split('-').map(Number);
    const minD = new Date(by, bm - 1 - 11, 1);
    const minRef = `${minD.getFullYear()}-${String(minD.getMonth() + 1).padStart(2, '0')}`;
    const s3 = reduce(s2, actions.setPrayerLogMonth('2000-01', BASE_REF));
    assert.equal(s3.prayerLogMonthRef, minRef);
    // null (Today) clears the ref; clearing twice is a no-op.
    const s4 = reduce(s3, actions.setPrayerLogMonth(null, BASE_REF));
    assert.equal(s4.prayerLogMonthRef, null);
    assert.equal(reduce(s4, actions.setPrayerLogMonth(null, BASE_REF)), s4);
  });

  test('malformed refs and bases change nothing', () => {
    const s0 = reduce(initialState(), actions.setPrayerLogMonth('2026-03', BASE_REF));
    for (const ref of ['2026-13', 'not-a-month', '2026-1', {}, [], '__proto__']) {
      assert.equal(reduce(s0, actions.setPrayerLogMonth(ref, BASE_REF)), s0, String(ref));
    }
    for (const base of ['garbage', '2026-13', null, undefined, 7]) {
      assert.equal(reduce(s0, actions.setPrayerLogMonth('2026-04', base)), s0, String(base));
    }
  });
});

describe('C16 view wiring', () => {
  function prayerStateWith(map, { lang = 'en', ref = null } = {}) {
    const base = initialState();
    return {
      ...base,
      settings: {
        ...base.settings,
        language: lang,
        prayer: {
          method: 'MWL',
          asr: 'Standard',
          latitude: 30.0444,
          longitude: 31.2357,
          timezone: 'Africa/Cairo',
          locationName: 'Cairo',
        },
      },
      dailyChecklist: map,
      prayerLogMonthRef: ref,
    };
  }

  test('grid renders read-only with heatmap a11y and the month summary', () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const map = {
      [keyOf(y, m, 2)]: { fajr: 'prayed', dhuhr: 'prayed', asr: 'prayed' },
      [keyOf(y, m, 3)]: {
        fajr: 'jamaah',
        dhuhr: 'jamaah',
        asr: 'jamaah',
        maghrib: 'jamaah',
        isha: 'jamaah',
      },
    };
    const html = renderPrayer(prayerStateWith(map));
    // The month block runs to the end of the log panel (nothing after it
    // but the hint), so slicing to the end stays inside the block.
    const month = html.slice(html.indexOf('class="plog-month"'));
    assert.ok(month.includes('plog-month__cell--b2'), '3/5 day lands in bucket b2');
    assert.ok(month.includes('plog-month__cell--b3'), '5/5 day lands in bucket b3');
    // a11y: the container is a labelled group, never role=img — children
    // of role=img are presentational, which would make the per-day n/5
    // labels unreachable. Cells keep their own role=img + label.
    assert.ok(
      /class="heatmap__grid"\s+role="group"/.test(month),
      'grid container is a labelled group'
    );
    assert.ok(
      !/class="heatmap__grid"\s+role="img"/.test(month),
      'container is not role=img (would hide cell labels)'
    );
    assert.ok(month.includes('role="img"'), 'cells carry role=img with n/5 labels');
    assert.ok(month.includes('/5'), 'completeness read as n/5');
    assert.ok(
      month.includes('class="panel__subtext" dir="auto"'),
      'month summary follows content direction (v5.17.185: no forced ltr)'
    );
    assert.ok(month.includes('heatmap__cell--today'), 'today ringed');
    assert.ok(
      !month.includes('data-action="prayer-log-cycle"'),
      'no editing affordance in the grid'
    );
    // Nav + Today: prev enabled, next disabled on the current month.
    assert.ok(month.includes('data-action="plog-month-shift" data-delta="-1"'));
    const nextBtn = month.match(/data-action="plog-month-shift" data-delta="1"[^>]*>/)[0];
    assert.ok(nextBtn.includes('disabled'), 'next disabled on the current month');
    assert.ok(
      month.includes('data-action="plog-month-today" hidden'),
      'Today hidden on current month'
    );
    // Browsing back shows Today and enables next.
    const back = renderPrayer(prayerStateWith(map, { ref: '2026-01' }));
    assert.ok(
      back.includes('data-action="plog-month-today"'),
      'Today appears off the current month'
    );
    assert.ok(
      !back.includes('data-action="plog-month-today" hidden'),
      'Today not hidden when browsing back'
    );
    const backNext = back.match(/data-action="plog-month-shift" data-delta="1"[^>]*>/)[0];
    assert.ok(!backNext.includes('disabled'), 'next enabled when browsing back');
  });

  test('AR chrome: DOW row, nav labels, month label localized', () => {
    const html = renderPrayer(prayerStateWith({}, { lang: 'ar' }));
    assert.ok(html.includes(ar['stats.monthPrev']));
    assert.ok(html.includes(ar['calendar.today']));
    assert.ok(html.includes('أحد'), 'AR day-of-week row');
    assert.ok(!html.includes('>S</span><span>M<'), 'no EN DOW row in AR');
  });

  test('no streak mechanics and no writes: grid is counts-only', () => {
    const viewSrc = readFileSync(join(ROOT, 'js/views/prayer.js'), 'utf8');
    const block = viewSrc.slice(
      viewSrc.indexOf('plogCurrentRef'),
      viewSrc.indexOf('plogGridCells') + 200
    );
    assert.ok(!/streak/i.test(block), 'no streak in the month-grid computation');
    assert.ok(!block.includes('plog.state'), 'no log-state chrome in cells');
    const handlerSrc = readFileSync(join(ROOT, 'js/app/handlers/worship.js'), 'utf8');
    const shift = handlerSrc.slice(
      handlerSrc.indexOf("'plog-month-shift'"),
      handlerSrc.indexOf("'gap-telemetry-clear'")
    );
    assert.ok(!shift.includes('dailyChecklist'), 'handlers never touch the log map');
    assert.ok(!shift.includes('CHECKLIST'), 'handlers dispatch no log write');
  });

  test('reused strings ship EN + AR', () => {
    for (const k of ['stats.monthPrev', 'stats.monthNext', 'calendar.today', 'plog.monthCount']) {
      assert.ok(en[k], `en ${k}`);
      assert.ok(ar[k], `ar ${k}`);
    }
  });
});
