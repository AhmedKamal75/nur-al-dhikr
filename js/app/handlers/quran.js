import { claimSpeaker } from '../audioEngine.js';
import { rt } from '../../app/rt.js';
import * as COURSE from '../../domain/tajweedCourse.js';
import { fetchJSON } from '../net.js';
import { playFlipSound } from '../inputs.js';
import { dispatchSurahDoc } from '../quranData.js';
import {
  currentAyahDetailPage,
  ensureQuranRoots,
  ensureQuranWordsData,
  ensureTafsirText,
  ensureTajweedPool,
  ensureWordDict,
  ensureRootsMeaning,
  ensureMushafNavigationPages,
  openAyahStudy,
} from '../lazyData.js';
import {
  renderPracticeRound,
  startPracticeRound,
  advancePracticeRound,
  openPracticePicker,
  startClassifyRound,
  answerClassify,
  advanceClassifyRound,
} from '../practice.js';

import { MUSHAF_META_URL, VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go, replaceGo } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { getVerseAudio } from '../../services/audioStore.js';
import {
  buildAnswerKey,
  buildWordAnswerKey,
  scoreRound,
  scoreWordRound,
  TAJWEED_QUIZ_MODES,
} from '../../domain/tajweedPractice.js';
import { setSessionFlag, setSessionValue } from '../../domain/sessionFlags.js';
import { getWord, dictEntryFor, wordBookmarkKey } from '../../domain/wordStudy.js';
import * as speech from '../../services/speech.js';
import {
  clampPage,
  prevPage as mushafPrevPage,
  nextPage as mushafNextPage,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
  globalAyahNumber,
} from '../../services/mushaf.js';
import { closeModal, getModalGeneration, isModalOpen, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as recitation from '../../services/recitation.js';
import * as surahPlayback from '../../services/surahPlayback.js';
import { verseAudioCandidates } from '../../services/surahPlayback.js';
import { setFlipDirection, setFullscreenAnim } from '../../ui/readingTokens.js';
/**
 * (v5.2.18) Mushaf builders load on demand: every static import of the
 * book view pulled ~700 lines (+ tafsir console builders) into the boot
 * parse. Call sites below await this loader instead; async-handler
 * rejections surface through the events.js boundary, so a failed chunk
 * toasts instead of stranding the tap silently.
 */
async function mushafView() {
  return import('../../views/mushafReader.js');
}
import { requestMushafNativeFullscreen, releaseMushafNativeFullscreen } from '../fullscreen.js';
import {
  buildMushafSettingsPanel,
  buildWordStudyLoadingPanel,
  buildWordStudyPanel,
  buildSavedWordsPanel,
} from '../../views/tafsirPanel.js';
import { buildTajweedSettingsPanel } from '../../views/tajweedSettings.js';
import { TAJWEED_FAMILY_VARS, tajweedPrefsOf } from '../../domain/tajweed.js';

/** (v4.6.0) Push the user's family color overrides onto <html> as the
 *  --tw-* custom properties the .tajweed--* classes resolve through. No
 *  overrides = remove the inline properties so variables.css wins again.
 *  Exported so boot can apply a restored state on startup. */
export function applyTajweedColors(state) {
  if (typeof document === 'undefined') return; // node/tests
  const prefs = tajweedPrefsOf(state);
  const overrides = prefs.colors || {};
  for (const [familyId, vars] of Object.entries(TAJWEED_FAMILY_VARS)) {
    const color = overrides[familyId];
    for (const v of vars) {
      if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) {
        document.documentElement.style.setProperty(v, color);
      } else {
        document.documentElement.style.removeProperty(v);
      }
    }
  }
}

/**
 * Shared Mushaf page-turn path for buttons, keyboard and touch. The old
 * callers all computed the destination independently and navigated
 * immediately, which made a fast swipe/arrow race the lazy page fetch and
 * briefly render the loading/black page. This helper establishes one
 * invariant: never route to a page until every page required by the current
 * spread is resident.
 */
export async function navigateMushafPage(direction) {
  const generation = rt.lazyDataGeneration;
  const state = store.getState();
  if (state.activeView !== VIEWS.MUSHAF) return false;
  // (v5.17.21, FIXED) The page you are turning FROM comes from the same
  // resolution the reader renders with (mushafRoutePage). A `?s=2&ay=255`
  // arrival carries no `page` at all, so reading the page off the URL sent
  // the turn to page 1|2 while the book was open at 42 — one "next" and the
  // reader jumped backwards through half of Al-Baqarah. The re-read below
  // uses it too, or that staleness guard would fire on every turn from an
  // ayah deep link and refuse to turn at all.
  const { mushafRoutePage } = await mushafView();
  const page = mushafRoutePage(state).page;
  const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
  const right = spreadOn ? spreadRightPage(page) : page;
  const dest =
    direction === 'next'
      ? spreadOn
        ? nextSpreadPage(right)
        : mushafNextPage(page)
      : spreadOn
        ? prevSpreadPage(right)
        : mushafPrevPage(page);
  if (dest == null || dest === page) return false;
  const intent = (rt.mushafNavigationIntent || 0) + 1;
  rt.mushafNavigationIntent = intent;

  try {
    await ensureMushafNavigationPages(dest);
    if (generation !== rt.lazyDataGeneration) return false;
  } catch (err) {
    console.error('[mushaf] navigation page load failed', dest, err);
    showToast(t('mushaf.loadFailed', store.getState().settings.language));
    return false;
  }

  const current = store.getState();
  const currentPage = mushafRoutePage(current).page;
  if (
    rt.mushafNavigationIntent !== intent ||
    current.activeView !== state.activeView ||
    currentPage !== page
  ) {
    return false;
  }

  setFlipDirection(direction);
  playFlipSound();
  go(VIEWS.MUSHAF, { page: String(dest) });
  return true;
}

