/**
 * domain/hadithStudy.js (v5.10.1) — narrator lines + grade guide.
 *
 * Shipped book files carry texts only (no graded pipeline has run), so
 * per-hadith narrators are DERIVED from the matn/isnad wording with
 * high-confidence patterns only — anything ambiguous yields null and the
 * card simply shows no narrator line rather than a wrong one. Enriched
 * `narrator`/`grade` fields (validator pass-through) always win when
 * present. All pure, trivially unit-testable.
 */

/** Tidy an extracted name: collapse space, strip qualifiers, cap length. */
function tidyName(name) {
  if (typeof name !== 'string') return null;
  const clean = name
    .replace(/\s+/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
  if (!clean || clean.length > 80) return null;
  return clean;
}

/** Names that are never the narrator (the Prophet ﷺ speaks; others narrate). */
const NOT_NARRATOR_RE = /prophet|messenger|allah|lord|apostle/i;

function cleanCandidate(name) {
  if (typeof name !== 'string') return null;
  if (/,\s/.test(name)) return null; // lists and clauses are chains, not names
  const tidy = tidyName(name);
  if (!tidy || NOT_NARRATOR_RE.test(tidy)) return null;
  if (/^(he|she|it|they|i|you|we|someone|a man|a woman)$/i.test(tidy)) return null;
  // Parenthetical stripping can leave a kinship fragment ("('Abdullah)
  // son of Umar" → "son of Umar") — a fragment is not a name.
  if (/^(son|daughter|brother|sister|father|mother|wife|husband) of\b/i.test(tidy)) return null;
  if (/chain|hadith|similar|same\b/i.test(tidy)) return null;
  return tidy;
}

/** Passive-voice openers ("It is/was reported/said") are never narrators. */
const PASSIVE_RE = /^it\s+(is|was)\b/i;

/**
 * Companion/teacher narrator from the English text. High-confidence
 * patterns only:
 *   "Narrated 'Umar bin Al-Khattab: ..." → 'Umar bin Al-Khattab
 *   "Anas b. Malik reported: ..."       → Anas b. Malik
 *   "Abu Hurairah said: ..."            → Abu Hurairah
 *   "It was narrated from Abu Hurairah that ..." → Abu Hurairah
 *   "It is reported on the authority of Talha b. ..." → Talha b. ...
 * Long isnad chains ("X narrated to us, Y narrated to us, ...") yield
 * null — the chain head is a teacher, not the narrator, and labeling it
 * "Narrated by" would be wrong.
 */
export function hadithNarratorFromEn(en) {
  if (typeof en !== 'string' || !en.trim()) return null;
  const s = en.trim();
  // Every branch funnels through cleanCandidate — the prophet / pronoun /
  // fragment / chain guards apply uniformly, never per-pattern luck.
  let m = /^Narrated ([^:]{1,80}):/.exec(s);
  if (m) return cleanCandidate(m[1]);
  // Passive openers can never be the narrator ("It is reported: ..." —
  // without this the lazy groups below capture "It is" as a name).
  const active = PASSIVE_RE.test(s) ? null : s;
  m = active ? /^(.{1,60}?) reported:/i.exec(active) : null;
  if (m) {
    const name = cleanCandidate(m[1]);
    if (name) return name;
  }
  m = active ? /^(.{1,60}?) reported on the authority of/i.exec(active) : null;
  if (m) {
    const name = cleanCandidate(m[1]);
    if (name) return name;
  }
  m = active ? /^(.{1,60}?) said:/.exec(active) : null;
  if (m) {
    // Nested chains ("Amr narrated that: His father said:") credit the
    // direct narrator — the outer voice of this wording.
    const name = cleanCandidate(m[1].split(/\s+(?:narrated|reported)\b/i)[0]);
    if (name) return name;
  }
  m = /^It was narrated from ([^,:]{1,80}?)(?:,| that\b)/i.exec(s);
  if (m) {
    const name = cleanCandidate(m[1].split(/\s+from\b/i)[0]);
    if (name) return name;
    return tidyName(m[1]);
  }
  m = /^It was narrated that ([^,:]{1,80}?) said:/i.exec(s);
  if (m) {
    const name = cleanCandidate(m[1]);
    if (name) return name;
  }
  m = /^(?:It is|It was) (?:narrated|reported) on the authority of ([^,:]{1,80})/i.exec(s);
  if (m) return cleanCandidate(m[1].split(/\s+that\b/i)[0]);
  m = /^(?:A similar Hadith|The same hadith) was narrated from ([^,:]{1,80})/i.exec(s);
  if (m) {
    const name = cleanCandidate(m[1].split(/\s+from\b/i)[0]);
    if (name) return name;
  }
  return null;
}

/** Strip Arabic diacritics for pattern matching. */
function stripTashkeel(s) {
  return String(s).replace(/[ً-ٰٟ]/g, '');
}

/**
 * Companion narrator from the Arabic isnad: the name before
 * "رضي الله عنه/عنهما/عنها" (first occurrence — the chain's companion).
 * Returns the undiacritized name or null when the formula is absent.
 */
export function hadithNarratorFromAr(ar) {
  if (typeof ar !== 'string' || !ar.trim()) return null;
  const plain = stripTashkeel(ar);
  // NOTE: no \b — it is ASCII-only and never fires inside Arabic text.
  const m = /([\u0621-\u064A\u066E\u066F ]{3,80}?) رضي الله عنه[ما]*(?=\s|$)/.exec(plain);
  if (!m) return null;
  // Walk back past chain verbs so "سمعت عمر بن الخطاب" yields the name,
  // not the verb: drop everything through the last chain verb (plain
  // substring search — \b is ASCII-only, so no word-boundary tricks).
  const verbs = ['حدثنا', 'حدثني', 'أخبرنا', 'أخبرني', 'سمعت', 'سمع', 'يقول', 'قال', 'عن'];
  let name = m[1].trim();
  let cut = -1;
  let cutLen = 0;
  for (const v of verbs) {
    const idx = name.lastIndexOf(` ${v} `);
    if (idx > cut) {
      cut = idx;
      cutLen = v.length + 2;
    }
  }
  if (cut >= 0) name = name.slice(cut + cutLen).trim();
  // The verb can also LEAD the match (": سمعت عمر…") — strip it too.
  name = name.replace(/^(حدثنا|حدثني|أخبرنا|أخبرني|سمعت|سمع|يقول|قال|عن)\s+/, '').trim();
  return tidyName(name);
}

/**
 * Best narrator for a hadith row: the enriched field wins, then the
 * language-appropriate extraction (AR text in Arabic UI, EN otherwise),
 * then the other language as fallback. Null when nothing is confident.
 */
export function hadithNarrator(h, lang = 'en') {
  if (!h || typeof h !== 'object') return null;
  if (typeof h.narrator === 'string' && h.narrator.trim() && h.narrator.length <= 200)
    return h.narrator.trim();
  const primary = lang === 'ar' ? hadithNarratorFromAr(h.ar) : hadithNarratorFromEn(h.en);
  if (primary) return primary;
  const fallback = lang === 'ar' ? hadithNarratorFromEn(h.en) : hadithNarratorFromAr(h.ar);
  return fallback || null;
}

/** Grade vocabulary for the book-reader guide (keys resolve via hadith.grade.<id>). */
export const HADITH_GRADE_IDS = Object.freeze(['sahih', 'hasan', 'daif', 'mawdu']);
