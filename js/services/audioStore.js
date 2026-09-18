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

import { formatBytes as canonicalFormatBytes } from '../core/utils.js';
import { fetchWithTimeout } from '../core/fetch.js';

const AUDIO_DB = 'nurAlDhikrAudio';
const STORE = 'files'; // key -> { key, moshafId, surah, bytes, ts, blob }
let dbPromise = null;

/**
 * (v5.2.75, PERF-02) total-bytes budget for the audio cache. Full-Qur'an
 * packs are GB-scale and the store used to grow unboundedly — under
 * pressure the browser evicts best-effort origin data, which can include
 * the localStorage app state, with no warning. Oldest-ts records evict
 * first once the cap is crossed (user recordings never evict).
 */
export const AUDIO_CACHE_DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB
let audioCacheMaxBytes = AUDIO_CACHE_DEFAULT_MAX_BYTES;

/** Test seam: override the cap (pass the default constant to restore). */
export function setAudioCacheCapForTests(bytes) {
  const n = Math.floor(Number(bytes));
  audioCacheMaxBytes = Number.isFinite(n) && n >= 0 ? n : AUDIO_CACHE_DEFAULT_MAX_BYTES;
}

/**
 * Pure: oldest-ts keys to drop so `records` fit `maxBytes`. User adhan
 * recordings are never evicted; malformed rows are ignored, never dropped.
 */
export function planCacheEviction(records, maxBytes) {
  const rows = (Array.isArray(records) ? records : []).filter(
    (r) => r && typeof r.key === 'string' && Number.isFinite(r.bytes) && r.bytes >= 0
  );
  let total = rows.reduce((a, r) => a + r.bytes, 0);
  const cap = Math.floor(Number(maxBytes));
  if (!Number.isFinite(cap) || total <= cap) return [];
  const evictable = rows
    .filter((r) => !String(r.moshafId || '').startsWith(ADHAN_MOSHAF_ID))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const out = [];
  for (const r of evictable) {
    if (total <= cap) break;
    out.push(r.key);
    total -= r.bytes;
  }
  return out;
}

/** Reset the memoized connection (tests only — new globals need a fresh open). */
export function _resetAudioStoreForTests() {
  dbPromise = null;
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        resolve(null);
        return;
      }
    } catch {
      resolve(null);
      return;
    }
    let req;
    try {
      req = indexedDB.open(AUDIO_DB, 1);
    } catch {
      resolve(null);
      return;
    }
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
      key,
      moshafId,
      surah: Number(surahNumber),
      bytes: blob.size,
      ts: Date.now(),
      blob,
    });
    await txDone(tx);
    // (v5.2.75, PERF-02) protect the origin + bound worst-case growth:
    // persist probe once, then oldest-ts eviction — neither ever fails
    // the save itself.
    ensurePersistentStorage();
    enforceAudioCacheCap();
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
    } catch {
      resolve(null);
    }
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
  } catch {
    return false;
  }
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
    } catch {
      resolve(0);
    }
  });
}

/**
 * Download one surah for one moshaf into the store.
 * fetch → blob → save. Checks response is actually audio (CDNs return HTML
 * error pages with HTTP 200 on some CDNs' soft-404s).
 * (F-004) through the timeout layer with a large-file budget: an
 * unbounded download hangs a batch-pool slot forever on a stalled
 * handoff; 120s terminates it and the missing-only retry recovers.
 */
export async function downloadSurah(moshafId, surahNumber, url) {
  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 120000 });
    // A 404 is LEARNED availability (moshafAvailability), not a generic
    // failure: translation/Taraweeh variants often lack surahs.
    if (res.status === 404) return { ok: false, error: 'missing' };
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
// (v4.1) display format for download sizes (whole KB) — delegates to the
// shared formatter; see core/utils.js#formatBytes for the other variant.
export function formatBytes(bytes) {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  return canonicalFormatBytes(n);
}

/** Browser storage estimate (may be unavailable — returns null then). */
export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est && Number.isFinite(est.usage) && Number.isFinite(est.quota)) return est;
    }
  } catch {
    /* unsupported */
  }
  return null;
}

/**
 * (v5.2.75, PERF-02) ask the browser to treat origin storage as
 * persistent (no-op where unsupported). Called once per session after
 * the first successful audio download — best-effort, never throws.
 */
