/**
 * services/contentPrefs.js (v4.5.2)
 * Pure helpers for the in-place content-manage layer — the user's own
 * hide / reorder / re-target preferences applied ON TOP of the immutable
 * bundled libraries (and custom libraries). The data files never change;
 * these prefs are a lens, so "reset to the book's order" is always just
 * "delete the override".
 *
 * Both views (library, category, focus) and the handlers (the actions
 * that mutate settings.contentPrefs) import from here, so the ordering
 * math can never drift between what the user sees and what a tap does.
 */

/** Safe-guarded read of the prefs slice (hostile/absent → empty). */
export function contentPrefsOf(state) {
  const p = state?.settings?.contentPrefs;
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}

/**
 * A category's items in the user's chosen order, hidden ones removed.
 * Ordering: an explicit orderOverrides[catId] array ranks first (by its
 * index), items it doesn't mention keep their natural `order` behind it,
 * and within the same rank the natural order breaks ties — so adding a
 * new item to the data (or creating one in the editor) never scrambles
 * an existing custom arrangement.
 */
export function visibleCategoryItems(state, category) {
  const prefs = contentPrefsOf(state);
  const items = Array.isArray(category?.items) ? [...category.items] : [];
  const override = prefs.orderOverrides?.[category?.id];
  const rank = new Map(Array.isArray(override) ? override.map((id, i) => [id, i]) : []);
  items.sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : 1e9;
    const rb = rank.has(b.id) ? rank.get(b.id) : 1e9;
    return ra - rb || (a.order || 0) - (b.order || 0);
  });
  const hidden = prefs.hiddenItems || {};
  return items.filter((it) => !hidden[it.id]);
}

/** The items of a category that are currently hidden (for the unhide bar). */
export function hiddenCategoryItems(state, category) {
  const prefs = contentPrefsOf(state);
  const hidden = prefs.hiddenItems || {};
  return (category?.items || []).filter((it) => hidden[it.id]);
}

/** A category hidden from the Library (section-level hide). */
export function isCategoryHidden(state, categoryId) {
  return !!contentPrefsOf(state).hiddenCategories?.[categoryId];
}

/** The effective repetitions target for an item: the user's override
 *  wins over the corpus default. This is what counter pills, focus mode
 *  and the tap targets all read, so one stepper changes them everywhere. */
export function itemTargetOf(state, item) {
  const prefs = contentPrefsOf(state);
  const override = Number(prefs.targetOverrides?.[item?.id]);
  if (Number.isFinite(override) && override >= 1) return Math.floor(override);
  return item?.repetitions || 1;
}

/** Map an item for rendering with its effective target (the mapped-item
 *  convention views use so card templates need no prefs knowledge). */
export function withEffectiveTargets(state, items) {
  return (items || []).map((it) => ({ ...it, repetitions: itemTargetOf(state, it) }));
}

/** next prefs after moving an item one slot within its VISIBLE order. */
export function moveItem(state, categoryId, itemId, dir = 1) {
  const prefs = contentPrefsOf(state);
  const found = findCategoryById(state, categoryId);
  const category = found?.cat;
  if (!category) return prefs;
  const visible = visibleCategoryItems(state, category).map((it) => it.id);
  const at = visible.indexOf(itemId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= visible.length) return prefs; // no-op at the edges
  [visible[at], visible[to]] = [visible[to], visible[at]];
  return { ...prefs, orderOverrides: { ...prefs.orderOverrides, [categoryId]: visible } };
}

/** next prefs after hiding/unhiding one item. */
export function setItemHidden(state, itemId, hidden) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.hiddenItems };
  if (hidden) next[itemId] = true;
  else delete next[itemId];
  return { ...prefs, hiddenItems: next };
}

/** next prefs after hiding/unhiding one whole section. */
export function setCategoryHidden(state, categoryId, hidden) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.hiddenCategories };
  if (hidden) next[categoryId] = true;
  else delete next[categoryId];
  return { ...prefs, hiddenCategories: next };
}

