/**
 * app/hadithData.js — the Ahadeeth library data layer: index warm-up,
 * per-book lazy loading with retry state, deep links, daily pick.
 */

import { rt } from './rt.js';
import { fetchJSON, fetchDataResponse, isMissingResourceError } from './net.js';

import { HADITH_BOOK_URL, HADITH_INDEX_URL, VIEWS } from '../core/config.js';
import { actions, store } from '../core/state.js';
import { dateKey, scrollBehavior } from '../core/utils.js';
import {
  pageForNumber,
  pickDailyHadith,
  validateHadithDoc,
  validateHadithIndex,
} from '../services/hadith.js';
import { buildHadithIndex } from '../domain/hadithSearch.js';

/* Ahadeeth library (v3.9)                                             */
/* ------------------------------------------------------------------ */
// Lazy-loading mirrors the Qur'an corpus pattern: the index (book registry)
// and the small bundled books are SW-precached; each big Sahih is fetched
// the first time its book is opened and cached offline forever after.
// Fetched JSON is untrusted: validateHadith*() degrades malformed documents
// to a load failure (with an in-app retry) instead of crashing a render.

const hadithBookFetches = new Map();

/**
 * (v5.2.73, BUG-02) drop cached book promises. After RESET_ALL /
 * RESTORE_STATE the hadith docs are gone but this map still holds the old
 * resolved promises — ensureHadithBook would return `true` without ever
 * re-dispatching the document (eternal skeleton). Called from stateSub's
 * guard-reset block whenever the docs are gone.
 */
export function resetHadithBookFetches() {
  hadithBookFetches.clear();
}

/**
 * Parse a large hadith book OFF the main thread. Bukhari is ~13MB of JSON
 * and JSON.parse blocks for 100–300ms+ on mid-range Android — right at the
 * moment of navigation to the book. A blob-URL worker keeps the app
 * responsive; if workers are unavailable (or the worker itself fails),
 * fall back to the main-thread parse so the feature never regresses.
 */
let jsonParseWorker = null;
let jsonParseReqId = 0;
// (v4.3) pending parse requests keyed by request id, routed by ONE
// persistent listener through routeWorkerReply() — extracted so the v4.1
// cross-resolution bug class (parallel book parses resolving each other's
// documents) has a direct unit test.
const pendingParses = new Map();

/** Route one worker reply to its pending request (pure over the map).
 *  @returns {boolean} true when the reply matched a pending request. */
export function routeWorkerReply(pending, msg) {
  if (!pending || !msg || typeof msg !== 'object') return false;
  const entry = pending.get(msg.id);
  if (!entry) return false;
  pending.delete(msg.id);
  if (msg.ok) entry.resolve(msg.value);
  else entry.reject(new Error(msg.message || 'worker parse failed'));
  return true;
}

