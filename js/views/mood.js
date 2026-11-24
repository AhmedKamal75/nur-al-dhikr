/**
 * views/mood.js
 * "Browse by need" — a curated, cross-library list of duas and adhkar for
 * how a person is feeling right now. Mirrors views/category.js's card-list
 * pattern so every existing card affordance (count, favorite, listen,
 * focus mode, menu) works here unchanged.
 */
import { t, isRTL } from '../core/i18n.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { selectors } from '../core/state.js';
import { cardHTML } from '../ui/card.js';
import { MOODS, moodById } from '../domain/moods.js';
import { notFoundStateHTML } from '../ui/emptyState.js';
import { fieldTogglesFor } from '../domain/contentLens.js';
import { moodEntries, selectedMoodIds } from '../services/moodSelection.js';

function moodPickerHTML(state, lang) {
  const index = state.library?.itemIndex;
  const rows = MOODS.map((m) => {
    const count =
      index && Object.keys(index).length
        ? moodEntries({ ...state, activeParams: { id: m.id } }).length
        : 0;
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
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${escapeHTML(t('nav.azkar', lang))}</a>
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

  const entries = moodEntries(state);
  const selecting = state.moodSelection?.moodId === mood.id;
  const selected = selectedMoodIds(state);
  const selectedSet = new Set(selected);

  return `
  <section class="view view--mood">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('nav.azkar', lang)}</a>
      <h1 class="view__title">${icon(mood.icon, { size: 22 })} ${t(`mood.${mood.id}`, lang)}</h1>
      <p class="view__subtitle">${t('moods.subtitle', lang)}</p>
      <p class="view__meta">${t('collections.itemCount', lang, { n: entries.length })}</p>
    </header>

    <div class="mood-selection" aria-label="${escapeHTML(t('moods.selection', lang))}">
      ${
        selecting
          ? `
        <p role="status" aria-live="polite">${escapeHTML(t('moods.selectedCount', lang, { n: selected.length }))}</p>
        <div class="mood-selection__actions">
          <button class="btn btn--secondary" data-action="mood-select-all">${t('moods.selectAll', lang)}</button>
          <button class="btn btn--ghost" data-action="mood-select-cancel">${t('common.cancel', lang)}</button>
          <button class="btn btn--secondary" data-action="mood-selection-destination" ${selected.length ? '' : 'disabled'}>${t('moods.addExisting', lang)}</button>
          <button class="btn btn--primary" data-action="mood-selection-create" ${selected.length ? '' : 'disabled'}>${t('collections.new', lang)}</button>
        </div>`
          : `<button class="btn btn--secondary" data-action="mood-select-start" ${entries.length ? '' : 'disabled'}>${t('moods.select', lang)}</button>`
      }
    </div>
    ${
      entries.length
        ? `
    <div class="card-list">
      ${entries
        .map(
          (e) =>
            `<div class="mood-selection__entry">${selecting ? `<label class="mood-selection__check"><input type="checkbox" data-action="mood-select-toggle" data-id="${escapeHTML(e.item.id)}" ${selectedSet.has(e.item.id) ? 'checked' : ''} /> <span>${escapeHTML(t('moods.selectItem', lang, { name: pickLocale(e.item.title, lang) || e.item.id }))}</span></label>` : ''}${cardHTML(
              e.item,
              e.category,
              {
                lang,
                isFavorite: selectors.isFavorite(state, e.item.id),
                isSpeaking: state.speakingItemId === e.item.id,
                isPlayingAudio: state.dhikrAudioItemId === e.item.id,
                counter: selectors.getCounter(state, e.item.id),
                showTransliteration: state.settings.showTransliteration,
                showTranslation: state.settings.showTranslation,
                fields: fieldTogglesFor(state, e.document?.metadata?.id),
              }
            )}</div>`
        )
        .join('')}
    </div>`
        : `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`
    }
  </section>`;
}

/** Destination is always an explicit choice. Opening/canceling changes nothing. */
export function moodDestinationHTML(state) {
  const lang = state.settings.language;
  const ids = selectedMoodIds(state);
  return `<h2 id="modal-title-mood">${t('moods.addExisting', lang)}</h2>
    <p>${escapeHTML(t('moods.selectedCount', lang, { n: ids.length }))}</p>
    ${
      state.collections.length
        ? state.collections
            .map((c) => {
              const n = ids.filter((id) => !c.items.includes(id)).length;
              return `<div class="picker-row"><span>${escapeHTML(pickLocale(c.name, lang))}</span>
        <button class="btn btn--secondary" data-action="mood-selection-add" data-id="${escapeHTML(c.id)}" ${ids.length ? '' : 'disabled'}>${escapeHTML(t('moods.appendCount', lang, { n }))}</button></div>`;
            })
            .join('')
        : `<p>${t('collections.empty', lang)}</p>`
    }
    <button class="btn btn--ghost" data-action="modal-close">${t('common.cancel', lang)}</button>`;
}
