/**
 * roots.js — pure logic for the root-family browser (v3.22.0).
 *
 * The per-word popover's "same root elsewhere" list (wordStudy.js) is a
 * capped 8-item sample from data/quran-roots.json. This module powers the
 * dedicated view that shows EVERY occurrence of a root across the whole
 * Qur'an (data/quran-roots-full.json, uncapped), grouped by the word-forms
 * the root actually takes. No DOM, no state.js — data arrives as plain
 * arguments, the same convention as wordStudy.js and mushaf.js.
 *
 * Two shapes exist in the wild and both are accepted everywhere here:
 *   - the capped popover index (data/quran-roots.json)
 *   - the full browser index  (data/quran-roots-full.json)
 * Entries look like { count, occ: [{s, a, i, t}] } where t is the fully
 * vocalized surface form.
 */

/** Arabic letter ranges: hamza-bearing alef forms through the extended
 *  letters (ة، ي، ى live in 0621–064A; ٠٦٧١–٠٦D٣ covers dagger alif and
 *  small letters used in Uthmani spellings). Anything else in a root
 *  parameter — diacritics, Latin, HTML, control chars — is junk. */
const ARABIC_LETTER = /[\u0621-\u064A\u0671-\u06D3]/g;
const DIACRITIC = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;

/**
 * Defensive root-parameter cleanup for deep links (#/roots/<id>). Keeps
 * only Arabic letters (dropping harakat, tatweel, punctuation, markup,
 * Latin), caps length, and returns '' for anything that isn't at least
 * one Arabic letter long afterwards. '__proto__' and friends fold to ''
 * because they carry no Arabic letters — callers treat '' as "no root".
 */
export function sanitizeRootParam(raw) {
  if (typeof raw !== 'string') return '';
  // Strip harakat/tatweel FIRST: tatweel (U+0640) lives inside the letter
  // range 0621–064A, so a range-only match would keep it as a "letter".
  const letters = raw.replace(DIACRITIC, '').match(ARABIC_LETTER) || [];
  // A root is a handful of letters; 8 comfortably covers the longest
  // Qur'anic roots (e.g. استغفر-style quadriliterals with radicals).
  return letters.slice(0, 8).join('');
}

/**
 * Forgiving search folding applied IDENTICALLY to stored root keys and to
 * typed queries: harakat/tatweel/dagger-alif stripped, alef variants
 * (أ إ آ ٱ ا) unified to bare alef, ى→ي, ة→ه. So typing "اله" finds the
 * root "أله", "QTalam"-style typos simply miss (no Latin in roots).
 */
export function foldRoot(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(DIACRITIC, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647');
}

/** Own-property guard: a lookup like index['__proto__'] must never see
 *  Object.prototype — treat the index as a plain string-keyed map. */
function hasRoot(index, root) {
  return Boolean(index) && typeof index === 'object' && Object.hasOwn(index, root);
}

/** One entry's own-shape fallback: count + occ with everything else junk-
 *  proof (missing occ -> [], negative counts clamped by the occ truth). */
function entryOf(index, root) {
  if (!hasRoot(index, root)) return { count: 0, occ: [] };
  const raw = index[root] || {};
  const occ = Array.isArray(raw.occ) ? raw.occ.filter(Boolean) : [];
  return { count: Number.isFinite(raw.count) ? raw.count : occ.length, occ };
}

/**
 * All roots as {root, count}, sorted by count desc then root asc.
 * Deterministic, so the index view renders identically every boot.
 */
export function rootList(index) {
  if (!index || typeof index !== 'object') return [];
  return Object.keys(index)
    .filter((k) => hasRoot(index, k))
    .map((root) => ({ root, count: entryOf(index, root).count }))
    .sort((p, q) => q.count - p.count || (p.root < q.root ? -1 : p.root > q.root ? 1 : 0));
}

/**
 * Search roots by a (typically folded or partial) query. Empty/whitespace
 * query returns the top roots by count (the browse-all default). Matches
 * are prefix-first: a root whose folded key STARTS WITH the folded query
 * outranks one that merely contains it. `limit` caps the render list —
 * the UI states the true total separately (rootList is the full truth).
 */
export function searchRoots(index, query, limit = 60) {
  const all = rootList(index);
  const q = foldRoot(String(query ?? '')).trim();
  if (!q) return all.slice(0, limit);
  const hits = [];
  for (const item of all) {
    const key = foldRoot(item.root);
    if (!key.includes(q)) continue;
    hits.push({ ...item, prefix: key.startsWith(q) ? 0 : 1 });
  }
  hits.sort((p, r) => p.prefix - r.prefix || r.count - p.count);
  return hits.slice(0, limit);
}

/**
 * Group a root's occurrences by their exact vocalized word-form (t).
 * Returns [{form, count, occ}] sorted by group size desc, ties broken by
 * first appearance in mushaf order — stable across renders. Every
 * occurrence lands in exactly one group (the groups partition occ).
 */
export function rootForms(entry) {
  const occ = entry && Array.isArray(entry.occ) ? entry.occ.filter(Boolean) : [];
  const byForm = new Map();
  for (const o of occ) {
    const form = typeof o.t === 'string' && o.t ? o.t : '';
    let g = byForm.get(form);
    if (!g) {
      g = { form, count: 0, occ: [] };
      byForm.set(form, g);
    }
    g.count += 1;
    g.occ.push(o);
  }
  return [...byForm.values()].sort(
    (p, q) => q.count - p.count || firstKey(p.occ) - firstKey(q.occ)
  );
}

/** Mushaf-order sort key of an occurrence's FIRST item (groups keep their
 *  occ sorted because the source data is built in (s,a,i) order). */
function firstKey(occ) {
  const o = occ[0];
  if (!o) return Number.MAX_SAFE_INTEGER;
  return (Number(o.s) || 0) * 1000000 + (Number(o.a) || 0) * 1000 + (Number(o.i) || 0);
}

/**
 * Header stats for a root's detail view: total occurrences, distinct word
 * forms, distinct surahs, and first/last appearances in mushaf order.
 * count prefers the file's own count field (the corpus-verified total)
 * but falls back to occ length when a hostile/partial index omits it.
 */
export function rootStats(entry) {
  const occ = entry && Array.isArray(entry.occ) ? entry.occ.filter(Boolean) : [];
  const count = entry && Number.isFinite(entry.count) ? entry.count : occ.length;
  const forms = new Set();
  const surahs = new Set();
  for (const o of occ) {
    if (!o) continue;
    forms.add(typeof o.t === 'string' ? o.t : '');
    surahs.add(Number(o.s));
  }
  return {
    count,
    forms: forms.size,
    surahs: surahs.size,
    first: occ[0] ? { s: Number(occ[0].s), a: Number(occ[0].a) } : null,
    last: occ.length
      ? { s: Number(occ[occ.length - 1].s), a: Number(occ[occ.length - 1].a) }
      : null,
  };
}

/**
 * The full occurrence list for one root — the browser's payload. Returns
 * [] for unknown roots; works on both the capped and the full index (the
 * view labels honestly which index is loaded).
 */
export function rootOccurrencesAll(index, root) {
  return entryOf(index, root).occ;
}
