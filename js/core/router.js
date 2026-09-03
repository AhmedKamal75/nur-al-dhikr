/**
 * router.js
 * Minimal hash router. URL shape: #/view/seg1/seg2?q=foo
 * The router only ever dispatches NAVIGATE — it holds no state of its own,
 * so the browser back/forward buttons and deep links both work for free.
 */

import { store, actions } from './state.js';
import { VIEWS } from './config.js';

/** decodeURIComponent that survives malformed input. A truncated or
 *  mangled deep link (e.g. `#/category/%C3` — percent-escape cut mid-
 *  sequence, which happens whenever a shared URL gets chopped) used to
 *  throw URIError out of parseHash; because initRouter() runs inside
 *  boot()'s try/catch, that rendered the scary "your data may be
 *  corrupted / reset app data" error screen over a mere typo. (FIX
 *  review v3.3 B3.) Malformed segments now fall back to their raw text,
 *  which at worst yields a "not found" view — never a boot crash.
 *  Exported for unit tests. */
export const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

function parseHash() {
  let hash = window.location.hash || '';
  if (hash.startsWith('#')) hash = hash.slice(1);
  if (hash.startsWith('/')) hash = hash.slice(1);
  const [pathPart, queryPart] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const view = segments[0] || VIEWS.HOME;
  const params = {};
  if (segments[1]) params.id = safeDecode(segments[1]);
  if (segments[2]) params.subId = safeDecode(segments[2]);
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      // Slice at the FIRST '=' so a value that itself contains '=' (a
      // hand-edited or shared URL) keeps its tail — split('=') used to
      // silently truncate it.
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const k = pair.slice(0, eq);
      const v = pair.slice(eq + 1);
      params[safeDecode(k)] = safeDecode(v);
    }
  }
  return { view, params };
}

function applyFromHash() {
  const { view, params } = parseHash();
  // (v4.2) '#main' is the skip-to-content in-page anchor, not a route.
  // It used to flow through as view 'main' → unknown-view normalize → Home
  // + a spurious error toast. The click interceptor stops it at the source;
  // this guard covers manual entry / middle-click / saved-URL edge cases.
  if (view === 'main') return;
  store.dispatch(actions.navigate(view, params));
}

/* Back/forward traversal flag: popstate always fires BEFORE the accompanying
 * hashchange. The renderer asks consumePopNavigation() after a render to
 * decide whether to restore the saved scroll position for the destination
 * instead of jumping to the top (the v4.1 answer to "Back from a surah
 * always lands at the top of the list"). Module-local: the router owns its
 * own transient state and stays free of app-layer imports.
 *
 * (v4.5.2) CRITICAL DISTINCTION: Chromium ALSO fires popstate for a
 * PROGRAMMATIC hash assignment (location.hash = ...) — the history entry
 * changes, so the event fires, even though nobody traversed backwards.
 * Treating those as traversals made every forward navigation pop the
 * logical back stack (and mis-time scroll restore). go()/replaceGo() now
 * arm `pushExpected` right before the assignment; the popstate listener
 * stands down for its own push and lets the hashchange that follows do
 * the navigating. A REAL traversal (browser Back, OS gesture, swipes)
 * arrives with the flag down and is honored. */
let popNavigation = false;
let pushExpected = false;

export function consumePopNavigation() {
  const was = popNavigation;
  popNavigation = false;
  return was;
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    pushExpected = false;
    applyFromHash();
  });
  window.addEventListener('popstate', () => {
    if (pushExpected) {
      // our own location.hash assignment — the hashchange event that
      // follows is the navigation; this popstate is its side effect.
      return;
    }
    popNavigation = true;
  });
  applyFromHash();
}

/** Build a hash string for a given view/params, for use in href attributes. */
export function buildHash(view, params = {}) {
  let path = `#/${view}`;
  if (params.id) path += `/${encodeURIComponent(params.id)}`;
  if (params.subId) path += `/${encodeURIComponent(params.subId)}`;
  const queryEntries = Object.entries(params).filter(([k]) => !['id', 'subId'].includes(k));
  if (queryEntries.length) {
    path +=
      '?' +
      queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  }
  return path;
}

/** Navigate programmatically (pushes a real history entry via location.hash). */
export function go(view, params = {}) {
  pushExpected = true; // see the popstate note above
  window.location.hash = buildHash(view, params);
}

/**
 * Update the current view/params WITHOUT pushing a new history entry.
 * Used for high-frequency updates (e.g. live search-as-you-type) where every
 * keystroke pushing a fresh history entry would make the browser Back button
 * useless — one Back press should leave the search screen entirely, not
 * step through each partially-typed query.
 */
export function replaceGo(view, params = {}) {
  const hash = buildHash(view, params);
  window.history.replaceState(window.history.state, '', hash);
  store.dispatch(actions.navigate(view, params));
}
