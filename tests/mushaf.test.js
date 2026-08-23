import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPage,
  nextPage,
  prevPage,
  isFirstPage,
  isLastPage,
  globalAyahNumber,
  ayahAudioUrl,
  surahStartPage,
  juzStartPage,
} from '../js/mushaf.js';

describe('clampPage', () => {
  test('clamps into the valid 1..604 range', () => {
    assert.equal(clampPage(0), 1);
    assert.equal(clampPage(-50), 1);
    assert.equal(clampPage(605), 604);
    assert.equal(clampPage(999999), 604);
    assert.equal(clampPage(300), 300);
  });

  test('non-numeric input falls back to page 1 instead of throwing', () => {
    assert.equal(clampPage('not a number'), 1);
    assert.equal(clampPage(null), 1);
    assert.equal(clampPage(undefined), 1);
  });
});

describe('nextPage / prevPage / isFirstPage / isLastPage', () => {
  test('step within bounds', () => {
    assert.equal(nextPage(5), 6);
    assert.equal(prevPage(5), 4);
  });

  test('do not step past the edges', () => {
    assert.equal(nextPage(604), 604);
    assert.equal(prevPage(1), 1);
  });

  test('edge detectors', () => {
    assert.equal(isFirstPage(1), true);
    assert.equal(isFirstPage(2), false);
    assert.equal(isLastPage(604), true);
    assert.equal(isLastPage(603), false);
  });
});

describe('globalAyahNumber', () => {
  const surahs = [
    { number: 1, ayahCount: 7 },
    { number: 2, ayahCount: 286 },
    { number: 3, ayahCount: 200 },
  ];

  test('surah 1 ayah 1 is global ayah 1', () => {
    assert.equal(globalAyahNumber(surahs, 1, 1), 1);
  });

  test('surah 1 ayah 7 (last of Al-Fatiha) is global ayah 7', () => {
    assert.equal(globalAyahNumber(surahs, 1, 7), 7);
  });

  test('surah 2 ayah 1 comes right after all of surah 1 (offset 7)', () => {
    assert.equal(globalAyahNumber(surahs, 2, 1), 8);
  });

  test('surah 3 ayah 1 comes after all of surahs 1 and 2 (offset 293)', () => {
    assert.equal(globalAyahNumber(surahs, 3, 1), 294);
  });

  test('matches the well-known global number for the last ayah of the Qur\u02bcan (6236)', () => {
    // Build a minimal stand-in for the real 114-surah meta ending in surah 114 (An-Nas, 6 ayahs).
    const full = [
      { number: 1, ayahCount: 7 },
      { number: 2, ayahCount: 6223 }, // stand-in bulk so the final count lines up: 7 + 6223 + 6 = 6236
      { number: 114, ayahCount: 6 },
    ];
    assert.equal(globalAyahNumber(full, 114, 6), 6236);
  });

  test('returns null for an unresolvable surah number rather than throwing', () => {
    assert.equal(globalAyahNumber(surahs, 999, 1), null);
  });

  test('never throws on malformed input', () => {
    assert.doesNotThrow(() => globalAyahNumber(null, 1, 1));
    assert.doesNotThrow(() => globalAyahNumber(surahs, 'x', 'y'));
  });
});

describe('ayahAudioUrl', () => {
  test('builds a CDN URL containing the reciter id and global ayah number', () => {
    const surahs = [{ number: 1, ayahCount: 7 }, { number: 2, ayahCount: 286 }];
    const url = ayahAudioUrl(surahs, 'ar.alafasy', 2, 1);
    assert.match(url, /^https:\/\/cdn\.islamic\.network\/quran\/audio\/128\/ar\.alafasy\/8\.mp3$/);
  });

  test('returns null when the surah cannot be resolved', () => {
    assert.equal(ayahAudioUrl([{ number: 1, ayahCount: 7 }], 'ar.alafasy', 999, 1), null);
  });
});

describe('surahStartPage / juzStartPage', () => {
  const meta = { surahFirstPage: { '1': 1, '2': 2, '9': 187 }, juzFirstPage: { '1': 1, '2': 22 } };

  test('looks up known start pages', () => {
    assert.equal(surahStartPage(meta, 2), 2);
    assert.equal(surahStartPage(meta, 9), 187);
    assert.equal(juzStartPage(meta, 2), 22);
  });

  test('falls back to page 1 for missing/malformed meta', () => {
    assert.equal(surahStartPage(null, 2), 1);
    assert.equal(surahStartPage(meta, 999), 1);
    assert.equal(juzStartPage(undefined, 5), 1);
  });
});
