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
import { driverPlay, driverStop, driverOnEnded, driverOnError } from './recitation.js';

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

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

let session = null; // { surah, ayah, total, reciterId, surahsMeta, active }
let ayahChangeCb = null; // (surah, ayah|null) — null = session over
let errorCb = null; // (surah, ayah) — verse audio failed

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

/** Snapshot for UI state: { active, surah, ayah, total } | inactive shape. */
export function snapshot() {
  if (!session) return { active: false, surah: null, ayah: null, total: 0 };
  return {
    active: session.active,
    surah: session.surah,
    ayah: session.ayah,
    total: session.total,
  };
}

/**
 * Start (or restart) a session. `from` defaults to ayah 1. Stopping any
 * previous session first — there is exactly one engine and one voice.
 */
export function start({ surah, from = 1, total, reciterId, surahsMeta }) {
  stop();
  const s = Math.floor(Number(surah));
  const t = Math.floor(Number(total));
  const f = Math.floor(Number(from));
  if (!Number.isFinite(s) || s < 1 || s > 114) throw new Error('surah out of range');
  if (!Number.isFinite(t) || t < 1) throw new Error('total out of range');
  session = {
    surah: s,
    ayah: Number.isFinite(f) && f >= 1 && f <= t ? f : 1,
    total: t,
    reciterId: String(reciterId || ''),
    surahsMeta: Array.isArray(surahsMeta) ? surahsMeta : null,
    active: true,
  };
  // Register on the CURRENT driver each start — the driver can be swapped
  // (tests inject fakes; production always uses the real audio element).
  driverOnEnded(onVerseEnded);
  driverOnError(onVerseFailed);
  notify(s, session.ayah);
  playCurrent();
  return snapshot();
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

export function onAyahChange(cb) {
  ayahChangeCb = cb;
}

export function onError(cb) {
  errorCb = cb;
}

function onVerseEnded(finishedKey) {
  if (!session || !session.active) return;
  if (finishedKey !== ayahKey(session.surah, session.ayah)) return; // stale ended
  const next = nextAyah(session.ayah, session.total);
  if (next == null) {
    stop(); // surah-scoped: last ayah ends the session (notifies null)
    return;
  }
  session.ayah = next;
  notify(session.surah, next);
  playCurrent();
}

function onVerseFailed() {
  if (!session || !session.active) return;
  failSession();
}
