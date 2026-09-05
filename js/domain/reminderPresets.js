/**
 * domain/reminderPresets.js (v5.2.0)
 * One-tap notification presets on the EXISTING scheduler (no new infra):
 *   • Jumu'ah (Surah Al-Kahf + salawat) → a recurring calendar note, every
 *     Friday via interval:7 anchored on a Friday. Calendar notes already
 *     fire OS notifications when `reminder` is set (services/notifications).
 *   • Daily verse → a plain daily reminder deep-linking home (targetView),
 *     where the verse-of-the-day card lives.
 * Pure builders + date math; the caller localizes text via t() and
 * dispatches through the normal actions. No DOM, no store.
 */

export const JUMUAH_PRESET_ID = 'preset-jumuah-kahf';
export const DAILY_VERSE_PRESET_ID = 'preset-daily-verse';

/** YYYY-MM-DD key for a Date (local time). */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Most recent Friday on or before `todayKey` (YYYY-MM-DD). Returned key
 * anchors the interval:7 recurrence so the note fires every Friday.
 */
export function fridayAnchor(todayKey) {
  const d = new Date(todayKey + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const back = (d.getDay() + 7 - 5) % 7; // 5 = Friday
  d.setDate(d.getDate() - back);
  return dayKey(d);
}

/** True when a preset id already exists in the list (no duplicates). */
export function hasPreset(list, id) {
  return Array.isArray(list) && list.some((x) => x && x.id === id);
}

/**
 * Build the Jumu'ah calendar note. `text` = { title, body } already
 * localized by the caller (notes store baked strings).
 */
export function jumuahNote(todayKey, text) {
  const startDate = fridayAnchor(todayKey);
  if (!startDate || !text?.title) return null;
  return {
    id: JUMUAH_PRESET_ID,
    title: text.title,
    body: text.body || '',
    startDate,
    recurrence: 'interval',
    intervalDays: 7,
    endDate: '',
    reminder: true,
    reminderTime: '09:00',
    createdAt: Date.now(),
  };
}

/**
 * Build the daily-verse reminder. Fires every morning; tapping it opens
 * `targetView` where the verse-of-the-day card lives.
 */
export function dailyVerseReminder(text, targetView = '#/') {
  if (!text?.label) return null;
  return {
    id: DAILY_VERSE_PRESET_ID,
    time: '08:00',
    label: text.label,
    body: text.body || '',
    section: null,
    targetView,
    enabled: true,
  };
}
