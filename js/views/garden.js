/**
 * views/garden.js (v4.6.0)
 * The Garden — the growth view driven by a lifetime of counted dhikr
 * (see domain/garden.js). Every counted recitation anywhere in the app
 * is a seed; the plant on this screen is those seeds made visible.
 *
 * (v4.6.0) The garden is ALIVE now: layered organic SVG plants (soft
 * gradient foliage instead of flat geometric silhouettes), a gentle sway
 * on the stems, drifting pollen motes, and a breathing hero. All motion
 * is ambient (infinite, allow-listed in tests/motion.test.js) and dies
 * under prefers-reduced-motion like everything else in the app.
 *
 * Framing stays positive per the app's anti-guilt policy: no countdowns
 * of what isn't — only what is planted and what it is growing toward.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, toEasternArabicNumerals } from '../core/utils.js';
import { gardenState, gardenAchievements, GARDEN_STAGES } from '../domain/garden.js';
import { VIEWS } from '../core/config.js';
import { buildHash } from '../core/router.js';
import { viewMenuButton } from '../ui/viewSheet.js';

const numFor = (lang, n) => (lang === 'ar' ? toEasternArabicNumerals(n) : String(n));

/** Leaf color layers — deeper in front, softer behind, all derived from the
 *  theme's success tone so the garden belongs to the design system. */
const LEAF_BACK = 'color-mix(in srgb, var(--color-success-text) 45%, var(--color-surface))';
const LEAF_MID = 'color-mix(in srgb, var(--color-success-text) 70%, var(--color-surface))';
const LEAF_FRONT = 'color-mix(in srgb, var(--color-success-text) 88%, var(--color-surface))';
const STEM_COLOR = 'color-mix(in srgb, var(--color-success-text) 55%, #5a4632)';
const SOIL_COLOR = 'color-mix(in srgb, #8a6a4f 70%, var(--color-surface))';

/** Shared scene furniture: a soft ground mound, grass blades, and drifting
 *  pollen motes. Rendered inside every plant so the stage never changes
 *  character between growth stages. */
function sceneSVG({ motes = 3 } = {}) {
  const blades = [8, 14, 26, 33, 40, 47]
    .map(
      (x, i) =>
        `<path class="garden-scene__blade garden-scene__blade--${i % 2}" d="M${x} 46 q1.2-4 2.6-6.4" fill="none" stroke="${LEAF_MID}" stroke-width="1.3" stroke-linecap="round"/>`
    )
    .join('');
  const moteList = Array.from({ length: motes })
    .map(
      (_, i) =>
        `<circle class="garden-scene__mote garden-scene__mote--${i + 1}" cx="${12 + i * 11}" cy="${18 - (i % 3) * 4}" r="${1.4 + (i % 2) * 0.7}" fill="var(--color-accent-raw)" opacity="0.55"/>`
    )
    .join('');
  return `
  <ellipse cx="24" cy="46.6" rx="15" ry="1.6" fill="${SOIL_COLOR}" opacity="0.35"/>
  <path d="M4 47q6-3 20-3t20 3" fill="none" stroke="${SOIL_COLOR}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  ${blades}
  ${moteList}`;
}

/** The plant illustration for a stage id — one inline SVG per growth form.
 *  (v4.6.0) Each plant is a LAYERED group: back foliage, mid foliage, the
 *  swaying stem group, front foliage — drawn with quadratic curves so the
 *  leaves read as foliage, not geometry. The whole stem group sways. */
