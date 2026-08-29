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

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { buildHash } from '../router.js';
import { VIEWS } from '../config.js';

const NAV_GROUPS = [
  {
    label: 'nav.group.read',
    items: [
      { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
      { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
      { view: VIEWS.QURAN, icon: 'quran', label: 'nav.quran' },
      { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
      { view: VIEWS.SEARCH, icon: 'search', label: 'nav.search' },
    ],
  },
  {
    label: 'nav.group.worship',
    items: [
      { view: VIEWS.PRAYER, icon: 'compass', label: 'nav.prayer' },
      { view: VIEWS.QIBLA, icon: 'mosque', label: 'nav.qibla' },
      { view: VIEWS.RAMADAN, icon: 'moon', label: 'nav.ramadan' },
      { view: VIEWS.CALENDAR, icon: 'calendar', label: 'nav.calendar' },
      { view: VIEWS.CHECKLIST, icon: 'target', label: 'nav.checklist' },
    ],
  },
  {
    label: 'nav.group.tools',
    items: [
      { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
      { view: VIEWS.ZAKAT, icon: 'calculator', label: 'nav.zakat' },
      { view: VIEWS.STATISTICS, icon: 'stats', label: 'nav.statistics' },
    ],
  },
  {
    label: 'nav.group.mine',
    items: [
      { view: VIEWS.FAVORITES, icon: 'heart', label: 'nav.favorites' },
      { view: VIEWS.EDITOR, icon: 'edit', label: 'nav.editor' },
      { view: VIEWS.SETTINGS, icon: 'settings', label: 'nav.settings' },
      { view: VIEWS.ABOUT, icon: 'info', label: 'nav.about' },
    ],
  },
];

/** Flat lookup used to decide the active item for the current view. */
function isActive(active, view) {
  if (active === view) return true;
  if (view === VIEWS.HADITH) return active === VIEWS.HADITH; // book view IS the hadith view
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
    ${icon(n.icon, { size: 22 })}
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
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const collapsed = !!state.settings.navCollapsed;
  return `
  <div class="topbar__inner">
    <div class="topbar__lead">
      <button type="button" class="icon-btn" data-action="nav-toggle" aria-label="${t('a11y.navToggle', lang)}" aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="bottomnav">
        ${icon('menu', { size: 20 })}
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
      <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.EDITOR}" aria-label="${t('nav.editor', lang)}">
        ${icon('edit', { size: 20 })}
      </button>
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
    { view: VIEWS.QURAN, icon: 'quran', label: 'nav.quran' },
    { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
  ];
  const mobileBar = `
    <div class="nav-mobile-bar" aria-label="${t('a11y.mainNav', lang)}">
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
    </div>`;

  return `
  <div class="nav__scroller" data-nav-collapsed="${collapsed ? '1' : '0'}">
    <div class="nav__inner" role="navigation" aria-label="${t('a11y.mainNav', lang)}">
      ${groupsHTML(active, lang)}
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
    <div class="nav-drawer__body">${groupsHTML(active, lang, { drawer: true })}</div>
  </div>`;
}
