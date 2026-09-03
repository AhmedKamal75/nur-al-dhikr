/**
 * config.js
 * Central, static configuration for Nūr al-Dhikr.
 * No logic here — only constants. Every other module may import this.
 */

export const APP_NAME = 'Nūr al-Dhikr';
export const APP_NAME_AR = 'نور الذكر';
export const APP_VERSION = '5.1.0';
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'nurAlDhikr:v2:state';
export const DB_NAME = 'nurAlDhikrDB';
export const DB_VERSION = 1;

export const CATALOG_URL = 'data/catalog.json';
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

/** (v4.4) Legal home-card themes (mirrors domain/dailyAyah.js DAILY_THEMES). */
export const DAILY_AYAH_THEMES = new Set([
  'any',
  'mercy',
  'patience',
  'gratitude',
  'guidance',
  'paradise',
]);

/** (v4.4) Legal tasbih milestone pings (counts between pings). */
export const TASBIH_MILESTONES = new Set([0, 10, 25, 33, 50, 100]);

const CLOCK_SETTING_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** (v4.4) Sanitize a { enabled, time } notification setting. */
function sanitizeClockSetting(raw, dflt) {
  const d = dflt || { enabled: false, time: '08:00' };
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const time = CLOCK_SETTING_RE.test(p.time) ? p.time : d.time;
  return { enabled: p.enabled === true, time };
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

export const VIEWS = Object.freeze({
  HOME: 'home',
  LIBRARY: 'library',
  CATEGORY: 'category',
  MOOD: 'mood',
  FOCUS: 'focus',
  SEARCH: 'search',
  FAVORITES: 'favorites',
  COLLECTIONS: 'collections',
  COLLECTION: 'collection',
  STATISTICS: 'statistics',
  TASBIH: 'tasbih',
  PRAYER: 'prayer',
  QIBLA: 'qibla',
  CHECKLIST: 'checklist',
  QUIZ: 'quiz',
  CALENDAR: 'calendar',
  RAMADAN: 'ramadan',
  ZAKAT: 'zakat',
  AUDIO: 'audio',
  QURAN: 'quran',
  ROOTS: 'roots',
  HADITH: 'hadith',
  MUSHAF: 'mushaf',
  SETTINGS: 'settings',
  ABOUT: 'about',
  EDITOR: 'editor',
  // (v4.4)
  MUTASHABIHAT: 'mutashabihat',
  JOURNAL: 'journal',
  CERTIFICATE: 'certificate',
  // (v4.5.2)
  GARDEN: 'garden',
});

export const DEFAULT_VIEW = VIEWS.HOME;

/** Mushaf typeface choices. `family` feeds --font-arabic-mushaf directly. */
export const MUSHAF_FONTS = Object.freeze([
  {
    id: 'amiriQuran',
    name: { en: 'Amiri Quran', ar: 'أميري قرآن' },
    sub: { en: 'Traditional, Quran-specific Naskh', ar: 'نسخ تقليدي مخصص للمصحف' },
    family: "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif",
  },
  {
    id: 'amiri',
    name: { en: 'Amiri', ar: 'أميري' },
    sub: { en: 'Classic Naskh typeface', ar: 'خط نسخ كلاسيكي' },
    family: "'Amiri', 'Traditional Arabic', serif",
  },
  {
    id: 'system',
    name: { en: 'System Arabic', ar: 'خط النظام' },
    sub: { en: "Your device's own Arabic font", ar: 'الخط العربي المثبت على جهازك' },
    family: "'Traditional Arabic', 'Noto Naskh Arabic', 'Scheherazade New', serif",
  },
]);
export const DEFAULT_MUSHAF_FONT = 'amiriQuran';

/** Mushaf "paper" color themes — independent of the app's light/dark theme,
 *  the way a physical Mushaf's paper stays the same regardless of the room
 *  lighting. Each defines the page background, ink (text) color, a border
 *  tone, and whether it reads as a "dark" surface (for the page frame). */
export const MUSHAF_PAPERS = Object.freeze([
  {
    id: 'ivory',
    name: { en: 'Ivory', ar: 'عاجي' },
    bg: '#FBF6E9',
    ink: '#2B2517',
    border: '#E4D9B8',
    dark: false,
  },
  {
    id: 'sepia',
    name: { en: 'Sepia', ar: 'بني داكن' },
    bg: '#F1E4C6',
    ink: '#3B2C15',
    border: '#D7BE8C',
    dark: false,
  },
  {
    id: 'parchment',
    name: { en: 'Parchment', ar: 'رَقّ قديم' },
    bg: '#EFE6D3',
    ink: '#332B1C',
    border: '#CBB98F',
    dark: false,
  },
  {
    id: 'white',
    name: { en: 'Pure White', ar: 'أبيض' },
    bg: '#FFFFFF',
    ink: '#1A1A1A',
    border: '#E2E2E2',
    dark: false,
  },
  {
    id: 'mint',
    name: { en: 'Mint', ar: 'نعناعي' },
    bg: '#EEF6EF',
    ink: '#1D3324',
    border: '#CADFCD',
    dark: false,
  },
  {
    id: 'rose',
    name: { en: 'Rose', ar: 'وردي' },
    bg: '#FBEEEE',
    ink: '#3A1E1E',
    border: '#E7CACA',
    dark: false,
  },
  {
    id: 'night',
    name: { en: 'Night', ar: 'ليلي' },
    bg: '#1B2420',
    ink: '#DCE6DD',
    border: '#33413A',
    dark: true,
  },
  {
    id: 'amoled',
    name: { en: 'True Black', ar: 'أسود نقي' },
    bg: '#000000',
    ink: '#D8D2BE',
    border: '#232323',
    dark: true,
  },
]);
export const DEFAULT_MUSHAF_PAPER = 'ivory';

export const GRADES = Object.freeze([
  'Quran',
  'Sahih',
  'Hasan',
  'Daif',
  'Athar',
  'Custom',
  'Unknown',
]);

export const GRADE_LABELS = Object.freeze({
  Quran: { en: "Qur'an", ar: 'قرآن' },
  Sahih: { en: 'Authentic', ar: 'صحيح' },
  Hasan: { en: 'Good', ar: 'حسن' },
  Daif: { en: 'Weak', ar: 'ضعيف' },
  Athar: { en: 'Narration', ar: 'أثر' },
  Custom: { en: 'Scholarly Note', ar: 'ملاحظة علمية' },
  Unknown: { en: 'Unverified', ar: 'غير محقق' },
});

export const PALETTES = Object.freeze([
  { id: 'emerald', name: { en: 'Emerald', ar: 'زمردي' }, primary: '#0F766E', accent: '#10B981' },
  { id: 'sapphire', name: { en: 'Sapphire', ar: 'ياقوتي' }, primary: '#1D4ED8', accent: '#60A5FA' },
  {
    id: 'royal',
    name: { en: 'Royal Purple', ar: 'بنفسجي ملكي' },
    primary: '#6D28D9',
    accent: '#A78BFA',
  },
  /* amber's primary is amber-800 (not -700): it is used as TEXT on
     surface-alt chips, and amber-700 measured 4.36:1 there — under AA.
     Same fix as ivory below; picked by scripts/css-contrast-audit.mjs. */
  { id: 'amber', name: { en: 'Amber', ar: 'كهرماني' }, primary: '#92400E', accent: '#FBBF24' },
  { id: 'slate', name: { en: 'Slate', ar: 'رمادي' }, primary: '#334155', accent: '#94A3B8' },
  { id: 'rose', name: { en: 'Rose', ar: 'وردي' }, primary: '#BE123C', accent: '#FB7185' },
  { id: 'forest', name: { en: 'Forest', ar: 'أخضر غابي' }, primary: '#14532D', accent: '#4ADE80' },
  { id: 'ocean', name: { en: 'Ocean', ar: 'محيطي' }, primary: '#0369A1', accent: '#38BDF8' },
  { id: 'midnight', name: { en: 'Midnight', ar: 'ليلي' }, primary: '#111827', accent: '#6B7280' },
  /* ivory's primary is stone-600 (not -500): it is used as TEXT on
     surface-alt chips, and stone-500 measured 4.17:1 there — under AA.
     Picked by scripts/css-contrast-audit.mjs. */
  { id: 'ivory', name: { en: 'Ivory', ar: 'عاجي' }, primary: '#57534E', accent: '#A8A29E' },
]);

export const SHAPES = Object.freeze([
  { id: 'soft', name: { en: 'Soft', ar: 'ناعم' }, radius: '12px' },
  { id: 'rounded', name: { en: 'Rounded', ar: 'مدور' }, radius: '20px' },
  { id: 'pill', name: { en: 'Pill', ar: 'كبسولي' }, radius: '9999px' },
  { id: 'square', name: { en: 'Square', ar: 'مربع' }, radius: '0px' },
  { id: 'material', name: { en: 'Material', ar: 'مادي' }, radius: '8px' },
  { id: 'elegant', name: { en: 'Elegant', ar: 'أنيق' }, radius: '16px' },
  { id: 'compact', name: { en: 'Compact', ar: 'مضغوط' }, radius: '6px' },
  { id: 'comfortable', name: { en: 'Comfortable', ar: 'مريح' }, radius: '18px' },
]);

export const THEME_MODES = Object.freeze(['light', 'dark', 'auto']);

export const DEFAULT_SETTINGS = Object.freeze({
  language: 'en',
  themeMode: 'light',
  palette: 'emerald',
  shape: 'rounded',
  fontScale: 1,
  arabicFontScale: 1,
  reduceMotion: false,
  highContrast: false,
  soundEnabled: true,
  hapticsEnabled: true,
  // v3.14 Phase C: optional soft sounds — off by default (the owner-facing
  // rule from the Tier-2 sound-design item: opt-in, never imposed).
  pageTurnSound: false,
  khatmaChimeSound: false,
  showTransliteration: true,
  showTranslation: true,
  // (v5.0.0) Hadith reader display: the Arabic text toggle (the English
  // one is showTranslation above — shared with the azkar cards).
  showHadithArabic: true,
  // (v4.6.0) Tajweed rule preferences: which rules are ON (all by default)
  // and each family's color. Empty object = the standard chart exactly.
  tajweedPrefs: {},
  // v3.15: which Qur'an translation edition both readers show. Allowlist-
  // sanitized (garbage/unknown → en-sahih); overlay files load lazily.
  quranTranslation: 'en-sahih',
  // (v4.4) Compare view: the SECOND translation edition shown beneath the
  // primary one in the classic reader (null = compare off). Same allowlist.
  quranTranslationB: null,
  // (v4.4) Home "verse of the day" theme bias — 'any' or a theme id from
  // domain/dailyAyah.js DAILY_THEMES.
  dailyAyahTheme: 'any',
  // (v4.4) Tasbih milestone haptic/audible ping every N counts (0 = off).
  tasbihMilestone: 0,
  // (v4.4) The name printed on memorization certificates.
  profileName: '',
  autoAdvanceFocus: false,
  dailyGoal: 100,
  reciter: 'ar.alafasy',
  // Desktop side rail collapsed to icon-only mode (hamburger toggle).
  navCollapsed: false,
  // (v5.0.0) Card counting feedback: vibration (hapticsEnabled above),
  // tick sound (soundEnabled above), and the tap ripple.
  tapRipple: true,
  // (v5.0.0) Global card-field visibility defaults — which JSON fields a
  // dhikr card shows. Per-library (banner) toggles in contentPrefs
  // override these; absent = visible (v4 behavior).
  cardFields: {
    transliteration: true,
    translation: true,
    virtues: true,
    reference: true,
    grade: true,
    notes: true,
  },
  // (v4.5.2) In-place content management, applied ON TOP of the immutable
  // bundled libraries: per-item hide / reorder / target overrides and
  // per-section hide. The data files never change — these are the user's
  // own preferences layered over them, so the same rules render for
  // everyone else. Persisted with settings; strictly sanitized on restore.
  // (v5.0.0) Extended into the full four-level authority: field edits,
  // true deletes, additions, renames, ordering, field visibility.
  contentPrefs: {
    hiddenItems: {}, // { itemId: true }
    hiddenCategories: {}, // { categoryId: true }
    hiddenLibraries: {}, // { libraryId: true } — banner-level hide
    targetOverrides: {}, // { itemId: n } — repetitions override
    orderOverrides: {}, // { categoryId: [itemId, ...] } — card order
    categoryOrderOverrides: {}, // { libraryId: [categoryId, ...] } — section order
    libraryOrderOverrides: null, // [libraryId, ...] | null — banner order
    deletedItems: {}, // { itemId: true } — TRUE delete (restorable)
    deletedCategories: {}, // { categoryId: true } — TRUE delete (restorable)
    deletedLibraries: {}, // { libraryId: true } — TRUE delete (restorable)
    itemOverrides: {}, // { itemId: { field: value } } — full card field edits
    categoryOverrides: {}, // { categoryId: { name, description, icon, color } }
    libraryOverrides: {}, // { libraryId: { name, description } }
    addedItems: {}, // { categoryId: [normalizedItem, ...] } — user cards in ANY section
    addedCategories: {}, // { libraryId: [normalizedCategory, ...] } — user sections in ANY library
    libraryFieldToggles: {}, // { libraryId: { field: bool } } — banner-level field visibility
    // (v5.0.0) The Ahadeeth tab gets the same authority, over its own
    // lazy-loaded corpus (books + individual hadiths).
    hadithPrefs: {
      hiddenBooks: {}, // { bookId: true }
      deletedBooks: {}, // { bookId: true } — TRUE delete (restorable)
      orderBooks: [], // [bookId, ...] — display order
      hiddenHadiths: {}, // { 'bookId:n': true } — hidden individual hadiths
    },
  },
  // Full-surah audio player preferences. moshafId points into the
  // bundled reciters catalog (data/reciters.json) or a custom entry below.
  // ayahFollow: continuous recitation keeps the view synced — highlight
  // + auto-scroll (classic reader) and page flips (Mushaf). Persisted so
  // "I read with my eyes on the page" survives reloads.
  audio: { moshafId: null, rate: 1, repeat: 'off', ayahFollow: true, ayahRepeat: 1 },
  // User-added reciters: [{ id, nameEn, nameAr, rewaya, server }]. Lets a
  // person wire in ANY server following the 001.mp3..114.mp3 pattern.
  customReciters: [],
  prayer: {
    method: 'MWL',
    asr: 'Standard',
    latitude: null,
    longitude: null,
    timezone: null,
    locationName: '',
    // Smart Prayer Alerts: per-prayer toggle + a selectable alert tone.
    // Alerts are computed against *today's actual* prayer times (not a
    // fixed clock time), so they stay correct as sunrise/sunset drift
    // through the year without the user ever touching a setting.
    alerts: { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false },
    alertSound: 'chime',
    adhanMode: 'adhan', // v3.8: 'adhan' (real call) | 'tone' (synthesized) | 'off'
    // Ramadan fasting alerts: Suhoor fires N minutes before Fajr (the offset,
    // in minutes), Iftar fires exactly at Maghrib. They only ever fire on
    // days that are actually in Ramadan (checked via the Hijri calendar at
    // notification time), so they can stay enabled year-round harmlessly.
    ramadanAlerts: { suhoor: false, iftar: false, suhoorOffset: 30 },
    // (v4.4) Traveler mode: informational Qasr/Jam' guidance in the Prayer
    // view and a badge on the worship checklist. Never changes the fard log
    // or computed times — it annotates, it does not judge.
    travelerMode: false,
  },
  // (v4.4) Jumu'ah reminder — Friday morning nudge for Surah Al-Kahf and
  // extra salawat. Weekday-gated in the notification scheduler.
  jumuahReminder: { enabled: false, time: '09:00' },
  // (v4.4) Daily verse as an OS notification (theme-biased like the home
  // card; the body carries the ayah text when the corpus is loaded).
  dailyVerseNotification: { enabled: false, time: '08:00' },
  // (v4.4) Zakat al-Fitr reminder — fires on 28 Ramadan each year.
  zakatFitrReminder: false,
  // Mushaf reading & study preferences — separate from the general app
  // theme, exactly like a real Mushaf's paper looks the same in every room.
  mushafPrefs: {
    font: DEFAULT_MUSHAF_FONT,
    paper: DEFAULT_MUSHAF_PAPER,
    fontScale: 1, // 0.6 .. 2.2 (v4.5 widened for pinch/ctrl+wheel zoom)
    lineSpacing: 1, // 0.85 .. 1.3 multiplier on the base 2.35 line-height
    pageFlipAnimation: true,
    wordByWordStudy: true, // tap a word for grammar/i'rab/sarf/meaning
    wordUnderline: true, // subtle per-word affordance dots/underline
    tajweedColoring: false, // color-code Qalqalah/Ghunnah/Madd/etc. — off by default so first-time readers see plain text
    tajweedInspector: true, // v3.7: tapping a word lists its rules + what to do (word-study popover)
    bismillahStyle: 'auto', // v3.7: 'auto' (paper-contrast ink) | 'gold' | 'accent' | 'hidden'
    defaultTafsir: 'muyassar',
    // (v4.4) The translation tray under the Mushaf page: a strip of this
    // page's ayah translations for people who read the Arabic page and
    // glance below for meaning — the Mushaf-side counterpart of the classic
    // reader's inline translations, so BOTH reading views expose it.
    translationPanel: false,
    // (v4.5) Two-page facing spread — only ever takes effect on wide
    // viewports (services/mushaf.js mushafSpreadActive gates on
    // matchMedia min-width 900px), so phones stay single-page regardless.
    spread: true,
  },
});

/** Offsets offered for the Suhoor pre-alert (minutes before Fajr). */
export const SUHOOR_OFFSETS = Object.freeze([10, 15, 20, 30, 45, 60]);

/* ------------------------------------------------------------------ */
/* Settings sanitization                                                */
/* ------------------------------------------------------------------ */
//
// FIX (review v3.3 B1/B4/B5): persisted/imported settings are UNTRUSTED
// input. A backup file (or hand-edited localStorage) could carry anything
// in any field — and several settings are interpolated into HTML
// attributes by the views (mushafPrefs.fontScale into the Mushaf page's
// style attribute, the sliders' value attributes, etc.), which made a
// crafted backup a stored-XSS vector. Beyond security, a shallow
// `{ ...DEFAULTS, ...payload }` merge silently DELETED every default key
// missing from an older or hand-made backup — turning word-by-word study
// and other features off with no notice. This module validates every
// field: enums are checked against their legal values, numbers are
// coerced and clamped to their slider ranges, booleans are coerced, and
// nested objects are merged key-by-key over their defaults so partial
// payloads keep the defaults for the keys they lack. Pure function — no
// imports beyond this file's own constants — so it is directly
// unit-testable and safe to run on both hydrate() and RESTORE_STATE.

const MUSHAF_FONT_IDS = new Set(MUSHAF_FONTS.map((f) => f.id));
/** (v5.0.0) Module-level id pattern shared by the contentPrefs sanitizers. */
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const BISMILLAH_STYLES = new Set(['auto', 'gold', 'accent', 'hidden']);
const MUSHAF_PAPER_IDS = new Set(MUSHAF_PAPERS.map((p) => p.id));
const ADHAN_MODE_IDS = new Set(['adhan', 'tone', 'off']);
const PALETTE_IDS = new Set(PALETTES.map((p) => p.id));
const SHAPE_IDS = new Set(SHAPES.map((s) => s.id));

function asBool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback;
}
function asNumber(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function asEnum(v, legal, fallback) {
  return typeof v === 'string' && legal.has(v) ? v : fallback;
}
function asShortStr(v, fallback, maxLen = 40) {
  return typeof v === 'string' && v.length <= maxLen ? v : fallback;
}
function asCoords(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? n : fallback;
}

export function sanitizeMushafPrefs(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    font: asEnum(p.font, MUSHAF_FONT_IDS, DEFAULT_MUSHAF_FONT),
    bismillahStyle: asEnum(p.bismillahStyle, BISMILLAH_STYLES, 'auto'),
    paper: asEnum(p.paper, MUSHAF_PAPER_IDS, DEFAULT_MUSHAF_PAPER),
    // (v4.5) range widened 0.8–1.6 → 0.6–2.2: pinch-zoom / ctrl+wheel now
    // drive this same slider value live, and a zoom-in reading session
    // legitimately wants more headroom than the fine-tune range did.
    fontScale: asNumber(p.fontScale, 1, 0.6, 2.2),
    lineSpacing: asNumber(p.lineSpacing, 1, 0.85, 1.3),
    pageFlipAnimation: asBool(p.pageFlipAnimation, true),
    wordByWordStudy: asBool(p.wordByWordStudy, true),
    tajweedInspector: asBool(p.tajweedInspector, true),
    wordUnderline: asBool(p.wordUnderline, true),
    tajweedColoring: asBool(p.tajweedColoring, false),
    defaultTafsir: asShortStr(p.defaultTafsir, 'muyassar', 40),
    translationPanel: asBool(p.translationPanel, false),
    // (v4.5) two-page spread: only ever takes effect on wide viewports
    // (see mushafSpreadActive in services/mushaf.js), so defaulting TRUE
    // never affects a phone — it gives the desktop/tablet the printed
    // book's facing-pages reading the moment it opens.
    spread: asBool(p.spread, true),
  };
}

