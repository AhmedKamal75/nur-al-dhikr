/**
 * tests/home-today-ribbon.test.js — merged-plan item 3: time-aware Today.
 *
 * The Home hero grows from a next-only strip into a six-prayer ribbon
 * (every prayer taps into the Prayer view; current/next highlighted),
 * with an honest no-location variant (—:— placeholders beside an inline
 * setup action — times are never faked), plus a visible time-window
 * label on the adhkar browser surfacing the ranking nowWindow already
 * applies (rankBrowserDocuments).
 *
 * What it pins:
 *  1. currentPrayer (domain/prayer.js): most-recent time at/before now,
 *     overnight → yesterday's Isha.
 *  2. Ribbon render: all 6 prayers, current (aria-current + Now badge)
 *     and next (Next badge) highlighted, every cell navigate-only into
 *     the unchanged #/prayer deep link.
 *  3. No-location variant: six —:— cells, setup copy, an inline action
 *     into the Prayer view — and no clock time anywhere.
 *  4. Window label mapping (morning/evening/none × EN/AR) rendered
 *     visibly on the browser.
 *
 * Constraints pinned alongside: the order derives from PRAYER_ORDER
 * (rule 6 — no pinned copy in home.js), bilingual EN+AR with no English
 * leaking into Arabic chrome, navigate-only (no new data-action), no new
 * static view import (19/19 budget), no shame copy.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialState } from '../js/core/state/initial.js';
import { processDocument } from '../js/core/schema.js';
import { VIEWS } from '../js/core/config.js';
import { buildHash } from '../js/core/router.js';
import { currentPrayer, nextPrayer, PRAYER_ORDER } from '../js/domain/prayer.js';
import {
  prayerRibbonHTML,
  adhkarWindowLabel,
  adhkarBrowserHTML,
  renderHome,
} from '../js/views/home.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');

// Fixture decimal-hours (a test input to the renderer, not worship data —
// the same convention as tests/adhkarTiming.test.js TIMES).
const TIMES = { fajr: 5, sunrise: 6.5, dhuhr: 12, asr: 15.5, maghrib: 18, isha: 19.5 };
const at = (hour, minute = 0) => new Date(2026, 7, 24, hour, minute, 0, 0);

/** Boot-shaped state; location set unless lat/lng are nulled. */
function ribbonState({ lang = 'en', lat = 30.0444, lng = 31.2357 } = {}) {
  const base = initialState();
  return {
    ...base,
    settings: {
      ...base.settings,
      language: lang,
      prayer: { ...base.settings.prayer, latitude: lat, longitude: lng },
    },
  };
}

const actionsOf = (html) => new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));

describe('currentPrayer: the prayer in effect right now', () => {
  test('mid-morning the current prayer is sunrise, the next is dhuhr', () => {
    assert.equal(currentPrayer(TIMES, at(10)).name, 'sunrise');
    assert.equal(nextPrayer(TIMES, at(10)).name, 'dhuhr');
  });

  test('exactly at a time counts as that prayer (at/before, not strictly before)', () => {
    assert.equal(currentPrayer(TIMES, at(12)).name, 'dhuhr');
    assert.equal(nextPrayer(TIMES, at(12)).name, 'asr');
  });

  test('before Fajr the current prayer is yesterday’s Isha, the next is Fajr', () => {
    const current = currentPrayer(TIMES, at(3));
    assert.equal(current.name, 'isha');
    assert.ok(current.yesterday, 'overnight is flagged, never posed as today’s Isha');
    assert.equal(nextPrayer(TIMES, at(3)).name, 'fajr');
  });

  test('late night the current prayer is today’s Isha', () => {
    assert.equal(currentPrayer(TIMES, at(22)).name, 'isha');
    assert.equal(nextPrayer(TIMES, at(22)).name, 'fajr');
  });
});

