/**
 * zakat.js
 * Pure Zakat arithmetic: nisab thresholds, zakatable-wealth aggregation,
 * the 2.5% due amount, the mandatory round-up to whole currency units,
 * and the Zakat al-Fitr per-household amount. No DOM, no store, no
 * network — fully unit-tested and consumed by views/zakat.js.
 *
 * Fiqh basis (Hanafi-majority mainstream, stated in-app too):
 *  - Gold nisab: 85 g of pure gold (20 mithqal).
 *  - Silver nisab: 595 g of pure silver (200 dirhams).
 *  - Rate: 2.5% (1/40) of net zakatable wealth held for one lunar year.
 *  - The paid amount is rounded UP to the smallest whole currency unit
 *    (one never rounds the poor person's share down).
 *  - Zakat al-Fitr: one sa' (~2.5–3 kg) of the local staple food per
 *    household member, payable before the Eid prayer.
 *
 * This module does math, not fatwas: the app's UI tells the user to
 * confirm figures with a qualified scholar for their madhhab/situation.
 */

export const ZAKAT_RATE = 0.025;
export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;

/** Safely coerce user input to a non-negative finite number. */
function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Compute the nisab threshold in the user's own currency.
 * prefs: { basis: 'gold'|'silver', goldPricePerGram, silverPricePerGram }
 */
export function computeNisab(prefs) {
  const basis = prefs?.basis === 'silver' ? 'silver' : 'gold';
  const threshold =
    basis === 'gold'
      ? NISAB_GOLD_GRAMS * num(prefs?.goldPricePerGram)
      : NISAB_SILVER_GRAMS * num(prefs?.silverPricePerGram);
  return { basis, threshold };
}

/**
 * Round the due amount UP to the smallest whole currency unit.
 * e.g. 25.4 -> 26, 25.0001 -> 26, 25 -> 25. Math.ceil on the absolute
 * value keeps the shariah rule (never round down) intact for 0 due too.
 */
export function roundUpToUnit(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.ceil(amount - 1e-9); // epsilon guards fp noise like 25.000000000000004
}

/**
 * Aggregate zakatable wealth and compute the due amount.
 *
 * inputs (all strings-or-numbers, own currency):
 *   cash            — cash on hand + bank accounts
 *   goldGrams       — weight of gold owned
 *   silverGrams     — weight of silver owned
 *   investments     — market value of shares/funds (fully zakatable simplification)
 *   businessGoods   — inventory/sale stock at current market value
 *   receivables     — money lent out that you expect back (good loans)
 *   otherAssets     — anything else zakatable (crypto etc.)
 *   liabilities     — debts/bills due now, deducted
 *
 * prefs: as in computeNisab (also values the gold/silver weight above).
 *
 * Returns a full breakdown so the UI can show every intermediate figure.
 */
export function computeZakat(inputs, prefs) {
  const i = inputs || {};
  const goldGrams = num(i.goldGrams);
  const silverGrams = num(i.silverGrams);
  const goldValue = goldGrams * num(prefs?.goldPricePerGram);
  const silverValue = silverGrams * num(prefs?.silverPricePerGram);

  const liquid =
    num(i.cash) +
    num(i.investments) +
    num(i.businessGoods) +
    num(i.receivables) +
    num(i.otherAssets);
  const totalAssets = liquid + goldValue + silverValue;
  const liabilities = num(i.liabilities);
  const netWealth = Math.max(0, totalAssets - liabilities);

  const { basis, threshold } = computeNisab(prefs);
  const nisabMet = netWealth >= threshold && threshold > 0;
  const rawDue = nisabMet ? netWealth * ZAKAT_RATE : 0;

  return {
    goldGrams,
    silverGrams,
    goldValue,
    silverValue,
    liquid,
    totalAssets,
    liabilities,
    netWealth,
    nisab: threshold,
    nisabBasis: basis,
    nisabMet,
    rate: ZAKAT_RATE,
    due: roundUpToUnit(rawDue),
    dueRaw: rawDue,
  };
}

/**
 * Zakat al-Fitr: per-person staple-food value × household size.
 * The per-person amount is whatever the local staple (rice, wheat, dates…)
 * costs for one sa' — the user enters it; nothing is fetched online.
 */
export function computeFitr(perPersonValue, people) {
  const per = num(perPersonValue);
  const count = Math.max(0, Math.round(num(people)));
  return { perPerson: per, people: count, total: roundUpToUnit(per * count) };
}

/** Format a number for display with up to 2 decimals, thousands separators.
 * The currency symbol comes from user input (or an imported backup), and
 * every caller interpolates the result directly into HTML — so the symbol
 * is escaped HERE, once, at the boundary. (FIX review v3.3 B2: a crafted
 * `zakat.prefs.currency` used to inject markup into the result panel.) */
export function formatAmount(value, symbol = '') {
  const n = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(n * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const trimmed = decPart === '00' ? withSeparators : `${withSeparators}.${decPart}`;
  const safeSymbol = String(symbol ?? '')
    .slice(0, 12)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return safeSymbol ? `${trimmed} ${safeSymbol}`.trim() : trimmed;
}

/** Length of a lunar (hijri) year in days, as used for the hawl. */
export const HAWL_DAYS = 354;

/**
 * The hawl anniversary of a zakat assessment: one lunar year (~354 days)
 * after the assessment date. Zakat becomes due again each time a full
 * hawl passes on wealth still at/above nisab.
 */
export function hawlDueFor(assessmentTs) {
  return assessmentTs + HAWL_DAYS * 86400000;
}

/**
 * Signed whole days from `now` until the hawl date: positive = upcoming,
 * 0 = today is the anniversary, negative = passed N days ago.
 */
export function daysUntilHawl(hawlTs, now = Date.now()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfHawl = new Date(hawlTs);
  startOfHawl.setHours(0, 0, 0, 0);
  return Math.round((startOfHawl - startOfToday) / 86400000);
}
