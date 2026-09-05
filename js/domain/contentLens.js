/**
 * domain/contentLens.js (v5.0.0)
 * The four-level content-authority lens. The bundled libraries stay
 * immutable on disk; everything the user changes — full field edits on
 * any card, true deletes, additions, reordering, renames, field
 * visibility — lives in settings.contentPrefs and is applied HERE, at
 * the data-flow choke point, so every surface (Library, category,
 * focus, search, Home, mood) sees the SAME effective corpus without
 * knowing the lens exists.
 *
 * Levels (the user's model):
 *   1. Card     — item field edits, target, hide, true delete, restore
 *   2. Section  — category metadata, card order/add/delete, restore
 *   3. Banner   — library metadata, section order/add/delete, restore
 *   4. Tab      — global restore, field defaults, schedules
 *
 * "Restore to default" is always just "delete the override keys" — the
 * book underneath never changed, exactly like the v4.5.2 hide/reorder
 * lens this module generalizes.
 *
 * Pure functions only (no imports of state/ui) — trivially testable.
 */

import { clone, isSafeKey } from '../core/utils.js';

const EMPTY = {};

/** Safe-guarded read of the prefs slice (hostile/absent → empty). */
export function prefsOf(state) {
  const p = state?.settings?.contentPrefs;
  return p && typeof p === 'object' && !Array.isArray(p) ? p : EMPTY;
}

/* ------------------------------------------------------------------ */
/* Item level                                                          */
/* ------------------------------------------------------------------ */

/**
 * Merge a user's field overrides onto one item. The override may carry
 * any subset of the writable fields; each present key replaces the
 * corpus value (never deep-merges nested objects — a partial
 * `title: {en}` override would otherwise drop the Arabic name).
 */
export function applyItemOverrides(item, itemOverrides) {
  const ov = itemOverrides?.[item.id];
  if (!ov || typeof ov !== 'object') return item;
  const merged = { ...item };
  for (const [k, v] of Object.entries(ov)) {
    // whitelist: the fields buildItemForm writes (schema keys)
    if (ITEM_OVERRIDE_FIELDS.has(k)) merged[k] = v;
  }
  return merged;
}

export const ITEM_OVERRIDE_FIELDS = new Set([
  'title',
  'arabic',
  'transliteration',
  'translation',
  'reference',
  'grade',
  'custom_grade',
  'repetitions',
  'virtues',
  'tags',
  'related',
  'notes',
  'order',
]);

/** One category's effective items: corpus + user-added, minus true-deletes,
 *  user-ordered, field-overridden. Hidden stays a VIEW concern (v4.5.2
 *  behavior preserved — hidden items remain in the index so favorites
 *  and counters survive). */
export function lensCategoryItems(category, prefs, libraryId) {
  const deleted = prefs.deletedItems || EMPTY;
  const overrides = prefs.itemOverrides || EMPTY;
  const added = (prefs.addedItems || EMPTY)[category.id];
  const order = (prefs.orderOverrides || EMPTY)[category.id];

  const base = (category.items || []).filter((it) => !deleted[it.id]);
  const addedItems = Array.isArray(added) ? added.filter((it) => it && !deleted[it.id]) : [];
  let items = [...base, ...addedItems].map((it) => applyItemOverrides(it, overrides));
  if (addedItems.length) {
    // Added items continue the corpus order sequence.
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order || 0), 0);
    items = items.map((it, i) =>
      addedItems.some((a) => a.id === it.id) && !(it.order >= 1)
        ? { ...it, order: maxOrder + i }
        : it
    );
  }

  if (Array.isArray(order)) {
    const rank = new Map(order.map((id, i) => [id, i]));
    items.sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : 1e9;
      const rb = rank.has(b.id) ? rank.get(b.id) : 1e9;
      return ra - rb || (a.order || 0) - (b.order || 0);
    });
  }
  void libraryId;
  return items;
}

