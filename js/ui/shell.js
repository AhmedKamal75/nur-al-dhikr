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
import { isRTL, t } from '../core/i18n.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

// (v5.2.65, item 22) kids-mode scope: the chrome offers only the allowlist
// — the Kids home plus the Tasbih counter — so kids cannot wander by tap.
// The reducer backstop still guards every non-chrome path (deep links,
// history, palette) even if markup is bypassed.
const KIDS_NAV_ITEMS = [
  { view: VIEWS.KIDS, icon: 'star', label: 'kids.title' },
  { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
];
const KIDS_NAV_GROUPS = [{ label: 'kids.title', items: KIDS_NAV_ITEMS }];

const NAV_GROUPS = [
  {
    label: 'nav.group.read',
    items: [
      { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
      { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
      { view: VIEWS.MUSHAF, icon: 'quran', label: 'nav.quran' },
      // (REORG Phase 2) one book, one door: the classic reader no longer
      // competes for a chrome slot. #/quran stays a real route (deep links
      // keep working) and isActive below lights this door for it; the
      // List/Word switch inside the Qur'an chrome (quranModeSwitchHTML)
      // carries the one-tap hop instead of a second nav entry.
      // (REORG Phase 1) Roots is the DEPTH of the Qur'an door — the index
      // behind per-word study — not a separate top level. It keeps its own
      // door beside the book until a later phase re-homes it.
      { view: VIEWS.ROOTS, icon: 'tree', label: 'nav.roots' },
      { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
      // (REORG Phase 5) the G-2 flagship's Phase 1 door stood here, in the
      // read group, as a temporary home. It is re-homed into the Practise
      // section beside Tasbih, Quiz and Mutashabihat: #/tajweed-course
      // stays a real route (deep links keep working) and isActive below
      // lights the tasbih door for it; the in-chrome switch
      // (practiseModeSwitchHTML) carries the hop. Config only: no route,
      // no view import, no deep-link change.
      // (REORG Phase 6) the §1.6 trap is CLOSED by repointing, not
      // relabelling: this entry used to say Search and open the command
      // palette (action: 'open-palette'). It now navigates to the real
      // search view, so the label promises exactly the tap. The palette
      // stays one tap away on the top-bar button (palette.open), which
      // honestly names itself as a quick launcher.
      { view: VIEWS.SEARCH, icon: 'search', label: 'nav.search' },
    ],
  },
  {
    label: 'nav.group.worship',
    items: [
      // (v5.0.0) semantic fix: Prayer carries the prayer-rug glyph,
      // Qibla carries the compass (it IS a compass bearing). The old
      // pairing (prayer=compass, qibla=mosque) read backwards.
      // (REORG Phase 4) one Prayer door: times + qibla + Hijri calendar
      // in one section. #/qibla and #/calendar stay real routes (deep
      // links keep working) and isActive below lights this door for
      // them; the in-chrome switch (prayerModeSwitchHTML) carries the
      // hop — the calendar is a tab, not a peer door. Arrangement only:
      // wake-ups, storage eviction and every handler are untouched.
      // (REORG Phase 6) the daily-tracker entry stood here, in the
      // worship group, as 'Checklist'. It is re-homed into the You
      // section as that section's door (label nav.you): #/checklist
      // stays a real route (deep links keep working) and isActive below
      // lights the You door for every section member; the in-chrome
      // switch (youModeSwitchHTML) carries the hop. Config only: no
      // route, no view import, no deep-link change.
      { view: VIEWS.PRAYER, icon: 'prayer-rug', label: 'nav.prayer' },
      { view: VIEWS.RAMADAN, icon: 'rayah', label: 'nav.ramadan' },
    ],
  },
  {
    label: 'nav.group.tools',
    items: [
      { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
      // (REORG Phase 6) the growth-visual and counts entries stood here,
      // in the tools group, as 'Garden' and 'Statistics'. Both are
      // re-homed into the You section: #/garden and #/statistics stay
      // real routes (deep links keep working) and isActive below lights
      // the You door for them; the in-chrome switch (youModeSwitchHTML)
      // carries the hop. Config only: no route, no view import, no
      // deep-link change.
      { view: VIEWS.ZAKAT, icon: 'calculator', label: 'nav.zakat' },
      { view: VIEWS.OFFLINE, icon: 'download', label: 'nav.offline' },
    ],
  },
  {
    label: 'nav.group.mine',
    items: [
      // (REORG Phase 6) one You section (plan §2.1 door 6, §2.5): Garden
      // + Checklist + Statistics + Favorites + Journal + Certificate +
      // Settings + About collapse behind a single door. The daily
      // tracker is the door's view (it carries today, streaks and the
      // section entry); the other seven stay real routes resolving to
      // this door in 2 taps via youModeSwitchHTML. 'Garden' and
      // 'Checklist' retire as nav nouns (§2.6 rule 1: a label is a
      // thing, not a metaphor); the plant visual survives only as a
      // treatment inside the Growth view, never as chrome.
      { view: VIEWS.CHECKLIST, icon: 'target', label: 'nav.you' },
    ],
  },
];

/** Flat lookup used to decide the active item for the current view. */
function isActive(active, view) {
  if (active === view) return true;
  // (REORG Phase 2) merged Qur'an door: a deep link into #/quran lights the
  // mushaf entry. ROOTS keeps its own Phase 1 door, so it never aliases here.
  if (view === VIEWS.MUSHAF && active === VIEWS.QURAN) return true;
  // (REORG Phase 4) merged Prayer door: deep links into #/qibla and
  // #/calendar light the prayer entry. RAMADAN keeps its own door.
  if (view === VIEWS.PRAYER && (active === VIEWS.QIBLA || active === VIEWS.CALENDAR)) return true;
  // (REORG Phase 5) one Practise section: deep links into #/tajweed-course,
  // #/quiz and #/mutashabihat light the tasbih door. TASBIH keeps its own
  // door as the section entry.
  if (
    view === VIEWS.TASBIH &&
    [VIEWS.QUIZ, VIEWS.TAJWEED_COURSE, VIEWS.MUTASHABIHAT].includes(active)
  )
    return true;
  // (REORG Phase 6) one You section: deep links into #/garden,
  // #/statistics, #/favorites, #/journal, #/certificate, #/settings and
  // #/about light the You door (the checklist view). CHECKLIST keeps its
  // own door as the section entry.
  if (
    view === VIEWS.CHECKLIST &&
    [
      VIEWS.GARDEN,
      VIEWS.STATISTICS,
      VIEWS.FAVORITES,
      VIEWS.JOURNAL,
      VIEWS.CERTIFICATE,
      VIEWS.SETTINGS,
      VIEWS.ABOUT,
    ].includes(active)
  )
    return true;
  if (view === VIEWS.HADITH) return active === VIEWS.HADITH; // book view IS the hadith view
  return (
    view === VIEWS.LIBRARY && [VIEWS.CATEGORY, VIEWS.COLLECTIONS, VIEWS.COLLECTION].includes(active)
  );
}

/**
 * (REORG Phase 2) the in-chrome Qur'an mode switch: List reading (#/quran)
 * vs Word study (#/roots). Rendered inside the mushaf, reader and roots
 * views — never a nav entry, never a new view. Existing `navigate` actions
 * only (no handler or allowlist change) and the existing `.segmented`
 * styling only (44px targets, so Elder/a11y is untouched). On the mushaf
 * neither segment is active: the book IS the door, and the switch offers
 * its two inner modes without a route hop or an interstitial.
 */
export function quranModeSwitchHTML(activeView, lang) {
  const seg = (view, labelKey, selected) => `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  return `
    <div class="segmented quran-mode-switch" role="group" aria-label="${t('quran.title', lang)}">
      ${seg(VIEWS.QURAN, 'quran.modeList', activeView === VIEWS.QURAN)}
      ${seg(VIEWS.ROOTS, 'quran.modeWord', activeView === VIEWS.ROOTS)}
    </div>`;
}

/**
 * (REORG Phase 4) the in-chrome Prayer switch: Times (#/prayer) vs Qibla
 * (#/qibla) vs Hijri calendar (#/calendar). Rendered inside all three
 * views — never a nav entry, never a new view. Existing `navigate`
 * actions only (no handler or allowlist change) and the existing
 * `.segmented` styling only (44px targets, so Elder/a11y is untouched).
 * The segments reuse the three entries' own bilingual nav labels, so no
 * new i18n key can drift and each label promises exactly its tap. No
 * interstitial: every segment is a direct link to its route.
 */
export function prayerModeSwitchHTML(activeView, lang) {
  const seg = (view, labelKey, selected) => `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  return `
    <div class="segmented prayer-mode-switch" role="group" aria-label="${t('nav.prayer', lang)}">
      ${seg(VIEWS.PRAYER, 'nav.prayer', activeView === VIEWS.PRAYER)}
      ${seg(VIEWS.QIBLA, 'nav.qibla', activeView === VIEWS.QIBLA)}
      ${seg(VIEWS.CALENDAR, 'nav.calendar', activeView === VIEWS.CALENDAR)}
    </div>`;
}

/**
 * (REORG Phase 5) the in-chrome Practise switch — the stage rail §2.4
 * promises the Tajweed course inside its section: Tasbih (#/tasbih) vs the
 * course (#/tajweed-course) vs the 99 Names quiz (#/quiz) vs look-alike
 * ayat (#/mutashabihat). Rendered inside all four views — never a nav
 * entry, never a new view. Existing `navigate` actions only (no handler
 * or allowlist change) and the existing `.segmented` styling only (44px
 * targets, so Elder/a11y is untouched). The segments reuse bilingual
 * labels that already name their destinations (the two nav entries plus
 * the two views' own titles), so no segment label can drift and each
 * label promises exactly its tap; the group name ships in a new bilingual
 * `practise.label` key. No interstitial: every segment is a direct link
 * to its route. The course's own stage ladder and progress model are
 * untouched — this rail is the section door, not a second progress
 * display, and it carries no ranking or shame copy (adab).
 */
export function practiseModeSwitchHTML(activeView, lang) {
  const seg = (view, labelKey, selected) => `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  return `
    <div class="segmented practise-mode-switch" role="group" aria-label="${t('practise.label', lang)}">
      ${seg(VIEWS.TASBIH, 'nav.tasbih', activeView === VIEWS.TASBIH)}
      ${seg(VIEWS.TAJWEED_COURSE, 'nav.tajweedCourse', activeView === VIEWS.TAJWEED_COURSE)}
      ${seg(VIEWS.QUIZ, 'quiz.title', activeView === VIEWS.QUIZ)}
      ${seg(VIEWS.MUTASHABIHAT, 'mutashabihat.title', activeView === VIEWS.MUTASHABIHAT)}
    </div>`;
}

/**
 * (REORG Phase 6) the in-chrome You switch — the §2.5 section door:
 * My adhkar (#/checklist — today, streaks, the section entry) vs Growth
 * (#/garden — the lifetime visual, metaphor retired to a treatment) vs
 * Favorites vs Journal vs Statistics vs Certificate vs Settings vs About
 * and sources. Rendered inside all eight views — never a nav entry,
 * never a new view. Existing `navigate` actions only (no handler or
 * allowlist change). Eight modes cannot share one flex row on a phone
 * without squeezing labels below readability, so this is the one switch
 * that takes the `.segmented--wrap` modifier (two flowing rows; every
 * button keeps min-height: var(--touch-target), so Elder/a11y is
 * untouched). The segments reuse bilingual labels that already name
 * their destinations (the kept nav entries plus the views' own titles);
 * only the section entries that had to be renamed ship as new bilingual
 * keys (nav.you, you.myAdhkar, you.growth, you.about), so each label
 * promises exactly its tap. No interstitial: every segment is a direct
 * link to its route. The rail carries no ranking or shame copy (adab).
 */
export function youModeSwitchHTML(activeView, lang) {
  const seg = (view, labelKey, selected) => `
    <a class="segmented__btn${selected ? ' segmented__btn--active' : ''}" href="${buildHash(view)}" data-action="navigate" data-view="${view}" aria-current="${selected ? 'page' : 'false'}">${t(labelKey, lang)}</a>`;
  return `
    <div class="segmented segmented--wrap you-mode-switch" role="group" aria-label="${t('nav.you', lang)}">
      ${seg(VIEWS.CHECKLIST, 'you.myAdhkar', activeView === VIEWS.CHECKLIST)}
      ${seg(VIEWS.GARDEN, 'you.growth', activeView === VIEWS.GARDEN)}
      ${seg(VIEWS.FAVORITES, 'nav.favorites', activeView === VIEWS.FAVORITES)}
      ${seg(VIEWS.JOURNAL, 'journal.title', activeView === VIEWS.JOURNAL)}
      ${seg(VIEWS.STATISTICS, 'nav.statistics', activeView === VIEWS.STATISTICS)}
      ${seg(VIEWS.CERTIFICATE, 'certificate.title', activeView === VIEWS.CERTIFICATE)}
      ${seg(VIEWS.SETTINGS, 'nav.settings', activeView === VIEWS.SETTINGS)}
      ${seg(VIEWS.ABOUT, 'you.about', activeView === VIEWS.ABOUT)}
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
      <button type="button" class="icon-btn topbar__lang" data-action="quick-language-toggle"
        aria-label="${t('a11y.languageToggle', lang)}" title="${t('a11y.languageToggle', lang)}"
        lang="${lang === 'ar' ? 'en' : 'ar'}" dir="${lang === 'ar' ? 'ltr' : 'rtl'}"
        hreflang="${lang === 'ar' ? 'en' : 'ar'}">
        <span class="topbar__lang-code" aria-hidden="true">${lang === 'ar' ? 'EN' : 'ع'}</span>
      </button>
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

  // Mobile bottom bar: four fixed destinations + More (opens the drawer).
  // In the kids scope the bar mirrors the allowlist (CSS hides it anyway —
  // the DOM stays honest for tests and assistive tech).
  const MOBILE_ITEMS = kidsScoped
    ? KIDS_NAV_ITEMS
    : [
        { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
        { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
        { view: VIEWS.MUSHAF, icon: 'quran', label: 'nav.quran' },
        { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
      ];
  // (v5.17.3, axe) these wrappers are plain divs, not nested <nav>
  // landmarks: #bottomnav already owns the single "Main navigation"
  // landmark, and duplicate same-name navs fail `landmark-unique`.
  const mobileBar = `
    <div class="nav-mobile-bar">
      ${MOBILE_ITEMS.map(
        (n) => `
      <a class="nav-mobile-bar__item ${isActive(active, n.view) ? 'nav-mobile-bar__item--active' : ''}" href="${buildHash(n.view)}" data-action="navigate" data-view="${n.view}" aria-current="${isActive(active, n.view) ? 'page' : 'false'}">
        ${icon(n.icon, { size: 22 })}
        <span class="nav__label">${t(n.label, lang)}</span>
      </a>`
      ).join('')}
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
