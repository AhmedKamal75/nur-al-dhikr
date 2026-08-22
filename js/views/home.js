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
  const eligible = Object.values(itemIndex).filter((entry) => entry.document?.metadata?.id !== 'asma');
  if (!eligible.length) return null;
  const seed = dateKey(new Date()).split('-').reduce((a, c) => a + parseInt(c, 10), 0);
  const idx = seed % eligible.length;
  return eligible[idx];
}

export function renderHome(state) {
  const lang = state.settings.language;
  const today = selectors.todayStats(state);
  const goal = state.settings.dailyGoal || 100;
  const pct = Math.min(100, Math.round((today.recitations / Math.max(1, goal)) * 100));
  const streak = state.statistics.currentStreak || 0;

  const daily = pickDailyItem(state.library.itemIndex);

  const recentEntries = state.history.slice(0, 3).map((h) => state.library.itemIndex[h.itemId]).filter(Boolean);
  const favEntries = state.favorites.slice(0, 3).map((id) => state.library.itemIndex[id]).filter(Boolean);
  const pinnedCollections = state.collections.slice(0, 3);

  return `
  <section class="view view--home">
    <div class="home-hero">
      <p class="home-hero__greeting">${t(greetingKey(), lang)}</p>
      <h1 class="home-hero__title">${t('app.tagline', lang)}</h1>
    </div>

    <div class="quick-actions">
      <a class="quick-action quick-action--quran" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}">
        ${icon('quran', { size: 26 })}
        <span>${t('quran.readShortcut', lang)}</span>
      </a>
      <a class="quick-action quick-action--sunrise" href="${buildHash(VIEWS.CATEGORY, { id: 'morning' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="morning">
        ${icon('sunrise', { size: 26 })}
        <span>${t('home.morningShortcut', lang)}</span>
      </a>
      <a class="quick-action quick-action--sunset" href="${buildHash(VIEWS.CATEGORY, { id: 'evening' })}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="evening">
        ${icon('sunset', { size: 26 })}
        <span>${t('home.eveningShortcut', lang)}</span>
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
    </div>

    <a class="panel panel--checklist-summary-link" href="${buildHash(VIEWS.CHECKLIST)}" data-action="navigate" data-view="${VIEWS.CHECKLIST}">
      <span class="panel--checklist-summary-link__icon">${icon('target', { size: 22 })}</span>
      <span class="panel--checklist-summary-link__text">
        <span class="panel--checklist-summary-link__label">${t('checklist.title', lang)}</span>
        <span class="panel--checklist-summary-link__sub" dir="ltr">${completedCount(selectors.todayChecklist(state))} / ${CHECKLIST_ITEMS.length} ${t('checklist.today', lang)}</span>
      </span>
      ${icon('chevronRight', { size: 18 })}
    </a>

    ${state.quranBookmark?.surah ? `
    <a class="panel panel--quran-continue" href="${buildHash(VIEWS.QURAN, { id: state.quranBookmark.surah })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${state.quranBookmark.surah}">
      <span class="panel--quran-continue__icon">${icon('quran', { size: 22 })}</span>
      <span class="panel--quran-continue__text">
        <span class="panel--quran-continue__label">${t('quran.continueReading', lang)}</span>
        <span class="panel--quran-continue__sub">${t('quran.surah', lang)} ${escapeHTML(String(state.quranBookmark.surah))}</span>
      </span>
      ${icon('chevronRight', { size: 18 })}
    </a>` : ''}

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

    ${daily ? `
    <section class="panel panel--reflection">
      <div class="panel__header"><h2>${t('home.verseOfTheDay', lang)}</h2></div>
      ${cardHTML(daily.item, daily.category, { lang, isFavorite: selectors.isFavorite(state, daily.item.id), isSpeaking: state.speakingItemId === daily.item.id, counter: selectors.getCounter(state, daily.item.id), showTransliteration: state.settings.showTransliteration, showTranslation: state.settings.showTranslation, compact: true })}
    </section>` : ''}

    ${recentEntries.length ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('home.continueReading', lang)}</h2></div>
      <div class="card-row">
        ${recentEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: selectors.isFavorite(state, e.item.id), isSpeaking: state.speakingItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false })).join('')}
      </div>
    </section>` : `<p class="empty-hint">${t('home.noRecent', lang)}</p>`}

    ${favEntries.length ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.favorites', lang)}</h2>
        <a href="${buildHash(VIEWS.FAVORITES)}" data-action="navigate" data-view="${VIEWS.FAVORITES}">${icon('chevronRight', { size: 16 })}</a>
      </div>
      <div class="card-row">
        ${favEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: true, isSpeaking: state.speakingItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false })).join('')}
      </div>
    </section>` : ''}

    ${pinnedCollections.length ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.collections', lang)}</h2>
        <a href="${buildHash(VIEWS.COLLECTIONS)}" data-action="navigate" data-view="${VIEWS.COLLECTIONS}">${icon('chevronRight', { size: 16 })}</a>
      </div>
      <div class="chip-row">
        ${pinnedCollections.map((c) => `<a class="chip chip--collection" href="${buildHash(VIEWS.COLLECTION, { id: c.id })}" data-action="navigate" data-view="${VIEWS.COLLECTION}" data-id="${escapeHTML(c.id)}">${escapeHTML(pickLocale(c.name, lang))} <span class="chip__count">${c.items.length}</span></a>`).join('')}
      </div>
    </section>` : ''}
  </section>`;
}
