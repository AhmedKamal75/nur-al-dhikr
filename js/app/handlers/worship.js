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
import { monthWindow, intensityBucket } from '../../domain/statistics.js';
import { OFFSET_PRAYERS } from '../../domain/prayer.js';
import { dayComplete, prayerState } from '../../domain/prayerLog.js';
import { CONFIRM_STEPS } from '../../domain/onboarding.js';
import { yieldFullSurahPlayer } from '../audioEngine.js';
import {
  previewAlert,
  refreshCustomAdhanFlags,
  stopAdhan,
  playSound,
} from '../../services/prayerSound.js';
import { buildDayDetail, buildNoteForm, BOUNDED_RECURRENCE } from '../../ui/calendarModals.js';
import { notesForDate } from '../../services/calendarNotes.js';
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
  // (UX-6) the calendar sheet's fasting row: close the sheet, then jump
  // to the fasting panel on the page beneath (settings-toc-go pattern —
  // a plain #anchor would be parsed as a route).
  'calendar-goto-fasting': () => {
    closeModal();
    const el = document.getElementById('calendar-fasting');
    if (!el) return;
    const reduce = !!store.getState().settings.reduceMotion;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  },

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

  // (v5.2.29) amount/note editor + recent-gifts history (the recorded
  // v3.19 follow-up). Removing inside the modal rebuilds it in place —
  // same pattern as the Ramadan sheet toggle above.
  'sadaqah-open-editor': async () => {
    const { buildSadaqahEditor } = await import('../../views/home.js');
    openModal(buildSadaqahEditor(store.getState()), { labelledBy: 'modal-title-sadaqah' });
  },

  'sadaqah-remove': async (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.removeSadaqah(ds.id));
    if (isModalOpen()) {
      const { buildSadaqahEditor } = await import('../../views/home.js');
      openModal(buildSadaqahEditor(store.getState()), { labelledBy: 'modal-title-sadaqah' });
    }
  },

  // v3.25 gentle nudge — dismissal hides the card for the session and
  // records today as shown; the 7-day quiet-stretch spacing (never the
  // dismissal) governs any future showing. No haptic, no ceremony: letting
  // go quietly IS the feature.
  'nudge-dismiss': () => {
    store.dispatch(actions.dismissNudge());
  },

  'calendar-open-day': (ds) => {
    const st = store.getState();
    openModal(
      buildDayDetail(
        ds.date,
        st,
        hijriForDateKey(ds.date),
        notesForDate(st.calendarNotes, ds.date)
      ),
      {
        labelledBy: 'modal-title-day',
      }
    );
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
    const wasLogged = prayerState(state.dailyChecklist[todayKey], ds.prayer) != null;
    store.dispatch(actions.cyclePrayerLog(ds.prayer));
    const after = store.getState().dailyChecklist[todayKey];
    const nowComplete = dayComplete(after);
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
    // (v5.2.75, UP-13) un-logging a logged prayer means it was missed:
    // offer qada once, right there — a single tap logs one make-up.
    if (wasLogged && prayerState(after, ds.prayer) == null) {
      const lang = state.settings.language;
      const prayerName = t(`prayer.${ds.prayer}`, lang);
      showToast(t('qada.offerMissed', lang, { prayer: prayerName }), {
        duration: 6000,
        actionLabel: t('qada.offerAdd', lang),
        onAction: () => {
          store.dispatch(actions.qadaAdd(ds.prayer, 1));
          showToast(t('qada.added', store.getState().settings.language, { n: 1 }));
        },
      });
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

  // (v5.6.0, B-5) heatmap PNG export: redraws the focused month grid on
  // an offscreen canvas and downloads it — fully offline (no network,
  // no library), colors sampled from the live DOM so the export matches
  // the active theme, with a static fallback palette when sampled
  // colors are unavailable (e.g. export from a background tab).
  'stats-heatmap-export': () => {
    const state = store.getState();
    const lang = state.settings.language;
    const now = new Date();
    const ref =
      state.statsHeatmapRef ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [ry, rm] = ref.split('-').map(Number);
    if (!(ry >= 2000 && ry <= 2100 && rm >= 1 && rm <= 12)) return;
    const focusDate = new Date(ry, rm - 1, 1);
    const stats = state.statistics || { dailyHistory: {} };
    const cells = monthWindow(stats, focusDate);
    const counts = cells.filter(Boolean).map((c) => c.count);
    const max = Math.max(1, ...counts);
    const total = counts.reduce((a, b) => a + b, 0);
    const sample = (bucket) => {
      try {
        const el = document.querySelector(`.heatmap__cell--${bucket}`);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, fg: cs.color };
      } catch {
        return null;
      }
    };
    const FALLBACK_BG = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    const FALLBACK_FG = '#1a1a1a';
    const styleOf = (bucket) => {
      const s = sample(bucket);
      return {
        bg: s?.bg && s.bg !== 'rgba(0, 0, 0, 0)' ? s.bg : FALLBACK_BG[bucket] || FALLBACK_BG[0],
        fg: s?.fg ? s.fg : FALLBACK_FG,
      };
    };
    const CELL = 44;
    const GAP = 6;
    const PAD = 28;
    const rows = Math.ceil(cells.length / 7);
    const W = PAD * 2 + 7 * CELL + 6 * GAP;
    const H = PAD * 2 + 44 + 30 + rows * CELL + (rows - 1) * GAP + 30;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let appBg = '#ffffff';
    try {
      appBg = getComputedStyle(document.body).backgroundColor || appBg;
    } catch {
      /* fallback stands */
    }
    ctx.fillStyle = appBg;
    ctx.fillRect(0, 0, W, H);
    const monthLabel = focusDate.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
    ctx.fillStyle = styleOf(4).fg;
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = lang === 'ar' ? 'right' : 'left';
    ctx.fillText(monthLabel, lang === 'ar' ? W - PAD : PAD, PAD + 22);
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillText(
      `${t('stats.monthTotalLabel', lang)}: ${total}`,
      lang === 'ar' ? W - PAD : PAD,
      PAD + 44
    );
    const gx = PAD;
    const gy = PAD + 44 + 30;
    cells.forEach((c, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = gx + col * (CELL + GAP);
      const y = gy + row * (CELL + GAP);
      if (!c) return;
      const bucket = intensityBucket(c.count, max);
      const st = styleOf(bucket);
      ctx.fillStyle = st.bg;
      ctx.beginPath();
      // roundRect is Chromium 99+/Safari 16+; fillRect keeps older
      // devices exporting instead of throwing mid-draw.
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, CELL, CELL, 8);
      } else {
        ctx.rect(x, y, CELL, CELL);
      }
      ctx.fill();
      ctx.fillStyle = st.fg;
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(c.date.getDate()), x + CELL / 2, y + CELL / 2 + 5);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dhikr-heatmap-${ref}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast(t('stats.heatmapSaved', lang));
    }, 'image/png');
  },

  'onboarding-dismiss': () => {
    store.dispatch(actions.dismissOnboarding());
  },

  // (v5.2.52) wizard navigation + setup confirms + notification priming.
  // Position is ephemeral (state.ui.onboardingStep, null = first
  // incomplete); confirms persist seen-flags and release the position so
  // the wizard follows the new first-incomplete step.
  'onboarding-step': (ds) => {
    const idx = Math.floor(Number(ds.idx));
    store.dispatch(actions.setOnboardingStep(Number.isFinite(idx) && idx >= 0 ? idx : null));
  },

  'onboarding-confirm': (ds) => {
    if (!CONFIRM_STEPS.includes(ds.step)) return;
    store.batch(() => {
      store.dispatch(actions.markOnboardingStepSeen(ds.step));
      store.dispatch(actions.setOnboardingStep(null));
    });
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
  },

  'notifications-enable': async () => {
    const lang = store.getState().settings.language;
    const res = await requestPermission();
    if (res === 'granted') showToast(t('prayer.notifGranted', lang));
    else if (res === 'denied') showToast(t('ramadan.alertsDenied', lang));
    // Re-render so the wizard step flips to done/blocked immediately.
    store.dispatch(actions.updateSettings({}));
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
    // (v5.2.67) one voice: the preview takes the speaker over a playing
    // surah instead of layering on top of it.
    yieldFullSurahPlayer();
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

  // (v5.2.27) Ramadan planner: taraweeh / i'tikaf / last-ten-night dots.
  // Clamped at the handler edge like the fasting toggle's dataset values —
  // a forged data-slice/key/day no-ops in the reducer instead of writing.
  'ramadan-planner-toggle': (ds) => {
    const allowed = ['taraweehLog', 'itikafLog', 'lastTenLog'];
    if (!allowed.includes(ds.slice)) return;
    if (!/^\d{4,5}-\d{1,2}$/.test(String(ds.key || ''))) return;
    const day = parseInt(ds.day, 10);
    if (!Number.isInteger(day) || day < 1 || day > 30) return;
    store.dispatch(actions.ramadanPlannerToggle(ds.slice, ds.key, String(day)));
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

/** change registry (Blueprint D): { sel, run(ds, el, e) }. */
export const changeHandlers = [
  {
    sel: '[data-bind="ramadan-suhoor-offset"]',
    run: (ds, el) => {
      const current = store.getState().settings.prayer.ramadanAlerts || {};
      const mins = parseInt(el.value, 10) || 30;
      store.dispatch(
        actions.updatePrayerSettings({ ramadanAlerts: { ...current, suhoorOffset: mins } })
      );
    },
  },
  {
    sel: '[data-action="checklist-toggle"]',
    run: (ds, el) => {
      store.dispatch(actions.toggleChecklistItem(ds.item));
      const state = store.getState();
      if (state.settings.hapticsEnabled) vibrate(el.checked ? 10 : 6);
    },
  },
  {
    // Sunnah tracker rows — checkbox change pipeline, same pattern as
    // checklist-toggle (the click delegation would preventDefault the
    // checkbox state away).
    sel: '[data-action="sunnah-toggle"]',
    run: (ds, el) => {
      store.dispatch(actions.toggleSunnah(ds.id));
      const state = store.getState();
      if (state.settings.hapticsEnabled) vibrate(el.checked ? 10 : 6);
    },
  },
  {
    sel: '[data-bind="prayer-method"]',
    run: (ds, el) => {
      store.dispatch(actions.updatePrayerSettings({ method: el.value }));
    },
  },
  {
    sel: '[data-bind="prayer-asr"]',
    run: (ds, el) => {
      store.dispatch(actions.updatePrayerSettings({ asr: el.value }));
    },
  },
  // (v5.2.75, UP-06) manual minute offsets: clamped ±60 ints, zeros
  // dropped so the persisted blob stays lean (sanitizer re-clamps).
  {
    sel: '[data-bind="prayer-offset"]',
    run: (ds, el) => {
      if (!OFFSET_PRAYERS.includes(ds.prayer)) return;
      const v = Math.max(-60, Math.min(60, Math.floor(Number(el.value)) || 0));
      const offsets = { ...(store.getState().settings.prayer.offsets || {}) };
      if (v === 0) delete offsets[ds.prayer];
      else offsets[ds.prayer] = v;
      store.dispatch(actions.updatePrayerSettings({ offsets }));
    },
  },
  {
    sel: '[data-bind="prayer-alert-sound"]',
    run: (ds, el) => {
      store.dispatch(actions.updatePrayerSettings({ alertSound: el.value }));
      playSound(el.value);
    },
  },
  {
    sel: '[data-bind="prayer-adhan-volume"]',
    run: (ds, el) => {
      const v = Math.min(100, Math.max(0, parseInt(el.value, 10) || 0));
      store.dispatch(actions.updatePrayerSettings({ adhanVolume: v }));
    },
  },
  {
    sel: '[data-bind="prayer-quiet-start"]',
    run: (ds, el) => {
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(el.value))
        store.dispatch(actions.updatePrayerSettings({ quietStart: el.value }));
    },
  },
  {
    sel: '[data-bind="prayer-quiet-end"]',
    run: (ds, el) => {
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(el.value))
        store.dispatch(actions.updatePrayerSettings({ quietEnd: el.value }));
    },
  },
  {
    sel: '[data-bind="prayer-quiet-volume"]',
    run: (ds, el) => {
      const v = Math.min(100, Math.max(0, parseInt(el.value, 10) || 0));
      store.dispatch(actions.updatePrayerSettings({ quietVolume: v }));
    },
  },
  {
    sel: '[data-action="toggle-prayer-quiet"]',
    run: (ds, el) => {
      store.dispatch(actions.updatePrayerSettings({ quietEnabled: el.checked }));
    },
  },
  {
    sel: '[data-action="toggle-prayer-quiet-cancel"]',
    run: (ds, el) => {
      store.dispatch(actions.updatePrayerSettings({ quietCancels: el.checked }));
    },
  },
  {
    sel: '[data-bind="note-recurrence"]',
    run: (ds, el) => {
      const form = el.closest('form');
      form.querySelectorAll('[data-recurrence-group]').forEach((group) => {
        const key = group.dataset.recurrenceGroup;
        // (v5.2.55) five capped types share the `bounded` end-date group.
        group.hidden =
          key === 'bounded' ? !BOUNDED_RECURRENCE.includes(el.value) : key !== el.value;
      });
    },
  },
  {
    sel: '[data-bind="note-reminder-toggle"]',
    run: (ds, el) => {
      const form = el.closest('form');
      const group = form.querySelector('[data-reminder-group]');
      if (group) group.hidden = !el.checked;
    },
  },
];
