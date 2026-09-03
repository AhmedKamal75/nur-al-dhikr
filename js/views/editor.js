/**
 * views/editor.js
 * The content editor: browse/create/edit/delete custom libraries, categories,
 * and items. Item/category creation happens in a modal (see buildItemForm /
 * buildCategoryForm) so the editor screen itself stays a simple list.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { escapeHTML, pickLocale, categoryDisplayName } from '../core/utils.js';
import { GRADES, GRADE_LABELS } from '../core/config.js';
import { DEFAULT_CUSTOM_LIBRARY_ID } from '../services/editor.js';
import { viewMenuButton } from '../ui/viewSheet.js';

export function renderEditor(state) {
  const lang = state.settings.language;
  const libraries = Object.values(state.customContent);

  const librariesHTML = libraries
    .map((doc) => {
      const cats = doc.categories
        .map((cat) => {
          const items = cat.items
            .map(
              (item) => `
        <div class="editor-item-row">
          <span class="editor-item-row__title">${escapeHTML(pickLocale(item.title, lang) || item.transliteration || t('editor.untitled', lang))}</span>
          <span class="editor-item-row__grade">${escapeHTML(GRADE_LABELS[item.grade] ? pickLocale(GRADE_LABELS[item.grade], lang) : item.grade)}</span>
          <div class="editor-item-row__actions">
            <button type="button" class="icon-btn" data-action="editor-edit-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.edit', lang)}">${icon('edit', { size: 15 })}</button>
            <button type="button" class="icon-btn" data-action="editor-duplicate-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.duplicate', lang)}">${icon('copy', { size: 15 })}</button>
            <button type="button" class="icon-btn" data-action="editor-delete-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}" data-item-id="${escapeHTML(item.id)}" aria-label="${t('editor.delete', lang)}">${icon('trash', { size: 15 })}</button>
          </div>
        </div>`
            )
            .join('');

          return `
      <div class="editor-category">
        <div class="editor-category__header">
          <span>${escapeHTML(categoryDisplayName(cat, lang))}</span>
          <div>
            <button type="button" class="btn btn--ghost btn--sm" data-action="editor-new-item" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}">${icon('plus', { size: 14 })} ${t('editor.newItem', lang)}</button>
            <button type="button" class="icon-btn" data-action="editor-delete-category" data-library-id="${escapeHTML(doc.metadata.id)}" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('editor.delete', lang)}">${icon('trash', { size: 15 })}</button>
          </div>
        </div>
        ${items || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
      </div>`;
        })
        .join('');

      return `
    <section class="panel">
      <div class="panel__header">
        <h2>${escapeHTML(pickLocale(doc.metadata.name, lang))}</h2>
        <button type="button" class="btn btn--ghost btn--sm" data-action="editor-new-category" data-library-id="${escapeHTML(doc.metadata.id)}">${icon('plus', { size: 14 })} ${t('editor.newCategory', lang)}</button>
      </div>
      ${cats || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
    </section>`;
    })
    .join('');

  return `
  <section class="view view--editor">
    <header class="view-header view-header--row">
      <h1 class="view__title">${t('editor.title', lang)}</h1>
      <button type="button" class="btn btn--primary btn--sm" data-action="editor-new-library">${icon('plus', { size: 16 })} ${t('editor.newLibrary', lang)}</button>
      ${viewMenuButton('editor', lang, { labelKey: 'viewMenu.editor' })}
    </header>
    ${
      librariesHTML ||
      emptyStateHTML({
        iconName: 'edit',
        title: t('editor.emptyState', lang),
        actionHTML: `<button type="button" class="btn btn--primary" data-action="editor-new-category" data-library-id="${DEFAULT_CUSTOM_LIBRARY_ID}">${t('editor.newCategory', lang)}</button>`,
      })
    }
  </section>`;
}

/** Modal form markup for creating/editing a single item.
 *  (v5.0.0) `scope: 'builtin'` routes the submit into the contentPrefs
 *  override lens (full field editing of bundled cards); absent scope =
 *  the classic custom-content editor path. */
