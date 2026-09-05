/**
 * components/shell.js
 * The persistent app shell: top bar (hamburger, title, search shortcut,
 * theme toggle) and a GROUPED, COLLAPSIBLE navigation.
 *
 *  - Desktop (>= 960px): a side rail with section headers (Read / Worship /
 *    Tools / Mine). The hamburger collapses it to an icon-only rail (the
 *    collapsed state persists in settings.navCollapsed). The rail scrolls
 *    independently, so nothing is ever unreachable — fixes the overflow
 *    bug where items below Settings could not be scrolled to.
 *  - Mobile: a bottom tab bar with the four most-used destinations plus a
 *    "More" button that opens the same grouped navigation as a bottom
 *    drawer sheet (the pattern used by most modern apps).
 *
 * Markup is identical for both breakpoints; CSS picks the presentation.
 */

import { icon } from '../core/icons.js';
import { rt } from '../app/rt.js';
import { isRTL, t } from '../core/i18n.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

const NAV_GROUPS = [
  {
    label: 'nav.group.read',
    items: [
      { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
      { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
      { view: VIEWS.MUSHAF, icon: 'quran', label: 'nav.quran' },
      { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
      { view: VIEWS.SEARCH, icon: 'search', label: 'nav.search' },
    ],
  },
  {
    label: 'nav.group.worship',
    items: [
      // (v5.0.0) semantic fix: Prayer carries the prayer-rug glyph,
      // Qibla carries the compass (it IS a compass bearing). The old
      // pairing (prayer=compass, qibla=mosque) read backwards.
      { view: VIEWS.PRAYER, icon: 'prayer-rug', label: 'nav.prayer' },
      { view: VIEWS.QIBLA, icon: 'compass', label: 'nav.qibla' },
      { view: VIEWS.RAMADAN, icon: 'moon', label: 'nav.ramadan' },
      { view: VIEWS.CALENDAR, icon: 'calendar', label: 'nav.calendar' },
      { view: VIEWS.CHECKLIST, icon: 'target', label: 'nav.checklist' },
    ],
  },
  {
    label: 'nav.group.tools',
    items: [
      { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
      { view: VIEWS.GARDEN, icon: 'sprout', label: 'nav.garden' },
      { view: VIEWS.ZAKAT, icon: 'calculator', label: 'nav.zakat' },
      { view: VIEWS.STATISTICS, icon: 'stats', label: 'nav.statistics' },
    ],
  },
  {
    label: 'nav.group.mine',
    items: [
      { view: VIEWS.FAVORITES, icon: 'heart', label: 'nav.favorites' },
      { view: VIEWS.SETTINGS, icon: 'settings', label: 'nav.settings' },
      { view: VIEWS.ABOUT, icon: 'info', label: 'nav.about' },
    ],
  },
];

/** Flat lookup used to decide the active item for the current view. */
function isActive(active, view) {
  if (active === view) return true;
  if (view === VIEWS.HADITH) return active === VIEWS.HADITH; // book view IS the hadith view
  // (v4.4) the Qur'an nav item now opens the MUSHAF by default; keep it
  // lit while the person switches into the classic reader from there —
  // both views are the same book.
  if (view === VIEWS.MUSHAF) return active === VIEWS.QURAN;
  return (
    view === VIEWS.LIBRARY && [VIEWS.CATEGORY, VIEWS.COLLECTIONS, VIEWS.COLLECTION].includes(active)
  );
}

function navItemHTML(n, active, lang, { drawer = false } = {}) {
  const label = t(n.label, lang);
  return `
  <a class="nav__item ${isActive(active, n.view) ? 'nav__item--active' : ''}"
     href="${buildHash(n.view)}" data-action="${drawer ? 'nav-drawer-go' : 'navigate'}" data-view="${n.view}"
     title="${label}" aria-label="${label}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
    ${icon(n.icon, { size: 24 })}
    <span class="nav__label">${label}</span>
  </a>`;
}

function groupsHTML(active, lang, { drawer = false } = {}) {
  return NAV_GROUPS.map(
    (g) => `
  <div class="nav__group">
    <span class="nav__group-label">${t(g.label, lang)}</span>
    ${g.items.map((n) => navItemHTML(n, active, lang, { drawer })).join('')}
  </div>`
  ).join('');
}

export function renderTopBar(state) {
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
  const backDepth = typeof rt.navBackStack?.length === 'number' ? rt.navBackStack.length : 0;
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
        <span class="topbar__brand-icon" aria-hidden="true">\u262A</span>
        <span class="topbar__brand-text">${t('app.name', lang)}</span>
      </a>
    </div>
    <div class="topbar__actions">
      <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.SEARCH}" aria-label="${t('nav.search', lang)}">
        ${icon('search', { size: 20 })}
      </button>
      <button type="button" class="icon-btn" data-action="quick-theme-toggle" aria-label="${t('a11y.themeToggle', lang)}">
        ${icon(isDark ? 'sun' : 'moon', { size: 20 })}
      </button>
      ${backButton}
    </div>
  </div>`;
}

export function renderNav(state) {
  const lang = state.settings.language;
  const active = state.activeView;
  const collapsed = !!state.settings.navCollapsed;

  // Mobile bottom bar: four fixed destinations + More (opens the drawer).
  const MOBILE_ITEMS = [
    { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
    { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
    { view: VIEWS.MUSHAF, icon: 'quran', label: 'nav.quran' },
    { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
  ];
  const mobileBar = `
    <nav class="nav-mobile-bar" aria-label="${t('a11y.mainNav', lang)}">
      ${MOBILE_ITEMS.map(
        (n) => `
      <a class="nav-mobile-bar__item ${isActive(active, n.view) ? 'nav-mobile-bar__item--active' : ''}" href="${buildHash(n.view)}" data-action="navigate" data-view="${n.view}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
        ${icon(n.icon, { size: 22 })}
        <span class="nav__label">${t(n.label, lang)}</span>
      </a>`
      ).join('')}
      <button type="button" class="nav-mobile-bar__item" data-action="nav-toggle" aria-haspopup="dialog" aria-label="${t('nav.more', lang)}">
        ${icon('menu', { size: 22 })}
        <span class="nav__label">${t('nav.more', lang)}</span>
      </button>
    </nav>`;

  return `
  <div class="nav__scroller" data-nav-collapsed="${collapsed ? 'true' : 'false'}">
    <nav class="nav__inner" aria-label="${t('a11y.mainNav', lang)}">
      ${groupsHTML(active, lang)}
    </nav>
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
    <div class="nav-drawer__body">${groupsHTML(active, lang, { drawer: true })}</div>
  </div>`;
}
