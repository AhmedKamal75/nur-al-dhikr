/**
 * views/search.js
 * Global search: the Adhkar/Duas/Names library index (search.js) plus,
 * since v3.6, the entire Qur'an — Uthmani Arabic (diacritic-insensitive)
 * and the Sahih International translation — with jump-to-ayah results.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, highlightMatch, pickLocale, ayahCountPhrase } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { search as runSearch } from '../domain/search.js';
import { searchQuranExpanded, isQuranSearchReady } from '../domain/quranSearch.js';
import { expandQueryWithRoots } from '../domain/rootAwareSearch.js';
import { searchTafsir, isTafsirSearchReady, tafsirIndexEdition } from '../domain/tafsirSearch.js';
import { searchHadith, hadithIndexStats } from '../domain/hadithSearch.js';
import { resolvePage } from '../services/mushaf.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { fieldTogglesFor } from '../domain/contentLens.js';
import { paginate } from '../domain/searchPagination.js';
import { cardHTML } from '../ui/card.js';
import { skeletonLines } from '../ui/skeleton.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

/* (SEARCH-01) explicit page-number pagination: page state rides in the
   URL params (qp/tp/lp — shareable, back-button friendly, never
   persisted). Legacy qn/tn/ln shown-counts convert to their covering
   page (domain/searchPagination.js). A new query resets them; the
   'search-page' handler (app/handlers/items.js) moves one scope via
   a pushed history entry. Indexing still runs once per corpus per render. */
/**
 * Explicit pager for one scope: "Page X of Y" + per-scope counts +
 * Previous/Next. Single-page result sets render the counter without
 * buttons (no dead controls, keyboard/SR explicit via nav aria-label).
 */
