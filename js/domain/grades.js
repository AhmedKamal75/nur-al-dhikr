/**
 * domain/grades.js — (DATA-01) honest grade presentation.
 *
 * Content carries `grade` values from a closed vocabulary (GRADES in
 * core/config/views.js). 144 adhkar/dua records are explicitly `Unknown`
 * and hundreds more carry no grading value at all. The UI must never
 * render a specific grading claim where the source is absent, and must
 * never echo a malformed/raw string as if it were a scholarly verdict.
 *
 * Four states, one contract:
 *   valid     — canonical grade (case-insensitive match) → authoritative chip
 *   unknown   — explicit `Unknown` → visibly uncertain chip (Unverified/غير محقق)
 *   missing   — null/undefined/'' → no chip at all
 *   malformed — anything else → no chip at all (never echo raw text)
 */
import { GRADE_LABELS } from '../core/config.js';
import { escapeHTML, pickLocale } from '../core/utils.js';

const CANONICAL = Object.keys(GRADE_LABELS);
const BY_LOWER = new Map(CANONICAL.map((c) => [c.toLowerCase(), c]));

/** Canonical grade name, or null when there is nothing source-backed to show. */
export function normalizeGrade(grade) {
  if (typeof grade !== 'string') return null;
  const t = grade.trim();
  if (!t) return null;
  return BY_LOWER.get(t.toLowerCase()) || null;
}

/** One of 'valid' | 'unknown' | 'missing' | 'malformed'. Exported for tests/audits. */
export function gradeStateOf(grade) {
  if (grade == null || (typeof grade === 'string' && grade.trim() === '')) return 'missing';
  const c = normalizeGrade(grade);
  if (!c) return 'malformed';
  return c === 'Unknown' ? 'unknown' : 'valid';
}

/**
 * Honest grade chip HTML. Returns '' unless the record carries a
 * source-backed grading value. `Unknown` renders the intentionally
 * uncertain "Unverified" chip; malformed values render nothing.
 */
export function gradeChipHTML(grade, lang = 'en') {
  const canonical = normalizeGrade(grade);
  if (!canonical) return '';
  const label = pickLocale(GRADE_LABELS[canonical], lang);
  const uncertain = canonical === 'Unknown' ? ' chip--grade-unknown' : '';
  return `<span class="chip chip--grade chip--grade-${escapeHTML(canonical.toLowerCase())}${uncertain}">${escapeHTML(label)}</span>`;
}
