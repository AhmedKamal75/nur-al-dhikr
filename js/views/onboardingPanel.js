/**
 * views/onboardingPanel.js (v5.17.48)
 * The first-run wizard on Home — three decisions (language,
 * location-or-offset, reciter), then done, with an instant skip. Step
 * completion logic lives in domain/onboarding.js (pure, tested); this
 * module only renders.
 *
 * Design notes:
 *  - (v5.17.47, C4) the wizard rides collapsed inside a <details> behind a
 *    single summary line — "N of 3 · current step · dismiss" — instead of
 *    occupying the first screen. The full step body, Back/Next and every
 *    deep link survive untouched inside; the summary itself is the native
 *    expand control, so no new data-action and no new handler.
 *  - (v5.17.48) comfort, notifications, calculation method, daily goal,
 *    install and first reading left the wizard: they are passive doors in
 *    Settings (the "finish later" block) that never pop up on their own.
 *    Every legacy step id/index still resolves — live steps render,
 *    deferred ones redirect (see resolveOnboardingStep).
 *  - Position is ephemeral (state.ui.onboardingStep, null = follow the
 *    first incomplete step): a reload restarts the wizard exactly where
 *    work remains. Next skips without completing; Back revisits.
 *  - The location step accepts three honest answers: GPS coordinates, a
 *    manual town/offset setup in Prayer, or the defaults (prayer times
 *    work from defaults, so "no GPS" completes the step, never traps it).
 *  - The reciter list is derived from QURAN_RECITERS (the single source
 *    of truth in core/config/quran.js) — never a pinned subset. Picks
 *    ride the shared set-setting pipeline; Done keeps the current voice.
 *  - The panel disappears on its own once all steps are done.
 */

import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS, QURAN_RECITERS } from '../core/config.js';
import { buildOnboardingSteps, wizardStepIndex } from '../domain/onboarding.js';

export const STEP_ICONS = {
  language: 'book-open',
  location: 'location',
  reciter: 'volume',
};

/** Step-specific body: priming copy + inline controls + deep links. */
function stepBodyHTML(step, state, lang) {
  switch (step.id) {
    case 'language':
      return `
      <p class="onboarding-step__prime">${t('onboarding.languageHint', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-language" data-lang="ar" lang="ar" dir="rtl">العربية</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-language" data-lang="en" lang="en" dir="ltr">English</button>
      </div>`;

    case 'location':
      return `
      <p class="onboarding-step__prime">${t('onboarding.locationHint', lang)}</p>
      <p class="onboarding-step__prime">${t('onboarding.locationOffsetHint', lang)}</p>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="prayer-request-location">${icon('location', { size: 14 })} ${t('prayer.enableLocation', lang)}</button>
        <a class="link-btn link-btn--sm" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">${t('onboarding.setManually', lang)}</a>
      </div>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-confirm" data-step="location">${t('onboarding.useDefaults', lang)}</button>
      </div>`;

    case 'reciter': {
      const current = state.settings?.reciter;
      const rows = QURAN_RECITERS.map(
        (r) => `
      <button type="button" class="reciter-row ${current === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${escapeHTML(r.id)}" aria-pressed="${current === r.id}">
        <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
        ${current === r.id ? icon('check', { size: 16 }) : ''}
      </button>`
      ).join('');
      return `
      <p class="onboarding-step__prime">${t('onboarding.reciterHint', lang)}</p>
      <div class="reciter-list">${rows}</div>
      <div class="onboarding-step__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="onboarding-confirm" data-step="reciter">${t('common.done', lang)}</button>
        <a class="link-btn link-btn--sm" href="${buildHash(VIEWS.SETTINGS, { id: 'reciter' })}" data-action="navigate" data-view="${VIEWS.SETTINGS}" data-id="reciter">${t('onboarding.moreVoices', lang)}</a>
      </div>`;
    }

    default:
      return '';
  }
}

const STEP_TITLES = {
  language: 'onboarding.language',
  location: 'onboarding.location',
  reciter: 'onboarding.reciter',
};

/**
 * @param {object} state app state
 * @param {string} lang active UI language
 * @returns {string} HTML for the panel, or '' when it shouldn't render.
 */
export function onboardingPanelHTML(state, lang) {
  if (state.onboarding?.dismissed) return '';
  const steps = buildOnboardingSteps(state);
  if (steps.every((s) => s.done)) return '';

  const idx = wizardStepIndex(steps, state.ui?.onboardingStep);
  const step = steps[idx];
  const doneCount = steps.filter((s) => s.done).length;

  return `
  <section class="panel panel--onboarding panel--onboarding--line" aria-label="${t('onboarding.title', lang)}">
    <h2 class="sr-only">${t('onboarding.title', lang)}</h2>
    <details class="onboarding-line">
      <summary class="onboarding-line__summary">
        <span class="onboarding-line__icon">${icon(step.done ? 'check' : STEP_ICONS[step.id], { size: 18 })}</span>
        <span class="onboarding-line__text">
          <span class="onboarding-line__progress" dir="auto">${t('onboarding.progress', lang, { done: doneCount, total: steps.length })}</span>
          <span class="onboarding-line__step">${t(STEP_TITLES[step.id], lang)} · ${idx + 1} / ${steps.length}</span>
        </span>
        <span class="onboarding-line__go">${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 14 })}</span>
      </summary>
      <div class="onboarding-steps onboarding-steps--wizard">
        <div class="onboarding-step${step.done ? ' onboarding-step--done' : ''}">
          <span class="onboarding-step__icon">${icon(step.done ? 'check' : STEP_ICONS[step.id], { size: 18 })}</span>
          <span class="onboarding-step__text">
            <span class="onboarding-step__label">${t(STEP_TITLES[step.id], lang)}</span>
          </span>
          <span class="onboarding-step__pos" dir="ltr">${idx + 1} / ${steps.length}</span>
        </div>
      <div class="onboarding-step__body">
        ${stepBodyHTML(step, state, lang)}
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
    </details>
    <button type="button" class="icon-btn icon-btn--sm onboarding-line__dismiss" data-action="onboarding-dismiss" aria-label="${t('onboarding.dismiss', lang)}" title="${t('onboarding.dismiss', lang)}">
      ${icon('close', { size: 15 })}
    </button>
  </section>`;
}
