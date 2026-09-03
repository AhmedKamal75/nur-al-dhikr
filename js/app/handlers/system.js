/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { rt } from '../../app/rt.js';
import { reminderFormHTML } from '../forms.js';
import { retryLibraryLoad } from '../net.js';
import { VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go } from '../../core/router.js';
import { actions, dryRunRestore, persistedSnapshot, store } from '../../core/state.js';
import { dryRunVerdict } from '../../services/dataHealth.js';
import { buildConfirm } from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as backup from '../../services/backup.js';

export const clickHandlers = {
  'set-setting': (ds) => {
    store.dispatch(actions.updateSettings({ [ds.key]: ds.value }));
  },

  /**
   * v4.1 — Retry a failed lazy-data tier. The reducer clears the failure
   * flag AND bumps a counter (guaranteeing a notify), so stateSub re-runs
   * the ensure* pass for the active view; the fetch guards were reset when
   * the tier failed, so the fetch actually re-fires. See
   * ui/emptyState.js#loadErrorStateHTML.
   *
   * (v4.3) the boot-time library tier has no ensure* pass in stateSub —
   * its retry re-runs the load pipeline directly instead.
   */
  'retry-load': (ds) => {
    if (ds.key === 'library') {
      retryLibraryLoad();
      return;
    }
    if (typeof ds.key === 'string' && ds.key) store.dispatch(actions.retryDataLoad(ds.key));
  },

  'add-reminder': () => {
    const lang = store.getState().settings.language;
    openModal(reminderFormHTML(lang), { labelledBy: 'modal-title-reminder' });
  },

  'delete-reminder': (ds) => {
    // (v4.2) a deleted fajr reminder is the exact failure mode the v3.4
    // walkthrough called "the worst kind of failure" — confirm destructive
    // deletes everywhere, not just collections.
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('reminder.deleteConfirm', lang),
        confirmAction: 'delete-reminder-confirmed',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'delete-reminder-confirmed': (ds) => {
    closeModal();
    store.dispatch(actions.deleteReminder(ds.id));
  },

  'import-backup-confirmed': () => {
    if (!rt.pendingImportPayload) {
      closeModal();
      return;
    }
    const payload = rt.pendingImportPayload;
    rt.pendingImportPayload = null;
    store.dispatch(actions.restoreState(payload));
    closeModal();
    showToast(t('backup.importDone', store.getState().settings.language));
    go(VIEWS.HOME);
  },

  'export-backup': () => {
    backup.downloadBackup(persistedSnapshot(store.getState()));
    // FIX (review v3.3 A10): the browser's download bar was the only
    // acknowledgment — an in-app toast matching every other action here.
    showToast(t('settings.backupExported', store.getState().settings.language));
    // v3.26 data health: stamp the export (the reducer writes its own
    // device clock, ignoring any payload).
    store.dispatch(actions.markBackupExported());
  },

  // v3.26 data health — the restore dry run: the same bytes an export
  // would produce, through the same sanitizer a restore applies, in a
  // pure sandboxed read. The result renders inline in the Data panel.
  'verify-backup': () => {
    const report = dryRunRestore(persistedSnapshot(store.getState()));
    store.dispatch(actions.setDataHealthDryRun(report));
    const verdict = dryRunVerdict(report);
    const lang = store.getState().settings.language;
    showToast(
      t(
        verdict === 'clean'
          ? 'settings.dataVerifyClean'
          : verdict === 'lossy'
            ? 'settings.dataVerifyLossy'
            : 'settings.dataVerifyFailed',
        lang,
        report
      )
    );
  },

  'import-backup': () => {
    const input = document.getElementById('backup-file-input');
    input.value = '';
    input.click();
  },

  'reset-all-data': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('settings.resetConfirm', lang),
        confirmAction: 'confirm-reset-all',
        lang,
      })
    );
  },

  'confirm-reset-all': () => {
    store.dispatch(actions.resetAll());
    closeModal();
    go(VIEWS.HOME);
  },
};
