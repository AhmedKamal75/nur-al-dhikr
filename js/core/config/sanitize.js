/**
 * core/config/sanitize.js — settings sanitization (the stored-XSS boundary).
 * (Split from core/config.js; re-exported by that facade so every existing
 * `.../config.js` import keeps working.)
 *
 * Persisted/imported settings are UNTRUSTED input. A backup file (or
 * hand-edited localStorage) could carry anything in any field — and several
 * settings are interpolated into HTML attributes by the views, which made a
 * crafted backup a stored-XSS vector. Every field here is validated: enums
 * against their legal values, numbers coerced and clamped, booleans
 * coerced, nested objects merged key-by-key over their defaults. Pure
 * functions — safe to run on both hydrate() and RESTORE_STATE.
 */

import {
  DEFAULT_SETTINGS,
  GRADES,
  MUSHAF_FONTS,
  MUSHAF_PAPERS,
  PALETTES,
  SHAPES,
  THEME_MODES,
} from './views.js';
import { DAILY_AYAH_THEMES, TASBIH_MILESTONES } from './app.js';
import { TAJWEED_FAMILY_ID_SET, TAJWEED_RULE_ID_SET, asTranslationEdition } from './quran.js';
import { isSafeKey } from '../utils.js';

const CLOCK_SETTING_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** (v4.4) Sanitize a { enabled, time } notification setting. */
function sanitizeClockSetting(raw, dflt) {
  const d = dflt || { enabled: false, time: '08:00' };
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const time = CLOCK_SETTING_RE.test(p.time) ? p.time : d.time;
  return { enabled: p.enabled === true, time };
}

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
    font: asEnum(p.font, MUSHAF_FONT_IDS, DEFAULT_SETTINGS.mushafPrefs.font),
    bismillahStyle: asEnum(p.bismillahStyle, BISMILLAH_STYLES, 'auto'),
    paper: asEnum(p.paper, MUSHAF_PAPER_IDS, DEFAULT_SETTINGS.mushafPrefs.paper),
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
    // Loudness schedule: volumes clamp 0–100, quiet times must be HH:MM.
    adhanVolume: Math.round(asNumber(p.adhanVolume, d.adhanVolume ?? 80, 0, 100)),
    quietEnabled: p.quietEnabled === true,
    quietStart: CLOCK_SETTING_RE.test(p.quietStart) ? p.quietStart : '22:00',
    quietEnd: CLOCK_SETTING_RE.test(p.quietEnd) ? p.quietEnd : '06:00',
    quietVolume: Math.round(asNumber(p.quietVolume, d.quietVolume ?? 30, 0, 100)),
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
    // Verse-by-verse playback speed (the full-surah player's `rate` twin).
    verseRate: asNumber(p.verseRate, d.verseRate ?? 1, 0.5, 2),
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
    // Second tafsir source id (null/'' = off); render-time checks the id
    // against the loaded catalog, so any string here is display-safe.
    tafsirCompareB:
      s.tafsirCompareB == null || s.tafsirCompareB === ''
        ? null
        : asShortStr(s.tafsirCompareB, null, 40),
    dailyAyahTheme: DAILY_AYAH_THEMES.has(s.dailyAyahTheme) ? s.dailyAyahTheme : d.dailyAyahTheme,
    tasbihMilestone: TASBIH_MILESTONES.has(Number(s.tasbihMilestone))
      ? Number(s.tasbihMilestone)
      : d.tasbihMilestone,
    profileName: asShortStr(s.profileName, d.profileName, 60),
    autoAdvanceFocus: asBool(s.autoAdvanceFocus, d.autoAdvanceFocus),
    dailyGoal: Math.round(asNumber(s.dailyGoal, d.dailyGoal, 1, 10000)),
    reciter: asShortStr(s.reciter, d.reciter, 60),
    reciterB: s.reciterB == null || s.reciterB === '' ? null : asShortStr(s.reciterB, null, 60),
    reciterCompare: s.reciterCompare === true,
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
  const id =
    typeof p.id === 'string' && isSafeKey(p.id) && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) ? p.id : null;
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
  const id =
    typeof p.id === 'string' && isSafeKey(p.id) && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) ? p.id : null;
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
      // (S3) isSafeKey: SAFE_ID_RE alone still matches `__proto__`.
      if (
        !isSafeKey(id) ||
        !SAFE_ID_RE.test(id) ||
        !ov ||
        typeof ov !== 'object' ||
        Array.isArray(ov)
      )
        continue;
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
      // (S3) isSafeKey: SAFE_ID_RE alone still matches `__proto__`.
      if (
        !isSafeKey(id) ||
        !SAFE_ID_RE.test(id) ||
        !ov ||
        typeof ov !== 'object' ||
        Array.isArray(ov)
      )
        continue;
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
      // (S3) isSafeKey: category ids become map keys.
      if (!isSafeKey(catId) || !SAFE_ID_RE.test(catId) || !Array.isArray(list)) continue;
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
      // (S3) isSafeKey: library ids become map keys.
      if (!isSafeKey(libId) || !SAFE_ID_RE.test(libId) || !Array.isArray(list)) continue;
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
      // (S3) isSafeKey: library ids become map keys.
      if (!isSafeKey(libId) || !SAFE_ID_RE.test(libId) || !toggles || typeof toggles !== 'object')
        continue;
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

/**
 * (v4.5.2) The content-management preferences — the user's own hide/
 * reorder/target layer over the immutable bundled libraries. Every key
 * and value here is interpolated into view HTML (ids land in
 * data-attributes, targets in counter pills), so each slot is strictly
 * validated: ids match the safe id pattern, flags are literal true,
 * targets are 1..10000 integers, and order arrays hold only known-good
 * id strings. A crafted backup drops hostile values silently.
 */
function sanitizeContentPrefs(raw) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const cleanFlags = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        // (S3) isSafeKey: SAFE_ID alone still matches `__proto__`.
        if (isSafeKey(k) && SAFE_ID.test(k) && v === true) out[k] = true;
      }
    }
    return out;
  };
  const cleanTargets = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (!isSafeKey(k) || !SAFE_ID.test(k)) continue;
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
        if (!isSafeKey(k) || !SAFE_ID.test(k) || !Array.isArray(v)) continue;
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
      ? p.libraryOrderOverrides.filter(
          (id) => typeof id === 'string' && isSafeKey(id) && SAFE_ID.test(id)
        )
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
        // (S3) isSafeKey first: SAFE_ID_RE still matches `__proto__`.
        if (isSafeKey(k) && keyFn(k) && v === true) out[k] = true;
      }
    }
    return out;
  };
  const order = Array.isArray(p.orderBooks)
    ? p.orderBooks.filter((id) => typeof id === 'string' && isSafeKey(id) && SAFE_ID_RE.test(id))
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
