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
import { t } from '../core/i18n.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { buildHash } from '../core/router.js';
import { icon } from '../core/icons.js';
import { skeletonLines } from '../ui/skeleton.js';
import {
  sanitizeRootParam,
  searchRoots,
  rootForms,
  rootStats,
  rootOccurrencesAll,
  rootList,
} from '../domain/roots.js';

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

/** Index mode: searchable list of all root families, busiest first. */
function renderRootsIndex(state, lang) {
  const q = state.activeParams?.q || '';
  const index = state.quranRoots;
  const { roots, occurrences } = totals(index);
  const results = searchRoots(index, q, 60);
  const filtering = Boolean(String(q).trim());

  const tiles = results
    .map(
      (r) => `
    <a class="root-tile" href="${buildHash(VIEWS.ROOTS, { id: r.root })}" data-action="navigate" data-view="${VIEWS.ROOTS}" data-id="${escapeHTML(r.root)}">
      <span class="root-tile__name" dir="rtl" lang="ar">${escapeHTML(r.root)}</span>
      <span class="root-tile__meta">${t('roots.statOccurrences', lang, { n: r.count })}</span>
    </a>`
    )
    .join('');

  const totalLine = filtering
    ? t('roots.showing', lang, { n: results.length, total: roots })
    : t('roots.indexStats', lang, { n: roots, m: occurrences });

  return `
  <section class="view view--roots">
    <h1 class="view__title">${t('roots.title', lang)}</h1>
    <p class="view__subtitle">${t('roots.subtitle', lang)}</p>
    ${searchBox(lang, q)}
    <p class="roots-totals">${totalLine}</p>
    <div class="surah-grid">
      ${tiles || `<p class="empty-hint">${t('roots.empty', lang, { q: String(q) })}</p>`}
    </div>
  </section>`;
}

/** One word-form group: the vocalized form, its count, and every ref. */
function formGroupHTML(g, lang) {
  const refs = g.occ
    .map(
      (o) => `
      <button type="button" class="chip chip--basis root-ref" data-action="roots-jump" data-surah="${Number(o.s) || ''}" data-ayah="${Number(o.a) || ''}">
        <span dir="ltr">${Number(o.s) || ''}:${Number(o.a) || ''}</span>
      </button>`
    )
    .join('');
  return `
    <div class="root-form">
      <div class="root-form__head">
        <span class="root-form__text" dir="rtl" lang="ar">${escapeHTML(g.form)}</span>
        <span class="chip chip--basis">${t('roots.timesN', lang, { n: g.count })}</span>
      </div>
      <div class="root-form__refs">${refs}</div>
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

  const statChips = [
    t('roots.statOccurrences', lang, { n: stats.count }),
    t('roots.statForms', lang, { n: stats.forms }),
    t('roots.statSurahs', lang, { n: stats.surahs }),
  ]
    .map((s) => `<span class="chip chip--basis">${escapeHTML(s)}</span>`)
    .join('');

  return `
  <section class="view view--roots">
    <a class="roots-back" href="${buildHash(VIEWS.ROOTS, {})}">${icon('chevronLeft', { size: 14 })} ${t('roots.back', lang)}</a>
    <h1 class="sr-only">${t('title.roots', lang)} — <span dir="rtl" lang="ar">${escapeHTML(root)}</span></h1>
    <div class="root-detail__head">
      <span class="root-detail__name" dir="rtl" lang="ar">${escapeHTML(root)}</span>
      <div class="root-detail__stats">${statChips}</div>
      ${
        partial
          ? `<p class="roots-partial-hint">${t('roots.sampleHint', lang, { n: occ.length, m: stats.count })}</p>`
          : ''
      }
    </div>
    <div class="root-forms">${forms.map((g) => formGroupHTML(g, lang)).join('')}</div>
  </section>`;
}

/** View entry — dispatched from renderer.js's VIEW_TABLE. */
export function renderRoots(state) {
  const lang = state.settings.language;
  if (!state.quranRoots) {
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
