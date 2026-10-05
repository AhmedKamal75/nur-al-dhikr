/**
 * tajweedCourseView.js — the course screen (v5.17.32)
 *
 * Pure templates. No fetching, no state mutation: the caller passes state in
 * and the view reads the spine from domain/tajweedCourse.js. Lazy-loaded, so
 * the renderer's 19 static view imports (its documented cap) do not move.
 *
 * The screen shows a stage ladder, each session's rules with the citation
 * those rules already carry, and a mode switch between the guided plan and
 * open access. A locked session in guided mode says why it is locked and
 * names what unlocks it, rather than just greying out.
 *
 * Spread sessions (makharij/sifat counts) render a different branch: every
 * count with its authors, its work-and-lines citation, its contested badge
 * and its disagreement note — and NO drill button anywhere, because
 * drilling would pick the side the course refuses to pick.
 */

import { escapeHTML, pickLocale } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { studyContextHTML } from './studyContext.js';
import { t, isRTL } from '../core/i18n.js';
import { VIEWS } from '../core/config.js';
import { TAJWEED_RULES, TAJWEED_FAMILIES } from '../domain/tajweed.js';
import { TAJWEED_WORKS, TAJWEED_SOURCES, tajweedCitation } from '../domain/tajweedSources.js';
import {
  COURSE_STAGES,
  allSessions,
  availableSessions,
  isDrivable,
  nextSession,
  stageProgress,
  courseProgress,
  searchSessions,
} from '../domain/tajweedCourse.js';

/** Literal i18n keys, not computed ones: a typo then fails the i18n scan
 *  instead of rendering an empty label. */
const MODE_LABELS = Object.freeze([
  ['guided', 'tajweedCourse.mode.guided'],
  ['open', 'tajweedCourse.mode.open'],
]);
const MODE_HINTS = Object.freeze({
  guided: 'tajweedCourse.modeHint.guided',
  open: 'tajweedCourse.modeHint.open',
});

const ruleById = new Map(TAJWEED_RULES.map((r) => [r.id, r]));
const familyById = new Map(TAJWEED_FAMILIES.map((f) => [f.id, f]));

/** One spread row: a contested count with its authors, its citation, its
 *  contested badge and its disagreement note. No button: a spread row is
 *  for study, and any drill action here would silently pick a count.
 *  Unknown ids render nothing, exactly like ruleChip below. */
function spreadRow(ruleId, lang) {
  const entry = TAJWEED_SOURCES[ruleId];
  if (!entry || !entry.label) return '';
  const cite = tajweedCitation(ruleId, lang);
  const badge =
    entry.review === 'contested'
      ? `<span class="taj-course__badge taj-course__badge--contested">${escapeHTML(t('tajweedCourse.contested', lang))}</span>`
      : '';
  return `<li class="taj-course__spread-row">
    <p class="taj-course__spread-label">${escapeHTML(pickLocale(entry.label, lang))} ${badge}</p>
    ${cite ? `<p class="taj-course__spread-src">${escapeHTML(t('tajweedCourse.source', lang))}: ${escapeHTML(cite.title)} ${escapeHTML(cite.lines)}</p>` : ''}
    ${entry.caveat ? `<p class="taj-course__spread-caveat">${escapeHTML(pickLocale(entry.caveat, lang))}</p>` : ''}
  </li>`;
}

/** One rule chip: its colour, its name, and where the definition comes from. */
function ruleChip(ruleId, lang, locked) {
  const rule = ruleById.get(ruleId);
  if (!rule) return '';
  const family = familyById.get(rule.family);
  const color = family?.color || '';
  const cite = tajweedCitation(ruleId, lang);
  const swatch = color
    ? `<span class="tajweed-legend__swatch" style="background:${escapeHTML(color)}"></span>`
    : `<span class="tajweed-legend__swatch tajweed-legend__swatch--plain"></span>`;
  return `<li class="taj-course__rule">
    <div class="taj-course__rule-main">
      <button type="button" class="taj-course__rule-btn" data-action="tajweed-course-drill-rule" data-rule="${escapeHTML(ruleId)}" ${locked ? 'disabled' : ''}>
        ${swatch}
        <span class="taj-course__rule-name">${escapeHTML(pickLocale(rule.name, lang))}</span>
        ${cite ? `<span class="taj-course__rule-src">${escapeHTML(t('tajweedCourse.source', lang))}: ${escapeHTML(cite.title)} ${escapeHTML(cite.lines)}</span>` : `<span class="taj-course__rule-src taj-course__rule-src--missing">${escapeHTML(t('tajweedCourse.uncited', lang))}</span>`}
      </button>
      <button type="button" class="icon-btn icon-btn--sm taj-course__learn" data-action="practice-lesson" data-rule="${escapeHTML(ruleId)}" ${locked ? 'disabled' : ''} aria-label="${escapeHTML(t('practice.lesson', lang))} — ${escapeHTML(pickLocale(rule.name, lang))}" title="${escapeHTML(t('practice.lesson', lang))}">${icon('book', { size: 15 })}</button>
    </div>
  </li>`;
}

