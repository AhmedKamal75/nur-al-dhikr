/**
 * speech.js
 * Thin wrapper around window.speechSynthesis for an optional "listen" action
 * on cards. Entirely best-effort: many platforms lack an Arabic voice, in
 * which case we fall back to reading the transliteration.
 */

// currentUtterance is intentionally never read back — some browsers
// (historically Chrome) garbage-collect a SpeechSynthesisUtterance mid-speech
// if nothing holds a strong reference to it, silently killing playback.
// eslint-disable-next-line no-unused-vars
let currentUtterance = null;
let currentItemId = null;

export function isSupported() {
  return 'speechSynthesis' in window;
}

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang?.toLowerCase().startsWith(lang));
  if (exact) return exact;
  return null;
}

/**
 * Speak Arabic text if an Arabic voice is available, otherwise speak the
 * transliteration in the default voice. Returns which mode was used.
 */
export function speakItem(item, { onEnd } = {}) {
  if (!isSupported()) return 'unsupported';
  stop();

  const arVoice = pickVoice('ar');
  const text = arVoice ? item.arabic : item.transliteration || item.arabic;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = arVoice ? 'ar-SA' : 'en-US';
  if (arVoice) utter.voice = arVoice;
  utter.rate = 0.85;
  utter.onend = () => {
    currentUtterance = null;
    currentItemId = null;
    onEnd?.();
  };
  utter.onerror = () => {
    currentUtterance = null;
    currentItemId = null;
    onEnd?.();
  };
  currentUtterance = utter;
  currentItemId = item.id;
  window.speechSynthesis.speak(utter);
  return arVoice ? 'arabic' : 'transliteration';
}

export function stop() {
  if (isSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  currentItemId = null;
}

export function isSpeaking() {
  return isSupported() && window.speechSynthesis.speaking;
}

/** True only when the *given* item is the one currently being read aloud. */
export function isSpeakingItem(itemId) {
  return isSpeaking() && currentItemId === itemId;
}

/** Voices load asynchronously on some browsers; call this once at boot to warm the cache. */
export function warmVoices() {
  if (!isSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
