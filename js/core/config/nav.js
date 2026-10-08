/**
 * core/config/nav.js — the seven-section chrome map (IA-7, v5.17.61).
 *
 * The single source of truth for the top-level chrome (AGENTS.md rule 6:
 * derive, don't pin). Every chrome surface — the rail/drawer entries
 * (NAV_GROUPS), the mobile bar (MOBILE_ITEMS), the active-door lookup
 * (isActive) and the in-chrome section switches — derives from SECTIONS
 * below (exported as DOORS so every existing importer keeps working), so
 * the tree cannot drift from itself. A static pin that cannot be derived
 * must name this file as its source, in a comment and in its test.
 *
 * Seven task-shaped sections, in order (owner IA ruling, v5.17.61):
 * HOME (Today landing) · AZKAR (the adhkar browser, entry LIBRARY) ·
 * MUSHAF (Qur'an) · HADITH · PRAYER · TASBIH-entry labelled nav.practise
 * (Practise) · CHECKLIST-entry labelled nav.you (You).
 *
 * HOME is a landing, not the grid: the ribbon, the moment, the resume rows
 * and the daily status and configured quick actions live there; the azkar grid lives in the AZKAR
 * section behind the LIBRARY route (renderLibrary reuses the browser
 * component from views/home.js — one component, two places is a copy).
 *
 * Deep-link routes remain stable even when they are not top-level chrome.
 * Their existing labels stay in both dictionaries for view-level context, but
 * navigation hierarchy is owned here rather than duplicated inside views.
 * nav.roots (absorbed into the MUSHAF door), nav.tasbih (stays as the
 * Practise segment label), nav.ramadan (4th Prayer segment), nav.zakat +
 * nav.zakat + nav.offline (standalone application-tail entries), nav.search (doorless-by-design via
 * the topbar palette). nav.library retired with the Library nav noun (the
 * section is Azkar now; title.library stays the document title). The
 * read/worship/tools/mine taxonomy stays retired with the groups — the
 * chrome is sectional, so the nav.group.* keys stay retired in both
 * languages.
 *
 * String-only data: this module imports VIEWS only. No functions, no store,
 * no i18n — derivation lives in js/ui/shell.js, drift-checks in
 * tests/nav-reachability.test.js (which imports this map directly).
 */

import { VIEWS } from './views.js';

/**
 * One section: the chrome entry plus every route that resolves to it.
 * - `entry`: the VIEWS key of the section's own route (the tap target).
 * - `view`: the route value (VIEWS[entry]) the chrome links to.
 * - `icon` / `labelKey`: the chrome glyph and bilingual dictionary key.
 * - `members`: every route key resolving to this section, with the tap count
 *   from the section (`taps`) and the hop carrying it (`via`, null for the
 *   section itself — it IS the tap). Tile-depth members carry
 *   `direct: false`: their views need a parameter (an id) and answer a bare
 *   link with an honest 404, so the drawer offers no direct row for them —
 *   the section landing's own tiles do. Absent `direct` means a direct hop.
 */
