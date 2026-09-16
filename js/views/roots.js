/**
 * views/roots.js — the root-family browser (v3.22.0).
 *
 * A dedicated view that shows EVERY occurrence of a Qur'anic root across
 * the whole corpus, grouped by the word-forms it takes (the per-word
 * popover's capped 8-chip sample turned into a real vocabulary tool —
 * the TODO's own framing). Two indexes feed it:
 *
 *   state.quranRoots      — the small capped popover index (precached)
 *   state.quranRootsFull  — the uncapped browser index (fetched on first
 *                           open, ~2.3 MB, then kept offline by the SW's
 *                           stale-while-revalidate data strategy)
 *
 * The detail view renders from whatever is loaded and says honestly which
 * one it is: with only the capped index present it shows a prefix of the
 * occurrences plus a "the full index is still loading" hint, upgrading to
 * the complete picture when the fetch lands. No DOM access here — same
 * render-model contract as every view.
 */
import { t, isRTL } from '../core/i18n.js';
import { escapeHTML, highlightMatch } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { buildHash } from '../core/router.js';
import { icon } from '../core/icons.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { skeletonLines } from '../ui/skeleton.js';
import {
  sanitizeRootParam,
  searchRoots,
  rootForms,
  rootStats,
  rootOccurrencesAll,
  rootList,
  ROOTS_PAGE_SIZE,
  ROOT_PREVIEW_CAP,
  ROOT_GROUP_REF_CAP,
  occurrenceGloss,
  occurrenceAyah,
  splitAyahWord,
} from '../domain/roots.js';
import { buildSimilarPairs, confusablePairsFor } from '../domain/mutashabihat.js';

/** Index-mode stats line: how many roots and how many occurrences total. */
function totals(index) {
  const list = rootList(index);
  const occurrences = list.reduce((n, r) => n + (Number.isFinite(r.count) ? r.count : 0), 0);
  return { roots: list.length, occurrences };
}

function searchBox(lang, q) {
  return `
    <div class="search-bar quran-search">
      <span class="search-bar__icon">${icon('search', { size: 18 })}</span>
      <input
        type="search"
        class="search-bar__input"
        id="roots-search-input"
        placeholder="${t('roots.searchPlaceholder', lang)}"
        aria-label="${t('roots.searchPlaceholder', lang)}"
        value="${escapeHTML(q || '')}"
        data-bind="roots-search"
        autocomplete="off"
      />
    </div>`;
}

/** Drill launcher: one tap builds a 10-card round from random surahs. */
function drillLauncherHTML(lang) {
  return `
    <section class="panel panel--grammar">
      <div class="panel__header">
        <h2>${t('grammar.title', lang)}</h2>
        <button type="button" class="btn btn--secondary btn--sm" data-action="grammar-start">
          ${icon('play', { size: 14 })} ${t('grammar.start', lang)}
        </button>
      </div>
      <p class="panel__subtext">${t('grammar.hint', lang)}</p>
    </section>`;
}

