/**
 * config.js
 * Central, static configuration for Nūr al-Dhikr.
 * No logic here — only constants. Every other module may import this.
 *
 * Since v5.2 the definitions live in focused modules under core/config/
 * (this file re-exports the public surface so all 70+ existing importers
 * keep one stable entry point):
 *
 *   config/app.js       identity, storage keys, checklists, quiz, offsets
 *   config/quran.js     corpus/Mushaf/tafsir/hadith/reciter URLs + editions
 *   config/views.js     routes, Mushaf type/paper, grades, themes, defaults
 *   config/sanitize.js  sanitizeSettings/sanitizeMushafPrefs (XSS boundary)
 *
 * APP_VERSION stays defined HERE (not in config/app.js): the release
 * contract gate reads this exact file for the version literal, and the
 * service-worker precache gate walks the import graph from js/app.js
 * through this module.
 */
export const APP_VERSION = '5.1.0';

export * from './config/app.js';
export * from './config/quran.js';
export * from './config/views.js';
export * from './config/sanitize.js';
