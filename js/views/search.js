/**
 * views/search.js
 * Global search: the Adhkar/Duas/Names library index (search.js) plus,
 * since v3.6, the entire Qur'an — Uthmani Arabic (diacritic-insensitive)
 * and the Sahih International translation — with jump-to-ayah results.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, highlightMatch, pickLocale } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { search as runSearch } from '../domain/search.js';
import { searchQuran, isQuranSearchReady } from '../domain/quranSearch.js';
import { searchTafsir, isTafsirSearchReady, tafsirIndexEdition } from '../domain/tafsirSearch.js';
import { resolvePage } from '../services/surahPlayback.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { fieldTogglesFor } from '../domain/contentLens.js';
import { cardHTML } from '../ui/card.js';
import { skeletonLines } from '../ui/skeleton.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

/** One ayah hit in the "From the Qur'an" block. Links straight to the
 *  classic reader at that surah (app.js scrolls to and highlights the
 *  target ayah once its element exists) — plus, when the mushaf map is
 *  loaded, to the facsimile page holding the ayah. */
function quranResultRow(state, hit, lang, terms = []) {
  const surahDoc = state.quran.surahs[String(hit.s)];
  const ayah = surahDoc?.ayahs?.find((a) => String(a.number) === String(hit.a));
  const meta = state.quran.meta?.surahs?.find((s) => s.number === hit.s);
  if (!ayah) return '';
  const refLabel = `${meta ? escapeHTML(pickLocale({ en: meta.nameTransliteration || meta.nameEn, ar: meta.nameAr }, lang)) : ''} · ${hit.s}:${hit.a}`;
  // (v5.2.58) ayah→page: the mushaf-meta ayahPages map covers all 6,236
  // ayahs; unloaded map (or unresolvable pair) renders no chip, never a
  // dead link. (Sibling links, never nested — nested <a> is invalid HTML.)
  const page = resolvePage(state.mushaf?.meta?.ayahPages, hit.s, hit.a);
  const mushafLink =
    page == null
      ? ''
      : `<a class="quran-hit__mushaf" href="${buildHash(VIEWS.MUSHAF, { page: String(page) })}" data-action="navigate" data-view="${VIEWS.MUSHAF}" data-page="${page}" aria-label="${t('mushaf.openInMushaf', lang)} — ${t('mushaf.pageLabel', lang)} ${page}">${icon('book', { size: 12 })} ${t('mushaf.pageShort', lang)} ${page}</a>`;
  return `
  <div class="quran-hit">
    <a class="quran-hit__reader" href="${buildHash(VIEWS.QURAN, { id: hit.s, ay: String(hit.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${hit.s}" data-ay="${escapeHTML(String(hit.a))}">
      <p class="quran-hit__arabic" dir="rtl" lang="ar">${highlightMatch(ayah.text, terms)}</p>
      ${state.settings.showTranslation && ayah.translation ? `<p class="quran-hit__translation" dir="auto">${highlightMatch(ayah.translation, terms)}</p>` : ''}
      <span class="quran-hit__ref">${refLabel} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 12 })}</span>
    </a>
    ${mushafLink}
  </div>`;
}

function quranSection(state, query, lang) {
  if (!query) return '';
  // v4.1: a corpus build that failed gets an error + Retry — the shimmer
  // used to run forever with a "Loading corpus…" caption.
  if (state.loadErrors?.['quran-search-corpus']) {
    return loadErrorStateHTML({ lang, tierKey: 'quran-search-corpus', t });
  }
  if (!isQuranSearchReady()) {
    return `
    <section class="panel quran-search-panel">
      <div class="panel__header"><h2>${t('search.quranResults', lang)}</h2></div>
      <p class="empty-hint">${t('search.loadingCorpus', lang)}</p>
      ${skeletonLines(lang, [92, 84, 88, 62])}
    </section>`;
  }
  // FIX (v4.0 hostile review B6): one index pass, sliced for display — the
  // old code ran the identical query twice per keystroke (limit 15 + limit
  // 1000) just to count the hits.
  const all = searchQuran(query, { limit: 1000 });
  const hits = all.slice(0, 15);
  const terms = String(query).split(/\s+/);
  const total = all.length;
  return `
  <section class="panel quran-search-panel">
    <div class="panel__header">
      <h2>${t('search.quranResults', lang)}</h2>
      <span class="view__meta">${t('search.quranCount', lang, { n: total })}</span>
    </div>
    ${
      hits.length
        ? `<div class="quran-hit-list">${hits.map((h) => quranResultRow(state, h, lang, terms)).join('')}</div>`
        : emptyStateHTML({
            iconName: 'search',
            title: t('search.noResults', lang),
            hint: t('search.noResultsHint', lang),
          })
    }
  </section>`;
}

/** One tafsir hit: the commentary excerpt, linked to the reader at the
 *  ayah it explains (same deep link the palette's tafsir group uses). */
function tafsirResultRow(state, hit, editionId, editionName, lang, terms = []) {
  const text = state.tafsir?.[editionId]?.[String(hit.s)]?.[String(hit.a)] || '';
  if (!text) return '';
  const meta = state.quran.meta?.surahs?.find((s) => s.number === hit.s);
  const refLabel = `${meta ? escapeHTML(pickLocale({ en: meta.nameTransliteration || meta.nameEn, ar: meta.nameAr }, lang)) : ''} · ${hit.s}:${hit.a}`;
  return `
  <div class="quran-hit">
    <a class="quran-hit__reader" href="${buildHash(VIEWS.QURAN, { id: hit.s, ay: String(hit.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${hit.s}" data-ay="${escapeHTML(String(hit.a))}">
      <p class="quran-hit__translation" dir="auto">${highlightMatch(text.length > 220 ? `${text.slice(0, 220)}…` : text, terms)}</p>
      <span class="quran-hit__ref">${refLabel} ${editionName ? `· ${escapeHTML(editionName)}` : ''} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 12 })}</span>
    </a>
  </div>`;
}

