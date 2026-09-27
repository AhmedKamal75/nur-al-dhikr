/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { startCompassIfNeeded } from '../compassRuntime.js';
import { locationPermissionGuidanceHTML, manualLocationFormHTML } from '../forms.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as compass from '../../domain/compass.js';
import { CITY_PRESETS } from '../../domain/locations.js';

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
      () => {
        openModal(locationPermissionGuidanceHTML(lang), {
          labelledBy: 'modal-title-location-help',
        });
      },
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
    const cityId = String(ds.cityId || '');
    const preset = cityId ? CITY_PRESETS.find((city) => city.id === cityId) : null;
    if (cityId && !preset) return;
    const lat = preset ? preset.lat : Number(ds.lat);
    const lng = preset ? preset.lng : Number(ds.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) return;
    if (lng < -180 || lng > 180) return;
    store.dispatch(
      actions.updatePrayerSettings({
        latitude: lat,
        longitude: lng,
        timezone: preset?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        locationName: (preset
          ? lang === 'ar'
            ? preset.ar
            : preset.en
          : String(ds.name || '')
        ).slice(0, 80),
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

export const changeHandlers = [
  {
    sel: 'select[name="cityPreset"]',
    run: (_ds, element) => {
      const form = element.closest?.('form');
      if (!form) return;
      const city = CITY_PRESETS.find((entry) => entry.id === element.value);
      if (!city) return;
      const lang = store.getState().settings.language;
      const set = (name, value) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (field) field.value = value;
      };
      set('latitude', String(city.lat));
      set('longitude', String(city.lng));
      set('locationName', lang === 'ar' ? city.ar : city.en);
    },
  },
];
