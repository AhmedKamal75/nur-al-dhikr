/**
 * views/favorites.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { selectors } from '../state.js';
import { cardHTML } from '../components/card.js';

export function renderFavorites(state) {
  const lang = state.settings.language;
  const entries = state.favorites.map((id) => state.library.itemIndex[id]).filter(Boolean);

  return `
  <section class="view view--favorites">
    <h1 class="view__title">${t('nav.favorites', lang)}</h1>
    ${entries.length ? `
    <div class="card-list">
      ${entries.map((e) => cardHTML(e.item, e.category, {
        lang,
        isFavorite: true,
        isSpeaking: state.speakingItemId === e.item.id,
        counter: selectors.getCounter(state, e.item.id),
        showTransliteration: state.settings.showTransliteration,
        showTranslation: state.settings.showTranslation
      })).join('')}
    </div>` : `
    <div class="empty-state">
      ${icon('heart', { size: 40 })}
      <p>${t('favorites.empty', lang)}</p>
      <p class="empty-state__hint">${t('favorites.emptyHint', lang)}</p>
    </div>`}
  </section>`;
}
