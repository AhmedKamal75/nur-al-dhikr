/**
 * views/onboardingPanel.js
 * The first-run "Getting started" panel rendered on Home. Step completion
 * logic lives in js/onboarding.js (pure, tested); this module only renders.
 *
 * Design notes:
 *  - Every unfinished step is a link/button that takes the person straight
 *    to where that step happens — no dead rows.
 *  - The install step degrades gracefully: an Install button when the
 *    browser offered beforeinstallprompt, an honest manual hint otherwise
 *    (iOS Safari & friends), and a quiet done row once standalone.
 *  - The panel disappears on its own once all steps are done.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { buildOnboardingSteps } from '../domain/onboarding.js';

export const STEP_ICONS = {
  location: 'location',
  appearance: 'settings',
  install: 'download',
  firstReading: 'book-open',
};

function stepRowHTML(step, lang, { installPromptReady }) {
  const done = step.done;
  const cls = `onboarding-step${done ? ' onboarding-step--done' : ''}`;
  const lead = done
    ? `<span class="onboarding-step__check">${icon('check', { size: 16 })}</span>`
    : `<span class="onboarding-step__icon">${icon(STEP_ICONS[step.id], { size: 18 })}</span>`;

  const meta = {
    location: {
      label: t('onboarding.location', lang),
      hint: t('onboarding.locationHint', lang),
      href: buildHash(VIEWS.PRAYER),
      view: VIEWS.PRAYER,
    },
    appearance: {
      label: t('onboarding.appearance', lang),
      hint: t('onboarding.appearanceHint', lang),
      href: buildHash(VIEWS.SETTINGS),
      view: VIEWS.SETTINGS,
    },
    firstReading: {
      label: t('onboarding.firstReading', lang),
      hint: t('onboarding.firstReadingHint', lang),
      href: buildHash(VIEWS.CATEGORY, { id: 'morning' }),
      view: VIEWS.CATEGORY,
      id: 'morning',
    },
  }[step.id];

  if (meta) {
    return `
    <a class="${cls}" href="${meta.href}" data-action="navigate" data-view="${meta.view}"${meta.id ? ` data-id="${meta.id}"` : ''}>
      ${lead}
      <span class="onboarding-step__text">
        <span class="onboarding-step__label">${meta.label}</span>
        <span class="onboarding-step__hint">${meta.hint}</span>
      </span>
      ${done ? '' : icon('chevronRight', { size: 14 })}
    </a>`;
  }

  // Install step: a row (not a plain link) — the action is a button when
  // the browser's install prompt is available, a hint otherwise.
  const action = done
    ? ''
    : installPromptReady
      ? `<button type="button" class="btn btn--primary btn--sm" data-action="onboarding-install">${icon('download', { size: 14 })} ${t('onboarding.installAction', lang)}</button>`
      : `<span class="onboarding-step__manual">${t('onboarding.installManual', lang)}</span>`;
  return `
  <div class="${cls}">
    ${lead}
    <span class="onboarding-step__text">
      <span class="onboarding-step__label">${t('onboarding.install', lang)}</span>
      <span class="onboarding-step__hint">${t('onboarding.installHint', lang)}</span>
    </span>
    ${action}
  </div>`;
}

/**
 * @param {object} state app state
 * @param {string} lang active UI language
 * @returns {string} HTML for the panel, or '' when it shouldn't render.
 */
export function onboardingPanelHTML(state, lang) {
  if (state.onboarding?.dismissed) return '';
  const flags = { appInstalled: !!state.install?.installed };
  const steps = buildOnboardingSteps(state, flags);
  if (steps.every((s) => s.done)) return '';

  const doneCount = steps.filter((s) => s.done).length;
  return `
  <section class="panel panel--onboarding" aria-label="${t('onboarding.title', lang)}">
    <div class="panel__header">
      <h2>${t('onboarding.title', lang)}</h2>
      <button type="button" class="icon-btn icon-btn--sm" data-action="onboarding-dismiss" aria-label="${t('onboarding.dismiss', lang)}" title="${t('onboarding.dismiss', lang)}">
        ${icon('close', { size: 15 })}
      </button>
    </div>
    <p class="panel__subtext">${t('onboarding.progress', lang, { done: doneCount, total: steps.length })}</p>
    <div class="onboarding-steps">
      ${steps.map((s) => stepRowHTML(s, lang, { installPromptReady: !!state.install?.promptReady })).join('')}
    </div>
  </section>`;
}