/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

/**
 * (v5.2.75, UP-01) resolve the tapped word exactly like the popup does
 * (surface-anchored via getWord), so per-word actions never operate on a
 * different word than the one shown. Returns { word, key } or null.
 */
function resolveTappedWord(ds, target) {
  const key = wordBookmarkKey(ds.surah, ds.ayah, ds.i);
  if (!key) return null;
  const state = store.getState();
  const active = state.activeWordStudy;
  const activeSurface =
    active &&
    String(active.surah) === String(ds.surah) &&
    String(active.ayah) === String(ds.ayah) &&
    String(active.i) === String(ds.i)
      ? active.surface
      : null;
  const surface = activeSurface || target?.textContent?.trim().slice(0, 140) || null;
  const word = getWord(state.quranWords, ds.surah, ds.ayah, Number(ds.i), surface);
  if (!word || typeof word.text !== 'string' || !word.text) return null;
  return { word, key };
}

function wordStudyRequestIsCurrent(request) {
  const state = store.getState();
  const active = state.activeWordStudy;
  return (
    request.requestId === rt.wordStudyRequestId &&
    state.activeView === request.view &&
    active &&
    String(active.surah) === String(request.surah) &&
    String(active.ayah) === String(request.ayah) &&
    String(active.i) === String(request.i) &&
    (active.surface || null) === (request.surface || null)
  );
}

async function openWordStudy(request) {
  const requestId = rt.wordStudyRequestId + 1;
  rt.wordStudyRequestId = requestId;
  const trackedRequest = { ...request, requestId };
  const initial = store.getState();
  const hasWord = Boolean(
    getWord(initial.quranWords, request.surah, request.ayah, request.i, request.surface || null)
  );
  if (hasWord) {
    openModal(buildWordStudyPanel(initial), { labelledBy: 'modal-title-word-study' });
  } else {
    openModal(buildWordStudyLoadingPanel(initial), { labelledBy: 'modal-title-word-study' });
  }
  const modalGeneration = getModalGeneration();
  const surahReady = store.getState().quran.surahs[String(request.surah)]
    ? Promise.resolve()
    : dispatchSurahDoc(String(request.surah)).catch((err) => {
        console.error('[wordStudy] failed to load surah text', request.surah, err);
      });
  await Promise.allSettled([
    ensureQuranWordsData(store.getState(), request.surah),
    ensureQuranRoots(store.getState()),
    ensureWordDict(),
    ensureRootsMeaning(),
    surahReady,
  ]);
  if (
    !wordStudyRequestIsCurrent(trackedRequest) ||
    getModalGeneration() !== modalGeneration ||
    !isModalOpen()
  )
    return;
  openModal(buildWordStudyPanel(store.getState()), { labelledBy: 'modal-title-word-study' });
}

