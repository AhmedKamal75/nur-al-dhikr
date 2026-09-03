/**
 * views/category.js
 * (v4.5.2) The category view now owns its content management: a Manage
 * toggle in the header turns on per-card rows — reorder, hide, re-target,
 * reset — plus, for custom sections, edit / duplicate / delete / add via
 * the editor's existing modal forms. Builtin sections stay immutable at
 * the data layer; the user's hide/reorder/target preferences layer on
 * top (services/contentPrefs.js), so "the book" is never altered and a
 * fresh install always renders the canonical corpus.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, categoryDisplayName, escapeHTML } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { VIEWS, QUIZ_LIBRARY_ID } from '../core/config.js';
import { cardHTML } from '../ui/card.js';
import { notFoundStateHTML } from '../ui/emptyState.js';
import { viewMenuButton } from '../ui/viewSheet.js';
import {
  visibleCategoryItems,
  hiddenCategoryItems,
  withEffectiveTargets,
  itemTargetOf,
  contentPrefsOf,
} from '../services/contentPrefs.js';
import { itemIsCustomized, fieldTogglesFor } from '../domain/contentLens.js';

function findCategory(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return { cat, doc, isCustom: !!state.customContent[doc.metadata.id] };
  }
  return null;
}

/** The manage row appended under each card in manage mode (v4.6.0
 *  redesign, v5.0.0 authority): joined pill segments — reorder (up /
 *  down), a real −/+ count stepper whose center is still a directly-
 *  editable number, then edit / duplicate / true-delete (EVERY card —
 *  builtin edits route into the restorable override lens), and hide.
 *  One visual rhythm, 44px targets, no raw form controls on the page. */
function manageRowHTML(item, { categoryId, lang, canUp, canDown, target, customized }) {
  const titleFor = pickLocale(item.title, lang) || item.transliteration || item.id;
  return `
  <div class="manage-row" data-manage-for="${escapeHTML(item.id)}">
    <div class="manage-seg" role="group" aria-label="${t('content.order', lang)}">
      <button type="button" class="manage-seg__btn" data-action="content-move-item" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" data-dir="-1" ${canUp ? '' : 'disabled'} aria-label="${t('content.moveUp', lang)}" title="${t('content.moveUp', lang)}">
        ${icon('chevronUp', { size: 17 })}
      </button>
      <button type="button" class="manage-seg__btn" data-action="content-move-item" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" data-dir="1" ${canDown ? '' : 'disabled'} aria-label="${t('content.moveDown', lang)}" title="${t('content.moveDown', lang)}">
        ${icon('chevronDown', { size: 17 })}
      </button>
    </div>
    <div class="manage-seg" role="group" aria-label="${t('content.target', lang)}">
      <button type="button" class="manage-seg__btn" data-action="content-target-step" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" data-dir="-1" aria-label="${t('content.targetDown', lang)}" title="${t('content.targetDown', lang)}">−</button>
      <label class="manage-seg__value">
        <span class="sr-only">${t('content.targetFor', lang, { title: titleFor })}</span>
        <input type="number" min="1" max="10000" step="1" value="${target}" data-action="content-set-target" data-item-id="${escapeHTML(item.id)}" aria-label="${t('content.targetFor', lang, { title: titleFor })}" />
      </label>
      <button type="button" class="manage-seg__btn" data-action="content-target-step" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" data-dir="1" aria-label="${t('content.targetUp', lang)}" title="${t('content.targetUp', lang)}">+</button>
    </div>
    <span class="manage-row__spacer"></span>
    <button type="button" class="manage-action" data-action="content-edit-item" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.edit', lang)}" title="${t('editor.edit', lang)}">
      ${icon('edit', { size: 16 })}
    </button>
    <button type="button" class="manage-action" data-action="content-duplicate-item" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.duplicate', lang)}" title="${t('editor.duplicate', lang)}">
      ${icon('copy', { size: 16 })}
    </button>
    <button type="button" class="manage-action manage-action--danger" data-action="content-delete-item" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.delete', lang)}" title="${t('editor.delete', lang)}">
      ${icon('trash', { size: 16 })}
    </button>
    ${
      customized
        ? `
    <button type="button" class="manage-action manage-action--restore" data-action="content-restore-item" data-item-id="${escapeHTML(item.id)}" aria-label="${t('content.restoreItem', lang)}" title="${t('content.restoreItem', lang)}">
      ${icon('refresh', { size: 16 })}
    </button>`
        : ''
    }
    <button type="button" class="manage-action" data-action="content-hide-item" data-item-id="${escapeHTML(item.id)}" aria-label="${t('content.hideItem', lang)}" title="${t('content.hideItem', lang)}">
      ${icon('eyeOff', { size: 16 })}
    </button>
  </div>`;
}

