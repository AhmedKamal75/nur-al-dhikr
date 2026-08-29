import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processDocument } from '../js/schema.js';

/**
 * The Adhkar data gates (v3.9) — the standing acceptance criteria for the
 * most-used content library in the app. These encode the AGENTS.md rules:
 * complete texts (no "..."), no duplicates within a category, canonical
 * sequencing, and full schema validity. If any of these fail, the library
 * has regressed to the pre-v3.9 jumble and must not ship.
 */

const ROOT = join(import.meta.dirname, '..');
const doc = JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'));

const ELLIPSIS = /\.\.\.|\u2026/;
const FOLD = (s) =>
  String(s)
    .replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED\u0653-\u0655\u0674\u0610-\u061A\u06DD]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/[^\u0621-\u064A]/g, '');

describe('adhkar data gates', () => {
  test('document passes the app schema validator', () => {
    const result = processDocument(doc);
    assert.ok(result.success, `schema rejected the document: ${result.error}`);
  });

  test('the v3.9 canonical structure is intact', () => {
    const counts = Object.fromEntries(doc.categories.map((c) => [c.id, c.items.length]));
    // morning 29, evening 27, post-prayer 16, sleep 16, wake-up 9,
    // tasbih-general 20, daily-supplications 51 (see scripts/adhkar-spec/)
    assert.deepEqual(counts, {
      morning: 29,
      evening: 27,
      'post-prayer': 16,
      sleep: 16,
      'wake-up': 9,
      'tasbih-general': 20,
      'daily-supplications': 51,
    });
  });

  for (const cat of doc.categories) {
    test(`${cat.id}: every item complete, ordered, referenced`, () => {
      cat.items.forEach((it, idx) => {
        assert.equal(it.order, idx + 1, `${it.id}: order must be sequential`);
        assert.ok(it.arabic && it.arabic.trim(), `${it.id}: empty arabic`);
        assert.ok(it.title?.en, `${it.id}: empty title.en`);
        assert.ok(it.title?.ar, `${it.id}: empty title.ar`);
        assert.ok(it.translation?.en && it.translation.en.trim(), `${it.id}: empty translation.en`);
        assert.ok(it.reference?.collection, `${it.id}: missing reference.collection`);
        assert.ok(
          Number.isInteger(it.repetitions) && it.repetitions >= 1,
          `${it.id}: bad repetitions`
        );
        for (const [field, value] of [
          ['arabic', it.arabic],
          ['title.en', it.title?.en],
          ['title.ar', it.title?.ar],
          ['translation.en', it.translation?.en],
          ['translation.ar', it.translation?.ar],
          ['transliteration', it.transliteration],
          ['virtues.en', it.virtues?.en],
          ['virtues.ar', it.virtues?.ar],
          ['notes', it.notes],
        ]) {
          assert.ok(!ELLIPSIS.test(value ?? ''), `${it.id}: truncation marker in ${field}`);
        }
      });
    });

    test(`${cat.id}: no duplicate texts within the category`, () => {
      const seen = new Map();
      for (const it of cat.items) {
        const key = FOLD(it.arabic);
        assert.ok(
          !seen.has(key),
          `${it.id} duplicates ${seen.get(key)} — duplicates are the pre-v3.9 defect`
        );
        seen.set(key, it.id);
      }
    });

    test(`${cat.id}: canonical anchors in canonical positions`, () => {
      // Spot-check the sequence the owner called out: "it is known that we
      // do some first and then this" — the canonical openings.
      const ids = cat.items.map((i) => i.id);
      if (cat.id === 'morning') {
        assert.equal(ids[0], 'adh-mor-001', 'morning opens with Ayat al-Kursi');
        assert.equal(ids[1], 'adh-mor-003a', 'then the three surahs');
        assert.ok(
          ids.indexOf('adh-mor-010') < ids.indexOf('adh-mor-002'),
          'asbahna before sayyid al-istighfar'
        );
      }
      if (cat.id === 'evening') {
        assert.equal(ids[0], 'adh-eve-001', 'evening opens with Ayat al-Kursi');
        assert.ok(
          ids.indexOf('adh-eve-003d') < ids.indexOf('adh-eve-010'),
          'baqarah end before amsayna'
        );
      }
      if (cat.id === 'post-prayer') {
        assert.equal(ids[0], 'adh-pos-001', 'post-prayer opens with istighfar');
        assert.equal(ids[1], 'adh-pos-002', 'then Allahumma antas-salam');
      }
      if (cat.id === 'sleep') {
        assert.equal(ids[0], 'adh-slp-001', 'sleep opens with bismika allahumma');
        const mulk = cat.items.find((i) => i.id === 'adh-slp-003e');
        assert.ok(mulk.arabic.length > 2500, 'al-Mulk must be the COMPLETE surah, not one verse');
      }
      if (cat.id === 'wake-up') {
        assert.equal(ids[0], 'adh-wak-001', 'wake-up opens with alhamdu lillahil-ladhi ahyana');
      }
    });
  }

  test('no pre-v3.9 glm duplicate layer remains in the core categories', () => {
    for (const cat of doc.categories) {
      for (const it of cat.items) {
        if (['morning', 'evening', 'post-prayer', 'sleep', 'wake-up'].includes(cat.id)) {
          assert.ok(
            !it.id.startsWith('glm-') || ['glm-topical-sl-005', 'glm-wake-005'].includes(it.id),
            `${cat.id}/${it.id}: paraphrased-layer record survived the audit`
          );
        }
      }
    }
  });

  test('quran excerpts are verbatim from the app corpus', () => {
    const kursi = JSON.parse(readFileSync(join(ROOT, 'data/quran/2.json'), 'utf8')).ayahs[254].text;
    const mor = doc.categories.find((c) => c.id === 'morning').items[0];
    assert.equal(mor.arabic, kursi, 'morning ayat al-kursi must be corpus-verbatim');
    const slpKursi = doc.categories
      .find((c) => c.id === 'sleep')
      .items.find((i) => i.id === 'adh-slp-002');
    assert.equal(slpKursi.arabic, kursi, 'sleep ayat al-kursi must be corpus-verbatim');
    const mulk = doc.categories
      .find((c) => c.id === 'sleep')
      .items.find((i) => i.id === 'adh-slp-003e');
    const surah67 = JSON.parse(readFileSync(join(ROOT, 'data/quran/67.json'), 'utf8'));
    const expected = `${JSON.parse(readFileSync(join(ROOT, 'data/quran/1.json'), 'utf8')).ayahs[0].text} ${surah67.ayahs.map((a) => a.text).join(' ')}`;
    assert.equal(mulk.arabic, expected, 'al-Mulk must be the full corpus surah with basmala');
  });
});