/** Active drill session: flashcard front (guess the POS) → reveal → grade. */
export function drillHTML(state, lang) {
  const d = state.grammarDrill;
  const card = d.cards[d.index] || null;
  const total = d.cards.length;
  const progress =
    d.index >= total
      ? t('grammar.done', lang, { r: d.right, n: total })
      : t('grammar.progress', lang, { i: Math.min(d.index + 1, total), n: total, r: d.right });
  let body = '';
  if (!card) {
    body = `
      <p class="grammar-score" dir="auto">${escapeHTML(progress)}</p>
      <div class="editor-form__actions">
        <button type="button" class="btn btn--secondary btn--sm" data-action="grammar-restart">${icon('repeat', { size: 14 })} ${t('grammar.restart', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="grammar-exit">${t('grammar.exit', lang)}</button>
      </div>`;
  } else if (!d.revealed) {
    body = `
      <p class="grammar-word" dir="rtl" lang="ar">${escapeHTML(card.text)}</p>
      ${lang !== 'ar' && card.translit ? `<p class="panel__subtext" dir="ltr">${escapeHTML(card.translit)}</p>` : ''}
      <p class="panel__subtext">${t('grammar.prompt', lang)} · <span dir="ltr">${card.surah}:${card.ayah}</span></p>
      <div class="editor-form__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="grammar-reveal">${t('grammar.reveal', lang)}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="grammar-exit">${t('grammar.exit', lang)}</button>
      </div>`;
  } else {
    // (v5.2.68) the revealed answer renders in the UI language: Arabic
    // POS + Arabic features (omitted when unmapped, never English), and
    // the English gloss stays English-UI-only (no Arabic gloss data ships).
    const ar = lang === 'ar';
    const pos = ar ? card.posAr : card.posEn;
    // EN feats carry the POS at [0] (skipped below); AR feats are bare.
    const featTail = ar ? card.featsAr || [] : [card.posEn, ...card.feats].filter(Boolean).slice(1);
    body = `
      <p class="grammar-word" dir="rtl" lang="ar">${escapeHTML(card.text)}</p>
      ${pos ? `<p class="grammar-answer" dir="auto"><strong>${escapeHTML(pos)}</strong>${!ar && card.posAr ? ` · <span dir="rtl" lang="ar">${escapeHTML(card.posAr)}</span>` : ''}</p>` : ''}
      ${!ar && card.gloss ? `<p class="panel__subtext" dir="auto">“${escapeHTML(card.gloss)}”</p>` : ''}
      ${featTail.length ? `<p class="panel__subtext" dir="auto">${escapeHTML(featTail.join(' · '))}</p>` : ''}
      ${card.root ? `<p class="panel__subtext">${t('roots.title', lang)}: <span dir="rtl" lang="ar">${escapeHTML(card.root)}</span></p>` : ''}
      <div class="editor-form__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="grammar-grade" data-right="1">${icon('check', { size: 14 })} ${t('grammar.right', lang)}</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="grammar-grade" data-right="0">${icon('close', { size: 14 })} ${t('grammar.wrong', lang)}</button>
      </div>`;
  }
  return `
    <section class="panel panel--grammar" aria-live="polite">
      <div class="panel__header">
        <h2>${t('grammar.title', lang)}</h2>
        <span class="chip__count" dir="ltr">${escapeHTML(progress)}</span>
      </div>
      ${body}
    </section>`;
}

