/**
 * views/home.js
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, categoryDisplayName, dateKey, escapeHTML } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { sessionFlag } from '../domain/sessionFlags.js';
import { VIEWS, CHECKLIST_ITEMS } from '../core/config.js';
import { cardHTML } from '../ui/card.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';
import { completedCount } from '../services/checklist.js';
import { ramadanInfo } from '../domain/ramadan.js';
import { resolveHomePanels } from '../domain/homePanels.js';
import { QUICK_TILE_DEFS, resolveQuickTiles } from '../domain/quickTiles.js';
import { fieldTogglesFor } from '../domain/contentLens.js';
import { MOODS, itemsForMood } from '../domain/moods.js';
import {
  INVITE_IDS,
  shouldShowInvite,
  hijriInviteState,
  ramadanInviteState,
} from '../domain/homeInvitations.js';
import { EVENT_LABELS, toHijri } from '../domain/calendar.js';
import {
  contentPrefsOf,
  isCategoryHidden,
  visibleCategoryItems,
} from '../services/contentPrefs.js';

/**
 * (v5.2.54) quick-action tiles: registry-driven (order/visibility from
 * settings, usage-driven until customized). Exported pure for tests —
 * pass resolved ids, language and the current adhkar window ('morning' /
 * 'evening' / null for the NOW suggestion).
 */
export function quickTilesHTML(tileIds, lang, nowWindow) {
  const tiles = (Array.isArray(tileIds) ? tileIds : [])
    .map((id) => QUICK_TILE_DEFS.find((tile) => tile.id === id))
    .filter(Boolean);
  return `
    <div class="quick-actions">
      ${tiles
        .map((tile) => {
          const suggested =
            (tile.id === 'morning' && nowWindow === 'morning') ||
            (tile.id === 'evening' && nowWindow === 'evening');
          const params = tile.params ? { ...tile.params } : {};
          return `
      <a class="quick-action quick-action--${tile.accent}${suggested ? ' quick-action--suggested' : ''}" href="${buildHash(tile.view, params)}" data-action="quick-tile" data-tile="${tile.id}" data-view="${tile.view}"${params.id ? ` data-id="${params.id}"` : ''}>
        ${icon(tile.icon, { size: 26 })}
        <span>${t(tile.labelKey, lang)}</span>
        ${suggested ? `<span class="quick-action__now">${t('home.nowBadge', lang)}</span>` : ''}
      </a>`;
        })
        .join('')}
    </div>`;
}
/** Forward/CTA chevron: points with the reading direction (U7 rule). */
const goIcon = (lang, size) => icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size });

/**
 * (v5.17.6) The Shahada banner: a black Rayah-style strip carrying the
 * fixed Arabic wording (never translated — it is quoted revelation, not
 * UI chrome). Pure template; the wording is pinned by
 * tests/shahada-banner.test.js so no edit, theme, or translation pass
 * can silently alter a single letter.
 */
export const SHAHADA_TEXT = 'لا إله إلا الله محمد رسول الله';
export function shahadaBannerHTML(lang) {
  return `
    <div class="shahada-banner" role="img" aria-label="${escapeHTML(t('banner.shahadaLabel', lang))}">
      <span class="shahada-banner__rule" aria-hidden="true"></span>
      <p class="shahada-banner__text" dir="rtl" lang="ar">${SHAHADA_TEXT}</p>
      <span class="shahada-banner__rule" aria-hidden="true"></span>
    </div>`;
}
import { recommendedAdhkarWindow } from '../domain/adhkarTiming.js';
import {
  calculateTimes,
  nextPrayer,
  currentPrayer,
  PRAYER_ORDER,
  formatClock,
  prayerMethodLine,
} from '../domain/prayer.js';
import { onboardingPanelHTML } from './onboardingPanel.js';
import { dailyHadithCardHTML } from './hadithCard.js';
import { countMemorized, dueCounts, dueSurahs, suggestFromKhatma } from '../domain/hifz.js';
import { worshipTodayRows } from '../domain/worship.js';
import { DAILY_THEMES, dailyEligibleEntries, matchesTheme } from '../domain/dailyAyah.js';
import { computeNudge, shouldShowNudge } from '../domain/nudge.js';
import {
  dedupeEntries,
  isCompletedToday,
  listCompletion,
  nextFreshIndex,
} from '../domain/reflections.js';
import { isDismissed } from '../domain/completedCards.js';
import { readLastPositions } from '../domain/lastPosition.js';
import { PRESETS as TASBIH_PRESETS } from './tasbih.js';

/**
 * v3.19 combined "Today in worship" card: prayers, Qur'an reading (pages
 * today + reading streak), dhikr, fasting and sadaqah — one view over the
 * day instead of five separate counters. Every source is existing per-day
 * data (see js/worship.js); sadaqah quick-log/undo is the only input here.
 */
export function worshipTodayCardHTML(state) {
  const lang = state.settings.language;
  const rows = worshipTodayRows(
    {
      statistics: state.statistics,
      dailyChecklist: state.dailyChecklist,
      ramadanLog: state.ramadanLog,
      sadaqahLog: state.sadaqahLog,
    },
    new Date()
  );
  const views = {
    prayers: VIEWS.PRAYER,
    quran: VIEWS.MUSHAF,
    dhikr: VIEWS.TASBIH,
    fasting: VIEWS.CALENDAR,
  };
  const rowIcons = {
    prayers: 'prayer-rug',
    quran: 'quran',
    dhikr: 'bead',
    fasting: 'droplet',
    sadaqah: 'coins',
  };

  const valueText = (r) => {
    if (r.id === 'prayers') return `${r.count}/${r.total}`;
    if (r.id === 'quran') return t('worship.pagesToday', lang, { n: r.count });
    if (r.id === 'dhikr') return t('worship.countToday', lang, { n: r.count });
    return r.done ? t(`worship.${r.id}Done`, lang, { n: r.count }) : t('worship.notYet', lang);
  };

  const sadaqahList = Array.isArray(state.sadaqahLog) ? state.sadaqahLog : [];
  const sadaqah = rows.find((r) => r.id === 'sadaqah');
  const todayTs = dateKey(new Date());
  const newestTodayId = sadaqahList.find((e) => e && dateKey(new Date(e.ts)) === todayTs)?.id;

  const rowHTML = (r) => {
    const inner = `
      <span class="worship-row__icon">${icon(rowIcons[r.id], { size: 16 })}</span>
      <span class="worship-row__name">${t(`worship.row.${r.id}`, lang)}</span>
      <span class="worship-row__value ${r.done ? 'worship-row__value--done' : ''}" dir="auto">
        ${r.done ? icon('check', { size: 13 }) : ''} ${valueText(r)}
        ${r.id === 'quran' && r.streak > 1 ? `<span class="chip chip__count">${t('worship.streak', lang, { n: r.streak })}</span>` : ''}
      </span>`;
    if (r.id === 'sadaqah') {
      return `
      <div class="worship-row worship-row--actions">
        ${inner}
        <button type="button" class="icon-btn icon-btn--sm" data-action="sadaqah-open-editor" aria-label="${t('worship.sadaqahEditor', lang)}" title="${t('worship.sadaqahEditor', lang)}">${icon('list', { size: 13 })}</button>
        ${
          sadaqah.done
            ? `<button type="button" class="icon-btn icon-btn--sm" data-action="sadaqah-remove" data-id="${escapeHTML(newestTodayId ?? '')}" aria-label="${t('worship.undo', lang)}" title="${t('worship.undo', lang)}" ${newestTodayId ? '' : 'disabled'}>${icon('close', { size: 13 })}</button>`
            : `<button type="button" class="chip" data-action="sadaqah-log">${t('worship.logSadaqah', lang)}</button>`
        }
      </div>`;
    }
    return `
      <a class="worship-row" href="${buildHash(views[r.id])}" data-action="navigate" data-view="${views[r.id]}">
        ${inner}
        ${goIcon(lang, 13)}
      </a>`;
  };

  return `
  <section class="panel panel--worship">
    <div class="panel__header"><h2>${icon('target', { size: 16 })} ${t('worship.title', lang)}</h2></div>
    <div class="worship-list">
      ${rows.map(rowHTML).join('')}
    </div>
  </section>`;
}

