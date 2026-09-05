/**
 * core/config/app.js — app identity, storage keys and small global lists.
 * (Split from core/config.js; re-exported by that facade so every existing
 * `.../config.js` import keeps working.)
 */

export const APP_NAME = 'Nūr al-Dhikr';
export const APP_NAME_AR = 'نور الذكر';
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'nurAlDhikr:v2:state';
export const DB_NAME = 'nurAlDhikrDB';
export const DB_VERSION = 1;

export const CATALOG_URL = 'data/catalog.json';

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

/** Offsets offered for the Suhoor pre-alert (minutes before Fajr). */
export const SUHOOR_OFFSETS = Object.freeze([10, 15, 20, 30, 45, 60]);
