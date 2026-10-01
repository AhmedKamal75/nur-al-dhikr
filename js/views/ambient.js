/**
 * views/ambient.js (v5.2.0, modes v5.10.1, lamp v5.17.55 item 8)
 * Ambient / kiosk display: a big-text, chrome-free nightstand view. Four
 * display modes (settings.prayer.ambientMode, switched in place): the live
 * countdown to the next prayer, a full-screen verse of the day, a
 * slow-rotating short dhikr (one pick per day, same deterministic pool as
 * Home), or the lamp shelf — warm low light with big recitation transport
 * (prev / play-pause / next, ayah by ayah) and the listen-mode sleep timer.
 * Meant for propping the phone on a shelf — the renderer hides
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
import { sleepSnapshot } from '../services/surahPlayback.js';
import { PRAYER_ICONS } from './prayer.js';
import { hasPendingScholarlyReview } from '../domain/contentLens.js';

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
      <!-- (v5.17.23) This branch had no heading at all — a paragraph and a
           link, 66 characters, which axe reports as page-has-heading-one and
           which a screen reader announces with no name for the page. The
           nightstand view still needs a name even when it has nothing to
           count down to. -->
      <h1 class="ambient__name">${t('ambient.title', lang)}</h1>
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
    if (mode === 'lamp') {
      return `
    <section class="view view--ambient view--ambient-lamp">
      ${exit}
      ${switcher}
      ${renderLampBlock(state, lang, p, now, cd)}
    </section>`;
    }
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
      ${hasPendingScholarlyReview(item) ? `<p class="content-review-warning" role="note">${escapeHTML(t('content.reviewPending', lang))}</p>` : ''}
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

/** Countdown hero shared by the modes (the verse/dhikr slides and the lamp shelf sit above it, compact). */
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
    <p class="ambient__clock${compact ? ' ambient__clock--compact' : ''}" dir="ltr" role="timer" data-ambient-countdown aria-label="${escapeHTML(`${t('prayer.' + cd.name, lang)} ${t('prayer.in', lang)} ${cd.h} ${t('units.h', lang, { n: cd.h })} ${cd.m} ${t('units.m', lang, { n: cd.m })}`)}">${clock}</p>
    <p class="ambient__place">${icon('location', { size: 14 })} ${escapeHTML(placeName)}</p>
    <p class="ambient__date">${escapeHTML(now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>`;
}

/**
 * (v5.17.55, item 8) Lamp shelf: warm low-light recitation controls over a
 * compact countdown. The transport reuses the verse engine's existing
 * actions (no new data-action, no listen/loop/repeat — auto-advance stays
 * OFF and the session ends at its last ayah). The sleep chip reuses the
 * listen-mode ladder (recite-sleep-cycle) with its live label, exactly like
 * the player bar's console. With no session running the buttons disable
 * and an honest note says where to start one.
 */
function renderLampBlock(state, lang, p, now, cd) {
  const sp = state.surahPlayback;
  const active = !!(sp?.active && sp.surah != null);
  const paused = sp?.paused === true;
  const surah = state.quran?.meta?.surahs?.find((x) => String(x.number) === String(sp?.surah));
  const surahName = active
    ? lang === 'ar'
      ? surah?.nameAr || `#${sp.surah}`
      : surah?.nameTransliteration || `#${sp.surah}`
    : '';
  const ayah = Math.floor(Number(sp?.ayah));
  const total = Math.floor(Number(sp?.total));
  const pos =
    active && Number.isFinite(ayah) && Number.isFinite(total) && total > 0
      ? ` · <span dir="ltr">${ayah} / ${total}</span>`
      : '';
  // Live verse-engine sleep state (playerBar precedent: ui reads the
  // service snapshot, state only mirrors coarse playback fields).
  let sleep = { enabled: false, label: '' };
  try {
    sleep = sleepSnapshot();
  } catch {
    /* engine unavailable in this context — chip renders off */
  }
  const sleepLabel = t('audio.sleepTimer', lang);
  const dis = active ? '' : ' disabled aria-disabled="true"';
  return `
    <p class="ambient__kicker">${t('ambient.modeLamp', lang)}</p>
    <p class="ambient__lamp-hint">${t('ambient.lampHint', lang)}</p>
    ${
      active
        ? `<p class="ambient__lamp-now" dir="auto">${escapeHTML(t('ambient.lampNow', lang))} — ${escapeHTML(surahName)}${pos}</p>`
        : `<p class="ambient__lamp-empty">${t('ambient.lampNoSession', lang)}</p>`
    }
    <div class="ambient__transport" role="group" dir="ltr" aria-label="${escapeHTML(t('ambient.lampTransport', lang))}">
      <button type="button" class="ambient__transport-btn" data-action="recite-ayah-prev" aria-label="${escapeHTML(t('audio.ayahPrev', lang))}" title="${escapeHTML(t('audio.ayahPrev', lang))}"${dis}>${icon('chevronRight', { size: 28 })}</button>
      <button type="button" class="ambient__transport-play" data-action="recite-pause-toggle" aria-label="${escapeHTML(t(paused || !active ? 'audio.play' : 'audio.pause', lang))}" title="${escapeHTML(t(paused || !active ? 'audio.play' : 'audio.pause', lang))}"${dis}>${icon(paused || !active ? 'play' : 'pause', { size: 34 })}</button>
      <button type="button" class="ambient__transport-btn" data-action="recite-ayah-next" aria-label="${escapeHTML(t('audio.ayahNext', lang))}" title="${escapeHTML(t('audio.ayahNext', lang))}"${dis}>${icon('chevronLeft', { size: 28 })}</button>
    </div>
    <button type="button" class="ambient__sleep${sleep.enabled ? ' ambient__sleep--on' : ''}" data-action="recite-sleep-cycle" aria-pressed="${sleep.enabled === true}" aria-label="${escapeHTML(sleepLabel)}${sleep.label ? ` — ${sleep.label}` : ''}" title="${escapeHTML(sleepLabel)}${sleep.label ? ` — ${sleep.label}` : ''}">
      ${icon('bed', { size: 16 })}${sleep.enabled && sleep.label ? ` <span dir="ltr">${escapeHTML(sleep.label)}</span>` : ''}
    </button>
    ${renderCountdownLine(lang, p, now, cd, true)}`;
}
