/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { t } from '../../core/i18n.js';
import { store } from '../../core/state.js';
import { buildConfirm } from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import * as editorApi from '../../services/editor.js';
import * as recitation from '../../services/recitation.js';
import { buildCategoryForm, buildItemForm, buildLibraryForm } from '../../views/editor.js';

export const clickHandlers = {
  'editor-new-library': () => {
    const lang = store.getState().settings.language;
    openModal(buildLibraryForm({ lang }), { labelledBy: 'modal-title-library' });
  },

  'editor-new-category': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildCategoryForm({ libraryId: ds.libraryId, lang }), {
      labelledBy: 'modal-title-category',
    });
  },

  'editor-delete-category': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-category',
        confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId },
        lang,
      })
    );
  },

  'confirm-delete-category': (ds) => {
    editorApi.deleteCategory(ds.libraryId, ds.categoryId);
    closeModal();
  },

  'editor-new-item': (ds) => {
    const lang = store.getState().settings.language;
    const blank = editorApi.blankItemTemplate(ds.categoryId);
    openModal(buildItemForm(blank, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), {
      labelledBy: 'modal-title-item',
    });
  },

  'editor-edit-item': (ds) => {
    const lang = store.getState().settings.language;
    const lib = editorApi.getCustomLibrary(ds.libraryId);
    const cat = lib?.categories.find((c) => c.id === ds.categoryId);
    const item = cat?.items.find((i) => i.id === ds.itemId);
    if (!item) return;
    openModal(buildItemForm(item, { libraryId: ds.libraryId, categoryId: ds.categoryId, lang }), {
      labelledBy: 'modal-title-item',
    });
  },

  'editor-duplicate-item': (ds) => {
    editorApi.duplicateItem(ds.libraryId, ds.categoryId, ds.itemId);
  },

  'editor-delete-item': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-item',
        confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId, itemId: ds.itemId },
        lang,
      })
    );
  },

  'confirm-delete-item': (ds) => {
    editorApi.deleteItem(ds.libraryId, ds.categoryId, ds.itemId);
    closeModal();
  },

  'modal-close': () => {
    recitation.stop();
    closeModal();
  },
};
