/**
 * app/net.js — the app's data-fetch layer.
 *
 * Extracted from boot.js in v4.1: boot is the composition root AND (as the
 * old home of fetchJSON) was imported by six runtime modules — lazyData,
 * quranData, quranSearch, hadithData, stateSub — which created seven
 * distinct import cycles all passing through the entry file. It only
 * worked because fetchJSON was a hoisted function declaration; any future
 * top-level const in boot.js would have broken those modules at link time.
 * Data fetching now lives here, dependency-free.
 */

import { CATALOG_URL } from '../core/config.js';
import { migrate } from '../core/migration.js';
import { processDocument } from '../core/schema.js';
import { isSafeKey } from '../core/utils.js';
import { actions, store } from '../core/state.js';
import { buildIndex } from '../domain/search.js';
import { rt } from './rt.js';

/**
 * Fetch and parse a JSON resource.
 *
 * Deliberately uses the browser's DEFAULT cache mode: the service worker
 * owns freshness via stale-while-revalidate, and forcing `no-cache` here
 * made every data file revalidate on every session — on the README's own
 * quick-start server (no conditional-request support) that meant a full
 * multi-megabyte re-download of every library per session.
 *
 * (v4.3) an HTTP 200 body of {"error":"offline"} also throws: the SW's
 * offline stub is 503 now, but any older cached copy (or a misbehaving
 * proxy) could still hand back the old 200 stub, which used to slip past
 * the !res.ok guard and poison callers with an "error document" that
 * rendered as empty content.
 */
export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const body = await res.json();
  if (body && typeof body === 'object' && !Array.isArray(body) && body.error === 'offline') {
    throw new Error(`Failed to fetch ${url}: offline stub`);
  }
  return body;
}

export function buildItemIndex(documents, customContent) {
  const index = {};
  const allDocs = [...Object.values(documents), ...Object.values(customContent)];
  for (const doc of allDocs) {
    for (const category of doc.categories) {
      for (const item of category.items) {
        // (S3) prototype-pollution guard: item ids become index keys.
        if (!isSafeKey(item.id)) continue;
        index[item.id] = { item, category, document: doc };
      }
    }
  }
  return index;
}

export async function loadLibraries() {
  const documents = {};
  const order = [];
  let libraryFailed = false;
  try {
    const catalog = await fetchJSON(CATALOG_URL);
    const libs = (catalog.libraries || [])
      .filter((l) => l.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Fetch every library file in parallel (they're independent), then apply
    // results back in catalog order so display order stays deterministic
    // regardless of which network request happens to resolve first.
    const results = await Promise.all(
      libs.map(async (lib) => {
        try {
          const raw = await fetchJSON(lib.file);
          const migrated = migrate(raw, lib.id);
          const result = processDocument(migrated);
          if (!result.success) {
            console.error(`[net] ${lib.id} failed validation:`, result.error);
            return null;
          }
          return { id: lib.id, doc: result.value };
        } catch (err) {
          console.error(`[net] Failed to load library "${lib.id}"`, err);
          return null;
        }
      })
    );

    for (const entry of results) {
      if (!entry) continue;
      // (S3) catalog ids become documents-map keys.
      if (!isSafeKey(entry.id)) continue;
      documents[entry.id] = entry.doc;
      order.push(entry.id);
    }
    // (v4.3) the library tier finally joins the loadErrors machinery: a
    // cold cache + offline start used to "boot successfully" with zero
    // content — every list empty, no retry affordance anywhere. Flag the
    // tier when the catalog itself failed or every library did; the Home
    // and Library views render an error + Retry from this flag.
    if (libs.length > 0 && order.length === 0) libraryFailed = true;
  } catch (err) {
    console.error('[net] Failed to load catalog.json', err);
    libraryFailed = true;
  }
  store.dispatch(actions.setLoadError('library', libraryFailed));
  return { documents, order };
}

/**
 * (v4.3) Retry the boot-time library load from the Retry button on the
 * loadErrors error state. Re-runs the same pipeline boot() uses and
 * refreshes the derived indexes, so a recovered fetch fully repopulates
 * the app without a manual reload.
 */
export async function retryLibraryLoad() {
  const { documents, order } = await loadLibraries();
  if (order.length > 0) {
    store.dispatch(actions.bootComplete({ documents, order, itemIndex: {} }));
    refreshLibraryIndex();
    rt.lastCustomContentRef = store.getState().customContent;
  }
}

export function refreshLibraryIndex() {
  const state = store.getState();
  const itemIndex = buildItemIndex(state.library.documents, state.customContent);
  store.dispatch(actions.setLibraryIndex(itemIndex));
  buildIndex(itemIndex);
  // Content edits (bundled-library updates, imports) can remove item ids that
  // favorites/collections still reference. Prune those dead references so
  // counts stay honest and backups stay clean. Reducer no-ops when clean.
  // (v5.0.0) TRUE-deleted items are RESTORABLE — their favorite refs must
  // survive the deletion so "Restore defaults" brings the whole card back,
  // favorites included. Only genuinely-gone ids (not in any doc, not in the
  // deletedItems lens) get pruned.
  const deletedLens = new Set(Object.keys(state.settings?.contentPrefs?.deletedItems || {}));
  store.dispatch(actions.pruneDanglingRefs(new Set([...Object.keys(itemIndex), ...deletedLens])));
}
