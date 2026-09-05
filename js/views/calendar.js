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
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, dateKey } from '../core/utils.js';
import { toHijri, islamicEventsForYear, EVENT_LABELS, isWhiteDay } from '../domain/calendar.js';
import { datesWithNotesInRange } from '../services/calendarNotes.js';
import { permissionState } from '../services/notifications.js';
import {
  FASTING_CATEGORIES,
  defaultFastingPrefs,
  activeFastingCategories,
  upcomingFastingDays,
  voluntaryFastCount,
  recentVoluntaryFasts,
} from '../domain/fasting.js';
import { viewMenuButton } from '../ui/viewSheet.js';

/**
 * v3.18 voluntary (sunnah) fasting panel: category toggles + opt-in
 * day-before reminder bells, today's fast toggle, upcoming days for the
 * enabled categories, and a recent-history strip with tap-to-undo. The
 * fasts share the ramadanLog map (month keys ≠ 9) — one fasting log.
 */
function fastingPanelHTML(state, lang, today) {
  const prefs = state.fastingPrefs ?? defaultFastingPrefs();
  const log = state.ramadanLog ?? {};
  const hToday = toHijri(today);
  const counts = voluntaryFastCount(log, hToday.year);
  const upcoming = upcomingFastingDays(prefs, today, 3);
  const recent = recentVoluntaryFasts(log, 8, today);
  const anyRemind = FASTING_CATEGORIES.some((c) => prefs[c]?.remind === true);
  const perm = permissionState();

  const todayLogKey = `${hToday.year}-${hToday.month}`;
  const todayFasted = !!log[todayLogKey]?.[String(hToday.day)];
  const todayCats = activeFastingCategories(prefs, hToday, today);

  const catRows = FASTING_CATEGORIES.map((cat) => {
    const pref = prefs[cat] ?? { enabled: false, remind: false };
    return `
      <div class="fast-row">
        <span class="fast-row__text">
          <span class="fast-row__name">${t(`fasting.cat.${cat}`, lang)}</span>
          <span class="fast-row__hint">${t(`fasting.cat.${cat}Hint`, lang)}</span>
        </span>
        <button type="button" class="chip ${pref.enabled ? 'chip--active' : ''}" data-action="fasting-toggle-category" data-cat="${cat}" aria-pressed="${pref.enabled}">
          ${pref.enabled ? t('fasting.on', lang) : t('fasting.off', lang)}
        </button>
        <button type="button" class="icon-btn icon-btn--sm ${pref.remind ? 'icon-btn--active-bell' : ''}" data-action="fasting-toggle-remind" data-cat="${cat}" aria-pressed="${pref.remind}" aria-label="${t('fasting.remind', lang)} — ${t(`fasting.cat.${cat}`, lang)}" title="${t('fasting.remind', lang)}" ${pref.enabled ? '' : 'disabled'}>
          ${icon('bell', { size: 15 })}
        </button>
      </div>`;
  }).join('');

  const upcomingRows = upcoming.length
    ? upcoming
        .map((u) => {
          const cats = u.categories
            .map((c) => `<span class="chip chip--tag">${t(`fasting.cat.${c}`, lang)}</span>`)
            .join('');
          return `
        <div class="event-row">
          <span class="event-row__date" dir="ltr">${u.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span class="event-row__label">${escapeHTML(u.hijri.day + ' ' + (u.hijri.monthName[lang] || u.hijri.monthName.en))} ${cats}</span>
        </div>`;
        })
        .join('')
    : `<p class="empty-hint">${t('fasting.noneUpcoming', lang)}</p>`;

  const recentChips = recent.length
    ? `
      <div class="chip-row chip-row--scroll">
        ${recent
          .map(
            (r) => `
        <button type="button" class="chip" data-action="ramadan-toggle-fast" data-log-key="${r.logKey}" data-day="${r.day}" title="${t('fasting.undoHint', lang)}" aria-label="${t('fasting.undoHint', lang)}">
          ${r.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { month: 'short', day: 'numeric' })}
        </button>`
          )
          .join('')}
      </div>`
    : '';

  return `
    <section class="panel panel--fasting">
      <div class="panel__header"><h2>${icon('sun', { size: 16 })} ${t('fasting.title', lang)}</h2></div>
      <p class="panel__subtext">
        ${t('fasting.count', lang, { n: counts.total })}${counts.thisHijriYear ? ` · ${t('fasting.countYear', lang, { n: counts.thisHijriYear })}` : ''}
      </p>
      ${catRows}
      <div class="fast-row fast-row--time">
        <span class="fast-row__text">
          <span class="fast-row__name">${t('fasting.remindTime', lang)}</span>
        </span>
        <button type="button" class="chip" data-action="fasting-cycle-remind-time" dir="ltr" aria-label="${t('fasting.remindTime', lang)}">${prefs.remindTime}</button>
      </div>
      ${
        anyRemind && perm !== 'granted'
          ? `<button type="button" class="btn btn--secondary btn--sm" data-action="ramadan-enable-notifications">${t('ramadan.enableNotifications', lang)}</button>`
          : ''
      }
      <p class="panel__subtext">${t('fasting.sharedLogNote', lang)}</p>
    </section>

    <section class="panel panel--fasting-days">
      <div class="panel__header"><h2>${t('fasting.todayTitle', lang)}</h2></div>
      <div class="fast-row">
        <span class="fast-row__text">
          <span class="fast-row__name">${t('calendar.today', lang)} — ${hToday.day} ${escapeHTML(hToday.monthName[lang] || hToday.monthName.en)}</span>
          ${todayCats.length ? `<span class="fast-row__hint">${todayCats.map((c) => t(`fasting.cat.${c}`, lang)).join(' · ')}</span>` : ''}
        </span>
        <button type="button" class="chip ${todayFasted ? 'chip--active' : ''}" data-action="ramadan-toggle-fast" data-log-key="${todayLogKey}" data-day="${hToday.day}" aria-pressed="${todayFasted}">
          ${todayFasted ? t('fasting.fasted', lang) : t('fasting.markFasted', lang)}
        </button>
      </div>
    </section>

    <section class="panel panel--fasting-upcoming">
      <div class="panel__header"><h2>${t('fasting.next', lang)}</h2></div>
      ${upcomingRows}
      ${recentChips ? `<p class="panel__subtext">${t('fasting.history', lang)}</p>${recentChips}` : ''}
    </section>`;
}

