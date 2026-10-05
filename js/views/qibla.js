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
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { escapeHTML } from '../core/utils.js';
import { qiblaBearing, distanceToKaabaKm, cardinalLabel, angleDelta } from '../domain/qibla.js';
import * as compass from '../domain/compass.js';
import { declinationCached, declinationLabel } from '../domain/wmm.js';
import { viewMenuButton } from '../ui/viewSheet.js';

export function renderQibla(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  if (!hasLocation) {
    return `
    <section class="view view--qibla">
      <div class="view-header view-header--row">
        <h1 class="view__title">${t('nav.qibla', lang)}</h1>
        ${viewMenuButton('qibla', lang, { labelKey: 'viewMenu.qibla' })}
      </div>
      ${emptyStateHTML({
        iconName: 'mosque',
        title: t('prayer.locationNeeded', lang),
        actionHTML: `
      <button type="button" class="btn btn--primary" data-action="prayer-request-location">${icon('location', { size: 16 })} ${t('prayer.enableLocation', lang)}</button>
      <button type="button" class="link-btn" data-action="prayer-manual-location">${t('prayer.manualLocation', lang)}</button>`,
      })}
    </section>`;
  }

  const bearing = qiblaBearing(p.latitude, p.longitude);
  const distanceKm = distanceToKaabaKm(p.latitude, p.longitude);
  const distanceMi = distanceKm * 0.621371;
  const cardinal = cardinalLabel(bearing, lang);
  const locale = lang === 'ar' ? 'ar' : 'en-US';
  // (v5.12.1 UX audit S11) pin Latin digits: bare toLocaleString('ar') is
  // engine-dependent (small-ICU → 123, full-ICU → ١٢٣) while the bearing,
  // accuracy and countdown on this same screen are always Western String().
  const digitOpt = { numberingSystem: 'latn' };

  const sensorSupported = compass.isSupported();
  const needsPermission = compass.needsPermission();

  // v3.26: the local magnetic declination from the embedded real WMM2025.
  // The bearing above is true-north based; a magnetic needle differs from
  // it by exactly this amount here. No fabrication: the model is NOAA's
  // own, embedded offline, and test-pinned against NOAA's published values.
  const declinationDeg = declinationCached(p.latitude, p.longitude);
  const declLabel = declinationLabel(declinationDeg);

  return `
  <section class="view view--qibla">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.qibla', lang)}</h1>
      ${viewMenuButton('qibla', lang, { labelKey: 'viewMenu.qibla' })}
    </div>
    <p class="view__subtitle">${t('qibla.subtitle', lang)}</p>

    <div class="qibla-compass">
      <svg class="qibla-compass__dial" viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
        <circle cx="120" cy="120" r="112" class="qibla-compass__ring" />
        <circle cx="120" cy="120" r="86" class="qibla-compass__ring qibla-compass__ring--inner" />
        <text x="120" y="24" class="qibla-compass__label" text-anchor="middle">${t('qibla.cardinal.n', lang)}</text>
        <text x="120" y="224" class="qibla-compass__label" text-anchor="middle">${t('qibla.cardinal.s', lang)}</text>
        <text x="16" y="125" class="qibla-compass__label" text-anchor="middle">${t('qibla.cardinal.w', lang)}</text>
        <text x="224" y="125" class="qibla-compass__label" text-anchor="middle">${t('qibla.cardinal.e', lang)}</text>
        <g id="qibla-needle" class="qibla-compass__needle" style="transform: rotate(${bearing}deg)" data-static-bearing="${bearing}">
          <path d="M120 30 L132 90 L120 76 L108 90 Z" class="qibla-compass__needle-head" />
          <line x1="120" y1="90" x2="120" y2="150" class="qibla-compass__needle-shaft" />
        </g>
        <circle cx="120" cy="120" r="6" class="qibla-compass__hub" />
      </svg>
      <!-- The dial itself is aria-hidden (purely visual); the bearing is
           announced as text instead of a spinning SVG. -->
      <p class="sr-only">${t('qibla.bearingSentence', lang, { deg: Math.round(bearing) })} ${cardinal}.</p>
      <p class="qibla-compass__hint" id="qibla-heading-text" role="status" aria-live="polite">
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
      <div class="qibla-fact" id="qibla-error-row" hidden>
        <span class="qibla-fact__label">${t('qibla.headingError', lang)}</span>
        <span class="qibla-fact__value" dir="ltr" id="qibla-error-value">—</span>
      </div>
      <div class="qibla-fact">
        <span class="qibla-fact__label">${t('qibla.distance', lang)}</span>
        <span class="qibla-fact__value" dir="ltr">${Math.round(distanceKm).toLocaleString(locale, digitOpt)} km <span class="qibla-fact__value-sub">(${Math.round(distanceMi).toLocaleString(locale, digitOpt)} mi)</span></span>
      </div>
      ${
        Number.isFinite(Number(p.locationAccuracy)) && Number(p.locationAccuracy) >= 0
          ? `
      <div class="qibla-fact">
        <span class="qibla-fact__label">${t('qibla.accuracy', lang, { m: Math.round(Number(p.locationAccuracy)) })}</span>
        <span class="qibla-fact__value" dir="ltr">±${Math.round(Number(p.locationAccuracy))} m</span>
      </div>`
          : ''
      }
      ${
        declLabel
          ? `
      <div class="qibla-fact">
        <span class="qibla-fact__label">${t('qibla.declination', lang)}</span>
        <span class="qibla-fact__value" dir="ltr">${declLabel}</span>
      </div>`
          : ''
      }
    </section>

    ${
      declLabel
        ? `<p class="view__meta">${t('qibla.declinationModel', lang)}</p>
    <p class="view__meta">${t('qibla.declinationNote', lang)}</p>`
        : ''
    }

    <details class="panel qibla-calibrate">
      <summary class="qibla-calibrate__summary">${t('qibla.calibrateTitle', lang)}</summary>
      <ol class="qibla-calibrate__steps">
        <li>${t('qibla.calibrate1', lang)}</li>
        <li>${t('qibla.calibrate2', lang)}</li>
        <li>${t('qibla.calibrate3', lang)}</li>
      </ol>
    </details>

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
export function updateQiblaCompassDOM(bearing, heading, source, lang, declinationDeg = null) {
  const needle = document.getElementById('qibla-needle');
  const hintEl = document.getElementById('qibla-heading-text');
  if (!needle) return;

  // v3.26: correct the heading's NORTH REFERENCE before aiming. The qibla
  // bearing is true-north based:
  //   - 'true' readings need no correction;
  //   - 'magnetic' readings (iOS webkitCompassHeading) are corrected by the
  //     local declination D (east-positive): true heading = magnetic + D;
  //   - 'relative' readings have no north anchor at all — used as-is (an
  //     aid, and the hint says exactly that).
  const effectiveHeading =
    source === 'magnetic' && Number.isFinite(declinationDeg) ? heading + declinationDeg : heading;
  const relative = (((bearing - effectiveHeading) % 360) + 360) % 360;
  needle.style.transform = `rotate(${relative}deg)`;

  const aligned = relative <= 6 || relative >= 354;
  needle.classList.toggle('qibla-compass__needle--aligned', aligned);

  // (v5.2.75, UP-03) live heading-error readout ("off by 12° ↺") reusing
  // the shared angle-delta helper. Change-guarded like the hint: the
  // row appears with the first heading frame and stays silent otherwise.
  const errorRow = document.getElementById('qibla-error-row');
  const errorValue = document.getElementById('qibla-error-value');
  if (errorRow && errorValue) {
    const delta = angleDelta(effectiveHeading, bearing);
    const errorText = `${t('qibla.offBy', lang, { n: Math.round(Math.abs(delta)) })} ${delta >= 0 ? '\u21BB' : '\u21BA'}`;
    if (errorRow.hidden) errorRow.hidden = false;
    if (errorValue.textContent !== errorText) errorValue.textContent = errorText;
  }

  if (hintEl) {
    let next;
    let title = null;
    if (source === 'relative') {
      next = t('qibla.needleRelative', lang);
    } else if (source === 'magnetic' && Number.isFinite(declinationDeg)) {
      next = t(aligned ? 'qibla.aligned' : 'qibla.turnToAlign', lang);
      title = t('qibla.needleCorrected', lang, {
        d: declinationLabel(declinationDeg) ?? '',
      });
    } else if (source === 'true') {
      next = t(aligned ? 'qibla.aligned' : 'qibla.turnToAlign', lang);
      title = t('qibla.needleTrue', lang);
    } else if (source === 'magnetic') {
      // Magnetic sensor, no declination model value: the needle still
      // points, but uncorrected — say that plainly instead of implying a
      // sensor fault with the calibrate hint.
      next = t(aligned ? 'qibla.aligned' : 'qibla.turnToAlign', lang);
      title = t('qibla.needleUncorrected', lang);
    } else {
      next = t('qibla.calibrate', lang);
    }
    // (v5.2.75, UX-09) the sensor callback runs at 30–60Hz: only touch
    // the live region when the sentence actually changes. Unconditional
    // writes made screen readers chatter continuously and churned the DOM
    // for nothing; change-only writes announce transitions (including
    // arrival at alignment) exactly once.
    if (hintEl.textContent !== next) hintEl.textContent = next;
    if (title == null) hintEl.removeAttribute?.('title');
    else if (hintEl.title !== title) hintEl.title = title;
  }
}