/** Index mode: searchable list of all root families, busiest first. */
function renderRootsIndex(state, lang) {
  const q = state.activeParams?.q || '';
  const index = state.quranRoots;
  const { roots, occurrences } = totals(index);
  // Uncapped search for the true total; the page slices the render list
  // (was a hard 60 with no way to see more).
  const all = searchRoots(index, q, Number.MAX_SAFE_INTEGER);
  const pages = Math.max(1, Math.ceil(all.length / ROOTS_PAGE_SIZE));
  const rawPage = Math.floor(Number(state.activeParams?.page));
  const page = !Number.isFinite(rawPage) || rawPage < 1 ? 1 : Math.min(pages, rawPage);
  const results = all.slice((page - 1) * ROOTS_PAGE_SIZE, page * ROOTS_PAGE_SIZE);
  const filtering = Boolean(String(q).trim());
  const from = all.length ? (page - 1) * ROOTS_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * ROOTS_PAGE_SIZE, all.length);

  const tiles = results
    .map(
      (r) => `
    <a class="root-tile" href="${buildHash(VIEWS.ROOTS, { id: r.root })}" data-action="navigate" data-view="${VIEWS.ROOTS}" data-id="${escapeHTML(r.root)}">
      <span class="root-tile__name" dir="rtl" lang="ar">${highlightMatch(r.root, String(q).split(/\s+/))}</span>
      <span class="root-tile__meta">${t('roots.statOccurrences', lang, { n: r.count })}</span>
    </a>`
    )
    .join('');

  const totalLine = filtering
    ? t('roots.showing', lang, { n: results.length, total: all.length })
    : t('roots.indexStats', lang, { n: roots, m: occurrences });

  const pager =
    pages <= 1
      ? ''
      : `
    <div class="roots-pager" dir="ltr">
      <button type="button" class="btn btn--secondary btn--sm" data-action="roots-page" data-page="${page - 1}" data-q="${escapeHTML(String(q))}" ${
        page <= 1 ? 'disabled' : ''
      }>${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 14 })} ${t('common.prev', lang)}</button>
      <span class="roots-pager__status">${t('journal.pageStatus', lang, { from, to, total: all.length, p: page, pages })}</span>
      <button type="button" class="btn btn--secondary btn--sm" data-action="roots-page" data-page="${page + 1}" data-q="${escapeHTML(String(q))}" ${
        page >= pages ? 'disabled' : ''
      }>${t('common.next', lang)} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 14 })}</button>
    </div>`;

  const drill = state.grammarDrill ? drillHTML(state, lang) : drillLauncherHTML(lang);
  return `
  <section class="view view--roots">
    <h1 class="view__title">${t('roots.title', lang)}</h1>
    <p class="view__subtitle">${t('roots.subtitle', lang)}</p>
    ${drill}
    ${searchBox(lang, q)}
    <p class="roots-totals">${totalLine}</p>
    <div class="surah-grid">
      ${tiles || `<p class="empty-hint">${t('roots.empty', lang, { q: String(q) })}</p>`}
    </div>
    ${pager}
  </section>`;
}

/**
 * One ayah preview: the loaded ayah text with the occurrence word marked,
 * its word-gloss, and a jump into the reader. Previews render only for
 * surahs already loaded (zero surprise fetches); the ref chips below
 * cover the rest one tap away.
 */
function previewHTML(o, ayah, gloss, lang, showTranslation) {
  const split = splitAyahWord(ayah.text, o.i, o.t);
  const text = split
    ? `${escapeHTML(split.pre)}${split.pre ? ' ' : ''}<mark>${escapeHTML(split.word)}</mark>${split.post ? ` ${escapeHTML(split.post)}` : ''}`
    : escapeHTML(ayah.text);
  return `
      <a class="root-preview" href="${buildHash(VIEWS.QURAN, { id: String(o.s), ay: String(o.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${escapeHTML(String(o.s))}" data-ay="${escapeHTML(String(o.a))}">
        <span class="root-preview__ref" dir="ltr">${Number(o.s) || ''}:${Number(o.a) || ''}</span>
        <span class="root-preview__text" dir="rtl" lang="ar">${text}</span>
        ${lang !== 'ar' && gloss ? `<span class="root-preview__gloss" dir="auto">${escapeHTML(gloss)}</span>` : ''}
        ${showTranslation && typeof ayah.translation === 'string' && ayah.translation ? `<span class="root-preview__trans" dir="auto">${escapeHTML(ayah.translation)}</span>` : ''}
      </a>`;
}

/**
 * One word-form group: the vocalized form, its count, ayah previews for
 * loaded surahs (capped), and every ref chip (overflow behind an
 * expander so 300-occurrence roots stay light).
 */
