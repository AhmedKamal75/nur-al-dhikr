/**
 * components/shell.js
 * The persistent app shell: top bar (hamburger, title, search shortcut,
 * theme toggle) and a SEVEN-SECTION navigation (IA-7, v5.17.61).
 *
 *  - Desktop (>= 960px): a side rail with the seven sections and no taxonomy
 *    headers — Home · Azkar · Qur'an · Ahadeeth · Prayer · Practise · You.
 *    The hamburger collapses it to an icon-only rail (the collapsed state
 *    persists in settings.navCollapsed). The rail scrolls independently,
 *    so nothing is ever unreachable.
 *  - Mobile: the bottom bar exposes all seven top-level sections directly.
 *    The hamburger in the top bar remains a secondary hierarchical drawer
 *    for subsection navigation and power-user access; it is never required
 *    to reach a top-level destination.
 *
 * Markup is identical for both breakpoints; CSS picks the presentation.
 *
 * Rule-6 note: every list below derives from SECTIONS (exported as DOORS)
 * in js/core/config/nav.js — the route→section map is the single source
 * of truth, and this file only renders it. A static pin here names nav.js
 * as its source.
 */

import { icon } from '../core/icons.js';
import { isRTL, t } from '../core/i18n.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { DOORS } from '../core/config/nav.js';

// (v5.2.65, item 22) kids-mode scope: the chrome offers only the allowlist
// — the Kids home plus the Tasbih counter — so kids cannot wander by tap.
// The reducer backstop still guards every non-chrome path (deep links,
// history, palette) even if markup is bypassed.
const KIDS_NAV_ITEMS = [
  { view: VIEWS.KIDS, icon: 'star', label: 'kids.title' },
  { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
];
const KIDS_NAV_GROUPS = [{ label: 'kids.title', items: KIDS_NAV_ITEMS }];

/**
 * (IA-7, v5.17.61) the seven-section chrome, derived from DOORS in
 * js/core/config/nav.js — order, entry view, icon and labelKey all come
 * from the map, so the rail cannot drift from the reachability trap.
 * Seven entries, this order: HOME(nav.home) · LIBRARY(nav.azkar) ·
 * MUSHAF(nav.quran) · HADITH(nav.hadith) · PRAYER(nav.prayer) ·
 * TASBIH-entry labelled nav.practise · CHECKLIST-entry labelled nav.you.
 *
 * Retired as doors (routes + deep links untouched, dictionary keys kept):
 * nav.roots (absorbed into the MUSHAF door), nav.tasbih (stays as
 * the Practise segment label), nav.ramadan (4th Prayer segment), nav.zakat
 * + nav.offline (9th/10th You segments), nav.search (doorless-by-design
 * via the topbar palette). nav.library retired with the Library nav noun
 * (IA-7: the section is Azkar now). The read/worship/tools/mine taxonomy
 * retires with the groups.
 */
export const NAV_GROUPS = Object.freeze(
  DOORS.map((d) => Object.freeze({ view: d.view, icon: d.icon, label: d.labelKey }))
);

/** The mobile bar exposes every top-level door; the drawer remains secondary. */
const MOBILE_ITEMS = Object.freeze(
  DOORS.map((d) => Object.freeze({ view: d.view, icon: d.icon, label: d.labelKey }))
);

/**
 * (REORG Phase 7 + Phase 8) internal-only decisions — plan §4 Phase 7: "a
 * door, or a documented decision that it is internal-only. A route with no
 * door and no justification is a finding."
 *
 * Three routes stay doorless ON PURPOSE, and this block is the justification
 * the trap test reads alongside its own map copy:
 *
 * - `EDITOR` is a TOOL, not a destination. It is invoked from content
 *   surfaces that already have doors — the Library banner sheet
 *   (`library.openEditor`), the Category manage row (`content-new-item`,
 *   `content-edit-item`), the card menu — never browsed to. A nav door
 *   would promise a place; the editor IS an action on a place. Deep link
 *   `#/editor` keeps working (palette, direct URL); it just claims no
 *   chrome slot, and no active state aliases it.
 * - `AMBIENT` is a KIOSK, not a section. The nightstand display hides the
 *   entire chrome by design (`body.is-ambient` — topbar, nav, drawer,
 *   player, same contract as mushaf fullscreen), so a nav door would
 *   promise chrome the route deliberately removes. Entry is the Prayer
 *   sheet (`prayer.sheet.ambient`); exit is the in-view close link back
 *   to `#/prayer`. Deep link `#/ambient` keeps working; it just claims
 *   no chrome slot, and no active state aliases it.
 * - `SEARCH` is doorless BY DESIGN (Phase 8): the search view is one tap
 *   away on the topbar palette button (`palette.open`), which honestly
 *   names itself as a quick launcher, and the palette lists the search
 *   view as a destination. A sixth-plus-one nav door would promise a
 *   place for what is a launcher action; the §1.6 label-lies trap stays
 *   closed because no chrome entry says Search anymore. Deep link
 *   `#/search` keeps working; it just claims no chrome slot, and no
 *   active state aliases it.
 *
 * All three keep working deep links, all three keep the language switch
 * where the shell owns it (topbar — ambient/focus-immersive hide chrome
 * by design, the bare focus picker keeps it), and none carries
 * gamification copy. Arrangement only: no route, view, handler or data
 * change.
 */
export const INTERNAL_ONLY_ROUTES = Object.freeze({
  EDITOR:
    'tool invoked from content surfaces (library sheet, category manage, card menu) — internal-only by design',
  AMBIENT:
    'chrome-free nightstand kiosk entered from the Prayer sheet, exited to #/prayer — a nav door would promise chrome the route removes',
  SEARCH:
    'doorless-by-design: the search view lives one tap away on the topbar palette (palette.open) which names itself as a quick launcher — a nav door would promise a place for what is a launcher action',
});

/**
 * Reverse lookup derived from DOORS (rule 6): route value → door entry
 * view value. A route with no door entry (EDITOR, AMBIENT, SEARCH, KIDS)
 * lights nothing — that is the documented decision above, not a gap.
 */
const VIEW_KEY_BY_VALUE = Object.freeze(
  Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [v, k]))
);
const DOOR_VIEW_BY_ROUTE_KEY = Object.freeze(
  Object.fromEntries(DOORS.flatMap((d) => d.members.map((m) => [m.route, d.view])))
);

