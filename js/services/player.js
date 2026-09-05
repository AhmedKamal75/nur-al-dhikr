/**
 * player.js
 * The full-surah audio engine behind the persistent player bar.
 *
 * One <audio> element for the whole app. Resolution order for a track:
 *   1. offline copy in the audio IndexedDB (works with zero network),
 *   2. the moshaf server URL (streaming).
 * The engine owns ALL audio-element events and patches the player bar's DOM
 * directly (time, seek range, buffering) via a registered patch callback —
 * never through the store, so a playing track never triggers view re-renders
 * or localStorage writes. Only coarse state changes (track, play/pause,
 * error) go through dispatched actions.
 */

import { getAudio } from './audioStore.js';

let audioEl = null;
let patchFn = null; // (info) => void — DOM patch callback
let endedHandler = null; // configured by app.js for repeat/autoplay logic
let errorFn = null; // notified when the element itself errors mid-stream
let stateFn = null; // notified on real play/pause/ended transitions
let currentObjectUrl = null;
let switching = false; // suppresses state sync while swapping tracks
let intendPlay = false; // we WANT playback — covers stalled loads where the
// element sits paused-but-loading with play() still pending

function el() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

function releaseObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export function onPlayerPatch(fn) {
  patchFn = fn;
}
export function onTrackEnded(fn) {
  endedHandler = fn;
}
/** Called when the <audio> element itself errors (dead URL, mid-stream drop). */
export function onPlayerError(fn) {
  errorFn = fn;
}
/** Called on real playing-state transitions of the element (not while
 *  switching tracks), so the store can never claim "playing" while the
 *  element is actually paused by the OS, headphones, a tab suspension… */
export function onPlayingStateChange(fn) {
  stateFn = fn;
}

function notifyState() {
  if (!stateFn || switching) return;
  const a = el();
  stateFn(!a.paused && !a.ended);
}

function emit() {
  if (!patchFn) return;
  const a = el();
  patchFn({
    playing: !a.paused && !a.ended,
    currentTime: a.currentTime || 0,
    duration: Number.isFinite(a.duration) ? a.duration : 0,
    buffered: a.buffered?.length ? a.buffered.end(a.buffered.length - 1) : 0,
    rate: a.playbackRate,
    // Buffering = we intend to play but there is no future data yet — true
    // both while playing with an empty buffer AND while a stalled load
    // leaves the element paused with play() still pending.
    buffering: intendPlay && !a.ended && a.readyState < 3,
  });
}

function wireEventsOnce() {
  const a = el();
  if (a.__nurWired) return;
  a.__nurWired = true;
  a.addEventListener('timeupdate', emit);
  a.addEventListener('durationchange', emit);
  a.addEventListener('progress', emit);
  a.addEventListener('play', () => {
    emit();
    notifyState();
  });
  a.addEventListener('pause', () => {
    emit();
    notifyState();
  });
  a.addEventListener('playing', emit);
  a.addEventListener('waiting', emit);
  a.addEventListener('canplay', emit);
  a.addEventListener('ended', () => {
    intendPlay = false;
    emit();
    notifyState();
    endedHandler?.();
  });
  a.addEventListener('error', () => {
    console.error('[player] audio error', a.error?.code);
    intendPlay = false;
    emit();
    errorFn?.();
  });
}

/**
 * Load and play a surah for a moshaf.
 * url: the network URL (string) — used only if no offline copy exists.
 * Resolves { offline, error } — error is true when playback could not
 * start (autoplay rejection / dead URL), so the caller can revert the
 * optimistic playing state and tell the person what happened instead of
 * showing a player bar that mimes playing forever.
 */
export async function play(moshafId, surahNumber, url) {
  wireEventsOnce();
  releaseObjectUrl();
  switching = true;
  const a = el();
  a.pause();

  let offline = false;
  let error = false;
  try {
    const blob = await getAudio(moshafId, surahNumber);
    if (blob) {
      currentObjectUrl = URL.createObjectURL(blob);
      a.src = currentObjectUrl;
      offline = true;
    } else {
      a.src = url;
    }
    a.playbackRate = a.playbackRate || 1;
    intendPlay = true;
    emit();
    try {
      await a.play();
    } catch (err) {
      console.error('[player] play() rejected', err);
      error = true;
      intendPlay = false;
      emit();
    }
  } catch (err) {
    // e.g. IndexedDB blew up mid-lookup — surface it, never swallow it.
    console.error('[player] track load failed', err);
    error = true;
    intendPlay = false;
  } finally {
    switching = false;
    notifyState();
  }
  return { offline, error };
}

export function toggle() {
  const a = el();
  if (a.paused) {
    intendPlay = true;
    a.play().catch(() => {
      emit();
      notifyState();
    });
  } else a.pause();
  emit();
}

export function pause() {
  intendPlay = false;
  el().pause();
  emit();
}

export function seek(seconds) {
  const a = el();
  if (Number.isFinite(seconds)) {
    a.currentTime = Math.max(0, Math.min(seconds, a.duration || seconds));
  }
  emit();
}

export function setRate(r) {
  const a = el();
  a.playbackRate = r;
  emit();
}

export function stop() {
  const a = el();
  intendPlay = false;
  a.pause();
  a.removeAttribute('src');
  a.load();
  releaseObjectUrl();
  emit();
}

export function currentSrc() {
  return el().currentSrc || '';
}

/** Live duration (0 when unknown) — used by the seek change handler. */
export function duration() {
  const d = el().duration;
  return Number.isFinite(d) ? d : 0;
}
