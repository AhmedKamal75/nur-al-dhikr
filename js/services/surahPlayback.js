/**
 * surahPlayback.js
 * Continuous surah recitation: play a surah verse-by-verse with automatic
 * advance — the "listen to the whole surah and follow along" mode. Closes
 * the last Critical TODO item; works in BOTH reading modes (the classic
 * reader scrolls to the reciting ayah, the Mushaf flips pages to follow it).
 *
 * Design:
 *  - The engine is a small state machine over the SHARED single <audio>
 *    element in recitation.js (one voice in the whole app, ever). It drives
 *    recitation through a swappable driver so tests can inject a fake and
 *    simulate 'ended' events without any audio device.
 *  - Pure helpers (nextAyah, resolvePage) are exported for unit tests.
 *  - The engine knows nothing about the DOM or the store: app.js subscribes
 *    via onAyahChange() and mirrors progress into state.surahPlayback, and
 *    owns the follow-scroll / page-flip effects.
 *  - A session is surah-scoped: reaching the last ayah ends it (the Sunnah-
 *    standard behaviour every major app ships). Starting any other audio
 *    (full-surah player, single-ayah play) stops the session — one voice.
 */

import { ayahAudioUrl } from './mushaf.js';
import {
  driverPlay,
  driverStop,
  driverOnEnded,
  driverOnError,
  driverSetVolume,
  driverSetRate,
} from './recitation.js';
import { SLEEP_TIMER_CHOICES, volumeAt, countdownLabel } from '../domain/sleepTimer.js';

export { SLEEP_TIMER_CHOICES };

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** Next ayah number within a surah, or null at the end (surah-scoped). */
export function nextAyah(ayah, total) {
  const a = Math.floor(Number(ayah));
  const t = Math.floor(Number(total));
  if (!Number.isFinite(a) || !Number.isFinite(t) || a < 1 || t < 1) return null;
  return a < t ? a + 1 : null;
}

/** Mushaf page holding a (surah, ayah), from mushaf-meta's ayahPages map. */
export function resolvePage(ayahPages, surah, ayah) {
  if (!ayahPages || typeof ayahPages !== 'object') return null;
  const page = ayahPages[`${Number(surah)}:${Number(ayah)}`];
  return Number.isInteger(page) && page >= 1 && page <= 604 ? page : null;
}

/** Stable key for an ayah, same shape recitation.js uses everywhere. */
export const ayahKey = (surah, ayah) => `${surah}:${ayah}`;

/**
 * Resolve queue item `queue[idx]` against the surah meta into playable
 * bounds { surah, from, end, total }, or null when the entry is junk
 * (bad surah number, unknown ayah count). Pure — shared by the advance
 * path and the prefetch peek so both agree on what "next" means.
 */
export function resolveQueueItem(queue, idx, surahsMeta) {
  if (!Array.isArray(queue)) return null;
  const item = queue[idx];
  if (!item || typeof item !== 'object') return null;
  const s = Math.floor(Number(item.surah));
  if (!Number.isFinite(s) || s < 1 || s > 114) return null;
  const meta = Array.isArray(surahsMeta) ? surahsMeta.find((m) => Number(m.number) === s) : null;
  const total = Math.floor(Number(meta?.ayahCount));
  if (!Number.isFinite(total) || total < 1) return null;
  const f = Math.floor(Number(item.from));
  const from = Number.isFinite(f) && f >= 1 && f <= total ? f : 1;
  const e = Math.floor(Number(item.to));
  const end = Number.isFinite(e) && e >= 1 && e <= total ? Math.max(e, from) : total;
  return { surah: s, from, end, total };
}

/** Identity of a queue's item sequence — lets views/handlers recognize
 *  which saved playlist a running session is playing (the engine holds
 *  items, not playlist ids). */
export function queueSignature(items) {
  if (!Array.isArray(items)) return '';
  return JSON.stringify(
    items.map((it) => [Number(it?.surah) || 0, Number(it?.from) || 0, Number(it?.to) || 0])
  );
}

