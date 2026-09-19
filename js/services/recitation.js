/**
 * recitation.js
 * Shared verse-audio playback for streaming verse-by-verse Qur'an
 * recitation from a public CDN (see config.js quranAudioUrl). Nothing plays
 * without an explicit tap; nothing is proxied through this app's own
 * servers (there are none) — playback is a direct browser-to-CDN request,
 * the same as any <audio src> on a normal web page.
 *
 * (v5.10.4) Ping-pong elements for gapless ayah handoff: a FRONT (audible)
 * element plus a BACK spare that preloads the next ayah. When play() asks
 * for exactly the URL the spare already buffers, the spare is promoted to
 * front and starts instantly — no fetch, no decode wait, no pipeline
 * spin-up. All public semantics (one key, one voice, pause/resume/rate/
 * volume, error contract) are unchanged: every function below operates on
 * whichever element is front.
 *
 * (v5.10.4) The spare grew into a POOL: on slow connections one
 * lookahead starves whenever a fetch outlasts the ayah being played, so
 * the engine keeps up to k upcoming files buffered (k adapts to measured
 * throughput — see surahPlayback.js). Pool entries hold CDN URLs only,
 * never blobs; stop() drops the whole pool so abandoned sessions cost no
 * further bytes.
 *
 * (v5.10.7) PRIME-TO-PARKED: a pooled file that reaches canplaythrough is
 * played muted and paused at ~0, so its media pipeline is already spun up
 * — promotion then resumes a HOT pipeline instead of cold-starting one.
 * Best-effort with silent fallback to buffered swap (iOS Safari rejects
 * non-gesture play(): the catch restores volume and the file stays a
 * plain preload). Pooled 'playing' events only ever park; front playback
 * is untouched.
 *
 * Mirrors the plain-module-with-a-tracked-key shape of speech.js so app.js
 * can reflect "which ayah is currently playing" back into UI state.
 */

let frontEl = null; // the audible element — every function below uses this
const spares = new Map(); // url -> { el, bad, t0 } — hot buffer pool
// (v5.12.0) element mute (M key / mute chip): `muted`, not volume — the
// verse sleep fade owns volume while armed. Carried onto promotions and
// fresh fronts so voice/mode switches never unmute behind the user's back.
let mutedFlag = false;
// (v5.10.7) pool cap 10: engine lookahead caps at 8, plus headroom for a
// demotion in flight. ~150KB per entry worst case — bounded by design.
// (Why not unbounded: every pooled fetch competes for the browser's ~6
// per-host connections; a stampede would throttle the AUDIBLE file.)
const MAX_SPARES = 10;
let currentAttempt = null; // { urls, idx, seq } — the in-flight URL walk
let currentKey = null; // e.g. "2:255" — lets a card ask "is *this* ayah playing?"
const preloadSampleListeners = new Set();
// Whether the latest play() promoted a pooled spare (gap controller
// input). Forced false under test drivers so suites stay deterministic.
let lastSwapped = false;
let customDriver = false;
// (v5.2.75, BUG-08) supersede guard: tapping play on ayah B while ayah
// A's play() is still pending aborts A's load, whose .catch must NOT emit
// A's error toast nor clear B's key. Every play/resume/stop mints a
// sequence number; a rejection only lands when it is still the latest
// (mirrors the continuous engine's playSeq).
let playSeq = 0;
// (B3) listener SETS, not single slots: two owners (the toast wiring and
// the continuous engine) used to share one slot, so starting a verse
// session silently clobbered single-ayah failure toasts forever after.
const keyListeners = new Set();
const errorListeners = new Set();
const endedListeners = new Set();

function attachListeners(el) {
  el.addEventListener('ended', () => onElementEnded(el));
  el.addEventListener('error', () => onElementError(el));
  el.addEventListener('canplaythrough', () => onElementReady(el));
  el.addEventListener('playing', () => onElementPlaying(el));
}

function getFront() {
  if (!frontEl) {
    frontEl = new Audio();
    frontEl.preload = 'none';
    frontEl.__key = null;
    try {
      frontEl.muted = mutedFlag;
    } catch {
      /* element defaults stand */
    }
    attachListeners(frontEl);
  }
  return frontEl;
}

