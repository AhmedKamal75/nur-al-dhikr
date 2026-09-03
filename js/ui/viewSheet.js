/**
 * ui/viewSheet.js (v4.6.0)
 * The per-view "⋯" menu: one small icon button in a view's header, one
 * modal-hosted grouped sheet behind it — the same visual language and
 * interaction model as the Mushaf's More sheet, generalized so every tab
 * (Azkar, Ahadeeth, Prayer, Garden, Tools…) can own a menu without each
 * re-inventing overlay plumbing.
 *
 * Row types:
 *   - action rows   → dispatch an existing data-action handler
 *   - link rows     → real routes (router + Back + deep links all work)
 *   - toggle rows   → checkbox bound to a settings key (CHANGE pipeline)
 *   - modal rows    → open a nested modal (sheet re-opens itself cleanly)
 *
 * Sheets are built by each view (a build function per view) and opened
 * through the single 'view-menu' handler in app/handlers/viewMenus.js,
 * which keeps the dead-UI contract honest: every row here carries a
 * data-action that resolves in the delegated click table.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

/** The small ⋯ button every view header can carry. `menuId` selects which
 *  sheet the handler opens (data-menu attribute). */
export function viewMenuButton(menuId, lang, { labelKey = 'viewMenu.open' } = {}) {
  return `
  <button type="button" class="icon-btn view-menu-btn" data-action="view-menu" data-menu="${escapeHTML(menuId)}" aria-label="${t(labelKey, lang)}" title="${t(labelKey, lang)}" aria-haspopup="dialog">
    ${icon('more', { size: 20 })}
  </button>`;
}

/** A row that dispatches a click handler. `extra` HTML rides inline-end. */
export function sheetRow(action, labelKey, iconName, lang, { extra = '', dataset = {} } = {}) {
  const attrs = Object.entries(dataset)
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
    .join(' ');
  return `
  <button type="button" class="view-sheet__row" data-action="${action}" ${attrs}>
    ${icon(iconName, { size: 18 })}<span class="view-sheet__label">${t(labelKey, lang)}</span>${extra}
  </button>`;
}

/** A row that navigates to a real route. */
export function sheetLinkRow(labelKey, iconName, view, params = {}, lang = {}) {
  const attrs = Object.entries(params)
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
    .join(' ');
  return `
  <a class="view-sheet__row" href="${buildHash(view, params)}" data-action="navigate" data-view="${view}" ${attrs}>
    ${icon(iconName, { size: 18 })}<span class="view-sheet__label">${t(labelKey, lang)}</span>
  </a>`;
}

/** A toggle row bound to a top-level settings boolean (CHANGE pipeline). */
export function sheetToggleRow(settingsKey, labelKey, iconName, lang, checked) {
  return `
  <label class="view-sheet__row view-sheet__row--toggle">
    ${icon(iconName, { size: 18 })}<span class="view-sheet__label">${t(labelKey, lang)}</span>
    <span class="switch">
      <input type="checkbox" data-action="toggle-setting" data-key="${escapeHTML(settingsKey)}" ${checked ? 'checked' : ''} />
      <span class="switch__track"></span>
    </span>
  </label>`;
}

/** Compose a sheet from labeled groups of rows. (v5.0.0) `intro` renders
 *  a small context line under the title (e.g. which banner a field-visibility
 *  sheet belongs to). */
export function viewSheet({ titleKey, lang, labelledBy, groups, footnote = '', intro = '' }) {
  return `
  <div class="view-sheet">
    <h2 id="${labelledBy}">${t(titleKey, lang)}</h2>
    ${intro ? `<p class="view-sheet__intro">${intro}</p>` : ''}
    ${groups
      .map(
        (g) => `
    <div class="view-sheet__group">
      ${g.labelKey ? `<span class="view-sheet__group-label">${t(g.labelKey, lang)}</span>` : ''}
      ${g.rows.join('')}
    </div>`
      )
      .join('')}
    ${footnote ? `<p class="view-sheet__footnote">${footnote}</p>` : ''}
  </div>`;
}

/** The Editor route stays deep-linkable; this row is how power users reach
 *  it now that the nav tab is gone. */
export const EDITOR_ROUTE_ROW = (lang) =>
  sheetLinkRow('library.openEditor', 'edit', VIEWS.EDITOR, {}, lang);