function plantSVG(stageId) {
  const sway = (inner) => `<g class="garden-plant__sway">${inner}</g>`;
  const stem = (d, cls = '') =>
    `<path class="garden-plant__stem ${cls}" d="${d}" fill="none" stroke="${STEM_COLOR}" stroke-linecap="round"/>`;
  const leaf = (d, fill = LEAF_FRONT) =>
    `<path class="garden-plant__leaf" d="${d}" fill="${fill}"/>`;

  switch (stageId) {
    case 'seed':
      return `<svg viewBox="0 0 48 48" class="garden-plant" aria-hidden="true">
        ${sway(`
          ${stem('M24 44v-4', 'garden-plant__stem--short')}
          <ellipse class="garden-plant__seed" cx="24" cy="33" rx="4.6" ry="6.2" transform="rotate(-14 24 33)" fill="color-mix(in srgb, #8a6a4f 80%, var(--color-surface))"/>
          <path d="M22.5 30.5q-2.8 4.4-1 8.2" fill="none" stroke="color-mix(in srgb, var(--color-surface) 60%, #8a6a4f)" stroke-width="0.9" stroke-linecap="round"/>
          <ellipse cx="24" cy="34.8" rx="1.5" ry="2.2" transform="rotate(-14 24 34.8)" fill="${LEAF_MID}" opacity="0.7"/>
        `)}
        ${sceneSVG()}
      </svg>`;
    case 'sprout':
      return `<svg viewBox="0 0 48 48" class="garden-plant" aria-hidden="true">
        <g class="garden-plant__foliage--back">
          ${leaf('M24 30c0-7.4-4.8-10.8-11-10.8 0 7.4 4.8 10.8 11 10.8Z', LEAF_BACK)}
        </g>
        ${sway(`
          ${stem('M24 44V26', 'garden-plant__stem--main')}
          ${leaf('M24 26c0-6.6-4-9.8-9.4-9.8 0 6.6 4 9.8 9.4 9.8Z', LEAF_MID)}
          ${leaf('M24 32c0-5.2 3.6-7.8 8.4-7.8 0 5.2-3.6 7.8-8.4 7.8Z', LEAF_FRONT)}
        `)}
        ${sceneSVG()}
      </svg>`;
    case 'sapling':
      return `<svg viewBox="0 0 48 48" class="garden-plant" aria-hidden="true">
        <g class="garden-plant__foliage--back">
          ${leaf('M24 20c0-8.6-5.4-12.4-12.6-12.4 0 8.6 5.4 12.4 12.6 12.4Z', LEAF_BACK)}
          ${leaf('M24 20c0-8.6 5.4-12.4 12.6-12.4 0 8.6-5.4 12.4-12.6 12.4Z', LEAF_BACK)}
        </g>
        ${sway(`
          ${stem('M24 44V14', 'garden-plant__stem--main')}
          ${stem('M24 26q-6-1.4-8.6-5.2', 'garden-plant__stem--branch')}
          ${leaf('M24 14c0-7-4.4-10-10.4-10 0 7 4.4 10 10.4 10Z', LEAF_MID)}
          ${leaf('M24 22c0-5.4 3.4-8 8-8 0 5.4-3.4 8-8 8Z', LEAF_FRONT)}
          ${leaf('M24 31c0-4.4 2.9-6.6 6.6-6.6 0 4.4-2.9 6.6-6.6 6.6Z', LEAF_FRONT)}
        `)}
        ${sceneSVG({ motes: 4 })}
      </svg>`;
    case 'youngTree':
      return `<svg viewBox="0 0 48 48" class="garden-plant" aria-hidden="true">
        <g class="garden-plant__foliage--back">
          ${leaf('M24 22c0-9-5.6-13-13-13 0 9 5.6 13 13 13Z', LEAF_BACK)}
          ${leaf('M24 22c0-9 5.6-13 13-13 0 9-5.6 13-13 13Z', LEAF_BACK)}
          ${leaf('M24 34c0-6.6 4.2-9.6 9.8-9.6 0 6.6-4.2 9.6-9.8 9.6Z', LEAF_BACK)}
        </g>
        ${sway(`
          ${stem('M24 44V20', 'garden-plant__stem--main')}
          ${stem('M24 30q-7-1.6-10-6', 'garden-plant__stem--branch')}
          ${stem('M24 27q6.6-1.8 9.4-6.4', 'garden-plant__stem--branch garden-plant__stem--alt')}
          ${leaf('M24 20c0-8-5.2-11.6-12-11.6 0 8 5.2 11.6 12 11.6Z', LEAF_MID)}
          ${leaf('M24 20c0-8 5.2-11.6 12-11.6 0 8-5.2 11.6-12 11.6Z', LEAF_MID)}
          ${leaf('M24 30c0-6 3.8-8.6 8.8-8.6 0 6-3.8 8.6-8.8 8.6Z', LEAF_FRONT)}
          ${leaf('M24 36c0-4.4 2.8-6.4 6.4-6.4 0 4.4-2.8 6.4-6.4 6.4Z', LEAF_FRONT)}
          <circle class="garden-plant__berry" cx="17.5" cy="15.5" r="1.3" fill="var(--color-accent-raw)"/>
          <circle class="garden-plant__berry" cx="31.5" cy="13.5" r="1.1" fill="var(--color-accent-raw)" opacity="0.8"/>
        `)}
        ${sceneSVG({ motes: 4 })}
      </svg>`;
    case 'tree':
      return `<svg viewBox="0 0 48 48" class="garden-plant" aria-hidden="true">
        <g class="garden-plant__foliage--back">
          ${leaf('M24 14 14.6 27h5.8L10 37h9.4', LEAF_BACK)}
          ${leaf('M24 14l9.4 13h-5.8L38 37h-9.4', LEAF_BACK)}
        </g>
        ${sway(`
          ${stem('M23 44V22', 'garden-plant__stem--main')}
          ${stem('M23 27c0-4.6 2.2-5.6 5-8.2', 'garden-plant__stem--branch')}
          ${stem('M23 30c0-3.8-2-4.8-5-6.8', 'garden-plant__stem--branch garden-plant__stem--alt')}
          ${leaf('M24 10 16 21.6h5.2L11.6 30.4h8.4v13.6', LEAF_MID)}
          ${leaf('M24 10l8 11.6h-5.2l9.6 8.8h-8.4v13.6', LEAF_MID)}
          ${leaf('M23 36c0-4.4 2.9-6 6.4-6 0 4.4-2.9 6-6.4 6Z', LEAF_FRONT)}
          <circle class="garden-plant__berry" cx="15" cy="25" r="1.2" fill="var(--color-accent-raw)"/>
          <circle class="garden-plant__berry" cx="33.6" cy="22" r="1.2" fill="var(--color-accent-raw)"/>
          <circle class="garden-plant__berry" cx="27" cy="33" r="1" fill="var(--color-accent-raw)" opacity="0.8"/>
        `)}
        ${sceneSVG({ motes: 5 })}
      </svg>`;
    default: // grove — the final form, two trees on one mound
      return `<svg viewBox="0 0 48 48" class="garden-plant garden-plant--grove" aria-hidden="true">
        <g class="garden-plant__foliage--back">
          ${leaf('M17 15 9 26h4.4L7 34h7v10', LEAF_BACK)}
          ${leaf('M31 16 25 26.6h3.8L23.6 35h8.4v9', LEAF_BACK)}
        </g>
        ${sway(`
          ${stem('M17 44V24', 'garden-plant__stem--main')}
          ${stem('M17 27c0-3.2 1.7-4 3.8-6', 'garden-plant__stem--branch')}
          ${leaf('M17 12 10 23h4L8 30h7v14', LEAF_MID)}
          ${leaf('M17 12l7 11h-4l6 7h-9v14', LEAF_MID)}
          ${stem('M31 44V26', 'garden-plant__stem--alt')}
          ${leaf('M31 14 25 23.4h3.4l-5.4 7h8v13.6', LEAF_FRONT)}
          ${leaf('M31 14l6 9.4h-3.4l5.4 7h-8', LEAF_MID)}
          <circle class="garden-plant__berry" cx="11.6" cy="27" r="1.1" fill="var(--color-accent-raw)"/>
          <circle class="garden-plant__berry" cx="36.4" cy="25.4" r="1.1" fill="var(--color-accent-raw)"/>
          <circle class="garden-plant__berry" cx="23" cy="31" r="1" fill="var(--color-accent-raw)" opacity="0.75"/>
        `)}
        ${sceneSVG({ motes: 5 })}
      </svg>`;
  }
}

