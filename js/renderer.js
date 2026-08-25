/**
 * renderer.js
 * Treats state as read-only input and produces DOM output. Two render tiers:
 *  1. Shell (topbar + nav) — re-rendered only when settings/activeView change
 *     in a way that affects it (cheap either way, but kept separate for clarity).
 *  2. Main view — swapped entirely on every relevant state change, selected
 *     by state.activeView via VIEW_TABLE.
 *
 * No view module touches the DOM directly except through the strings they
 * return; only this file and app.js's event delegation actually mutate DOM.
 */

import { VIEWS } from './config.js';
import { renderTopBar, renderNav } from './components/shell.js';
import { renderHome } from './views/home.js';
import { renderLibrary } from './views/library.js';
import { renderCategory } from './views/category.js';
import { renderMood } from './views/mood.js';
import { renderFocus } from './views/focus.js';
import { renderSearch } from './views/search.js';
import { renderFavorites } from './views/favorites.js';
import { renderCollections } from './views/collections.js';
import { renderCollection } from './views/collection.js';
import { renderStatistics } from './views/statistics.js';
import { renderTasbih } from './views/tasbih.js';
import { renderPrayer } from './views/prayer.js';
import { renderQibla } from './views/qibla.js';
import { renderChecklist } from './views/checklist.js';
import { renderQuiz } from './views/quiz.js';
import { renderMushaf } from './views/mushafReader.js';
import { renderCalendar } from './views/calendar.js';
import { renderRamadan } from './views/ramadan.js';
import { renderZakat } from './views/zakat.js';
import { renderAudio } from './views/audioManager.js';
import { renderQuran } from './views/quran.js';
import { renderSettings } from './views/settings.js';
import { renderAbout } from './views/about.js';
import { renderEditor } from './views/editor.js';
import { renderPlayerBar } from './views/playerBar.js';

const VIEW_TABLE = {
  [VIEWS.HOME]: renderHome,
  [VIEWS.LIBRARY]: renderLibrary,
  [VIEWS.CATEGORY]: renderCategory,
  [VIEWS.MOOD]: renderMood,
  [VIEWS.FOCUS]: renderFocus,
  [VIEWS.SEARCH]: renderSearch,
  [VIEWS.FAVORITES]: renderFavorites,
  [VIEWS.COLLECTIONS]: renderCollections,
  [VIEWS.COLLECTION]: renderCollection,
  [VIEWS.STATISTICS]: renderStatistics,
  [VIEWS.TASBIH]: renderTasbih,
  [VIEWS.PRAYER]: renderPrayer,
  [VIEWS.QIBLA]: renderQibla,
  [VIEWS.CHECKLIST]: renderChecklist,
  [VIEWS.QUIZ]: renderQuiz,
  [VIEWS.MUSHAF]: renderMushaf,
  [VIEWS.CALENDAR]: renderCalendar,
  [VIEWS.RAMADAN]: renderRamadan,
  [VIEWS.ZAKAT]: renderZakat,
  [VIEWS.AUDIO]: renderAudio,
  [VIEWS.QURAN]: renderQuran,
  [VIEWS.SETTINGS]: renderSettings,
  [VIEWS.ABOUT]: renderAbout,
  [VIEWS.EDITOR]: renderEditor
};

let lastView = null;
let mainEl = null;
let topbarEl = null;
let navEl = null;

export function mountShell() {
  mainEl = document.getElementById('main');
  topbarEl = document.getElementById('topbar');
  navEl = document.getElementById('bottomnav');
}

export function render(state) {
  if (!mainEl) mountShell();

  topbarEl.innerHTML = renderTopBar(state);
  navEl.innerHTML = renderNav(state);

  const view = VIEW_TABLE[state.activeView] || renderHome;
  const isFocus = state.activeView === VIEWS.FOCUS;
  document.body.classList.toggle('is-focus-mode', isFocus);
  // Desktop rail collapse rides on <html> so layout margins (not just the
  // rail itself) can react to it in pure CSS.
  document.documentElement.setAttribute('data-nav-collapsed', state.settings.navCollapsed ? '1' : '0');

  mainEl.innerHTML = view(state);

  // Persistent player bar: rendered into its own mount AFTER the main view
  // so it survives view switches (it lives outside #main in body flow).
  const barMount = document.getElementById('playerbar');
  if (barMount) barMount.innerHTML = renderPlayerBar(state);
  // Reserve scroll room under the bar whenever it is visible.
  document.body.classList.toggle('has-player', !!(state.player?.moshafId));

  if (state.activeView !== lastView) {
    mainEl.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    lastView = state.activeView;
    // Move focus to the main region heading for screen reader / keyboard users on navigation.
    mainEl.focus({ preventScroll: true });
  }
}
