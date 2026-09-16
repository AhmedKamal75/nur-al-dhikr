/**
 * app/tafsirSearch.js — full-text search corpus for one bundled tafsir
 * edition: lazy index build over all 114 surah files, once per edition.
 *
 * Mirrors the Quran-search build (chunked fetch, single bulk dispatch,
 * SW-cached after first use) with one hard rule carried over from
 * lazyData: REMOTE editions are never bulk-fetched — only bundled ones,
 * whose files live in the app's own data/ folder.
 */
import { rt } from './rt.js';
import { actions, store } from '../core/state.js';
import { TAFSIR_TEXT_URL, VIEWS } from '../core/config.js';
import { fetchJSON } from './net.js';
import { ensureTafsirEditions } from './lazyData.js';
import {
  buildTafsirIndex,
  defaultSearchEdition,
  isTafsirSearchReady,
  isTafsirSearchable,
  tafsirIndexEdition,
} from '../domain/tafsirSearch.js';

/** Resolve the edition to index: explicit bundled id, else first bundled. */
export function resolveTafsirSearchEdition(editionId = null) {
  const editions = store.getState().tafsirEditions?.editions || [];
  if (editionId) {
    const explicit = editions.find((e) => e.id === editionId);
    if (isTafsirSearchable(explicit)) return explicit;
    return null;
  }
  return defaultSearchEdition(editions);
}

export async function ensureTafsirSearchData(editionId = null) {
  if (rt.tafsirSearchBuildStarted || isTafsirSearchReady()) return isTafsirSearchReady();
  const state = store.getState();
  if (!state.tafsirEditions) {
    await ensureTafsirEditions(state);
  }
  const edition = resolveTafsirSearchEdition(editionId);
  // No bundled edition (or an explicitly remote id): refuse silently —
  // bulk-fetching remote files would break the on-demand rule.
  if (!edition) return false;
  if (tafsirIndexEdition() === edition.id && isTafsirSearchReady()) return true;
  rt.tafsirSearchBuildStarted = true;
  try {
    const have = store.getState().tafsir?.[edition.id] || {};
    const missing = [];
    for (let n = 1; n <= 114; n++) {
      if (!have[String(n)]) missing.push(n);
    }
    const CHUNK = 24;
    const fetched = {};
    for (let i = 0; i < missing.length; i += CHUNK) {
      // (v5.2.82, BUG-09) same navigation-cancel contract as the Qur'an
      // corpus build above: background chunks must never starve the view
      // the person actually opened. Latch resets so Search resumes later.
      if (store.getState().activeView !== VIEWS.SEARCH) {
        rt.tafsirSearchBuildStarted = false;
        return false;
      }
      const chunk = missing.slice(i, i + CHUNK);
      const docs = await Promise.all(
        chunk.map(async (n) => {
          try {
            const raw = await fetchJSON(TAFSIR_TEXT_URL(edition.id, n));
            return Array.isArray(raw) ? {} : raw;
          } catch (err) {
            // Warn, not error: one skipped surah doesn't fail the build
            // (nulls drop out, the index covers what landed, next query
            // retries) — error-level spam here defeats the console-error
            // hygiene the e2e suite enforces for real defects.
            console.warn('[tafsir-search] failed to load surah', edition.id, n, err);
            return null;
          }
        })
      );
      chunk.forEach((n, j) => {
        if (docs[j]) {
          fetched[String(n)] = docs[j];
          store.dispatch(actions.setTafsirText(edition.id, String(n), docs[j]));
        }
      });
    }
    // Reader cache doubles as the index source: texts the reader already
    // holds merge under just-fetched ones per-surah (freshest wins).
    const merged = { ...fetched, ...store.getState().tafsir?.[edition.id] };
    buildTafsirIndex(edition.id, merged);
    return true;
  } catch (err) {
    console.error('[tafsir-search] corpus load failed', err);
    rt.tafsirSearchBuildStarted = false; // allow a retry on the next query
    store.dispatch(actions.setLoadError('tafsir-search-corpus', true));
    return false;
  }
}

/**
 * (v5.2.74, UP-08) Search-view typed: start (or resume) the tafsir index
 * build. Runs on every Search render while a query stands — guarded
 * inside, so the steady state is one flag check per render. The Tafsir
 * result group renders once the index is ready.
 */
export function maybeStartTafsirSearchBuild(state) {
  if (
    state.activeView === VIEWS.SEARCH &&
    (state.activeParams?.q || '').trim() &&
    !isTafsirSearchReady()
  ) {
    ensureTafsirSearchData();
  }
}
