import { rt } from './rt.js';
import { closeNavDrawer } from './drawer.js';
import { handleAdhanImport, handleImportFile } from './fileImports.js';
import { handleFocusKeydown, navigateFocusAdjacent } from './focusRuntime.js';
import { handlePromptForm, formHandlers } from './forms.js';
import { playFlipSound } from './inputs.js';

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
import { closeModal, openModal, isModalOpen } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import * as recitation from '../services/recitation.js';
import {
  clickHandlers as navClick,
  inputHandlers as navigationInput,
} from './handlers/navigation.js';
import { clickHandlers as itemsClick, changeHandlers as itemsChange } from './handlers/items.js';
import {
  clickHandlers as systemClick,
  changeHandlers as systemChange,
  inputHandlers as systemInput,
} from './handlers/system.js';
import {
  clickHandlers as locationClick,
  changeHandlers as locationChange,
} from './handlers/location.js';
import { clickHandlers as quizClick } from './handlers/quiz.js';
import {
  clickHandlers as quranClick,
  changeHandlers as quranChange,
  inputHandlers as quranInput,
} from './handlers/quran.js';
import { clickHandlers as quranAudioClick } from './handlers/quranAudio.js';
import { clickHandlers as hifzClick } from './handlers/hifz.js';
import {
  clickHandlers as worshipClick,
  changeHandlers as worshipChange,
} from './handlers/worship.js';
import { clickHandlers as zakatClick, inputHandlers as zakatInput } from './handlers/zakat.js';
import {
  clickHandlers as audioClick,
  changeHandlers as audioChange,
  inputHandlers as audioInput,
} from './handlers/audio.js';
import { clickHandlers as tasbihClick } from './handlers/tasbih.js';
import { clickHandlers as editorClick } from './handlers/editor.js';
import {
  clickHandlers as contentClick,
  changeHandlers as contentChange,
} from './handlers/content.js';
import { clickHandlers as viewMenusClick } from './handlers/viewMenus.js';
import { clickHandlers as journalClick } from './handlers/journal.js';
import { clickHandlers as grammarClick } from './handlers/grammar.js';
import { clickHandlers as offlineClick } from './handlers/offline.js';
import { buildAyahQuickSheet } from '../views/quran.js';
import { setFlipDirection } from '../views/mushafReader.js';
import { initFullscreenSync, resetFsControlsIdleTimer } from './fullscreen.js';

/**
 * app/events.js — THE single delegated event listener. Click, change,
 * input, submit, and keydown on document resolve [data-action] /
 * [data-bind] / [data-form] attributes into tables owned by the feature
 * modules: click actions merge into ONE dispatch table, change/input
 * selectors merge into TWO registries. Views stay pure string templates;
 * no view ever attaches a listener.
 */

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
  ...grammarClick,
  ...offlineClick,
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
  ['grammar', grammarClick],
  ['offline', offlineClick],
];
export const mergedClickHandlers = clickHandlers;

/**
 * Change/input registries (Blueprint D). Each entry is
 * { sel, run(ds, el, e) } owned by the feature module that renders the
 * control; first matching selector wins, mirroring the old if/else-chain
 * order. run() may be async — rejections surface through the same
 * boundary as click handlers (an async throw inside an arm used to be
 * an unhandled rejection).
 */
export const changeRegistry = [
  ...audioChange,
  ...contentChange,
  ...systemChange,
  ...worshipChange,
  ...locationChange,
  ...itemsChange,
  ...quranChange,
];

export const inputRegistry = [
  ...audioInput,
  ...systemInput,
  ...navigationInput,
  ...zakatInput,
  ...quranInput,
];

function matchRegistry(registry, el) {
  for (const entry of registry) {
    try {
      if (el?.matches?.(entry.sel)) return entry;
    } catch {
      /* an invalid selector fails the gate test loudly instead */
    }
  }
  return null;
}

export { matchRegistry };

function dispatchPromise(action, result) {
  if (result && typeof result.catch === 'function') {
    result.catch((err) => reportHandlerError(action, err));
  }
}

