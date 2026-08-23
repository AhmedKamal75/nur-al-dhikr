import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateZakat, ZAKAT_RATE, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS } from '../js/zakat.js';

describe('calculateZakat', () => {
  test('sums the seven asset fields and subtracts liabilities', () => {
    const result = calculateZakat({
      cash: 1000,
      gold: 500,
      silver: 100,
      investments: 200,
      business: 300,
      receivables: 50,
      other: 50,
      liabilities: 200,
    });
    assert.equal(result.totalAssets, 2200);
    assert.equal(result.netWealth, 2000);
  });

  test('never lets net wealth go negative when liabilities exceed assets', () => {
    const result = calculateZakat({ cash: 100, liabilities: 500 });
    assert.equal(result.netWealth, 0);
    assert.equal(result.zakatDue, 0);
  });

  test('ignores negative or non-numeric asset input (treats as 0)', () => {
    const result = calculateZakat({ cash: -50, gold: 'not a number', silver: undefined });
    assert.equal(result.totalAssets, 0);
  });

  test('nisabThreshold is null when no price was entered, and meetsNisab is null (not false)', () => {
    const result = calculateZakat({ cash: 100000 });
    assert.equal(result.nisabThreshold, null);
    assert.equal(result.meetsNisab, null);
    assert.equal(result.zakatDue, 0);
  });

  test('computes the silver nisab threshold and flags wealth above it as due', () => {
    const silverPrice = 1;
    const result = calculateZakat({
      cash: SILVER_NISAB_GRAMS + 100,
      silverPricePerGram: silverPrice,
      nisabStandard: 'silver',
    });
    assert.equal(result.silverNisab, SILVER_NISAB_GRAMS * silverPrice);
    assert.equal(result.nisabThreshold, result.silverNisab);
    assert.equal(result.meetsNisab, true);
    assert.equal(result.zakatDue, Math.round(result.netWealth * ZAKAT_RATE * 100) / 100);
  });

  test('computes the gold nisab threshold and flags wealth below it as not due', () => {
    const goldPrice = 10;
    const result = calculateZakat({
      cash: 1,
      goldPricePerGram: goldPrice,
      nisabStandard: 'gold',
    });
    assert.equal(result.goldNisab, GOLD_NISAB_GRAMS * goldPrice);
    assert.equal(result.meetsNisab, false);
    assert.equal(result.zakatDue, 0);
  });

  test('exactly meeting the nisab threshold counts as due (>=, not >)', () => {
    const silverPrice = 2;
    const nisabValue = SILVER_NISAB_GRAMS * silverPrice;
    const result = calculateZakat({
      cash: nisabValue,
      silverPricePerGram: silverPrice,
      nisabStandard: 'silver',
    });
    assert.equal(result.meetsNisab, true);
  });

  test('defaults to the silver standard when nisabStandard is missing or invalid', () => {
    const result = calculateZakat({ cash: 1000, goldPricePerGram: 10, silverPricePerGram: 1 });
    assert.equal(result.standard, 'silver');
    assert.equal(result.nisabThreshold, result.silverNisab);
  });
});
