/**
 * core/config/quran.js — Qur'an corpus, Mushaf, tafsir, tajweed-pool,
 * hadith and reciter data URLs + translation-edition helpers.
 * (Split from core/config.js; re-exported by that facade so every existing
 * `.../config.js` import keeps working.)
 */

export const QURAN_META_URL = 'data/quran-meta.json';
export const QURAN_SURAH_URL = (n) => `data/quran/${encodeURIComponent(n)}.json`;

// v3.15: selectable Qur'an translations. The DEFAULT edition (en-sahih) is
// inline in data/quran/*.json exactly as it has always been; the four
// additional editions are slim per-surah overlays under
// data/translations/{id}/{surah}.json, lazily fetched (the service worker's
// stale-while-revalidate data rule covers nested paths) and merged onto the
// corpus doc by app.js before dispatch — so both readers, deep links and
// the search index all render/index the selected edition with zero
// per-view branching. Provenance: data/SOURCES.md + CREDITS.md.
export const TRANSLATION_EDITIONS = [
  {
    id: 'en-sahih',
    native: 'English',
    lang: 'English',
    author: 'Sahih International',
    dir: 'ltr',
    // en-sahih is inline in the corpus — no overlay files exist for it.
    inline: true,
  },
  {
    id: 'ur-jalandhry',
    native: 'اردو',
    lang: 'Urdu',
    author: 'Fateh Muhammad Jalandhry',
    dir: 'rtl',
  },
  {
    id: 'fr-hamidullah',
    native: 'Français',
    lang: 'French',
    author: 'Muhammad Hamidullah',
    dir: 'ltr',
  },
  {
    id: 'tr-diyanet',
    native: 'Türkçe',
    lang: 'Turkish',
    author: 'Diyanet İşleri Başkanlığı',
    dir: 'ltr',
  },
  {
    id: 'id-kemenag',
    native: 'Bahasa Indonesia',
    lang: 'Indonesian',
    author: 'Indonesian Islamic Affairs Ministry (Kemenag)',
    dir: 'ltr',
  },
];
export const DEFAULT_TRANSLATION_EDITION = 'en-sahih';
export const TRANSLATION_URL = (edKey, n) =>
  `data/translations/${encodeURIComponent(edKey)}/${encodeURIComponent(n)}.json`;

/**
 * Pure overlay: attach an edition's translation texts onto a corpus surah
 * doc WITHOUT mutating either input. Falls back to the doc's own text
 * (Sahih International) per-ayah whenever the overlay record is missing or
 * empty, so a partial/corrupt overlay file can never blank a verse.
 */
export function overlayTranslation(doc, tdoc) {
  if (!doc || !Array.isArray(doc.ayahs)) return doc;
  const rows = tdoc && Array.isArray(tdoc.ayahs) ? tdoc.ayahs : null;
  if (!rows || rows.length !== doc.ayahs.length) return doc;
  return {
    ...doc,
    ayahs: doc.ayahs.map((a, i) => {
      const t =
        rows[i] && typeof rows[i].translation === 'string' ? rows[i].translation.trim() : '';
      return t ? { ...a, translation: t } : { ...a };
    }),
  };
}

/** Allowlist guard for the persisted quranTranslation setting. */
export function asTranslationEdition(v, fallback = DEFAULT_TRANSLATION_EDITION) {
  return TRANSLATION_EDITIONS.some((e) => e.id === v) ? v : fallback;
}

export const MUSHAF_META_URL = 'data/mushaf-meta.json';
export const MUSHAF_PAGE_URL = (n) => `data/mushaf/${encodeURIComponent(n)}.json`;
export const MUSHAF_PAGE_COUNT = 604;
export const RECITERS_URL = 'data/reciters.json';
export const DEFAULT_RECITER = 'ar.alafasy';
export const quranAudioUrl = (reciterId, globalAyahNumber, bitrate = 128) =>
  `https://cdn.islamic.network/quran/audio/${bitrate}/${encodeURIComponent(reciterId)}/${globalAyahNumber}.mp3`;

/**
 * Per-word grammar (root, i'rab case, sarf/verb pattern, POS) for all
 * 77,429 words of the Qur'an, plus an English word-by-word gloss and
 * transliteration — bundled on-device, one compact file per surah.
 * Derived from the Quranic Arabic Corpus morphology data and a
 * word-by-word translation dataset (see data/SOURCES.md for attribution).
 */
