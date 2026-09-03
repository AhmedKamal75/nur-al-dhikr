/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { rt } from '../../app/rt.js';
import { render } from '../renderer.js';
import { armPrayerTriggers } from '../triggers.js';
import { t } from '../../core/i18n.js';

import { actions, store } from '../../core/state.js';
import { dateKey, vibrate } from '../../core/utils.js';
import { toHijri } from '../../domain/calendar.js';
import { markCelebration } from '../../domain/celebrate.js';
import { nextRemindTime } from '../../domain/fasting.js';
import { ramadanKhatmaPreset } from '../../domain/khatma.js';
import { dayComplete } from '../../domain/prayerLog.js';
import { previewAlert, refreshCustomAdhanFlags, stopAdhan } from '../../services/prayerSound.js';
import { buildDayDetail, buildNoteForm } from '../../ui/calendarModals.js';
import { buildTextPrompt } from '../../ui/menus.js';
import { closeModal, isModalOpen, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { buildRamadanSheet } from '../../views/viewSheets.js';

import * as notifications from '../../services/notifications.js';
const { requestPermission } = notifications;

/** (v4.3) Hijri info for a dateKey, computed here in the app layer so
 *  ui/calendarModals.js stays free of domain imports. */
function hijriForDateKey(dateKeyStr) {
  try {
    return toHijri(new Date(dateKeyStr + 'T00:00:00'));
  } catch {
    return null;
  }
}

export const clickHandlers = {
  'fasting-toggle-category': (ds) => {
    store.dispatch(actions.fastingToggleCategory(ds.cat));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'fasting-toggle-remind': (ds) => {
    store.dispatch(actions.fastingToggleRemind(ds.cat));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'fasting-cycle-remind-time': () => {
    const cur = store.getState().fastingPrefs.remindTime;
    store.dispatch(actions.fastingSetRemindTime(nextRemindTime(cur)));
  },

  // v3.19 quick-log sadaqah — one tap logs a timestamped entry; undo
  // removes the newest of today's entries from the combined card.
  'sadaqah-log': () => {
    store.dispatch(actions.logSadaqah(''));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'sadaqah-remove': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.removeSadaqah(ds.id));
  },

  // v3.25 gentle nudge — dismissal hides the card for the session and
  // records today as shown; the 7-day quiet-stretch spacing (never the
  // dismissal) governs any future showing. No haptic, no ceremony: letting
  // go quietly IS the feature.
  'nudge-dismiss': () => {
    store.dispatch(actions.dismissNudge());
  },

  'calendar-open-day': (ds) => {
    openModal(buildDayDetail(ds.date, store.getState(), hijriForDateKey(ds.date)), {
      labelledBy: 'modal-title-day',
    });
  },

  'calendar-new-note': (ds) => {
    const lang = store.getState().settings.language;
    openModal(buildNoteForm(ds.date, null, lang), { labelledBy: 'modal-title-note' });
  },

  'calendar-edit-note': (ds) => {
    const lang = store.getState().settings.language;
    const note = store.getState().calendarNotes.find((n) => n.id === ds.id);
    if (!note) return;
    openModal(buildNoteForm(ds.date || note.startDate, note, lang), {
      labelledBy: 'modal-title-note',
    });
  },

  'calendar-delete-note': (ds) => {
    store.dispatch(actions.deleteCalendarNote(ds.id));
    closeModal();
  },

  'toggle-prayer-alert': (ds) => {
    const current = store.getState().settings.prayer.alerts || {};
    store.dispatch(
      actions.updatePrayerSettings({ alerts: { ...current, [ds.prayer]: !current[ds.prayer] } })
    );
  },

  // v3.20: the reliability status row offers a one-tap permission ask.
  'prayer-enable-notifications': async () => {
    const lang = store.getState().settings.language;
    const perm = await requestPermission();
    showToast(t(perm === 'granted' ? 'prayer.notifGranted' : 'prayer.notifDenied', lang));
    armPrayerTriggers(true);
  },

  'prayer-log-cycle': (ds) => {
    const state = store.getState();
    const todayKey = dateKey(new Date());
    const wasComplete = dayComplete(state.dailyChecklist[todayKey]);
    store.dispatch(actions.cyclePrayerLog(ds.prayer));
    const nowComplete = dayComplete(store.getState().dailyChecklist[todayKey]);
    // v3.14 Phase C: haptic parity with the checklist toggle — a log tap
    // should be felt, not just seen. Kept AFTER the dispatch so the
    // vibration never lands on a rejected action.
    if (store.getState().settings.hapticsEnabled) vibrate(8);
    // Celebrate the moment the fifth prayer lands — once per day, not on
    // every later cycle (complete → complete never re-fires).
    if (nowComplete && !wasComplete) {
      markCelebration('plog-day');
      showToast(t('plog.allLoggedToast', state.settings.language), { duration: 3200 });
    }
  },

  'khatma-ramadan-preset': () => {
    const lang = store.getState().settings.language;
    const preset = ramadanKhatmaPreset(new Date());
    const set = (id, v) => {
      const input = document.getElementById(id);
      if (input) input.value = v;
    };
    set('khatma-start-date', preset.startDate);
    set('khatma-target-date', preset.targetDate);
    set('khatma-daily-target', String(preset.dailyTarget));
    showToast(t('khatma.presetFilled', lang), { duration: 3200 });
  },

  'stats-heatmap-shift': (ds) => {
    const now = new Date();
    const baseRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    store.dispatch(actions.shiftStatsHeatmapMonth(parseInt(ds.delta, 10) || 0, baseRef));
  },

  'onboarding-dismiss': () => {
    store.dispatch(actions.dismissOnboarding());
  },

  'onboarding-install': async () => {
    if (!rt.deferredInstallPrompt) return;
    const prompt = rt.deferredInstallPrompt;
    rt.deferredInstallPrompt = null;
    store.dispatch(actions.installPromptClear());
    try {
      await prompt.prompt();
      // userChoice resolves after the person answers the browser dialog;
      // 'appinstalled' (wired above) flips the done flag on acceptance.
      await prompt.userChoice?.catch?.(() => {});
    } catch {
      /* the browser may refuse the second prompt — nothing to do */
    }
  },

  'prayer-test-sound': () => {
    // v3.8: previews EXACTLY what a real prayer alert would do right now
    // (adhan source chain or the chosen tone), Fajr-flavored to show the
    // Fajr variant when one exists.
    previewAlert(store.getState().settings.prayer, { fajr: true });
  },

  'prayer-set-alert-mode': (ds) => {
    if (!['adhan', 'tone', 'off'].includes(ds.mode)) return;
    stopAdhan(); // switching modes must never leave a half-playing file
    store.dispatch(actions.updatePrayerSettings({ adhanMode: ds.mode }));
  },

  'prayer-adhan-import': (ds) => {
    const kind = ds.kind === 'fajr' ? 'fajr' : 'standard';
    const input = document.getElementById('adhan-file-input');
    if (!input) return;
    input.dataset.kind = kind;
    input.value = ''; // allow re-selecting the same file
    input.click();
  },

  'prayer-adhan-clear': async (ds) => {
    const kind = ds.kind === 'fajr' ? 'fajr' : 'standard';
    const lang = store.getState().settings.language;
    try {
      // Relative to js/app/handlers/ — the module lives in services/.
      const { deleteAdhanAudio } = await import('../../services/audioStore.js');
      await deleteAdhanAudio(kind);
      await refreshCustomAdhanFlags();
      showToast(t('prayer.adhanCleared', lang));
      render(store.getState());
    } catch (err) {
      console.error('[prayer-adhan-clear]', err);
      showToast(t('common.error', lang));
    }
  },

  /* ---------------- Ramadan companion ---------------- */

  'ramadan-toggle-fast': (ds) => {
    store.dispatch(actions.toggleRamadanFast(ds.logKey, ds.day));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'toggle-ramadan-alert': (ds) => {
    const current = store.getState().settings.prayer.ramadanAlerts || {
      suhoor: false,
      iftar: false,
      suhoorOffset: 30,
    };
    store.dispatch(
      actions.updatePrayerSettings({
        ramadanAlerts: { ...current, [ds.alert]: !current[ds.alert] },
      })
    );
    // (v5.1.0) The "some things are not working" report: the toggle row in
    // the Ramadan "⋯" sheet dispatched correctly, but the sheet's HTML is
    // a static snapshot — the switch never moved, so the control LOOKED
    // dead (and the person couldn't tell the alert armed). When the row
    // was tapped inside the sheet, rebuild it in place; when the twin row
    // on the Ramadan page (in-season alerts panel) is tapped, the normal
    // view re-render already reflects the change.
    if (isModalOpen()) {
      openModal(buildRamadanSheet(store.getState()), {
        labelledBy: 'modal-title-view-sheet',
      });
    }
  },

  'ramadan-enable-notifications': async () => {
    const lang = store.getState().settings.language;
    const perm = await requestPermission();
    showToast(
      t(perm === 'granted' ? 'ramadan.notificationsGranted' : 'ramadan.notificationsDenied', lang)
    );
    if (perm === 'granted') store.dispatch(actions.updateSettings({})); // force re-render of the permission banner
  },

  /* ---------------- (v4.4) Sunnah prayer tracker ----------------
   * 'sunnah-toggle' and 'toggle-traveler-mode' live on checkbox inputs,
   * so they are routed through the CHANGE pipeline in events.js (same as
   * checklist-toggle) — the click delegation's preventDefault would cancel
   * the checkbox state. */

  /* ---------------- (v4.4) Qada' (make-up) tracker ---------------- */

  'qada-add': (ds) => {
    const prayerSel = document.querySelector('[data-bind="qada-prayer"]');
    const countInput = document.querySelector('[data-bind="qada-count"]');
    const prayer = (ds.prayer || prayerSel?.value || '').trim();
    const n = Math.max(1, Math.min(50, parseInt(countInput?.value, 10) || 1));
    if (!prayer) return;
    store.dispatch(actions.qadaAdd(prayer, n));
    const lang = store.getState().settings.language;
    showToast(t('qada.added', lang, { n }));
    if (countInput) countInput.value = '1';
  },

  'qada-complete': (ds) => {
    if (!ds.prayer) return;
    store.dispatch(actions.qadaComplete(ds.prayer));
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
    showToast(t('qada.doneOne', store.getState().settings.language));
  },

  'qada-clear-prayer': (ds) => {
    if (!ds.prayer) return;
    store.dispatch(actions.qadaRemoveAll(ds.prayer));
    showToast(t('qada.cleared', store.getState().settings.language, { prayer: ds.prayer }));
  },

  /* ---------------- (v4.4) Location profiles ---------------- */

  'location-profile-save': (ds) => {
    const name = (ds.name || '').trim();
    const lang = store.getState().settings.language;
    if (!name) {
      // Custom name: a small text prompt (the same shared builder the
      // collection/bookmark-folder names use — one prompt idiom app-wide).
      openModal(
        buildTextPrompt({
          title: t('profiles.namePrompt', lang),
          placeholder: t('profiles.namePlaceholder', lang),
          confirmAction: 'submit-new-location-profile',
          lang,
        }),
        { labelledBy: 'modal-title-prompt' }
      );
      return;
    }
    store.dispatch(actions.saveLocationProfile(name));
    showToast(t('profiles.saved', store.getState().settings.language, { name }));
  },

  'location-profile-apply': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.applyLocationProfile(ds.id));
    armPrayerTriggers(true); // the schedule changed — re-arm today's alerts
    const applied = store.getState().locationProfiles.find((p) => p.id === ds.id);
    showToast(
      t('profiles.applied', store.getState().settings.language, { name: applied?.name || '' })
    );
  },

  'location-profile-remove': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.removeLocationProfile(ds.id));
  },
};