function sanitizePrayer(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_SETTINGS.prayer;
  const alerts =
    p.alerts && typeof p.alerts === 'object' && !Array.isArray(p.alerts) ? p.alerts : {};
  const ra =
    p.ramadanAlerts && typeof p.ramadanAlerts === 'object' && !Array.isArray(p.ramadanAlerts)
      ? p.ramadanAlerts
      : {};
  return {
    method: asShortStr(p.method, d.method, 24),
    asr: asShortStr(p.asr, d.asr, 24),
    latitude: p.latitude == null ? null : asCoords(p.latitude, null),
    longitude: p.longitude == null ? null : asCoords(p.longitude, null),
    timezone: asShortStr(p.timezone, d.timezone, 64),
    locationName: asShortStr(p.locationName, d.locationName, 80),
    travelerMode: p.travelerMode === true,
    alerts: {
      fajr: asBool(alerts.fajr, false),
      sunrise: asBool(alerts.sunrise, false),
      dhuhr: asBool(alerts.dhuhr, false),
      asr: asBool(alerts.asr, false),
      maghrib: asBool(alerts.maghrib, false),
      isha: asBool(alerts.isha, false),
    },
    alertSound: asShortStr(p.alertSound, d.alertSound, 24),
    adhanMode: asEnum(p.adhanMode, ADHAN_MODE_IDS, d.adhanMode),
    ramadanAlerts: {
      suhoor: asBool(ra.suhoor, false),
      iftar: asBool(ra.iftar, false),
      suhoorOffset: asNumber(ra.suhoorOffset, d.ramadanAlerts.suhoorOffset, 5, 120),
    },
  };
}

