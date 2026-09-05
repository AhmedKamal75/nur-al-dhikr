/**
 * views/mood.js
 * "Browse by need" — a curated, cross-library list of duas and adhkar for
 * how a person is feeling right now. Mirrors views/category.js's card-list
 * pattern so every existing card affordance (count, favorite, listen,
 * focus mode, menu) works here unchanged.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { moodById, itemsForMood } from '../domain/moods.js';
import { notFoundStateHTML } from '../ui/emptyState.js';

export function renderMood(state) {
  const lang = state.settings.language;
  const mood = moodById(String(state.activeParams.id || ''));

  if (!mood) {
    return `<section class="view">${notFoundStateHTML({ title: t('moods.notFound', lang), lang, t })}</section>`;
  }

  const entries = itemsForMood(mood, state.library.itemIndex);

  return `
  <section class="view view--mood">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon('chevronLeft', { size: 18 })} ${t('moods.title', lang)}</a>
      <h1 class="view__title">${icon(mood.icon, { size: 22 })} ${t(`mood.${mood.id}`, lang)}</h1>
      <p class="view__subtitle">${t('moods.subtitle', lang)}</p>
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
        : `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`
    }
  </section>`;
}
