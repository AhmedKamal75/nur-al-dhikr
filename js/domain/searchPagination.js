/**
 * domain/searchPagination.js — (SEARCH-01) explicit page-number pagination.
 *
 * Replaces the Load More shown-count window with:
 *   scopePage / pageSize / resultTotal / resultPageCount
 * rendered as "Page X of Y" + Previous/Next + per-corpus counts.
 *
 * Indexing is untouched: callers still run one pass per corpus, then slice
 * the display window with paginate(). Page state rides in the URL
 * (qp/tp/lp — shareable, back-button friendly, never persisted).
 * Legacy qn/tn/ln shown-counts are honored once by converting
 * ceil(shown / pageSize) so old deep links land on the right page.
 * Pure module, offline-safe.
 */

export const SEARCH_PAGE_SIZES = Object.freeze({ quran: 15, tafsir: 8, library: 40 });

export const SEARCH_PAGE_KEYS = Object.freeze({ quran: 'qp', tafsir: 'tp', library: 'lp' });
export const SEARCH_LEGACY_KEYS = Object.freeze({ quran: 'qn', tafsir: 'tn', library: 'ln' });

function scopeOf(scope) {
  return scope === 'quran' || scope === 'tafsir' || scope === 'library' ? scope : 'library';
}

export function pageSizeFor(scope) {
  return SEARCH_PAGE_SIZES[scopeOf(scope)];
}

/**
 * Resolve the 1-based page for a scope from URL params. Hostile values
 * fall back to 1; legacy shown-counts convert to their covering page.
 */
export function resolveScopePage(params, scope) {
  const key = scopeOf(scope);
  const pageKey = SEARCH_PAGE_KEYS[key];
  const legacyKey = SEARCH_LEGACY_KEYS[key];
  const size = pageSizeFor(key);
  const raw = Math.floor(Number(params?.[pageKey]));
  if (Number.isFinite(raw) && raw >= 1) return Math.min(raw, 10000);
  const legacy = Math.floor(Number(params?.[legacyKey]));
  if (Number.isFinite(legacy) && legacy >= 1) {
    return Math.max(1, Math.min(10000, Math.ceil(legacy / size)));
  }
  return 1;
}

export function pageCountFor(total, scope) {
  const size = pageSizeFor(scope);
  const n = Math.floor(Number(total)) || 0;
  if (n <= 0) return 0;
  return Math.max(1, Math.ceil(n / size));
}

/**
 * Slice one page. Page is clamped to [1, pageCount] so hostile ?qp=999
 * shows the last page instead of an empty list. Returns items + meta.
 */
export function paginate(all, params, scope) {
  const key = scopeOf(scope);
  const size = pageSizeFor(key);
  const total = Array.isArray(all) ? all.length : 0;
  const pageCount = pageCountFor(total, key);
  if (!total) return { items: [], page: 1, pageCount: 0, total: 0, pageSize: size };
  const wanted = resolveScopePage(params, key);
  const page = Math.max(1, Math.min(wanted, pageCount));
  const start = (page - 1) * size;
  return { items: all.slice(start, start + size), page, pageCount, total, pageSize: size };
}
