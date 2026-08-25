/**
 * audioStore.js
 * Offline recitation storage: a dedicated IndexedDB database (separate from
 * the app-state DB so a broken audio cache can never corrupt user data)
 * holding one Blob per "moshafId:surahNumber" key, plus a tiny metadata
 * record with byte size for the download manager UI.
 *
 * Everything returns Results / null; nothing throws during normal operation.
 * A quota error surfaces as { ok:false, error:'quota' } so the UI can say
 * "device storage is full" instead of dying silently.
 */

const AUDIO_DB = 'nurAlDhikrAudio';
const STORE = 'files';               // key -> { key, moshafId, surah, bytes, ts, blob }
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (!('indexedDB' in window)) { resolve(null); return; }
    const req = indexedDB.open(AUDIO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: 'key' });
        st.createIndex('moshafId', 'moshafId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('idb transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('idb transaction aborted'));
  });
}

export function audioKey(moshafId, surahNumber) {
  return `${moshafId}:${surahNumber}`;
}

/** Store a downloaded Blob. Returns { ok, bytes } or { ok:false, error }. */
export async function saveAudio(moshafId, surahNumber, blob) {
  const db = await openDB();
  if (!db) return { ok: false, error: 'no-idb' };
  const key = audioKey(moshafId, surahNumber);
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      key, moshafId, surah: Number(surahNumber),
      bytes: blob.size, ts: Date.now(), blob
    });
    await txDone(tx);
    return { ok: true, bytes: blob.size };
  } catch (err) {
    console.error('[audioStore] save failed', err);
    const name = err && err.name ? String(err.name).toLowerCase() : '';
    return { ok: false, error: name.includes('quota') ? 'quota' : 'write' };
  }
}

/** Get a stored Blob (or null when absent / unavailable). */
export async function getAudio(moshafId, surahNumber) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(audioKey(moshafId, surahNumber));
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/** Delete one stored file. */
export async function deleteAudio(moshafId, surahNumber) {
  const db = await openDB();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(audioKey(moshafId, surahNumber));
    await txDone(tx);
    return true;
  } catch { return false; }
}

/** Delete every file of a moshaf. Returns deleted count. */
export async function deleteMoshafAudio(moshafId) {
  const db = await openDB();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      const idx = st.index('moshafId');
      const req = idx.openCursor(IDBKeyRange.only(moshafId));
      let n = 0;
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return;
        cur.delete();
        n += 1;
        cur.continue();
      };
      tx.oncomplete = () => resolve(n);
      tx.onerror = () => resolve(n);
    } catch { resolve(0); }
  });
}

/** All stored keys for a moshaf (fast UI state without reading blobs). */
export async function moshafKeys(moshafId) {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('moshafId');
      const req = idx.getAllKeys(IDBKeyRange.only(moshafId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

/**
 * Download one surah for one moshaf into the store.
 * fetch → blob → save. Checks response is actually audio (CDNs return HTML
 * error pages with HTTP 200 on some CDNs' soft-404s).
 */
export async function downloadSurah(moshafId, surahNumber, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    const blob = await res.blob();
    if (!blob.size) return { ok: false, error: 'empty' };
    const type = blob.type || '';
    if (type && !/audio|octet|mpeg|mp3/i.test(type)) {
      return { ok: false, error: 'not-audio' };
    }
    const saved = await saveAudio(moshafId, surahNumber, blob);
    return saved;
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Human-readable byte size. */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Browser storage estimate (may be unavailable — returns null then). */
export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est && Number.isFinite(est.usage) && Number.isFinite(est.quota)) return est;
    }
  } catch { /* unsupported */ }
  return null;
}
