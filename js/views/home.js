/**
 * views/home.js
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, dateKey, escapeHTML } from '../utils.js';
import { selectors } from '../state.js';
import { VIEWS, CHECKLIST_ITEMS } from '../config.js';
import { cardHTML } from '../components/card.js';
import { completedCount } from '../checklist.js';
import { ramadanInfo } from '../ramadan.js';
import { toHijri } from '../calendar.js';
import { recommendedAdhkarWindow } from '../adhkarTiming.js';
import { calculateTimes, nextPrayer, formatClock } from '../prayer.js';
import { onboardingPanelHTML } from './onboardingPanel.js';
import { dailyHadithCardHTML } from './hadith.js';

function greetingKey() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'home.greeting.morning';
  if (h >= 12 && h < 17) return 'home.greeting.afternoon';
  if (h >= 17 && h < 20) return 'home.greeting.evening';
  return 'home.greeting.night';
}

/**
 * Deterministic "reflection of the day" — same item all day, changes daily,
 * no network/randomness. Restricted to Adhkar/Duas/Qur'anic-duas: these are
 * complete devotional texts meant to be read standalone. The Names of Allah
 * (asma) are intentionally excluded here — several (e.g. Al-Muntaqim,
 * Ad-Darr) carry theological nuance that depends on their traditional
 * pairing with a complementary name and can read as jarring shown alone,
 * out of context, on the home screen. They're still fully browsable in
 * their own library.
 */
function pickDailyItem(itemIndex) {
  const eligible = Object.values(itemIndex).filter(
    (entry) => entry.document?.metadata?.id !== 'asma'
  );
  if (!eligible.length) return null;
  const seed = dateKey(new Date())
    .split('-')
    .reduce((a, c) => a + parseInt(c, 10), 0);
  const idx = seed % eligible.length;
  return eligible[idx];
}

/**
 * Today's prayer times for the user's saved location (decimal hours), or
 * null when no location is set / the engine returns nothing. Computed once
 * per render and shared by the next-prayer strip and the adhkar "Now"
 * windows, so both always agree with each other and with the Prayer view.
 */
function todayPrayerTimes(state) {
  const p = state.settings.prayer;
  if (p.latitude == null || p.longitude == null) return null;
  const now = new Date();
  const tz = -now.getTimezoneOffset() / 60;
  return calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });
}

/**
 * Next-prayer strip for the Home hero. Renders from today's computed times;
 * the live countdown span is patched once per second by app.js's home
 * ticker (data-home-countdown) — the same direct-DOM pattern the Ramadan
 * companion uses, so the ticking never touches the store or localStorage.
 * When no location is set yet, the strip becomes a gentle one-tap setup
 * card instead of hiding the feature entirely.
 */
function nextPrayerStrip(state, lang, times) {
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;

  if (!hasLocation) {
    return `
    <a class="home-prayer-strip home-prayer-strip--setup" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">
      <span class="home-prayer-strip__icon">${icon('compass', { size: 20 })}</span>
      <span class="home-prayer-strip__text">
        <span class="home-prayer-strip__label">${t('home.setLocation', lang)}</span>
        <span class="home-prayer-strip__cta">${t('home.setLocationAction', lang)}</span>
      </span>
      ${icon('chevronRight', { size: 16 })}
    </a>`;
  }

  if (!times) return '';
  const now = new Date();
  const next = nextPrayer(times, now);

  return `
  <a class="home-prayer-strip" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}" data-home-next-prayer>
    <span class="home-prayer-strip__icon">${icon('sunrise', { size: 20 })}</span>
    <span class="home-prayer-strip__text">
      <span class="home-prayer-strip__label">${t('home.nextPrayer', lang)}</span>
      <span class="home-prayer-strip__name">${t('prayer.' + next.name, lang)} · <span dir="ltr">${formatClock(times[next.name])}</span></span>
    </span>
    <span class="home-prayer-strip__countdown" dir="ltr" data-home-countdown>—</span>
    ${icon('chevronRight', { size: 16 })}
  </a>`;
}

/** The Hijri date chip rendered in the hero (e.g. "24 Ṣafar 1448 AH"). */
function hijriChipHTML(lang) {
  const h = toHijri(new Date());
  const monthName = pickLocale(h.monthName, lang);
  return `<span class="home-hero__hijri" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(`${h.day} ${monthName} ${h.year}`)} ${t('home.hijriOn', lang)}</span>`;
}

