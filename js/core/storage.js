/**
 * storage.js
 * The only module allowed to touch localStorage directly.
 * Everything returns a Result ({ success, value, error }) and never throws
 * during normal operation.
 *
 * (v5.15.0) the IndexedDB custom-content backend (idbPut/idbDelete/
 * idbClear + estimateStorageBytes) is gone with zero callers: custom
 * content persists inside the localStorage snapshot (PERSISTED_KEYS),
 * audio blobs live in the audio store's own database, and the reset
 * path wipes nurAlDhikrDB by name. Dead code is a liability, not an asset.
 */

import { STORAGE_KEY } from './config.js';
import { ok, fail, storageAvailable } from './utils.js';

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
