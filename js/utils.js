/**
 * utils.js
 * Small, pure, dependency-free helper functions.
 * Never imports state, storage, or the DOM directly (except where explicitly a DOM helper).
 */

/** Generate a reasonably unique id (not cryptographically secure, fine for local content). */
export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${rand}`;
}

/** Deep clone via structured clone with JSON fallback. */
export function clone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fallthrough */
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/** Debounce a function by `wait` milliseconds. */
export function debounce(fn, wait = 150) {
  let t = null;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Throttle a function to run at most once per `wait` milliseconds. */
export function throttle(fn, wait = 100) {
  let last = 0;
  let timer = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/** Strip Arabic diacritics (tashkeel) and normalize alef/ya/ta-marbuta variants for search. */
export function normalizeArabic(str = '') {
  return String(str)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // diacritics + tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // alef variants -> ا
    .replace(/\u0629/g, '\u0647') // ta marbuta -> ha
    .replace(/\u0649/g, '\u064A') // alef maksura -> ya
    .replace(/\u0624/g, '\u0648') // waw hamza -> waw
    .replace(/\u0626/g, '\u064A') // ya hamza -> ya
    .trim();
}

/** Normalize any search string: lowercase, strip diacritics, collapse whitespace. */
export function normalizeSearch(str = '') {
  return normalizeArabic(String(str).toLowerCase())
    .replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pre-normalizer for Qur'anic text before normalizeSearch(): aligns
 *  Uthmani orthography with what a person can actually TYPE.
 *    - The small-high aleph (U+0670, e.g. عَٰلَمِينَ) SUPPLEMENTS/SUPPLANTS
 *      a written alef in this source, so it is SUBSTITUTED with 'ا' — a
 *      user typing 'عالمين' must match, and deleting the mark instead made
 *      them silently miss (the v3.6 sanity run caught exactly this).
 *    - Everything else annotation-only is deleted: cluster-end ligatures &
 *      small-high marks (U+06D6..U+06ED incl. the small-high sukun this
 *      text uses instead of U+0652 in several common particles), the ayah
 *      sign (U+06DD), madda/hamza combining marks (U+0653..U+0655), the
 *      standalone hamza mark (U+0674), Arabic honorifics (U+0610..U+061A).
 *  Search-only: display text never passes through here. */
export function stripQuranAnnotations(str = '') {
  return String(str)
    .replace(/\u0670/g, '\u0627')
    .replace(/[\u0610-\u061A\u0653-\u0655\u0674\u06D6-\u06ED]/g, '');
}

/** Get a localized field object { en, ar } safely, falling back across languages. */
export function pickLocale(field, lang = 'en') {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.en || field.ar || '';
}

/** Format a JS Date as HH:MM in 24h or 12h form. */
export function formatTime(date, hour12 = false) {
  return date.toLocaleTimeString(hour12 ? 'en-US' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

/** Format a JS Date as YYYY-MM-DD (local time, stable for use as a stats key). */
const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Render a non-negative integer using Eastern Arabic-Indic numerals
 * (٠-٩) — the print convention for page/ayah/juz numbers in an Arabic
 * Mushaf, used regardless of the app's current UI language since it's
 * reproducing a fixed typographic feature of the physical book, not
 * translating UI chrome.
 */
export function toEasternArabicNumerals(n) {
  return String(n).replace(/[0-9]/g, (d) => EASTERN_ARABIC_DIGITS[Number(d)]);
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add N days to a date, returning a new Date. */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Clamp a number between min and max. */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Simple event emitter used by several services that are not part of global state. */
export class Emitter {
  constructor() {
    this._listeners = new Map();
  }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }
  emit(event, payload) {
    this._listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[Emitter] listener error for "${event}"`, err);
      }
    });
  }
}

/** Escape a string for safe HTML text-node insertion. */
export function escapeHTML(str = '') {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Create a DOM element with attributes and children in one call. */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => {
        el.dataset[k] = v;
      });
    } else {
      el.setAttribute(key, value);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child == null || child === false) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Result wrapper used by services per the architecture spec: { success, value, error }. */
export function ok(value) {
  return { success: true, value, error: null };
}
export function fail(error) {
  return { success: false, value: null, error: String((error && error.message) || error) };
}

/** Wrap a function so it never throws, returning a Result instead. */
export async function safe(fn) {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err);
  }
}

/** Basic Web Storage availability check (private-browsing / disabled storage). */
export function storageAvailable(kind = 'localStorage') {
  try {
    const s = window[kind];
    const x = '__storage_test__';
    s.setItem(x, x);
    s.removeItem(x);
    return true;
  } catch {
    return false;
  }
}

/** Trigger a haptic pulse if supported and enabled. */
export function vibrate(pattern = 10) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Read a CSS custom property value from :root. */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
