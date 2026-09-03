/**
 * views/settings.js (v5.0.0 redesign)
 * Settings reorganized into calm, purposeful sections — one panel per
 * intent, each header carrying an icon and a one-line "what this does".
 * New v5 sections: Counting feedback (vibration / tick sound / tap
 * ripple), the global card-field defaults, and content restore — plus
 * the schedules manager link. Every control keeps its existing
 * data-action contract (set-setting / toggle-setting / data-bind …).
 */
import { t, availableLanguages } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import {
  PALETTES,
  SHAPES,
  THEME_MODES,
  QURAN_RECITERS,
  TRANSLATION_EDITIONS,
  APP_VERSION,
  VIEWS,
} from '../core/config.js';
import { daysSinceBackup, formatBytes, dryRunVerdict } from '../services/dataHealth.js';
import { buildHash } from '../core/router.js';
import { CARD_FIELD_KEYS } from '../domain/contentLens.js';

const FIELD_LABELS = {
  transliteration: 'content.fieldTranslit',
  translation: 'content.fieldTranslation',
  virtues: 'content.fieldVirtues',
  reference: 'content.fieldReference',
  grade: 'content.fieldGrade',
  notes: 'content.fieldNotes',
};

/** A settings section header with an icon and an optional hint line. */
function panelHeader(title, iconName, lang, hintKey) {
  return `
  <div class="panel__header panel__header--icon">
    <span class="panel__icon">${icon(iconName, { size: 18 })}</span>
    <h2>${escapeHTML(title)}</h2>
  </div>
  ${hintKey ? `<p class="panel__subtext">${t(hintKey, lang)}</p>` : ''}`;
}

/** A clickable toggle row for NON-settings-boolean state (the same switch
 *  visual as toggleRow, but dispatches a click handler). */
function clickToggleRow(action, dataset, label, on) {
  const attrs = Object.entries(dataset)
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
    .join(' ');
  return `
  <button type="button" class="toggle-row" data-action="${action}" ${attrs} aria-pressed="${on}" aria-label="${escapeHTML(label)}">
    <span class="toggle-row__label">${escapeHTML(label)}</span>
    <span class="switch" aria-hidden="true">
      <span class="switch__track ${on ? 'switch__track--on' : ''}"></span>
    </span>
  </button>`;
}