function sanitizeAudio(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_SETTINGS.audio;
  return {
    moshafId: p.moshafId == null ? null : asShortStr(p.moshafId, null, 80),
    rate: asNumber(p.rate, d.rate, 0.5, 2),
    repeat: p.repeat === 'one' ? 'one' : 'off',
    ayahFollow: asBool(p.ayahFollow, d.ayahFollow ?? true),
    // Hifz repeat budget (v3.17): per-ayah loop count for the recitation
    // session — 1/3/5/10 plays, or -1 = loop until skipped.
    ayahRepeat: [1, 3, 5, 10, -1].includes(p.ayahRepeat) ? p.ayahRepeat : 1,
  };
}

function sanitizeCustomReciters(raw) {
  if (!Array.isArray(raw)) return [];
  return (
    raw
      .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
      .map((r) => ({
        id: asShortStr(r.id, `custom-${Math.random().toString(36).slice(2, 8)}`, 80),
        nameEn: asShortStr(r.nameEn, '', 80),
        nameAr: asShortStr(r.nameAr, '', 80),
        rewaya: asShortStr(r.rewaya, '', 40),
        server: asShortStr(r.server, '', 300),
      }))
      .filter((r) => r.nameEn || r.nameAr)
      // (v4.2) a restored server must be a real http(s) URL — the form path
      // already ran validateCustomServer, but the restore path skipped it, so
      // a crafted backup could point audio fetches at an attacker's host.
      // Mirrors services/audioCatalog.validateCustomServer (core may not
      // import services — layer rule), without the trailing-slash rewrite.
      .filter((r) => !r.server || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(r.server))
  );
}

