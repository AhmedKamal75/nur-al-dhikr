/**
 * views/category.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, escapeHTML } from '../utils.js';
import { selectors } from '../state.js';
import { VIEWS, QUIZ_LIBRARY_ID } from '../config.js';
import { cardHTML } from '../components/card.js';

function findCategory(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return { cat, doc };
  }
  return null;
}

export function renderCategory(state) {
  const lang = state.settings.language;
  const categoryId = state.activeParams.id;
  const found = findCategory(state, categoryId);

  if (!found) {
    return `<section class="view"><p class="empty-hint">Category not found.</p></section>`;
  }

  const { cat, doc } = found;
  const items = [...cat.items].sort((a, b) => a.order - b.order);

  return `
  <section class="view view--category">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon('chevronLeft', { size: 18 })} ${t('nav.library', lang)}</a>
      <h1 class="view__title">${escapeHTML(pickLocale(cat.name, lang))}</h1>
      ${cat.description?.[lang] ? `<p class="view__subtitle">${escapeHTML(pickLocale(cat.description, lang))}</p>` : ''}
      <p class="view__meta">${t('collections.itemCount', lang, { n: items.length })} \u2022 ${escapeHTML(pickLocale(doc.metadata.name, lang))}</p>
      ${doc.metadata.id === QUIZ_LIBRARY_ID ? `
      <button type="button" class="btn btn--secondary btn--sm" data-action="quiz-start">
        ${icon('star', { size: 16 })} ${t('quiz.start', lang)}
      </button>` : ''}
    </header>

    ${items.length ? `
    <div class="card-list">
      ${items.map((item) => cardHTML(item, cat, {
        lang,
        isFavorite: selectors.isFavorite(state, item.id),
        isSpeaking: state.speakingItemId === item.id,
        counter: selectors.getCounter(state, item.id),
        showTransliteration: state.settings.showTransliteration,
        showTranslation: state.settings.showTranslation
      })).join('')}
    </div>` : `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
  </section>`;
}
