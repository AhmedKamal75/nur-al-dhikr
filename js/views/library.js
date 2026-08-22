/**
 * views/library.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, escapeHTML } from '../utils.js';
import { VIEWS } from '../config.js';

export function renderLibrary(state) {
  const lang = state.settings.language;
  const docs = [
    ...state.library.order.map((id) => state.library.documents[id]),
    ...Object.values(state.customContent)
  ].filter(Boolean);

  const sections = docs.map((doc) => {
    const cats = [...doc.categories].sort((a, b) => a.order - b.order).map((cat) => {
      const count = cat.items.length;
      return `
      <a class="category-tile" href="${buildHash(VIEWS.CATEGORY, { id: cat.id })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="${escapeHTML(cat.id)}">
        <span class="category-tile__icon category-tile__icon--${escapeHTML(cat.color || 'slate')}">${icon(cat.icon || 'book', { size: 22 })}</span>
        <span class="category-tile__text">
          <span class="category-tile__name">${escapeHTML(pickLocale(cat.name, lang))}</span>
          <span class="category-tile__count">${t('collections.itemCount', lang, { n: count })}</span>
        </span>
      </a>`;
    }).join('');

    return `
    <section class="library-section">
      <h2 class="library-section__title">${escapeHTML(pickLocale(doc.metadata.name, lang))}</h2>
      ${doc.metadata.description?.[lang] ? `<p class="library-section__desc">${escapeHTML(pickLocale(doc.metadata.description, lang))}</p>` : ''}
      <div class="category-grid">${cats || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}</div>
    </section>`;
  }).join('');

  return `
  <section class="view view--library">
    <h1 class="view__title">${t('nav.library', lang)}</h1>
    ${sections}
  </section>`;
}
