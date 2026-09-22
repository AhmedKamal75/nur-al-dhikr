import { rt } from './rt.js';
import { fetchJSON, isMissingResourceError, isTimeoutError } from './net.js';
import { dispatchSurahDoc, ensureTranslationBDoc, ensureTranslationCDoc } from './quranData.js';

import {
  MUSHAF_META_URL,
  MUSHAF_PAGE_COUNT,
  MUSHAF_PAGE_URL,
  QURAN_DICT_URL,
  QURAN_META_URL,
  QURAN_ROOTS_FULL_URL,
  QURAN_ROOTS_URL,
  QURAN_WORDS_URL,
  QURAN_WORD_STUDY_URL,
  ROOTS_MEANING_URL,
  TAFSIR_EDITIONS_URL,
  TAFSIR_REMOTE_URL,
  TAFSIR_TEXT_URL,
  TAJWEED_PRACTICE_POOL_URL,
} from '../core/config.js';
import { t } from '../core/i18n.js';
import { actions, store } from '../core/state.js';
import {
  clampPage,
  prevPage as mushafPrevPage,
  nextPage as mushafNextPage,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
} from '../services/mushaf.js';
import { openModal } from '../ui/modal.js';
import { sessionValue } from '../domain/sessionFlags.js';
import { showToast } from '../ui/toast.js';
import * as soundDesign from '../services/soundDesign.js';

/**
 * app/lazyData.js — every lazy data tier's fetch orchestration: Qur'an
 * meta/surahs, Mushaf pages, word study, roots, tafsir, tajweed pool.
 * Each ensure* is idempotent, guard-checked, and error-toasted.
 */

/* Qur'an: lazy data loading                                           */
/* ------------------------------------------------------------------ */
// The Qur'an is intentionally excluded from loadLibraries()/boot() — at
// ~2.4MB across 114 surah files it would slow every app launch for a
// feature most sessions never open. Instead it's fetched on demand, the
// first time the person actually navigates to the Qur'an view, and cached
// in state.quran for the rest of the session.

const quranSurahFetchesInFlight = new Set();
const mushafPageFetchesInFlight = new Set();
let quranMetaInFlight = null;

/**
 * (B9) the single owner of the quran-meta fetch. The reader pass, the
 * mushaf pass, and the ayah-study modal used to fetch the same URL
 * through three different guards (one of them none at all) — opening the
 * study modal mid-fetch fired a duplicate request plus a second dispatch,
 * and a failure left the modal on empty Arabic with no error surface.
 * Concurrent callers now share one promise: late joiners wait for the
 * in-flight fetch instead of duplicating it or rendering without it.
 */
function fetchQuranMetaShared({ announce = false } = {}) {
  if (store.getState().quran.meta) return Promise.resolve(true);
  if (!quranMetaInFlight) {
    rt.quranMetaFetchStarted = true;
    quranMetaInFlight = (async () => {
      try {
        const meta = await fetchJSON(QURAN_META_URL);
        store.dispatch(actions.setQuranMeta(meta));
        flagLoad('quran-meta', false);
        return true;
      } catch (err) {
        console.error('[quran] failed to load meta', err);
        rt.quranMetaFetchStarted = false; // allow a retry on the next navigation
        flagLoad('quran-meta', true);
        if (announce) showToast(t('quran.loadFailed', store.getState().settings.language));
        return false;
      } finally {
        quranMetaInFlight = null;
      }
    })();
  }
  return quranMetaInFlight;
}

/** Record a tier's fetch outcome in the store so views can swap their
 *  infinite skeleton for an error + Retry (the hadith reader's pattern,
 *  extended app-wide in v4.1). */
function flagLoad(key, failed) {
  store.dispatch(actions.setLoadError(key, failed));
}

/** Meta-only ensure for surfaces needing ayah counts (verse packs). */
export function ensureQuranMeta() {
  return fetchQuranMetaShared();
}

