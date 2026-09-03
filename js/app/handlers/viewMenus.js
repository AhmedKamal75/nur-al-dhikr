/**
 * app/handlers/viewMenus.js (v4.6.0)
 * The per-view "⋯" menus: one 'view-menu' entry point that opens the right
 * sheet for the current tab, plus the handful of sheet behaviors that had
 * no handler of their own (opening the Prayer sub-panels as modals,
 * resetting the library's hidden/ordered state, clearing today's
 * checklist, the garden explainer). Everything else a sheet row does
 * already had a handler — those rows just point at it.
 */

import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { openModal, closeModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { dateKey } from '../../core/utils.js';
import {
  buildLibrarySheet,
  buildCategorySheet,
  buildHadithSheet,
  buildHadithBookSheet,
  buildPrayerSheet,
  buildQiblaSheet,
  buildRamadanSheet,
  buildCalendarSheet,
  buildChecklistSheet,
  buildTasbihSheet,
  buildZakatSheet,
  buildStatisticsSheet,
  buildGardenSheet,
  buildGardenHowSheet,
  buildEditorSheet,
  buildFieldTogglesSheet,
  buildScheduleManagerSheet,
} from '../../views/viewSheets.js';
import {
  sunnahPanelHTML,
  qadaPanelHTML,
  adhanPanelHTML,
  calcPanelHTML,
  profilesPanelHTML,
} from '../../views/prayer.js';

const SHEET_BUILDERS = {
  library: buildLibrarySheet,
  category: buildCategorySheet,
  'hadith-grid': buildHadithSheet,
  'hadith-book': buildHadithBookSheet,
  prayer: buildPrayerSheet,
  qibla: buildQiblaSheet,
  ramadan: buildRamadanSheet,
  calendar: buildCalendarSheet,
  checklist: buildChecklistSheet,
  tasbih: buildTasbihSheet,
  zakat: buildZakatSheet,
  statistics: buildStatisticsSheet,
  garden: buildGardenSheet,
  editor: buildEditorSheet,
};

export const clickHandlers = {
  'view-menu': (ds) => {
    const builder = SHEET_BUILDERS[ds.menu];
    if (!builder) return;
    openModal(builder(store.getState()), { labelledBy: 'modal-title-view-sheet' });
  },

  /* Sheets that re-open themselves after a state change keep their focus
     position; these modal-opening rows are the "deeper" layers. */
  'view-sheet-manage': () => {
    store.dispatch(actions.contentManageToggle());
    closeModal();
  },

  'library-sheet-reset-hidden': () => {
    store.dispatch(actions.updateSettings({ contentPrefs: {} }));
    const lang = store.getState().settings.language;
    closeModal();
    showToast(t('library.sheet.resetHiddenDone', lang));
  },

  /* (v5.0.0) Banner-level field visibility + the schedule manager. */
  'library-field-toggles': (ds) => {
    openModal(buildFieldTogglesSheet(store.getState(), ds.libraryId), {
      labelledBy: 'modal-title-view-sheet',
    });
  },

  'schedule-open-manager': () => {
    openModal(buildScheduleManagerSheet(store.getState()), {
      labelledBy: 'modal-title-view-sheet',
    });
  },

  /* ---- Prayer sub-panels (extracted from the old stacked page) ---- */

  'prayer-open-sunnah': () => {
    openModal(sunnahPanelHTML(store.getState()), { labelledBy: 'panel-sunnah-title' });
  },

  'prayer-open-qada': () => {
    openModal(qadaPanelHTML(store.getState()), { labelledBy: 'panel-qada-title' });
  },

  'prayer-open-adhan': () => {
    openModal(adhanPanelHTML(store.getState()), { labelledBy: 'panel-adhan-title' });
  },

  'prayer-open-calc': () => {
    openModal(calcPanelHTML(store.getState()), { labelledBy: 'panel-calc-title' });
  },

  'prayer-open-location': () => {
    openModal(profilesPanelHTML(store.getState()), { labelledBy: 'panel-profiles-title' });
  },

  'view-toggle-traveler': () => {
    const next = !(store.getState().settings.prayer.travelerMode === true);
    store.dispatch(actions.updatePrayerSettings({ travelerMode: next }));
    showToast(
      t(next ? 'traveler.enabled' : 'traveler.disabled', store.getState().settings.language)
    );
    openModal(buildPrayerSheet(store.getState()), { labelledBy: 'modal-title-view-sheet' });
  },

  /* ---- Checklist ---- */

  'checklist-reset-day': () => {
    const today = dateKey(new Date());
    store.dispatch(actions.resetChecklistDay(today));
    const lang = store.getState().settings.language;
    closeModal();
    showToast(t('checklist.sheet.resetDone', lang));
  },

  /* ---- Garden ---- */

  'garden-how-it-works': () => {
    openModal(buildGardenHowSheet(store.getState()), { labelledBy: 'modal-title-garden-how' });
  },

  /* ---- Hadith book link sharing ---- */

  'hadith-copy-book': async (ds) => {
    const lang = store.getState().settings.language;
    const url = new URL(window.location.href);
    url.hash = `#/hadith/${ds.bookId || ''}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast(t('hadith.bookLinkCopied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },
};
