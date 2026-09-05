/**
 * soundDesign.js
 * Phase C (v3.14) — the optional, off-by-default soft sounds that pair with
 * physical actions in the app (the Tier-2 "subtle sound design" item):
 *   • a page-turn for the Mushaf flip — a short filtered noise sweep that
 *     reads as paper, not as an alert;
 *   • a completion chime for finishing a khatma — a gentle three-note rise,
 *     deliberately quieter and longer than the prayer-alert tones so the
 *     moment feels settled, not startled.
 * (The tasbih tick predates this module and lives in js/tasbih.js.)
 *
 * Everything is synthesized with the Web Audio API in memory — no audio
 * assets, so the offline-first shell stays exactly as small as it was.
 * Gating is explicit: each function takes the boolean from settings and
 * does nothing when it is false, which keeps the decision testable without
 * a browser. Like every page-audio in this app, sounds only play after the
 * user has interacted with the page at least once this session (autoplay
 * policy) — and since every one of these fires ON a tap, that condition is
 * inherently satisfied. The try/catch is honesty, not decoration: a device
 * without a working AudioContext gets silent no-ops, never an error.
 */

import { getAudioContext } from './audioContext.js';

let audioCtx = null;

function ctx() {
  // (v4.2) shared singleton — see services/audioContext.js.
  audioCtx = audioCtx || getAudioContext();
  if (!audioCtx) throw new Error('AudioContext unavailable');
  return audioCtx;
}

/** Test seam — drops the cached context so tests can start clean. */
export function _resetForTests() {
  audioCtx = null;
}

function tone(c, freq, startTime, duration, gainPeak = 0.1, type = 'sine') {
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

function noiseBuffer(c, duration) {
  const buf = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * duration)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * A soft paper "shh-p" for the Mushaf page flip. Bandpassed noise sweeping
 * down (page sliding), quiet and under a quarter second.
 * @param {boolean} enabled — settings.pageTurnSound
 */
export function playPageTurn(enabled = true) {
  if (!enabled) return;
  try {
    const c = ctx();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.22);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(2600, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.2);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    src.stop(c.currentTime + 0.25);
  } catch {
    /* AudioContext unavailable or blocked — stay silent */
  }
}

/**
 * The khatma-completion chime: E5 → B5 → E6, sine/triangle, ~1.5s, quiet.
 * @param {boolean} enabled — settings.khatmaChimeSound
 */
export function playKhatmaChime(enabled = true) {
  if (!enabled) return;
  try {
    const c = ctx();
    tone(c, 659.25, 0, 0.7, 0.1, 'sine');
    tone(c, 987.77, 0.18, 0.7, 0.08, 'sine');
    tone(c, 1318.51, 0.36, 1.0, 0.05, 'triangle');
  } catch {
    /* AudioContext unavailable or blocked — stay silent */
  }
}
