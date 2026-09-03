/**
 * views/tajweedSettings.js (v4.6.0)
 * The Tajweed rules & colors panel: every rule of the standard chart with
 * an on/off toggle (all ON by default), each family's color picked from a
 * curated swatch row, a live sample line, and a one-tap reset back to the
 * standard chart. Opened from the Mushaf More sheet and the Mushaf display
 * settings.
 *
 * Pure template — the handlers ('tajweed-set-color', 'tajweed-toggle-rule',
 * 'tajweed-reset') live in app/handlers/quran.js next to their feature.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import {
  TAJWEED_FAMILIES,
  TAJWEED_RULES,
  TAJWEED_COLOR_CHOICES,
  tajweedPrefsOf,
  ruleEnabled,
  effectiveRuleColor,
} from '../domain/tajweed.js';

export function buildTajweedSettingsPanel(state) {
  const lang = state.settings.language;
  const prefs = tajweedPrefsOf(state);

  const familyColor = (familyId) => {
    const override = prefs.colors?.[familyId];
    if (typeof override === 'string' && /^#[0-9a-fA-F]{6}$/.test(override)) return override;
    return TAJWEED_FAMILIES.find((f) => f.id === familyId)?.color || '#9e9e9e';
  };

  const familyBlocks = TAJWEED_FAMILIES.map((family) => {
    const rules = TAJWEED_RULES.filter((r) => r.family === family.id);
    const swatches = TAJWEED_COLOR_CHOICES.map(
      (hex) => `
      <button type="button" class="tajpick__swatch ${familyColor(family.id) === hex ? 'tajpick__swatch--active' : ''}" style="background:${hex}" data-action="tajweed-set-color" data-family="${family.id}" data-color="${hex}" aria-label="${t('tajweed.familyColor', lang, { family: pickLocale(family.name, lang) })}: ${hex}" title="${hex}"></button>`
    ).join('');

    const ruleRows = rules
      .map((r) => {
        const on = ruleEnabled(prefs, r.id);
        const color = effectiveRuleColor(prefs, r);
        return `
      <button type="button" class="tajpick__rule ${on ? '' : 'tajpick__rule--off'}" data-action="tajweed-toggle-rule" data-rule="${r.id}" aria-pressed="${on}">
        <span class="tajpick__rule-swatch" style="${color ? `background:${color}` : 'border-style:dashed'}" aria-hidden="true"></span>
        <span class="tajpick__rule-body">
          <span class="tajpick__rule-name">${escapeHTML(pickLocale(r.name, lang))}</span>
          <span class="tajpick__rule-desc">${on ? escapeHTML(pickLocale(r.desc, lang)) : t('tajweed.disabledNote', lang)}</span>
        </span>
        <span class="switch" aria-hidden="true">
          <span class="switch__track ${on ? 'switch__track--on' : ''}"></span>
        </span>
      </button>`;
      })
      .join('');

    return `
    <section class="tajpick__family">
      <div class="tajpick__family-head">
        <span class="tajpick__family-swatch" style="background:${familyColor(family.id)}" aria-hidden="true"></span>
        <span class="tajpick__family-name">${escapeHTML(pickLocale(family.name, lang))}</span>
      </div>
      <div class="tajpick__swatches" role="group" aria-label="${t('tajweed.familyColor', lang, { family: pickLocale(family.name, lang) })}">
        ${swatches}
      </div>
      ${ruleRows}
    </section>`;
  }).join('');

  return `
  <div class="tajpick">
    <h2 id="modal-title-tajweed-settings">${t('tajweed.rulesTitle', lang)}</h2>
    <p class="view-sheet__intro">${t('tajweed.rulesHint', lang)}</p>

    <p class="tajpick__sample tajweed-sample" dir="rtl" lang="ar" aria-hidden="true">${t('tajweed.sample', lang)}</p>

    ${familyBlocks}

    <button type="button" class="btn btn--secondary tajpick__reset" data-action="tajweed-reset">
      ${icon('refresh', { size: 15 })} ${t('tajweed.reset', lang)}
    </button>
  </div>`;
}
