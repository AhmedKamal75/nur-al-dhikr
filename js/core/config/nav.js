/**
 * core/config/nav.js — the six-door chrome map (REORG Phase 8 / HANDOFF A1).
 *
 * The single source of truth for the top-level chrome (AGENTS.md rule 6:
 * derive, don't pin). Every chrome surface — the rail/drawer entries
 * (NAV_GROUPS), the mobile bar (MOBILE_ITEMS), the active-door lookup
 * (isActive) and the four in-chrome section switches — derives from DOORS
 * below, so the tree cannot drift from itself. A static pin that cannot be
 * derived must name this file as its source, in a comment and in its test.
 *
 * Six task-shaped doors, in order (REORGANISATION-PLAN.md §2a + HANDOFF A1):
 * HOME (Adhkar) · MUSHAF (Qur'an) · HADITH · PRAYER · TASBIH-entry labelled
 * nav.practise (Practise) · CHECKLIST-entry labelled nav.you (You).
 *
 * Retired as doors — routes and deep links untouched, keys kept in both
 * dictionaries (zero drift; several stay live as switch/view labels):
 * nav.library (route stays behind the grid's all-view), nav.roots (absorbed
 * into the MUSHAF door), nav.tasbih (stays as the Practise segment label),
 * nav.ramadan (4th Prayer segment), nav.zakat + nav.offline (9th/10th You
 * segments), nav.search (doorless-by-design via the topbar palette).
 * The read/worship/tools/mine taxonomy retires with the groups — the chrome
 * is flat, so the nav.group.* keys retire in both languages.
 *
 * String-only data: this module imports VIEWS only. No functions, no store,
 * no i18n — derivation lives in js/ui/shell.js, drift-checks in
 * tests/nav-reachability.test.js (which imports this map directly).
 */

import { VIEWS } from './views.js';

/**
 * One door: the chrome entry plus every route that resolves to it.
 * - `entry`: the VIEWS key of the door's own route (the tap target).
 * - `view`: the route value (VIEWS[entry]) the chrome links to.
 * - `icon` / `labelKey`: the chrome glyph and bilingual dictionary key.
 * - `members`: every route key resolving to this door, with the tap count
 *   from the door (`taps`) and the hop carrying it (`via`, null for the
 *   door itself — it IS the tap).
 */
export const DOORS = Object.freeze([
  Object.freeze({
    entry: 'HOME',
    view: VIEWS.HOME,
    icon: 'home',
    labelKey: 'nav.home',
    members: Object.freeze([
      // LIBRARY stays a real route behind the grid's all-view; its door is HOME.
      Object.freeze({ route: 'HOME', taps: 1, via: null }),
      Object.freeze({ route: 'LIBRARY', taps: 2, via: 'home-all-view' }),
      Object.freeze({ route: 'CATEGORY', taps: 1, via: 'adhkar-browser' }),
      Object.freeze({ route: 'MOOD', taps: 1, via: 'adhkar-browser' }),
      Object.freeze({ route: 'FOCUS', taps: 2, via: 'adhkar-browser' }),
      Object.freeze({ route: 'COLLECTIONS', taps: 1, via: 'home-collections-panel' }),
      Object.freeze({ route: 'COLLECTION', taps: 2, via: 'home-collections-panel' }),
    ]),
  }),
  Object.freeze({
    entry: 'MUSHAF',
    view: VIEWS.MUSHAF,
    icon: 'quran',
    labelKey: 'nav.quran',
    members: Object.freeze([
      // One book, one door: the classic reader and word study ride the switch.
      Object.freeze({ route: 'MUSHAF', taps: 1, via: null }),
      Object.freeze({ route: 'QURAN', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'ROOTS', taps: 2, via: 'quran-mode-switch' }),
      Object.freeze({ route: 'AUDIO', taps: 2, via: 'quran-mode-switch' }),
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
      // Learning and counting are one activity; the door carries the section
      // name while the entry segment keeps the nav.tasbih label.
      Object.freeze({ route: 'TASBIH', taps: 1, via: null }),
      Object.freeze({ route: 'TAJWEED_COURSE', taps: 2, via: 'practise-mode-switch' }),
      Object.freeze({ route: 'QUIZ', taps: 2, via: 'practise-mode-switch' }),
      Object.freeze({ route: 'MUTASHABIHAT', taps: 2, via: 'practise-mode-switch' }),
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

/** Door entries in chrome order: the six taps. */
export const DOOR_ENTRIES = Object.freeze(DOORS.map((d) => d.entry));

/** Flat chrome labels in order — the reachability trap pins this sequence. */
export const DOOR_LABEL_KEYS = Object.freeze(DOORS.map((d) => d.labelKey));