/**
 * (merged-plan item 2) the unified resume panel: one honest record over
 * the seven last-position slots (domain/lastPosition.js). The Qur'an
 * one-shot card keeps its exact legacy shape and session latch; every
 * other lived place renders as a words+numbers row (label words from
 * i18n, positions as numbers/ids, never pressure copy — no streaks, no
 * absence counts, no shame). All links reuse existing routes through the
 * existing `navigate` / `mushaf-open-at-surah` actions: no new
 * data-action, no new static view imports. When nothing was ever
 * touched, the panel says so and offers al-Fatihah — absence stated,
 * never faked. Pure (state → HTML); exported for tests.
 */
export function resumePanelHTML(state) {
  const lang = state.settings.language;
  const slots = readLastPositions(state);

  // The legacy one-shot return-to-recitation, verbatim: shows only while
  // a valid bookmark exists AND this session hasn't resumed it yet.
  const quranCard =
    slots.quran && !sessionFlag('continueResumed')
      ? `
    <a class="panel panel--quran-continue" href="${buildHash(VIEWS.MUSHAF)}" data-action="mushaf-open-at-surah" data-surah="${escapeHTML(slots.quran.surah)}">
      <span class="panel--quran-continue__icon">${icon('quran', { size: 22 })}</span>
      <span class="panel--quran-continue__text">
        <span class="panel--quran-continue__label">${t('quran.continueReading', lang)}</span>
        <span class="panel--quran-continue__sub">${t('quran.surah', lang)} ${escapeHTML(slots.quran.surah)}</span>
      </span>
      ${goIcon(lang, 18)}
    </a>`
      : '';

  const row = ({ view, params, extraAttrs, iconName, name, value }) => `
      <a class="worship-row" href="${buildHash(view, params)}" data-action="navigate" data-view="${view}"${extraAttrs || ''}>
        <span class="worship-row__icon">${icon(iconName, { size: 16 })}</span>
        <span class="worship-row__name">${name}</span>
        <span class="worship-row__value" dir="auto">${value}</span>
        ${goIcon(lang, 13)}
      </a>`;

  const rows = [];
  if (slots.mushaf) {
    rows.push(
      row({
        view: VIEWS.MUSHAF,
        params: { page: String(slots.mushaf.page) },
        iconName: 'quran',
        name: escapeHTML(t('home.resume.mushaf', lang)),
        value: escapeHTML(t('home.resume.page', lang, { n: slots.mushaf.page })),
      })
    );
  }
  if (slots.adhkar) {
    const entry = state.library?.itemIndex?.[slots.adhkar.itemId];
    const catName = entry?.category
      ? categoryDisplayName(entry.category, lang)
      : slots.adhkar.categoryId;
    const itemTitle =
      entry?.item?.title && typeof entry.item.title === 'object'
        ? pickLocale(entry.item.title, lang)
        : null;
    rows.push(
      row({
        view: VIEWS.CATEGORY,
        params: { id: slots.adhkar.categoryId },
        extraAttrs: ` data-id="${escapeHTML(slots.adhkar.categoryId)}"`,
        iconName: 'book',
        name: escapeHTML(t('home.resume.adhkar', lang)),
        value: escapeHTML(itemTitle ? `${catName} · ${itemTitle}` : catName),
      })
    );
  }
  if (slots.tasbih) {
    const preset = TASBIH_PRESETS.find((p) => p.id === slots.tasbih.phraseId);
    const custom = !preset
      ? (Array.isArray(state.tasbihCustom) ? state.tasbihCustom : []).find(
          (c) => c && c.id === slots.tasbih.phraseId
        )
      : null;
    const label = preset
      ? lang === 'ar'
        ? preset.ar
        : preset.en
      : custom?.text || slots.tasbih.phraseId;
    rows.push(
      row({
        view: VIEWS.TASBIH,
        params: {},
        iconName: 'bead',
        name: escapeHTML(t('home.resume.tasbih', lang)),
        value: escapeHTML(String(label)),
      })
    );
  }
  if (slots.hadith) {
    const books = state.hadith?.index?.books;
    const book = Array.isArray(books) ? books.find((b) => b && b.id === slots.hadith.bookId) : null;
    const bookName =
      book?.name && typeof book.name === 'object'
        ? pickLocale(book.name, lang)
        : slots.hadith.bookId;
    rows.push(
      row({
        view: VIEWS.HADITH,
        params: { id: slots.hadith.bookId, n: String(slots.hadith.n) },
        extraAttrs: ` data-id="${escapeHTML(slots.hadith.bookId)}" data-n="${escapeHTML(String(slots.hadith.n))}"`,
        iconName: 'book',
        name: escapeHTML(t('home.resume.hadith', lang)),
        value: escapeHTML(`${bookName} · #${slots.hadith.n}`),
      })
    );
  }
  if (slots.tajweedLesson) {
    rows.push(
      row({
        view: VIEWS.TAJWEED_COURSE,
        params: {},
        iconName: 'star',
        name: escapeHTML(t('home.resume.tajweed', lang)),
        value: escapeHTML(`${t('home.resume.lesson', lang)} · ${slots.tajweedLesson.sessionId}`),
      })
    );
  }
  if (slots.tajweedRule) {
    rows.push(
      row({
        view: VIEWS.TAJWEED_COURSE,
        params: {},
        iconName: 'star',
        name: escapeHTML(t('home.resume.tajweed', lang)),
        value: escapeHTML(`${t('home.resume.rule', lang)} · ${slots.tajweedRule.ruleId}`),
      })
    );
  }

  // Honest absence: no lived place anywhere — say so, and offer the
  // opening chapter instead of inventing a position.
  if (!quranCard && !rows.length) {
    return `
    <section class="panel panel--resume" aria-label="${escapeHTML(t('home.resumeTitle', lang))}">
      <div class="panel__header"><h2>${icon('bookmark', { size: 16 })} ${t('home.resumeTitle', lang)}</h2></div>
      <div class="worship-list">
        <a class="worship-row" href="${buildHash(VIEWS.QURAN, { id: '1' })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="1">
          <span class="worship-row__icon">${icon('quran', { size: 16 })}</span>
          <span class="worship-row__name">${escapeHTML(t('home.resumeEmpty', lang))}</span>
          <span class="worship-row__value" dir="auto"></span>
          ${goIcon(lang, 13)}
        </a>
      </div>
    </section>`;
  }
  if (!rows.length) return quranCard;
  return `
    ${quranCard}
    <section class="panel panel--resume" aria-label="${escapeHTML(t('home.resumeTitle', lang))}">
      <div class="panel__header"><h2>${icon('bookmark', { size: 16 })} ${t('home.resumeTitle', lang)}</h2></div>
      <div class="worship-list">
        ${rows.join('')}
      </div>
    </section>`;
}

/**
 * v3.25 gentle "it's been a while" line. The decision (whether, which kind,
 * which tier) is entirely js/nudge.js's; the anti-guilt contract is pinned
 * by tests: no counting the absence, no streak vocabulary, at most one
 * showing per 7-day quiet stretch, a dismissal that is never held against
 * anyone. The card carries NO numbers and NO dates — those would be the
 * manipulative version the TODO forbids.
 */