/** Flat lookup used to decide the active item for the current view. */
function isActive(active, view) {
  if (active === view) return true;
  const activeKey = VIEW_KEY_BY_VALUE[active];
  if (!activeKey) return false;
  const doorView = DOOR_VIEW_BY_ROUTE_KEY[activeKey];
  if (!doorView) return false;
  if (view === VIEWS.HADITH) return active === VIEWS.HADITH; // book view IS the hadith view
  return doorView === view;
}

/**
 * Section-switch member lists, derived from DOORS (rule 6): the routes come
 * from the map in chrome order, the labels reuse the bilingual keys that
 * already name their destinations, so no segment label can drift and each
 * label promises exactly its tap.
 */
const doorByEntry = (entry) => DOORS.find((d) => d.entry === entry);
const switchRoutes = (entry, excludeEntry = false) => {
  const door = doorByEntry(entry);
  return door.members.map((m) => m.route).filter((r) => !excludeEntry || r !== entry);
};
/**
 * (IA-7) the Azkar section's in-chrome hop: the browser (#/library — the
 * section entry and the grid's home) vs Moods (#/mood — the bare picker,
 * twelve needs) vs Focus (#/focus — the bare picker) vs Collections
 * (#/collections — the user's adhkar sets). CATEGORY and COLLECTION are
 * tile-depth only (their views 404 bare — an id is required), so they
 * carry `direct: false` in the map and resolve through the browser tiles
 * instead of a direct drawer/switch hop; the map documents the hop, so no
 * drawer row may promise them. Rendered inside all six Azkar views —
 * never a nav entry, never a new view. Existing `navigate` actions only
 * (no handler or allowlist change) and the existing `.segmented` styling
 * only (44px targets, so Elder/a11y is untouched).
 */