/** next prefs after an explicit target change (also updates the live
 *  counter record via the caller so the pill and the prefs agree). */
export function setItemTarget(state, itemId, target) {
  const prefs = contentPrefsOf(state);
  const n = Math.floor(Number(target));
  if (!Number.isFinite(n) || n < 1 || n > 10000) return prefs;
  return { ...prefs, targetOverrides: { ...prefs.targetOverrides, [itemId]: n } };
}

/** Where a category lives (needed to know which manage actions are legal:
 *  builtin sections can be hidden/reordered/re-targeted but only custom
 *  ones can be edited/deleted outright). */
export function findCategoryById(state, categoryId) {
  const docs = [
    ...Object.values(state?.library?.documents || {}),
    ...Object.values(state?.customContent || {}),
  ];
  for (const doc of docs) {
    const cat = (doc.categories || []).find((c) => c.id === categoryId);
    if (cat) return { cat, doc, isCustom: !!(state?.customContent || {})[doc.metadata.id] };
  }
  return null;
}

/* ================================================================== */
/* (v5.0.0) The four-level content authority — mutation helpers.      */
/* Every operation is a pure (state, …) → next-prefs function; the    */
/* handler layer commits via updateSettings({ contentPrefs }).        */
/* Builtin content is NEVER modified: these are lens keys.            */
/* ================================================================== */

import { clone as cloneForV5, uid as uidV5 } from '../core/utils.js';
import {
  normalizeItem as normalizeItemV5,
  normalizeCategory as normalizeCategoryV5,
} from '../core/schema.js';

/** TRUE delete an item (restorable until the matching restore). */
export function setItemDeleted(state, itemId, deleted) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.deletedItems };
  if (deleted) next[itemId] = true;
  else delete next[itemId];
  return { ...prefs, deletedItems: next };
}

/** TRUE delete a whole section (restorable). */
export function setCategoryDeleted(state, categoryId, deleted) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.deletedCategories };
  if (deleted) next[categoryId] = true;
  else delete next[categoryId];
  return { ...prefs, deletedCategories: next };
}

/** TRUE delete a whole library/banner (restorable). */
export function setLibraryDeleted(state, libraryId, deleted) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.deletedLibraries };
  if (deleted) next[libraryId] = true;
  else delete next[libraryId];
  return { ...prefs, deletedLibraries: next };
}

/** Hide/show a whole library/banner from the Library tab. */
export function setLibraryHidden(state, libraryId, hidden) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.hiddenLibraries };
  if (hidden) next[libraryId] = true;
  else delete next[libraryId];
  return { ...prefs, hiddenLibraries: next };
}

/** Merge field edits onto one item (form payload → override object). */
export function applyItemFields(state, itemId, fields) {
  const prefs = contentPrefsOf(state);
  const prev = prefs.itemOverrides?.[itemId] || {};
  const merged = { ...prev, ...fields };
  return { ...prefs, itemOverrides: { ...prefs.itemOverrides, [itemId]: merged } };
}

/** Merge metadata edits onto one section. */
export function applyCategoryFields(state, categoryId, fields) {
  const prefs = contentPrefsOf(state);
  const prev = prefs.categoryOverrides?.[categoryId] || {};
  const merged = { ...prev, ...fields };
  return { ...prefs, categoryOverrides: { ...prefs.categoryOverrides, [categoryId]: merged } };
}

/** Merge metadata edits onto one library/banner. */
export function applyLibraryFields(state, libraryId, fields) {
  const prefs = contentPrefsOf(state);
  const prev = prefs.libraryOverrides?.[libraryId] || {};
  const merged = { ...prev, ...fields };
  return { ...prefs, libraryOverrides: { ...prefs.libraryOverrides, [libraryId]: merged } };
}

