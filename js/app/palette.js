/**
 * app/palette.js — command-palette wiring (Spotlight-style overlay).
 *
 * App-layer half of views/palette.js: opens the modal, feeds providers
 * from the store/modules, live-updates on input, drives ↑↓/Enter
 * keyboard navigation, and closes after a pick. Async providers warm in
 * the background (reciter catalog, Quran full-text index); groups appear
 * as their data lands and the list re-renders on the next keystroke.
 */
import { store } from '../core/state.js';
import { openModal, closeModal } from '../ui/modal.js';
import {
  buildPaletteGroups,
  paletteGroupsHTML,
  paletteRowCount,
  paletteShellHTML,
  searchLibrary,
  searchQuran,
  searchReciters,
} from '../views/palette.js';
import { isQuranSearchReady } from '../domain/quranSearch.js';
import { loadCatalog } from '../services/audioCatalog.js';
import { ensureQuranSearchData } from './quranSearch.js';

let activeIdx = 0;
let rowTotal = 0;
let chromeArmed = false;

function paletteRoot() {
  return document.getElementById('palette-input') ? document.getElementById('modal-root') : null;
}

function currentQuery() {
  return document.getElementById('palette-input')?.value || '';
}

/** Gather provider data from the store and loaded modules. */
function collectDeps(query) {
  const state = store.getState();
  const lang = state.settings.language;
  let ayahIndex = null;
  if (query.trim() && isQuranSearchReady()) {
    const hits = searchQuran(query, { limit: 5 });
    ayahIndex = {
      hits: hits.map((h) => {
        const doc = state.quran.surahs?.[String(h.s)];
        const ayah = doc?.ayahs?.find((a) => String(a.number) === String(h.a));
        const meta = state.quran.meta?.surahs?.find((s) => s.number === h.s);
        const refName =
          lang === 'ar' ? meta?.nameAr || '' : meta?.nameTransliteration || meta?.nameEn || '';
        return {
          s: h.s,
          a: h.a,
          text: ayah?.text || '',
          ref: `${refName} · ${h.s}:${h.a}`.trim(),
        };
      }),
    };
  }
  return {
    query,
    lang,
    libraryHits: query.trim() ? searchLibrary(query, { limit: 6 }) : [],
    surahs: state.quran.meta?.surahs || [],
    ayahIndex,
    reciters: query.trim()
      ? searchReciters(query, state.settings.customReciters || []).slice(0, 4)
      : [],
    books: state.hadith.index?.books || [],
    history: state.search.historyList || [],
  };
}

export function updatePalette() {
  const root = paletteRoot();
  const box = document.getElementById('palette-results');
  if (!root || !box) return;
  const state = store.getState();
  const { groups, terms } = buildPaletteGroups(collectDeps(currentQuery()));
  rowTotal = paletteRowCount(groups);
  activeIdx = 0;
  box.innerHTML = paletteGroupsHTML(groups, terms, state.settings.language, activeIdx);
  paintActive();
}

function paintActive() {
  const items = [...document.querySelectorAll('#palette-results .palette__item')];
  items.forEach((el, i) => {
    const on = i === activeIdx;
    el.classList.toggle('palette__item--active', on);
    if (on) {
      el.setAttribute('aria-selected', 'true');
      el.scrollIntoView({ block: 'nearest' });
    } else {
      el.removeAttribute('aria-selected');
    }
  });
}

/** One document listener for keyboard nav + pick-to-close; self-removes. */
function paletteChrome(e) {
  if (!document.getElementById('palette-input')) {
    document.removeEventListener('keydown', paletteChrome);
    document.removeEventListener('click', paletteClickCloser, true);
    chromeArmed = false;
    return;
  }
  if (e.type === 'keydown') {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
    if (!rowTotal) return;
    e.preventDefault();
    if (e.key === 'Enter') {
      document.querySelector('#palette-results .palette__item--active')?.click();
      return;
    }
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + rowTotal) % rowTotal;
    paintActive();
  }
}

function paletteClickCloser(e) {
  if (!document.getElementById('palette-input')) return; // cleaned by paletteChrome
  if (e.target?.closest?.('#palette-input')) return;
  if (e.target?.closest?.('[data-action]')) {
    // Let the delegated handler run first, then dismiss the overlay.
    setTimeout(() => closeModal(), 0);
  }
}

export function openPalette() {
  const input = document.getElementById('palette-input');
  if (input) {
    input.focus();
    return;
  }
  const lang = store.getState().settings.language;
  openModal(paletteShellHTML(lang), { labelledBy: 'palette-title' });
  updatePalette();
  document.getElementById('palette-input')?.addEventListener('input', updatePalette);
  if (!chromeArmed) {
    chromeArmed = true;
    document.addEventListener('keydown', paletteChrome);
    document.addEventListener('click', paletteClickCloser, true);
  }
  // Warm async providers; results fill in as the person types.
  loadCatalog().then(() => {
    if (document.getElementById('palette-input')) updatePalette();
  });
  ensureQuranSearchData().then(() => {
    if (document.getElementById('palette-input')) updatePalette();
  });
}

/** Ctrl/⌘K toggles the palette from anywhere. */
export function armPaletteShortcut() {
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
  });
}
