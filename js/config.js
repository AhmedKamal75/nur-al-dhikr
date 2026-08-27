/**
 * config.js
 * Central, static configuration for Nūr al-Dhikr.
 * No logic here — only constants. Every other module may import this.
 */

export const APP_NAME = 'Nūr al-Dhikr';
export const APP_NAME_AR = 'نور الذكر';
export const APP_VERSION = '3.6.0';
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'nurAlDhikr:v2:state';
export const DB_NAME = 'nurAlDhikrDB';
export const DB_VERSION = 1;

export const CATALOG_URL = 'data/catalog.json';
export const QURAN_META_URL = 'data/quran-meta.json';
export const QURAN_SURAH_URL = (n) => `data/quran/${encodeURIComponent(n)}.json`;
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
  MUSHAF: 'mushaf',
  SETTINGS: 'settings',
  ABOUT: 'about',
  EDITOR: 'editor',
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
  { id: 'amber', name: { en: 'Amber', ar: 'كهرماني' }, primary: '#B45309', accent: '#FBBF24' },
  { id: 'slate', name: { en: 'Slate', ar: 'رمادي' }, primary: '#334155', accent: '#94A3B8' },
  { id: 'rose', name: { en: 'Rose', ar: 'وردي' }, primary: '#BE123C', accent: '#FB7185' },
  { id: 'forest', name: { en: 'Forest', ar: 'أخضر غابي' }, primary: '#14532D', accent: '#4ADE80' },
  { id: 'ocean', name: { en: 'Ocean', ar: 'محيطي' }, primary: '#0369A1', accent: '#38BDF8' },
  { id: 'midnight', name: { en: 'Midnight', ar: 'ليلي' }, primary: '#111827', accent: '#6B7280' },
  { id: 'ivory', name: { en: 'Ivory', ar: 'عاجي' }, primary: '#78716C', accent: '#A8A29E' },
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
  showTransliteration: true,
  showTranslation: true,
  autoAdvanceFocus: false,
  dailyGoal: 100,
  reciter: 'ar.alafasy',
  // Desktop side rail collapsed to icon-only mode (hamburger toggle).
  navCollapsed: false,
  // Full-surah audio player preferences. moshafId points into the
  // bundled reciters catalog (data/reciters.json) or a custom entry below.
  audio: { moshafId: null, rate: 1, repeat: 'off' },
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
  },
  // Mushaf reading & study preferences — separate from the general app
  // theme, exactly like a real Mushaf's paper looks the same in every room.
  mushafPrefs: {
    font: DEFAULT_MUSHAF_FONT,
    paper: DEFAULT_MUSHAF_PAPER,
    fontScale: 1, // 0.8 .. 1.6
    lineSpacing: 1, // 0.85 .. 1.3 multiplier on the base 2.35 line-height
    pageFlipAnimation: true,
    wordByWordStudy: true, // tap a word for grammar/i'rab/sarf/meaning
    wordUnderline: true, // subtle per-word affordance dots/underline
    tajweedColoring: false, // color-code Qalqalah/Ghunnah/Madd/etc. — off by default so first-time readers see plain text
    tajweedInspector: true, // v3.7: tapping a word lists its rules + what to do (word-study popover)
    bismillahStyle: 'auto', // v3.7: 'auto' (paper-contrast ink) | 'gold' | 'accent' | 'hidden'
    defaultTafsir: 'muyassar',
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
    fontScale: asNumber(p.fontScale, 1, 0.8, 1.6),
    lineSpacing: asNumber(p.lineSpacing, 1, 0.85, 1.3),
    pageFlipAnimation: asBool(p.pageFlipAnimation, true),
    wordByWordStudy: asBool(p.wordByWordStudy, true),
    tajweedInspector: asBool(p.tajweedInspector, true),
    wordUnderline: asBool(p.wordUnderline, true),
    tajweedColoring: asBool(p.tajweedColoring, false),
    defaultTafsir: asShortStr(p.defaultTafsir, 'muyassar', 40),
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
  };
}

function sanitizeCustomReciters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
    .map((r) => ({
      id: asShortStr(r.id, `custom-${Math.random().toString(36).slice(2, 8)}`, 80),
      nameEn: asShortStr(r.nameEn, '', 80),
      nameAr: asShortStr(r.nameAr, '', 80),
      rewaya: asShortStr(r.rewaya, '', 40),
      server: asShortStr(r.server, '', 300),
    }))
    .filter((r) => r.nameEn || r.nameAr);
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
    showTransliteration: asBool(s.showTransliteration, d.showTransliteration),
    showTranslation: asBool(s.showTranslation, d.showTranslation),
    autoAdvanceFocus: asBool(s.autoAdvanceFocus, d.autoAdvanceFocus),
    dailyGoal: Math.round(asNumber(s.dailyGoal, d.dailyGoal, 1, 10000)),
    reciter: asShortStr(s.reciter, d.reciter, 60),
    navCollapsed: asBool(s.navCollapsed, d.navCollapsed),
    audio: sanitizeAudio(s.audio),
    customReciters: sanitizeCustomReciters(s.customReciters),
    prayer: sanitizePrayer(s.prayer),
    mushafPrefs: sanitizeMushafPrefs(s.mushafPrefs),
  };
}

export const ICON_SIZES = Object.freeze([24, 32, 48, 64]);

export const ANIMATION_DURATIONS = Object.freeze({ fast: 100, base: 150, slow: 250, slower: 400 });

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
