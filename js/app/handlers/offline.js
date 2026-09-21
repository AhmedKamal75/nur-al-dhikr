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

  // Storage-mode toggle: flip the encoding pref, drop the old-encoding
  // cache + measured rows (they describe bytes that no longer exist),
  // and say plainly that the next download applies the new mode.
  'offline-toggle-compressed': async (ds, e, target) => {
    const on = target?.checked === true;
    const lang = store.getState().settings.language;
    store.dispatch(actions.updateSettings({ compressedDownloads: on }));
    await clearTextCache();
    store.dispatch(actions.updateSettings({ offline: {} }));
    showToast(t(on ? 'offline.compressedOn' : 'offline.compressedOff', lang));
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