/* ------------------------------------------------------------------ */
/* Section (category) level                                            */
/* ------------------------------------------------------------------ */

function mergeCategoryMeta(cat, prefs) {
  const ov = (prefs.categoryOverrides || EMPTY)[cat.id];
  if (!ov || typeof ov !== 'object') return cat;
  const merged = { ...cat };
  if (ov.name && typeof ov.name === 'object') merged.name = { ...cat.name, ...ov.name };
  if (ov.description && typeof ov.description === 'object')
    merged.description = { ...cat.description, ...ov.description };
  if (typeof ov.icon === 'string' && ov.icon) merged.icon = ov.icon;
  if (typeof ov.color === 'string' && ov.color) merged.color = ov.color;
  return merged;
}

/** One document's effective categories. */
export function lensDocumentCategories(doc, prefs) {
  const deleted = prefs.deletedCategories || EMPTY;
  const addedCats = (prefs.addedCategories || EMPTY)[doc.metadata.id];
  const order = (prefs.categoryOrderOverrides || EMPTY)[doc.metadata.id];

  const base = (doc.categories || []).filter((c) => !deleted[c.id]);
  const added = Array.isArray(addedCats) ? addedCats.filter((c) => c && !deleted[c.id]) : [];
  const cats = [...base, ...added].map((c) => mergeCategoryMeta(c, prefs));
  if (Array.isArray(order)) {
    const rank = new Map(order.map((id, i) => [id, i]));
    cats.sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : 1e9;
      const rb = rank.has(b.id) ? rank.get(b.id) : 1e9;
      return ra - rb || (a.order || 0) - (b.order || 0);
    });
  }
  // Categories carry their effective items now — the lens is applied once,
  // at the source, so views never re-derive it.
  return cats.map((cat) => ({ ...cat, items: lensCategoryItems(cat, prefs) }));
}

/* ------------------------------------------------------------------ */
/* Library (banner) level                                              */
/* ------------------------------------------------------------------ */

function mergeLibraryMeta(doc, prefs) {
  const ov = (prefs.libraryOverrides || EMPTY)[doc.metadata.id];
  if (!ov || typeof ov !== 'object') return doc;
  const metadata = { ...doc.metadata };
  if (ov.name && typeof ov.name === 'object') metadata.name = { ...metadata.name, ...ov.name };
  if (ov.description && typeof ov.description === 'object')
    metadata.description = { ...metadata.description, ...ov.description };
  return { ...doc, metadata };
}

/**
 * The whole effective library: raw documents → lensed documents + order.
 * Deleted libraries are removed everywhere (restore = delete the key).
 * Hidden libraries are kept in documents (view-level concern, matches
 * v4.5.2 semantics for sections) but are dropped from the ORDER so
 * surfaces that walk `library.order` skip them unless managing.
 */
export function lensLibrary(rawDocuments, rawOrder, prefs) {
  const deletedLibs = prefs.deletedLibraries || EMPTY;
  const documents = {};
  for (const [id, doc] of Object.entries(rawDocuments || {})) {
    if (!isSafeKey(id)) continue; // (S3) ids become documents-map keys
    if (deletedLibs[id]) continue;
    const lensed = mergeLibraryMeta(doc, prefs);
    documents[id] = { ...lensed, categories: lensDocumentCategories(lensed, prefs) };
  }
  let order = (rawOrder || []).filter((id) => documents[id]);
  const prefOrder = prefs.libraryOrderOverrides;
  if (Array.isArray(prefOrder) && prefOrder.length) {
    const rank = new Map(prefOrder.map((id, i) => [id, i]));
    order = [...order].sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : 1e9;
      const rb = rank.has(b) ? rank.get(b) : 1e9;
      return ra - rb;
    });
  }
  return { documents, order };
}

