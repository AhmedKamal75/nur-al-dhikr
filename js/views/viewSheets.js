/**
 * views/viewSheets.js (v4.6.0)
 * The per-view "⋯" menu sheets — one builder per tab, all rendered through
 * the shared viewSheet() composer (ui/viewSheet.js) and opened by the
 * single 'view-menu' handler in app/handlers/viewMenus.js. Rows dispatch
 * EXISTING handlers wherever the feature already had one; the few new
 * behaviors live in that handler module next door.
 *
 * Pure string templates, no listeners, no store access beyond the state
 * passed in — same rules as every other view.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { viewSheet, sheetRow, sheetLinkRow, sheetToggleRow } from '../ui/viewSheet.js';
import { fieldTogglesFor, CARD_FIELD_KEYS } from '../domain/contentLens.js';
import { findCategoryById, contentPrefsOf } from '../services/contentPrefs.js';

/** A toggle-looking row that dispatches a CLICK handler (not the CHANGE
 *  pipeline) — for state that is not a plain settings boolean. The knob
 *  is pure visual chrome (no nested form control inside a <button>). */
function sheetSwitchRow(action, labelKey, iconName, lang, on, dataset = {}) {
  const attrs = Object.entries(dataset)
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
    .join(' ');
  return `
  <button type="button" class="view-sheet__row view-sheet__row--toggle" data-action="${action}" ${attrs} aria-pressed="${on}">
    ${icon(iconName, { size: 18 })}<span class="view-sheet__label">${t(labelKey, lang)}</span>
    <span class="switch" aria-hidden="true">
      <span class="switch__track ${on ? 'switch__track--on' : ''}"></span>
    </span>
  </button>`;
}

/* ------------------------------------------------------------------ */
/* Library + sections (Azkar)                                          */
/* ------------------------------------------------------------------ */

const FIELD_LABELS = {
  transliteration: 'content.fieldTranslit',
  translation: 'content.fieldTranslation',
  virtues: 'content.fieldVirtues',
  reference: 'content.fieldReference',
  grade: 'content.fieldGrade',
  notes: 'content.fieldNotes',
};
const FIELD_ICONS = {
  transliteration: 'feather',
  translation: 'list',
  virtues: 'sparkle',
  reference: 'book',
  grade: 'shield',
  notes: 'info',
};

/** (v5.0.0) One banner's field-visibility sheet — which JSON fields its
 *  cards show (e.g. Arabic-only). Overrides cascade to every section and
 *  card under the banner. */
export function buildFieldTogglesSheet(state, libraryId) {
  const lang = state.settings.language;
  const doc =
    state.library.documents[libraryId] ||
    Object.values(state.customContent).find((d) => d.metadata.id === libraryId);
  const name = doc ? pickLocale(doc.metadata.name, lang) : libraryId;
  const toggles = fieldTogglesFor(state, libraryId);
  const hasOverride = !!(contentPrefsOf(state).libraryFieldToggles || {})[libraryId];
  return viewSheet({
    titleKey: 'content.fields',
    lang,
    labelledBy: 'modal-title-view-sheet',
    intro: escapeHTML(name),
    groups: [
      {
        rows: CARD_FIELD_KEYS.map((k) =>
          sheetSwitchRow(
            'content-field-toggle',
            FIELD_LABELS[k],
            FIELD_ICONS[k],
            lang,
            toggles[k],
            {
              'library-id': libraryId,
              field: k,
            }
          )
        ),
      },
      {
        rows: [
          hasOverride
            ? sheetRow('content-field-reset', 'content.fieldsInherit', 'refresh', lang, {
                dataset: { 'library-id': libraryId },
              })
            : sheetRow('content-field-note', 'content.fieldsInherited', 'info', lang),
        ],
      },
    ],
  });
}

/** (v5.0.0) The tab-level schedule manager — every azkar/section/banner
 *  reminder, toggleable and removable in place. */
export function buildScheduleManagerSheet(state) {
  const lang = state.settings.language;
  const rows = (state.reminders || []).map(
    (r) => `
    <div class="view-sheet__row view-sheet__row--schedule" data-reminder-id="${escapeHTML(r.id)}">
      ${icon('bell', { size: 18 })}
      <span class="view-sheet__label">
        <span class="view-sheet__value">${escapeHTML(r.label || t('app.name', lang))}</span>
        <span class="view-sheet__hint" dir="ltr">${escapeHTML(r.time)}</span>
      </span>
      <button type="button" class="icon-btn icon-btn--sm" data-action="schedule-toggle" data-reminder-id="${escapeHTML(r.id)}" aria-pressed="${r.enabled !== false}" aria-label="${t('common.toggle', lang)}">
        ${icon(r.enabled !== false ? 'check' : 'close', { size: 15 })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm manage-action--danger" data-action="schedule-delete" data-reminder-id="${escapeHTML(r.id)}" aria-label="${t('editor.delete', lang)}">
        ${icon('trash', { size: 15 })}
      </button>
    </div>`
  );
  return viewSheet({
    titleKey: 'schedule.manager',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: rows.length
          ? rows.join('')
          : sheetRow('content-field-note', 'schedule.none', 'info', lang),
      },
    ],
  });
}

