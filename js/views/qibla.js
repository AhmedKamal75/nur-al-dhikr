/**
 * views/qibla.js
 * Finds the direction to the Kaaba from the person's location. Reuses the
 * same location (settings.prayer.latitude/longitude) and the same
 * request/manual-entry flow as the Prayer Times screen, so nobody has to
 * grant location access twice or re-enter coordinates for a second feature.
 *
 * Two layers of accuracy, both always visible:
 *  1. A numeric bearing + distance, computed purely from geolocation — this
 *     is always correct and needs no sensor.
 *  2. A live rotating needle driven by the device's magnetometer, when
 *     available — a nice-to-have that can be thrown off by nearby metal,
 *     magnets, or an uncalibrated sensor, so it's presented as a visual aid
 *     alongside the numbers rather than the sole answer.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { qiblaBearing, distanceToKaabaKm, cardinalLabel } from '../qibla.js';
import * as compass from '../compass.js';

export function renderQibla(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  if (!hasLocation) {
    return `
    <section class="view view--qibla">
      <h1 class="view__title">${t('nav.qibla', lang)}</h1>
      <div class="empty-state">
        ${icon('mosque', { size: 40 })}
        <p>${t('prayer.locationNeeded', lang)}</p>
        <button type="button" class="btn btn--primary" data-action="prayer-request-location">${icon('location', { size: 16 })} ${t('prayer.enableLocation', lang)}</button>
        <button type="button" class="link-btn" data-action="prayer-manual-location">${t('prayer.manualLocation', lang)}</button>
      </div>
    </section>`;
  }

  const bearing = qiblaBearing(p.latitude, p.longitude);
  const distanceKm = distanceToKaabaKm(p.latitude, p.longitude);
  const distanceMi = distanceKm * 0.621371;
  const cardinal = cardinalLabel(bearing);

  const sensorSupported = compass.isSupported();
  const needsPermission = compass.needsPermission();

  return `
  <section class="view view--qibla">
    <h1 class="view__title">${t('nav.qibla', lang)}</h1>
    <p class="view__subtitle">${t('qibla.subtitle', lang)}</p>

    <div class="qibla-compass">
      <svg class="qibla-compass__dial" viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
        <circle cx="120" cy="120" r="112" class="qibla-compass__ring" />
        <circle cx="120" cy="120" r="86" class="qibla-compass__ring qibla-compass__ring--inner" />
        <text x="120" y="24" class="qibla-compass__label" text-anchor="middle">N</text>
        <text x="120" y="224" class="qibla-compass__label" text-anchor="middle">S</text>
        <text x="16" y="125" class="qibla-compass__label" text-anchor="middle">W</text>
        <text x="224" y="125" class="qibla-compass__label" text-anchor="middle">E</text>
        <g id="qibla-needle" class="qibla-compass__needle" style="transform: rotate(${bearing}deg)" data-static-bearing="${bearing}">
          <path d="M120 30 L132 90 L120 76 L108 90 Z" class="qibla-compass__needle-head" />
          <line x1="120" y1="90" x2="120" y2="150" class="qibla-compass__needle-shaft" />
        </g>
        <circle cx="120" cy="120" r="6" class="qibla-compass__hub" />
      </svg>
      <p class="qibla-compass__hint" id="qibla-heading-text">
        ${sensorSupported ? t('qibla.holdFlat', lang) : t('qibla.noSensor', lang)}
      </p>
    </div>

    ${
      sensorSupported && needsPermission
        ? `
    <button type="button" class="btn btn--secondary" data-action="qibla-enable-compass">
      ${icon('compass', { size: 16 })} ${t('qibla.enableCompass', lang)}
    </button>`
        : ''
    }

    <section class="panel qibla-facts">
      <div class="qibla-fact">
        <span class="qibla-fact__label">${t('qibla.bearing', lang)}</span>
        <span class="qibla-fact__value" dir="ltr">${Math.round(bearing)}\u00B0 ${cardinal}</span>
      </div>
      <div class="qibla-fact">
        <span class="qibla-fact__label">${t('qibla.distance', lang)}</span>
        <span class="qibla-fact__value" dir="ltr">${Math.round(distanceKm).toLocaleString()} km <span class="qibla-fact__value-sub">(${Math.round(distanceMi).toLocaleString()} mi)</span></span>
      </div>
    </section>

    <p class="view__meta">${escapeHTML(p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`)}</p>

    <p class="qibla-disclaimer">${t('qibla.disclaimer', lang)}</p>

    <button type="button" class="link-btn" data-action="prayer-manual-location">${icon('location', { size: 14 })} ${t('prayer.manualLocation', lang)}</button>
  </section>`;
}

/**
 * Imperative DOM patch called directly from app.js's compass callback — see
 * the file header comment in compass.js for why this bypasses the normal
 * dispatch()/render() cycle. Safe to call even if the Qibla view isn't
 * currently mounted (it just no-ops, since the elements won't be found).
 */
export function updateQiblaCompassDOM(bearing, heading, accurate, lang) {
  const needle = document.getElementById('qibla-needle');
  const hintEl = document.getElementById('qibla-heading-text');
  if (!needle) return;

  // Rotate the needle by (bearing - heading): this is the angle, relative
  // to wherever the top of the phone is currently pointing, that the person
  // needs to turn toward. When it points straight up, the phone's top edge
  // is aimed at the Qibla.
  const relative = (((bearing - heading) % 360) + 360) % 360;
  needle.style.transform = `rotate(${relative}deg)`;

  const aligned = relative <= 6 || relative >= 354;
  needle.classList.toggle('qibla-compass__needle--aligned', aligned);

  if (hintEl) {
    hintEl.textContent = accurate
      ? t(aligned ? 'qibla.aligned' : 'qibla.turnToAlign', lang)
      : t('qibla.calibrate', lang);
  }
}
