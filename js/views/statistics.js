/**
 * views/statistics.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import {
  weekWindow,
  monthWindow,
  mostReadCategories,
  intensityBucket,
  totalInLastDays,
  averagePerDay,
  activeDays,
  monthTotal,
} from '../statistics.js';

function findCategoryMeta(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return cat;
  }
  return null;
}

/** 'YYYY-MM' for a Date, matching the statsHeatmapRef format in state. */
function monthRef(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Parse a 'YYYY-MM' ref back into a local Date (first of month). */
function refDate(ref) {
  const [y, m] = ref.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function renderStatistics(state) {
  const lang = state.settings.language;
  const stats = state.statistics;
  const week = weekWindow(stats, 7);
  const weekTotal = week.reduce((a, d) => a + d.count, 0);
  const maxWeek = Math.max(1, ...week.map((d) => d.count));
  const bestDayIdx = week.reduce((best, d, i) => (d.count > week[best].count ? i : best), 0);

  // Heatmap focus month: ephemeral state (defaults to the current month), so
  // browsing history never persists and a fresh open always lands on "now".
  const currentRef = monthRef(new Date());
  const focusRef = state.statsHeatmapRef || currentRef;
  const focusDate = refDate(focusRef);
  const monthCells = monthWindow(stats, focusDate);
  const maxMonth = Math.max(1, ...monthCells.filter(Boolean).map((c) => c.count));
  const focusTotal = monthTotal(stats, focusDate);
  const topCats = mostReadCategories(stats, 5);
  const hasAnyData = stats.totalRecitations > 0;

  const weekBars = week
    .map((d, i) => {
      const h = Math.max(4, Math.round((d.count / maxWeek) * 104));
      const dayLabel = d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        weekday: 'narrow',
      });
      const isBest = i === bestDayIdx && d.count > 0;
      return `
    <div class="bar-chart__col">
      <span class="bar-chart__value ${d.count ? '' : 'bar-chart__value--zero'}">${d.count || ''}</span>
      <div class="bar-chart__bar ${isBest ? 'bar-chart__bar--best' : ''}" style="height:${h}px" title="${d.count}"></div>
      <span class="bar-chart__label">${dayLabel}</span>
    </div>`;
    })
    .join('');

  const heatCells = monthCells
    .map((c) => {
      if (!c) return `<span class="heatmap__cell heatmap__cell--empty"></span>`;
      const bucket = intensityBucket(c.count, maxMonth);
      return `<span class="heatmap__cell heatmap__cell--${bucket}" title="${c.key}: ${c.count}">${c.date.getDate()}</span>`;
    })
    .join('');

  const monthLabel = focusDate.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  const canGoNext = focusRef !== currentRef;
  const canGoPrev =
    focusRef !== monthRef(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1));

  const topCatsHTML = topCats
    .map(({ categoryId, count }) => {
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
    })
    .join('');

  return `
  <section class="view view--statistics">
    <h1 class="view__title">${t('nav.statistics', lang)}</h1>

    ${
      hasAnyData
        ? `
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
      <div class="stat-card">
        <span class="stat-card__value">${averagePerDay(stats, 30)}</span>
        <span class="stat-card__label">${t('stats.avgPerDay', lang)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${activeDays(stats)}</span>
        <span class="stat-card__label">${t('stats.activeDays', lang)}</span>
      </div>
    </div>

    <section class="panel">
      <div class="panel__header">
        <h2>${t('stats.week', lang)}</h2>
        <span class="panel__header-side" dir="ltr">${t('stats.weekTotal', lang)}: ${weekTotal}</span>
      </div>
      <div class="bar-chart bar-chart--lg">${weekBars}</div>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h2>${t('stats.heatmap', lang)}</h2>
        <span class="heatmap-month-nav">
          <button type="button" class="icon-btn icon-btn--sm" data-action="stats-heatmap-shift" data-delta="-1" aria-label="${t('stats.monthPrev', lang)}" ${canGoPrev ? '' : 'disabled'}>${icon('chevronLeft', { size: 16 })}</button>
          <span class="heatmap-month-nav__label">${monthLabel}</span>
          <button type="button" class="icon-btn icon-btn--sm" data-action="stats-heatmap-shift" data-delta="1" aria-label="${t('stats.monthNext', lang)}" ${canGoNext ? '' : 'disabled'}>${icon('chevronRight', { size: 16 })}</button>
        </span>
      </div>
      <div class="heatmap">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="heatmap__dow">${d}</span>`).join('')}
        ${heatCells}
      </div>
      ${focusTotal ? `<p class="panel__subtext" dir="ltr">${escapeHTML(monthLabel)} — ${t('stats.monthTotalLabel', lang)}: ${focusTotal}</p>` : ''}
    </section>

    ${
      topCats.length
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('stats.mostRead', lang)}</h2></div>
      <div class="ranked-list">${topCatsHTML}</div>
    </section>`
        : ''
    }
    `
        : `
    <div class="empty-state">
      ${icon('stats', { size: 40 })}
      <p>${t('stats.noData', lang)}</p>
    </div>`
    }
  </section>`;
}