export function buildLibrarySheet(state) {
  const lang = state.settings.language;
  const manage = !!state.ui?.contentManage;
  return viewSheet({
    titleKey: 'viewMenu.library',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        labelKey: 'viewMenu.group.customize',
        rows: [
          sheetRow('view-sheet-manage', 'library.sheet.manage', 'edit', lang, {
            extra: `<span class="view-sheet__value">${t(manage ? 'content.done' : 'viewMenu.group.customize', lang)}</span>`,
          }),
          sheetRow('library-sheet-reset-hidden', 'library.sheet.resetHidden', 'refresh', lang),
          sheetRow('content-restore-all', 'library.sheet.restoreAll', 'refresh', lang),
          sheetToggleRow(
            'showTranslation',
            'library.sheet.translation',
            'list',
            lang,
            state.settings.showTranslation
          ),
          sheetToggleRow(
            'showTransliteration',
            'library.sheet.translit',
            'feather',
            lang,
            state.settings.showTransliteration
          ),
        ],
      },
      {
        labelKey: 'schedule.group',
        rows: [sheetRow('schedule-open-manager', 'schedule.manager', 'bell', lang)],
      },
      {
        labelKey: 'viewMenu.group.data',
        rows: [
          sheetRow('editor-new-library', 'library.sheet.newLibrary', 'plus', lang),
          sheetRow('import-backup', 'library.sheet.import', 'download', lang),
          sheetRow('export-backup', 'library.sheet.backup', 'upload', lang),
          sheetLinkRow('library.openEditor', 'edit', VIEWS.EDITOR, {}, lang),
        ],
      },
    ],
  });
}

export function buildCategorySheet(state) {
  const lang = state.settings.language;
  const categoryId = state.activeParams?.id || '';
  const found = findCategoryById(state, categoryId);
  const libId = found?.doc?.metadata?.id || '';
  const isCustom = !!found?.isCustom;
  return viewSheet({
    titleKey: 'viewMenu.category',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('view-sheet-manage', 'category.sheet.manage', 'edit', lang),
          sheetRow('content-reset-category', 'content.resetCategory', 'refresh', lang, {
            dataset: { 'category-id': categoryId },
          }),
          sheetRow('content-restore-category', 'content.restoreSection', 'refresh', lang, {
            dataset: { 'category-id': categoryId },
          }),
          sheetRow('content-schedule', 'schedule.title', 'bell', lang, {
            dataset: { 'category-id': categoryId },
          }),
          sheetRow('content-edit-category', 'content.editSection', 'edit', lang, {
            dataset: { 'category-id': categoryId },
          }),
          sheetRow('content-new-item', 'editor.newItem', 'plus', lang, {
            dataset: { 'library-id': libId, 'category-id': categoryId, scope: 'builtin' },
          }),
          sheetRow('content-delete-category', 'editor.delete', 'trash', lang, {
            dataset: {
              'library-id': libId,
              'category-id': categoryId,
              custom: isCustom ? '1' : '',
            },
          }),
        ],
      },
      {
        labelKey: 'viewMenu.group.display',
        rows: [
          sheetToggleRow(
            'showTranslation',
            'library.sheet.translation',
            'list',
            lang,
            state.settings.showTranslation
          ),
          sheetToggleRow(
            'showTransliteration',
            'library.sheet.translit',
            'feather',
            lang,
            state.settings.showTransliteration
          ),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Ahadeeth                                                            */
/* ------------------------------------------------------------------ */

export function buildHadithSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.hadith',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        labelKey: 'viewMenu.group.customize',
        rows: [
          sheetRow('view-sheet-manage', 'hadith.sheet.manage', 'edit', lang),
          sheetRow('hadith-restore-all', 'hadith.sheet.restoreAll', 'refresh', lang),
        ],
      },
      {
        labelKey: 'schedule.group',
        rows: [
          sheetRow('content-schedule', 'hadith.sheet.schedule', 'bell', lang),
          sheetRow('schedule-open-manager', 'schedule.manager', 'calendar', lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.display',
        rows: [
          sheetToggleRow(
            'showHadithArabic',
            'hadith.sheet.arabic',
            'book-open',
            lang,
            state.settings.showHadithArabic
          ),
          sheetToggleRow(
            'showTranslation',
            'hadith.sheet.translation',
            'list',
            lang,
            state.settings.showTranslation
          ),
        ],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [
          sheetRow('hadith-retry-index', 'hadith.sheet.retry', 'refresh', lang),
          sheetLinkRow('hadith.sheet.sources', 'info', VIEWS.ABOUT, {}, lang),
        ],
      },
    ],
  });
}

