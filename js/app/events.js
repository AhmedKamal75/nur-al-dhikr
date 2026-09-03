import { rt } from './rt.js';
import { formatCountdown } from '../domain/ramadan.js';
import { closeNavDrawer } from './drawer.js';
import { handleAdhanImport, handleImportFile } from './fileImports.js';
import { handleFocusKeydown, navigateFocusAdjacent } from './focusRuntime.js';
import { handlePromptForm, formHandlers } from './forms.js';
import {
  clampSliderNum,
  debounceHadithQuery,
  debounceQuranSearchNavigate,
  debounceRootsSearchNavigate,
  debounceSearchNavigate,
  handleZakatInput,
  playFlipSound,
} from './inputs.js';

import { VIEWS } from '../core/config.js';
import { t } from '../core/i18n.js';

import { go } from '../core/router.js';
import { actions, store } from '../core/state.js';
import { vibrate, clamp } from '../core/utils.js';
import {
  clampPage,
  prevPage as mushafPrevPage,
  nextPage as mushafNextPage,
  mushafSpreadActive,
  spreadRightPage,
  nextSpreadPage,
  prevSpreadPage,
  setMushafWideLayout,
} from '../services/mushaf.js';
import { playSound } from '../services/prayerSound.js';
import { closeModal, openModal, isModalOpen } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import * as player from '../services/player.js';
import * as recitation from '../services/recitation.js';
import { clickHandlers as navClick } from './handlers/navigation.js';
import { clickHandlers as itemsClick } from './handlers/items.js';
import { clickHandlers as systemClick } from './handlers/system.js';
import { clickHandlers as locationClick } from './handlers/location.js';
import { clickHandlers as quizClick } from './handlers/quiz.js';
import { clickHandlers as quranClick } from './handlers/quran.js';
import { clickHandlers as quranAudioClick } from './handlers/quranAudio.js';
import { clickHandlers as hifzClick } from './handlers/hifz.js';
import { clickHandlers as worshipClick } from './handlers/worship.js';
import { clickHandlers as zakatClick } from './handlers/zakat.js';
import { clickHandlers as audioClick } from './handlers/audio.js';
import { clickHandlers as tasbihClick } from './handlers/tasbih.js';
import { clickHandlers as editorClick } from './handlers/editor.js';
import { clickHandlers as contentClick } from './handlers/content.js';
import { clickHandlers as viewMenusClick } from './handlers/viewMenus.js';
import { setItemTarget } from '../services/contentPrefs.js';
import { clickHandlers as journalClick } from './handlers/journal.js';
import { buildMushafBookmarks, setFlipDirection } from '../views/mushafReader.js';
import { buildMushafSettingsPanel } from '../views/tafsirPanel.js';
import { initFullscreenSync, resetFsControlsIdleTimer } from './fullscreen.js';

/**
 * app/events.js — THE single delegated event listener. Click, change,
 * input, submit, and keydown on document resolve [data-action] /
 * [data-bind] / [data-form] attributes into the merged handler maps.
 * Views stay pure string templates; no view ever attaches a listener.
 */

/** (v4.5.2) commit a computed contentPrefs slice in one dispatch. */
const commitPrefs = (prefs) => store.dispatch(actions.updateSettings({ contentPrefs: prefs }));

/** The complete click-dispatch table: one merged view over every
 * feature-scoped handler module. Keys are unique; order is irrelevant. */
const clickHandlers = {
  ...navClick,
  ...itemsClick,
  ...systemClick,
  ...locationClick,
  ...quizClick,
  ...quranClick,
  ...quranAudioClick,
  ...hifzClick,
  ...worshipClick,
  ...zakatClick,
  ...audioClick,
  ...tasbihClick,
  ...editorClick,
  ...contentClick,
  ...viewMenusClick,
  ...journalClick,
};

