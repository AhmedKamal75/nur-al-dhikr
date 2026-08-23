/**
 * views/ramadan.js
 * Ramadan & Fasting Companion: a live Suhoor <-> Iftar countdown built on
 * the same offline prayer-time astronomy the Prayer view already uses
 * (Suhoor ends at Fajr, Iftar begins at Maghrib), a simple fasting log
 * with a streak badge, and quick access to the bundled Suhoor/Iftar duas.
 * Works for voluntary fasts too, not just Ramadan itself.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { VIEWS } from '../config.js';
import { buildHash } from '../router.js';
import { formatClock } from '../prayer.js';
import {
  ramadanStatus,
  daysUntilRamadan,
  fastingCountdown,
  formatCountdown,
  fastingStreak,
  ramadanFastsLogged,
  isVoluntaryFastDay,
} from '../ramadan.js';
import { selectors } from '../state.js';
import { cardHTML } from '../components/card.js';

const RAMADAN_DUA_IDS = { suhoor: 'glm-ram-004', iftar: 'glm-ram-002' };

function duaCard(state, itemId) {
  const entry = state.library.itemIndex[itemId];
  if (!entry) return '';
  const lang = state.settings.language;
  return cardHTML(entry.item, entry.category, {
    lang,
    isFavorite: selectors.isFavorite(state, itemId),
    isSpeaking: state.speakingItemId === itemId,
    counter: selectors.getCounter(state, itemId),
    showTransliteration: state.settings.showTransliteration,
    showTranslation: state.settings.showTranslation,
    compact: true,
  });
}

export function renderRamadan(state) {
  const lang = state.settings.language;
  const now = new Date();
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;
  const status = ramadanStatus(now);
  const fasted = selectors.todayFasted(state);
  const streak = fastingStreak(state.ramadanFasting, now);
  const voluntary = isVoluntaryFastDay(now);

  let countdownCard = '';
  if (!hasLocation) {
    countdownCard = `
    <div class="empty-state empty-state--inline">
      ${icon('compass', { size: 32 })}
      <p>${t('prayer.locationNeeded', lang)}</p>
      <button type="button" class="btn btn--primary btn--sm" data-action="prayer-request-location">${icon('location', { size: 15 })} ${t('prayer.enableLocation', lang)}</button>
    </div>`;
  } else {
    const cd = fastingCountdown(
      { latitude: p.latitude, longitude: p.longitude, method: p.method, asr: p.asr },
      now
    );
    if (cd) {
      const { h, m } = formatCountdown(cd.msRemaining);
      const phaseLabelKey =
        cd.phase === 'before-fajr'
          ? 'ramadan.untilSuhoorEnds'
          : cd.phase === 'fasting'
            ? 'ramadan.untilIftar'
            : 'ramadan.untilNextSuhoor';
      countdownCard = `
      <div class="next-prayer-card next-prayer-card--ramadan">
        <span class="next-prayer-card__label">${t(phaseLabelKey, lang)}</span>
        <span class="next-prayer-card__countdown" dir="ltr" style="font-size:1.6em">${h > 0 ? h + 'h ' : ''}${m}m</span>
        <div class="ramadan-times-row">
          <span>${icon('sunrise', { size: 14 })} ${t('ramadan.suhoorEnds', lang)} <span dir="ltr">${formatClock(cd.suhoorTime.getHours() + cd.suhoorTime.getMinutes() / 60)}</span></span>
          <span>${icon('sunset', { size: 14 })} ${t('ramadan.iftarBegins', lang)} <span dir="ltr">${formatClock(cd.iftarTime.getHours() + cd.iftarTime.getMinutes() / 60)}</span></span>
        </div>
      </div>`;
    }
  }

  const statusPanel = status.inRamadan
    ? `
    <section class="panel panel--ramadan-status">
      <div class="ramadan-day-badge">
        <span class="ramadan-day-badge__num" dir="ltr">${status.dayOfRamadan}</span>
        <span class="ramadan-day-badge__label">${t('ramadan.dayOf', lang, { total: status.totalDays })}</span>
      </div>
      ${(() => {
        const { count, total } = ramadanFastsLogged(state.ramadanFasting, status.hijri.year);
        const pct = Math.round((count / total) * 100);
        return `
        <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar__fill" style="width:${pct}%"></div>
        </div>
        <p class="panel__subtext" dir="ltr">${count} / ${total} ${t('ramadan.fastsLogged', lang)}</p>`;
      })()}
    </section>`
    : `
    <section class="panel panel--ramadan-status">
      <p class="panel__subtext">${daysUntilRamadan(now) === 0 ? t('ramadan.startsToday', lang) : t('ramadan.daysUntil', lang, { n: daysUntilRamadan(now) })}</p>
      ${voluntary ? `<p class="panel__subtext ramadan-voluntary-hint">${icon('sparkle', { size: 14 })} ${t('ramadan.voluntaryToday', lang)}</p>` : ''}
    </section>`;

  return `
  <section class="view view--ramadan">
    <h1 class="view__title">${icon('crescent-star', { size: 24 })} ${t('ramadan.title', lang)}</h1>
    <p class="view__subtitle">${t('ramadan.subtitle', lang)}</p>

    ${countdownCard}
    ${statusPanel}

    <section class="panel panel--ramadan-log">
      <div class="panel__header"><h2>${t('ramadan.fastingLog', lang)}</h2></div>
      <div class="ramadan-log-row">
        <label class="switch">
          <input type="checkbox" data-action="ramadan-toggle-fast" ${fasted ? 'checked' : ''} />
          <span class="switch__track"></span>
        </label>
        <span>${t('ramadan.iFastedToday', lang)}</span>
        ${streak > 0 ? `<span class="streak-badge">${icon('flame', { size: 16 })} ${streak} ${t('ramadan.dayStreak', lang)}</span>` : ''}
      </div>
    </section>

    ${
      hasLocation
        ? `
    <p class="view__meta">${icon('bell', { size: 14 })} ${t('ramadan.alertTip', lang)} <a href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">${t('nav.prayer', lang)}</a></p>`
        : ''
    }

    <section class="panel">
      <div class="panel__header"><h2>${t('ramadan.duas', lang)}</h2></div>
      <div class="ramadan-dua-cards">
        ${duaCard(state, RAMADAN_DUA_IDS.suhoor)}
        ${duaCard(state, RAMADAN_DUA_IDS.iftar)}
      </div>
      <a class="link-btn" href="${buildHash(VIEWS.CATEGORY, { id: 'ramadan-special' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="ramadan-special">${t('ramadan.browseAll', lang)}</a>
    </section>
  </section>`;
}