/** Validate/normalize an untrusted settings object (backup import or
 *  localStorage) against DEFAULT_SETTINGS. Returns a fully-typed settings
 *  object with every known key present — hostile strings in numeric or
 *  enum slots are replaced by their defaults, never rendered downstream. */
export function sanitizeSettings(raw) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  return {
    language: s.language === 'ar' ? 'ar' : 'en',
    themeMode: asEnum(s.themeMode, new Set(THEME_MODES), d.themeMode),
    palette: asEnum(s.palette, PALETTE_IDS, d.palette),
    shape: asEnum(s.shape, SHAPE_IDS, d.shape),
    fontScale: asNumber(s.fontScale, d.fontScale, 0.85, 1.4),
    arabicFontScale: asNumber(s.arabicFontScale, d.arabicFontScale, 0.85, 1.6),
    reduceMotion: asBool(s.reduceMotion, d.reduceMotion),
    highContrast: asBool(s.highContrast, d.highContrast),
    soundEnabled: asBool(s.soundEnabled, d.soundEnabled),
    hapticsEnabled: asBool(s.hapticsEnabled, d.hapticsEnabled),
    pageTurnSound: asBool(s.pageTurnSound, d.pageTurnSound),
    khatmaChimeSound: asBool(s.khatmaChimeSound, d.khatmaChimeSound),
    showTransliteration: asBool(s.showTransliteration, d.showTransliteration),
    showTranslation: asBool(s.showTranslation, d.showTranslation),
    showHadithArabic: asBool(s.showHadithArabic, d.showHadithArabic),
    tajweedPrefs: sanitizeTajweedPrefs(s.tajweedPrefs),
    quranTranslation: asTranslationEdition(s.quranTranslation, d.quranTranslation),
    // (v4.4) Compare view — null (off) or an allowlisted edition id.
    quranTranslationB:
      s.quranTranslationB == null ? null : asTranslationEdition(s.quranTranslationB, null),
    dailyAyahTheme: DAILY_AYAH_THEMES.has(s.dailyAyahTheme) ? s.dailyAyahTheme : d.dailyAyahTheme,
    tasbihMilestone: TASBIH_MILESTONES.has(Number(s.tasbihMilestone))
      ? Number(s.tasbihMilestone)
      : d.tasbihMilestone,
    profileName: asShortStr(s.profileName, d.profileName, 60),
    autoAdvanceFocus: asBool(s.autoAdvanceFocus, d.autoAdvanceFocus),
    dailyGoal: Math.round(asNumber(s.dailyGoal, d.dailyGoal, 1, 10000)),
    reciter: asShortStr(s.reciter, d.reciter, 60),
    navCollapsed: asBool(s.navCollapsed, d.navCollapsed),
    tapRipple: asBool(s.tapRipple, d.tapRipple),
    cardFields: sanitizeCardFields(s.cardFields, d.cardFields),
    jumuahReminder: sanitizeClockSetting(s.jumuahReminder, d.jumuahReminder),
    dailyVerseNotification: sanitizeClockSetting(
      s.dailyVerseNotification,
      d.dailyVerseNotification
    ),
    zakatFitrReminder: asBool(s.zakatFitrReminder, d.zakatFitrReminder),
    audio: sanitizeAudio(s.audio),
    customReciters: sanitizeCustomReciters(s.customReciters),
    prayer: sanitizePrayer(s.prayer),
    mushafPrefs: sanitizeMushafPrefs(s.mushafPrefs),
    contentPrefs: sanitizeContentPrefs(s.contentPrefs),
  };
}

