/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { refocusZakatInput } from '../inputs.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { uid } from '../../core/utils.js';
import { computeFitr, computeZakat, hawlDueFor } from '../../domain/zakat.js';
import { buildTextPrompt, buildConfirm } from '../../ui/menus.js';
import { openModal, closeModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { buildMushafBookmarks, setBookmarkFolderFilter } from '../../views/mushafReader.js';

export const clickHandlers = {
  /* ---------------- Zakat calculator ------------------ */

  'zakat-set-basis': (ds) => {
    store.dispatch(actions.setZakatPrefs({ basis: ds.basis === 'silver' ? 'silver' : 'gold' }));
  },

  'zakat-clear-inputs': () => {
    store.dispatch(actions.clearZakatInputs());
    refocusZakatInput('in-cash');
  },

  'zakat-save-snapshot': () => {
    const state = store.getState();
    const r = computeZakat(state.zakat.inputs, state.zakat.prefs);
    const f = computeFitr(state.zakat.prefs.fitrPer || 0, state.zakat.prefs.fitrPeople || 0);
    const ts = Date.now();
    const snapshot = {
      id: uid('zak'),
      ts,
      hawlDue: hawlDueFor(ts),
      remind: true,
      due: r.due,
      currency: state.zakat.prefs.currency || '',
      netWealth: Math.round(r.netWealth * 100) / 100,
      nisabMet: r.nisabMet,
      fitrTotal: f.total,
    };
    store.dispatch(actions.saveZakatSnapshot(snapshot));
    showToast(t('zakat.snapshotSaved', state.settings.language));
  },

  'zakat-delete-snapshot': (ds) => {
    // (v4.2) destructive + unrecoverable → confirm, like every other
    // delete in the app. A slip of the thumb on a dense history list used
    // to erase a saved calculation instantly.
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('zakat.deleteSnapshotConfirm', lang),
        confirmAction: 'zakat-delete-snapshot-confirmed',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'zakat-delete-snapshot-confirmed': (ds) => {
    closeModal();
    store.dispatch(actions.deleteZakatSnapshot(ds.id));
  },

  'zakat-toggle-hawl-remind': (ds) => {
    const snap = store.getState().zakatHistory.find((s) => s.id === ds.id);
    if (!snap) return;
    store.dispatch(actions.updateZakatSnapshot(ds.id, { remind: snap.remind === false }));
  },

  /* ---------------- Ayah bookmark folders/notes ---------------- */

  'bookmark-filter-folder': (ds) => {
    setBookmarkFolderFilter(ds.folder);
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'bookmark-new-folder': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('mushaf.newFolder', lang),
        placeholder: t('mushaf.folderNamePh', lang),
        confirmAction: 'submit-new-bookmark-folder',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
    // NOTE: the submit path routes through handlePromptForm (no click
    // handler with this name, so the form's native submit fires normally).
  },

  'bookmark-delete-folder': (ds) => {
    // (v4.2) deleting a folder also un-files its bookmarks — confirm first
    // (the × sits directly beside the filter chip people tap constantly).
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('mushaf.deleteFolderConfirm', lang),
        confirmAction: 'bookmark-delete-folder-confirmed',
        confirmData: { folder: ds.folder },
        lang,
      })
    );
  },

  'bookmark-delete-folder-confirmed': (ds) => {
    closeModal();
    store.dispatch(actions.deleteBookmarkFolder(ds.folder));
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },
};