/** Sanitize a caller-supplied queue into [{ surah, from, to }] (or null).
 *  Bounds clamp at load time against live meta — here we only keep the
 *  shape honest so hostile data-attributes can't smuggle strings in. */
export function normalizeQueue(queue) {
  if (!Array.isArray(queue) || !queue.length) return null;
  const out = [];
  for (const item of queue.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue;
    const s = Math.floor(Number(item.surah));
    if (!Number.isFinite(s) || s < 1 || s > 114) continue;
    out.push({
      surah: s,
      from: Math.floor(Number(item.from)) || 1,
      to: item.to == null ? null : Math.floor(Number(item.to)) || null,
    });
  }
  return out.length ? out : null;
}

/**
 * Per-ayah repeat budget (v3.17 hifz): how many times EACH ayah plays before
 * the session advances. 1 = off; 3/5/10 = that many plays; -1 = loop the
 * current ayah forever (the recite-next skip is the exit). The chip cycles
 * REPEAT_CYCLE; anything else normalizes to 1.
 */
export const REPEAT_CYCLE = [1, 3, 5, 10, -1];

export function normalizeRepeat(r) {
  return REPEAT_CYCLE.includes(r) ? r : 1;
}

export function nextRepeat(r) {
  const i = REPEAT_CYCLE.indexOf(normalizeRepeat(r));
  return REPEAT_CYCLE[(i + 1) % REPEAT_CYCLE.length];
}

/**
 * Range/surah loop (A–B loop ×N): how many times the WHOLE session bounds
 * play before the session closes. 1 = off; 2/3/5/10 = that many passes;
 * the chip cycles LOOP_CYCLE. Distinct from per-ayah `repeat`: loop ×3 on
 * a 1–10 range plays 1…10 three times (the memorization staple).
 */
export const LOOP_CYCLE = [1, 2, 3, 5, 10];

export function normalizeLoop(n) {
  const v = Math.floor(Number(n));
  return LOOP_CYCLE.includes(v) ? v : 1;
}

export function nextLoop(n) {
  const i = LOOP_CYCLE.indexOf(normalizeLoop(n));
  return LOOP_CYCLE[(i + 1) % LOOP_CYCLE.length];
}

/** Verse playback speed ladder (shared with the full-surah player's RATES).
 *  Anything finite clamps into 0.5–2 (the platform's sane range). */
export const VERSE_RATES = [1, 1.25, 1.5, 0.75];

export function normalizeSpeed(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, n));
}