/**
 * (v4.5.2) The content-management preferences — the user's own hide/
 * reorder/target layer over the immutable bundled libraries. Every key
 * and value here is interpolated into view HTML (ids land in
 * data-attributes, targets in counter pills), so each slot is strictly
 * validated: ids match the safe id pattern, flags are literal true,
 * targets are 1..10000 integers, and order arrays hold only known-good
 * id strings. A crafted backup drops hostile values silently.
 */

/**
 * (v4.6.0) Tajweed rule/color preferences. Persisted under
 * settings.tajweedPrefs and interpolated into view HTML (colors land in
 * inline style attributes), so every slot is strictly validated: rule ids
 * come from the domain table, family ids likewise, colors are 6-digit hex,
 * and the only accepted rule value is literal false (= switched off; the
 * all-on default is an absent key). A crafted backup drops hostile
 * values silently, exactly like contentPrefs.
 */
function sanitizeTajweedPrefs(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const out = {};
  if (p.rules && typeof p.rules === 'object' && !Array.isArray(p.rules)) {
    const rules = {};
    for (const [k, v] of Object.entries(p.rules)) {
      if (TAJWEED_RULE_ID_SET.has(k) && v === false) rules[k] = false;
    }
    if (Object.keys(rules).length) out.rules = rules;
  }
  if (p.colors && typeof p.colors === 'object' && !Array.isArray(p.colors)) {
    const colors = {};
    for (const [k, v] of Object.entries(p.colors)) {
      if (TAJWEED_FAMILY_ID_SET.has(k) && typeof v === 'string' && HEX.test(v)) colors[k] = v;
    }
    if (Object.keys(colors).length) out.colors = colors;
  }
  return out;
}

