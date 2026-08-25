/**
 * views/search.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { selectors } from '../state.js';
import { search as runSearch } from '../search.js';
import { cardHTML } from '../components/card.js';

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

    ${!query && history.length ? `
    <div class="search-history">
      <div class="panel__header">
        <h2>${t('search.recent', lang)}</h2>
        <button type="button" class="link-btn" data-action="clear-search-history">${t('search.clearHistory', lang)}</button>
      </div>
      <div class="chip-row">
        ${history.map((q) => `<button type="button" class="chip chip--query" data-action="run-search" data-query="${escapeHTML(q)}">${escapeHTML(q)}</button>`).join('')}
      </div>
    </div>` : ''}

    ${query ? `
      <p class="search-results-count">${t('search.resultsCount', lang, { n: results.length })}</p>
      ${results.length ? `
      <div class="card-list">
        ${results.map((r) => cardHTML(r.item, r.category, {
          lang,
          isFavorite: selectors.isFavorite(state, r.item.id),
          isSpeaking: state.speakingItemId === r.item.id,
          counter: selectors.getCounter(state, r.item.id),
          showTransliteration: state.settings.showTransliteration,
          showTranslation: state.settings.showTranslation,
          compact: true
        })).join('')}
      </div>` : `<p class="empty-hint">${t('search.noResults', lang)}</p>`}
    ` : ''}
  </section>`;
}
