/**
 * views/collection.js (v5.2.50)
 * A single collection: rename + share + delete in the header, bulk import
 * of missing favorites, and per-item reorder controls (up/down) alongside
 * the cards. Reorder hides while filtering — moving filtered rows would
 * silently reorder invisible neighbors.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, escapeHTML } from '../core/utils.js';
import { filterEntries } from '../domain/search.js';
import { contentTitleFor } from '../domain/localeContent.js';
import { selectors } from '../core/state.js';
import { VIEWS } from '../core/config.js';
import { cardHTML } from '../ui/card.js';
import { notFoundStateHTML } from '../ui/emptyState.js';

/**
 * Share text: collection name + numbered titles in the UI language (the
 * locale choke point keeps the Arabic UI free of transliteration).
 * Returns '' when nothing is shareable. Pure, unit-tested.
 */
export function buildCollectionShareText(collection, itemIndex, lang = 'en') {
  const items = collection && Array.isArray(collection.items) ? collection.items : [];
  const titles = [];
  for (const id of items) {
    const entry = itemIndex?.[id];
    if (!entry || !entry.item) continue;
    const title = contentTitleFor(entry.item, lang);
    if (title) titles.push(title);
  }
  if (!titles.length) return '';
  const lines = titles.map((title, i) => `${i + 1}. ${title}`);
  const name = pickLocale(collection?.name, lang);
  if (name) lines.unshift(name);
  return lines.join('\n');
}

export function renderCollection(state) {
  const lang = state.settings.language;
  const col = selectors.getCollection(state, state.activeParams.id);

  if (!col) {
    return `<section class="view">${notFoundStateHTML({ title: t('common.notFoundCollection', lang), lang, t })}</section>`;
  }

  const q = String(state.activeParams?.q || '');
  const terms = q ? q.split(/\s+/) : [];
  const resolved = col.items.map((id) => state.library.itemIndex[id]).filter(Boolean);
  const entries = filterEntries(resolved, q);
  const orderable = !q;

  // Favorites missing from this collection — one tap imports them all.
  const missingFavorites = (Array.isArray(state.favorites) ? state.favorites : []).filter(
    (id) => !col.items.includes(id) && state.library.itemIndex[id]
  );

  const moveButtons = (itemId, fullIdx) => `
      <div class="collection-row__order">
        <button type="button" class="icon-btn icon-btn--sm" data-action="collection-move" data-id="${escapeHTML(col.id)}" data-item="${escapeHTML(itemId)}" data-dir="-1" ${
          fullIdx <= 0 ? 'disabled' : ''
        } aria-label="${t('settings.moveUp', lang)}" title="${t('settings.moveUp', lang)}">${icon('chevronUp', { size: 15 })}</button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="collection-move" data-id="${escapeHTML(col.id)}" data-item="${escapeHTML(itemId)}" data-dir="1" ${
          fullIdx >= col.items.length - 1 ? 'disabled' : ''
        } aria-label="${t('settings.moveDown', lang)}" title="${t('settings.moveDown', lang)}">${icon('chevronDown', { size: 15 })}</button>
      </div>`;

  return `
  <section class="view view--collection">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.COLLECTIONS)}" data-action="navigate" data-view="${VIEWS.COLLECTIONS}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('nav.collections', lang)}</a>
      <div class="view-header--row">
        <h1 class="view__title">${escapeHTML(pickLocale(col.name, lang))}</h1>
        <button type="button" class="icon-btn" data-action="rename-collection" data-id="${escapeHTML(col.id)}" aria-label="${t('collections.rename', lang)}" title="${t('collections.rename', lang)}">${icon('edit', { size: 18 })}</button>
        <button type="button" class="icon-btn" data-action="share-collection" data-id="${escapeHTML(col.id)}" aria-label="${t('collections.share', lang)}" title="${t('collections.share', lang)}">${icon('share', { size: 18 })}</button>
        <button type="button" class="icon-btn" data-action="delete-collection" data-id="${escapeHTML(col.id)}" aria-label="${t('collections.delete', lang)}">${icon('trash', { size: 18 })}</button>
      </div>
      <p class="view__meta">${t('collections.itemCount', lang, { n: entries.length })}</p>
      ${
        missingFavorites.length
          ? `<button type="button" class="btn btn--secondary btn--sm" data-action="collection-add-favorites" data-id="${escapeHTML(col.id)}">${icon('heart', { size: 14 })} ${t('collections.addFavorites', lang)} (${missingFavorites.length})</button>`
          : ''
      }
    </header>
    <div class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input type="search" class="search-bar__input" id="collection-search-input"
        placeholder="${t('collections.searchPh', lang)}" aria-label="${t('collections.searchPh', lang)}" value="${escapeHTML(state.activeParams?.q || '')}"
        data-bind="collection-search" autocomplete="off" />
    </div>

    ${
      entries.length
        ? `
    <div class="card-list">
      ${entries
        .map((e) => {
          const card = cardHTML(e.item, e.category, {
            lang,
            isFavorite: selectors.isFavorite(state, e.item.id),
            isSpeaking: state.speakingItemId === e.item.id,
            counter: selectors.getCounter(state, e.item.id),
            showTransliteration: state.settings.showTransliteration,
            showTranslation: state.settings.showTranslation,
            highlight: terms,
          });
          if (!orderable) return card;
          return `<div class="collection-row">${moveButtons(e.item.id, col.items.indexOf(e.item.id))}${card}</div>`;
        })
        .join('')}
    </div>`
        : `<p class="empty-hint">${q ? t('search.noResults', lang) : t('collections.empty', lang)}</p>`
    }
  </section>`;
}
