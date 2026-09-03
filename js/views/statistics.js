/**
 * views/statistics.js
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { dateKey, escapeHTML, categoryDisplayName } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { worshipReview, reviewIsEmpty, keyToDate } from '../domain/review.js';
import {
  weekWindow,
  monthWindow,
  mostReadCategories,
  intensityBucket,
  totalInLastDays,
  averagePerDay,
  activeDays,
  monthTotal,
} from '../domain/statistics.js';
import { viewMenuButton } from '../ui/viewSheet.js';

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

/**
 * v3.23.0 — the worship "year in review" panel, top of the Statistics
 * view. Computed entirely from data already tracked (js/review.js);
 * framed as a quiet summary of what the person actually did — never a
 * count of days missed, never a leaderboard. Every label uses the
 * "label: {n}" shape so Arabic number agreement can't betray the copy.
 */
function reviewStatCard(lang, labelKey, n) {
  return `
      <div class="stat-card">
        <span class="stat-card__value">${Number(n) || 0}</span>
        <span class="stat-card__label">${t(labelKey, lang)}</span>
      </div>`;
}

function reviewWindowBlock(lang, title, win, fasts, sadaqah) {
  return `
    <div class="review-window">
      <h3 class="review-window__title">${escapeHTML(title)}</h3>
      <div class="stat-grid">
        ${reviewStatCard(lang, 'review.pages', win.pages)}
        ${reviewStatCard(lang, 'review.recitations', win.recitations)}
        ${reviewStatCard(lang, 'review.prayers', win.prayers)}
        ${reviewStatCard(lang, 'review.jamaah', win.jamaah)}
        ${reviewStatCard(lang, 'review.fasts', fasts)}
        ${reviewStatCard(lang, 'review.sadaqah', sadaqah)}
      </div>
    </div>`;
}

function reviewPanelHTML(state) {
  const lang = state.settings.language;
  const review = worshipReview(state);
  if (reviewIsEmpty(review)) {
    return `
    <section class="panel">
      <div class="panel__header"><h2>${t('review.title', lang)}</h2></div>
      ${emptyStateHTML({ iconName: 'book', title: t('review.empty', lang) })}
    </section>`;
  }
  const since = review.sinceKey
    ? keyToDate(review.sinceKey).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const streakCards = `
      <div class="stat-grid">
        ${reviewStatCard(lang, 'review.longestDhikr', review.streaks.longestRecitations)}
        ${reviewStatCard(lang, 'review.longestReading', review.streaks.longestReading)}
        ${reviewStatCard(lang, 'review.currentReading', review.streaks.currentReading)}
      </div>`;
  const allTimeCards = `
      <div class="stat-grid">
        ${reviewStatCard(lang, 'review.bookmarks', review.allTime.ayahBookmarks)}
        ${reviewStatCard(lang, 'review.khatmas', review.allTime.khatmas)}
        ${reviewStatCard(lang, 'review.mushafPages', review.allTime.mushafPages)}
      </div>`;
  return `
    <section class="panel">
      <div class="panel__header"><h2>${t('review.title', lang)}</h2></div>
      <p class="panel__subtext">${t('review.subtitle', lang)}</p>
      ${
        since
          ? `<p class="panel__subtext">${t('review.since', lang, { date: since })} · ${t('review.daysActive', lang, { n: review.windows.all.days })}</p>`
          : ''
      }
      ${reviewWindowBlock(lang, t('review.last90', lang), review.windows.d90, review.fasts.d90, review.sadaqah.d90)}
      ${reviewWindowBlock(lang, t('review.hijriYear', lang, { n: review.hijriYear }), review.windows.hijriYear, review.fasts.hijriYear, review.sadaqah.hijriYear)}
      ${reviewWindowBlock(lang, t('review.allTime', lang), review.windows.all, review.fasts.all, review.sadaqah.all)}
      <h3 class="review-window__title">${t('review.streaks', lang)}</h3>
      ${streakCards}
      <h3 class="review-window__title">${t('review.kept', lang)}</h3>
      ${allTimeCards}
    </section>`;
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
      const fullDay = d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        weekday: 'long',
      });
      const isBest = i === bestDayIdx && d.count > 0;
      return `
    <div class="bar-chart__col">
      <span class="bar-chart__value ${d.count ? '' : 'bar-chart__value--zero'}">${escapeHTML(String(d.count || ''))}</span>
      <div class="bar-chart__bar ${isBest ? 'bar-chart__bar--best' : ''}" style="--bar-h:${h}px" role="img" aria-label="${escapeHTML(fullDay)}: ${escapeHTML(String(d.count))}" title="${escapeHTML(String(d.count))}"></div>
      <span class="bar-chart__label" aria-hidden="true">${dayLabel}</span>
    </div>`;
    })
    .join('');

  // (v4.2) the today marker must key on the LOCAL date, like monthCells —
  // a UTC key pointed at tomorrow's cell every evening in UTC−X zones.
  const todayKey = dateKey(new Date());
  const heatCells = monthCells
    .map((c) => {
      if (!c) return `<span class="heatmap__cell heatmap__cell--empty"></span>`;
      const bucket = intensityBucket(c.count, maxMonth);
      const dayLabel = c.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
      });
      const isToday = c.key === todayKey;
      return `<span class="heatmap__cell heatmap__cell--${bucket} ${
        isToday ? 'heatmap__cell--today' : ''
      }" role="img" aria-label="${escapeHTML(dayLabel)}: ${escapeHTML(String(c.count))}" title="${escapeHTML(c.key)}: ${escapeHTML(String(c.count))}">${c.date.getDate()}</span>`;
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
        <span class="ranked-row__value">${escapeHTML(String(count))}</span>
      </div>`;
      }
      const cat = findCategoryMeta(state, categoryId);
      return `
    <div class="ranked-row">
      <span class="ranked-row__icon ranked-row__icon--${escapeHTML(cat?.color || 'slate')}">${icon(cat?.icon || 'book', { size: 16 })}</span>
      <span class="ranked-row__label">${escapeHTML(cat ? categoryDisplayName(cat, lang) : categoryId)}</span>
      <span class="ranked-row__value">${escapeHTML(String(count))}</span>
    </div>`;
    })
    .join('');

  return `
  <section class="view view--statistics">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.statistics', lang)}</h1>
      ${viewMenuButton('statistics', lang, { labelKey: 'viewMenu.statistics' })}
    </div>

    ${reviewPanelHTML(state)}

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

    <a class="stat-garden-link" href="${buildHash(VIEWS.GARDEN)}" data-action="navigate" data-view="${VIEWS.GARDEN}">
      ${icon('sprout', { size: 18 })}
      <span>${t('garden.invite', lang)}</span>
      ${icon('chevronRight', { size: 16 })}
    </a>

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
        <div class="heatmap__dow" aria-hidden="true">${(lang === 'ar'
          ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
          : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        )
          .map((d) => `<span>${d}</span>`)
          .join('')}</div>
        <div
          class="heatmap__grid"
          role="img"
          aria-label="${escapeHTML(monthLabel)} — ${t('stats.monthTotalLabel', lang)}: ${focusTotal}"
        >
          ${heatCells}
        </div>
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
        : emptyStateHTML({ iconName: 'stats', title: t('stats.noData', lang) })
    }
  </section>`;
}
