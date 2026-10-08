/*
 * views/practice.js
 * Practice is a task launcher, not a second content library.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

function taskLink({ iconName, titleKey, hintKey, href, action, button }) {
  const iconHTML = icon(iconName, { size: 20 });
  const label = t(button ? 'practiceHub.start' : 'practiceHub.open');
  const inner = [
    '<span class="practice-task__icon" aria-hidden="true">',
    iconHTML,
    '</span><span class="practice-task__body"><strong class="practice-task__title">',
    t(titleKey),
    '</strong><span class="practice-task__hint">',
    t(hintKey),
    '</span></span><span class="practice-task__action">',
    label,
    ' ',
    icon('chevronRight', { size: 16 }),
    '</span>',
  ].join('');

  if (button) {
    return '<button type="button" class="practice-task" data-action="' + action + '">' + inner + '</button>';
  }

  const view = href.replace(/^#\//, '');
  return '<a class="practice-task" href="' + href + '" data-action="navigate" data-view="' + view + '">' + inner + '</a>';
}

export function renderPractice(state) {
  const lang = state.settings.language;
  return [
    '<section class="view view--practice">',
    '<header class="view-header view-header--row"><div>',
    '<h1 class="view__title">', t('practiceHub.title', lang), '</h1>',
    '<p class="view__subtitle">', t('practiceHub.lead', lang), '</p>',
    '</div></header>',
    '<nav class="practice-task-list" aria-label="', t('practiceHub.title', lang), '">',
    taskLink({ iconName: 'tasbih', titleKey: 'practiceHub.tasbihTitle', hintKey: 'practiceHub.tasbihHint', href: buildHash(VIEWS.TASBIH) }),
    taskLink({ iconName: 'book', titleKey: 'practiceHub.tajweedTitle', hintKey: 'practiceHub.tajweedHint', action: 'practice-open', button: true }),
    taskLink({ iconName: 'quran', titleKey: 'practiceHub.recallTitle', hintKey: 'practiceHub.recallHint', href: buildHash(VIEWS.MUTASHABIHAT) }),
    taskLink({ iconName: 'star', titleKey: 'practiceHub.namesTitle', hintKey: 'practiceHub.namesHint', href: buildHash(VIEWS.QUIZ) }),
    '</nav>',
    '<p class="practice-task-note">', t('practiceHub.note', lang), '</p>',
    '</section>',
  ].join('');
}