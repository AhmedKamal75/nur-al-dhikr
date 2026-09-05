/**
 * views/favorites.js
 */
import { t } from '../core/i18n.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

export function renderFavorites(state) {
  const lang = state.settings.language;
  const entries = state.favorites.map((id) => state.library.itemIndex[id]).filter(Boolean);

  return `
  <section class="view view--favorites">
    <h1 class="view__title">${t('nav.favorites', lang)}</h1>
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
          })
        )
        .join('')}
    </div>`
        : emptyStateHTML({
            iconName: 'heart',
            title: t('favorites.empty', lang),
            hint: t('favorites.emptyHint', lang),
            actionHTML: `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${t('favorites.emptyAction', lang)}</a>`,
          })
    }
  </section>`;
}
