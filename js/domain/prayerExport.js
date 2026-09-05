/**
 * domain/prayerExport.js (v5.2.0)
 * Export prayer times to the phone's system calendar as an .ics file
 * (Google/Apple Calendar import). Pure string building — no DOM, no store.
 * Times are the engine's day-relative decimal hours; dates resolve through
 * decimalHoursToDate so high-latitude midnight-wrap stays correct.
 */
import { decimalHoursToDate } from './prayer.js';

export const PRAYER_EXPORT_ORDER = Object.freeze([
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
]);

/** Escape ICS TEXT values (\ , ; newline per RFC 5545). */
export function icsEscape(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Format a Date as a floating local time (no TZ — prayer times are local). */
export function icsLocal(date) {
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}00`
  );
}

/**
 * Build an .ics calendar with one event per prayer. Unreachable (polar
 * fallback) and non-finite entries are skipped, never exported as gospel.
 * `names` maps prayer keys to localized display names.
 */
export function buildPrayerICS(times, baseDate, { place = '', names = {}, days = 1 } = {}) {
  const safeDays = Number.isInteger(days) && days >= 1 && days <= 7 ? days : 1;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NurAlDhikr//PrayerTimes//EN'];
  const stamp = icsLocal(new Date());
  for (let d = 0; d < safeDays; d++) {
    const day = new Date(baseDate);
    day.setDate(day.getDate() + d);
    for (const name of PRAYER_EXPORT_ORDER) {
      const h = times?.[name];
      if (!Number.isFinite(h)) continue;
      if (times?.unreachable?.[name]) continue;
      const start = decimalHoursToDate(day, h);
      const end = new Date(start.getTime() + 15 * 60 * 1000);
      const label = names[name] || name;
      const uid = `nur-${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}-${name}@nur-al-dhikr`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsLocal(start)}`,
        `DTEND:${icsLocal(end)}`,
        `SUMMARY:${icsEscape(label)}`,
        place ? `LOCATION:${icsEscape(place)}` : null,
        'END:VEVENT'
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.filter((l) => l !== null).join('\r\n') + '\r\n';
}

/** Download filename for the export (prayer-times-YYYY-MM-DD.ics). */
export function prayerICSFilename(baseDate = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `prayer-times-${baseDate.getFullYear()}-${p(baseDate.getMonth() + 1)}-${p(baseDate.getDate())}.ics`;
}
