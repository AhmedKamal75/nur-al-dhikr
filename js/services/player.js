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

import { getAudio as defaultGetAudio } from './audioStore.js';

let audioEl = null;
let patchFn = null; // (info) => void — DOM patch callback
let endedHandler = null; // configured by app.js for repeat/autoplay logic
let errorFn = null; // notified when the element itself errors mid-stream
let stateFn = null; // notified on real play/pause/ended transitions
let currentObjectUrl = null;
let switching = false; // suppresses element→store sync while the CURRENT swap runs
let intendPlay = false; // we WANT playback — covers stalled loads where the
// element sits paused-but-loading with play() still pending
let playSeq = 0; // THE guard: increments on every play()/stop()
let audioFetcher = defaultGetAudio; // test seam (see setAudioFetcher)

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
  if (a.__nurSeq == null) a.__nurSeq = playSeq;
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
    // Stale 'ended' from a superseded track must not trigger autoplay chains.
    if (a.__nurSeq !== playSeq) return;
    intendPlay = false;
    emit();
    notifyState();
    endedHandler?.();
  });
  a.addEventListener('error', () => {
    console.error('[player] audio error', a.error?.code);
    if (a.__nurSeq !== playSeq) return;
    intendPlay = false;
    emit();
    errorFn?.();
  });
}

/** Test seam: swap the offline-blob fetcher (mirrors surahPlayback's configureDriver). */
export function setAudioFetcher(fn) {
  if (fn) audioFetcher = fn;
}

export function resetAudioFetcher() {
  audioFetcher = defaultGetAudio;
}

/** Test-only: drop the singleton element + sequence so cases isolate. */
export function resetPlayerForTests() {
  try {
    audioEl?.pause?.();
  } catch {
    /* ignore */
  }
  releaseObjectUrl();
  audioEl = null;
  playSeq = 0;
  switching = false;
  intendPlay = false;
  audioFetcher = defaultGetAudio;
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
  // (B1) single-flight guard: every entry invalidates pending predecessors.
  const seq = ++playSeq;
  releaseObjectUrl();
  // Suppress element→store sync for THIS swap only; a stale exit must not
  // clear a newer swap's suppression (the old finally { switching = false } did).
  switching = true;
  const a = el();
  try {
    a.pause();
  } catch {
    /* element already paused */
  }
  // (F-001) declare play intent BEFORE the first await: a user pause()
  // during the offline lookup flips intendPlay back to false, and every
  // post-await checkpoint below honors it — the pause wins, silently.
  intendPlay = true;

  // Post-await unwind for a superseded or user-paused call: no src swap,
  // no blob URL, no ghost error. Clears THIS swap's suppression so the
  // pause propagates to the store exactly once.
  const unwindSilent = (offline) => {
    if (seq === playSeq) {
      switching = false;
      notifyState();
    }
    return { offline, error: false };
  };

  let offline = false;
  try {
    const blob = await audioFetcher(moshafId, surahNumber);
    // Loser unwinds silently: no src swap, no blob URL, no ghost error.
    if (seq !== playSeq || !intendPlay) return unwindSilent(false);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      // Re-check after the sync URL creation: a swap may have landed while
      // we built the URL — revoke ours instead of leaking it (B1 leak).
      if (seq !== playSeq || !intendPlay) {
        URL.revokeObjectURL(objectUrl);
        return unwindSilent(false);
      }
      currentObjectUrl = objectUrl;
      a.src = currentObjectUrl;
      offline = true;
    } else {
      a.src = url;
    }
    a.__nurSeq = seq;
    a.playbackRate = a.playbackRate || 1;
    emit();
    try {
      await a.play();
    } catch (err) {
      // A superseded call's abort — or the user's own pause aborting a
      // pending play() — is expected, never a user-facing failure.
      if (seq !== playSeq || !intendPlay) return unwindSilent(offline);
      console.error('[player] play() rejected', err);
      intendPlay = false;
      emit();
      if (seq === playSeq) {
        switching = false;
        notifyState();
      }
      return { offline, error: true };
    }
    // Late-resolving winner check: B's IDB read beat A's, A's src swap
    // must not clobber B's newer track (B1 wrong-track) — and a pause
    // that landed while play() resolved must not be papered over.
    if (seq !== playSeq || !intendPlay) return unwindSilent(offline);
    if (seq === playSeq) {
      switching = false;
      notifyState();
    }
    return { offline, error: false };
  } catch (err) {
    // e.g. IndexedDB blew up mid-lookup — surface it, never swallow it,
    // unless we already lost the race (then stay silent for the winner).
    if (seq !== playSeq) return { offline: false, error: false };
    console.error('[player] track load failed', err);
    intendPlay = false;
    emit();
    if (seq === playSeq) {
      switching = false;
      notifyState();
    }
    return { offline, error: true };
  }
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
  ++playSeq; // outstanding awaits become no-ops; stale ended/error ignored
  const a = el();
  intendPlay = false;
  switching = false;
  a.pause();
  a.removeAttribute('src');
  a.load();
  a.__nurSeq = playSeq;
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
