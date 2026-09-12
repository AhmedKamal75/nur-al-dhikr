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

import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { hadithCardHTML } from './hadithCard.js';
import { HADITH_PAGE_SIZE, filterHadiths, clampPage, pageCount } from '../services/hadith.js';
import { contentPrefsOf } from '../services/contentPrefs.js';
import { skeletonHadithCard } from '../ui/skeleton.js';
import { viewMenuButton } from '../ui/viewSheet.js';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function offlineBadge(book, lang) {
  if (book.bundled) {
    return `<span class="hadith-tile__badge">${icon('download', { size: 12 })} ${t('hadith.offlineReady', lang)}</span>`;
  }
  return `<span class="hadith-tile__badge hadith-tile__badge--ondemand">${t('hadith.onDemand', lang)}</span>`;
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

  // (v5.0.0) The hadith tab gets the azkar treatment: manage mode reveals
  // per-book rows — reorder, hide, TRUE delete (restorable) — driven by the
  // same contentPrefs lens pattern the Library uses.
  const prefs = contentPrefsOf(state).hadithPrefs || {};
  const manage = !!state.ui?.contentManage;
  const deletedBooks = prefs.deletedBooks || {};
  const hiddenBooks = prefs.hiddenBooks || {};
  const bookOrder =
    Array.isArray(prefs.orderBooks) && prefs.orderBooks.length
      ? prefs.orderBooks
      : index.books.map((b) => b.id);
  const rank = new Map(bookOrder.map((id, i) => [id, i]));
  const visibleBooks = index.books
    .filter((b) => manage || (!deletedBooks[b.id] && !hiddenBooks[b.id]))
    .sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  const recoverableBooks = index.books.filter(
    (b) => deletedBooks[b.id] || (hiddenBooks[b.id] && manage)
  );

  const manageBar = manage
    ? `
    <div class="manage-bar">
      <span class="manage-bar__hint">${t('hadith.manageHint', lang)}</span>
      <span class="manage-bar__spacer"></span>
    </div>`
    : '';

  const unhideBar =
    manage && recoverableBooks.length
      ? `
    <div class="unhide-bar">
      <span class="unhide-bar__count">${t('content.hiddenBanners', lang, { n: recoverableBooks.length })}</span>
      <div class="unhide-bar__chips">
        ${recoverableBooks
          .map(
            (b) => `
        <button type="button" class="unhide-bar__chip${deletedBooks[b.id] ? ' manage-action--restore' : ''}" data-action="${deletedBooks[b.id] ? 'hadith-restore-book' : 'hadith-unhide-book'}" data-book-id="${escapeHTML(b.id)}">
          ${icon(deletedBooks[b.id] ? 'refresh' : 'eye', { size: 13 })} ${escapeHTML(pickLocale(b.name, lang))}
        </button>`
          )
          .join('')}
      </div>
    </div>`
      : '';

  return `
  <section class="view view--hadith">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('hadith.title', lang)}</h1>
      ${viewMenuButton('hadith-grid', lang, { labelKey: 'viewMenu.hadith' })}
    </div>
    <p class="view__subtitle">${t('hadith.subtitle', lang, { n: total })}</p>

    ${manageBar}
    ${unhideBar}

    <div class="hadith-grid" data-roving role="group" aria-label="${t('hadith.title', lang)}">
      ${visibleBooks
        .map((book, i) => {
          const loaded = !!state.hadith.docs[book.id];
          const manageRow = manage
            ? `
          <div class="category-tile__manage">
            <button type="button" class="manage-seg__btn" data-action="hadith-book-move" data-book-id="${escapeHTML(book.id)}" data-dir="-1" ${i > 0 ? '' : 'disabled'} aria-label="${t('content.moveUp', lang)}" title="${t('content.moveUp', lang)}">${icon('chevronUp', { size: 14 })}</button>
            <button type="button" class="manage-seg__btn" data-action="hadith-book-move" data-book-id="${escapeHTML(book.id)}" data-dir="1" ${i < visibleBooks.length - 1 ? '' : 'disabled'} aria-label="${t('content.moveDown', lang)}" title="${t('content.moveDown', lang)}">${icon('chevronDown', { size: 14 })}</button>
            <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-hide-book" data-book-id="${escapeHTML(book.id)}" aria-label="${t('content.hideSection', lang)}" title="${t('content.hideSection', lang)}">${icon('eyeOff', { size: 14 })}</button>
            <button type="button" class="icon-btn icon-btn--sm manage-action--danger" data-action="hadith-delete-book" data-book-id="${escapeHTML(book.id)}" aria-label="${t('editor.delete', lang)}" title="${t('editor.delete', lang)}">${icon('trash', { size: 14 })}</button>
          </div>`
            : '';
          return `
        <div class="category-tile-wrap">
        <a class="hadith-tile" data-roving-item href="${buildHash(VIEWS.HADITH, { id: book.id })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-id="${escapeHTML(book.id)}">
          <div class="hadith-tile__head">
            <span class="hadith-tile__icon">${icon('mosque', { size: 20 })}</span>
            ${offlineBadge(book, lang)}
          </div>
          <span class="hadith-tile__name" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(pickLocale(book.name, lang))}</span>
          <span class="hadith-tile__author">${escapeHTML(pickLocale(book.author, lang))}</span>
          <span class="hadith-tile__blurb">${escapeHTML(pickLocale(book.blurb, lang))}</span>
          <span class="hadith-tile__count">${t('hadith.bookCount', lang, { n: book.count, c: book.sectionCount })}${loaded ? ` · ${t('hadith.loaded', lang)}` : ''}</span>
        </a>
        ${manageRow}
        </div>`;
        })
        .join('')}
    </div>

    <p class="panel__subtext hadith-note">${t('hadith.sourceNote', lang)}</p>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Book reader                                                         */
/* ------------------------------------------------------------------ */

function sectionChipRow(doc, active, lang, bookmarkCount = 0) {
  const chips = [
    `<button type="button" class="chip ${active === 'all' ? 'chip--active' : ''}" data-action="hadith-section" data-id="all" aria-pressed="${active === 'all'}">${t('hadith.allChapters', lang)}</button>`,
    // (v5.2.0) Bookmarks pseudo-section — filtered in renderBookReader,
    // not in services/hadith.js (which only knows chapter ids).
    `<button type="button" class="chip ${active === 'bookmarked' ? 'chip--active' : ''}" data-action="hadith-section" data-id="bookmarked" aria-pressed="${active === 'bookmarked'}">${icon('bookmark', { size: 13 })} ${t('hadith.bookmarked', lang)} <span class="chip__count">${bookmarkCount}</span></button>`,
    ...doc.sections.map(
      (s) => `
    <button type="button" class="chip ${active === s.id ? 'chip--active' : ''}" data-action="hadith-section" data-id="${escapeHTML(s.id)}" aria-pressed="${active === s.id}" title="${escapeHTML(s.name)}">
      ${escapeHTML(s.name)} <span class="chip__count">${s.count}</span>
    </button>`
    ),
  ];
  return `<div class="chip-row chip-row--scroll">${chips.join('')}</div>`;
}

function pagerHTML(page, total, filteredCount, from, to, lang) {
  // (UX-4) chrome mirrors by UI language (the shell's U7 rule) — the old
  // hardcoded LTR pair pointed backwards for Arabic readers.
  const prevIcon = isRTL(lang) ? 'chevronRight' : 'chevronLeft';
  const nextIcon = isRTL(lang) ? 'chevronLeft' : 'chevronRight';
  return `
  <div class="hadith-pager" dir="ltr">
    <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-page-prev" ${page <= 1 ? 'disabled' : ''}>${icon(prevIcon, { size: 14 })} ${t('common.prev', lang)}</button>
    <span class="hadith-pager__status">${t('hadith.pageStatus', lang, { from, to, total: filteredCount, p: page, pages: total })}</span>
    <button type="button" class="btn btn--secondary btn--sm" data-action="hadith-page-next" ${page >= total ? 'disabled' : ''}>${t('common.next', lang)} ${icon(nextIcon, { size: 14 })}</button>
  </div>`;
}

function renderBookReader(state, lang) {
  const bookId = String(state.activeParams.id || '');
  const bookMeta = (state.hadith.index?.books || []).find((b) => b.id === bookId);
  const doc = state.hadith.docs[bookId];
  const failed = state.hadith.errors?.[bookId];

  const header = `
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.HADITH)}" data-action="navigate" data-view="${VIEWS.HADITH}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('hadith.title', lang)}</a>
      <div class="view-header--row">
        <h1 class="view__title" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(pickLocale(bookMeta?.name ?? doc?.name ?? { en: bookId }, lang))}</h1>
        ${viewMenuButton('hadith-book', lang, { labelKey: 'viewMenu.hadithBook' })}
      </div>
      ${bookMeta?.author || doc?.author ? `<p class="view__subtitle">${escapeHTML(pickLocale(bookMeta?.author ?? doc.author, lang))}</p>` : ''}
    </header>`;

  if (!doc) {
    // Unknown book id (deep link typo / stale bookmark) is not a network
    // failure: when the catalog is loaded and has no such id, say so
    // instead of the "check your connection" retry copy.
    const catalog = state.hadith.index?.books || null;
    const unknownBook = Array.isArray(catalog) && !catalog.some((b) => b.id === bookId);
    if (unknownBook) {
      return `
      <section class="view view--hadith-book">
        ${header}
        <div class="panel hadith-loading">
          <p class="empty-hint">${t('hadith.unknownBook', lang)}</p>
          <a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.HADITH)}" data-action="navigate" data-view="${VIEWS.HADITH}">${t('hadith.backToLibrary', lang)}</a>
        </div>
      </section>`;
    }
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

  const filteredAll = filterHadiths(doc, {
    query: view.query,
    // (v5.2.0) the bookmarks pseudo-section is resolved here, in the view:
    // services/hadith.js only knows real chapter ids.
    section: view.section === 'bookmarked' ? 'all' : view.section,
  });
  // (v5.0.0) hidden individual hadiths never render (manage mode still
  // hides them — the unhide bar below is the recovery point, same as azkar).
  const prefs = contentPrefsOf(state).hadithPrefs || {};
  const manage = !!state.ui?.contentManage;
  const hiddenHadiths = prefs.hiddenHadiths || {};
  const hiddenInBook = Object.keys(hiddenHadiths).filter(
    (k) => hiddenHadiths[k] && k.startsWith(`${bookId}:`)
  );
  const bookmarks = new Set(
    (state.hadithBookmarks || []).filter((k) => k.startsWith(`${bookId}:`))
  );
  const bookmarkCount = bookmarks.size;
  const filteredBase = manage
    ? filteredAll
    : filteredAll.filter((h) => !hiddenHadiths[`${bookId}:${h.n}`]);
  const filtered =
    view.section === 'bookmarked'
      ? filteredBase.filter((h) => bookmarks.has(`${bookId}:${h.n}`))
      : filteredBase;
  const page = clampPage(view.page, filtered);
  const pages = pageCount(filtered);
  const from = filtered.length ? (page - 1) * HADITH_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * HADITH_PAGE_SIZE, filtered.length);
  const sectionNames = new Map(doc.sections.map((s) => [s.id, s.name]));

  const unhideBar =
    manage && hiddenInBook.length
      ? `
    <div class="unhide-bar">
      <span class="unhide-bar__count">${t('content.hiddenCount', lang, { n: hiddenInBook.length })}</span>
      <div class="unhide-bar__chips">
        ${hiddenInBook
          .slice(0, 40)
          .map(
            (k) => `
        <button type="button" class="unhide-bar__chip" data-action="hadith-unhide-item" data-key="${escapeHTML(k)}">
          ${icon('eye', { size: 13 })} #${escapeHTML(k.split(':')[1])}
        </button>`
          )
          .join('')}
        ${hiddenInBook.length > 40 ? `<span class="unhide-bar__count">+${hiddenInBook.length - 40}</span>` : ''}
      </div>
    </div>`
      : '';

  const notes = state.hadithNotes || {};
  const memRecords = state.hadithMemRecords || {};
  const memKey = state.hadith.bookView?.memorizeKey || null;
  const memRevealed = state.hadith.bookView?.memorizeRevealed === true;
  const cards = filtered
    .slice((page - 1) * HADITH_PAGE_SIZE, page * HADITH_PAGE_SIZE)
    .map((h) => {
      const key = `${bookId}:${h.n}`;
      return hadithCardHTML(h, {
        lang,
        sectionName: sectionNames.get(h.b) || '',
        isTarget: deepTarget != null && Number(h.n) === deepTarget,
        showTranslation: state.settings.showTranslation,
        showArabic: state.settings.showHadithArabic !== false,
        manageable: manage,
        bookId,
        bookmarked: bookmarks.has(key),
        note: notes[key] || '',
        memorizing: memKey === key,
        memRevealed: memKey === key && memRevealed,
        memDue: memRecords[key]?.due || '',
      });
    })
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
      <form class="hadith-jump" data-form="hadith-jump" dir="ltr">
        <input type="number" min="1" class="hadith-jump__input" placeholder="${t('hadith.jumpPlaceholder', lang)}" aria-label="${t('hadith.jump', lang)}" />
        <button type="submit" class="btn btn--secondary btn--sm">${t('hadith.jump', lang)}</button>
      </form>
    </div>

    ${sectionChipRow(doc, view.section, lang, bookmarkCount)}

    ${unhideBar}

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