const AZKAR_SWITCH_LABELS = Object.freeze({
  LIBRARY: 'nav.azkar',
  MOOD: 'title.mood',
  FOCUS: 'title.focus',
  COLLECTIONS: 'title.collections',
});
const QURAN_SWITCH_LABELS = Object.freeze({
  QURAN: 'quran.modeList',
  ROOTS: 'quran.modeWord',
  AUDIO: 'nav.audio',
  TAJWEED_COURSE: 'nav.tajweedCourse',
  MUTASHABIHAT: 'mutashabihat.title',
});
const PRAYER_SWITCH_LABELS = Object.freeze({
  PRAYER: 'nav.prayer',
  QIBLA: 'nav.qibla',
  CALENDAR: 'nav.calendar',
  RAMADAN: 'nav.ramadan',
});
const PRACTISE_SWITCH_LABELS = Object.freeze({
  TASBIH: 'nav.tasbih',
  QUIZ: 'quiz.title',
});
const YOU_SWITCH_LABELS = Object.freeze({
  CHECKLIST: 'you.myAdhkar',
  GARDEN: 'you.growth',
  FAVORITES: 'nav.favorites',
  JOURNAL: 'journal.title',
  STATISTICS: 'nav.statistics',
  CERTIFICATE: 'certificate.title',
  ZAKAT: 'nav.zakat',
  OFFLINE: 'nav.offline',
  SETTINGS: 'nav.settings',
  ABOUT: 'you.about',
});

/** v5.17.72: the ten You destinations are intentionally grouped so the
 * section reads like a personal control center instead of a 10-button pill
 * wall. Order remains derived from switchRoutes/DOORS; only presentation is
 * grouped here. */
const YOU_SWITCH_GROUPS = Object.freeze([
  Object.freeze({
    key: 'you.group.practice',
    routes: Object.freeze(['CHECKLIST', 'FAVORITES', 'JOURNAL']),
  }),
  Object.freeze({
    key: 'you.group.growth',
    routes: Object.freeze(['GARDEN', 'STATISTICS', 'CERTIFICATE']),
  }),
  Object.freeze({
    key: 'you.group.tools',
    routes: Object.freeze(['ZAKAT', 'OFFLINE', 'SETTINGS', 'ABOUT']),
  }),
]);

/**
 * (IA-7) the in-chrome Azkar hop — the section menu inside the section:
 * the browser (#/library) vs Moods vs Focus vs Collections. Rendered
 * inside all six Azkar views. Tile-depth members (CATEGORY, COLLECTION)
 * ride the browser tiles, never this rail: their views need an id, so a
 * direct segment would promise a place that 404s bare. Existing
 * `navigate` actions only, existing `.segmented` styling only.
 */
export function azkarModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = AZKAR_SWITCH_LABELS[routeKey];
    return `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  };
  const routes = Object.keys(AZKAR_SWITCH_LABELS);
  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <nav class="segmented section-mode-switch azkar-mode-switch" aria-label="${t('nav.azkar', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </nav>`;
}

/**
 * (REORG Phase 2 + Phase 7 + Phase 8 + IA-7) the in-chrome Qur'an mode
 * switch: List reading (#/quran) vs Word study (#/roots) vs Listening
 * (#/audio — the reciter / voice picker + offline downloads) vs the
 * Tajweed course (#/tajweed-course) vs look-alike ayat (#/mutashabihat).
 * Rendered inside the mushaf, reader, roots, audio, course and
 * look-alike views — never a nav entry, never a new view. Existing `navigate` actions only (no handler or allowlist change)
 * and the existing `.segmented` styling only (44px targets, so Elder/a11y
 * is untouched). On the mushaf neither segment is active: the book IS the
 * door, and the switch offers its inner modes without a route hop or an
 * interstitial. No gamification copy anywhere on the rail.
 */
export function quranModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = QURAN_SWITCH_LABELS[routeKey];
    return `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  };
  const routes = switchRoutes('MUSHAF', true);
  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <nav class="segmented section-mode-switch quran-mode-switch" aria-label="${t('quran.title', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </nav>`;
}

/**
 * (REORG Phase 4 + Phase 8) the in-chrome Prayer switch: Times (#/prayer)
 * vs Qibla (#/qibla) vs Hijri calendar (#/calendar) vs the Ramadan
 * companion (#/ramadan). Rendered inside all four views — never a nav
 * entry, never a new view. Existing `navigate` actions only (no handler
 * or allowlist change) and the existing `.segmented` styling only (44px
 * targets, so Elder/a11y is untouched). No interstitial: every segment is
 * a direct link to its route.
 */
export function prayerModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = PRAYER_SWITCH_LABELS[routeKey];
    return `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  };
  const routes = switchRoutes('PRAYER');
  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <nav class="segmented section-mode-switch prayer-mode-switch" aria-label="${t('nav.prayer', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </nav>`;
}

