/**
 * views/zakat.js
 * Offline Zakat al-Mal calculator. No live gold/silver price feed (this
 * app makes no network calls) — prices are entered manually and remembered.
 * Number fields update the store on 'change' (blur), not 'input', matching
 * the existing dailyGoal/prayer-method pattern in app.js — the renderer
 * does a full innerHTML swap on every dispatch, so binding on every
 * keystroke would steal focus mid-type.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { calculateZakat, ZAKAT_RATE } from '../zakat.js';

const ASSET_ROWS = [
  { key: 'cash', label: 'zakat.cash' },
  { key: 'gold', label: 'zakat.gold' },
  { key: 'silver', label: 'zakat.silver' },
  { key: 'investments', label: 'zakat.investments' },
  { key: 'business', label: 'zakat.business' },
  { key: 'receivables', label: 'zakat.receivables' },
  { key: 'other', label: 'zakat.other' },
];

function money(n, currency) {
  const formatted = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${escapeHTML(currency)} ${formatted}` : formatted;
}

export function renderZakat(state) {
  const lang = state.settings.language;
  const z = state.zakat;
  const result = calculateZakat(z);

  const assetInputs = ASSET_ROWS.map(
    (row) => `
    <div class="zakat-field">
      <label for="zakat-${row.key}">${t(row.label, lang)}</label>
      <input type="number" id="zakat-${row.key}" class="input" min="0" step="0.01" inputmode="decimal" value="${z[row.key] || 0}" data-bind="zakat-${row.key}" />
    </div>`
  ).join('');

  return `
  <section class="view view--zakat">
    <h1 class="view__title">${icon('calculator', { size: 22 })} ${t('zakat.title', lang)}</h1>
    <p class="view__subtitle">${t('zakat.subtitle', lang)}</p>

    <section class="panel panel--zakat-result">
      <span class="zakat-result__label">${t('zakat.due', lang)}</span>
      <span class="zakat-result__amount" dir="ltr">${money(result.zakatDue, z.currency)}</span>
      ${
        result.nisabThreshold == null
          ? `<p class="panel__subtext">${t('zakat.nisabUnknown', lang)}</p>`
          : result.meetsNisab
            ? `<p class="panel__subtext">${t('zakat.meetsNisab', lang, { n: money(result.nisabThreshold, z.currency) })}</p>`
            : `<p class="panel__subtext">${t('zakat.belowNisab', lang, { n: money(result.nisabThreshold, z.currency) })}</p>`
      }
      <p class="panel__subtext" dir="ltr">${t('zakat.netWealth', lang)}: ${money(result.netWealth, z.currency)}</p>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('zakat.currency', lang)}</h2></div>
      <input type="text" class="input" maxlength="8" placeholder="${t('zakat.currencyPlaceholder', lang)}" value="${escapeHTML(z.currency || '')}" data-bind="zakat-currency" />
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('zakat.assets', lang)}</h2></div>
      <div class="zakat-fields">${assetInputs}</div>
      <div class="zakat-field">
        <label for="zakat-liabilities">${t('zakat.liabilities', lang)}</label>
        <input type="number" id="zakat-liabilities" class="input" min="0" step="0.01" inputmode="decimal" value="${z.liabilities || 0}" data-bind="zakat-liabilities" />
      </div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('zakat.nisab', lang)}</h2></div>
      <p class="panel__subtext">${t('zakat.nisabExplain', lang)}</p>
      <div class="zakat-fields">
        <div class="zakat-field">
          <label for="zakat-gold-price">${t('zakat.goldPricePerGram', lang)}</label>
          <input type="number" id="zakat-gold-price" class="input" min="0" step="0.01" inputmode="decimal" value="${z.goldPricePerGram ?? ''}" data-bind="zakat-goldPricePerGram" />
        </div>
        <div class="zakat-field">
          <label for="zakat-silver-price">${t('zakat.silverPricePerGram', lang)}</label>
          <input type="number" id="zakat-silver-price" class="input" min="0" step="0.01" inputmode="decimal" value="${z.silverPricePerGram ?? ''}" data-bind="zakat-silverPricePerGram" />
        </div>
      </div>
      <p class="field-label">${t('zakat.nisabStandard', lang)}</p>
      <div class="segmented">
        <button type="button" class="segmented__btn ${z.nisabStandard === 'silver' ? 'segmented__btn--active' : ''}" data-action="set-zakat-standard" data-value="silver">${t('zakat.standardSilver', lang)}</button>
        <button type="button" class="segmented__btn ${z.nisabStandard === 'gold' ? 'segmented__btn--active' : ''}" data-action="set-zakat-standard" data-value="gold">${t('zakat.standardGold', lang)}</button>
      </div>
    </section>

    <p class="view__meta">${t('zakat.disclaimer', lang, { rate: (ZAKAT_RATE * 100).toString() })}</p>
  </section>`;
}