describe('ribbon render: six prayers, current/next highlighted, tap → prayer times', () => {
  test('all six prayers render in canonical order with their real times', () => {
    const html = prayerRibbonHTML(ribbonState(), 'en', TIMES, at(10));
    assert.ok(html.includes('home-prayer-ribbon'), 'ribbon renders');
    assert.deepEqual([...PRAYER_ORDER], ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
    for (const name of PRAYER_ORDER) {
      assert.ok(html.includes(en[`prayer.${name}`]), `missing prayer cell: ${name}`);
    }
    const cells = [...html.matchAll(/home-prayer-ribbon__cell(?:\s|")/g)].length;
    assert.equal(cells, 6, `six cells, saw ${cells}`);
    assert.ok(html.includes('12:00 PM'), 'dhuhr renders its clock time, not a placeholder');
    assert.ok(!html.includes('—:—'), 'no placeholder when real times exist');
  });

  test('current cell carries aria-current + Now badge; next cell carries the Next badge', () => {
    const html = prayerRibbonHTML(ribbonState(), 'en', TIMES, at(10));
    assert.ok(html.includes('home-prayer-ribbon__cell--current'), 'current highlighted');
    assert.ok(html.includes('aria-current="true"'), 'current exposed to AT');
    assert.ok(html.includes(en['home.nowBadge']), 'Now badge renders');
    assert.ok(html.includes('home-prayer-ribbon__cell--next'), 'next highlighted');
    assert.ok(html.includes(en['home.nextBadge']), 'Next badge renders');
    // At 10:00 the current prayer is sunrise and the next is dhuhr.
    const currentIdx = html.indexOf('home-prayer-ribbon__cell--current');
    const sunriseIdx = html.indexOf(en['prayer.sunrise']);
    assert.ok(
      currentIdx < sunriseIdx + 200 && sunriseIdx < currentIdx + 800,
      'sunrise is the current cell'
    );
  });

  test('every cell is navigate-only into the unchanged #/prayer deep link', () => {
    const html = prayerRibbonHTML(ribbonState(), 'en', TIMES, at(10));
    assert.deepEqual([...actionsOf(html)], ['navigate'], 'no new data-action');
    assert.equal(buildHash(VIEWS.PRAYER), '#/prayer', 'deep-link hash unchanged');
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 6, `every cell links (saw ${hrefs.length} links)`);
    for (const href of hrefs.filter((h) => h.startsWith('#/'))) {
      assert.equal(href, '#/prayer', `cell must land on prayer times, saw ${href}`);
    }
  });

  test('the head names the next prayer and keeps the live countdown hook', () => {
    const html = prayerRibbonHTML(ribbonState(), 'en', TIMES, at(10));
    assert.ok(html.includes(en['home.prayerRibbon']), 'ribbon title renders');
    assert.ok(html.includes(en['home.nextPrayer']), 'next-prayer line kept');
    assert.ok(
      html.includes('data-home-countdown'),
      'the ticker hook survives the strip → ribbon move'
    );
  });
});

describe('ribbon render: the honest no-location variant', () => {
  test('six —:— cells, setup copy, inline action — and not one clock time', () => {
    const html = prayerRibbonHTML(ribbonState({ lat: null, lng: null }), 'en', null, at(10));
    const placeholders = html.split('—:—').length - 1;
    assert.equal(placeholders, 6, `every prayer honestly empty (saw ${placeholders} placeholders)`);
    assert.ok(html.includes(en['home.setLocation']), 'setup line states what is missing');
    assert.ok(html.includes(en['home.setLocationAction']), 'inline setup action renders');
    assert.ok(html.includes('#/prayer'), 'the action lands where city presets + offsets live');
    assert.ok(!/\d{1,2}:\d{2}/.test(html), 'NEVER faked: no clock time anywhere in the variant');
    assert.deepEqual([...actionsOf(html)], ['navigate'], 'no new data-action');
  });

  test('null times with a location set degrades the same honest way', () => {
    const html = prayerRibbonHTML(ribbonState(), 'en', null, at(10));
    assert.equal(html.split('—:—').length - 1, 6, 'missing engine output is absence, not zeros');
    assert.ok(!/\d{1,2}:\d{2}/.test(html), 'still no clock time');
  });
});

describe('window label: the ranking says what it is doing', () => {
  test('mapping covers morning / evening / none', () => {
    assert.equal(adhkarWindowLabel('morning', 'en'), en['home.window.morning']);
    assert.equal(adhkarWindowLabel('evening', 'en'), en['home.window.evening']);
    assert.equal(adhkarWindowLabel(null, 'en'), en['home.window.none']);
    assert.equal(adhkarWindowLabel(undefined, 'en'), en['home.window.none']);
  });

  test('every window key is bilingual (AR never falls back to EN)', () => {
    for (const key of [
      'home.prayerRibbon',
      'home.nextBadge',
      'home.window.morning',
      'home.window.evening',
      'home.window.none',
    ]) {
      assert.ok(en[key], `missing EN key: ${key}`);
      assert.ok(ar[key], `missing AR key: ${key}`);
      assert.notEqual(ar[key], en[key], `AR missing for ${key} (fell back to EN)`);
    }
    assert.notEqual(adhkarWindowLabel('morning', 'ar'), adhkarWindowLabel('morning', 'en'));
    const arMorning = prayerRibbonHTML(ribbonState({ lang: 'ar' }), 'ar', TIMES, at(10));
    assert.ok(!arMorning.includes('>Next<'), 'no English badge leaks into Arabic chrome');
    assert.ok(!arMorning.includes('>Now<'), 'no English badge leaks into Arabic chrome');
  });

  test('the browser surfaces the label visibly, in the ranked hour', () => {
    const adhkarDoc = processDocument(
      JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
    ).value;
    const base = initialState();
    const index = {};
    for (const cat of adhkarDoc.categories || []) {
      for (const item of cat.items || [])
        index[item.id] = { item, category: cat, document: adhkarDoc };
    }
    const state = {
      ...base,
      settings: { ...base.settings, language: 'en' },
      library: {
        ...base.library,
        documents: { adhkar: adhkarDoc },
        order: ['adhkar'],
        itemIndex: index,
      },
      customContent: {},
    };
    const morning = adhkarBrowserHTML(state, 'morning');
    assert.ok(morning.includes('home-browser__window'), 'the label has a visible home on the page');
    assert.ok(morning.includes(en['home.window.morning']), 'morning hour names the morning window');
    const evening = adhkarBrowserHTML(state, 'evening');
    assert.ok(evening.includes(en['home.window.evening']), 'evening hour names the evening window');
    const none = adhkarBrowserHTML(state, null);
    assert.ok(none.includes(en['home.window.none']), 'outside the windows the page says so');
    const arState = { ...state, settings: { ...state.settings, language: 'ar' } };
    const arMorning = adhkarBrowserHTML(arState, 'morning');
    assert.ok(arMorning.includes(ar['home.window.morning']), 'AR label renders');
    assert.ok(!arMorning.includes('Morning window'), 'no English leaks into the Arabic label');
  });
});

describe('item-3 contracts that must not move', () => {
  test('home.js derives the order from domain/prayer.js (rule 6), not a pinned copy', () => {
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(src.includes('PRAYER_ORDER'), 'the ribbon reads the canonical order');
    assert.ok(!src.includes("from '../views/"), 'the 19/19 static budget stays untouched');
  });

  test('no shame copy anywhere in the new surfaces (both languages)', () => {
    for (const lang of ['en', 'ar']) {
      const html = prayerRibbonHTML(ribbonState({ lang }), lang, TIMES, at(10));
      assert.ok(!/streak/i.test(html), `no streak vocabulary (${lang})`);
      assert.ok(!/leaderboard/i.test(html), `no leaderboard (${lang})`);
      assert.ok(!/متصدر/i.test(html), `no leaderboard (${lang})`);
    }
  });

  test('renderHome carries the ribbon, the countdown hook and the window label', () => {
    const adhkarDoc = processDocument(
      JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
    ).value;
    const base = ribbonState();
    const index = {};
    for (const cat of adhkarDoc.categories || []) {
      for (const item of cat.items || [])
        index[item.id] = { item, category: cat, document: adhkarDoc };
    }
    const full = {
      ...base,
      library: {
        ...base.library,
        documents: { adhkar: adhkarDoc },
        order: ['adhkar'],
        itemIndex: index,
      },
      customContent: {},
    };
    const html = renderHome(full);
    assert.ok(html.includes('home-prayer-ribbon'), 'ribbon rides the home view');
    assert.ok(html.includes('data-home-countdown'), 'ticker hook rides the home view');
    const bare = renderHome(ribbonState({ lat: null, lng: null }));
    assert.ok(bare.includes('—:—'), 'no-location home never fakes a time');
  });

  test('the window label rides the Azkar browser (the moved grid)', async () => {
    const adhkarDoc = processDocument(
      JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
    ).value;
    const base = ribbonState();
    const index = {};
    for (const cat of adhkarDoc.categories || []) {
      for (const item of cat.items || [])
        index[item.id] = { item, category: cat, document: adhkarDoc };
    }
    const full = {
      ...base,
      library: {
        ...base.library,
        documents: { adhkar: adhkarDoc },
        order: ['adhkar'],
        itemIndex: index,
      },
      customContent: {},
    };
    const { renderLibrary } = await import('../js/views/library.js');
    const html = renderLibrary(full);
    assert.ok(html.includes('home-browser__window'), 'window label rides the Azkar view');
  });
});