/**
 * (v5.2.74, UP-08) the palette-only tafsir full-text search, surfaced in
 * the Search view. Gated on index readiness: until the background build
 * finishes the view shows no group at all (never a dead section).
 */
function tafsirSection(state, query, lang) {
  if (!query) return '';
  if (state.loadErrors?.['tafsir-search-corpus']) {
    return loadErrorStateHTML({ lang, tierKey: 'tafsir-search-corpus', t });
  }
  if (!isTafsirSearchReady()) return '';
  const editionId = tafsirIndexEdition();
  const edDoc = (state.tafsirEditions?.editions || []).find((e) => e.id === editionId);
  const editionName =
    (lang === 'ar' ? edDoc?.nameAr || edDoc?.nameEn : edDoc?.nameEn || edDoc?.nameAr) || '';
  const all = searchTafsir(query, { limit: 1000 });
  const hits = all.slice(0, 8);
  const terms = String(query).split(/\s+/);
  const total = all.length;
  return `
  <section class="panel quran-search-panel">
    <div class="panel__header">
      <h2>${t('search.tafsirResults', lang)}</h2>
      <span class="view__meta">${t('search.tafsirCount', lang, { n: total })}</span>
    </div>
    ${
      hits.length
        ? `<div class="quran-hit-list">${hits.map((h) => tafsirResultRow(state, h, editionId, editionName, lang, terms)).join('')}</div>`
        : emptyStateHTML({
            iconName: 'search',
            title: t('search.noResults', lang),
            hint: t('search.noResultsHint', lang),
          })
    }
  </section>`;
}

/** Evergreen suggestion chips for the no-query state (v4.4). Terms are * chosen to hit BOTH corpora — the adhkar/dua library and the Qur'an —
 * in each language, so the first tap always teaches what search covers. */
const SUGGESTIONS = {
  en: ['mercy', 'patience', 'forgiveness', 'paradise', 'light', 'guidance'],
  ar: ['رحمة', 'الصبر', 'مغفرة', 'الجنة', 'نور', 'هداية'],
};

const SEARCH_LIMIT = 40;

export function renderSearch(state) {
  const lang = state.settings.language;
  const query = state.activeParams.q || '';
  const results = query ? runSearch(query, { limit: SEARCH_LIMIT }) : [];
  const terms = query ? String(query).split(/\s+/) : [];
  const history = state.search.historyList;
  const suggestions = SUGGESTIONS[lang] || SUGGESTIONS.en;

  return `
  <section class="view view--search">
    <h1 class="sr-only">${t('nav.search', lang)}</h1>
    <div class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input
        type="search"
        class="search-bar__input"
        id="search-input"
        placeholder="${t('search.placeholder', lang)}"
        aria-label="${t('search.placeholder', lang)}"
        value="${escapeHTML(query)}"
        data-bind="search-query"
        autocomplete="off"
      />
    </div>

    ${
      !query
        ? `
    <div class="search-suggest">
      <div class="panel__header">
        <h2>${t('search.suggestions', lang)}</h2>
      </div>
      <div class="chip-row">
        ${suggestions
          .map(
            (q) =>
              `<button type="button" class="chip chip--query" data-action="run-search" data-query="${escapeHTML(q)}">${escapeHTML(q)}</button>`
          )
          .join('')}
      </div>
      <p class="empty-hint">${t('search.emptyHint', lang)}</p>
    </div>
    ${
      history.length
        ? `
    <div class="search-history">
      <div class="panel__header">
        <h2>${t('search.recent', lang)}</h2>
        <button type="button" class="link-btn" data-action="clear-search-history">${t('search.clearHistory', lang)}</button>
      </div>
      <div class="chip-row">
        ${history.map((q) => `<button type="button" class="chip chip--query" data-action="run-search" data-query="${escapeHTML(q)}">${escapeHTML(q)}</button>`).join('')}
      </div>
    </div>`
        : ''
    }`
        : ''
    }

    ${query ? quranSection(state, query, lang) : ''}

    ${query ? tafsirSection(state, query, lang) : ''}

    ${
      query
        ? `
      <p class="search-results-count" role="status">${t('search.resultsCount', lang, { n: results.length >= SEARCH_LIMIT ? `${SEARCH_LIMIT}+` : results.length })}</p>
      ${
        results.length
          ? `
      <div class="card-list">
        ${results
          .map((r) =>
            cardHTML(r.item, r.category, {
              lang,
              isFavorite: selectors.isFavorite(state, r.item.id),
              isSpeaking: state.speakingItemId === r.item.id,
              counter: selectors.getCounter(state, r.item.id),
              showTransliteration: state.settings.showTransliteration,
              showTranslation: state.settings.showTranslation,
              fields: fieldTogglesFor(state, r.document?.metadata?.id),
              compact: true,
              highlight: terms,
            })
          )
          .join('')}
      </div>`
          : emptyStateHTML({
              iconName: 'search',
              title: t('search.noResults', lang),
              hint: t('search.noResultsHint', lang),
            })
      }
    `
        : ''
    }
  </section>`;
}
