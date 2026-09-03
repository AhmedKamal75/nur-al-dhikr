/**
 * app/installPrompt.js — the PWA install flow (beforeinstallprompt can
 * be consumed exactly once; the store carries only the reactive flags).
 */

import { rt } from './rt.js';
import { actions, store } from '../core/state.js';

/* Install prompt (onboarding "Install the app" step)                  */
/* ------------------------------------------------------------------ */
// beforeinstallprompt can be consumed exactly once, so the event itself
// lives here; the store only carries the reactive flags (state.install)
// so the onboarding panel re-renders when availability changes. Browsers
// without the event (iOS Safari) simply show the manual hint instead.

export function wireInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's own mini-infobar out of the way
    rt.deferredInstallPrompt = e;
    store.dispatch(actions.installPromptReady());
  });
  window.addEventListener('appinstalled', () => {
    rt.deferredInstallPrompt = null;
    store.dispatch(actions.markAppInstalled());
  });
  // Already running standalone (launched from a home-screen icon)?
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) store.dispatch(actions.markAppInstalled());
}
