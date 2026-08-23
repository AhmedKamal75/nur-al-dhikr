/**
 * views/settings.js
 */
import { t, availableLanguages } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { PALETTES, SHAPES, THEME_MODES, QURAN_RECITERS } from '../config.js';

export function renderSettings(state) {
  const lang = state.settings.language;
  const s = state.settings;

  const paletteSwatches = PALETTES.map((p) => `
    <button type="button" class="swatch ${s.palette === p.id ? 'swatch--active' : ''}" style="--sw-color:${p.primary}" data-action="set-setting" data-key="palette" data-value="${p.id}" aria-label="${escapeHTML(pickLocale(p.name, lang))}" title="${escapeHTML(pickLocale(p.name, lang))}"></button>`).join('');

  const shapeButtons = SHAPES.map((sh) => `
    <button type="button" class="shape-btn ${s.shape === sh.id ? 'shape-btn--active' : ''}" style="--sh-radius:${sh.radius}" data-action="set-setting" data-key="shape" data-value="${sh.id}" aria-label="${escapeHTML(pickLocale(sh.name, lang))}" aria-pressed="${s.shape === sh.id}" title="${escapeHTML(pickLocale(sh.name, lang))}"><span class="shape-btn__swatch"></span><span class="shape-btn__label">${escapeHTML(pickLocale(sh.name, lang))}</span></button>`).join('');

  const modeButtons = THEME_MODES.map((m) => `
    <button type="button" class="segmented__btn ${s.themeMode === m ? 'segmented__btn--active' : ''}" data-action="set-setting" data-key="themeMode" data-value="${m}">${t('settings.themeMode.' + m, lang)}</button>`).join('');

  const langButtons = availableLanguages().map((l) => `
    <button type="button" class="segmented__btn ${s.language === l ? 'segmented__btn--active' : ''}" data-action="set-setting" data-key="language" data-value="${l}">${l === 'en' ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064A\u0629'}</button>`).join('');

  const reciterRows = QURAN_RECITERS.map((r) => `
    <button type="button" class="reciter-row ${s.reciter === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${r.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
      ${s.reciter === r.id ? icon('check', { size: 16 }) : ''}
    </button>`).join('');

  const reminders = state.reminders.map((r) => `
    <div class="reminder-row">
      <label class="switch">
        <input type="checkbox" data-action="toggle-reminder" data-id="${escapeHTML(r.id)}" ${r.enabled ? 'checked' : ''} />
        <span class="switch__track"></span>
      </label>
      <span class="reminder-row__label">${escapeHTML(r.label || r.time)}</span>
      <span class="reminder-row__time">${escapeHTML(r.time)}</span>
      <button type="button" class="icon-btn" data-action="delete-reminder" data-id="${escapeHTML(r.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 16 })}</button>
    </div>`).join('');

  return `
  <section class="view view--settings">
    <h1 class="view__title">${t('settings.title', lang)}</h1>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.language', lang)}</h2></div>
      <div class="segmented">${langButtons}</div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.appearance', lang)}</h2></div>
      <p class="field-label">${t('settings.theme', lang)}</p>
      <div class="segmented">${modeButtons}</div>
      <p class="field-label">${t('settings.palette', lang)}</p>
      <div class="swatch-row">${paletteSwatches}</div>
      <p class="field-label">${t('settings.shape', lang)}</p>
      <div class="shape-row">${shapeButtons}</div>
      <p class="field-label">${t('settings.fontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="1.4" step="0.05" value="${s.fontScale}" data-bind="fontScale" />
      <p class="field-label">${t('settings.arabicFontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="1.6" step="0.05" value="${s.arabicFontScale}" data-bind="arabicFontScale" />
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.accessibility', lang)}</h2></div>
      ${toggleRow('reduceMotion', s.reduceMotion, t('settings.reduceMotion', lang))}
      ${toggleRow('highContrast', s.highContrast, t('settings.highContrast', lang))}
      ${toggleRow('soundEnabled', s.soundEnabled, t('settings.sound', lang))}
      ${toggleRow('hapticsEnabled', s.hapticsEnabled, t('settings.haptics', lang))}
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.content', lang)}</h2></div>
      ${toggleRow('showTransliteration', s.showTransliteration, t('settings.showTransliteration', lang))}
      ${toggleRow('showTranslation', s.showTranslation, t('settings.showTranslation', lang))}
      ${toggleRow('autoAdvanceFocus', s.autoAdvanceFocus, t('settings.autoAdvanceFocus', lang))}
      <p class="field-label">${t('settings.dailyGoal', lang)}</p>
      <input type="number" class="input" min="1" max="10000" value="${s.dailyGoal}" data-bind="dailyGoal" />
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.reciter', lang)}</h2></div>
      <p class="panel__subtext">${t('settings.reciterHint', lang)}</p>
      <div class="reciter-list">${reciterRows}</div>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h2>${t('settings.notifications', lang)}</h2>
        <button type="button" class="btn btn--ghost btn--sm" data-action="add-reminder">${icon('plus', { size: 14 })} ${t('settings.addReminder', lang)}</button>
      </div>
      ${reminders || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('settings.data', lang)}</h2></div>
      <div class="btn-stack">
        <button type="button" class="btn btn--secondary" data-action="export-backup">${icon('download', { size: 16 })} ${t('settings.exportBackup', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="import-backup">${icon('upload', { size: 16 })} ${t('settings.importBackup', lang)}</button>
        <button type="button" class="btn btn--danger" data-action="reset-all-data">${icon('trash', { size: 16 })} ${t('settings.resetData', lang)}</button>
      </div>
    </section>
  </section>`;
}

function toggleRow(key, value, label) {
  return `
  <div class="toggle-row">
    <span class="toggle-row__label">${escapeHTML(label)}</span>
    <label class="switch">
      <input type="checkbox" data-action="toggle-setting" data-key="${key}" ${value ? 'checked' : ''} />
      <span class="switch__track"></span>
    </label>
  </div>`;
}
