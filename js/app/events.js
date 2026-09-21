import { rt } from './rt.js';
import { closeNavDrawer } from './drawer.js';
import { handleAdhanImport, handleImportFile, handleImportPlanFile } from './fileImports.js';
import { handleFocusKeydown, navigateFocusAdjacent } from './focusRuntime.js';
import { handlePromptForm, formHandlers } from './forms.js';
import { playFlipSound } from './inputs.js';

import { VIEWS } from '../core/config.js';
import { t } from '../core/i18n.js';

import { go } from '../core/router.js';
import { actions, store } from '../core/state.js';
import { vibrate, clamp, escapeHTML } from '../core/utils.js';
import { takeoverManualZoom } from './autoFit.js';
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
import { closeModal, isModalOpen, openLazyModal, openModal, cycleTabFocus } from '../ui/modal.js';
import { settingsSlugForSection } from '../views/settings.js';
import {
  mushafSwipeTurn,
  isSwipeGuardTarget,
  isPlayerDismissSwipe,
  resolveMinControl,
  findTouch,
  mushafDragStyle,
} from '../domain/gestures.js';
import { armPaletteShortcut } from './palette.js';
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
import {
  clickHandlers as quranAudioClick,
  inputHandlers as quranAudioInput,
} from './handlers/quranAudio.js';
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
import {
  clickHandlers as offlineClick,
  changeHandlers as offlineChange,
} from './handlers/offline.js';

import { setFlipDirection } from '../ui/readingTokens.js';
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
  ...offlineChange,
];

export const inputRegistry = [
  ...audioInput,
  ...systemInput,
  ...navigationInput,
  ...zakatInput,
  ...quranInput,
  ...quranAudioInput,
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

function startKidsExitHold(btn) {
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
    openParentGate();
  }, KIDS_EXIT_HOLD_MS);
}

/**
 * (v5.14.0, V12b) parent gate: the 2s hold proved a press, not a person —
 * a 7-year-old can hold a button. One 2-digit addition stands between a
 * sibling and the full app; a grown-up answers in seconds. Wrong answers
 * never exit; the modal simply stays for another try.
 */
