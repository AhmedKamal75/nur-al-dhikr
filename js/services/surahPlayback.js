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

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

let session = null; // { surah, ayah, total, reciterId, surahsMeta, active, repeat, repeatsLeft, continuous }
let ayahChangeCb = null; // (surah, ayah|null) — null = session over
let errorCb = null; // (surah, ayah) — verse audio failed

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

function playCurrent() {
  const url = ayahAudioUrl(session.surahsMeta, session.reciterId, session.surah, session.ayah);
  if (!url) {
    failSession();
    return;
  }
  driverPlay(url, ayahKey(session.surah, session.ayah));
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
 *  continuous } | inactive. `total` reports the EFFECTIVE end (the range
 *  bound when a range is playing) so progress readouts show x/range. */
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
    };
  return {
    active: session.active,
    surah: session.surah,
    ayah: session.ayah,
    total: session.end,
    end: session.end,
    repeat: session.repeat,
    continuous: session.continuous === true,
  };
}

/**
 * Start (or restart) a session. `from` defaults to ayah 1. `to` (v5.0.0)
 * optionally bounds the session to an ayah RANGE — the session ends
 * (or rolls to the next surah in listen mode) at `to` instead of the
 * surah's last ayah. Stopping any previous session first — there is
 * exactly one engine and one voice.
 */
export function start({ surah, from = 1, to = null, total, reciterId, surahsMeta, repeat = 1 }) {
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
  session = {
    surah: s,
    ayah: Number.isFinite(f) && f >= 1 && f <= t ? f : 1,
    total: t,
    end,
    reciterId: String(reciterId || ''),
    surahsMeta: Array.isArray(surahsMeta) ? surahsMeta : null,
    active: true,
    repeat: normalizeRepeat(repeat),
    continuous: false,
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
  session.total = nextTotal;
  session.repeatsLeft = session.repeat;
  notify(nextS, 1);
  playCurrent();
  return true;
}

/** Stop the session (user tap, other audio starting, engine failure). */
export function stop() {
  if (!session) return;
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
  session.repeat = normalizeRepeat(r);
  session.repeatsLeft = session.repeat;
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
  const d = Math.sign(Math.floor(Number(delta)) || 0);
  if (d === 0) return snapshot();
  const target = session.ayah + d;
  if (target > session.end) {
    if (session.continuous && advanceSurah()) return snapshot();
    stop();
    return snapshot();
  }
  session.ayah = Math.max(1, target);
  session.repeatsLeft = session.repeat;
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
  const next = nextAyah(session.ayah, session.end);
  if (next == null) {
    if (session.continuous && advanceSurah()) return; // listen mode rolls on
    stop(); // surah-scoped: last ayah ends the session (notifies null)
    return;
  }
  session.ayah = next;
  session.repeatsLeft = session.repeat;
  notify(session.surah, next);
  playCurrent();
}

function onVerseFailed() {
  if (!session || !session.active) return;
  failSession();
}
