/**
 * views/prayer.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import {
  calculateTimes,
  formatClock,
  nextPrayer,
  decimalHoursToDate,
  nightThirds,
  METHODS,
  ASR_FACTORS,
} from '../prayer.js';
import { SOUND_IDS } from '../prayerSound.js';

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_ICONS = {
  fajr: 'sunrise',
  sunrise: 'sun',
  dhuhr: 'sun',
  asr: 'sun',
  maghrib: 'sunset',
  isha: 'moon',
};
const QADA_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

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
    asr: p.asr,
  });
  const next = nextPrayer(times, now);
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const minsUntil = Math.round(((next.hours - nowHours + 24) % 24) * 60);
  const hrsUntil = Math.floor(minsUntil / 60);
  const remMins = minsUntil % 60;

  const rows = PRAYER_ORDER.map((name) => {
    const isNext = name === next.name;
    const alertOn = !!p.alerts?.[name];
    return `
    <div class="prayer-row ${isNext ? 'prayer-row--active' : ''}">
      <span class="prayer-row__icon">${icon(PRAYER_ICONS[name], { size: 18 })}</span>
      <span class="prayer-row__name">${t('prayer.' + name, lang)}</span>
      <span class="prayer-row__time" dir="ltr">${formatClock(times[name])}</span>
      <button type="button" class="icon-btn icon-btn--sm ${alertOn ? 'icon-btn--active-bell' : ''}" data-action="toggle-prayer-alert" data-prayer="${name}" aria-pressed="${alertOn}" aria-label="${t(alertOn ? 'prayer.alertOn' : 'prayer.alertOff', lang)}" title="${t(alertOn ? 'prayer.alertOn' : 'prayer.alertOff', lang)}">
        ${icon('bell', { size: 15 })}
      </button>
    </div>`;
  }).join('');

  const methodOptions = Object.entries(METHODS)
    .map(
      ([id, m]) =>
        `<option value="${id}" ${p.method === id ? 'selected' : ''}>${escapeHTML(m.name)}</option>`
    )
    .join('');
  const asrOptions = Object.keys(ASR_FACTORS)
    .map((id) => `<option value="${id}" ${p.asr === id ? 'selected' : ''}>${id}</option>`)
    .join('');
  const soundOptions = SOUND_IDS.map(
    (id) =>
      `<option value="${id}" ${p.alertSound === id ? 'selected' : ''}>${t('prayer.sound.' + id, lang)}</option>`
  ).join('');
  const anyAlertOn = PRAYER_ORDER.some((n) => p.alerts?.[n]);

  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowTimes = calculateTimes({
    date: tomorrow,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: -tomorrow.getTimezoneOffset() / 60,
    method: p.method,
    asr: p.asr,
  });
  const thirds = nightThirds(
    decimalHoursToDate(now, times.maghrib),
    decimalHoursToDate(tomorrow, tomorrowTimes.fajr)
  );

  const qada = state.qada;
  const qadaRows = QADA_PRAYERS.map((name) => {
    const count = qada[name] || 0;
    return `
    <div class="qada-row">
      <span class="qada-row__icon">${icon(PRAYER_ICONS[name], { size: 16 })}</span>
      <span class="qada-row__name">${t('prayer.' + name, lang)}</span>
      <div class="target-stepper">
        <button type="button" class="icon-btn icon-btn--sm" data-action="qada-step" data-prayer="${name}" data-delta="-1" aria-label="${t('qada.decrement', lang)}" ${count === 0 ? 'disabled' : ''}>${icon('close', { size: 13 })}</button>
        <span class="target-stepper__value" dir="ltr">${count}</span>
        <button type="button" class="icon-btn icon-btn--sm" data-action="qada-step" data-prayer="${name}" data-delta="1" aria-label="${t('qada.increment', lang)}">${icon('plus', { size: 13 })}</button>
      </div>
    </div>`;
  }).join('');
  const qadaTotal = QADA_PRAYERS.reduce((sum, n) => sum + (qada[n] || 0), 0);

  return `
  <section class="view view--prayer">
    <h1 class="view__title">${t('nav.prayer', lang)}</h1>

    <div class="next-prayer-card">
      <span class="next-prayer-card__label">${t('prayer.next', lang)}</span>
      <span class="next-prayer-card__name">${t('prayer.' + next.name, lang)}</span>
      <span class="next-prayer-card__countdown">${t('prayer.in', lang)} <span dir="ltr">${hrsUntil > 0 ? hrsUntil + 'h ' : ''}${remMins}m</span></span>
    </div>

    <div class="prayer-list">${rows}</div>

    <p class="view__meta">${escapeHTML(p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`)}</p>

    ${
      thirds
        ? `
    <section class="panel panel--night-thirds">
      <p class="panel__subtext">${icon('sparkle', { size: 14 })} ${t('prayer.lastThird', lang)} <span dir="ltr">${formatClock(thirds.lastThirdStart.getHours() + thirds.lastThirdStart.getMinutes() / 60)}</span></p>
    </section>`
        : ''
    }

    <section class="panel panel--qada">
      <div class="panel__header">
        <h2>${t('qada.title', lang)}</h2>
        ${qadaTotal > 0 ? `<span class="qada-total" dir="ltr">${qadaTotal}</span>` : ''}
      </div>
      <p class="panel__subtext">${t('qada.subtitle', lang)}</p>
      <div class="qada-list">${qadaRows}</div>
    </section>

    ${
      anyAlertOn
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('prayer.alertSound', lang)}</h2></div>
      <div class="sound-picker-row">
        <select class="select" data-bind="prayer-alert-sound">${soundOptions}</select>
        <button type="button" class="btn btn--secondary btn--sm" data-action="prayer-test-sound">${icon('volume', { size: 14 })} ${t('prayer.testSound', lang)}</button>
      </div>
      <p class="panel__subtext">${t('prayer.alertSoundNote', lang)}</p>
    </section>`
        : ''
    }

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
