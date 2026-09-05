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
