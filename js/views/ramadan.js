/**
 * views/ramadan.js
 * The Ramadan & Fasting companion: a live Suhoor–Iftar countdown driven by
 * the person's actual Fajr/Maghrib times (same solar-position engine the
 * Prayer view uses), a 29/30-day fasting tracker, a Laylat al-Qadr
 * odd-night indicator for the last ten nights, and — outside Ramadan — a
 * countdown to the next Ramadan and Eid al-Fitr.
 *
 * The ticking seconds are NOT re-rendered through the store (that would
 * churn localStorage every second); app.js patches the countdown DOM nodes
 * directly each tick, the same way the Qibla compass patches its dial.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { pickLocale } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS, SUHOOR_OFFSETS } from '../core/config.js';
import { calculateTimes, formatClock } from '../domain/prayer.js';
import { permissionState } from '../services/notifications.js';
import {
  ramadanInfo,
  ramadanLength,
  nextRamadan,
  nextEidAlFitr,
  fastPhase,
  qadrNightFor,
  fastTrackerDays,
  keptFastCount,
  ramadanLogKey,
} from '../domain/ramadan.js';
import { viewMenuButton } from '../ui/viewSheet.js';

/**
 * Resolve the iftar/suhoor dua item id against the live library index —
 * preferred known ids first, then any matching item in the Ramadan
 * category, then the category's first item. Content ids are data, not
 * code: hardcoding them broke silently whenever the library was edited
 * (exactly what the v2.5 data cleanup did).
 */
const IFTAR_PREFERENCE = ['dua-ram-002', 'glm-ram-002', 'dua-ram-001'];
const SUHOOR_PREFERENCE = ['glm-ram-004', 'dua-ram-004', 'glm-ram-001', 'dua-ram-001'];

function resolveDuaId(itemIndex, preferred, match) {
  for (const id of preferred) {
    if (itemIndex[id]) return id;
  }
  const entries = Object.values(itemIndex).filter((e) => e.category?.id === 'ramadan-special');
  const matched = match
    ? entries.find((e) => match.test((e.item?.title?.en || '').toLowerCase()))
    : null;
  if (matched) return matched.item.id;
  return entries[0]?.item?.id || null;
}

function phaseCard(state, lang, times, tomorrowFajr) {
  const phase = fastPhase(new Date(), times, tomorrowFajr);
  const isFasting = phase.phase === 'fasting';
  const targetClock = formatClock(phase.targetHours);

  const duaId = isFasting
    ? resolveDuaId(state.library.itemIndex, IFTAR_PREFERENCE, /iftar|breaking fast|fasting person/)
    : resolveDuaId(state.library.itemIndex, SUHOOR_PREFERENCE, /suhoor|pre-dawn|sahar/);
  const duaLink = duaId
    ? `<a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.FOCUS, { id: 'ramadan-special', subId: duaId })}" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="ramadan-special" data-sub-id="${duaId}">
        ${icon('hands', { size: 15 })} ${t(isFasting ? 'ramadan.iftarDua' : 'ramadan.suhoorDua', lang)}
      </a>`
    : ''; // library not loaded yet — better no button than a dead link

  return `
  <section class="ramadan-hero ${isFasting ? 'ramadan-hero--fasting' : 'ramadan-hero--night'}">
    <div class="ramadan-hero__head">
      <span class="ramadan-hero__icon">${icon(isFasting ? 'sun' : 'moon', { size: 28 })}</span>
      <div class="ramadan-hero__labels">
        <span class="ramadan-hero__phase">${t(isFasting ? 'ramadan.fastingNow' : 'ramadan.nightNow', lang)}</span>
        <span class="ramadan-hero__target">${t(isFasting ? 'ramadan.iftarAt' : 'ramadan.suhoorEndsAt', lang)} <bdi dir="ltr">${targetClock}</bdi></span>
      </div>
    </div>
    <p class="ramadan-hero__countdown" data-ramadan-countdown dir="ltr" aria-live="off">–:––:––</p>
    <p class="ramadan-hero__caption">${t(isFasting ? 'ramadan.untilIftar' : 'ramadan.untilSuhoor', lang)}</p>
    <div class="ramadan-hero__duas">${duaLink}</div>
  </section>`;
}

