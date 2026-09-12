/**
 * services/moshafAvailability.js — learned per-surah availability.
 *
 * Catalog servers are assumed to host 001–114.mp3, but translation,
 * Taraweeh and Mu'allim variants often lack surahs. Rather than HEADing
 * 114 files per moshaf up front (slow, data-hungry on the app's
 * mobile-data audience), availability is LEARNED: a 404 (or audio
 * content-type rejection on a 404 status) records the surah as missing
 * for that moshaf, in memory + best-effort localStorage. Download-all
 * skips known-missing, the grid disables their cells, and streaming
 * says "not on this server" instead of failing generically.
 *
 * Pure data + guarded storage only; no DOM, no audio, no store import
 * (views read it directly — the download start/end dispatches that
 * already re-render pick up newly learned rows).
 */

const STORAGE_KEY = 'nur-moshaf-availability-v1';
const MAX_IDS = 400;
const MAX_MISSING_PER_ID = 114;

const memory = new Map(); // moshafId -> Set<surahNumber>
let loaded = false;

function loadOnce() {
  if (loaded) return;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const doc = JSON.parse(raw);
    if (!doc || typeof doc !== 'object') return;
    for (const [id, list] of Object.entries(doc)) {
      if (typeof id !== 'string' || !Array.isArray(list)) continue;
      const set = new Set();
      for (const n of list) {
        const v = Math.floor(Number(n));
        if (Number.isFinite(v) && v >= 1 && v <= 114) set.add(v);
      }
      if (set.size) memory.set(id, set);
      if (memory.size >= MAX_IDS) break;
    }
  } catch {
    /* corrupted cache or blocked storage — start empty */
  }
}

function persist() {
  try {
    if (typeof localStorage === 'undefined') return;
    const doc = {};
    for (const [id, set] of memory) doc[id] = [...set];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    /* quota / private mode — memory cache still works for the session */
  }
}

function validId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 80;
}

function validSurah(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 1 && v <= 114 ? v : null;
}

/** Known-missing surahs for a moshaf (empty array when unknown/all present). */
export function missingSurahs(moshafId) {
  loadOnce();
  if (!validId(moshafId)) return [];
  return [...(memory.get(moshafId) || [])].sort((a, b) => a - b);
}

/** True when this surah is known absent from this moshaf's server. */
export function isSurahMissing(moshafId, surahNumber) {
  loadOnce();
  const v = validSurah(surahNumber);
  if (!validId(moshafId) || v == null) return false;
  return memory.get(moshafId)?.has(v) === true;
}

/** Record a 404 so future taps skip honestly. Idempotent. */
export function markSurahMissing(moshafId, surahNumber) {
  loadOnce();
  const v = validSurah(surahNumber);
  if (!validId(moshafId) || v == null) return;
  let set = memory.get(moshafId);
  if (!set) {
    if (memory.size >= MAX_IDS) return;
    set = new Set();
    memory.set(moshafId, set);
  }
  if (set.size >= MAX_MISSING_PER_ID) return;
  if (!set.has(v)) {
    set.add(v);
    persist();
  }
}

/** Forget learned rows (moshaf re-added, server fixed). */
export function clearMoshafAvailability(moshafId) {
  loadOnce();
  if (memory.delete(moshafId)) persist();
}

/** Test seam: reset the in-memory matrix (persistence layer untouched). */
export function _resetAvailabilityForTests() {
  memory.clear();
  loaded = true;
}