// (v4.3) test surface: the merged table and its source maps are exported so
// a gate test can prove the merge is collision-free (a duplicated key
// across two feature modules silently overwrites one handler — the dead-UI
// bug class this app has shipped twice).
export const handlerMaps = [
  ['navigation', navClick],
  ['content', contentClick],
  ['items', itemsClick],
  ['system', systemClick],
  ['location', locationClick],
  ['quiz', quizClick],
  ['quran', quranClick],
  ['quranAudio', quranAudioClick],
  ['hifz', hifzClick],
  ['worship', worshipClick],
  ['zakat', zakatClick],
  ['audio', audioClick],
  ['tasbih', tasbihClick],
  ['editor', editorClick],
  ['viewMenus', viewMenusClick],
  ['journal', journalClick],
];
export const mergedClickHandlers = clickHandlers;

/**
 * Rejection boundary for delegated handlers. Every user action in the app
 * flows through one of two dispatch calls below; before v4.1 neither
 * awaited nor caught, so any async throw (~30 handlers: surah-play,
 * audio-download-all, adhan import…) escaped as an unhandled rejection —
 * the tap silently did nothing (this is exactly how the broken adhan
 * import path shipped unnoticed). Now every failure is logged with its
 * action name and surfaced as a toast.
 */
function reportHandlerError(action, err) {
  console.error('[events] handler failed:', action, err);
  showToast(t('common.error', store.getState().settings.language));
}

function dispatchHandler(action, ds, e, target) {
  const handler = clickHandlers[action];
  if (!handler) return;
  try {
    const result = handler(ds, e, target);
    if (result && typeof result.catch === 'function') {
      result.catch((err) => reportHandlerError(action, err));
    }
  } catch (err) {
    reportHandlerError(action, err);
  }
}

/* Global event delegation                                             */
/* ------------------------------------------------------------------ */

