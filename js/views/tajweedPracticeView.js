/**
 * views/tajweedPracticeView.js
 * Templates for the "find the rule" drill mode. The interactive round is
 * rendered fresh (via openModal again) on every tap — session state lives
 * in app/practice.js as module-scoped transient state, the same pattern
 * already used for the flip direction and active tafsir tab, since a
 * half-tapped quiz round has no business being persisted or undo-able.
 *
 * (v5.4.0, P0-5b — ported from the v5.3.0 audit) Gamified rounds: a round
 * is 5 questions with a live progress HUD and streak, rule rows carry
 * derived level badges (learner/steady/strong — descriptive, never
 * judgmental), and a summary screen closes each round with a
 * Review-mistakes path backed by the persisted weak-rule memory.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { TAJWEED_RULES, TAJWEED_FAMILIES, tajweedRule, wordUnits } from '../domain/tajweed.js';
import { accuracyFor, practiceLevel, PRACTICE_ROUND_SIZE } from '../domain/tajweedPractice.js';

const LEVEL_I18N = { 1: 'practice.level1', 2: 'practice.level2', 3: 'practice.level3' };

/** The entry screen: pick a rule to drill, or "Mixed," with stats, level
 *  badges and — when the weak-rule memory is non-empty — a Review path. */
export function buildPracticePicker(state) {
  const lang = state.settings.language;
  const stats = state.tajweedPracticeStats;
  const overall = accuracyFor(stats);
  const missedRules = Object.keys(state.tajweedMissRecords || {}).length;

  const ruleRow = (rule) => {
    const acc = accuracyFor(stats, rule.id);
    const level = practiceLevel(stats, rule.id);
    return `
    <div class="practice-rule-row">
      <button type="button" class="practice-rule" data-action="practice-start" data-rule="${rule.id}">
        <span class="practice-rule__swatch" style="background:${rule.color}"></span>
        <span class="practice-rule__text">
          <span class="practice-rule__name">${escapeHTML(pickLocale(rule.name, lang))}</span>
          <span class="practice-rule__acc">${acc == null ? t('practice.notYet', lang) : t('practice.accuracy', lang, { n: acc })}</span>
        </span>
        <span class="practice-rule__level practice-rule__level--${level}">${t(LEVEL_I18N[level], lang)}</span>
        ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 16, className: 'practice-rule__chevron' })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm practice-rule__learn" data-action="practice-lesson" data-rule="${rule.id}" aria-label="${t('practice.lesson', lang)} — ${escapeHTML(pickLocale(rule.name, lang))}" title="${t('practice.lesson', lang)}">${icon('book', { size: 15 })}</button>
    </div>`;
  };

  return `
  <div class="tajweed-practice">
    <h2 id="modal-title-practice">${t('practice.title', lang)}</h2>
    <p class="panel__subtext">${t('practice.intro', lang)}</p>

    ${
      stats.totalAttempts > 0
        ? `
    <div class="practice-stats">
      <div class="practice-stats__item"><strong>${overall}%</strong><span>${t('practice.overallAccuracy', lang)}</span></div>
      <div class="practice-stats__item"><strong>${stats.currentStreak}</strong><span>${t('practice.currentStreak', lang)}</span></div>
      <div class="practice-stats__item"><strong>${stats.bestStreak}</strong><span>${t('practice.bestStreak', lang)}</span></div>
    </div>`
        : ''
    }

    <button type="button" class="btn btn--primary practice-mixed-btn" data-action="practice-start" data-rule="mixed">
      ${icon('sparkle', { size: 16 })} ${t('practice.mixed', lang)}
    </button>

    ${
      missedRules
        ? `
    <button type="button" class="btn btn--secondary practice-review-btn" data-action="practice-start" data-rule="review">
      ${icon('repeat', { size: 16 })} ${t('practice.reviewMistakes', lang)}
      <span class="practice-review-count">${missedRules}</span>
    </button>
    <p class="panel__subtext practice-review-hint">${t('practice.reviewHint', lang)}</p>`
        : ''
    }

    <div class="practice-rule-list">${TAJWEED_RULES.map(ruleRow).join('')}</div>
  </div>`;
}

/** The active round: an ayah with every letter tappable, a Check button,
 *  and (once checked) color-coded feedback + a Next/Change-rule/Done bar.
 *  (P0-5b) rounds carry a "question n of N" HUD + live streak counter. */
