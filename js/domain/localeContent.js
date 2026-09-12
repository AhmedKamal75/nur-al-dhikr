/**
 * domain/localeContent.js
 * Strict language-separation helpers for devotional content rendering.
 *
 * Contract (Content & i18n audit):
 *   AR (`ar`): Arabic matn only. Transliteration and translation are NEVER
 *     rendered. Virtue/source/grade labels come from the Arabic side only —
 *     no English fallback. Latin-only metadata (unmapped collection strings,
 *     transliterated narrator names, English notes) is suppressed rather
 *     than leaked.
 *   EN (`en`): Arabic matn on top, then transliteration, then the English
 *     translation. Virtue/source read from the English side only.
 *
 * Pure functions only — no state, DOM, or network. Unit-tested in
 * tests/content-i18n-audit.test.js.
 */

import { pickStrict } from '../core/utils.js';

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Strict locale pick re-exported for renderer convenience. */
export { pickStrict };

export function containsArabic(s) {
  return ARABIC_SCRIPT_RE.test(String(s || ''));
}

/**
 * Transliteration is an English-locale pronunciation aid: visible only in
 * EN when the field toggle allows it. The AR UI must never show it.
 */
export function showTransliterationFor(lang, allowed = true) {
  return lang !== 'ar' && allowed !== false;
}

/** Same rule for the translation block (translation.en only — see below). */
export function showTranslationFor(lang, allowed = true) {
  return lang !== 'ar' && allowed !== false;
}

/** EN UI reads translation.en exclusively (never the Arabic gloss). */
export function translationFor(item, lang) {
  if (lang === 'ar') return '';
  const t = item?.translation;
  if (t == null) return '';
  if (typeof t === 'string') return t;
  return typeof t.en === 'string' ? t.en : '';
}

/**
 * Content title in the active language with a locale-safe fallback: an
 * empty header is worse than a foreign one, but AR never falls back to
 * the Latin transliteration line (it falls back to the Arabic matn).
 * Returns '' when nothing is available — callers append their own last
 * resort (item.id, untitled label).
 */
export function contentTitleFor(item, lang) {
  return (
    pickStrict(item?.title, lang) ||
    (lang === 'ar' ? item?.arabic : item?.transliteration || item?.arabic) ||
    ''
  );
}

/** Virtue in the active language only — missing side renders nothing. */
export function virtueFor(item, lang) {
  return pickStrict(item?.virtues, lang);
}

/**
 * Known source-collection prefixes → Arabic. Matching is prefix-based and
 * case-insensitive so 'Sahih Muslim 591' keeps its number: 'صحيح مسلم 591'.
 * An ongoing data migration (reference_{ar,en} pairs) will replace this table;
 * until then it is the single choke point for source localization.
 */
const COLLECTION_AR = [
  ['sahih al-bukhari', 'صحيح البخاري'],
  ['sahih muslim', 'صحيح مسلم'],
  ['sunan abi dawud', 'سنن أبي داود'],
  ['sahih abi dawud', 'سنن أبي داود'],
  ["jami' at-tirmidhi", 'جامع الترمذي'],
  ['jami’ at-tirmidhi', 'جامع الترمذي'],
  ['sunan at-tirmidhi', 'سنن الترمذي'],
  ['sahih at-tirmidhi', 'سنن الترمذي'],
  ['sunan ibn majah', 'سنن ابن ماجه'],
  ['sahih ibn majah', 'سنن ابن ماجه'],
  ["sunan an-nasa'i", 'سنن النسائي'],
  ["sunan an-nasa'i (al-kubra)", 'سنن النسائي الكبرى'],
  ['sunan an-nasai (al-kubra)', 'سنن النسائي الكبرى'],
  ['muwatta malik', 'موطأ مالك'],
  ['sunan mālik', 'موطأ مالك'],
  ['musnad ahmad', 'مسند أحمد'],
  ['musnad aḥmad', 'مسند أحمد'],
  ['musnad al-bazzar', 'مسند البزار'],
  ['musnad al-bazzār', 'مسند البزار'],
  ["musnad abu ya'la", 'مسند أبي يعلى'],
  ['mustadrak al-hakim', 'مستدرك الحاكم'],
  ["mu'jam al-awsat", 'المعجم الأوسط'],
  ["al-mu'jamul-awsat", 'المعجم الأوسط'],
  ["mu'jam al-kabir", 'المعجم الكبير'],
  ["al-mu'jamul-kabir", 'المعجم الكبير'],
  ['al-mu’jam al-kabir', 'المعجم الكبير'],
  ["mu'jam as-saghir", 'المعجم الصغير'],
  ['musannaf ibn abi shaybah', 'مصنف ابن أبي شيبة'],
  ['al-adab al-mufrad', 'الأدب المفرد'],
  ['sunan al-bayhaqi', 'سنن البيهقي'],
  ['sahih al-bayhaqi', 'سنن البيهقي'],
  ['sahih ibn hibban', 'صحيح ابن حبان'],
  ['sahih ibn khuzaymah', 'صحيح ابن خزيمة'],
  ['sahih al-jami', 'صحيح الجامع'],
  ['sahih at-tabarani', 'الطبراني'],
  ["'amal al-yawm", 'عمل اليوم والليلة'],
  ['‘amal al-yawm', 'عمل اليوم والليلة'],
  ['ibn al-sunni', 'عمل اليوم والليلة لابن السني'],
  ['ibn as-sunni', 'عمل اليوم والليلة لابن السني'],
  ['hisn al-muslim', 'حصن المسلم'],
  ['riyad as-salihin', 'رياض الصالحين'],
  ['bulugh al-maram', 'بلوغ المرام'],
  ['mishkat al-masabih', 'مشكاة المصابيح'],
  ['man yaduni', 'من يدعوني؟'],
  ['munajat al-muhsinin', 'مناجاة المحسنين'],
  ['fath al-bari', 'فتح الباري'],
  ['sahih', 'صحيح'],
];

