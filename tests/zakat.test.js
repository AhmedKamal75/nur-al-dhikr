/**
 * zakat.test.js — pure-logic tests for the Zakat calculator module.
 * Run: node --test tests/zakat.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNisab,
  computeZakat,
  computeFitr,
  roundUpToUnit,
  formatAmount,
  hawlDueFor,
  daysUntilHawl,
  HAWL_DAYS,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
} from '../js/zakat.js';

test('nisab constants are the classical weights', () => {
  assert.equal(NISAB_GOLD_GRAMS, 85);
  assert.equal(NISAB_SILVER_GRAMS, 595);
});

test('computeNisab multiplies weight by price for the chosen basis', () => {
  const gold = computeNisab({ basis: 'gold', goldPricePerGram: 40, silverPricePerGram: 1 });
  assert.equal(gold.basis, 'gold');
  assert.equal(gold.threshold, 3400);

  const silver = computeNisab({ basis: 'silver', goldPricePerGram: 40, silverPricePerGram: 1 });
  assert.equal(silver.basis, 'silver');
  assert.equal(silver.threshold, 595);
});

test('computeNisab falls back to gold for unknown basis and bad prices', () => {
  const prefs = { basis: 'banana', goldPricePerGram: 'not-a-number', silverPricePerGram: -3 };
  const { basis, threshold } = computeNisab(prefs);
  assert.equal(basis, 'gold');
  assert.equal(threshold, 0); // unpriced metals can never be crossed
});

test('roundUpToUnit always rounds the due UP, never down', () => {
  assert.equal(roundUpToUnit(25.01), 26);
  assert.equal(roundUpToUnit(25.4), 26);
  assert.equal(roundUpToUnit(25), 25);
  assert.equal(roundUpToUnit(0), 0);
  assert.equal(roundUpToUnit(-10), 0);
  // fp-noise guard: 1000 * 0.025 = 25.000000000000004 in float sometimes
  assert.equal(roundUpToUnit(25.000000000000004), 25);
});

test('computeZakat: wealth above nisab pays exactly 2.5%, rounded up', () => {
  const r = computeZakat(
    {
      cash: 5000,
      goldGrams: 10,
      investments: 2000,
      businessGoods: 0,
      receivables: 500,
      otherAssets: 0,
      liabilities: 1000,
    },
    { basis: 'gold', goldPricePerGram: 30, silverPricePerGram: 0.5 }
  );
  // gold 10g*30 = 300; liquid = 5000+2000+0+500+0 = 7500; total 7800; net 6800
  assert.equal(r.totalAssets, 7800);
  assert.equal(r.netWealth, 6800);
  assert.equal(r.nisab, 2550); // 85*30
  assert.equal(r.nisabMet, true);
  assert.equal(r.due, 170); // 6800 * 0.025 = 170 exactly
});

test('computeZakat: below nisab owes nothing', () => {
  const r = computeZakat(
    { cash: 100 },
    { basis: 'gold', goldPricePerGram: 50, silverPricePerGram: 1 }
  );
  assert.equal(r.nisabMet, false);
  assert.equal(r.due, 0);
});

test('computeZakat: fractional due is rounded up to whole unit', () => {
  const r = computeZakat(
    { cash: 1000 },
    { basis: 'silver', goldPricePerGram: 999, silverPricePerGram: 1 }
  );
  // nisab = 595; net 1000 → due raw 25.000000000000004-ish → 25
  assert.equal(r.dueRaw > 24.9 && r.dueRaw < 25.1, true);
  assert.equal(r.due, 25);
});

test('computeZakat: liabilities can bring wealth below zero (clamped)', () => {
  const r = computeZakat(
    { cash: 1000, liabilities: 5000 },
    { basis: 'silver', silverPricePerGram: 1 }
  );
  assert.equal(r.netWealth, 0);
  assert.equal(r.nisabMet, false);
  assert.equal(r.due, 0);
});

test('computeZakat: string inputs and negatives are sanitized', () => {
  const r = computeZakat(
    { cash: '1500.5', investments: '-400', otherAssets: 'abc' },
    { basis: 'silver', silverPricePerGram: 1 }
  );
  assert.equal(r.totalAssets, 1500.5); // -400 → 0, 'abc' → 0
});

test('computeFitr multiplies per-person by household and rounds up', () => {
  assert.deepEqual(computeFitr(30, 4), { perPerson: 30, people: 4, total: 120 });
  const frac = computeFitr(25.5, 3); // 76.5 → 77
  assert.equal(frac.total, 77);
  assert.equal(computeFitr(0, 5).total, 0);
  assert.equal(computeFitr(10, 'bad').people, 0);
});

test('formatAmount adds separators and trims trailing zeros', () => {
  assert.equal(formatAmount(1234.5), '1,234.50');
  assert.equal(formatAmount(1200000), '1,200,000');
  assert.equal(formatAmount(42), '42');
  assert.equal(formatAmount(1234.5678), '1,234.57');
  assert.equal(formatAmount(5, 'EGP'), '5 EGP');
});

test('hawlDueFor = assessment + 354 lunar days', () => {
  const ts = Date.UTC(2026, 0, 1);
  assert.equal(hawlDueFor(ts) - ts, HAWL_DAYS * 86400000);
});

test('daysUntilHawl: future, today, and past cases at day granularity', () => {
  const now = new Date(2026, 5, 15, 9, 30).getTime();
  const mk = (d) => new Date(2026, 5, d).getTime();
  assert.equal(daysUntilHawl(mk(20), now), 5); // upcoming
  assert.equal(daysUntilHawl(mk(15), now), 0); // today
  assert.equal(daysUntilHawl(mk(10), now), -5); // passed 5 days ago
  // same-day time-of-day differences must not skew the day count
  assert.equal(daysUntilHawl(new Date(2026, 5, 15, 23, 59).getTime(), now), 0);
});