export const QURAN_WORDS_URL = (n) => `data/quran-words/${encodeURIComponent(n)}.json`;
/** Root -> occurrences index (for "where else does this root appear" lookups). */
export const QURAN_ROOTS_URL = 'data/quran-roots.json';
/** Root-family browser index (v3.22.0): UNCAPPED occurrence lists (~2.3 MB).
 *  Not precached — fetched once when the browser view is first opened and
 *  kept offline by the SW's stale-while-revalidate /data strategy. */
export const QURAN_ROOTS_FULL_URL = 'data/quran-roots-full.json';

/**
 * Tafsir + grammar (i'rab/sarf/gharib) sources. The catalog lists every
 * edition; `bundled: true` editions ship on-device in data/tafsir/<id>/ and
 * never touch the network. `bundled: false` editions are classical
 * multi-volume works too large to ship (Tabari/Qurtubi alone are 100MB+
 * across the whole Qur'an) — they're fetched once, on explicit request,
 * straight from the same public source the bundled set was built from, and
 * cached by the service worker for offline reading ever after. This
 * mirrors exactly how QURAN_RECITERS audio already works in this app.
 */
export const TAFSIR_EDITIONS_URL = 'data/tafsir-editions.json';
export const TAFSIR_TEXT_URL = (editionId, n) =>
  `data/tafsir/${encodeURIComponent(editionId)}/${encodeURIComponent(n)}.json`;
export const TAFSIR_REMOTE_URL = (slug, n) =>
  `https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/${encodeURIComponent(slug)}/${encodeURIComponent(n)}.json`;

/** Curated ayahs for the Tajweed practice/drill mode, grouped by rule —
 *  see build_tajweed_pool.mjs (not shipped; a one-time data-build script)
 *  for how the pool was mined from the classifier in tajweed.js. */
export const TAJWEED_PRACTICE_POOL_URL = 'data/tajweed-practice.json';

/** (v4.6.0) Id allowlists for the tajweed prefs sanitizer — kept in
 *  lockstep with domain/tajweed.js's TAJWEED_RULES / TAJWEED_FAMILIES.
 *  (Duplicated as frozen id arrays here so core/config.js stays free of
 *  a domain import — config is loaded before everything else.) */
export const TAJWEED_RULE_ID_SET = new Set([
  'hamzat_wasl',
  'lam_shamsiyyah',
  'ghunnah',
  'ikhfa',
  'iqlab',
  'idgham_ghunnah',
  'idgham_no_ghunnah',
  'idgham_shafawi',
  'ikhfa_shafawi',
  'izhar_shafawi',
  'qalqalah',
  'tafkhim',
  'madd_2',
  'madd_iwad',
  'madd_badal',
  'madd_246',
  'madd_munfasil',
  'madd_silah',
  'madd_muttasil',
  'madd_6',
]);
export const TAJWEED_FAMILY_ID_SET = new Set(['silent', 'nasal', 'qalqalah', 'heavy', 'madd']);

/**
 * Ahadeeth library (v3.9): one compact JSON per book + an index, built by
 * scripts/build-hadith.mjs from public-domain collection texts (see
 * data/SOURCES.md). The small bundled books (Nawawi/Qudsi) are SW-precached;
 * the two big Sahihs are fetched on first open and cached offline forever
 * by the service worker's stale-while-revalidate data rule.
 */
export const HADITH_INDEX_URL = 'data/hadith/index.json';
export const HADITH_BOOK_URL = (id) => `data/hadith/${encodeURIComponent(id)}.json`;

/**
 * Verse-by-verse reciters available via the Al Quran Cloud CDN
 * (cdn.islamic.network — free, no API key, documented for direct client-side
 * use: https://alquran.cloud/cdn). Playback happens straight from the
 * person's browser to that CDN; nothing is proxied or bundled by this app,
 * and nothing plays without the person tapping play.
 */
export const QURAN_RECITERS = Object.freeze([
  { id: 'ar.alafasy', nameEn: 'Mishary Alafasy', nameAr: 'مشاري العفاسي' },
  { id: 'ar.husary', nameEn: 'Mahmoud Al-Husary', nameAr: 'محمود الحصري' },
  { id: 'ar.abdulbasitmurattal', nameEn: 'Abdul Basit (Murattal)', nameAr: 'عبد الباسط عبد الصمد' },
  { id: 'ar.abdurrahmaansudais', nameEn: 'Abdurrahman As-Sudais', nameAr: 'عبدالرحمن السديس' },
  { id: 'ar.mahermuaiqly', nameEn: 'Maher Al Muaiqly', nameAr: 'ماهر المعيقلي' },
]);
