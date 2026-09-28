/**
 * views/mood.js
 * "Browse by need" — a curated, cross-library list of duas and adhkar for
 * how a person is feeling right now. Mirrors views/category.js's card-list
 * pattern so every existing card affordance (count, favorite, listen,
 * focus mode, menu) works here unchanged.
 */
import { t, isRTL } from '../core/i18n.js';
import { escapeHTML } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { MOODS, moodById, itemsForMood } from '../domain/moods.js';
import { notFoundStateHTML } from '../ui/emptyState.js';
import { fieldTogglesFor } from '../domain/contentLens.js';

function moodPickerHTML(state, lang) {
  const index = state.library?.itemIndex;
  const rows = MOODS.map((m) => {
    const count = index && Object.keys(index).length ? itemsForMood(m, index).length : 0;
    return `<li class="mood-tile-wrap"><a class="mood-tile" href="${buildHash(VIEWS.MOOD, { id: m.id })}" data-action="navigate" data-view="${VIEWS.MOOD}" data-id="${m.id}">
      <span class="mood-tile__icon">${icon(m.icon, { size: 18 })}</span>
      <span class="mood-tile__text">
        <span class="mood-tile__name">${escapeHTML(t(`mood.${m.id}`, lang))}</span>
        ${count ? `<span class="mood-tile__count">${escapeHTML(t('collections.itemCount', lang, { n: count }))}</span>` : ''}
      </span>
    </a></li>`;
  });
  return `<section class="view view--mood-picker">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${escapeHTML(t('nav.library', lang))}</a>
      <h1 class="view__title">${escapeHTML(t('moods.title', lang))}</h1>
    </header>
    <p class="panel__subtext">${escapeHTML(t('moods.pickerHint', lang))}</p>
    <ul class="mood-tiles">${rows.join('')}</ul>
  </section>`;
}

export function renderMood(state) {
  const lang = state.settings.language;
  const mood = moodById(String(state.activeParams.id || ''));

  // (v5.17.20) A bare #/mood used to be a dead end. It is reachable from a
  // shared or typed link, so it answers with the twelve needs rather than an
  // error: "what are you looking for?" is a real question, not a 404.
  //
  // Only when NO id was given. A mistyped or stale id must still say so —
  // a picker there would quietly hide a broken link behind a plausible page,
  // which is the exact dishonesty this project is organised against.
  const askedFor = String(state.activeParams.id || '');
  if (!askedFor) return moodPickerHTML(state, lang);
  if (!mood) {
    return `<section class="view">${notFoundStateHTML({ title: t('moods.notFound', lang), lang, t })}</section>`;
  }

  const entries = itemsForMood(mood, state.library.itemIndex);

  return `
  <section class="view view--mood">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('moods.title', lang)}</a>
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
            isPlayingAudio: state.dhikrAudioItemId === e.item.id,
            counter: selectors.getCounter(state, e.item.id),
            showTransliteration: state.settings.showTransliteration,
            showTranslation: state.settings.showTranslation,
            fields: fieldTogglesFor(state, e.document?.metadata?.id),
          })
        )
        .join('')}
    </div>`
        : `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`
    }
  </section>`;
}