export function dispatchRegistry(kind, registry, e) {
  const entry = matchRegistry(registry, e.target);
  if (!entry) return false;
  try {
    dispatchPromise(`${kind}:${entry.sel}`, entry.run(e.target.dataset, e.target, e));
  } catch (err) {
    reportHandlerError(`${kind}:${entry.sel}`, err);
  }
  return true;
}

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
    dispatchPromise(action, handler(ds, e, target));
  } catch (err) {
    reportHandlerError(action, err);
  }
}

/* Global event delegation                                             */
/* ------------------------------------------------------------------ */

const LONG_PRESS_MS = 550;
const LONG_PRESS_MOVE_PX = 12;

function cancelAyahLongPress() {
  if (rt.longPressTimer) {
    clearTimeout(rt.longPressTimer);
    rt.longPressTimer = null;
  }
  rt.longPressAnchor = null;
}

const KIDS_EXIT_HOLD_MS = 2000;
const KIDS_EXIT_STEPS = 4;
const KIDS_EXIT_TAP_WINDOW_MS = 6000;
const KIDS_EXIT_TAPS_TO_HINT = 3;

function trackKidsExitTaps() {
  const now = Date.now();
  rt.kidsExitTaps = (rt.kidsExitTaps || []).filter((ts) => now - ts < KIDS_EXIT_TAP_WINDOW_MS);
  rt.kidsExitTaps.push(now);
  if (rt.kidsExitTaps.length >= KIDS_EXIT_TAPS_TO_HINT) {
    rt.kidsExitTaps = [];
    showToast(t('kids.exitHow', store.getState().settings.language));
  }
}

function paintKidsExitStep(btn, step) {
  const fill = btn?.querySelector('.kids-exit__fill');
  if (fill) fill.style.width = `${Math.min(100, step * 25)}%`;
}

function cancelKidsExitHold() {
  if (rt.kidsExitTimer) {
    clearTimeout(rt.kidsExitTimer);
    rt.kidsExitTimer = null;
  }
  if (rt.kidsExitPaint) {
    clearInterval(rt.kidsExitPaint);
    rt.kidsExitPaint = null;
  }
  const btn = document.querySelector('.kids-exit.is-holding');
  btn?.classList.remove('is-holding');
  paintKidsExitStep(btn, 0);
}

function startKidsExitHold(btn, e) {
  cancelKidsExitHold();
  btn.classList.remove('is-holding');
  void btn.offsetWidth; // restart the stepped fill on re-press
  btn.classList.add('is-holding');
  paintKidsExitStep(btn, 0);
  let step = 0;
  rt.kidsExitPaint = setInterval(() => {
    step += 1;
    paintKidsExitStep(btn, step);
  }, KIDS_EXIT_HOLD_MS / KIDS_EXIT_STEPS);
  rt.kidsExitTimer = setTimeout(() => {
    rt.kidsExitTimer = null;
    if (rt.kidsExitPaint) {
      clearInterval(rt.kidsExitPaint);
      rt.kidsExitPaint = null;
    }
    btn.classList.remove('is-holding');
    if (store.getState().settings.hapticsEnabled) vibrate(20);
    const handler = clickHandlers['kids-exit'];
    if (handler) dispatchHandler('kids-exit', {}, e, btn);
  }, KIDS_EXIT_HOLD_MS);
}

/** Hold-to-exit for Kids mode: a full 2s press fires 'kids-exit' (a plain
 *  tap never does — the click table has no entry that exits on tap).
 *  Pointer covers mouse + touch + pen; the keydown path covers
 *  keyboard-only desktop (hold Enter/Space on the focused button). Both
 *  paint the button's progress fill so the hold is discoverable. */
