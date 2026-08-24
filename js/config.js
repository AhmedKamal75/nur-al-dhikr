/**
 * config.js
 * Central, static configuration for Nūr al-Dhikr.
 * No logic here — only constants. Every other module may import this.
 */

export const APP_NAME = 'Nūr al-Dhikr';
export const APP_NAME_AR = 'نور الذكر';
export const APP_VERSION = '2.5.0';
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
export const DEFAULT_RECITER = 'ar.alafasy';
export const quranAudioUrl = (reciterId, globalAyahNumber, bitrate = 128) =>
  `https://cdn.islamic.network/quran/audio/${bitrate}/${encodeURIComponent(reciterId)}/${globalAyahNumber}.mp3`;

export const VIEWS = Object.freeze({
  HOME: 'home',
  LIBRARY: 'library',
  CATEGORY: 'category',
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
  QURAN: 'quran',
  MUSHAF: 'mushaf',
  RAMADAN: 'ramadan',
  ZAKAT: 'zakat',
  SADAQAH: 'sadaqah',
  SETTINGS: 'settings',
  ABOUT: 'about',
  EDITOR: 'editor',
});

export const DEFAULT_VIEW = VIEWS.HOME;

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
  },
});

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

/**
 * Zakat calculator defaults. Every amount is a plain number in whatever
 * currency the person mentally works in (there's no currency conversion —
 * this app makes no network calls, so it can't fetch live exchange rates).
 * Gold/silver prices are per-gram, entered manually for the same reason;
 * `nisabStandard` picks which of the two nisab thresholds (85g gold vs
 * 595g silver) is used to decide whether zakat is due. Scholars differ on
 * which is more appropriate today — silver gives a lower, more inclusive
 * threshold and is the choice several contemporary bodies recommend, so
 * it's the default here, but the person can switch it any time.
 */
export const DEFAULT_ZAKAT = Object.freeze({
  cash: 0,
  gold: 0,
  silver: 0,
  investments: 0,
  business: 0,
  receivables: 0,
  other: 0,
  liabilities: 0,
  goldPricePerGram: null,
  silverPricePerGram: null,
  nisabStandard: 'silver',
  currency: '',
});

/**
 * Qur'an reading-plan (Khatm) tracker default. `startPage` lets someone
 * start mid-Mushaf and still get a sane plan; progress is simply "how far
 * past startPage is the current Mushaf bookmark", which is an honest
 * approximation (it assumes roughly linear front-to-back reading) rather
 * than tracking every page actually visited.
 */
export const DEFAULT_KHATM = Object.freeze({
  active: false,
  startDate: null,
  targetDays: 30,
  startPage: 1,
});

/** Missed-prayer (Qada') make-up counters, one per obligatory prayer. */
export const DEFAULT_QADA = Object.freeze({
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
});
