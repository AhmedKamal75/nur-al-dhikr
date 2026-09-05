/**
 * core/config/views.js — routes, Mushaf type/paper choices, hadith grades,
 * theme palettes/shapes and the DEFAULT_SETTINGS tree.
 * (Split from core/config.js; re-exported by that facade so every existing
 * `.../config.js` import keeps working.)
 */

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
  // (v5.2.0) Ambient nightstand display (big next-prayer countdown).
  AMBIENT: 'ambient',
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
  // Second tafsir source shown beneath the active tab in the ayah study
  // panel (null = single source). Edition id, validated against the loaded
  // catalog at render time — a stale id simply renders nothing.
  tafsirCompareB: null,
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
  // Compare-two-reciters: voice B + whether new sessions start in compare
  // mode (each ayah with A, then the same ayah with B). Null = no B voice.
  reciterB: null,
  reciterCompare: false,
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
  audio: { moshafId: null, rate: 1, repeat: 'off', ayahFollow: true, ayahRepeat: 1, verseRate: 1 },
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
    // Alert loudness: day volume + an optional quiet-hours window (default
    // 22:00–06:00) at its own lower volume — Fajr without waking the house.
    adhanVolume: 80,
    quietEnabled: false,
    quietStart: '22:00',
    quietEnd: '06:00',
    quietVolume: 30,
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
