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
            // (v5.2.77, UP-03) keep the fix accuracy so Qibla can show an
            // honest ±m badge; sanitizer clamps junk to null.
            locationAccuracy:
              Number.isFinite(pos.coords.accuracy) && pos.coords.accuracy >= 0
                ? Math.round(pos.coords.accuracy)
                : null,
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

  // (v5.14.0, V2) one-tap city preset: city-center coordinates, honest
  // approximate. Manual entry + GPS remain; this only unlocks the times.
  'prayer-use-city': (ds) => {
    const lang = store.getState().settings.language;
    const lat = Number(ds.lat);
    const lng = Number(ds.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) return;
    if (lng < -180 || lng > 180) return;
    store.dispatch(
      actions.updatePrayerSettings({
        latitude: lat,
        longitude: lng,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locationName: String(ds.name || '').slice(0, 80),
        locationAccuracy: null,
      })
    );
    showToast(t('prayer.locationSet', lang));
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

/** change registry (Blueprint D): { sel, run(ds, el, e) }. No arms: the
 *  traveler toggle rides the view-sheet switch (`view-toggle-traveler` in
 *  handlers/viewMenus.js) — the checkbox arm died with travelerPanelHTML
 *  (v5.15.0 kill) and is kept empty so the registry shape stays stable. */
export const changeHandlers = [];
