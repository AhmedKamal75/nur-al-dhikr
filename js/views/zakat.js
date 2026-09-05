/**
 * views/zakat.js
 * The Zakat calculator: metal-priced nisab (gold 85 g / silver 595 g),
 * seven asset lines + liabilities, a live 2.5% result panel, the Zakat
 * al-Fitr household sub-calculator, and a small saved-snapshots history.
 *
 * Inputs dispatch ZAKAT_INPUT_SET through the store (the app's one-way
 * data flow), and app.js refocuses + restores the caret after the
 * re-render — the same trick the search box uses to survive re-renders.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import {
  computeZakat,
  computeNisab,
  computeFitr,
  formatAmount,
  hawlDueFor,
  daysUntilHawl,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
} from '../domain/zakat.js';
import { viewMenuButton } from '../ui/viewSheet.js';

const ASSET_FIELDS = [
  { id: 'cash', label: 'zakat.cash', placeholder: 'zakat.ph.amount' },
  { id: 'goldGrams', label: 'zakat.goldGrams', placeholder: 'zakat.ph.grams', unit: 'g' },
  { id: 'silverGrams', label: 'zakat.silverGrams', placeholder: 'zakat.ph.grams', unit: 'g' },
  { id: 'investments', label: 'zakat.investments', placeholder: 'zakat.ph.amount' },
  { id: 'businessGoods', label: 'zakat.businessGoods', placeholder: 'zakat.ph.amount' },
  { id: 'receivables', label: 'zakat.receivables', placeholder: 'zakat.ph.amount' },
  { id: 'otherAssets', label: 'zakat.otherAssets', placeholder: 'zakat.ph.amount' },
  {
    id: 'liabilities',
    label: 'zakat.liabilities',
    placeholder: 'zakat.ph.amount',
    isLiability: true,
  },
];

function nisabPanel(state, lang) {
  const prefs = state.zakat.prefs;
  const { threshold, basis } = computeNisab(prefs);
  // FIX (walkthrough v3.4 W-3): this used to pre-escape the currency with
  // escapeHTML() before handing it to formatAmount(), which escapes the
  // symbol itself (review v3.3 B2) — a currency like "AT&T" rendered as
  // "AT&amp;T". The raw string goes to formatAmount(); only the input's
  // value="" attribute uses the pre-escaped form.
  const rawCur = prefs.currency || '';
  const cur = escapeHTML(rawCur);

  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('zakat.nisabTitle', lang)}</h2></div>
    <div class="zakat-nisab-basis" role="group" aria-label="${t('zakat.nisabBasis', lang)}">
      <button type="button" class="chip chip--basis ${basis === 'gold' ? 'chip--basis-active' : ''}" data-action="zakat-set-basis" data-basis="gold" aria-pressed="${basis === 'gold'}">
        ${icon('star', { size: 14 })} ${t('zakat.goldStandard', lang)}
      </button>
      <button type="button" class="chip chip--basis ${basis === 'silver' ? 'chip--basis-active' : ''}" data-action="zakat-set-basis" data-basis="silver" aria-pressed="${basis === 'silver'}">
        ${icon('moon', { size: 14 })} ${t('zakat.silverStandard', lang)}
      </button>
    </div>
    <div class="zakat-price-row">
      <label class="field">${t('zakat.goldPrice', lang, { n: NISAB_GOLD_GRAMS })}
        <input class="input" type="number" min="0" step="any" inputmode="decimal" dir="ltr" data-bind="zakat-gold-price" data-ref="gold-price" value="${escapeHTML(String(prefs.goldPricePerGram))}" placeholder="0.00" />
      </label>
      <label class="field">${t('zakat.silverPrice', lang, { n: NISAB_SILVER_GRAMS })}
        <input class="input" type="number" min="0" step="any" inputmode="decimal" dir="ltr" data-bind="zakat-silver-price" data-ref="silver-price" value="${escapeHTML(String(prefs.silverPricePerGram))}" placeholder="0.00" />
      </label>
      <label class="field">${t('zakat.currency', lang)}
        <input class="input" type="text" dir="ltr" data-bind="zakat-currency" data-ref="currency" value="${cur}" placeholder="${t('zakat.ph.currency', lang)}" />
      </label>
    </div>
    <p class="panel__subtext">${t('zakat.nisabThreshold', lang)}: <b dir="ltr">${formatAmount(threshold, rawCur)}</b></p>
  </section>`;
}

function inputsPanel(state, lang) {
  const inputs = state.zakat.inputs;
  const rows = ASSET_FIELDS.map(
    (f) => `
    <label class="field ${f.isLiability ? 'zakat-field--liability' : ''}">
      <span>${t(f.label, lang)}</span>
      <input class="input" type="number" min="0" step="any" inputmode="decimal" dir="ltr"
        data-bind="zakat-input" data-ref="in-${f.id}" data-field="${f.id}"
        value="${escapeHTML(String(inputs[f.id] || ''))}" placeholder="${f.unit === 'g' ? '0' : '0.00'}" />
    </label>`
  ).join('');

  return `
  <section class="panel">
    <div class="panel__header">
      <h2>${t('zakat.assetsTitle', lang)}</h2>
      <button type="button" class="link-btn link-btn--sm" data-action="zakat-clear-inputs">${t('zakat.clear', lang)}</button>
    </div>
    <div class="zakat-inputs-grid">${rows}</div>
  </section>`;
}

function resultPanel(state, lang) {
  const prefs = state.zakat.prefs;
  const r = computeZakat(state.zakat.inputs, prefs);
  const cur = prefs.currency || '';
  const pct = Math.min(100, r.nisab > 0 ? Math.round((r.netWealth / r.nisab) * 100) : 0);

  return `
  <section class="panel zakat-result ${r.nisabMet ? 'zakat-result--due' : 'zakat-result--none'}">
    <div class="panel__header">
      <h2>${t('zakat.resultTitle', lang)}</h2>
      ${r.nisabMet ? `<span class="chip chip--ok">${icon('check', { size: 13 })} ${t('zakat.nisabMet', lang)}</span>` : `<span class="chip chip--muted">${t('zakat.belowNisab', lang)}</span>`}
    </div>

    <dl class="zakat-breakdown">
      <div><dt>${t('zakat.totalAssets', lang)}</dt><dd dir="ltr">${formatAmount(r.totalAssets, cur)}</dd></div>
      ${r.liabilities > 0 ? `<div><dt>${t('zakat.liabilitiesDeducted', lang)}</dt><dd dir="ltr">− ${formatAmount(r.liabilities, cur)}</dd></div>` : ''}
      <div><dt>${t('zakat.netWealth', lang)}</dt><dd dir="ltr">${formatAmount(r.netWealth, cur)}</dd></div>
      <div><dt>${t('zakat.nisab', lang)} (${r.nisabBasis === 'gold' ? t('zakat.goldStandardShort', lang) : t('zakat.silverStandardShort', lang)})</dt><dd dir="ltr">${formatAmount(r.nisab, cur)}</dd></div>
    </dl>

    <div class="progress-bar" role="progressbar" aria-label="${t('zakat.nisabProgress', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
    </div>
    <p class="panel__subtext">${t('zakat.nisabProgress', lang)}: ${pct}%</p>

    <div class="zakat-due">
      <span class="zakat-due__label">${t('zakat.dueLabel', lang)} (2.5%)</span>
      <span class="zakat-due__amount" dir="ltr">${formatAmount(r.due, cur)}</span>
    </div>
    ${!r.nisabMet ? `<p class="panel__subtext">${t('zakat.noDueNote', lang)}</p>` : `<p class="panel__subtext">${t('zakat.roundUpNote', lang)}</p>`}

    <button type="button" class="btn btn--primary" data-action="zakat-save-snapshot" ${r.netWealth <= 0 ? 'disabled' : ''}>
      ${icon('download', { size: 15 })} ${t('zakat.saveSnapshot', lang)}
    </button>
  </section>`;
}

function fitrPanel(state, lang) {
  // Fit values ride in zakat prefs (persisted): fitrPer + fitrPeople.
  const per = state.zakat.prefs.fitrPer || '';
  const people = state.zakat.prefs.fitrPeople ?? '';
  const f = computeFitr(per || 0, people || 0);
  const cur = state.zakat.prefs.currency || '';

  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('zakat.fitrTitle', lang)}</h2></div>
    <div class="zakat-price-row">
      <label class="field">${t('zakat.fitrPerPerson', lang)}
        <input class="input" type="number" min="0" step="any" inputmode="decimal" dir="ltr" data-bind="zakat-fitr-per" data-ref="fitr-per" value="${escapeHTML(String(per))}" placeholder="0.00" />
      </label>
      <label class="field">${t('zakat.fitrPeople', lang)}
        <input class="input" type="number" min="0" step="1" inputmode="numeric" dir="ltr" data-bind="zakat-fitr-people" data-ref="fitr-people" value="${escapeHTML(String(people))}" placeholder="0" />
      </label>
    </div>
    <div class="zakat-due zakat-due--fitr">
      <span class="zakat-due__label">${t('zakat.fitrTotal', lang)}</span>
      <span class="zakat-due__amount" dir="ltr">${formatAmount(f.total, cur)}</span>
    </div>
    <p class="panel__subtext">${t('zakat.fitrNote', lang)}</p>
  </section>`;
}

/**
 * ONE panel for saved assessments — each row carries everything about a
 * snapshot: hawl date, amount due, nisab status, hawl countdown chip,
 * reminder bell, delete. (Previously the same snapshots were listed twice,
 * in separate History and Hawl panels — exactly the redundancy this app
 * is supposed to be cleaning out of its own data.)
 */
