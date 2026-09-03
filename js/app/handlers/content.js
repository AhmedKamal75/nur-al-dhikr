/**
 * app/handlers/content.js (v5.0.0)
 * The four-level content-authority actions. Everything dispatches through
 * the contentPrefs lens (services/contentPrefs.js) — the bundled libraries
 * never change, so every level's "Restore defaults" is just deleting the
 * user's override keys.
 *
 *   Level 1  Card     — full field edit, hide, true delete, restore
 *   Level 2  Section  — metadata edit, add/delete/reorder cards, restore
 *   Level 3  Banner   — library metadata, sections CRUD/reorder, restore
 *   Level 4  Tab      — global restore, field defaults, schedule manager
 *
 * Custom (user-authored) content keeps using the v4 editor service path —
 * these handlers route by scope.
 */

import { actions, store } from '../../core/state.js';
import { buildConfirm } from '../../ui/menus.js';
import { closeModal, isModalOpen, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { t } from '../../core/i18n.js';
import { buildHash } from '../../core/router.js';
import { VIEWS } from '../../core/config.js';
import {
  moveItem,
  setItemHidden,
  setCategoryHidden,
  setItemTarget,
  itemTargetOf,
  findCategoryById,
  setItemDeleted,
  setCategoryDeleted,
  setLibraryDeleted,
  setLibraryHidden,
  moveCategory,
  moveLibrary,
  addItemToCategory,
  restoreItem,
  restoreCategory,
  restoreLibrary,
  restoreAll,
  setLibraryFieldToggles,
  contentPrefsOf,
} from '../../services/contentPrefs.js';
import {
  buildCategoryForm,
  buildItemForm,
  buildLibraryForm,
  buildScheduleForm,
} from '../../views/editor.js';
import { buildScheduleManagerSheet } from '../../views/viewSheets.js';

const commit = (prefs) => store.dispatch(actions.updateSettings({ contentPrefs: prefs }));
const lang = () => store.getState().settings.language;

/** Where an item lives: builtin (lens) vs custom (editor service). */
function itemScope(itemId) {
  const state = store.getState();
  const entry = state.library.itemIndex?.[itemId];
  if (entry) return { entry, isCustom: !!state.customContent[entry.document.metadata.id] };
  return { entry: null, isCustom: false };
}

export const clickHandlers = {
  'content-manage-toggle': () => {
    store.dispatch(actions.contentManageToggle());
  },

  'content-hide-item': (ds) => {
    commit(setItemHidden(store.getState(), ds.itemId, true));
  },

  'content-unhide-item': (ds) => {
    commit(setItemHidden(store.getState(), ds.itemId, false));
  },

  'content-hide-category': (ds) => {
    commit(setCategoryHidden(store.getState(), ds.categoryId, true));
  },

  'content-unhide-category': (ds) => {
    commit(setCategoryHidden(store.getState(), ds.categoryId, false));
  },

  'content-move-item': (ds) => {
    const dir = Number(ds.dir) >= 0 ? 1 : -1;
    commit(moveItem(store.getState(), ds.categoryId, ds.itemId, dir));
  },

  // (v4.6.0) The manage-row stepper: ±1 target adjustments that skip
  // the state round-trip of typing — same prefs lens underneath.
  'content-target-step': (ds) => {
    const state = store.getState();
    const found = findCategoryById(state, ds.categoryId);
    const item = (found?.cat?.items || []).find((it) => it.id === ds.itemId);
    const current = itemTargetOf(state, item || { id: ds.itemId });
    const dir = Number(ds.dir) >= 0 ? 1 : -1;
    const next = Math.min(10000, Math.max(1, current + dir));
    if (next === current) return;
    commit(setItemTarget(state, ds.itemId, next));
  },

  'content-reset-category': (ds) => {
    // Zero every counter of this section's items (and their hidden state
    // stays as-is) — the "start this section fresh" affordance.
    const state = store.getState();
    const found = findCategoryById(state, ds.categoryId);
    if (!found) return;
    for (const it of found.cat.items || []) {
      if (state.counters[it.id]) store.dispatch(actions.resetCounter(it.id, it.repetitions || 1));
    }
  },

  /* ---------------- Level 1: Card ---------------- */

  /** Edit ANY card's fields — builtin cards open the same form, routed
   *  into the itemOverrides lens on submit. */
  'content-edit-item': (ds) => {
    const state = store.getState();
    const found = findCategoryById(state, ds.categoryId);
    const item = (found?.cat?.items || []).find((it) => it.id === ds.itemId);
    if (!item) return;
    const isCustom = found?.isCustom;
    openModal(
      buildItemForm(item, {
        libraryId: found.doc.metadata.id,
        categoryId: ds.categoryId,
        lang: lang(),
        scope: isCustom ? 'custom' : 'builtin',
      }),
      { labelledBy: 'modal-title-item' }
    );
  },

  'content-new-item': (ds) => {
    openModal(
      buildItemForm(
        { title: { en: '', ar: '' }, arabic: '', repetitions: 3 },
        {
          libraryId: ds.libraryId,
          categoryId: ds.categoryId,
          lang: lang(),
          scope: 'builtin',
        }
      ),
      { labelledBy: 'modal-title-item' }
    );
  },

  /** TRUE delete — builtin cards go into the restorable deletedItems
   *  lens; custom cards take the real editor path. */
  'content-delete-item': (ds) => {
    const { isCustom } = itemScope(ds.itemId);
    if (isCustom) {
      openModal(
        buildConfirm({
          message: t('editor.deleteConfirm', lang()),
          confirmAction: 'confirm-delete-item',
          confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId, itemId: ds.itemId },
          lang: lang(),
        })
      );
      return;
    }
    openModal(
      buildConfirm({
        message: t('content.deleteItemConfirm', lang()),
        confirmAction: 'confirm-content-delete-item',
        confirmData: { itemId: ds.itemId },
        lang: lang(),
      })
    );
  },

  'confirm-content-delete-item': (ds) => {
    commit(setItemDeleted(store.getState(), ds.itemId, true));
    closeModal();
    showToast(t('content.itemDeleted', lang()));
  },

  /** Duplicate ANY card — builtin copies land in addedItems (a real user
   *  card carrying the source's current effective fields); custom cards
   *  keep the editor path. */
  'content-duplicate-item': (ds) => {
    const state = store.getState();
    const { entry, isCustom } = itemScope(ds.itemId);
    if (!entry) return;
    if (isCustom) {
      // Custom library: the v4 editor service owns the doc.
      import('../../services/editor.js').then((editorApi) => {
        editorApi.duplicateItem(entry.document.metadata.id, ds.categoryId, ds.itemId);
      });
      return;
    }
    const { id: _id, order: _order, ...fields } = entry.item;
    const { prefs } = addItemToCategory(state, ds.categoryId, fields);
    commit(prefs);
    showToast(t('editor.duplicated', lang()));
  },

  /** Restore ONE card to its bundled defaults. */
  'content-restore-item': (ds) => {
    commit(restoreItem(store.getState(), ds.itemId));
    // The counter record may still carry the pre-restore target — reset it
    // so the pill reads the book's number again.
    const entry = store.getState().library.itemIndex?.[ds.itemId];
    store.dispatch(actions.resetCounter(ds.itemId, entry?.item?.repetitions || 1));
    showToast(t('content.itemRestored', lang()));
  },

  /* ---------------- Level 2: Section ---------------- */

  'content-edit-category': (ds) => {
    const state = store.getState();
    const found = findCategoryById(state, ds.categoryId);
    if (!found) return;
    openModal(
      buildCategoryForm({
        libraryId: found.doc.metadata.id,
        categoryId: ds.categoryId,
        category: found.cat,
        scope: found.isCustom ? 'custom' : 'builtin',
        lang: lang(),
      }),
      { labelledBy: 'modal-title-category' }
    );
  },

  'content-new-category': (ds) => {
    openModal(
      buildCategoryForm({
        libraryId: ds.libraryId,
        scope: 'builtin',
        lang: lang(),
      }),
      { labelledBy: 'modal-title-category' }
    );
  },

  'content-delete-category': (ds) => {
    const state = store.getState();
    const found = findCategoryById(state, ds.categoryId);
    if (found?.isCustom) {
      openModal(
        buildConfirm({
          message: t('editor.deleteConfirm', lang()),
          confirmAction: 'confirm-delete-category',
          confirmData: { libraryId: ds.libraryId, categoryId: ds.categoryId },
          lang: lang(),
        })
      );
      return;
    }
    openModal(
      buildConfirm({
        message: t('content.deleteSectionConfirm', lang()),
        confirmAction: 'confirm-content-delete-category',
        confirmData: { categoryId: ds.categoryId },
        lang: lang(),
      })
    );
  },

  'confirm-content-delete-category': (ds) => {
    commit(setCategoryDeleted(store.getState(), ds.categoryId, true));
    closeModal();
    showToast(t('content.sectionDeleted', lang()));
    // The section is gone — land somewhere honest.
    if (store.getState().activeView === VIEWS.CATEGORY) {
      window.location.hash = buildHash(VIEWS.LIBRARY);
    }
  },

  'content-move-category': (ds) => {
    const dir = Number(ds.dir) >= 0 ? 1 : -1;
    commit(moveCategory(store.getState(), ds.libraryId, ds.categoryId, dir));
  },

  /** Restore a whole section (its cards' edits + its own metadata). */
  'content-restore-category': (ds) => {
    openModal(
      buildConfirm({
        message: t('content.restoreSectionConfirm', lang()),
        confirmAction: 'confirm-content-restore-category',
        confirmData: { categoryId: ds.categoryId },
        lang: lang(),
      })
    );
  },

  'confirm-content-restore-category': (ds) => {
    commit(restoreCategory(store.getState(), ds.categoryId));
    closeModal();
    showToast(t('content.sectionRestored', lang()));
  },

  /* ---------------- Level 3: Banner (library) ---------------- */

  'content-edit-library': (ds) => {
    const state = store.getState();
    const doc =
      state.library.documents[ds.libraryId] ||
      Object.values(state.customContent).find((d) => d.metadata.id === ds.libraryId);
    if (!doc) return;
    const isCustom = !!state.customContent[ds.libraryId];
    openModal(
      buildLibraryForm({
        libraryId: ds.libraryId,
        library: doc.metadata,
        scope: isCustom ? 'custom' : 'builtin',
        lang: lang(),
      }),
      { labelledBy: 'modal-title-library' }
    );
  },

  'content-delete-library': (ds) => {
    const state = store.getState();
    if (state.customContent[ds.libraryId]) {
      openModal(
        buildConfirm({
          message: t('editor.deleteConfirm', lang()),
          confirmAction: 'confirm-content-delete-custom-library',
          confirmData: { libraryId: ds.libraryId },
          lang: lang(),
        })
      );
      return;
    }
    openModal(
      buildConfirm({
        message: t('content.deleteLibraryConfirm', lang()),
        confirmAction: 'confirm-content-delete-library',
        confirmData: { libraryId: ds.libraryId },
        lang: lang(),
      })
    );
  },

  'confirm-content-delete-custom-library': (ds) => {
    store.dispatch(actions.deleteCustomLibrary(ds.libraryId));
    closeModal();
    showToast(t('content.libraryDeleted', lang()));
  },

  'confirm-content-delete-library': (ds) => {
    commit(setLibraryDeleted(store.getState(), ds.libraryId, true));
    closeModal();
    showToast(t('content.libraryDeleted', lang()));
  },

  'content-hide-library': (ds) => {
    commit(setLibraryHidden(store.getState(), ds.libraryId, true));
  },

  'content-unhide-library': (ds) => {
    commit(setLibraryHidden(store.getState(), ds.libraryId, false));
  },

  'content-move-library': (ds) => {
    const dir = Number(ds.dir) >= 0 ? 1 : -1;
    commit(moveLibrary(store.getState(), ds.libraryId, dir));
  },

  'content-restore-library': (ds) => {
    openModal(
      buildConfirm({
        message: t('content.restoreLibraryConfirm', lang()),
        confirmAction: 'confirm-content-restore-library',
        confirmData: { libraryId: ds.libraryId },
        lang: lang(),
      })
    );
  },

  'confirm-content-restore-library': (ds) => {
    commit(restoreLibrary(store.getState(), ds.libraryId));
    closeModal();
    showToast(t('content.libraryRestored', lang()));
  },

  /* ---------------- Level 4: Tab (global) ---------------- */

  'content-restore-all': () => {
    openModal(
      buildConfirm({
        message: t('content.restoreAllConfirm', lang()),
        confirmAction: 'confirm-content-restore-all',
        lang: lang(),
      })
    );
  },

  'confirm-content-restore-all': () => {
    commit(restoreAll());
    closeModal();
    showToast(t('content.allRestored', lang()));
  },

  /** Per-library (banner) field-visibility toggle from a sheet — flips the
   *  lens key and re-renders the sheet so the switches stay honest. */
  'content-field-toggle': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const current = prefs.libraryFieldToggles?.[ds.libraryId] || {};
    const field = ds.field;
    const next = { ...current, [field]: !(current[field] !== false) };
    commit(setLibraryFieldToggles(state, ds.libraryId, next));
    import('../../views/viewSheets.js').then(({ buildFieldTogglesSheet }) => {
      openModal(buildFieldTogglesSheet(store.getState(), ds.libraryId), {
        labelledBy: 'modal-title-view-sheet',
      });
    });
  },

  /** Global (tab) field-visibility default toggle from Settings/Library sheet. */
  'content-field-toggle-global': (ds) => {
    const state = store.getState();
    const current = { ...(state.settings.cardFields || {}) };
    current[ds.field] = !(current[ds.field] !== false);
    store.dispatch(actions.updateSettings({ cardFields: current }));
  },

  /** Clear one library's field toggles → inherit global defaults. */
  'content-field-reset': (ds) => {
    commit(setLibraryFieldToggles(store.getState(), ds.libraryId, null));
  },

  /* ---------------- Scheduling (all levels) ---------------- */

  'content-schedule': (ds) => {
    const state = store.getState();
    let label = '';
    let targetView = buildHash(VIEWS.LIBRARY);
    const time = '06:00';
    if (ds.categoryId) {
      const found = findCategoryById(state, ds.categoryId);
      if (found) {
        label = (found.cat.name && (found.cat.name.en || found.cat.name.ar)) || found.cat.id;
        targetView = buildHash(VIEWS.CATEGORY, { id: ds.categoryId });
      }
    } else if (ds.bookId) {
      // (v5.0.0) the Ahadeeth tab: schedule daily reading of a book.
      const book = (state.hadith.index?.books || []).find((b) => b.id === ds.bookId);
      if (book) {
        label = book.name?.en || book.name?.ar || ds.bookId;
        targetView = buildHash(VIEWS.HADITH, { id: ds.bookId });
      }
    } else if (ds.libraryId) {
      const doc = state.library.documents[ds.libraryId];
      if (doc) {
        label = doc.metadata.name?.en || doc.metadata.name?.ar || ds.libraryId;
        targetView = buildHash(VIEWS.CATEGORY, {
          id: doc.categories[0]?.id || '',
        });
      }
    } else {
      // The Azkar tab as a whole (hadith grid sheet / library sheet).
      label = t('nav.hadith', state.settings.language) || 'Nur al Dhikr';
      targetView = buildHash(VIEWS.HADITH);
    }
    openModal(
      buildScheduleForm({
        label,
        targetView,
        targetKind: ds.categoryId ? 'category' : ds.bookId ? 'hadith-book' : 'library',
        time,
        lang: lang(),
      }),
      { labelledBy: 'modal-title-schedule' }
    );
  },

  'schedule-toggle': (ds) => {
    const state = store.getState();
    const r = (state.reminders || []).find((x) => x.id === ds.reminderId);
    if (!r) return;
    store.dispatch(actions.updateReminder(ds.reminderId, { enabled: !r.enabled }));
    // (v5.1.0) rebuild the manager sheet in place: its HTML is a static
    // snapshot, so without this the check icon never flipped — the toggle
    // looked dead (same class of bug as the Ramadan alert rows).
    if (isModalOpen()) {
      openModal(buildScheduleManagerSheet(store.getState()), {
        labelledBy: 'modal-title-view-sheet',
      });
    }
  },

  'schedule-delete': (ds) => {
    store.dispatch(actions.deleteReminder(ds.reminderId));
    showToast(t('schedule.removed', lang()));
    if (isModalOpen()) {
      openModal(buildScheduleManagerSheet(store.getState()), {
        labelledBy: 'modal-title-view-sheet',
      });
    }
  },

  /* ---------------- Ahadeeth (the azkar treatment, v5.0.0) ------------ */

  'hadith-book-move': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const hp = prefs.hadithPrefs || {};
    const order =
      Array.isArray(hp.orderBooks) && hp.orderBooks.length
        ? [...hp.orderBooks]
        : (state.hadith.index?.books || []).map((b) => b.id);
    const at = order.indexOf(ds.bookId);
    const to = at + (Number(ds.dir) >= 0 ? 1 : -1);
    if (at < 0 || to < 0 || to >= order.length) return;
    [order[at], order[to]] = [order[to], order[at]];
    commit({
      ...prefs,
      hadithPrefs: { ...(hp || {}), orderBooks: order },
    });
  },

  'hadith-hide-book': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.hiddenBooks = { ...(hp.hiddenBooks || {}), [ds.bookId]: true };
    commit({ ...prefs, hadithPrefs: hp });
  },

  'hadith-unhide-book': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.hiddenBooks = { ...(hp.hiddenBooks || {}) };
    delete hp.hiddenBooks[ds.bookId];
    commit({ ...prefs, hadithPrefs: hp });
  },

  'hadith-delete-book': (ds) => {
    openModal(
      buildConfirm({
        message: t('content.deleteLibraryConfirm', lang()),
        confirmAction: 'confirm-hadith-delete-book',
        confirmData: { bookId: ds.bookId },
        lang: lang(),
      })
    );
  },

  'confirm-hadith-delete-book': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.deletedBooks = { ...(hp.deletedBooks || {}), [ds.bookId]: true };
    commit({ ...prefs, hadithPrefs: hp });
    closeModal();
    showToast(t('content.libraryDeleted', lang()));
    if (store.getState().activeView === VIEWS.HADITH && store.getState().activeParams?.id) {
      window.location.hash = buildHash(VIEWS.HADITH);
    }
  },

  'hadith-restore-book': (ds) => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.deletedBooks = { ...(hp.deletedBooks || {}) };
    hp.hiddenBooks = { ...(hp.hiddenBooks || {}) };
    delete hp.deletedBooks[ds.bookId];
    delete hp.hiddenBooks[ds.bookId];
    // restoring a book also restores its individually hidden hadiths
    hp.hiddenHadiths = { ...(hp.hiddenHadiths || {}) };
    for (const k of Object.keys(hp.hiddenHadiths)) {
      if (k.startsWith(`${ds.bookId}:`)) delete hp.hiddenHadiths[k];
    }
    commit({ ...prefs, hadithPrefs: hp });
    showToast(t('content.libraryRestored', lang()));
  },

  'hadith-hide-item': (ds) => {
    const prefs = contentPrefsOf(store.getState());
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.hiddenHadiths = { ...(hp.hiddenHadiths || {}), [`${ds.bookId}:${ds.n}`]: true };
    commit({ ...prefs, hadithPrefs: hp });
  },

  'hadith-unhide-item': (ds) => {
    const prefs = contentPrefsOf(store.getState());
    const hp = { ...(prefs.hadithPrefs || {}) };
    hp.hiddenHadiths = { ...(hp.hiddenHadiths || {}) };
    delete hp.hiddenHadiths[ds.key];
    commit({ ...prefs, hadithPrefs: hp });
  },

  'hadith-restore-all': () => {
    openModal(
      buildConfirm({
        message: t('hadith.restoreAllConfirm', lang()),
        confirmAction: 'confirm-hadith-restore-all',
        lang: lang(),
      })
    );
  },

  'confirm-hadith-restore-all': () => {
    const state = store.getState();
    const prefs = contentPrefsOf(state);
    commit({
      ...prefs,
      hadithPrefs: { hiddenBooks: {}, deletedBooks: {}, orderBooks: [], hiddenHadiths: {} },
    });
    closeModal();
    showToast(t('content.allRestored', lang()));
  },
};