function parseMonthParam(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

/** (v4.3) The month-range Hijri label with each month carrying ITS OWN year.
 *  A Gregorian month spanning Muharram used to print "Dhu al-Hijjah –
 *  Muharram 1447 AH" — with the new-year month silently wearing the old
 *  year. Same-year ranges stay compact ("Rajab – Sha'ban 1447 AH"). */
function hijriRangeLabel(dayCellsData, lang) {
  const first = dayCellsData[0];
  const last = dayCellsData[dayCellsData.length - 1];
  if (!first || !last) return '';
  const ah = t('calendar.ah', lang);
  const name = (c) => escapeHTML(c.hMonthName[lang] || c.hMonthName.en);
  if (first.hYear === last.hYear) {
    return `${name(first)} \u2013 ${name(last)} ${first.hYear} ${ah}`;
  }
  return `${name(first)} ${first.hYear} \u2013 ${name(last)} ${last.hYear} ${ah}`;
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
    dayCellsData.push({
      key,
      gDay: d,
      hDay: h.day,
      hMonth: h.month,
      hMonthName: h.monthName,
      hYear: h.year,
      isToday: key === todayKey,
      isWhite: isWhiteDay(h.day),
    });
  }
  const allKeysThisMonth = dayCellsData.map((c) => c.key);
  const notedDates = datesWithNotesInRange(state.calendarNotes, allKeysThisMonth);

  const dowLabels =
    lang === 'ar'
      ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const blanks = Array.from(
    { length: startDow },
    () => `<span class="cal-cell cal-cell--empty"></span>`
  ).join('');
  const dayCells = dayCellsData
    .map((c) => {
      // (v4.2) announce the LOCALIZED date (weekday, day, month, year) plus
      // the note marker — `c.date` was never set, so every cell announced
      // the raw ISO key ("2026-02-14", Latin digits, en format) even in the
      // Arabic UI, and the note dot was invisible to screen readers.
      const g = new Date(c.key + 'T12:00:00');
      const dayLabel = g.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const hasNote = notedDates.has(c.key);
      return `
    <button type="button" class="cal-cell cal-cell--dual ${c.isToday ? 'cal-cell--today' : ''} ${c.isWhite ? 'cal-cell--white' : ''}" data-action="calendar-open-day" data-date="${c.key}" aria-label="${escapeHTML(dayLabel)}${hasNote ? ` · ${t('calendar.hasNotes', lang)}` : ''}">
      <span class="cal-cell__g">${c.gDay}</span>
      <span class="cal-cell__h">${c.hDay}</span>
      ${hasNote ? '<span class="cal-cell__dot" aria-hidden="true"></span>' : ''}
    </button>`;
    })
    .join('');

  const monthLabel = firstOfMonth.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const events = islamicEventsForYear(today.getFullYear())
    .filter((e) => e.date >= today)
    .slice(0, 5);

  return `
  <section class="view view--calendar">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.calendar', lang)}</h1>
      ${viewMenuButton('calendar', lang, { labelKey: 'viewMenu.calendar' })}
    </div>

    <div class="hijri-today">
      <span class="hijri-today__day">${hToday.day}</span>
      <span class="hijri-today__month">${escapeHTML(hToday.monthName[lang] || hToday.monthName.en)} ${hToday.year} ${t('calendar.ah', lang)}</span>
      <span class="hijri-today__gregorian">${today.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>

    <section class="panel">
      <div class="cal-nav">
        <button type="button" class="icon-btn" data-action="navigate" data-view="calendar" data-month="${monthParamFor(prevMonth)}" aria-label="${t('calendar.prevMonth', lang)}">${icon('chevronLeft', { size: 18 })}</button>
        <div class="cal-nav__label">
          <strong>${escapeHTML(monthLabel)}</strong>
          <span class="cal-nav__hijri">${hijriRangeLabel(dayCellsData, lang)}</span>
        </div>
        <button type="button" class="icon-btn" data-action="navigate" data-view="calendar" data-month="${monthParamFor(nextMonth)}" aria-label="${t('calendar.nextMonth', lang)}">${icon('chevronRight', { size: 18 })}</button>
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

    ${
      events.length
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('calendar.events', lang)}</h2></div>
      <div class="event-list">
        ${events
          .map(
            (e) => `
        <div class="event-row">
          <span class="event-row__date">${e.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { month: 'short', day: 'numeric' })}</span>
          <span class="event-row__label">${escapeHTML(EVENT_LABELS[e.key][lang] || EVENT_LABELS[e.key].en)}</span>
        </div>`
          )
          .join('')}
      </div>
      <p class="panel__subtext">${t('calendar.gregorian', lang)} \u2014 ${t('calendar.estimateNote', lang)}</p>
    </section>`
        : ''
    }

    ${fastingPanelHTML(state, lang, today)}
  </section>`;
}
