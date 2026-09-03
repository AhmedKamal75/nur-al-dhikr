/**
 * views/checklist.js
 * A private, local-only daily tracker for the five prayers plus morning/
 * evening adhkar and a Qur'an check-in. Deliberately simple: it's a gentle
 * reminder and a way to see the week at a glance, not a substitute for
 * praying on time, and it never feeds — or is fed by — the app's existing
 * recitation-based streak in Statistics (see js/checklist.js for why).
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { CHECKLIST_ITEMS } from '../core/config.js';
import { selectors } from '../core/state.js';
import { completedCount, checklistStreak, recentHistory } from '../services/checklist.js';
import { viewMenuButton } from '../ui/viewSheet.js';

function dayLabel(dateKeyStr, lang) {
  const d = new Date(dateKeyStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' });
}

export function renderChecklist(state) {
  const lang = state.settings.language;
  const today = selectors.todayChecklist(state);
  const total = CHECKLIST_ITEMS.length;
  const done = completedCount(today);
  const pct = Math.round((done / total) * 100);
  const streak = checklistStreak(state.dailyChecklist);
  const history = recentHistory(state.dailyChecklist, 7);

  const groupRows = (group) =>
    CHECKLIST_ITEMS.filter((i) => i.group === group)
      .map((item) => {
        const checked = !!today[item.id];
        return `
    <label class="checklist-row ${checked ? 'checklist-row--checked' : ''}">
      <input type="checkbox" class="checklist-row__input" data-action="checklist-toggle" data-item="${item.id}" ${checked ? 'checked' : ''} />
      <span class="checklist-row__icon">${icon(item.icon, { size: 18 })}</span>
      <span class="checklist-row__label">${t(item.label, lang)}</span>
      <span class="checklist-row__check">${checked ? icon('check', { size: 16 }) : ''}</span>
    </label>`;
      })
      .join('');

  const historyStrip = history
    .map(
      (d) => `
    <div class="checklist-history__day ${d.complete ? 'checklist-history__day--complete' : ''}" role="img" aria-label="${dayLabel(d.dateKey, lang)}: ${d.count}/${d.total}" title="${d.count}/${d.total}">
      <span class="checklist-history__dot" style="--fill:${Math.round((d.count / d.total) * 100)}%" aria-hidden="true"></span>
      <span class="checklist-history__label" aria-hidden="true">${dayLabel(d.dateKey, lang)}</span>
    </div>`
    )
    .join('');

  return `
  <section class="view view--checklist">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('checklist.title', lang)}</h1>
      ${viewMenuButton('checklist', lang, { labelKey: 'viewMenu.checklist' })}
    </div>
    <p class="view__subtitle">${t('checklist.subtitle', lang)}</p>

    <section class="panel panel--checklist-summary">
      <div class="progress-bar" role="progressbar" aria-label="${t('checklist.progress', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
      </div>
      <div class="checklist-summary__row">
        <p class="panel__subtext" dir="ltr">${done} / ${total} ${t('checklist.today', lang)}</p>
        ${streak > 0 ? `<span class="streak-badge">${icon('flame', { size: 16 })} ${streak} ${t('checklist.dayStreak', lang)}</span>` : ''}
      </div>
    </section>

    <section class="panel">
      <div class="checklist-history">${historyStrip}</div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('checklist.groupPrayer', lang)}</h2></div>
      <div class="checklist-list">${groupRows('prayer')}</div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('checklist.groupAdhkar', lang)}</h2></div>
      <div class="checklist-list">${groupRows('adhkar')}</div>
    </section>
  </section>`;
}
