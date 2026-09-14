/**
 * tests/adhanYield.test.js — v5.2.72 (adhan owns the speaker) gates:
 *  1. playAlert fires the start hook on the tone path (node-safe: the
 *     WebAudio attempt degrades silently, the hook still runs);
 *  2. silent-hours and mode-off alerts fire nothing;
 *  3. a throwing subscriber never silences the adhan;
 *  4. the wired chain pauses a playing full-surah track end to end
 *     (real store + engine, verse-pause line source-pinned).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { onAdhanStart, playAlert } from '../js/services/prayerSound.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

class FakeAudio {
  constructor() {
    this.paused = true;
  }

  pause() {
    this.paused = true;
  }
}

const TONE_PREFS = { adhanMode: 'tone', alertSound: 'bell', adhanVolume: 80 };

describe('adhan start hook', () => {
  test('fires on a sounding alert, silent otherwise', () => {
    let calls = 0;
    onAdhanStart(() => {
      calls += 1;
    });
    playAlert(TONE_PREFS);
    assert.equal(calls, 1, 'tone alert yields');
    playAlert({ ...TONE_PREFS, adhanVolume: 0 });
    assert.equal(calls, 1, 'silent hours fire nothing');
    playAlert({ ...TONE_PREFS, adhanMode: 'off' });
    assert.equal(calls, 1, 'mode off fires nothing');
    onAdhanStart(null);
    playAlert(TONE_PREFS);
    assert.equal(calls, 1, 'unsubscribed cleanly');
  });

  test('a throwing subscriber never silences the adhan', () => {
    onAdhanStart(() => {
      throw new Error('yield crashed');
    });
    assert.doesNotThrow(() => playAlert(TONE_PREFS), 'alert survives its subscriber');
    onAdhanStart(null);
  });
});

describe('wired yield chain', () => {
  test('a sounding adhan pauses a playing track (live store + engine)', async () => {
    globalThis.Audio = FakeAudio;
    // wirePlayer's time/seek patch callback reads the DOM on every engine
    // emit — a null-returning stub keeps node honest (bar absent → return).
    globalThis.document = { querySelector: () => null, activeElement: null };
    const { wirePlayer } = await import('../js/app/audioEngine.js');
    const { store, actions } = await import('../js/core/state.js');
    wirePlayer();
    store.dispatch(
      actions.setAudioPlayer({ moshafId: 'voice', surah: 3, playing: true, offline: false })
    );
    playAlert(TONE_PREFS);
    const p = store.getState().player;
    assert.equal(p.playing, false, 'track yielded to the adhan');
    assert.equal(p.surah, 3, 'position kept for one-tap resume');
    store.dispatch(actions.setAudioPlayer({ moshafId: null, surah: null, playing: false }));
    onAdhanStart(null);
  });

  test('verse sessions freeze in place on adhan (source-pinned)', () => {
    const src = readProject('js/app/audioEngine.js');
    const at = src.indexOf('onAdhanStart(');
    assert.ok(at > -1, 'subscription lives in wirePlayer');
    assert.ok(src.indexOf('yieldFullSurahPlayer()', at) > -1, 'full-surah yields');
    assert.ok(src.indexOf('surahPlayback.pause()', at) > -1, 'verse session freezes');
    assert.ok(src.indexOf('recitation.stop()', at) > -1, 'single-verse tap stops');
  });
});
