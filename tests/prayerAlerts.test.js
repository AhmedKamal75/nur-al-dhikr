/**
 * tests/prayerAlerts.test.js — item 17 (prayer alerts, honest path) gates:
 *  1. every ICS event carries an at-time VALARM (both builders, one shared
 *     definition — the calendar fallback must actually alert);
 *  2. alertStatusHTML renders each arm mode honestly (triggers/tab/
 *     permission) and stays silent for off/unknown/hostile;
 *  3. the Prayer view embeds the status row (tab mode end-to-end);
 *  4. the month export falls back to the current month on bare calls;
 *  5. the fallback string ships EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildMonthICS, buildMonthTimetable, buildPrayerICS } from '../js/domain/prayerExport.js';
import { alertStatusHTML, renderPrayer } from '../js/views/prayer.js';

const TIMES = { fajr: 5.5, sunrise: 7, dhuhr: 12.5, asr: 15.75, maghrib: 18.25, isha: 19.75 };
const DAY = new Date(2026, 8, 4, 12, 0, 0);

describe('VALARM: every exported event alerts at time', () => {
  test('daily builder alarms each event once', () => {
    const ics = buildPrayerICS(TIMES, DAY, { names: { fajr: 'Fajr' } });
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 6);
    assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 6, 'one alarm per event');
    assert.ok(ics.includes('TRIGGER:-PT0M'), 'fires at prayer time');
    assert.ok(ics.includes('ACTION:DISPLAY'), 'display alarm');
    assert.ok(ics.includes('DESCRIPTION:Fajr'), 'label rides along');
  });

  test('month builder alarms each event; labels escape', () => {
    const table = buildMonthTimetable({ year: 2026, month: 9, latitude: 30, longitude: 31 });
    const ics = buildMonthICS(table, { names: { fajr: 'Fajr; Special' } });
    const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
    assert.ok(events > 100, 'a full month of events');
    assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, events, 'every event alarmed');
    assert.ok(ics.includes('DESCRIPTION:Fajr\\; Special'), 'descriptions escape like summaries');
  });
});

describe('alertStatusHTML: honest modes, silent otherwise', () => {
  test('triggers mode names the pre-scheduled count', () => {
    const html = alertStatusHTML({ mode: 'triggers', count: 4 }, 'en');
    assert.ok(html.includes('4'), 'count shown');
    assert.ok(html.includes('even if the app is closed'), 'background promise stated');
    assert.ok(!html.includes('data-action="prayer-month-ics"'), 'no fallback CTA when armed');
  });

  test('tab mode states the limit and offers the calendar fallback', () => {
    const html = alertStatusHTML({ mode: 'tab', count: 0 }, 'en');
    assert.ok(html.includes('only while the app is open'), 'Safari/Firefox reality stated');
    assert.ok(html.includes('data-action="prayer-month-ics"'), 'fallback CTA rides along');
    assert.ok(html.includes('Add to calendar'), 'CTA labeled');
  });

  test('permission mode offers the one-tap ask', () => {
    const html = alertStatusHTML({ mode: 'permission', count: 0 }, 'en');
    assert.ok(html.includes('need notification permission'), 'ask context stated');
    assert.ok(html.includes('data-action="prayer-enable-notifications"'), 'enable CTA rides along');
  });

  test('off, unknown and hostile states render nothing', () => {
    for (const bad of [
      { mode: 'off', count: 0 },
      { mode: 'unknown', count: 0 },
      { mode: 'triggers', count: 0 },
      null,
      {},
      { mode: 42 },
    ]) {
      assert.equal(alertStatusHTML(bad, 'en'), '', `silent for ${JSON.stringify(bad)}`);
    }
  });

  test('AR copy renders without undefined', () => {
    const html = alertStatusHTML({ mode: 'tab', count: 0 }, 'ar');
    assert.ok(html.includes('أضف إلى التقويم'), 'AR CTA label');
    assert.doesNotMatch(html, /undefined/);
  });
});

describe('Prayer view embeds the status row', () => {
  function prayerState(over = {}) {
    return {
      settings: {
        language: 'en',
        prayer: {
          latitude: 30.04,
          longitude: 31.24,
          method: 'MWL',
          asr: 'Standard',
          alerts: { fajr: true },
        },
      },
      dailyChecklist: {},
      alertTriggerStatus: { mode: 'tab', count: 0 },
      ...over,
    };
  }

  test('tab mode surfaces the fallback inline', () => {
    const html = renderPrayer(prayerState());
    assert.ok(html.includes('prayer-reliability'), 'status row placed');
    assert.ok(html.includes('data-action="prayer-month-ics"'), 'fallback CTA placed');
  });

  test('armed mode states the count; off stays quiet', () => {
    const armed = renderPrayer(prayerState({ alertTriggerStatus: { mode: 'triggers', count: 3 } }));
    assert.ok(armed.includes('prayer-reliability'), 'armed row placed');
    const off = renderPrayer(
      prayerState({
        settings: {
          language: 'en',
          prayer: { latitude: 30.04, longitude: 31.24, method: 'MWL', asr: 'Standard', alerts: {} },
        },
        alertTriggerStatus: { mode: 'off', count: 0 },
      })
    );
    assert.ok(!off.includes('prayer-reliability'), 'nothing armed, nothing reported');
  });
});

describe('alert honesty wiring: fallback month + strings', () => {
  const menus = readFileSync(new URL('../js/app/handlers/viewMenus.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('bare month export falls back to the current month', () => {
    assert.ok(menus.includes('prayer-month-ics'), 'handler present');
    assert.ok(
      menus.includes('now.getFullYear()') && menus.includes('now.getMonth()'),
      'bare calls default to the current month'
    );
  });

  test('fallback string ships EN + AR', () => {
    assert.ok(en.includes("'prayer.addToCalendar'"), 'EN missing prayer.addToCalendar');
    assert.ok(ar.includes("'prayer.addToCalendar'"), 'AR missing prayer.addToCalendar');
  });
});