export function bindGlobalEvents() {
  // (v4.4) TRUE fullscreen Mushaf: browser-exit sync + wake-lock re-arm.
  initFullscreenSync();
  // (v4.4) Control auto-fade: any pointer/key activity in a fullscreen
  // session brings the bar back and re-arms the fade timer. pointermove
  // covers mouse approach; pointerdown covers TOUCH — a stationary tap
  // fires no pointermove at all, so without it the first tap on a faded
  // bar fell through to the page and the bar only woke on the SECOND tap.
  document.addEventListener('pointermove', resetFsControlsIdleTimer, { passive: true });
  document.addEventListener('pointerdown', resetFsControlsIdleTimer, { passive: true });
  document.addEventListener('keydown', resetFsControlsIdleTimer);

  // (v4.5) Double-page spread: ONE source of truth for "is the viewport
  // wide enough for facing pages" — set once at boot and re-set on every
  // breakpoint crossing, with a cheap re-render nudge so an open Mushaf
  // picks the spread up (or drops it) without needing a navigation.
  try {
    const wideMQ = window.matchMedia?.('(min-width: 900px)');
    if (wideMQ) {
      setMushafWideLayout(wideMQ.matches);
      const onWideChange = (ev) => {
        setMushafWideLayout(ev.matches);
        const state = store.getState();
        if (state.activeView === VIEWS.MUSHAF) {
          store.dispatch(
            actions.setMushafBookmark(
              clampPage(state.activeParams.page || state.mushafBookmark.page || 1)
            )
          );
        }
      };
      if (typeof wideMQ.addEventListener === 'function')
        wideMQ.addEventListener('change', onWideChange);
      else if (typeof wideMQ.addListener === 'function') wideMQ.addListener(onWideChange);
    }
  } catch {
    /* matchMedia unavailable — the single-page layout stands */
  }

  // (v4.5) Desktop text zoom: ctrl + wheel over the Mushaf scales the
  // persisted font size (the mouse/trackpad equivalent of the pinch) —
  // the same value the settings slider owns, clamped to its full range.
  document.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey || store.getState().activeView !== VIEWS.MUSHAF) return;
      e.preventDefault();
      const current = Number(store.getState().settings.mushafPrefs.fontScale) || 1;
      const next = clamp(current + (e.deltaY < 0 ? 0.08 : -0.08), 0.6, 2.2);
      if (next !== current) {
        store.dispatch(actions.updateMushafPrefs({ fontScale: Math.round(next * 100) / 100 }));
      }
    },
    { passive: false }
  );

  document.addEventListener('click', (e) => {
    // (v4.2) the skip-to-content link must never touch the hash: routing it
    // through the normal hash pipeline treated '#main' as a view name,
    // threw the user to Home, and showed a spurious "error" toast — the one
    // affordance built for keyboard users was a trap. Focus #main directly.
    const skip = e.target.closest?.('a.skip-link');
    if (skip) {
      e.preventDefault();
      document.getElementById('main')?.focus({ preventScroll: false });
      return;
    }
    // Backdrop-click-to-close: only when the overlay itself is the exact element clicked.
    // (Handled first and separately so that closest() below never treats an unrelated
    // descendant — e.g. a modal's submit button — as if it clicked the overlay.)
    if (e.target.classList?.contains('modal-overlay')) {
      recitation.stop();
      closeModal();
      return;
    }

    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'modal-close-overlay') return;

    const handler = clickHandlers[action];
    if (handler) {
      e.preventDefault();
      dispatchHandler(action, target.dataset, e, target);
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target;

    if (target.matches('[data-player-seek]')) {
      const pct = parseFloat(target.value) || 0;
      player.seek((pct / 100) * player.duration());
      return;
    }
    // (v4.5.2) manage-mode target stepper: an inline number input on the
    // card's manage row. Commits the contentPrefs override AND keeps the
    // live counter record in agreement, so the pill re-renders instantly.
    if (target.matches('[data-action="content-set-target"]')) {
      const state = store.getState();
      const prefs = setItemTarget(state, target.dataset.itemId, target.value);
      if (prefs !== state.settings.contentPrefs) {
        commitPrefs(prefs);
        const counter = state.counters[target.dataset.itemId];
        if (counter) {
          store.dispatch(
            actions.setCounter(target.dataset.itemId, {
              ...counter,
              target: prefs.targetOverrides[target.dataset.itemId],
            })
          );
        }
      }
      return;
    }
    if (target.matches('[data-action="toggle-setting"]')) {
      store.dispatch(actions.updateSettings({ [target.dataset.key]: target.checked }));
      return;
    }
    if (target.matches('[data-action="toggle-mushaf-pref"]')) {
      store.dispatch(actions.updateMushafPrefs({ [target.dataset.key]: target.checked }));
      // The legend only shows while tajweed coloring is on, and toggles in
      // general read better with instant feedback — refresh the panel in
      // place rather than waiting for the next unrelated re-render.
      openModal(buildMushafSettingsPanel(store.getState()), {
        labelledBy: 'modal-title-mushaf-settings',
      });
      return;
    }
    if (target.matches('[data-bind="mushaf-font-scale"]')) {
      store.dispatch(
        actions.updateMushafPrefs({ fontScale: clampSliderNum(target.value, 0.6, 2.2) })
      );
      return;
    }
    if (target.matches('[data-bind="mushaf-line-spacing"]')) {
      store.dispatch(
        actions.updateMushafPrefs({ lineSpacing: clampSliderNum(target.value, 0.85, 1.3) })
      );
      return;
    }
    if (target.matches('[data-bind="ramadan-suhoor-offset"]')) {
      const current = store.getState().settings.prayer.ramadanAlerts || {};
      const mins = parseInt(target.value, 10) || 30;
      store.dispatch(
        actions.updatePrayerSettings({ ramadanAlerts: { ...current, suhoorOffset: mins } })
      );
      return;
    }
    if (target.matches('[data-bind="bookmark-folder"]')) {
      store.dispatch(
        actions.updateAyahBookmark(target.dataset.key, { folderId: target.value || null })
      );
      openModal(buildMushafBookmarks(store.getState()), {
        labelledBy: 'modal-title-mushaf-bookmarks',
      });
      return;
    }
    if (target.matches('[data-action="checklist-toggle"]')) {
      store.dispatch(actions.toggleChecklistItem(target.dataset.item));
      const state = store.getState();
      if (state.settings.hapticsEnabled) vibrate(target.checked ? 10 : 6);
      return;
    }
    // (v4.4) Sunnah tracker rows — checkbox change pipeline, same pattern
    // as checklist-toggle (the click delegation would preventDefault the
    // checkbox state away).
    if (target.matches('[data-action="sunnah-toggle"]')) {
      store.dispatch(actions.toggleSunnah(target.dataset.id));
      const state = store.getState();
      if (state.settings.hapticsEnabled) vibrate(target.checked ? 10 : 6);
      return;
    }
    if (target.matches('[data-action="toggle-traveler-mode"]')) {
      const next = target.checked === true;
      store.dispatch(actions.updatePrayerSettings({ travelerMode: next }));
      showToast(
        t(next ? 'traveler.enabled' : 'traveler.disabled', store.getState().settings.language)
      );
      return;
    }
    if (target.matches('[data-action="toggle-reminder"]')) {
      store.dispatch(actions.updateReminder(target.dataset.id, { enabled: target.checked }));
      return;
    }
    if (target.matches('[data-action="collection-picker-toggle"]')) {
      const { collectionId, itemId } = target.dataset;
      if (target.checked) store.dispatch(actions.addToCollection(collectionId, itemId));
      else store.dispatch(actions.removeFromCollection(collectionId, itemId));
      return;
    }
    if (target.matches('[data-bind="dailyGoal"]')) {
      store.dispatch(
        actions.updateSettings({ dailyGoal: Math.max(1, parseInt(target.value, 10) || 100) })
      );
      return;
    }
    if (target.matches('[data-bind="prayer-method"]')) {
      store.dispatch(actions.updatePrayerSettings({ method: target.value }));
      return;
    }
    if (target.matches('[data-bind="prayer-asr"]')) {
      store.dispatch(actions.updatePrayerSettings({ asr: target.value }));
      return;
    }
    if (target.matches('[data-bind="prayer-alert-sound"]')) {
      store.dispatch(actions.updatePrayerSettings({ alertSound: target.value }));
      playSound(target.value);
      return;
    }
    if (target.matches('[data-bind="note-recurrence"]')) {
      const form = target.closest('form');
      form.querySelectorAll('[data-recurrence-group]').forEach((el) => {
        el.hidden = el.dataset.recurrenceGroup !== target.value;
      });
      return;
    }
    if (target.matches('[data-bind="note-reminder-toggle"]')) {
      const form = target.closest('form');
      const group = form.querySelector('[data-reminder-group]');
      if (group) group.hidden = !target.checked;
      return;
    }
    if (target.id === 'backup-file-input' && target.files?.[0]) {
      handleImportFile(target.files[0]);
    }
    if (target.id === 'adhan-file-input' && target.files?.[0]) {
      handleAdhanImport(target.files[0], target.dataset.kind === 'fajr' ? 'fajr' : 'standard');
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    // FIX (review A8): live time preview while dragging the seek range —
    // the seek itself still commits on change (release), so streaming
    // isn't thrashed with range requests, but the thumb never feels dead.
    if (target.matches('[data-player-seek]')) {
      const dur = player.duration();
      const bar = document.querySelector('.player-bar');
      const timeEl = bar?.querySelector('[data-player-time]');
      if (timeEl && dur > 0) {
        const pct = parseFloat(target.value) || 0;
        const n = Math.max(0, Math.floor((pct / 100) * dur));
        timeEl.textContent = formatCountdown(n * 1000);
      }
      return;
    }
    if (target.matches('[data-bind="fontScale"]')) {
      store.dispatch(actions.updateSettings({ fontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="arabicFontScale"]')) {
      store.dispatch(actions.updateSettings({ arabicFontScale: parseFloat(target.value) }));
    } else if (target.matches('[data-bind="search-query"]')) {
      debounceSearchNavigate(target.value);
    } else if (target.matches('[data-bind="quran-search"]')) {
      debounceQuranSearchNavigate(target.value);
    } else if (target.matches('[data-bind="roots-search"]')) {
      debounceRootsSearchNavigate(target.value);
    } else if (target.matches('[data-bind="hadith-query"]')) {
      debounceHadithQuery(target.value);
    } else if (target.matches('[data-bind^="zakat-"]')) {
      handleZakatInput(target);
    } else if (target.matches('[data-bind="bookmark-note"]')) {
      // Modal inputs live outside #main, so re-renders never steal focus
      // here — dispatch straight through with no refocus dance.
      // (v4.2) …but debounced: every keystroke used to dispatch a full
      // re-render of the underlying view (the whole Mushaf page, tajweed
      // classification and all) plus a scheduled full-state persist. Same
      // keyed-timer pattern as the zakat inputs.
      const key = String(target.dataset.key || '');
      const value = target.value;
      clearTimeout(rt.bookmarkNoteTimer);
      rt.bookmarkNoteTimer = setTimeout(() => {
        store.dispatch(actions.updateAyahBookmark(key, { note: value }));
      }, 250);
    } else if (target.matches('[data-bind="audio-search"]')) {
      const v = target.value;
      clearTimeout(rt.audioSearchTimer);
      rt.audioSearchTimer = setTimeout(() => {
        store.dispatch(actions.setAudioManagerQuery(v));
        requestAnimationFrame(() => {
          const input = document.getElementById('audio-search-input');
          if (input && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }, 180);
    }
  });

  document.addEventListener('keydown', (e) => {
    // FIX (review A4/B5): elements exposed as role="button" (Mushaf ayahs)
    // must actually behave like buttons — Enter/Space activates them through
    // the same delegated path a click takes. Real <button>/<a> elements fire
    // native click events and are excluded, as are form fields.
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      e.target instanceof Element &&
      e.target.matches('[role="button"][data-action]') &&
      !e.target.matches('button, a[href], input, select, textarea, [contenteditable="true"]')
    ) {
      e.preventDefault();
      dispatchHandler(e.target.dataset.action, e.target.dataset, e, e.target);
      return;
    }
    // (v4.2) ROVING ARROWS for the big link/button groups (surah list: 114
    // tiles × 2 tab stops, hadith book grid, the Mushaf jump drawer's 144
    // buttons INSIDE a focus-trapped modal). Any container with [data-roving]
    // moves focus between its [data-roving-item] children on ArrowUp/Down
    // and jumps to the ends on Home/End. Tab still works everywhere — this
    // is a keyboard shortcut on top, not a replacement; the containers keep
    // honest group semantics rather than fake listbox roles over composite
    // tiles (a tile contains its own play button, which listbox forbids).
    if (
      (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') &&
      e.target instanceof Element
    ) {
      const container = e.target.closest('[data-roving]');
      if (container) {
        const items = Array.from(container.querySelectorAll('[data-roving-item]'));
        const current = e.target.closest('[data-roving-item]');
        const idx = items.indexOf(current);
        if (idx >= 0 && items.length) {
          e.preventDefault();
          let next = null;
          if (e.key === 'Home') next = items[0];
          else if (e.key === 'End') next = items[items.length - 1];
          else {
            const step = e.key === 'ArrowDown' ? 1 : -1;
            next = items[(idx + step + items.length) % items.length];
          }
          if (next) {
            // Focus the item's interactive child (the tile link) when the
            // roving item itself is a wrapper; plain buttons focus directly.
            (next.matches('a[href], button')
              ? next
              : next.querySelector('a[href], button')
            )?.focus();
          }
        }
      }
    }
    // ARIA tabs pattern (the tafsir panel): Left/Right move focus between
    // tabs and auto-activate — a keyboard-only path that the roving
    // tabindex markup alone can't provide.
    if (
      (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
      e.target instanceof Element &&
      e.target.closest('[role="tablist"]') &&
      e.target.matches('[role="tab"]')
    ) {
      const tablist = e.target.closest('[role="tablist"]');
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const idx = tabs.indexOf(e.target);
      if (idx >= 0) {
        e.preventDefault();
        const rtl = document.documentElement.dir === 'rtl';
        const step = (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
        const next = tabs[(idx + step + tabs.length) % tabs.length];
        next.focus();
        next.click();
      }
      return;
    }
    if (e.key === 'Escape') {
      // (v4.5, APP-FLOW I2) Esc unwinds EXACTLY ONE layer, top-first:
      // modal → drawer → mushaf-fullscreen → reader-immersive. The modal
      // owns its own Esc listener (ui/modal.js, later on the bubble path);
      // when one is open the global chain must stand down, or a single Esc
      // used to close the modal AND strip the reading mode underneath it —
      // two layers gone with one keypress, the exact "can't go back"
      // confusion this ordering rule exists to prevent.
      if (isModalOpen()) return;
      if (document.body.classList.contains('nav-drawer-open')) {
        closeNavDrawer();
        return;
      }
      // (v4.4) Esc leaves TRUE fullscreen Mushaf. When the native
      // Fullscreen API is active the browser consumes Esc itself and the
      // fullscreenchange sync in app/fullscreen.js carries the flag down;
      // this branch is the path for platforms without the API (iOS) or
      // API-less CSS-only sessions.
      if (store.getState().mushafFullscreen) {
        dispatchHandler('mushaf-toggle-fullscreen', {}, e, e.target);
        return;
      }
      // (v4.5) Esc also leaves the classic reader's immersive mode — the
      // same "give me my screen back" gesture, same keyboard-only path.
      if (store.getState().readerImmersive) {
        store.dispatch(actions.setReaderImmersive(false));
        return;
      }
    }
    // (v4.4) Page-turn arrows while reading the Mushaf (windowed or
    // fullscreen): a physical Arabic book turns right-to-left, so
    // ArrowLeft = next page and ArrowRight = previous — in BOTH UI
    // languages, matching the swipe gesture. Skipped whenever focus sits
    // in a widget that owns its own arrow semantics (roving groups, tab
    // lists, inputs).
    if (
      (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
      store.getState().activeView === VIEWS.MUSHAF &&
      !(
        e.target instanceof Element &&
        e.target.closest(
          'input, select, textarea, [contenteditable="true"], [data-roving], [role="tablist"]'
        )
      )
    ) {
      const state = store.getState();
      const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
      const toNext = e.key === 'ArrowLeft'; // RTL book: leftward is forward
      // (v4.5) a spread turns two pages at once, from its right page.
      const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
      const right = spreadOn ? spreadRightPage(page) : page;
      const dest = spreadOn
        ? toNext
          ? nextSpreadPage(right)
          : prevSpreadPage(right)
        : toNext
          ? mushafNextPage(page)
          : mushafPrevPage(page);
      if (dest != null && dest !== page) {
        e.preventDefault();
        setFlipDirection(toNext ? 'next' : 'prev');
        playFlipSound();
        go(VIEWS.MUSHAF, { page: String(dest) });
      }
      return;
    }
    // Basic focus containment for the mobile nav drawer: Tab cycles inside
    // it while open (the dialog is a small, flat list — a full trap isn't
    // needed, just keep Tab from escaping into the covered page).
    if (e.key === 'Tab' && document.body.classList.contains('nav-drawer-open')) {
      const drawer = document.querySelector('.nav-drawer');
      const focusables = drawer ? drawer.querySelectorAll('a[href], button:not([disabled])') : null;
      if (!focusables || !focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!drawer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.target.matches('[data-bind="search-query"]') && e.key === 'Enter') {
      const value = e.target.value.trim();
      if (value) store.dispatch(actions.addSearchHistory(value));
    }
    if (document.body.classList.contains('is-focus-mode')) {
      handleFocusKeydown(e);
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.form) {
      e.preventDefault();
      formHandlers[form.dataset.form]?.(form);
      return;
    }
    if (form.dataset.action) {
      e.preventDefault();
      handlePromptForm(form);
    }
  });

  let touchStartX = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (!document.body.classList.contains('is-focus-mode')) return;
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX == null || !document.body.classList.contains('is-focus-mode')) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 60) return;
      const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
      // In LTR, swiping left means "forward" (next). In RTL, reading and
      // navigation flow the opposite way, so the same physical swipe should
      // move in the opposite logical direction.
      const swipedTowardStart = dx < 0; // physically swiped leftward
      const dir = isRTL ? (swipedTowardStart ? -1 : 1) : swipedTowardStart ? 1 : -1;
      navigateFocusAdjacent(dir);
    },
    { passive: true }
  );

  // Mushaf page-flip swipe. Unlike the focus-mode swipe above, this is
  // *always* right-to-left reading order — it's emulating a physical Arabic
  // book, so the gesture direction doesn't follow the app's own UI
  // language the way focus mode's does. (v4.5) single touches only: a
  // two-finger pinch is the ZOOM gesture, and it must never turn a page.
  let mushafTouchStartX = null;
  let mushafTouchStartY = null;
  let mushafPinch = null; // { startDist, startScale } while two fingers are down
  let mushafPinching = false;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF) return;
      if (e.touches.length === 1) {
        mushafPinching = false;
        mushafTouchStartX = e.touches[0].clientX;
        mushafTouchStartY = e.touches[0].clientY;
      } else {
        mushafTouchStartX = null;
        mushafTouchStartY = null;
      }
    },
    { passive: true }
  );
  // (v4.5) Pinch-to-zoom the Mushaf text: two fingers scale the persisted
  // font size live — the same value the settings slider owns, clamped to
  // its full range — so the zoom survives the session and the text never
  // breaks reflow (it re-wraps at the new size instead of scaling pixels).
  document.addEventListener(
    'touchmove',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF) {
        mushafPinch = null;
        return;
      }
      if (e.touches.length !== 2) return; // one finger = the browser's scroll
      // Two fingers: own the gesture — stop the page scroll AND the
      // browser's own page pinch so the TYPE scales under the fingers.
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const current = Number(store.getState().settings.mushafPrefs.fontScale) || 1;
      if (!mushafPinch) {
        mushafPinching = true;
        mushafPinch = { dist, scale: current };
        return;
      }
      const next = clamp(mushafPinch.scale * (dist / mushafPinch.dist), 0.6, 2.2);
      if (Math.abs(next - current) >= 0.04) {
        store.dispatch(actions.updateMushafPrefs({ fontScale: Math.round(next * 100) / 100 }));
      }
    },
    { passive: false }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (e.touches.length === 0) mushafPinch = null;
      if (
        mushafTouchStartX == null ||
        mushafPinching ||
        store.getState().activeView !== VIEWS.MUSHAF
      ) {
        if (e.touches.length === 0) mushafPinching = false;
        mushafTouchStartX = null;
        mushafTouchStartY = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - mushafTouchStartX;
      const dy = e.changedTouches[0].clientY - mushafTouchStartY;
      mushafTouchStartX = null;
      mushafTouchStartY = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return; // ignore short/mostly-vertical swipes (scrolling)
      const state = store.getState();
      const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
      // (v4.5) a spread turns two pages at once, from its right page.
      const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
      const right = spreadOn ? spreadRightPage(page) : page;
      const dest = spreadOn
        ? dx < 0
          ? nextSpreadPage(right)
          : prevSpreadPage(right)
        : dx < 0
          ? mushafNextPage(page)
          : mushafPrevPage(page);
      if (dest == null || dest === page) return;
      setFlipDirection(dx < 0 ? 'next' : 'prev');
      playFlipSound();
      go(VIEWS.MUSHAF, { page: String(dest) });
    },
    { passive: true }
  );
}