/**
 * (REORG Phase 5 + IA-7) the in-chrome Practise switch: Tasbih (#/tasbih)
 * vs the 99 Names quiz (#/quiz). The Tajweed course and look-alike ayat
 * moved to the QUR'AN section (owner IA: study depths belong to the book),
 * so this rail is two segments now — derived from the map, like every
 * switch here. Rendered inside both views — never a nav entry, never a
 * new view. Existing `navigate` actions only (no handler or allowlist
 * change) and the existing `.segmented` styling only (44px targets, so
 * Elder/a11y is untouched). The door carries the bilingual `nav.practise`
 * label while the entry segment keeps `nav.tasbih`, so each label promises
 * exactly its tap; the group name ships in the bilingual `practise.label`
 * key. No interstitial: every segment is a direct link to its route. The
 * rail carries no ranking or shame copy (adab).
 */
export function practiseModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = PRACTISE_SWITCH_LABELS[routeKey];
    return `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  };
  const routes = switchRoutes('TASBIH');
  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <nav class="segmented section-mode-switch practise-mode-switch" aria-label="${t('practise.label', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </nav>`;
}

/**
 * (REORG Phase 6 + Deslopify pass 6) the in-chrome You switch is a grouped
 * navigation matrix: Practice, Growth & progress, and Tools & app. Ten
 * destinations remain directly reachable, but they are grouped by job
 * instead of squeezed into one long row of pills. Existing `navigate` actions
 * remain unchanged; every item is still a direct link with a 44px target.
 * The rail carries no ranking or shame copy (adab).
 */
