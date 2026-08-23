/**
 * zakat.js
 * Pure Zakat al-Mal calculation. No DOM, no state.js, no network — every
 * amount the person enters is assumed to already be in whatever currency
 * they think in, and gold/silver spot prices are supplied by the person
 * rather than fetched, since this app makes no network calls at runtime.
 *
 * Zakat is due at 2.5% of zakatable wealth held for a full lunar year,
 * once that wealth meets or exceeds the nisab (minimum) threshold. Nisab
 * is classically defined as the value of 85g of gold or 595g of silver;
 * scholars differ on which of the two to apply today (silver gives a
 * lower, more inclusive threshold). This module computes both and lets
 * the caller pick.
 *
 * This is a calculation aid, not a fatwa — it doesn't account for every
 * fiqh nuance (e.g. zakat on personal-use jewelry, business inventory
 * valuation methods, or a Hijri-year holding requirement), and a person
 * with a complex financial situation should still confirm with a
 * knowledgeable scholar.
 */

export const ZAKAT_RATE = 0.025;
export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;

export const ZAKAT_ASSET_FIELDS = Object.freeze([
  'cash',
  'gold',
  'silver',
  'investments',
  'business',
  'receivables',
  'other',
]);

function positiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {object} input - raw, possibly-string field values (as they'd
 *   arrive from a form): the seven asset fields, `liabilities`,
 *   `goldPricePerGram`, `silverPricePerGram`, `nisabStandard` ('gold' | 'silver').
 * @returns {{assets, totalAssets, liabilities, netWealth, goldNisab, silverNisab,
 *   nisabThreshold, standard, meetsNisab, zakatDue}}
 *   `meetsNisab` is `null` (not `false`) when the relevant price wasn't
 *   entered — the caller should distinguish "not due" from "unknown".
 */
export function calculateZakat(input = {}) {
  const assets = {};
  for (const field of ZAKAT_ASSET_FIELDS) assets[field] = positiveNumber(input[field]);
  const totalAssets = ZAKAT_ASSET_FIELDS.reduce((sum, field) => sum + assets[field], 0);
  const liabilities = positiveNumber(input.liabilities);
  const netWealth = Math.max(0, totalAssets - liabilities);

  const goldPrice = positiveNumber(input.goldPricePerGram);
  const silverPrice = positiveNumber(input.silverPricePerGram);
  const goldNisab = goldPrice > 0 ? goldPrice * GOLD_NISAB_GRAMS : null;
  const silverNisab = silverPrice > 0 ? silverPrice * SILVER_NISAB_GRAMS : null;

  const standard = input.nisabStandard === 'gold' ? 'gold' : 'silver';
  const nisabThreshold = standard === 'gold' ? goldNisab : silverNisab;

  const meetsNisab = nisabThreshold == null ? null : netWealth >= nisabThreshold;
  const zakatDue = meetsNisab ? Math.round(netWealth * ZAKAT_RATE * 100) / 100 : 0;

  return {
    assets,
    totalAssets,
    liabilities,
    netWealth,
    goldNisab,
    silverNisab,
    nisabThreshold,
    standard,
    meetsNisab,
    zakatDue,
  };
}
