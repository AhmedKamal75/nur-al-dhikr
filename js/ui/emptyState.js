/**
 * components/emptyState.js
 * Phase C (v3.14) — the shared empty-state builder. Every "nothing here
 * yet" surface gets the same treatment: a soft icon medallion, a title
 * that names what is empty, one short hint, and — where a next step
 * exists — a single primary action to take it. The point is that an empty
 * screen should hand the person their next move, not describe a void.
 *
 * Call sites pass translated strings (bilingual parity lives at the call
 * site, where the i18n keys are known); this builder stays translation-
 * agnostic and only guarantees safe HTML (everything is escaped except
 * the action block, which callers build from trusted primitives).
 */

import { escapeHTML } from '../core/utils.js';
import { icon } from '../core/icons.js';

/**
 * @param {object} o
 * @param {string} o.iconName  icon id from js/icons.js
 * @param {string} o.title     translated title
 * @param {string} [o.hint]    translated one-line hint
 * @param {string} [o.actionHTML] prebuilt trusted action markup (a button
 *        or anchor produced by the calling view with its own data-action)
 * @param {string} [o.extraHTML] prebuilt trusted extra rows (e.g. a best-
 *        score line) inserted between hint and action
 * @param {string} [o.className] extra classes for the .empty-state root
 * @returns {string} HTML
 */
export function emptyStateHTML({
  iconName,
  title,
  hint = '',
  actionHTML = '',
  extraHTML = '',
  className = '',
}) {
  return `
  <div class="empty-state${className ? ` ${className}` : ''}">
    <span class="empty-state__medallion" aria-hidden="true">${icon(iconName, { size: 26 })}</span>
    <p class="empty-state__title">${escapeHTML(title)}</p>
    ${hint ? `<p class="empty-state__hint">${escapeHTML(hint)}</p>` : ''}
    ${extraHTML}
    ${actionHTML}
  </div>`;
}

/**
 * v4.1 — the shared load-failure state: what an async surface renders when
 * its fetch FAILED (instead of the infinite skeleton that used to shimmer
 * forever with no way forward). The Retry button dispatches
 * actions.retryDataLoad(key): the reducer clears the failure flag and bumps
 * a counter, the re-render swaps this state back to a skeleton, and
 * stateSub's ensure* pass refetches (the fetch guards were reset on
 * failure). `tierKey` is the loadErrors key the lazy loader flagged.
 */
export function loadErrorStateHTML({ lang, tierKey, t }) {
  return emptyStateHTML({
    iconName: 'cloudOff',
    title: t('common.loadFailed', lang),
    actionHTML: `<button type="button" class="btn btn--primary btn--sm" data-action="retry-load" data-key="${escapeHTML(tierKey)}">${icon('refresh', { size: 14 })} ${escapeHTML(t('common.retry', lang))}</button>`,
  });
}

/**
 * (v4.4) The shared dead-end recovery state. Bare `common.notFound*`
 * paragraphs left the reader stranded on a near-empty screen with no way
 * forward (reachable via #/mood with no id, or stale deep links). The
 * builder keeps each call site's specific title and adds one consistent
 * way out: a primary "Go home" button.
 */
export function notFoundStateHTML({ title, hint = '', lang, t }) {
  return emptyStateHTML({
    iconName: 'search',
    title,
    hint: hint || t('common.notFoundHint', lang),
    actionHTML: `<a class="btn btn--primary btn--sm" href="#/home" data-action="navigate" data-view="home">${escapeHTML(t('common.goHome', lang))}</a>`,
  });
}