export function nudgeCardHTML(state, today = new Date()) {
  const lang = state.settings.language;
  const nudge = computeNudge(state, today);
  if (!nudge || !shouldShowNudge(state, nudge, today)) return '';

  const kindIcon = { quran: 'bookmark', dhikr: 'bead', prayers: 'sunrise' };
  // (v4.4) the Qur'an nudge lands on the person's saved MUSHAF page —
  // the book is the default reading experience now.
  const views = { quran: VIEWS.MUSHAF, dhikr: VIEWS.TASBIH, prayers: VIEWS.PRAYER };
  const view = views[nudge.kind] ?? VIEWS.HOME;
  // The quran CTA lands on the bookmark itself when one exists — "your
  // place is saved" must mean it literally.
  const bookmarkPage = nudge.kind === 'quran' ? state.mushafBookmark?.page : null;
  const href =
    nudge.kind === 'quran'
      ? buildHash(VIEWS.MUSHAF, bookmarkPage ? { page: String(bookmarkPage) } : {})
      : buildHash(view);

  return `
  <aside class="panel panel--nudge" data-nudge-card>
    <span class="panel--nudge__icon">${icon(kindIcon[nudge.kind] ?? 'sunrise', { size: 20 })}</span>
    <div class="panel--nudge__text">
      <p class="panel--nudge__title">${t(`nudge.title.${nudge.tier}`, lang)}</p>
      <p class="panel--nudge__line">${t(`nudge.line.${nudge.kind}`, lang)}</p>
      <a class="panel--nudge__cta" href="${href}" data-action="navigate" data-view="${view}"${bookmarkPage != null ? ` data-page="${escapeHTML(String(bookmarkPage))}"` : ''}>${t(`nudge.cta.${nudge.kind}`, lang)} ${goIcon(lang, 12)}</a>
    </div>
    <button type="button" class="icon-btn icon-btn--sm panel--nudge__dismiss" data-action="nudge-dismiss" aria-label="${t('nudge.dismiss', lang)}" title="${t('nudge.dismiss', lang)}">${icon('close', { size: 13 })}</button>
  </aside>`;
}

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
 *
 * (v5.2.25) freshness: when the pick is already done today (or dismissed
 * this session), the panel surfaces the next fresh entry around the ring
 * instead of repeating a finished card.
 */
function verseEligibleEntries(itemIndex) {
  return dailyEligibleEntries(itemIndex);
}

function pickDailyItem(itemIndex, theme = 'any') {
  const eligible = verseEligibleEntries(itemIndex);
  if (!eligible.length) return null;
  // (v4.4, restored v5.2.30) theme bias narrows the pool before the
  // deterministic seed pick; an empty theme pool falls back to the full
  // pool (a sparse theme must never blank the card), and the done-today
  // fall-through below walks the narrowed pool so the card stays on-theme.
  const pool =
    DAILY_THEMES.includes(theme) && theme !== 'any'
      ? eligible.filter((e) => matchesTheme(e, theme))
      : eligible;
  const use = pool.length ? pool : eligible;
  const seed = dateKey(new Date())
    .split('-')
    .reduce((a, c) => a + parseInt(c, 10), 0);
  const idx = seed % use.length;
  return { entry: use[idx], idx, eligible: use };
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
    offsets: p.offsets,
  });
}

/**
 * (IA-7, v5.17.61) the shared sun-window resolution for the adhkar
 * browser: today's real prayer times plus which adhkar window ('morning' /
 * 'evening' / null) the browser ranks by. Home keeps using it for the
 * quick tiles; the Azkar section view (renderLibrary) uses it for the
 * moved grid — one computation, two readers (rule 6). Pure; exported for
 * tests and the library view.
 */
export function resolveBrowserWindow(state) {
  const prayerTimes = todayPrayerTimes(state);
  return { prayerTimes, nowWindow: recommendedAdhkarWindow(new Date(), prayerTimes) };
}

/**
 * v5.17.72: Tasbih is already a first-class Practise door and can also be
 * surfaced by the Home quick-action registry. Keeping a second full-width
 * row here made Home feel like a launcher instead of a daily landing, so the
 * dedicated duplicate doorway is intentionally retired.
 */
/**
 * (v5.17.50, merged-plan item 3) the six-prayer ribbon for the Home hero:
 * every prayer of the day as one tap into the Prayer view (navigate only,
 * the same deep link the old next-only strip used), with the prayer in
 * effect marked current (aria-current + the shared "Now" badge) and the
 * upcoming one marked next. The live countdown span keeps the
 * data-home-countdown hook the app ticker patches directly, so the
 * ticking still never touches the store.
 *
 * No location, no times: all six cells read —:— beside an inline setup
 * action into the Prayer view, where the city presets and manual offsets
 * already live. Times are never faked — an honest placeholder beats a
 * plausible-looking clock. The active-method line stays off this variant:
 * with no computed times on screen a method would dangle beside
 * placeholders (and cost first-run fold budget); the setup action leads
 * exactly where the method and offsets live. The order derives from domain/prayer.js
 * PRAYER_ORDER (rule 6), never a pinned copy here. Pure
 * (state/lang/times/now → HTML); exported for tests.
 */
export function prayerRibbonHTML(state, lang, times, now = new Date()) {
  const p = state.settings.prayer;
  const hasLocation = p.latitude != null && p.longitude != null;
  const navAttrs = `href="${buildHash(VIEWS.PRAYER)}" data-action="navigate" data-view="${VIEWS.PRAYER}"`;
  const title = `<h2 class="home-prayer-ribbon__title">${icon('sunrise', { size: 18 })} ${t('home.prayerRibbon', lang)}</h2>`;

  if (!hasLocation || !times) {
    const cells = PRAYER_ORDER.map(
      (name) => `
      <a class="home-prayer-ribbon__cell home-prayer-ribbon__cell--empty" ${navAttrs}>
        <span class="home-prayer-ribbon__topline"><span class="home-prayer-ribbon__name">${t('prayer.' + name, lang)}</span></span>
        <span class="home-prayer-ribbon__time" dir="ltr">—:—</span>
      </a>`
    ).join('');
    return `
  <section class="home-prayer-ribbon home-prayer-ribbon--setup" aria-label="${escapeHTML(t('home.prayerRibbon', lang))}">
    <div class="home-prayer-ribbon__head">
      ${title}
      <p class="home-prayer-ribbon__setup">
        <span>${t('home.setLocation', lang)}</span>
        <a class="home-prayer-ribbon__cta" ${navAttrs}>${t('home.setLocationAction', lang)} ${goIcon(lang, 14)}</a>
      </p>
    </div>
    <div class="home-prayer-ribbon__cells" dir="ltr">${cells}
    </div>
  </section>`;
  }

  const next = nextPrayer(times, now);
  const current = currentPrayer(times, now);
  const amPm = { am: t('common.am', lang), pm: t('common.pm', lang) };
  const cells = PRAYER_ORDER.map((name) => {
    const isCurrent = name === current.name;
    const isNext = name === next.name && !isCurrent;
    const badge = isCurrent
      ? `<span class="home-prayer-ribbon__badge">${t('home.nowBadge', lang)}</span>`
      : isNext
        ? `<span class="home-prayer-ribbon__badge home-prayer-ribbon__badge--next">${t('home.nextBadge', lang)}</span>`
        : '';
    return `
      <a class="home-prayer-ribbon__cell${isCurrent ? ' home-prayer-ribbon__cell--current' : ''}${isNext ? ' home-prayer-ribbon__cell--next' : ''}" ${navAttrs}${isCurrent ? ' aria-current="true"' : ''}>
        <span class="home-prayer-ribbon__topline"><span class="home-prayer-ribbon__name">${t('prayer.' + name, lang)}</span>${badge}</span>
        <span class="home-prayer-ribbon__time" dir="ltr">${formatClock(times[name], true, amPm)}</span>
      </a>`;
  }).join('');

  return `
  <section class="home-prayer-ribbon" aria-label="${escapeHTML(t('home.prayerRibbon', lang))}">
    <div class="home-prayer-ribbon__head">
      ${title}
      <p class="home-prayer-ribbon__next">
        <span>${t('home.nextPrayer', lang)} · ${t('prayer.' + next.name, lang)} · <span dir="ltr">${formatClock(next.hours, true, amPm)}</span></span>
        <span class="home-prayer-strip__countdown" dir="ltr" data-home-countdown>—</span>
      </p>
    </div>
    <p class="home-prayer-ribbon__method">${prayerMethodLine(p, lang)}</p>
    <div class="home-prayer-ribbon__cells" dir="ltr">${cells}
    </div>
  </section>`;
}

/**
 * (v5.17.50, merged-plan item 3) the visible label for the sun-based
 * ranking the browser already applies (rankBrowserDocuments): the order
 * on screen is explained on screen, in both languages. Pure — exported
 * for tests.
 */
export function adhkarWindowLabel(nowWindow, lang) {
  if (nowWindow === 'morning') return t('home.window.morning', lang);
  if (nowWindow === 'evening') return t('home.window.evening', lang);
  return t('home.window.none', lang);
}

