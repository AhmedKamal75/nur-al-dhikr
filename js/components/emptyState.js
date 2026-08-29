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

import { escapeHTML } from '../utils.js';
import { icon } from '../icons.js';

/**
 * @param {object} o
 * @param {string} o.iconName  icon id from js/icons.js
 * @param {string} o.title     translated title
 * @param {string} [o.hint]    translated one-line hint
 * @param {string} [o.actionHTML] prebuilt trusted action markup (a button
 *        or anchor produced by the calling view with its own data-action)
 * @returns {string} HTML
 */
export function emptyStateHTML({ iconName, title, hint = '', actionHTML = '' }) {
  return `
  <div class="empty-state">
    <span class="empty-state__medallion" aria-hidden="true">${icon(iconName, { size: 26 })}</span>
    <p class="empty-state__title">${escapeHTML(title)}</p>
    ${hint ? `<p class="empty-state__hint">${escapeHTML(hint)}</p>` : ''}
    ${actionHTML}
  </div>`;
}