export const clickHandlers = {
  // (v4.4) TRUE fullscreen Mushaf: the book expands to fill the whole
  // viewport. One handler owns every side effect so the view stays a
  // pure template: the state flag (renderer maps it to
  // body.is-mushaf-fullscreen), the one-shot animation direction, the
  // native Fullscreen API (browser chrome gone too, best-effort), the
  // screen wake lock (a reading session must not sleep the display), and
  // the control auto-fade timer armed in app/events.js.
  'mushaf-toggle-fullscreen': () => {
    const on = !store.getState().mushafFullscreen;
    setFullscreenAnim(on ? 'in' : 'out');
    store.dispatch(actions.setMushafFullscreen(on));
    if (on) {
      requestMushafNativeFullscreen();
    } else {
      releaseMushafNativeFullscreen();
    }
  },

  // (v4.4) The Mushaf action sheet — the feature-parity drawer.
  'mushaf-more': async () => {
    const { buildMushafSheet } = await mushafView();
    openModal(buildMushafSheet(store.getState()), { labelledBy: 'modal-title-mushaf-sheet' });
  },

  // (v4.2, v5.2.17) classic-reader windowing: extend the visible ayah
  // window by one page of ~30. Window memory is a store slice now, so the
  // expand rides with the render-nudge dispatch in one batch — the tap
  // re-renders exactly once.
  'quran-window-expand': (ds) => {
    store.batch(() => {
      store.dispatch(actions.expandReaderWindow(ds.dir === 'up' ? 'up' : 'down'));
      store.dispatch(actions.setSpeakingItem(null));
    });
  },
  'mushaf-prev': () => navigateMushafPage('prev'),

  'mushaf-next': () => navigateMushafPage('next'),

  'mushaf-open-jump': async () => {
    const { buildMushafJump } = await mushafView();
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
  },

  // Khatma progress lives in its own TRACK panel (opened from the ⋯ sheet),
  // never inside the Jump drawer — navigation stays pure navigation.
  'mushaf-open-track': async () => {
    const { buildMushafTrack } = await mushafView();
    openModal(buildMushafTrack(store.getState()), { labelledBy: 'modal-title-mushaf-track' });
  },

  'mushaf-jump-page': async (ds) => {
    closeModal();
    const state = store.getState();
    const page = clampPage(ds.page);
    // (v4.5) in a spread, a jump to an even page aligns down to the odd
    // right page whose spread contains it — page 200 is the LEFT page of
    // the 199|200 spread.
    const dest = mushafSpreadActive(state.settings.mushafPrefs) ? spreadRightPage(page) : page;
    try {
      await ensureMushafNavigationPages(dest);
    } catch (err) {
      console.error('[mushaf] jump page load failed', dest, err);
      showToast(t('mushaf.loadFailed', store.getState().settings.language));
      return;
    }
    go(VIEWS.MUSHAF, { page: String(dest) });
  },

  // (v4.5) Feature parity: from the Mushaf's ayah detail straight into the
  // classic study reader centered on that ayah (deep-link ?ay= machinery
  // re-centers the window and focuses the card).
  'mushaf-open-in-study': (ds) => {
    closeModal();
    const surah = parseInt(ds.surah, 10);
    const ayah = parseInt(ds.ayah, 10);
    if (!(surah >= 1 && surah <= 114) || !(ayah >= 1)) return;
    go(VIEWS.QURAN, { id: String(surah), ay: String(ayah) });
  },

  // (v4.5) Classic-reader immersive mode: chrome away, column wide.
  'quran-toggle-immersive': () => {
    store.dispatch(actions.setReaderImmersive(!store.getState().readerImmersive));
  },

  'mushaf-open-at-surah': async (ds) => {
    let state = store.getState();
    if (!state.mushaf.meta) {
      try {
        const meta = await fetchJSON(MUSHAF_META_URL);
        store.dispatch(actions.setMushafMeta(meta));
      } catch (err) {
        console.error('[mushaf] failed to load page index', err);
      }
      state = store.getState();
    }
    const page = state.mushaf.meta?.surahFirstPage?.[String(ds.surah)] || 1;
    // (GROWTH-01 delight 2) one-shot resume: opening the bookmarked surah
    // retires the Home continue card for this session (session flag, never
    // persisted — the bookmark itself is untouched).
    if (String(ds.surah) === String(state.quranBookmark?.surah)) setSessionFlag('continueResumed');
    try {
      await ensureMushafNavigationPages(page);
    } catch (err) {
      console.error('[mushaf] surah page load failed', page, err);
      showToast(t('mushaf.loadFailed', store.getState().settings.language));
      return;
    }
    go(VIEWS.MUSHAF, { page: String(page) });
  },

  'mushaf-ayah-tap': async (ds) => {
    const state = store.getState();
    // (v5.17.21, FIXED) Same route resolution as the reader: on a
    // `?s=&ay=` arrival the URL names no page, and deriving the facing-page
    // candidates from the bookmark instead made an ayah on page 42 look for
    // a home on pages 1|2 — the study popup then opened with no verse found
    // and a bookmark pointing at a page that does not carry it.
    const { mushafRoutePage } = await mushafView();
    const page = mushafRoutePage(state).page;
    // (v4.5) in a spread the tapped ayah may sit on EITHER facing page —
    // find which one carries it so its bookmark records the true page.
    const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
    const right = spreadOn ? spreadRightPage(page) : page;
    const left = spreadOn ? spreadLeftPage(right) : null;
    const carries = (doc) =>
      doc?.chapters?.some(
        (c) =>
          String(c.number) === String(ds.surah) &&
          c.verses.some((v) => String(v.number) === String(ds.ayah))
      );
    const rightDoc = state.mushaf.pages[String(right)];
    const leftDoc = left != null ? state.mushaf.pages[String(left)] : null;
    const pageNum = leftDoc && carries(leftDoc) && !carries(rightDoc) ? left : right;
    const pageDoc = state.mushaf.pages[String(pageNum)];
    const chapter = pageDoc?.chapters.find((c) => String(c.number) === String(ds.surah));
    const verse = chapter?.verses.find((v) => String(v.number) === String(ds.ayah));
    if (!verse) return;
    // (v5.2.9) fresh ayah -> fall back to the default tafsir source.
    store.dispatch(actions.setMushafSession({ tafsirTab: null }));
    await openAyahStudy(ds.surah, ds.ayah, pageNum);
  },

  'word-tap': async (ds, e, target) => {
    // (v5.5.0) Bismillah taps (data-ayah="0") redirect onto the real
    // 1:1 grammar records — the four words are identical, so the popup
    // answers with genuine i'rab/sarf/root instead of an empty token
    // shell. Index-clamped at the edge like every other tap path.
    if (String(ds.ayah) === '0') {
      const bi = Number(ds.i);
      if (!(bi >= 1 && bi <= 4)) return;
      const surface = target?.textContent?.trim().slice(0, 140) || null;
      const view = store.getState().activeView;
      store.dispatch(actions.openWordStudy(1, 1, bi, surface));
      await openWordStudy({ view, surah: 1, ayah: 1, i: bi, surface });
      return;
    }
    const surah = ds.surah,
      ayah = ds.ayah,
      i = Number(ds.i);
    // (v5.3.0) the tapped surface anchors popup resolution for the
    // handful of true spelling-split ayahs (37:164 etc.) where even
    // canonical indices diverge between sources.
    const surface = target?.textContent?.trim().slice(0, 140) || null;
    const view = store.getState().activeView;
    store.dispatch(actions.openWordStudy(surah, ayah, i, surface));
    await openWordStudy({ view, surah, ayah, i, surface });
  },

  // (v5.2.75, UP-01) per-word actions for the study popup. All resolve
  // the tapped word exactly like the popup does (surface-anchored), so
  // an action never operates on a different word than the one shown.
  'word-speak': (ds, e, target) => {
    const st = store.getState();
    const lang = st.settings.language;
    if (st.settings.soundEnabled !== true) {
      showToast(t('wordStudy.soundOff', lang));
      return;
    }
    if (!speech.isSupported()) {
      showToast(t('wordStudy.speechUnsupported', lang));
      return;
    }
    const found = resolveTappedWord(ds, target);
    if (!found) return;
    // A pseudo-item so the speech service's toggle contract works
    // unchanged (the hadith reader does the same for single hadiths).
    speech.speakItem({ id: `word-${found.key}`, arabic: found.word.text, transliteration: '' }, {});
  },

  'word-copy': async (ds, e, target) => {
    const st = store.getState();
    const lang = st.settings.language;
    const found = resolveTappedWord(ds, target);
    if (!found) return;
    const dict = dictEntryFor(st.wordDict, found.word.lemma);
    const gloss = found.word.en || dict?.en || '';
    const text = gloss
      ? `${found.word.text} — ${gloss}\n\n\u2014 ${found.key}`
      : `${found.word.text}\n\n\u2014 ${found.key}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  'word-share': async (ds, e, target) => {
    const st = store.getState();
    const lang = st.settings.language;
    const found = resolveTappedWord(ds, target);
    if (!found) return;
    const dict = dictEntryFor(st.wordDict, found.word.lemma);
    const contextual = found.word.study?.contextualMeaning;
    const meaning =
      lang === 'ar'
        ? dict?.ar || (typeof contextual?.ar === 'string' ? contextual.ar : '')
        : found.word.en || dict?.en || (typeof contextual?.en === 'string' ? contextual.en : '');
    const text = `${found.word.text}${meaning ? ` — ${meaning}` : ''}\n\n— ${found.key}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: t('wordStudy.title', lang), text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast(t('card.copied', lang));
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        showToast(t('card.copied', lang));
      } catch {
        showToast(t('common.error', lang));
      }
    }
  },

  'word-bookmark': (ds) => {
    const key = wordBookmarkKey(ds.surah, ds.ayah, ds.i);
    if (!key) return;
    store.dispatch(actions.toggleWordBookmark(key));
    const marked = store.getState().wordBookmarks?.[key] === true;
    const label = t(
      marked ? 'wordStudy.bookmarked' : 'wordStudy.bookmark',
      store.getState().settings.language
    );
    if (typeof document !== 'undefined') {
      const button = [...document.querySelectorAll('[data-action="word-bookmark"]')].find(
        (el) =>
          el.dataset.surah === String(ds.surah) &&
          el.dataset.ayah === String(ds.ayah) &&
          el.dataset.i === String(ds.i)
      );
      if (button) {
        button.classList.toggle('icon-btn--active', marked);
        button.setAttribute('aria-pressed', String(marked));
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
      }
    }
    showToast(label);
  },

  'word-bookmarks-open': () => {
    openModal(buildSavedWordsPanel(store.getState()), {
      labelledBy: 'modal-title-word-bookmarks',
    });
  },

  'word-bookmark-open': async (ds) => {
    const key = String(ds.key || '');
    const state = store.getState();
    if (state.wordBookmarks?.[key] !== true || !/^\d{1,3}:\d{1,3}:\d{1,4}$/.test(key)) return;
    const [surah, ayah, i] = key.split(':').map(Number);
    if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286 || i < 1) return;
    const view = state.activeView;
    closeModal();
    store.dispatch(actions.openWordStudy(surah, ayah, i, null));
    await openWordStudy({ view, surah, ayah, i, surface: null });
  },

  'word-bookmark-remove': (ds) => {
    const key = String(ds.key || '');
    const existed = store.getState().wordBookmarks?.[key] === true;
    if (existed) store.dispatch(actions.removeWordBookmark(key));
    openModal(buildSavedWordsPanel(store.getState()), {
      labelledBy: 'modal-title-word-bookmarks',
    });
    if (existed) showToast(t('wordStudy.savedWordRemoved', store.getState().settings.language));
  },

  'root-jump': async (ds) => {
    closeModal();
    store.dispatch(actions.setMushafSession({ tafsirTab: null }));
    await openAyahStudy(ds.surah, ds.ayah, null);
  },

  // v3.22.0 root-family browser: from the word popover's root section
  // straight into the dedicated view for that root.
  'roots-open': (ds) => {
    closeModal();
    go(VIEWS.ROOTS, { id: ds.root });
  },

  // From a word-form group's ref chip into the classic reader at that ayah
  // (the deep-link scroll machinery picks the ayah up once it renders).
  'roots-jump': (ds) => {
    go(VIEWS.QURAN, { id: ds.surah, ay: ds.ayah });
  },

  // (v5.2.55) roots index paging: replaceGo keeps tab/q, drops page 1 —
  // the search-typing discipline (no history spam, URL stays shareable).
  'roots-page': (ds) => {
    const page = Math.max(1, Math.floor(Number(ds.page)) || 1);
    replaceGo(VIEWS.ROOTS, {
      ...(ds.q ? { q: ds.q } : {}),
      ...(page > 1 ? { page: String(page) } : {}),
    });
  },

  // (v5.2.75, UP-09) root detail tabs (forms/confusables): replaceGo keeps
  // the root id and drops the default tab — the roots-page no-history-
  // spam discipline, with a shareable URL per the deep-link contract.
  'roots-tab': (ds) => {
    if (!ds.root) return;
    replaceGo(VIEWS.ROOTS, {
      id: ds.root,
      ...(ds.tab && ds.tab !== 'forms' ? { tab: ds.tab } : {}),
    });
  },

  // (v5.2.55) per-group ref overflow: pure DOM toggle (no nav, no state —
  // expansion is a reading gesture, like the Mushaf control auto-fade).
  'roots-expand': (ds, _e, target) => {
    const root = target?.closest?.('.root-form');
    const more = root?.querySelector?.('.root-form__more');
    const label = target?.querySelector?.('.roots-expand__label');
    if (!root || !more || !label) return;
    const opening = more.hasAttribute('hidden');
    if (opening) more.removeAttribute('hidden');
    else more.setAttribute('hidden', '');
    target.setAttribute('aria-expanded', String(opening));
    label.textContent = opening ? target.dataset.labelLess || '' : target.dataset.labelMore || '';
  },

  'tafsir-open': async (ds) => {
    closeModal();
    // (v4.1) Same rule as mushaf-ayah-tap/root-jump: a NEW ayah always
    // starts from the default tafsir source. The word-study shortcut used
    // to inherit the previous ayah's tab — including possibly an unloaded
    // remote edition — while direct taps reset. One intent, one behavior.
    store.dispatch(actions.setMushafSession({ tafsirTab: null }));
    await openAyahStudy(ds.surah, ds.ayah, null, {
      focusSelector: '#tafsir-panel-content',
    });
  },

  'tafsir-tab': async (ds) => {
    store.dispatch(actions.setMushafSession({ tafsirTab: ds.edition }));
    // (GROWTH-01 delight 3) remember this ayah's panel for the session.
    if (ds.surah != null && ds.ayah != null && typeof ds.edition === 'string') {
      setSessionValue(`study-tab:${ds.surah}:${ds.ayah}`, ds.edition);
    }
    await ensureTafsirText(store.getState(), ds.edition, ds.surah);
    // (v5.2.75, UX-03) the re-opened modal keeps focus on the active tab
    // (WAI-ARIA tabs) instead of snapping it to the first body element.
    await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah), {
      focusSelector: `#tafsir-tab-${ds.edition}`,
    });
  },

  // Tafsir compare: an extra source under the active tab. Tapping the
  // active pick turns compare off. Re-opens the study modal in place so
  // the new column renders immediately (same pattern as tafsir-tab).
  // (v5.2.78, UP-06) data-slot B (default, backward-compat) or C.
  'tafsir-compare': async (ds) => {
    const slot = ds.slot === 'C' ? 'tafsirCompareC' : 'tafsirCompareB';
    const cur = store.getState().settings[slot] || null;
    const next = ds.edition && ds.edition !== cur ? ds.edition : null;
    store.dispatch(actions.updateSettings({ [slot]: next }));
    if (next) await ensureTafsirText(store.getState(), next, ds.surah);
    await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
  },

  'tafsir-download': async (ds) => {
    const lang = store.getState().settings.language;
    const ok = await ensureTafsirText(store.getState(), ds.edition, ds.surah, true);
    showToast(t(ok ? 'tafsir.downloadDone' : 'tafsir.downloadFailed', lang));
    if (ok) {
      store.dispatch(actions.setMushafSession({ tafsirTab: ds.edition }));
      await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
    }
  },

  // (v5.2.74, UP-08) compare-column download: an uncached remote second
  // source fetches on explicit tap — the same on-demand rule as the
  // primary tab's download, but the primary tab stays put.
  'tafsir-compare-download': async (ds) => {
    const lang = store.getState().settings.language;
    const ok = await ensureTafsirText(store.getState(), ds.edition, ds.surah, true);
    showToast(t(ok ? 'tafsir.downloadDone' : 'tafsir.downloadFailed', lang));
    if (ok) {
      await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
    }
  },

  'mushaf-open-settings': () => {
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  // Multi-surah page: pick which surah on these pages to recite.
  'mushaf-play-pick': async () => {
    const { buildMushafPlayPick } = await mushafView();
    openModal(buildMushafPlayPick(store.getState()), {
      labelledBy: 'modal-title-mushaf-pick',
    });
  },

  'practice-open': async () => {
    await ensureTajweedPool(store.getState());
    openPracticePicker();
  },

  'practice-mode': (ds) => {
    // 'classify' joins the two tap modes: a third round type, reachable.
    if (!TAJWEED_QUIZ_MODES.includes(ds.mode)) return;
    rt.practicePickerMode = ds.mode;
    openPracticePicker();
  },

  'practice-start': async (ds) => {
    const mode = ds.mode || rt.practicePickerMode;
    if (mode === 'classify') {
      await startClassifyRound(ds.rule || 'mixed');
      return;
    }
    await startPracticeRound(ds.rule, mode);
  },

  // (v5.17.19) Tajweed course. The spine is pure data; these four actions
  // are the whole bridge to it, and every one validates its input rather
  // than trusting a data-attribute from a crafted DOM.
  'tajweed-course-toggle-done': (ds) => {
    const { findSession, sanitizeTajweedCourseProgress } = COURSE;
    const session = findSession(String(ds.session || ''));
    if (!session) return;
    const current = sanitizeTajweedCourseProgress(store.getState().tajweedCourseProgress);
    const next = { ...current };
    if (next[session.id]) delete next[session.id];
    else next[session.id] = { at: Date.now() };
    store.dispatch(actions.setTajweedCourseProgress(next));
    // (merged-plan item 2) touching a session marks the lesson last-place,
    // studied or unmarked — the reader was here either way.
    store.dispatch(actions.setTajweedLast({ sessionId: session.id }));
  },
  'tajweed-course-drill-rule': async (ds) => {
    // The rule chip is the precise action: one chip, one rule, one round.
    const rule = String(ds.rule || '');
    store.dispatch(actions.setTajweedLast({ ruleId: rule }));
    await startPracticeRound(rule, rt.practicePickerMode || 'find-spans');
  },
  'tajweed-course-drill': async (ds) => {
    // Session-level drill, only offered where a session maps to ONE round.
    // A mixed session uses the mixed pool; anything else would be silently
    // choosing one of several rules, so the handler refuses instead.
    // Spread sessions (makharij/sifat counts) are refused for the same
    // reason one step further: drilling them would resolve a disagreement
    // the course exists to show, so the view offers no button and this
    // guard covers a crafted DOM.
    const session = COURSE.findSession(String(ds.session || ''));
    if (!session || !COURSE.isDrivable(session)) return;
    // (merged-plan item 2) a drill starts from its lesson; a single-focus
    // session also names its rule. Mixed names no rule (it is every rule).
    store.dispatch(actions.setTajweedLast({ sessionId: session.id }));
    const focus = session.focus || [];
    if (session.mixed) {
      await startPracticeRound('mixed', rt.practicePickerMode || 'find-spans');
      return;
    }
    if (focus.length !== 1) return;
    await startPracticeRound(focus[0], rt.practicePickerMode || 'find-spans');
  },

  // (v5.10.1) guided rule lesson: validate the id, ensure the pool, and
  // open the lesson modal with pool-drawn examples (never invented refs).
  'practice-lesson': async (ds) => {
    const { tajweedLessonRule, tajweedLessonExamples } =
      await import('../../domain/tajweedLessons.js');
    const rule = tajweedLessonRule(ds.rule);
    if (!rule) return;
    // (merged-plan item 2) opening a rule lesson marks the rule last-place.
    store.dispatch(actions.setTajweedLast({ ruleId: rule.id }));
    await ensureTajweedPool(store.getState());
    const { buildPracticeLesson } = await import('../../views/tajweedPracticeView.js');
    const examples = tajweedLessonExamples(store.getState().tajweedPool, rule.id);
    openModal(buildPracticeLesson(store.getState(), rule.id, examples), {
      labelledBy: 'modal-title-practice',
    });
  },

  'practice-tap': (ds) => {
    if (!rt.practiceSession || rt.practiceSession.checked) return;
    const session = rt.practiceSession;
    if (session.answerMode === 'find-word') {
      const word = Number(ds.word);
      const count = session.text.trim().split(/\s+/).filter(Boolean).length;
      if (!Number.isInteger(word) || word < 1 || word > count) return;
      if (session.selected.has(word)) session.selected.delete(word);
      else session.selected.add(word);
    } else {
      const key = `${ds.word}:${ds.start}:${ds.end}`;
      if (session.selected.has(key)) session.selected.delete(key);
      else session.selected.add(key);
    }
    renderPracticeRound();
  },

  'practice-check': () => {
    if (!rt.practiceSession || rt.practiceSession.checked) return;
    const session = rt.practiceSession;
    const result =
      session.answerMode === 'find-word'
        ? scoreWordRound(session.targetWords, session.selected)
        : scoreRound(session.targets, session.selected);
    session.checked = true;
    session.result = result;
    store.dispatch(
      actions.recordTajweedPracticeResult(session.targetRuleId || session.ruleId, result.perfect)
    );
    if (Array.isArray(session.results)) {
      session.results.push({
        perfect: result.perfect,
        ruleId: session.targetRuleId || session.ruleId,
      });
    }
    session.roundStreak = result.perfect ? (session.roundStreak || 0) + 1 : 0;
    renderPracticeRound();
  },

  'practice-next': async () => {
    if (!rt.practiceSession) return;
    await advancePracticeRound();
  },

  // (v5.17.20) The classify round. Validation lives in answerClassify: an
  // option that is not on the question is a crafted click, not an answer.
  'practice-classify': (ds) => {
    answerClassify(String(ds.rule || ''));
  },
  'practice-classify-next': () => {
    advanceClassifyRound();
  },

  'practice-review': async (ds) => {
    await startPracticeRound('review', ds?.mode || rt.practicePickerMode);
  },

  'practice-this-ayah': async (ds) => {
    // (B11) dataset values are hostile: clamp at the edge like
    // mushaf-open-in-study so a forged value can never reach the
    // template interpolations or the practice session.
    const surah = parseInt(ds.surah, 10);
    const ayah = parseInt(ds.ayah, 10);
    if (!(surah >= 1 && surah <= 114) || !(ayah >= 1 && ayah <= 286)) return;
    const state = store.getState();
    const surahDoc = state.quran.surahs[String(surah)];
    const ayahText = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayah))?.text;
    if (!ayahText) return;
    // (v5.9.0) nearest-ayah fallback: a rule-less ayah no longer dead-ends
    // with a toast — the round starts on the closest ayah in the SAME
    // surah that carries marked rules (outward scan, nearer wins, earlier
    // wins ties), and the toast names the substitute honestly. A surah
    // with no marked rules anywhere keeps the original toast.
    let useAyah = ayah;
    let useText = ayahText;
    let targets = buildAnswerKey(ayahText, 'mixed');
    if (!targets.length && Array.isArray(surahDoc?.ayahs)) {
      const textByNum = new Map(surahDoc.ayahs.map((a) => [String(a.number), a.text]));
      for (let d = 1; d < surahDoc.ayahs.length && !targets.length; d += 1) {
        for (const cand of [ayah - d, ayah + d]) {
          const txt = textByNum.get(String(cand));
          if (!txt) continue;
          const tg = buildAnswerKey(txt, 'mixed');
          if (tg.length) {
            useAyah = cand;
            useText = txt;
            targets = tg;
            break;
          }
        }
      }
      if (targets.length) {
        showToast(t('practice.nearestAyah', state.settings.language, { s: surah, a: useAyah }));
      }
    }
    if (!targets.length) {
      showToast(t('practice.nothingHere', state.settings.language));
      return;
    }
    rt.practiceSession = {
      ruleId: 'mixed',
      answerMode: 'find-spans',
      targetRuleId: 'mixed',
      mode: 'single',
      surah,
      ayah: useAyah,
      text: useText,
      selected: new Set(),
      checked: false,
      targets,
      targetWords: buildWordAnswerKey(useText, 'mixed'),
      result: null,
      results: [],
      roundStreak: 0,
    };
    renderPracticeRound();
  },

  'mushaf-set-font': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ font: ds.font }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'mushaf-set-paper': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ paper: ds.paper }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  // (v5.2.68) default tafsir source picker (Settings → Compare section).
  // Hostile ids clamp to a short string; the tabs resolve unknown ids to
  // book order at render, so a stale pick can never blank the panel.
  'mushaf-set-tafsir': (ds) => {
    const id = String(ds.edition || '').slice(0, 40);
    if (!id) return;
    store.dispatch(actions.updateMushafPrefs({ defaultTafsir: id }));
  },
  /* ------- (v4.6.0) Tajweed rules & colors ------- */

  'tajweed-open-settings': () => {
    openModal(buildTajweedSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-tajweed-settings',
    });
  },

  'tajweed-set-color': (ds) => {
    const prefs = tajweedPrefsOf(store.getState());
    const colors = { ...(prefs.colors || {}), [ds.family]: ds.color };
    store.dispatch(actions.updateSettings({ tajweedPrefs: { ...prefs, colors } }));
    applyTajweedColors(store.getState());
    openModal(buildTajweedSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-tajweed-settings',
    });
  },

  'tajweed-toggle-rule': (ds) => {
    const prefs = tajweedPrefsOf(store.getState());
    const rules = { ...(prefs.rules || {}) };
    if (rules[ds.rule] === false) delete rules[ds.rule];
    else rules[ds.rule] = false;
    store.dispatch(actions.updateSettings({ tajweedPrefs: { ...prefs, rules } }));
    openModal(buildTajweedSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-tajweed-settings',
    });
  },

  'tajweed-reset': () => {
    store.dispatch(actions.updateSettings({ tajweedPrefs: {} }));
    applyTajweedColors(store.getState());
    const lang = store.getState().settings.language;
    openModal(buildTajweedSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-tajweed-settings',
    });
    showToast(t('tajweed.resetDone', lang));
  },

  'mushaf-set-bismillah': (ds) => {
    store.dispatch(actions.updateMushafPrefs({ bismillahStyle: ds.style }));
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  'mushaf-toggle-bookmark': async (ds) => {
    // (B11) same edge cladding: forged data-surah/data-ayah/data-page
    // must not reach the stored bookmark or the re-opened study modal.
    // Canonical strings keep the stored shape identical for honest input.
    const surah = parseInt(ds.surah, 10);
    const ayah = parseInt(ds.ayah, 10);
    if (!(surah >= 1 && surah <= 114) || !(ayah >= 1 && ayah <= 286)) return;
    const page = clampPage(ds.page);
    const key = `${surah}:${ayah}`;
    const state = store.getState();
    const wasMarked = state.ayahBookmarks.some((b) => b.key === key);
    store.dispatch(actions.toggleAyahBookmark(key, String(surah), String(ayah), page));
    // Keep the modal open and re-render its content in place so the person
    // can also listen/copy right after (un)bookmarking without losing context.
    await openAyahStudy(surah, ayah, page);
    const lang = store.getState().settings.language;
    showToast(t(wasMarked ? 'mushaf.bookmarkRemoved' : 'mushaf.bookmarkAdded', lang));
  },

  'mushaf-open-bookmarks': async () => {
    const { buildMushafBookmarks } = await mushafView();
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-remove-bookmark': async (ds) => {
    const { buildMushafBookmarks } = await mushafView();
    store.dispatch(actions.removeAyahBookmark(ds.key));
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-reset-progress': async () => {
    const { buildMushafTrack } = await mushafView();
    const lang = store.getState().settings.language;
    store.dispatch(actions.resetMushafProgress());
    openModal(buildMushafTrack(store.getState()), { labelledBy: 'modal-title-mushaf-track' });
    showToast(t('mushaf.khatmaResetDone', lang));
  },

  'khatma-open-plan': async () => {
    const { buildKhatmaPlanForm } = await mushafView();
    openModal(buildKhatmaPlanForm(store.getState()), { labelledBy: 'modal-title-khatma-plan' });
  },

  'khatma-clear-plan': async () => {
    const { buildMushafTrack } = await mushafView();
    // Removing the schedule never touches reading progress — say so.
    store.dispatch(actions.clearKhatmaPlan());
    openModal(buildMushafTrack(store.getState()), { labelledBy: 'modal-title-mushaf-track' });
    showToast(t('khatma.planCleared', store.getState().settings.language));
  },

  'mushaf-copy-ayah': async (ds) => {
    const lang = store.getState().settings.language;
    try {
      await navigator.clipboard.writeText(`${ds.text}\n\n\u2014 ${ds.surah}:${ds.ayah}`);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  'play-ayah': async (ds) => {
    if (!ds.url && !ds.key) return;
    if (recitation.isPlaying(ds.key) || surahPlayback.isActive()) {
      surahPlayback.stop();
      if (recitation.isPlaying(ds.key)) recitation.stop();
    } else {
      // FIX (review A3): one voice at a time. v5.17.43 — the pause-the-player
      // branch handled one of four other voices; TTS and a dhikr clip spoke
      // over the tapped ayah.
      claimSpeaker('verse');
      // (v5.2.61) offline-first single verses: the key carries surah:ayah,
      // so a stored Blob wins over the rendered CDN url (which stays the
      // fallback when nothing is stored).
      // (v5.10.4) mirror walk: the rendered data-url is ONE primary-CDN
      // file — on a flaky connection that single file's death was the
      // whole story ("تعذّر التشغيل" on every tap). Build the full
      // ordered candidate list and let recitation.play() walk it silently,
      // toasting only when every mirror is spent.
      let urls = [];
      const [s, a] = String(ds.key || '')
        .split(':')
        .map(Number);
      if (Number.isFinite(s) && Number.isFinite(a)) {
        const st = store.getState();
        const g = globalAyahNumber(st.quran.meta?.surahs, s, a);
        if (g != null) {
          try {
            const blob = await getVerseAudio(st.settings.reciter, g);
            if (blob) urls = [URL.createObjectURL(blob)];
          } catch {
            /* storage failure reads as streaming */
          }
        }
        if (!urls.length) {
          const st2 = store.getState();
          const g2 = globalAyahNumber(st2.quran.meta?.surahs, s, a);
          urls = verseAudioCandidates(st2.settings.reciter, s, a, g2);
          if (ds.url && !urls.includes(ds.url)) urls.push(ds.url);
        }
      } else if (ds.url) {
        urls = [ds.url];
      }
      if (!urls.length) return;
      recitation.play(urls, ds.key);
    }
  },
};

/** change/input registries (Blueprint D): { sel, run(ds, el, e) }. */
export const changeHandlers = [
  {
    // (v5.17.19) Guided vs open access. A change handler, not a click handler:
    // a radio's value lives on the element, and the change pipeline is where
    // the app reads el.value after the browser has actually toggled it. Read
    // from `ds` this stays undefined and the switch silently does nothing.
    sel: '[data-action="tajweed-course-mode"]',
    run: (ds, el) => {
      const mode = String(el?.value || '');
      if (mode !== 'guided' && mode !== 'open') return;
      // A preference, not a capability gate: switching never touches progress.
      store.dispatch(actions.updateSettings({ tajweedPathMode: mode }));
    },
  },

  {
    sel: '[data-bind="bookmark-folder"]',
    run: async (ds, el) => {
      const { buildMushafBookmarks } = await mushafView();
      store.dispatch(actions.updateAyahBookmark(ds.key, { folderId: el.value || null }));
      openModal(buildMushafBookmarks(store.getState()), {
        labelledBy: 'modal-title-mushaf-bookmarks',
      });
    },
  },
];

export const inputHandlers = [
  {
    sel: '[data-bind="bookmark-note"]',
    run: (ds, el) => {
      // Modal inputs live outside #main, so re-renders never steal focus
      // here — dispatch straight through with no refocus dance.
      // Debounced: every keystroke used to dispatch a full re-render of
      // the underlying view plus a scheduled full-state persist. Same
      // keyed-timer pattern as the zakat inputs.
      const key = String(ds.key || '');
      const value = el.value;
      clearTimeout(rt.bookmarkNoteTimer);
      rt.bookmarkNoteTimer = setTimeout(() => {
        store.dispatch(actions.updateAyahBookmark(key, { note: value }));
      }, 250);
    },
  },
];
