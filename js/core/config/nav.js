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
 * and the tasbih entry live there; the azkar grid lives in the AZKAR
 * section behind the LIBRARY route (renderLibrary reuses the browser
 * component from views/home.js — one component, two places is a copy).
 *
 * Retired as doors — routes and deep links untouched, keys kept in both
 * dictionaries (zero drift; several stay live as switch/view labels):
 * nav.roots (absorbed into the MUSHAF door), nav.tasbih (stays as the
 * Practise segment label), nav.ramadan (4th Prayer segment), nav.zakat +
 * nav.offline (9th/10th You segments), nav.search (doorless-by-design via
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
      // The Today landing: ribbon + moment + resume + tasbih entry. The
      // grid moved to the AZKAR section, so HOME stands alone — one tap,
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
      Object.freeze({ route: 'CATEGORY', taps: 1, via: 'adhkar-browser', direct: false }),
      Object.freeze({ route: 'MOOD', taps: 1, via: 'adhkar-browser' }),
      Object.freeze({ route: 'FOCUS', taps: 2, via: 'adhkar-browser' }),
      Object.freeze({ route: 'COLLECTIONS', taps: 1, via: 'azkar-collections-panel' }),
      Object.freeze({
        route: 'COLLECTION',
        taps: 2,
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
      // One book, one door: the classic reader and word study ride the
      // switch, and the tajweed course + look-alike ayat moved here from
      // Practise (owner IA: Qur'an carries its own study depths, while
      // Practise keeps counting + the Names quiz).
      Object.freeze({ route: 'MUSHAF', taps: 1, via: null }),
      Object.freeze({ route: 'QURAN', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'ROOTS', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'AUDIO', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'TAJWEED_COURSE', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'MUTASHABIHAT', taps: 2, via: 'quran-mode-switch' }),
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
      Object.freeze({ route: 'QIBLA', taps: 2, via: 'prayer-mode-switch' }),
      Object.freeze({ route: 'CALENDAR', taps: 2, via: 'prayer-mode-switch' }),
      Object.freeze({ route: 'RAMADAN', taps: 2, via: 'prayer-mode-switch' }),
    ]),
  }),
  Object.freeze({
    entry: 'TASBIH',
    view: VIEWS.TASBIH,
    icon: 'tasbih',
    labelKey: 'nav.practise',
    members: Object.freeze([
      // Counting and the Names quiz are one activity; the door carries the
      // section name while the entry segment keeps the nav.tasbih label.
      // The tajweed course + look-alike ayat moved to the QURAN section.
      Object.freeze({ route: 'TASBIH', taps: 1, via: null }),
      Object.freeze({ route: 'QUIZ', taps: 2, via: 'practise-mode-switch' }),
    ]),
  }),
  Object.freeze({
    entry: 'CHECKLIST',
    view: VIEWS.CHECKLIST,
    icon: 'target',
    labelKey: 'nav.you',
    members: Object.freeze([
      // Everything about the person, in one place. Zakat and the offline
      // library sit beside settings, where storage belongs.
      Object.freeze({ route: 'CHECKLIST', taps: 1, via: null }),
      Object.freeze({ route: 'GARDEN', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'FAVORITES', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'JOURNAL', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'STATISTICS', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'CERTIFICATE', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'ZAKAT', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'OFFLINE', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'SETTINGS', taps: 2, via: 'you-mode-switch' }),
      Object.freeze({ route: 'ABOUT', taps: 2, via: 'you-mode-switch' }),
    ]),
  }),
]);

/** Door entries in chrome order: the seven taps. */
export const DOOR_ENTRIES = Object.freeze(DOORS.map((d) => d.entry));

/** Flat chrome labels in order — the reachability trap pins this sequence. */
export const DOOR_LABEL_KEYS = Object.freeze(DOORS.map((d) => d.labelKey));
