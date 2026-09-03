/**
 * views/library.js (v5.0.0)
 * The Library owns BANNER-level management: a Manage toggle reveals, for
 * every library — reorder its sections, edit/hide/true-delete the library,
 * add sections to ANY library (builtin included, via the prefs lens),
 * restore a library (or everything) to defaults, schedule a daily
 * reminder, and set which card fields its sections show. Builtin content
 * is never modified: all edits live in the user's contentPrefs lens.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, categoryDisplayName, escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { MOODS, itemsForMood } from '../domain/moods.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { viewMenuButton } from '../ui/viewSheet.js';
import {
  isCategoryHidden,
  visibleCategoryItems,
  contentPrefsOf,
  libraryIsCustomized,
} from '../services/contentPrefs.js';

export function renderLibrary(state) {
  const lang = state.settings.language;
  const prefs = contentPrefsOf(state);
  const deletedLibs = prefs.deletedLibraries || {};
  const hiddenLibs = prefs.hiddenLibraries || {};
  const customDocs = Object.values(state.customContent);
  // The LENSED documents (deleted libraries already filtered by the lens)
  // + custom libraries, in the user's chosen banner order.
  const lensedDocs = state.library.order.map((id) => state.library.documents[id]).filter(Boolean);
  const docs = [...lensedDocs, ...customDocs];
  const manage = !!state.ui?.contentManage;

  // "Browse by need": curated cross-library moods, each linking to the
  // mood view. Rendered only once the content index exists (the library
  // bootstraps it before first paint of real content).
  const moodChips =
    state.library.itemIndex && Object.keys(state.library.itemIndex).length
      ? MOODS.map((mood) => {
          const count = itemsForMood(mood, state.library.itemIndex).length;
          return `
      <a class="mood-tile" href="${buildHash(VIEWS.MOOD, { id: mood.id })}" data-action="navigate" data-view="${VIEWS.MOOD}" data-id="${mood.id}">
        <span class="mood-tile__icon">${icon(mood.icon, { size: 18 })}</span>
        <span class="mood-tile__text">
          <span class="mood-tile__name">${t(`mood.${mood.id}`, lang)}</span>
          <span class="mood-tile__count">${t('collections.itemCount', lang, { n: count })}</span>
        </span>
      </a>`;
        }).join('')
      : '';

  const moodsSection = moodChips
    ? `
  <section class="library-section library-section--moods">
    <h2 class="library-section__title">${t('moods.title', lang)}</h2>
    <p class="library-section__desc">${t('moods.subtitle', lang)}</p>
    <div class="mood-grid">${moodChips}</div>
  </section>`
    : '';

  const sections = docs
    .map((doc, docIndex) => {
      const libId = doc.metadata.id;
      const allCats = [...doc.categories].sort((a, b) => a.order - b.order);
      const shownCats = allCats.filter(
        (cat) =>
          manage || (!isCategoryHidden(state, cat.id) && !(prefs.deletedCategories || {})[cat.id])
      );
      const hiddenCats = allCats.filter(
        (cat) => isCategoryHidden(state, cat.id) && !(prefs.deletedCategories || {})[cat.id]
      );
      const cats = shownCats
        .map((cat, catIndex) => {
          const count = visibleCategoryItems(state, cat).length;
          return `
      <div class="category-tile-wrap">
      <a class="category-tile" href="${buildHash(VIEWS.CATEGORY, { id: cat.id })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="${escapeHTML(cat.id)}">
        <span class="category-tile__icon category-tile__icon--${escapeHTML(cat.color || 'slate')}">${icon(cat.icon || 'book', { size: 22 })}</span>
        <span class="category-tile__text">
          <span class="category-tile__name">${escapeHTML(categoryDisplayName(cat, lang))}</span>
          <span class="category-tile__count">${t('collections.itemCount', lang, { n: count })}</span>
        </span>
      </a>
      ${
        manage
          ? `
      <div class="category-tile__manage">
        <button type="button" class="manage-seg__btn" data-action="content-move-category" data-library-id="${escapeHTML(libId)}" data-category-id="${escapeHTML(cat.id)}" data-dir="-1" ${catIndex > 0 ? '' : 'disabled'} aria-label="${t('content.moveUp', lang)}" title="${t('content.moveUp', lang)}">
          ${icon('chevronUp', { size: 14 })}
        </button>
        <button type="button" class="manage-seg__btn" data-action="content-move-category" data-library-id="${escapeHTML(libId)}" data-category-id="${escapeHTML(cat.id)}" data-dir="1" ${catIndex < shownCats.length - 1 ? '' : 'disabled'} aria-label="${t('content.moveDown', lang)}" title="${t('content.moveDown', lang)}">
          ${icon('chevronDown', { size: 14 })}
        </button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="content-edit-category" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('content.editSection', lang)}" title="${t('content.editSection', lang)}">
          ${icon('edit', { size: 14 })}
        </button>
        <button type="button" class="icon-btn icon-btn--sm manage-action--danger" data-action="content-delete-category" data-library-id="${escapeHTML(libId)}" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('editor.delete', lang)}" title="${t('editor.delete', lang)}">
          ${icon('trash', { size: 14 })}
        </button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="content-hide-category" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('content.hideSection', lang)}" title="${t('content.hideSection', lang)}">
          ${icon('eyeOff', { size: 14 })}
        </button>
      </div>`
          : ''
      }
      </div>`;
        })
        .join('');

      const unhideChips =
        manage && hiddenCats.length
          ? `
      <div class="unhide-bar">
        <span class="unhide-bar__count">${t('content.hiddenSections', lang, { n: hiddenCats.length })}</span>
        <div class="unhide-bar__chips">
          ${hiddenCats
            .map(
              (cat) => `
          <button type="button" class="unhide-bar__chip" data-action="content-unhide-category" data-category-id="${escapeHTML(cat.id)}">
            ${icon('eye', { size: 13 })} ${escapeHTML(categoryDisplayName(cat, lang))}
          </button>`
            )
            .join('')}
        </div>
      </div>`
          : '';

      // (v5.0.0) The banner manage bar: banner-level authority.
      const sectionManage = manage
        ? `
      <div class="manage-bar manage-bar--library">
        <button type="button" class="manage-seg__btn" data-action="content-move-library" data-library-id="${escapeHTML(libId)}" data-dir="-1" ${docIndex > 0 ? '' : 'disabled'} aria-label="${t('content.moveUp', lang)}" title="${t('content.moveUp', lang)}">
          ${icon('chevronUp', { size: 14 })}
        </button>
        <button type="button" class="manage-seg__btn" data-action="content-move-library" data-library-id="${escapeHTML(libId)}" data-dir="1" ${docIndex < docs.length - 1 ? '' : 'disabled'} aria-label="${t('content.moveDown', lang)}" title="${t('content.moveDown', lang)}">
          ${icon('chevronDown', { size: 14 })}
        </button>
        <span class="manage-bar__spacer"></span>
        <button type="button" class="btn btn--ghost btn--sm" data-action="content-new-category" data-library-id="${escapeHTML(libId)}">
          ${icon('plus', { size: 14 })} ${t('editor.newCategory', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="content-edit-library" data-library-id="${escapeHTML(libId)}">
          ${icon('edit', { size: 14 })} ${t('content.editBanner', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="content-schedule" data-library-id="${escapeHTML(libId)}">
          ${icon('bell', { size: 14 })} ${t('schedule.short', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="library-field-toggles" data-library-id="${escapeHTML(libId)}">
          ${icon('list', { size: 14 })} ${t('content.fields', lang)}
        </button>
        ${
          libraryIsCustomized(state, libId)
            ? `<button type="button" class="btn btn--ghost btn--sm manage-action--restore" data-action="content-restore-library" data-library-id="${escapeHTML(libId)}">
          ${icon('refresh', { size: 14 })} ${t('content.restoreLibrary', lang)}
        </button>`
            : ''
        }
        <button type="button" class="btn btn--ghost btn--sm manage-action--danger" data-action="content-hide-library" data-library-id="${escapeHTML(libId)}">
          ${icon('eyeOff', { size: 14 })} ${t('content.hideBanner', lang)}
        </button>
        <button type="button" class="btn btn--ghost btn--sm manage-action--danger" data-action="content-delete-library" data-library-id="${escapeHTML(libId)}">
          ${icon('trash', { size: 14 })} ${t('editor.delete', lang)}
        </button>
      </div>`
        : '';

      return `
    <section class="library-section">
      <h2 class="library-section__title">${escapeHTML(pickLocale(doc.metadata.name, lang))}</h2>
      ${doc.metadata.description?.[lang] ? `<p class="library-section__desc">${escapeHTML(pickLocale(doc.metadata.description, lang))}</p>` : ''}
      ${sectionManage}
      <div class="category-grid">${cats || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}</div>
      ${unhideChips}
    </section>`;
    })
    .join('');

  // Manage mode also surfaces the hidden/deleted banners for recovery.
  const hiddenLibraryBars = manage
    ? (() => {
        const recoverable = Object.keys(hiddenLibs).filter(
          (id) => state.library.raw?.documents?.[id]
        );
        const deletedRecoverable = Object.keys(deletedLibs).filter(
          (id) => state.library.raw?.documents?.[id]
        );
        if (!recoverable.length && !deletedRecoverable.length) return '';
        return `
    <div class="unhide-bar">
      <span class="unhide-bar__count">${t('content.hiddenBanners', lang, { n: recoverable.length + deletedRecoverable.length })}</span>
      <div class="unhide-bar__chips">
        ${recoverable
          .map(
            (id) => `
        <button type="button" class="unhide-bar__chip" data-action="content-unhide-library" data-library-id="${escapeHTML(id)}">
          ${icon('eye', { size: 13 })} ${escapeHTML(pickLocale(state.library.raw.documents[id].metadata.name, lang))}
        </button>`
          )
          .join('')}
        ${deletedRecoverable
          .map(
            (id) => `
        <button type="button" class="unhide-bar__chip manage-action--restore" data-action="confirm-content-restore-library" data-library-id="${escapeHTML(id)}">
          ${icon('refresh', { size: 13 })} ${escapeHTML(pickLocale(state.library.raw.documents[id].metadata.name, lang))}
        </button>`
          )
          .join('')}
      </div>
    </div>`;
      })()
    : '';

  return `
  <section class="view view--library">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.library', lang)}</h1>
      ${
        /* (v5.1.0) Declutter: the Manage toggle now lives ONLY in the "⋯"
           menu (viewSheet "view-sheet-manage"). While manage mode is ON a
           single primary "Done" rides the header so the exit is always in
           reach; reading mode shows nothing but the ⋯ button. */
        manage
          ? `<button type="button" class="btn btn--primary btn--sm" data-action="content-manage-toggle" aria-pressed="true">
        ${icon('close', { size: 14 })} ${t('content.done', lang)}
      </button>`
          : ''
      }
      ${viewMenuButton('library', lang, { labelKey: 'viewMenu.library' })}
    </div>
    ${
      // (v4.3) cold-start offline with zero content: the honest error +
      // Retry state instead of a bare page of nothing.
      state.loadErrors?.library && !docs.length && !moodChips
        ? loadErrorStateHTML({ lang, tierKey: 'library', t })
        : `${moodsSection}
    ${hiddenLibraryBars}
    ${sections}`
    }
  </section>`;
}
