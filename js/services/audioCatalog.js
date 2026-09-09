/**
 * audioCatalog.js
 * The full-reciter catalog: 314 mushafs from mp3quran.net + quranicaudio.com
 * (both CORS-open, both serving per-surah files 001.mp3…114.mp3), loaded
 * lazily from data/reciters.json, plus user-added custom reciters (persisted
 * in settings) so *any* server following the same URL pattern can be added —
 * the generic answer to "I can't find my favorite reciter".
 *
 * Pure data + pure functions only; no DOM, no audio, no network beyond the
 * one lazy JSON fetch.
 */

import { RECITERS_URL } from '../core/config.js';
import { fetchWithTimeout, FETCH_TIMEOUT_MS } from '../core/fetch.js';
import { actions, store } from '../core/state.js';

let catalogCache = null; // { kind, reciters: [...] }
let catalogPromise = null; // in-flight (or resolved) load; never null-while-loading

export function pad3(n) {
  return String(n).padStart(3, '0');
}

/** Per-surah audio URL for a catalog entry's server. */
export function surahUrl(server, surahNumber) {
  const base = String(server || '')
    .trim()
    .replace(/\/+$/, '');
  return `${base}/${pad3(surahNumber)}.mp3`.replace(/([^:])\/\//g, '$1/');
}

/** Moshaf id for a custom (user-added) server. Deterministic + stable. */
export function customMoshafId(server) {
  const base = String(server || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();
  let h = 0;
  for (let i = 0; i < base.length; i += 1) {
    h = (h * 31 + base.charCodeAt(i)) | 0;
  }
  return `custom-${(h >>> 0).toString(36)}`;
}

/**
 * Fetch the bundled catalog once; afterwards served from cache. Never
 * throws — on failure returns an empty list so the UI can still show
 * custom reciters and retry.
 */
export async function loadCatalog() {
  if (!catalogPromise) {
    // (B2) cache the PROMISE, not the intention: concurrent callers share
    // the live fetch instead of the second getting null ("catalog empty").
    catalogPromise = (async () => {
      // Fast path: already resolved successfully.
      if (catalogCache) return catalogCache;
      try {
        // (F-004) through the shared timeout layer (keeps force-cache:
        // the catalog is immutable release data, not SWR content).
        const res = await fetchWithTimeout(RECITERS_URL, {
          cache: 'force-cache',
          timeoutMs: FETCH_TIMEOUT_MS,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doc = await res.json();
        catalogCache = Array.isArray(doc?.reciters) ? doc : { ...doc, reciters: [] };
        return catalogCache;
      } catch (err) {
        console.error('[audioCatalog] failed to load reciters.json', err);
        catalogPromise = null; // failed: next caller retries cleanly
        // v4.1: surface the failure so the Audio view can swap its permanent
        // skeleton for an error + Retry.
        store.dispatch(actions.setLoadError('reciters-catalog', true));
        return null;
      }
    })();
  }
  return catalogPromise;
}

/** Test-only: reset the catalog cache/promise between cases. */
export function resetCatalogForTests() {
  catalogCache = null;
  catalogPromise = null;
}

/** Strip Arabic diacritics + unify alef/ya so Arabic search matches. */
function normAr(s) {
  return String(s || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Search catalog + customs by name (EN/AR, diacritic-insensitive) or rewaya.
 * Empty query returns everything, alphabetical.
 */
export function searchReciters(query, customs = []) {
  const all = [
    ...(catalogCache?.reciters || []),
    ...customs.map((c) => ({ ...c, source: 'custom', rewaya: c.rewaya || '' })),
  ];
  const q = normAr(query);
  const hits = !q
    ? all
    : all.filter(
        (r) =>
          normAr(r.nameEn).includes(q) ||
          normAr(r.nameAr).includes(q) ||
          normAr(r.rewaya).includes(q)
      );
  return hits.sort((a, b) => (a.nameEn || '').localeCompare(b.nameEn || ''));
}

/** Find one moshaf entry by id across catalog + customs. */
export function findMoshaf(id, customs = []) {
  const all = [...(catalogCache?.reciters || []), ...customs];
  return all.find((r) => r.id === id) || null;
}

/**
 * Validate a user-supplied custom server:
 *  - must be http(s) and end with '/' (we append 001.mp3)
 *  - must contain no spaces
 * The caller may then HEAD {server}001.mp3 to confirm it really serves audio.
 */
export function validateCustomServer(raw) {
  const s = String(raw || '').trim();
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s)) return { ok: false, reason: 'invalid-url' };
  const base = s.endsWith('/') ? s : `${s}/`;
  return { ok: true, server: base };
}
