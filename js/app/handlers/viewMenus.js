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
import { calculateTimes } from '../../domain/prayer.js';
import {
  PRAYER_EXPORT_ORDER,
  buildPrayerICS,
  prayerICSFilename,
  buildMonthTimetable,
  buildMonthICS,
  prayerMonthICSFilename,
} from '../../domain/prayerExport.js';
import {
  totalInLastDays,
  activeDaysInLastDays,
  readingInLastDays,
  buildWeekSummary,
} from '../../domain/statistics.js';
import { openModal, closeModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { dateKey } from '../../core/utils.js';

/** Download a text blob (calendar exports). Same pattern as the daily .ics. */
function downloadTextFile(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
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
  buildMonthModal,
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

  // (v5.2.0) Export today's prayer times as an .ics file for the phone's
  // system calendar. Computed on-device with the same engine + location
  // the Prayer view uses; polar-fallback times are excluded by the builder.
  'prayer-export-ics': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const p = state.settings.prayer;
    if (p.latitude == null || p.longitude == null) {
      showToast(t('prayer.locationNeeded', lang));
      return;
    }
    const now = new Date();
    const times = calculateTimes({
      date: now,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffsetHours: -now.getTimezoneOffset() / 60,
      method: p.method,
      asr: p.asr,
    });
    const names = {};
    for (const n of PRAYER_EXPORT_ORDER) names[n] = t(`prayer.${n}`, lang);
    const ics = buildPrayerICS(times, now, { place: p.locationName || '', names });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = prayerICSFilename(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(t('prayer.exportedIcs', lang));
  },

  // Monthly timetable: modal table for the whole month (prev/next inside
  // the modal), with month .ics download + print.
  'prayer-month-open': () => {
    const now = new Date();
    openModal(buildMonthModal(store.getState(), now.getFullYear(), now.getMonth() + 1), {
      labelledBy: 'modal-title-prayer-month',
    });
  },

  'prayer-month-nav': (ds) => {
    const y = parseInt(ds.y, 10);
    const m = parseInt(ds.m, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return;
    openModal(buildMonthModal(store.getState(), y, m), { labelledBy: 'modal-title-prayer-month' });
  },

  'prayer-month-ics': (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    const p = state.settings.prayer;
    const y = parseInt(ds.y, 10);
    const m = parseInt(ds.m, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return;
    if (p.latitude == null || p.longitude == null) {
      showToast(t('prayer.locationNeeded', lang));
      return;
    }
    const table = buildMonthTimetable({
      year: y,
      month: m,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffsetHours: -new Date(y, m - 1, 1).getTimezoneOffset() / 60,
      method: p.method,
      asr: p.asr,
    });
    const names = {};
    for (const n of PRAYER_EXPORT_ORDER) names[n] = t(`prayer.${n}`, lang);
    const ics = buildMonthICS(table, { place: p.locationName || '', names });
    downloadTextFile(ics, prayerMonthICSFilename(y, m), 'text/calendar;charset=utf-8');
    showToast(t('prayer.exportedIcs', lang));
  },

  'prayer-month-print': () => {
    // Print ONLY the timetable: a body flag flips the print stylesheet to
    // show the open modal instead of the page (removed right after).
    try {
      document.body.classList.add('print-timetable');
      const done = () => document.body.classList.remove('print-timetable');
      window.addEventListener('afterprint', done, { once: true });
      setTimeout(done, 5000);
      window.print();
    } catch {
      document.body.classList.remove('print-timetable');
    }
  },

  // Weekly share: the last 7 days as plain localized lines — Web Share
  // with files when possible, clipboard when not (same fallback ladder as
  // hadith-share). Numbers come from the same helpers the Statistics view
  // renders, so shared figures never disagree with the screen.
  'statistics-share-week': async () => {
    const state = store.getState();
    const lang = state.settings.language;
    const stats = state.statistics;
    const text = buildWeekSummary(
      {
        recitations: totalInLastDays(stats, 7),
        activeDays: activeDaysInLastDays(stats, 7),
        readingMin: Math.round(readingInLastDays(stats, 7) / 60),
        streak: stats.currentStreak || 0,
      },
      {
        title: t('stats.shareTitle', lang),
        recitations: t('stats.totalRecitations', lang),
        days: t('stats.activeDays', lang),
        reading: t('stats.readingToday', lang),
        streak: t('stats.currentStreak', lang),
      }
    );
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast(t('card.copied', lang));
      }
    } catch {
      /* user dismissed the share sheet — not an error */
    }
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