export function renderGarden(state) {
  const lang = state.settings.language;
  const stats = state.statistics || {};
  const garden = gardenState(stats.totalRecitations || 0);
  const harvest = gardenAchievements(stats.totalRecitations || 0);
  const pct = Math.round(garden.progress * 100);

  const timelineNodes = GARDEN_STAGES.map((stage, i) => {
    const reached = i <= garden.stageIndex;
    const current = i === garden.stageIndex;
    return `
      <li class="garden-timeline__node ${reached ? 'garden-timeline__node--reached' : ''} ${current ? 'garden-timeline__node--current' : ''}" title="${escapeHTML(t(`garden.stage.${stage.id}`, lang))}">
        <span class="garden-timeline__icon">${icon(stage.icon, { size: 18 })}</span>
        <span class="garden-timeline__label">${escapeHTML(t(`garden.stage.${stage.id}`, lang))}</span>
        <span class="garden-timeline__count" dir="ltr">${numFor(lang, stage.at)}</span>
      </li>`;
  }).join('');

  const harvestChips = harvest.length
    ? harvest
        .map(
          (stage) => `
        <span class="garden-harvest__chip">
          ${icon(stage.icon, { size: 15 })}
          <span>${escapeHTML(t(`garden.stage.${stage.id}`, lang))}</span>
        </span>`
        )
        .join('')
    : '';

  return `
  <section class="view view--garden">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('garden.title', lang)}</h1>
      ${viewMenuButton('garden', lang, { labelKey: 'viewMenu.garden' })}
    </div>
    <p class="view__subtitle">${t('garden.subtitle', lang)}</p>

    <div class="garden-hero panel garden-hero--living">
      <div class="garden-hero__plant">${plantSVG(garden.stage.id)}</div>
      <div class="garden-hero__side">
        <p class="garden-hero__stage">${escapeHTML(t(`garden.stage.${garden.stage.id}`, lang))}</p>
        <p class="garden-hero__planted">
          <strong dir="ltr">${numFor(lang, garden.planted)}</strong>
          <span>${t('garden.seedsPlanted', lang)}</span>
        </p>
        ${
          garden.next
            ? `
        <div class="garden-hero__progress">
          <div class="garden-hero__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${escapeHTML(t('garden.progressLabel', lang))}">
            <span class="garden-hero__bar-fill" style="--fill:${pct}%"></span>
          </div>
          <p class="garden-hero__bar-caption">
            ${t('garden.growingToward', lang, { stage: t(`garden.stage.${garden.next.id}`, lang), n: numFor(lang, garden.toNext) })}
          </p>
        </div>`
            : `<p class="garden-hero__bar-caption">${t('garden.finalForm', lang)}</p>`
        }
      </div>
    </div>

    <div class="panel garden-timeline-panel">
      <h2 class="garden-timeline__title">${t('garden.timeline', lang)}</h2>
      <ol class="garden-timeline" dir="ltr">${timelineNodes}</ol>
    </div>

    ${
      harvestChips
        ? `
    <div class="panel garden-harvest">
      <h2 class="garden-harvest__title">${t('garden.harvest', lang)}</h2>
      <div class="garden-harvest__row">${harvestChips}</div>
    </div>`
        : ''
    }

    <a class="garden-link" href="${buildHash(VIEWS.STATISTICS)}" data-action="navigate" data-view="${VIEWS.STATISTICS}">
      ${icon('stats', { size: 16 })}
      <span>${t('garden.seeStatistics', lang)}</span>
    </a>
  </section>`;
}
