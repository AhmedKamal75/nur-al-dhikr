/**
 * views/hadith.js
 * The Ahadeeth screens — one module, two faces:
 *   • no params.id  → the book grid (the library's front door)
 *   • params.id set → the book reader: chapter filter, in-book search,
 *     pagination, deep-linkable hadith highlight (#/hadith/bukhari?n=7544).
 *
 * Rendering follows the app-wide string model; every text that comes from a
 * book document is DATA and goes through escapeHTML() before it can possibly
 * touch innerHTML (the build pipeline refuses markup payloads as a second
 * gate, but the render-side escape is the authoritative defense).
 */

import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, escapeHTML } from '../utils.js';
import { VIEWS } from '../config.js';
import { HADITH_PAGE_SIZE, filterHadiths, clampPage, pageCount } from '../hadith.js';
import { skeletonHadithCard } from '../components/skeleton.js';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function offlineBadge(book, lang) {
  if (book.bundled) {
    return `<span class="hadith-tile__badge">${icon('download', { size: 12 })} ${t('hadith.offlineReady', lang)}</span>`;
  }
  return `<span class="hadith-tile__badge hadith-tile__badge--ondemand">${t('hadith.onDemand', lang)}</span>`;
}

/** One hadith card. `n` deep-link targeting highlights it via data attribute. */
function hadithCardHTML(h, { lang, sectionName = '', isTarget = false, showTranslation = true }) {
  const num = String(h.n);
  return `
  <article class="hadith-card${isTarget ? ' hadith-card--target' : ''}" ${isTarget ? 'data-hadith-target' : ''} id="hadith-${escapeHTML(num)}">
    <div class="hadith-card__meta">
      <span class="hadith-card__number" dir="ltr">#${escapeHTML(num)}</span>
      ${sectionName ? `<span class="hadith-card__section">${escapeHTML(sectionName)}</span>` : ''}
    </div>
    ${h.ar ? `<p class="hadith-card__arabic" dir="rtl" lang="ar">${escapeHTML(h.ar)}</p>` : ''}
    ${h.en && showTranslation ? `<p class="hadith-card__translation" dir="ltr">${escapeHTML(h.en)}</p>` : ''}
    <div class="hadith-card__actions">
      <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-copy" data-n="${escapeHTML(num)}" aria-label="${t('common.copy', lang)}">${icon('copy', { size: 15 })}</button>
    </div>
  </article>`;
}

/* ------------------------------------------------------------------ */
/* Book grid                                                           */
/* ------------------------------------------------------------------ */

