/**
 * app/installPrompt.js — the PWA install flow (beforeinstallprompt can
 * be consumed exactly once; the store carries only the reactive flags).
 */

import { rt } from './rt.js';
import { actions, store } from '../core/state.js';
import { shouldReofferInstall } from '../domain/install.js';

/* Install prompt (onboarding "Install the app" step)                  */
/* ------------------------------------------------------------------ */
// beforeinstallprompt can be consumed exactly once, so the event itself
// lives in the runtime context (rt.deferredInstallPrompt — see rt.js);
// the store only carries the reactive flags (state.install) so surfaces
// re-render when availability changes. Browsers without the event
// (iOS Safari) get per-platform manual steps instead (see
// views/installRow.js).
//
// (v5.17.31) deferral: a recent "not now" (persisted settings, not the
// ephemeral slice) keeps the event stashed but does NOT surface the
// offer again until the cooldown passes — the re-offer path (the
// install-reoffer handler) picks it back up afterwards.

export function wireInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's own mini-infobar out of the way
    rt.deferredInstallPrompt = e;
    if (!shouldReofferInstall(store.getState().settings.installDeferral)) return;
    store.dispatch(actions.installPromptReady());
  });
  window.addEventListener('appinstalled', () => {
    rt.deferredInstallPrompt = null;
    store.dispatch(actions.markAppInstalled());
    // A fresh install clears the deferral memory — nothing left to re-offer.
    store.dispatch(actions.updateSettings({ installDeferral: { at: null, count: 0 } }));
  });
  // Already running standalone (launched from a home-screen icon)?
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) store.dispatch(actions.markAppInstalled());
}
