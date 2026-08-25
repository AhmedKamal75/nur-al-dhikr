/**
 * views/tasbih.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { getCounter } from '../tasbih.js';

const PRESETS = [
  { id: 'subhanallah', ar: '\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u0644\u0651\u0647\u0650', en: 'SubhanAllah', target: 33 },
  { id: 'alhamdulillah', ar: '\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0644\u0651\u0647\u0650', en: 'Alhamdulillah', target: 33 },
  { id: 'allahuakbar', ar: '\u0627\u0644\u0644\u0651\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631', en: 'Allahu Akbar', target: 34 },
  { id: 'astaghfirullah', ar: '\u0623\u064E\u0633ْتَغْفِرُ اللَّه', en: 'Astaghfirullah', target: 100 },
  { id: 'lahawla', ar: '\u0644\u0627 \u062D\u0648\u0644 \u0648\u0644\u0627 \u0642\u0648\u0629 \u0625\u0644\u0627 \u0628\u0627\u0644\u0644\u0647', en: 'La hawla wa la quwwata illa billah', target: 100 },
  { id: 'salawat', ar: '\u0627\u0644\u0644\u0647\u0645 \u0635\u0644 \u0639\u0644\u0649 \u0645\u062D\u0645\u062F', en: 'Allahumma salli \u2019ala Muhammad', target: 100 }
];

export function renderTasbih(state) {
  const lang = state.settings.language;
  const activeId = state.tasbih.activeItemId || 'subhanallah';
  const activePreset = PRESETS.find((p) => p.id === activeId) || PRESETS[0];
  const counter = getCounter('tasbih:' + activePreset.id, activePreset.target);
  const pct = Math.min(100, Math.round((counter.count / Math.max(1, counter.target)) * 100));
  const lifetime = state.statistics.totalRecitations;

  const chips = PRESETS.map((p) => `
    <button type="button" class="chip chip--phrase ${p.id === activePreset.id ? 'chip--phrase-active' : ''}" data-action="tasbih-select" data-phrase-id="${p.id}" data-target="${p.target}">
      ${escapeHTML(p.en)}
    </button>`).join('');

  return `
  <section class="view view--tasbih">
    <h1 class="view__title">${t('nav.tasbih', lang)}</h1>

    <div class="chip-row chip-row--scroll">${chips}</div>

    <div class="tasbih-stage">
      <p class="tasbih-stage__arabic" lang="ar" dir="rtl">${escapeHTML(activePreset.ar)}</p>
      <button type="button" class="tasbih-dial" dir="ltr" data-action="tasbih-tap" data-phrase-id="${activePreset.id}" data-target="${counter.target}" aria-label="${t('focus.tapToCount', lang)}">
        <svg class="tasbih-dial__ring" viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
          <circle cx="100" cy="100" r="88" class="tasbih-dial__track"/>
          <circle cx="100" cy="100" r="88" class="tasbih-dial__fill" style="--pct:${pct}"/>
        </svg>
        <span class="tasbih-dial__count" aria-live="polite" aria-atomic="true">${counter.count}</span>
        <span class="tasbih-dial__target">/ ${counter.target}</span>
      </button>
      <p class="tasbih-stage__cycles">${t('tasbih.cyclesCompleted', lang)}: ${counter.completedCycles}</p>
    </div>

    <div class="tasbih-controls">
      <button type="button" class="btn btn--ghost" data-action="tasbih-reset" data-phrase-id="${activePreset.id}" data-target="${counter.target}">${t('tasbih.reset', lang)}</button>
      <div class="target-stepper">
        <span>${t('tasbih.target', lang)}</span>
        <button type="button" class="icon-btn" data-action="tasbih-target-step" data-phrase-id="${activePreset.id}" data-delta="-1">\u2212</button>
        <span class="target-stepper__value">${counter.target}</span>
        <button type="button" class="icon-btn" data-action="tasbih-target-step" data-phrase-id="${activePreset.id}" data-delta="1">+</button>
      </div>
    </div>

    <p class="tasbih-lifetime">${icon('flame', { size: 15 })} ${t('tasbih.lifetime', lang)}: ${lifetime}</p>
  </section>`;
}

export { PRESETS };
