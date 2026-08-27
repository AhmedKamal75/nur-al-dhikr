/**
 * prayerSound.js
 * A handful of distinct, named alert tones synthesized with the Web Audio
 * API (no bundled audio files needed/available). Used for prayer-time
 * alerts and available as a "Test sound" preview in Settings.
 *
 * v3.8: real Adhan support. The bundled recording is a full-length
 * public-domain (CC0) call to prayer; users may additionally import their
 * own standard/Fajr recordings (stored offline in the audio IndexedDB).
 * Same honest limitation as below: page-audio only fires while the tab is
 * open and (per browser autoplay policy) after the user has interacted
 * with the app at least once this session — the system notification shown
 * when the tab is closed still uses the platform's own default sound.
 *
 * Honest limitation: this only plays while the tab is open — the native
 * Notification shown when a prayer time hits still uses the platform's
 * own default sound if the tab is backgrounded/closed, since browsers
 * don't let a page substitute a custom sound into a system notification.
 */

let audioCtx = null;
function ctx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, startTime, duration, gainPeak = 0.15, type = 'sine') {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, c.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, c.currentTime + startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + startTime);
  osc.stop(c.currentTime + startTime + duration + 0.05);
}

const SOUNDS = {
  chime: () => {
    tone(587.33, 0, 0.5);
    tone(880, 0.15, 0.6);
  }, // D5 -> A5, gentle two-note rise
  bell: () => {
    tone(660, 0, 1.1, 0.18, 'triangle');
    tone(1320, 0, 1.1, 0.05, 'triangle');
  }, // fundamental + soft overtone
  ding: () => {
    tone(1046.5, 0, 0.28, 0.16);
  }, // single bright ping
  silent: () => {},
};

export const SOUND_IDS = Object.freeze(['chime', 'bell', 'ding', 'silent']);

export function playSound(id) {
  try {
    (SOUNDS[id] || SOUNDS.chime)();
  } catch {
    /* AudioContext unavailable or blocked before first user gesture — ignore silently */
  }
}

/* ------------------------------------------------------------------ *
 * v3.8 — Real Adhan at prayer time                                    *
 * ------------------------------------------------------------------ */
import { getAdhanAudio, validateAdhanFile, looksLikeAudio } from './audioStore.js';

export const ADHAN_MODES = Object.freeze(['adhan', 'tone', 'off']);
/** Served from the app shell (SW-precached, works offline). CC0 — see
 *  assets/audio/adhan/CREDITS.md. */
export const BUNDLED_ADHAN_URL = 'assets/audio/adhan/adhan.mp3';

/**
 * PURE — which alert source applies for a given prayer. Kept free of any
 * browser API so the decision matrix is unit-testable in node.
 *
 * @param {{adhanMode?:string, alertSound?:string}} prefs sanitized prayer settings
 * @param {{fajr:boolean, custom:{standard:boolean, fajr:boolean}}} ctx
 *   fajr: is THIS alert for Fajr?  custom: does the user have imports?
 * @returns null | {kind:'tone', id:string} | {kind:'adhan', source:'custom-fajr'|'custom-standard'|'bundled'}
 */
export function resolveAlertSource(
  prefs,
  ctx = { fajr: false, custom: { standard: false, fajr: false } }
) {
  const mode = ADHAN_MODES.includes(prefs?.adhanMode) ? prefs.adhanMode : 'adhan';
  if (mode === 'off') return null;
  if (mode === 'tone') {
    return { kind: 'tone', id: SOUND_IDS.includes(prefs?.alertSound) ? prefs.alertSound : 'chime' };
  }
  // Adhan mode: Fajr gets the user's Fajr recording when they have one
  // (the bundled file is one general adhan — the Fajr-specific wording
  // "الصلاة خير من النوم" is only available if the user imports it).
  if (ctx.fajr && ctx.custom?.fajr) return { kind: 'adhan', source: 'custom-fajr' };
  if (ctx.custom?.standard) return { kind: 'adhan', source: 'custom-standard' };
  return { kind: 'adhan', source: 'bundled' };
}

/** Session cache of "does the user have a custom recording?" so the
 *  per-prayer fire path never has to await IndexedDB. */
const customFlags = { standard: false, fajr: false };
export async function refreshCustomAdhanFlags() {
  try {
    for (const kind of ['standard', 'fajr']) {
      const blob = await getAdhanAudio(kind);
      customFlags[kind] = !!blob;
    }
  } catch {
    customFlags.standard = false;
    customFlags.fajr = false;
  }
  return { ...customFlags };
}
export function customAdhanFlags() {
  return { ...customFlags };
}

/* One HTMLAudio element at a time — starting a new alert always replaces
 * the previous one, and stopAdhan() is safe to call any time. */
let adhanAudio = null;
let adhanObjectUrl = null;

function releaseObjectUrl() {
  if (adhanObjectUrl) {
    try {
      URL.revokeObjectURL(adhanObjectUrl);
    } catch {
      /* noop */
    }
    adhanObjectUrl = null;
  }
}

export function stopAdhan() {
  if (adhanAudio) {
    try {
      adhanAudio.pause();
    } catch {
      /* noop */
    }
    adhanAudio = null;
  }
  releaseObjectUrl();
}

/** Fire-and-forget playback of one resolved adhan source. */
export async function startAdhan(source) {
  stopAdhan();
  try {
    if (source === 'custom-standard' || source === 'custom-fajr') {
      const kind = source === 'custom-fajr' ? 'fajr' : 'standard';
      const blob = await getAdhanAudio(kind);
      if (!blob) return startAdhan('bundled'); // import vanished — fall back
      adhanObjectUrl = URL.createObjectURL(blob);
      adhanAudio = new Audio(adhanObjectUrl);
    } else {
      adhanAudio = new Audio(BUNDLED_ADHAN_URL);
    }
    adhanAudio.preload = 'auto';
    await adhanAudio.play().catch(() => {
      /* autoplay blocked (no user gesture yet this session) — the system
       * notification still fired; nothing else we can honestly do here */
    });
  } catch {
    /* audio unavailable — stay silent, never crash the scheduler */
  }
}

/**
 * The one entry point the prayer scheduler uses. Replaces the old
 * `playSound(settings.prayer.alertSound)` call.
 */
export function playAlert(prefs, { fajr = false } = {}) {
  const resolved = resolveAlertSource(prefs, { fajr, custom: customAdhanFlags() });
  if (!resolved) return;
  if (resolved.kind === 'tone') playSound(resolved.id);
  else startAdhan(resolved.source);
}

/** Settings "Test" preview: plays exactly what the current mode resolves to. */
export function previewAlert(prefs, { fajr = false } = {}) {
  return playAlert(prefs, { fajr });
}

export { validateAdhanFile, looksLikeAudio };