/**
 * (v5.0.0) Global card-field visibility. Only known field keys, only
 * booleans — a crafted backup can't smuggle extra keys in.
 */
const CARD_FIELD_IDS = new Set([
  'transliteration',
  'translation',
  'virtues',
  'reference',
  'grade',
  'notes',
]);
function sanitizeCardFields(raw, fallback) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const k of CARD_FIELD_IDS)
    out[k] = k in p ? asBool(p[k], true) : fallback ? fallback[k] : true;
  return out;
}

/** Long user text (item fields can be paragraphs) — plain string, capped. */
function asText(v, fallback, maxLen = 6000) {
  return typeof v === 'string' && v.length <= maxLen ? v : fallback;
}
function asStrMap(v) {
  // { en, ar } locale map — strings only, capped.
  const out = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const k of ['en', 'ar']) {
      if (typeof v[k] === 'string' && v[k].length <= 6000) out[k] = v[k];
    }
  }
  return out;
}
function asTagList(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.length <= 40).slice(0, 12);
}
function asIdList(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x)).slice(0, 5000);
}

/**
 * (v5.0.0) One user-added or user-edited item stored inside prefs. These
 * values render as card HTML, so every field is strictly typed here:
 * strings capped, numbers clamped, ids regex-checked. The write path
 * ALSO runs schema.normalizeItem; this is the restore-time twin.
 */
