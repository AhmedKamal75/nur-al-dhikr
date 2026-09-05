/**
 * views/prayer.js
 * (v4.6.0) The Prayer page is FOCUSED: the next-prayer hero, the day's
 * times, and the log strip. Everything that used to stack below — sunnah
 * tracker, qada' backlog, traveler mode, adhan & alerts, calculation
 * settings, saved places — moved into the per-view "⋯" menu
 * (views/viewSheets.js + handlers/viewMenus.js), each opening one of the
 * panel builders exported here. Same data, same handlers, one clean page.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { escapeHTML } from '../core/utils.js';
import { wasCelebrated } from '../domain/celebrate.js';
import { calculateTimes, formatClock, nextPrayer, METHODS, ASR_FACTORS } from '../domain/prayer.js';
import { buildTimeline } from '../domain/prayerTimeline.js';
import { SOUND_IDS, ADHAN_MODES, customAdhanFlags } from '../services/prayerSound.js';
import { selectors } from '../core/state.js';
import { viewMenuButton } from '../ui/viewSheet.js';
import {
  PRAYER_KEYS,
  prayerState,
  loggedCount,
  prayerStreak,
  prayerWeek,
  prayerMonthCount,
} from '../domain/prayerLog.js';
import { SUNNAH_ITEMS, sunnahToday, sunnahWeek, witrStreak } from '../domain/sunnah.js';
import { qadaSummary, pendingByPrayer } from '../domain/qada.js';
import {
  LOCATION_PROFILES_PRESETS,
  profileMatchesActive,
  nearbyMosqueMapUrl,
} from '../domain/locations.js';

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_ICONS = {
  fajr: 'sunrise',
  sunrise: 'sun',
  dhuhr: 'sun',
  asr: 'sun',
  maghrib: 'sunset',
  isha: 'moon',
};

export function renderPrayer(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  if (!hasLocation) {
    return `
    <section class="view view--prayer">
      <div class="view-header view-header--row">
        <h1 class="view__title">${t('nav.prayer', lang)}</h1>
        ${viewMenuButton('prayer', lang, { labelKey: 'viewMenu.prayer' })}
      </div>
      ${emptyStateHTML({
        iconName: 'compass',
        title: t('prayer.locationNeeded', lang),
        actionHTML: `
      <button type="button" class="btn btn--primary" data-action="prayer-request-location">${icon('location', { size: 16 })} ${t('prayer.enableLocation', lang)}</button>
      <button type="button" class="link-btn" data-action="prayer-manual-location">${t('prayer.manualLocation', lang)}</button>`,
      })}
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
  // (v4.3) polar honesty: at extreme latitudes some times are astronomical
  // fallbacks (the sun never reaches that position today). List them by
  // localized name under the rows instead of presenting clamped transits as
  // measured worship times.
  const fallbackNames = times?.unreachable ? PRAYER_ORDER.filter((n) => times.unreachable[n]) : [];
  const next = nextPrayer(times, now);
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const minsUntil = Math.round(((next.hours - nowHours + 24) % 24) * 60);
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
    const isFallback = fallbackNames.includes(name);
    const logBtn = !isFard
      ? ''
      : `
      <button type="button" class="icon-btn icon-btn--sm prayer-log-btn ${pstate ? `prayer-log-btn--${pstate}` : ''}" data-action="prayer-log-cycle" data-prayer="${name}" aria-pressed="${!!pstate}" aria-label="${t(pstate === 'jamaah' ? 'plog.state.jamaah' : pstate === 'prayed' ? 'plog.state.prayed' : 'plog.logAction', lang)}" title="${t(pstate === 'jamaah' ? 'plog.state.jamaah' : pstate === 'prayed' ? 'plog.state.prayed' : 'plog.logAction', lang)}">
        ${pstate === 'jamaah' ? icon('mosque', { size: 15 }) : pstate === 'prayed' ? icon('check', { size: 15 }) : '<span class="prayer-log-dot" aria-hidden="true"></span>'}
      </button>`;
    return `
    <div class="prayer-row ${isNext ? 'prayer-row--active' : ''} ${isFallback ? 'prayer-row--fallback' : ''}">
      <span class="prayer-row__icon">${icon(PRAYER_ICONS[name], { size: 18 })}</span>
      <span class="prayer-row__name">${t('prayer.' + name, lang)}${isFallback ? ' <span class="prayer-row__fallback-mark" aria-hidden="true">*</span>' : ''}</span>
      <span class="prayer-row__time" dir="ltr"${isFallback ? ` title="${t('prayer.fallbackNote', lang)}"` : ''}>${formatClock(times[name], true, { am: t('common.am', lang), pm: t('common.pm', lang) })}</span>
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

  const weekCells = week
    .map(
      (d) => `
    <div class="plog-week__day ${d.complete ? 'plog-week__day--complete' : ''}" role="img" aria-label="${d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long' })}: ${d.count}/${d.total}" title="${d.count}/${d.total}">
      <span class="plog-week__label" aria-hidden="true">${d.date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'narrow' })}</span>
      <span class="plog-week__dots" aria-hidden="true">
        ${PRAYER_KEYS.map((k) => `<span class="plog-dot ${d.states[k] ? `plog-dot--${d.states[k]}` : ''}"></span>`).join('')}
      </span>
    </div>`
    )
    .join('');

  const placeName = escapeHTML(
    p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`
  );
  const dateLabel = now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // (v5.1.0) ORGANIZATION: the bare floating rows and the everything-in-
  // the-menu layout read as cluttered. The page now tells one story in
  // clearly-labeled blocks: the hero (next prayer), a "Today's times"
  // panel that frames the six rows with a date, the log panel, and a
  // "Prayer tools" tile grid that surfaces the six features the "⋯" menu
  // also holds (sunnah, qada', adhan, calculation, places, qibla) —
  // visible, but below the content instead of crowding the top.
  const toolTile = (action, labelKey, iconName, { view = null } = {}) =>
    view
      ? `
      <a class="quick-action quick-action--prayer" href="${buildHash(view)}" data-action="navigate" data-view="${view}">
        ${icon(iconName, { size: 22 })}<span>${t(labelKey, lang)}</span>
      </a>`
      : `
      <button type="button" class="quick-action quick-action--prayer" data-action="${action}">
        ${icon(iconName, { size: 22 })}<span>${t(labelKey, lang)}</span>
      </button>`;

  const toolsPanel = `
    <section class="panel panel--prayer-tools">
      <div class="panel__header"><h2>${t('prayer.toolsTitle', lang)}</h2></div>
      <div class="quick-actions quick-actions--compact">
        ${toolTile('prayer-open-sunnah', 'prayer.sheet.sunnah', 'moon')}
        ${toolTile('prayer-open-qada', 'prayer.sheet.qada', 'refresh')}
        ${toolTile('prayer-open-adhan', 'prayer.sheet.adhan', 'volume')}
        ${toolTile('prayer-open-calc', 'prayer.sheet.calc', 'calculator')}
        ${toolTile('prayer-open-location', 'prayer.sheet.location', 'location')}
        ${toolTile(null, 'prayer.qiblaTile', 'compass', { view: VIEWS.QIBLA })}
      </div>
    </section>`;

  return `
  <section class="view view--prayer">
    <div class="view-header view-header--row">
      <h1 class="view__title">${t('nav.prayer', lang)}</h1>
      ${viewMenuButton('prayer', lang, { labelKey: 'viewMenu.prayer' })}
    </div>

    <div class="next-prayer-card">
      <div class="next-prayer-card__main">
        <span class="next-prayer-card__label">${t('prayer.next', lang)}</span>
        <span class="next-prayer-card__name">${icon(PRAYER_ICONS[next.name] || 'sun', { size: 22 })} ${t('prayer.' + next.name, lang)}</span>
        <span class="next-prayer-card__countdown">${t('prayer.in', lang)} <span dir="ltr">${hrsUntil > 0 ? t('units.h', lang, { n: hrsUntil }) + ' ' : ''}${t('units.m', lang, { n: remMins })}</span></span>
      </div>
      <div class="next-prayer-card__place">
        ${icon('location', { size: 13 })}
        <span>${placeName}</span>
      </div>
    </div>

    <section class="panel panel--times">
      <div class="panel__header">
        <h2>${t('prayer.timesTitle', lang)}</h2>
        <span class="panel__header-side">${dateLabel}</span>
      </div>
      ${(() => {
        // (v5.2.0) Full-day timeline: all six times at a glance with a
        // moving "now" marker. Pure HTML (no new data-actions); positions
        // come from domain/prayerTimeline.js. dir=ltr — time flows left
        // to right in both languages, like a clock face.
        const nowHours = now.getHours() + now.getMinutes() / 60;
        const tl = buildTimeline(times, nowHours);
        if (!tl.markers.length) return '';
        const dots = tl.markers
          .map(
            (m) =>
              `<span class="prayer-timeline__dot${next.name === m.name ? ' prayer-timeline__dot--next' : ''}" style="inset-inline-start:${(m.at * 100).toFixed(2)}%" title="${escapeHTML(`${t('prayer.' + m.name, lang)} · ${formatClock(times[m.name], true, { am: t('common.am', lang), pm: t('common.pm', lang) })}`)}"></span>`
          )
          .join('');
        return `
      <div class="prayer-timeline" dir="ltr" role="img" aria-label="${escapeHTML(t('prayer.timelineLabel', lang))}">
        <div class="prayer-timeline__track"></div>
        ${dots}
        ${
          tl.nowAt === null
            ? ''
            : `<span class="prayer-timeline__now" style="inset-inline-start:${(tl.nowAt * 100).toFixed(2)}%"></span>`
        }
      </div>`;
      })()}
      <div class="prayer-list">${rows}</div>
      ${
        fallbackNames.length
          ? `<p class="panel__subtext prayer-fallback-note">${icon('info', { size: 14 })} ${t('prayer.polarNote', lang, { names: fallbackNames.map((n) => t('prayer.' + n, lang)).join(lang === 'ar' ? '، ' : ', ') })}</p>`
          : ''
      }
      ${
        /* FIX (review v3.3 A7): prayer times are computed on the device's
          clock offset, so coordinates entered for a different time zone show
          clock times nobody there can pray by — silently. When the saved
          longitude implies a different offset (≥ 45 min) from the device's,
          say so honestly instead of letting the numbers pass as local. */ ''
      }
      ${tzMismatch ? `<p class="panel__subtext tz-mismatch-note">${icon('info', { size: 14 })} ${t('prayer.tzMismatch', lang)}</p>` : ''}
    </section>

    <section class="panel panel--prayer-log">
      <div class="panel__header">
        <h2>${t('plog.title', lang)}</h2>
        ${
          streak > 0
            ? `<span class="streak-badge${wasCelebrated('plog-day') ? ' celebrate' : ''}">${icon('flame', { size: 15 })} ${t('plog.streak', lang, { n: streak })}</span>`
            : ''
        }
      </div>
      <p class="panel__subtext" dir="ltr">${loggedToday} / ${PRAYER_KEYS.length} ${t('checklist.today', lang)}${monthCount ? ` · ${t('plog.monthCount', lang, { n: monthCount })}` : ''}</p>
      <div class="plog-week">${weekCells}</div>
      <p class="panel__subtext">${t('plog.hint', lang)}</p>
    </section>

    ${toolsPanel}
  </section>`;
}

/* ------------------------------------------------------------------ */
/* (v4.6.0) The panels the "⋯" menu opens as modals. Pure templates,   */
/* identical to what used to stack on the page — same handlers.        */
/* ------------------------------------------------------------------ */

export function sunnahPanelHTML(state) {
  const lang = state.settings.language;
  const now = new Date();
  const sunnahDay = sunnahToday(state.sunnahLog, now);
  const sunnahWeekCells = sunnahWeek(state.sunnahLog, now)
    .map(
      (d) => `
    <div class="plog-week__day ${d.count === SUNNAH_ITEMS.length ? 'plog-week__day--complete' : ''}" role="img" aria-label="${d.dateKey}: ${d.count}/${SUNNAH_ITEMS.length}" title="${d.count}/${SUNNAH_ITEMS.length}">
      <span class="plog-week__label" aria-hidden="true">${d.dateKey.slice(8)}</span>
      <span class="plog-week__dots" aria-hidden="true">${SUNNAH_ITEMS.map((i) => `<span class="plog-dot ${d.entry[i.id] ? 'plog-dot--prayed' : ''}"></span>`).join('')}</span>
    </div>`
    )
    .join('');
  const wStr = witrStreak(state.sunnahLog, now);
  return `
  <div class="panel panel--sunnah view-panel-modal">
    <div class="panel__header">
      <h2 id="panel-sunnah-title">${t('sunnah.title', lang)}</h2>
      ${wStr > 0 ? `<span class="streak-badge">${icon('moon', { size: 14 })} ${t('sunnah.witrStreak', lang, { n: wStr })}</span>` : ''}
    </div>
    <div class="sunnah-row-list">
      ${SUNNAH_ITEMS.map(
        (i) => `
      <label class="checklist-row ${sunnahDay[i.id] ? 'checklist-row--checked' : ''}">
        <input type="checkbox" class="checklist-row__input" data-action="sunnah-toggle" data-id="${i.id}" ${sunnahDay[i.id] ? 'checked' : ''} />
        <span class="checklist-row__icon">${icon(i.icon, { size: 17 })}</span>
        <span class="checklist-row__label">${t('sunnah.' + i.id, lang)}</span>
        <span class="checklist-row__check">${sunnahDay[i.id] ? icon('check', { size: 15 }) : ''}</span>
      </label>`
      ).join('')}
    </div>
    <div class="plog-week">${sunnahWeekCells}</div>
    <p class="panel__subtext">${t('sunnah.hint', lang)}</p>
  </div>`;
}

export function qadaPanelHTML(state) {
  const lang = state.settings.language;
  const qada = qadaSummary(state.qadaLog);
  const byPrayer = pendingByPrayer(state.qadaLog);
  return `
  <div class="panel panel--qada view-panel-modal">
    <div class="panel__header">
      <h2 id="panel-qada-title">${t('qada.title', lang)}</h2>
      ${qada.pending ? `<span class="view__meta" dir="ltr">${t('qada.remaining', lang, { n: qada.pending })}</span>` : ''}
    </div>
    ${qada.pending ? '' : `<p class="panel__subtext">${t(qada.completed ? 'qada.allClear' : 'qada.empty', lang)}</p>`}
    ${PRAYER_KEYS.filter((k) => byPrayer[k] > 0)
      .map(
        (k) => `
    <div class="qada-row">
      <span class="qada-row__name">${t('prayer.' + k, lang)}</span>
      <span class="view__meta" dir="ltr">×${byPrayer[k]}</span>
      <button type="button" class="btn btn--secondary btn--sm" data-action="qada-complete" data-prayer="${k}">${icon('check', { size: 14 })} ${t('qada.prayed', lang)}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="qada-clear-prayer" data-prayer="${k}" aria-label="${t('qada.clearPrayer', lang)}" title="${t('qada.clearPrayer', lang)}">${icon('close', { size: 14 })}</button>
    </div>`
      )
      .join('')}
    ${qada.completed ? `<p class="panel__subtext">${t('qada.completedCount', lang, { n: qada.completed })}</p>` : ''}
    <div class="panel__actions">
      <label class="sr-only" for="qada-prayer-select">${t('qada.whichPrayer', lang)}</label>
      <select class="select select--sm" id="qada-prayer-select" data-bind="qada-prayer">
        ${PRAYER_KEYS.map((k) => `<option value="${k}">${t('prayer.' + k, lang)}</option>`).join('')}
      </select>
      <label class="sr-only" for="qada-count-input">${t('qada.howMany', lang)}</label>
      <input type="number" class="input input--sm" id="qada-count-input" data-bind="qada-count" min="1" max="50" value="1" inputmode="numeric" />
      <button type="button" class="btn btn--primary btn--sm" data-action="qada-add">${icon('plus', { size: 14 })} ${t('qada.add', lang)}</button>
    </div>
    <p class="panel__subtext">${t('qada.hint', lang)}</p>
  </div>`;
}

export function travelerPanelHTML(state) {
  const lang = state.settings.language;
  const traveler = state.settings.prayer.travelerMode === true;
  return `
  <div class="panel panel--traveler view-panel-modal">
    <div class="panel__header"><h2 id="panel-traveler-title">${t('traveler.title', lang)}</h2></div>
    <label class="settings-switch">
      <input type="checkbox" data-action="toggle-traveler-mode" ${traveler ? 'checked' : ''} />
      <span class="settings-switch__text">
        <span class="settings-switch__label">${icon('plane', { size: 15 })} ${t('traveler.title', lang)}</span>
        <span class="settings-switch__hint">${t('traveler.hint', lang)}</span>
      </span>
    </label>
    ${
      traveler
        ? `<div class="traveler-note">
            <p class="panel__subtext">${t('traveler.qasrNote', lang)}</p>
            <ul class="traveler-qasr-list">
              ${['dhuhr', 'asr', 'isha'].map((k) => `<li><span>${t('prayer.' + k, lang)}</span><span class="view__meta" dir="ltr">4 → 2</span></li>`).join('')}
            </ul>
            <p class="panel__subtext">${t('traveler.jamNote', lang)}</p>
          </div>`
        : ''
    }
  </div>`;
}

export function adhanPanelHTML(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const mode = ADHAN_MODES.includes(p.adhanMode) ? p.adhanMode : 'adhan';
  const flags = customAdhanFlags();
  const anyAlertOn = PRAYER_ORDER.some((n) => p.alerts?.[n]);
  const soundOptions = SOUND_IDS.map(
    (id) =>
      `<option value="${id}" ${p.alertSound === id ? 'selected' : ''}>${t('prayer.sound.' + id, lang)}</option>`
  ).join('');
  const adhanVariantRow = (kind) => {
    const isCustom = flags[kind];
    return `
        <div class="adhan-variant-row">
          <span class="adhan-variant-row__label">${t(kind === 'fajr' ? 'prayer.adhanFajr' : 'prayer.adhanStandard', lang)}</span>
          <span class="adhan-variant-row__status">${isCustom ? t('prayer.adhanCustomSet', lang) : t('prayer.adhanBundled', lang)}</span>
          <button type="button" class="icon-btn icon-btn--sm" data-action="prayer-test-sound" aria-label="${t('prayer.testSound', lang)}">${icon('volume', { size: 15 })}</button>
          <button type="button" class="icon-btn icon-btn--sm" data-action="prayer-adhan-import" data-kind="${kind}" aria-label="${t('prayer.adhanImport', lang)}">${icon('download', { size: 15 })}</button>
          ${isCustom ? `<button type="button" class="icon-btn icon-btn--sm" data-action="prayer-adhan-clear" data-kind="${kind}" aria-label="${t('prayer.adhanClear', lang)}">${icon('close', { size: 15 })}</button>` : ''}
        </div>`;
  };
  const modeChip = (m) => `
        <button type="button" class="adhan-mode-chip ${mode === m ? 'adhan-mode-chip--active' : ''}" data-action="prayer-set-alert-mode" data-mode="${m}" aria-pressed="${mode === m}">${t('prayer.alertMode_' + m, lang)}</button>`;
  return `
  <div class="panel view-panel-modal">
    <div class="panel__header"><h2 id="panel-adhan-title">${t('prayer.alertMode', lang)}</h2></div>
    <div class="adhan-mode-row">${modeChip('adhan')}${modeChip('tone')}${modeChip('off')}</div>
    ${
      mode === 'tone'
        ? `
    <div class="sound-picker-row">
      <select class="select" data-bind="prayer-alert-sound" aria-label="${t('prayer.alertSound', lang)}">${soundOptions}</select>
      <button type="button" class="btn btn--secondary btn--sm" data-action="prayer-test-sound">${icon('volume', { size: 14 })} ${t('prayer.testSound', lang)}</button>
    </div>
    <p class="panel__subtext">${t('prayer.alertSoundNote', lang)}</p>`
        : ''
    }
    ${
      mode === 'adhan'
        ? `
    <div class="adhan-variants">
      ${adhanVariantRow('standard')}
      ${adhanVariantRow('fajr')}
    </div>
    <p class="panel__subtext">${t('prayer.adhanNote', lang)}</p>`
        : ''
    }
    ${mode === 'off' ? '' : volumeScheduleHTML(state, lang)}
    ${anyAlertOn ? '' : `<p class="panel__subtext">${t('prayer.alertOffNote', lang)}</p>`}
  </div>`;
}

/**
 * Alert loudness: day volume slider + optional quiet-hours window at its
 * own volume. Applies to both adhan recordings and synthesized tones
 * (the platform notification sound itself stays the OS default — a
 * documented browser limit).
 */
function volumeScheduleHTML(state, lang) {
  const p = state.settings.prayer;
  const vol = Number.isFinite(Number(p.adhanVolume)) ? Number(p.adhanVolume) : 80;
  const qVol = Number.isFinite(Number(p.quietVolume)) ? Number(p.quietVolume) : 30;
  const quiet = p.quietEnabled === true;
  return `
    <div class="adhan-volume">
      <label class="field-label" for="adhan-volume-slider">${t('prayer.adhanVolume', lang)} — ${vol}%</label>
      <input type="range" class="slider" id="adhan-volume-slider" min="0" max="100" step="5" value="${vol}" data-bind="prayer-adhan-volume" aria-label="${t('prayer.adhanVolume', lang)}" />
      <label class="toggle-row">
        <span class="toggle-row__label">${t('prayer.quietEnabled', lang)}</span>
        <span class="switch">
          <input type="checkbox" data-action="toggle-prayer-quiet" ${quiet ? 'checked' : ''} />
          <span class="switch__track"></span>
        </span>
      </label>
      ${
        quiet
          ? `
      <div class="adhan-quiet-row">
        <label class="field">${t('prayer.quietStart', lang)}<input type="time" class="input" value="${p.quietStart || '22:00'}" data-bind="prayer-quiet-start" /></label>
        <label class="field">${t('prayer.quietEnd', lang)}<input type="time" class="input" value="${p.quietEnd || '06:00'}" data-bind="prayer-quiet-end" /></label>
        <label class="field">${t('prayer.quietVolume', lang)}<input type="number" class="input" min="0" max="100" step="5" value="${qVol}" data-bind="prayer-quiet-volume" /></label>
      </div>
      <p class="panel__subtext">${t('prayer.quietHint', lang)}</p>`
          : ''
      }
    </div>`;
}

export function calcPanelHTML(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const methodOptions = Object.entries(METHODS)
    .map(
      ([id, m]) =>
        `<option value="${id}" ${p.method === id ? 'selected' : ''}>${escapeHTML(m.name)}</option>`
    )
    .join('');
  const asrOptions = Object.keys(ASR_FACTORS)
    .map((id) => `<option value="${id}" ${p.asr === id ? 'selected' : ''}>${id}</option>`)
    .join('');
  return `
  <div class="panel view-panel-modal">
    <div class="panel__header"><h2 id="panel-calc-title">${t('prayer.sheet.calc', lang)}</h2></div>
    <label class="field-label" for="prayer-method-sheet">${t('prayer.method', lang)}</label>
    <select class="select" id="prayer-method-sheet" data-bind="prayer-method" aria-label="${t('prayer.method', lang)}">${methodOptions}</select>
    <label class="field-label" for="prayer-asr-sheet">${t('prayer.asrMethod', lang)}</label>
    <select class="select" id="prayer-asr-sheet" data-bind="prayer-asr" aria-label="${t('prayer.asrMethod', lang)}">${asrOptions}</select>
    <p class="panel__subtext">${t('prayer.sheet.calcHint', lang)}</p>
  </div>`;
}

export function profilesPanelHTML(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const profiles = state.locationProfiles || [];
  const profileChips = LOCATION_PROFILES_PRESETS.map((preset) => {
    const existing = profiles.find((x) => x.name.toLowerCase() === preset.key);
    const active = existing && profileMatchesActive(existing, p);
    return existing
      ? `
        <button type="button" class="chip ${active ? 'chip--active' : ''}" data-action="location-profile-apply" data-id="${escapeHTML(existing.id)}" aria-pressed="${active}" title="${t('profiles.apply', lang)}">${icon(existing.name.toLowerCase() === 'home' ? 'home' : existing.name.toLowerCase() === 'work' ? 'briefcase' : 'plane', { size: 13 })} ${escapeHTML(existing.name)}</button>`
      : `
        <button type="button" class="chip" data-action="location-profile-save" data-name="${preset.key}" title="${t('profiles.saveCurrent', lang)}">${icon(preset.icon, { size: 13 })} ${t('profiles.save_' + preset.key, lang)}</button>`;
  }).join('');
  return `
  <div class="panel panel--profiles view-panel-modal">
    <div class="panel__header"><h2 id="panel-profiles-title">${t('profiles.title', lang)}</h2></div>
    <div class="chip-row">${profileChips}</div>
    ${
      profiles.length
        ? `<div class="qada-row"><span class="panel__subtext">${escapeHTML(p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`)}</span>
           <button type="button" class="icon-btn icon-btn--sm" data-action="location-profile-save" data-name="" aria-label="${t('profiles.saveCurrent', lang)}" title="${t('profiles.saveCurrent', lang)}">${icon('plus', { size: 14 })}</button></div>`
        : `<p class="panel__subtext">${t('profiles.hint', lang)}</p>`
    }
    <button type="button" class="link-btn" data-action="prayer-manual-location">${icon('location', { size: 14 })} ${t('prayer.manualLocation', lang)}</button>
    ${
      nearbyMosqueMapUrl(p.latitude, p.longitude)
        ? `<a class="link-btn" href="${nearbyMosqueMapUrl(p.latitude, p.longitude)}" target="_blank" rel="noreferrer noopener">${icon('location', { size: 14 })} ${t('profiles.nearbyMosque', lang)}</a>
           <p class="panel__subtext">${t('profiles.nearbyMosqueHint', lang)}</p>`
        : ''
    }
  </div>`;
}
