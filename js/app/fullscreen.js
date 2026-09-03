/**
 * app/fullscreen.js
 * (v4.4) Side-effect owner for TRUE fullscreen Mushaf reading.
 *
 * Three browser capabilities are wrapped here, each strictly best-effort
 * (the CSS full-bleed layout is the source of truth and needs none of
 * them — these just make the experience more complete where the platform
 * allows):
 *
 *  1. Native Fullscreen API  — hides the browser's own chrome (URL bar,
 *     tabs) so the mushaf owns every pixel of the physical display.
 *  2. Screen Wake Lock       — a reading session must never sleep the
 *     screen mid-ayah. Re-acquired automatically when the document
 *     becomes visible again (returning from a tab/app switch).
 *  3. fullscreenchange sync — if the browser exits native fullscreen
 *     behind our back (its own Esc, a notification swipe), the app
 *     fullscreen state follows so the shell can never be left in the
 *     half-hidden limbo of body.is-mushaf-fullscreen with visible
 *     browser chrome.
 *
 * The wake lock's platform API (`navigator.wakeLock`, Chrome/Edge/Safari
 * 16.4+; behind flags or absent elsewhere) is feature-detected per call —
 * no polyfill, no console noise, graceful absence. Import cycle safety:
 * this module imports core/state only, so handlers and events can both
 * use it freely.
 */
import { actions, store } from '../core/state.js';
import { VIEWS } from '../core/config.js';
import { setFullscreenAnim } from '../views/mushafReader.js';

let wakeLock = null;

/* ------------------------------------------------------------------ */
/* Control auto-fade (body.mushaf-fs-idle / body.reader-fs-idle)        */
/* ------------------------------------------------------------------ */

// While the Mushaf is fullscreen OR the classic reader is immersive, the
// floating control bar fades away after a few idle seconds so NOTHING but
// the text is on screen; any pointer/key activity brings it straight back.
// 3s: long enough to read the counters, short enough that the reading line
// never feels cluttered. (v4.5: one shared timer, two body classes — the
// two fullscreen modes are specified as sharing this exact contract in
// docs/APP-FLOW.md §5.)
const FS_CONTROLS_IDLE_MS = 3000;
let fsIdleTimer = null;

function setFsControlsVisible(visible) {
  document.body.classList.toggle('mushaf-fs-idle', !visible);
  document.body.classList.toggle('reader-fs-idle', !visible);
}

/** Activity in (or entry into) a fullscreen/immersive session: show the
 *  controls and re-arm the fade timer. No-ops outside such sessions —
 *  BOTH classes are always cleared together so neither can leak onto a
 *  windowed route (same reset discipline as the state flags themselves). */
export function resetFsControlsIdleTimer() {
  const state = store.getState();
  const inMushafFs = state.mushafFullscreen && state.activeView === VIEWS.MUSHAF;
  const inReaderImmersive = state.readerImmersive && state.activeView === VIEWS.QURAN;
  if (!inMushafFs && !inReaderImmersive) {
    if (fsIdleTimer) clearTimeout(fsIdleTimer);
    fsIdleTimer = null;
    setFsControlsVisible(true);
    return;
  }
  setFsControlsVisible(true);
  if (fsIdleTimer) clearTimeout(fsIdleTimer);
  fsIdleTimer = setTimeout(() => setFsControlsVisible(false), FS_CONTROLS_IDLE_MS);
}

/** Arm the timer right after ENTERING either fullscreen mode (the
 *  renderer's subscribe callback fires before the patched DOM paints, so
 *  a microtask defers to the next frame). Called from the state
 *  subscription in app/stateSub.js. */
export function armFsControlsAfterEnter() {
  queueMicrotask(() => requestAnimationFrame(() => resetFsControlsIdleTimer()));
}

/** Request the browser's own fullscreen on the document (user-gesture
 *  context only — every call site is a click). Swallows every failure:
 *  iOS Safari on iPhone has never shipped element fullscreen, and a
 *  rejected promise must never surface as an error toast over a reading
 *  session that the CSS layout already made fullscreen. */
export function requestMushafNativeFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (typeof req !== 'function') return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* permission/feature failures are fine — CSS full-bleed stands */
  }
  acquireWakeLock();
}

/** Leave native fullscreen if the browser put us in it. */
export function releaseMushafNativeFullscreen() {
  try {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else if (
      document.webkitFullscreenElement &&
      typeof document.webkitExitFullscreen === 'function'
    ) {
      document.webkitExitFullscreen();
    }
  } catch {
    /* best effort only */
  }
  releaseWakeLock();
}

async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || !navigator.wakeLock?.request) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    // The lock is silently released by the platform whenever the document
    // is hidden; re-arm on return — but only if we still OWN it (i.e. the
    // app fullscreen session is still on).
    wakeLock.addEventListener?.('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock && typeof wakeLock.release === 'function') {
    try {
      const p = wakeLock.release();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* best effort */
    }
  }
  wakeLock = null;
}

/** Called from app/events.js on visibilitychange: re-acquire the wake
 *  lock for an ONGOING fullscreen session after the tab comes back. */
export function reacquireWakeLockIfFullscreen() {
  if (store.getState().mushafFullscreen) acquireWakeLock();
}

/** Wire the one-time browser listeners. Called once from app/events.js
 *  at boot. fullscreenchange is the important one: the browser's own
 *  exit paths (Esc key, notification shade, tab switch) must take the
 *  app-state flag down with them, or the shell stays chrome-less with
 *  browser chrome visible — the worst of both worlds. */
export function initFullscreenSync() {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && store.getState().mushafFullscreen) {
      setFullscreenAnim('out');
      store.dispatch(actions.setMushafFullscreen(false));
      releaseWakeLock();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reacquireWakeLockIfFullscreen();
  });
}
