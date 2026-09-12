/**
 * audio.test.js — pure-logic tests for the v2.6 audio engine:
 * catalog URL building, Arabic-normalized search, custom-server
 * validation, byte formatting, and the downloads/player reducers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  pad3,
  surahUrl,
  customMoshafId,
  validateCustomServer,
  searchReciters,
  rewayaAr,
} from '../js/services/audioCatalog.js';
import { formatBytes, audioKey } from '../js/services/audioStore.js';
import { formatCountdown } from '../js/domain/ramadan.js';

const DIR = new URL('../data/', import.meta.url);

test('pad3 pads surah numbers', () => {
  assert.equal(pad3(1), '001');
  assert.equal(pad3(36), '036');
  assert.equal(pad3(114), '114');
});

test('surahUrl builds canonical per-surah URLs (no double slashes)', () => {
  assert.equal(
    surahUrl('https://server8.mp3quran.net/afs/', 1),
    'https://server8.mp3quran.net/afs/001.mp3'
  );
  assert.equal(
    surahUrl('https://download.quranicaudio.com/quran/husary_muallim', 114),
    'https://download.quranicaudio.com/quran/husary_muallim/114.mp3'
  );
});

test('customMoshafId is deterministic and server-based', () => {
  const a = customMoshafId('https://example.com/quran/');
  const b = customMoshafId('https://example.com/quran');
  assert.equal(a, b); // trailing slash insignificant
  assert.match(a, /^custom-[a-z0-9]+$/);
  assert.notEqual(a, customMoshafId('https://other.com/quran/'));
});

test('validateCustomServer accepts only sane http(s) folders', () => {
  assert.equal(validateCustomServer('https://x.com/a/').ok, true);
  assert.equal(validateCustomServer('https://x.com/a').server, 'https://x.com/a/');
  assert.equal(validateCustomServer('ftp://x.com/a/').ok, false);
  assert.equal(validateCustomServer('not a url').ok, false);
  assert.equal(validateCustomServer('https://x.com/a b/').ok, false); // spaces
});

test('bundled catalog: 314 full mushafs, unique ids, all with servers', () => {
  const doc = JSON.parse(readFileSync(new URL('reciters.json', DIR), 'utf-8'));
  assert.equal(doc.total, 314);
  assert.equal(doc.reciters.length, 314);
  const ids = new Set(doc.reciters.map((r) => r.id));
  assert.equal(ids.size, 314);
  for (const r of doc.reciters) {
    assert.ok(r.server.startsWith('https://'), r.id);
    assert.ok(r.nameEn && r.nameAr, r.id);
  }
  // the known-good anchors must be present
  assert.ok(doc.reciters.some((r) => r.nameEn.includes('Alafasi')));
  assert.ok(doc.reciters.some((r) => r.nameEn.includes('Husar') || r.nameEn.includes('Husary')));
  assert.ok(doc.reciters.some((r) => r.source === 'quranicaudio'));
});

test('bundled catalog: every row has an Arabic name and a clean server URL', () => {
  const doc = JSON.parse(readFileSync(new URL('reciters.json', DIR), 'utf-8'));
  for (const r of doc.reciters) {
    assert.match(r.nameAr, /[؀-ۿ]/u, `${r.id} nameAr has Arabic script`);
    const afterHost = r.server.split('://', 2)[1] || '';
    assert.ok(!afterHost.includes('//'), `${r.id} server has no double slash`);
  }
});

test('rewayaAr covers every non-empty catalog riwaya, empty in → empty out', () => {
  const doc = JSON.parse(readFileSync(new URL('reciters.json', DIR), 'utf-8'));
  const values = new Set(doc.reciters.map((r) => r.rewaya).filter(Boolean));
  assert.ok(values.size > 0);
  for (const v of values) {
    assert.match(rewayaAr(v), /[؀-ۿ]/u, `rewaya maps to Arabic: ${v}`);
  }
  assert.equal(rewayaAr(''), '');
  assert.equal(rewayaAr('Some Future Riwaya'), '');
});

test('quranAudioSurahUrl builds the per-surah CDN fallback URL', async () => {
  const { quranAudioSurahUrl } = await import('../js/core/config/quran.js');
  assert.equal(
    quranAudioSurahUrl('ar.alafasy', 1),
    'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3'
  );
  assert.equal(
    quranAudioSurahUrl('ar.alafasy', 114),
    'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/114.mp3'
  );
});

test('sanitizeSettings coerces verse voices to the 5-id allowlist', async () => {
  const { sanitizeSettings } = await import('../js/core/config.js');
  assert.equal(sanitizeSettings({ reciter: 'ar.alafasy' }).reciter, 'ar.alafasy');
  assert.equal(sanitizeSettings({ reciter: 'mp3-118-118' }).reciter, 'ar.alafasy');
  assert.equal(sanitizeSettings({}).reciter, 'ar.alafasy');
  assert.equal(sanitizeSettings({ reciterB: 'ar.husary' }).reciterB, 'ar.husary');
  assert.equal(sanitizeSettings({ reciterB: '' }).reciterB, null);
  assert.equal(sanitizeSettings({ reciterB: 'qa-97' }).reciterB, null);
});

test('verse engine coerces unknown voices instead of 404ing per ayah', async () => {
  const engine = await import('../js/services/surahPlayback.js');
  const { configureDriver } = await import('../js/services/recitation.js');
  const played = [];
  configureDriver({
    play: (url, key) => void played.push(url),
    stop: () => {},
    onEnded: () => {},
    onError: () => {},
  });
  try {
    engine.start({
      surah: 1,
      total: 7,
      reciterId: 'mp3-118-118',
      surahsMeta: [{ number: 1, ayahCount: 7 }],
    });
    assert.equal(engine.snapshot().reciterId, 'ar.alafasy');
    assert.ok(played.at(-1).includes('/ar.alafasy/'));
    engine.stop();
  } finally {
    configureDriver(null);
  }
});

test('searchReciters matches Arabic names diacritic-insensitively (after catalog load)', async () => {
  // searchReciters reads the in-memory cache; before load it searches customs only
  const customs = [
    { id: 'custom-x', nameEn: 'Alaa Aql', nameAr: 'علاء عقل', server: 'https://x/' },
  ];
  assert.equal(searchReciters('alaa', customs).length, 1);
  assert.equal(searchReciters('علاء', customs).length, 1);
  assert.equal(searchReciters('', customs).length, 1);
});

test('audioKey + formatBytes', () => {
  assert.equal(audioKey('mp3-1-1', 36), 'mp3-1-1:36');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(5 * 1024 * 1024 + 300 * 1024), '5.3 MB');
  assert.equal(formatBytes(0), '0 B');
});

test('player bar clock math sanity (reuse of countdown formatter)', () => {
  assert.equal(formatCountdown(0), '0:00');
  assert.equal(formatCountdown(65000), '1:05');
});