function trackerPanel(state, lang, hijri, times = null, totalDays = null) {
  const total = totalDays ?? ramadanLength(hijri.year);
  const days = fastTrackerDays(state.ramadanLog, hijri.year, hijri.day, total);
  const kept = keptFastCount(state.ramadanLog, hijri.year);
  // (v4.3) Laylat al-Qadr attribution follows the Islamic night (Maghrib →
  // Fajr), not the calendar day number — the extracted rule lives in
  // domain/ramadan.js#qadrNightFor with the full reasoning + tests.
  const now = new Date();
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const qadr = qadrNightFor(hijri, times, nowHours, total);
  const nightDay = qadr ? qadr.dayOfRamadan : hijri.day + 1;

  const cells = days
    .map(
      (d) => `
    <button type="button" class="fast-dot ${d.kept ? 'fast-dot--kept' : ''} ${d.isToday ? 'fast-dot--today' : ''}"
      data-action="ramadan-toggle-fast" data-day="${d.day}" data-log-key="${ramadanLogKey(hijri.year)}"
      aria-pressed="${d.kept}" aria-label="${t('ramadan.fastDay', lang, { n: d.day })}"
      ${d.isToday ? '' : 'disabled'} title="${t('ramadan.fastDay', lang, { n: d.day })}"></button>`
    )
    .join('');

  return `
  <section class="panel panel--fast-tracker">
    <div class="panel__header">
      <h2>${t('ramadan.fastTracker', lang)}</h2>
      <span class="streak-badge">${icon('check', { size: 14 })} ${kept} / ${total}</span>
    </div>
    <div class="fast-dot-grid">${cells}</div>
    <p class="panel__subtext">${t('ramadan.fastTrackerHint', lang)}</p>
    ${
      qadr?.inLastTen
        ? `
    <div class="qadr-banner ${qadr.isLikelyQadrNight ? 'qadr-banner--odd' : ''}">
      ${icon('sparkle', { size: 16 })}
      <span>${qadr.isLikelyQadrNight ? t('ramadan.qadrTonight', lang) : t('ramadan.lastTenNights', lang, { n: nightDay })}</span>
    </div>`
        : ''
    }
  </section>`;
}

function alertsPanel(state, lang, times) {
  const ra = state.settings.prayer.ramadanAlerts || {
    suhoor: false,
    iftar: false,
    suhoorOffset: 30,
  };
  const perm = permissionState();
  const granted = perm === 'granted';
  const offsetOptions = SUHOOR_OFFSETS.map(
    (m) => `<option value="${m}" ${ra.suhoorOffset === m ? 'selected' : ''}>${m}</option>`
  ).join('');

  const permBanner = granted
    ? ''
    : `
    <div class="qadr-banner">
      ${icon('bell', { size: 16 })}
      <span>${perm === 'denied' ? t('ramadan.alertsDenied', lang) : t('ramadan.alertsNeedPermission', lang)}</span>
      ${perm === 'default' ? `<button type="button" class="btn btn--secondary btn--sm" data-action="ramadan-enable-notifications">${t('ramadan.enableNotifications', lang)}</button>` : ''}
    </div>`;

  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('ramadan.alertsTitle', lang)}</h2></div>
    ${permBanner}
    <div class="prayer-row">
      <span class="prayer-row__icon">${icon('moon', { size: 18 })}</span>
      <span class="prayer-row__name">${t('ramadan.suhoorAlert', lang)}</span>
      <span class="prayer-row__time" dir="ltr">${formatClock(Math.max(0, times.fajr - (ra.suhoorOffset || 30) / 60))}</span>
      <button type="button" class="icon-btn icon-btn--sm ${ra.suhoor ? 'icon-btn--active-bell' : ''}" data-action="toggle-ramadan-alert" data-alert="suhoor" aria-pressed="${ra.suhoor}" aria-label="${t('ramadan.suhoorAlert', lang)}">
        ${icon('bell', { size: 15 })}
      </button>
    </div>
    <div class="prayer-row">
      <span class="prayer-row__icon">${icon('sunset', { size: 18 })}</span>
      <span class="prayer-row__name">${t('ramadan.iftarAlert', lang)}</span>
      <span class="prayer-row__time" dir="ltr">${formatClock(times.maghrib)}</span>
      <button type="button" class="icon-btn icon-btn--sm ${ra.iftar ? 'icon-btn--active-bell' : ''}" data-action="toggle-ramadan-alert" data-alert="iftar" aria-pressed="${ra.iftar}" aria-label="${t('ramadan.iftarAlert', lang)}">
        ${icon('bell', { size: 15 })}
      </button>
    </div>
    <div class="sound-picker-row">
      <label class="field-label" for="suhoor-offset-select">${t('ramadan.suhoorOffset', lang)}</label>
      <select class="select" id="suhoor-offset-select" data-bind="ramadan-suhoor-offset">${offsetOptions}</select>
    </div>
    <p class="panel__subtext">${t('ramadan.alertsNote', lang)}</p>
  </section>`;
}

function linksPanel(lang) {
  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('ramadan.explore', lang)}</h2></div>
    <div class="quick-actions quick-actions--compact">
      <a class="quick-action quick-action--prayer" href="${buildHash(VIEWS.CATEGORY, { id: 'ramadan-special' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="ramadan-special">
        ${icon('hands', { size: 22 })}<span>${t('ramadan.ramadanDuas', lang)}</span>
      </a>
      <a class="quick-action quick-action--quran" href="${buildHash(VIEWS.MUSHAF)}" data-action="navigate" data-view="${VIEWS.MUSHAF}">
        ${icon('quran', { size: 22 })}<span>${t('ramadan.readQuran', lang)}</span>
      </a>
      <a class="quick-action quick-action--qibla" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">
        ${icon('compass', { size: 22 })}<span>${t('nav.prayer', lang)}</span>
      </a>
      <a class="quick-action quick-action--tasbih" href="${buildHash(VIEWS.ZAKAT)}" data-action="navigate" data-view="${VIEWS.ZAKAT}">
        ${icon('calculator', { size: 22 })}<span>${t('nav.zakat', lang)}</span>
      </a>
    </div>
  </section>`;
}