/** Convenience: apply the lens to a full state's library slice. */
export function lensStateLibrary(state) {
  const raw = state?.library?.raw;
  if (!raw) return null;
  return lensLibrary(raw.documents, raw.order, prefsOf(state));
}

/* ------------------------------------------------------------------ */
/* Field visibility (tab level, cascading down)                        */
/* ------------------------------------------------------------------ */

export const CARD_FIELD_KEYS = [
  'transliteration',
  'translation',
  'virtues',
  'reference',
  'grade',
  'notes',
];

/**
 * Effective card fields for a library: the library's own toggles win;
 * absent library toggles fall back to the global settings.cardFields
 * defaults; absent everything = all fields visible (v4 behavior).
 */
export function fieldTogglesFor(state, libraryId) {
  const prefs = prefsOf(state);
  const libToggles = (prefs.libraryFieldToggles || EMPTY)[libraryId];
  if (libToggles && typeof libToggles === 'object') {
    const out = {};
    for (const k of CARD_FIELD_KEYS) out[k] = libToggles[k] !== false;
    return out;
  }
  const global = state?.settings?.cardFields;
  if (global && typeof global === 'object') {
    const out = {};
    for (const k of CARD_FIELD_KEYS) out[k] = global[k] !== false;
    return out;
  }
  return {
    transliteration: true,
    translation: true,
    virtues: true,
    reference: true,
    grade: true,
    notes: true,
  };
}

/* ------------------------------------------------------------------ */
/* Restore-to-default key math (all four levels)                       */
/* ------------------------------------------------------------------ */

/** All override keys touching one item. */
export function itemOverrideKeys(itemId) {
  return { itemId };
}

/** Strip every prefs entry that touches a category's items (but not the
 *  category itself — restoreCategory handles the whole section). */
export function stripCategoryItemKeys(prefs, categoryId, rawDoc) {
  const next = clone(prefs);
  const cat = rawDoc?.categories?.find((c) => c.id === categoryId);
  const ids = new Set((cat?.items || []).map((it) => it.id));
  for (const id of ids) {
    delete (next.itemOverrides || {})[id];
    delete (next.deletedItems || {})[id];
    delete (next.hiddenItems || {})[id];
    delete (next.targetOverrides || {})[id];
  }
  delete (next.addedItems || {})[categoryId];
  delete (next.orderOverrides || {})[categoryId];
  return next;
}

/** Restore a whole section: item keys + the category's own keys. */
export function stripCategoryKeys(prefs, categoryId) {
  const next = clone(prefs);
  delete (next.categoryOverrides || {})[categoryId];
  delete (next.deletedCategories || {})[categoryId];
  delete (next.hiddenCategories || {})[categoryId];
  delete (next.addedItems || {})[categoryId];
  delete (next.orderOverrides || {})[categoryId];
  delete (next.categoryOrderOverrides || {})[categoryId];
  return next;
}

/** Restore a whole library: every category inside it + the library keys. */
export function stripLibraryKeys(prefs, libraryId, rawDoc) {
  let next = clone(prefs);
  for (const cat of rawDoc?.categories || []) {
    next = stripCategoryKeys(next, cat.id);
    next = stripCategoryItemKeys(next, cat.id, rawDoc);
  }
  delete (next.addedCategories || {})[libraryId];
  delete (next.libraryOverrides || {})[libraryId];
  delete (next.deletedLibraries || {})[libraryId];
  delete (next.hiddenLibraries || {})[libraryId];
  delete (next.libraryFieldToggles || {})[libraryId];
  delete (next.categoryOrderOverrides || {})[libraryId];
  return next;
}

/** Is an item restorable (any override/deletion touches it)? */
export function itemIsCustomized(prefs, itemId) {
  return !!(
    (prefs.itemOverrides || {})[itemId] ||
    (prefs.deletedItems || {})[itemId] ||
    (prefs.hiddenItems || {})[itemId] ||
    (prefs.targetOverrides || {})[itemId]
  );
}
