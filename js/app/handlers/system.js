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
import {
  DAILY_VERSE_PRESET_ID,
  JUMUAH_PRESET_ID,
  dailyVerseReminder,
  dayKey,
  hasPreset,
  jumuahNote,
} from '../../domain/reminderPresets.js';
import { actions, dryRunRestore, persistedSnapshot, store } from '../../core/state.js';
import { buildReciterPick } from './quranAudio.js';
import { dryRunVerdict } from '../../services/dataHealth.js';
import * as surahPlayback from '../../services/surahPlayback.js';
import { buildConfirm } from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as backup from '../../services/backup.js';

export const clickHandlers = {
  'set-setting': (ds) => {
    store.dispatch(actions.updateSettings({ [ds.key]: ds.value }));
    // Live-apply reciter voices to a running recitation session — otherwise
    // picking a new reciter mid-listen does nothing until the next manual
    // play (the "always the same reciter" complaint).
    if (surahPlayback.isActive()) {
      if (ds.key === 'reciter') {
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciter(ds.value)));
      } else if (ds.key === 'reciterB') {
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciterB(ds.value)));
      } else if (ds.key === 'reciterCompare') {
        const on = ds.value === true || ds.value === 'true';
        store.dispatch(actions.setSurahPlayback(surahPlayback.setCompare(on)));
      }
    }
    // Picks made inside the in-player voice picker re-render the picker in
    // place so the check marks follow the choice (the main view re-renders
    // behind the modal, never the modal itself).
    if (ds.refresh === 'recite-voice-open') {
      openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
    }
  },

  // (U14) Settings table-of-contents jump: scrolls to the panel without
  // touching the hash router (a plain #anchor would be parsed as a route).
  // The button keeps focus, so nothing is lost for keyboard users.
  'settings-toc-go': (ds) => {
    const el = typeof ds.target === 'string' ? document.getElementById(ds.target) : null;
    if (!el) return;
    const reduce = !!store.getState().settings.reduceMotion;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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

  // (v5.2.0) One-tap notification presets on the existing scheduler —
  // Jumu'ah (recurring Friday calendar note) and daily verse (morning
  // reminder deep-linking home). Idempotent: re-tapping reports "already".
  'add-preset': (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    if (ds.preset === 'jumuah') {
      if (hasPreset(state.calendarNotes, JUMUAH_PRESET_ID)) {
        showToast(t('preset.exists', lang));
        return;
      }
      const note = jumuahNote(dayKey(new Date()), {
        title: t('preset.jumuahTitle', lang),
        body: t('preset.jumuahBody', lang),
      });
      if (!note) return;
      store.dispatch(actions.addCalendarNote(note));
      showToast(t('preset.added', lang));
      return;
    }
    if (ds.preset === 'dailyVerse') {
      if (hasPreset(state.reminders, DAILY_VERSE_PRESET_ID)) {
        showToast(t('preset.exists', lang));
        return;
      }
      const reminder = dailyVerseReminder({
        label: t('preset.dailyVerseLabel', lang),
        body: t('preset.dailyVerseBody', lang),
      });
      if (!reminder) return;
      store.dispatch(actions.addReminder(reminder));
      showToast(t('preset.added', lang));
    }
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