export function renderCategory(state) {
  const lang = state.settings.language;
  const categoryId = state.activeParams.id;
  const found = findCategory(state, categoryId);

  if (!found) {
    return `<section class="view">${notFoundStateHTML({ title: t('common.notFoundCategory', lang), lang, t })}</section>`;
  }

  const { cat, doc, isCustom } = found;
  const manage = !!state.ui?.contentManage;
  const prefs = contentPrefsOf(state);
  const visibleItems = visibleCategoryItems(state, cat);
  const hiddenItems = hiddenCategoryItems(state, cat);
  // Mapped items carry the EFFECTIVE target (override > corpus default),
  // so the card pills, tap targets and focus mode all agree with the
  // manage-mode stepper without card.js knowing prefs exist.
  const items = withEffectiveTargets(state, visibleItems);

  const quizButton =
    doc.metadata.id === QUIZ_LIBRARY_ID
      ? `
      <button type="button" class="btn btn--secondary btn--sm" data-action="quiz-start">
        ${icon('star', { size: 16 })} ${t('quiz.start', lang)}
      </button>`
      : '';

  // (v5.1.0) Declutter: the manage bar exists ONLY while manage mode is ON
  // (entered through the header's "⋯" menu → Manage). Reading mode shows
  // just the dhikr cards — no persistent Manage button, no hint line.
  // "Done" + the section-level tools ride this bar while editing.
  const manageBar = manage
    ? `
      <div class="manage-bar manage-bar--active">
        <button type="button" class="btn btn--primary btn--sm" data-action="content-manage-toggle" aria-pressed="true">
          ${icon('close', { size: 14 })} ${t('content.done', lang)}
        </button>
        <span class="manage-bar__hint">${t('content.manageHint', lang)}</span>
        <span class="manage-bar__spacer"></span>
        <button type="button" class="btn btn--secondary btn--sm" data-action="content-new-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}">
          ${icon('plus', { size: 14 })} ${t('editor.newItem', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="content-schedule" data-category-id="${escapeHTML(cat.id)}">
          ${icon('bell', { size: 14 })} ${t('schedule.short', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="content-edit-category" data-category-id="${escapeHTML(cat.id)}">
          ${icon('edit', { size: 14 })} ${t('content.editSection', lang)}
        </button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="content-reset-category" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('content.resetProgress', lang)}" title="${t('content.resetProgress', lang)}">
          ${icon('refresh', { size: 15 })}
        </button>
        <button type="button" class="icon-btn icon-btn--sm manage-action--danger" data-action="content-delete-category" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('editor.delete', lang)}" title="${t('editor.delete', lang)}">
          ${icon('trash', { size: 15 })}
        </button>
      </div>`
    : '';

  const unhideBar = hiddenItems.length
    ? `
    <div class="unhide-bar">
      <span class="unhide-bar__count">${t('content.hiddenCount', lang, { n: hiddenItems.length })}</span>
      <div class="unhide-bar__chips">
        ${hiddenItems
          .map(
            (it) => `
        <button type="button" class="unhide-bar__chip" data-action="content-unhide-item" data-item-id="${escapeHTML(it.id)}">
          ${icon('eye', { size: 13 })} ${escapeHTML(pickLocale(it.title, lang) || it.transliteration || it.id)}
        </button>`
          )
          .join('')}
      </div>
    </div>`
    : '';

  return `
  <section class="view view--category">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon('chevronLeft', { size: 18 })} ${t('nav.library', lang)}</a>
      <div class="view-header--row">
        <h1 class="view__title">${escapeHTML(categoryDisplayName(cat, lang))}</h1>
        ${viewMenuButton('category', lang, { labelKey: 'viewMenu.category' })}
      </div>
      ${cat.description?.[lang] ? `<p class="view__subtitle">${escapeHTML(pickLocale(cat.description, lang))}</p>` : ''}
      <p class="view__meta">${t('collections.itemCount', lang, { n: visibleItems.length })} \u2022 ${escapeHTML(pickLocale(doc.metadata.name, lang))}</p>
      ${quizButton}
    </header>

    ${manageBar}
    ${unhideBar}

    ${
      items.length
        ? `
    <div class="card-list">
      ${items
        .map((item, i) => {
          const card = cardHTML(item, cat, {
            lang,
            isFavorite: selectors.isFavorite(state, item.id),
            isSpeaking: state.speakingItemId === item.id,
            counter: selectors.getCounter(state, item.id),
            showTransliteration: state.settings.showTransliteration,
            showTranslation: state.settings.showTranslation,
            fields: fieldTogglesFor(state, doc.metadata.id),
          });
          // In manage mode each card is FOLLOWED by its manage row (a
          // sibling, not a child — the card body stays the count target,
          // APP-FLOW I6, so managing never breaks tapping to count).
          if (!manage) return card;
          return `<div class="card-manage-wrap">${card}${manageRowHTML(item, {
            categoryId: cat.id,
            isCustom,
            lang,
            canUp: i > 0,
            canDown: i < items.length - 1,
            target: itemTargetOf(state, item),
            customized: itemIsCustomized(prefs, item.id),
          })}</div>`;
        })
        .join('')}
    </div>
    ${
      manage
        ? `
    <button type="button" class="btn btn--secondary manage-add" data-action="content-new-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}">
      ${icon('plus', { size: 16 })} ${t('editor.newItem', lang)}
    </button>`
        : ''
    }`
        : `${
            manage
              ? `<button type="button" class="btn btn--secondary manage-add" data-action="content-new-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}">
      ${icon('plus', { size: 16 })} ${t('editor.newItem', lang)}
    </button>`
              : ''
          }<p class="empty-hint">${t('editor.emptyState', lang)}</p>`
    }
  </section>`;
}
