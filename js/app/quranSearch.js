/**
 * app/quranSearch.js — the full-text Qur'an search corpus: lazy index
 * build over all 6,236 ayahs, once per translation edition.
 */

import { scrollBehavior } from '../core/utils.js';
import { rt } from './rt.js';
import { fetchJSON } from './net.js';
import { loadSurahDoc } from './quranData.js';

import { QURAN_META_URL, VIEWS } from '../core/config.js';
import { actions, store } from '../core/state.js';
import { buildQuranIndex, isQuranSearchReady, setQuranIndexReady } from '../domain/quranSearch.js';

/* Qur'an full-text search corpus                                       */
/* ------------------------------------------------------------------ */
// The classic reader fetches surah documents lazily, one at a time — fine
// for reading, useless for searching. The first full-text search therefore
// fetches the whole corpus (~2.7MB of local JSON) in one batch, dispatches
// a single bulk action so the view re-renders exactly once, and builds the
// index in quranSearch.js. The service worker caches every surah file on
// its way through, so this whole flow works offline after the first use.

export async function ensureQuranSearchData() {
  if (rt.quranSearchBuildStarted || isQuranSearchReady()) return;
  rt.quranSearchBuildStarted = true;
  try {
    if (!store.getState().quran.meta) {
      const meta = await fetchJSON(QURAN_META_URL);
      store.dispatch(actions.setQuranMeta(meta));
    }
    const existing = store.getState().quran.surahs;
    const missing = [];
    for (let n = 1; n <= 114; n++) {
      if (!existing[String(n)]) missing.push(n);
    }
    // Fetch in modest chunks so a flaky connection surfaces errors early
    // instead of after 114 parallel requests.
    const CHUNK = 24;
    const fetched = {};
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      const docs = await Promise.all(
        chunk.map(async (n) => {
          try {
            let doc = await loadSurahDoc(n);
            const want = store.getState().settings.quranTranslation || 'en-sahih';
            if ((doc.translationEdition || 'en-sahih') !== want) {
              doc = await loadSurahDoc(n);
            }
            return doc;
          } catch (err) {
            console.error('[quran-search] failed to load surah', n, err);
            return null;
          }
        })
      );
      chunk.forEach((n, j) => {
        if (docs[j]) fetched[n] = docs[j];
      });
    }
    buildQuranIndex({ ...existing, ...fetched });
    setQuranIndexReady(true);
    // Bulk-warm the reader cache too (one dispatch, one re-render): search
    // results link into the per-surah reader, which should never have to
    // re-fetch something already on screen.
    store.dispatch(actions.setQuranSurahsBulk(fetched));
  } catch (err) {
    console.error('[quran-search] corpus load failed', err);
    rt.quranSearchBuildStarted = false; // allow a retry on the next query
    store.dispatch(actions.setLoadError('quran-search-corpus', true));
  }
}

/* Deep-link scroll target: '#/quran/36?ay=12' focuses ayah 12 once its
 * element exists. Because the surah document may still be in flight when
 * NAVIGATE fires, attempts repeat across subsequent renders until success
 * or until the user navigates elsewhere (whichever comes first). */

export function maybeScrollToFocusAyah(state) {
  if (state.activeView !== VIEWS.QURAN || state.activeParams?.ay == null) {
    rt.pendingAyahScroll = null;
    return;
  }
  const want = String(state.activeParams.ay);
  if (
    rt.pendingAyahScroll === null ||
    rt.pendingAyahScroll.queryKey !== `${state.activeParams.id}:${want}`
  ) {
    rt.pendingAyahScroll = { ay: want, queryKey: `${state.activeParams.id}:${want}` };
    rt.ayahScrollAttempts = 0;
  }
  requestAnimationFrame(() => {
    if (!rt.pendingAyahScroll) return;
    const el = document.getElementById(`ayah-${rt.pendingAyahScroll.ay}`);
    if (el) {
      rt.pendingAyahScroll = null;
      el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    } else if (++rt.ayahScrollAttempts > 20) {
      rt.pendingAyahScroll = null; // give up silently — never wedge the app
    }
  });
}

/**
 * v3.17 hifz: a Home review chip (or any #/quran/N?mem=1 link) lands here —
 * start the memorize session for that surah once. Idempotent per surah via
 * a consumed-param ref (same pattern as the hadith deep link), so later
 * re-renders of the same navigation never restart the session.
 */

export function maybeStartHifzFromParam(state) {
  if (
    state.activeView !== VIEWS.QURAN ||
    state.activeParams?.mem !== '1' ||
    state.activeParams?.id == null
  ) {
    rt.hifzParamConsumed = null;
    return;
  }
  const surah = Math.floor(Number(state.activeParams.id));
  if (!(surah >= 1 && surah <= 114)) return;
  if (state.hifzSession.mode && Number(state.hifzSession.surah) === surah) {
    rt.hifzParamConsumed = String(surah);
    return;
  }
  if (rt.hifzParamConsumed === String(surah)) return;
  rt.hifzParamConsumed = String(surah);
  store.dispatch(actions.hifzSessionStart({ surah, level: 'ayah' }));
}

export function maybeStartQuranSearchBuild(state) {
  if (
    state.activeView === VIEWS.SEARCH &&
    (state.activeParams?.q || '').trim() &&
    !isQuranSearchReady()
  ) {
    ensureQuranSearchData();
  }
}