let persistRequested = false;
export function ensurePersistentStorage() {
  if (persistRequested) return Promise.resolve(false);
  persistRequested = true;
  try {
    const p = navigator?.storage?.persist?.();
    if (p && typeof p.then === 'function')
      return p.then(
        () => true,
        () => false
      );
  } catch {
    /* unsupported */
  }
  return Promise.resolve(false);
}

/** Test seam: allow the persist probe to run again. */
export function resetPersistForTests() {
  persistRequested = false;
}

/** Lightweight rows for the whole cache ({key, moshafId, bytes, ts}). */
async function listAudioRecords() {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result || []).map((r) => ({
            key: r?.key,
            moshafId: r?.moshafId,
            bytes: r?.bytes,
            ts: r?.ts,
          }))
        );
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/** Delete one record by full key (covers verse + adhan slots too). */
async function deleteAudioByKey(key) {
  const db = await openDB();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(String(key));
    await txDone(tx);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enforce the total-bytes budget (oldest-ts first). Fire-and-forget from
 * the save paths — eviction must never fail a download. Deps injectable
 * for tests (defaults read the live IDB). Returns the dropped keys.
 */
export async function enforceAudioCacheCap({
  list = listAudioRecords,
  remove = deleteAudioByKey,
  cap = audioCacheMaxBytes,
} = {}) {
  try {
    const drop = planCacheEviction(await list(), cap);
    for (const key of drop) {
      try {
        await remove(key);
      } catch {
        /* keep evicting the rest */
      }
    }
    return drop;
  } catch {
    return [];
  }
}

/**
 * Cache usage for the Offline view quota meter ({bytes, cap, count} or
 * null when IDB is unavailable). Read on view open, not per render.
 */
export async function audioCacheUsage() {
  try {
    const db = await openDB();
    if (!db) return null;
    const rows = await listAudioRecords();
    return {
      bytes: rows.reduce((a, r) => a + (Number.isFinite(r.bytes) ? r.bytes : 0), 0),
      cap: audioCacheMaxBytes,
      count: rows.length,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * v5.2.61 — Per-ayah verse audio.
 * Same IndexedDB store, `v:`-prefixed keys (`v:<reciterId>:<globalAyah>`)
 * beside the full-surah `moshafId:surah` keys: no version bump, no
 * migration, and the moshafId index never sees them. One Blob per ayah;
 * the verse engine plays them offline-first with CDN fallback.
 * ------------------------------------------------------------------ */

/** IDB key for one verse file (global ayah 1..6236). */
export function verseKey(reciterId, globalAyah) {
  return `v:${String(reciterId || '')}:${Math.floor(Number(globalAyah)) || 0}`;
}

/** Store one verse Blob. Returns { ok, bytes } or { ok:false, error }. */
export async function saveVerseAudio(reciterId, globalAyah, blob) {
  const db = await openDB();
  if (!db) return { ok: false, error: 'no-idb' };
  if (!blob || !blob.size) return { ok: false, error: 'empty' };
  const key = verseKey(reciterId, globalAyah);
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      key,
      moshafId: `__verse__:${reciterId}`,
      ayah: Math.floor(Number(globalAyah)),
      bytes: blob.size,
      ts: Date.now(),
      blob,
    });
    await txDone(tx);
    // (v5.2.75, PERF-02) same origin-protection + budget as full-surah saves.
    ensurePersistentStorage();
    enforceAudioCacheCap();
    return { ok: true, bytes: blob.size };
  } catch (err) {
    console.error('[audioStore] verse save failed', err);
    const name = err && err.name ? String(err.name).toLowerCase() : '';
    return { ok: false, error: name.includes('quota') ? 'quota' : 'write' };
  }
}

/** Get one stored verse Blob (or null when absent / unavailable). */
export async function getVerseAudio(reciterId, globalAyah) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(verseKey(reciterId, globalAyah));
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Global ayah numbers stored for a voice ([] when unavailable). One
 * getAllKeys scan — callers group per surah; rescan only on view open.
 */
export async function listVerseAyahs(reciterId) {
  const db = await openDB();
  if (!db) return [];
  const prefix = `v:${String(reciterId || '')}:`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => {
        const out = [];
        for (const k of req.result || []) {
          if (typeof k === 'string' && k.startsWith(prefix)) {
            const n = Math.floor(Number(k.slice(prefix.length)));
            if (Number.isFinite(n) && n > 0) out.push(n);
          }
        }
        resolve(out);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/** Delete one stored verse file. */
export async function deleteVerseAudio(reciterId, globalAyah) {
  const db = await openDB();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(verseKey(reciterId, globalAyah));
    await txDone(tx);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download one verse file into the store (fetch → audio-check → save).
 * Same honesty contract as downloadSurah: 404 is learned 'missing',
 * non-audio payloads refuse, timeouts terminate.
 * (v5.10.2) `url` accepts a single URL or an ordered candidate list —
 * the first success wins and the walk stops, so the CORS-open mirror
 * rescue costs one extra attempt only when the primary fails. A string
 * keeps the old single-URL behavior exactly.
 */
export async function downloadVerseFile(reciterId, globalAyah, url) {
  const urls = Array.isArray(url) ? url.filter((u) => typeof u === 'string' && u) : [url];
  if (!urls.length) return { ok: false, error: 'network' };
  const errors = [];
  for (const u of urls) {
    try {
      const res = await fetchWithTimeout(u, { timeoutMs: 30000 });
      if (res.status === 404) {
        errors.push('missing');
        continue;
      }
      if (!res.ok) {
        errors.push(`http-${res.status}`);
        continue;
      }
      const blob = await res.blob();
      if (!blob.size) {
        errors.push('empty');
        continue;
      }
      const type = blob.type || '';
      if (type && !/audio|octet|mpeg|mp3/i.test(type)) {
        errors.push('not-audio');
        continue;
      }
      return saveVerseAudio(reciterId, globalAyah, blob);
    } catch {
      errors.push('network');
    }
  }
  // Every candidate 404'd → the file genuinely doesn't exist anywhere
  // (learned 'missing'); otherwise report the last failure.
  if (errors.length && errors.every((e) => e === 'missing')) return { ok: false, error: 'missing' };
  return { ok: false, error: errors[errors.length - 1] || 'network' };
}

/* ------------------------------------------------------------------ *
 * v3.8 — Adhan recordings.
 * Reuses this same IndexedDB store under a reserved "moshaf" id, with a
 * fixed slot per variant (standard / Fajr). Users bring their own files
 * (any audio they lawfully possess); nothing is fetched from any server,
 * keeping the nothing-leaves-your-device promise intact.
 * ------------------------------------------------------------------ */
export const ADHAN_MOSHAF_ID = '__adhan__';
export const ADHAN_KIND_SLOTS = Object.freeze({ standard: 1, fajr: 2 });
export const ADHAN_MAX_BYTES = 8 * 1024 * 1024; // generous cap: ~8 minutes of 128k MP3

/** Light magic-byte sniffing: accept MP3 (ID3 or frame sync), Ogg, WAV, and
 *  MP4/M4A containers. Pure function over the first bytes — unit-testable. */
export function looksLikeAudio(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (off, len) => String.fromCharCode(...bytes.subarray(off, off + len));
  if (ascii(0, 3) === 'ID3') return true; // MP3 with metadata
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true; // MP3 frame sync
  if (ascii(0, 4) === 'OggS') return true; // Ogg (Vorbis/Opus)
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return true; // WAV
  if (ascii(4, 4) === 'ftyp') return true; // MP4/M4A
  return false;
}

/** Validate a user-picked File/Blob for import. Returns null when OK,
 *  otherwise an i18n-ish error code string. Pure (reads only size/type). */
export function validateAdhanFile(file) {
  if (!file || typeof file !== 'object') return 'invalid';
  if (!Number.isFinite(file.size) || file.size <= 0) return 'empty';
  if (file.size > ADHAN_MAX_BYTES) return 'tooLarge';
  // type is optional on some browsers — judge by magic bytes later; here
  // only reject an explicitly bogus top-level type.
  if (
    typeof file.type === 'string' &&
    file.type &&
    !file.type.startsWith('audio/') &&
    file.type !== 'video/mp4'
  ) {
    return 'notAudio';
  }
  return null;
}

export async function saveAdhanAudio(kind, blob) {
  const slot = ADHAN_KIND_SLOTS[kind];
  if (!slot) return { ok: false, error: 'invalid' };
  return saveAudio(ADHAN_MOSHAF_ID, slot, blob);
}

/** Returns the stored Blob or null when the user never imported one. */
export async function getAdhanAudio(kind) {
  const slot = ADHAN_KIND_SLOTS[kind];
  if (!slot) return null;
  return getAudio(ADHAN_MOSHAF_ID, slot);
}

export async function deleteAdhanAudio(kind) {
  const slot = ADHAN_KIND_SLOTS[kind];
  if (!slot) return false;
  return deleteAudio(ADHAN_MOSHAF_ID, slot);
}
