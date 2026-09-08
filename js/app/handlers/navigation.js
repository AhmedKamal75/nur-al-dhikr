/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { closeNavDrawer, openNavDrawer } from '../drawer.js';
import {
  debounceHadithQuery,
  debounceQuranSearchNavigate,
  debounceRootsSearchNavigate,
  debounceSearchNavigate,
} from '../inputs.js';
import { go } from '../../core/router.js';
import { actions, store } from '../../core/state.js';

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
    go(ds.view, {});
  },

  'quick-theme-toggle': () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    store.dispatch(actions.updateSettings({ themeMode: isDark ? 'light' : 'dark' }));
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
];