function sanitizeUserItem(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!p) return null;
  const id = typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) ? p.id : null;
  if (!id) return null;
  const grade = typeof p.grade === 'string' && GRADES.includes(p.grade) ? p.grade : 'unknown';
  const reps = Math.round(asNumber(p.repetitions, 1, 1, 10000));
  const item = {
    id,
    category_id:
      typeof p.category_id === 'string' && p.category_id.length <= 64 ? p.category_id : '',
    title: asStrMap(p.title),
    arabic: asText(p.arabic, '', 12000),
    transliteration: asText(p.transliteration, '', 12000),
    translation: asStrMap(p.translation),
    reference:
      p.reference && typeof p.reference === 'object' && !Array.isArray(p.reference)
        ? {
            collection: asText(p.reference.collection, '', 200),
            book: asText(p.reference.book, '', 200),
            chapter: asText(p.reference.chapter, '', 200),
            hadith: asText(p.reference.hadith, '', 40),
            narrator: asText(p.reference.narrator, '', 200),
            grading: asText(p.reference.grading, '', 200),
            notes: asText(p.reference.notes, '', 2000),
          }
        : undefined,
    grade,
    custom_grade: asStrMap(p.custom_grade),
    repetitions: reps,
    virtues: asStrMap(p.virtues),
    tags: asTagList(p.tags),
    related: asIdList(p.related),
    notes: asText(p.notes, '', 2000),
    order: Math.round(asNumber(p.order, 9999, 0, 999999)),
  };
  if (!item.reference || Object.values(item.reference).every((v) => !v)) delete item.reference;
  return item;
}

/** A user-added category stored inside prefs. */
function sanitizeUserCategory(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!p) return null;
  const id = typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) ? p.id : null;
  if (!id) return null;
  const name = asStrMap(p.name);
  if (!name.en && !name.ar) return null;
  return {
    id,
    name,
    description: asStrMap(p.description),
    icon: typeof p.icon === 'string' && p.icon.length <= 32 ? p.icon : 'book',
    color: typeof p.color === 'string' && p.color.length <= 24 ? p.color : 'slate',
    order: Math.round(asNumber(p.order, 9999, 0, 999999)),
    items: Array.isArray(p.items) ? p.items.map(sanitizeUserItem).filter(Boolean) : [],
  };
}

function cleanItemOverrides(obj) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [id, ov] of Object.entries(obj)) {
      if (!SAFE_ID_RE.test(id) || !ov || typeof ov !== 'object' || Array.isArray(ov)) continue;
      const fields = {};
      const title = asStrMap(ov.title);
      if (title.en || title.ar) fields.title = title;
      const translation = asStrMap(ov.translation);
      if (translation.en || translation.ar) fields.translation = translation;
      const virtues = asStrMap(ov.virtues);
      if (virtues.en || virtues.ar) fields.virtues = virtues;
      const custom = asStrMap(ov.custom_grade);
      if (custom.en || custom.ar) fields.custom_grade = custom;
      for (const k of ['arabic', 'transliteration', 'notes']) {
        const v = asText(ov[k], '', 12000);
        if (v) fields[k] = v;
      }
      if (ov.reference && typeof ov.reference === 'object' && !Array.isArray(ov.reference)) {
        fields.reference = {
          collection: asText(ov.reference.collection, '', 200),
          book: asText(ov.reference.book, '', 200),
          chapter: asText(ov.reference.chapter, '', 200),
          hadith: asText(ov.reference.hadith, '', 40),
          narrator: asText(ov.reference.narrator, '', 200),
          grading: asText(ov.reference.grading, '', 200),
          notes: asText(ov.reference.notes, '', 2000),
        };
      }
      if (typeof ov.grade === 'string' && GRADES.includes(ov.grade)) fields.grade = ov.grade;
      const reps = Math.round(asNumber(ov.repetitions, NaN, 1, 10000));
      if (Number.isFinite(reps)) fields.repetitions = reps;
      if (Array.isArray(ov.tags)) fields.tags = asTagList(ov.tags);
      if (Array.isArray(ov.related)) fields.related = asIdList(ov.related);
      if (Object.keys(fields).length) out[id] = fields;
    }
  }
  return out;
}

function cleanMetaOverrides(obj, { withIconColor = false } = {}) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [id, ov] of Object.entries(obj)) {
      if (!SAFE_ID_RE.test(id) || !ov || typeof ov !== 'object' || Array.isArray(ov)) continue;
      const fields = {};
      const name = asStrMap(ov.name);
      if (name.en || name.ar) fields.name = name;
      const description = asStrMap(ov.description);
      if (description.en || description.ar) fields.description = description;
      if (withIconColor) {
        if (typeof ov.icon === 'string' && ov.icon.length <= 32) fields.icon = ov.icon;
        if (
          typeof ov.color === 'string' &&
          /slate|emerald|amber|rose|sky|violet|teal|indigo/.test(ov.color)
        )
          fields.color = ov.color;
      }
      if (Object.keys(fields).length) out[id] = fields;
    }
  }
  return out;
}

function cleanAddedItems(obj) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [catId, list] of Object.entries(obj)) {
      if (!SAFE_ID_RE.test(catId) || !Array.isArray(list)) continue;
      const items = list.map(sanitizeUserItem).filter(Boolean);
      if (items.length) out[catId] = items;
    }
  }
  return out;
}

function cleanAddedCategories(obj) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [libId, list] of Object.entries(obj)) {
      if (!SAFE_ID_RE.test(libId) || !Array.isArray(list)) continue;
      const cats = list.map(sanitizeUserCategory).filter(Boolean);
      if (cats.length) out[libId] = cats;
    }
  }
  return out;
}

function cleanFieldToggles(obj) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [libId, toggles] of Object.entries(obj)) {
      if (!SAFE_ID_RE.test(libId) || !toggles || typeof toggles !== 'object') continue;
      const clean = {};
      let any = false;
      for (const k of CARD_FIELD_IDS) {
        if (k in toggles) {
          clean[k] = asBool(toggles[k], true);
          any = true;
        }
      }
      if (any) out[libId] = clean;
    }
  }
  return out;
}

