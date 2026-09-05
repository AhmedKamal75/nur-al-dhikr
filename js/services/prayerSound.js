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
  // (v4.2) shared singleton — see services/audioContext.js. Local caching
  // keeps the hot path a plain property read after the first call.
  audioCtx = audioCtx || getAudioContext();
  if (!audioCtx) throw new Error('AudioContext unavailable');
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

/**
 * PURE — effective alert loudness 0..1 for the given prayer settings at a
 * moment in time. Day volume normally; the quiet-hours volume inside the
 * window (which may wrap past midnight, e.g. 22:00–06:00). Garbage in →
 * the 80 default, never silence-by-surprise (0 only when explicitly set).
 */
export function effectiveAdhanVolume(prefs, now = new Date()) {
  const clampVol = (v, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) / 100 : dflt / 100;
  };
  const day = clampVol(prefs?.adhanVolume, 80);
  if (prefs?.quietEnabled !== true) return day;
  const toMin = (s) => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typeof s === 'string' ? s : '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const start = toMin(prefs.quietStart);
  const end = toMin(prefs.quietEnd);
  if (start == null || end == null || start === end) return day;
  const t = now instanceof Date ? now.getHours() * 60 + now.getMinutes() : 0;
  const inside = start < end ? t >= start && t < end : t >= start || t < end;
  return inside ? clampVol(prefs.quietVolume, 30) : day;
}

const SOUNDS = {
  chime: (v = 1) => {
    tone(587.33, 0, 0.5, 0.15 * v);
    tone(880, 0.15, 0.6, 0.15 * v);
  }, // D5 -> A5, gentle two-note rise
  bell: (v = 1) => {
    tone(660, 0, 1.1, 0.18 * v, 'triangle');
    tone(1320, 0, 1.1, 0.05 * v, 'triangle');
  }, // fundamental + soft overtone
  ding: (v = 1) => {
    tone(1046.5, 0, 0.28, 0.16 * v);
  }, // single bright ping
  silent: () => {},
};

export const SOUND_IDS = Object.freeze(['chime', 'bell', 'ding', 'silent']);

export function playSound(id, volume = 1) {
  try {
    const v = Number.isFinite(Number(volume)) ? Math.min(1, Math.max(0, Number(volume))) : 1;
    (SOUNDS[id] || SOUNDS.chime)(v);
  } catch {
    /* AudioContext unavailable or blocked before first user gesture — ignore silently */
  }
}

/* ------------------------------------------------------------------ *
 * v3.8 — Real Adhan at prayer time                                    *
 * ------------------------------------------------------------------ */
import { getAdhanAudio, validateAdhanFile, looksLikeAudio } from './audioStore.js';
import { getAudioContext } from './audioContext.js';

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

/** Fire-and-forget playback of one resolved adhan source (0..1 volume). */
export async function startAdhan(source, volume = 1) {
  stopAdhan();
  try {
    if (source === 'custom-standard' || source === 'custom-fajr') {
      const kind = source === 'custom-fajr' ? 'fajr' : 'standard';
      const blob = await getAdhanAudio(kind);
      if (!blob) return startAdhan('bundled', volume); // import vanished — fall back
      adhanObjectUrl = URL.createObjectURL(blob);
      adhanAudio = new Audio(adhanObjectUrl);
    } else {
      adhanAudio = new Audio(BUNDLED_ADHAN_URL);
    }
    adhanAudio.preload = 'auto';
    const v = Number.isFinite(Number(volume)) ? Math.min(1, Math.max(0, Number(volume))) : 1;
    adhanAudio.volume = v;
    // (v4.2) release the element + blob right after natural playback ends:
    // a custom adhan's blob otherwise stayed pinned in memory from Fajr
    // until the NEXT alert (or stop) ~24h later. stopAdhan() is unchanged
    // for the manual-stop path; this handler only covers natural ending.
    adhanAudio.addEventListener('ended', () => {
      adhanAudio = null;
      releaseObjectUrl();
    });
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
  const volume = effectiveAdhanVolume(prefs);
  if (volume <= 0) return; // explicit 0 = silent hours, honestly silent
  if (resolved.kind === 'tone') playSound(resolved.id, volume);
  else startAdhan(resolved.source, volume);
}

/** Settings "Test" preview: plays exactly what the current mode resolves to. */
export function previewAlert(prefs, { fajr = false } = {}) {
  return playAlert(prefs, { fajr });
}

export { validateAdhanFile, looksLikeAudio };
