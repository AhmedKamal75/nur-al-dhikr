/**
 * views/quiz.js
 * A short multiple-choice quiz for memorizing the 99 Names of Allah
 * (al-Asma al-Husna). Every question and answer is drawn verbatim from the
 * existing asma.json library — this view only selects, shuffles, and scores;
 * it never invents or alters any of the underlying content.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { pickStrict, showTransliterationFor } from '../domain/localeContent.js';
import { wasCelebrated } from '../domain/celebrate.js';
import { buildHash } from '../core/router.js';
import { VIEWS, QUIZ_LENGTH, QUIZ_CHOICE_COUNT } from '../core/config.js';

const QUIZ_SIZES = [5, 10, 20];

/** Libraries with enough quizzable items, in display order. */
function quizLibraries(state) {
  const docs = state.library.documents || {};
  const order = Array.isArray(state.library.order) ? state.library.order : Object.keys(docs);
  return order
    .map((id) => docs[id])
    .filter((doc) => {
      const items = doc?.categories?.flatMap((c) => c.items || []) || [];
      return items.length >= QUIZ_CHOICE_COUNT;
    })
    .map((doc) => ({
      id: doc.metadata?.id || '',
      name: doc.metadata?.name || { en: doc.metadata?.id },
    }));
}

function renderStart(state, lang) {
  const best = state.quizStats.bestScore;
  const attempts = state.quizStats.totalAttempts;
  const prefs = state.quizPrefs || {};
  const libs = quizLibraries(state);
  const pickedId = libs.some((l) => l.id === prefs.libraryId) ? prefs.libraryId : libs[0]?.id || '';
  const dir = prefs.direction === 'en-ar' ? 'en-ar' : 'ar-en';
  const size = QUIZ_SIZES.includes(prefs.size) ? prefs.size : QUIZ_LENGTH;
  // (v5.2.85, UP-08) cross-session weak items: count + entry button when
  // anything is recorded. Shame-free: framed as practice, never as failure.
  const weakCount = Object.keys(state.quizMissRecords || {}).length;
  return `
  <section class="view view--quiz">
    <h1 class="view__title">${t('quiz.title', lang)}</h1>
    ${emptyStateHTML({
      iconName: 'star',
      title: t('quiz.intro', lang, { n: QUIZ_LENGTH }),
      hint: attempts > 0 ? t('quiz.bestScore', lang, { best, total: QUIZ_LENGTH }) : '',
      actionHTML: `<button type="button" class="btn btn--primary" data-action="quiz-start">${icon('play', { size: 16 })} ${t('quiz.start', lang)}</button>${
        weakCount > 0
          ? ` <button type="button" class="btn btn--secondary btn--sm" data-action="quiz-practice-weak">${icon('repeat', { size: 14 })} ${t('quiz.practiceWeak', lang, { n: weakCount })}</button>`
          : ''
      }`,
    })}
    <div class="panel">
      <p class="field-label">${t('quiz.pickLibrary', lang)}</p>
      <div class="chip-row" role="group" aria-label="${t('quiz.pickLibrary', lang)}">
        ${libs.map((l) => `<button type="button" class="chip ${l.id === pickedId ? 'chip--active' : ''}" data-action="quiz-library" data-id="${escapeHTML(l.id)}" aria-pressed="${l.id === pickedId}">${escapeHTML(pickLocale(l.name, lang))}</button>`).join('')}
      </div>
      <p class="field-label">${t('quiz.direction', lang)}</p>
      <div class="segmented" role="group" aria-label="${t('quiz.direction', lang)}">
        <button type="button" class="segmented__btn ${dir !== 'en-ar' ? 'segmented__btn--active' : ''}" data-action="quiz-direction" data-dir="ar-en" aria-pressed="${dir !== 'en-ar'}">${t('quiz.directionArEn', lang)}</button>
        <button type="button" class="segmented__btn ${dir === 'en-ar' ? 'segmented__btn--active' : ''}" data-action="quiz-direction" data-dir="en-ar" aria-pressed="${dir === 'en-ar'}">${t('quiz.directionEnAr', lang)}</button>
      </div>
      <p class="field-label">${t('quiz.size', lang)}</p>
      <div class="chip-row" role="group" aria-label="${t('quiz.size', lang)}">
        ${QUIZ_SIZES.map((n) => `<button type="button" class="chip ${n === size ? 'chip--active' : ''}" data-action="quiz-size" data-size="${n}" aria-pressed="${n === size}">${n}</button>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderFinished(state, lang) {
  const { correctCount, wrongIds } = state.quiz;
  const best = state.quizStats.bestScore;
  // v3.12: bloom on the finish moment only — wasCelebrated goes false once
  // the celebration window passes, so lingering on the result screen (or
  // coming back to it later) never re-runs the animation.
  const celebrate = wasCelebrated('quiz');
  const mistakes = Array.isArray(wrongIds) ? wrongIds.length : 0;
  return `
  <section class="view view--quiz">
    <h1 class="view__title">${t('quiz.done', lang)}</h1>
    <div class="empty-state quiz-result${celebrate ? ' celebrate' : ''}">
      ${icon(correctCount === QUIZ_LENGTH ? 'sparkle' : 'star', { size: 40 })}
      <p class="quiz-result__score" dir="ltr">${correctCount} / ${QUIZ_LENGTH}</p>
      <p class="panel__subtext">${t('quiz.bestScore', lang, { best, total: QUIZ_LENGTH })}</p>
      <div class="btn-stack">
        <button type="button" class="btn btn--primary" data-action="quiz-start">${icon('play', { size: 16 })} ${t('quiz.tryAgain', lang)}</button>
        ${
          mistakes > 0
            ? `<button type="button" class="btn btn--secondary" data-action="quiz-review-mistakes">${icon('repeat', { size: 16 })} ${t('quiz.reviewMistakes', lang, { n: mistakes })}</button>`
            : ''
        }
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
  // (v5.2.75, UP-10) both directions render from the per-question stamp:
  // ar-en prompts Arabic and quizzes the meaning; en-ar prompts the
  // meaning and quizzes the Arabic. Strict separation either way.
  const dir = q.dir === 'en-ar' ? 'en-ar' : 'ar-en';
  const promptHTML =
    dir === 'en-ar'
      ? `<p class="quiz-prompt__meaning" dir="auto">${escapeHTML(pickStrict(item.translation, lang))}</p>`
      : `<p class="quiz-prompt__arabic" dir="rtl" lang="ar">${escapeHTML(item.arabic)}</p>`;

  const choiceButtons = q.choices
    .map((choiceId) => {
      const choiceEntry = state.library.itemIndex[choiceId];
      // Strict separation: no cross-language fallback in quiz choices.
      // pickLocale would leak the other language when one side is missing;
      // asma translation.ar is complete today, so this is a landmine guard.
      const label =
        dir === 'en-ar'
          ? choiceEntry
            ? escapeHTML(choiceEntry.item.arabic)
            : ''
          : choiceEntry
            ? escapeHTML(pickStrict(choiceEntry.item.translation, lang))
            : '';
      let cls = 'quiz-choice';
      let marker = '';
      if (revealed) {
        if (choiceId === q.itemId) {
          cls += ' quiz-choice--correct';
          marker = icon('check', { size: 16 });
        } else if (choiceId === selectedId) {
          cls += ' quiz-choice--wrong';
          // (v4.2) the wrong pick gets a ✗ too — correctness was color-only
          // (WCAG 1.4.1), invisible to screen readers and color-blind users.
          marker = icon('close', { size: 16 });
        }
      }
      return `
    <button type="button" class="${cls}" data-action="quiz-answer" data-item-id="${choiceId}" ${revealed ? 'disabled' : ''}>
      ${label}
      ${marker}
    </button>`;
    })
    .join('');

  return `
  <section class="view view--quiz">
    <header class="view-header view-header--row">
      <p class="view__meta">${t('quiz.progress', lang, { current: index + 1, total: deck.length })}</p>
      <p class="view__meta" dir="ltr">${icon('check', { size: 14 })} ${correctCount}</p>
    </header>
    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${t('quiz.progress', lang, { current: index + 1, total: deck.length })}"><div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div></div>

    <div class="quiz-prompt">
      ${promptHTML}
      <p class="quiz-prompt__hint">${t(dir === 'en-ar' ? 'quiz.whichName' : 'quiz.whatDoesItMean', lang)}</p>
    </div>

    <div class="quiz-choices">${choiceButtons}</div>

    ${
      /* FIX (review v3.3 A6): the transliteration moved into the
        post-answer reinforcement below — showing it in the prompt leaked
        the correct answer ("Al-Qadir" ↔ "The All-Able"). */ ''
    }
    ${
      revealed
        ? `
    <div class="quiz-feedback" role="status" aria-live="polite">
      <p class="quiz-feedback__verdict ${selectedId === q.itemId ? 'quiz-feedback__verdict--correct' : 'quiz-feedback__verdict--wrong'}">${icon(selectedId === q.itemId ? 'check' : 'close', { size: 15 })} ${t(selectedId === q.itemId ? 'quiz.correct' : 'quiz.wrong', lang)}</p>
      ${showTransliterationFor(lang) && item.transliteration ? `<p class="quiz-prompt__translit" lang="en" dir="ltr">${escapeHTML(item.transliteration)}</p>` : ''}
      ${item.virtues?.[lang] ? `<p class="quiz-feedback__virtue">${escapeHTML(item.virtues[lang])}</p>` : ''}
      <button type="button" class="btn btn--primary" data-action="quiz-next">
        ${index + 1 >= deck.length ? t('quiz.seeResults', lang) : t('quiz.next', lang)} ${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 16 })}
      </button>
    </div>`
        : ''
    }
  </section>`;
}

export function renderQuiz(state) {
  const lang = state.settings.language;
  if (!state.quiz.deck.length) return renderStart(state, lang);
  if (state.quiz.finished) return renderFinished(state, lang);
  return renderQuestion(state, lang);
}
