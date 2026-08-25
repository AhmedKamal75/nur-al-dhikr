/**
 * views/quiz.js
 * A short multiple-choice quiz for memorizing the 99 Names of Allah
 * (al-Asma al-Husna). Every question and answer is drawn verbatim from the
 * existing asma.json library — this view only selects, shuffles, and scores;
 * it never invents or alters any of the underlying content.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { buildHash } from '../router.js';
import { VIEWS, QUIZ_LENGTH } from '../config.js';

function renderStart(state, lang) {
  const best = state.quizStats.bestScore;
  const attempts = state.quizStats.totalAttempts;
  return `
  <section class="view view--quiz">
    <h1 class="view__title">${t('quiz.title', lang)}</h1>
    <div class="empty-state">
      ${icon('star', { size: 40 })}
      <p>${t('quiz.intro', lang, { n: QUIZ_LENGTH })}</p>
      ${attempts > 0 ? `<p class="panel__subtext">${t('quiz.bestScore', lang, { best, total: QUIZ_LENGTH })}</p>` : ''}
      <button type="button" class="btn btn--primary" data-action="quiz-start">${icon('play', { size: 16 })} ${t('quiz.start', lang)}</button>
    </div>
  </section>`;
}

function renderFinished(state, lang) {
  const { correctCount } = state.quiz;
  const best = state.quizStats.bestScore;
  return `
  <section class="view view--quiz">
    <h1 class="view__title">${t('quiz.done', lang)}</h1>
    <div class="empty-state quiz-result">
      ${icon(correctCount === QUIZ_LENGTH ? 'sparkle' : 'star', { size: 40 })}
      <p class="quiz-result__score" dir="ltr">${correctCount} / ${QUIZ_LENGTH}</p>
      <p class="panel__subtext">${t('quiz.bestScore', lang, { best, total: QUIZ_LENGTH })}</p>
      <div class="btn-stack">
        <button type="button" class="btn btn--primary" data-action="quiz-start">${icon('play', { size: 16 })} ${t('quiz.tryAgain', lang)}</button>
        <a class="btn btn--ghost" href="${buildHash(VIEWS.LIBRARY)}" data-action="quiz-exit-link">${t('quiz.exit', lang)}</a>
      </div>
    </div>
  </section>`;
}

function renderQuestion(state, lang) {
  const { deck, index, revealed, selectedId, correctCount } = state.quiz;
  const q = deck[index];
  const entry = state.library.itemIndex[q.itemId];
  if (!entry) {
    // Defensive: the underlying library changed shape since the deck was
    // built (e.g. content was edited mid-quiz via the editor). Bail out
    // gracefully rather than rendering a broken question.
    return `<section class="view view--quiz"><p class="empty-hint">${t('quiz.unavailable', lang)}</p>
      <a class="btn btn--ghost" href="${buildHash(VIEWS.LIBRARY)}" data-action="quiz-exit-link">${t('quiz.exit', lang)}</a></section>`;
  }
  const item = entry.item;
  const pct = Math.round((index / deck.length) * 100);

  const choiceButtons = q.choices.map((choiceId) => {
    const choiceEntry = state.library.itemIndex[choiceId];
    const label = choiceEntry ? escapeHTML(pickLocale(choiceEntry.item.translation, lang)) : '';
    let cls = 'quiz-choice';
    if (revealed) {
      if (choiceId === q.itemId) cls += ' quiz-choice--correct';
      else if (choiceId === selectedId) cls += ' quiz-choice--wrong';
    }
    return `
    <button type="button" class="${cls}" data-action="quiz-answer" data-item-id="${choiceId}" ${revealed ? 'disabled' : ''}>
      ${label}
      ${revealed && choiceId === q.itemId ? icon('check', { size: 16 }) : ''}
    </button>`;
  }).join('');

  return `
  <section class="view view--quiz">
    <header class="view-header view-header--row">
      <p class="view__meta">${t('quiz.progress', lang, { current: index + 1, total: deck.length })}</p>
      <p class="view__meta" dir="ltr">${icon('check', { size: 14 })} ${correctCount}</p>
    </header>
    <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>

    <div class="quiz-prompt">
      <p class="quiz-prompt__arabic" dir="rtl" lang="ar">${escapeHTML(item.arabic)}</p>
      ${state.settings.showTransliteration ? `<p class="quiz-prompt__translit">${escapeHTML(item.transliteration)}</p>` : ''}
      <p class="quiz-prompt__hint">${t('quiz.whatDoesItMean', lang)}</p>
    </div>

    <div class="quiz-choices">${choiceButtons}</div>

    ${revealed ? `
    <div class="quiz-feedback">
      ${item.virtues?.[lang] ? `<p class="quiz-feedback__virtue">${escapeHTML(item.virtues[lang])}</p>` : ''}
      <button type="button" class="btn btn--primary" data-action="quiz-next">
        ${index + 1 >= deck.length ? t('quiz.seeResults', lang) : t('quiz.next', lang)} ${icon('chevronRight', { size: 16 })}
      </button>
    </div>` : ''}
  </section>`;
}

export function renderQuiz(state) {
  const lang = state.settings.language;
  if (!state.quiz.deck.length) return renderStart(state, lang);
  if (state.quiz.finished) return renderFinished(state, lang);
  return renderQuestion(state, lang);
}
