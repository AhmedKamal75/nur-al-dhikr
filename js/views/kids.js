/**
 * views/kids.js — Kids mode home: big tiles, short surahs, stars.
 *
 * A calm skin over the same verse engine adults use — nothing here plays
 * audio any differently; it only offers a smaller world: Al-Fatiha plus
 * the short surahs at the end of the Mushaf, a giant tasbih door, and a
 * star for every surah listened to the very end. Parents enter through
 * Settings; kids leave through the hold-to-exit button (2s press, wired
 * in app/events.js) which also switches the mode back off.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML, dateKey } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { skeletonSurahList } from '../ui/skeleton.js';

/** The kids' surah list: Al-Fatiha + the short closing surahs. */
export const KIDS_SURAHS = Object.freeze([
  1, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
  113, 114,
]);

export function renderKids(state) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const sp = state.surahPlayback;
  const stars = state.kidsStars && typeof state.kidsStars === 'object' ? state.kidsStars : {};
  const today = Number(stars.days?.[dateKey(new Date())]) || 0;

  const tiles = !meta
    ? skeletonSurahList(lang)
    : KIDS_SURAHS.map((n) => {
        const m = meta.surahs?.find((x) => Number(x.number) === n);
        const nameAr = m?.nameAr || '';
        const nameEn = m?.nameTransliteration || m?.nameEn || `#${n}`;
        const playing = sp?.active && Number(sp.surah) === n;
        return `
      <div class="kids-tile-wrap">
        <button type="button" class="kids-tile ${playing ? 'kids-tile--playing' : ''}" data-action="surah-play" data-surah="${n}" aria-label="${escapeHTML(nameEn)} — ${t(playing ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}" aria-pressed="${playing}">
          <span class="kids-tile__play">${icon(playing ? 'stop' : 'play', { size: 30 })}</span>
          <span class="kids-tile__name-ar" dir="rtl">${escapeHTML(nameAr)}</span>
          <span class="kids-tile__name-en">${escapeHTML(nameEn)}</span>
        </button>
      </div>`;
      }).join('');

  return `
  <section class="view view--kids">
    <p class="kids-hello" dir="auto">${t('kids.hello', lang)}</p>
    <h1 class="sr-only">${t('kids.title', lang)}</h1>

    <section class="panel panel--kids-stars" aria-live="polite">
      <span class="kids-stars__icon" aria-hidden="true">${icon('star', { size: 30 })}</span>
      <div class="kids-stars__text">
        <span class="kids-stars__total" dir="ltr">${Number(stars.total) || 0}</span>
        <span class="kids-stars__label">${t('kids.stars', lang)} · ${t('kids.todayStars', lang, { n: today })}</span>
      </div>
      <p class="panel__subtext">${t('kids.starsHint', lang)}</p>
    </section>

    <h2 class="kids-section-title">${t('kids.listen', lang)}</h2>
    <p class="panel__subtext">${t('kids.listenHint', lang)}</p>
    <div class="kids-grid">${tiles}</div>

    <a class="kids-tasbih" href="${buildHash(VIEWS.TASBIH)}" data-action="navigate" data-view="${VIEWS.TASBIH}">
      ${icon('bead', { size: 34 })}
      <span class="kids-tasbih__label">${t('kids.tasbih', lang)}</span>
      <span class="panel__subtext">${t('kids.tasbihHint', lang)}</span>
    </a>

    <button type="button" class="kids-exit" data-action="kids-exit-hold">
      <span class="kids-exit__fill" aria-hidden="true"></span>
      ${icon('close', { size: 16 })} ${t('kids.exit', lang)}
    </button>
    <p class="panel__subtext kids-exit__hint">${t('kids.exitHint', lang)}</p>
  </section>`;
}
