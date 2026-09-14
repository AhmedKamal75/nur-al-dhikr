/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { closeNavDrawer, openNavDrawer } from '../drawer.js';
import {
  debounceCollectionSearchNavigate,
  debounceFavoritesSearchNavigate,
  debounceHadithGridQuery,
  debounceHadithQuery,
  debounceJournalSearchNavigate,
  debounceQuranSearchNavigate,
  debounceRootsSearchNavigate,
  debounceSearchNavigate,
  debounceSettingsSearchNavigate,
} from '../inputs.js';
import { go } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { VIEWS, resolveKidsView } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { showToast } from '../../ui/toast.js';
import { openPalette } from '../palette.js';

// (v5.2.65, item 22) kids-mode scope: taps outside the allowlist stay in
// the kids world with an explanatory toast instead of opening the full
// app. Returns true when the tap was absorbed. The reducer backstop
// (NAVIGATE in state/slices/shell.js) covers the silent paths — deep
// links, history traversals, search-debounce navigations.
function kidsScopeGuard(view) {
  const st = store.getState();
  if (st.settings?.kidsMode !== true) return false;
  if (resolveKidsView(view, true) === view) return false;
  showToast(t('kids.blocked', st.settings.language));
  if (st.activeView !== VIEWS.KIDS) go(VIEWS.KIDS);
  return true;
}

export const clickHandlers = {
  navigate: (ds) => {
    const params = {};
    if (ds.id) params.id = ds.id;
    if (ds.subId) params.subId = ds.subId;
    if (ds.month) params.month = ds.month;
    // FIX (v4.0 hostile review B1): views emit extra route params as
    // data-attributes (Qur'an search results carry data-ay, the daily
    // hadith card carries data-n) — the old allowlist silently dropped
    // them, so the click prevented the href and the deep link never
    // scrolled/highlighted its target. Forward every param the views
    // actually emit; values are strings from the DOM, and the router +
    // reducers already sanitize everything downstream (deep links arrive
    // through the same path from the URL hash).
    if (ds.ay) params.ay = ds.ay;
    if (ds.n) params.n = ds.n;
    if (ds.q) params.q = ds.q;
    if (ds.page) params.page = ds.page;
    if (ds.mem) params.mem = ds.mem;
    // Views may also emit a raw query string (the journal's tab switcher
    // uses data-query="tab=reflections") — forward its pairs so the SPA
    // click lands where the href already points. Keys/values are capped
    // plain strings; the router + reducers sanitize downstream.
    if (ds.query) {
      for (const pair of String(ds.query).split('&')) {
        const eq = pair.indexOf('=');
        if (eq <= 0) continue;
        const k = pair.slice(0, eq);
        const v = pair.slice(eq + 1);
        if (/^[A-Za-z]{1,16}$/.test(k) && v.length <= 200) params[k] = v;
      }
    }
    if (kidsScopeGuard(ds.view)) return;
    go(ds.view, params);
  },

  // (v5.2.54) quick tiles navigate like everything else, and additionally
  // record the tap — usage order drives the default tile arrangement
  // until the person customizes it in Settings.
  'quick-tile': (ds) => {
    if (kidsScopeGuard(ds.view)) return;
    const params = {};
    if (ds.id) params.id = ds.id;
    if (ds.tile) store.dispatch(actions.recordTileVisit(ds.tile));
    go(ds.view, params);
  },

  /* ---------------- Shell: collapsible nav ---------------- */

  'nav-toggle': () => {
    // Desktop: collapse/expand the side rail (persisted). Mobile: open the
    // grouped drawer sheet (transient body class — not worth persisting).
    const isDesktop = window.matchMedia('(min-width: 960px)').matches;
    if (isDesktop) {
      const next = !store.getState().settings.navCollapsed;
      store.dispatch(actions.updateSettings({ navCollapsed: next }));
    } else {
      openNavDrawer();
    }
  },

  // (v4.5.2, APP-FLOW I9) the topbar Back button: walk the REAL history
  // (I3), not a synthetic stack — the browser already knows the exact
  // entry the user came from. Guarded for the headless test environment.
  'go-back': () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  },

  'nav-drawer-close': () => {
    closeNavDrawer();
  },

  'nav-drawer-go': (ds) => {
    closeNavDrawer();
    if (kidsScopeGuard(ds.view)) return;
    go(ds.view, {});
  },

  'quick-theme-toggle': () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    store.dispatch(actions.updateSettings({ themeMode: isDark ? 'light' : 'dark' }));
  },

  'open-palette': () => {
    // Also serves the nav-drawer item: shut the drawer first so the
    // overlay opens onto the content, not behind the drawer.
    closeNavDrawer();
    // (v5.2.65, item 22) the palette is an all-access launcher — it stays
    // shut in kids mode like every other out-of-scope destination.
    if (kidsScopeGuard(VIEWS.SEARCH)) return;
    openPalette();
  },
};

/** input registry (Blueprint D): { sel, run(ds, el, e) }. */
export const inputHandlers = [
  {
    sel: '[data-bind="search-query"]',
    run: (ds, el) => {
      debounceSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="quran-search"]',
    run: (ds, el) => {
      debounceQuranSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="roots-search"]',
    run: (ds, el) => {
      debounceRootsSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="hadith-query"]',
    run: (ds, el) => {
      debounceHadithQuery(el.value);
    },
  },
  {
    sel: '[data-bind="hadith-grid-search"]',
    run: (ds, el) => {
      debounceHadithGridQuery(el.value);
    },
  },
  {
    sel: '[data-bind="journal-search"]',
    run: (ds, el) => {
      debounceJournalSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="favorites-search"]',
    run: (ds, el) => {
      debounceFavoritesSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="collection-search"]',
    run: (ds, el) => {
      debounceCollectionSearchNavigate(el.value);
    },
  },
  {
    sel: '[data-bind="settings-search"]',
    run: (ds, el) => {
      debounceSettingsSearchNavigate(el.value);
    },
  },
];
