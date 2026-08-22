/**
 * editor.js
 * All create/read/update/delete logic for user-authored content. Custom
 * content lives in state.customContent, keyed by library id, using the exact
 * same normalized shape as built-in libraries (see schema.js) so the renderer
 * and search index treat them identically.
 */

import { store, actions } from './state.js';
import { normalizeDocument, normalizeItem, normalizeCategory, validateDocument, blankItem, blankCategory } from './schema.js';
import { clone, uid } from './utils.js';

const DEFAULT_CUSTOM_LIBRARY_ID = 'custom';

function ensureCustomLibrary(libraryId = DEFAULT_CUSTOM_LIBRARY_ID) {
  const state = store.getState();
  if (state.customContent[libraryId]) return state.customContent[libraryId];
  const doc = normalizeDocument({
    metadata: { id: libraryId, name: { en: 'My Content', ar: 'محتواي' }, description: { en: 'Custom items you\u2019ve added', ar: '' }, version: '1.0.0' },
    categories: []
  });
  store.dispatch(actions.upsertCustomLibrary(doc));
  return doc;
}

function pushUndo(prevDoc) {
  const state = store.getState();
  const undoStack = [...state.editor.undoStack, prevDoc].slice(-25);
  // NOTE: editor undo/redo stack is intentionally not persisted (ephemeral, in-memory only).
  store.state.editor = { undoStack, redoStack: [] };
}

/** List every custom library document as an array. */
export function listCustomLibraries() {
  return Object.values(store.getState().customContent);
}

export function getCustomLibrary(libraryId = DEFAULT_CUSTOM_LIBRARY_ID) {
  return store.getState().customContent[libraryId] || null;
}

/** Create a brand-new custom library (a user "book"/collection of categories). */
export function createLibrary({ id, nameEn, nameAr }) {
  const libId = id || uid('lib');
  const doc = normalizeDocument({
    metadata: { id: libId, name: { en: nameEn || 'Untitled', ar: nameAr || '' }, description: { en: '', ar: '' }, version: '1.0.0' },
    categories: []
  });
  store.dispatch(actions.upsertCustomLibrary(doc));
  return doc;
}

export function deleteLibrary(libraryId) {
  store.dispatch(actions.deleteCustomLibrary(libraryId));
}

/** Add a new category to a custom library. */
export function addCategory(libraryId, { nameEn, nameAr, icon = 'book', color = 'slate' }) {
  const doc = clone(getCustomLibrary(libraryId) || ensureCustomLibrary(libraryId));
  pushUndo(doc);
  const cat = normalizeCategory({
    id: uid('cat'),
    section_id: libraryId,
    name: { en: nameEn || 'Untitled Category', ar: nameAr || '' },
    order: doc.categories.length + 1,
    icon,
    color,
    items: []
  }, libraryId);
  doc.categories.push(cat);
  store.dispatch(actions.upsertCustomLibrary(doc));
  return cat;
}

export function deleteCategory(libraryId, categoryId) {
  const doc = clone(getCustomLibrary(libraryId));
  if (!doc) return;
  pushUndo(doc);
  doc.categories = doc.categories.filter((c) => c.id !== categoryId);
  store.dispatch(actions.upsertCustomLibrary(doc));
}

/** Create (or update, if `itemId` matches an existing one) an item within a category. */
export function saveItem(libraryId, categoryId, fields, itemId = null) {
  const doc = clone(getCustomLibrary(libraryId) || ensureCustomLibrary(libraryId));
  pushUndo(doc);
  const cat = doc.categories.find((c) => c.id === categoryId);
  if (!cat) return { success: false, error: 'Category not found' };

  const id = itemId || uid('item');
  const normalized = normalizeItem({ ...fields, id, category_id: categoryId }, categoryId);

  const existingIdx = cat.items.findIndex((it) => it.id === id);
  if (existingIdx >= 0) cat.items[existingIdx] = normalized;
  else cat.items.push(normalized);

  const validation = validateDocument(doc);
  if (!validation.success) return { success: false, error: validation.error };

  store.dispatch(actions.upsertCustomLibrary(doc));

  // Surface any warning that applies specifically to the item just saved
  // (e.g. "no Arabic text and no translation") — schema.js already computes
  // these, but until now they only ever reached the browser console, so a
  // user who saved a functionally-blank card never found out. Not blocking
  // (the save still succeeds), but no longer silent.
  const ownWarnings = (validation.value.warnings || []).filter((w) => w.includes(`"${id}"`));
  return { success: true, item: normalized, warnings: ownWarnings };
}

export function duplicateItem(libraryId, categoryId, itemId) {
  const doc = clone(getCustomLibrary(libraryId));
  if (!doc) return null;
  const cat = doc.categories.find((c) => c.id === categoryId);
  const item = cat?.items.find((it) => it.id === itemId);
  if (!item) return null;
  pushUndo(doc);
  const copy = { ...clone(item), id: uid('item'), title: { en: `${item.title.en} (copy)`, ar: item.title.ar } };
  cat.items.push(copy);
  store.dispatch(actions.upsertCustomLibrary(doc));
  return copy;
}

export function deleteItem(libraryId, categoryId, itemId) {
  const doc = clone(getCustomLibrary(libraryId));
  if (!doc) return;
  const cat = doc.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  pushUndo(doc);
  cat.items = cat.items.filter((it) => it.id !== itemId);
  store.dispatch(actions.upsertCustomLibrary(doc));
}

export function undo() {
  const state = store.getState();
  const stack = state.editor.undoStack;
  if (!stack.length) return false;
  const prevDoc = stack[stack.length - 1];
  const redoStack = [...state.editor.redoStack, getCustomLibrary(prevDoc.metadata.id)].slice(-25);
  store.state.editor = { undoStack: stack.slice(0, -1), redoStack };
  store.dispatch(actions.upsertCustomLibrary(prevDoc));
  return true;
}

export function blankItemTemplate(categoryId) { return blankItem(categoryId); }
export function blankCategoryTemplate(libraryId) { return blankCategory(libraryId); }
export { DEFAULT_CUSTOM_LIBRARY_ID };
