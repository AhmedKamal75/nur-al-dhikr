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
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { skeletonSurahList } from '../ui/skeleton.js';
import { kidsLevelFor, kidsWeek, KIDS_SURAHS } from '../domain/kids.js';

/** Re-exported for existing importers (tests, handlers use domain directly). */
export { KIDS_SURAHS };

/** The kids' surah list lives in domain/kids.js (see re-export above). */

/**
 * (v5.10.1) the surah-name memory game: "tap the surah of X" with four big
 * tiles. A correct first tap earns a star through the same KIDS_AWARD_STAR
 * path as listening (the handler owns the award, this only renders).
 */
function renderKidsQuiz(state, lang, meta, quiz) {
  if (!meta) return '';
  if (!quiz) {
    return `
    <section class="panel panel--kids-quiz" aria-label="${t('kids.quiz', lang)}">
      <h2 class="kids-section-title">${t('kids.quiz', lang)}</h2>
      <p class="panel__subtext">${t('kids.quizHint', lang)}</p>
      <button type="button" class="btn btn--primary" data-action="kids-quiz-start">${icon('play', { size: 18 })} ${t('kids.quizStart', lang)}</button>
    </section>`;
  }
  const targetName = quiz.options.find((o) => o.n === quiz.target)?.nameAr || `#${quiz.target}`;
  if (quiz.answered == null) {
    return `
    <section class="panel panel--kids-quiz" aria-label="${t('kids.quiz', lang)}" aria-live="polite">
      <h2 class="kids-section-title">${t('kids.quiz', lang)}</h2>
      <p class="kids-quiz__question" dir="auto">${t('kids.quizQuestion', lang, { name: targetName })}</p>
      <div class="kids-grid">${quiz.options
        .map(
          (o) => `
        <div class="kids-tile-wrap">
          <button type="button" class="kids-tile kids-tile--quiz" data-action="kids-quiz-answer" data-surah="${o.n}" aria-label="${escapeHTML(o.nameAr)}">
            <span class="kids-tile__name-ar" dir="rtl" lang="ar">${escapeHTML(o.nameAr)}</span>
          </button>
        </div>`
        )
        .join('')}</div>
      <button type="button" class="link-btn" data-action="kids-quiz-exit">${t('kids.quizClose', lang)}</button>
    </section>`;
  }
  const won = quiz.answered === quiz.target;
  return `
    <section class="panel panel--kids-quiz" aria-label="${t('kids.quiz', lang)}" aria-live="polite">
      <h2 class="kids-section-title">${t('kids.quiz', lang)}</h2>
      <p class="kids-quiz__result" dir="auto">${
        won ? t('kids.quizWin', lang) : t('kids.quizMiss', lang, { name: targetName })
      }</p>
      <div class="kids-quiz__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="kids-quiz-start">${icon('play', { size: 16 })} ${t('kids.quizAgain', lang)}</button>
        <button type="button" class="link-btn" data-action="kids-quiz-exit">${t('kids.quizClose', lang)}</button>
      </div>
    </section>`;
}