function renderBookGrid(state, lang) {
  const index = state.hadith.index;

  if (!index) {
    const failed = state.hadith.indexFailed;
    return `
    <section class="view view--hadith">
      <header class="view-header">
        <h1 class="view__title">${t('hadith.title', lang)}</h1>
      </header>
      <div class="panel hadith-loading">
        ${
          failed
            ? `<p class="empty-hint">${t('hadith.loadFailed', lang)}</p>
        <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-retry-index">${t('common.retry', lang)}</button>`
            : skeletonHadithCard(lang)
        }
      </div>
    </section>`;
  }

  const total = index.books.reduce((a, b) => a + b.count, 0);

  return `
  <section class="view view--hadith">
    <header class="view-header">
      <h1 class="view__title">${t('hadith.title', lang)}</h1>
      <p class="view__subtitle">${t('hadith.subtitle', lang, { n: total })}</p>
    </header>

    <div class="hadith-grid">
      ${index.books
        .map((book) => {
          const loaded = !!state.hadith.docs[book.id];
          return `
        <a class="hadith-tile" href="${buildHash(VIEWS.HADITH, { id: book.id })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-id="${escapeHTML(book.id)}">
          <div class="hadith-tile__head">
            <span class="hadith-tile__icon">${icon('mosque', { size: 20 })}</span>
            ${offlineBadge(book, lang)}
          </div>
          <span class="hadith-tile__name" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(pickLocale(book.name, lang))}</span>
          <span class="hadith-tile__author">${escapeHTML(pickLocale(book.author, lang))}</span>
          <span class="hadith-tile__blurb">${escapeHTML(pickLocale(book.blurb, lang))}</span>
          <span class="hadith-tile__count">${t('hadith.bookCount', lang, { n: book.count, c: book.sectionCount })}${loaded ? ` · ${t('hadith.loaded', lang)}` : ''}</span>
        </a>`;
        })
        .join('')}
    </div>

    <p class="panel__subtext hadith-note">${t('hadith.sourceNote', lang)}</p>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Book reader                                                         */
/* ------------------------------------------------------------------ */

function sectionChipRow(doc, active, lang) {
  const chips = [
    `<button type="button" class="chip ${active === 'all' ? 'chip--active' : ''}" data-action="hadith-section" data-id="all">${t('hadith.allChapters', lang)}</button>`,
    ...doc.sections.map(
      (s) => `
    <button type="button" class="chip ${active === s.id ? 'chip--active' : ''}" data-action="hadith-section" data-id="${escapeHTML(s.id)}" title="${escapeHTML(s.name)}">
      ${escapeHTML(s.name)} <span class="chip__count">${s.count}</span>
    </button>`
    ),
  ];
  return `<div class="chip-row chip-row--scroll">${chips.join('')}</div>`;
}

function pagerHTML(page, total, filteredCount, from, to, lang) {
  return `
  <div class="hadith-pager" dir="ltr">
    <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-page-prev" ${page <= 1 ? 'disabled' : ''}>${icon('chevronLeft', { size: 14 })} ${t('common.prev', lang)}</button>
    <span class="hadith-pager__status">${t('hadith.pageStatus', lang, { from, to, total: filteredCount, p: page, pages: total })}</span>
    <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-page-next" ${page >= total ? 'disabled' : ''}>${t('common.next', lang)} ${icon('chevronRight', { size: 14 })}</button>
  </div>`;
}

function renderBookReader(state, lang) {
  const bookId = String(state.activeParams.id || '');
  const bookMeta = (state.hadith.index?.books || []).find((b) => b.id === bookId);
  const doc = state.hadith.docs[bookId];
  const failed = state.hadith.errors?.[bookId];

  const header = `
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.HADITH)}" data-action="navigate" data-view="${VIEWS.HADITH}">${icon('chevronLeft', { size: 18 })} ${t('hadith.title', lang)}</a>
      <h1 class="view__title" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(pickLocale(bookMeta?.name ?? doc?.name ?? { en: bookId }, lang))}</h1>
      ${bookMeta?.author || doc?.author ? `<p class="view__subtitle">${escapeHTML(pickLocale(bookMeta?.author ?? doc.author, lang))}</p>` : ''}
    </header>`;

  if (!doc) {
    return `
    <section class="view view--hadith-book">
      ${header}
      <div class="panel hadith-loading">
        ${
          failed
            ? `<p class="empty-hint">${t('hadith.loadFailed', lang)}</p>
        <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-retry" data-id="${escapeHTML(bookId)}">${t('common.retry', lang)}</button>`
            : skeletonHadithCard(lang)
        }
      </div>
    </section>`;
  }

  const view = state.hadith.bookView || { query: '', section: 'all', page: 1 };
  // Deep link ?n=<number>: app.js resolved its page + stamped consumedN via
  // HADITH_VIEW_SET. The highlight is "sticky for that link" — it stays
  // while the reader is on that book, and clears when the pager/chapters
  // move you (view state resets per book and on fresh navigations).
  const deepN = state.activeParams.n != null ? Number(state.activeParams.n) : null;
  const deepTarget =
    deepN != null && Number.isFinite(deepN) && String(view.consumedN ?? '') === String(deepN)
      ? deepN
      : null;

  const filtered = filterHadiths(doc, { query: view.query, section: view.section });
  const page = clampPage(view.page, filtered);
  const pages = pageCount(filtered);
  const from = filtered.length ? (page - 1) * HADITH_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * HADITH_PAGE_SIZE, filtered.length);
  const sectionNames = new Map(doc.sections.map((s) => [s.id, s.name]));

  const cards = filtered
    .slice((page - 1) * HADITH_PAGE_SIZE, page * HADITH_PAGE_SIZE)
    .map((h) =>
      hadithCardHTML(h, {
        lang,
        sectionName: sectionNames.get(h.b) || '',
        isTarget: deepTarget != null && Number(h.n) === deepTarget,
        showTranslation: state.settings.showTranslation,
      })
    )
    .join('');

  return `
  <section class="view view--hadith-book">
    ${header}
    ${doc.blurb ? `<p class="view__meta">${escapeHTML(pickLocale(doc.blurb, lang))}</p>` : ''}

    <div class="hadith-controls">
      <input
        type="search"
        class="search-bar__input"
        data-bind="hadith-query"
        value="${escapeHTML(view.query)}"
        placeholder="${t('hadith.searchBook', lang)}"
        aria-label="${t('hadith.searchBook', lang)}"
      />
      <form class="hadith-jump" data-action="hadith-jump" dir="ltr">
        <input type="number" min="1" class="hadith-jump__input" placeholder="${t('hadith.jumpPlaceholder', lang)}" aria-label="${t('hadith.jump', lang)}" />
        <button type="submit" class="btn btn--secondary btn--sm">${t('hadith.jump', lang)}</button>
      </form>
    </div>

    ${sectionChipRow(doc, view.section, lang)}

    ${
      filtered.length
        ? `
    <div class="card-list hadith-list">
      ${cards}
    </div>
    ${pagerHTML(page, pages, filtered.length, from, to, lang)}`
        : `
    <p class="empty-hint">${t('hadith.noResults', lang)}</p>`
    }
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function renderHadith(state) {
  const lang = state.settings.language;
  return state.activeParams?.id ? renderBookReader(state, lang) : renderBookGrid(state, lang);
}

/** The Home "Hadith of the day" card. Silently absent until its (small,
 *  precached) book has loaded — it must never block first paint. */
export function dailyHadithCardHTML(state) {
  const lang = state.settings.language;
  const daily = state.hadith?.daily;
  if (!daily) return '';
  const doc = state.hadith.docs[daily.bookId];
  const h = doc?.hadiths?.find((x) => Number(x.n) === Number(daily.n));
  if (!h) return '';
  const index = state.hadith.index;
  const bookMeta = (index?.books || []).find((b) => b.id === daily.bookId);
  return `
  <section class="panel panel--hadith-daily">
    <div class="panel__header">
      <h2>${t('hadith.dailyTitle', lang)}</h2>
      <a href="${buildHash(VIEWS.HADITH, { id: daily.bookId, n: String(h.n) })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-id="${escapeHTML(daily.bookId)}" aria-label="${t('hadith.openBook', lang)}">${icon('chevronRight', { size: 16 })}</a>
    </div>
    <p class="panel__subtext">${escapeHTML(pickLocale(bookMeta?.name ?? { en: daily.bookId }, lang))}</p>
    ${hadithCardHTML(h, { lang, showTranslation: state.settings.showTranslation })}
  </section>`;
}
