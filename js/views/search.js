/**
 * views/search.js
 * Global search: the Adhkar/Duas/Names library index (search.js) plus,
 * since v3.6, the entire Qur'an — Uthmani Arabic (diacritic-insensitive)
 * and the Sahih International translation — with jump-to-ayah results.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { selectors } from '../state.js';
import { search as runSearch } from '../search.js';
import { searchQuran, isQuranSearchReady } from '../quranSearch.js';
import { buildHash } from '../router.js';
import { VIEWS } from '../config.js';
import { cardHTML } from '../components/card.js';
import { skeletonLines } from '../components/skeleton.js';
import { emptyStateHTML } from '../components/emptyState.js';

/** One ayah hit in the "From the Qur'an" block. Links straight to the
 *  classic reader at that surah; app.js scrolls to and highlights the
 *  target ayah once its element exists. */
function quranResultRow(state, hit, lang) {
  const surahDoc = state.quran.surahs[String(hit.s)];
  const ayah = surahDoc?.ayahs?.find((a) => String(a.number) === String(hit.a));
  const meta = state.quran.meta?.surahs?.find((s) => s.number === hit.s);
  if (!ayah) return '';
  const refLabel = `${meta ? escapeHTML(pickLocale({ en: meta.nameTransliteration || meta.nameEn, ar: meta.nameAr }, lang)) : ''} · ${hit.s}:${hit.a}`;
  return `
  <a class="quran-hit" href="${buildHash(VIEWS.QURAN, { id: hit.s, ay: String(hit.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${hit.s}" data-ay="${escapeHTML(String(hit.a))}">
    <p class="quran-hit__arabic" dir="rtl" lang="ar">${escapeHTML(ayah.text)}</p>
    ${state.settings.showTranslation && ayah.translation ? `<p class="quran-hit__translation" dir="auto">${escapeHTML(ayah.translation)}</p>` : ''}
    <span class="quran-hit__ref">${refLabel} ${icon('chevronRight', { size: 12 })}</span>
  </a>`;
}

function quranSection(state, query, lang) {
  if (!query) return '';
  if (!isQuranSearchReady()) {
    return `
    <section class="panel quran-search-panel">
      <div class="panel__header"><h2>${t('search.quranResults', lang)}</h2></div>
      <p class="empty-hint">${t('search.loadingCorpus', lang)}</p>
      ${skeletonLines(lang, [92, 84, 88, 62])}
    </section>`;
  }
  const hits = searchQuran(query, { limit: 15 });
  const total = searchQuran(query, { limit: 1000 }).length;
  return `
  <section class="panel quran-search-panel">
    <div class="panel__header">
      <h2>${t('search.quranResults', lang)}</h2>
      <span class="view__meta">${t('search.quranCount', lang, { n: total })}</span>
    </div>
    ${
      hits.length
        ? `<div class="quran-hit-list">${hits.map((h) => quranResultRow(state, h, lang)).join('')}</div>`
        : emptyStateHTML({
            iconName: 'search',
            title: t('search.noResults', lang),
            hint: t('search.noResultsHint', lang),
          })
    }
  </section>`;
}

export function renderSearch(state) {
  const lang = state.settings.language;
  const query = state.activeParams.q || '';
  const results = query ? runSearch(query, { limit: 40 }) : [];
  const history = state.search.historyList;

  return `
  <section class="view view--search">
    <div class="search-bar">
      <span class="search-bar__icon">${icon('search', { size: 18 })}</span>
      <input
        type="search"
        class="search-bar__input"
        id="search-input"
        placeholder="${t('search.placeholder', lang)}"
        value="${escapeHTML(query)}"
        data-bind="search-query"
        autocomplete="off"
      />
    </div>

    ${
      !query && history.length
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
    }

    ${query ? quranSection(state, query, lang) : ''}

    ${
      query
        ? `
      <p class="search-results-count">${t('search.resultsCount', lang, { n: results.length })}</p>
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
              compact: true,
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
