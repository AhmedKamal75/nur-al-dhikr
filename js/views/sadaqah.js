/**
 * views/sadaqah.js
 * A simple, private, ongoing charity log — distinct from the once-a-year
 * Zakat calculator. Add an entry (amount, cause, date, optional note),
 * see running totals, and remove entries. Everything stays on-device,
 * same as the rest of this app.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, dateKey } from '../utils.js';

const CAUSES = ['general', 'masjid', 'orphans', 'family', 'zakat', 'other'];

function money(n, currency) {
  const formatted = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${escapeHTML(currency)} ${formatted}` : formatted;
}

export function renderSadaqah(state) {
  const lang = state.settings.language;
  const entries = state.sadaqah;
  const currency = state.zakat.currency; // reuse the same currency label the person already set for Zakat

  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonthKey = dateKey(new Date()).slice(0, 7);
  const thisMonth = entries
    .filter((e) => (e.date || '').slice(0, 7) === thisMonthKey)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const causeOptions = CAUSES.map(
    (c) => `<option value="${c}">${t('sadaqah.cause.' + c, lang)}</option>`
  ).join('');

  const rows = entries.length
    ? entries
        .map(
          (e) => `
      <div class="sadaqah-row">
        <div class="sadaqah-row__main">
          <span class="sadaqah-row__amount" dir="ltr">${money(e.amount, currency)}</span>
          <span class="sadaqah-row__cause">${t('sadaqah.cause.' + (e.cause || 'general'), lang)}</span>
          <span class="sadaqah-row__date" dir="ltr">${escapeHTML(e.date || '')}</span>
        </div>
        ${e.note ? `<p class="sadaqah-row__note">${escapeHTML(e.note)}</p>` : ''}
        <button type="button" class="icon-btn icon-btn--sm" data-action="delete-sadaqah" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 14 })}</button>
      </div>`
        )
        .join('')
    : `<p class="empty-hint">${t('sadaqah.empty', lang)}</p>`;

  return `
  <section class="view view--sadaqah">
    <h1 class="view__title">${icon('coins', { size: 22 })} ${t('sadaqah.title', lang)}</h1>
    <p class="view__subtitle">${t('sadaqah.subtitle', lang)}</p>

    <section class="panel panel--sadaqah-totals">
      <div class="sadaqah-totals-row">
        <div class="sadaqah-total">
          <span class="sadaqah-total__label">${t('sadaqah.thisMonth', lang)}</span>
          <span class="sadaqah-total__amount" dir="ltr">${money(thisMonth, currency)}</span>
        </div>
        <div class="sadaqah-total">
          <span class="sadaqah-total__label">${t('sadaqah.allTime', lang)}</span>
          <span class="sadaqah-total__amount" dir="ltr">${money(total, currency)}</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('sadaqah.addEntry', lang)}</h2></div>
      <form class="sadaqah-form" data-form="sadaqah-add">
        <div class="zakat-field">
          <label for="sadaqah-amount">${t('sadaqah.amount', lang)}</label>
          <input type="number" id="sadaqah-amount" name="amount" class="input" min="0" step="0.01" inputmode="decimal" required />
        </div>
        <div class="zakat-field">
          <label for="sadaqah-cause">${t('sadaqah.causeLabel', lang)}</label>
          <select id="sadaqah-cause" name="cause" class="select">${causeOptions}</select>
        </div>
        <div class="zakat-field">
          <label for="sadaqah-date">${t('sadaqah.date', lang)}</label>
          <input type="date" id="sadaqah-date" name="date" class="input" value="${dateKey(new Date())}" />
        </div>
        <div class="zakat-field">
          <label for="sadaqah-note">${t('sadaqah.note', lang)}</label>
          <input type="text" id="sadaqah-note" name="note" class="input" maxlength="120" placeholder="${t('sadaqah.notePlaceholder', lang)}" />
        </div>
        <button type="submit" class="btn btn--primary">${icon('plus', { size: 16 })} ${t('sadaqah.addEntry', lang)}</button>
      </form>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('sadaqah.history', lang)}</h2></div>
      <div class="sadaqah-list">${rows}</div>
    </section>
  </section>`;
}