/** Drop a pooled entry: stop it, release its buffer, forget it. */
function dropSpare(url) {
  const entry = spares.get(url);
  if (!entry) return;
  spares.delete(url);
  try {
    entry.el.pause();
  } catch {
    /* already still */
  }
  try {
    entry.el.removeAttribute('src');
  } catch {
    /* fake elements in tests may lack it */
  }
  entry.el.__key = null;
}

/** Passive throughput sample: preload-start → canplaythrough, per URL.
 *  Only the still-pooled element reports — a superseded preload (new URL
 *  on the same slot, or an evicted entry) stays silent, so the engine's
 *  average is never polluted by abandoned fetches. Zero extra requests:
 *  the timing rides the preload the player needed anyway. */
function onElementReady(el) {
  if (el === frontEl) return;
  for (const [, entry] of spares) {
    if (entry.el === el && !entry.bad && !entry.reported) {
      entry.reported = true;
      const ms = Date.now() - entry.t0;
      if (Number.isFinite(ms) && ms >= 0) {
        for (const cb of [...preloadSampleListeners]) {
          try {
            cb(ms);
          } catch (err) {
            console.error('[recitation] preload-sample listener failed', err);
          }
        }
      }
      tryPrime(entry);
      return;
    }
  }
}

/**
 * (v5.10.7) Prime a buffered spare: play it MUTED, then park it paused at
 * ~0 on the first 'playing' event — its pipeline (decode, audio graph)
 * is then already spun up, so promotion resumes instead of cold-starting.
 * Best-effort: a rejected play() (iOS non-gesture policy) just restores
 * volume and leaves a plain buffered preload — strictly no worse.
 */
function tryPrime(entry) {
  const el = entry.el;
  if (!el || entry.bad || entry.priming || entry.primed) return;
  if (frontEl && el === frontEl) return;
  entry.priming = true;
  try {
    entry.primeVolume = Number.isFinite(Number(el.volume)) ? el.volume : 1;
  } catch {
    entry.primeVolume = 1;
  }
  try {
    el.volume = 0;
  } catch {
    /* ignore */
  }
  try {
    const r = el.play();
    if (r && typeof r.catch === 'function') {
      r.catch(() => {
        // Policy or resource refusal: stay a plain preload.
        entry.priming = false;
        try {
          el.volume = entry.primeVolume;
        } catch {
          /* ignore */
        }
      });
    }
  } catch {
    entry.priming = false;
    try {
      el.volume = entry.primeVolume;
    } catch {
      /* ignore */
    }
  }
}

/** Park a primed spare the instant its pipeline runs: pause + rewind to
 *  ~0 while still muted. Front playback is never touched — only pooled
 *  elements in a priming flight park here (a promoted element left the
 *  pool first, so its 'playing' is correctly ignored). */
function onElementPlaying(el) {
  if (el === frontEl) return;
  for (const [, entry] of spares) {
    if (entry.el !== el) continue;
    if (!entry.priming || entry.bad) return;
    entry.priming = false;
    try {
      el.pause();
    } catch {
      /* already still */
    }
    try {
      el.currentTime = 0;
    } catch {
      /* unseekable — starts near 0 anyway */
    }
    entry.primed = true;
    return;
  }
}

/** Subscribe to passive preload timings (the engine's EWMA input). */
export function onPreloadSample(callback) {
  if (typeof callback === 'function') preloadSampleListeners.add(callback);
}

function onElementEnded(el) {
  if (el !== frontEl) return; // pooled spares never play — ignore stray ends
  const finished = el.__key;
  el.__key = null;
  setKey(null);
  for (const cb of [...endedListeners]) {
    try {
      cb(finished);
    } catch (err) {
      console.error('[recitation] ended listener failed', err);
    }
  }
}

function onElementError(el) {
  if (el !== frontEl) {
    // Pooled spare failed to buffer (dead mirror) — mark it unpromotable.
    // No listeners, no key change: the failure is silent by design, the
    // advance path simply cold-plays instead.
    for (const entry of spares.values()) {
      if (entry.el === el) entry.bad = true;
    }
    return;
  }
  walkOrFail(el.__key);
}