function armKidsExitHold() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      cancelKidsExitHold();
      if (e.button != null && e.button !== 0) return;
      const btn = e.target?.closest?.('[data-action="kids-exit-hold"]');
      if (!btn) return;
      startKidsExitHold(btn, e);
    },
    { passive: true }
  );
  document.addEventListener('pointerup', cancelKidsExitHold, { passive: true });
  document.addEventListener('pointercancel', cancelKidsExitHold, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const btn = e.target?.closest?.('[data-action="kids-exit-hold"]');
    if (!btn || rt.kidsExitTimer) return;
    startKidsExitHold(btn, e);
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') cancelKidsExitHold();
  });
}

/** Arm the press-and-hold detector for classic-reader ayah text. */
function armAyahLongPress() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      cancelAyahLongPress();
      if (e.button != null && e.button !== 0) return;
      const card = e.target?.closest?.('.ayah-card');
      if (!card || e.target?.closest?.('button, a, input, select, textarea')) return;
      const state = store.getState();
      if (state.activeView !== VIEWS.QURAN || !state.activeParams?.id) return;
      const ayah = parseInt(card.id?.replace('ayah-', ''), 10);
      const surah = parseInt(state.activeParams.id, 10);
      if (!Number.isFinite(ayah) || !Number.isFinite(surah)) return;
      rt.longPressAnchor = { x: e.clientX, y: e.clientY, surah, ayah };
      rt.longPressTimer = setTimeout(() => {
        rt.longPressTimer = null;
        const anchor = rt.longPressAnchor;
        rt.longPressAnchor = null;
        if (!anchor) return;
        const lang = store.getState().settings.language;
        if (store.getState().settings.hapticsEnabled) vibrate(10);
        rt.suppressClickUntil = Date.now() + 600;
        openModal(buildAyahQuickSheet(anchor.surah, anchor.ayah, lang), {
          labelledBy: 'modal-title-ayah-quick',
        });
      }, LONG_PRESS_MS);
    },
    { passive: true }
  );
  const moveCancels = (e) => {
    const a = rt.longPressAnchor;
    if (!a || e.clientX == null) return;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > LONG_PRESS_MOVE_PX) cancelAyahLongPress();
  };
  document.addEventListener('pointermove', moveCancels, { passive: true });
  document.addEventListener('pointerup', cancelAyahLongPress, { passive: true });
  document.addEventListener('pointercancel', cancelAyahLongPress, { passive: true });
}

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

  // Long-press ayah quick actions (classic reader): holding ayah text
  // 550ms opens the quick sheet; the release click is suppressed so the
  // underlying control never double-fires. Interactive descendants
  // (buttons/links/inputs) are excluded — their own tap still wins.
  // Movement beyond 12px cancels (scrolls stay scrolls).
  armAyahLongPress();
  // Kids-mode hold-to-exit (2s press on the exit button; taps never exit).
  armKidsExitHold();
  document.addEventListener('click', (e) => {
    if (Date.now() < rt.suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
    // Kids exit has no tap handler on purpose — but repeated taps mean a
    // grown-up who missed the hint. After 3 taps in 6s, say plainly that
    // only a 2-second HOLD exits (the hold paints progress meanwhile).
    if (action === 'kids-exit-hold') trackKidsExitTaps();

    const handler = clickHandlers[action];
    if (handler) {
      e.preventDefault();
      dispatchHandler(action, target.dataset, e, target);
    }
  });

  document.addEventListener('change', (e) => {
    if (dispatchRegistry('change', changeRegistry, e)) return;
    // App-wide file inputs live here, not in a feature: importing a
    // backup or a custom adhan recording. Both are async — rejections
    // surface through the same boundary as every other handler.
    const target = e.target;
    if (target.id === 'backup-file-input' && target.files?.[0]) {
      dispatchPromise('backup-file-input', handleImportFile(target.files[0]));
    }
    if (target.id === 'adhan-file-input' && target.files?.[0]) {
      dispatchPromise(
        'adhan-file-input',
        handleAdhanImport(target.files[0], target.dataset.kind === 'fajr' ? 'fajr' : 'standard')
      );
    }
  });

  document.addEventListener('input', (e) => {
    dispatchRegistry('input', inputRegistry, e);
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
