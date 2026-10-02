/**
 * rootAwareSearch.js — (v5.17.60, merged-plan item 13) root-aware search.
 *
 * What was true before: the library index (domain/search.js) matched
 * normalized exact substrings (AND semantics) over a transliteration
 * field with no cross-script bridging (a Latin "sabr" missed a "ṣabr"
 * written with a dotted sheen); the Qur'an index (domain/quranSearch.js)
 * matched diacritic/alef-elided exact substrings with a phrase bonus and
 * no root expansion (a word missed its own root family); the roots index
 * (domain/roots.js) folded queries but lived behind its own separate view.
 *
 * What this module adds, without changing any data file (it only READS
 * the already-bundled quran-roots + rootsMeaning corpus):
 *   - transliteration folding (Latin diacritics cancel on both sides) and
 *     a consonantal-skeleton bridge so a Latin query can reach the Arabic
 *     root it names;
 *   - root-family query expansion: an Arabic word also searches the
 *     surface forms of its root; an English word also searches the roots
 *     whose recorded classical meaning names it;
 *   - unifiedSearch(): the ONE entry point the Search view calls to
 *     combine the library, Qur'an and roots tiers and to report honestly
 *     which tiers were actually searched.
 *
 * Pure, index-local and offline-safe by construction: everything arrives
 * as arguments, nothing is fetched, nothing leaves the device. No DOM,
 * no state.js — the same convention as roots.js and wordStudy.js.
 */

import { normalizeSearch, normalizeArabic, stripQuranAnnotations } from '../core/utils.js';
import { foldRoot } from './roots.js';

/** Caps that bound expansion work (rule 6: derived from the corpus, the
 *  numbers below bound DOM/CPU weight, never corpus truth — counts stay
 *  exact everywhere they are shown). */
export const ROOT_EXPANSION_MAX_ROOTS = 6;
export const ROOT_EXPANSION_MAX_FORMS = 40;
export const ROOT_EXPANSION_FORMS_SCANNED_PER_ROOT = 8;
export const QURAN_EXPANSION_HIT_CAP = 48;

const ARABIC_RE = /[\u0600-\u06FF]/;

/**
 * Fold a Latin transliteration for bridging: NFKD cancels the dotted/
 * macron letters the corpus uses (ṣ→s, ā→a, ī→i, ū→u, ḍ→d, ṭ→t, ẓ→z,
 * ḥ→h, š→s, ġ→g, ḏ→d, ṯ→t, ḫ→h), the ayn/hamza modifiers (ʿ ʾ and their
 * ASCII lookalikes) carry no consonant and are dropped, and every other
 * punctuation mark becomes a space. Applied IDENTICALLY to indexed
 * transliterations and to typed queries.
 */
