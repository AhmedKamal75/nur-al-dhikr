/**
 * app/palette.js — command-palette wiring (Spotlight-style overlay).
 *
 * App-layer half of views/palette.js: opens the modal, feeds providers
 * from the store/modules, live-updates on input, drives ↑↓/Enter
 * keyboard navigation, and closes after a pick. Async providers warm in
 * the background (reciter catalog, Quran full-text index); groups appear
 * as their data lands and the list re-renders on the next keystroke.
 */
import { store, actions } from '../core/state.js';
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
import { isTafsirSearchReady, searchTafsir, tafsirIndexEdition } from '../domain/tafsirSearch.js';
import { ensureTafsirSearchData } from './tafsirSearch.js';
import { loadCatalog } from '../services/audioCatalog.js';
import { ensureQuranSearchData } from './quranSearch.js';

let groupLimits = {};
let lastQuery = null;
let activeIdx = 0;
let rowTotal = 0;
let chromeArmed = false;
let expansionToken = 0;

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
    const hits = searchQuran(query, { limit: Infinity });
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
  let tafsirIndex = null;
  if (query.trim() && isTafsirSearchReady()) {
    const ed = tafsirIndexEdition();
    const texts = store.getState().tafsir?.[ed] || {};
    const meta = store.getState().tafsirEditions?.editions || [];
    const edDoc = meta.find((e) => e.id === ed);
    tafsirIndex = {
      editionName:
        lang === 'ar' ? edDoc?.nameAr || edDoc?.nameEn || '' : edDoc?.nameEn || edDoc?.nameAr || '',
      hits: searchTafsir(query, { limit: Infinity }).map((h) => ({
        ...h,
        text: texts[String(h.s)]?.[String(h.a)] || '',
      })),
    };
  }
  const qTrim = query.trim();
  const journal = qTrim
    ? [
        ...(store.getState().duaJournal || []).map((e) => ({
          text: e.text || '',
          sub: e.date || '',
          query: qTrim,
        })),
        ...(store.getState().reflections || []).map((e) => ({
          text: e.text || '',
          sub: e.week || '',
          query: qTrim,
        })),
      ]
    : [];
  return {
    query,
    groupLimits,
    lang,
    journal,
    tafsirIndex,
    libraryHits: query.trim() ? searchLibrary(query, { limit: Infinity }) : [],
    surahs: state.quran.meta?.surahs || [],
    ayahIndex,
    reciters: query.trim() ? searchReciters(query, state.settings.customReciters || []) : [],
    books: state.hadith.index?.books || [],
    history: state.search.historyList || [],
  };
}

export function updatePalette(preserveActive = false) {
  const root = paletteRoot();
  const box = document.getElementById('palette-results');
  if (!root || !box) return;
  const state = store.getState();
  const query = currentQuery();
  if (lastQuery !== query) {
    groupLimits = {};
    expansionToken++;
    lastQuery = query;
  }
  const { groups, terms } = buildPaletteGroups(collectDeps(query));
  rowTotal = paletteRowCount(groups);
  activeIdx = preserveActive === true ? Math.min(activeIdx, Math.max(0, rowTotal - 1)) : 0;
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
    const focusedRow = e.target?.closest?.('#palette-results .palette__item');
    if (focusedRow) activeIdx = Number(focusedRow.dataset.idx) || 0;
    if (e.key === 'Enter') {
      if (focusedRow) {
        focusedRow.click();
        return;
      }
      document.querySelector('#palette-results .palette__item--active')?.click();
      return;
    }
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + rowTotal) % rowTotal;
    paintActive();
    if (focusedRow)
      document
        .querySelector('#palette-results .palette__item--active')
        ?.focus({ preventScroll: true });
  }
}

async function expandGroup(expand) {
  const key = expand.dataset.paletteGroup;
  const total = Number(expand.dataset.total);
  const query = currentQuery();
  const token = ++expansionToken;
  activeIdx = Number(expand.dataset.idx) || 0;
  const box = document.getElementById('palette-results');
  const scroll = box?.scrollTop || 0;
  let shown = Number(expand.dataset.shown);
  while (shown < total) {
    await new Promise(requestAnimationFrame);
    if (token !== expansionToken || !paletteRoot() || currentQuery() !== query) return;
    shown = Math.min(total, shown + 60);
    groupLimits[key] = shown;
    updatePalette(true);
    if (box) box.scrollTop = scroll;
  }
  document.querySelector('#palette-results .palette__item--active')?.focus({ preventScroll: true });
}

function paletteClickCloser(e) {
  if (!document.getElementById('palette-input')) return; // cleaned by paletteChrome
  if (e.target?.closest?.('#palette-input')) return;
  const expand = e.target?.closest?.('[data-palette-group]');
  if (expand) {
    e.preventDefault();
    e.stopImmediatePropagation();
    void expandGroup(expand);
    return;
  }
  if (e.target?.closest?.('[data-action]')) {
    // A pick redeems the typed query: record it like any other search so
    // history reflects searches that led somewhere (typing alone never did).
    const q = currentQuery().trim().slice(0, 200);
    if (q) {
      try {
        store.dispatch(actions.addSearchHistory(q));
      } catch {
        /* history is best-effort */
      }
    }
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
  groupLimits = {};
  lastQuery = null;
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
  ensureTafsirSearchData().then(() => {
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