/** The Hijri date chip rendered in the hero (e.g. "24 Ṣafar 1448 AH"). */
function hijriChipHTML(lang) {
  const h = toHijri(new Date());
  const monthName = pickLocale(h.monthName, lang);
  return `<span class="home-hero__hijri" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${escapeHTML(`${h.day} ${monthName} ${h.year}`)} ${t('home.hijriOn', lang)}</span>`;
}

/** (v4.3) Cold-start offline: the library tier failed at boot — say so
 *  with a Retry affordance instead of letting Home render as an app full
 *  of inexplicably empty lists. Hidden again the moment any library is
 *  present (partial load is better than a full-page error). */
function libraryErrorHTML(state, lang) {
  if (!state.loadErrors?.library) return '';
  if (state.library.order?.length) return '';
  return `<section class="panel">${loadErrorStateHTML({ lang, tierKey: 'library', t })}</section>`;
}

/**
 * (REORG Phase 3) Home IS the adhkar browser: a grid of named category
 * tiles — each tile with a live item count, the kept section-level
 * completion counter, and an explicit Read-now action — with the 12 moods
 * as a filter row BELOW the grid (v5.17.56, merged-plan item 9: the dhikr
 * owns the fold) and the three seasonal invitations under that. The 99
 * Names, Zakat and Certificates are re-homed into a Reference row outside
 * the daily grid: reference, not a daily worship sequence.
 *
 * Read-only on purpose: hiding, reordering, editing and custom libraries
 * stay in the Library view (linked below), so this browser adds no
 * data-action beyond the existing `navigate` and the invitations' calm
 * `home-invite-dismiss`, and no view import beyond the domain/service
 * helpers the Library view already reads. Routes move; `data/` does not.
 */
const BROWSER_REFERENCE_LIBRARY_ID = 'asma';

/** The lensed documents in the user's order — the Library view's math,
 *  minus the manage chrome (browser is reading mode, always). */
function browserDocuments(state, nowWindow = null) {
  const prefs = contentPrefsOf(state);
  const deletedLibs = prefs.deletedLibraries || {};
  const hiddenLibs = prefs.hiddenLibraries || {};
  const customDocs = Object.values(state.customContent || {}).filter(
    (doc) => !hiddenLibs[doc.metadata.id]
  );
  const lensedDocs = (state.library.order || [])
    .map((id) => state.library.documents[id])
    .filter(Boolean)
    .filter((doc) => !deletedLibs[doc.metadata.id] && !hiddenLibs[doc.metadata.id]);
  const libRank = new Map((prefs.libraryOrderOverrides || []).map((id, i) => [id, i]));
  const all = [...lensedDocs, ...customDocs];
  // (v5.17.47, C4 rank) an explicit user order is the user's own data and
  // always wins. Without one the sections rank themselves — recency (the
  // section left off), then use (history opens per section), then corpus
  // size (live visible items, not a pinned list) — instead of catalog
  // order. Rule 6: the order derives from the corpus + the reader's own
  // history, so the tree cannot drift from itself.
  if (libRank.size) {
    return all
      .map((doc, i) => ({ doc, i }))
      .sort(
        (a, b) =>
          (libRank.get(a.doc.metadata.id) ?? 1e9) - (libRank.get(b.doc.metadata.id) ?? 1e9) ||
          a.i - b.i
      )
      .map((entry) => entry.doc);
  }
  return rankBrowserDocuments(state, all, nowWindow);
}

/**
 * (v5.17.47, C4 rank) order sections by the reader's reality, not the
 * catalog's. Sources, in precedence order: the section left off (most
 * recent history entry), per-section open counts from state.history
 * (most-recent-first [{ itemId, categoryId, ts }]), the sun-based adhkar
 * window (morning/evening puts the adhkar library first), then live
 * corpus size descending, then catalog order as the stable tiebreak.
 * Pure — exported for tests.
 */
export function rankBrowserDocuments(state, docs, nowWindow = null) {
  const index = state.library?.itemIndex || {};
  const use = new Map();
  const history = Array.isArray(state.history) ? state.history : [];
  for (const h of history) {
    const docId = index[h?.itemId]?.document?.metadata?.id;
    if (docId) use.set(docId, (use.get(docId) || 0) + 1);
  }
  const leftOffDoc = index[history[0]?.itemId]?.document?.metadata?.id ?? null;
  const catalogRank = new Map((state.library?.order || []).map((id, i) => [id, i]));
  const timedDoc =
    nowWindow === 'morning' || nowWindow === 'evening'
      ? (docs.find((d) => (d.categories || []).some((c) => c.id === nowWindow))?.metadata?.id ??
        null)
      : null;
  return [...docs].sort((a, b) => {
    const aId = a.metadata.id;
    const bId = b.metadata.id;
    if (aId === leftOffDoc && bId !== leftOffDoc) return -1;
    if (bId === leftOffDoc && aId !== leftOffDoc) return 1;
    if (aId === timedDoc && bId !== timedDoc) return -1;
    if (bId === timedDoc && aId !== timedDoc) return 1;
    const usage = (use.get(bId) || 0) - (use.get(aId) || 0);
    if (usage) return usage;
    const size = docCorpusCount(state, b) - docCorpusCount(state, a);
    if (size) return size;
    return (catalogRank.get(aId) ?? 1e9) - (catalogRank.get(bId) ?? 1e9);
  });
}

/** Live visible items in a document — the corpus size the ranking reads. */
export function docCorpusCount(state, doc) {
  return (doc.categories || []).reduce((n, cat) => n + visibleCategoryItems(state, cat).length, 0);
}

/** One document's categories in the user's order, hidden/deleted removed
 *  (reading-mode semantics, exactly like the Library view). An explicit
 *  user order wins; without one the tiles rank themselves — the sun-based
 *  window first (morning/evening adhkar at their hour), then the
 *  reader's most-opened categories, then live item count — so the four
 *  most-used categories surface instead of sitting alphabetical. */
function browserCategories(state, doc, nowWindow = null) {
  const prefs = contentPrefsOf(state);
  const deletedCats = prefs.deletedCategories || {};
  const catRank = new Map(
    (prefs.categoryOrderOverrides?.[doc.metadata.id] || []).map((id, i) => [id, i])
  );
  const allCats = [...doc.categories].filter(
    (cat) => !isCategoryHidden(state, cat.id) && !deletedCats[cat.id]
  );
  if (catRank.size) {
    return [...allCats].sort(
      (a, b) =>
        (catRank.get(a.id) ?? 1e9) - (catRank.get(b.id) ?? 1e9) || (a.order || 0) - (b.order || 0)
    );
  }
  return rankBrowserCategories(state, allCats, nowWindow);
}

/**
 * (v5.17.47, C4 rank) order tiles by the reader's reality. Sources: the
 * sun-based window id ('morning' / 'evening') first at its hour, then
 * open counts per categoryId from state.history, then live visible item
 * count descending, then the document's own order as the stable
 * tiebreak. Pure — exported for tests.
 */
export function rankBrowserCategories(state, cats, nowWindow = null) {
  const use = new Map();
  const history = Array.isArray(state.history) ? state.history : [];
  for (const h of history) {
    if (h?.categoryId) use.set(h.categoryId, (use.get(h.categoryId) || 0) + 1);
  }
  return [...cats].sort((a, b) => {
    if (nowWindow && a.id === nowWindow && b.id !== nowWindow) return -1;
    if (nowWindow && b.id === nowWindow && a.id !== nowWindow) return 1;
    const usage = (use.get(b.id) || 0) - (use.get(a.id) || 0);
    if (usage) return usage;
    const size = visibleCategoryItems(state, b).length - visibleCategoryItems(state, a).length;
    if (size) return size;
    return (a.order || 0) - (b.order || 0);
  });
}

/** One named tile: live count, kept completion counter, Read-now action.
 *  Two sibling links (never nested) to the same category route — the tile
 *  body and the explicit CTA both navigate, with no interstitial. */