function formGroupHTML(g, lang, ctx) {
  const shown = g.occ.slice(0, ROOT_GROUP_REF_CAP);
  const extra = g.occ.slice(ROOT_GROUP_REF_CAP);
  const refChip = (o) => `
      <button type="button" class="chip chip--basis root-ref" data-action="roots-jump" data-surah="${Number(o.s) || ''}" data-ayah="${Number(o.a) || ''}">
        <span dir="ltr">${Number(o.s) || ''}:${Number(o.a) || ''}</span>
      </button>`;
  const previews = [];
  for (const o of g.occ) {
    if (previews.length >= ROOT_PREVIEW_CAP) break;
    const ayah = occurrenceAyah(ctx.surahs, o.s, o.a);
    if (!ayah) continue;
    previews.push(
      previewHTML(
        o,
        ayah,
        occurrenceGloss(ctx.quranWords, o.s, o.a, o.i),
        lang,
        ctx.showTranslation
      )
    );
  }
  return `
    <div class="root-form" data-form-idx="${ctx.groupIdx}">
      <div class="root-form__head">
        <span class="root-form__text" dir="rtl" lang="ar">${escapeHTML(g.form)}</span>
        <span class="chip chip--basis">${t('roots.timesN', lang, { n: g.count })}</span>
      </div>
      ${previews.length ? `<div class="root-previews">${previews.join('')}</div>` : ''}
      <div class="root-form__refs">${shown.map(refChip).join('')}<span class="root-form__more" ${extra.length ? 'hidden' : ''}>${extra.map(refChip).join('')}</span></div>
      ${
        extra.length
          ? `<button type="button" class="btn btn--ghost btn--sm roots-expand" data-action="roots-expand" data-form-idx="${ctx.groupIdx}" aria-expanded="false" data-label-more="${escapeHTML(t('roots.showAll', lang, { n: extra.length }))}" data-label-less="${escapeHTML(t('roots.showLess', lang))}"><span class="roots-expand__label">${escapeHTML(t('roots.showAll', lang, { n: extra.length }))}</span></button>`
          : ''
      }
    </div>`;
}