function savedPanel(state, lang) {
  if (!state.zakatHistory.length) return '';
  const cur = state.zakat.prefs.currency || '';
  const fmt = (ts) =>
    new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Soonest hawl first — the row you need to act on sits at the top.
  const rows = [...state.zakatHistory]
    .sort((a, b) => {
      const ha = Number.isFinite(a.hawlDue) ? a.hawlDue : hawlDueFor(a.ts || 0);
      const hb = Number.isFinite(b.hawlDue) ? b.hawlDue : hawlDueFor(b.ts || 0);
      return ha - hb;
    })
    .map((s) => {
      const hawlTs = Number.isFinite(s.hawlDue) ? s.hawlDue : hawlDueFor(s.ts || 0);
      const days = daysUntilHawl(hawlTs);
      const dueSoon = days <= 14;
      const passed = days < 0;
      const status = passed
        ? t('zakat.hawlPassed', lang, { n: Math.abs(days) })
        : days === 0
          ? t('zakat.hawlToday', lang)
          : dueSoon
            ? t('zakat.hawlDueSoon', lang, { n: days })
            : t('zakat.hawlIn', lang, { n: days });
      return `
    <div class="zakat-history-row">
      <div class="zakat-history-row__main">
        <span class="zakat-history-row__date" dir="ltr">${fmt(hawlTs)}</span>
        <span class="zakat-history-row__amount" dir="ltr">${formatAmount(s.due, s.currency || cur)} · ${s.nisabMet ? t('zakat.nisabMetShort', lang) : t('zakat.belowNisabShort', lang)}</span>
      </div>
      <span class="zakat-history-row__meta ${dueSoon && !passed ? 'zakat-hawl--due' : ''} ${passed ? 'zakat-hawl--passed' : ''}">${status}</span>
      <button type="button" class="icon-btn icon-btn--sm ${s.remind !== false ? 'icon-btn--active-bell' : ''}" data-action="zakat-toggle-hawl-remind" data-id="${escapeHTML(s.id)}" aria-pressed="${s.remind !== false}" aria-label="${t('zakat.hawlRemind', lang)}">
        ${icon('bell', { size: 14 })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="zakat-delete-snapshot" data-id="${escapeHTML(s.id)}" aria-label="${t('common.delete', lang)}">
        ${icon('trash', { size: 14 })}
      </button>
    </div>`;
    })
    .join('');

  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('zakat.savedTitle', lang)}</h2></div>
    ${rows}
    <p class="panel__subtext">${t('zakat.hawlNote', lang)}</p>
  </section>`;
}

export function renderZakat(state) {
  const lang = state.settings.language;
  return `
  <section class="view view--zakat">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('zakat.title', lang)}</h1>
      ${viewMenuButton('zakat', lang, { labelKey: 'viewMenu.zakat' })}
    </div>
    <p class="view__subtitle">${t('zakat.subtitle', lang)}</p>

    ${nisabPanel(state, lang)}
    ${inputsPanel(state, lang)}
    ${resultPanel(state, lang)}
    ${fitrPanel(state, lang)}
    ${savedPanel(state, lang)}

    <p class="view__meta">${t('zakat.disclaimer', lang)}</p>
  </section>`;
}