/** Advance the in-flight URL walk, or admit failure once spent. Only the
 *  FINAL failure touches listeners/key — intermediate mirror deaths are
 *  silent, so one dead CDN file never toasts while its mirror plays. */
function walkOrFail(failedKey) {
  const attempt = currentAttempt;
  if (!attempt || attempt.seq !== playSeq) return; // superseded/stopped
  attempt.idx += 1;
  if (attempt.idx < attempt.urls.length) {
    playAttempt(attempt, failedKey);
    return;
  }
  currentAttempt = null;
  const failed = failedKey;
  setKey(null);
  for (const cb of [...errorListeners]) {
    try {
      cb(failed);
    } catch (err) {
      console.error('[recitation] error listener failed', err);
    }
  }
}

function setKey(key) {
  currentKey = key;
  for (const cb of [...keyListeners]) {
    try {
      cb(key);
    } catch (err) {
      console.error('[recitation] change listener failed', err);
    }
  }
}

/** Mute switch (element.muted — the sleep fade owns volume, see above). */
export function setMuted(on) {
  mutedFlag = on === true;
  if (frontEl) {
    try {
      frontEl.muted = mutedFlag;
    } catch {
      /* element defaults stand */
    }
  }
  return mutedFlag;
}

export function isMuted() {
  return mutedFlag;
}

/** Register a listener that's called whenever the playing ayah key changes. */
export function onPlaybackChange(callback) {
  if (typeof callback === 'function') keyListeners.add(callback);
}

/** Register a listener for verse-playback failures, so the UI can say why
 *  the button just reverted instead of failing in silence. */
export function onPlaybackError(callback) {
  if (typeof callback === 'function') errorListeners.add(callback);
}

export function offPlaybackError(callback) {
  errorListeners.delete(callback);
}

/** Register a listener that fires when a verse finishes playing NATURALLY
 *  (not via stop()) with the finished key — the seam the continuous
 *  surah-recitation engine (surahPlayback.js) advances on. */
export function onPlaybackEnded(callback) {
  if (typeof callback === 'function') endedListeners.add(callback);
}

export function offPlaybackEnded(callback) {
  endedListeners.delete(callback);
}

function emitError(key) {
  for (const cb of [...errorListeners]) {
    try {
      cb(key);
    } catch (err) {
      console.error('[recitation] error listener failed', err);
    }
  }
}

/** One attempt step: swap onto a pooled match, else cold-play. */
function playAttempt(attempt, key) {
  if (attempt.seq !== playSeq) return;
  const url = attempt.urls[attempt.idx];
  // Pool-hit: a spare already buffers exactly this file and is healthy —
  // promote it instead of re-fetching + re-decoding on the front element.
  const pooled = spares.get(url);
  if (pooled && !pooled.bad && Number(pooled.el.readyState) >= 2 && pooled.el !== frontEl) {
    promoteSpare(url, pooled.el, key, attempt);
    return;
  }
  const el = getFront();
  el.__key = key;
  el.src = url;
  lastSwapped = false;
  el.play().catch(() => {
    if (attempt.seq !== playSeq) return; // superseded — the newer play owns the element
    walkOrFail(key);
  });
}

/** Promote a pooled element to front: carry output state, retire the old
 *  front's buffer, and start instantly from buffered data. */
function promoteSpare(url, spare, key, attempt) {
  const old = frontEl === spare ? null : frontEl;
  const entry = spares.get(url);
  spares.delete(url);
  // A primed spare sits muted at ~0: restore audibility explicitly. With
  // no old front (first play), fall back to the pre-prime volume, never
  // the muted 0 — otherwise the promotion would play silence.
  const vol = old
    ? old.volume
    : Number.isFinite(Number(entry?.primeVolume))
      ? entry.primeVolume
      : 1;
  const rate = old ? old.playbackRate : spare.playbackRate;
  try {
    spare.volume = vol;
    spare.playbackRate = rate;
    spare.muted = mutedFlag;
  } catch {
    /* element defaults stand */
  }
  if (old) {
    try {
      old.pause();
    } catch {
      /* already still */
    }
    old.__key = null;
    try {
      old.removeAttribute('src');
    } catch {
      /* fake elements in tests may lack it */
    }
  }
  spare.__key = key;
  frontEl = spare;
  lastSwapped = true;
  setKey(key);
  spare.play().catch(() => {
    if (attempt.seq !== playSeq) return;
    walkOrFail(key);
  });
}

