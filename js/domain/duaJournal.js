/**
 * duaJournal.js (v4.4)
 * Private dua journal + weekly reflection prompts. Everything stays on the
 * device (this app's whole privacy model); export is a plain-text download
 * the user owns.
 *
 * Storage:
 *   state.duaJournal — [{ id, ts, date, text, answered, answeredTs }] capped.
 *   state.reflections — [{ id, ts, week, promptId, text }] capped.
 *
 * The weekly reflection nudge: a rotating prompt, deterministic by ISO
 * week, shown in-app every Friday (and optionally pushed as a notification
 * — see the synthesized-reminder wiring in boot.js).
 */

export const DUA_JOURNAL_CAP = 1000;
export const REFLECTIONS_CAP = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Defensively coerce a restored/imported dua journal. */
export function sanitizeDuaJournal(raw, cap = DUA_JOURNAL_CAP) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) =>
      e && typeof e === 'object' && !Array.isArray(e) && typeof e.text === 'string'
        ? {
            id: typeof e.id === 'string' && e.id ? e.id : `dua-${e.ts ?? Date.now()}`,
            ts: Number.isFinite(e.ts) ? e.ts : 0,
            date: typeof e.date === 'string' && DATE_RE.test(e.date) ? e.date : '',
            text: e.text.slice(0, 4000),
            answered: e.answered === true,
            answeredTs: Number.isFinite(e.answeredTs) ? e.answeredTs : null,
          }
        : null
    )
    .filter((e) => e && e.ts > 0 && e.text.trim())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
}

/** Defensively coerce a restored/imported reflections journal. */
export function sanitizeReflections(raw, cap = REFLECTIONS_CAP) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) =>
      e && typeof e === 'object' && !Array.isArray(e) && typeof e.text === 'string'
        ? {
            id: typeof e.id === 'string' && e.id ? e.id : `refl-${e.ts ?? Date.now()}`,
            ts: Number.isFinite(e.ts) ? e.ts : 0,
            week: typeof e.week === 'string' ? e.week.slice(0, 10) : '',
            promptId: typeof e.promptId === 'string' ? e.promptId.slice(0, 40) : '',
            text: e.text.slice(0, 8000),
          }
        : null
    )
    .filter((e) => e && e.ts > 0 && e.text.trim())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
}

/** ISO week key like '2026-W35' — the reflection prompt's rotation unit. */
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * The rotating reflection prompts. i18n lives at the call site; this is the
 * canonical prompt id list (12 = one quarter of Fridays; the rotation
 * repeats, which is fine — reflection questions are evergreen).
 */
export const REFLECTION_PROMPTS = Object.freeze([
  'gratitude',
  'patience',
  'istighfar',
  'knowledge',
  'family',
  'salah',
  'quran',
  'charity',
  'character',
  'health',
  'time',
  'hope',
]);

/** The prompt id for a given date (deterministic, ISO-week rotation). */
export function promptForDate(date = new Date()) {
  const key = isoWeekKey(date);
  const weekNum = parseInt(key.slice(key.indexOf('W') + 1), 10) || 1;
  return REFLECTION_PROMPTS[weekNum % REFLECTION_PROMPTS.length];
}

/** Plain-text export of the journals (the user owns their words). */
export function journalExportText({ duas = [], reflections = [] } = {}) {
  const lines = ['Nur al-Dhikr — Journal export', ''];
  if (duas.length) {
    lines.push('== My duas ==', '');
    for (const d of duas) {
      lines.push(
        `[${d.date || new Date(d.ts).toISOString().slice(0, 10)}]${d.answered ? ' ✓' : ''}`
      );
      lines.push(d.text.trim(), '');
    }
  }
  if (reflections.length) {
    lines.push('== Reflections ==', '');
    for (const r of reflections) {
      lines.push(`[${new Date(r.ts).toISOString().slice(0, 10)}]`);
      lines.push(r.text.trim(), '');
    }
  }
  return lines.join('\n');
}
