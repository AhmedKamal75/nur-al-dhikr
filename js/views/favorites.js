/**
 * views/favorites.js
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { filterEntries } from '../domain/search.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

export function renderFavorites(state) {
  const lang = state.settings.language;
  const q = String(state.activeParams?.q || '');
  const terms = q ? q.split(/\s+/) : [];
  const allEntries = state.favorites.map((id) => state.library.itemIndex[id]).filter(Boolean);
  const entries = filterEntries(allEntries, q);

  return `
  <section class="view view--favorites">
    <h1 class="view__title">${t('nav.favorites', lang)}</h1>
    <div class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input type="search" class="search-bar__input" id="favorites-search-input"
        placeholder="${t('favorites.searchPh', lang)}" aria-label="${t('favorites.searchPh', lang)}" value="${escapeHTML(state.activeParams?.q || '')}"
        data-bind="favorites-search" autocomplete="off" />
    </div>
    ${
      entries.length
        ? `
    <div class="card-list">
      ${entries
        .map((e) =>
          cardHTML(e.item, e.category, {
            lang,
            isFavorite: true,
            isSpeaking: state.speakingItemId === e.item.id,
            counter: selectors.getCounter(state, e.item.id),
            showTransliteration: state.settings.showTransliteration,
            showTranslation: state.settings.showTranslation,
            highlight: terms,
          })
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