export function buildHadithBookSheet(state) {
  const lang = state.settings.language;
  const bookId = state.activeParams?.id || '';
  const hp = contentPrefsOf(state).hadithPrefs || {};
  const customized = !!(
    hp.hiddenHadiths && Object.keys(hp.hiddenHadiths).some((k) => k.startsWith(`${bookId}:`))
  );
  return viewSheet({
    titleKey: 'viewMenu.hadithBook',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('view-sheet-manage', 'hadith.sheet.manageBook', 'edit', lang),
          sheetRow('content-schedule', 'hadith.sheet.scheduleBook', 'bell', lang, {
            dataset: { 'book-id': bookId },
          }),
          customized
            ? sheetRow('hadith-restore-book', 'hadith.sheet.restoreBook', 'refresh', lang, {
                dataset: { 'book-id': bookId },
              })
            : sheetRow('content-field-note', 'hadith.sheet.pristine', 'info', lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.display',
        rows: [
          sheetToggleRow(
            'showHadithArabic',
            'hadith.sheet.arabic',
            'book-open',
            lang,
            state.settings.showHadithArabic
          ),
          sheetToggleRow(
            'showTranslation',
            'hadith.sheet.translation',
            'list',
            lang,
            state.settings.showTranslation
          ),
        ],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [
          sheetRow('hadith-copy-book', 'hadith.sheet.copyBook', 'copy', lang, {
            dataset: { 'book-id': bookId },
          }),
          sheetLinkRow('nav.back', 'chevronLeft', VIEWS.HADITH, {}, lang),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Prayer                                                              */
/* ------------------------------------------------------------------ */

export function buildPrayerSheet(state) {
  const lang = state.settings.language;
  const traveler = state.settings.prayer.travelerMode === true;
  return viewSheet({
    titleKey: 'viewMenu.prayer',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        labelKey: 'viewMenu.group.tracking',
        rows: [
          sheetRow('prayer-open-sunnah', 'prayer.sheet.sunnah', 'moon', lang),
          sheetRow('prayer-open-qada', 'prayer.sheet.qada', 'refresh', lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.customize',
        rows: [
          sheetRow('prayer-open-adhan', 'prayer.sheet.adhan', 'volume', lang),
          sheetRow('prayer-open-calc', 'prayer.sheet.calc', 'calculator', lang),
          sheetLinkRow('prayer.sheet.ambient', 'moon', VIEWS.AMBIENT, {}, lang),
          sheetSwitchRow('view-toggle-traveler', 'traveler.title', 'plane', lang, traveler),
        ],
      },
      {
        labelKey: 'viewMenu.group.location',
        rows: [
          sheetRow('prayer-open-location', 'prayer.sheet.location', 'location', lang),
          sheetRow('prayer-request-location', 'prayer.enableLocation', 'location', lang),
          sheetRow('prayer-export-ics', 'prayer.sheet.exportIcs', 'download', lang),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Qibla                                                               */
/* ------------------------------------------------------------------ */

export function buildQiblaSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.qibla',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [sheetRow('qibla-enable-compass', 'qibla.sheet.compass', 'compass', lang)],
      },
      {
        labelKey: 'viewMenu.group.location',
        rows: [
          sheetRow('prayer-open-location', 'qibla.sheet.location', 'location', lang),
          sheetLinkRow('qibla.sheet.times', 'sun', VIEWS.PRAYER, {}, lang),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Ramadan                                                             */
/* ------------------------------------------------------------------ */

export function buildRamadanSheet(state) {
  const lang = state.settings.language;
  const ra = state.settings.prayer.ramadanAlerts || { suhoor: false, iftar: false };
  return viewSheet({
    titleKey: 'viewMenu.ramadan',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        labelKey: 'viewMenu.group.tools',
        rows: [
          sheetSwitchRow('toggle-ramadan-alert', 'ramadan.suhoorAlert', 'sun', lang, ra.suhoor, {
            alert: 'suhoor',
          }),
          sheetSwitchRow('toggle-ramadan-alert', 'ramadan.iftarAlert', 'sunset', lang, ra.iftar, {
            alert: 'iftar',
          }),
        ],
      },
      {
        labelKey: 'viewMenu.group.tracking',
        rows: [
          sheetRow('prayer-open-qada', 'ramadan.sheet.qada', 'refresh', lang),
          sheetLinkRow('ramadan.sheet.calendar', 'calendar', VIEWS.CALENDAR, {}, lang),
          sheetLinkRow('ramadan.sheet.checklist', 'target', VIEWS.CHECKLIST, {}, lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.customize',
        rows: [sheetLinkRow('ramadan.sheet.khatma', 'book', VIEWS.MUSHAF, {}, lang)],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export function buildCalendarSheet(state) {
  const lang = state.settings.language;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return viewSheet({
    titleKey: 'viewMenu.calendar',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('calendar-new-note', 'calendar.sheet.note', 'plus', lang, {
            dataset: { date: iso },
          }),
        ],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [
          sheetLinkRow('calendar.sheet.fasting', 'sun', VIEWS.CALENDAR, {}, lang),
          sheetLinkRow('calendar.sheet.special', 'star', VIEWS.LIBRARY, {}, lang),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

export function buildChecklistSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.checklist',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [sheetRow('checklist-reset-day', 'checklist.sheet.reset', 'refresh', lang)],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [sheetLinkRow('checklist.sheet.stats', 'stats', VIEWS.STATISTICS, {}, lang)],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Tasbih                                                              */
/* ------------------------------------------------------------------ */

export function buildTasbihSheet(state) {
  const lang = state.settings.language;
  const phrase = state.tasbih?.activeItemId || 'subhanallah';
  return viewSheet({
    titleKey: 'viewMenu.tasbih',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('tasbih-reset', 'tasbih.sheet.reset', 'refresh', lang, {
            dataset: { 'phrase-id': phrase },
          }),
          sheetToggleRow(
            'hapticsEnabled',
            'tasbih.sheet.haptics',
            'bead',
            lang,
            state.settings.hapticsEnabled
          ),
        ],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [sheetLinkRow('tasbih.sheet.stats', 'stats', VIEWS.STATISTICS, {}, lang)],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Zakat                                                               */
/* ------------------------------------------------------------------ */

export function buildZakatSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.zakat',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('zakat-clear-inputs', 'zakat.sheet.clear', 'refresh', lang),
          sheetRow('zakat-save-snapshot', 'zakat.sheet.snapshot', 'bookmark', lang),
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function buildStatisticsSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.statistics',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetLinkRow('stats.sheet.garden', 'sprout', VIEWS.GARDEN, {}, lang),
          sheetLinkRow('stats.sheet.review', 'target', VIEWS.QURAN, { mem: '1' }, lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.data',
        rows: [sheetRow('export-backup', 'stats.sheet.backup', 'upload', lang)],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Garden                                                              */
/* ------------------------------------------------------------------ */

export function buildGardenSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.garden',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [sheetRow('garden-how-it-works', 'garden.sheet.how', 'info', lang)],
      },
      {
        labelKey: 'viewMenu.group.tools',
        rows: [
          sheetLinkRow('garden.sheet.tasbih', 'tasbih', VIEWS.TASBIH, {}, lang),
          sheetLinkRow('garden.sheet.stats', 'stats', VIEWS.STATISTICS, {}, lang),
        ],
      },
    ],
  });
}

/** The "what grows the garden" explainer modal. */
export function buildGardenHowSheet(state) {
  const lang = state.settings.language;
  return `
  <div class="view-sheet garden-how">
    <h2 id="modal-title-garden-how">${t('garden.sheet.howTitle', lang)}</h2>
    <p class="view-sheet__intro">${t('garden.sheet.howBody', lang)}</p>
    <div class="view-sheet__group">
      ${sheetLinkRow('garden.sheet.tasbih', 'tasbih', VIEWS.TASBIH, {}, lang)}
      ${sheetLinkRow('nav.library', 'library', VIEWS.LIBRARY, {}, lang)}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Editor (route survives; nav tab is gone)                            */
/* ------------------------------------------------------------------ */

export function buildEditorSheet(state) {
  const lang = state.settings.language;
  return viewSheet({
    titleKey: 'viewMenu.editor',
    lang,
    labelledBy: 'modal-title-view-sheet',
    groups: [
      {
        rows: [
          sheetRow('editor-new-library', 'editor.sheet.newLibrary', 'plus', lang),
          sheetRow('editor-new-category', 'editor.sheet.newCategory', 'book', lang),
        ],
      },
      {
        labelKey: 'viewMenu.group.data',
        rows: [
          sheetRow('import-backup', 'editor.sheet.import', 'download', lang),
          sheetRow('export-backup', 'editor.sheet.backup', 'upload', lang),
        ],
      },
    ],
  });
}
