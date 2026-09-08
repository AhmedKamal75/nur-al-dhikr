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
import { clampSliderNum } from '../inputs.js';
import { buildMushafSheet } from '../../views/mushafReader.js';
import { buildMushafSettingsPanel } from '../../views/tafsirPanel.js';
import { buildReciterPick } from './quranAudio.js';
import { dryRunVerdict } from '../../services/dataHealth.js';
import * as surahPlayback from '../../services/surahPlayback.js';
import { moveHomePanel } from '../../domain/homePanels.js';
import { buildConfirm, buildTextPrompt } from '../../ui/menus.js';
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

  // Kids mode exit (fired by the 2s hold timer in events.js, never by tap):
  // switching the mode off returns home with the full app restored.
  'kids-exit': () => {
    store.dispatch(actions.updateSettings({ kidsMode: false }));
    showToast(t('kids.exitDone', store.getState().settings.language));
    go(VIEWS.HOME);
  },

  // Home panel reorder: move one panel up/down in the saved order (the
  // domain starts from the book order when nothing is saved yet).
  'home-panel-move': (ds) => {
    if (!ds.id) return;
    const dir = Number(ds.dir) >= 0 ? 1 : -1;
    const next = moveHomePanel(store.getState().settings.homeOrder, ds.id, dir);
    store.dispatch(actions.updateSettings({ homeOrder: next }));
  },

  // App-wide progress profiles (family sharing): create via text prompt,
  // switch swaps the progress slices, delete needs confirm (and never the
  // active profile — the handler says so instead of stranding slices).
  'profile-create': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('settings.profileNewTitle', lang),
        placeholder: t('settings.profileNamePh', lang),
        confirmAction: 'submit-new-profile',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'profile-switch': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.switchProfile(ds.id));
    showToast(t('settings.profileSwitched', store.getState().settings.language));
  },

  'profile-delete': (ds) => {
    if (!ds.id) return;
    const lang = store.getState().settings.language;
    if (ds.id === store.getState().activeProfile) {
      showToast(t('settings.profileDeleteActive', lang));
      return;
    }
    openModal(
      buildConfirm({
        message: t('settings.profileDeleteConfirm', lang),
        confirmAction: 'profile-delete-confirmed',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'profile-delete-confirmed': (ds) => {
    if (!ds.id) return;
    closeModal();
    store.dispatch(actions.deleteProfile(ds.id));
    showToast(t('settings.profileDeleted', store.getState().settings.language));
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

/** change registry (Blueprint D): { sel, run(ds, el, e) }. */
export const changeHandlers = [
  {
    sel: '[data-action="toggle-setting"]',
    run: (ds, el) => {
      store.dispatch(actions.updateSettings({ [ds.key]: el.checked }));
      // Live-apply the compare-mode preference to a running recitation
      // session (same as the set-setting click path below).
      if (ds.key === 'reciterCompare' && surahPlayback.isActive()) {
        store.dispatch(actions.setSurahPlayback(surahPlayback.setCompare(el.checked)));
      }
    },
  },
  {
    // Kids mode: entering navigates straight into the Kids home (the
    // parent hands the device over); leaving returns home.
    sel: '[data-action="toggle-kids-mode"]',
    run: (ds, el) => {
      const on = el.checked;
      store.dispatch(actions.updateSettings({ kidsMode: on }));
      go(on ? VIEWS.KIDS : VIEWS.HOME);
    },
  },
  {
    // Elderly one-tap mode: the class does the styling; enabling ALSO bumps
    // the two font scales + high contrast once (kept afterwards — the
    // sliders stay the source of truth, disabling only drops the class).
    sel: '[data-action="toggle-elder-mode"]',
    run: (ds, el) => {
      const on = el.checked;
      const patch = { elderMode: on };
      if (on) {
        const s = store.getState().settings;
        patch.fontScale = Math.max(Number(s.fontScale) || 1, 1.25);
        patch.arabicFontScale = Math.max(Number(s.arabicFontScale) || 1, 1.5);
        patch.highContrast = true;
      }
      store.dispatch(actions.updateSettings(patch));
    },
  },
  {
    sel: '[data-action="toggle-mushaf-pref"]',
    run: (ds, el) => {
      store.dispatch(actions.updateMushafPrefs({ [ds.key]: el.checked }));
      // The legend only shows while tajweed coloring is on, and toggles in
      // general read better with instant feedback — refresh the originating
      // panel in place (sheet toggles stay in the sheet, settings toggles
      // stay in settings) rather than waiting for the next re-render.
      if (el.closest('.mushaf-sheet')) {
        openModal(buildMushafSheet(store.getState()), {
          labelledBy: 'modal-title-mushaf-sheet',
        });
      } else {
        openModal(buildMushafSettingsPanel(store.getState()), {
          labelledBy: 'modal-title-mushaf-settings',
        });
      }
    },
  },
  {
    sel: '[data-bind="mushaf-font-scale"]',
    run: (ds, el) => {
      store.dispatch(actions.updateMushafPrefs({ fontScale: clampSliderNum(el.value, 0.6, 2.2) }));
    },
  },
  {
    sel: '[data-bind="mushaf-line-spacing"]',
    run: (ds, el) => {
      store.dispatch(
        actions.updateMushafPrefs({ lineSpacing: clampSliderNum(el.value, 0.85, 1.3) })
      );
    },
  },
  {
    sel: '[data-bind="dailyGoal"]',
    run: (ds, el) => {
      store.dispatch(
        actions.updateSettings({ dailyGoal: Math.max(1, parseInt(el.value, 10) || 100) })
      );
    },
  },
  {
    sel: '[data-action="toggle-reminder"]',
    run: (ds, el) => {
      store.dispatch(actions.updateReminder(ds.id, { enabled: el.checked }));
    },
  },
  {
    // Home panel visibility: the checkbox means VISIBLE (unchecked hides).
    sel: '[data-action="home-panel-toggle"]',
    run: (ds, el) => {
      const id = String(ds.id || '');
      const hidden = { ...(store.getState().settings.hiddenHome || {}) };
      if (el.checked) delete hidden[id];
      else hidden[id] = true;
      store.dispatch(actions.updateSettings({ hiddenHome: hidden }));
    },
  },
];

/** input registry (Blueprint D): { sel, run(ds, el, e) }. */
export const inputHandlers = [
  {
    sel: '[data-bind="fontScale"]',
    run: (ds, el) => {
      store.dispatch(actions.updateSettings({ fontScale: parseFloat(el.value) }));
    },
  },
  {
    sel: '[data-bind="arabicFontScale"]',
    run: (ds, el) => {
      store.dispatch(actions.updateSettings({ arabicFontScale: parseFloat(el.value) }));
    },
  },
];