/** Move a section one slot within its library's visible order. */
export function moveCategory(state, libraryId, categoryId, dir = 1) {
  const prefs = contentPrefsOf(state);
  const rawDoc = state?.library?.raw?.documents?.[libraryId];
  const added = prefs.addedCategories?.[libraryId] || [];
  const all = [...(rawDoc?.categories || []).map((c) => c.id), ...added.map((c) => c.id)].filter(
    (id) => !prefs.deletedCategories?.[id]
  );
  const current = prefs.categoryOrderOverrides?.[libraryId];
  const order = Array.isArray(current) && current.length ? [...current] : all;
  const at = order.indexOf(categoryId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= order.length) return prefs;
  [order[at], order[to]] = [order[to], order[at]];
  return {
    ...prefs,
    categoryOrderOverrides: { ...prefs.categoryOrderOverrides, [libraryId]: order },
  };
}

/** Move a library/banner one slot in the Library tab order. */
export function moveLibrary(state, libraryId, dir = 1) {
  const prefs = contentPrefsOf(state);
  const raw = state?.library?.raw;
  const order =
    Array.isArray(prefs.libraryOrderOverrides) && prefs.libraryOrderOverrides.length
      ? [...prefs.libraryOrderOverrides]
      : [...(raw?.order || [])];
  const at = order.indexOf(libraryId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= order.length) return prefs;
  [order[at], order[to]] = [order[to], order[at]];
  return { ...prefs, libraryOrderOverrides: order };
}

/** Add a user card to ANY section (builtin included) — stored as a
 *  normalized item in prefs.addedItems. Returns the created item. */
export function addItemToCategory(state, categoryId, rawItem) {
  const prefs = contentPrefsOf(state);
  const item = normalizeItemV5({
    ...rawItem,
    id: rawItem.id || uidV5('usr'),
    category_id: categoryId,
  });
  const list = [...(prefs.addedItems?.[categoryId] || []), item];
  return {
    prefs: { ...prefs, addedItems: { ...prefs.addedItems, [categoryId]: list } },
    item,
  };
}

/** Add a user section to ANY library (builtin included). */
export function addCategoryToLibrary(state, libraryId, rawCategory, items = []) {
  const prefs = contentPrefsOf(state);
  const cat = normalizeCategoryV5({
    ...rawCategory,
    id: rawCategory.id || uidV5('cat'),
    items,
  });
  const list = [...(prefs.addedCategories?.[libraryId] || []), cat];
  return {
    prefs: { ...prefs, addedCategories: { ...prefs.addedCategories, [libraryId]: list } },
    category: cat,
  };
}

/** Restore one item to its bundled defaults (field edits, target, hide,
 *  delete — everything). */
export function restoreItem(state, itemId) {
  const prefs = cloneForV5(contentPrefsOf(state));
  delete (prefs.itemOverrides || {})[itemId];
  delete (prefs.deletedItems || {})[itemId];
  delete (prefs.hiddenItems || {})[itemId];
  delete (prefs.targetOverrides || {})[itemId];
  return prefs;
}

/** Restore a whole section to defaults (items + section metadata). */
export function restoreCategory(state, categoryId) {
  const prefs = contentPrefsOf(state);
  const rawDoc = Object.values(state?.library?.raw?.documents || {}).find((d) =>
    (d.categories || []).some((c) => c.id === categoryId)
  );
  const next = cloneForV5(prefs);
  for (const it of rawDoc?.categories?.find((c) => c.id === categoryId)?.items || []) {
    delete (next.itemOverrides || {})[it.id];
    delete (next.deletedItems || {})[it.id];
    delete (next.hiddenItems || {})[it.id];
    delete (next.targetOverrides || {})[it.id];
  }
  delete (next.addedItems || {})[categoryId];
  delete (next.orderOverrides || {})[categoryId];
  delete (next.categoryOverrides || {})[categoryId];
  delete (next.deletedCategories || {})[categoryId];
  delete (next.hiddenCategories || {})[categoryId];
  return next;
}