export function renderSettings(state) {
  const lang = state.settings.language;
  const s = state.settings;

  const paletteSwatches = PALETTES.map(
    (p) => `
    <button type="button" class="swatch ${s.palette === p.id ? 'swatch--active' : ''}" style="--sw-color:${p.primary}" data-action="set-setting" data-key="palette" data-value="${p.id}" aria-label="${escapeHTML(pickLocale(p.name, lang))}" aria-pressed="${s.palette === p.id}" title="${escapeHTML(pickLocale(p.name, lang))}"></button>`
  ).join('');

  const shapeButtons = SHAPES.map(
    (sh) => `
    <button type="button" class="shape-btn ${s.shape === sh.id ? 'shape-btn--active' : ''}" style="--sh-radius:${sh.radius}" data-action="set-setting" data-key="shape" data-value="${sh.id}" aria-label="${escapeHTML(pickLocale(sh.name, lang))}" aria-pressed="${s.shape === sh.id}" title="${escapeHTML(pickLocale(sh.name, lang))}"><span class="shape-btn__swatch"></span><span class="shape-btn__label">${escapeHTML(pickLocale(sh.name, lang))}</span></button>`
  ).join('');

  const modeButtons = THEME_MODES.map(
    (m) => `
    <button type="button" class="segmented__btn ${s.themeMode === m ? 'segmented__btn--active' : ''}" data-action="set-setting" data-key="themeMode" data-value="${m}" aria-pressed="${s.themeMode === m}">${t('settings.themeMode.' + m, lang)}</button>`
  ).join('');

  const langButtons = availableLanguages()
    .map(
      (l) => `
    <button type="button" class="segmented__btn ${s.language === l ? 'segmented__btn--active' : ''}" data-action="set-setting" data-key="language" data-value="${l}" aria-pressed="${s.language === l}">${l === 'en' ? 'English' : 'العربية'}</button>`
    )
    .join('');

  const reciterRows = QURAN_RECITERS.map(
    (r) => `
    <button type="button" class="reciter-row ${s.reciter === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${r.id}" aria-pressed="${s.reciter === r.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
      ${s.reciter === r.id ? icon('check', { size: 16 }) : ''}
    </button>`
  ).join('');

  // v3.15: Qur'an translation edition picker. Each option keeps its own
  // native name (script never translated away) with the translator as the
  // secondary line — same contract as the reciter list.
  const translationRows = TRANSLATION_EDITIONS.map(
    (ed) => `
    <button type="button" class="reciter-row ${s.quranTranslation === ed.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="quranTranslation" data-value="${ed.id}" dir="auto" aria-pressed="${s.quranTranslation === ed.id}">
      <span class="reciter-row__name">${escapeHTML(ed.native)}<span class="reciter-row__meta"> — ${escapeHTML(ed.author)}</span></span>
      ${s.quranTranslation === ed.id ? icon('check', { size: 16 }) : ''}
    </button>`
  ).join('');

  const reminders = state.reminders
    .map(
      (r) => `
    <div class="reminder-row">
      <label class="switch">
        <input type="checkbox" data-action="toggle-reminder" data-id="${escapeHTML(r.id)}" aria-label="${escapeHTML(r.label || r.time)}" ${r.enabled ? 'checked' : ''} />
        <span class="switch__track"></span>
      </label>
      <span class="reminder-row__label">${escapeHTML(r.label || r.time)}</span>
      <span class="reminder-row__time">${escapeHTML(r.time)}</span>
      <button type="button" class="icon-btn" data-action="delete-reminder" data-id="${escapeHTML(r.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 16 })}</button>
    </div>`
    )
    .join('');

  // (v5.0.0) The global card-field defaults — the tab-level field
  // visibility every banner inherits unless it carries its own toggles.
  const cardFieldRows = CARD_FIELD_KEYS.map((k) =>
    clickToggleRow(
      'content-field-toggle-global',
      { field: k },
      t(FIELD_LABELS[k], lang),
      (s.cardFields || {})[k] !== false
    )
  ).join('');

  return `
  <section class="view view--settings">
    <h1 class="view__title">${t('settings.title', lang)}</h1>

    <section class="panel">
      ${panelHeader(t('settings.language', lang), 'book-open', lang)}
      <div class="segmented">${langButtons}</div>
    </section>

    <section class="panel">
      ${panelHeader(t('settings.appearance', lang), 'sun', lang)}
      <p class="field-label">${t('settings.theme', lang)}</p>
      <div class="segmented">${modeButtons}</div>
      <p class="field-label">${t('settings.palette', lang)}</p>
      <div class="swatch-row">${paletteSwatches}</div>
      <p class="field-label">${t('settings.shape', lang)}</p>
      <div class="shape-row">${shapeButtons}</div>
      <p class="field-label" id="font-scale-label">${t('settings.fontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="1.4" step="0.05" value="${Number(s.fontScale) || 1}" data-bind="fontScale" aria-labelledby="font-scale-label" />
      <p class="field-label" id="arabic-font-scale-label">${t('settings.arabicFontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="1.6" step="0.05" value="${Number(s.arabicFontScale) || 1}" data-bind="arabicFontScale" aria-labelledby="arabic-font-scale-label" />
    </section>

    <section class="panel">
      ${panelHeader(t('settings.content', lang), 'list', lang)}
      ${toggleRow('showTransliteration', s.showTransliteration, t('settings.showTransliteration', lang))}
      ${toggleRow('showTranslation', s.showTranslation, t('settings.showTranslation', lang))}
      ${toggleRow('autoAdvanceFocus', s.autoAdvanceFocus, t('settings.autoAdvanceFocus', lang))}
      <p class="field-label" id="daily-goal-label">${t('settings.dailyGoal', lang)}</p>
      <input type="number" class="input" min="1" max="10000" value="${escapeHTML(String(s.dailyGoal ?? ''))}" data-bind="dailyGoal" aria-labelledby="daily-goal-label" />
    </section>

    <section class="panel">
      ${panelHeader(t('settings.cardFields', lang), 'grid', lang, 'settings.cardFieldsHint')}
      ${cardFieldRows}
      <button type="button" class="btn btn--secondary btn--sm" data-action="content-restore-all">${icon('refresh', { size: 14 })} ${t('library.sheet.restoreAll', lang)}</button>
    </section>

    <section class="panel">
      ${panelHeader(t('settings.reciter', lang), 'volume', lang, 'settings.reciterHint')}
      <div class="reciter-list">${reciterRows}</div>
      <a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.AUDIO)}" data-action="navigate" data-view="${VIEWS.AUDIO}">${icon('volume', { size: 14 })} ${t('settings.audioManager', lang)}</a>
    </section>

    <section class="panel">
      ${panelHeader(t('settings.translation', lang), 'book', lang, 'settings.quranTranslationHint')}
      <div class="reciter-list">${translationRows}</div>
    </section>

    <section class="panel">
      ${panelHeader(t('settings.feedback', lang), 'bead', lang, 'settings.feedbackHint')}
      ${toggleRow('hapticsEnabled', s.hapticsEnabled, t('settings.haptics', lang))}
      ${toggleRow('soundEnabled', s.soundEnabled, t('settings.sound', lang))}
      ${toggleRow('tapRipple', s.tapRipple, t('settings.ripple', lang))}
      ${toggleRow('pageTurnSound', s.pageTurnSound, t('settings.pageTurn', lang))}
      ${toggleRow('khatmaChimeSound', s.khatmaChimeSound, t('settings.khatmaChime', lang))}
    </section>

    <section class="panel">
      ${panelHeader(t('settings.notifications', lang), 'bell', lang)}
      <div class="btn-stack">
        <button type="button" class="btn btn--secondary btn--sm" data-action="add-reminder">${icon('plus', { size: 14 })} ${t('settings.addReminder', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="schedule-open-manager">${icon('calendar', { size: 14 })} ${t('schedule.manager', lang)}</button>
      </div>
      ${reminders || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
    </section>

    <section class="panel">
      ${panelHeader(t('settings.accessibility', lang), 'hands', lang)}
      ${toggleRow('reduceMotion', s.reduceMotion, t('settings.reduceMotion', lang))}
      ${toggleRow('highContrast', s.highContrast, t('settings.highContrast', lang))}
    </section>

    <section class="panel">
      ${panelHeader(t('settings.data', lang), 'shield', lang)}
      <!-- v3.26 data health check: three honest facts, zero servers -->
      <div class="data-health">
        <p class="panel__subtext" dir="ltr">${storageLine(state, lang)}</p>
        <p class="panel__subtext">${lastBackupLine(state, lang)}</p>
        <p class="panel__subtext" dir="ltr">${t('settings.dataAppVersion', lang, { v: APP_VERSION })}</p>
        ${dryRunLine(state, lang)}
      </div>
      <div class="btn-stack">
        <button type="button" class="btn btn--secondary" data-action="verify-backup">${icon('check', { size: 16 })} ${t('settings.dataVerify', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="export-backup">${icon('download', { size: 16 })} ${t('settings.exportBackup', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="import-backup">${icon('upload', { size: 16 })} ${t('settings.importBackup', lang)}</button>
        <button type="button" class="btn btn--danger" data-action="reset-all-data">${icon('trash', { size: 16 })} ${t('settings.resetData', lang)}</button>
      </div>
    </section>

    <a class="btn btn--ghost" href="${buildHash(VIEWS.ABOUT)}" data-action="navigate" data-view="${VIEWS.ABOUT}">${icon('info', { size: 16 })} ${t('nav.about', lang)}</a>
  </section>`;
}

