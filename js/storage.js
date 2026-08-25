/**
 * storage.js
 * The only module allowed to touch localStorage / IndexedDB directly.
 * Everything returns a Result ({ success, value, error }) and never throws
 * during normal operation.
 */

import { STORAGE_KEY, DB_NAME, DB_VERSION } from './config.js';
import { ok, fail, storageAvailable } from './utils.js';

const memoryFallback = new Map();
const hasLocalStorage = storageAvailable('localStorage');

/* ------------------------------------------------------------------ */
/* localStorage: settings + lightweight state snapshot                 */
/* ------------------------------------------------------------------ */

export function loadState() {
  try {
    const raw = hasLocalStorage ? localStorage.getItem(STORAGE_KEY) : memoryFallback.get(STORAGE_KEY);
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

export function clearState() {
  try {
    if (hasLocalStorage) localStorage.removeItem(STORAGE_KEY);
    else memoryFallback.delete(STORAGE_KEY);
    return ok(true);
  } catch (err) {
    return fail(err);
  }
}

export function estimateStorageBytes() {
  try {
    const raw = hasLocalStorage ? localStorage.getItem(STORAGE_KEY) : memoryFallback.get(STORAGE_KEY);
    return ok(raw ? new Blob([raw]).size : 0);
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB: custom content documents (larger, structured records)    */
/* ------------------------------------------------------------------ */

const STORES = ['customLibraries', 'attachments'];
let dbPromise = null;

function openDB() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

export async function idbPut(store, record) {
  const db = await openDB();
  if (!db) return fail('IndexedDB unavailable');
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve(ok(record));
      tx.onerror = () => resolve(fail(tx.error));
    } catch (err) {
      resolve(fail(err));
    }
  });
}

export async function idbGetAll(store) {
  const db = await openDB();
  if (!db) return ok([]);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(ok(req.result || []));
      req.onerror = () => resolve(fail(req.error));
    } catch (err) {
      resolve(fail(err));
    }
  });
}

export async function idbDelete(store, id) {
  const db = await openDB();
  if (!db) return fail('IndexedDB unavailable');
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve(ok(true));
      tx.onerror = () => resolve(fail(tx.error));
    } catch (err) {
      resolve(fail(err));
    }
  });
}

export async function idbClear(store) {
  const db = await openDB();
  if (!db) return fail('IndexedDB unavailable');
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(ok(true));
      tx.onerror = () => resolve(fail(tx.error));
    } catch (err) {
      resolve(fail(err));
    }
  });
}
