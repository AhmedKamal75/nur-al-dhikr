/** Focus queues share one resolver across rendering, keys and auto-advance. */
import { visibleCategoryItems } from './contentPrefs.js';
import { VIEWS } from '../core/config.js';

/** Saved order wins over category order. Missing and hidden entries are skipped. */
export function collectionSessionEntries(state, collection) {
  const seen = new Set();
  return (collection?.items || []).flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const entry = state.library?.itemIndex?.[id];
    if (!entry?.item || !entry.category) return [];
    const prefs = state.settings?.contentPrefs || {};
    const libraryId = entry.document?.metadata?.id;
    if (
      prefs.deletedItems?.[id] ||
      prefs.deletedCategories?.[entry.category.id] ||
      prefs.hiddenCategories?.[entry.category.id] ||
      prefs.deletedLibraries?.[libraryId] ||
      prefs.hiddenLibraries?.[libraryId]
    )
      return [];
    return visibleCategoryItems(state, entry.category).some((item) => item.id === id)
      ? [entry]
      : [];
  });
}

/** Read-eligible count shares the exact Focus queue contract. */
export function collectionReadableCount(state, collection) {
  return collectionSessionEntries(state, collection).length;
}

export function collectionSessionStart(state, collection) {
  const entries = collectionSessionEntries(state, collection);
  return entries.find((entry) => entry.item.id === collection?.sessionItemId) || entries[0] || null;
}

export function focusRoute(entry, collectionId) {
  return {
    id: entry.category.id,
    subId: entry.item.id,
    ...(collectionId ? { collection: collectionId } : {}),
  };
}

export function resolveFocusQueue(state) {
  const params = state.activeParams || {};
  const collectionId = params.collection;
  if (collectionId) {
    const collection = state.collections?.find((c) => c.id === collectionId);
    const entries = collectionSessionEntries(state, collection);
    const current =
      entries.find((e) => e.item.id === params.subId) || collectionSessionStart(state, collection);
    return {
      collection,
      collectionId,
      items: entries.map((e) => e.item),
      item: current?.item || null,
      cat: current?.category || null,
      idx: entries.findIndex((e) => e.item.id === current?.item.id),
    };
  }
  const docs = [
    ...Object.values(state.library?.documents || {}),
    ...Object.values(state.customContent || {}),
  ];
  const cat = docs.flatMap((doc) => doc.categories || []).find((c) => c.id === params.id) || null;
  const items = visibleCategoryItems(state, cat);
  const idx = items.findIndex((item) => item.id === params.subId);
  return { collectionId: null, collection: null, cat, items, idx, item: items[idx] || null };
}

export function focusExitRoute(state) {
  const collectionId = state.activeParams?.collection;
  return collectionId
    ? { view: VIEWS.COLLECTION, params: { id: collectionId } }
    : { view: VIEWS.CATEGORY, params: { id: state.activeParams?.id } };
}
