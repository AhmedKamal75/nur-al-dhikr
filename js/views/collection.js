/**
 * views/collection.js
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, escapeHTML } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { VIEWS } from '../core/config.js';
import { cardHTML } from '../ui/card.js';
import { notFoundStateHTML } from '../ui/emptyState.js';

export function renderCollection(state) {
  const lang = state.settings.language;
  const col = selectors.getCollection(state, state.activeParams.id);

  if (!col) {
    return `<section class="view">${notFoundStateHTML({ title: t('common.notFoundCollection', lang), lang, t })}</section>`;
  }

  const entries = col.items.map((id) => state.library.itemIndex[id]).filter(Boolean);

  return `
  <section class="view view--collection">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.COLLECTIONS)}" data-action="navigate" data-view="${VIEWS.COLLECTIONS}">${icon('chevronLeft', { size: 18 })} ${t('nav.collections', lang)}</a>
      <div class="view-header--row">
        <h1 class="view__title">${escapeHTML(pickLocale(col.name, lang))}</h1>
        <button type="button" class="icon-btn" data-action="delete-collection" data-id="${escapeHTML(col.id)}" aria-label="${t('collections.delete', lang)}">${icon('trash', { size: 18 })}</button>
      </div>
      <p class="view__meta">${t('collections.itemCount', lang, { n: entries.length })}</p>
    </header>

    ${
      entries.length
        ? `
    <div class="card-list">
      ${entries
        .map((e) =>
          cardHTML(e.item, e.category, {
            lang,
            isFavorite: selectors.isFavorite(state, e.item.id),
            isSpeaking: state.speakingItemId === e.item.id,
            counter: selectors.getCounter(state, e.item.id),
            showTransliteration: state.settings.showTransliteration,
            showTranslation: state.settings.showTranslation,
          })
        )
        .join('')}
    </div>`
        : `<p class="empty-hint">${t('collections.empty', lang)}</p>`
    }
  </section>`;
}
