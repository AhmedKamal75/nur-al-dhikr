/**
 * views/settings.js (v5.0.0 redesign)
 * Settings reorganized into calm, purposeful sections — one panel per
 * intent, each header carrying an icon and a one-line "what this does".
 * New v5 sections: Counting feedback (vibration / tick sound / tap
 * ripple), the global card-field defaults, and content restore — plus
 * the schedules manager link. Every control keeps its existing
 * data-action contract (set-setting / toggle-setting / data-bind …).
 */
import { t, availableLanguages, languageLabel, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { onboardingPanelHTML } from './onboardingPanel.js';
import { escapeHTML, normalizeSearch, pickLocale } from '../core/utils.js';
import {
  ARABIC_TEXT_FONTS,
  PALETTES,
  SHAPES,
  THEME_MODES,
  QURAN_RECITERS,
  TRANSLATION_EDITIONS,
  TASBIH_MILESTONES,
  APP_VERSION,
  VIEWS,
} from '../core/config.js';
import { formatBytes, dryRunVerdict } from '../services/dataHealth.js';
import { filePickerSupported } from '../services/backup.js';
import { DEFERRED_STEPS } from '../domain/onboarding.js';
import { buildHash } from '../core/router.js';
import { CARD_FIELD_KEYS } from '../domain/contentLens.js';
import { splitEditions } from '../domain/wordStudy.js';
import { HOME_PANEL_IDS, resolveHomePanels } from '../domain/homePanels.js';
import { QUICK_TILE_DEFS, resolveQuickTiles } from '../domain/quickTiles.js';
import { DAILY_THEMES } from '../domain/dailyAyah.js';
import { installRowHTML } from './installRow.js';
import { backupSummaryHTML } from './backupSummary.js';

/**
 * (v5.2.48) Accordion memory, persisted. The open section used to live in
 * this module (session-only); it now lives in settings.settingsSection
 * (sanitized slug or null — persisted, backed up, restored like any
 * setting), so a reload returns to the section the person had open.
 * Toggling a switch still re-renders the whole view, and the render
 * re-opens exactly the stored section, so the "switch closes my section"
 * fix survives the move. A `#/settings/<slug>` deep link overrides the
 * stored pin for the visit (unknown slugs fall back, never a broken pin).
 */

/** All accordion section ids, in render order (single source of truth). */
export function settingsSectionIds() {
  return SETTINGS_SECTIONS.map((sec) => sec.id);
}

/** Full section id → URL slug ('settings-sec-data' → 'data'), or null. */
export function settingsSlugForSection(id) {
  if (typeof id !== 'string' || !id.startsWith('settings-sec-')) return null;
  const slug = id.slice('settings-sec-'.length);
  return /^[a-z]+$/.test(slug) && settingsSectionIds().includes(id) ? slug : null;
}

/** URL slug → full section id ('data' → 'settings-sec-data'), or null. */
export function settingsSectionForSlug(slug) {
  if (typeof slug !== 'string' || !/^[a-z]+$/.test(slug)) return null;
  const id = `settings-sec-${slug}`;
  return settingsSectionIds().includes(id) ? id : null;
}

/** The section id a settings state opens: deep link, stored pin, default. */
export function openSettingsSectionFor(state) {
  const params =
    state && typeof state.activeParams === 'object' && state.activeParams !== null
      ? state.activeParams
      : {};
  const deep = settingsSectionForSlug(params.id);
  if (deep) return deep;
  const stored =
    state && state.settings ? settingsSectionForSlug(state.settings.settingsSection) : null;
  return stored || 'settings-sec-language';
}

const FIELD_LABELS = {
  transliteration: 'content.fieldTranslit',
  translation: 'content.fieldTranslation',
  virtues: 'content.fieldVirtues',
  reference: 'content.fieldReference',
  grade: 'content.fieldGrade',
  notes: 'content.fieldNotes',
};

/** Label keys for the deferred first-run doors (all pre-existing keys). */
const DEFERRED_LABELS = {
  comfort: 'onboarding.comfort',
  notifications: 'onboarding.notifications',
  prayer: 'onboarding.prayerSetup',
  goals: 'settings.dailyGoal',
  install: 'onboarding.install',
  firstReading: 'onboarding.firstReading',
};

/** Icons for the deferred doors (all pre-existing icon names). */
const DEFERRED_ICONS = {
  comfort: 'eye',
  notifications: 'bell',
  prayer: 'prayer-rug',
  goals: 'target',
  install: 'download',
  firstReading: 'book-open',
};

/** Hint keys for the deferred doors (all pre-existing keys). */
const DEFERRED_HINTS = {
  comfort: 'onboarding.comfortHint',
  notifications: 'onboarding.notificationsPrime',
  prayer: 'onboarding.prayerSetupHint',
  goals: 'tasbih.dailyGoal',
  install: 'onboarding.installHint',
  firstReading: 'onboarding.firstReadingHint',
};

/**
 * (v5.17.48) The deferred first-run doors: comfort, notifications,
 * calculation method, daily goal, install and first reading. A passive
 * list — it never pops up on its own, it only answers when opened — plus
 * the control that re-opens the 3-step introduction. Exported for tests.
 */
function deferredSetupBodyHTML(state, lang) {
  void state;
  const rows = DEFERRED_STEPS.map((d) => {
    const idAttr = d.params && d.params.id ? ` data-id="${escapeHTML(d.params.id)}"` : '';
    const paramObj = d.params && typeof d.params === 'object' ? d.params : {};
    return `
    <a class="reciter-row" href="${buildHash(d.view, paramObj)}" data-action="navigate" data-view="${escapeHTML(d.view)}"${idAttr}>
      <span class="settings-link-row__icon" aria-hidden="true">${icon(DEFERRED_ICONS[d.id], { size: 17 })}</span>
      <span class="reciter-row__name">${escapeHTML(t(DEFERRED_LABELS[d.id], lang))}<span class="reciter-row__meta">${escapeHTML(t(DEFERRED_HINTS[d.id], lang))}</span></span>
      <span class="settings-link-row__chevron" aria-hidden="true">${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 15 })}</span>
    </a>`;
  }).join('');
  return `
    <p class="panel__subtext">${escapeHTML(t('onboarding.deferHint', lang))}</p>
    <div class="reciter-list">${rows}</div>
    <div class="onboarding-step__actions">
      <button type="button" class="btn btn--secondary btn--sm" data-action="onboarding-reshow">${t('onboarding.reshow', lang)}</button>
    </div>`;
}

export function deferredSetupHTML(state, lang) {
  return `
  <section class="panel panel--deferred" aria-label="${escapeHTML(t('onboarding.deferTitle', lang))}">
    <h2 class="panel__title">${escapeHTML(t('onboarding.deferTitle', lang))}</h2>
    ${deferredSetupBodyHTML(state, lang)}
  </section>`;
}

/** Home panel order rows: up/down buttons + visibility switch per panel.
 *  Shows every panel (in effective order first, the rest last) so a panel that
 *  is off can always be brought back.
 *
 *  (v5.17.136) The switch reports WHERE THE PANEL ACTUALLY IS. It used to
 *  render from `hidden` alone, so every optional panel showed ON while
 *  resolveHomePanels() kept it off Home — a switch claiming a panel was
 *  showing when it was not, for nine of twelve panels. "On" now means "on
 *  Home": not hidden AND present in the effective order. Ticking goes through
 *  home-panel-toggle, which appends the panel to the saved order. */
function homePanelRows(state, lang) {
  const order = resolveHomePanels(state.settings.homeOrder, {});
  const hidden = state.settings.hiddenHome || {};
  const listed = [...order];
  for (const id of HOME_PANEL_IDS) if (!listed.includes(id)) listed.push(id);
  return listed
    .map(
      (id, i) => `
    <div class="home-panel-row">
      <span class="home-panel-row__label">${escapeHTML(t(`home.panel.${id}`, lang))}</span>
      <button type="button" class="icon-btn icon-btn--sm" data-action="home-panel-move" data-id="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('settings.moveUp', lang)}">${icon('chevronUp', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="home-panel-move" data-id="${id}" data-dir="1" ${i === listed.length - 1 ? 'disabled' : ''} aria-label="${t('settings.moveDown', lang)}">${icon('chevronDown', { size: 15 })}</button>
      <label class="switch" title="${escapeHTML(t('settings.hidePanel', lang))}">
        <input type="checkbox" data-action="home-panel-toggle" data-id="${id}" ${
          hidden[id] || !order.includes(id) ? '' : 'checked'
        } aria-label="${escapeHTML(t(`home.panel.${id}`, lang))}" />
        <span class="switch__track"></span>
      </label>
    </div>`
    )
    .join('');
}

/** Quick-tile order rows (v5.2.54): same up/down + hide pattern as the
 *  home panels, over the effective tile order (hidden tiles last so a
 *  hidden tile can always be brought back). Labels reuse the tile
 *  shortcuts — no new strings. */
function quickTileRows(state, lang) {
  const hidden = state.settings.hiddenQuick || {};
  // Effective order (usage-driven until customized); hidden tiles keep
  // their position, so unhiding restores them in place.
  const listed = resolveQuickTiles({
    order: state.settings.quickOrder,
    hidden: {},
    visits: state.tileVisits,
  });
  return listed
    .map(
      (id, i) => `
    <div class="home-panel-row">
      <span class="home-panel-row__label">${escapeHTML(t(QUICK_TILE_DEFS.find((d) => d.id === id)?.labelKey || 'nav.home', lang))}</span>
      <button type="button" class="icon-btn icon-btn--sm" data-action="quick-tile-move" data-id="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('settings.moveUp', lang)}">${icon('chevronUp', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="quick-tile-move" data-id="${id}" data-dir="1" ${i === listed.length - 1 ? 'disabled' : ''} aria-label="${t('settings.moveDown', lang)}">${icon('chevronDown', { size: 15 })}</button>
      <label class="switch" title="${escapeHTML(t('settings.hidePanel', lang))}">
        <input type="checkbox" data-action="quick-tile-toggle" data-id="${id}" ${hidden[id] ? '' : 'checked'} aria-label="${escapeHTML(t(QUICK_TILE_DEFS.find((d) => d.id === id)?.labelKey || 'nav.home', lang))}" />
        <span class="switch__track"></span>
      </label>
    </div>`
    )
    .join('');
}

/** (v5.2.22) A settings section header as a native <summary>: the whole
 *  row is the expand/collapse control — zero JS, keyboard- and
 *  screen-reader-operable, offline-safe. The chevron rotates via CSS. */
function accHeader(title, iconName, lang, hintKey) {
  return `
  <summary class="settings-acc__summary">
    <span class="panel__icon">${icon(iconName, { size: 18 })}</span>
    <span class="settings-acc__title">${escapeHTML(title)}
      ${hintKey ? `<span class="panel__subtext settings-acc__hint">${t(hintKey, lang)}</span>` : ''}
    </span>
    <span class="settings-acc__chevron" aria-hidden="true">${icon('chevronDown', { size: 16 })}</span>
  </summary>`;
}

function accSubheading(title, lang, hintKey = '') {
  return `
  <div class="settings-acc__subheading">
    <span class="settings-acc__subheading-title">${escapeHTML(title)}</span>
    ${hintKey ? `<span class="panel__subtext settings-acc__subheading-hint">${t(hintKey, lang)}</span>` : ''}
  </div>`;
}

/**
 * (v5.17.63) The ONE settings row builder (rule 6): every toggle-style
 * setting is label + control + optional hint inside the existing
 * `.toggle-row` chrome, so all rows share one shape and the stylesheet
 * keeps a single target. `tag` picks the wrapper — 'label' for real
 * checkboxes (tapping anywhere on the row toggles the input), 'button'
 * for click-dispatched switches — and `control` is the switch HTML
 * verbatim, so every existing data-action contract renders the same
 * control it always did. Arrangement only: no setting, default or
 * handler changes — the rows just come from one place now.
 */
export function settingRow({ tag = 'label', label, hint = '', control, attrs = '' }) {
  const open =
    tag === 'button'
      ? `<button type="button" class="toggle-row"${attrs ? ` ${attrs}` : ''}>`
      : `<label class="toggle-row"${attrs ? ` ${attrs}` : ''}>`;
  const close = tag === 'button' ? '</button>' : '</label>';
  const hintHTML = hint ? `<br /><span class="panel__subtext">${escapeHTML(hint)}</span>` : '';
  return `
  ${open}
    <span class="toggle-row__label">${escapeHTML(label)}${hintHTML}</span>
    ${control}
  ${close}`;
}

/** A clickable toggle row for NON-settings-boolean state (the same switch
 *  visual as toggleRow, but dispatches a click handler). */
function clickToggleRow(action, dataset, label, on, hint = '') {
  const attrs = Object.entries(dataset)
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
    .join(' ');
  return settingRow({
    tag: 'button',
    label,
    hint,
    control: `
      <span class="switch" aria-hidden="true">
        <span class="switch__track ${on ? 'switch__track--on' : ''}"></span>
      </span>`,
    attrs: `data-action="${action}"${attrs ? ` ${attrs}` : ''} aria-pressed="${on}" aria-label="${escapeHTML(label)}"`,
  });
}

/** Filterable settings sections: title + hint keys matched in both
 *  languages (exported for tests). */
export const SETTINGS_SECTIONS = [
  { id: 'settings-sec-language', title: 'settings.language' },
  { id: 'settings-sec-appearance', title: 'settings.appearance' },
  { id: 'settings-sec-content', title: 'settings.content' },
  { id: 'settings-sec-cardfields', title: 'settings.cardFields', hint: 'settings.cardFieldsHint' },
  { id: 'settings-sec-reciter', title: 'settings.reciter', hint: 'settings.reciterHint' },
  {
    id: 'settings-sec-translation',
    title: 'settings.translation',
    hint: 'settings.quranTranslationHint',
  },
  {
    id: 'settings-sec-compare',
    title: 'settings.compareTranslation',
    hint: 'settings.compareHint',
  },
  { id: 'settings-sec-feedback', title: 'settings.feedback', hint: 'settings.feedbackHint' },
  { id: 'settings-sec-notifications', title: 'settings.notifications' },
  { id: 'settings-sec-accessibility', title: 'settings.accessibility' },
  { id: 'settings-sec-profiles', title: 'settings.profiles', hint: 'settings.profilesHint' },
  { id: 'settings-sec-data', title: 'settings.data' },
];

/**
 * (v5.17.63) Professional groups over the sections above (rule 6): each
 * section id appears in exactly one group's `sections` (pinned by
 * tests/settings-groups.test.js), so the groups cannot drift from the
 * accordions and no setting can be orphaned or duplicated by a reorder.
 * The `setup` group holds one small progressive disclosure for the deferred
 * first-run doors. About remains a separate top-level application door.
 * Deferred content uses a shared body builder so the standalone exported
 * `deferredSetupHTML` contract and the Settings disclosure cannot drift.
 */
export const SETTINGS_GROUPS = [
  { id: 'settings-group-setup', title: 'settings.groupSetup', hint: 'settings.groupSetupHint' },
  {
    id: 'settings-group-display',
    title: 'settings.groupDisplay',
    hint: 'settings.groupDisplayHint',
    sections: ['settings-sec-language', 'settings-sec-appearance'],
  },
  {
    id: 'settings-group-content',
    title: 'settings.groupContent',
    hint: 'settings.groupContentHint',
    sections: ['settings-sec-content', 'settings-sec-cardfields'],
  },
  {
    id: 'settings-group-audio',
    title: 'settings.groupAudio',
    hint: 'settings.groupAudioHint',
    sections: [
      'settings-sec-reciter',
      'settings-sec-translation',
      'settings-sec-compare',
      'settings-sec-feedback',
    ],
  },
  {
    id: 'settings-group-prayer',
    title: 'settings.groupPrayer',
    hint: 'settings.groupPrayerHint',
    sections: ['settings-sec-notifications'],
  },
  {
    id: 'settings-group-access',
    title: 'settings.groupAccess',
    hint: 'settings.groupAccessHint',
    sections: ['settings-sec-accessibility', 'settings-sec-profiles'],
  },
  {
    id: 'settings-group-backup',
    title: 'settings.groupBackup',
    hint: 'settings.groupBackupHint',
    sections: ['settings-sec-data'],
  },
];

/** Group open/close tags (render-local: they need the live filter state).
 *  A group with sections hides while the search filter hides every member;
 *  the setup group (deferred doors + About door, no accordion) never hides —
 *  the doors answer a search the section filter cannot see, as before. */
function groupHelpers(lang, filterQ, hideSettings) {
  const hiddenFor = (group) =>
    Boolean(filterQ) &&
    Array.isArray(group.sections) &&
    group.sections.length > 0 &&
    group.sections.every((id) => hideSettings.has(id));
  return {
    groupOpen(group) {
      return `
  <section class="settings-group${hiddenFor(group) ? ' hidden' : ''}" id="${group.id}" aria-labelledby="${group.id}-title">
    <h2 class="settings-group__title" id="${group.id}-title">${escapeHTML(t(group.title, lang))}</h2>
    <p class="panel__subtext settings-group__hint">${escapeHTML(t(group.hint, lang))}</p>`;
    },
    groupClose() {
      return `
  </section>`;
    },
  };
}

export function matchSettingsSection(sec, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(
    [
      t(sec.title, 'en'),
      t(sec.title, 'ar'),
      sec.hint ? t(sec.hint, 'en') : '',
      sec.hint ? t(sec.hint, 'ar') : '',
    ].join(' ')
  );
  return q
    .split(' ')
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export function renderSettings(state, flags = {}) {
  const lang = state.settings.language;
  const filterQ = String(state.activeParams?.q || '');
  const hideSettings = new Set(
    SETTINGS_SECTIONS.filter((sec) => !matchSettingsSection(sec, filterQ)).map((sec) => sec.id)
  );
  const s = state.settings;
  // The open accordion: deep link wins, then the persisted pin, then the
  // default section. (The search filter below opens matches instead.)
  const openId = openSettingsSectionFor(state);
  const onboardingReplay =
    state.activeParams?.id === 'onboarding' ? onboardingPanelHTML(state, lang) : '';
  // (v5.17.63) Group wrappers for the professional sections below. By index
  // into SETTINGS_GROUPS (rule 6 — the groups partition SETTINGS_SECTIONS,
  // so an index always names the intended shelf).
  const { groupOpen, groupClose } = groupHelpers(lang, filterQ, hideSettings);
  const [G_SETUP, G_DISPLAY, G_CONTENT, G_AUDIO, G_PRAYER, G_ACCESS, G_BACKUP] = SETTINGS_GROUPS;

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
    <button type="button" class="segmented__btn ${s.language === l ? 'segmented__btn--active' : ''}" data-action="set-setting" data-key="language" data-value="${l}" aria-pressed="${s.language === l}">${escapeHTML(languageLabel(l))}</button>`
    )
    .join('');

  const reciterRows = QURAN_RECITERS.map(
    (r) => `
    <button type="button" class="reciter-row ${s.reciter === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${r.id}" aria-pressed="${s.reciter === r.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
      ${s.reciter === r.id ? icon('check', { size: 16 }) : ''}
    </button>`
  ).join('');
  // Compare-two-reciters: voice B (empty = off) + whether new sessions start comparing.
  const reciterBRows =
    `
    <button type="button" class="reciter-row ${!s.reciterB ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciterB" data-value="" aria-pressed="${!s.reciterB}">
      <span class="reciter-row__name">${escapeHTML(t('audio.noSecondVoice', lang))}</span>
      ${!s.reciterB ? icon('check', { size: 16 }) : ''}
    </button>` +
    QURAN_RECITERS.map(
      (r) => `
    <button type="button" class="reciter-row ${s.reciterB === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciterB" data-value="${r.id}" aria-pressed="${s.reciterB === r.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
      ${s.reciterB === r.id ? icon('check', { size: 16 }) : ''}
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

  // (v5.2.0) Translation-compare: a second edition shown under the primary
  // one in the classic reader. Same set-setting pipeline (sanitizer maps
  // '' back to null = off); en-sahih excluded — it is already inline.
  // (v5.2.78, UP-06) third edition (C) with its own picker — skips primary
  // + B + inline at render time.
  const compareRowsFor = (key, current) =>
    `
    <button type="button" class="reciter-row ${!current ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="${key}" data-value="" aria-pressed="${!current}">
      <span class="reciter-row__name">${escapeHTML(t('settings.compareOff', lang))}</span>
      ${!current ? icon('check', { size: 16 }) : ''}
    </button>` +
    TRANSLATION_EDITIONS.filter((ed) => !ed.inline)
      .map(
        (ed) => `
    <button type="button" class="reciter-row ${current === ed.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="${key}" data-value="${ed.id}" dir="auto" aria-pressed="${current === ed.id}">
      <span class="reciter-row__name">${escapeHTML(ed.native)}<span class="reciter-row__meta"> — ${escapeHTML(ed.author)}</span></span>
      ${current === ed.id ? icon('check', { size: 16 }) : ''}
    </button>`
      )
      .join('');
  const compareRows = compareRowsFor('quranTranslationB', s.quranTranslationB);
  const compareCRows = compareRowsFor('quranTranslationC', s.quranTranslationC);

  // (v5.2.68) default tafsir source: which commentary opens first in the
  // tafsir tabs. Bundled editions only (always offline, incl. English);
  // same native-name contract as the translation picker. Empty while the
  // catalog loads — the tabs fall back to book order meanwhile.
  const tafsirDefaultRows = splitEditions(state.tafsirEditions)
    .bundled.map(
      (ed) => `
    <button type="button" class="reciter-row ${s.mushafPrefs?.defaultTafsir === ed.id ? 'reciter-row--active' : ''}" data-action="mushaf-set-tafsir" data-edition="${escapeHTML(ed.id)}" dir="auto" aria-pressed="${s.mushafPrefs?.defaultTafsir === ed.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: ed.nameEn, ar: ed.nameAr }, lang))}<span class="reciter-row__meta"> — ${escapeHTML(pickLocale({ en: ed.authorEn, ar: ed.authorAr }, lang))}</span></span>
      ${s.mushafPrefs?.defaultTafsir === ed.id ? icon('check', { size: 16 }) : ''}
    </button>`
    )
    .join('');

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
    <header class="settings-hero">
      <div>
        <h1 class="view__title">${t('settings.title', lang)}</h1>
      </div>
      <div class="settings-hero__search search-bar">
        <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
        <input type="search" class="search-bar__input" id="settings-search-input"
          placeholder="${t('settings.searchPh', lang)}" aria-label="${t('settings.searchPh', lang)}" value="${escapeHTML(state.activeParams?.q || '')}"
          data-bind="settings-search" autocomplete="off" />
      </div>
    </header>
    ${groupOpen(G_SETUP)}
    <details class="panel settings-setup-disclosure panel--deferred">
      ${accHeader(t('onboarding.deferTitle', lang), 'settings', lang, 'onboarding.deferHint')}
      <div class="settings-setup-disclosure__body">
        ${deferredSetupBodyHTML(state, lang)}
      </div>
    </details>
    ${onboardingReplay}
    ${groupClose()}
    ${groupOpen(G_DISPLAY)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-language"${filterQ ? (hideSettings.has('settings-sec-language') ? ' hidden' : ' open') : openId === 'settings-sec-language' ? ' open' : ''}>
      ${accHeader(t('settings.language', lang), 'book-open', lang)}
      <div class="segmented">${langButtons}</div>
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-appearance"${filterQ ? (hideSettings.has('settings-sec-appearance') ? ' hidden' : ' open') : openId === 'settings-sec-appearance' ? ' open' : ''}>
      ${accHeader(t('settings.appearance', lang), 'sun', lang)}
      <p class="field-label">${t('settings.theme', lang)}</p>
      <div class="segmented">${modeButtons}</div>
      <p class="field-label">${t('settings.palette', lang)}</p>
      <div class="swatch-row">${paletteSwatches}</div>
      <p class="field-label">${t('settings.shape', lang)}</p>
      <div class="shape-row">${shapeButtons}</div>
      <p class="field-label" id="font-scale-label">${t('settings.fontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="2" step="0.05" value="${Number(s.fontScale) || 1}" data-bind="fontScale" aria-labelledby="font-scale-label" />
      <p class="field-label" id="arabic-font-scale-label">${t('settings.arabicFontSize', lang)}</p>
      <input type="range" class="slider" min="0.85" max="1.6" step="0.05" value="${Number(s.arabicFontScale) || 1}" data-bind="arabicFontScale" aria-labelledby="arabic-font-scale-label" />
      <!-- (v5.17.16) The Arabic reading-text typeface. The Mushaf keeps its
           OWN separate font control further down this view; this one is for
           the adhkar, the duas and the reader, and cannot disturb a page of
           the Qur'an. -->
      <p class="field-label" id="arabic-typeface-label">${t('settings.arabicTypeface', lang)}</p>
      <!-- (v5.17.127) Specimen cards, not palette swatches: choosing a
           READING typeface is a judgement about how the text looks in a full
           ayah, so each option previews a real phrase at its own family with
           its own name and sub-label. A colour swatch communicates none of
           that and made this row look like a colour picker. -->
      <div class="typeface-picker" role="radiogroup" aria-labelledby="arabic-typeface-label">
        ${ARABIC_TEXT_FONTS.map(
          (f) => `
        <button type="button" class="typeface-option ${s.arabicFont === f.id ? 'typeface-option--active' : ''}" data-action="set-setting" data-key="arabicFont" data-value="${escapeHTML(f.id)}" role="radio" aria-checked="${s.arabicFont === f.id}" title="${escapeHTML(f.sub[lang] || f.sub.en)}">
          <span class="typeface-option__preview" lang="ar" dir="rtl" style="font-family:${escapeHTML(f.family)}">سُبْحَانَ اللهِ</span>
          <span class="typeface-option__name">${escapeHTML(f.name[lang] || f.name.en)}</span>
          <span class="typeface-option__sub">${escapeHTML(f.sub[lang] || f.sub.en)}</span>
        </button>`
        ).join('')}
      </div>
    </details>
    ${groupClose()}
    ${groupOpen(G_CONTENT)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-content"${filterQ ? (hideSettings.has('settings-sec-content') ? ' hidden' : ' open') : openId === 'settings-sec-content' ? ' open' : ''}>
      ${accHeader(t('settings.content', lang), 'list', lang)}
      ${toggleRow('showTransliteration', s.showTransliteration, t('settings.showTransliteration', lang))}
      ${toggleRow('showTranslation', s.showTranslation, t('settings.showTranslation', lang))}
      ${toggleRow(
        'autoAdvanceFocus',
        s.autoAdvanceFocus,
        t('settings.autoAdvanceFocus', lang),
        t('settings.autoAdvanceFocusHint', lang)
      )}
      <p class="field-label" id="daily-goal-label">${t('settings.dailyGoal', lang)}</p>
      <input type="number" class="input" min="1" max="10000" value="${escapeHTML(String(s.dailyGoal ?? ''))}" data-bind="dailyGoal" aria-labelledby="daily-goal-label" />
      <p class="field-label" id="daily-ayah-theme-label">${t('settings.dailyAyahTheme', lang)}</p>
      <p class="panel__subtext">${t('settings.dailyAyahThemeHint', lang)}</p>
      <div class="chip-row chip-row--scroll" role="group" aria-labelledby="daily-ayah-theme-label">
        ${DAILY_THEMES.map(
          (th) => `
        <button type="button" class="chip chip--sm ${s.dailyAyahTheme === th || (!s.dailyAyahTheme && th === 'any') ? 'chip--active' : ''}" data-action="set-setting" data-key="dailyAyahTheme" data-value="${th}" aria-pressed="${s.dailyAyahTheme === th || (!s.dailyAyahTheme && th === 'any')}">${escapeHTML(t(`home.theme.${th}`, lang))}</button>`
        ).join('')}
      </div>
      <p class="field-label">${t('settings.homePanels', lang)}</p>
      <p class="panel__subtext">${t('settings.homePanelsHint', lang)}</p>
      ${homePanelRows(state, lang)}
      <p class="field-label">${t('quran.quickActions', lang)}</p>
      ${quickTileRows(state, lang)}
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-cardfields"${filterQ ? (hideSettings.has('settings-sec-cardfields') ? ' hidden' : ' open') : openId === 'settings-sec-cardfields' ? ' open' : ''}>
      ${accHeader(t('settings.cardFields', lang), 'grid', lang, 'settings.cardFieldsHint')}
      ${cardFieldRows}
      <button type="button" class="btn btn--secondary btn--sm" data-action="content-restore-all">${icon('refresh', { size: 14 })} ${t('library.sheet.restoreAll', lang)}</button>
    </details>
    ${groupClose()}
    ${groupOpen(G_AUDIO)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-reciter"${filterQ ? (hideSettings.has('settings-sec-reciter') ? ' hidden' : ' open') : openId === 'settings-sec-reciter' ? ' open' : ''}>
      ${accHeader(t('settings.reciter', lang), 'volume', lang, 'settings.reciterHint')}
      <div class="reciter-list">${reciterRows}</div>
      <p class="field-label">${t('settings.reciterB', lang)}</p>
      <p class="panel__subtext">${t('settings.reciterBHint', lang)}</p>
      <div class="reciter-list">${reciterBRows}</div>
      ${toggleRow('reciterCompare', s.reciterCompare === true, t('settings.reciterCompare', lang))}
      <a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.AUDIO)}" data-action="navigate" data-view="${VIEWS.AUDIO}">${icon('volume', { size: 14 })} ${t('settings.audioManager', lang)}</a>
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-translation"${filterQ ? (hideSettings.has('settings-sec-translation') ? ' hidden' : ' open') : openId === 'settings-sec-translation' ? ' open' : ''}>
      ${accHeader(t('settings.translation', lang), 'book', lang, 'settings.quranTranslationHint')}
      <div class="reciter-list">${translationRows}</div>
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-compare"${filterQ ? (hideSettings.has('settings-sec-compare') ? ' hidden' : ' open') : openId === 'settings-sec-compare' ? ' open' : ''}>
      ${accHeader(t('settings.compareTranslation', lang), 'book', lang, 'settings.compareHint')}
      <div class="reciter-list">${compareRows}</div>
      ${accSubheading(t('settings.compareTranslationC', lang), lang, 'settings.compareHintC')}
      <div class="reciter-list">${compareCRows}</div>
      <p class="field-label">${t('settings.tafsirDefault', lang)}</p>
      <p class="panel__subtext">${t('settings.tafsirDefaultHint', lang)}</p>
      <div class="reciter-list">${tafsirDefaultRows}</div>
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-feedback"${filterQ ? (hideSettings.has('settings-sec-feedback') ? ' hidden' : ' open') : openId === 'settings-sec-feedback' ? ' open' : ''}>
      ${accHeader(t('settings.feedback', lang), 'bead', lang, 'settings.feedbackHint')}
      ${toggleRow('hapticsEnabled', s.hapticsEnabled, t('settings.haptics', lang))}
      ${toggleRow('soundEnabled', s.soundEnabled, t('settings.sound', lang))}
      ${toggleRow('tapRipple', s.tapRipple, t('settings.ripple', lang))}
      ${toggleRow('pageTurnSound', s.pageTurnSound, t('settings.pageTurn', lang))}
      ${toggleRow('khatmaChimeSound', s.khatmaChimeSound, t('settings.khatmaChime', lang))}
      <p class="panel__subtext"><strong>${escapeHTML(t('settings.milestone', lang))}</strong> — ${escapeHTML(t('settings.milestoneHint', lang))}</p>
      <div class="chip-row" role="group" aria-label="${escapeHTML(t('settings.milestone', lang))}">
        ${[...TASBIH_MILESTONES]
          .sort((a, b) => a - b)
          .map(
            (n) => `
        <button type="button" class="chip ${s.tasbihMilestone === n ? 'chip--active' : ''}" data-action="set-setting" data-key="tasbihMilestone" data-value="${n}" aria-pressed="${s.tasbihMilestone === n}">${n === 0 ? escapeHTML(t('settings.milestoneOff', lang)) : escapeHTML(String(n))}</button>`
          )
          .join('')}
      </div>
    </details>
    ${groupClose()}
    ${groupOpen(G_PRAYER)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-notifications"${filterQ ? (hideSettings.has('settings-sec-notifications') ? ' hidden' : ' open') : openId === 'settings-sec-notifications' ? ' open' : ''}>
      ${accHeader(t('settings.notifications', lang), 'bell', lang)}
      <div class="btn-stack">
        <button type="button" class="btn btn--secondary btn--sm" data-action="add-reminder">${icon('plus', { size: 14 })} ${t('settings.addReminder', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="schedule-open-manager">${icon('calendar', { size: 14 })} ${t('schedule.manager', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="add-preset" data-preset="jumuah">${icon('rayah', { size: 14 })} ${t('preset.jumuah', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="add-preset" data-preset="dailyVerse">${icon('book', { size: 14 })} ${t('preset.dailyVerse', lang)}</button>
      </div>
      ${(() => {
        const jr =
          s.jumuahReminder && typeof s.jumuahReminder === 'object'
            ? s.jumuahReminder
            : { enabled: false, time: '09:00' };
        const dv =
          s.dailyVerseNotification && typeof s.dailyVerseNotification === 'object'
            ? s.dailyVerseNotification
            : { enabled: false, time: '08:00' };
        return `
      ${clickToggleRow('toggle-jumuah-reminder', {}, t('settings.jumuahReminder', lang), jr.enabled === true)}
      <label class="field">${escapeHTML(t('settings.jumuahReminderTime', lang))}<input type="time" class="input" value="${escapeHTML(jr.time || '09:00')}" data-bind="jumuah-reminder-time" /></label>
      ${clickToggleRow('toggle-dailyverse-reminder', {}, t('settings.dailyVerseReminder', lang), dv.enabled === true)}
      <label class="field">${escapeHTML(t('settings.dailyVerseReminderTime', lang))}<input type="time" class="input" value="${escapeHTML(dv.time || '08:00')}" data-bind="dailyverse-reminder-time" /></label>
      ${clickToggleRow('toggle-zakatfitr-reminder', {}, t('settings.zakatFitrReminder', lang), s.zakatFitrReminder === true)}
      <p class="panel__subtext">${escapeHTML(t('settings.zakatFitrHint', lang))}</p>`;
      })()}
      ${reminders || `<p class="empty-hint">${t('editor.emptyState', lang)}</p>`}
    </details>
    ${groupClose()}
    ${groupOpen(G_ACCESS)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-accessibility"${filterQ ? (hideSettings.has('settings-sec-accessibility') ? ' hidden' : ' open') : openId === 'settings-sec-accessibility' ? ' open' : ''}>
      ${accHeader(t('settings.accessibility', lang), 'hands', lang)}
      ${toggleRow('reduceMotion', s.reduceMotion, t('settings.reduceMotion', lang))}
      ${toggleRow('highContrast', s.highContrast, t('settings.highContrast', lang))}
      ${toggleRow('dyslexiaFriendly', s.dyslexiaFriendly, t('settings.dyslexiaFriendly', lang))}
      ${toggleRow('roomySpacing', s.roomySpacing, t('settings.roomySpacing', lang))}
      ${settingRow({
        label: t('settings.elderMode', lang),
        hint: t('settings.elderHint', lang),
        control: `
        <span class="switch">
          <input type="checkbox" data-action="toggle-elder-mode" ${s.elderMode ? 'checked' : ''} />
          <span class="switch__track"></span>
        </span>`,
      })}
      ${settingRow({
        label: t('settings.kidsMode', lang),
        hint: t('settings.kidsHint', lang),
        control: `
        <span class="switch">
          <input type="checkbox" data-action="toggle-kids-mode" ${s.kidsMode ? 'checked' : ''} />
          <span class="switch__track"></span>
        </span>`,
      })}
    </details>

    <details data-open-controlled class="panel settings-acc" id="settings-sec-profiles"${filterQ ? (hideSettings.has('settings-sec-profiles') ? ' hidden' : ' open') : openId === 'settings-sec-profiles' ? ' open' : ''}>
      ${accHeader(t('settings.profiles', lang), 'folder', lang, 'settings.profilesHint')}
      <div class="chip-row" role="group" aria-label="${escapeHTML(t('settings.profiles', lang))}">
        <button type="button" class="chip ${state.activeProfile === 'main' ? 'chip--active' : ''}" data-action="profile-switch" data-id="main" aria-pressed="${state.activeProfile === 'main'}">${escapeHTML(t('settings.profileMain', lang))}</button>
        ${(state.profiles || [])
          .map(
            (p) => `
        <span class="mushaf-folder-chip-wrap">
          <button type="button" class="chip ${state.activeProfile === p.id ? 'chip--active' : ''}" data-action="profile-switch" data-id="${escapeHTML(p.id)}" aria-pressed="${state.activeProfile === p.id}">${escapeHTML(p.name)}</button>
          <button type="button" class="chip__x" data-action="profile-delete" data-id="${escapeHTML(p.id)}" aria-label="${t('common.delete', lang)}">×</button>
        </span>`
          )
          .join('')}
        <button type="button" class="chip chip--add" data-action="profile-create">${icon('plus', { size: 12 })} ${t('settings.profileNew', lang)}</button>
      </div>
    </details>
    ${groupClose()}
    ${groupOpen(G_BACKUP)}
    <details data-open-controlled class="panel settings-acc" id="settings-sec-data"${filterQ ? (hideSettings.has('settings-sec-data') ? ' hidden' : ' open') : openId === 'settings-sec-data' ? ' open' : ''}>
      ${accHeader(t('settings.data', lang), 'shield', lang)}
      <!-- (v5.17.31) the persistent install row: same copy as About and the
           wizard step, so the offer survives past first-run. -->
      ${installRowHTML(state, lang, flags.install || {})}
      <!-- v3.26 data health check: honest facts, zero servers.
           (v5.17.59, merged-plan item 12) the backup facts render through
           the ONE shared summary card (js/views/backupSummary.js) — the same
           builder the Offline view uses, so the two surfaces cannot drift. -->
      <div class="data-health">
        <p class="panel__subtext" dir="ltr">${storageLine(state, lang)}</p>
        <p class="panel__subtext" dir="ltr">${t('settings.dataAppVersion', lang, { v: APP_VERSION })}</p>
        ${dryRunLine(state, lang)}
      </div>
      ${backupSummaryHTML(state, { variant: 'settings' })}
      <div class="btn-stack">
        <!-- (REORG Phase 8) section hop: #/offline stays a real route and now
             lights the You door via the in-chrome You switch. -->
        <a class="btn btn--primary" href="${buildHash(VIEWS.OFFLINE)}" data-action="navigate" data-view="${VIEWS.OFFLINE}">${icon('download', { size: 16 })} ${t('nav.offline', lang)}</a>
        <button type="button" class="btn btn--secondary" data-action="verify-backup">${icon('check', { size: 16 })} ${t('settings.dataVerify', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="export-backup">${icon('download', { size: 16 })} ${t('settings.exportBackup', lang)}</button>
        ${filePickerSupported() ? `<button type="button" class="btn btn--secondary" data-action="backup-link-file">${icon('folder', { size: 16 })} ${t('settings.dataLinkFile', lang)}</button>` : ''}
        ${state.backupMeta?.lastAutoBackupAt ? `<button type="button" class="btn btn--secondary" data-action="restore-auto-backup">${icon('upload', { size: 16 })} ${t('settings.restoreAutoBackup', lang)}</button>` : ''}
        <button type="button" class="btn btn--secondary" data-action="import-backup">${icon('upload', { size: 16 })} ${t('settings.importBackup', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="export-plan">${icon('share', { size: 16 })} ${t('settings.exportPlan', lang)}</button>
        <button type="button" class="btn btn--secondary" data-action="import-plan">${icon('upload', { size: 16 })} ${t('settings.importPlan', lang)}</button>
        <button type="button" class="btn btn--danger" data-action="reset-all-data">${icon('trash', { size: 16 })} ${t('settings.resetData', lang)}</button>
      </div>
    </details>
    ${groupClose()}
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

function toggleRow(key, value, label, hint = '') {
  // The WHOLE row is one <label>: the checkbox gets its accessible name from
  // the visible text, and tapping anywhere on the row toggles it. (The old
  // layout left the text a sibling of a label wrapping only the track —
  // every settings switch announced as a nameless "checkbox".)
  // (v5.17.63) via the one settingRow builder (rule 6) — same label, same
  // control, same contract; the builder just owns the chrome now.
  return settingRow({
    label,
    hint,
    control: `
      <span class="switch">
        <input type="checkbox" data-action="toggle-setting" data-key="${key}" ${value ? 'checked' : ''} />
        <span class="switch__track"></span>
      </span>`,
  });
}
