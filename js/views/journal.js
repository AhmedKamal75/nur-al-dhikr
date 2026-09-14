/**
 * views/journal.js (v4.4)
 * The private journal — duas and weekly reflections, two tabs in one view.
 * Everything is device-local; export hands the user a plain-text file they
 * own. Friday shows the week's reflection prompt at the top.
 */

import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, highlightMatch, normalizeSearch } from '../core/utils.js';
import { isoWeekKey, promptForDate, REFLECTION_PROMPTS } from '../domain/duaJournal.js';

/** Entries per journal page (was: hard .slice(0, 50) with no way to see more). */
export const JOURNAL_PAGE_SIZE = 10;

/** Clamp any hostile/edge page input into [1, pageCount]. Exported for tests. */
export function clampJournalPage(raw, total) {
  const pages = Math.max(1, Math.ceil((Number(total) || 0) / JOURNAL_PAGE_SIZE));
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(pages, n);
}

/** The entry id in `?edit=` mode (in-place editing), or null. */
function editingId(state) {
  const id = state.activeParams?.edit;
  return typeof id === 'string' && id ? id : null;
}

/** Prev/next pager preserving tab + filter (buttons drive replaceGo —
 *  see handlers/journal.js — so paging never spams history and the URL
 *  stays deep-linkable). Hidden on a single page. */
function journalPagerHTML({ page, pages, from, to, total, lang, tab, q }) {
  if (pages <= 1) return '';
  const prevIcon = isRTL(lang) ? 'chevronRight' : 'chevronLeft';
  const nextIcon = isRTL(lang) ? 'chevronLeft' : 'chevronRight';
  const status = t('journal.pageStatus', lang, { from, to, total, p: page, pages });
  return `
  <div class="journal-pager" dir="ltr">
    <button type="button" class="btn btn--secondary btn--sm" data-action="journal-page" data-tab="${tab}" data-q="${escapeHTML(q)}" data-page="${page - 1}" ${
      page <= 1 ? 'disabled' : ''
    }>${icon(prevIcon, { size: 14 })} ${t('common.prev', lang)}</button>
    <span class="journal-pager__status">${escapeHTML(status)}</span>
    <button type="button" class="btn btn--secondary btn--sm" data-action="journal-page" data-tab="${tab}" data-q="${escapeHTML(q)}" data-page="${page + 1}" ${
      page >= pages ? 'disabled' : ''
    }>${t('common.next', lang)} ${icon(nextIcon, { size: 14 })}</button>
  </div>`;
}

const isFriday = () => new Date().getDay() === 5;

function promptText(promptId, lang) {
  return t(`journal.prompt.${promptId}`, lang);
}

function journalTerms(state) {
  const q = String(state.activeParams.q || '');
  return { q, terms: q ? q.split(/\s+/) : [], norm: normalizeSearch(q) };
}

function duaRows(state) {
  const lang = state.settings.language;
  const { q, terms, norm } = journalTerms(state);
  const all = state.duaJournal;
  const filtered = q
    ? all.filter(
        (e) => normalizeSearch(e.text).includes(norm) || (norm && e.date.includes(q.trim()))
      )
    : all;
  const page = clampJournalPage(state.activeParams?.page, filtered.length);
  const pages = Math.max(1, Math.ceil(filtered.length / JOURNAL_PAGE_SIZE));
  const list = filtered.slice((page - 1) * JOURNAL_PAGE_SIZE, page * JOURNAL_PAGE_SIZE);
  const edit = editingId(state);
  const from = filtered.length ? (page - 1) * JOURNAL_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * JOURNAL_PAGE_SIZE, filtered.length);
  if (!filtered.length)
    return `<p class="empty-hint">${q ? t('search.noResults', lang) : t('journal.duaEmpty', lang)}</p>`;
  return `
  <div class="journal-list">
    ${list
      .map((e) =>
        e.id === edit
          ? `
    <article class="journal-entry">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.date)}">${escapeHTML(e.date)}</time>
      </header>
      <textarea class="journal-textarea" rows="3" data-bind="journal-edit-text" dir="auto" aria-label="${t('editor.edit', lang)}">${escapeHTML(e.text)}</textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="dua-edit-save">${t('common.save', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="journal-edit-cancel">${t('common.cancel', lang)}</button>
      </div>
    </article>`
          : `
    <article class="journal-entry${e.answered ? ' journal-entry--answered' : ''}">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.date)}">${escapeHTML(e.date)}</time>
        <div class="journal-entry__actions">
          <button type="button" class="icon-btn${e.answered ? ' icon-btn--active' : ''}" data-action="dua-toggle-answered" data-id="${escapeHTML(e.id)}" aria-pressed="${e.answered}" aria-label="${t('journal.markAnswered', lang)}" title="${t('journal.markAnswered', lang)}">
            ${icon(e.answered ? 'check' : 'heart', { size: 16 })}
          </button>
          <button type="button" class="icon-btn" data-action="journal-edit-open" data-id="${escapeHTML(e.id)}" aria-label="${t('editor.edit', lang)}" title="${t('editor.edit', lang)}">
            ${icon('edit', { size: 16 })}
          </button>
          <button type="button" class="icon-btn" data-action="dua-remove" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">
            ${icon('trash', { size: 16 })}
          </button>
        </div>
      </header>
      <p class="journal-entry__text" dir="auto">${highlightMatch(e.text, terms)}</p>
      ${e.answered ? `<span class="chip chip--success">${t('journal.answered', lang)}</span>` : ''}
    </article>`
      )
      .join('')}
  </div>
  ${journalPagerHTML({ page, pages, from, to, total: filtered.length, lang, tab: 'duas', q })}`;
}

