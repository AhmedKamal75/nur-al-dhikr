/**
 * storage.js
 * The only module allowed to touch localStorage / IndexedDB directly.
 * Everything returns a Result ({ success, value, error }) and never throws
 * during normal operation.
 */

import { STORAGE_KEY, DB_NAME, DB_VERSION } from './config.js';
import { ok, fail, storageAvailable } from './utils.js';
import { openDB, withStore } from './idb/openDB.js';

const memoryFallback = new Map();
const hasLocalStorage = storageAvailable('localStorage');

/* ------------------------------------------------------------------ */
/* localStorage: settings + lightweight state snapshot                 */
/* ------------------------------------------------------------------ */

export function loadState() {
  try {
    const raw = hasLocalStorage
      ? localStorage.getItem(STORAGE_KEY)
      : memoryFallback.get(STORAGE_KEY);
    if (!raw) return ok(null);
    return ok(JSON.parse(raw));
  } catch (err) {
    return fail(err);
  }
}

export function saveState(state) {
  try {
    const raw = JSON.stringify(state);
    if (hasLocalStorage) localStorage.setItem(STORAGE_KEY, raw);
    else memoryFallback.set(STORAGE_KEY, raw);
    return ok(true);
  } catch (err) {
    return fail(err);
  }
}

export function estimateStorageBytes() {
  try {
    const raw = hasLocalStorage
      ? localStorage.getItem(STORAGE_KEY)
      : memoryFallback.get(STORAGE_KEY);
    return ok(raw ? new Blob([raw]).size : 0);
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB: custom content documents (larger, structured records)    */
/* ------------------------------------------------------------------ */

const STORES = ['customLibraries', 'attachments'];

function upgradeDb(db) {
  for (const store of STORES) {
    if (!db.objectStoreNames.contains(store)) {
      db.createObjectStore(store, { keyPath: 'id' });
    }
  }
}

async function db() {
  return openDB(DB_NAME, DB_VERSION, upgradeDb);
}

export async function idbPut(storeName, record) {
  const d = await db();
  if (!d) return fail('IndexedDB unavailable');
  const r = await withStore(d, storeName, 'readwrite', (s) => s.put(record));
  return r.success ? ok(record) : r;
}

export async function idbDelete(storeName, id) {
  const d = await db();
  if (!d) return fail('IndexedDB unavailable');
  const r = await withStore(d, storeName, 'readwrite', (s) => s.delete(id));
  return r.success ? ok(true) : r;
}

export async function idbClear(storeName) {
  const d = await db();
  if (!d) return fail('IndexedDB unavailable');
  const r = await withStore(d, storeName, 'readwrite', (s) => s.clear());
  return r.success ? ok(true) : r;
}
