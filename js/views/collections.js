/**
 * views/collections.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, escapeHTML } from '../utils.js';
import { VIEWS, COLLECTION_SUGGESTIONS } from '../config.js';
import { emptyStateHTML } from '../components/emptyState.js';

export function renderCollections(state) {
  const lang = state.settings.language;
  const cols = state.collections;
  const existingNames = new Set(cols.map((c) => pickLocale(c.name, 'en').toLowerCase()));
  const suggestions = COLLECTION_SUGGESTIONS.filter(
    (s) => !existingNames.has(s.name.en.toLowerCase())
  );

  return `
  <section class="view view--collections">
    <header class="view-header view-header--row">
      <h1 class="view__title">${t('nav.collections', lang)}</h1>
      <button type="button" class="btn btn--primary btn--sm" data-action="create-collection">${icon('plus', { size: 16 })} ${t('collections.create', lang)}</button>
    </header>

    ${
      cols.length
        ? `
    <div class="collection-grid">
      ${cols
        .map(
          (c) => `
        <a class="collection-tile" href="${buildHash(VIEWS.COLLECTION, { id: c.id })}" data-action="navigate" data-view="${VIEWS.COLLECTION}" data-id="${escapeHTML(c.id)}">
          <span class="collection-tile__icon">${icon('bookmark', { size: 22 })}</span>
          <span class="collection-tile__name">${escapeHTML(pickLocale(c.name, lang))}</span>
          <span class="collection-tile__count">${t('collections.itemCount', lang, { n: c.items.length })}</span>
        </a>`
        )
        .join('')}
    </div>`
        : emptyStateHTML({
            iconName: 'bookmark',
            title: t('collections.empty', lang),
            hint: t('collections.emptyHint', lang),
          })
    }

    ${
      suggestions.length
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('collections.suggestions', lang)}</h2></div>
      <div class="chip-row">
        ${suggestions
          .map(
            (s) => `
          <button type="button" class="chip chip--query" data-action="create-collection-suggested" data-name-en="${escapeHTML(s.name.en)}" data-name-ar="${escapeHTML(s.name.ar)}">
            ${icon('plus', { size: 12 })} ${escapeHTML(pickLocale(s.name, lang))}
          </button>`
          )
          .join('')}
      </div>
    </section>`
        : ''
    }
  </section>`;
}