export function buildItemForm(item, { libraryId, categoryId, lang = 'en', scope = 'custom' } = {}) {
  const gradeOptions = GRADES.map(
    (g) =>
      `<option value="${g}" ${item.grade === g ? 'selected' : ''}>${escapeHTML(pickLocale(GRADE_LABELS[g], lang))}</option>`
  ).join('');
  return `
  <form class="editor-form" data-form="item" data-scope="${escapeHTML(scope)}" data-library-id="${escapeHTML(libraryId)}" data-category-id="${escapeHTML(categoryId)}" data-item-id="${escapeHTML(item.id || '')}">
    <h2 id="modal-title-item">${item.id ? t('editor.edit', lang) : t('editor.newItem', lang)}</h2>
    ${scope === 'builtin' ? `<p class="editor-form__note">${t('editor.builtinNote', lang)}</p>` : ''}
    <label class="field">${t('editor.fieldTitleEn', lang)}<input class="input" name="titleEn" value="${escapeHTML(item.title?.en || '')}" required /></label>
    <label class="field">${t('editor.fieldTitleAr', lang)}<input class="input" name="titleAr" dir="rtl" lang="ar" value="${escapeHTML(item.title?.ar || '')}" /></label>
    <label class="field">${t('editor.fieldArabic', lang)}<textarea class="textarea" name="arabic" dir="rtl" lang="ar" rows="3">${escapeHTML(item.arabic || '')}</textarea></label>
    <label class="field">${t('editor.fieldTransliteration', lang)}<textarea class="textarea" name="transliteration" rows="2">${escapeHTML(item.transliteration || '')}</textarea></label>
    <label class="field">${t('editor.fieldTranslationEn', lang)}<textarea class="textarea" name="translationEn" rows="2">${escapeHTML(item.translation?.en || '')}</textarea></label>
    <label class="field">${t('editor.fieldReference', lang)}<input class="input" name="reference" value="${escapeHTML(item.reference?.collection || '')}" /></label>
    <label class="field">${t('editor.fieldHadithNumber', lang)}<input class="input" name="referenceHadith" value="${escapeHTML(item.reference?.hadith || '')}" /></label>
    <label class="field">${t('editor.fieldNarrator', lang)}<input class="input" name="referenceNarrator" value="${escapeHTML(item.reference?.narrator || '')}" /></label>
    <label class="field">${t('editor.fieldGrading', lang)}<input class="input" name="referenceGrading" value="${escapeHTML(item.reference?.grading || '')}" /></label>
    <label class="field">${t('editor.fieldGrade', lang)}<select class="select" name="grade">${gradeOptions}</select></label>
    <label class="field">${t('editor.fieldCustomGrade', lang)}<input class="input" name="customGradeEn" value="${escapeHTML(item.custom_grade?.en || '')}" /></label>
    <label class="field">${t('editor.fieldRepetitions', lang)}<input class="input" type="number" min="1" name="repetitions" value="${item.repetitions || 1}" /></label>
    <label class="field">${t('editor.fieldVirtues', lang)}<textarea class="textarea" name="virtuesEn" rows="2">${escapeHTML(item.virtues?.en || '')}</textarea></label>
    <label class="field">${t('editor.fieldTags', lang)}<input class="input" name="tags" value="${escapeHTML((item.tags || []).join(', '))}" /></label>
    <label class="field">${t('editor.fieldAttribution', lang)}<input class="input" name="notes" value="${escapeHTML(item.notes || '')}" placeholder="${t('editor.fieldAttributionPlaceholder', lang)}" /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

const CATEGORY_COLORS = ['slate', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal', 'indigo'];
const CATEGORY_ICONS = [
  'sunrise',
  'sunset',
  'moon',
  'star',
  'book',
  'book-open',
  'heart',
  'heart-filled',
  'shield',
  'sparkle',
  'droplet',
  'prayer-rug',
  'mosque',
  'tasbih',
  'flame',
  'cloud-rain',
  'utensils',
  'bed',
  'plane',
  'shirt',
  'ocean',
  'hands',
  'target',
  'seed',
  'sprout',
  'tree',
];

/** (v5.0.0) Section form — create (custom OR builtin) or edit (metadata
 *  override). Icon + color + description now editable everywhere. */
export function buildCategoryForm({
  libraryId,
  categoryId = '',
  category = null,
  scope = 'custom',
  lang = 'en',
}) {
  const editing = !!category;
  const icons = CATEGORY_ICONS.map(
    (ic) => `<option value="${ic}" ${category?.icon === ic ? 'selected' : ''}>${ic}</option>`
  ).join('');
  const colors = CATEGORY_COLORS.map(
    (c) => `<option value="${c}" ${category?.color === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  return `
  <form class="editor-form" data-form="category" data-scope="${escapeHTML(scope)}" data-library-id="${escapeHTML(libraryId)}" data-category-id="${escapeHTML(categoryId)}">
    <h2 id="modal-title-category">${editing ? t('editor.edit', lang) : t('editor.newCategory', lang)}</h2>
    ${scope === 'builtin' ? `<p class="editor-form__note">${t('editor.builtinNote', lang)}</p>` : ''}
    <label class="field">${t('editor.fieldTitleEn', lang)}<input class="input" name="nameEn" value="${escapeHTML(category?.name?.en || '')}" required /></label>
    <label class="field">${t('editor.fieldTitleAr', lang)}<input class="input" name="nameAr" dir="rtl" lang="ar" value="${escapeHTML(category?.name?.ar || '')}" /></label>
    <label class="field">${t('editor.fieldDescriptionEn', lang)}<input class="input" name="descEn" value="${escapeHTML(category?.description?.en || '')}" /></label>
    <label class="field">${t('editor.fieldIcon', lang)}<select class="select" name="icon">${icons}</select></label>
    <label class="field">${t('editor.fieldColor', lang)}<select class="select" name="color">${colors}</select></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

/** (v5.0.0) Library/banner edit form (metadata override on builtin, or
 *  create custom). */
export function buildLibraryForm({
  libraryId = '',
  library = null,
  scope = 'custom',
  lang = 'en',
} = {}) {
  const editing = !!library;
  return `
  <form class="editor-form" data-form="library" data-scope="${escapeHTML(scope)}" data-library-id="${escapeHTML(libraryId)}">
    <h2 id="modal-title-library">${editing ? t('editor.edit', lang) : t('editor.newLibrary', lang)}</h2>
    ${scope === 'builtin' ? `<p class="editor-form__note">${t('editor.builtinNote', lang)}</p>` : ''}
    <label class="field">${t('editor.fieldTitleEn', lang)}<input class="input" name="nameEn" value="${escapeHTML(library?.name?.en || '')}" required /></label>
    <label class="field">${t('editor.fieldTitleAr', lang)}<input class="input" name="nameAr" dir="rtl" lang="ar" value="${escapeHTML(library?.name?.ar || '')}" /></label>
    <label class="field">${t('editor.fieldDescriptionEn', lang)}<input class="input" name="descEn" value="${escapeHTML(library?.description?.en || '')}" /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

/** (v5.0.0) The schedule form — a daily reminder at a chosen time for
 *  a section / banner / tab. Prefilled from context; optionally also
 *  writes a recurring Hijri-calendar note (the Calendar integration). */
export function buildScheduleForm({
  label = '',
  targetView = '',
  targetKind = 'category',
  time = '06:00',
  lang = 'en',
}) {
  return `
  <form class="editor-form" data-form="schedule" data-target-view="${escapeHTML(targetView)}" data-target-kind="${escapeHTML(targetKind)}">
    <h2 id="modal-title-schedule">${t('schedule.title', lang)}</h2>
    <label class="field">${t('schedule.label', lang)}<input class="input" name="label" value="${escapeHTML(label)}" required /></label>
    <label class="field">${t('reminder.time', lang)}<input class="input" type="time" name="time" value="${escapeHTML(time)}" required /></label>
    <label class="setting setting--row">
      <input type="checkbox" name="alsoCalendar" />
      <span>${t('schedule.alsoCalendar', lang)}</span>
    </label>
    <p class="editor-form__note">${t('schedule.note', lang)}</p>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}