/** Restore a whole library/banner to defaults. */
export function restoreLibrary(state, libraryId) {
  const prefs = contentPrefsOf(state);
  const rawDoc = state?.library?.raw?.documents?.[libraryId];
  let next = cloneForV5(prefs);
  for (const cat of rawDoc?.categories || []) {
    next = restoreCategory(
      { ...state, settings: { ...state.settings, contentPrefs: next } },
      cat.id
    );
  }
  delete (next.addedCategories || {})[libraryId];
  delete (next.libraryOverrides || {})[libraryId];
  delete (next.deletedLibraries || {})[libraryId];
  delete (next.hiddenLibraries || {})[libraryId];
  delete (next.libraryFieldToggles || {})[libraryId];
  delete (next.categoryOrderOverrides || {})[libraryId];
  return next;
}

/** Restore EVERYTHING (tab level): contentPrefs back to the pristine
 *  defaults — the bundled book, exactly as shipped. */
export function restoreAll() {
  return cloneForV5({
    hiddenItems: {},
    hiddenCategories: {},
    hiddenLibraries: {},
    targetOverrides: {},
    orderOverrides: {},
    categoryOrderOverrides: {},
    libraryOrderOverrides: null,
    deletedItems: {},
    deletedCategories: {},
    deletedLibraries: {},
    itemOverrides: {},
    categoryOverrides: {},
    libraryOverrides: {},
    addedItems: {},
    addedCategories: {},
    libraryFieldToggles: {},
  });
}

/** Set one library's field-visibility toggles (a full set — the sheet
 *  shows all six fields). `null` clears the override (falls back to
 *  global settings.cardFields). */
export function setLibraryFieldToggles(state, libraryId, toggles) {
  const prefs = contentPrefsOf(state);
  const next = { ...prefs.libraryFieldToggles };
  if (!toggles) delete next[libraryId];
  else next[libraryId] = { ...toggles };
  return { ...prefs, libraryFieldToggles: next };
}

/** Does a library have any customization to restore? (drives the
 *  "Restore defaults" affordance's enabled state) */
export function libraryIsCustomized(state, libraryId) {
  const prefs = contentPrefsOf(state);
  const rawDoc = state?.library?.raw?.documents?.[libraryId];
  const catIds = new Set([
    ...(rawDoc?.categories || []).map((c) => c.id),
    ...(prefs.addedCategories?.[libraryId] || []).map((c) => c.id),
  ]);
  if ((prefs.deletedLibraries || {})[libraryId] || (prefs.hiddenLibraries || {})[libraryId])
    return true;
  if (prefs.libraryOverrides?.[libraryId] || prefs.libraryFieldToggles?.[libraryId]) return true;
  if (prefs.addedCategories?.[libraryId]?.length) return true;
  if (prefs.categoryOrderOverrides?.[libraryId]) return true;
  for (const [catId, list] of Object.entries(prefs.addedItems || {})) {
    if (catIds.has(catId) && list.length) return true;
  }
  for (const catId of catIds) {
    if ((prefs.deletedCategories || {})[catId] || (prefs.hiddenCategories || {})[catId])
      return true;
    if (prefs.categoryOverrides?.[catId] || prefs.orderOverrides?.[catId]) return true;
  }
  for (const [itemId, v] of Object.entries(prefs.itemOverrides || {}))
    if (v && catHasItem(catIds, state, itemId)) return true;
  for (const key of ['deletedItems', 'hiddenItems', 'targetOverrides']) {
    for (const itemId of Object.keys(prefs[key] || {}))
      if (catHasItem(catIds, state, itemId)) return true;
  }
  return false;
}

function catHasItem(catIds, state, itemId) {
  // An item belongs to a customized library if any lensed document that
  // owns it sits under one of these categories (or it was added there).
  const entry = state?.library?.itemIndex?.[itemId];
  if (entry) return catIds.has(entry.category?.id);
  const prefs = contentPrefsOf(state);
  for (const [catId, list] of Object.entries(prefs.addedItems || {})) {
    if (catIds.has(catId) && list.some((it) => it.id === itemId)) return true;
  }
  return false;
}
