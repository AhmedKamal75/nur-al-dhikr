/**
 * tests/city-presets.test.js (v5.17.0, V2) — the offline city directory:
 * unique ids, sane coordinates, known regions, both languages named.
 * A wrong coordinate is a wrong Fajr; this gate keeps the directory honest.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CITY_PRESETS, CITY_REGIONS } from '../js/domain/locations.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

test('city directory: unique ids, finite in-range coordinates, known regions', () => {
  assert.ok(CITY_PRESETS.length >= 60, `directory covers the world, got ${CITY_PRESETS.length}`);
  const ids = CITY_PRESETS.map((c) => c.id);
  assert.deepEqual([...new Set(ids)], ids, 'ids unique');
  for (const c of CITY_PRESETS) {
    assert.ok(c.en && c.ar, `${c.id} named in both languages`);
    assert.ok(Number.isFinite(c.lat) && c.lat >= -90 && c.lat <= 90, `${c.id} lat`);
    assert.ok(Number.isFinite(c.lng) && c.lng >= -180 && c.lng <= 180, `${c.id} lng`);
    assert.ok(CITY_REGIONS.includes(c.region), `${c.id} region known`);
  }
  for (const r of CITY_REGIONS) {
    assert.ok(
      CITY_PRESETS.some((c) => c.region === r),
      `region ${r} non-empty`
    );
    assert.ok(en[`prayer.region.${r}`], `EN prayer.region.${r}`);
    assert.ok(ar[`prayer.region.${r}`], `AR prayer.region.${r}`);
  }
});
