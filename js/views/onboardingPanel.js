/**
 * views/onboardingPanel.js (v5.2.52)
 * The first-run wizard on Home — one step at a time (was a 4-row
 * checklist). Step completion logic lives in domain/onboarding.js (pure,
 * tested); this module only renders.
 *
 * Design notes:
 *  - Position is ephemeral (state.ui.onboardingStep, null = follow the
 *    first incomplete step): a reload restarts the wizard exactly where
 *    work remains. Next skips without completing; Back revisits.
 *  - Permission steps prime first (why + what happens), then trigger the
 *    real browser prompt from the primary button (user gesture required).
 *  - Setup steps (method/Asr, daily goal) commit live through the shared
 *    data-bind pipeline; Confirm records the choice, defaults included.
 *  - Every unfinished action step also links straight to where it happens.
 *  - The install step degrades gracefully: an Install button when the
 *    browser offered beforeinstallprompt, an honest manual hint otherwise
 *    (iOS Safari & friends), and a quiet done row once standalone.
 *  - The panel disappears on its own once all steps are done.
 */

import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { METHODS, ASR_FACTORS } from '../domain/prayer.js';
import { buildOnboardingSteps, wizardStepIndex } from '../domain/onboarding.js';

export const STEP_ICONS = {
  language: 'book-open',
  comfort: 'eye',
  location: 'location',
  notifications: 'bell',
  prayer: 'prayer-rug',
  goals: 'target',
  install: 'download',
  firstReading: 'book-open',
};

/**
 * Live notification permission, guarded. Views stay DOM-free; this
 * side-effect-free capability probe is the documented exception (same
 * guard idiom as services/notifications.js). Tests pass explicit flags
 * instead — deterministic, no window needed.
 */
function liveNotificationsGranted() {
  try {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    );
  } catch {
    return false;
  }
}

function liveNotificationsDenied() {
  try {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'denied'
    );
  } catch {
    return false;
  }
}

function methodOptions(p) {
  return Object.entries(METHODS)
    .map(
      ([id, m]) =>
        `<option value="${id}" ${p.method === id ? 'selected' : ''}>${escapeHTML(m.name)}</option>`
    )
    .join('');
}

function asrOptions(p) {
  return Object.keys(ASR_FACTORS)
    .map((id) => `<option value="${id}" ${p.asr === id ? 'selected' : ''}>${id}</option>`)
    .join('');
}

/** Step-specific body: priming copy + inline controls + deep links. */
function stepBodyHTML(step, state, lang, ctx) {
  const p = state.settings.prayer;
  switch (step.id) {
    case 'language':
      return `
      <p class="onboarding-step__prime">${t('onboarding.languageHint', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-language" data-lang="ar" lang="ar" dir="rtl">العربية</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-language" data-lang="en" lang="en" dir="ltr">English</button>
      </div>`;

    case 'comfort':
      return `
      <p class="onboarding-step__prime">${t('onboarding.comfortHint', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-comfort" data-big="1">${t('onboarding.bigTextYes', lang)}</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-comfort" data-big="0">${t('onboarding.bigTextNo', lang)}</button>
      </div>`;

    case 'location':
      return `
      <p class="onboarding-step__prime">${t('onboarding.locationHint', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="prayer-request-location">${icon('location', { size: 14 })} ${t('prayer.enableLocation', lang)}</button>
        <a class="link-btn link-btn--sm" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">${t('onboarding.setManually', lang)}</a>
      </div>`;

    case 'notifications':
      if (step.done)
        return `<p class="onboarding-step__prime">${t('prayer.notifGranted', lang)}</p>`;
      if (ctx.permissionDenied)
        return `<p class="onboarding-step__prime">${t('ramadan.alertsDenied', lang)}</p>`;
      return `
      <p class="onboarding-step__prime">${t('onboarding.notificationsPrime', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="notifications-enable">${icon('bell', { size: 14 })} ${t('prayer.enableNotifications', lang)}</button>
      </div>`;

    case 'prayer':
      return `
      <p class="onboarding-step__prime">${t('onboarding.prayerSetupHint', lang)}</p>
      <label class="field-label" for="wizard-prayer-method">${t('prayer.method', lang)}</label>
      <select class="select" id="wizard-prayer-method" data-bind="prayer-method" aria-label="${t('prayer.method', lang)}">${methodOptions(p)}</select>
      <label class="field-label" for="wizard-prayer-asr">${t('prayer.asrMethod', lang)}</label>
      <select class="select" id="wizard-prayer-asr" data-bind="prayer-asr" aria-label="${t('prayer.asrMethod', lang)}">${asrOptions(p)}</select>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-confirm" data-step="prayer">${t('common.done', lang)}</button>
      </div>`;

    case 'goals':
      return `
      <p class="onboarding-step__prime">${t('tasbih.dailyGoal', lang)}</p>
      <label class="field-label" for="wizard-daily-goal">${t('settings.dailyGoal', lang)}</label>
      <input id="wizard-daily-goal" class="input" type="number" data-bind="dailyGoal" value="${escapeHTML(String(state.settings.dailyGoal ?? 100))}" min="1" max="10000">
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-confirm" data-step="goals">${t('common.done', lang)}</button>
      </div>`;

    case 'install': {
      if (step.done) return '';
      const action = ctx.installPromptReady
        ? `<button type="button" class="btn btn--primary btn--sm" data-action="onboarding-install">${icon('download', { size: 14 })} ${t('onboarding.installAction', lang)}</button>`
        : `<span class="onboarding-step__manual">${t('onboarding.installManual', lang)}</span>`;
      return `
      <p class="onboarding-step__prime">${t('onboarding.installHint', lang)}</p>
      <div class="onboarding-step__actions">${action}</div>`;
    }

    case 'firstReading':
      return `
      <p class="onboarding-step__prime">${t('onboarding.firstReadingHint', lang)}</p>
      <div class="onboarding-step__actions">
        <a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.CATEGORY, { id: 'morning' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="morning">${t('onboarding.firstReading', lang)}</a>
      </div>`;

    default:
      return '';
  }
}

