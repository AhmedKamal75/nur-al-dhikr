/**
 * app/listenAll.js — (v5.17.179, C18) "Listen to all" on a category view.
 *
 * Chains the existing per-item TTS engine (services/speech.js) through the
 * category's visible items, in the exact order the list renders them (the
 * view and the start handler both use visibleCategoryItems, so hidden items
 * are skipped exactly as the list skips them). Each item is read ONCE;
 * counters, targets and stats are never touched. This is text-to-speech,
 * not recorded recitation — the per-dhikr clip path (dhikrAudio) and
 * scholar question #37 are deliberately untouched. Collections and
 * favorites are a later slice; only the category view starts a session.
 *
 * One voice at a time still holds. A session starts through
 * claimSpeaker('speech') and ends when:
 *   - the route changes (stateSub stops it on every NAVIGATE),
 *   - any other Listen tap starts or stops (the toggle-speech handler),
 *   - any other voice claims the speaker (claimSpeaker clears the session
 *     state when it displaces 'speech'), or
 *   - the person taps Stop, or the last item finishes.
 *
 * The session lives in the store (state.listenAll, ephemeral — never
 * persisted) so the category view re-renders its inline progress bar and
 * each card keeps its usual playing highlight via speakingItemId.
 *
 * The session token below is the same discipline as speech.js's own
 * speechToken: cancel() fires the OLD utterance's onend asynchronously, so
 * without a token a stopped session's stale onEnd would advance a ghost
 * chain into whatever state replaced it.
 */
import { store, actions } from '../core/state.js';
import * as speech from '../services/speech.js';
import { claimSpeaker } from './audioEngine.js';
import { getItemEntry } from './shared.js';

let sessionToken = 0;

export function listenAllSession() {
  return store.getState().listenAll;
}

/** The item a running session is currently reading (null when idle). */
export function listenAllCurrentItemId() {
  const s = listenAllSession();
  return s && Array.isArray(s.itemIds) ? (s.itemIds[s.index] ?? null) : null;
}

/**
 * Start reading a category's items aloud, in list order, one pass.
 * `itemIds` is the queue the start handler resolved from live state (the
 * visible items, in effective order). Ids with no live entry are dropped
 * up front; an item that vanishes mid-session is skipped on its turn.
 */
export function startListenAll(categoryId, itemIds) {
  if (!speech.isSupported()) return 'unsupported';
  const ids = (Array.isArray(itemIds) ? itemIds : []).filter((id) => getItemEntry(id));
  if (!ids.length) return 'empty';
  stopListenAll();
  claimSpeaker('speech');
  const token = ++sessionToken;
  store.dispatch(
    actions.setListenAll({ categoryId: String(categoryId), itemIds: ids, index: 0, paused: false })
  );
  speakCurrent(token);
  return 'started';
}

function speakCurrent(token) {
  const s = listenAllSession();
  if (!s || token !== sessionToken) return;
  const itemId = s.itemIds[s.index];
  const entry = getItemEntry(itemId);
  if (!entry) {
    // Hidden, deleted or unloaded mid-session: skip it, keep the order.
    advance(token);
    return;
  }
  store.dispatch(actions.setSpeakingItem(itemId));
  speech.speakItem(entry.item, {
    onEnd: () => {
      if (token !== sessionToken) return;
      // A speaker claim that stopped this utterance also cleared the
      // session; its stale onEnd must not restart the chain.
      if (!listenAllSession()) return;
      advance(token);
    },
  });
}

function advance(token) {
  const s = listenAllSession();
  if (!s || token !== sessionToken) return;
  const next = s.index + 1;
  if (next >= s.itemIds.length) {
    stopListenAll();
    return;
  }
  store.dispatch(actions.setListenAll({ ...s, index: next }));
  speakCurrent(token);
}

/**
 * Pause/resume the current utterance. Best-effort, like the speech service
 * itself — but honest: an engine that does not report `paused` after
 * pause() never gets a paused bar it did not earn.
 */
export function pauseListenAll() {
  const s = listenAllSession();
  if (!s || s.paused || !speech.isSupported()) return;
  window.speechSynthesis.pause();
  if (window.speechSynthesis.paused === true) {
    store.dispatch(actions.setListenAll({ ...s, paused: true }));
  }
}

export function resumeListenAll() {
  const s = listenAllSession();
  if (!s || !s.paused || !speech.isSupported()) return;
  window.speechSynthesis.resume();
  store.dispatch(actions.setListenAll({ ...s, paused: false }));
}

/**
 * The toggle-speech contract for a running session: any Listen tap ends
 * the session. Returns true when the tap targeted the item the session
 * was reading — the caller treats that as a stop, not a solo restart.
 */
export function endListenAllForListenTap(itemId) {
  const current = listenAllCurrentItemId();
  if (!current) return false;
  stopListenAll();
  return current === itemId;
}

export function stopListenAll() {
  if (!listenAllSession()) return;
  sessionToken += 1;
  speech.stop();
  if (store.getState().speakingItemId !== null) {
    store.dispatch(actions.setSpeakingItem(null));
  }
  store.dispatch(actions.setListenAll(null));
}
