/**
 * audio-mirrors-590.test.js — (v5.9.0) ayah-audio mirror chain.
 *
 * One dead CDN file must not kill a recitation session: each ayah
 * resolves to an ordered candidate list (128kbps primary → 64kbps
 * same-CDN mirror → EveryAyah for mapped voices) and the engine walks
 * it before admitting failure, logging each hop.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  verseAudioCandidates,
  verseDownloadCandidates,
  start,
  stop,
  isActive,
  snapshot,
  onAyahChange,
  onError,
} from '../js/services/surahPlayback.js';
import { configureDriver, resetRecitationForTests } from '../js/services/recitation.js';
import { sanitizeMushafPrefs } from '../js/core/config.js';

const SURAHS = [
  { number: 1, ayahCount: 7 },
  { number: 2, ayahCount: 286 },
];

function makeDriver() {
  const d = {
    played: [],
    endedCb: null,
    errorCb: null,
    end(key) {
      d.endedCb?.(key);
    },
    fail() {
      d.errorCb?.();
    },
  };
  d.play = (url, key) => {
    d.played.push({ url, key });
  };
  d.stop = () => {};
  d.setRate = () => {};
  d.onEnded = (cb) => {
    d.endedCb = cb;
  };
  d.onError = (cb) => {
    d.errorCb = cb;
  };
  d.offEnded = () => {};
  d.offError = () => {};
  return d;
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('verseAudioCandidates: ordered primary → mirrors', () => {
  test('mapped voice yields 128 + 64 + everyayah, in order', () => {
    const urls = verseAudioCandidates('ar.alafasy', 2, 255, 265);
    assert.equal(urls.length, 3);
    assert.match(urls[0], /cdn\.islamic\.network\/quran\/audio\/128\/ar\.alafasy\/265\.mp3/);
    assert.match(urls[1], /cdn\.islamic\.network\/quran\/audio\/64\/ar\.alafasy\/265\.mp3/);
    assert.match(urls[2], /^https:\/\/everyayah\.com\/data\/.+\/002255\.mp3$/);
  });

  test('unmapped voice yields the two same-CDN encodings only', () => {
    // 'ar.hudhaify' IS mapped; use a synthetic-but-allowed id? The
    // allowlist gates the CDN pair — an unknown id coerces to default.
    const urls = verseAudioCandidates('ar.hudhaify', 1, 1, 1);
    assert.equal(urls.length, 3);
    const coerced = verseAudioCandidates('no-such-voice', 1, 1, 1);
    assert.equal(coerced.length, 2);
    assert.match(coerced[0], /ar\.alafasy\/1\.mp3/);
  });

  test('hostile input never invents a URL', () => {
    assert.deepEqual(verseAudioCandidates('ar.alafasy', 999, 1, NaN), []);
    assert.deepEqual(verseAudioCandidates(null, 1, 1, null), []);
  });

  test('per-voice ladders skip missing rungs; new voices carry mirrors (v5.10.8)', () => {
    // 64-only voices never attempt the doomed 128 fetch.
    const sudais = verseAudioCandidates('ar.abdurrahmaansudais', 2, 255, 265);
    assert.equal(sudais.length, 2);
    assert.match(sudais[0], /\/audio\/64\/ar\.abdurrahmaansudais\/265\.mp3/);
    assert.match(
      sudais[1],
      /^https:\/\/everyayah\.com\/data\/Abdurrahmaan_As-Sudais_192kbps\/002255\.mp3$/
    );
    // 128-only voices never attempt the doomed 64 fetch.
    const ayyoub = verseAudioCandidates('ar.muhammadayyoub', 2, 255, 265);
    assert.equal(ayyoub.length, 2);
    assert.match(ayyoub[0], /\/audio\/128\/ar\.muhammadayyoub\/265\.mp3/);
    // New census voices resolve full chains.
    const minshawi = verseAudioCandidates('ar.minshawi', 2, 255, 265);
    assert.equal(minshawi.length, 2);
    assert.match(
      minshawi[1],
      /^https:\/\/everyayah\.com\/data\/Minshawy_Murattal_128kbps\/002255\.mp3$/
    );
    const shuraym = verseAudioCandidates('ar.saoodshuraym', 1, 1, 1);
    assert.match(shuraym[0], /\/audio\/64\/ar\.saoodshuraym\/1\.mp3/);
  });
});

describe('verseDownloadCandidates: CORS-open mirror leads (v5.10.2)', () => {
  test('same files, everyayah first — fetch needs CORS, <audio> does not', () => {
    const stream = verseAudioCandidates('ar.alafasy', 2, 255, 265);
    const dl = verseDownloadCandidates('ar.alafasy', 2, 255, 265);
    assert.deepEqual([...dl].sort(), [...stream].sort(), 'same URL set');
    assert.match(dl[0], /^https:\/\/everyayah\.com\//, 'CORS-open mirror first');
    assert.match(dl[dl.length - 1], /cdn\.islamic\.network/, 'primary kept as fallback');
  });

  test('unmapped voice degrades to the primary pair only', () => {
    const dl = verseDownloadCandidates('no-such-voice', 1, 1, 1);
    assert.equal(dl.length, 2);
    assert.ok(dl.every((u) => u.includes('cdn.islamic.network')));
    assert.deepEqual(verseDownloadCandidates('ar.alafasy', 999, 1, NaN), []);
  });
});

describe('engine walks the chain before failing', () => {
  test('dead primary → 64kbps → everyayah → honest failure', async () => {
    const d = makeDriver();
    configureDriver(d);
    onAyahChange(null);
    onError(null);
    const errors = [];
    onError((s, a) => errors.push([s, a]));
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await tick();
      await tick();
      assert.equal(d.played.length, 1);
      const first = d.played[0].url;
      assert.match(first, /\/128\//);

      d.fail(); // primary dies → mirror 1
      await tick();
      await tick();
      assert.equal(d.played.length, 2);
      assert.equal(d.played[1].key, '1:1', 'same ayah retried');
      assert.match(d.played[1].url, /\/64\//);
      assert.equal(isActive(), true, 'session survives a dead primary');

      d.fail(); // mirror 1 dies → everyayah
      await tick();
      await tick();
      assert.equal(d.played.length, 3);
      assert.match(d.played[2].url, /everyayah\.com/);

      d.fail(); // chain spent → session ends honestly
      await tick();
      await tick();
      assert.equal(isActive(), false);
      assert.deepEqual(errors, [[1, 1]]);
    } finally {
      stop();
      onAyahChange(null);
      onError(null);
      resetRecitationForTests();
    }
  });

  test('next ayah restarts from the primary mirror', async () => {
    const d = makeDriver();
    configureDriver(d);
    onAyahChange(null);
    onError(null);
    try {
      start({ surah: 1, total: 7, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await tick();
      await tick();
      d.fail(); // 1:1 primary dies → 64kbps
      await tick();
      await tick();
      assert.match(d.played[1].url, /\/64\//);
      d.end('1:1'); // 64kbps plays fine → advance
      await tick();
      await tick();
      const last = d.played[d.played.length - 1];
      assert.equal(last.key, '1:2');
      assert.match(last.url, /\/128\//, 'new ayah restarts at the primary');
    } finally {
      stop();
      onAyahChange(null);
      onError(null);
      resetRecitationForTests();
    }
  });
});

describe('tajweedUnderlines pref plumbing', () => {
  test('sanitizer defaults on, coerces hostile values', () => {
    assert.equal(sanitizeMushafPrefs({}).tajweedUnderlines, true);
    assert.equal(sanitizeMushafPrefs({ tajweedUnderlines: false }).tajweedUnderlines, false);
    assert.equal(sanitizeMushafPrefs({ tajweedUnderlines: 'yes' }).tajweedUnderlines, true);
  });
});
