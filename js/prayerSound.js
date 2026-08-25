/**
 * prayerSound.js
 * A handful of distinct, named alert tones synthesized with the Web Audio
 * API (no bundled audio files needed/available). Used for prayer-time
 * alerts and available as a "Test sound" preview in Settings.
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
  chime: () => { tone(587.33, 0, 0.5); tone(880, 0.15, 0.6); },              // D5 -> A5, gentle two-note rise
  bell: () => { tone(660, 0, 1.1, 0.18, 'triangle'); tone(1320, 0, 1.1, 0.05, 'triangle'); }, // fundamental + soft overtone
  ding: () => { tone(1046.5, 0, 0.28, 0.16); },                              // single bright ping
  silent: () => {}
};

export const SOUND_IDS = Object.freeze(['chime', 'bell', 'ding', 'silent']);

export function playSound(id) {
  try {
    (SOUNDS[id] || SOUNDS.chime)();
  } catch { /* AudioContext unavailable or blocked before first user gesture — ignore silently */ }
}