export const DOORS = Object.freeze([
  Object.freeze({
    entry: 'HOME',
    view: VIEWS.HOME,
    icon: 'home',
    labelKey: 'nav.home',
    members: Object.freeze([
      // The Today landing: brand context + prayer context + daily status
      // + configured quick actions. The grid moved to the AZKAR section,
      // so HOME stands alone — one tap,
      // no subsections.
      Object.freeze({ route: 'HOME', taps: 1, via: null }),
    ]),
  }),
  Object.freeze({
    entry: 'LIBRARY',
    view: VIEWS.LIBRARY,
    icon: 'book',
    labelKey: 'nav.azkar',
    members: Object.freeze([
      // The adhkar browser: the grid that used to BE home, now a section
      // with its own door (the LIBRARY route) and its own in-chrome switch.
      // CATEGORY and COLLECTION are tile-depth only (`direct: false`):
      // their views need an id and answer bare links with an honest 404,
      // so the drawer offers no direct hop — the browser tiles carry them.
      Object.freeze({ route: 'LIBRARY', taps: 1, via: null }),
      Object.freeze({ route: 'CATEGORY', taps: 1, via: 'main-menu', direct: false }),
      Object.freeze({
        route: 'MOOD',
        labelKey: 'title.mood',
        taps: 1,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'FOCUS',
        labelKey: 'title.focus',
        taps: 2,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'COLLECTIONS',
        labelKey: 'title.collections',
        taps: 2,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'COLLECTION',
        taps: 3,
        via: 'azkar-collections-panel',
        direct: false,
      }),
    ]),
  }),
  Object.freeze({
    entry: 'MUSHAF',
    view: VIEWS.MUSHAF,
    icon: 'quran',
    labelKey: 'nav.quran',
    members: Object.freeze([
      // One book, one door: the classic reader and word study ride the switch.
      // The Tajweed course remains Qur’an-owned; recall drills may launch from
      // Practice without moving the underlying study surface.
      Object.freeze({ route: 'MUSHAF', taps: 1, via: null }),
      Object.freeze({
        route: 'QURAN',
        labelKey: 'quran.modeList',
        taps: 2,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'ROOTS',
        labelKey: 'quran.modeWord',
        taps: 2,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'AUDIO',
        labelKey: 'nav.audio',
        taps: 2,
        via: 'main-menu',
      }),
      Object.freeze({
        route: 'TAJWEED_COURSE',
        labelKey: 'nav.tajweedCourse',
        taps: 2,
        via: 'main-menu',
      }),
    ]),
  }),
  Object.freeze({
    entry: 'HADITH',
    view: VIEWS.HADITH,
    icon: 'mosque',
    labelKey: 'nav.hadith',
    members: Object.freeze([Object.freeze({ route: 'HADITH', taps: 1, via: null })]),
  }),
  Object.freeze({
    entry: 'PRAYER',
    view: VIEWS.PRAYER,
    icon: 'prayer-rug',
    labelKey: 'nav.prayer',
    members: Object.freeze([
      // Times, direction, calendar and the Ramadan companion: one act.
      Object.freeze({ route: 'PRAYER', taps: 1, via: null }),
      Object.freeze({ route: 'QIBLA', labelKey: 'nav.qibla', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'CALENDAR', labelKey: 'nav.calendar', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'RAMADAN', labelKey: 'nav.ramadan', taps: 2, via: 'main-menu' }),
    ]),
  }),
  Object.freeze({
    entry: 'PRACTICE',
    view: VIEWS.PRACTICE,
    icon: 'repeat',
    labelKey: 'nav.practise',
    members: Object.freeze([
      // Practice is a task launcher. The underlying engines remain in their
      // own views: Tasbih, 99 Names, and Qur'an recall (Mutashabihat).
      Object.freeze({ route: 'PRACTICE', taps: 1, via: null }),
      Object.freeze({ route: 'TASBIH', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'QUIZ', labelKey: 'quiz.title', taps: 2, via: 'main-menu' }),
      Object.freeze({
        route: 'MUTASHABIHAT',
        labelKey: 'mutashabihat.title',
        taps: 2,
        via: 'main-menu',
      }),
    ]),
  }),
  Object.freeze({
    entry: 'CHECKLIST',
    view: VIEWS.CHECKLIST,
    icon: 'target',
    labelKey: 'nav.you',
    members: Object.freeze([
      // Personal practice and progress. Utility/account controls live in
      // their own main-menu group below; Settings/About are the final standalone
      // application entries.
      Object.freeze({ route: 'CHECKLIST', taps: 1, via: null }),
      Object.freeze({ route: 'GARDEN', labelKey: 'you.growth', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'FAVORITES', labelKey: 'nav.favorites', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'JOURNAL', labelKey: 'journal.title', taps: 2, via: 'main-menu' }),
      Object.freeze({ route: 'STATISTICS', labelKey: 'nav.statistics', taps: 2, via: 'main-menu' }),
      Object.freeze({
        route: 'CERTIFICATE',
        labelKey: 'certificate.title',
        taps: 2,
        via: 'main-menu',
      }),
    ]),
  }),
]);

/** Door entries in chrome order: the seven taps. */
export const DOOR_ENTRIES = Object.freeze(DOORS.map((d) => d.entry));

/** Flat chrome labels in order — the reachability trap pins this sequence. */
export const DOOR_LABEL_KEYS = Object.freeze(DOORS.map((d) => d.labelKey));

/** Application destinations deliberately outside the seven worship/task doors.
 * They are standalone siblings at the end of the main menu. Do not invent
 * semantic buckets such as "utility" or "settings" that make unrelated
 * destinations look like one feature family. The visual shell may add
 * separators for readability, but membership stays flat and derived here.
 */
export const APP_MENU_GROUPS = Object.freeze([
  Object.freeze({
    kind: 'zakat',
    entries: Object.freeze([
      Object.freeze({ view: VIEWS.ZAKAT, icon: 'calculator', label: 'nav.zakat' }),
    ]),
  }),
  Object.freeze({
    kind: 'offline',
    entries: Object.freeze([
      Object.freeze({ view: VIEWS.OFFLINE, icon: 'download', label: 'nav.offline' }),
    ]),
  }),
  Object.freeze({
    kind: 'settings',
    entries: Object.freeze([
      Object.freeze({ view: VIEWS.SETTINGS, icon: 'settings', label: 'nav.settings' }),
    ]),
  }),
  Object.freeze({
    kind: 'about',
    entries: Object.freeze([
      Object.freeze({ view: VIEWS.ABOUT, icon: 'info', label: 'nav.about' }),
    ]),
  }),
]);

/** Flat lookup used by the route reachability test and active-route audit. */
export const APP_MENU_ENTRIES = Object.freeze(APP_MENU_GROUPS.flatMap((group) => group.entries));