export function renderHome(state) {
  const lang = state.settings.language;
  const today = selectors.todayStats(state);
  const goal = state.settings.dailyGoal || 100;
  const pct = Math.min(100, Math.round((today.recitations / Math.max(1, goal)) * 100));
  const streak = state.statistics.currentStreak || 0;

  const daily = pickDailyItem(state.library.itemIndex);
  // Today's real prayer times, shared by the strip and the adhkar windows.
  const prayerTimes = todayPrayerTimes(state);
  // Which adhkar quick action deserves a "now" nudge: the actual sun-based
  // windows when a location is set, the fixed clock approximation otherwise
  // (see js/adhkarTiming.js for the reasoning behind each range).
  const nowWindow = recommendedAdhkarWindow(new Date(), prayerTimes);

  const recentEntries = state.history
    .slice(0, 3)
    .map((h) => state.library.itemIndex[h.itemId])
    .filter(Boolean);
  const favEntries = state.favorites
    .slice(0, 3)
    .map((id) => state.library.itemIndex[id])
    .filter(Boolean);
  const pinnedCollections = state.collections.slice(0, 3);

  return `
  <section class="view view--home">
    <div class="home-hero">
      <p class="home-hero__greeting">${t(greetingKey(), lang)}${hijriChipHTML(lang)}</p>
      <h1 class="home-hero__title">${t('app.tagline', lang)}</h1>
    </div>

    ${nextPrayerStrip(state, lang, prayerTimes)}

    ${onboardingPanelHTML(state, lang)}

    <div class="quick-actions">
      <a class="quick-action quick-action--quran" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}">
        ${icon('quran', { size: 26 })}
        <span>${t('quran.readShortcut', lang)}</span>
      </a>
      <a class="quick-action quick-action--sunrise ${nowWindow === 'morning' ? 'quick-action--suggested' : ''}" href="${buildHash(VIEWS.CATEGORY, { id: 'morning' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="morning">
        ${icon('sunrise', { size: 26 })}
        <span>${t('home.morningShortcut', lang)}</span>
        ${nowWindow === 'morning' ? `<span class="quick-action__now">${t('home.nowBadge', lang)}</span>` : ''}
      </a>
      <a class="quick-action quick-action--sunset ${nowWindow === 'evening' ? 'quick-action--suggested' : ''}" href="${buildHash(VIEWS.CATEGORY, { id: 'evening' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="evening">
        ${icon('sunset', { size: 26 })}
        <span>${t('home.eveningShortcut', lang)}</span>
        ${nowWindow === 'evening' ? `<span class="quick-action__now">${t('home.nowBadge', lang)}</span>` : ''}
      </a>
      <a class="quick-action quick-action--tasbih" href="${buildHash(VIEWS.TASBIH)}" data-action="navigate" data-view="${VIEWS.TASBIH}">
        ${icon('tasbih', { size: 26 })}
        <span>${t('nav.tasbih', lang)}</span>
      </a>
      <a class="quick-action quick-action--prayer" href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}">
        ${icon('compass', { size: 26 })}
        <span>${t('nav.prayer', lang)}</span>
      </a>
      <a class="quick-action quick-action--qibla" href="${buildHash(VIEWS.QIBLA)}" data-action="navigate" data-view="${VIEWS.QIBLA}">
        ${icon('mosque', { size: 26 })}
        <span>${t('nav.qibla', lang)}</span>
      </a>
      <a class="quick-action quick-action--ramadan" href="${buildHash(VIEWS.RAMADAN)}" data-action="navigate" data-view="${VIEWS.RAMADAN}">
        ${icon('moon', { size: 26 })}
        <span>${t('nav.ramadan', lang)}</span>
      </a>
      <a class="quick-action quick-action--zakat" href="${buildHash(VIEWS.ZAKAT)}" data-action="navigate" data-view="${VIEWS.ZAKAT}">
        ${icon('calculator', { size: 26 })}
        <span>${t('nav.zakat', lang)}</span>
      </a>
    </div>

    ${(() => {
      const { inRamadan, hijri } = ramadanInfo(new Date());
      return inRamadan
        ? `
    <a class="panel panel--ramadan-banner" href="${buildHash(VIEWS.RAMADAN)}" data-action="navigate" data-view="${VIEWS.RAMADAN}">
      <span class="panel--ramadan-banner__icon">${icon('moon', { size: 22 })}</span>
      <span class="panel--ramadan-banner__text">
        <span class="panel--ramadan-banner__label">${t('ramadan.bannerTitle', lang)}</span>
        <span class="panel--ramadan-banner__sub">${t('ramadan.bannerSub', lang, { n: hijri.day })}</span>
      </span>
      ${icon('chevronRight', { size: 18 })}
    </a>`
        : '';
    })()}

    <a class="panel panel--checklist-summary-link" href="${buildHash(VIEWS.CHECKLIST)}" data-action="navigate" data-view="${VIEWS.CHECKLIST}">
      <span class="panel--checklist-summary-link__icon">${icon('target', { size: 22 })}</span>
      <span class="panel--checklist-summary-link__text">
        <span class="panel--checklist-summary-link__label">${t('checklist.title', lang)}</span>
        <span class="panel--checklist-summary-link__sub" dir="ltr">${completedCount(selectors.todayChecklist(state))} / ${CHECKLIST_ITEMS.length} ${t('checklist.today', lang)}</span>
      </span>
      ${icon('chevronRight', { size: 18 })}
    </a>

    ${
      state.quranBookmark?.surah
        ? `
    <a class="panel panel--quran-continue" href="${buildHash(VIEWS.QURAN, { id: state.quranBookmark.surah })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${state.quranBookmark.surah}">
      <span class="panel--quran-continue__icon">${icon('quran', { size: 22 })}</span>
      <span class="panel--quran-continue__text">
        <span class="panel--quran-continue__label">${t('quran.continueReading', lang)}</span>
        <span class="panel--quran-continue__sub">${t('quran.surah', lang)} ${escapeHTML(String(state.quranBookmark.surah))}</span>
      </span>
      ${icon('chevronRight', { size: 18 })}
    </a>`
        : ''
    }

    <section class="panel panel--progress">
      <div class="panel__header">
        <h2>${t('home.dailyProgress', lang)}</h2>
        <span class="streak-badge">${icon('flame', { size: 16 })} ${streak} ${t('home.streak', lang)}</span>
      </div>
      <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="width:${pct}%"></div>
      </div>
      <p class="panel__subtext" dir="ltr">${today.recitations} / ${goal}</p>
    </section>

    ${
      daily
        ? `
    <section class="panel panel--reflection">
      <div class="panel__header"><h2>${t('home.verseOfTheDay', lang)}</h2></div>
      ${cardHTML(daily.item, daily.category, { lang, isFavorite: selectors.isFavorite(state, daily.item.id), isSpeaking: state.speakingItemId === daily.item.id, counter: selectors.getCounter(state, daily.item.id), showTransliteration: state.settings.showTransliteration, showTranslation: state.settings.showTranslation, compact: true })}
    </section>`
        : ''
    }

    ${dailyHadithCardHTML(state)}

    ${
      recentEntries.length
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('home.continueReading', lang)}</h2></div>
      <div class="card-row">
        ${recentEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: selectors.isFavorite(state, e.item.id), isSpeaking: state.speakingItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false })).join('')}
      </div>
    </section>`
        : `<p class="empty-hint">${t('home.noRecent', lang)}</p>`
    }

    ${
      favEntries.length
        ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.favorites', lang)}</h2>
        <a href="${buildHash(VIEWS.FAVORITES)}" data-action="navigate" data-view="${VIEWS.FAVORITES}">${icon('chevronRight', { size: 16 })}</a>
      </div>
      <div class="card-row">
        ${favEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: true, isSpeaking: state.speakingItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false })).join('')}
      </div>
    </section>`
        : ''
    }

    ${
      pinnedCollections.length
        ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.collections', lang)}</h2>
        <a href="${buildHash(VIEWS.COLLECTIONS)}" data-action="navigate" data-view="${VIEWS.COLLECTIONS}">${icon('chevronRight', { size: 16 })}</a>
      </div>
      <div class="chip-row">
        ${pinnedCollections.map((c) => `<a class="chip chip--collection" href="${buildHash(VIEWS.COLLECTION, { id: c.id })}" data-action="navigate" data-view="${VIEWS.COLLECTION}" data-id="${escapeHTML(c.id)}">${escapeHTML(pickLocale(c.name, lang))} <span class="chip__count">${c.items.length}</span></a>`).join('')}
      </div>
    </section>`
        : ''
    }
  </section>`;
}
