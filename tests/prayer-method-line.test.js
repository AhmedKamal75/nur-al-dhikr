/**
 * tests/prayer-method-line.test.js — merged-plan item 4: the active prayer
 * method in plain text.
 *
 * The method lived only in the calc sheet and onboarding; the prayer hero
 * (views/prayer.js) and the home prayer strip (views/home.js) showed no
 * method. Now one plain-text line — method · Asr convention · offsets —
 * rides both, built by the single prayerMethodLine helper
 * (domain/prayer.js, rule 6) reusing the existing prayer.method-family and
 * methodRegion i18n plus the prayer.methodSource (unverified) qualifier.
 *
 * What it pins:
 *  1. Line content: localized method + region, the Asr label with the
 *     active convention, the offsets bit, and the unverified qualifier —
 *     in EN and in AR.
 *  2. Offsets: all-zero reads as absence (prayer.offsetsNone), nonzero
 *     prayers render signed deltas with the localized minute unit,
 *     out-of-range/hostile entries are ignored.
 *  3. Hostile prefs degrade like the engine: unknown method → MWL,
 *     unknown Asr → Standard.
 *  4. Render: the prayer hero and both ribbon variants carry the line;
 *     the no-location ribbon still shows six —:— cells and zero clock
 *     times; no new data-action, no new static view import.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { initialState } from '../js/core/state/initial.js';
import { prayerMethodLine, compactPrayerMethodLine } from '../js/domain/prayer.js';
import { renderPrayer } from '../js/views/prayer.js';
import { prayerRibbonHTML } from '../js/views/home.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const TIMES = { fajr: 5, sunrise: 6.5, dhuhr: 12, asr: 15.5, maghrib: 18, isha: 19.5 };
const at = (hour, minute = 0) => new Date(2026, 7, 24, hour, minute, 0, 0);

const prefs = (over = {}) => ({
  method: 'MWL',
  asr: 'Standard',
  offsets: {},
  ...over,
});

function viewState({ lang = 'en', prayer = {} } = {}) {
  const base = initialState();
  return {
    ...base,
    settings: {
      ...base.settings,
      language: lang,
      prayer: {
        ...base.settings.prayer,
        latitude: 30.0444,
        longitude: 31.2357,
        method: 'MWL',
        asr: 'Standard',
        offsets: {},
        alerts: {},
        ...prayer,
      },
    },
    dailyChecklist: {},
  };
}

describe('prayerMethodLine: one plain-text summary of the active prefs', () => {
  test('EN defaults name the method, region, Asr convention, absence of offsets, and the source', () => {
    const line = prayerMethodLine(prefs(), 'en');
    assert.ok(line.includes(en['prayer.method.MWL']), 'localized method name');
    assert.ok(line.includes(en['prayer.methodRegion.MWL']), 'region rides along');
    assert.ok(line.includes(en['prayer.asrMethod']), 'Asr label reused');
    assert.ok(line.includes('Standard'), 'active Asr convention named');
    assert.ok(line.includes(en['prayer.offsetsNone']), 'zero offsets read as absence');
    assert.ok(!line.includes('+0'), 'never a "+0"');
    assert.ok(
      line.includes(en['prayer.methodSource'].split('{body}')[0].trim()),
      'the unverified qualifier rides the line'
    );
    assert.ok(line.includes('Muslim World League'), 'source body quoted verbatim');
  });

  test('AR renders the twin labels with the AR qualifier, never raw EN chrome', () => {
    const line = prayerMethodLine(prefs(), 'ar');
    assert.ok(line.includes(ar['prayer.method.MWL']), 'AR method name');
    assert.ok(line.includes(ar['prayer.methodRegion.MWL']), 'AR region');
    assert.ok(line.includes(ar['prayer.asrMethod']), 'AR Asr label');
    assert.ok(line.includes(ar['prayer.offsetsNone']), 'AR absence label');
    assert.ok(line.includes('المصدر (غير مؤكد):'), 'AR unverified qualifier');
    assert.ok(!line.includes('Source (unverified):'), 'no EN qualifier in AR chrome');
    assert.ok(!line.includes('No offsets'), 'no EN absence label in AR chrome');
    assert.ok(!line.includes('Worldwide default'), 'no EN region in AR chrome');
  });

  test('a non-default method + Hanafi Asr render through the same reusable keys', () => {
    const line = prayerMethodLine(prefs({ method: 'Egyptian', asr: 'Hanafi' }), 'en');
    assert.ok(line.includes(en['prayer.method.Egyptian']), 'Egyptian method named');
    assert.ok(line.includes(en['prayer.methodRegion.Egyptian']), 'Egyptian region');
    assert.ok(line.includes('Hanafi'), 'Hanafi convention named');
    assert.ok(!line.includes('Standard'), 'the inactive convention is not named');
  });

  test('nonzero offsets render as signed deltas; zeros, garbage and out-of-range are ignored', () => {
    const line = prayerMethodLine(
      prefs({ offsets: { fajr: 5, maghrib: -3, dhuhr: 0, sunrise: 61, isha: 'x' } }),
      'en'
    );
    assert.ok(line.includes(`${en['prayer.fajr']} +5m`), 'Fajr +5 with the minute unit');
    assert.ok(line.includes(`${en['prayer.maghrib']} -3m`), 'Maghrib −3');
    assert.ok(!line.includes(en['prayer.offsetsNone']), 'absence label gone when offsets exist');
    assert.ok(!line.includes(en['prayer.dhuhr']), 'zero offset never listed');
    assert.ok(!line.includes(en['prayer.isha']), 'non-numeric offset ignored');
    assert.ok(!line.includes(en['prayer.sunrise']), 'out-of-range offset ignored');
  });

  test('AR offsets use the AR prayer names and the AR minute unit', () => {
    const line = prayerMethodLine(prefs({ offsets: { fajr: 5 } }), 'ar');
    assert.ok(line.includes(ar['prayer.fajr']), 'AR prayer name');
    assert.ok(line.includes('+5 د'), 'AR minute unit on the signed delta');
  });

  test('hostile prefs degrade like the engine — MWL/Standard, offsets dropped', () => {
    const line = prayerMethodLine(
      prefs({ method: '__proto__', asr: 'zzz', offsets: { fajr: 9999 } }),
      'en'
    );
    assert.ok(line.includes(en['prayer.method.MWL']), 'unknown method falls back to MWL');
    assert.ok(line.includes('Standard'), 'unknown Asr falls back to Standard');
    assert.ok(line.includes(en['prayer.offsetsNone']), 'hostile offsets read as absence');
    assert.doesNotMatch(line, /__proto__|zzz|9999/, 'nothing hostile reaches the screen');
  });

  test('bare/hostile prefs objects never throw', () => {
    for (const bad of [null, undefined, {}, { offsets: null }, { offsets: ['fajr'] }]) {
      const line = prayerMethodLine(bad, 'en');
      assert.ok(
        line.includes(en['prayer.method.MWL']),
        `degrades cleanly for ${JSON.stringify(bad)}`
      );
    }
  });
});

describe('compactPrayerMethodLine: focal surfaces stay readable', () => {
  test('EN names the method, Asr convention, and source qualifier', () => {
    const line = compactPrayerMethodLine({ method: 'Karachi', asr: 'Hanafi' }, 'en');
    assert.ok(line.includes(en['prayer.method.Karachi']));
    assert.ok(line.includes(en['prayer.asrMethod']));
    assert.ok(line.includes(en['prayer.asr.Hanafi']));
    assert.ok(line.includes(en['prayer.methodSource'].split('{body}')[0].trim()));
  });

  test('AR localizes the Asr convention and source qualifier safely', () => {
    const line = compactPrayerMethodLine({ method: '__proto__', asr: 'zzz' }, 'ar');
    assert.ok(line.includes(ar['prayer.method.MWL']));
    assert.ok(line.includes(ar['prayer.asr.Standard']));
    assert.ok(line.includes(ar['prayer.methodSource'].split('{body}')[0].trim()));
    assert.ok(!line.includes('Source (unverified):'));
    assert.ok(!line.includes('Standard'));
    assert.ok(!line.includes('MWL'));
  });
});

describe('render: focal hero is compact; home strip keeps the full summary', () => {
  test('the prayer hero names the active method and Asr convention without advanced metadata', () => {
    const html = renderPrayer(
      viewState({ prayer: { offsets: { fajr: 5 }, asr: 'Hanafi', method: 'Karachi' } })
    );
    assert.ok(
      html.includes('next-prayer-card__method'),
      'the hero carries the compact method line'
    );
    assert.ok(html.includes(en['prayer.method.Karachi']), 'method named on the hero');
    assert.ok(html.includes(en['prayer.asr.Hanafi']), 'Asr convention on the hero');
    assert.ok(
      !html.includes(`${en['prayer.fajr']} +5m`),
      'offset detail stays out of the focal hero'
    );
    assert.ok(html.includes('Source (unverified):'), 'the focal line keeps provenance honest');
  });

  test('the full home ribbon carries the same line, from the same helper', () => {
    const html = prayerRibbonHTML(viewState(), 'en', TIMES, at(10));
    assert.ok(html.includes('home-prayer-ribbon__method'), 'the strip carries the method line');
    assert.ok(html.includes(en['prayer.method.MWL']), 'method named on the strip');
    assert.ok(html.includes('Standard'), 'Asr convention on the strip');
    assert.ok(html.includes(en['prayer.offsetsNone']), 'absence label on the strip');
    assert.ok(html.includes('Source (unverified):'), 'unverified qualifier on the strip');
  });

  test('the no-location ribbon states no method — and still fakes no time', () => {
    // With no computed times on screen a method would dangle beside
    // placeholders (and cost first-run fold budget — see tests/e2e/
    // home-fold.spec.js). The setup action leads exactly where the method
    // and offsets live, and the line appears the moment times do.
    const state = viewState({ prayer: { latitude: null, longitude: null } });
    const html = prayerRibbonHTML(state, 'en', null, at(10));
    assert.ok(!html.includes('home-prayer-ribbon__method'), 'no dangling method beside —:—');
    assert.equal(html.split('—:—').length - 1, 6, 'six honest placeholders kept');
    assert.ok(!/\d{1,2}:\d{2}/.test(html), 'STILL no clock time in the variant');
  });

  test('the no-location prayer view likewise states no method', () => {
    const html = renderPrayer(viewState({ prayer: { latitude: null, longitude: null } }));
    assert.ok(!html.includes('next-prayer-card__method'), 'empty state carries no method line');
  });

  test('AR hero stays compact while the home strip retains the full transparent summary', () => {
    const hero = renderPrayer(viewState({ lang: 'ar' }));
    assert.ok(hero.includes(ar['prayer.method.MWL']), 'AR method on the hero');
    assert.ok(hero.includes(ar['prayer.asr.Standard']), 'AR Asr convention on the hero');
    assert.ok(hero.includes('المصدر (غير مؤكد):'), 'AR provenance stays on the focal hero');
    const strip = prayerRibbonHTML(viewState({ lang: 'ar' }), 'ar', TIMES, at(10));
    assert.ok(strip.includes(ar['prayer.method.MWL']), 'AR method on the strip');
    assert.ok(strip.includes('المصدر (غير مؤكد):'), 'AR qualifier on the strip');
    assert.ok(!strip.includes('Source (unverified):'), 'no EN qualifier leaks into AR chrome');
  });
});

describe('item-4 contracts that must not move', () => {
  test('the new key is bilingual with matching placeholders', () => {
    assert.ok(en['prayer.offsetsNone'], 'EN key exists');
    assert.ok(ar['prayer.offsetsNone'], 'AR key exists');
    assert.notEqual(ar['prayer.offsetsNone'], en['prayer.offsetsNone'], 'AR is a translation');
  });

  test('the line adds plain text only — no new data-action on either surface', () => {
    const hero = renderPrayer(viewState());
    const strip = prayerRibbonHTML(viewState(), 'en', TIMES, at(10));
    const heroActions = new Set([...hero.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));
    const stripActions = new Set([...strip.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));
    assert.ok(![...heroActions].some((a) => a.includes('method')), 'no method action on the hero');
    assert.deepEqual([...stripActions], ['navigate'], 'the strip stays navigate-only');
  });

  test('home.js still derives from the domain (rule 6) with no new static view import', () => {
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(src.includes('prayerMethodLine'), 'the strip reads the shared helper');
    assert.ok(!src.includes("from '../views/"), 'the 19/19 static budget stays untouched');
    const prayerSrc = readFileSync(join(ROOT, 'js/views/prayer.js'), 'utf8');
    assert.ok(prayerSrc.includes('prayerMethodLine'), 'the hero reads the same helper');
  });

  test('both surfaces keep their styled line classes (logical-properties CSS)', () => {
    const css = readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8');
    assert.ok(css.includes('.next-prayer-card__method'), 'hero line styled');
    assert.ok(css.includes('.home-prayer-ribbon__method'), 'strip line styled');
  });
});

describe('Prayer calc surface: detail belongs in the deliberate settings sheet', () => {
  test('hero uses the compact method line with honest provenance, while offsets stay in calc', async () => {
    const { renderPrayer } = await import('../js/views/prayer.js');
    const hero = renderPrayer(viewState({ prayer: { method: 'Karachi', asr: 'Hanafi' } }));
    assert.ok(hero.includes(en['prayer.asr.Hanafi']));
    assert.ok(hero.includes('Source (unverified):'));
    assert.ok(!hero.includes(en['prayer.offsetsNone']));
  });

  test('calc panel localizes Asr choices and exposes methodology progressively', async () => {
    const { calcPanelHTML } = await import('../js/views/prayer.js');
    const html = calcPanelHTML(viewState());
    assert.ok(html.includes(en['prayer.methodDetails']));
    assert.ok(html.includes(en['prayer.calculationBasis']));
    assert.ok(html.includes(en['prayer.asr.Standard'].replace("'", '&#39;')));
    assert.ok(html.includes(en['prayer.asr.Hanafi']));
    assert.ok(html.includes(en['prayer.fineTuneDetails']));
    assert.ok(html.includes(en['prayer.iqamaDetails']));
  });
});