export function foldTranslit(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[ʿʾ`'’‘ʼʻ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalized Arabic → a Latin skeleton, one map for one purpose: letting
 *  a Latin query name an Arabic root (rahma→rhmh against رحم→rhm).
 *  Search-only; display text never passes through here. Vowels stay in
 *  the skeleton — consonantSkeleton() strips them when comparing. */
const ROMAN = {
  ا: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ء: '',
  ة: 'h',
};

export function romanizeArabic(s) {
  const norm = normalizeArabic(stripQuranAnnotations(String(s ?? '')));
  let out = '';
  for (const ch of norm) {
    if (ch === ' ') {
      out += ' ';
      continue;
    }
    out += ROMAN[ch] ?? '';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Vowel-stripped Latin skeleton: rahman and rhmn name the same family. */
export function consonantSkeleton(s) {
  return foldTranslit(s).replace(/[aeiou]/g, '');
}

/** Own-property guard: the roots index is a plain string-keyed map and a
 *  lookup like index['__proto__'] must never see Object.prototype. */
function hasOwn(index, key) {
  return Boolean(index) && typeof index === 'object' && Object.hasOwn(index, key);
}

/** The meanings file ships as { entries: {...} } on disk but the store
 *  keeps the entries map itself (lazyData.ensureRootsMeaning) — accept
 *  either shape, like roots.js accepts both index shapes. */
function meaningsEntries(meaningsIndex) {
  if (!meaningsIndex || typeof meaningsIndex !== 'object') return null;
  const inner = meaningsIndex.entries;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner;
  if (Array.isArray(meaningsIndex)) return null;
  return meaningsIndex;
}

function meaningText(entry, lang) {
  if (!entry || typeof entry !== 'object') return '';
  const v = entry[lang];
  return typeof v === 'string' ? v : '';
}

/** One root's occurrence surface forms (t), folded for substring search.
 *  Only the first N are scanned: expansion is a recall aid, and the full
 *  family is one tap away on the root's own page. */
function scannedForms(entry) {
  const occ = entry && Array.isArray(entry.occ) ? entry.occ : [];
  const forms = [];
  const seen = new Set();
  for (const o of occ.slice(0, ROOT_EXPANSION_FORMS_SCANNED_PER_ROOT)) {
    const t = o && typeof o.t === 'string' ? o.t : '';
    if (!t || seen.has(t)) continue;
    seen.add(t);
    forms.push(t);
  }
  return forms;
}

function rootCount(index, root) {
  const raw = hasOwn(index, root) ? index[root] : null;
  if (!raw || typeof raw !== 'object') return 0;
  if (Number.isFinite(raw.count)) return raw.count;
  return Array.isArray(raw.occ) ? raw.occ.length : 0;
}

/**
 * Expand a raw query into its root family. Returns
 * { roots: [{root, en, ar, count, reason}], arabicForms: [folded Arabic],
 *   latinTerms: [folded Latin], matched: bool }.
 *
 * Reasons name the bridge so the UI can say what it did: 'key' (the word
 * is the root or contains it), 'form' (a surface form of the root holds
 * the word), 'meaning' (the root's recorded classical meaning names the
 * English word — data/quran-roots-meaning.json, never invented), and
 * 'romanized' (the Latin skeleton names the Arabic root).
 */
export function expandQueryWithRoots(
  query,
  rootsIndex,
  meaningsIndex,
  { maxRoots = ROOT_EXPANSION_MAX_ROOTS, maxForms = ROOT_EXPANSION_MAX_FORMS } = {}
) {
  const out = { roots: [], arabicForms: [], latinTerms: [], matched: false };
  const raw = String(query ?? '').trim();
  if (!raw || !rootsIndex || typeof rootsIndex !== 'object') return out;
  const qNorm = normalizeSearch(stripQuranAnnotations(raw));
  const tokens = qNorm.split(' ').filter(Boolean);
  if (!tokens.length) return out;

  const meanings = meaningsEntries(meaningsIndex);
  const keys = Object.keys(rootsIndex).filter((k) => hasOwn(rootsIndex, k));
  if (!keys.length) return out;

  const candidates = new Map(); // root -> {root, score, reason}
  const note = (root, score, reason) => {
    const prev = candidates.get(root);
    if (!prev || score > prev.score) candidates.set(root, { root, score, reason });
  };

  for (const token of tokens) {
    if (ARABIC_RE.test(token)) {
      const fq = foldRoot(token);
      if (!fq) continue;
      for (const root of keys) {
        const fr = foldRoot(root);
        if (!fr) continue;
        if (fr.includes(fq)) note(root, fr.startsWith(fq) ? 4 : 3, 'key');
        else if (fq.includes(fr) && fr.length >= 2) note(root, 2, 'key');
      }
      // A word that is not itself a root still belongs to one: scan the
      // sampled surface forms (رحمن holds رحمة's family even though the
      // root key رحم holds no substring of رحمة — wait, it does; the
      // scan covers the cases where it does not, e.g. inflected verbs).
      for (const root of keys) {
        if (candidates.has(root)) continue;
        const forms = scannedForms(rootsIndex[root]);
        for (const t of forms) {
          if (foldRoot(normalizeArabic(stripQuranAnnotations(t))).includes(fq)) {
            note(root, 1, 'form');
            break;
          }
        }
        if (candidates.size >= maxRoots * 4) break;
      }
      // The recorded Arabic meaning can name the word too.
      if (meanings) {
        for (const root of keys) {
          if (candidates.has(root) || !hasOwn(meanings, root)) continue;
          const ar = foldRoot(meaningText(meanings[root], 'ar'));
          if (ar && (ar.includes(fq) || fq.includes(ar))) note(root, 2, 'meaning');
        }
      }
    } else {
      const fl = foldTranslit(token);
      if (!fl || fl.length < 2) continue;
      if (!out.latinTerms.includes(fl)) out.latinTerms.push(fl);
      const sk = consonantSkeleton(fl);
      if (meanings) {
        for (const root of keys) {
          if (!hasOwn(meanings, root)) continue;
          const enWords = normalizeSearch(meaningText(meanings[root], 'en'))
            .split(' ')
            .filter(Boolean);
          if (enWords.some((w) => w.startsWith(fl) || (fl.length >= 4 && w.includes(fl)))) {
            note(root, 3, 'meaning');
          }
        }
      }
      if (sk.length >= 2) {
        for (const root of keys) {
          if (candidates.has(root)) continue;
          const rs = consonantSkeleton(romanizeArabic(root));
          if (rs && (rs.includes(sk) || sk.includes(rs))) note(root, 1, 'romanized');
        }
      }
    }
  }

  if (!candidates.size) return out;
  const ranked = [...candidates.values()].sort(
    (a, b) => b.score - a.score || rootCount(rootsIndex, b.root) - rootCount(rootsIndex, a.root)
  );
  const picked = ranked.slice(0, Math.max(0, maxRoots));
  const forms = [];
  const seenForms = new Set();
  const takeForm = (f) => {
    if (forms.length >= Math.max(0, maxForms) || !f || seenForms.has(f)) return;
    seenForms.add(f);
    forms.push(f);
  };
  for (const c of picked) {
    const entry = {
      root: c.root,
      en: meanings ? meaningText(meanings[c.root], 'en') : '',
      ar: meanings ? meaningText(meanings[c.root], 'ar') : '',
      count: rootCount(rootsIndex, c.root),
      reason: c.reason,
    };
    out.roots.push(entry);
    takeForm(normalizeSearch(stripQuranAnnotations(foldRoot(c.root) ? c.root : '')));
    for (const t of scannedForms(rootsIndex[c.root])) {
      takeForm(normalizeSearch(stripQuranAnnotations(t)));
    }
  }
  out.arabicForms = forms.filter(Boolean);
  out.matched = out.roots.length > 0;
  return out;
}

/**
 * Merge exact Qur'an hits with root-expanded ones: exact matches keep
 * their scores and order (no regression — expansion can only ADD ayahs),
 * expanded hits follow in mushaf order, each carrying its root and a
 * viaRoot flag the UI renders honestly. Dedupe is by "s:a".
 */
export function mergeQuranHits(exactHits, expandedHits, { limit = Infinity } = {}) {
  const seen = new Set();
  const out = [];
  for (const h of Array.isArray(exactHits) ? exactHits : []) {
    if (!h) continue;
    const key = `${h.s}:${h.a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  const extra = (Array.isArray(expandedHits) ? expandedHits : [])
    .filter((h) => h && !seen.has(`${h.s}:${h.a}`))
    .sort(
      (x, y) => x.s - y.s || String(x.a).localeCompare(String(y.a), undefined, { numeric: true })
    );
  for (const h of extra) {
    seen.add(`${h.s}:${h.a}`);
    out.push(h);
  }
  const n = limit == null ? Infinity : Number(limit);
  return Number.isFinite(n) ? out.slice(0, Math.max(0, n)) : out;
}

/**
 * unifiedSearch() — the ONE entry point over the three tiers. The view
 * runs each tier's own search (each with its own readiness gate), then
 * combines them here so counting, merging and the honest "what was
 * searched" report cannot drift between call sites. Tiers the caller did
 * NOT run (corpus still loading or failed) are named in `pending` and
 * `failed`, never counted as zero.
 */
export function unifiedSearch(
  query,
  {
    libraryHits = [],
    quranExact = [],
    quranExpanded = [],
    rootHits = [],
    expansion = null,
    tiers = {},
    quranLimit = Infinity,
  } = {}
) {
  const quran = mergeQuranHits(quranExact, quranExpanded, { limit: quranLimit });
  // A tier that failed or is still loading was not searched — it is named
  // in failed/pending, never counted as searched-with-zero-hits.
  const isRun = (name) =>
    tiers[name] !== false && tiers[name] !== 'failed' && tiers[name] !== 'pending';
  const searched = ['library', 'quran', 'roots'].filter(isRun);
  const failed = ['library', 'quran', 'roots'].filter((name) => tiers[name] === 'failed');
  const pending = ['library', 'quran', 'roots'].filter((name) => tiers[name] === 'pending');
  return {
    query: String(query ?? ''),
    library: Array.isArray(libraryHits) ? libraryHits : [],
    quran,
    roots: Array.isArray(rootHits) ? rootHits : [],
    expansion,
    searched,
    failed,
    pending,
    empty: {
      library: libraryHits.length === 0,
      quran: quran.length === 0,
      roots: rootHits.length === 0,
    },
  };
}
