/**
 * app/compassRuntime.js — Qibla compass lifecycle: sensor permission,
 * smoothing, declination correction, per-frame DOM patching.
 */

import { rt } from './rt.js';
import { VIEWS } from '../core/config.js';
import { store } from '../core/state.js';
import { qiblaBearing } from '../domain/qibla.js';
import { declinationCached } from '../domain/wmm.js';
import * as compass from '../domain/compass.js';
import { updateQiblaCompassDOM } from '../views/qibla.js';

/* Qibla: device compass lifecycle                                     */
/* ------------------------------------------------------------------ */
// deviceorientation fires at native sensor frequency (often 30-60Hz), so
// the heading is smoothed and DOM-patched directly via rAF rather than
// dispatched through the store — see the header comment in compass.js.

export function handleCompassHeading(heading, source) {
  if (rt.smoothedHeading == null) {
    rt.smoothedHeading = heading;
  } else {
    let diff = heading - rt.smoothedHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rt.smoothedHeading = (rt.smoothedHeading + diff * 0.25 + 360) % 360;
  }
  rt.headingSource = source;
  if (rt.compassRAFHandle) return;
  rt.compassRAFHandle = requestAnimationFrame(() => {
    rt.compassRAFHandle = null;
    const state = store.getState();
    if (state.activeView !== VIEWS.QIBLA) return;
    const p = state.settings.prayer;
    if (p.latitude == null || p.longitude == null) return;
    const bearing = qiblaBearing(p.latitude, p.longitude);
    // v3.26: local magnetic declination (real WMM2025) — corrects a
    // magnetic-north needle onto the true-north qibla bearing.
    const declinationDeg = declinationCached(p.latitude, p.longitude);
    updateQiblaCompassDOM(
      bearing,
      rt.smoothedHeading,
      rt.headingSource,
      state.settings.language,
      declinationDeg
    );
  });
}

export function startCompassIfNeeded() {
  if (rt.compassRunning) return;
  rt.compassRunning = true;
  rt.smoothedHeading = null;
  compass.start(handleCompassHeading);
}

export function stopCompass() {
  if (!rt.compassRunning) return;
  rt.compassRunning = false;
  if (rt.compassRAFHandle) {
    cancelAnimationFrame(rt.compassRAFHandle);
    rt.compassRAFHandle = null;
  }
  compass.stop();
}

/* ------------------------------------------------------------------ */
