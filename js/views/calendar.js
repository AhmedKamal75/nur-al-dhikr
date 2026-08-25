/**
 * views/calendar.js
 * A single navigable Gregorian month grid where every cell shows its Hijri
 * equivalent too (day number, and month name at the seam where the Hijri
 * month rolls over) — genuinely "dual calendar" without the date-range
 * mismatch you'd get from showing two separate full-month grids side by
 * side (a Hijri month and a Gregorian month almost never cover the same
 * date range, so two independent grids would show different, confusing
 * date windows). Cells with a custom note get a small indicator dot and
 * are tappable to view/add notes for that day.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, dateKey } from '../utils.js';
import { toHijri, islamicEventsForYear, EVENT_LABELS, isWhiteDay } from '../calendar.js';
import { datesWithNotesInRange } from '../calendarNotes.js';

function parseMonthParam(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

function monthParamFor(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function renderCalendar(state) {
  const lang = state.settings.language;
  const today = new Date();
  const todayKey = dateKey(today);
  const hToday = toHijri(today);

  const viewedMonth = parseMonthParam(state.activeParams.month);
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();

  const dayCellsData = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const g = new Date(year, month, d);
    const key = dateKey(g);
    const h = toHijri(g);
    dayCellsData.push({ key, gDay: d, hDay: h.day, hMonth: h.month, hMonthName: h.monthName, isToday: key === todayKey, isWhite: isWhiteDay(h.day) });
  }
  const allKeysThisMonth = dayCellsData.map((c) => c.key);
  const notedDates = datesWithNotesInRange(state.calendarNotes, allKeysThisMonth);

  const dowLabels = lang === 'ar'
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const blanks = Array.from({ length: startDow }, () => `<span class="cal-cell cal-cell--empty"></span>`).join('');
  const dayCells = dayCellsData.map((c) => `
    <button type="button" class="cal-cell cal-cell--dual ${c.isToday ? 'cal-cell--today' : ''} ${c.isWhite ? 'cal-cell--white' : ''}" data-action="calendar-open-day" data-date="${c.key}" aria-label="${c.key}">
      <span class="cal-cell__g">${c.gDay}</span>
      <span class="cal-cell__h">${c.hDay}</span>
      ${notedDates.has(c.key) ? '<span class="cal-cell__dot" aria-hidden="true"></span>' : ''}
    </button>`).join('');

  const monthLabel = firstOfMonth.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { month: 'long', year: 'numeric' });
  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const events = islamicEventsForYear(today.getFullYear())
    .filter((e) => e.date >= today)
    .slice(0, 5);

  return `
  <section class="view view--calendar">
    <h1 class="view__title">${t('nav.calendar', lang)}</h1>

    <div class="hijri-today">
      <span class="hijri-today__day">${hToday.day}</span>
      <span class="hijri-today__month">${escapeHTML(hToday.monthName[lang] || hToday.monthName.en)} ${hToday.year} AH</span>
      <span class="hijri-today__gregorian">${today.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>

    <section class="panel">
      <div class="cal-nav">
        <button type="button" class="icon-btn" data-action="navigate" data-view="calendar" data-month="${monthParamFor(prevMonth)}" aria-label="Previous month">${icon('chevronLeft', { size: 18 })}</button>
        <div class="cal-nav__label">
          <strong>${escapeHTML(monthLabel)}</strong>
          <span class="cal-nav__hijri">${escapeHTML((dayCellsData[0]?.hMonthName[lang]) || '')} \u2013 ${escapeHTML((dayCellsData[dayCellsData.length - 1]?.hMonthName[lang]) || '')} ${hToday.year} AH</span>
        </div>
        <button type="button" class="icon-btn" data-action="navigate" data-view="calendar" data-month="${monthParamFor(nextMonth)}" aria-label="Next month">${icon('chevronRight', { size: 18 })}</button>
        ${!isCurrentMonth ? `<button type="button" class="link-btn cal-nav__today" data-action="navigate" data-view="calendar">${t('calendar.today', lang)}</button>` : ''}
      </div>
      <div class="cal-grid cal-grid--dual">
        ${dowLabels.map((d) => `<span class="cal-dow">${d}</span>`).join('')}
        ${blanks}${dayCells}
      </div>
      <div class="cal-legend">
        <span><span class="cal-legend__swatch cal-legend__swatch--today"></span>${t('calendar.today', lang)}</span>
        <span><span class="cal-legend__swatch cal-legend__swatch--white"></span>${t('calendar.whiteDays', lang)}</span>
        <span><span class="cal-legend__swatch cal-legend__swatch--dot"></span>${t('calendar.hasNotes', lang)}</span>
      </div>
    </section>

    ${events.length ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('calendar.events', lang)}</h2></div>
      <div class="event-list">
        ${events.map((e) => `
        <div class="event-row">
          <span class="event-row__date">${e.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { month: 'short', day: 'numeric' })}</span>
          <span class="event-row__label">${escapeHTML(EVENT_LABELS[e.key][lang] || EVENT_LABELS[e.key].en)}</span>
        </div>`).join('')}
      </div>
      <p class="panel__subtext">${t('calendar.gregorian', lang)} \u2014 estimates based on the tabular calendar; may differ by a day from local moon-sighting announcements.</p>
    </section>` : ''}
  </section>`;
}