export function youModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = YOU_SWITCH_LABELS[routeKey];
    return `
      <a class="you-subnav__item${selected ? ' you-subnav__item--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">
        <span class="you-subnav__item-label">${t(labelKey, lang)}</span>
      </a>`;
  };

  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <nav class="you-subnav" aria-label="${t('nav.you', lang)}">
      ${YOU_SWITCH_GROUPS.map(
        (group) => `
      <section class="you-subnav__group" aria-labelledby="you-group-${group.key.replaceAll('.', '-')}">
        <h2 id="you-group-${group.key.replaceAll('.', '-')}" class="you-subnav__group-title">${t(group.key, lang)}</h2>
        <div class="you-subnav__grid">
          ${group.routes.map((r) => seg(r, activeKey === r)).join('')}
        </div>
      </section>`
      ).join('')}
    </nav>`;
}

function navItemHTML(n, active, lang, { drawer = false } = {}) {
  const label = t(n.label, lang);
  // Per-item action override (the Search item opens the palette); the href
  // stays a real destination as a no-JS fallback.
  const action = n.action || (drawer ? 'nav-drawer-go' : 'navigate');
  return `
  <a class="nav__item ${isActive(active, n.view) ? 'nav__item--active' : ''}"
     href="${buildHash(n.view)}" data-action="${action}" data-view="${n.view}"
     title="${label}" aria-label="${label}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
    ${icon(n.icon, { size: 24 })}
    <span class="nav__label">${label}</span>
  </a>`;
}

function groupsHTML(active, lang, { drawer = false } = {}, groups = NAV_GROUPS) {
  // Seven-section rail: entries render with no taxonomy header. The kids
  // scope still ships one labelled group, rendered the grouped way.
  if (groups.length > 0 && groups[0] && groups[0].view) {
    return `
  <div class="nav__group nav__group--flat">
    ${groups.map((n) => navItemHTML(n, active, lang, { drawer })).join('')}
  </div>`;
  }
  return groups
    .map(
      (g) => `
  <div class="nav__group">
    <span class="nav__group-label">${t(g.label, lang)}</span>
    ${g.items.map((n) => navItemHTML(n, active, lang, { drawer })).join('')}
  </div>`
    )
    .join('');
}

/**
 * (IA-7) section→member label index for the hierarchical drawer. Each
 * entry reuses its section's own switch-label map — the same objects the
 * in-chrome switches read — so drawer rows and switch segments can never
 * disagree: one map per section, two readers (rule 6). Sections without a
 * map (HOME, HADITH) stand alone: a single-member section needs no
 * subsection rows.
 */
const SWITCH_LABELS_BY_ENTRY = Object.freeze({
  LIBRARY: AZKAR_SWITCH_LABELS,
  MUSHAF: QURAN_SWITCH_LABELS,
  PRAYER: PRAYER_SWITCH_LABELS,
  TASBIH: PRACTISE_SWITCH_LABELS,
  CHECKLIST: YOU_SWITCH_LABELS,
});

function drawerSubRowHTML(door, member, activeKey, lang) {
  const view = VIEWS[member.route];
  const labelKey = SWITCH_LABELS_BY_ENTRY[door.entry]?.[member.route] || door.labelKey;
  const label = t(labelKey, lang);
  const selected = activeKey === member.route;
  return `
    <a class="nav__item nav__item--sub${selected ? ' nav__item--active' : ''}"
       href="${buildHash(view)}" data-action="nav-drawer-go" data-view="${view}"
       title="${label}" aria-label="${label}" aria-current="${selected ? 'page' : 'false'}">
      <span class="nav__label">${label}</span>
    </a>`;
}

/**
 * (IA-7) the hierarchical drawer (the mobile More-sheet): one block per
 * section from DOORS, each with its entry plus its subsection rows. Rows
 * derive from the map — members flagged `direct: false` (tile-depth: their
 * views need an id and 404 bare) resolve through the section landing
 * instead of a direct hop, exactly as the map documents. Every row reuses
 * the existing `navigate`/`nav-drawer-go` actions (no handler or allowlist
 * change) and the existing `.nav__item` styling, so Elder/a11y targets are
 * untouched. Exported for tests.
 */
export function drawerSectionsHTML(active, lang) {
  const activeKey = VIEW_KEY_BY_VALUE[active];
  return DOORS.map((door) => {
    const subs = door.members.filter((m) => m.route !== door.entry && m.direct !== false);
    return `
  <div class="nav__group nav__group--section" data-section="${door.entry}">
    ${navItemHTML({ view: door.view, icon: door.icon, label: door.labelKey }, active, lang, { drawer: true })}
    ${subs.length ? `<div class="nav__sub">${subs.map((m) => drawerSubRowHTML(door, m, activeKey, lang)).join('')}</div>` : ''}
  </div>`;
  }).join('');
}

/**
 * The language switch. ONE control, two places.
 *
 * The rule this file now states once: **any surface that hides the shell must
 * still offer the language switch.** Immersive focus, mushaf fullscreen and
 * the ambient nightstand each set `display: none !important` on `#topbar`,
 * which took the switch with it and left an Arabic-only reader unable to
 * leave Arabic — in the very modes that are easiest to get lost in.
 *
 * The previous fix for the bare `#/focus` picker was a special case: it simply
 * stopped engaging immersive mode. That repaired one surface and left the
 * other two, which is the un-generalised shape this project keeps paying for.
 *
 * So the control is a component, and the immersive copy is a single fixed
 * element outside every hidden container. One rule, one source.
 *
 * @param {string} lang current language
 * @param {string} [extraClass] extra class for the immersive copy
 */
export function languageToggleHTML(lang, extraClass = '') {
  const other = lang === 'ar' ? 'en' : 'ar';
  return `<button type="button" class="icon-btn topbar__lang ${extraClass}" data-action="quick-language-toggle"
        aria-label="${t('a11y.languageToggle', lang)}" title="${t('a11y.languageToggle', lang)}"
        lang="${other}" dir="${lang === 'ar' ? 'ltr' : 'rtl'}" hreflang="${other}">
        <span class="topbar__lang-code" aria-hidden="true">${lang === 'ar' ? 'EN' : 'ع'}</span>
      </button>`;
}

