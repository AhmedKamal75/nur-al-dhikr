/**
 * app/inputs.js — data-bind routing for debounced search navigation,
 * Zakat live inputs with caret salvage, and font-scale sliders.
 */

import { rt } from './rt.js';

import { VIEWS } from '../core/config.js';

import { replaceGo } from '../core/router.js';
import { actions, store } from '../core/state.js';
import * as soundDesign from '../services/soundDesign.js';

/** v3.14 Phase C: soft paper sound for Mushaf page flips (opt-in via
 * settings.pageTurnSound, off by default). Called from every flip path —
 * swipe, prev/next buttons, and recitation follow — so the sound always
 * pairs with the flip animation itself, never with anything else. */
export function playFlipSound() {
  soundDesign.playPageTurn(store.getState().settings.pageTurnSound);
}

export function debounceSearchNavigate(value) {
  clearTimeout(rt.searchDebounceTimer);
  rt.searchDebounceTimer = setTimeout(() => {
    // Replace, don't push: typing shouldn't fill up browser history with one
    // entry per keystroke pause (see product review #2).
    replaceGo(VIEWS.SEARCH, value ? { q: value } : {});
    requestAnimationFrame(() => {
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }, 180);
}

// v3.22.0: roots index search-as-you-type. Replace, don't push — one Back
// press should leave the roots view, not step through partial queries
// (same reasoning as the app-wide search box).
export function debounceRootsSearchNavigate(value) {
  clearTimeout(rt.rootsSearchTimer);
  rt.rootsSearchTimer = setTimeout(() => {
    replaceGo(VIEWS.ROOTS, value ? { q: value } : {});
    requestAnimationFrame(() => {
      const input = document.getElementById('roots-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }, 180);
}
export function debounceQuranSearchNavigate(value) {
  clearTimeout(rt.quranSearchDebounceTimer);
  rt.quranSearchDebounceTimer = setTimeout(() => {
    replaceGo(VIEWS.QURAN, value ? { q: value } : {});
    requestAnimationFrame(() => {
      const input = document.getElementById('quran-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }, 180);
}

/** In-book hadith search: dispatch-only (no history churn — the book URL
 *  stays put), reset the page, and let the renderer's focus salvage keep
 *  the caret in the search box while the results re-render. */
export function debounceHadithQuery(value) {
  clearTimeout(rt.hadithQueryTimer);
  rt.hadithQueryTimer = setTimeout(() => {
    store.dispatch(actions.setHadithView({ query: String(value || ''), page: 1 }));
  }, 200);
}

/*
 * Zakat inputs: every keystroke dispatches into the store (one-way data
 * flow), which re-renders the view — so focus + caret are restored on the
 * very same input right after, exactly the trick the search boxes use.
 * data-ref is stable across renders (unlike ids, which are avoided here
 * since several rows share markup shape). No per-field debounce: a shared
 * timer would swallow all but the last-edited field, and the store's own
 * debounced persistence already absorbs the write churn.
 */
/* Clamp a slider/number input's value into [min, max]; used wherever a
 * numeric preference is dispatched from the DOM so the store can never
 * hold a value outside its declared range (or a non-number at all). */
export function clampSliderNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min + (max - min) / 2;
  return Math.min(max, Math.max(min, n));
}

export function refocusZakatInput(ref, caret) {
  requestAnimationFrame(() => {
    const input = document.querySelector(`[data-ref="${ref}"]`);
    if (!input) return;
    // If the person (or an assistive tool) already moved to a DIFFERENT
    // zakat field before this frame, never steal focus back — only restore
    // it when focus was lost to <body> by the innerHTML swap.
    const active = document.activeElement;
    const activeRef = active?.dataset?.ref;
    if (active && active !== document.body && activeRef && activeRef !== ref) return;
    input.focus();
    // number inputs reject setSelectionRange (InvalidStateError) — they
    // manage the caret natively, so only restore it for text-like fields.
    if (
      input.type === 'text' ||
      input.type === 'search' ||
      input.type === 'url' ||
      input.type === 'tel' ||
      input.type === 'password'
    ) {
      const pos = caret != null ? caret : input.value.length;
      input.setSelectionRange(pos, pos);
      return;
    }
    // FIX (review v3.3 A1): number inputs used to keep their NATIVE caret,
    // which Chromium parks at position 0 after the innerHTML swap + focus —
    // so every digit typed after the first landed BEFORE the existing text.
    // Typing "50000" produced "00005", and the zakat was silently computed
    // on 5. Briefly switching the field to type="text" (a well-known
    // workaround; the value survives the swap) makes setSelectionRange
    // legal, so the caret returns exactly where the person was typing —
    // normally the end (number inputs report selectionStart as null, so
    // that is the fallback), mid-string for text-like fields.
    if (input.type === 'number') {
      const pos =
        caret != null && caret >= 0 ? Math.min(caret, input.value.length) : input.value.length;
      try {
        input.type = 'text';
        input.setSelectionRange(pos, pos);
        input.type = 'number';
      } catch {
        /* best effort — worst case the caret sits at the end */
      }
    }
  });
}

// (v4.1) Per-field debounce for zakat inputs: every keystroke used to
// dispatch → full zakat view rebuild + template parse + caret salvage. Keyed
// by data-ref so simultaneous edits to different fields never swallow each
// other (the reason a single shared timer was originally rejected).
const zakatDebounceTimers = new Map();
const ZAKAT_INPUT_DEBOUNCE_MS = 150;

export function handleZakatInput(target) {
  const key = target.dataset.ref || target.dataset.field || 'zakat';
  // The element stays alive between keystrokes (nothing re-renders until
  // commit), so the closure can read the CURRENT value/caret at fire time.
  const el = target;
  const schedule = (commit) => {
    clearTimeout(zakatDebounceTimers.get(key));
    zakatDebounceTimers.set(
      key,
      setTimeout(() => {
        zakatDebounceTimers.delete(key);
        commit();
      }, ZAKAT_INPUT_DEBOUNCE_MS)
    );
  };

  if (el.matches('[data-bind="zakat-input"]')) {
    schedule(() => {
      store.dispatch(actions.setZakatInput(el.dataset.field, el.value));
      refocusZakatInput(el.dataset.ref, el.selectionStart);
    });
    return;
  }
  let prefCommit = null;
  if (el.matches('[data-bind="zakat-gold-price"]')) {
    prefCommit = () => store.dispatch(actions.setZakatPrefs({ goldPricePerGram: el.value }));
  } else if (el.matches('[data-bind="zakat-silver-price"]')) {
    prefCommit = () => store.dispatch(actions.setZakatPrefs({ silverPricePerGram: el.value }));
  } else if (el.matches('[data-bind="zakat-currency"]')) {
    prefCommit = () => store.dispatch(actions.setZakatPrefs({ currency: el.value }));
  } else if (el.matches('[data-bind="zakat-fitr-per"]')) {
    prefCommit = () => store.dispatch(actions.setZakatPrefs({ fitrPer: el.value }));
  } else if (el.matches('[data-bind="zakat-fitr-people"]')) {
    prefCommit = () => store.dispatch(actions.setZakatPrefs({ fitrPeople: el.value }));
  } else {
    return; // nothing matched — don't refocus
  }
  schedule(() => {
    prefCommit();
    refocusZakatInput(el.dataset.ref, el.selectionStart);
  });
}
