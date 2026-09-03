/**
 * tests/shareCard.test.js — pure pieces of the image-card renderer
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, tint } from '../js/services/shareCard.js';

/** Fake measurer: every character is 10px wide. */
const charMeasure = (s) => s.length * 10;

test('wrapText: fits words within the measured width', () => {
  // maxWidth 100 = 10 chars per line.
  const lines = wrapText('aa bb ccc dddd ee', 100, charMeasure);
  assert.deepEqual(lines, ['aa bb ccc', 'dddd ee']);
});

test('wrapText: a single over-wide word is never split', () => {
  const lines = wrapText('short averyveryverylongword end', 100, charMeasure);
  assert.deepEqual(lines, ['short', 'averyveryverylongword', 'end']);
});

test('wrapText: collapses whitespace and drops empty input', () => {
  assert.deepEqual(wrapText('   ', 100, charMeasure), []);
  assert.deepEqual(wrapText(null, 100, charMeasure), []);
  assert.deepEqual(wrapText('a\t\nb', 100, charMeasure), ['a b']);
});

test('wrapText: one-word and exactly-fitting inputs behave', () => {
  assert.deepEqual(wrapText('abcdefghij', 100, charMeasure), ['abcdefghij']); // exactly 10
  assert.deepEqual(wrapText('abcdefghijk', 100, charMeasure), ['abcdefghijk']); // 11 — kept whole
  assert.deepEqual(wrapText('abc', 100, charMeasure), ['abc']);
});

test('tint blends toward white by ratio', () => {
  assert.equal(tint('#000000', 0), 'rgb(0, 0, 0)');
  assert.equal(tint('#000000', 1), 'rgb(255, 255, 255)');
  assert.equal(tint('#000000', 0.5), 'rgb(128, 128, 128)');
  // 3-digit shorthand expands.
  assert.equal(tint('#fff', 0), 'rgb(255, 255, 255)');
});

/* ---- v3.24.0: the shareable ayah card ----------------------------------- */

import { buildAyahCardPayload, ayahCardFilename } from '../js/services/shareCard.js';

test('buildAyahCardPayload: valid input produces a clean payload with ref', () => {
  const p = buildAyahCardPayload({
    surahNumber: 2,
    ayahNumber: 255,
    surahName: 'Al-Baqarah',
    surahNameAr: 'البقرة',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
    translation: 'Allah — there is no deity except Him',
    editionName: 'Sahih International',
    editionDir: 'ltr',
  });
  assert.ok(p);
  assert.equal(p.ref, '2:255');
  assert.equal(p.surahNumber, 2);
  assert.equal(p.ayahNumber, 255);
  assert.equal(p.dir, 'ltr');
  assert.equal(p.editionName, 'Sahih International');
});

test('buildAyahCardPayload: hostile shapes return null or degrade safely', () => {
  // missing arabic -> null (a card without Arabic would be a lie)
  assert.equal(buildAyahCardPayload({ surahNumber: 1, ayahNumber: 1, arabic: '' }), null);
  assert.equal(buildAyahCardPayload({ surahNumber: 1, ayahNumber: 1, arabic: '   ' }), null);
  assert.equal(buildAyahCardPayload({ arabic: 'x' }), null);
  // out-of-range references -> null
  assert.equal(buildAyahCardPayload({ surahNumber: 115, ayahNumber: 1, arabic: 'x' }), null);
  assert.equal(buildAyahCardPayload({ surahNumber: 0, ayahNumber: 1, arabic: 'x' }), null);
  assert.equal(buildAyahCardPayload({ surahNumber: 2, ayahNumber: 287, arabic: 'x' }), null);
  assert.equal(buildAyahCardPayload({ surahNumber: 'NaN', ayahNumber: 1, arabic: 'x' }), null);
  // junk editionDir degrades to ltr, not 'rtl' by accident
  const p = buildAyahCardPayload({
    surahNumber: 1,
    ayahNumber: 1,
    arabic: 'بِسْمِ',
    editionDir: 'y',
  });
  assert.equal(p.dir, 'ltr');
  // empty surah name falls back to "Surah N"
  const q = buildAyahCardPayload({ surahNumber: 112, ayahNumber: 1, arabic: 'قُلْ' });
  assert.equal(q.surahName, 'Surah 112');
});

test('buildAyahCardPayload: whitespace collapsed and strings capped', () => {
  const p = buildAyahCardPayload({
    surahNumber: 1,
    ayahNumber: 1,
    arabic: '  a\n\n  b  ',
    translation: 'x'.repeat(5000),
    surahName: 'n'.repeat(500),
  });
  assert.equal(p.arabic, 'a b');
  assert.ok(p.translation.length <= 2000);
  assert.ok(p.surahName.length <= 80);
});

test('ayahCardFilename: deterministic and injection-proof', () => {
  assert.equal(
    ayahCardFilename({ surahNumber: 2, ayahNumber: 255 }),
    'nur-al-dhikr-surah-2-ayah-255.png'
  );
  assert.equal(ayahCardFilename(null), 'nur-al-dhikr-surah-0-ayah-0.png');
  assert.equal(
    ayahCardFilename({ surahNumber: '<img>', ayahNumber: {} }),
    'nur-al-dhikr-surah-0-ayah-0.png'
  );
});
