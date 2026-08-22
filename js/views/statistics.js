/**
 * views/statistics.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { weekWindow, monthWindow, mostReadCategories, intensityBucket, totalInLastDays } from '../statistics.js';

function findCategoryMeta(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return cat;
  }
  return null;
}

export function renderStatistics(state) {
  const lang = state.settings.language;
  const stats = state.statistics;
  const week = weekWindow(stats, 7);
  const maxWeek = Math.max(1, ...week.map((d) => d.count));
  const monthCells = monthWindow(stats);
  const maxMonth = Math.max(1, ...monthCells.filter(Boolean).map((c) => c.count));
  const topCats = mostReadCategories(stats, 5);
  const hasAnyData = stats.totalRecitations > 0;

  const weekBars = week.map((d) => {
    const h = Math.max(4, Math.round((d.count / maxWeek) * 64));
    const dayLabel = d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'narrow' });
    return `
    <div class="bar-chart__col">
      <div class="bar-chart__bar" style="height:${h}px" title="${d.count}"></div>
      <span class="bar-chart__label">${dayLabel}</span>
    </div>`;
  }).join('');

  const heatCells = monthCells.map((c) => {
    if (!c) return `<span class="heatmap__cell heatmap__cell--empty"></span>`;
    const bucket = intensityBucket(c.count, maxMonth);
    return `<span class="heatmap__cell heatmap__cell--${bucket}" title="${c.key}: ${c.count}">${c.date.getDate()}</span>`;
  }).join('');

  const topCatsHTML = topCats.map(({ categoryId, count }) => {
    if (categoryId === 'tasbih-dhikr') {
      return `
      <div class="ranked-row">
        <span class="ranked-row__icon ranked-row__icon--emerald">${icon('tasbih', { size: 16 })}</span>
        <span class="ranked-row__label">${t('nav.tasbih', lang)}</span>
        <span class="ranked-row__value">${count}</span>
      </div>`;
    }
    const cat = findCategoryMeta(state, categoryId);
    return `
    <div class="ranked-row">
      <span class="ranked-row__icon ranked-row__icon--${escapeHTML(cat?.color || 'slate')}">${icon(cat?.icon || 'book', { size: 16 })}</span>
      <span class="ranked-row__label">${escapeHTML(cat ? pickLocale(cat.name, lang) : categoryId)}</span>
      <span class="ranked-row__value">${count}</span>
    </div>`;
  }).join('');

  return `
  <section class="view view--statistics">
    <h1 class="view__title">${t('nav.statistics', lang)}</h1>

    ${hasAnyData ? `
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-card__value">${stats.totalRecitations}</span>
        <span class="stat-card__label">${t('stats.totalRecitations', lang)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${stats.currentStreak}</span>
        <span class="stat-card__label">${t('stats.currentStreak', lang)} (${t('stats.days', lang)})</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${stats.longestStreak}</span>
        <span class="stat-card__label">${t('stats.longestStreak', lang)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${totalInLastDays(stats, 30)}</span>
        <span class="stat-card__label">${t('stats.month', lang)}</span>
      </div>
    </div>

    <section class="panel">
      <div class="panel__header"><h2>${t('stats.week', lang)}</h2></div>
      <div class="bar-chart">${weekBars}</div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('stats.heatmap', lang)}</h2></div>
      <div class="heatmap">
        ${['S','M','T','W','T','F','S'].map((d) => `<span class="heatmap__dow">${d}</span>`).join('')}
        ${heatCells}
      </div>
    </section>

    ${topCats.length ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('stats.mostRead', lang)}</h2></div>
      <div class="ranked-list">${topCatsHTML}</div>
    </section>` : ''}
    ` : `
    <div class="empty-state">
      ${icon('stats', { size: 40 })}
      <p>${t('stats.noData', lang)}</p>
    </div>`}
  </section>`;
}