/**
 * Did the latest play() promote a pooled spare? The engine's fast-up rule
 * reads this right after dispatching: a miss on a streaming file means
 * congestion NOW. Always false under injected test drivers (their plays
 * never touch real elements) and after stop(), so suites stay
 * deterministic.
 */
export function lastPlaySwapped() {
  return !customDriver && lastSwapped;
}

/**
 * Drop pooled entries outside `keep` (skips/seeks must not leave stale
 * fetches burning quota). The audible front is never pooled — safe to
 * call with exactly the upcoming triple URLs after every prefetch.
 */
export function prunePool(keep) {
  const keepSet = new Set(Array.isArray(keep) ? keep.filter((u) => typeof u === 'string') : []);
  for (const url of [...spares.keys()]) {
    if (!keepSet.has(url)) dropSpare(url);
  }
}

/**
 * Buffer `url` on a pooled spare for a future swap-hit. No-ops for blobs
 * (object-URL lifetime belongs to the engine — the pool must only ever
 * hold CDN URLs), for empty input, for repeats of a pooled URL, and where
 * Audio is unavailable. Pool caps at 3 (oldest evicted first) so an
 * abandoned session can never hoard elements or bytes. Never throws,
 * never plays.
 */
export function preload(url) {
  if (typeof url !== 'string' || !url || url.startsWith('blob:')) return;
  if (typeof Audio === 'undefined') return;
  if (spares.has(url)) return;
  try {
    const el = new Audio();
    el.preload = 'auto';
    el.__key = null;
    attachListeners(el);
    spares.set(url, { el, bad: false, t0: Date.now(), reported: false });
    while (spares.size > MAX_SPARES) {
      const oldest = spares.keys().next().value;
      if (oldest === url) break;
      dropSpare(oldest);
    }
    el.src = url;
    if (typeof el.load === 'function') el.load();
  } catch {
    /* prefetch must never break playback */
  }
}

/**
 * Start playing `url` (or the first reachable of `urls`), tagged with
 * `key` for isPlaying()/UI reflection. A list walks silently until one
 * file plays — only the FINAL failure emits + clears, so one dead mirror
 * never toasts while its rescue plays (same contract as the engine's
 * streaming chain, now shared by single-ayah taps).
 */
export function play(url, key) {
  const urls = (Array.isArray(url) ? url : [url]).filter((u) => typeof u === 'string' && u);
  const seq = ++playSeq;
  if (!urls.length) {
    currentAttempt = null;
    emitError(key);
    setKey(null);
    return;
  }
  const attempt = { urls, idx: 0, seq };
  currentAttempt = attempt;
  setKey(key);
  playAttempt(attempt, key);
}

export function stop() {
  ++playSeq; // pending play()/resume() rejections die silently below
  currentAttempt = null;
  lastSwapped = false;
  if (frontEl) {
    // (v5.2.61) revoke spent Blob URLs (offline verse files) so repeated
    // plays never accumulate object URLs; CDN urls are unaffected.
    try {
      if (frontEl.src && frontEl.src.startsWith('blob:')) URL.revokeObjectURL(frontEl.src);
    } catch {
      /* already gone */
    }
    try {
      frontEl.pause();
    } catch {
      /* already still */
    }
    try {
      frontEl.removeAttribute('src');
    } catch {
      /* fake elements in tests may lack it */
    }
    frontEl.__key = null;
  }
  // Quota discipline: a stopped session drops its whole lookahead pool —
  // abandoned prefetches finish into detached elements at worst, and no
  // new bytes are requested after this point.
  for (const url of [...spares.keys()]) dropSpare(url);
  setKey(null);
}

/** Pause mid-ayah, keeping src + key so resume() continues in place. The
 *  spare keeps buffering underneath — resume-then-advance stays instant. */
export function pause() {
  if (frontEl && !frontEl.paused) {
    try {
      frontEl.pause();
    } catch {
      /* already still */
    }
  }
}

