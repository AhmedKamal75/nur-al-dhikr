/**
 * components/menus.js
 * HTML builders for the small modal-hosted menus used throughout the app:
 * the per-card "more" action sheet, the add-to-collection picker, and a
 * generic yes/no confirmation dialog.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';

/** camelCase -> kebab-case, so JS object keys survive the round trip through
 *  HTML data-* attributes and back out via element.dataset (which only
 *  auto-camelCases hyphenated attribute names — browsers lowercase anything
 *  else on parse, so data-libraryId silently becomes data-libraryid and
 *  dataset.libraryId then reads as undefined). This was a real, confirmed
 *  bug: it silently broke deleting categories/items and adding an item to a
 *  brand-new collection from the card menu, in every one of those flows.
 */
function toKebabAttrs(obj) {
  return Object.entries(obj)
    .map(
      ([k, v]) =>
        `data-${k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}="${escapeHTML(String(v))}"`
    )
    .join(' ');
}

export function buildCardMenu(item, categoryId, lang = 'en') {
  return `
  <div class="action-sheet" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(categoryId)}">
    <h2 id="modal-title-menu" class="sr-only">${t('card.more', lang)}</h2>
    <button type="button" class="action-sheet__item" data-action="copy-item" data-item-id="${escapeHTML(item.id)}">
      ${icon('copy', { size: 18 })} ${t('card.copy', lang)}
    </button>
    <button type="button" class="action-sheet__item" data-action="share-item" data-item-id="${escapeHTML(item.id)}">
      ${icon('share', { size: 18 })} ${t('card.share', lang)}
    </button>
    <button type="button" class="action-sheet__item" data-action="toggle-speech" data-item-id="${escapeHTML(item.id)}">
      ${icon('volume', { size: 18 })} ${t('card.listen', lang)}
    </button>
    <button type="button" class="action-sheet__item" data-action="open-collection-picker" data-item-id="${escapeHTML(item.id)}">
      ${icon('bookmark', { size: 18 })} ${t('card.addToCollection', lang)}
    </button>
  </div>`;
}

export function buildCollectionPicker(item, state) {
  const lang = state.settings.language;
  const rows = state.collections
    .map((c) => {
      const has = c.items.includes(item.id);
      return `
    <label class="picker-row">
      <input type="checkbox" data-action="collection-picker-toggle" data-collection-id="${escapeHTML(c.id)}" data-item-id="${escapeHTML(item.id)}" ${has ? 'checked' : ''} />
      <span>${escapeHTML(pickLocale(c.name, lang))}</span>
      <span class="picker-row__count">${c.items.length}</span>
    </label>`;
    })
    .join('');

  return `
  <div class="collection-picker">
    <h2 id="modal-title-picker">${t('card.addToCollection', lang)}</h2>
    ${rows || `<p class="empty-hint">${t('collections.empty', lang)}</p>`}
    <button type="button" class="btn btn--secondary btn--sm" data-action="create-collection-inline" data-item-id="${escapeHTML(item.id)}">
      ${icon('plus', { size: 14 })} ${t('collections.new', lang)}
    </button>
  </div>`;
}

export function buildConfirm({
  message,
  confirmAction,
  confirmData = {},
  lang = 'en',
  danger = true,
}) {
  const dataAttrs = toKebabAttrs(confirmData);
  return `
  <div class="confirm-dialog">
    <h2 id="modal-title-confirm" class="sr-only">${t('common.confirm', lang)}</h2>
    <p>${escapeHTML(message)}</p>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('common.cancel', lang)}</button>
      <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="${confirmAction}" ${dataAttrs}>${t('common.confirm', lang)}</button>
    </div>
  </div>`;
}

export function buildTextPrompt({
  title,
  placeholder = '',
  confirmAction,
  confirmData = {},
  lang = 'en',
}) {
  const dataAttrs = toKebabAttrs(confirmData);
  return `
  <form class="prompt-dialog" data-action="${confirmAction}" ${dataAttrs}>
    <h2 id="modal-title-prompt">${escapeHTML(title)}</h2>
    <input class="input" name="value" placeholder="${escapeHTML(placeholder)}" autofocus required />
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('common.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('common.save', lang)}</button>
    </div>
  </form>`;
}
