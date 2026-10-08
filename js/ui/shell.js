/**
 * components/shell.js
 * The persistent app shell: top bar (hamburger, title, search shortcut,
 * theme toggle) and a SEVEN-SECTION navigation (IA-7, v5.17.61).
 *
 *  - Desktop (>= 960px): a side rail with seven primary sections. Worship/personal
 *    sections expand in place to reveal their direct child destinations; utility
 *    tools remain standalone application-tail entries; Settings and About remain standalone
 *    at the bottom of the application menu.
 *    The hamburger collapses the rail to an icon-only state.
 *  - Mobile: the bottom bar exposes all seven primary sections directly.
 *    The hamburger opens the same hierarchy as the desktop menu for deeper
 *    destinations, rather than duplicating those destinations inside every page.
 *
 * Markup is identical for both breakpoints; CSS picks the presentation.
 *
 * Rule-6 note: navigation data derives from DOORS and APP_MENU_ENTRIES in
 * js/core/config/nav.js; this file is presentation only.
 */

import { icon } from '../core/icons.js';
import { isRTL, t } from '../core/i18n.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { APP_MENU_ENTRIES, DOORS } from '../core/config/nav.js';

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
 * + nav.zakat + nav.offline (standalone application-tail entries), nav.search (doorless-by-design
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

function memberLabelKey(door, member) {
  return member.labelKey || door.labelKey;
}

function navItemHTML(n, active, lang, { drawer = false } = {}) {
  const label = t(n.label, lang);
  // Per-item action override (the Search item opens the palette); the href
  // stays a real destination as a no-JS fallback.
  const action = n.action || (drawer ? 'nav-drawer-go' : 'navigate');
  const extraClass = n.className ? ` ${n.className}` : '';
  return `
  <a class="nav__item${extraClass} ${isActive(active, n.view) ? 'nav__item--active' : ''}"
     href="${buildHash(n.view)}" data-action="${action}" data-view="${n.view}"
     title="${label}" aria-label="${label}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
    ${icon(n.icon, { size: 24 })}
    <span class="nav__label">${label}</span>
  </a>`;
}

function navSubRowsHTML(door, activeKey, lang, { drawer = false } = {}) {
  const members = door.members.filter((m) => m.route !== door.entry && m.direct !== false);
  const overview = `
    <a class="nav__item nav__item--sub nav__item--overview${activeKey === door.entry ? ' nav__item--active' : ''}"
       href="${buildHash(door.view)}" data-action="${drawer ? 'nav-drawer-go' : 'navigate'}" data-view="${door.view}"
       title="${t('nav.overview', lang)}" aria-label="${t('nav.overview', lang)}" aria-current="${activeKey === door.entry ? 'page' : 'false'}">
      <span class="nav__label">${t('nav.overview', lang)}</span>
    </a>`;
  const rows = members.map((m) => drawerSubRowHTML(door, m, activeKey, lang, { drawer })).join('');
  return overview + rows;
}

function hierarchicalSectionHTML(door, active, lang, { drawer = false } = {}) {
  const activeKey = VIEW_KEY_BY_VALUE[active];
  const hasChildren = door.members.some((m) => m.route !== door.entry && m.direct !== false);
  if (!hasChildren)
    return navItemHTML({ view: door.view, icon: door.icon, label: door.labelKey }, active, lang, {
      drawer,
    });
  const isOpen = door.view === active || door.members.some((m) => m.route === activeKey);
  const label = t(door.labelKey, lang);
  const subId = `nav-sub-${door.entry}${drawer ? '-drawer' : ''}`;
  return `
  <div class="nav__section${isOpen ? ' nav__section--current' : ''}" data-section="${door.entry}">
    <div class="nav__section-row">
      <a class="nav__section-link${isOpen ? ' nav__item--active' : ''}"
         href="${buildHash(door.view)}" data-action="${drawer ? 'nav-drawer-go' : 'navigate'}" data-view="${door.view}"
         title="${label}" aria-label="${label}" aria-current="${door.view === active ? 'page' : 'false'}">
        <span class="nav__section-icon" aria-hidden="true">${icon(door.icon, { size: 22 })}</span>
        <span class="nav__label">${label}</span>
      </a>
      <button type="button" class="nav__section-toggle" data-action="nav-section-toggle" data-section="${door.entry}"
              aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="${subId}"
              aria-label="${isOpen ? t('nav.collapse', lang) : t('nav.expand', lang)}"
              title="${isOpen ? t('nav.collapse', lang) : t('nav.expand', lang)}">
        <span class="nav__section-chevron${isOpen ? ' nav__section-chevron--open' : ''}" aria-hidden="true">${icon('chevronDown', { size: 16 })}</span>
      </button>
    </div>
    <div id="${subId}" class="nav__sub"${isOpen ? '' : ' hidden'}>${navSubRowsHTML(door, activeKey, lang, { drawer })}</div>
  </div>`;
}

function appMenuHTML(active, lang, { drawer = false } = {}) {
  const entries = APP_MENU_ENTRIES.map((n) => {
    const kind =
      n.view === VIEWS.ZAKAT
        ? 'zakat'
        : n.view === VIEWS.OFFLINE
          ? 'offline'
          : n.view === VIEWS.SETTINGS
            ? 'settings'
            : 'about';
    return navItemHTML(
      { ...n, className: `nav__item--app-tail nav__item--app-${kind}` },
      active,
      lang,
      { drawer }
    );
  }).join('');
  return `<div class="nav__app-tail">${entries}</div>`;
}

function groupsHTML(active, lang, { drawer = false } = {}, groups = NAV_GROUPS) {
  if (groups.length > 0 && groups[0] && groups[0].view) {
    return `
  <div class="nav__group nav__group--hierarchy" aria-label="${t('nav.main', lang)}">
    ${DOORS.map((door) => hierarchicalSectionHTML(door, active, lang, { drawer })).join('')}
  </div>
  ${appMenuHTML(active, lang, { drawer })}`;
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

function drawerSubRowHTML(door, member, activeKey, lang, { drawer = true } = {}) {
  const view = VIEWS[member.route];
  const labelKey = memberLabelKey(door, member);
  const label = t(labelKey, lang);
  const selected = activeKey === member.route;
  return `
    <a class="nav__item nav__item--sub${selected ? ' nav__item--active' : ''}"
       href="${buildHash(view)}" data-action="${drawer ? 'nav-drawer-go' : 'navigate'}" data-view="${view}"
       title="${label}" aria-label="${label}" aria-current="${selected ? 'page' : 'false'}">
      <span class="nav__label">${label}</span>
    </a>`;
}

export function drawerSectionsHTML(active, lang) {
  return groupsHTML(active, lang, { drawer: true }, NAV_GROUPS);
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
  const desktopNav =
    typeof window !== 'undefined' && window.matchMedia?.('(min-width: 960px)').matches;
  const navControlLabel = desktopNav
    ? t(collapsed ? 'nav.expand' : 'nav.collapse', lang)
    : t('a11y.navToggle', lang);
  const navControlIcon = desktopNav
    ? icon(collapsed ? (isRTL(lang) ? 'chevronLeft' : 'chevronRight') : (isRTL(lang) ? 'chevronRight' : 'chevronLeft'), { size: 20 })
    : icon('menu', { size: 22 });
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
      <button type="button" class="icon-btn topbar__menu" data-action="nav-toggle" aria-label="${navControlLabel}" title="${navControlLabel}" aria-expanded="${desktopNav ? (collapsed ? 'false' : 'true') : 'false'}" aria-controls="bottomnav">
        ${navControlIcon}
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