/** Resume after pause(). A failed resume surfaces as a playback error
 *  (same contract as play()) so the session ends honestly, never hung. */
export function resume() {
  if (!frontEl || !frontEl.paused || !frontEl.currentSrc) return;
  const key = currentKey;
  const seq = ++playSeq;
  const attempt = { urls: [frontEl.currentSrc], idx: 0, seq };
  currentAttempt = attempt;
  frontEl.play().catch(() => {
    if (attempt.seq !== playSeq) return; // superseded — the newer play owns the element
    walkOrFail(key);
  });
}

/** True when the element already played through (resume would no-op). */
export function hasEnded() {
  return !!frontEl && !!frontEl.currentSrc && frontEl.ended;
}

/** (v4.4) Sleep-timer fade: clamp volume on the audible element (the swap
 *  carries it to the next front, so fades survive ayah handoffs). */
export function setVolume(v) {
  const n = Number(v);
  if (frontEl && Number.isFinite(n)) frontEl.volume = Math.min(1, Math.max(0, n));
}

/** Verse speed: applies live to the audible element (takes effect instantly,
 *  no restart needed — the platform stretches the running buffer). */
export function setPlaybackRate(v) {
  const n = Number(v);
  if (frontEl && Number.isFinite(n)) frontEl.playbackRate = Math.min(2, Math.max(0.5, n));
}

export function isPlaying(key) {
  return currentKey === key;
}

export function currentlyPlayingKey() {
  return currentKey;
}

/* Surah-playback hands its own driver in via configureDriver() so the
 * continuous engine can be unit-tested without real audio. Optional
 * `preload(url)` warms the next file when the fake supports it. */
let driver = null;

export function configureDriver(custom) {
  driver = custom; // { play(url, key), stop(), onEnded(cb), onError(cb), preload?.(url) } | null
  customDriver = !!custom;
  lastSwapped = false;
}

function drv() {
  return (
    driver ?? {
      play: (url, key) => play(url, key),
      stop: () => stop(),
      onEnded: (cb) => onPlaybackEnded(cb),
      onError: (cb) => onPlaybackError(cb),
      offEnded: (cb) => offPlaybackEnded(cb),
      offError: (cb) => offPlaybackError(cb),
    }
  );
}

export function driverPlay(url, key) {
  drv().play(url, key);
}

export function driverStop() {
  drv().stop();
}

export function driverSetVolume(v) {
  if (driver?.setVolume) driver.setVolume(v);
  else setVolume(v);
}

export function driverSetRate(v) {
  if (driver?.setRate) driver.setRate(v);
  else setPlaybackRate(v);
}

export function driverPause() {
  if (driver?.pause) driver.pause();
  else pause();
}

export function driverResume() {
  if (driver?.resume) driver.resume();
  else resume();
}

export function driverHasEnded() {
  if (typeof driver?.ended === 'boolean') return driver.ended;
  return hasEnded();
}

export function driverOnEnded(cb) {
  drv().onEnded(cb);
}

export function driverOnError(cb) {
  drv().onError(cb);
}

export function driverOffEnded(cb) {
  try {
    drv().offEnded?.(cb);
  } catch {
    /* custom driver without removal — session guard still applies */
  }
}

export function driverOffError(cb) {
  try {
    drv().offError?.(cb);
  } catch {
    /* custom driver without removal — session guard still applies */
  }
}

export function driverPreload(url) {
  if (driver?.preload) {
    try {
      driver.preload(url);
    } catch {
      /* best-effort: warming must never break playback */
    }
    return;
  }
  preload(url);
}

/** Test-only: drop all listeners + driver between cases. The front element
 *  persists (as in production) but forgets its key; the pool is dropped. */
export function resetRecitationForTests() {
  keyListeners.clear();
  errorListeners.clear();
  endedListeners.clear();
  preloadSampleListeners.clear();
  driver = null;
  customDriver = false;
  lastSwapped = false;
  mutedFlag = false;
  playSeq = 0;
  currentAttempt = null;
  currentKey = null;
  if (frontEl) frontEl.__key = null;
  for (const url of [...spares.keys()]) dropSpare(url);
}
