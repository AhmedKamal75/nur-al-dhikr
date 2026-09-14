/**
 * domain/quickTiles.js (v5.2.54) — Home quick-action tiles: editable order
 * + visibility, usage-driven by default.
 *
 * The 8 tiles used to be hardcoded in views/home.js. They are now a
 * registry (same destinations, icons, labels, accents) with two behaviors:
 *  - favorite-driven default: with no saved order, tiles sort by tap
 *    counts (state.tileVisits) descending — stable ties keep registry
 *    order, so a fresh install renders exactly the old layout;
 *  - editable: any move/hide writes an explicit order
 *    (settings.quickOrder) + hides (settings.hiddenQuick), which win.
 * Unknown/stale ids degrade to visible defaults — a backup from a newer
 * version can never blank the tile row.
 */

import { VIEWS } from '../core/config.js';

export const QUICK_TILE_IDS = Object.freeze([
  'mushaf',
  'morning',
  'evening',
  'tasbih',
  'prayer',
  'qibla',
  'ramadan',
  'zakat',
]);

/** Registry: destination, icon, label key and accent class per tile. */
export const QUICK_TILE_DEFS = Object.freeze([
  {
    id: 'mushaf',
    view: VIEWS.MUSHAF,
    params: null,
    icon: 'quran',
    labelKey: 'quran.readShortcut',
    accent: 'quran',
  },
  {
    id: 'morning',
    view: VIEWS.CATEGORY,
    params: { id: 'morning' },
    icon: 'sunrise',
    labelKey: 'home.morningShortcut',
    accent: 'sunrise',
  },
  {
    id: 'evening',
    view: VIEWS.CATEGORY,
    params: { id: 'evening' },
    icon: 'sunset',
    labelKey: 'home.eveningShortcut',
    accent: 'sunset',
  },
  {
    id: 'tasbih',
    view: VIEWS.TASBIH,
    params: null,
    icon: 'tasbih',
    labelKey: 'nav.tasbih',
    accent: 'tasbih',
  },
  {
    id: 'prayer',
    view: VIEWS.PRAYER,
    params: null,
    icon: 'prayer-rug',
    labelKey: 'nav.prayer',
    accent: 'prayer',
  },
  {
    id: 'qibla',
    view: VIEWS.QIBLA,
    params: null,
    icon: 'compass',
    labelKey: 'nav.qibla',
    accent: 'qibla',
  },
  {
    id: 'ramadan',
    view: VIEWS.RAMADAN,
    params: null,
    icon: 'moon',
    labelKey: 'nav.ramadan',
    accent: 'ramadan',
  },
  {
    id: 'zakat',
    view: VIEWS.ZAKAT,
    params: null,
    icon: 'calculator',
    labelKey: 'nav.zakat',
    accent: 'zakat',
  },
]);

function visitCount(visits, id) {
  const n = Number(visits?.[id]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Usage order: tap counts descending (stable — ties keep registry order). */
export function usageTileOrder(visits) {
  return [...QUICK_TILE_IDS].sort((a, b) => visitCount(visits, b) - visitCount(visits, a));
}

function asHiddenMap(hidden) {
  return hidden && typeof hidden === 'object' && !Array.isArray(hidden) ? hidden : {};
}

/**
 * Effective visible tile ids: the saved order first (known ids only),
 * then anything missing in usage order — minus hidden ones.
 */
export function resolveQuickTiles(input) {
  const { order = null, hidden = null, visits = null } = input || {};
  const hide = asHiddenMap(hidden);
  const seen = new Set();
  const out = [];
  const take = (id) => {
    if (QUICK_TILE_IDS.includes(id) && !seen.has(id) && hide[id] !== true) {
      seen.add(id);
      out.push(id);
    }
  };
  const base = Array.isArray(order) ? order : usageTileOrder(visits);
  for (const id of base) take(id);
  // A manual order may omit ids (older backup) — usage order fills them.
  if (Array.isArray(order)) for (const id of usageTileOrder(visits)) take(id);
  return out;
}

/**
 * Move one tile up (-1) or down (+1) inside an explicit order list.
 * Starts from the usage order when nothing is saved yet (so the first
 * manual move preserves the favorite-driven arrangement).
 */
export function moveQuickTile(order, visits, id, dir) {
  const base = (
    Array.isArray(order) ? order.filter((x) => QUICK_TILE_IDS.includes(x)) : usageTileOrder(visits)
  ).slice();
  for (const missing of QUICK_TILE_IDS) if (!base.includes(missing)) base.push(missing);
  const i = base.indexOf(id);
  const j = i + (dir > 0 ? 1 : -1);
  if (i < 0 || j < 0 || j >= base.length) return base;
  [base[i], base[j]] = [base[j], base[i]];
  return base;
}