function sanitizeContentPrefs(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const cleanFlags = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (SAFE_ID.test(k) && v === true) out[k] = true;
      }
    }
    return out;
  };
  const cleanTargets = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (!SAFE_ID.test(k)) continue;
        const n = Number(v);
        if (Number.isFinite(n) && n >= 1 && n <= 10000) out[k] = Math.floor(n);
      }
    }
    return out;
  };
  const cleanOrders = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (!SAFE_ID.test(k) || !Array.isArray(v)) continue;
        const ids = v.filter((id) => typeof id === 'string' && SAFE_ID.test(id));
        if (ids.length) out[k] = ids;
      }
    }
    return out;
  };
  return {
    hiddenItems: cleanFlags(p.hiddenItems),
    hiddenCategories: cleanFlags(p.hiddenCategories),
    hiddenLibraries: cleanFlags(p.hiddenLibraries),
    targetOverrides: cleanTargets(p.targetOverrides),
    orderOverrides: cleanOrders(p.orderOverrides),
    categoryOrderOverrides: cleanOrders(p.categoryOrderOverrides),
    libraryOrderOverrides: Array.isArray(p.libraryOrderOverrides)
      ? p.libraryOrderOverrides.filter((id) => typeof id === 'string' && SAFE_ID.test(id))
      : null,
    deletedItems: cleanFlags(p.deletedItems),
    deletedCategories: cleanFlags(p.deletedCategories),
    deletedLibraries: cleanFlags(p.deletedLibraries),
    itemOverrides: cleanItemOverrides(p.itemOverrides),
    categoryOverrides: cleanMetaOverrides(p.categoryOverrides, { withIconColor: true }),
    libraryOverrides: cleanMetaOverrides(p.libraryOverrides),
    addedItems: cleanAddedItems(p.addedItems),
    addedCategories: cleanAddedCategories(p.addedCategories),
    libraryFieldToggles: cleanFieldToggles(p.libraryFieldToggles),
    hadithPrefs: cleanHadithPrefs(p.hadithPrefs),
  };
}

/** (v5.0.0) The Ahadeeth manage lens — book hide/delete/order plus
 *  per-hadith hides. Ids are regex-checked; hadith keys are
 *  'bookId:nnn' (bookId is a SAFE_ID, nnn a positive integer). */
function cleanHadithPrefs(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const cleanFlagMap = (obj, keyFn) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (keyFn(k) && v === true) out[k] = true;
      }
    }
    return out;
  };
  const order = Array.isArray(p.orderBooks)
    ? p.orderBooks.filter((id) => typeof id === 'string' && SAFE_ID_RE.test(id))
    : [];
  return {
    hiddenBooks: cleanFlagMap(p.hiddenBooks, (k) => SAFE_ID_RE.test(k)),
    deletedBooks: cleanFlagMap(p.deletedBooks, (k) => SAFE_ID_RE.test(k)),
    orderBooks: order,
    hiddenHadiths: cleanFlagMap(p.hiddenHadiths, (k) =>
      /^[A-Za-z0-9_-]{1,64}:[1-9][0-9]{0,6}$/.test(k)
    ),
  };
}

export const ICON_SIZES = Object.freeze([24, 32, 48, 64]);

export const COLLECTION_SUGGESTIONS = Object.freeze([
  { id: 'morning-routine', name: { en: 'Morning Routine', ar: 'روتين الصباح' } },
  { id: 'ramadan', name: { en: 'Ramadan', ar: 'رمضان' } },
  { id: 'travel-kit', name: { en: 'Travel', ar: 'السفر' } },
  { id: 'healing', name: { en: 'Healing', ar: 'الشفاء' } },
]);

/**
 * The daily habit checklist: five prayers + morning/evening adhkar + a
 * Qur'an-reading check-in. Purely a local, private tracker — it does not
 * feed the existing recitation-based streak in statistics.js, and it is
 * not a substitute for actually praying on time; it's a gentle personal
 * reminder, nothing more.
 */
export const CHECKLIST_ITEMS = Object.freeze([
  { id: 'fajr', group: 'prayer', icon: 'sunrise', label: 'checklist.fajr' },
  { id: 'dhuhr', group: 'prayer', icon: 'sun', label: 'checklist.dhuhr' },
  { id: 'asr', group: 'prayer', icon: 'sun', label: 'checklist.asr' },
  { id: 'maghrib', group: 'prayer', icon: 'sunset', label: 'checklist.maghrib' },
  { id: 'isha', group: 'prayer', icon: 'moon', label: 'checklist.isha' },
  { id: 'morningAdhkar', group: 'adhkar', icon: 'sunrise', label: 'checklist.morningAdhkar' },
  { id: 'eveningAdhkar', group: 'adhkar', icon: 'sunset', label: 'checklist.eveningAdhkar' },
  { id: 'quran', group: 'adhkar', icon: 'quran', label: 'checklist.quran' },
]);

/** Number of multiple-choice rounds in one 99-Names quiz session. */
export const QUIZ_LENGTH = 10;
/** Number of answer options shown per question (1 correct + distractors). */
export const QUIZ_CHOICE_COUNT = 4;
/** The bundled library id that the quiz mode is scoped to. */
export const QUIZ_LIBRARY_ID = 'asma';
