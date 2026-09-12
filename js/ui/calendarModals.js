/**
 * components/calendarModals.js
 * Modal content builders for the calendar's day-detail view and the
 * add/edit note form (recurrence: once / daily / every-N-days / range).
 *
 * (v4.3) layer-rule fix: this module used to import domain/calendar.js for
 * the day-detail's Hijri label — a ui → domain edge ARCHITECTURE.md §2
 * forbids. The Hijri conversion now happens in the caller (app layer, which
 * may import domain) and arrives as `hijri`.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
// Layer rule (ui imports core + ui only): recurrence ids are mirrored from
// services/calendarNotes.js RECURRENCE_TYPES (app layer resolves notes via
// notesForDate and passes them in — see buildDayDetail). Keep in sync.
const RECURRENCE_TYPES = ['once', 'daily', 'interval', 'range'];

const RECURRENCE_LABEL_KEY = {
  once: 'calendar.recurOnce',
  daily: 'calendar.recurDaily',
  interval: 'calendar.recurInterval',
  range: 'calendar.recurRange',
};

/** Local mirror of services/calendarNotes appliesToDate/notesForDate for
 *  the no-dayNotes fallback path (kept in sync; the app-layer caller
 *  passes pre-resolved notes so this rarely runs). */
function localNotesForDate(notes, dateKeyStr) {
  const applies = (note) => {
    if (!note || !note.startDate || dateKeyStr < note.startDate) return false;
    switch (note.recurrence) {
      case 'once':
        return dateKeyStr === note.startDate;
      case 'range':
        return !!note.endDate && dateKeyStr <= note.endDate;
      case 'daily':
        return !note.endDate || dateKeyStr <= note.endDate;
      case 'interval': {
        const n = Math.max(1, note.intervalDays || 1);
        if (note.endDate && dateKeyStr > note.endDate) return false;
        const ms = new Date(dateKeyStr + 'T00:00:00') - new Date(note.startDate + 'T00:00:00');
        return Math.round(ms / 86400000) % n === 0;
      }
      default:
        return false;
    }
  };
  return (notes || []).filter(applies).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function formatDateLabel(dateKeyStr, lang, hijri = null) {
  const d = new Date(dateKeyStr + 'T00:00:00');
  const g = d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hLabel = hijri
    ? `${hijri.day} ${hijri.monthName[lang] || hijri.monthName.en} ${hijri.year} AH`
    : '';
  return { g, hLabel };
}

function recurrenceSummary(note, lang) {
  if (note.recurrence === 'once') return t('calendar.recurOnce', lang);
  if (note.recurrence === 'daily')
    return note.endDate
      ? `${t('calendar.recurDaily', lang)} \u2192 ${note.endDate}`
      : t('calendar.recurDaily', lang);
  if (note.recurrence === 'interval')
    return t('calendar.recurIntervalSummary', lang, { n: note.intervalDays || 1 });
  if (note.recurrence === 'range') return `${note.startDate} \u2192 ${note.endDate}`;
  return '';
}

/** Day-detail modal: shows existing notes for the date + an Add Note button.
 *  `hijri` is the caller-computed toHijri() result for the same date.
 *  `dayNotes` are caller-resolved via services/calendarNotes.notesForDate
 *  (app layer may import services; ui may not). The fallback below mirrors
 *  appliesToDate locally so direct callers without pre-resolved notes still
 *  see recurring notes correctly. */
export function buildDayDetail(dateKeyStr, state, hijri = null, dayNotes = null) {
  const lang = state.settings.language;
  const { g, hLabel } = formatDateLabel(dateKeyStr, lang, hijri);
  const notes = Array.isArray(dayNotes)
    ? dayNotes
    : localNotesForDate(state.calendarNotes, dateKeyStr);

  const noteRows = notes
    .map(
      (n) => `
    <div class="day-note-row">
      <div class="day-note-row__body">
        <strong>${escapeHTML(n.title)}</strong>
        ${n.body ? `<p>${escapeHTML(n.body)}</p>` : ''}
        <span class="day-note-row__meta">${escapeHTML(recurrenceSummary(n, lang))}${n.reminder ? ` \u00B7 ${icon('bell', { size: 11 })} ${escapeHTML(n.reminderTime || '')}` : ''}</span>
      </div>
      <div class="day-note-row__actions">
        <button type="button" class="icon-btn" data-action="calendar-edit-note" data-id="${escapeHTML(n.id)}" data-date="${escapeHTML(dateKeyStr)}" aria-label="${t('editor.edit', lang)}">${icon('edit', { size: 15 })}</button>
        <button type="button" class="icon-btn" data-action="calendar-delete-note" data-id="${escapeHTML(n.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 15 })}</button>
      </div>
    </div>`
    )
    .join('');

  return `
  <div class="day-detail">
    <h2 id="modal-title-day">${escapeHTML(g)}</h2>
    <p class="day-detail__hijri">${escapeHTML(hLabel)}</p>
    ${noteRows || `<p class="empty-hint">${t('calendar.noNotes', lang)}</p>`}
    <button type="button" class="btn btn--primary btn--sm" data-action="calendar-new-note" data-date="${escapeHTML(dateKeyStr)}">
      ${icon('plus', { size: 14 })} ${t('calendar.addNote', lang)}
    </button>
  </div>`;
}

/** Add/edit note form. If `note` is null, this creates a new note starting on `dateKeyStr`. */
export function buildNoteForm(dateKeyStr, note, lang = 'en') {
  const isEdit = !!note;
  const recurrence = note?.recurrence || 'once';
  const recurOptions = RECURRENCE_TYPES.map(
    (r) =>
      `<option value="${r}" ${recurrence === r ? 'selected' : ''}>${t(RECURRENCE_LABEL_KEY[r], lang)}</option>`
  ).join('');

  return `
  <form class="editor-form note-form" data-form="calendar-note" data-date="${escapeHTML(dateKeyStr)}" data-note-id="${escapeHTML(note?.id || '')}">
    <h2 id="modal-title-note">${isEdit ? t('editor.edit', lang) : t('calendar.addNote', lang)}</h2>

    <label class="field">${t('calendar.noteTitle', lang)}<input class="input" name="title" value="${escapeHTML(note?.title || '')}" required /></label>
    <label class="field">${t('calendar.noteBody', lang)}<textarea class="textarea" name="body" rows="3">${escapeHTML(note?.body || '')}</textarea></label>

    <label class="field">${t('calendar.recurrence', lang)}
      <select class="select" name="recurrence" data-bind="note-recurrence">${recurOptions}</select>
    </label>

    <div class="note-form__conditional" data-recurrence-group="interval" ${recurrence === 'interval' ? '' : 'hidden'}>
      <label class="field">${t('calendar.everyNDays', lang)}<input class="input" type="number" min="2" max="365" name="intervalDays" value="${escapeHTML(String(note?.intervalDays || 3))}" /></label>
    </div>

    <div class="note-form__conditional" data-recurrence-group="range" ${recurrence === 'range' ? '' : 'hidden'}>
      <label class="field">${t('calendar.untilDate', lang)}<input class="input" type="date" name="endDateRange" value="${escapeHTML(String(note?.recurrence === 'range' ? note?.endDate || '' : ''))}" /></label>
    </div>

    <div class="note-form__conditional" data-recurrence-group="daily" ${recurrence === 'daily' ? '' : 'hidden'}>
      <label class="field">${t('calendar.untilDateOptional', lang)}<input class="input" type="date" name="endDateDaily" value="${escapeHTML(String(note?.recurrence === 'daily' ? note?.endDate || '' : ''))}" /></label>
    </div>

    <div class="toggle-row">
      <span class="toggle-row__label">${t('calendar.setReminder', lang)}</span>
      <label class="switch">
        <input type="checkbox" name="reminder" data-bind="note-reminder-toggle" ${note?.reminder ? 'checked' : ''} />
        <span class="switch__track"></span>
      </label>
    </div>
    <div class="note-form__conditional" data-reminder-group ${note?.reminder ? '' : 'hidden'}>
      <label class="field">${t('reminder.time', lang)}<input class="input" type="time" name="reminderTime" value="${escapeHTML(note?.reminderTime || '08:00')}" /></label>
    </div>

    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}