function pageHTML(lang, scope, page, pageCount, shown, total) {
  if (!total) return '';
  const counter = `<p class="empty-hint" role="status">${t('search.pageOf', lang, { x: page, n: Math.max(pageCount, 1) })} · ${t('search.showingOf', lang, { x: shown, n: total })}</p>`;
  if (pageCount <= 1) return `<div class="search-more">${counter}</div>`;
  const prevDisabled = page <= 1 ? ' disabled aria-disabled="true"' : '';
  const nextDisabled = page >= pageCount ? ' disabled aria-disabled="true"' : '';
  return `<div class="search-more">
    ${counter}
    <nav class="search-pager" aria-label="${t('search.pageOf', lang, { x: page, n: pageCount })}">
      <button type="button" class="btn btn--secondary btn--sm" data-action="search-page" data-scope="${scope}" data-page="${page - 1}"${prevDisabled}>${t('search.previous', lang)}</button>
      <button type="button" class="btn btn--secondary btn--sm" data-action="search-page" data-scope="${scope}" data-page="${page + 1}"${nextDisabled}>${t('search.next', lang)}</button>
    </nav>
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
  // ayahs; unloaded map (or unresolvable pair) renders no link, never a
  // dead promise. Keep reader + Mushaf as sibling anchors.
  const page = resolvePage(state.mushaf?.meta?.ayahPages, hit.s, hit.a);
  const mushafLink =
    page == null
      ? ''
      : `<a class="quran-hit__mushaf" href="${buildHash(VIEWS.MUSHAF, { page: String(page), s: String(hit.s ?? ''), ay: String(hit.a ?? '') })}" data-action="navigate" data-view="${VIEWS.MUSHAF}" data-page="${page}" aria-label="${t('mushaf.openInMushaf', lang)} — ${t('mushaf.pageLabel', lang)} ${page}">${icon('book', { size: 12 })} ${t('search.mushafPage', lang, { page })}</a>`;
  const relation = hit.viaRoot
    ? `<span class="quran-hit__relation">${t('search.relatedRoot', lang, { root: hit.root || '—' })}</span>`
    : '';
  return `
  <div class="quran-hit">
    <a class="quran-hit__reader" href="${buildHash(VIEWS.QURAN, { id: hit.s, ay: String(hit.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${hit.s}" data-ay="${escapeHTML(String(hit.a))}">
      <p class="quran-hit__arabic" dir="rtl" lang="ar">${highlightMatch(ayah.text, terms)}</p>
      ${state.settings.showTranslation && ayah.translation ? `<p class="quran-hit__translation" dir="auto">${highlightMatch(ayah.translation, terms)}</p>` : ''}
      <span class="quran-hit__ref">${refLabel} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 12 })}</span>
      ${relation}
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
  // (SEARCH-01) explicit pages: the index still runs once (uncapped —
  // `all` is computed by renderSearch), the pager slices the window.
  // (v5.17.60, item 13) an empty list here means the tier RAN with zero
  // hits (loading/failure return above), so the empty state names the
  // scope that was actually searched instead of a generic "nothing".
  const { items: hits, page, pageCount, total } = paginate(all, state.activeParams, 'quran');
  const terms = String(query).split(/\s+/);
  const emptyNamed = t('search.emptyNamed', lang, { scope: t('search.scopeQuran', lang) });
  return `
  <section class="panel quran-search-panel">
    <div class="panel__header">
      <h2>${t('search.quranResults', lang)}</h2>
      <span class="view__meta">${ayahCountPhrase(total, lang)}</span>
    </div>
    ${
      hits.length
        ? `<div class="quran-hit-list">${hits.map((h) => quranResultRow(state, h, lang, terms)).join('')}</div>${pageHTML(lang, 'quran', page, pageCount, hits.length, total)}`
        : emptyStateHTML({
            iconName: 'search',
            title: emptyNamed,
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
  const page = resolvePage(state.mushaf?.meta?.ayahPages, hit.s, hit.a);
  const mushafLink =
    page == null
      ? ''
      : `<a class="quran-hit__mushaf" href="${buildHash(VIEWS.MUSHAF, { page: String(page), s: String(hit.s ?? ''), ay: String(hit.a ?? '') })}" data-action="navigate" data-view="${VIEWS.MUSHAF}" data-page="${page}" aria-label="${t('mushaf.openInMushaf', lang)} — ${t('mushaf.pageLabel', lang)} ${page}">${icon('book', { size: 12 })} ${t('search.mushafPage', lang, { page })}</a>`;
  return `
  <div class="quran-hit">
    <a class="quran-hit__reader" href="${buildHash(VIEWS.QURAN, { id: hit.s, ay: String(hit.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${hit.s}" data-ay="${escapeHTML(String(hit.a))}">
      <p class="quran-hit__translation" dir="auto">${highlightMatch(text.length > 220 ? `${text.slice(0, 220)}…` : text, terms)}</p>
      <span class="quran-hit__ref">${refLabel} ${editionName ? `· ${escapeHTML(editionName)}` : ''} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 12 })}</span>
    </a>
    ${mushafLink}
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
  // (SEARCH-01) explicit pages like the Qur'an group (see quranSection).
  const { items: hits, page, pageCount, total } = paginate(all, state.activeParams, 'tafsir');
  const terms = String(query).split(/\s+/);
  return `
  <section class="panel quran-search-panel">
    <div class="panel__header">
      <h2>${t('search.tafsirResults', lang)}</h2>
      <span class="view__meta">${t('search.tafsirCount', lang, { n: total })}</span>
    </div>
    ${
      hits.length
        ? `<div class="quran-hit-list">${hits.map((h) => tafsirResultRow(state, h, editionId, editionName, lang, terms)).join('')}</div>${pageHTML(lang, 'tafsir', page, pageCount, hits.length, total)}`
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

/** (v5.17.60, item 13) the roots tier: the query's root family as
 *  door chips into the roots view — rendered only when the expansion
 *  matched; an honest named empty when the tier ran with no family. */
function rootsSection(expansion, lang) {
  if (!expansion) return '';
  const head = `<div class="panel__header"><h2>${t('search.rootsResults', lang)}</h2><span class="view__meta">${t('search.rootsCount', lang, { n: expansion.roots.length })}</span></div>`;
  if (!expansion.matched) return '';
  return `<section class="panel roots-search-panel">${head}<div class="chip-row">${expansion.roots
    .map(
      (r) =>
        `<a class="chip chip--query" href="${buildHash(VIEWS.ROOTS, { id: r.root })}" data-action="navigate" data-view="${VIEWS.ROOTS}" data-id="${escapeHTML(r.root)}">${escapeHTML(r.root)}<span class="chip__sub">${escapeHTML(t('search.rootFamily', lang, { root: r.root, n: r.count }))}</span></a>`
    )
    .join('')}</div></section>`;
}

export function renderSearch(state) {
  const lang = state.settings.language;
  const query = state.activeParams.q || '';
  // (v5.9.0) one index pass per corpus per render (the v4.0 single-pass
  // contract): the lists feed BOTH the sections and the match-breakdown
  // counters, so counting never costs a second pass.
  // (v5.17.60, item 13) root-aware recall: the query's root family
  // expands BOTH tiers — Qur'an hits via searchQuranExpanded, library
  // hits via extraTerms. Without loaded roots indexes this degrades to
  // the exact search (expandQueryWithRoots returns unmatched).
  const expansion =
    query && !state.loadErrors?.['quran-search-corpus']
      ? expandQueryWithRoots(query, state.quranRoots, state.rootsMeaning?.index)
      : null;
  const quranRes =
    query && isQuranSearchReady() && !state.loadErrors?.['quran-search-corpus']
      ? searchQuranExpanded(query, {
          limit: Infinity,
          rootsIndex: state.quranRoots,
          meaningsIndex: state.rootsMeaning?.index,
        })
      : null;
  const quranAll = quranRes ? quranRes.hits : null;
  const tafsirAll =
    query && isTafsirSearchReady() && !state.loadErrors?.['tafsir-search-corpus']
      ? searchTafsir(query, { limit: Infinity })
      : null;
  // (v5.17.47) HONESTY: a library tier that failed to load must not read as
  // "no results".
  //
  // Every other section in this view already checks its tier
  // (`quran-search-corpus`, `tafsir-search-corpus`) and renders an error + Retry
  // instead of an empty state. The library section did not — so a cold cache
  // with no network answered a real query with "nothing found", which is a
  // claim about the corpus when the truth is that the corpus was never
  // fetched. `library.js:282` gets this right; search did not.
  const libLoadFailed = Boolean(state.loadErrors?.library);
  const libAll =
    query && !libLoadFailed
      ? runSearch(query, { limit: Infinity, extraTerms: expansion?.arabicForms })
      : [];
  const hadithAll = query ? searchHadith(query, { limit: Infinity }) : [];
  const hadithStats = hadithIndexStats();
  const hadithBooks = state.hadith?.index?.books || [];
  // The global Search build is kicked off by stateSub. While the index is
  // genuinely empty but the catalog is present, 0 would falsely mean
  // "searched and found nothing" rather than "not indexed yet".
  const hadithBreakdown =
    query && hadithBooks.length > 0 && hadithStats.records === 0 ? '—' : hadithAll.length;
  const azkarAll = query ? libAll.filter((r) => r.document?.metadata?.id === 'adhkar') : [];
  const libPage = query ? paginate(libAll, state.activeParams, 'library') : null;
  const libShown = libPage ? libPage.items : [];
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

    ${query ? rootsSection(expansion, lang) : ''}

    ${
      query
        ? `
      <p class="search-results-count" role="status">${t('search.breakdown', lang, { q: quranAll == null ? '—' : quranAll.length, h: hadithBreakdown, z: libLoadFailed ? '—' : azkarAll.length })}</p>
      <p class="search-hadith-link"><a href="${buildHash(VIEWS.HADITH, { q: query })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-q="${escapeHTML(query)}">${icon('book', { size: 13 })} ${t('search.searchHadith', lang, { q: query })}</a></p>
      ${
        libLoadFailed
          ? loadErrorStateHTML({ lang, tierKey: 'library', t })
          : libShown.length
            ? `
      <div class="card-list">
        ${libShown
          .map((r) =>
            cardHTML(r.item, r.category, {
              lang,
              isFavorite: selectors.isFavorite(state, r.item.id),
              isSpeaking: state.speakingItemId === r.item.id,
              isPlayingAudio: state.dhikrAudioItemId === r.item.id,
              counter: selectors.getCounter(state, r.item.id),
              showTransliteration: state.settings.showTransliteration,
              showTranslation: state.settings.showTranslation,
              fields: fieldTogglesFor(state, r.document?.metadata?.id),
              compact: true,
              highlight: terms,
            })
          )
          .join('')}
      </div>${pageHTML(lang, 'library', libPage.page, libPage.pageCount, libShown.length, libAll.length)}`
            : emptyStateHTML({
                iconName: 'search',
                title: t('search.emptyNamed', lang, { scope: t('search.scopeLibrary', lang) }),
                hint: t('search.noResultsHint', lang),
              })
      }
    `
        : ''
    }
  </section>`;
}
