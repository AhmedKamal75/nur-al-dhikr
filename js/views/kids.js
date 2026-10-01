/**
 * views/kids.js — Kids mode home: big tiles, short surahs, plain count.
 *
 * Degamified (v5.17.58, merged-plan item 11): no points, no stars, no
 * levels, no week chart, no per-surah breakdown, no erase path. A calm
 * skin over the same verse engine adults use — nothing here plays
 * audio any differently; it only offers a smaller world: Al-Fatiha plus
 * the short surahs at the end of the Mushaf, a giant tasbih door, and a
 * plain lifetime count of finished listens. The memory quiz is play
 * without awards. Parents enter through Settings; kids leave through
 * the hold-to-exit button (2s press, wired in app/events.js) which
 * opens the parent gate and switches the mode back off.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { skeletonSurahList } from '../ui/skeleton.js';
import { KIDS_SURAHS } from '../domain/kids.js';

/** Re-exported for existing importers (tests, handlers use domain directly). */
export { KIDS_SURAHS };

/** The kids' surah list lives in domain/kids.js (see re-export above). */

/**
 * (v5.17.58, merged-plan item 11) the surah-name memory game: "tap the
 * surah of X" with four big tiles. Play only — a correct first tap earns
 * nothing (the result line is the whole feedback; the handler owns the
 * session, this only renders).
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
  const heard = state.kidsHeard && typeof state.kidsHeard === 'object' ? state.kidsHeard : {};
  const total = Math.floor(Number(heard.total));
  const heardTotal = Number.isFinite(total) && total > 0 ? Math.min(total, 1000000) : 0;
  // (v5.17.58, merged-plan item 11) degamified: a plain lifetime count of
  // finished listens plus the live quiz session (ephemeral). No levels,
  // no week chart, no per-surah table, no erase path.
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

    <section class="panel panel--kids-heard" aria-live="polite">
      <div class="kids-heard__text">
        <span class="kids-heard__total" dir="ltr">${heardTotal}</span>
        <span class="kids-heard__label">${t('kids.heard', lang)}</span>
      </div>
      <p class="panel__subtext">${t('kids.heardHint', lang)}</p>
    </section>

    <h2 class="kids-section-title">${t('kids.listen', lang)}</h2>
    <p class="panel__subtext">${t('kids.listenHint', lang)}</p>
    <div class="kids-grid">${tiles}</div>

    ${renderKidsQuiz(state, lang, meta, quiz)}

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
