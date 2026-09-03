/**
 * views/journal.js (v4.4)
 * The private journal — duas and weekly reflections, two tabs in one view.
 * Everything is device-local; export hands the user a plain-text file they
 * own. Friday shows the week's reflection prompt at the top.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { isoWeekKey, promptForDate, REFLECTION_PROMPTS } from '../domain/duaJournal.js';

const isFriday = () => new Date().getDay() === 5;

function promptText(promptId, lang) {
  return t(`journal.prompt.${promptId}`, lang);
}

function duaRows(state) {
  const lang = state.settings.language;
  const list = state.duaJournal.slice(0, 50);
  if (!list.length) return `<p class="empty-hint">${t('journal.duaEmpty', lang)}</p>`;
  return `
  <div class="journal-list">
    ${list
      .map(
        (e) => `
    <article class="journal-entry${e.answered ? ' journal-entry--answered' : ''}">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.date)}">${escapeHTML(e.date)}</time>
        <div class="journal-entry__actions">
          <button type="button" class="icon-btn${e.answered ? ' icon-btn--active' : ''}" data-action="dua-toggle-answered" data-id="${escapeHTML(e.id)}" aria-pressed="${e.answered}" aria-label="${t('journal.markAnswered', lang)}" title="${t('journal.markAnswered', lang)}">
            ${icon(e.answered ? 'check' : 'heart', { size: 16 })}
          </button>
          <button type="button" class="icon-btn" data-action="dua-remove" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">
            ${icon('trash', { size: 16 })}
          </button>
        </div>
      </header>
      <p class="journal-entry__text" dir="auto">${escapeHTML(e.text)}</p>
      ${e.answered ? `<span class="chip chip--success">${t('journal.answered', lang)}</span>` : ''}
    </article>`
      )
      .join('')}
  </div>`;
}

function reflectionRows(state) {
  const lang = state.settings.language;
  const list = state.reflections.slice(0, 50);
  if (!list.length) return `<p class="empty-hint">${t('journal.reflectionEmpty', lang)}</p>`;
  return `
  <div class="journal-list">
    ${list
      .map(
        (e) => `
    <article class="journal-entry">
      <header class="journal-entry__head">
        <time datetime="${escapeHTML(e.week)}">${escapeHTML(e.week)}</time>
        <div class="journal-entry__actions">
          <button type="button" class="icon-btn" data-action="reflection-remove" data-id="${escapeHTML(e.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 16 })}</button>
        </div>
      </header>
      ${e.promptId ? `<p class="journal-entry__prompt">${escapeHTML(promptText(e.promptId, lang))}</p>` : ''}
      <p class="journal-entry__text" dir="auto">${escapeHTML(e.text)}</p>
    </article>`
      )
      .join('')}
  </div>`;
}

export function renderJournal(state) {
  const lang = state.settings.language;
  const tab = state.activeParams.tab === 'reflections' ? 'reflections' : 'duas';
  const week = isoWeekKey(new Date());
  const promptId = promptForDate(new Date());

  return `
  <section class="view view--journal">
    <h1 class="view__title">${t('journal.title', lang)}</h1>
    <p class="view__subtitle">${t('journal.subtitle', lang)}</p>

    ${
      isFriday() || tab === 'reflections'
        ? `
    <section class="panel panel--prompt">
      <div class="panel__header"><h2>${t('journal.weeklyPrompt', lang)}</h2><span class="view__meta" dir="ltr">${escapeHTML(week)}</span></div>
      <p class="prompt__text">${escapeHTML(promptText(promptId, lang))}</p>
      <textarea class="journal-textarea" rows="4" data-bind="reflection-text" aria-label="${t('journal.writeHere', lang)}" placeholder="${t('journal.writeHere', lang)}"></textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="reflection-save" data-week="${escapeHTML(week)}" data-prompt="${escapeHTML(promptId)}">${t('journal.saveReflection', lang)}</button>
      </div>
    </section>`
        : ''
    }

    <div class="segmented" role="tablist" aria-label="${t('journal.title', lang)}">
      <a role="tab" aria-selected="${tab === 'duas'}" class="segmented__btn${tab === 'duas' ? ' segmented__btn--active' : ''}" href="#/journal" data-action="navigate" data-view="journal">${t('journal.tabDuas', lang)}</a>
      <a role="tab" aria-selected="${tab === 'reflections'}" class="segmented__btn${tab === 'reflections' ? ' segmented__btn--active' : ''}" href="#/journal?tab=reflections" data-action="navigate" data-view="journal" data-query="tab=reflections">${t('journal.tabReflections', lang)}</a>
    </div>

    ${
      tab === 'duas'
        ? `
    <section class="panel">
      <div class="panel__header"><h2>${t('journal.newDua', lang)}</h2></div>
      <textarea class="journal-textarea" rows="3" data-bind="dua-text" aria-label="${t('journal.duaPlaceholder', lang)}" placeholder="${t('journal.duaPlaceholder', lang)}"></textarea>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="dua-save">${t('journal.saveDua', lang)}</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel__header">
        <h2>${t('journal.tabDuas', lang)}</h2>
        <button type="button" class="link-btn link-btn--sm" data-action="journal-export">${t('journal.export', lang)}</button>
      </div>
      ${duaRows(state)}
    </section>`
        : `
    <section class="panel">
      <div class="panel__header">
        <h2>${t('journal.tabReflections', lang)}</h2>
        <button type="button" class="link-btn link-btn--sm" data-action="journal-export">${t('journal.export', lang)}</button>
      </div>
      ${reflectionRows(state)}
    </section>`
    }
  </section>`;
}

export { REFLECTION_PROMPTS };
