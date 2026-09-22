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
  ensureWordDict,
  ensureRootsMeaning,
  openAyahStudy,
} from '../lazyData.js';
import {
  renderPracticeRound,
  startPracticeRound,
  advancePracticeRound,
  openPracticePicker,
} from '../practice.js';

import { MUSHAF_META_URL, VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go, replaceGo } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { getVerseAudio } from '../../services/audioStore.js';
import { buildAnswerKey, scoreRound } from '../../domain/tajweedPractice.js';
import { setSessionFlag, setSessionValue } from '../../domain/sessionFlags.js';
import { getWord, dictEntryFor, wordBookmarkKey } from '../../domain/wordStudy.js';
import * as speech from '../../services/speech.js';
import { shareAyahCard } from './items.js';
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
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as player from '../../services/player.js';
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

/**
 * (v5.2.75, UP-01) resolve the tapped word exactly like the popup does
 * (surface-anchored via getWord), so per-word actions never operate on a
 * different word than the one shown. Returns { word, key } or null.
 */
function resolveTappedWord(ds, target) {
  const key = wordBookmarkKey(ds.surah, ds.ayah, ds.i);
  if (!key) return null;
  const state = store.getState();
  const surface = target?.textContent?.trim().slice(0, 140) || null;
  const word = getWord(state.quranWords, ds.surah, ds.ayah, Number(ds.i), surface);
  if (!word || typeof word.text !== 'string' || !word.text) return null;
  return { word, key };
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
    // (GROWTH-01 delight 2) one-shot resume: opening the bookmarked surah
    // retires the Home continue card for this session (session flag, never
    // persisted — the bookmark itself is untouched).
    if (String(ds.surah) === String(state.quranBookmark?.surah)) setSessionFlag('continueResumed');
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
    // (v5.5.0) Bismillah taps (data-ayah="0") redirect onto the real
    // 1:1 grammar records — the four words are identical, so the popup
    // answers with genuine i'rab/sarf/root instead of an empty token
    // shell. Index-clamped at the edge like every other tap path.
    if (String(ds.ayah) === '0') {
      const bi = Number(ds.i);
      if (!(bi >= 1 && bi <= 4)) return;
      const surface = target?.textContent?.trim().slice(0, 140) || null;
      store.dispatch(actions.openWordStudy(1, 1, bi, surface));
      await ensureQuranWordsData(store.getState(), 1);
      await ensureQuranRoots(store.getState());
      await ensureWordDict();
      await ensureRootsMeaning();
      if (!store.getState().quran.surahs['1']) {
        try {
          await dispatchSurahDoc('1');
        } catch (err) {
          console.error('[wordStudy] failed to load surah text', 1, err);
        }
      }
      openModal(buildWordStudyPanel(store.getState()), { labelledBy: 'modal-title-word-study' });
      return;
    }
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
    // (v5.2.75, UP-01) the lemma-dict tier rides the same open (one fetch
    // per session; the popup omits Meanings until it lands).
    await ensureWordDict();
    // (v5.6.0) the root-meaning tier rides alongside (one fetch per
    // session; the root block shows an honest hint until it lands).
    await ensureRootsMeaning();
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

  // Word share reuses the ayah-card canvas: the containing ayah is the
  // honest shareable unit, giving the word its context.
  'word-share': async (ds) => {
    await shareAyahCard(ds.surah, ds.ayah);
  },

  'word-bookmark': (ds) => {
    const key = wordBookmarkKey(ds.surah, ds.ayah, ds.i);
    if (!key) return;
    store.dispatch(actions.toggleWordBookmark(key));
    const marked = store.getState().wordBookmarks?.[key] === true;
    showToast(
      t(marked ? 'wordStudy.bookmarked' : 'wordStudy.bookmark', store.getState().settings.language)
    );
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
    await openAyahStudy(ds.surah, ds.ayah, null);
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

  'practice-start': async (ds) => {
    await startPracticeRound(ds.rule);
  },

  // (v5.10.1) guided rule lesson: validate the id, ensure the pool, and
  // open the lesson modal with pool-drawn examples (never invented refs).
  'practice-lesson': async (ds) => {
    const { tajweedLessonRule, tajweedLessonExamples } =
      await import('../../domain/tajweedLessons.js');
    const rule = tajweedLessonRule(ds.rule);
    if (!rule) return;
    await ensureTajweedPool(store.getState());
    const { buildPracticeLesson } = await import('../../views/tajweedPracticeView.js');
    const examples = tajweedLessonExamples(store.getState().tajweedPool, rule.id);
    openModal(buildPracticeLesson(store.getState(), rule.id, examples), {
      labelledBy: 'modal-title-practice',
    });
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
    const session = rt.practiceSession;
    const result = scoreRound(session.targets, session.selected);
    session.checked = true;
    session.result = result;
    // (v5.4.0, P0-5b) one dispatch records BOTH memories: stats
    // (streak/accuracy) and — for real rule ids only — the weak-rule map
    // (miss upsert / re-learned clear; the reducer skips 'mixed'/'review'
    // since neither is a TAJWEED_RULES id). The round HUD rides the
    // session's own results/roundStreak (single mode carries them too,
    // so the ack path never branches on shape).
    store.dispatch(actions.recordTajweedPracticeResult(session.ruleId, result.perfect));
    if (Array.isArray(session.results)) session.results.push({ perfect: result.perfect });
    session.roundStreak = result.perfect ? (session.roundStreak || 0) + 1 : 0;
    renderPracticeRound();
  },

  'practice-next': async () => {
    if (!rt.practiceSession) return;
    await advancePracticeRound();
  },

  'practice-review': async () => {
    await startPracticeRound('review');
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
      mode: 'single',
      surah,
      ayah: useAyah,
      text: useText,
      selected: new Set(),
      checked: false,
      targets,
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
      // FIX (review A3): one voice at a time — starting a verse pauses the
      // full-surah player (kept in the bar, resumable).
      const p = store.getState().player;
      if (p?.moshafId && p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      }
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
