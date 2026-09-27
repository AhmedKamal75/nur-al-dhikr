/**
 * app/handlers/offline.js — offline-library controls (v5.3.0). Thin
 * click handlers over app/offlineJobs.js; progress + completion live in
 * the store so the view renders reactively.
 */

import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { showToast } from '../../ui/toast.js';
import {
  runOfflineBatch,
  stopOfflineBatch,
  clearTextCache,
  clearStudyData,
  maybeAutoDownloadEssentials,
} from '../offlineJobs.js';
import { OFFLINE_GROUP_IDS } from '../../domain/offline.js';
import { applyAudioCacheCapFromSettings, enforceAudioCacheCap } from '../../services/audioStore.js';

export const clickHandlers = {
  'offline-download-all': () => {
    runOfflineBatch([...OFFLINE_GROUP_IDS]);
  },

  'offline-download-group': (ds) => {
    const id = String(ds.group || '');
    if (OFFLINE_GROUP_IDS.includes(id)) runOfflineBatch([id]);
  },

  'offline-stop': () => {
    stopOfflineBatch();
  },

  // (v5.17.2, audit F-04) explicit "clear downloaded study data" budget:
  // text corpora only — audio and settings survive.
  'offline-clear-study': async () => {
    const lang = store.getState().settings.language;
    await clearStudyData();
    showToast(t('offline.clearStudyDone', lang));
  },
};

export const changeHandlers = [
  {
    // (v5.17.17) BOTH storage switches live here, not in clickHandlers, and
    // that placement is the whole bug. The delegated click listener calls
    // e.preventDefault() before dispatching (events.js:529) so links and
    // buttons behave — but on a checkbox preventDefault CANCELS the native
    // state toggle. The handler then read target.checked BEFORE the toggle,
    // dispatched it straight back, and the switch sat there doing nothing.
    // Shipped broken: "Store downloads compressed" never worked. A checkbox
    // belongs to the change pipeline, which reads el.checked after the fact.
    sel: '[data-action="offline-toggle-compressed"]',
    run: async (ds, el) => {
      const on = el.checked === true;
      const lang = store.getState().settings.language;
      store.dispatch(actions.updateSettings({ compressedDownloads: on }));
      await clearTextCache();
      store.dispatch(actions.updateSettings({ offline: {} }));
      showToast(t(on ? 'offline.compressedOn' : 'offline.compressedOff', lang));
    },
  },
  {
    // Opt out of the automatic essentials download. Turning it back on
    // starts the batch immediately — a reader who re-enables it should not
    // wait a whole boot cycle for nothing to happen.
    sel: '[data-action="offline-toggle-essentials-auto"]',
    run: async (ds, el) => {
      const on = el.checked === true;
      const lang = store.getState().settings.language;
      store.dispatch(actions.updateSettings({ offlineEssentialsAuto: on }));
      if (!on) {
        showToast(t('offline.essentialsOff', lang));
        return;
      }
      const outcome = maybeAutoDownloadEssentials();
      // 'complete' or a live batch means there is nothing left to fetch, so
      // saying "automatic download is off" here would be a lie.
      if (outcome !== 'started') showToast(t('offline.essentialsAlready', lang));
    },
  },
  {
    // (v5.14.0, V10b) audio-budget slider (50–500 MiB): persist, apply to
    // the live IDB cap, and evict down to it — never silently over budget.
    sel: '[data-bind="audio-cache-limit"]',
    run: (ds, el) => {
      const v = Math.min(500, Math.max(50, Math.round(Number(el.value) || 200)));
      store.dispatch(actions.setAudioPrefs({ audioCacheMB: v }));
      try {
        applyAudioCacheCapFromSettings(store.getState().settings);
        enforceAudioCacheCap();
      } catch {
        /* cap applies on next save; the pref already landed */
      }
    },
  },
];