export async function ensureQuranData(state) {
  if (!state.quran.meta) {
    await fetchQuranMetaShared({ announce: true });
  }

  const id = state.activeParams.id;
  if (!id) return;

  // (v5.2.75, BUG-13) a failed/invalid id leaves a stale quran-surah flag
  // that briefly paints retry state on the next slow surah — a fresh
  // navigation to a VALID id clears it (a new failure re-sets it below).
  const num = Math.floor(Number(id));
  if (Number.isInteger(num) && num >= 1 && num <= 114) flagLoad('quran-surah', false);

  if (state.quranBookmark.surah !== id) {
    store.dispatch(actions.setQuranBookmark(id));
  }

  if (!state.quran.surahs[id] && !quranSurahFetchesInFlight.has(id)) {
    quranSurahFetchesInFlight.add(id);
    try {
      await dispatchSurahDoc(id);
      flagLoad('quran-surah', false);
    } catch (err) {
      console.error('[quran] failed to load surah', id, err);
      flagLoad('quran-surah', true);
      showToast(t('quran.loadFailed', store.getState().settings.language));
    } finally {
      quranSurahFetchesInFlight.delete(id);
    }
  }

  if (state.settings.mushafPrefs.wordByWordStudy) {
    ensureQuranWordsData(store.getState(), id);
  }

  // (v5.2.0) Translation-compare second edition rides the same pass —
  // fire-and-forget (the reader shows the primary edition first, the
  // compare line appears when the overlay lands and triggers its dispatch).
  // (v5.2.78, UP-06) third edition rides alongside.
  if (state.settings.quranTranslationB) {
    ensureTranslationBDoc(id);
  }
  if (state.settings.quranTranslationC) {
    ensureTranslationCDoc(id);
  }
}