export function renderTopBar(state, opts = {}) {
  const lang = state.settings.language;
  // FIX (v4.0 hostile review B4): resolve the icon from state, not from the
  // DOM — reading <html data-theme> inside a render function made the output
  // depend on when theme.js last ran and could desync from the store after a
  // quick toggle. 'auto' resolves against the OS preference exactly like
  // core/theme.js does.
  const mode = state.settings.themeMode;
  const isDark =
    mode === 'dark' ||
    (mode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const collapsed = !!state.settings.navCollapsed;
  // (v4.5.2, APP-FLOW I9) the universal Back affordance: present whenever
  // a forward navigation left somewhere to go back TO. It rides the real
  // browser history (I3), so it always lands where the user actually came
  // from — including out-of-app entries on a fresh tab.
  // Layer rule: the depth arrives from the app layer (renderer reads rt and
  // passes backDepth) so ui never imports app/.
  const backDepth = typeof opts.backDepth === 'number' ? opts.backDepth : 0;
  // (U7) mirror the Back chevron in RTL — forward/back flips with direction.
  const backIcon = isRTL(lang) ? 'chevronRight' : 'chevronLeft';
  const backButton =
    backDepth > 0
      ? `<button type="button" class="icon-btn topbar__back" data-action="go-back" aria-label="${t('nav.back', lang)}" title="${t('nav.back', lang)}">
        ${icon(backIcon, { size: 20 })}
      </button>`
      : '';
  return `
  <div class="topbar__inner">
    <div class="topbar__lead">
      <button type="button" class="icon-btn topbar__menu" data-action="nav-toggle" aria-label="${t('a11y.navToggle', lang)}" aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="bottomnav">
        ${icon('menu', { size: 22 })}
      </button>
      <a class="topbar__brand" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}">
        <span class="topbar__brand-icon" aria-hidden="true">${icon('rayah', { size: 21 })}</span>
        <span class="topbar__brand-text">${t('app.name', lang)}</span>
      </a>
    </div>
    <div class="topbar__actions">
      <button type="button" class="icon-btn" data-action="open-palette" aria-label="${t('palette.open', lang)}" title="${t('palette.open', lang)}">
        ${icon('search', { size: 20 })}
      </button>
      <button type="button" class="icon-btn" data-action="quick-theme-toggle" aria-label="${t('a11y.themeToggle', lang)}">
        ${icon(isDark ? 'sun' : 'star', { size: 20 })}
      </button>
      <!-- (v5.17.20) The language switch used to exist only at first run and
           in Settings. An audit counted zero language controls across the
           quran reader, library, mushaf, prayer and tasbih: a reader who
           mis-picked at onboarding had no in-context way back, and had to
           know that Settings held it. One icon, always present, is the fix. -->
      ${languageToggleHTML(lang)}
      ${backButton}
    </div>
  </div>`;
}

export function renderNav(state) {
  const lang = state.settings.language;
  const active = state.activeView;
  const collapsed = !!state.settings.navCollapsed;
  const kidsScoped = state.settings.kidsMode === true;
  const groups = kidsScoped ? KIDS_NAV_GROUPS : NAV_GROUPS;

  // Mobile bottom bar: all seven sections are direct doors. In the kids
  // scope the bar mirrors the allowlist (CSS hides it anyway — the DOM stays
  // honest for tests and assistive tech).
  const mobileItems = kidsScoped ? KIDS_NAV_ITEMS : MOBILE_ITEMS;
  // (v5.17.3, axe) these wrappers are plain divs, not nested <nav>
  // landmarks: #bottomnav already owns the single "Main navigation"
  // landmark, and duplicate same-name navs fail `landmark-unique`.
  const mobileBar = `
    <div class="nav-mobile-bar">
      ${mobileItems
        .map(
          (n) => `
      <a class="nav-mobile-bar__item ${isActive(active, n.view) ? 'nav-mobile-bar__item--active' : ''}" href="${buildHash(n.view)}" data-action="navigate" data-view="${n.view}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
        ${icon(n.icon, { size: 22 })}
        <span class="nav__label">${t(n.label, lang)}</span>
      </a>`
        )
        .join('')}

    </div>`;

  return `
  <div class="nav__scroller" data-nav-collapsed="${collapsed ? 'true' : 'false'}">
    <div class="nav__inner">
      ${groupsHTML(active, lang, {}, groups)}
    </div>
  </div>
  ${mobileBar}
  <div class="nav-drawer-overlay" data-action="nav-drawer-close"></div>
  <div class="nav-drawer" role="dialog" aria-modal="true" aria-label="${t('a11y.mainNav', lang)}">
    <div class="nav-drawer__head">
      <span class="nav-drawer__title">${t('app.name', lang)}</span>
      <button type="button" class="icon-btn" data-action="nav-drawer-close" aria-label="${t('common.close', lang)}">
        ${icon('close', { size: 20 })}
      </button>
    </div>
    <div class="nav-drawer__body">${kidsScoped ? groupsHTML(active, lang, { drawer: true }, groups) : drawerSectionsHTML(active, lang)}</div>
  </div>`;
}