function sessionRow(session, state, lang) {
  const progress = state.tajweedCourseProgress || {};
  const mode = state.settings?.tajweedPathMode === 'open' ? 'open' : 'guided';
  const done = !!progress[session.id];
  const open = availableSessions(progress, mode).some((s) => s.id === session.id);
  const isNext = !done && open;
  const cite = session.citation;
  const citeText = cite
    ? `${pickLocale(tajweedWorkTitle(cite.work, lang), lang)} ${cite.lines}`
    : '';
  // A spread session shows the disagreement, not rule chips: every focus id
  // is a contested position rendered with its own citation and caveat.
  const rules = session.spread
    ? `<ul class="taj-course__spread">${(session.focus || []).map((r) => spreadRow(r, lang)).join('')}</ul>`
    : (session.focus || []).map((r) => ruleChip(r, lang, !open)).join('');
  const rulesBlock = session.spread
    ? rules
    : rules
      ? `<ul class="taj-course__rules">${rules}</ul>`
      : '';
  // The practice engine drills ONE rule per round, so a session-level button
  // is only honest where the session maps to a single round. For a
  // multi-rule session the rule chips are the action, rather than silently
  // picking one rule and calling it the session. A spread session gets no
  // drill button at all: drilling a disagreement would resolve it.
  const singleRound = !session.spread && (session.mixed || (session.focus || []).length === 1);
  const sessionDrill = singleRound
    ? `<button type="button" class="btn btn--primary btn--sm" data-action="tajweed-course-drill" data-session="${escapeHTML(session.id)}">${icon('play', { size: 14 })} ${escapeHTML(t('tajweedCourse.practice', lang))}</button>`
    : '';

  const badges = [];
  if (done)
    badges.push(
      `<span class="taj-course__badge">${icon('check', { size: 12 })} ${escapeHTML(t('tajweedCourse.done', lang))}</span>`
    );
  else if (isNext)
    badges.push(
      `<span class="taj-course__badge taj-course__badge--next">${escapeHTML(t('tajweedCourse.nextUp', lang))}</span>`
    );
  else if (!open)
    badges.push(
      `<span class="taj-course__badge taj-course__badge--locked">${escapeHTML(t('tajweedCourse.locked', lang))}</span>`
    );
  if (session.mixed)
    badges.push(
      `<span class="taj-course__badge">${escapeHTML(t('tajweedCourse.mixed', lang))}</span>`
    );

  // A locked row must be actionable, not merely dim: say what opens it.
  const lockNote = !open
    ? `<p class="taj-course__lock-note">${escapeHTML(t('tajweedCourse.lockedBecause', lang))}</p>`
    : '';

  const actions = open
    ? `${sessionDrill}
       <button type="button" class="btn btn--secondary btn--sm" data-action="tajweed-course-toggle-done" data-session="${escapeHTML(session.id)}">${escapeHTML(done ? t('tajweedCourse.markUndone', lang) : t('tajweedCourse.markDone', lang))}</button>`
    : '';

  return `<li class="taj-course__session${done ? ' taj-course__session--done' : ''}${isNext ? ' taj-course__session--next' : ''}${open ? '' : ' taj-course__session--locked'}">
    <div class="taj-course__session-head">
      <span class="taj-course__session-order">${escapeHTML(String(session.order))}</span>
      <span class="taj-course__session-title">${escapeHTML(pickLocale(session.title, lang))}</span>
      ${badges.join('')}
    </div>
    ${citeText ? `<p class="taj-course__session-src">${escapeHTML(t('tajweedCourse.source', lang))}: ${escapeHTML(citeText)}</p>` : ''}
    ${rulesBlock}
    ${lockNote}
    ${actions ? `<div class="taj-course__actions">${actions}</div>` : ''}
  </li>`;
}

function tajweedWorkTitle(workId, _lang) {
  // Imported lazily-by-value to keep this module's imports flat.
  const { TAJWEED_WORKS } = tajweedWorkTitle;
  return TAJWEED_WORKS?.[workId]?.shortTitle || { en: workId, ar: workId };
}
// Bound at module load, so the helper above stays synchronous and cheap.
tajweedWorkTitle.TAJWEED_WORKS = TAJWEED_WORKS;