function reflectionRows(state) {
  const lang = state.settings.language;
  const { q, terms, norm } = journalTerms(state);
  const all = state.reflections;
  const filtered = q
    ? all.filter(
        (e) =>
          normalizeSearch(
            `${e.text} ${e.promptId ? promptText(e.promptId, lang) : ''} ${e.week}`
          ).includes(norm) ||
          (norm && e.week.includes(q.trim()))
      )
    : all;
  const page = clampJournalPage(state.activeParams?.page, filtered.length);
  const pages = Math.max(1, Math.ceil(filtered.length / JOURNAL_PAGE_SIZE));
  const list = filtered.slice((page - 1) * JOURNAL_PAGE_SIZE, page * JOURNAL_PAGE_SIZE);
  const edit = editingId(state);
  const from = filtered.length ? (page - 1) * JOURNAL_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * JOURNAL_PAGE_SIZE, filtered.length);
  if (!filtered.length)
    return `<p class="empty-hint">${q ? t('search.noResults', lang) : t('journal.reflectionEmpty', lang)}</p>`;
  return `
  <div class="journal-list">
    ${list
      .map((e) =>
        e.id === edit
          ? `
    <article class="journal-entry">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.week)}">${escapeHTML(e.week)}</time>
      </header>
      ${e.promptId ? `<p class="journal-entry__prompt">${escapeHTML(promptText(e.promptId, lang))}</p>` : ''}
      <textarea class="journal-textarea" rows="4" data-bind="journal-edit-text" dir="auto" aria-label="${t('editor.edit', lang)}">${escapeHTML(e.text)}</textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="reflection-edit-save">${t('common.save', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="journal-edit-cancel">${t('common.cancel', lang)}</button>
      </div>
    </article>`
          : `
    <article class="journal-entry">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.week)}">${escapeHTML(e.week)}</time>
        <div class="journal-entry__actions">
          <button type="button" class="icon-btn" data-action="journal-edit-open" data-id="${escapeHTML(e.id)}" aria-label="${t('editor.edit', lang)}" title="${t('editor.edit', lang)}">
            ${icon('edit', { size: 16 })}
          </button>
          <button type="button" class="icon-btn" data-action="reflection-remove" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 16 })}</button>
        </div>
      </header>
      ${e.promptId ? `<p class="journal-entry__prompt">${escapeHTML(promptText(e.promptId, lang))}</p>` : ''}
      <p class="journal-entry__text" dir="auto">${highlightMatch(e.text, terms)}</p>
    </article>`
      )
      .join('')}
  </div>
  ${journalPagerHTML({ page, pages, from, to, total: filtered.length, lang, tab: 'reflections', q })}`;
}

export function renderJournal(state) {
  const lang = state.settings.language;
  const tab = state.activeParams.tab === 'reflections' ? 'reflections' : 'duas';
  const week = isoWeekKey(new Date());
  const promptId = promptForDate(new Date());

  return `
  <section class="view view--journal">
    <h1 class="view__title">${t('journal.title', lang)}</h1>
    <p class="view__subtitle">${t('journal.subtitle', lang)}</p>

    ${
      isFriday() || tab === 'reflections'
        ? `
    <section class="panel panel--prompt">
      <div class="panel__header"><h2>${t('journal.weeklyPrompt', lang)}</h2><span class="view__meta" dir="ltr">${escapeHTML(week)}</span></div>
      <p class="prompt__text">${escapeHTML(promptText(promptId, lang))}</p>
      <textarea class="journal-textarea" rows="4" data-bind="reflection-text" aria-label="${t('journal.writeHere', lang)}" placeholder="${t('journal.writeHere', lang)}"></textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="reflection-save" data-week="${escapeHTML(week)}" data-prompt="${escapeHTML(promptId)}">${t('journal.saveReflection', lang)}</button>
      </div>
    </section>`
        : ''
    }

    <div class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input type="search" class="search-bar__input" id="journal-search-input"
        placeholder="${t('journal.searchPh', lang)}" aria-label="${t('journal.searchPh', lang)}" value="${escapeHTML(state.activeParams.q || '')}"
        data-bind="journal-search" autocomplete="off" />
    </div>

    <div class="segmented" role="tablist" aria-label="${t('journal.title', lang)}">
      <a role="tab" aria-selected="${tab === 'duas'}" class="segmented__btn${tab === 'duas' ? ' segmented__btn--active' : ''}" href="#/journal" data-action="navigate" data-view="journal">${t('journal.tabDuas', lang)}</a>
      <a role="tab" aria-selected="${tab === 'reflections'}" class="segmented__btn${tab === 'reflections' ? ' segmented__btn--active' : ''}" href="#/journal?tab=reflections" data-action="navigate" data-view="journal" data-query="tab=reflections">${t('journal.tabReflections', lang)}</a>
    </div>

    ${
      tab === 'duas'
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('journal.newDua', lang)}</h2></div>
      <textarea class="journal-textarea" rows="3" data-bind="dua-text" aria-label="${t('journal.duaPlaceholder', lang)}" placeholder="${t('journal.duaPlaceholder', lang)}"></textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="dua-save">${t('journal.saveDua', lang)}</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel__header">
        <h2>${t('journal.tabDuas', lang)}</h2>
        <button type="button" class="link-btn link-btn--sm" data-action="journal-export">${t('journal.export', lang)}</button>
      </div>
      ${duaRows(state)}
    </section>`
        : `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('journal.tabReflections', lang)}</h2>
        <button type="button" class="link-btn link-btn--sm" data-action="journal-export">${t('journal.export', lang)}</button>
      </div>
      ${reflectionRows(state)}
    </section>`
    }
  </section>`;
}

export { REFLECTION_PROMPTS };
