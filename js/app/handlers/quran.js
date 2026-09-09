import { rt } from '../../app/rt.js';
import { fetchJSON } from '../net.js';
import { playFlipSound } from '../inputs.js';
import { dispatchSurahDoc } from '../quranData.js';
import {
  currentAyahDetailPage,
  ensureQuranRoots,
  ensureQuranWordsData,
  ensureTafsirText,
  ensureTajweedPool,
  openAyahStudy,
} from '../lazyData.js';
import { renderPracticeRound, startPracticeRound } from '../practice.js';

import { MUSHAF_META_URL, VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { buildAnswerKey, scoreRound } from '../../domain/tajweedPractice.js';
import {
  clampPage,
  prevPage as mushafPrevPage,
  nextPage as mushafNextPage,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
} from '../../services/mushaf.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { buildPracticePicker } from '../../views/tajweedPracticeView.js';
import * as player from '../../services/player.js';
import * as recitation from '../../services/recitation.js';
import * as surahPlayback from '../../services/surahPlayback.js';
import {
  buildKhatmaPlanForm,
  buildMushafBookmarks,
  buildMushafJump,
  buildMushafPlayPick,
  buildMushafSheet,
  buildMushafTrack,
  setFlipDirection,
  setFullscreenAnim,
} from '../../views/mushafReader.js';
import { requestMushafNativeFullscreen, releaseMushafNativeFullscreen } from '../fullscreen.js';
import { expandReaderWindow } from '../../views/quran.js';
import { buildMushafSettingsPanel, buildWordStudyPanel } from '../../views/tafsirPanel.js';
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
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

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
  'mushaf-more': () => {
    openModal(buildMushafSheet(store.getState()), { labelledBy: 'modal-title-mushaf-sheet' });
  },

  // (v4.2) classic-reader windowing: extend the visible ayah window by one
  // page of ~30 and re-render. The cheap nudge action is the established
  // pattern (same as the ticker rollovers).
  'quran-window-expand': (ds) => {
    expandReaderWindow(ds.dir === 'up' ? 'up' : 'down');
    store.dispatch(actions.setSpeakingItem(null));
  },
  'mushaf-prev': () => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    // (v4.5) a spread turns TWO pages at once, from its right page; a
    // single page turns one. null = already at the book's start.
    const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
    const right = spreadOn ? spreadRightPage(page) : page;
    const dest = spreadOn ? prevSpreadPage(right) : mushafPrevPage(page);
    if (dest == null) return;
    setFlipDirection('prev');
    playFlipSound();
    go(VIEWS.MUSHAF, { page: String(dest) });
  },

  'mushaf-next': () => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
    const right = spreadOn ? spreadRightPage(page) : page;
    const dest = spreadOn ? nextSpreadPage(right) : mushafNextPage(page);
    if (dest == null) return;
    setFlipDirection('next');
    playFlipSound();
    go(VIEWS.MUSHAF, { page: String(dest) });
  },

  'mushaf-open-jump': () => {
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
  },

  // Khatma progress lives in its own TRACK panel (opened from the ⋯ sheet),
  // never inside the Jump drawer — navigation stays pure navigation.
  'mushaf-open-track': () => {
    openModal(buildMushafTrack(store.getState()), { labelledBy: 'modal-title-mushaf-track' });
  },

  'mushaf-jump-page': (ds) => {
    closeModal();
    const state = store.getState();
    const page = clampPage(ds.page);
    // (v4.5) in a spread, a jump to an even page aligns down to the odd
    // right page whose spread contains it — page 200 is the LEFT page of
    // the 199|200 spread.
    const dest = mushafSpreadActive(state.settings.mushafPrefs) ? spreadRightPage(page) : page;
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
    go(VIEWS.MUSHAF, { page: String(page) });
  },

  'mushaf-ayah-tap': async (ds) => {
    const state = store.getState();
    const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
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
    const surah = ds.surah,
      ayah = ds.ayah,
      i = Number(ds.i);
    // (v5.3.0) the tapped surface anchors popup resolution for the
    // handful of true spelling-split ayahs (37:164 etc.) where even
    // canonical indices diverge between sources.
    const surface = target?.textContent?.trim().slice(0, 140) || null;
    store.dispatch(actions.openWordStudy(surah, ayah, i, surface));
    await ensureQuranWordsData(store.getState(), surah);
    await ensureQuranRoots(store.getState());
    // (v4.6.0) The tajweed section reads the official ayah text from the
    // classic reader's surah docs — which the Mushaf never loads on its
    // own. Ensure them (idempotent, cached) so a word tap in the mushaf
    // shows tajweed rules immediately instead of silently omitting them.
    if (!store.getState().quran.surahs[String(surah)]) {
      try {
        await dispatchSurahDoc(String(surah));
      } catch (err) {
        console.error('[wordStudy] failed to load surah text', surah, err);
      }
    }
    openModal(buildWordStudyPanel(store.getState()), { labelledBy: 'modal-title-word-study' });
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

  'tafsir-open': async (ds) => {
    closeModal();
    // (v4.1) Same rule as mushaf-ayah-tap/root-jump: a NEW ayah always
    // starts from the default tafsir source. The word-study shortcut used
    // to inherit the previous ayah's tab — including possibly an unloaded
    // remote edition — while direct taps reset. One intent, one behavior.
    store.dispatch(actions.setMushafSession({ tafsirTab: null }));
    await openAyahStudy(ds.surah, ds.ayah, null);
  },

  'tafsir-tab': async (ds) => {
    store.dispatch(actions.setMushafSession({ tafsirTab: ds.edition }));
    await ensureTafsirText(store.getState(), ds.edition, ds.surah);
    await openAyahStudy(ds.surah, ds.ayah, currentAyahDetailPage(ds.surah, ds.ayah));
  },

  // Tafsir compare: a second source under the active tab. Tapping the
  // active pick turns compare off. Re-opens the study modal in place so
  // the new column renders immediately (same pattern as tafsir-tab).
  'tafsir-compare': async (ds) => {
    const cur = store.getState().settings.tafsirCompareB || null;
    const next = ds.edition && ds.edition !== cur ? ds.edition : null;
    store.dispatch(actions.updateSettings({ tafsirCompareB: next }));
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

  'mushaf-open-settings': () => {
    openModal(buildMushafSettingsPanel(store.getState()), {
      labelledBy: 'modal-title-mushaf-settings',
    });
  },

  // Multi-surah page: pick which surah on these pages to recite.
  'mushaf-play-pick': () => {
    openModal(buildMushafPlayPick(store.getState()), {
      labelledBy: 'modal-title-mushaf-pick',
    });
  },

  'practice-open': async () => {
    await ensureTajweedPool(store.getState());
    openModal(buildPracticePicker(store.getState()), { labelledBy: 'modal-title-practice' });
  },

  'practice-start': async (ds) => {
    await startPracticeRound(ds.rule);
  },

  'practice-tap': (ds) => {
    if (!rt.practiceSession || rt.practiceSession.checked) return;
    const key = `${ds.word}:${ds.start}:${ds.end}`;
    if (rt.practiceSession.selected.has(key)) rt.practiceSession.selected.delete(key);
    else rt.practiceSession.selected.add(key);
    renderPracticeRound();
  },

  'practice-check': () => {
    if (!rt.practiceSession || rt.practiceSession.checked) return;
    const result = scoreRound(rt.practiceSession.targets, rt.practiceSession.selected);
    rt.practiceSession.checked = true;
    rt.practiceSession.result = result;
    store.dispatch(actions.recordTajweedPracticeResult(rt.practiceSession.ruleId, result.perfect));
    renderPracticeRound();
  },

  'practice-next': async () => {
    if (!rt.practiceSession) return;
    await startPracticeRound(rt.practiceSession.ruleId);
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
    const targets = buildAnswerKey(ayahText, 'mixed');
    if (!targets.length) {
      showToast(t('practice.nothingHere', state.settings.language));
      return;
    }
    rt.practiceSession = {
      ruleId: 'mixed',
      surah,
      ayah,
      text: ayahText,
      selected: new Set(),
      checked: false,
      targets,
      result: null,
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

  'mushaf-open-bookmarks': () => {
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-remove-bookmark': (ds) => {
    store.dispatch(actions.removeAyahBookmark(ds.key));
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  },

  'mushaf-reset-progress': () => {
    const lang = store.getState().settings.language;
    store.dispatch(actions.resetMushafProgress());
    openModal(buildMushafTrack(store.getState()), { labelledBy: 'modal-title-mushaf-track' });
    showToast(t('mushaf.khatmaResetDone', lang));
  },

  'khatma-open-plan': () => {
    openModal(buildKhatmaPlanForm(store.getState()), { labelledBy: 'modal-title-khatma-plan' });
  },

  'khatma-clear-plan': () => {
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

  'play-ayah': (ds) => {
    if (!ds.url) return;
    if (recitation.isPlaying(ds.key) || surahPlayback.isActive()) {
      surahPlayback.stop();
      if (recitation.isPlaying(ds.key)) recitation.stop();
    } else {
      // FIX (review A3): one voice at a time — starting a verse pauses the
      // full-surah player (kept in the bar, resumable).
      const p = store.getState().player;
      if (p?.moshafId && p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      }
      recitation.play(ds.url, ds.key);
    }
  },
};

/** change/input registries (Blueprint D): { sel, run(ds, el, e) }. */
export const changeHandlers = [
  {
    sel: '[data-bind="bookmark-folder"]',
    run: (ds, el) => {
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