export function buildPracticeRound(state, session) {
  const lang = state.settings.language;
  const isReview = session.ruleId === 'review';
  const rule = session.ruleId === 'mixed' || isReview ? null : tajweedRule(session.ruleId);
  const title = rule
    ? escapeHTML(pickLocale(rule.name, lang))
    : t(isReview ? 'practice.reviewMistakes' : 'practice.mixed', lang);
  const instructions = isReview
    ? t('practice.instructionsReview', lang)
    : t('practice.instructions', lang, { rule: title });

  const words = session.text.trim().split(/\s+/).filter(Boolean);
  const wordsHtml = words
    .map((word, idx) => {
      const wIndex = idx + 1;
      const units = wordUnits(word);
      const letters = units
        .map((u) => {
          const key = `${wIndex}:${u.start}:${u.end}`;
          const text = escapeHTML(word.slice(u.start, u.end));
          if (!session.checked) {
            const selected = session.selected.has(key);
            return `<span class="pu ${selected ? 'pu--selected' : ''}" data-action="practice-tap" data-word="${wIndex}" data-start="${u.start}" data-end="${u.end}" tabindex="0" role="button">${text}</span>`;
          }
          const isTarget = session.targets.some(
            (tg) => tg.word === wIndex && tg.start === u.start && tg.end === u.end
          );
          const wasSelected = session.selected.has(key);
          let cls = '';
          if (isTarget && wasSelected) cls = 'pu--correct';
          else if (isTarget && !wasSelected) cls = 'pu--missed';
          else if (!isTarget && wasSelected) cls = 'pu--wrong';
          return `<span class="pu ${cls}">${text}</span>`;
        })
        .join('');
      return `<span class="practice-word">${letters}</span>`;
    })
    .join(' ');

  const resultHtml = session.checked
    ? `
    <div class="practice-result ${session.result.perfect ? 'practice-result--perfect' : ''}" role="status" aria-live="polite">
      <p class="practice-result__headline">${t(session.result.perfect ? 'practice.perfect' : 'practice.notQuite', lang)}</p>
      <div class="practice-result__legend" aria-hidden="true">
        <span><span class="pu-dot pu-dot--correct"></span> ${t('practice.legendCorrect', lang)}</span>
        <span><span class="pu-dot pu-dot--missed"></span> ${t('practice.legendMissed', lang)}</span>
        <span><span class="pu-dot pu-dot--wrong"></span> ${t('practice.legendWrong', lang)}</span>
      </div>
      <p class="sr-only">${t('practice.scoreSr', lang, { hit: session.result.correct.length, total: session.result.targetCount })}</p>
    </div>`
    : '';

  const roundHud =
    session.mode === 'round'
      ? `
    <div class="practice-round__hud" aria-live="polite">
      <span class="practice-round__progress" dir="ltr">${t('practice.questionOf', lang, {
        n: session.qIndex + 1,
        total: session.questions.length || PRACTICE_ROUND_SIZE,
      })}</span>
      ${
        session.roundStreak > 1
          ? `<span class="practice-round__streak">${t('practice.streakOn', lang, { n: session.roundStreak })}</span>`
          : ''
      }
    </div>`
      : '';

  return `
  <div class="tajweed-practice tajweed-practice--round">
    <h2 id="modal-title-practice" class="sr-only">${title}</h2>
    <p class="practice-round__rule">${title}</p>
    ${roundHud}
    <p class="panel__subtext">${instructions}</p>

    <div class="practice-ayah" dir="rtl" lang="ar">${wordsHtml}</div>
    <p class="practice-round__ref" dir="ltr">${session.surah}:${session.ayah}</p>

    ${resultHtml}

    <div class="practice-actions">
      ${
        !session.checked
          ? `
        <button type="button" class="btn btn--primary" data-action="practice-check" ${session.selected.size === 0 ? 'disabled' : ''}>${t('practice.check', lang)}</button>
      `
          : `
        <button type="button" class="btn btn--primary" data-action="practice-next">${t(session.mode === 'round' && session.qIndex + 1 >= session.questions.length ? 'practice.seeSummary' : 'practice.next', lang)}</button>
      `
      }
      <button type="button" class="btn btn--secondary btn--sm" data-action="practice-open">${t('practice.changeRule', lang)}</button>
    </div>
  </div>`;
}