function mapSingleCollection(segment) {
  const raw = String(segment || '').trim();
  if (!raw) return '';
  if (containsArabic(raw)) return raw;
  const lower = raw.toLowerCase();
  // 'Quran ...' / "Qur'an ..." / 'Surah ...' keep the verse reference only:
  // a transliterated surah name ('al-Baqarah') would otherwise leak Latin.
  // The article form ("The Qur'an", as stored on glm-gt-025/027) maps too.
  const quranMatch = lower.match(/^(?:the\s+)?(qur'an|quran|surah)\b\s*(.*)$/s);
  if (quranMatch) {
    const prefixLen = quranMatch[0].length - quranMatch[2].length;
    const rest = raw.slice(prefixLen);
    const refNums = (rest.match(/\d+\s*:\s*\d+(?:\s*[-–]\s*\d+)?/g) || []).join('، ');
    const arabicBits = containsArabic(rest) ? rest.trim() : '';
    const keep = [arabicBits, refNums].filter(Boolean).join(' ');
    return keep ? `القرآن الكريم ${keep}` : 'القرآن الكريم';
  }
  for (const [prefix, ar] of [...COLLECTION_AR].sort((a, b) => b[0].length - a[0].length)) {
    if (lower === prefix || lower.startsWith(`${prefix} `) || lower.startsWith(`${prefix},`)) {
      return ar + raw.slice(prefix.length);
    }
  }
  return '';
}

function mapCollectionPrefix(collection) {
  const raw = String(collection || '').trim();
  if (!raw) return '';
  if (containsArabic(raw)) return raw;
  // Multi-source strings ('Bukhari 444, Muslim 714') map segment by
  // segment; unmapped Latin segments are dropped rather than leaked.
  const seen = new Set();
  const mapped = [];
  for (const segment of raw.split(/[;؛]/).flatMap((s) => s.split(','))) {
    const m = mapSingleCollection(segment);
    if (m && !seen.has(m)) {
      seen.add(m);
      mapped.push(m);
    }
  }
  return mapped.join('، ');
}

/** Source collection in the active language. AR returns '' when the
 *  string cannot be localized (caller then omits it instead of leaking).
 *  Real Arabic source data (reference_ar.collection) wins over the mapper. */
export function collectionFor(item, lang) {
  const arColl = item?.reference?.reference_ar?.collection;
  if (lang === 'ar' && typeof arColl === 'string' && arColl.trim()) return arColl.trim();
  const raw = String(item?.reference?.collection || '').trim();
  if (!raw) return '';
  if (lang === 'ar') return mapCollectionPrefix(raw);
  return raw;
}

/** Normalize a transliterated narrator name so spelling variants share a key. */
function narratorKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ā|â/g, 'a')
    .replace(/ī|î/g, 'i')
    .replace(/ū|û/g, 'u')
    .replace(/ʿ|ʾ|‘|’|`/g, '')
    .replace(/\bbin\b/g, 'ibn')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NARRATOR_AR = Object.entries({
  'abu hurayrah': 'أبو هريرة',
  'abdullah ibn umar': 'عبد الله بن عمر',
  'ibn umar': 'ابن عمر',
  aisha: 'عائشة رضي الله عنها',
  'aisha bint abi bakr': 'عائشة رضي الله عنها',
  'ibn abbas': 'ابن عباس',
  'anas ibn malik': 'أنس بن مالك',
  'ali ibn abi talib': 'علي بن أبي طالب',
  'abu bakr as siddiq': 'أبو بكر الصديق',
  'abdullah ibn masud': 'عبد الله بن مسعود',
  'ibn masud': 'ابن مسعود',
  'umm salamah': 'أم سلمة',
  'umm salama': 'أم سلمة',
  'abu musa al ashari': 'أبو موسى الأشعري',
  'abu musa': 'أبو موسى الأشعري',
  'umar ibn al khattab': 'عمر بن الخطاب',
  'abu said al khudri': 'أبو سعيد الخدري',
  'sad ibn abi waqqas': 'سعد بن أبي وقاص',
  'abdullah ibn amr ibn al as': 'عبد الله بن عمرو بن العاص',
  'abu umamah': 'أبو أمامة',
  'abu masud al ansari': 'أبو مسعود الأنصاري',
  'jabir ibn abdullah': 'جابر بن عبد الله',
  'usamah ibn zayd': 'أسامة بن زيد',
  'hudhaifah bin al yaman': 'حذيفة بن اليمان',
  hudhayfah: 'حذيفة بن اليمان',
  'shaddad ibn aws': 'شداد بن أوس',
  'abu ad darda': 'أبو الدرداء',
  'abu bakrah': 'أبو بكرة',
  'muadh ibn jabal': 'معاذ بن جبل',
  'ubayy ibn kab': 'أبي بن كعب',
  thawban: 'ثوبان',
  'al bara ibn azib': 'البراء بن عازب',
}).map(([k, v]) => [narratorKey(k), v]);

/** Narrator in the active language ('' in AR when unmapped — no Latin leak).
 *  Real Arabic data (reference_ar.narrator) wins over the normalizer table. */
export function narratorFor(item, lang) {
  const arN = item?.reference?.reference_ar?.narrator;
  if (lang === 'ar' && typeof arN === 'string' && arN.trim()) return arN.trim();
  const raw = String(item?.reference?.narrator || '').trim();
  if (!raw) return '';
  if (lang !== 'ar') return raw;
  if (containsArabic(raw)) return raw;
  const hit = NARRATOR_AR.find(([k]) => k === narratorKey(raw));
  return hit ? hit[1] : '';
}

/**
 * Reference line parts in the active language. Book/chapter titles ship in
 * English only, so they render in EN and are omitted in AR; the hadith
 * number is language-neutral and always kept.
 */
export function referencePartsFor(item, lang, narratedByLabel = '') {
  const ref = item?.reference || {};
  const parts = [];
  const collection = collectionFor(item, lang);
  if (collection) parts.push(collection);
  if (lang !== 'ar') {
    if (ref.book) parts.push(ref.book);
    if (ref.chapter) parts.push(ref.chapter);
  }
  if (ref.hadith) parts.push(String(ref.hadith).trim());
  const narrator = narratorFor(item, lang);
  if (narrator) parts.push(narratedByLabel ? `${narratedByLabel} ${narrator}` : narrator);
  if (lang !== 'ar' && ref.grading) parts.push(ref.grading);
  return parts.filter(Boolean);
}

/**
 * Joined reference line in the active language (the four-line composition
 * previously written out per renderer — card, focus, shareCard).
 */
export function referenceLineFor(item, lang, narratedByLabel = '') {
  return referencePartsFor(item, lang, narratedByLabel).join(' · ');
}

/**
 * Free-text metadata (reference.notes, item.notes) ships in English only.
 * In AR it renders only when it actually contains Arabic script.
 * Real Arabic data (reference_ar.notes) wins in AR.
 */
export function noteFor(note, lang, item = null) {
  const arNote = item?.reference?.reference_ar?.notes;
  if (lang === 'ar' && typeof arNote === 'string' && arNote.trim()) return arNote.trim();
  const s = String(note || '').trim();
  if (!s) return '';
  if (lang === 'ar' && !containsArabic(s)) return '';
  return s;
}