/** Detail mode: one root's complete family, grouped by word form. */
function renderRootDetail(state, lang, root) {
  const full = state.quranRootsFull;
  const capped = state.quranRoots;
  const hasFull = Boolean(full && Object.hasOwn(full, root));
  const index = hasFull ? full : capped;
  if (!index || !Object.hasOwn(index, root)) {
    return `
    <section class="view view--roots">
      <h1 class="view__title">${t('roots.title', lang)}</h1>
      <p class="empty-hint">${t('roots.notFound', lang)}</p>
      <a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.ROOTS, {})}">${t('roots.back', lang)}</a>
    </section>`;
  }

  const stats = rootStats(index[root]);
  const forms = rootForms(index[root]);
  const occ = rootOccurrencesAll(index, root);
  const partial = !hasFull && occ.length < stats.count;

  // (v5.2.75, UP-09) look-alikes for this root, derived from the shared
  // computed pair cache filtered by the root's own occurrences — the two
  // vocabulary tools finally know each other. Deep-linkable via
  // #/roots/<root>?tab=confusables.
  const ayahKeys = new Set(
    occ
      .filter((o) => o && Number.isFinite(Number(o.s)) && Number.isFinite(Number(o.a)))
      .map((o) => `${Number(o.s)}:${Number(o.a)}`)
  );
  const confusables = confusablePairsFor(buildSimilarPairs(state.quran?.surahs), ayahKeys);
  const tab = state.activeParams?.tab === 'confusables' ? 'confusables' : 'forms';
  const tabBtn = (id, label, pressed) => `
    <button type="button" class="chip ${pressed ? 'chip--active' : ''}" data-action="roots-tab" data-root="${escapeHTML(root)}" data-tab="${id}" aria-pressed="${pressed}">${escapeHTML(label)}</button>`;
  const confusablesBlock =
    confusables.length > 0
      ? `<div class="root-confusables">${confusables
          .slice(0, 12)
          .map(
            (p) => `
        <div class="root-confusable">
          <p class="root-confusable__arabic" dir="rtl" lang="ar">${escapeHTML(p.a.text || '')}</p>
          <p class="root-confusable__arabic" dir="rtl" lang="ar">${escapeHTML(p.b.text || '')}</p>
          <div class="root-confusable__refs" dir="ltr">
            <a href="${buildHash(VIEWS.QURAN, { id: p.a.s, ay: String(p.a.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${p.a.s}" data-ay="${escapeHTML(String(p.a.a))}">${p.a.s}:${escapeHTML(String(p.a.a))}</a>
            <span aria-hidden="true">·</span>
            <a href="${buildHash(VIEWS.QURAN, { id: p.b.s, ay: String(p.b.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${p.b.s}" data-ay="${escapeHTML(String(p.b.a))}">${p.b.s}:${escapeHTML(String(p.b.a))}</a>
          </div>
        </div>`
          )
          .join('')}</div>`
      : `<p class="empty-hint">${t('roots.confusablesNeedCorpus', lang)} <a class="link-btn" href="${buildHash(VIEWS.SEARCH)}" data-action="navigate" data-view="${VIEWS.SEARCH}">${t('nav.search', lang)}</a></p>`;

  const statChips = [
    t('roots.statOccurrences', lang, { n: stats.count }),
    t('roots.statForms', lang, { n: stats.forms }),
    t('roots.statSurahs', lang, { n: stats.surahs }),
  ]
    .map((s) => `<span class="chip chip--basis">${escapeHTML(s)}</span>`)
    .join('');
  const ctx = {
    surahs: state.quran?.surahs,
    quranWords: state.quranWords,
    // Same gate as the classic reader: the user's explicit translation pref.
    showTranslation: !!state.settings?.showTranslation,
  };

  return `
  <section class="view view--roots">
    <a class="roots-back" href="${buildHash(VIEWS.ROOTS, {})}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 14 })} ${t('roots.back', lang)}</a>
    <h1 class="sr-only">${t('title.roots', lang)} — <span dir="rtl" lang="ar">${escapeHTML(root)}</span></h1>
    <div class="root-detail__head">
      <span class="root-detail__name" dir="rtl" lang="ar">${escapeHTML(root)}</span>
      <div class="root-detail__stats">${statChips}</div>
      ${
        partial
          ? `<p class="roots-partial-hint">${t('roots.sampleHint', lang, { n: occ.length, m: stats.count })}${
              state.loadErrors?.['quran-roots-full']
                ? ` <button type="button" class="link-btn link-btn--sm" data-action="retry-load" data-key="quran-roots-full">${escapeHTML(t('common.retry', lang))}</button>`
                : ''
            }</p>`
          : ''
      }
    </div>
    <div class="chip-row" role="group" aria-label="${escapeHTML(root)}">
      ${tabBtn('forms', t('roots.tabForms', lang), tab !== 'confusables')}
      ${tabBtn('confusables', t('roots.tabConfusables', lang, { n: confusables.length }), tab === 'confusables')}
    </div>
    ${
      tab === 'confusables'
        ? confusablesBlock
        : `<div class="root-forms">${forms.map((g, gi) => formGroupHTML(g, lang, { ...ctx, groupIdx: gi })).join('')}</div>`
    }
  </section>`;
}

/** View entry — dispatched from renderer.js's VIEW_TABLE. */
export function renderRoots(state) {
  const lang = state.settings.language;
  if (!state.quranRoots) {
    // (v5.2.78, BUG-02) the roots tier joins the loadErrors + Retry
    // machinery: a timed-out/failed index shows error + Retry instead of a
    // forever skeleton. Retry clears the flag, bumps loadRetryCount (which
    // notifies stateSub), and the reset guard refetches.
    if (state.loadErrors?.['quran-roots']) {
      return `
      <section class="view view--roots">
        <h1 class="view__title">${t('roots.title', lang)}</h1>
        ${loadErrorStateHTML({ lang, tierKey: 'quran-roots', t })}
      </section>`;
    }
    // First visit before the (precached) popover index lands — a moment,
    // but mirror the shape honestly like every other lazy surface.
    return `
    <section class="view view--roots">
      <h1 class="view__title">${t('roots.title', lang)}</h1>
      ${skeletonLines(lang, [40, 92, 84, 90, 78])}
    </section>`;
  }
  const root = sanitizeRootParam(state.activeParams?.id || '');
  return root ? renderRootDetail(state, lang, root) : renderRootsIndex(state, lang);
}