const STEP_TITLES = {
  language: 'onboarding.language',
  comfort: 'onboarding.comfort',
  location: 'onboarding.location',
  notifications: 'onboarding.notifications',
  prayer: 'onboarding.prayerSetup',
  goals: 'settings.dailyGoal',
  install: 'onboarding.install',
  firstReading: 'onboarding.firstReading',
};

/**
 * @param {object} state app state
 * @param {string} lang active UI language
 * @param {{appInstalled?: boolean, notificationsGranted?: boolean, installPromptReady?: boolean}} [flags]
 *        test/SSR overrides — explicit booleans win over live probes.
 * @returns {string} HTML for the panel, or '' when it shouldn't render.
 */
export function onboardingPanelHTML(state, lang, flags = {}) {
  if (state.onboarding?.dismissed) return '';
  const steps = buildOnboardingSteps(state, {
    appInstalled: flags.appInstalled ?? !!state.install?.installed,
    notificationsGranted: flags.notificationsGranted ?? liveNotificationsGranted(),
  });
  if (steps.every((s) => s.done)) return '';

  const idx = wizardStepIndex(steps, state.ui?.onboardingStep);
  const step = steps[idx];
  const doneCount = steps.filter((s) => s.done).length;
  const ctx = {
    installPromptReady: flags.installPromptReady ?? !!state.install?.promptReady,
    permissionDenied: step.id === 'notifications' && !step.done ? liveNotificationsDenied() : false,
  };

  return `
  <section class="panel panel--onboarding" aria-label="${t('onboarding.title', lang)}">
    <div class="panel__header">
      <h2>${t('onboarding.title', lang)}</h2>
      <button type="button" class="icon-btn icon-btn--sm" data-action="onboarding-dismiss" aria-label="${t('onboarding.dismiss', lang)}" title="${t('onboarding.dismiss', lang)}">
        ${icon('close', { size: 15 })}
      </button>
    </div>
    <p class="panel__subtext">${t('onboarding.progress', lang, { done: doneCount, total: steps.length })}</p>
    <div class="onboarding-steps onboarding-steps--wizard">
      <div class="onboarding-step${step.done ? ' onboarding-step--done' : ''}">
        <span class="onboarding-step__icon">${icon(step.done ? 'check' : STEP_ICONS[step.id], { size: 18 })}</span>
        <span class="onboarding-step__text">
          <span class="onboarding-step__label">${t(STEP_TITLES[step.id], lang)}</span>
        </span>
        <span class="onboarding-step__pos" dir="ltr">${idx + 1} / ${steps.length}</span>
      </div>
      <div class="onboarding-step__body">
        ${stepBodyHTML(step, state, lang, ctx)}
      </div>
      <div class="onboarding-step__nav">
        ${
          idx > 0
            ? `<button type="button" class="btn btn--ghost btn--sm" data-action="onboarding-step" data-idx="${idx - 1}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 14 })} ${t('common.prev', lang)}</button>`
            : '<span></span>'
        }
        ${
          idx < steps.length - 1
            ? `<button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-step" data-idx="${idx + 1}">${t('common.next', lang)} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 14 })}</button>`
            : ''
        }
      </div>
    </div>
  </section>`;
}
