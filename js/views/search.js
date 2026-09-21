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
import { searchHadith } from '../domain/hadithSearch.js';
import { resolvePage } from '../services/surahPlayback.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { fieldTogglesFor } from '../domain/contentLens.js';
import { cardHTML } from '../ui/card.js';
import { skeletonLines } from '../ui/skeleton.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

/* (v5.9.0) pagination: shown-counts per scope ride in the URL params
   (qn/tn/ln — shareable, back-button friendly, never persisted). A new
   query resets them; the 'search-more' handler (app/handlers/items.js)
   bumps one scope via replaceGo, so no result list is ever
   hard-truncated. */
const MORE_DEFAULTS = { quran: 15, tafsir: 8, library: 40 };
function moreFor(params) {
  const n = (v, d) => {
    const k = Math.floor(Number(v));
    return Number.isFinite(k) && k > 0 ? k : d;
  };
  return {
    quran: n(params?.qn, MORE_DEFAULTS.quran),
    tafsir: n(params?.tn, MORE_DEFAULTS.tafsir),
    library: n(params?.ln, MORE_DEFAULTS.library),
  };
}
/** "Showing x of n" + Load More trigger for one scope. */
function loadMoreHTML(lang, scope, shown, total) {
  if (!(total > shown)) return '';
  return `<div class="search-more">
    <p class="empty-hint">${t('search.showingOf', lang, { x: shown, n: total })}</p>
    <button type="button" class="btn btn--secondary btn--sm" data-action="search-more" data-scope="${scope}">${t('search.loadMore', lang)}</button>
  </div>`;
}

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

function quranSection(state, query, lang, all) {
  if (!query) return '';
  // v4.1: a corpus build that failed gets an error + Retry — the shimmer
  // used to run forever with a "Loading corpus…" caption.
  if (state.loadErrors?.['quran-search-corpus']) {
    return loadErrorStateHTML({ lang, tierKey: 'quran-search-corpus', t });
  }
  if (!isQuranSearchReady() || !all) {
    return `
    <section class="panel quran-search-panel">
      <div class="panel__header"><h2>${t('search.quranResults', lang)}</h2></div>
      <p class="empty-hint">${t('search.loadingCorpus', lang)}</p>
      ${skeletonLines(lang, [92, 84, 88, 62])}
    </section>`;
  }
  // (v5.9.0) paginated: the index still runs once (uncapped, same as
  // v4.0's single-pass contract — `all` is computed by renderSearch), and
  // the Load More trigger pages the display window instead of truncating.
  const shown = moreFor(state.activeParams).quran;
  const hits = all.slice(0, shown);
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
        ? `<div class="quran-hit-list">${hits.map((h) => quranResultRow(state, h, lang, terms)).join('')}</div>${loadMoreHTML(lang, 'quran', hits.length, total)}`
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
function tafsirSection(state, query, lang, all) {
  if (!query) return '';
  if (state.loadErrors?.['tafsir-search-corpus']) {
    return loadErrorStateHTML({ lang, tierKey: 'tafsir-search-corpus', t });
  }
  if (!isTafsirSearchReady() || !all) return '';
  const editionId = tafsirIndexEdition();
  const edDoc = (state.tafsirEditions?.editions || []).find((e) => e.id === editionId);
  const editionName =
    (lang === 'ar' ? edDoc?.nameAr || edDoc?.nameEn : edDoc?.nameEn || edDoc?.nameAr) || '';
  // (v5.9.0) paginated like the Qur'an group (see quranSection).
  const shown = moreFor(state.activeParams).tafsir;
  const hits = all.slice(0, shown);
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
        ? `<div class="quran-hit-list">${hits.map((h) => tafsirResultRow(state, h, editionId, editionName, lang, terms)).join('')}</div>${loadMoreHTML(lang, 'tafsir', hits.length, total)}`
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

export function renderSearch(state) {
  const lang = state.settings.language;
  const query = state.activeParams.q || '';
  // (v5.9.0) one index pass per corpus per render (the v4.0 single-pass
  // contract): the lists feed BOTH the sections and the match-breakdown
  // counters, so counting never costs a second pass.
  const quranAll =
    query && isQuranSearchReady() && !state.loadErrors?.['quran-search-corpus']
      ? searchQuran(query, { limit: Infinity })
      : null;
  const tafsirAll =
    query && isTafsirSearchReady() && !state.loadErrors?.['tafsir-search-corpus']
      ? searchTafsir(query, { limit: Infinity })
      : null;
  const libAll = query ? runSearch(query, { limit: Infinity }) : [];
  const hadithAll = query ? searchHadith(query, { limit: Infinity }) : [];
  const azkarAll = query ? libAll.filter((r) => r.document?.metadata?.id === 'adhkar') : [];
  const libShown = query ? libAll.slice(0, moreFor(state.activeParams).library) : [];
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

    ${query ? quranSection(state, query, lang, quranAll) : ''}

    ${query ? tafsirSection(state, query, lang, tafsirAll) : ''}

    ${
      query
        ? `
      <p class="search-results-count" role="status">${t('search.breakdown', lang, { q: quranAll ? quranAll.length : 0, h: hadithAll.length, z: azkarAll.length })}</p>
      <p class="search-hadith-link"><a href="${buildHash(VIEWS.HADITH, { q: query })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-q="${escapeHTML(query)}">${icon('book', { size: 13 })} ${t('search.searchHadith', lang, { q: query })}</a></p>
      ${
        libShown.length
          ? `
      <div class="card-list">
        ${libShown
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
      </div>${loadMoreHTML(lang, 'library', libShown.length, libAll.length)}`
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
