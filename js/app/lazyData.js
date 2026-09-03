import { rt } from './rt.js';
import { fetchJSON } from './net.js';
import { dispatchSurahDoc } from './quranData.js';

import {
  MUSHAF_META_URL,
  MUSHAF_PAGE_COUNT,
  MUSHAF_PAGE_URL,
  QURAN_META_URL,
  QURAN_ROOTS_FULL_URL,
  QURAN_ROOTS_URL,
  QURAN_WORDS_URL,
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
import { showToast } from '../ui/toast.js';
import * as soundDesign from '../services/soundDesign.js';
import {
  buildMushafAyahDetail,
  getActiveTafsirTab,
  setActiveTafsirTab,
} from '../views/mushafReader.js';

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

/** Record a tier's fetch outcome in the store so views can swap their
 *  infinite skeleton for an error + Retry (the hadith reader's pattern,
 *  extended app-wide in v4.1). */
function flagLoad(key, failed) {
  store.dispatch(actions.setLoadError(key, failed));
}

export async function ensureQuranData(state) {
  if (!state.quran.meta && !rt.quranMetaFetchStarted) {
    rt.quranMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
      flagLoad('quran-meta', false);
    } catch (err) {
      console.error('[quran] failed to load meta', err);
      rt.quranMetaFetchStarted = false; // allow a retry on the next navigation
      flagLoad('quran-meta', true);
      showToast(t('quran.loadFailed', store.getState().settings.language));
    }
  }

  const id = state.activeParams.id;
  if (!id) return;

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
}

export async function ensureMushafData(state) {
  // The ayah-detail audio button needs quran-meta.json's per-surah ayah
  // counts to compute the global ayah number the recitation CDN keys audio
  // by. Only the classic reader normally triggers that fetch (via
  // ensureQuranData), so make sure it happens here too — otherwise opening
  // the Mushaf reader before ever visiting the classic reader would leave
  // the Listen button unable to resolve a URL.
  if (!state.quran.meta && !rt.quranMetaFetchStarted) {
    rt.quranMetaFetchStarted = true;
    try {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
      flagLoad('quran-meta', false);
    } catch (err) {
      console.error('[quran] failed to load meta', err);
      rt.quranMetaFetchStarted = false;
      flagLoad('quran-meta', true);
    }
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
}

export async function ensureQuranWordsData(state, surahNumber) {
  const id = String(surahNumber);
  if (state.quranWords[id] || quranWordsFetchesInFlight.has(id)) return;
  quranWordsFetchesInFlight.add(id);
  try {
    const words = await fetchJSON(QURAN_WORDS_URL(id));
    store.dispatch(actions.setQuranWords(id, words));
  } catch (err) {
    console.error('[wordStudy] failed to load word data', id, err);
  } finally {
    quranWordsFetchesInFlight.delete(id);
  }
}

export async function ensureQuranRoots(state) {
  if (state.quranRoots || rt.quranRootsFetchStarted) return;
  rt.quranRootsFetchStarted = true;
  try {
    const roots = await fetchJSON(QURAN_ROOTS_URL);
    store.dispatch(actions.setQuranRoots(roots));
  } catch (err) {
    console.error('[wordStudy] failed to load root index', err);
    rt.quranRootsFetchStarted = false;
  }
}

// The root-family browser's uncapped index (~2.3 MB): fetched once the
// first time the roots view opens, then served offline by the SW's
// stale-while-revalidate /data strategy. Failure is loud in the console
// but never fatal — the view keeps rendering from the capped index.
export async function ensureQuranRootsFull(state) {
  if (state.quranRootsFull || rt.quranRootsFullFetchStarted) return;
  rt.quranRootsFullFetchStarted = true;
  try {
    const roots = await fetchJSON(QURAN_ROOTS_FULL_URL);
    store.dispatch(actions.setQuranRootsFull(roots));
  } catch (err) {
    console.error('[roots] failed to load full root index', err);
    rt.quranRootsFullFetchStarted = false;
  }
}

export async function ensureTafsirEditions(state) {
  if (state.tafsirEditions || rt.tafsirEditionsFetchStarted) return;
  rt.tafsirEditionsFetchStarted = true;
  try {
    const editions = await fetchJSON(TAFSIR_EDITIONS_URL);
    store.dispatch(actions.setTafsirEditions(editions));
    flagLoad('tafsir-editions', false);
  } catch (err) {
    console.error('[tafsir] failed to load editions catalog', err);
    rt.tafsirEditionsFetchStarted = false;
    flagLoad('tafsir-editions', true);
  }
}

export async function ensureTajweedPool(state) {
  if (state.tajweedPool || rt.tajweedPoolFetchStarted) return;
  rt.tajweedPoolFetchStarted = true;
  try {
    const pool = await fetchJSON(TAJWEED_PRACTICE_POOL_URL);
    store.dispatch(actions.setTajweedPool(pool));
  } catch (err) {
    console.error('[tajweed] failed to load practice pool', err);
    rt.tajweedPoolFetchStarted = false;
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
    console.error('[tafsir] failed to load text', key, err);
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

export async function openAyahStudy(surah, ayah, page = null) {
  let state = store.getState();
  if (!state.quran.meta) {
    try {
      store.dispatch(actions.setQuranMeta(await fetchJSON(QURAN_META_URL)));
    } catch {
      /* best effort */
    }
  }
  if (!state.quran.surahs[String(surah)]) {
    try {
      await dispatchSurahDoc(surah);
    } catch {
      /* best effort */
    }
  }
  await ensureTafsirEditions(store.getState());
  state = store.getState();
  const defaultId = getActiveTafsirTab() || state.settings.mushafPrefs.defaultTafsir;
  setActiveTafsirTab(defaultId);
  if (defaultId) await ensureTafsirText(store.getState(), defaultId, surah);
  state = store.getState();
  const surahDoc = state.quran.surahs[String(surah)];
  const arabicText = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayah))?.text || '';
  openModal(buildMushafAyahDetail(arabicText, surahDoc, surah, ayah, state, page), {
    labelledBy: 'modal-title-mushaf-ayah',
  });
}
