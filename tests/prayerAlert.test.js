/**
 * tests/prayerAlert.test.js — v3.8 real-Adhan alert logic:
 * the pure source-resolution matrix, user-file validation, and the
 * sanitized `adhanMode` setting. Playback itself (HTMLAudio/AudioContext)
 * is browser-bound and stays out of node tests, same posture as audio.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAlertSource, ADHAN_MODES } from '../js/services/prayerSound.js';
import { validateAdhanFile, looksLikeAudio, ADHAN_MAX_BYTES } from '../js/services/audioStore.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { sanitizeSettings } from '../js/core/config.js';

const NO_CUSTOM = { standard: false, fajr: false };
const CUSTOM_BOTH = { standard: true, fajr: true };

test('ADHAN_MODES match what the sanitizer accepts', () => {
  assert.deepEqual([...ADHAN_MODES], ['adhan', 'tone', 'off']);
  assert.equal(DEFAULT_SETTINGS.prayer.adhanMode, 'adhan');
});

test('resolveAlertSource: adhan mode walks the fallback chain', () => {
  // Fajr prefers the user's Fajr recording…
  assert.equal(
    resolveAlertSource({ adhanMode: 'adhan' }, { fajr: true, custom: CUSTOM_BOTH }).source,
    'custom-fajr'
  );
  // …falls back to their standard recording when no Fajr one exists…
  assert.equal(
    resolveAlertSource(
      { adhanMode: 'adhan' },
      { fajr: true, custom: { standard: true, fajr: false } }
    ).source,
    'custom-standard'
  );
  // …and any prayer lands on the bundled CC0 recording with no imports.
  assert.equal(
    resolveAlertSource({ adhanMode: 'adhan' }, { fajr: false, custom: NO_CUSTOM }).source,
    'bundled'
  );
  // A standard recording must NOT be misused as the Fajr variant when the
  // user only imported a standard one? It MAY (it's the fallback chain
  // above) — but only because resolveAlertSource says so explicitly; assert
  // the documented behavior:
  assert.equal(
    resolveAlertSource(
      { adhanMode: 'adhan' },
      { fajr: true, custom: { standard: true, fajr: false } }
    ).source,
    'custom-standard'
  );
});

test('resolveAlertSource: tone mode keeps the picked tone, off is off', () => {
  assert.deepEqual(
    resolveAlertSource(
      { adhanMode: 'tone', alertSound: 'bell' },
      { fajr: true, custom: CUSTOM_BOTH }
    ),
    {
      kind: 'tone',
      id: 'bell',
    }
  );
  assert.equal(resolveAlertSource({ adhanMode: 'off' }, { fajr: true, custom: CUSTOM_BOTH }), null);
  // Hostile/garbage settings degrade safely instead of crashing the scheduler.
  assert.deepEqual(
    resolveAlertSource(
      { adhanMode: '<script>', alertSound: 42 },
      { fajr: false, custom: NO_CUSTOM }
    ),
    {
      kind: 'adhan',
      source: 'bundled',
    }
  );
  // Even null settings resolve to the bundled adhan — never a throw.
  assert.deepEqual(resolveAlertSource(null, { fajr: false, custom: NO_CUSTOM }), {
    kind: 'adhan',
    source: 'bundled',
  });
});

test('validateAdhanFile rejects junk before any IO happens', () => {
  assert.equal(validateAdhanFile(null), 'invalid');
  assert.equal(validateAdhanFile({ size: 0, type: 'audio/mpeg' }), 'empty');
  assert.equal(validateAdhanFile({ size: ADHAN_MAX_BYTES + 1, type: 'audio/mpeg' }), 'tooLarge');
  assert.equal(validateAdhanFile({ size: 100, type: 'text/html' }), 'notAudio');
  assert.equal(validateAdhanFile({ size: 1000, type: 'audio/mpeg' }), null);
  // type-less files (some mobile browsers) pass here; magic bytes decide later.
  assert.equal(validateAdhanFile({ size: 1000, type: '' }), null);
});

test('looksLikeAudio sniffs MP3/Ogg/WAV/MP4 magic bytes', () => {
  const u8 = (...b) => new Uint8Array(b);
  assert.equal(looksLikeAudio(u8(0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0)), true); // "ID3"
  assert.equal(looksLikeAudio(u8(0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0)), true); // MP3 sync
  assert.equal(looksLikeAudio(u8(0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0, 0, 0, 0, 0)), true); // "OggS"
  assert.equal(
    looksLikeAudio(u8(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45)),
    true
  ); // RIFF/WAVE
  assert.equal(looksLikeAudio(u8(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0)), true); // "…ftyp"
  assert.equal(
    looksLikeAudio(u8(0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e, 0, 0, 0, 0)),
    false
  ); // "<script"
  assert.equal(looksLikeAudio(new Uint8Array(0)), false);
});

test('sanitizeSettings keeps adhanMode inside the legal set', () => {
  const s1 = sanitizeSettings({ prayer: { adhanMode: 'tone' } });
  assert.equal(s1.prayer.adhanMode, 'tone');
  const s2 = sanitizeSettings({ prayer: { adhanMode: '"><img src=x>' } });
  assert.equal(s2.prayer.adhanMode, 'adhan');
});

test('effectiveAdhanVolume: day default, quiet window, midnight wrap', async () => {
  const { effectiveAdhanVolume } = await import('../js/services/prayerSound.js');
  const at = (h, m = 0) => new Date(2026, 0, 1, h, m);
  assert.equal(effectiveAdhanVolume({ adhanVolume: 80 }, at(12)), 0.8);
  assert.equal(effectiveAdhanVolume({}, at(12)), 0.8, 'garbage → default, never surprise-silence');
  const night = {
    adhanVolume: 80,
    quietEnabled: true,
    quietStart: '22:00',
    quietEnd: '06:00',
    quietVolume: 30,
  };
  assert.equal(effectiveAdhanVolume(night, at(23)), 0.3, 'inside overnight window');
  assert.equal(effectiveAdhanVolume(night, at(3)), 0.3, 'wrap past midnight');
  assert.equal(effectiveAdhanVolume(night, at(12)), 0.8, 'outside window');
  assert.equal(effectiveAdhanVolume(night, at(6)), 0.8, 'end is exclusive');
  const day = { ...night, quietStart: '13:00', quietEnd: '14:00' };
  assert.equal(effectiveAdhanVolume(day, at(13, 30)), 0.3, 'same-day window');
  assert.equal(effectiveAdhanVolume(day, at(15)), 0.8);
  assert.equal(
    effectiveAdhanVolume({ ...night, quietStart: 'xx' }, at(23)),
    0.8,
    'bad clock falls back to day volume'
  );
  assert.equal(
    effectiveAdhanVolume({ ...night, quietVolume: 0 }, at(23)),
    0,
    'explicit 0 is honest silence'
  );
});

test('sanitizeSettings clamps the loudness schedule', () => {
  const s = sanitizeSettings({
    prayer: {
      adhanVolume: 500,
      quietEnabled: 'yes',
      quietStart: '25:00',
      quietEnd: '06:00',
      quietVolume: -20,
    },
  });
  assert.equal(s.prayer.adhanVolume, 100);
  assert.equal(s.prayer.quietEnabled, false, 'non-boolean coerced');
  assert.equal(s.prayer.quietStart, '22:00', 'bad clock falls back');
  assert.equal(s.prayer.quietVolume, 0);
});