function browserTileHTML(state, cat, lang) {
  const items = visibleCategoryItems(state, cat);
  const href = buildHash(VIEWS.CATEGORY, { id: cat.id });
  const navAttrs = `href="${href}" data-action="navigate" data-view="${VIEWS.CATEGORY}" data-id="${escapeHTML(cat.id)}"`;
  // The section-level completion counter, kept: silent until the first
  // item is done today, achieved at 100% — a wall of 0% on every tile
  // would read as shame, which this app refuses.
  const { done, total, pct } = listCompletion(items, state.counters, dateKey(new Date()));
  const progress =
    done > 0
      ? `<span class="category-tile__count">${escapeHTML(t('category.progressToday', lang, { done, total, pct }))}</span>`
      : '';
  return `
      <div class="category-tile-wrap">
        <a class="category-tile" ${navAttrs} aria-label="${escapeHTML(`${categoryDisplayName(cat, lang)} — ${t('collections.itemCount', lang, { n: items.length })}`)}">
          <span class="category-tile__icon category-tile__icon--${escapeHTML(cat.color || 'slate')}">${icon(cat.icon || 'book', { size: 22 })}</span>
          <span class="category-tile__text">
            <span class="category-tile__name">${escapeHTML(categoryDisplayName(cat, lang))}</span>
            <span class="category-tile__count">${t('collections.itemCount', lang, { n: items.length })}</span>
            ${progress}
          </span>
          <span class="category-tile__arrow" aria-hidden="true">${goIcon(lang, 14)}</span>
        </a>
      </div>`;
}

/** The 12 moods ride a filter row BELOW the grid now (v5.17.56, merged-plan
 *  item 9) — browse-by-need stays one tap away, but the dhikr itself owns
 *  the fold. Chips carry the existing 44px ::after apron, so Elder/a11y
 *  targets are untouched. */
function browserMoodRowHTML(state, lang) {
  const index = state.library?.itemIndex;
  if (!index || !Object.keys(index).length) return '';
  const chips = MOODS.map((mood) => {
    const count = itemsForMood(mood, index).length;
    return `
      <a class="chip" href="${buildHash(VIEWS.MOOD, { id: mood.id })}" data-action="navigate" data-view="${VIEWS.MOOD}" data-id="${mood.id}" aria-label="${escapeHTML(`${t(`mood.${mood.id}`, lang)} — ${t('collections.itemCount', lang, { n: count })}`)}">
        ${icon(mood.icon, { size: 15 })}
        <span>${escapeHTML(t(`mood.${mood.id}`, lang))}</span>
        <span class="chip__count">${t('collections.itemCount', lang, { n: count })}</span>
      </a>`;
  }).join('');
  return `
    <section class="library-section library-section--moods" aria-label="${escapeHTML(t('moods.title', lang))}">
      <h2 class="library-section__title">${escapeHTML(t('moods.title', lang))}</h2>
      <p class="library-section__desc">${escapeHTML(t('moods.subtitle', lang))}</p>
      <div class="chip-row chip-row--scroll" role="group" aria-label="${escapeHTML(t('moods.title', lang))}">${chips}</div>
    </section>`;
}

/** Reference, not a daily sequence: the Names row reuses the worship-row
 *  shape beside Zakat and Certificates — direct `navigate` links, no
 *  interstitial, deep links unchanged. */
function browserReferenceHTML(state, lang) {
  const docs = browserDocuments(state);
  const asmaDoc = docs.find((doc) => doc.metadata.id === BROWSER_REFERENCE_LIBRARY_ID);
  const asmaCats = asmaDoc ? browserCategories(state, asmaDoc) : [];
  const row = ({ view, id, iconName, name, value }) => `
      <a class="worship-row" href="${buildHash(view, id ? { id } : {})}" data-action="navigate" data-view="${view}"${id ? ` data-id="${escapeHTML(id)}"` : ''}>
        <span class="worship-row__icon">${icon(iconName, { size: 16 })}</span>
        <span class="worship-row__name">${escapeHTML(name)}</span>
        <span class="worship-row__value" dir="auto">${value}</span>
        ${goIcon(lang, 13)}
      </a>`;
  const rows = [
    ...asmaCats.map((cat) =>
      row({
        view: VIEWS.CATEGORY,
        id: cat.id,
        iconName: cat.icon || 'star',
        name: categoryDisplayName(cat, lang),
        value: escapeHTML(
          t('collections.itemCount', lang, { n: visibleCategoryItems(state, cat).length })
        ),
      })
    ),
    row({ view: VIEWS.ZAKAT, iconName: 'calculator', name: t('zakat.title', lang), value: '' }),
    row({
      view: VIEWS.CERTIFICATE,
      iconName: 'award',
      name: t('certificate.title', lang),
      value: '',
    }),
  ].join('');
  return `
    <section class="panel panel--worship" aria-label="${escapeHTML(t('home.referenceTitle', lang))}">
      <div class="panel__header"><h2>${escapeHTML(t('home.referenceTitle', lang))}</h2></div>
      <p class="panel__subtext">${escapeHTML(t('home.referenceSub', lang))}</p>
      <div class="worship-list">${rows}</div>
    </section>`;
}

/**
 * (v5.17.47, C4) "How am I doing" as one slim strip near the top instead
 * of a full panel at the very bottom. Same sources as the worship panel
 * (worshipTodayRows over existing per-day data), navigate-only links to
 * the same three doors — the panel below keeps the detail, this strip
 * only answers at a glance. No new data-action, no new strings.
 */
