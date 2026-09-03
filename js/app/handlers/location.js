/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { startCompassIfNeeded } from '../compassRuntime.js';
import { manualLocationFormHTML } from '../forms.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as compass from '../../domain/compass.js';

export const clickHandlers = {
  'prayer-request-location': () => {
    const lang = store.getState().settings.language;
    if (!navigator.geolocation) {
      showToast(t('prayer.locationUnavailable', lang));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        store.dispatch(
          actions.updatePrayerSettings({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locationName: '',
          })
        );
      },
      () => showToast(t('prayer.locationDenied', lang)),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  },

  'prayer-manual-location': () => {
    const lang = store.getState().settings.language;
    const p = store.getState().settings.prayer;
    openModal(manualLocationFormHTML(lang, p), { labelledBy: 'modal-title-location' });
  },

  'qibla-enable-compass': async () => {
    const granted = await compass.requestPermission();
    const lang = store.getState().settings.language;
    if (granted) {
      startCompassIfNeeded();
    } else {
      showToast(t('qibla.permissionDenied', lang));
    }
  },
};