/** End-of-round summary: gentle, factual, shame-free. Clean count, the
 *  round's best streak, and the Review path when anything was missed. */
export function buildPracticeSummary(state, session) {
  const lang = state.settings.language;
  const total = session.results.length;
  const clean = session.results.filter((r) => r.perfect).length;
  const best = session.roundStreak;
  const missed = total - clean;
  return `
  <div class="tajweed-practice practice-summary">
    <h2 id="modal-title-practice">${t('practice.roundDone', lang)}</h2>
    <div class="practice-summary__score" role="status" aria-live="polite">
      <strong dir="ltr">${clean}/${total}</strong>
      <span>${t('practice.roundScore', lang, { n: clean, total })}</span>
    </div>
    ${best > 1 ? `<p class="practice-summary__streak">${t('practice.streakOn', lang, { n: best })}</p>` : ''}
    <p class="panel__subtext">${t(missed ? 'practice.summaryEncourage' : 'practice.summaryFlawless', lang)}</p>
    <div class="practice-summary__actions">
      <button type="button" class="btn btn--primary" data-action="practice-start" data-rule="${session.ruleId === 'review' ? 'mixed' : session.ruleId}">${t('practice.again', lang)}</button>
      ${missed ? `<button type="button" class="btn btn--secondary" data-action="practice-start" data-rule="review">${t('practice.reviewMistakes', lang)}</button>` : ''}
      <button type="button" class="btn btn--secondary btn--sm" data-action="practice-open">${t('practice.changeRule', lang)}</button>
    </div>
  </div>`;
}

/**
 * (v5.10.1) Guided rule lesson: the rule's own definition, its family
 * color, example ayahs drawn from the loaded drill pool (deep links the
 * reader jumps to and highlights), and the drill button. Pure template —
 * the handler loads the pool and passes validated examples.
 */
export function buildPracticeLesson(state, ruleId, examples = []) {
  const lang = state.settings.language;
  const rule = tajweedRule(ruleId);
  if (!rule) return '';
  const list = Array.isArray(examples) ? examples : [];
  const meta = state.quran.meta?.surahs || [];
  const family = (TAJWEED_FAMILIES || []).find((f) => f.id === rule.family);
  const familyName = family ? pickLocale(family.name, lang) : rule.family;
  const surahName = (s) => {
    const m = meta.find((x) => Number(x?.number) === Number(s));
    return m ? pickLocale({ en: m.nameTransliteration || m.nameEn, ar: m.nameAr }, lang) : `#${s}`;
  };
  return `
  <div class="tajweed-practice practice-lesson">
    <h2 id="modal-title-practice">${escapeHTML(pickLocale(rule.name, lang))}</h2>
    <p class="practice-lesson__family"><span class="practice-rule__swatch" style="background:${rule.color}"></span> ${escapeHTML(familyName)}</p>
    <h3 class="practice-lesson__heading">${t('practice.lessonWhat', lang)}</h3>
    <p class="practice-lesson__desc" dir="auto">${escapeHTML(pickLocale(rule.desc, lang))}</p>
    <h3 class="practice-lesson__heading">${t('practice.lessonExamples', lang)}</h3>
    ${
      list.length
        ? `<div class="practice-lesson__examples">${list
            .map(
              (e) => `
          <a class="practice-lesson__example" href="${buildHash(VIEWS.QURAN, { id: e.s, ay: String(e.a) })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${e.s}" data-ay="${e.a}">
            <span dir="auto">${escapeHTML(surahName(e.s))} · ${t('practice.exampleRef', lang, { s: e.s, a: e.a })}</span>
            ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 14 })}
          </a>`
            )
            .join('')}</div>`
        : `<p class="panel__subtext">${t('practice.lessonEmpty', lang)}</p>`
    }
    <div class="practice-summary__actions">
      <button type="button" class="btn btn--primary" data-action="practice-start" data-rule="${rule.id}">${icon('play', { size: 15 })} ${t('practice.drillRule', lang)}</button>
      <button type="button" class="btn btn--secondary btn--sm" data-action="practice-open">${t('practice.backToRules', lang)}</button>
    </div>
  </div>`;
}
