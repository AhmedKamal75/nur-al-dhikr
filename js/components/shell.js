/**
 * components/shell.js
 * The persistent app shell: top bar (title, search shortcut, theme toggle)
 * and primary navigation (bottom tab bar on mobile widths, side rail on
 * wider viewports — handled entirely by CSS, same markup either way).
 */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { buildHash } from '../router.js';
import { VIEWS } from '../config.js';

const NAV_ITEMS = [
  { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
  { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
  { view: VIEWS.QURAN, icon: 'quran', label: 'nav.quran' },
  { view: VIEWS.SEARCH, icon: 'search', label: 'nav.search' },
  { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
  { view: VIEWS.FAVORITES, icon: 'heart', label: 'nav.favorites' },
  { view: VIEWS.STATISTICS, icon: 'stats', label: 'nav.statistics' },
  { view: VIEWS.CHECKLIST, icon: 'target', label: 'nav.checklist' },
  { view: VIEWS.PRAYER, icon: 'compass', label: 'nav.prayer' },
  { view: VIEWS.QIBLA, icon: 'mosque', label: 'nav.qibla' },
  { view: VIEWS.CALENDAR, icon: 'calendar', label: 'nav.calendar' },
  { view: VIEWS.RAMADAN, icon: 'crescent-star', label: 'nav.ramadan' },
  { view: VIEWS.ZAKAT, icon: 'calculator', label: 'nav.zakat' },
  { view: VIEWS.SADAQAH, icon: 'coins', label: 'nav.sadaqah' },
  { view: VIEWS.SETTINGS, icon: 'settings', label: 'nav.settings' },
];

const PRIMARY_MOBILE = [
  VIEWS.HOME,
  VIEWS.LIBRARY,
  VIEWS.QURAN,
  VIEWS.SEARCH,
  VIEWS.TASBIH,
  VIEWS.SETTINGS,
];

export function renderTopBar(state) {
  const lang = state.settings.language;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `
  <div class="topbar__inner">
    <a class="topbar__brand" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}">
      <span class="topbar__brand-icon" aria-hidden="true">\u262A</span>
      <span class="topbar__brand-text">${t('app.name', lang)}</span>
    </a>
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
  const items = NAV_ITEMS.map((n) => {
    const isActive =
      active === n.view ||
      (n.view === VIEWS.LIBRARY &&
        [VIEWS.CATEGORY, VIEWS.COLLECTIONS, VIEWS.COLLECTION].includes(active));
    return `
    <a class="nav__item ${isActive ? 'nav__item--active' : ''} ${PRIMARY_MOBILE.includes(n.view) ? '' : 'nav__item--desktop-only'}"
       href="${buildHash(n.view)}" data-action="navigate" data-view="${n.view}"
       aria-current="${isActive ? 'page' : 'false'}">
      ${icon(n.icon, { size: 22 })}
      <span class="nav__label">${t(n.label, lang)}</span>
    </a>`;
  }).join('');

  return `
  <div class="nav__inner" role="navigation" aria-label="${t('a11y.mainNav', lang)}">
    ${items}
    <a class="nav__item nav__item--desktop-only ${active === VIEWS.ABOUT ? 'nav__item--active' : ''}" href="${buildHash(VIEWS.ABOUT)}" data-action="navigate" data-view="${VIEWS.ABOUT}">
      ${icon('info', { size: 22 })}
      <span class="nav__label">${t('nav.about', lang)}</span>
    </a>
  </div>`;
}
