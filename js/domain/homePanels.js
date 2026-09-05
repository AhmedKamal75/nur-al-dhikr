/**
 * domain/homePanels.js — Home panel order + visibility. Pure helpers over
 * the persisted `settings.homeOrder` (array of panel ids, or null for the
 * book order) and `settings.hiddenHome` ({ [id]: true }). Unknown/stale
 * ids degrade to the default position or visible — a backup from a newer
 * version can never blank the home screen.
 */

export const HOME_PANEL_IDS = Object.freeze([
  'ramadan',
  'checklist',
  'continue',
  'progress',
  'verse',
  'hadith',
  'hifz',
  'worship',
  'recent',
  'favorites',
  'collections',
]);

/** Effective panel order: saved order first (known ids only), then any
 *  missing panels in book order, minus hidden ones. */
export function resolveHomePanels(order, hidden) {
  const hide = hidden && typeof hidden === 'object' ? hidden : {};
  const seen = new Set();
  const out = [];
  if (Array.isArray(order)) {
    for (const id of order) {
      if (HOME_PANEL_IDS.includes(id) && !seen.has(id) && hide[id] !== true) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  for (const id of HOME_PANEL_IDS) {
    if (!seen.has(id) && hide[id] !== true) out.push(id);
  }
  return out;
}

/** Move one panel up (-1) or down (+1) inside an explicit order list.
 *  Starts from the book order when none is saved yet. */
export function moveHomePanel(order, id, dir) {
  const base = Array.isArray(order)
    ? order.filter((x) => HOME_PANEL_IDS.includes(x))
    : [...HOME_PANEL_IDS];
  for (const missing of HOME_PANEL_IDS) if (!base.includes(missing)) base.push(missing);
  const i = base.indexOf(id);
  const j = i + (dir > 0 ? 1 : -1);
  if (i < 0 || j < 0 || j >= base.length) return base;
  [base[i], base[j]] = [base[j], base[i]];
  return base;
}
