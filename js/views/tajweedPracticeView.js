/**
 * views/tajweedPracticeView.js
 * Templates for the "find the rule" drill mode. The interactive round is
 * rendered fresh (via openModal again) on every tap — session state lives
 * in app.js as module-scoped transient state, the same pattern already
 * used for the flip direction and active tafsir tab, since a half-tapped
 * quiz round has no business being persisted or undo-able.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { TAJWEED_RULES, tajweedRule, wordUnits } from '../domain/tajweed.js';
import { accuracyFor } from '../domain/tajweedPractice.js';

/** The entry screen: pick a rule to drill, or "Mixed," with stats. */
export function buildPracticePicker(state) {
  const lang = state.settings.language;
  const stats = state.tajweedPracticeStats;
  const overall = accuracyFor(stats);

  const ruleRow = (rule) => {
    const acc = accuracyFor(stats, rule.id);
    return `
    <button type="button" class="practice-rule" data-action="practice-start" data-rule="${rule.id}">
      <span class="practice-rule__swatch" style="background:${rule.color}"></span>
      <span class="practice-rule__text">
        <span class="practice-rule__name">${escapeHTML(pickLocale(rule.name, lang))}</span>
        <span class="practice-rule__acc">${acc == null ? t('practice.notYet', lang) : t('practice.accuracy', lang, { n: acc })}</span>
      </span>
      ${icon('chevronLeft', { size: 16, className: 'practice-rule__chevron' })}
    </button>`;
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

    <div class="practice-rule-list">${TAJWEED_RULES.map(ruleRow).join('')}</div>
  </div>`;
}

/** The active round: an ayah with every letter tappable, a Check button,
 *  and (once checked) color-coded feedback + a Next/Change-rule/Done bar. */
export function buildPracticeRound(state, session) {
  const lang = state.settings.language;
  const rule = session.ruleId === 'mixed' ? null : tajweedRule(session.ruleId);
  const title = rule ? escapeHTML(pickLocale(rule.name, lang)) : t('practice.mixed', lang);
  const instructions =
    session.ruleId === 'mixed'
      ? t('practice.instructionsMixed', lang)
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

  return `
  <div class="tajweed-practice tajweed-practice--round">
    <h2 id="modal-title-practice" class="sr-only">${title}</h2>
    <p class="practice-round__rule">${title}</p>
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
        <button type="button" class="btn btn--primary" data-action="practice-next">${t('practice.next', lang)}</button>
      `
      }
      <button type="button" class="btn btn--secondary btn--sm" data-action="practice-open">${t('practice.changeRule', lang)}</button>
    </div>
  </div>`;
}
