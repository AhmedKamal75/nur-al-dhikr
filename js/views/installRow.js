/**
 * views/installRow.js (v5.17.31)
 * The one persistent install row, shared by About and Settings (and its
 * copy reused by the onboarding step body): title, honest status, and the
 * action this platform actually has — the browser dialog where it exists,
 * per-platform manual steps where it does not, and the offline-ready badge
 * once the service worker's shell precache has landed.
 *
 * Views stay DOM-free: the only window touch is the guarded userAgent /
 * standalone probe below (the same sanctioned-probe idiom as
 * onboardingPanel's notification check). Tests pass flags.platform.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { detectInstallPlatform, installStepsKey, shouldReofferInstall } from '../domain/install.js';

/** This device's raw userAgent string, or '' outside a browser. */
export function liveUA() {
  try {
    return typeof window !== 'undefined' ? window.navigator?.userAgent || '' : '';
  } catch {
    return '';
  }
}

/**
 * Live platform probe: standalone first (an installed app has no install
 * action left), then the userAgent for the manual-steps branch. The stashed
 * beforeinstallprompt is NOT visible here — callers OR it in from state.
 */
export function liveInstallPlatform() {
  try {
    const standalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)')?.matches ||
        window.navigator?.standalone === true);
    return detectInstallPlatform({ installed: !!standalone, ua: liveUA() });
  } catch {
    return 'desktop';
  }
}

/**
 * @param {object} state app state
 * @param {string} lang active UI language
 * @param {{platform?: string, promptReady?: boolean}} [flags]
 *        test overrides — explicit values win over state + live probes.
 * @returns {string} HTML for the persistent install row.
 */
export function installRowHTML(state, lang, flags = {}) {
  const install = state.install || {};
  const installed = !!install.installed;
  const promptReady = flags.promptReady ?? !!install.promptReady;
  const platform =
    flags.platform ?? detectInstallPlatform({ installed, promptReady, ua: liveUA() });
  const deferral = state.settings?.installDeferral;
  const shellReady = install.shellReady === true;

  const status = shellReady
    ? `<span class="install-row__ready">${icon('check', { size: 14 })} ${escapeHTML(t('sw.shellReady', lang))}</span>`
    : `<span class="install-row__hint">${escapeHTML(t('onboarding.installHint', lang))}</span>`;

  let action = '';
  if (platform === 'prompt') {
    action = `
      <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-install">${icon('download', { size: 14 })} ${escapeHTML(t('onboarding.installAction', lang))}</button>
      <button type="button" class="btn btn--secondary btn--sm" data-action="install-later">${escapeHTML(t('onboarding.installLater', lang))}</button>`;
  } else if (!installed) {
    // No live dialog on this visit: the honest manual steps for the
    // platform, plus a re-offer attempt once a past deferral has cooled
    // down (the handler falls back to these same steps when no stashed
    // event survived, e.g. after a reload).
    const reoffer =
      deferral &&
      typeof deferral === 'object' &&
      (deferral.count || 0) > 0 &&
      shouldReofferInstall(deferral)
        ? `<button type="button" class="btn btn--secondary btn--sm" data-action="install-reoffer">${escapeHTML(t('onboarding.installReoffer', lang))}</button>`
        : '';
    action = `
      <span class="onboarding-step__manual">${escapeHTML(t(installStepsKey(platform), lang))}</span>
      ${reoffer}`;
  }

  return `
  <div class="install-row">
    <span class="install-row__icon">${icon('download', { size: 18 })}</span>
    <span class="install-row__text">
      <span class="install-row__title">${escapeHTML(t('onboarding.install', lang))}</span>
      <span class="install-row__desc">${status}</span>
    </span>
    ${action ? `<span class="install-row__actions">${action}</span>` : ''}
  </div>`;
}