export function homeTodayStripHTML(state) {
  const lang = state.settings.language;
  const rows = worshipTodayRows(
    {
      statistics: state.statistics,
      dailyChecklist: state.dailyChecklist,
      ramadanLog: state.ramadanLog,
      sadaqahLog: state.sadaqahLog,
    },
    new Date()
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const prayers = byId.get('prayers');
  const quran = byId.get('quran');
  const dhikr = byId.get('dhikr');
  if (!prayers || !quran || !dhikr) return '';
  const quranValue =
    quran.count > 0
      ? t('worship.pagesToday', lang, { n: quran.count })
      : t('home.notStarted', lang);
  const dhikrValue =
    dhikr.count > 0
      ? t('worship.countToday', lang, { n: dhikr.count })
      : t('home.notStarted', lang);
  const cell = ({ view, iconName, label, value }) => `
      <a class="home-today__cell" href="${buildHash(view)}" data-action="navigate" data-view="${view}">
        <span class="home-today__icon">${icon(iconName, { size: 15 })}</span>
        <span class="home-today__label">${label}</span>
        <span class="home-today__value" dir="auto">${value}</span>
      </a>`;
  return `
  <section class="home-today" aria-label="${escapeHTML(t('worship.title', lang))}">
    ${cell({ view: VIEWS.PRAYER, iconName: 'prayer-rug', label: t('worship.row.prayers', lang), value: `${prayers.count}/${prayers.total}` })}
    ${cell({ view: VIEWS.MUSHAF, iconName: 'quran', label: t('worship.row.quran', lang), value: escapeHTML(quranValue) })}
    ${cell({ view: VIEWS.TASBIH, iconName: 'bead', label: t('worship.row.dhikr', lang), value: escapeHTML(dhikrValue) })}
  </section>`;
}

/**
 * (v5.17.56, merged-plan item 9) the three below-fold invitations: a Hijri
 * date note (the calendar's own event list), a Friday Al-Kahf invitation
 * (the preset anchor's Friday), and a Ramadan countdown/companion
 * invitation (the companion's own season math). One honest door each —
 * calendar, Surah Al-Kahf, the Ramadan companion — navigate only; the
 * dismiss button is the single new data-action (`home-invite-dismiss`,
 * persisted calm dismissal through SETTINGS_UPDATE). No numbers except
 * the Ramadan day/countdown, no names, no history read, no notification
 * armed from here. Pure (state/date → HTML); exported for tests.
 */
export function homeInvitesHTML(state, today = new Date()) {
  const lang = state.settings.language;
  const dismissed = state.settings.dismissedInvites || {};
  const cards = [];

  const dismissBtn = (id) => `
      <button type="button" class="icon-btn icon-btn--sm panel--nudge__dismiss" data-action="home-invite-dismiss" data-id="${id}" aria-label="${escapeHTML(t('nudge.dismiss', lang))}" title="${escapeHTML(t('nudge.dismiss', lang))}">${icon('close', { size: 13 })}</button>`;

  const card = ({ id, iconName, title, line, extra, cta }) => `
    <aside class="panel panel--nudge home-invite" data-home-invite="${id}">
      <span class="panel--nudge__icon">${icon(iconName, { size: 20 })}</span>
      <div class="panel--nudge__text">
        <p class="panel--nudge__title">${title}</p>
        <p class="panel--nudge__line">${line}</p>
        ${extra || ''}
        ${cta}
      </div>
      ${dismissBtn(id)}
    </aside>`;

  const ctaLink = (view, params, label, extraAttrs = '') => `
        <a class="panel--nudge__cta" href="${buildHash(view, params)}" data-action="navigate" data-view="${view}"${extraAttrs}>${label} ${goIcon(lang, 12)}</a>`;

  // One builder per invitation; INVITE_IDS (domain/homeInvitations.js) is
  // the render order, so the order lives in exactly one place.
  const builders = {
    hijri: () => {
      if (!shouldShowInvite('hijri', today, dismissed)) return '';
      const st = hijriInviteState(today);
      if (!st.eventKey || !st.eventDate) return '';
      const hijriDate = `${st.hijri.day} ${pickLocale(st.hijri.monthName, lang)} ${st.hijri.year} ${t('home.hijriOn', lang)}`;
      const eventLabel = EVENT_LABELS[st.eventKey]?.[lang] || EVENT_LABELS[st.eventKey]?.en;
      const gdate = st.eventDate.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
      return card({
        id: 'hijri',
        iconName: 'calendar',
        title: escapeHTML(t('home.invite.hijriTitle', lang)),
        // t() escapes interpolated vars; the static template stays raw.
        line: t('home.invite.hijriBody', lang, { hijri: hijriDate, event: eventLabel, gdate }),
        extra: `<p class="panel__subtext">${escapeHTML(t('calendar.estimateNote', lang))}</p>`,
        cta: ctaLink(VIEWS.CALENDAR, {}, escapeHTML(t('home.invite.hijriCta', lang))),
      });
    },
    friday: () => {
      if (!shouldShowInvite('friday', today, dismissed)) return '';
      return card({
        id: 'friday',
        iconName: 'quran',
        title: escapeHTML(t('home.invite.fridayTitle', lang)),
        line: escapeHTML(t('home.invite.fridayBody', lang)),
        extra: '',
        cta: ctaLink(
          VIEWS.QURAN,
          { id: '18' },
          escapeHTML(t('home.invite.fridayCta', lang)),
          ' data-id="18"'
        ),
      });
    },
    ramadan: () => {
      if (!shouldShowInvite('ramadan', today, dismissed)) return '';
      const st = ramadanInviteState(today);
      const inSeason = st.mode === 'in';
      return card({
        id: 'ramadan',
        iconName: 'rayah',
        title: escapeHTML(
          t(inSeason ? 'home.invite.ramadanTitleIn' : 'home.invite.ramadanTitleNear', lang)
        ),
        line: inSeason
          ? t('home.invite.ramadanBodyIn', lang, { n: st.day })
          : t('home.invite.ramadanBodyNear', lang, { n: st.daysUntil }),
        extra: '',
        cta: ctaLink(VIEWS.RAMADAN, {}, escapeHTML(t('home.invite.ramadanCta', lang))),
      });
    },
  };

  for (const id of INVITE_IDS) {
    const html = builders[id]();
    if (html) cards.push(html);
  }

  if (!cards.length) return '';
  return `<div class="home-invites">${cards.join('')}</div>`;
}

export function adhkarBrowserHTML(state, nowWindow = null) {
  const lang = state.settings.language;
  const docs = browserDocuments(state, nowWindow);
  if (!docs.length) return '';
  const dailyDocs = docs.filter((doc) => doc.metadata.id !== BROWSER_REFERENCE_LIBRARY_ID);
  const sections = dailyDocs
    .map((doc) => {
      const cats = browserCategories(state, doc, nowWindow);
      if (!cats.length) return '';
      return `
    <section class="library-section" id="home-section-${escapeHTML(doc.metadata.id)}">
      <h2 class="library-section__title">${escapeHTML(pickLocale(doc.metadata.name, lang))}</h2>
      ${doc.metadata.description?.[lang] ? `<p class="library-section__desc">${escapeHTML(pickLocale(doc.metadata.description, lang))}</p>` : ''}
      <div class="category-grid">${cats.map((cat) => browserTileHTML(state, cat, lang)).join('')}</div>
    </section>`;
    })
    .join('');
  return `
  <section class="home-browser" aria-label="${escapeHTML(t('home.browserTitle', lang))}">
    <div class="view-header">
      <h2 class="view__title">${escapeHTML(t('home.browserTitle', lang))}</h2>
      <p class="view__subtitle">${escapeHTML(t('home.browserSub', lang))}</p>
      <p class="home-browser__window">${escapeHTML(adhkarWindowLabel(nowWindow, lang))}</p>
    </div>
    ${sections}
    ${browserMoodRowHTML(state, lang)}
    ${homeInvitesHTML(state)}
    ${browserReferenceHTML(state, lang)}
    <p><a class="btn btn--ghost btn--sm" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}">${escapeHTML(t('home.openLibrary', lang))} ${goIcon(lang, 14)}</a></p>
  </section>`;
}

export function renderHome(state) {
  const lang = state.settings.language;
  const today = selectors.todayStats(state);
  const goal = state.settings.dailyGoal || 100;
  const pct = Math.min(100, Math.round((today.recitations / Math.max(1, goal)) * 100));

  const dailyPick = pickDailyItem(state.library.itemIndex, state.settings.dailyAyahTheme);
  // (v5.2.25) feed queue: done-today and session-dismissed items never
  // repeat down the Home stream, and no item appears twice across the
  // verse/recent/favorites panels (first occurrence wins).
  const todayKey = dateKey(new Date());
  const isStaleEntry = (entry) => {
    const id = entry?.item?.id;
    if (id == null) return true;
    if (isDismissed(id)) return true;
    return isCompletedToday(state.counters?.[id], todayKey);
  };
  let daily = dailyPick?.entry || null;
  if (daily && isStaleEntry(daily) && dailyPick.eligible.length > 1) {
    const fresh = nextFreshIndex(dailyPick.eligible, dailyPick.idx, isStaleEntry);
    if (fresh >= 0) daily = dailyPick.eligible[fresh];
  }
  const shownIds = new Set(daily?.item?.id != null ? [daily.item.id] : []);
  const takeFresh = (entries) => {
    const out = [];
    for (const entry of dedupeEntries(entries)) {
      const id = entry?.item?.id;
      if (id == null || shownIds.has(id) || isStaleEntry(entry)) continue;
      shownIds.add(id);
      out.push(entry);
    }
    return out;
  };
  // Today's real prayer times, shared by the strip and the adhkar windows
  // (one computation, two readers — see resolveBrowserWindow above).
  const { prayerTimes, nowWindow } = resolveBrowserWindow(state);

  const recentEntries = takeFresh(
    state.history
      .slice(0, 3)
      .map((h) => state.library.itemIndex[h.itemId])
      .filter(Boolean)
  );
  const favEntries = takeFresh(
    state.favorites
      .slice(0, 3)
      .map((id) => state.library.itemIndex[id])
      .filter(Boolean)
  );
  const pinnedCollections = state.collections.slice(0, 3);

  // Active non-main profile rides the hero as a tappable chip (into
  // Settings → profiles) so nobody mistakes whose streaks these are.
  const profile = (state.profiles || []).find((p) => p.id === state.activeProfile);
  const profileChip = profile
    ? `
      <a class="chip chip--active home-hero__profile" href="${buildHash(VIEWS.SETTINGS)}" data-action="navigate" data-view="${VIEWS.SETTINGS}">${icon('folder', { size: 13 })} ${escapeHTML(profile.name)}</a>`
    : '';

  // Home panels as an id-keyed map: the user's saved order + hides
  // (settings.homeOrder / hiddenHome) rearrange them below. Conditional
  // panels evaluate to '' when they have nothing to say, exactly as before.
  const homePanels = {
    ramadan: (() => {
      const { inRamadan, hijri } = ramadanInfo(new Date());
      return inRamadan
        ? `
    <a class="panel panel--ramadan-banner" href="${buildHash(VIEWS.RAMADAN)}" data-action="navigate" data-view="${VIEWS.RAMADAN}">
      <span class="panel--ramadan-banner__icon">${icon('rayah', { size: 22 })}</span>
      <span class="panel--ramadan-banner__text">
        <span class="panel--ramadan-banner__label">${t('ramadan.bannerTitle', lang)}</span>
        <span class="panel--ramadan-banner__sub">${t('ramadan.bannerSub', lang, { n: hijri.day })}</span>
      </span>
      ${goIcon(lang, 18)}
    </a>`
        : '';
    })(),
    checklist: `
    <a class="panel panel--checklist-summary-link" href="${buildHash(VIEWS.CHECKLIST)}" data-action="navigate" data-view="${VIEWS.CHECKLIST}">
      <span class="panel--checklist-summary-link__icon">${icon('target', { size: 22 })}</span>
      <span class="panel--checklist-summary-link__text">
        <span class="panel--checklist-summary-link__label">${t('you.myAdhkar', lang)}</span>
        <span class="panel--checklist-summary-link__sub" dir="ltr">${completedCount(selectors.todayChecklist(state))} / ${CHECKLIST_ITEMS.length} ${t('checklist.today', lang)}</span>
      </span>
      ${goIcon(lang, 18)}
    </a>`,
    // (merged-plan item 2) the unified last-position resume: seven
    // slots, one honest record (see resumePanelHTML above). The panel id
    // stays 'continue' so saved orders and hides keep working.
    continue: resumePanelHTML(state),
    // (v5.17.57, merged-plan item 10) the progress panel carries no
    // streak KPI: counts live in the private ledger (Statistics), Home
    // keeps the day's bar only — pause, never fail.
    progress:
      today?.recitations > 0
        ? `
    <section class="panel panel--progress">
      <div class="panel__header">
        <h2>${t('home.dailyProgress', lang)}</h2>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${t('home.dailyProgress', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
      </div>
      <p class="panel__subtext" dir="ltr">${escapeHTML(String(today?.recitations || 0))} / ${escapeHTML(String(goal))}</p>
    </section>`
        : `
    <section class="panel panel--progress panel--progress-empty">
      <div class="panel--progress-empty__icon" aria-hidden="true">${icon('sparkle', { size: 20 })}</div>
      <div class="panel--progress-empty__text">
        <h2>${t('home.dailyProgress', lang)}</h2>
        <p class="panel__subtext">${escapeHTML(t('home.startYourDay', lang))}</p>
      </div>
      <a class="link-btn link-btn--sm" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${escapeHTML(t('nav.azkar', lang))} ${goIcon(lang, 12)}</a>
    </section>`,
    verse: daily
      ? `
    <section class="panel panel--reflection">
      <div class="panel__header"><h2>${t('home.verseOfTheDay', lang)}</h2></div>
      ${cardHTML(daily.item, daily.category, { lang, isFavorite: selectors.isFavorite(state, daily.item.id), isSpeaking: state.speakingItemId === daily.item.id, isPlayingAudio: state.dhikrAudioItemId === daily.item.id, counter: selectors.getCounter(state, daily.item.id), showTransliteration: state.settings.showTransliteration, showTranslation: state.settings.showTranslation, compact: true, fields: fieldTogglesFor(state, daily.document?.metadata?.id) })}
      <div class="chip-row chip-row--scroll" role="group" aria-label="${escapeHTML(t('home.verseTheme', lang))}">
        ${DAILY_THEMES.map(
          (th) => `
        <button type="button" class="chip chip--sm ${state.settings.dailyAyahTheme === th || (!state.settings.dailyAyahTheme && th === 'any') ? 'chip--active' : ''}" data-action="set-setting" data-key="dailyAyahTheme" data-value="${th}" aria-pressed="${state.settings.dailyAyahTheme === th || (!state.settings.dailyAyahTheme && th === 'any')}">${escapeHTML(t(`home.theme.${th}`, lang))}</button>`
        ).join('')}
      </div>
    </section>`
      : '',
    hadith: dailyHadithCardHTML(state),
    hifz: hifzReviewCardHTML(state),
    review: reviewDigestCardHTML(state),
    worship: worshipTodayCardHTML(state),
    recent: recentEntries.length
      ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('home.panel.recent', lang)}</h2></div>
      <div class="card-row">
        ${recentEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: selectors.isFavorite(state, e.item.id), isSpeaking: state.speakingItemId === e.item.id, isPlayingAudio: state.dhikrAudioItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false, fields: fieldTogglesFor(state, e.document?.metadata?.id) })).join('')}
      </div>
    </section>`
      : emptyStateHTML({
          iconName: 'book',
          title: t('home.blankPage', lang),
          hint: t('home.noRecent', lang),
          actionHTML: `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}">${escapeHTML(t('nav.home', lang))}</a>`,
        }),
    favorites: favEntries.length
      ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.favorites', lang)}</h2>
        <a href="${buildHash(VIEWS.FAVORITES)}" data-action="navigate" data-view="${VIEWS.FAVORITES}" aria-label="${t('home.viewAll.favorites', lang)}">${goIcon(lang, 16)}</a>
      </div>
      <div class="card-row">
        ${favEntries.map((e) => cardHTML(e.item, e.category, { lang, isFavorite: true, isSpeaking: state.speakingItemId === e.item.id, isPlayingAudio: state.dhikrAudioItemId === e.item.id, counter: selectors.getCounter(state, e.item.id), compact: true, showTranslation: false, fields: fieldTogglesFor(state, e.document?.metadata?.id) })).join('')}
      </div>
    </section>`
      : '',
    collections: pinnedCollections.length
      ? `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('home.collections', lang)}</h2>
        <a href="${buildHash(VIEWS.COLLECTIONS)}" data-action="navigate" data-view="${VIEWS.COLLECTIONS}" aria-label="${t('home.viewAll.collections', lang)}">${goIcon(lang, 16)}</a>
      </div>
      <div class="chip-row">
        ${pinnedCollections.map((c) => `<a class="chip chip--collection" href="${buildHash(VIEWS.COLLECTION, { id: c.id })}" data-action="navigate" data-view="${VIEWS.COLLECTION}" data-id="${escapeHTML(c.id)}">${escapeHTML(pickLocale(c.name, lang))} <span class="chip__count">${c.items.length}</span></a>`).join('')}
      </div>
    </section>`
      : '',
  };
  const orderedHomePanels = resolveHomePanels(state.settings.homeOrder, state.settings.hiddenHome)
    .map((id) => homePanels[id] || '')
    .join('');

  // (IA-7) the page's argument, in order: the shahada, where you are
  // today (prayer ribbon + one slim today-strip answering "how am I
  // doing"), the explicit tasbih entry, then the brand hero, the wizard,
  // the quick tiles and every panel in the reader's own order. The adhkar
  // grid is NOT here anymore: it moved to its own Azkar section
  // (#/library), which reuses the browser component below — Home is a
  // Today landing, and the grid owns its own door.
  return `
  <section class="view view--home">
    ${shahadaBannerHTML(lang)}

    ${prayerRibbonHTML(state, lang, prayerTimes)}

    ${libraryErrorHTML(state, lang)}

    ${nudgeCardHTML(state)}

    ${homeTodayStripHTML(state)}

    ${onboardingPanelHTML(state, lang)}

    <div class="home-hero home-hero--line">
      <h1 class="home-hero__title">${t('app.name', lang)}</h1>
      <p class="home-hero__tagline">${t('app.tagline', lang)}</p>
      <p class="home-hero__greeting">${t(greetingKey(), lang)}${hijriChipHTML(lang)}</p>
      ${profileChip}
      ${state.statistics?.totalRecitations === 1 ? `<p class="home-hero__seed" dir="auto">${escapeHTML(t('home.firstSeed', lang))}</p>` : ''}
    </div>

    ${quickTilesHTML(
      resolveQuickTiles({
        order: state.settings.quickOrder,
        hidden: state.settings.hiddenQuick,
        visits: state.tileVisits,
        // Home is the daily landing, not a second application launcher.
        // Settings still exposes the full registry; the landing surfaces the
        // first four user-selected/usage-ranked shortcuts only.
        limit: 4,
      }),
      lang,
      nowWindow
    )}

    ${orderedHomePanels}
  </section>`;
}

/**
 * hifzReviewCardHTML — moved here from views/quran.js (v5.2.18).
 * It is a Home panel, and Home importing it from the classic reader
 * pulled the whole reader into the boot parse. Moved verbatim.
 */
/**
 * v3.17 Home card: the hifz review queue. Due surahs (oldest first) link
 * straight into memorize mode (#/quran/N?mem=1); when the Mushaf meta is
 * already in memory, surahs fully READ via the khatma page-tracking but not
 * yet memorized are offered as honest "ready to memorize" suggestions.
 * Computed from persisted records only — zero network, zero boot cost; the
 * card is silently absent until the person has actually marked something.
 *
 * (v5.17.57, merged-plan item 10) the gentle queue: the title is
 * "Available review", chips carry names only (no +N overdue, no due-today
 * line, no totals) — counts live in the private ledger (Statistics),
 * linked below. Pause-not-fail: pausing is stated, loss never implied.
 */
export function hifzReviewCardHTML(state) {
  const lang = state.settings.language;
  const records = state.hifzRecords ?? {};
  const memorized = countMemorized(records);
  // (review v3.21): count BEFORE the display cap — the cap bounds chips,
  // never words: Home shows no counts at all now (ledger keeps them).
  const dueAll = dueSurahs(records);
  const due = dueAll.slice(0, 4);
  const surahMetas = state.quran.meta?.surahs ?? null;
  const nameOf = (n) => {
    const s = surahMetas?.find((x) => Number(x.number) === n);
    return s ? (lang === 'ar' ? s.nameAr : s.nameTransliteration) : `#${n}`;
  };
  const suggestions =
    state.mushaf.meta?.ayahPages && surahMetas
      ? suggestFromKhatma(
          records,
          state.mushafPagesRead,
          state.mushaf.meta.ayahPages,
          surahMetas,
          3
        )
      : [];
  if (!memorized && !suggestions.length) return '';

  const dueChips = due
    .map(
      (d) => `
      <a class="chip" href="${buildHash(VIEWS.QURAN, { id: d.surah, mem: '1' })}" title="${t('hifz.memorizedBadge', lang, { date: d.due })}">
        ${escapeHTML(nameOf(d.surah))}
      </a>`
    )
    .join('');
  const suggChips = suggestions
    .map(
      (s) => `
      <a class="chip" href="${buildHash(VIEWS.QURAN, { id: s.surah })}">${escapeHTML(nameOf(s.surah))}</a>`
    )
    .join('');

  return `
  <section class="panel panel--hifz">
    <div class="panel__header">
      <h2>${icon('target', { size: 16 })} ${t('hifz.cardTitle', lang)}</h2>
    </div>
    <p class="panel__subtext">${escapeHTML(t('hifz.availableHint', lang))}</p>
    ${dueChips ? `<div class="chip-row chip-row--scroll">${dueChips}</div>` : ''}
    ${
      suggChips
        ? `
    <p class="panel__subtext">${t('hifz.suggestHint', lang)}</p>
    <div class="chip-row chip-row--scroll">${suggChips}</div>`
        : ''
    }
    <p><a class="btn btn--ghost btn--sm" href="${buildHash(VIEWS.STATISTICS)}" data-action="navigate" data-view="${VIEWS.STATISTICS}">${escapeHTML(t('hifz.openLedger', lang))} ${goIcon(lang, 14)}</a></p>
  </section>`;
}

