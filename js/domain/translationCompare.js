/**
 * domain/translationCompare.js (v5.2.0)
 * Translation-compare view: pure helpers for showing a SECOND translation
 * edition under the primary one in the classic reader. No DOM, no store.
 */

/** Normalize a translation-edition key the way the settings sanitizer does. */
export function normalizeEditionKey(v, knownIds, fallback = null) {
  return typeof v === 'string' && knownIds.includes(v) ? v : fallback;
}

/**
 * Should the compare line render for (primary, second)? Off when unset,
 * when both editions match, or when the second is the inline Sahih text
 * (already shown as the primary line).
 */
export function compareVisible(primaryEd, secondEd, inlineId = 'en-sahih') {
  if (!secondEd) return false;
  if (secondEd === primaryEd) return false;
  if (secondEd === inlineId) return false;
  return true;
}

/**
 * Pure: reduce an overlay file ({ ayahs: [{ number, translation }] })
 * to a { [ayahNumber]: text } map. Returns null on shape mismatch so a
 * corrupt/foreign file can never blank the compare line.
 */
export function translationBMap(tdoc) {
  if (!tdoc || !Array.isArray(tdoc.ayahs) || !tdoc.ayahs.length) return null;
  const byAyah = {};
  for (const a of tdoc.ayahs) {
    const n = Number(a?.number);
    if (!Number.isInteger(n) || n < 1) return null;
    if (typeof a?.translation !== 'string' || !a.translation.trim()) return null;
    byAyah[n] = a.translation;
  }
  return byAyah;
}

/** BCP-47 voice for each overlay edition (mirrors the reader's mapping). */
const EDITION_LANGS = {
  'en-sahih': 'en',
  'ur-jalandhry': 'ur',
  'fr-hamidullah': 'fr',
  'tr-diyanet': 'tr',
  'id-kemenag': 'id',
};

/**
 * (v5.2.74, UP-08) one shared resolver for every compare line (classic
 * reader, ayah-study modal, mushaf translation tray). Pure over state +
 * the edition catalog: null unless compare is on AND the overlay doc for
 * THIS surah+edition has landed. Callers render
 * `{ edition, lang, text }` with the edition's own direction.
 */
export function resolveCompareText(state, editions, surahNumber, ayahNumber) {
  const list = resolveCompareTexts(state, editions, surahNumber, ayahNumber);
  return list.length ? list[0] : null;
}

/**
 * (v5.2.78, UP-06) resolve up to two compare lines (B then C). Each entry
 * is `{ edition, lang, text }` with the edition's own direction. C is
 * skipped when unset, equal to primary/B, or inline — same honesty rules
 * as B, applied independently per slot.
 */
export function resolveCompareTexts(state, editions, surahNumber, ayahNumber) {
  const out = [];
  const primary = state?.settings?.quranTranslation || 'en-sahih';
  const slots = [
    { key: state?.settings?.quranTranslationB, store: state?.quran?.translationB },
    { key: state?.settings?.quranTranslationC, store: state?.quran?.translationC },
  ];
  const seen = new Set([primary, 'en-sahih']);
  for (const slot of slots) {
    const bKey = slot.key;
    if (!compareVisible(primary, bKey)) continue;
    if (seen.has(bKey)) continue;
    seen.add(bKey);
    const bEd = (editions || []).find((e) => e.id === bKey);
    if (!bEd) continue;
    const overlay = slot.store?.[String(surahNumber)];
    if (!overlay || overlay.edKey !== bKey) continue;
    const text = overlay.byAyah?.[ayahNumber];
    if (typeof text !== 'string' || !text) continue;
    out.push({ edition: bEd, lang: EDITION_LANGS[bKey] || 'en', text });
  }
  return out;
}
