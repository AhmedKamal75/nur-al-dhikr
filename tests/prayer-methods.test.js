/**
 * tests/prayer-methods.test.js — pins the three prayer-times controls that
 * capability-parity work identified, by EXECUTION:
 *
 *   1. Calculation method (7 published conventions, angles sourced from
 *      data/prayer-methods.json) — and the data file must agree with the
 *      domain, or a reader sees one convention and the app computes another.
 *   2. Asr madhab (Standard vs Hanafi shadow rule). Hanafi Asr is LATER; a
 *      "best time" that is minutes off for the reader's school is an
 *      honesty-of-data problem, the same class as the grades rule.
 *   3. Manual per-prayer minute offsets, applied at one choke point so the
 *      timetable, notifications, triggers and fasting all inherit them.
 *
 * All three were reported "missing" by a competitor-comparison audit while
 * being shipped. This test exists so that stops being re-investigated.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  METHODS,
  ASR_FACTORS,
  OFFSET_PRAYERS,
  applyPrayerOffsets,
  calculateTimes,
} from '../js/domain/prayer.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';

const ROOT = join(import.meta.dirname, '..');
const CAIRO = { latitude: 30.0444, longitude: 31.2357, timezoneOffsetHours: 2 };
const DATE = new Date(2026, 8, 27);

const times = (over = {}) => calculateTimes({ ...CAIRO, date: DATE, ...over });

describe('calculation method: 7 published conventions, data agrees with code', () => {
  test('the domain ships the 7 methods the data file documents', () => {
    const ids = Object.keys(METHODS);
    assert.equal(ids.length, 7, `expected 7 methods, got ${ids.length}`);
    for (const id of ['MWL', 'ISNA', 'Egyptian', 'Karachi', 'UmmAlQura', 'Tehran']) {
      assert.ok(ids.includes(id), `${id} present`);
    }
  });

  test('data/prayer-methods.json and the domain agree on every angle', () => {
    const data = JSON.parse(readFileSync(join(ROOT, 'data/prayer-methods.json'), 'utf8'));
    const listed = data.methods.map((m) => m.id);
    for (const m of data.methods) {
      const code = METHODS[m.id];
      assert.ok(code, `${m.id} is documented in data but missing from the domain`);
      // Umm al-Qura states Isha as minutes-after-Maghrib, not an angle.
      if (m.angles.fajr != null) {
        assert.equal(code.fajr, m.angles.fajr, `${m.id} fajr angle matches the documented value`);
      }
      if (m.angles.isha != null) {
        assert.equal(code.isha, m.angles.isha, `${m.id} isha angle matches the documented value`);
      }
    }
    // And the reverse: nothing undocumented in the code.
    for (const id of Object.keys(METHODS)) {
      assert.ok(listed.includes(id), `${id} exists in code but is undocumented in data`);
    }
  });

  test('different methods genuinely produce different times', () => {
    const mwl = times({ method: 'MWL' });
    const uaq = times({ method: 'UmmAlQura' });
    assert.notEqual(mwl.fajr.toFixed(3), uaq.fajr.toFixed(3), 'fajr differs');
    // Umm al-Qura's Isha is 120 minutes after Maghrib; MWL is a 17° twilight.
    assert.ok(
      Math.abs(uaq.isha - mwl.isha) > 0.5,
      `Isha should differ by more than 30 minutes (${mwl.isha} vs ${uaq.isha})`
    );
  });

  test('an unknown method falls back to the worldwide default, never throws', () => {
    const bad = times({ method: '__proto__' });
    const mwl = times({ method: 'MWL' });
    assert.equal(bad.fajr.toFixed(3), mwl.fajr.toFixed(3));
  });
});

describe('Asr madhab: the shadow rule a person actually follows', () => {
  test('both shadow rules exist and are the published factors', () => {
    assert.deepEqual(ASR_FACTORS, { Standard: 1, Hanafi: 2 });
  });

  test('Hanafi Asr is LATER than Standard (the whole point of the setting)', () => {
    const standard = times({ asr: 'Standard' });
    const hanafi = times({ asr: 'Hanafi' });
    assert.ok(
      hanafi.asr > standard.asr,
      `Hanafi must fall after Standard (${hanafi.asr} vs ${standard.asr})`
    );
    assert.ok(
      (hanafi.asr - standard.asr) * 60 > 20,
      'and by a visible margin — minutes, not seconds'
    );
  });

  test('the madhab leaves every other prayer untouched', () => {
    const standard = times({ asr: 'Standard' });
    const hanafi = times({ asr: 'Hanafi' });
    for (const name of ['fajr', 'sunrise', 'dhuhr', 'maghrib', 'isha']) {
      assert.equal(hanafi[name].toFixed(6), standard[name].toFixed(6), `${name} unchanged`);
    }
  });

  test('an unknown asr rule degrades to Standard', () => {
    const bad = times({ asr: 'zzz' });
    const standard = times({ asr: 'Standard' });
    assert.equal(bad.asr.toFixed(6), standard.asr.toFixed(6));
  });
});

describe('manual minute offsets', () => {
  test('all six prayers are adjustable, sunrise included', () => {
    assert.deepEqual([...OFFSET_PRAYERS], ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  test('an offset shifts its prayer by exactly that many minutes', () => {
    const base = times();
    const off = applyPrayerOffsets(base, { fajr: 5, maghrib: -3 });
    assert.ok(Math.abs((off.fajr - base.fajr) * 60 - 5) < 1e-6, 'fajr +5');
    assert.ok(Math.abs((off.maghrib - base.maghrib) * 60 + 3) < 1e-6, 'maghrib -3');
    for (const name of ['dhuhr', 'asr', 'isha']) {
      assert.equal(off[name], base[name], `${name} untouched by another prayer's offset`);
    }
  });

  test('hostile offsets are ignored, never clamped into a surprise', () => {
    const base = times();
    assert.equal(applyPrayerOffsets(base, { fajr: 9999 }), base, 'out of range ignored');
    assert.equal(applyPrayerOffsets(base, { fajr: -9999 }), base, 'negative out of range ignored');
    assert.equal(applyPrayerOffsets(base, { fajr: 'x' }), base, 'non-numeric ignored');
    assert.equal(applyPrayerOffsets(base, { fajr: '__proto__' }), base, 'proto key ignored');
  });

  test('offsets ride inside calculateTimes, so every consumer inherits them', () => {
    const base = times();
    const shifted = calculateTimes({ ...CAIRO, date: DATE, offsets: { maghrib: 2 } });
    assert.ok(Math.abs((shifted.maghrib - base.maghrib) * 60 - 2) < 1e-6);
  });

  test('the sanitizer clamps to ±60 and drops zeros', () => {
    const kept = sanitizeSettings({ prayer: { offsets: { fajr: 60, asr: -60, dhuhr: 2 } } });
    assert.deepEqual(kept.prayer.offsets, { fajr: 60, asr: -60, dhuhr: 2 });
    // Clamping (not dropping) is the documented boundary behaviour: a person
    // who drags the slider to the end gets the end, not silence.
    const clamped = sanitizeSettings({ prayer: { offsets: { fajr: 61, asr: -61, dhuhr: 0 } } });
    assert.deepEqual(
      clamped.prayer.offsets,
      { fajr: 60, asr: -60 },
      'over-range clamps, zero drops'
    );
  });

  test('a hostile method cannot resolve through the prototype chain', () => {
    // A crafted backup can carry any short string as `method`. Before the
    // own-property fix, METHODS['__proto__'] returned Object.prototype, whose
    // angles are undefined, and the app displayed meaningless times instead of
    // falling back to the worldwide default.
    const hostile = sanitizeSettings({ prayer: { method: '__proto__' } });
    const times = calculateTimes({
      ...CAIRO,
      date: DATE,
      method: hostile.prayer.method,
    });
    const mwl = calculateTimes({ ...CAIRO, date: DATE, method: 'MWL' });
    assert.equal(times.fajr.toFixed(6), mwl.fajr.toFixed(6), 'falls back to the default');
    assert.ok(Number.isFinite(times.isha), 'and never produces NaN angles');
  });
});

describe('provenance: optional source, honestly unverified (v5.17.40)', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data/prayer-methods.json'), 'utf8'));

  test('every shipped method carries a source with an honest shape', () => {
    assert.equal(data.methods.length, 7, 'no new angles ship with the provenance infra');
    for (const m of data.methods) {
      assert.ok(m.source && typeof m.source === 'object', `${m.id} carries a source`);
      assert.ok(
        typeof m.source.body === 'string' && m.source.body.length > 0,
        `${m.id} names its convention institution`
      );
      assert.ok(
        typeof m.source.document === 'string' && m.source.document.length > 0,
        `${m.id} names the convention document`
      );
      assert.equal(typeof m.source.verified, 'boolean', `${m.id} verified is an explicit boolean`);
      // SOURCES.md prayer section cites only secondary corroboration, so
      // nothing may claim official status.
      assert.equal(m.source.verified, false, `${m.id} stays honestly unverified`);
      if (m.source.url != null) {
        assert.ok(
          typeof m.source.url === 'string' && m.source.url.length > 0,
          `${m.id} url, when present, is a non-empty string`
        );
      }
      const extra = Object.keys(m.source).filter(
        (k) => !['body', 'document', 'url', 'verified'].includes(k)
      );
      assert.deepEqual(extra, [], `${m.id} source carries no unpinned shape: ${extra.join(', ')}`);
    }
  });

  test('JSON source mirrors the domain METHODS source, entry by entry', () => {
    for (const m of data.methods) {
      assert.deepEqual(
        METHODS[m.id]?.source,
        m.source,
        `${m.id} domain source matches the data file`
      );
    }
    for (const id of Object.keys(METHODS)) {
      const listed = data.methods.find((m) => m.id === id);
      assert.ok(listed?.source, `${id} domain source is documented in data`);
    }
  });

  test('the calc sheet renders the source body through the bilingual label', () => {
    const src = readFileSync(join(ROOT, 'js/views/prayer.js'), 'utf8');
    assert.match(src, /prayer\.methodSource/, 'the explainer area renders the source');
  });
});

describe('the three controls are actually reachable in the UI', () => {
  const src = readFileSync(join(ROOT, 'js/views/prayer.js'), 'utf8');

  test('a method select and an Asr/madhab select are rendered', () => {
    assert.match(src, /data-bind="prayer-method"/, 'method picker exists');
    assert.match(src, /data-bind="prayer-asr"/, 'Asr madhab picker exists');
  });

  test('per-prayer offset inputs are rendered, bounded to ±60', () => {
    assert.match(src, /data-bind="prayer-offset"/, 'offset inputs exist');
    assert.match(src, /min="-60" max="60"/, 'bounded to a minute in either direction');
  });

  test('all three are bound through the change/input registry', () => {
    // These are form controls, so they ride the change/input registry
    // (data-bind selectors) rather than the data-action handler map.
    const handlers = readFileSync(join(ROOT, 'js/app/handlers/worship.js'), 'utf8');
    for (const bind of ['prayer-method', 'prayer-asr', 'prayer-offset']) {
      assert.ok(handlers.includes(`[data-bind="${bind}"]`), `${bind} is bound to a handler`);
    }
  });
});
