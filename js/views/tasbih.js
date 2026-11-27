/**
 * views/tasbih.js
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { selectors } from '../core/state.js';
import { viewMenuButton } from '../ui/viewSheet.js';
import { isSupported as floatingCounterSupported } from '../services/floatingCounter.js';
import * as countUndo from '../services/countUndo.js';
import { resolveMeaning, MORE_CATEGORY_ID } from '../domain/tasbihMeaning.js';

const PRESETS = [
  {
    id: 'subhanallah',
    ar: '\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u0644\u0651\u0647\u0650',
    en: 'SubhanAllah',
    target: 33,
  },
  {
    id: 'alhamdulillah',
    ar: '\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0644\u0651\u0647\u0650',
    en: 'Alhamdulillah',
    target: 33,
  },
  {
    id: 'allahuakbar',
    ar: '\u0627\u0644\u0644\u0651\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631',
    en: 'Allahu Akbar',
    target: 34,
  },
  {
    id: 'astaghfirullah',
    ar: '\u0623\u064E\u0633ْتَغْفِرُ اللَّه',
    en: 'Astaghfirullah',
    target: 100,
  },
  {
    id: 'lahawla',
    ar: '\u0644\u0627 \u062D\u0648\u0644 \u0648\u0644\u0627 \u0642\u0648\u0629 \u0625\u0644\u0627 \u0628\u0627\u0644\u0644\u0647',
    en: 'La hawla wa la quwwata illa billah',
    target: 100,
  },
  {
    id: 'salawat',
    ar: '\u0627\u0644\u0644\u0647\u0645 \u0635\u0644 \u0639\u0644\u0649 \u0645\u062D\u0645\u062F',
    en: 'Allahumma salli \u2019ala Muhammad',
    target: 100,
  },
];

export function renderTasbih(state) {
  const lang = state.settings.language;
  const customs = Array.isArray(state.tasbihCustom) ? state.tasbihCustom.filter(Boolean) : [];
  const activeId = state.tasbih.activeItemId || 'subhanallah';
  const activePreset = PRESETS.find((p) => p.id === activeId);
  // User-authored phrases share the dial: same counter-key path
  // ('tasbih:'+id), same increment(), each with its own named goal.
  const activeCustom = !activePreset ? customs.find((c) => c.id === activeId) : null;
  const active = activePreset || activeCustom || PRESETS[0];
  const isCustom = !activePreset && activeCustom != null;
  const counter = selectors.getCounter(state, 'tasbih:' + active.id) || {
    count: 0,
    target: active.target,
    completedCycles: 0,
  };
  const pct = Math.min(100, Math.round((counter.count / Math.max(1, counter.target)) * 100));
  const lifetime = state.statistics.totalRecitations;

  const chips = PRESETS.map(
    (p) => `
    <button type="button" class="chip chip--phrase ${p.id === active.id ? 'chip--phrase-active' : ''}" data-action="tasbih-select" data-phrase-id="${p.id}" data-target="${p.target}" aria-pressed="${p.id === active.id}">
      ${escapeHTML(lang === 'ar' ? p.ar : p.en)}
    </button>`
  ).join('');
  const customChips = customs
    .map(
      (c) => `
    <span class="chip-row__group">
      <button type="button" class="chip chip--phrase chip--custom ${c.id === active.id ? 'chip--phrase-active' : ''}" data-action="tasbih-select" data-phrase-id="${escapeHTML(c.id)}" data-target="${c.target}" aria-pressed="${c.id === active.id}">
        ${escapeHTML(c.text)}
      </button>
      <button type="button" class="icon-btn" data-action="tasbih-custom-remove" data-id="${escapeHTML(c.id)}" aria-label="${t('tasbih.customRemove', lang)}" title="${t('tasbih.customRemove', lang)}">
        ${icon('trash', { size: 16 })}
      </button>
    </span>`
    )
    .join('');
  // Preset phrases ship Arabic + UI-language forms; a custom phrase is the
  // user's own text in one field — rendered verbatim (escaped), dir="auto",
  // with no language assumption.
  const stageText = isCustom ? activeCustom.text : active.ar;
  const stageAttrs = isCustom ? 'dir="auto"' : 'lang="ar" dir="rtl"';

  return `
  <section class="view view--tasbih">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.tasbih', lang)}</h1>
      ${viewMenuButton('tasbih', lang, { labelKey: 'viewMenu.tasbih' })}
    </div>

    <div class="chip-row chip-row--scroll">${chips}${customChips}</div>

    <!-- (v4.5, APP-FLOW I7) the whole tasbih stage counts — the dial is the
         progress visual first (and the keyboard/SR control); tapping the
         phrase, the ring, or anywhere in the stage increments, like the
         azkar card bodies. -->
    <div class="tasbih-stage" data-action="tasbih-tap" data-phrase-id="${escapeHTML(active.id)}" data-target="${escapeHTML(String(counter.target))}">
      <p class="tasbih-stage__arabic" ${stageAttrs}>${escapeHTML(stageText)}</p>
      <button type="button" class="tasbih-dial" dir="ltr" data-action="tasbih-tap" data-phrase-id="${escapeHTML(active.id)}" data-target="${escapeHTML(String(counter.target))}" aria-label="${t('focus.tapToCount', lang)} — ${t('focus.progress', lang, { count: counter.count, target: counter.target })}">
        <!-- (v5.17.15) The ring is drawn at 200-unit scale and scaled to the
             dial by CSS, so the geometry lives in ONE place: change
             --tasbih-dial-size and the ring, the bloom and the numeral all
             follow. Keeping the viewBox fixed is what makes that possible. -->
        <svg class="tasbih-dial__ring" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          <circle cx="100" cy="100" r="88" class="tasbih-dial__track"/>
          <circle cx="100" cy="100" r="88" class="tasbih-dial__fill" style="--pct:${pct}"/>
        </svg>
        <span class="tasbih-dial__bloom" aria-hidden="true"></span>
        <!-- No aria-live here: every tap is announced once by the global
             #counter-announcer (services/tasbih.js) — a second live region
             on the count made each tap double-announced. -->
        <span class="tasbih-dial__count" aria-hidden="true">${escapeHTML(String(counter.count))}</span>
        <span class="tasbih-dial__target" aria-hidden="true">/ ${escapeHTML(String(counter.target))}</span>
      </button>
      <p class="tasbih-stage__cycles">${t('tasbih.cyclesCompleted', lang)}: ${escapeHTML(String(counter.completedCycles))}</p>
    </div>

    <div class="tasbih-controls">
      ${
        // (v5.17.183, C15) quiet Meaning affordance for the active phrase.
        // It lives in the controls row — OUTSIDE the tap-to-count stage —
        // so reading it never increments, and the card opens inline below,
        // never over the dial.
        `<button type="button" class="btn btn--ghost" data-action="tasbih-meaning-toggle" aria-expanded="${state.ui?.tasbihMeaningOpen === true}" aria-controls="tasbih-meaning-card">${icon('book-open', { size: 14 })} ${t('tasbih.meaning', lang)}</button>`
      }
      ${
        // (v5.17.182, C14) quiet one-level undo, live ~60s after a tap on
        // THIS view — no toast, no redo, gone when the window passes.
        countUndo.getUndoableTap('tasbih')
          ? `<button type="button" class="btn btn--ghost" data-action="count-undo">${t('tasbih.undoLastTap', lang)}</button>`
          : ''
      }
      <button type="button" class="btn btn--ghost" data-action="tasbih-reset" data-phrase-id="${escapeHTML(active.id)}" data-target="${escapeHTML(String(counter.target))}">${t('tasbih.reset', lang)}</button>
    </div>

    ${state.ui?.tasbihMeaningOpen === true ? meaningCardHTML(state, active, isCustom, lang) : ''}

    <details class="panel tasbih-options">
      <summary>${t('tasbih.optionsTitle', lang)}</summary>
      <div class="tasbih-options__body">
        ${
          floatingCounterSupported()
            ? `<button type="button" class="btn btn--ghost" data-action="tasbih-float" data-phrase-id="${escapeHTML(active.id)}" aria-pressed="${state.ui?.tasbihFloat === true}">${icon('expand', { size: 14 })} ${t('tasbih.float', lang)}</button>`
            : ''
        }
        <div class="target-stepper">
          <span>${t('tasbih.target', lang)}</span>
          <button type="button" class="icon-btn" data-action="tasbih-target-step" data-phrase-id="${escapeHTML(active.id)}" data-delta="-1" aria-label="${t('tasbih.targetDown', lang)}">−</button>
          <span class="target-stepper__value" aria-live="polite">${escapeHTML(String(counter.target))}</span>
          <button type="button" class="icon-btn" data-action="tasbih-target-step" data-phrase-id="${escapeHTML(active.id)}" data-delta="1" aria-label="${t('tasbih.targetUp', lang)}">+</button>
        </div>
        <div class="chip-row target-presets" role="group" aria-label="${t('tasbih.targetPresets', lang)}">
          ${[33, 100, 500, 1000]
            .map(
              (n) => `
          <button type="button" class="chip${counter.target === n ? ' chip--active' : ''}" data-action="tasbih-target-set" data-phrase-id="${escapeHTML(active.id)}" data-target="${n}" aria-pressed="${counter.target === n}">${n}</button>`
            )
            .join('')}
        </div>
        <div class="tasbih-options__custom">
          <h2>${t('tasbih.customPhrase', lang)}</h2>
          <label class="field-label" for="tasbih-custom-text">${t('tasbih.customPhrase', lang)}</label>
          <input id="tasbih-custom-text" class="input" type="text" data-bind="tasbih-custom-text" maxlength="500" autocomplete="off" dir="auto" placeholder="${t('tasbih.customPlaceholder', lang)}">
          <label class="field-label" for="tasbih-custom-target">${t('tasbih.target', lang)}</label>
          <input id="tasbih-custom-target" class="input" type="number" data-bind="tasbih-custom-target" value="33" min="1" max="100000">
          <div class="panel__actions">
            <button type="button" class="btn btn--primary btn--sm" data-action="tasbih-custom-save">${t('tasbih.customAdd', lang)}</button>
          </div>
        </div>
      </div>
    </details>

    <p class="tasbih-lifetime">${icon('stats', { size: 14 })} ${t('tasbih.lifetime', lang)}: ${lifetime}</p>
  </section>`;
}

export { PRESETS };

/**
 * (v5.17.183, C15) the dismissible Meaning card. Everything shown is
 * resolved by domain/tasbihMeaning.js from the user's effective library
 * — no authored text here. Virtue and source lines render ONLY for a
 * granted exact match; the glorifications and fallbacks close with the
 * honest link to the General Remembrance section; a custom phrase gets
 * the "your own words" state.
 */
