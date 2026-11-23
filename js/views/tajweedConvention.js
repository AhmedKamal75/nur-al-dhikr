/** A declared preference is not a claim of completed convention verification. */
import { t } from '../core/i18n.js';
import { escapeHTML } from '../core/utils.js';
import { TAJWEED_RULE_REGISTRY } from '../domain/tajweedRules.js';

export function tajweedConventionHTML(state) {
  const lang = state.settings.language;
  const selected = state.settings.tajweedConvention === 'lpmq' ? 'lpmq' : 'dar-al-maarifah';
  const conventions = TAJWEED_RULE_REGISTRY.conventions;
  return `<section class="tajweed-convention" aria-label="${t('tajweed.convention', lang)}">
    <h3>${t('tajweed.convention', lang)}</h3>
    <div class="chip-row" role="group" aria-label="${t('tajweed.convention', lang)}">
      ${[
        ['dar-al-maarifah', 'conventionDam'],
        ['lpmq', 'conventionLpmq'],
      ]
        .map(
          ([id, key]) =>
            `<button type="button" class="chip ${selected === id ? 'chip--active' : ''}" data-action="tajweed-set-convention" data-convention="${id}" aria-pressed="${selected === id}">${t(`tajweed.${key}`, lang)}</button>`
        )
        .join('')}
    </div>
    <p class="panel__subtext">${t('tajweed.recitationProfile', lang)}</p>
    <p class="panel__subtext" role="note">${t('tajweed.conventionPending', lang)}</p>
    <details>
      <summary>${t('tajweed.convention', lang)} · ${t('card.details', lang)}</summary>
      <p>${t('tajweed.conventionSources', lang)}</p>
      <p>${t('tajweed.conventionCaveat', lang)}</p>
      <p>${t('tajweed.teacherClause', lang)}</p>
      <p><a href="${escapeHTML(conventions.lpmq.url)}" target="_blank" rel="noopener noreferrer">${t('tajweed.conventionLpmq', lang)}</a> · <a href="${escapeHTML(conventions['dar-al-maarifah'].url)}" target="_blank" rel="noopener noreferrer">${t('tajweed.conventionDam', lang)}</a></p>
    </details>
  </section>`;
}
