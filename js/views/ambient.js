/**
 * views/ambient.js (v5.2.0, modes v5.10.1)
 * Ambient / kiosk display: a big-text, chrome-free nightstand view. Three
 * display modes (settings.prayer.ambientMode, switched in place): the live
 * countdown to the next prayer, a full-screen verse of the day, or a
 * slow-rotating short dhikr (one pick per day, same deterministic pool as
 * Home). Meant for propping the phone on a shelf — the renderer hides
 * topbar/nav/player while this route is active (body.is-ambient, same
 * contract as mushaf fullscreen), and a wake lock keeps the screen on
 * (see app/fullscreen.js ambient pair + stateSub lifecycle). Pure string
 * template; countdown math is the tested nextPrayerCountdown() in
 * domain/prayerTimeline.js, slide picks in domain/ambient.js.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS, AMBIENT_MODES } from '../core/config.js';
import { calculateTimes } from '../domain/prayer.js';
import { nextPrayerCountdown } from '../domain/prayerTimeline.js';
import { ambientVerse, ambientDhikr } from '../domain/ambient.js';
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
    offsets: p.offsets,
  });
  const cd = nextPrayerCountdown(times, now);
  if (!cd) {
    return `
    <section class="view view--ambient">
      ${exit}
      <p class="ambient__empty">${t('prayer.locationNeeded', lang)}</p>
    </section>`;
  }
  const mode = AMBIENT_MODES.includes(p.ambientMode) ? p.ambientMode : 'countdown';
  const switcher = `
    <div class="ambient__modes" role="group" aria-label="${t('ambient.displayMode', lang)}">
      ${AMBIENT_MODES.map(
        (m) => `
        <button type="button" class="ambient__mode ${m === mode ? 'ambient__mode--active' : ''}" data-action="ambient-mode" data-mode="${m}" aria-pressed="${m === mode}">
          ${t(`ambient.mode${m[0].toUpperCase()}${m.slice(1)}`, lang)}
        </button>`
      ).join('')}
    </div>`;

  if (mode !== 'countdown') {
    const slide =
      mode === 'verse'
        ? ambientVerse(state.library.itemIndex, now)
        : ambientDhikr(state.library.itemIndex, now);
    if (slide?.item) {
      const item = slide.item;
      return `
    <section class="view view--ambient">
      ${exit}
      ${switcher}
      <p class="ambient__kicker">${t(mode === 'verse' ? 'ambient.modeVerse' : 'ambient.modeDhikr', lang)}</p>
      <p class="ambient__slide" dir="rtl" lang="ar">${escapeHTML(item.arabic)}</p>
      ${item.translation && lang !== 'ar' ? `<p class="ambient__slide-sub" dir="auto">${escapeHTML(item.translation)}</p>` : ''}
      ${renderCountdownLine(lang, p, now, cd, true)}
    </section>`;
    }
    // Corpus not loaded yet: honest note above the countdown fallback.
    return `
    <section class="view view--ambient">
      ${exit}
      ${switcher}
      <p class="ambient__empty">${t('ambient.emptyCorpus', lang)}</p>
      ${renderCountdownBlock(lang, p, now, cd)}
    </section>`;
  }

  return `
  <section class="view view--ambient">
    ${exit}
    ${switcher}
    ${renderCountdownBlock(lang, p, now, cd)}
  </section>`;
}

/** Countdown hero shared by all three modes (the verse/dhikr slides sit above it, compact). */
function renderCountdownBlock(lang, p, now, cd) {
  return `
    <p class="ambient__kicker">${t('prayer.next', lang)}</p>
    <h1 class="ambient__name">${icon(PRAYER_ICONS[cd.name] || 'sun', { size: 40 })} ${t('prayer.' + cd.name, lang)}</h1>
    ${renderCountdownLine(lang, p, now, cd, false)}`;
}

/** Clock + place + date lines; `compact` shrinks them under a slide. */
function renderCountdownLine(lang, p, now, cd, compact) {
  const placeName = p.locationName || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`;
  const clock =
    (cd.h > 0 ? `${cd.h}:` : '') +
    `${String(cd.m).padStart(2, '0')}:${String(cd.totalSec % 60).padStart(2, '0')}`;
  return `
    <p class="ambient__clock${compact ? ' ambient__clock--compact' : ''}" dir="ltr" role="timer" aria-label="${escapeHTML(`${t('prayer.' + cd.name, lang)} ${t('prayer.in', lang)} ${cd.h} ${t('units.h', lang, { n: cd.h })} ${cd.m} ${t('units.m', lang, { n: cd.m })}`)}">${clock}</p>
    <p class="ambient__place">${icon('location', { size: 14 })} ${escapeHTML(placeName)}</p>
    <p class="ambient__date">${escapeHTML(now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>`;
}
