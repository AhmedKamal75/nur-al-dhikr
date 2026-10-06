/**
 * views/mushafPageFind.js — find text within the page(s) currently visible
 * in the Mushaf. This is deliberately a local reading aid, not a second
 * global-search surface: it searches only resident pages in the current
 * single-page view or spread and never leaves the Mushaf.
 */
import { t } from '../core/i18n.js';
import {
  escapeHTML,
  normalizeSearch,
  stripQuranAnnotations,
  toEasternArabicNumerals,
} from '../core/utils.js';
import { icon } from '../core/icons.js';
import { isRTL } from '../core/i18n.js';
import { mushafRoutePage } from '../services/mushaf.js';

const fold = (text) => normalizeSearch(stripQuranAnnotations(String(text || '')));

function visiblePageDocs(state) {
  const prefs = state.settings.mushafPrefs || {};
  const page = Number(mushafRoutePage(state).page || 1);
  const spread = prefs.spread === true;
  const right = spread ? (page % 2 === 0 ? page - 1 : page) : page;
  const pages = spread ? [right, right + 1] : [page];
  return pages
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 604)
    .map((n) => ({ page: n, doc: state.mushaf?.pages?.[String(n)] }))
    .filter(({ doc }) => doc?.chapters?.length);
}

function resultRows(state, query) {
  const lang = state.settings.language;
  const q = fold(query);
  if (!q) return '';

  const rows = [];
  for (const { page, doc } of visiblePageDocs(state)) {
    for (const chapter of doc.chapters || []) {
      for (const verse of chapter.verses || []) {
        if (!fold(verse.text).includes(q)) continue;
        rows.push(`
          <button type="button" class="mushaf-page-find__result" data-action="mushaf-find-page-result" data-page="${page}" data-surah="${chapter.number}" data-ayah="${verse.number}">
            <span class="mushaf-page-find__result-ref" dir="ltr">${chapter.number}:${verse.number}</span>
            <span class="mushaf-page-find__result-text" dir="rtl" lang="ar">${escapeHTML(verse.text)}</span>
            <span class="mushaf-page-find__result-page">${t('mushaf.pageLabelShort', lang)} ${lang === 'ar' ? toEasternArabicNumerals(page) : page} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 12 })}</span>
          </button>`);
      }
    }
  }

  if (!rows.length) {
    return `<p class="empty-hint" role="status">${t('mushaf.findNoMatch', lang, { q: escapeHTML(query) })}</p>`;
  }
  return `<div class="mushaf-page-find__results" role="list">${rows.join('')}</div>`;
}

export function buildMushafPageFind(state, query = '') {
  const lang = state.settings.language;
  const docs = visiblePageDocs(state);
  const pages = docs.map(({ page }) => (lang === 'ar' ? toEasternArabicNumerals(page) : page));
  const pageScope =
    pages.length > 1
      ? `${t('mushaf.pageLabelShort', lang)} ${pages[0]}–${pages[1]}`
      : `${t('mushaf.pageLabelShort', lang)} ${pages[0] || '—'}`;
  const inputId = 'mushaf-page-find-input';

  return `
    <div class="mushaf-page-find">
      <h2 id="modal-title-mushaf-page-find">${t('mushaf.findOnPage', lang)}</h2>
      <p class="panel__subtext">${t('mushaf.findOnPageHint', lang, { pages: pageScope })}</p>
      <label class="sr-only" for="${inputId}">${t('mushaf.findOnPageInput', lang)}</label>
      <input id="${inputId}" class="search-input" type="search" autocomplete="off" spellcheck="false" inputmode="search" data-bind="mushaf-page-find" placeholder="${escapeHTML(t('mushaf.findOnPagePlaceholder', lang))}" value="${escapeHTML(query)}" />
      <div class="mushaf-page-find__status" role="status" aria-live="polite">
        ${query ? resultRows(state, query) : `<p class="empty-hint">${t('mushaf.findOnPageStart', lang)}</p>`}
      </div>
    </div>`;
}

export function renderMushafPageFindResults(state, query) {
  const lang = state.settings.language;
  if (!query.trim())
    return `<p class="empty-hint" role="status">${t('mushaf.findOnPageStart', lang)}</p>`;
  return resultRows(state, query);
}
