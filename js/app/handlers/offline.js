/**
 * app/handlers/offline.js — offline-library controls (v5.3.0). Thin
 * click handlers over app/offlineJobs.js; progress + completion live in
 * the store so the view renders reactively.
 */

import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { showToast } from '../../ui/toast.js';
import { runOfflineBatch, stopOfflineBatch, clearTextCache } from '../offlineJobs.js';
import { OFFLINE_GROUP_IDS } from '../../domain/offline.js';

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
};
