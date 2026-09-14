/**
 * views/favorites.js (v5.2.51)
 * The flat favorites list, sortable (recent / alpha / most-read) with
 * per-row move-to-collection and a confirmed unfavorite-all. Sort rides
 * on `?sort=` (replaceGo — no history spam, deep-linkable, unknown sorts
 * fall back to recent); the search box preserves it.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { filterEntries } from '../domain/search.js';
import { contentTitleFor } from '../domain/localeContent.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

/** Sort orders, in control order. Unknown `?sort=` falls back to recent. */
export const FAVORITE_SORTS = ['recent', 'alpha', 'read'];

/** Resolve the active sort from route params (pure, unit-tested). */
export function favoriteSortFor(params) {
  const sort = params && typeof params.sort === 'string' ? params.sort : null;
  return FAVORITE_SORTS.includes(sort) ? sort : 'recent';
}

/** Read-count per item id across the whole recorded history. */
function readCounts(statistics) {
  const counts = new Map();
  const history =
    statistics && typeof statistics.dailyHistory === 'object' && statistics.dailyHistory !== null
      ? statistics.dailyHistory
      : {};
  for (const day of Object.values(history)) {
    const ids = day && Array.isArray(day.itemIds) ? day.itemIds : null;
    if (!ids) continue;
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

/**
 * Order resolved favorite entries (pure, unit-tested):
 *  - recent: newest favorited first (favorites append in favorited order);
 *  - alpha: locale title in the UI language;
 *  - read: all-time read counts, ties keep favorited order (stable sort).
 */
export function sortFavorites(entries, sort, lang, statistics) {
  const list = Array.isArray(entries) ? [...entries] : [];
  if (sort === 'alpha') {
    const locale = lang === 'ar' ? 'ar' : 'en';
    list.sort((a, b) =>
      contentTitleFor(a.item, lang).localeCompare(contentTitleFor(b.item, lang), locale)
    );
  } else if (sort === 'read') {
    const counts = readCounts(statistics);
    list.sort((a, b) => (counts.get(b.item.id) || 0) - (counts.get(a.item.id) || 0));
  } else {
    list.reverse();
  }
  return list;
}

const SORT_LABELS = {
  recent: 'favorites.sortRecent',
  alpha: 'favorites.sortAlpha',
  read: 'stats.mostRead',
};

export function renderFavorites(state) {
  const lang = state.settings.language;
  const q = String(state.activeParams?.q || '');
  const terms = q ? q.split(/\s+/) : [];
  const sort = favoriteSortFor(state.activeParams);
  const allEntries = state.favorites.map((id) => state.library.itemIndex[id]).filter(Boolean);
  const entries = sortFavorites(filterEntries(allEntries, q), sort, lang, state.statistics);

  const sortControl =
    allEntries.length > 1
      ? `
    <div class="segmented" role="tablist" aria-label="${t('favorites.sortBy', lang)}">
      ${FAVORITE_SORTS.map(
        (s) => `
      <button type="button" role="tab" aria-selected="${sort === s}" class="segmented__btn${sort === s ? ' segmented__btn--active' : ''}" data-action="favorites-sort" data-sort="${s}" data-q="${escapeHTML(q)}">${t(SORT_LABELS[s], lang)}</button>`
      ).join('')}
    </div>`
      : '';

  return `
  <section class="view view--favorites">
    <div class="view-header--row">
      <h1 class="view__title">${t('nav.favorites', lang)}</h1>
      ${
        allEntries.length
          ? `<button type="button" class="icon-btn" data-action="unfavorite-all" aria-label="${t('favorites.unfavoriteAll', lang)}" title="${t('favorites.unfavoriteAll', lang)}">${icon('trash', { size: 18 })}</button>`
          : ''
      }
    </div>
    <div class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input type="search" class="search-bar__input" id="favorites-search-input"
        placeholder="${t('favorites.searchPh', lang)}" aria-label="${t('favorites.searchPh', lang)}" value="${escapeHTML(state.activeParams?.q || '')}"
        data-bind="favorites-search" autocomplete="off" />
    </div>
    ${sortControl}
    ${
      entries.length
        ? `
    <div class="card-list">
      ${entries
        .map(
          (e) => `
      <div class="favorite-row">
        <div class="favorite-row__move">
          <button type="button" class="btn btn--secondary btn--sm" data-action="open-move-picker" data-item-id="${escapeHTML(e.item.id)}">${icon('folder', { size: 14 })} ${t('favorites.moveTo', lang)}</button>
        </div>
        ${cardHTML(e.item, e.category, {
          lang,
          isFavorite: true,
          isSpeaking: state.speakingItemId === e.item.id,
          counter: selectors.getCounter(state, e.item.id),
          showTransliteration: state.settings.showTransliteration,
          showTranslation: state.settings.showTranslation,
          highlight: terms,
        })} 
      </div>`
        )
        .join('')}
    </div>`
        : q
          ? `<p class="empty-hint">${t('search.noResults', lang)}</p>`
          : emptyStateHTML({
              iconName: 'heart',
              title: t('favorites.empty', lang),
              hint: t('favorites.emptyHint', lang),
              actionHTML: `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${t('favorites.emptyAction', lang)}</a>`,
            })
    }
  </section>`;
}