/**
 * (v5.6.0, B-1) "Due for review" digest: one daily nudge aggregating the
 * three persisted memories — hifz lapses (surah + ayah level), 99-names
 * quiz misses, tajweed weak rules — into deep links per row. Silent until
 * anything is actually due. Links only; the owning views keep the detail
 * (this panel never duplicates them).
 *
 * (v5.17.57, merged-plan item 10) the gentle ledger door: no total badge,
 * no per-row counts — counts live in the private ledger (Statistics),
 * linked below. Pause-not-fail: pausing is stated, loss never implied.
 */
export function reviewDigestCardHTML(state) {
  const lang = state.settings.language;
  const hifzDue = dueCounts(state.hifzRecords ?? {}, state.hifzAyahRecords ?? {});
  const hifzN = (hifzDue.surahs || 0) + (hifzDue.ayahs || 0);
  const quizN = Object.keys(state.quizMissRecords ?? {}).length;
  const tajweedN = Object.keys(state.tajweedMissRecords ?? {}).length;
  const total = hifzN + quizN + tajweedN;
  if (!total) return '';

  const dueList = dueSurahs(state.hifzRecords ?? {});
  const hifzHref =
    dueList.length > 0
      ? buildHash(VIEWS.QURAN, { id: dueList[0].surah, mem: '1' })
      : buildHash(VIEWS.QURAN);
  const row = (inner) => `
      <div class="review-digest__row">${inner}</div>`;
  return `
  <section class="panel panel--review-digest">
    <div class="panel__header">
      <h2>${icon('repeat', { size: 16 })} ${t('home.reviewTitle', lang)}</h2>
    </div>
    <p class="panel__subtext">${escapeHTML(t('home.reviewGentle', lang))}</p>
    <div class="review-digest__rows">
      ${hifzN ? row(`<a class="chip" href="${hifzHref}" data-action="navigate" data-view="${VIEWS.QURAN}">${escapeHTML(t('home.reviewHifz', lang))}</a>`) : ''}
      ${quizN ? row(`<a class="chip" href="${buildHash(VIEWS.QUIZ)}" data-action="navigate" data-view="${VIEWS.QUIZ}">${escapeHTML(t('quiz.title', lang))}</a>`) : ''}
      ${tajweedN ? row(`<button type="button" class="chip" data-action="practice-start" data-rule="review">${icon('repeat', { size: 13 })} ${escapeHTML(t('practice.reviewMistakes', lang))}</button>`) : ''}
    </div>
    <p><a class="btn btn--ghost btn--sm" href="${buildHash(VIEWS.STATISTICS)}" data-action="navigate" data-view="${VIEWS.STATISTICS}">${escapeHTML(t('hifz.openLedger', lang))} ${goIcon(lang, 14)}</a></p>
  </section>`;
}