export function renderKids(state) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const sp = state.surahPlayback;
  const stars = state.kidsStars && typeof state.kidsStars === 'object' ? state.kidsStars : {};
  const total = Number(stars.total) || 0;
  const today = Number(stars.days?.[dateKey(new Date())]) || 0;
  // (v5.10.1) progression: level derived from the lifetime total, week +
  // per-surah breakdown for the parent panel, live quiz session (ephemeral).
  const { level, next, progress } = kidsLevelFor(total);
  const week = kidsWeek(stars.days);
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const bySurah = stars.bySurah && typeof stars.bySurah === 'object' ? stars.bySurah : {};
  const quiz = state.kidsQuiz || null;

  // (v5.2.74, BUG-04) same honesty as the surah list: a failed quran-meta
  // fetch renders error + Retry instead of an infinite skeleton.
  const tiles = !meta
    ? state.loadErrors?.['quran-meta']
      ? loadErrorStateHTML({ lang, tierKey: 'quran-meta', t })
      : skeletonSurahList(lang)
    : KIDS_SURAHS.map((n) => {
        const m = meta.surahs?.find((x) => Number(x.number) === n);
        const nameAr = m?.nameAr || '';
        // (v5.2.68) the Latin name is English-UI-only (strict contract);
        // the Arabic name is always present, so nothing is lost in AR.
        const nameEn = lang === 'ar' ? '' : m?.nameTransliteration || m?.nameEn || `#${n}`;
        const playing = sp?.active && Number(sp.surah) === n;
        return `
      <div class="kids-tile-wrap">
        <button type="button" class="kids-tile ${playing ? 'kids-tile--playing' : ''}" data-action="surah-play" data-surah="${n}" aria-label="${escapeHTML(nameEn || nameAr)} — ${t(playing ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}" aria-pressed="${playing}">
          <span class="kids-tile__play">${icon(playing ? 'stop' : 'play', { size: 30 })}</span>
          <span class="kids-tile__name-ar" dir="rtl" lang="ar">${escapeHTML(nameAr)}</span>
          ${nameEn ? `<span class="kids-tile__name-en">${escapeHTML(nameEn)}</span>` : ''}
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

    <section class="panel panel--kids-level" aria-label="${t('kids.level', lang)}">
      <span class="kids-level__icon" aria-hidden="true">${icon('award', { size: 26 })}</span>
      <div class="kids-level__text">
        <span class="kids-level__name">${t('kids.level', lang)}: ${t(`kids.level.${level.id}`, lang)}</span>
        <span class="panel__subtext">${
          next
            ? t('kids.toNext', lang, {
                n: next.at - total,
                level: t(`kids.level.${next.id}`, lang),
              })
            : t('kids.maxLevel', lang)
        }</span>
      </div>
      <div class="kids-level__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}" aria-label="${t('kids.level', lang)}">
        <span class="kids-level__bar-fill" style="--fill:${Math.round(progress * 100)}%"></span>
      </div>
    </section>

    <h2 class="kids-section-title">${t('kids.listen', lang)}</h2>
    <p class="panel__subtext">${t('kids.listenHint', lang)}</p>
    <div class="kids-grid">${tiles}</div>

    ${renderKidsQuiz(state, lang, meta, quiz)}

    <section class="panel panel--kids-parent" aria-label="${t('kids.parent', lang)}">
      <h2 class="kids-section-title">${t('kids.parent', lang)}</h2>
      <p class="panel__subtext">${t('kids.parentHint', lang)}</p>
      <h3 class="kids-parent__subtitle">${t('kids.weekTitle', lang)}</h3>
      ${
        week.some((d) => d.count > 0)
          ? `<ol class="kids-week" dir="ltr">${week
              .map(
                (d) => `
            <li class="kids-week__day">
              <span class="kids-week__bar" style="--bar-h:${4 + Math.round((d.count / weekMax) * 44)}px" title="${escapeHTML(d.key)}: ${d.count}"></span>
              <span class="kids-week__key">${escapeHTML(d.key.slice(5))}</span>
              <span class="kids-week__count" dir="ltr">${d.count}</span>
            </li>`
              )
              .join('')}</ol>`
          : `<p class="panel__subtext">${t('kids.noStarsYet', lang)}</p>`
      }
      ${
        Object.keys(bySurah).length
          ? `<h3 class="kids-parent__subtitle">${t('kids.bySurah', lang)}</h3>
      <ul class="kids-bysurah">${KIDS_SURAHS.filter((n) => bySurah[n] > 0)
        .map((n) => {
          const m = meta?.surahs?.find((x) => Number(x.number) === n);
          return `<li><span dir="rtl" lang="ar">${escapeHTML(m?.nameAr || `#${n}`)}</span> <span class="kids-bysurah__count" dir="ltr">${bySurah[n]}</span></li>`;
        })
        .join('')}</ul>`
          : ''
      }
    </section>

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
