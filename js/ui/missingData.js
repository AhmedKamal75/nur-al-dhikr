/**
 * ui/missingData.js — (v5.17.53, merged-plan item 6) the ONE honest-absence pattern.
 *
 * Fragments it unifies (all presentation, no data, no behaviour):
 *   grades.js Unknown chip · emptyState.js loadError/notFound states ·
 *   tafsirPanel block hints · prayer polar note + no-location state ·
 *   offline not-downloaded / storage-unknown states · audio surah-unavailable
 *   cells · the card disclosure's missing-translation line.
 *
 * The pattern: dashed warm-gray, plain words, calm — never red, never a badge,
 * never a celebration. Bilingual EN+AR through the `missingData.*` keys
 * (rule 6: callers pass a KIND, never their own strings, so the tree cannot
 * drift into parallel ad-hoc copy).
 *
 * Two integration shapes, one visual language:
 *  1. Absence states render fully through missingDataHTML (text + frame from
 *     the single source): translation-missing, tafsir-missing, offline-missing.
 *  2. Context states keep load-bearing specific words and carry only the
 *     `.missing-data` style hook + kind modifier, so the frame unifies while
 *     the honesty content stays exact: the Unknown chip keeps GRADE_LABELS
 *     (the mirror of missingData.grade-unknown, named here per rule 6), the
 *     polar note keeps its prayer names + estimate guidance, storage-unknown
 *     keeps its quota sentence, surah-unavailable keeps its reciter-specific
 *     reason, and loadFailed/notFound keep the words their Retry/Go-home
 *     actions need.
 */
import { escapeHTML } from '../core/utils.js';

/** The six honest-absence kinds. Frozen: a new kind is a product decision. */
export const MISSING_DATA_KINDS = Object.freeze([
  'grade-unknown',
  'translation-missing',
  'audio-missing',
  'tafsir-missing',
  'location-missing',
  'offline-missing',
]);

/**
 * Rule-6 map: kind → the single dictionary key that owns its words.
 * Unknown kinds degrade to offline-missing (never a raw key on screen).
 */
export function missingDataKeyFor(kind) {
  return MISSING_DATA_KINDS.includes(kind) ? `missingData.${kind}` : 'missingData.offline-missing';
}

/**
 * @param {object} o
 * @param {string} o.kind   one of MISSING_DATA_KINDS
 * @param {string} [o.lang] 'en' | 'ar'
 * @param {Function} o.t    the i18n t() (callers already import it)
 * @param {boolean} [o.inline] span instead of p (row badges, not blocks)
 * @returns {string} HTML — escaped, calm, never red
 */
export function missingDataHTML({ kind, lang = 'en', t, inline = false }) {
  const tag = inline ? 'span' : 'p';
  const safe = MISSING_DATA_KINDS.includes(kind) ? kind : 'offline-missing';
  return `<${tag} class="missing-data missing-data--${safe}">${escapeHTML(t(missingDataKeyFor(safe), lang))}</${tag}>`;
}
