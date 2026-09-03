/**
 * i18n.js
 * UI chrome translation dictionary (not content — content items are already localized).
 * Usage: import { t } from './i18n.js'; t('nav.home', state.settings.language)
 */

import { escapeHTML } from './utils.js';

import { en } from './i18n/en.js';
import { ar } from './i18n/ar.js';

// (v4.2) the dictionary moved to i18n/en.js + i18n/ar.js — this module is
// now just the loader + the t()/isRTL() helpers every module already
// imports. Both languages load synchronously: t() must never await, and a
// language switch re-renders in place with zero flash of the wrong language.
const dict = { en, ar };

/**
 * Translate a key for a given language, with optional {placeholder} interpolation.
 *
 * (v4.2) interpolated vars are HTML-escaped here, at the boundary: call sites
 * pass counts and names today, but `roots.empty` interpolates the raw search
 * query — a reflected XSS when the query contains markup. Escaping centrally
 * also fixes the silent `$&`/`$1` replacement-pattern bug: the function form
 * of replace() returns the literal string. Dictionary values themselves stay
 * untouched (translations may legitimately contain quotes/apostrophes).
 */
export function t(key, lang = 'en', vars = null) {
  const table = dict[lang] || dict.en;
  let str = table[key] ?? dict.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), () => escapeHTML(String(v ?? '')));
    }
  }
  return str;
}

export function availableLanguages() {
  return Object.keys(dict);
}

export function isRTL(lang) {
  return lang === 'ar';
}