export async function ensureMushafData(state) {
  // The ayah-detail audio button needs quran-meta.json's per-surah ayah
  // counts to compute the global ayah number the recitation CDN keys audio
  // by. Only the classic reader normally triggers that fetch (via
  // ensureQuranData), so make sure it happens here too — otherwise opening
  // the Mushaf reader before ever visiting the classic reader would leave
  // the Listen button unable to resolve a URL.
  if (!state.quran.meta) {
    await fetchQuranMetaShared();
  }

  // (v4.4) the translation tray (mushafPrefs.translationPanel) reads the
  // classic reader's per-surah docs. Called from stateSub whenever the
  // Mushaf renders with the tray on; kept inside ensureMushafData's flow
  // so the meta fetch above has already resolved by the time it runs.
  if (state.settings.mushafPrefs?.translationPanel) {
    await ensureMushafSurahDocs(state);
  }

  if (!state.mushaf.meta && !rt.mushafMetaFetchStarted) {
    rt.mushafMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(MUSHAF_META_URL);
      store.dispatch(actions.setMushafMeta(meta));
      flagLoad('mushaf-meta', false);
    } catch (err) {
      console.error('[mushaf] failed to load page index', err);
      rt.mushafMetaFetchStarted = false; // allow a retry on the next navigation
      flagLoad('mushaf-meta', true);
    }
  }

  // (v4.5) a spread reads from its right-hand (odd) page: normalize the
  // requested page to it, then load BOTH facing pages. The khatma marks
  // cover the whole spread — a displayed page is a read page, and the
  // person reading two-at-a-time shouldn't have to tap each sheet.
  const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const rightPage = spreadOn ? spreadRightPage(page) : page;
  const leftPage = spreadOn ? spreadLeftPage(rightPage) : null;
  const key = String(rightPage);

  if (state.mushafBookmark.page !== rightPage) {
    store.dispatch(actions.setMushafBookmark(rightPage));
  }

  // Khatma progress: opening a page counts as having read it. Idempotent
  // (the reducer no-ops when already marked), so it's safe on every render.
  const pagesOnThisSpread = leftPage != null ? [rightPage, leftPage] : [rightPage];
  for (const readPage of pagesOnThisSpread) {
    const readKey = String(readPage);
    if (!state.mushafPagesRead[readKey]) {
      store.dispatch(actions.markMushafPageVisited(readKey));
      // The reducer just recorded a khatma completion if this was the final
      // page — celebrate once, here, where side effects belong.
      if (Object.keys(store.getState().mushafPagesRead).length >= MUSHAF_PAGE_COUNT) {
        showToast(t('khatma.completeToast', store.getState().settings.language), {
          duration: 6000,
        });
        // v3.14 Phase C: optional (off-by-default) completion chime — see
        // js/soundDesign.js. Fires in the same once-only window as the toast.
        soundDesign.playKhatmaChime(store.getState().settings.khatmaChimeSound);
      }
    }
  }

  for (const loadPage of pagesOnThisSpread) {
    const loadKey = String(loadPage);
    if (!state.mushaf.pages[loadKey] && !mushafPageFetchesInFlight.has(loadKey)) {
      mushafPageFetchesInFlight.add(loadKey);
      try {
        const doc = await fetchJSON(MUSHAF_PAGE_URL(loadKey));
        store.dispatch(actions.setMushafPage(loadKey, doc));
        flagLoad('mushaf-page', false);
      } catch (err) {
        console.error('[mushaf] failed to load page', loadKey, err);
        flagLoad('mushaf-page', true);
      } finally {
        mushafPageFetchesInFlight.delete(loadKey);
      }
    }
  }

  // Prefetch the adjacent spread(s) too, so tapping next/prev (or
  // swiping) feels instant most of the time instead of showing the
  // loading state on every single page turn — the whole point of a
  // "flip through it" reader. In a spread the neighbors are two pages
  // away (both sheets of the next pair).
  const adjacentAnchors = spreadOn
    ? [nextSpreadPage(rightPage), prevSpreadPage(rightPage)]
    : [mushafNextPage(page), mushafPrevPage(page)];
  for (const adj of adjacentAnchors) {
    if (adj == null) continue;
    for (const adjPage of spreadOn ? [adj, adj + 1] : [adj]) {
      const adjKey = String(adjPage);
      if (
        adjKey !== key &&
        adjPage >= 1 &&
        adjPage <= MUSHAF_PAGE_COUNT &&
        !state.mushaf.pages[adjKey] &&
        !mushafPageFetchesInFlight.has(adjKey)
      ) {
        mushafPageFetchesInFlight.add(adjKey);
        fetchJSON(MUSHAF_PAGE_URL(adjKey))
          .then((doc) => store.dispatch(actions.setMushafPage(adjKey, doc)))
          .catch(() => {
            /* best-effort prefetch; a real navigation there will retry */
          })
          .finally(() => mushafPageFetchesInFlight.delete(adjKey));
      }
    }
  }

  // Word-by-word study data for every surah touched by this page, so the
  // words render as tappable spans immediately rather than only after a
  // separate fetch triggered by the first tap.
  if (state.settings.mushafPrefs.wordByWordStudy) {
    const freshDoc = store.getState().mushaf.pages[key];
    if (freshDoc) {
      for (const chapter of freshDoc.chapters) {
        ensureQuranWordsData(store.getState(), chapter.number);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Word study + tafsir: lazy data loading                              */
/* ------------------------------------------------------------------ */

const quranWordsFetchesInFlight = new Set();
const tafsirTextFetchesInFlight = new Set();
let wordDictInFlight = null;

/**
 * (v5.2.77, BUG-05) drop every in-flight lazy-fetch marker so a late
 * resolve after RESET_ALL / RESTORE_STATE cannot repopulate wiped
 * ephemeral data. Called from stateSub.resetStaleFetchGuards().
 * Promise-shared singletons (quranMeta, wordDict) resolve idempotently
 * through their own guards; clearing the Sets is sufficient to stop
 * stale per-surah/page/text writes because dispatchSurahDoc paths
 * re-check state before writing (and stateSub resets guards).
 */
export function clearLazyInFlightFetches() {
  quranSurahFetchesInFlight.clear();
  mushafPageFetchesInFlight.clear();
  quranWordsFetchesInFlight.clear();
  tafsirTextFetchesInFlight.clear();
}

/**
 * (v5.2.75, UP-01) lemma dictionary: fetched once (first word-study open
 * of the session), cached in the ephemeral wordDict slice. Concurrent
 * callers share one promise; failure flags the tier (the popup simply
 * omits the Meanings section) and retries on the next open.
 */
export function ensureWordDict() {
  const snap = store.getState().wordDict;
  if (snap?.index) return Promise.resolve(true);
  if (wordDictInFlight) return wordDictInFlight;
  wordDictInFlight = (async () => {
    try {
      const raw = await fetchJSON(QURAN_DICT_URL);
      const entries = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.entries : null;
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        throw new Error('malformed dict file');
      }
      store.dispatch(actions.setWordDict(entries));
      flagLoad('word-dict', false);
      return true;
    } catch (err) {
      // (v5.2.87, P1-1) missing-tier contract (see net.js): 404 warns.
      if (isMissingResourceError(err)) console.warn('[wordStudy] dict not bundled', err);
      else console.error('[wordStudy] failed to load dict', err);
      store.dispatch(actions.setWordDict(null));
      flagLoad('word-dict', true);
      return false;
    } finally {
      wordDictInFlight = null;
    }
  })();
  return wordDictInFlight;
}

let rootsMeaningInFlight = null;

/**
 * (v5.6.0) root core-meanings: fetched once (first word-study open of
 * the session), cached in the ephemeral rootsMeaning slice. Same
 * singleton-promise shape as ensureWordDict; failure flags the tier
 * (the root block simply omits the meaning line) and retries on the
 * next open.
 */
export function ensureRootsMeaning() {
  const snap = store.getState().rootsMeaning;
  if (snap?.index) return Promise.resolve(true);
  if (rootsMeaningInFlight) return rootsMeaningInFlight;
  rootsMeaningInFlight = (async () => {
    try {
      const raw = await fetchJSON(ROOTS_MEANING_URL);
      const entries = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.entries : null;
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        throw new Error('malformed roots-meaning file');
      }
      store.dispatch(actions.setRootsMeaning(entries));
      flagLoad('roots-meaning', false);
      return true;
    } catch (err) {
      if (isMissingResourceError(err)) console.warn('[wordStudy] roots-meaning not bundled', err);
      else console.error('[wordStudy] failed to load roots-meaning', err);
      store.dispatch(actions.setRootsMeaning(null));
      flagLoad('roots-meaning', true);
      return false;
    } finally {
      rootsMeaningInFlight = null;
    }
  })();
  return rootsMeaningInFlight;
}

/**
 * (v4.4) Translation-tray data: the per-surah docs of every chapter on
 * the CURRENT mushaf page. Idempotent + in-flight-guarded like every
 * other ensure here; failures are logged only — the tray renders its
 * skeleton row and a retry happens on the next render/navigation.
 */
export async function ensureMushafSurahDocs(state) {
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  // (v4.5) the tray lists every ayah of the SPREAD — both facing pages.
  const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
  const right = spreadOn ? spreadRightPage(page) : page;
  const left = spreadOn ? spreadLeftPage(right) : null;
  const docs = [
    state.mushaf.pages[String(right)],
    left != null ? state.mushaf.pages[String(left)] : null,
  ].filter(Boolean);
  if (!docs.length || !docs.some((d) => d.chapters?.length)) return;
  for (const pageDoc of docs) {
    for (const chapter of pageDoc.chapters) {
      const id = String(chapter.number);
      if (state.quran.surahs[id] || quranSurahFetchesInFlight.has(id)) continue;
      quranSurahFetchesInFlight.add(id);
      try {
        await dispatchSurahDoc(id);
      } catch (err) {
        console.error('[mushaf-tray] failed to load surah', id, err);
      } finally {
        quranSurahFetchesInFlight.delete(id);
      }
    }
  }
  // (v5.2.74, UP-08) the tray's compare lines need the second edition's
  // overlay for every chapter on the page — no-op when compare is off.
  // (v5.2.78, UP-06) third edition rides alongside.
  for (const pageDoc of docs) {
    for (const chapter of pageDoc.chapters) {
      ensureTranslationBDoc(chapter.number);
      ensureTranslationCDoc(chapter.number);
    }
  }
}

export async function ensureQuranWordsData(state, surahNumber) {
  const id = String(surahNumber);
  if (state.quranWords[id] || quranWordsFetchesInFlight.has(id)) return;
  quranWordsFetchesInFlight.add(id);
  try {
    const [words, study] = await Promise.all([
      fetchJSON(QURAN_WORDS_URL(id)),
      fetchJSON(QURAN_WORD_STUDY_URL(id)),
    ]);
    // Keep the base morphology/gloss corpus byte-for-byte lean on disk;
    // materialize the token-level contextual/i'rab tier in memory only.
    // Every canonical word is expected to have a matching study row.
    const materialized = {};
    for (const [ayah, rows] of Object.entries(words || {})) {
      const studyRows = Array.isArray(study?.[ayah]) ? study[ayah] : [];
      const byIndex = new Map(studyRows.map((row) => [Number(row?.i), row]));
      materialized[ayah] = (rows || []).map((word) => {
        const row = byIndex.get(Number(word?.i));
        if (!row) return { ...word };
        return {
          ...word,
          study: {
            contextualMeaning: {
              ar: typeof row.mA === 'string' ? row.mA : '',
              source: typeof row.mSrc === 'string' ? row.mSrc : '',
            },
            irab: {
              ar: typeof row.iA === 'string' ? row.iA : '',
              en: typeof row.iE === 'string' ? row.iE : '',
              source: typeof row.iSrc === 'string' ? row.iSrc : '',
            },
            coverage: 'quran-token',
          },
        };
      });
    }
    store.dispatch(actions.setQuranWords(id, materialized));
    flagLoad('quran-words', false);
  } catch (err) {
    // (v5.2.87, P1-1) same missing-tier contract as the hadith index above.
    if (isMissingResourceError(err)) console.warn('[wordStudy] word data not bundled', id, err);
    else console.error('[wordStudy] failed to load word data', id, err);
    flagLoad('quran-words', true);
  } finally {
    quranWordsFetchesInFlight.delete(id);
  }
}

export async function ensureQuranRoots(state) {
  if (state.quranRoots || rt.quranRootsFetchStarted) return;
  // (v5.2.87) same retry-cooldown contract as the uncapped index below:
  // the subscriber re-runs this per notify, and a struggling fetch must
  // not multiply timeouts and error spam once per dispatch.
  if (Date.now() < rt.quranRootsCooldownUntil) return;
  rt.quranRootsFetchStarted = true;
  try {
    const roots = await fetchJSON(QURAN_ROOTS_URL);
    store.dispatch(actions.setQuranRoots(roots));
    flagLoad('quran-roots', false);
  } catch (err) {
    if (isMissingResourceError(err)) console.warn('[wordStudy] root index not bundled', err);
    else if (isTimeoutError(err)) console.warn('[wordStudy] root index timed out', err);
    else console.error('[wordStudy] failed to load root index', err);
    rt.quranRootsFetchStarted = false;
    rt.quranRootsCooldownUntil = Date.now() + 30_000;
    flagLoad('quran-roots', true);
  }
}

// The root-family browser's uncapped index (~2.3 MB): fetched once the
// first time the roots view opens, then served offline by the SW's
// stale-while-revalidate /data strategy. (v5.2.77, BUG-02) failure now
// flags the tier so the view renders error + Retry instead of a forever
// degraded capped index with no recovery path.
export async function ensureQuranRootsFull(state) {
  if (state.quranRootsFull || rt.quranRootsFullFetchStarted) return;
  // (v5.2.87) failed attempts cool down: the subscriber re-runs this on
  // every notify, and hammering a struggling fetch once per dispatch only
  // multiplies timeouts and error spam. Retry button + cooldown expiry
  // re-arm honestly.
  if (Date.now() < rt.quranRootsFullCooldownUntil) return;
  rt.quranRootsFullFetchStarted = true;
  try {
    const roots = await fetchJSON(QURAN_ROOTS_FULL_URL);
    store.dispatch(actions.setQuranRootsFull(roots));
    flagLoad('quran-roots-full', false);
  } catch (err) {
    // (v5.2.87) the uncapped index is a progressive enhancement over the
    // capped one that already renders: a missing file warns (P1-1) and a
    // timeout warns too — under load a slow 2.3MB fetch is not a defect
    // signal, and this catch re-fires per dispatch (see the cooldown
    // above). Malformed/5xx/offline still error.
    if (isMissingResourceError(err)) console.warn('[roots] full root index not bundled', err);
    else if (isTimeoutError(err)) console.warn('[roots] full root index timed out', err);
    else console.error('[roots] failed to load full root index', err);
    rt.quranRootsFullFetchStarted = false;
    rt.quranRootsFullCooldownUntil = Date.now() + 30_000;
    flagLoad('quran-roots-full', true);
  }
}

export async function ensureTafsirEditions(state) {
  if (state.tafsirEditions || rt.tafsirEditionsFetchStarted) return;
  if (Date.now() < rt.tafsirEditionsCooldownUntil) return;
  rt.tafsirEditionsFetchStarted = true;
  try {
    const editions = await fetchJSON(TAFSIR_EDITIONS_URL);
    store.dispatch(actions.setTafsirEditions(editions));
    flagLoad('tafsir-editions', false);
  } catch (err) {
    if (isMissingResourceError(err)) console.warn('[tafsir] editions catalog not bundled', err);
    else if (isTimeoutError(err)) console.warn('[tafsir] editions catalog timed out', err);
    else console.error('[tafsir] failed to load editions catalog', err);
    rt.tafsirEditionsFetchStarted = false;
    rt.tafsirEditionsCooldownUntil = Date.now() + 30_000;
    flagLoad('tafsir-editions', true);
  }
}

export async function ensureTajweedPool(state) {
  if (state.tajweedPool || rt.tajweedPoolFetchStarted) return;
  if (Date.now() < rt.tajweedPoolCooldownUntil) return;
  rt.tajweedPoolFetchStarted = true;
  try {
    const pool = await fetchJSON(TAJWEED_PRACTICE_POOL_URL);
    store.dispatch(actions.setTajweedPool(pool));
    flagLoad('tajweed-pool', false);
  } catch (err) {
    if (isMissingResourceError(err)) console.warn('[tajweed] practice pool not bundled', err);
    else if (isTimeoutError(err)) console.warn('[tajweed] practice pool timed out', err);
    else console.error('[tajweed] failed to load practice pool', err);
    rt.tajweedPoolFetchStarted = false;
    rt.tajweedPoolCooldownUntil = Date.now() + 30_000;
    flagLoad('tajweed-pool', true);
  }
}

/** Bundled editions fetch from the app's own data/ folder; on-demand
 *  ("remote") editions only ever fetch when `allowRemote` is explicitly
 *  passed (the person tapped "Download") — never silently over the network. */
export async function ensureTafsirText(state, editionId, surahNumber, allowRemote = false) {
  const id = String(surahNumber);
  const key = `${editionId}:${id}`;
  if (state.tafsir?.[editionId]?.[id] || tafsirTextFetchesInFlight.has(key)) return true;
  const edition = (state.tafsirEditions?.editions || []).find((e) => e.id === editionId);
  if (!edition) return false;
  if (!edition.bundled && !allowRemote) return false;
  tafsirTextFetchesInFlight.add(key);
  try {
    const url = edition.bundled
      ? TAFSIR_TEXT_URL(editionId, id)
      : TAFSIR_REMOTE_URL(edition.slug, id);
    const raw = await fetchJSON(url);
    // The remote spa5k/tafsir_api shape is an array of {text, ayah, surah};
    // the bundled shape is already {ayah: text}. Normalize once here.
    const text = Array.isArray(raw)
      ? Object.fromEntries(
          raw.filter((r) => r.ayah != null && r.text).map((r) => [String(r.ayah), r.text.trim()])
        )
      : raw;
    store.dispatch(actions.setTafsirText(editionId, id, text));
    flagLoad('tafsir-text', false);
    return true;
  } catch (err) {
    if (isMissingResourceError(err)) console.warn('[tafsir] text not bundled', key, err);
    else console.error('[tafsir] failed to load text', key, err);
    flagLoad('tafsir-text', true);
    return false;
  } finally {
    tafsirTextFetchesInFlight.delete(key);
  }
}

/** Open the shared ayah-detail + tafsir modal from anywhere (Mushaf tap,
 *  classic reader's Tafsir button, or the word-study popover's "open
 *  tafsir" shortcut). `page` is the Mushaf page to record on a new
 *  bookmark, or null when opened from a context with no page concept. */
/** Best-effort page lookup for contexts where we don't already know the
 *  page (root-jump, tafsir tab switches, the classic reader's Tafsir
 *  button): search pages already in memory first, then fall back to the
 *  Mushaf index's "first page of this surah" if it's loaded, else null
 *  (in which case the ayah-detail modal simply omits the bookmark button). */
export function currentAyahDetailPage(surah, ayah) {
  const state = store.getState();
  for (const [pageNum, doc] of Object.entries(state.mushaf.pages)) {
    const chapter = doc.chapters.find((c) => String(c.number) === String(surah));
    if (chapter?.verses.some((v) => String(v.number) === String(ayah))) return Number(pageNum);
  }
  return state.mushaf.meta?.surahFirstPage?.[String(surah)] || null;
}

export async function openAyahStudy(surah, ayah, page = null, { focusSelector = null } = {}) {
  // (B9) join the shared meta fetch: never a duplicate request, never a
  // modal on empty Arabic without the load-failed toast behind it.
  await fetchQuranMetaShared({ announce: true });
  let state = store.getState();
  if (!state.quran.surahs[String(surah)]) {
    try {
      await dispatchSurahDoc(surah);
    } catch {
      /* best effort */
    }
  }
  await ensureTafsirEditions(store.getState());
  state = store.getState();
  // (GROWTH-01 delight 3) quiet study acknowledgement: when this ayah had
  // a panel picked earlier this session, reopen it silently instead of the
  // global default. No new setting, no persistence — just continuity.
  const remembered = sessionValue(`study-tab:${surah}:${ayah}`);
  const defaultId =
    (typeof remembered === 'string' && remembered) ||
    state.mushafSession?.tafsirTab ||
    state.settings.mushafPrefs.defaultTafsir;
  store.dispatch(actions.setMushafSession({ tafsirTab: defaultId }));
  if (defaultId) await ensureTafsirText(store.getState(), defaultId, surah);
  // (v5.2.74, UP-08) the study modal's compare line needs the second
  // edition's overlay — fire-and-forget (the modal shows the primary
  // edition first, the compare line appears when the overlay lands).
  // (v5.2.78, UP-06) third edition + third tafsir ride alongside.
  if (store.getState().settings.quranTranslationB) {
    ensureTranslationBDoc(surah);
  }
  if (store.getState().settings.quranTranslationC) {
    ensureTranslationCDoc(surah);
  }
  // The compare column's bundled second source loads alongside the primary
  // tab — otherwise the picker would show a skeleton with no fetch behind
  // it. Remote editions stay on-demand via the primary tab's download flow.
  state = store.getState();
  const compareB = state.settings.tafsirCompareB;
  if (compareB && compareB !== defaultId) {
    try {
      await ensureTafsirText(store.getState(), compareB, surah);
    } catch {
      /* best effort — the panel degrades to picker-only */
    }
  }
  const compareC = store.getState().settings.tafsirCompareC;
  if (compareC && compareC !== defaultId && compareC !== compareB) {
    try {
      await ensureTafsirText(store.getState(), compareC, surah);
    } catch {
      /* best effort — the panel degrades to picker-only */
    }
  }
  state = store.getState();
  const surahDoc = state.quran.surahs[String(surah)];
  const arabicText = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayah))?.text || '';
  // (v5.2.18) the study panel loads on demand (static import pulled the
  // whole book view into the boot parse).
  const { buildMushafAyahDetail } = await import('../views/mushafReader.js');
  openModal(buildMushafAyahDetail(arabicText, surahDoc, surah, ayah, state, page), {
    labelledBy: 'modal-title-mushaf-ayah',
    focusSelector,
  });
}
