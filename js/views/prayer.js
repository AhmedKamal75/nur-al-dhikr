/**
 * views/prayer.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { calculateTimes, formatClock, nextPrayer, METHODS, ASR_FACTORS } from '../prayer.js';
import { SOUND_IDS } from '../prayerSound.js';
import { selectors } from '../state.js';
import { PRAYER_KEYS, prayerState, loggedCount, prayerStreak, prayerWeek, prayerMonthCount } from '../prayerLog.js';

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_ICONS = { fajr: 'sunrise', sunrise: 'sun', dhuhr: 'sun', asr: 'sun', maghrib: 'sunset', isha: 'moon' };

export function renderPrayer(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  if (!hasLocation) {
    return `
    <section class="view view--prayer">
      <h1 class="view__title">${t('nav.prayer', lang)}</h1>
      <div class="empty-state">
        ${icon('compass', { size: 40 })}
        <p>${t('prayer.locationNeeded', lang)}</p>
        <button type="button" class="btn btn--primary" data-action="prayer-request-location">${icon('location', { size: 16 })} ${t('prayer.enableLocation', lang)}</button>
        <button type="button" class="link-btn" data-action="prayer-manual-location">${t('prayer.manualLocation', lang)}</button>
      </div>
    </section>`;
  }

  const now = new Date();
  const tzOffsetHours = -now.getTimezoneOffset() / 60;
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tzOffsetHours,
    method: p.method,
    asr: p.asr
  });
  const next = nextPrayer(times, now);
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const minsUntil = Math.round((((next.hours - nowHours) + 24) % 24) * 60);
  const hrsUntil = Math.floor(minsUntil / 60);
  const remMins = minsUntil % 60;

  // FIX (review v3.3 A7): the solar times are correct for the saved
  // coordinates, but the CLOCK they are expressed on is always the
  // device's. When the longitude-implied UTC offset differs from the
  // device's by 45 minutes or more, the person is almost certainly
  // looking at a place in another time zone — flag it instead of letting
  // the numbers silently pose as local prayer times.
  const longitudeImpliedOffset = Math.round((p.longitude / 15) * 4) / 4; // nearest 15 min
  const tzMismatch = Math.abs(longitudeImpliedOffset - tzOffsetHours) >= 0.75;

  // Prayer log (v3.0): tri-state cycle button per fard prayer, riding the
  // same dailyChecklist storage the habit checklist uses (see js/prayerLog.js).
  const todayLog = selectors.todayChecklist(state);

  const rows = PRAYER_ORDER.map((name) => {
    const isNext = name === next.name;
    const alertOn = !!p.alerts?.[name];
    const isFard = name !== 'sunrise';
    const pstate = isFard ? prayerState(todayLog, name) : null;
    const logBtn = !isFard ? '' : `
      <button type="button" class="icon-btn icon-btn--sm prayer-log-btn ${pstate ? `prayer-log-btn--${pstate}` : ''}" data-action="prayer-log-cycle" data-prayer="${name}" aria-pressed="${!!pstate}" aria-label="${t(pstate === 'jamaah' ? 'plog.state.jamaah' : pstate === 'prayed' ? 'plog.state.prayed' : 'plog.logAction', lang)}" title="${t(pstate === 'jamaah' ? 'plog.state.jamaah' : pstate === 'prayed' ? 'plog.state.prayed' : 'plog.logAction', lang)}">
        ${pstate === 'jamaah' ? icon('mosque', { size: 15 }) : pstate === 'prayed' ? icon('check', { size: 15 }) : '<span class="prayer-log-dot" aria-hidden="true"></span>'}
      </button>`;
    return `
    <div class="prayer-row ${isNext ? 'prayer-row--active' : ''}">
      <span class="prayer-row__icon">${icon(PRAYER_ICONS[name], { size: 18 })}</span>
      <span class="prayer-row__name">${t('prayer.' + name, lang)}</span>
      <span class="prayer-row__time" dir="ltr">${formatClock(times[name])}</span>
      ${logBtn}
      <button type="button" class="icon-btn icon-btn--sm ${alertOn ? 'icon-btn--active-bell' : ''}" data-action="toggle-prayer-alert" data-prayer="${name}" aria-pressed="${alertOn}" aria-label="${t(alertOn ? 'prayer.alertOn' : 'prayer.alertOff', lang)}" title="${t(alertOn ? 'prayer.alertOn' : 'prayer.alertOff', lang)}">
        ${icon('bell', { size: 15 })}
      </button>
    </div>`;
  }).join('');

  // Week strip + streak + month count for the log panel.
  const week = prayerWeek(state.dailyChecklist, 7, now);
  const streak = prayerStreak(state.dailyChecklist, now);
  const monthCount = prayerMonthCount(state.dailyChecklist, now);
  const loggedToday = loggedCount(todayLog);

  const weekCells = week.map((d) => `
    <div class="plog-week__day ${d.complete ? 'plog-week__day--complete' : ''}" title="${d.count}/${d.total}">
      <span class="plog-week__label">${d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'narrow' })}</span>
      <span class="plog-week__dots">
        ${PRAYER_KEYS.map((k) => `<span class="plog-dot ${d.states[k] ? `plog-dot--${d.states[k]}` : ''}"></span>`).join('')}
      </span>
    </div>`).join('');

  const methodOptions = Object.entries(METHODS).map(([id, m]) => `<option value="${id}" ${p.method === id ? 'selected' : ''}>${escapeHTML(m.name)}</option>`).join('');
  const asrOptions = Object.keys(ASR_FACTORS).map((id) => `<option value="${id}" ${p.asr === id ? 'selected' : ''}>${id}</option>`).join('');
  const soundOptions = SOUND_IDS.map((id) => `<option value="${id}" ${p.alertSound === id ? 'selected' : ''}>${t('prayer.sound.' + id, lang)}</option>`).join('');
  const anyAlertOn = PRAYER_ORDER.some((n) => p.alerts?.[n]);

  return `
  <section class="view view--prayer">
    <h1 class="view__title">${t('nav.prayer', lang)}</h1>

    <div class="next-prayer-card">
      <span class="next-prayer-card__label">${t('prayer.next', lang)}</span>
      <span class="next-prayer-card__name">${t('prayer.' + next.name, lang)}</span>
      <span class="next-prayer-card__countdown">${t('prayer.in', lang)} <span dir="ltr">${hrsUntil > 0 ? hrsUntil + 'h ' : ''}${remMins}m</span></span>
    </div>

    <div class="prayer-list">${rows}</div>

    ${/* FIX (review v3.3 A7): prayer times are computed on the device's
        clock offset, so coordinates entered for a different time zone show
        clock times nobody there can pray by — silently. When the saved
        longitude implies a different offset (≥ 45 min) from the device's,
        say so honestly instead of letting the numbers pass as local. */ ''}
    ${tzMismatch ? `<p class="panel__subtext tz-mismatch-note">${icon('info', { size: 14 })} ${t('prayer.tzMismatch', lang)}</p>` : ''}

    <section class="panel panel--prayer-log">
      <div class="panel__header">
        <h2>${t('plog.title', lang)}</h2>
        ${streak > 0 ? `<span class="streak-badge">${icon('flame', { size: 15 })} ${t('plog.streak', lang, { n: streak })}</span>` : ''}
      </div>
      <p class="panel__subtext" dir="ltr">${loggedToday} / ${PRAYER_KEYS.length} ${t('checklist.today', lang)}${monthCount ? ` · ${t('plog.monthCount', lang, { n: monthCount })}` : ''}</p>
      <div class="plog-week">${weekCells}</div>
      <p class="panel__subtext">${t('plog.hint', lang)}</p>
    </section>

    <p class="view__meta">${escapeHTML(p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`)}</p>

    ${anyAlertOn ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('prayer.alertSound', lang)}</h2></div>
      <div class="sound-picker-row">
        <select class="select" data-bind="prayer-alert-sound">${soundOptions}</select>
        <button type="button" class="btn btn--secondary btn--sm" data-action="prayer-test-sound">${icon('volume', { size: 14 })} ${t('prayer.testSound', lang)}</button>
      </div>
      <p class="panel__subtext">${t('prayer.alertSoundNote', lang)}</p>
    </section>` : ''}

    <section class="panel">
      <div class="panel__header"><h2>${t('prayer.method', lang)}</h2></div>
      <select class="select" data-bind="prayer-method">${methodOptions}</select>
    </section>
    <section class="panel">
      <div class="panel__header"><h2>${t('prayer.asrMethod', lang)}</h2></div>
      <select class="select" data-bind="prayer-asr">${asrOptions}</select>
    </section>

    <button type="button" class="link-btn" data-action="prayer-request-location">${icon('location', { size: 14 })} ${t('prayer.enableLocation', lang)}</button>
  </section>`;
}
