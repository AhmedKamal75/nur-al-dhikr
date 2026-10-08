/* Practice is a task launcher, not a second content library. */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

function taskLink({ iconName, titleKey, hintKey, href, action, button, lang }) {
  const inner = [
    '<span class="practice-task__icon" aria-hidden="true">', icon(iconName,{size:20}),
    '</span><span class="practice-task__body"><strong class="practice-task__title">',
    t(titleKey,lang), '</strong><span class="practice-task__hint">', t(hintKey,lang),
    '</span></span><span class="practice-task__action">', t(button?'practiceHub.start':'practiceHub.open',lang),
    ' ', icon('chevronRight',{size:16}), '</span>',
  ].join('');
  return button
    ? '<button type="button" class="practice-task" data-action="'+action+'">'+inner+'</button>'
    : '<a class="practice-task" href="'+href+'" data-action="navigate" data-view="'+href.replace(/^#\//,'')+'">'+inner+'</a>';
}
export function renderPractice(state) {
  const lang=state.settings.language;
  return [
    '<section class="view view--practice"><header class="view-header view-header--row"><div>',
    '<h1 class="view__title">',t('practiceHub.title',lang),'</h1><p class="view__subtitle">',t('practiceHub.lead',lang),
    '</p></div></header><nav class="practice-task-list" aria-label="',t('practiceHub.title',lang),'">',
    taskLink({iconName:'tasbih',titleKey:'practiceHub.tasbihTitle',hintKey:'practiceHub.tasbihHint',href:buildHash(VIEWS.TASBIH),lang}),
    taskLink({iconName:'book',titleKey:'practiceHub.tajweedTitle',hintKey:'practiceHub.tajweedHint',action:'practice-open',button:true,lang}),
    taskLink({iconName:'quran',titleKey:'practiceHub.recallTitle',hintKey:'practiceHub.recallHint',href:buildHash(VIEWS.MUTASHABIHAT),lang}),
    taskLink({iconName:'star',titleKey:'practiceHub.namesTitle',hintKey:'practiceHub.namesHint',href:buildHash(VIEWS.QUIZ),lang}),
    '</nav><p class="practice-task-note">',t('practiceHub.note',lang),'</p></section>',
  ].join('');
}