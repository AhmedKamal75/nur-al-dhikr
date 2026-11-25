/** Counter reset review. No counter reducer semantics are changed. */
import { store } from '../core/state.js';
import { t } from '../core/i18n.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { PRESETS } from '../views/tasbih.js';
import { itemTargetOf } from '../services/contentPrefs.js';
import { resolveFocusQueue } from '../services/focusQueue.js';
import * as tasbih from '../services/tasbih.js';
import { openModal, closeModal, isModalOpen } from '../ui/modal.js';
import { rt } from './rt.js';

let review = null;
let serial = 0;

export function counterResetSnapshot(state, kind, id) {
  let key, label, target;
  if (kind === 'tasbih') {
    if (state.activeView !== 'tasbih' || (state.tasbih?.activeItemId || 'subhanallah') !== id)
      return null;
    const phrase = PRESETS.find((p) => p.id === id) || state.tasbihCustom?.find((p) => p.id === id);
    if (!phrase) return null;
    key = `tasbih:${id}`;
    label = phrase.text || (state.settings.language === 'ar' ? phrase.ar : phrase.en);
    target = state.counters[key]?.target || phrase.target;
  } else if (kind === 'focus') {
    const { item } = resolveFocusQueue(state);
    if (state.activeView !== 'focus' || item?.id !== id) return null;
    key = id;
    label = pickLocale(item.title, state.settings.language) || item.arabic || id;
    target = state.counters[key]?.target ?? itemTargetOf(state, item);
  } else return null;
  const counter = state.counters[key];
  return {
    kind,
    id,
    key,
    label: String(label),
    target,
    storedTarget: counter?.target ?? null,
    count: counter?.count || 0,
    cycles: counter?.completedCycles || 0,
    route: JSON.stringify([state.activeView, state.activeParams]),
  };
}

export function counterResetReviewHTML(snapshot, lang, token) {
  return `<div data-counter-reset-review="${token}">
    <h2 id="modal-title-counter-reset">${escapeHTML(t('counterReset.title', lang))}</h2>
    <p class="counter-reset__phrase" dir="auto">${escapeHTML(snapshot.label)}</p>
    <p>${escapeHTML(t('counterReset.progress', lang, { count: `\u2066${snapshot.count}`, target: `${snapshot.target}\u2069` }))}</p>
    <p>${escapeHTML(t('counterReset.cycles', lang, { n: snapshot.cycles }))}</p>
    <p>${escapeHTML(t('counterReset.only', lang))}</p>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close" data-reset-cancel>${t('common.cancel', lang)}</button>
      <button type="button" class="btn btn--danger" data-action="counter-reset-confirm" data-token="${token}">${t('counterReset.confirm', lang)}</button>
    </div></div>`;
}

export function requestCounterReset(kind, id) {
  const state = store.getState();
  const snapshot = counterResetSnapshot(state, kind, id);
  if (!snapshot || (!snapshot.count && !snapshot.cycles)) return;
  // Cancel the completed-cycle handoff, including after cancellation. Never re-arm it.
  clearTimeout(rt.pendingAutoAdvanceTimer);
  rt.pendingAutoAdvanceTimer = null;
  review = { ...snapshot, token: String(++serial) };
  openModal(counterResetReviewHTML(snapshot, state.settings.language, review.token), {
    labelledBy: 'modal-title-counter-reset',
    focusSelector: '[data-reset-cancel]',
    returnSelector:
      kind === 'tasbih' ? '[data-action="tasbih-reset"]' : '[data-action="focus-reset"]',
  });
}

export function confirmCounterReset(token) {
  const old = review;
  if (
    !old ||
    old.token !== token ||
    !isModalOpen() ||
    document.querySelector('[data-counter-reset-review]')?.dataset.counterResetReview !== token
  )
    return;
  const current = counterResetSnapshot(store.getState(), old.kind, old.id);
  if (!current || current.route !== old.route) {
    review = null;
    closeModal();
    return;
  }
  const { token: _token, ...previous } = old;
  if (JSON.stringify(current) !== JSON.stringify(previous)) {
    if (!current.count && !current.cycles) {
      review = null;
      closeModal();
      return;
    }
    requestCounterReset(old.kind, old.id);
    return;
  }
  review = null;
  closeModal();
  tasbih.reset(current.key, current.target);
  const action = old.kind === 'tasbih' ? 'tasbih-reset' : 'focus-reset';
  document.querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
}