/**
 * (v5.2.29) Sadaqah amount/note editor — the recorded v3.19 follow-up.
 * A modal form (amount + note, both optional) over the recent-gifts list;
 * amounts are display-only per entry and never summed (gifts may mix
 * currencies). Pure template — `sadaqah-entry` in app/forms.js logs,
 * `sadaqah-remove` deletes (rebuilt in place when the modal is open).
 */
export function buildSadaqahEditor(state) {
  const lang = state.settings.language;
  const log = Array.isArray(state.sadaqahLog) ? state.sadaqahLog : [];
  const fmtDay = (ts) => {
    try {
      return new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  };
  const rows = log
    .slice(0, 20)
    .map(
      (e) => `
      <div class="prayer-row">
        <span class="prayer-row__icon">${icon('coins', { size: 18 })}</span>
        <span class="prayer-row__name">${escapeHTML(fmtDay(e.ts))}${e.note ? ` · ${escapeHTML(e.note)}` : ''}</span>
        ${e.amount != null ? `<span class="prayer-row__time" dir="ltr">${escapeHTML(String(e.amount))}</span>` : ''}
        <button type="button" class="icon-btn icon-btn--sm" data-action="sadaqah-remove" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 15 })}</button>
      </div>`
    )
    .join('');

  return `
  <div class="sadaqah-editor">
    <h2 id="modal-title-sadaqah">${t('worship.sadaqahEditor', lang)}</h2>
    <form class="editor-form" data-form="sadaqah-entry">
      <label class="field">${escapeHTML(t('worship.sadaqahAmount', lang))}<input class="input" type="number" min="0" step="any" inputmode="decimal" dir="ltr" name="amount" placeholder="0.00" /></label>
      <label class="field">${escapeHTML(t('worship.sadaqahNote', lang))}<input class="input" name="note" maxlength="200" placeholder="${escapeHTML(t('worship.sadaqahNotePlaceholder', lang))}" /></label>
      <div class="editor-form__actions">
        <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
        <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
      </div>
    </form>
    <div class="panel__header panel__header--sub"><h3>${t('worship.sadaqahHistory', lang)}</h3></div>
    ${rows || `<p class="empty-hint">${t('worship.sadaqahEmpty', lang)}</p>`}
  </div>`;
}