export function renderTajweedCourse(state) {
  const lang = state.settings?.language === 'ar' ? 'ar' : 'en';
  const progress = state.tajweedCourseProgress || {};
  const mode = state.settings?.tajweedPathMode === 'open' ? 'open' : 'guided';
  const overall = courseProgress(progress);
  const upNext = nextSession(progress, mode);
  const query = String(state.activeParams?.q || '').trim();
  const searching = query.length > 0;

  const modeSwitch = `<div class="taj-course__modes" role="radiogroup" aria-labelledby="taj-course-mode-label">
    <span class="taj-course__mode-label" id="taj-course-mode-label">${escapeHTML(t('tajweedCourse.pathLabel', lang))}</span>
    ${MODE_LABELS.map(
      ([value, labelKey]) => `<label class="taj-course__mode">
        <input type="radio" name="tajweed-path-mode" data-action="tajweed-course-mode" value="${value}" ${mode === value ? 'checked' : ''} />
        <span>${escapeHTML(t(labelKey, lang))}</span>
      </label>`
    ).join('')}
  </div>
  <p class="taj-course__mode-hint">${escapeHTML(t(MODE_HINTS[mode] || MODE_HINTS.guided, lang))}</p>`;

  const search = `<div class="taj-course__search">
    <label class="visually-hidden" for="taj-course-search">${escapeHTML(t('tajweedCourse.searchLabel', lang))}</label>
    <input class="input" id="tajweed-course-search-input" type="search" data-bind="tajweed-course-search" value="${escapeHTML(query)}" placeholder="${escapeHTML(t('tajweedCourse.searchPlaceholder', lang))}" />
  </div>`;

  // A search result is a flat list; a plan is a ladder. Same data, two shapes,
  // because "find ikhfa" and "follow the course" are different intentions.
  const body = searching
    ? (() => {
        const hits = searchSessions(query);
        if (!hits.length) {
          return `<p class="taj-course__empty">${escapeHTML(t('tajweedCourse.noResults', lang))}</p>`;
        }
        return `<ul class="taj-course__sessions">${hits.map((s) => sessionRow(s, state, lang)).join('')}</ul>`;
      })()
    : COURSE_STAGES.map((stage) => {
        const sp = stageProgress(stage.id, progress);
        return `<section class="taj-course__stage">
          <header class="taj-course__stage-head">
            <span class="taj-course__stage-order">${escapeHTML(t('tajweedCourse.stage', lang))} ${escapeHTML(String(stage.order))}</span>
            <h2 class="taj-course__stage-title">${escapeHTML(pickLocale(stage.title, lang))}</h2>
            <span class="taj-course__stage-count">${sp.done} / ${sp.total}</span>
          </header>
          <p class="taj-course__stage-why">${escapeHTML(pickLocale(stage.why, lang))}</p>
          <ul class="taj-course__sessions">${stage.sessions.map((s) => sessionRow({ ...s, stageId: stage.id }, state, lang)).join('')}</ul>
        </section>`;
      }).join('');

  const continueBlock = upNext
    ? upNext.spread || !isDrivable(upNext)
      ? `<div class="taj-course__continue">
        <p class="taj-course__continue-label">${escapeHTML(t('tajweedCourse.continueLabel', lang))}</p>
        <p class="taj-course__continue-title">${escapeHTML(pickLocale(upNext.title, lang))}</p>
        <button type="button" class="btn btn--secondary" data-action="tajweed-course-toggle-done" data-session="${escapeHTML(upNext.id)}">${escapeHTML(t('tajweedCourse.markDone', lang))}</button>
      </div>`
      : `<div class="taj-course__continue">
        <p class="taj-course__continue-label">${escapeHTML(t('tajweedCourse.continueLabel', lang))}</p>
        <p class="taj-course__continue-title">${escapeHTML(pickLocale(upNext.title, lang))}</p>
        <button type="button" class="btn btn--primary" data-action="tajweed-course-drill" data-session="${escapeHTML(upNext.id)}">${icon('play', { size: 15 })} ${escapeHTML(t('tajweedCourse.start', lang))}</button>
      </div>`
    : `<div class="taj-course__continue">
        <p class="taj-course__continue-title">${escapeHTML(t('tajweedCourse.allDone', lang))}</p>
        <button type="button" class="btn btn--secondary" data-action="tajweed-course-drill" data-session="mixed-drill">${escapeHTML(t('tajweedCourse.keepGoing', lang))}</button>
      </div>`;

  return `<div class="taj-course">
    <div class="taj-course__head">
      <h1>${escapeHTML(t('tajweedCourse.title', lang))}</h1>
      <div class="taj-course__overall" role="progressbar" aria-valuenow="${Math.round(overall.ratio * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHTML(t('tajweedCourse.progress', lang))}">
        <span>${escapeHTML(t('tajweedCourse.progress', lang))}: ${overall.done} / ${overall.total}</span>
      </div>
    </div>
    <p class="taj-course__intro">${escapeHTML(t('tajweedCourse.intro', lang))}</p>
    ${modeSwitch}
    ${continueBlock}
    ${search}
    <div class="taj-course__body">${body}</div>
    <a class="back-link" href="${buildHash(VIEWS.MUSHAF)}" data-action="navigate" data-view="${VIEWS.MUSHAF}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${escapeHTML(t('nav.quran', lang))}</a>
  </div>`;
}

export const TAJWEED_COURSE_SESSION_IDS = Object.freeze(allSessions().map((s) => s.id));