export function openParentGate() {
  const lang = store.getState().settings.language;
  const a = 11 + Math.floor(Math.random() * 9);
  const b = 6 + Math.floor(Math.random() * 4);
  const correct = a + b;
  const options = [correct, correct + 1, correct - 2].sort(() => Math.random() - 0.5);
  openModal(
    `<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title-gate">
      <h2 id="modal-title-gate">${escapeHTML(t('kids.gateTitle', lang))}</h2>
      <p class="panel__subtext">${escapeHTML(t('kids.gateHint', lang))}</p>
      <p dir="ltr" aria-label="${a} + ${b}"><strong>${a} + ${b} = ?</strong></p>
      <div class="editor-form__actions">
        ${options.map((n) => `<button type="button" class="btn btn--secondary" data-action="kids-gate-answer" data-correct="${n === correct ? '1' : '0'}" dir="ltr">${n}</button>`).join('')}
        <button type="button" class="btn btn--ghost" data-action="modal-close">${escapeHTML(t('common.cancel', lang))}</button>
      </div>
    </div>`,
    { labelledBy: 'modal-title-gate' }
  );
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
      startKidsExitHold(btn);
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
    startKidsExitHold(btn);
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
        // (v5.2.18/19) the quick sheet loads on demand (static import
        // pulled the whole classic reader into the boot parse); the
        // QURAN guard drops the sheet when the press outlives its view.
        openLazyModal(
          () =>
            import('../views/quran.js').then(({ buildAyahQuickSheet }) =>
              buildAyahQuickSheet(anchor.surah, anchor.ayah, lang)
            ),
          { labelledBy: 'modal-title-ayah-quick', viewGuard: VIEWS.QURAN }
        );
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
        // (v5.9.0) zooming in fullscreen takes manual control: flip out
        // of auto-fit so the engine stops overriding the gesture.
        takeoverManualZoom();
      }
    },
    { passive: false }
  );

  // (v5.2.89, P2) floating back-to-top visibility: the WINDOW is the
  // scroller (#main never scrolls), so one passive window listener
  // toggles the body flag the .category-top FAB's CSS keys off. Attached
  // once at boot (never per view — Vector E); programmatic scrolls
  // (renderer scroll memory, router top-jumps) fire scroll events too,
  // so the flag self-corrects across navigations.
  window.addEventListener(
    'scroll',
    () => {
      document.body.classList.toggle('is-scrolled-deep', window.scrollY > 600);
    },
    { passive: true }
  );

  // Long-press ayah quick actions (classic reader): holding ayah text
  // 550ms opens the quick sheet; the release click is suppressed so the
  // underlying control never double-fires. Interactive descendants
  // (buttons/links/inputs) are excluded — their own tap still wins.
  // Movement beyond 12px cancels (scrolls stay scrolls).
  armAyahLongPress();
  // Kids-mode hold-to-exit (2s press on the exit button; taps never exit).
  armKidsExitHold();
  // Command palette (Ctrl/⌘K) from anywhere.
  armPaletteShortcut();
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
    if (target.id === 'plan-file-input' && target.files?.[0]) {
      dispatchPromise('plan-file-input', handleImportPlanFile(target.files[0]));
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
    // (v5.2.74, BUG-06) roving tabindex for ayah words: Tab lands on the
    // first .qword of each ayah only; Left/Right walk the sibling words
    // of the SAME ayah and move the single tab stop along. Word runs are
    // always RTL Arabic, so Left advances visually-forward (next word)
    // regardless of the UI language direction.
    if (
      (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
      e.target instanceof Element &&
      e.target.matches('.qword[data-action="word-tap"]')
    ) {
      const scope = e.target.parentElement;
      const words = scope
        ? Array.from(scope.querySelectorAll('.qword[data-action="word-tap"]'))
        : [];
      const idx = words.indexOf(e.target);
      if (idx >= 0 && words.length > 1) {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? 1 : -1;
        const next = words[(idx + step + words.length) % words.length];
        e.target.setAttribute('tabindex', '-1');
        next.setAttribute('tabindex', '0');
        next.focus();
      }
      return;
    }
    // (v5.12.0 hostile review) roving tabindex for tajweed drill units:
    // same book-order walk as the mushaf ayahs below, scoped to the
    // round's .practice-ayah container (letters are RTL Arabic flow).
    if (
      (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') &&
      e.target instanceof Element &&
      e.target.matches('.pu[data-action="practice-tap"]')
    ) {
      const scope = e.target.closest('.practice-ayah');
      const stops = scope
        ? Array.from(scope.querySelectorAll('.pu[data-action="practice-tap"]'))
        : [];
      const idx = stops.indexOf(e.target);
      if (idx >= 0 && stops.length > 1) {
        e.preventDefault();
        let next = null;
        if (e.key === 'Home') next = stops[0];
        else if (e.key === 'End') next = stops[stops.length - 1];
        else {
          const step = e.key === 'ArrowLeft' ? 1 : -1;
          next = stops[(idx + step + stops.length) % stops.length];
        }
        if (next) {
          e.target.setAttribute('tabindex', '-1');
          next.setAttribute('tabindex', '0');
          next.focus();
        }
      }
      return;
    }
    // (v5.12.0 hostile review) roving tabindex for mushaf ayahs: Tab lands
    // on the page's first ayah only; Left/Right walk the page's ayahs in
    // book order (DOM order — Left advances, same visual-forward rule as
    // the word runs above, since ayah flow is RTL) and move the single tab
    // stop along; Home/End jump to the page ends. Enter/Space activation
    // rides the role=button path above, untouched.
    if (
      (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') &&
      e.target instanceof Element &&
      e.target.matches('.mushaf-ayah[tabindex], .mushaf-ayah__marker[tabindex]')
    ) {
      const scope = e.target.closest('.mushaf-page');
      const stops = scope
        ? Array.from(
            scope.querySelectorAll('.mushaf-ayah[tabindex], .mushaf-ayah__marker[tabindex]')
          )
        : [];
      const idx = stops.indexOf(e.target);
      if (idx >= 0 && stops.length > 1) {
        e.preventDefault();
        let next = null;
        if (e.key === 'Home') next = stops[0];
        else if (e.key === 'End') next = stops[stops.length - 1];
        else {
          const step = e.key === 'ArrowLeft' ? 1 : -1;
          next = stops[(idx + step + stops.length) % stops.length];
        }
        if (next) {
          e.target.setAttribute('tabindex', '-1');
          next.setAttribute('tabindex', '0');
          next.focus();
        }
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
      // (v5.2.20, F-015) cycling math shared with the modal trap.
      cycleTabFocus(e, drawer, focusables, document.activeElement);
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
  let touchStartId = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (!document.body.classList.contains('is-focus-mode')) return;
      touchStartX = e.touches[0].clientX;
      touchStartId = e.touches[0].identifier ?? null;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX == null || !document.body.classList.contains('is-focus-mode')) return;
      // (v5.17.4) match the tracked finger — a second finger's touchend
      // must not be measured against the first finger's start.
      const touch =
        touchStartId == null ? e.changedTouches[0] : findTouch(e.changedTouches, touchStartId);
      const dx = touch ? touch.clientX - touchStartX : NaN;
      touchStartX = null;
      touchStartId = null;
      if (!touch) return;
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

  // Mushaf page-flip swipe. ALWAYS right-to-left book order — it emulates
  // a physical Arabic book, so the gesture direction never follows the
  // app's own UI language the way focus mode's does (the mapping lives in
  // domain/gestures.js#mushafSwipeTurn, pinned by tests/gestures.test.js).
  // (v4.5) single touches only: a two-finger pinch is the ZOOM gesture,
  // and it must never turn a page. (v5.2.22) touches that BEGIN on a
  // control surface (player bar, consoles, nav, any button/link/input)
  // never arm a swipe — swiping over player controls used to turn the
  // page underneath and steal button taps.
  let mushafTouchStartX = null;
  let mushafTouchStartY = null;
  let mushafTouchId = null;
  let mushafPinch = null; // { startDist, startScale } while two fingers are down
  let mushafPinching = false;
  // (v5.17.4) finger-following paper drag: while a page-turn swipe is in
  // flight the book tracks the finger (direct style writes, no store churn
  // at 60Hz). mushafDragOn flips once the drag is clearly horizontal so
  // vertical scrolls never drag the book sideways.
  let mushafDragOn = false;
  let mushafDragResetTimer = null;

  /** Paper drag is a delight, not a right: the animation pref and the OS
   *  reduced-motion setting both veto it (the swipe turn itself still works). */
  function mushafDragAllowed() {
    if (store.getState().settings.mushafPrefs?.pageFlipAnimation === false) return false;
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
    } catch {
      /* motion queries unavailable — drag is safe to allow */
    }
    return true;
  }

  /** Clear the in-flight drag transform. Commits clear instantly (the
   *  entrance animation takes over); cancels ease back over 180ms. */
  function clearMushafDrag(snapBack) {
    const book = document.querySelector('.mushaf-book');
    if (mushafDragResetTimer) {
      clearTimeout(mushafDragResetTimer);
      mushafDragResetTimer = null;
    }
    if (!book) {
      mushafDragOn = false;
      return;
    }
    book.classList.remove('mushaf-book--drag');
    if (snapBack && mushafDragOn) {
      book.style.transition = 'transform 180ms ease-out';
      book.style.transform = '';
      const el = book;
      mushafDragResetTimer = setTimeout(() => {
        el.style.transition = '';
        mushafDragResetTimer = null;
      }, 200);
    } else {
      book.style.transition = '';
      book.style.transform = '';
    }
    mushafDragOn = false;
  }

  function disarmMushafTouch(snapBack) {
    mushafTouchStartX = null;
    mushafTouchStartY = null;
    mushafTouchId = null;
    clearMushafDrag(snapBack);
  }
  document.addEventListener(
    'touchstart',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF) return;
      const origin = e.target instanceof Element ? e.target : null;
      if (origin && isSwipeGuardTarget(origin)) {
        disarmMushafTouch(false);
        return;
      }
      if (e.touches.length === 1) {
        mushafPinching = false;
        mushafTouchStartX = e.touches[0].clientX;
        mushafTouchStartY = e.touches[0].clientY;
        // (v5.17.4) track which finger armed the swipe — a second finger's
        // touchend must never be measured against this start.
        mushafTouchId = e.touches[0].identifier ?? null;
      } else {
        disarmMushafTouch(false);
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
        // (v5.9.0) same takeover as ctrl+wheel (below): a live pinch in
        // fullscreen means manual zoom from here on.
        takeoverManualZoom();
      }
    },
    { passive: false }
  );
  // (v5.17.4) paper drag, part 1: while one finger pulls horizontally the
  // book follows it (translate + a breath of lift). Passive — the browser
  // keeps owning the vertical scroll; we only paint the horizontal pull.
  // Pinch, guarded origins, vertical drags, reduced-motion and the
  // animation-off pref all skip it; the turn decision still lives in
  // touchend below, so the gesture contract is unchanged.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (
        mushafTouchStartX == null ||
        mushafPinching ||
        store.getState().activeView !== VIEWS.MUSHAF
      ) {
        return;
      }
      if (e.touches.length !== 1 || !mushafDragAllowed()) return;
      const touch = mushafTouchId == null ? e.touches[0] : findTouch(e.touches, mushafTouchId);
      if (!touch) return;
      const dx = touch.clientX - mushafTouchStartX;
      const dy = touch.clientY - mushafTouchStartY;
      const book = document.querySelector('.mushaf-book');
      if (!book) return;
      if (!mushafDragOn) {
        if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy)) return;
        mushafDragOn = true;
        if (mushafDragResetTimer) {
          clearTimeout(mushafDragResetTimer);
          mushafDragResetTimer = null;
        }
        book.classList.add('mushaf-book--drag');
        book.style.transition = 'none';
      }
      const style = mushafDragStyle(dx, book.clientWidth || window.innerWidth);
      if (!style) return;
      book.style.transform = `translateX(${style.x}px) scale(${style.scale})`;
    },
    { passive: true }
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
        disarmMushafTouch(true);
        return;
      }
      // (v5.17.4) measure the tracked finger, not whoever lifted last.
      const touch =
        mushafTouchId == null ? e.changedTouches[0] : findTouch(e.changedTouches, mushafTouchId);
      const wasDragging = mushafDragOn;
      const startX = mushafTouchStartX;
      const startY = mushafTouchStartY;
      mushafTouchStartX = null;
      mushafTouchStartY = null;
      mushafTouchId = null;
      if (!touch) {
        clearMushafDrag(true);
        return;
      }
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // (v5.2.22) the book-order mapping (dx < 0 = next page) is the pure
      // mushafSwipeTurn helper — short and mostly-vertical swipes (scrolls)
      // return null and fall through without turning.
      const turn = mushafSwipeTurn(dx, dy);
      if (!turn) {
        // Paper drag part 2: a below-threshold pull eases back onto the
        // spine instead of snapping; a non-drag just clears the state.
        clearMushafDrag(wasDragging);
        return;
      }
      // Commit: drop the drag transform instantly — the entrance animation
      // on the incoming page takes over from the finger's position.
      clearMushafDrag(false);
      const state = store.getState();
      const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
      // (v4.5) a spread turns two pages at once, from its right page.
      const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
      const right = spreadOn ? spreadRightPage(page) : page;
      const dest =
        turn === 'next'
          ? spreadOn
            ? nextSpreadPage(right)
            : mushafNextPage(page)
          : spreadOn
            ? prevSpreadPage(right)
            : mushafPrevPage(page);
      if (dest == null || dest === page) return;
      setFlipDirection(turn);
      playFlipSound();
      go(VIEWS.MUSHAF, { page: String(dest) });
    },
    { passive: true }
  );

  // (v5.17.4) a cancelled touch (incoming call, browser gesture takeover,
  // palm rejection) is NOT a swipe end: disarm every tracker so the next
  // touchend can't measure a new finger against a stale start — that stale
  // pairing was a source of phantom page turns on real phones.
  document.addEventListener(
    'touchcancel',
    () => {
      touchStartX = null;
      touchStartId = null;
      disarmMushafTouch(true);
      playerTouch = null;
    },
    { passive: true }
  );

  // (v5.12.0) mini-player swipe-down-to-MINIMIZE: a mostly-vertical
  // downward swipe that STARTS on the full player bar clicks its minimize
  // control — audio keeps playing behind a slim pill. (sweep) the mushaf
  // fullscreen consoles are the bar's stand-in over the book (the docked
  // bar is hidden there), so swipes starting on them minimize the same
  // way. Killing playback from an accidental scroll gesture was the old
  // behavior; quitting stays on the explicit X (data-player-dismiss, tap
  // only). Horizontal drags (seek) and upward swipes never minimize —
  // see isPlayerDismissSwipe.
  let playerTouch = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      const origin = e.target instanceof Element ? e.target : null;
      // The fullscreen transport row (page controls) carries no player
      // buttons — a swipe starting there belongs to the sibling console
      // row (resolved at touchend), so the whole glass cluster minimizes.
      const bar =
        origin?.closest?.(
          '.player-bar[data-player-mounted], .mushaf-fs-console, .mushaf-fs-controls'
        ) ?? null;
      if (!bar || e.touches.length !== 1) {
        playerTouch = null;
        return;
      }
      playerTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        // (v5.17.4) track the finger — see the mushaf note above.
        id: e.touches[0].identifier ?? null,
        bar,
      };
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (!playerTouch) return;
      const { bar, id, x, y } = playerTouch;
      playerTouch = null;
      const touch = id == null ? e.changedTouches[0] : findTouch(e.changedTouches, id);
      if (!touch) return;
      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      if (!isPlayerDismissSwipe(dx, dy)) return;
      // Already a pill: a downward swipe restores nothing and quits
      // nothing — only the full bar minimizes from this gesture.
      if (bar.classList.contains('player-bar--min')) return;
      const min = resolveMinControl(bar);
      if (min && typeof min.click === 'function') min.click();
    },
    { passive: true }
  );

  // (v5.2.48) settings accordion memory (persisted) + single-expansion.
  // The `toggle` event does not bubble, so this listens in capture phase.
  // Opening a section stores its slug in settings (the next re-render
  // re-opens exactly it — toggling a switch no longer collapses its
  // section) and shuts the other eleven; closing the stored section clears
  // the pin so re-renders keep them shut. The pin is compared before the
  // siblings close: their own toggle events see open=false and only clear
  // a pin that names them.
  document.addEventListener(
    'toggle',
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const panel = target?.closest?.('details.settings-acc') ?? null;
      if (!panel || !panel.id) return;
      const slug = settingsSlugForSection(panel.id);
      if (panel.open) {
        if (slug && store.getState().settings.settingsSection !== slug) {
          store.dispatch(actions.updateSettings({ settingsSection: slug }));
        }
        for (const other of document.querySelectorAll('details.settings-acc[open]')) {
          if (other !== panel) other.open = false;
        }
      } else if (slug && store.getState().settings.settingsSection === slug) {
        store.dispatch(actions.updateSettings({ settingsSection: null }));
      }
    },
    true
  );
}