function meaningCardHTML(state, active, isCustom, lang) {
  const meaning = resolveMeaning(state, active.id, isCustom);
  const moreLink = `<a class="tasbih-meaning__more" href="${buildHash('category', { id: MORE_CATEGORY_ID })}" data-action="navigate" data-view="category" data-id="${MORE_CATEGORY_ID}">${t('tasbih.meaningMore', lang)}</a>`;

  let body = '';
  if (meaning.kind === 'custom') {
    body = `<p class="tasbih-meaning__note">${t('tasbih.meaningOwnWords', lang)}</p>`;
  } else if (meaning.kind === 'link') {
    body = `<p class="tasbih-meaning__note">${t('tasbih.meaningUnavailable', lang)}</p>${moreLink}`;
  } else {
    const item = meaning.item;
    const transliteration = String(item.transliteration || '').trim();
    const translation = String(item.translation?.[lang] || item.translation?.en || '').trim();
    const translationLang = item.translation?.[lang] ? lang : 'en';
    const rows = [];
    if (transliteration) {
      rows.push(
        `<p class="tasbih-meaning__translit" lang="en" dir="ltr">${escapeHTML(transliteration)}</p>`
      );
    }
    if (translation) {
      rows.push(
        `<p class="tasbih-meaning__translation" lang="${translationLang}">${escapeHTML(translation)}</p>`
      );
    }
    if (meaning.kind === 'match') {
      const virtue = String(item.virtues?.[lang] || item.virtues?.en || '').trim();
      const virtueLang = item.virtues?.[lang] ? lang : 'en';
      if (virtue) {
        rows.push(
          `<p class="tasbih-meaning__virtue" lang="${virtueLang}"><span class="tasbih-meaning__label">${t('tasbih.meaningVirtue', lang)}</span> ${escapeHTML(virtue)}</p>`
        );
      }
      const ref = item.reference || {};
      const refText = [ref.collection, ref.hadith]
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .join(' ');
      const grade = String(item.grade || ref.grading || '').trim();
      if (refText || grade) {
        rows.push(
          `<p class="tasbih-meaning__source"><span class="tasbih-meaning__label">${t('tasbih.meaningSource', lang)}</span> ${escapeHTML([refText, grade].filter(Boolean).join(' · '))}</p>`
        );
      }
    }
    rows.push(moreLink);
    body = rows.join('');
  }

  const phraseLabel = isCustom ? active.text : lang === 'ar' ? active.ar : active.en;
  return `
    <div class="tasbih-meaning" id="tasbih-meaning-card" role="region" aria-label="${t('tasbih.meaning', lang)}">
      <div class="tasbih-meaning__head">
        <span class="tasbih-meaning__phrase" dir="auto">${escapeHTML(String(phraseLabel || ''))}</span>
        <button type="button" class="icon-btn" data-action="tasbih-meaning-toggle" aria-label="${t('tasbih.meaningClose', lang)}" title="${t('tasbih.meaningClose', lang)}">${icon('close', { size: 15 })}</button>
      </div>
      ${body}
    </div>`;
}
