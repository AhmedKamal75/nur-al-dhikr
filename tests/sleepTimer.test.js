/**
 * sleepTimer.test.js — sleep timers for both audio engines.
 *
 * Domain math (volume curve, countdown, arm/clear) plus the full-surah
 * player wiring: arm/clear/snapshot, volume ownership, tick subscription.
 * Handler glue (chip taps) stays thin by design.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  SLEEP_TIMER_CHOICES,
  FADE_SECONDS,
  initialTimerState,
  armTimer,
  clearTimer,
  volumeAt,
  countdownLabel,
} from '../js/domain/sleepTimer.js';

describe('sleepTimer domain math', () => {
  test('arm validates minutes, clear returns to inert', () => {
    assert.deepEqual(armTimer(initialTimerState(), 15, 0), {
      enabled: true,
      minutes: 15,
      endsAtMs: 900_000,
      lastTickMs: null,
    });
    assert.equal(armTimer(initialTimerState(), 99, 0).minutes, 30);
    assert.deepEqual(clearTimer(), initialTimerState());
  });

  test('volume is 1, then linear over the fade window, then 0', () => {
    const armed = armTimer(initialTimerState(), 15, 0);
    assert.equal(volumeAt(armed, 0), 1);
    assert.equal(volumeAt(armed, 900_000 - FADE_SECONDS * 1000 - 1), 1);
    assert.equal(volumeAt(armed, 900_000 - 45_000), 0.5);
    assert.equal(volumeAt(armed, 900_000), 0);
    assert.equal(volumeAt(armed, 999_999_999), 0);
    assert.equal(volumeAt(null, 0), 1);
    assert.equal(volumeAt({ enabled: false }, 0), 1);
  });

  test('countdown label mm:ss, empty when inert', () => {
    assert.equal(countdownLabel(armTimer(initialTimerState(), 15, 0), 0), '15:00');
    assert.equal(countdownLabel(armTimer(initialTimerState(), 15, 0), 61_000), '13:59');
    assert.equal(countdownLabel(null), '');
    assert.deepEqual(SLEEP_TIMER_CHOICES, [15, 30, 45, 60]);
  });
});

describe('full-surah player sleep wiring', () => {
  test('arm/clear/snapshot own the element volume', async () => {
    const seen = [];
    globalThis.Audio = class {
      constructor() {
        this.paused = true;
        this.ended = false;
        this.volume = 1;
        this.playbackRate = 1;
        this._listeners = {};
        seen.push(this);
      }
      addEventListener(t, fn) {
        (this._listeners[t] ||= []).push(fn);
      }
    };
    const player = await import('../js/services/player.js');
    try {
      const snap = player.armSleepTimer(15);
      assert.equal(snap.enabled, true);
      assert.equal(snap.minutes, 15);
      assert.match(snap.label, /^\d\d:\d\d$/);
      assert.equal(player.sleepSnapshot().enabled, true);
      player.setVolume(0.3);
      assert.equal(seen[0].volume, 0.3);
      player.setVolume(99);
      assert.equal(seen[0].volume, 1, 'clamped');
      let ticks = 0;
      player.onSleepTick(() => {
        ticks += 1;
      });
      player._sleepTickForTests();
      assert.equal(ticks, 1);
      player.clearSleepTimer();
      assert.deepEqual(player.sleepSnapshot(), { enabled: false, minutes: null, label: '' });
      assert.equal(seen[0].volume, 1, 'volume restored');
      player.onSleepTick(null);
    } finally {
      player.clearSleepTimer();
      delete globalThis.Audio;
    }
  });

  test('player bar shows the armed countdown chip', async () => {
    const { renderPlayerBar } = await import('../js/views/playerBar.js');
    const html = renderPlayerBar({
      settings: { language: 'en', audio: {}, customReciters: [] },
      surahPlayback: { active: false, surah: null },
      player: {
        moshafId: 'mp3-1',
        surah: 36,
        playing: true,
        offline: false,
        sleepEnabled: true,
        sleepMinutes: 15,
        sleepLabel: '14:59',
      },
      quran: { meta: { surahs: [] } },
    });
    assert.ok(html.includes('data-action="player-sleep-cycle"'));
    assert.ok(html.includes('14:59'));
    const off = renderPlayerBar({
      settings: { language: 'en', audio: {}, customReciters: [] },
      surahPlayback: { active: false, surah: null },
      player: { moshafId: 'mp3-1', surah: 36, playing: true, offline: false },
      quran: { meta: { surahs: [] } },
    });
    assert.ok(off.includes('data-action="player-sleep-cycle"'));
    assert.ok(!off.includes('14:59'));
  });
});
