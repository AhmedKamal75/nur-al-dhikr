/**
 * core/idb/openDB.js — the hardened IndexedDB boundary (B4).
 *
 * Guarantees:
 * - a blocked upgrade settles (resolves null), never a forever-pending
 *   promise that hangs every import this session;
 * - a failed open is NOT memoized — the next call retries;
 * - onversionchange closes our connection so other tabs can upgrade,
 *   and a closed connection is evicted so the next call re-opens;
 * - transaction failures surface via onerror AND onabort.
 *
 * Results follow the house style (ok()/fail(), never throws); a null db
 * means "unavailable" and callers take their existing fail() path.
 */

import { ok, fail } from '../utils.js';

// name@version -> Promise<IDBDatabase> (live connection, reused).
// Failure/blocked entries are evicted on settle, so they never stick.
const live = new Map();

function idb() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.indexedDB) return globalThis.indexedDB;
  } catch {
    /* no indexedDB */
  }
  return null;
}

export function openDB(name, version, upgrade) {
  const factory = idb();
  if (!factory) return Promise.resolve(null);
  const key = `${name}@${version}`;
  if (live.has(key)) return live.get(key);
  const p = new Promise((resolve) => {
    let settled = false;
    const settleNull = () => {
      if (settled) return;
      settled = true;
      live.delete(key);
      resolve(null);
    };
    let req;
    try {
      req = factory.open(name, version);
    } catch (err) {
      console.error('[idb] open threw', name, err);
      settleNull();
      return;
    }
    req.onupgradeneeded = () => {
      try {
        upgrade?.(req.result);
      } catch (err) {
        console.error('[idb] upgrade failed', name, err);
      }
    };
    req.onsuccess = () => {
      settled = true;
      const db = req.result;
      try {
        // Let OTHER tabs upgrade: close ours when the version moves.
        db.onversionchange = () => {
          live.delete(key);
          try {
            db.close();
          } catch {
            /* already closed */
          }
        };
        // A closed connection must never be served again.
        db.onclose = () => live.delete(key);
      } catch {
        /* non-standard host object — connection still usable */
      }
      resolve(db);
    };
    req.onerror = () => {
      console.error('[idb] open failed', name, req.error);
      settleNull();
    };
    // A queued upgrade blocked by another tab's open connection fires
    // neither onsuccess nor onerror — without this the cached promise
    // would hang every caller for the rest of the session (B4).
    req.onblocked = () => {
      console.warn('[idb] open blocked by another tab', name);
      settleNull();
    };
  });
  live.set(key, p);
  return p;
}

/** Run one transaction; resolves ok/fail — never throws. */
export function withStore(db, storeName, mode, op) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, mode);
      let req;
      try {
        req = op(tx.objectStore(storeName));
      } catch (err) {
        resolve(fail(err));
        return;
      }
      tx.oncomplete = () => resolve(ok(req && 'result' in Object(req) ? req.result : true));
      tx.onerror = () => resolve(fail(tx.error));
      tx.onabort = () => resolve(fail(tx.error || new Error('aborted')));
    } catch (err) {
      resolve(fail(err));
    }
  });
}

/** Test-only: drop cached connections between cases. */
export function resetIdbForTests() {
  live.clear();
}