/** Storage footprint line: this session's device estimate when available. */
function storageLine(state, lang) {
  const s = state.dataHealth?.storage;
  if (!s) return t('settings.dataStoragePending', lang);
  if (s.unsupported) return t('settings.dataStorageUnsupported', lang);
  const used = formatBytes(s.usage) ?? '—';
  const quota = formatBytes(s.quota);
  return t('settings.dataStorage', lang, {
    used,
    quota: quota ?? '?',
  });
}

/** Days since the last backup export — null means never. */
function lastBackupLine(state, lang) {
  const days = daysSinceBackup(state.backupMeta?.lastBackupAt, new Date());
  if (days == null) return t('settings.dataLastBackupNever', lang);
  return t('settings.dataLastBackupDays', lang, { n: days });
}

/** The restore dry-run verdict, rendered after the first "verify" tap. */
function dryRunLine(state, lang) {
  const r = state.dataHealth?.dryRun;
  if (!r) return '';
  const verdict = dryRunVerdict(r);
  if (verdict === 'clean') {
    return `<p class="panel__subtext">${icon('check', { size: 13 })} ${t('settings.dataVerifyClean', lang, r)}</p>`;
  }
  if (verdict === 'lossy') {
    return `<p class="panel__subtext">${t('settings.dataVerifyLossy', lang, r)}</p>`;
  }
  return `<p class="panel__subtext">${t('settings.dataVerifyFailed', lang, r)}</p>`;
}

function toggleRow(key, value, label) {
  // The WHOLE row is one <label>: the checkbox gets its accessible name from
  // the visible text, and tapping anywhere on the row toggles it. (The old
  // layout left the text a sibling of a label wrapping only the track —
  // every settings switch announced as a nameless "checkbox".)
  return `
  <label class="toggle-row">
    <span class="toggle-row__label">${escapeHTML(label)}</span>
    <span class="switch">
      <input type="checkbox" data-action="toggle-setting" data-key="${key}" ${value ? 'checked' : ''} />
      <span class="switch__track"></span>
    </span>
  </label>`;
}