async function parseLargeJSON(response) {
  const text = await response.text();
  if (typeof Worker === 'undefined') return JSON.parse(text);
  try {
    if (!jsonParseWorker) {
      // Requests carry an id: several books can parse concurrently on the
      // SAME worker, and each reply must be correlated to its request — a
      // naive shared listener resolved every caller with the FIRST book's
      // document (caught by the v4.1 browser smoke test).
      const src = `self.onmessage = (e) => {
        try {
          self.postMessage({ id: e.data.id, ok: true, value: JSON.parse(e.data.text) });
        } catch (err) {
          self.postMessage({ id: e.data.id, ok: false, message: String(err && err.message) });
        }
      };`;
      // The blob URL can be revoked the moment the worker exists: the
      // worker keeps its own reference (v4.2 — the URL previously leaked).
      const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      try {
        jsonParseWorker = new Worker(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
      jsonParseWorker.addEventListener('message', (ev) => {
        routeWorkerReply(pendingParses, ev.data);
      });
      jsonParseWorker.addEventListener('error', () => {
        // Worker-level failure: reject EVERYTHING still pending (the
        // per-request path can no longer succeed) and reset so a later
        // parse re-creates the worker instead of posting into a void.
        for (const entry of pendingParses.values()) {
          entry.reject(new Error('worker error'));
        }
        pendingParses.clear();
        jsonParseWorker = null;
      });
    }
    const worker = jsonParseWorker;
    return await new Promise((resolve, reject) => {
      const id = ++jsonParseReqId;
      pendingParses.set(id, { resolve, reject });
      worker.postMessage({ id, text });
    });
  } catch (err) {
    console.warn('[hadith] worker parse unavailable — using main thread', err);
    return JSON.parse(text);
  }
}

/** fetchJSON for LARGE payloads: same contract, but parses via the worker. */
async function fetchLargeJSON(url) {
  const res = await fetchDataResponse(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return parseLargeJSON(res);
}

export async function ensureHadithIndex(force = false) {
  // (v4.2) remove leftover instrumentation from the v4.1 worker fix: the
  // 'dbg' key grew unboundedly in the same ~5MB localStorage quota the
  // state persistence needs, and eventually broke saveState outright.
  try {
    localStorage.removeItem('dbg');
  } catch {}
  if (store.getState().hadith.index) return true;
  if (rt.hadithIndexStarted && !force) return false;
  rt.hadithIndexStarted = true;
  try {
    const raw = await fetchJSON(HADITH_INDEX_URL);
    const index = validateHadithIndex(raw);
    if (!index) throw new Error('malformed hadith index');
    store.dispatch(actions.setHadithIndex(index));
    return true;
  } catch (err) {
    // (v5.2.87, P1-1) missing-tier 404 warns (seed bundle / pruned
    // install renders error+Retry, nothing is broken); real failures error.
    if (isMissingResourceError(err)) console.warn('[hadith] index not bundled', err);
    else console.error('[hadith] index load failed', err);
    store.dispatch(actions.hadithIndexFailed());
    rt.hadithIndexStarted = false; // the Retry button calls again with force
    return false;
  }
}

export async function ensureHadithBook(id, force = false) {
  const bookId = String(id || '');
  if (!/^[a-z0-9-]{1,40}$/.test(bookId)) return false; // id is also a path segment
  if (store.getState().hadith.docs[bookId]) return true;
  if (hadithBookFetches.has(bookId) && !force) return hadithBookFetches.get(bookId);
  const p = (async () => {
    try {
      const raw = await fetchLargeJSON(HADITH_BOOK_URL(bookId));
      const doc = validateHadithDoc(raw);
      if (!doc || doc.id !== bookId) throw new Error('malformed book document');
      store.dispatch(actions.setHadithBook(bookId, doc));
      return true;
    } catch (err) {
      // (v5.2.87, P1-1) missing-tier contract: 404 warns, real failure errors.
      if (isMissingResourceError(err)) console.warn('[hadith] book not bundled', bookId, err);
      else console.error('[hadith] book load failed', bookId, err);
      store.dispatch(actions.hadithBookFailed(bookId));
      hadithBookFetches.delete(bookId); // allow a retry
      return false;
    }
  })();
  hadithBookFetches.set(bookId, p);
  return p;
}

/** Per-view loader: runs on every render of the Ahadeeth screens. */
export function ensureHadithData(state) {
  ensureHadithIndex();
  const bookId = String(state.activeParams?.id || '');
  if (!bookId) {
    rt.hadithBookViewLastId = null;
    rt.hadithDeepRef = null;
    return;
  }
  // Reset the reader's search/chapter/pager state when switching books —
  // a stale query from Bukhari must never pre-filter Muslim.
  if (rt.hadithBookViewLastId !== bookId) {
    rt.hadithBookViewLastId = bookId;
    rt.hadithDeepRef = null;
    store.dispatch(actions.setHadithView({ query: '', section: 'all', page: 1, consumedN: null }));
  }
  const doc = state.hadith.docs[bookId];
  // (v4.1) THE missing trigger: nothing ever fetched a non-bundled book on
  // navigation — the tile click / deep link just navigated, and this loader
  // only warmed the small bundled books, so all six big Sahihs showed an
  // eternal skeleton (a v3.27-vintage defect both hostile reviews missed;
  // found by the v4.1 browser smoke test). ensureHadithBook is idempotent
  // and in-flight-deduplicated, so calling it on every render is safe.
  if (!doc) ensureHadithBook(bookId);
  const deepN = state.activeParams?.n;
  // Deep link ?n=<number>: resolve its page once per (book, number) pair.
  // The book document may still be in flight on the first render — the
  // key guard keeps retrying on subsequent renders like the ayah scroller.
  if (doc && deepN != null && rt.hadithDeepRef !== `${bookId}:${deepN}`) {
    rt.hadithDeepRef = `${bookId}:${deepN}`;
    const page = pageForNumber(
      doc,
      Number(deepN),
      state.hadith.bookView.section,
      state.hadith.bookView.query
    );
    store.dispatch(actions.setHadithView({ page: page ?? 1, consumedN: String(deepN) }));
  }
}

/** Deterministic daily hadith for the Home card: index + bundled books
 *  (both SW-precached, so this never forces a big-Sahih download), then one
 *  HADITH_DAILY_SET dispatch. Same (date, data) → same hadith, forever. */
export async function warmHadithDaily() {
  if (rt.hadithDailyStarted) return;
  rt.hadithDailyStarted = true;
  try {
    const gotIndex = await ensureHadithIndex();
    if (!gotIndex) return;
    const bundled = (store.getState().hadith.index?.books || []).filter((b) => b.bundled);
    await Promise.all(bundled.map((b) => ensureHadithBook(b.id)));
    const st = store.getState();
    const daily = pickDailyHadith(
      st.hadith.index?.books || [],
      st.hadith.docs,
      dateKey(new Date())
    );
    if (daily) store.dispatch(actions.setHadithDaily({ bookId: daily.bookId, n: daily.hadith.n }));
  } catch (err) {
    console.error('[hadith] daily warm failed', err);
    rt.hadithDailyStarted = false; // next boot/session retries
  }
}

/** Deep-link scroll for '#/hadith/<book>?n=<n>' — the hadith card may still
 *  be loading when the view first renders, so attempts repeat across
 *  renders until success or navigation away (same contract as the ayah one). */

export function maybeScrollToFocusHadith(state) {
  if (state.activeView !== VIEWS.HADITH || state.activeParams?.n == null) {
    rt.pendingHadithScroll = null;
    return;
  }
  const want = String(state.activeParams.n);
  const key = `${state.activeParams?.id}:${want}`;
  if (rt.pendingHadithScroll === null || rt.pendingHadithScroll.queryKey !== key) {
    rt.pendingHadithScroll = { n: want, queryKey: key };
    rt.hadithScrollAttempts = 0;
  }
  requestAnimationFrame(() => {
    if (!rt.pendingHadithScroll) return;
    const el = document.getElementById(`hadith-${CSS.escape(rt.pendingHadithScroll.n)}`);
    if (el) {
      rt.pendingHadithScroll = null;
      el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      // (v5.2.75, UX-02) announce the landing like the ayah path above.
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* focus is best-effort; never let it break rendering */
      }
    } else if (++rt.hadithScrollAttempts > 20) {
      rt.pendingHadithScroll = null;
    }
  });
}

/** Page flips land the list's top in view — otherwise the pager buttons
 *  scroll away underneath the reader's thumb/finger. */
export function scrollToHadithListTop() {
  requestAnimationFrame(() => {
    document
      .querySelector('.hadith-list')
      ?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  });
}

/* Cross-book search index (v5.2.57)                                    */
/* ------------------------------------------------------------------ */
// The per-book reader filters its open book; the grid search ranks across
// every LOADED book (quranSearch honesty rules, hadith fold pipeline).
// Missing books load here in pairs (Sahihs are MBs — fail soft per book,
// SW-cached after first use) and the index rebuilds whenever the loaded
// doc set changes, so results track the library without a version bump.

/** Fingerprint of the indexable doc set (loaded books with rows). */
function searchDocsKey() {
  const docs = store.getState().hadith.docs || {};
  return Object.keys(docs)
    .filter((id) => docs[id] && Array.isArray(docs[id].hadiths) && docs[id].hadiths.length)
    .sort()
    .join(',');
}

export async function ensureHadithSearchIndex({ prefetchMissing = false } = {}) {
  if (rt.hadithSearchFlight) return rt.hadithSearchFlight;
  rt.hadithSearchFlight = (async () => {
    try {
      const books = store.getState().hadith.index?.books || [];
      if (!books.length) {
        await ensureHadithIndex();
        return false;
      }
      const docs = store.getState().hadith.docs || {};
      const missing = books.map((b) => b.id).filter((id) => !docs[id]);
      if (missing.length > 0 && !prefetchMissing && !store.getState().hadith.indexAllConfirmed) {
        // (v5.2.75, BUG-09) no consent to bulk-fetch: rank loaded books
        // only (the grid says exactly that), keeping the index fresh as
        // books load through their own explicit taps.
        const key = searchDocsKey();
        if (key && key !== rt.lastHadithSearchDocs) {
          rt.lastHadithSearchDocs = key;
          buildHadithIndex(store.getState().hadith.docs);
        }
        return 'partial';
      }
      for (let i = 0; i < missing.length; i += 2) {
        await Promise.all(missing.slice(i, i + 2).map((id) => ensureHadithBook(id)));
      }
      const key = searchDocsKey();
      if (key && key !== rt.lastHadithSearchDocs) {
        rt.lastHadithSearchDocs = key;
        buildHadithIndex(store.getState().hadith.docs);
      }
      return true;
    } catch (err) {
      console.error('[hadith-search] index build failed', err);
      return false;
    }
  })();
  try {
    return await rt.hadithSearchFlight;
  } finally {
    rt.hadithSearchFlight = null;
  }
}

/** Grid search typed: start (or resume) the cross-book build. Runs on
 *  every grid render while a query stands — guarded inside, so the
 *  steady state is one fingerprint compare per render. Without explicit
 *  consent this ranks loaded books only (BUG-09: never bulk-fetches). */
export function maybeStartHadithSearchBuild(state) {
  if (
    state.activeView === VIEWS.HADITH &&
    !state.activeParams?.id &&
    (state.activeParams?.q || '').trim()
  ) {
    ensureHadithSearchIndex();
  }
}

/**
 * (v5.2.75, BUG-09) explicit consent for bulk-fetching every missing
 * book (Sahihs run ~13MB each): the grid's "index all" button records it
 * in the ephemeral hadith slice (never persisted — RESET_ALL and restores
 * re-arm the question), then the full build proceeds. Until then a query
 * ranks loaded books only and the grid says exactly that.
 */
export function isHadithIndexAllConfirmed() {
  return store.getState().hadith.indexAllConfirmed === true;
}

export async function confirmHadithIndexAll() {
  store.dispatch(actions.confirmHadithIndexAll());
  return ensureHadithSearchIndex({ prefetchMissing: true });
}