export function nextSpeed(v) {
  const i = VERSE_RATES.indexOf(normalizeSpeed(v));
  return VERSE_RATES[(i + 1) % VERSE_RATES.length];
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

let session = null; // { surah, ayah, from, total, end, reciterId, reciterIdB, compare, comparePass, ranged, surahsMeta, active, repeat, repeatsLeft, loop, loopsLeft, speed, continuous }
let ayahChangeCb = null; // (surah, ayah|null) — null = session over
let errorCb = null; // (surah, ayah) — verse audio failed

// (v5.2.0) Listen-and-repeat ("echo") mode: after each ayah finishes,
// the engine holds a silence for you to recite it back, then advances.
// `waitTimer` owns the pending advance; it is the ONLY timer in this
// module and is cleared on stop/skip/mode-off so a stale fire can never
// advance a dead or moved session (guarded by session token + key).
let waitTimer = null;
let waitToken = 0;
export const ECHO_PAUSE_MIN_MS = 3000;
export const ECHO_PAUSE_MAX_MS = 30000;
export const ECHO_PAUSE_DEFAULT_MS = 8000;

/** Clamp an echo pause into the sane window; garbage → default. */
export function normalizeEchoPause(ms) {
  const n = Math.floor(Number(ms));
  if (!Number.isFinite(n)) return ECHO_PAUSE_DEFAULT_MS;
  return Math.min(ECHO_PAUSE_MAX_MS, Math.max(ECHO_PAUSE_MIN_MS, n));
}

/* (v4.4) Sleep timer — listen mode fades out and stops after N minutes.
 * The pure math lives in domain/sleepTimer.js; this is the ticking half. */
let sleep = null; // { endsAtMs, minutes }
let sleepTick = null; // interval id

function applyVolumeNow() {
  const v = volumeAt(sleep ? { enabled: true, endsAtMs: sleep.endsAtMs } : null, Date.now());
  driverSetVolume(v);
  if (sleep && v <= 0) {
    clearSleepTimer();
    stop();
  }
}

/** Arm the listen-mode sleep timer (minutes from SLEEP_TIMER_CHOICES). */
export function armSleepTimer(minutes) {
  const m = SLEEP_TIMER_CHOICES.includes(minutes) ? minutes : 30;
  sleep = { minutes: m, endsAtMs: Date.now() + m * 60_000 };
  if (sleepTick) clearInterval(sleepTick);
  sleepTick = setInterval(applyVolumeNow, 1000);
  applyVolumeNow();
  return sleepSnapshot();
}

/** Cancel the sleep timer and restore full volume. */
export function clearSleepTimer() {
  sleep = null;
  if (sleepTick) clearInterval(sleepTick);
  sleepTick = null;
  driverSetVolume(1);
  return sleepSnapshot();
}

/** { enabled, minutes, endsAtMs, label } for the UI. */
export function sleepSnapshot() {
  if (!sleep) return { enabled: false, minutes: null, label: '' };
  return {
    enabled: true,
    minutes: sleep.minutes,
    label: countdownLabel({ enabled: true, endsAtMs: sleep.endsAtMs }, Date.now()),
  };
}

function notify(surah, ayah) {
  ayahChangeCb?.(surah, ayah);
}

/** Which reciter voice plays the CURRENT play (compare mode: pass 1 = voice B). */
export function currentReciterId() {
  if (!session) return null;
  if (session.compare === true && session.comparePass === 1 && session.reciterIdB)
    return session.reciterIdB;
  return session.reciterId;
}

function playCurrent() {
  const url = ayahAudioUrl(session.surahsMeta, currentReciterId(), session.surah, session.ayah);
  if (!url) {
    failSession();
    return;
  }
  driverSetRate(session.speed);
  driverPlay(url, ayahKey(session.surah, session.ayah));
  prefetchNext();
}

/**
 * Gapless handoff: while the current ayah plays, warm the NEXT audio file
 * so the browser has it (DNS + first bytes) before the 'ended' event fires.
 * Best-effort only — never throws, never plays. The pure URL half lives in
 * peekNextUrl() so tests can assert the prefetch target without an Audio device.
 */
function warmAudio(url) {
  try {
    if (!url || typeof Audio === 'undefined') return;
    if (!warmAudio.el) {
      warmAudio.el = new Audio();
      warmAudio.el.preload = 'auto';
    }
    if (warmAudio.el.src !== url) warmAudio.el.src = url;
  } catch {
    /* prefetch must never break playback */
  }
}

/** The audio URL the engine will need NEXT (compare B-pass, repeat, or advance). */
export function peekNextUrl() {
  if (!session || !session.active) return null;
  // Compare mode mid-ayah: the same ayah with voice B comes next.
  if (session.compare === true && session.comparePass === 0 && session.reciterIdB) {
    return ayahAudioUrl(session.surahsMeta, session.reciterIdB, session.surah, session.ayah);
  }
  // Repeat budget remaining (or infinite loop): same ayah, current voice.
  if (session.repeat === -1 || (session.repeat > 1 && session.repeatsLeft > 1)) {
    return ayahAudioUrl(session.surahsMeta, currentReciterId(), session.surah, session.ayah);
  }
  const next = nextAyah(session.ayah, session.end);
  if (next != null) {
    return ayahAudioUrl(
      session.surahsMeta,
      session.compare === true && session.reciterIdB ? session.reciterId : currentReciterId(),
      session.surah,
      next
    );
  }
  // End of surah with listen mode: first ayah of the next surah (when known).
  if (session.continuous === true && !session.ranged && session.surah < 114) {
    const meta = session.surahsMeta?.find((m) => Number(m.number) === session.surah + 1);
    const nextTotal = Math.floor(Number(meta?.ayahCount));
    if (Number.isFinite(nextTotal) && nextTotal >= 1) {
      return ayahAudioUrl(session.surahsMeta, session.reciterId, session.surah + 1, 1);
    }
  }
  // Loop armed with passes left: the bounds restart at `from`.
  if (session.loop > 1 && session.loopsLeft > 1) {
    return ayahAudioUrl(session.surahsMeta, session.reciterId, session.surah, session.from);
  }
  // Queued range next: first resolvable item after the current one.
  if (Array.isArray(session.queue)) {
    for (let i = session.qIndex + 1; i < session.queue.length; i++) {
      const r = resolveQueueItem(session.queue, i, session.surahsMeta);
      if (r) return ayahAudioUrl(session.surahsMeta, session.reciterId, r.surah, r.from);
    }
  }
  return null;
}

function prefetchNext() {
  warmAudio(peekNextUrl());
}

function failSession() {
  const { surah, ayah } = session ?? {};
  stop();
  errorCb?.(surah, ayah);
}

export function isActive() {
  return !!(session && session.active);
}

/** Snapshot for UI state: { active, surah, ayah, total, end, repeat,
 *  continuous, listenRepeat, waiting, reciterId, reciterIdB, compare,
 *  loop, speed } | inactive. `total` reports the EFFECTIVE end (the range
 *  bound when a range is playing) so progress readouts show x/range.
 *  `waiting` is the echo-mode "your turn" pause. */
export function snapshot() {
  if (!session)
    return {
      active: false,
      surah: null,
      ayah: null,
      total: 0,
      end: 0,
      repeat: 1,
      continuous: false,
      listenRepeat: false,
      waiting: false,
      reciterId: null,
      reciterIdB: null,
      compare: false,
      loop: 1,
      speed: 1,
      queue: null,
      qIndex: null,
    };
  return {
    active: session.active,
    surah: session.surah,
    ayah: session.ayah,
    total: session.end,
    end: session.end,
    repeat: session.repeat,
    continuous: session.continuous === true,
    listenRepeat: session.listenRepeat === true,
    waiting: session.waiting === true,
    reciterId: session.reciterId || null,
    reciterIdB: session.reciterIdB || null,
    compare: session.compare === true,
    loop: session.loop,
    speed: session.speed,
    queue: Array.isArray(session.queue) ? session.queue : null,
    qIndex: session.qIndex,
  };
}

/**
 * Start (or restart) a session. `from` defaults to ayah 1. `to` (v5.0.0)
 * optionally bounds the session to an ayah RANGE — the session ends
 * (or rolls to the next surah in listen mode) at `to` instead of the
 * surah's last ayah. Stopping any previous session first — there is
 * exactly one engine and one voice.
 */
export function start({
  surah,
  from = 1,
  to = null,
  total,
  reciterId,
  reciterIdB = null,
  compare = false,
  surahsMeta,
  repeat = 1,
  loop = 1,
  speed = 1,
  queue = null,
  qIndex = 0,
}) {
  stop();
  const s = Math.floor(Number(surah));
  const t = Math.floor(Number(total));
  const f = Math.floor(Number(from));
  const e = Math.floor(Number(to));
  if (!Number.isFinite(s) || s < 1 || s > 114) throw new Error('surah out of range');
  if (!Number.isFinite(t) || t < 1) throw new Error('total out of range');
  // (v5.0.0) the range end: clamped into [from, total] so a hostile
  // data-attribute can never invent an ayah.
  const end =
    Number.isFinite(e) && e >= 1 && e <= t ? Math.max(e, Number.isFinite(f) && f >= 1 ? f : 1) : t;
  const b = typeof reciterIdB === 'string' && reciterIdB ? reciterIdB : null;
  const startAyah = Number.isFinite(f) && f >= 1 && f <= t ? f : 1;
  session = {
    surah: s,
    ayah: startAyah,
    from: startAyah,
    total: t,
    end,
    // A bounded range (to < total) never rolls into the next surah —
    // "play 1–10 continuously" means repeat/stop at 10, not wander on.
    ranged: end < t,
    reciterId: String(reciterId || ''),
    reciterIdB: b,
    compare: compare === true && !!b,
    comparePass: 0,
    surahsMeta: Array.isArray(surahsMeta) ? surahsMeta : null,
    active: true,
    repeat: normalizeRepeat(repeat),
    loop: normalizeLoop(loop),
    loopsLeft: normalizeLoop(loop),
    speed: normalizeSpeed(speed),
    queue: normalizeQueue(queue),
    qIndex: Number.isFinite(Math.floor(Number(qIndex))) ? Math.floor(Number(qIndex)) : 0,
    continuous: false,
    // (v5.2.0) echo mode starts off; the toggle owns it mid-session.
    listenRepeat: false,
    waiting: false,
    echoPauseMs: ECHO_PAUSE_DEFAULT_MS,
  };
  session.repeatsLeft = session.repeat;
  // Register on the CURRENT driver each start — the driver can be swapped
  // (tests inject fakes; production always uses the real audio element).
  driverOnEnded(onVerseEnded);
  driverOnError(onVerseFailed);
  notify(s, session.ayah);
  playCurrent();
  return snapshot();
}

/** (v4.4) Listen mode: keep playing surah after surah until stopped. */
export function setContinuous(enabled) {
  if (!session) return snapshot();
  session.continuous = enabled === true;
  return snapshot();
}

/**
 * (v5.2.0) Listen-and-repeat ("echo") mode: after each ayah's repeat
 * budget finishes, hold `pauseMs` of silence for the listener to recite
 * it back, then advance. Turning it off (or stopping/skipping) cancels a
 * pending pause immediately. While waiting, snapshot().waiting is true so
 * the console can show the "your turn" state.
 */
export function setListenRepeat(on, pauseMs = ECHO_PAUSE_DEFAULT_MS) {
  if (!session) return snapshot();
  clearEchoWait();
  session.listenRepeat = on === true;
  session.waiting = false;
  if (on === true) session.echoPauseMs = normalizeEchoPause(pauseMs);
  return snapshot();
}

function clearEchoWait() {
  if (waitTimer) clearTimeout(waitTimer);
  waitTimer = null;
  waitToken += 1;
  if (session) session.waiting = false;
}

/**
 * Live-set the bounds loop (A–B loop ×N) mid-session — restarts the pass
 * counter so the new budget applies from the next boundary, predictably.
 */
export function setLoop(n) {
  if (!session) return snapshot();
  clearEchoWait();
  session.loop = normalizeLoop(n);
  session.loopsLeft = session.loop;
  return snapshot();
}

/**
 * Live-set the verse playback speed (0.5–2). Applies instantly to the
 * running element — no restart, no lost position.
 */
export function setSpeed(v) {
  if (!session) return snapshot();
  session.speed = normalizeSpeed(v);
  driverSetRate(session.speed);
  prefetchNext();
  return snapshot();
}

/**
 * Load the next resolvable queue item after the current one (skipping junk
 * entries). Returns true and starts playing it, or false when the queue is
 * spent — the caller then stops the session.
 */
function advanceQueue() {
  if (!session || !session.active || !Array.isArray(session.queue)) return false;
  for (let i = session.qIndex + 1; i < session.queue.length; i++) {
    const r = resolveQueueItem(session.queue, i, session.surahsMeta);
    if (!r) continue;
    session.qIndex = i;
    session.surah = r.surah;
    session.ayah = r.from;
    session.from = r.from;
    session.total = r.total;
    session.end = r.end;
    session.ranged = r.end < r.total;
    session.repeatsLeft = session.repeat;
    session.loopsLeft = session.loop;
    session.comparePass = 0;
    notify(r.surah, r.from);
    playCurrent();
    return true;
  }
  return false;
}

/** Advance one ayah inside the session (shared by natural + echo paths). */
function advanceAyah() {
  const next = nextAyah(session.ayah, session.end);
  if (next == null) {
    // A bounded range never rolls on, even in listen mode.
    if (session.continuous && !session.ranged && advanceSurah()) return;
    // Loop armed with passes left: restart the bounds at `from` (a manual
    // skip-past-end still ends the session — only natural play loops).
    if (session.loop > 1 && session.loopsLeft > 1) {
      session.loopsLeft -= 1;
      session.ayah = session.from;
      session.repeatsLeft = session.repeat;
      session.comparePass = 0;
      notify(session.surah, session.from);
      playCurrent();
      return;
    }
    // A queued range list rolls into its next resolvable item.
    if (advanceQueue()) return;
    stop(); // surah-scoped: last ayah ends the session (notifies null)
    return;
  }
  session.ayah = next;
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  notify(session.surah, next);
  playCurrent();
}

/** Advance the session to the next surah (listen mode + skip-past-end). */
function advanceSurah() {
  if (!session || !session.active) return false;
  if (session.surah >= 114) {
    stop();
    return false;
  }
  const nextS = session.surah + 1;
  const meta = session.surahsMeta?.find((m) => Number(m.number) === nextS);
  const nextTotal = Math.floor(Number(meta?.ayahCount));
  if (!Number.isFinite(nextTotal) || nextTotal < 1) {
    stop();
    return false;
  }
  session.surah = nextS;
  session.ayah = 1;
  // The new surah owns its own bounds: total AND end both reset, so a
  // 7-ayah Fatiha rolling into 286-ayah Baqarah plays all 286 (and a long
  // surah rolling into a short one can never invent ayahs past its end).
  session.total = nextTotal;
  session.end = nextTotal;
  session.ranged = false;
  session.from = 1;
  session.comparePass = 0;
  session.repeatsLeft = session.repeat;
  // In listen mode the loop budget applies per surah, then rolls on.
  session.loopsLeft = session.loop;
  notify(nextS, 1);
  playCurrent();
  return true;
}

/**
 * Live-switch the reciter voice mid-session (the "always the same reciter"
 * fix): updates the session voice and restarts the CURRENT ayah with it,
 * so the change is audible instantly instead of on the next manual play.
 * A compare B-voice switch restarts the current pass the same way.
 */
export function setReciter(reciterId) {
  if (!session) return snapshot();
  const id = typeof reciterId === 'string' && reciterId ? reciterId : session.reciterId;
  if (!id || id === session.reciterId) return snapshot();
  clearEchoWait();
  session.reciterId = id;
  session.comparePass = 0;
  notify(session.surah, session.ayah);
  playCurrent();
  return snapshot();
}

/** Live-set voice B for compare mode (restarts the current ayah when comparing). */
export function setReciterB(reciterIdB) {
  if (!session) return snapshot();
  const b = typeof reciterIdB === 'string' && reciterIdB ? reciterIdB : null;
  session.reciterIdB = b;
  if (!b) session.compare = false;
  clearEchoWait();
  session.comparePass = 0;
  if (session.active) {
    notify(session.surah, session.ayah);
    playCurrent();
  }
  return snapshot();
}

/**
 * Compare-two-reciters mode: each ayah plays with voice A then the SAME
 * ayah with voice B before the session advances (× repeat budget). Needs a
 * B voice; turning it on without one is a no-op that reports off.
 */
export function setCompare(on) {
  if (!session) return snapshot();
  clearEchoWait();
  const next = on === true && !!session.reciterIdB;
  session.compare = next;
  session.comparePass = 0;
  if (session.active) {
    notify(session.surah, session.ayah);
    playCurrent();
  }
  return snapshot();
}

/** Stop the session (user tap, other audio starting, engine failure). */
export function stop() {
  if (!session) return;
  clearEchoWait();
  const wasActive = session.active;
  session = null;
  driverStop();
  if (wasActive) notify(null, null);
}

/** Live-toggle follow-highlight (the eye chip) mid-session. */
export function setFollow(enabled) {
  if (session) session.follow = enabled === true;
}

export function follow() {
  return session ? session.follow !== false : true;
}

/** Live-set the per-ayah repeat budget mid-session (also restarts the
 *  current ayah's loop budget — predictable, no hidden remainder). */
export function setRepeat(r) {
  if (!session) return snapshot();
  const wasWaiting = session.waiting === true;
  clearEchoWait();
  session.repeat = normalizeRepeat(r);
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  if (wasWaiting) {
    // A budget change mid-pause restarts the current ayah immediately —
    // leaving the session parked in silence with no timer would strand it.
    notify(session.surah, session.ayah);
    playCurrent();
  }
  return snapshot();
}

/**
 * Manual navigation inside a session (the repeat chip's exit hatches):
 * skip(+1) next ayah, skip(-1) previous — clamped to the surah; skipping
 * past the last ayah ends the session (surah-scoped, like natural play).
 * A skip resets the current ayah's repeat budget.
 */
export function skip(delta) {
  if (!session || !session.active) return snapshot();
  clearEchoWait();
  const d = Math.sign(Math.floor(Number(delta)) || 0);
  if (d === 0) return snapshot();
  const target = session.ayah + d;
  if (target > session.end) {
    if (session.continuous && !session.ranged && advanceSurah()) return snapshot();
    if (advanceQueue()) return snapshot();
    stop();
    return snapshot();
  }
  session.ayah = Math.max(1, target);
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  notify(session.surah, session.ayah);
  playCurrent();
  return snapshot();
}

export function onAyahChange(cb) {
  ayahChangeCb = cb;
}

export function onError(cb) {
  errorCb = cb;
}

function onVerseEnded(finishedKey) {
  if (!session || !session.active) return;
  if (finishedKey !== ayahKey(session.surah, session.ayah)) return; // stale ended
  // Compare mode: voice A just finished → the SAME ayah with voice B plays
  // next (no budget consumed); voice B just finished → fall through to the
  // repeat/advance logic below with a fresh A-pass.
  if (session.compare === true && session.reciterIdB) {
    if (session.comparePass === 0) {
      session.comparePass = 1;
      playCurrent();
      return;
    }
    session.comparePass = 0;
  }
  // Hifz repeat budget: -1 loops the ayah forever; N plays it N times
  // before advancing. Loop replays keep the same key, so a stale 'ended'
  // from a previous ayah can never trigger a bogus replay.
  if (session.repeat === -1) {
    playCurrent();
    return;
  }
  if (session.repeat > 1 && session.repeatsLeft > 1) {
    session.repeatsLeft -= 1;
    playCurrent();
    return;
  }
  // (v5.2.0) echo pause: hold silence for the recite-back BEFORE leaving
  // the ayah. The token + key guard means only the pause scheduled by THIS
  // ayah's end can advance it — a stop/skip/mode-off in between wins.
  if (session.listenRepeat === true && nextAyah(session.ayah, session.end) != null) {
    const token = waitToken;
    const key = ayahKey(session.surah, session.ayah);
    session.waiting = true;
    notify(session.surah, session.ayah);
    waitTimer = setTimeout(() => {
      waitTimer = null;
      if (!session || !session.active || token !== waitToken) return;
      if (ayahKey(session.surah, session.ayah) !== key) return;
      session.waiting = false;
      advanceAyah();
    }, session.echoPauseMs);
    return;
  }
  advanceAyah();
}

function onVerseFailed() {
  if (!session || !session.active) return;
  failSession();
}
