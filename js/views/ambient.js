/**
 * views/ambient.js (v5.2.0)
 * Ambient / kiosk display: a big-text, chrome-free nightstand view showing
 * the countdown to the next prayer. Meant for propping the phone on a
 * shelf — the renderer hides topbar/nav/player while this route is active
 * (body.is-ambient, same contract as mushaf fullscreen), and a wake lock
 * keeps the screen on (see app/fullscreen.js ambient pair + stateSub
 * lifecycle). Pure string template; countdown math is the tested
 * nextPrayerCountdown() in domain/prayerTimeline.js.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { calculateTimes } from '../domain/prayer.js';
import { nextPrayerCountdown } from '../domain/prayerTimeline.js';
import { PRAYER_ICONS } from './prayer.js';

export function renderAmbient(state) {
  const lang = state.settings.language;
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  const exit = `
    <a class="ambient__exit" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}" aria-label="${t('ambient.exit', lang)}" title="${t('ambient.exit', lang)}">${icon('close', { size: 20 })}</a>`;

  if (!hasLocation) {
    return `
    <section class="view view--ambient">
      ${exit}
      <p class="ambient__empty">${t('prayer.locationNeeded', lang)}</p>
      <a class="btn btn--primary" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">${t('nav.prayer', lang)}</a>
    </section>`;
  }

  const now = new Date();
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: -now.getTimezoneOffset() / 60,
    method: p.method,
    asr: p.asr,
  });
  const cd = nextPrayerCountdown(times, now);
  if (!cd) {
    return `
    <section class="view view--ambient">
      ${exit}
      <p class="ambient__empty">${t('prayer.locationNeeded', lang)}</p>
    </section>`;
  }
  const placeName = p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`;
  const clock =
    (cd.h > 0 ? `${cd.h}:` : '') +
    `${String(cd.m).padStart(2, '0')}:${String(cd.totalSec % 60).padStart(2, '0')}`;

  return `
  <section class="view view--ambient">
    ${exit}
    <p class="ambient__kicker">${t('prayer.next', lang)}</p>
    <h1 class="ambient__name">${icon(PRAYER_ICONS[cd.name] || 'sun', { size: 40 })} ${t('prayer.' + cd.name, lang)}</h1>
    <p class="ambient__clock" dir="ltr" role="timer" aria-label="${escapeHTML(`${t('prayer.' + cd.name, lang)} ${t('prayer.in', lang)} ${cd.h} ${t('units.h', lang, { n: cd.h })} ${cd.m} ${t('units.m', lang, { n: cd.m })}`)}">${clock}</p>
    <p class="ambient__place">${icon('location', { size: 14 })} ${escapeHTML(placeName)}</p>
    <p class="ambient__date">${escapeHTML(now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
  </section>`;
}
