/**
 * router.js
 * Minimal hash router. URL shape: #/view/seg1/seg2?q=foo
 * The router only ever dispatches NAVIGATE — it holds no state of its own,
 * so the browser back/forward buttons and deep links both work for free.
 */

import { store, actions } from './state.js';
import { VIEWS } from './config.js';

function parseHash() {
  let hash = window.location.hash || '';
  if (hash.startsWith('#')) hash = hash.slice(1);
  if (hash.startsWith('/')) hash = hash.slice(1);
  const [pathPart, queryPart] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const view = segments[0] || VIEWS.HOME;
  const params = {};
  if (segments[1]) params.id = decodeURIComponent(segments[1]);
  if (segments[2]) params.subId = decodeURIComponent(segments[2]);
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { view, params };
}

function applyFromHash() {
  const { view, params } = parseHash();
  store.dispatch(actions.navigate(view, params));
}

export function initRouter() {
  window.addEventListener('hashchange', applyFromHash);
  applyFromHash();
}

/** Build a hash string for a given view/params, for use in href attributes. */
export function buildHash(view, params = {}) {
  let path = `#/${view}`;
  if (params.id) path += `/${encodeURIComponent(params.id)}`;
  if (params.subId) path += `/${encodeURIComponent(params.subId)}`;
  const queryEntries = Object.entries(params).filter(([k]) => !['id', 'subId'].includes(k));
  if (queryEntries.length) {
    path += '?' + queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  }
  return path;
}

/** Navigate programmatically (pushes a real history entry via location.hash). */
export function go(view, params = {}) {
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