function countdownBlock(label, value, sub) {
  return `
  <div class="ramadan-countdown-block">
    <span class="ramadan-countdown-block__label">${label}</span>
    <span class="ramadan-countdown-block__value" dir="ltr">${value}</span>
    ${sub ? `<span class="ramadan-countdown-block__sub">${sub}</span>` : ''}
  </div>`;
}

export function renderRamadan(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  const { inRamadan, hijri } = ramadanInfo(new Date());
  const hijriDateLabel = `${hijri.day} ${pickLocale(hijri.monthName, lang)} ${hijri.year} AH`;

  let main;

  if (!hasLocation) {
    // (v4.2) shared empty-state builder — the hand-rolled twins of this
    // block (prayer/qibla/ramadan) had already drifted once before.
    main = emptyStateHTML({
      iconName: 'moon',
      title: t('ramadan.locationNeeded', lang),
      actionHTML: `
      <button type="button" class="btn btn--primary" data-action="prayer-request-location">${icon('location', { size: 16 })} ${t('prayer.enableLocation', lang)}</button>
      <button type="button" class="link-btn" data-action="prayer-manual-location">${t('prayer.manualLocation', lang)}</button>`,
    });
  } else if (inRamadan) {
    const now = new Date();
    const tz = -now.getTimezoneOffset() / 60;
    const times = calculateTimes({
      date: now,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffsetHours: tz,
      method: p.method,
      asr: p.asr,
    });
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowTimes = calculateTimes({
      date: tomorrow,
      latitude: p.latitude,
      longitude: p.longitude,
      // (v4.3) tomorrow's own UTC offset: on the night a DST shift occurs,
      // reusing TODAY's offset put tomorrow's Fajr a full hour off in the
      // suhoor countdown.
      timezoneOffsetHours: -tomorrow.getTimezoneOffset() / 60,
      method: p.method,
      asr: p.asr,
    });

    const total = ramadanLength(hijri.year);
    const daysLeft = total - hijri.day;

    main = `
    ${phaseCard(state, lang, times, tomorrowTimes.fajr)}

    <div class="ramadan-countdown-row">
      ${countdownBlock(t('ramadan.dayOf', lang), `${hijri.day} / ${total}`, hijriDateLabel)}
      ${countdownBlock(t('ramadan.daysLeft', lang), String(daysLeft), t('ramadan.daysLeftSub', lang))}
    </div>

    ${trackerPanel(state, lang, hijri, times, total)}
    ${alertsPanel(state, lang, times)}
    ${linksPanel(lang)}`;
  } else {
    const nr = nextRamadan(new Date());
    const eid = nextEidAlFitr(new Date());
    const lastKept = keptFastCount(state.ramadanLog, hijri.year - (hijri.month >= 10 ? 0 : 1));

    const fmtDate = (d) =>
      d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    main = `
    <section class="ramadan-hero ramadan-hero--waiting">
      <div class="ramadan-hero__head">
        <span class="ramadan-hero__icon">${icon('moon', { size: 28 })}</span>
        <div class="ramadan-hero__labels">
          <span class="ramadan-hero__phase">${t('ramadan.notYet', lang)}</span>
          <span class="ramadan-hero__target">${hijriDateLabel}</span>
        </div>
      </div>
      <div class="ramadan-countdown-row ramadan-countdown-row--stacked">
        ${countdownBlock(t('ramadan.untilRamadan', lang), t('ramadan.daysUnit', lang, { n: nr.daysUntil }), fmtDate(nr.startDate))}
        ${countdownBlock(t('ramadan.untilEid', lang), t('ramadan.daysUnit', lang, { n: eid.daysUntil }), fmtDate(eid.startDate))}
      </div>
      ${lastKept > 0 ? `<p class="ramadan-hero__caption">${t('ramadan.lastKept', lang, { n: lastKept })}</p>` : ''}
    </section>
    ${linksPanel(lang)}`;
  }

  return `
  <section class="view view--ramadan">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('ramadan.title', lang)}</h1>
      ${viewMenuButton('ramadan', lang, { labelKey: 'viewMenu.ramadan' })}
    </div>
    ${main}
    <p class="view__meta">${t('ramadan.hijriNote', lang)}</p>
  </section>`;
}
