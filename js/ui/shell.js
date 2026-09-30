/**
 * components/shell.js
 * The persistent app shell: top bar (hamburger, title, search shortcut,
 * theme toggle) and a FLAT six-door navigation (REORG Phase 8 / HANDOFF A1).
 *
 *  - Desktop (>= 960px): a side rail with the six doors and no taxonomy
 *    headers — Home · Qur'an · Ahadeeth · Prayer · Practise · You. The
 *    hamburger collapses it to an icon-only rail (the collapsed state
 *    persists in settings.navCollapsed). The rail scrolls independently,
 *    so nothing is ever unreachable.
 *  - Mobile: a bottom tab bar with the first four doors plus a
 *    "More" button that opens the full six-door navigation as a bottom
 *    drawer sheet (the pattern used by most modern apps).
 *
 * Markup is identical for both breakpoints; CSS picks the presentation.
 *
 * Rule-6 note: every list below derives from DOORS in
 * js/core/config/nav.js — the route→door map is the single source of
 * truth, and this file only renders it. A static pin here names nav.js
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
 * (REORG Phase 8 / HANDOFF A1) the flat six-door chrome, derived from
 * DOORS in js/core/config/nav.js — order, entry view, icon and labelKey
 * all come from the map, so the rail cannot drift from the reachability
 * trap. Six entries, this order: HOME(nav.home) · MUSHAF(nav.quran) ·
 * HADITH(nav.hadith) · PRAYER(nav.prayer) · TASBIH-entry labelled
 * nav.practise · CHECKLIST-entry labelled nav.you.
 *
 * Retired as doors (routes + deep links untouched, dictionary keys kept):
 * nav.library (route stays behind the grid's all-view), nav.roots
 * (absorbed into the MUSHAF door), nav.tasbih (stays as the Practise
 * segment label), nav.ramadan (4th Prayer segment), nav.zakat + nav.offline
 * (9th/10th You segments), nav.search (doorless-by-design via the topbar
 * palette). The read/worship/tools/mine taxonomy retires with the groups.
 */
export const NAV_GROUPS = Object.freeze(
  DOORS.map((d) => Object.freeze({ view: d.view, icon: d.icon, label: d.labelKey }))
);

/** The mobile bar carries the first four doors; the drawer carries all six. */
const MOBILE_ITEMS = Object.freeze(
  DOORS.slice(0, 4).map((d) => Object.freeze({ view: d.view, icon: d.icon, label: d.labelKey }))
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
const QURAN_SWITCH_LABELS = Object.freeze({
  QURAN: 'quran.modeList',
  ROOTS: 'quran.modeWord',
  AUDIO: 'nav.audio',
});
const PRAYER_SWITCH_LABELS = Object.freeze({
  PRAYER: 'nav.prayer',
  QIBLA: 'nav.qibla',
  CALENDAR: 'nav.calendar',
  RAMADAN: 'nav.ramadan',
});
const PRACTISE_SWITCH_LABELS = Object.freeze({
  TASBIH: 'nav.tasbih',
  TAJWEED_COURSE: 'nav.tajweedCourse',
  QUIZ: 'quiz.title',
  MUTASHABIHAT: 'mutashabihat.title',
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

/**
 * (REORG Phase 2 + Phase 7 + Phase 8) the in-chrome Qur'an mode switch:
 * List reading (#/quran) vs Word study (#/roots) vs Listening (#/audio —
 * the reciter / voice picker + offline downloads). Rendered inside the
 * mushaf, reader, roots and audio views — never a nav entry, never a new
 * view. Existing `navigate` actions only (no handler or allowlist change)
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
    <div class="segmented quran-mode-switch" role="group" aria-label="${t('quran.title', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </div>`;
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
    <div class="segmented prayer-mode-switch" role="group" aria-label="${t('nav.prayer', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </div>`;
}

/**
 * (REORG Phase 5) the in-chrome Practise switch — the stage rail §2.4
 * promises the Tajweed course inside its section: Tasbih (#/tasbih) vs the
 * course (#/tajweed-course) vs the 99 Names quiz (#/quiz) vs look-alike
 * ayat (#/mutashabihat). Rendered inside all four views — never a nav
 * entry, never a new view. Existing `navigate` actions only (no handler
 * or allowlist change) and the existing `.segmented` styling only (44px
 * targets, so Elder/a11y is untouched). The door carries the new bilingual
 * `nav.practise` label while the entry segment keeps `nav.tasbih`, so each
 * label promises exactly its tap; the group name ships in the bilingual
 * `practise.label` key. No interstitial: every segment is a direct link
 * to its route. The course's own stage ladder and progress model are
 * untouched — this rail is the section door, not a second progress
 * display, and it carries no ranking or shame copy (adab).
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
    <div class="segmented practise-mode-switch" role="group" aria-label="${t('practise.label', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </div>`;
}

/**
 * (REORG Phase 6 + Phase 8) the in-chrome You switch — the §2.5 section
 * door: My adhkar (#/checklist — today, streaks, the section entry) vs
 * Growth (#/garden — the lifetime visual, metaphor retired to a treatment)
 * vs Favorites vs Journal vs Statistics vs Certificate vs Zakat vs Offline
 * library vs Settings vs About and sources. Rendered inside all ten views —
 * never a nav entry, never a new view. Existing `navigate` actions only
 * (no handler or allowlist change). Ten modes cannot share one flex row on
 * a phone without squeezing labels below readability, so this is the one
 * switch that takes the `.segmented--wrap` modifier (two flowing rows;
 * every button keeps min-height: var(--touch-target), so Elder/a11y is
 * untouched). No interstitial: every segment is a direct link to its
 * route. The rail carries no ranking or shame copy (adab).
 */
export function youModeSwitchHTML(activeView, lang) {
  const seg = (routeKey, selected) => {
    const view = VIEWS[routeKey];
    const labelKey = YOU_SWITCH_LABELS[routeKey];
    return `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  };
  const routes = switchRoutes('CHECKLIST');
  const activeKey = VIEW_KEY_BY_VALUE[activeView];
  return `
    <div class="segmented segmented--wrap you-mode-switch" role="group" aria-label="${t('nav.you', lang)}">
      ${routes.map((r) => seg(r, activeKey === r)).join('')}
    </div>`;
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
  // Flat six-door chrome: entries render with no taxonomy header. The kids
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

  // Mobile bottom bar: the first four doors + More (opens the drawer with
  // all six). In the kids scope the bar mirrors the allowlist (CSS hides
  // it anyway — the DOM stays honest for tests and assistive tech).
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
      ${
        kidsScoped
          ? ''
          : `<button type="button" class="nav-mobile-bar__item" data-action="nav-toggle" aria-haspopup="dialog" aria-label="${t('nav.more', lang)}">
        ${icon('menu', { size: 22 })}
        <span class="nav__label">${t('nav.more', lang)}</span>
      </button>`
      }
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
    <div class="nav-drawer__body">${groupsHTML(active, lang, { drawer: true }, groups)}</div>
  </div>`;
}
