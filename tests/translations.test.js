/**
 * tests/translations.test.js
 * v3.15 "More Qur'an translations" gates:
 *  - config: TRANSLATION_EDITIONS allowlist, asTranslationEdition sanitize
 *    (garbage/prototype-ish/unknown → en-sahih), TRANSLATION_URL shape
 *  - overlayTranslation: pure, non-mutating, length-gated, per-ayah
 *    fallback to the corpus text on empty rows
 *  - bundled data integrity (mirrors scripts/build-translations.mjs G1-G8,
 *    so the shipped data can never drift from the build's own gates):
 *    114 files per edition, 6,236 verses total, per-surah counts 1:1 with
 *    the app corpus, sequential verse numbers, no empty texts, no trailing
 *    truncation, no HTML tags, muqatta'at 2:1 sanity
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TRANSLATION_EDITIONS,
  DEFAULT_TRANSLATION_EDITION,
  TRANSLATION_URL,
  asTranslationEdition,
  overlayTranslation,
  sanitizeSettings,
  DEFAULT_SETTINGS,
} from '../js/core/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const TRANSLATIONS_DIR = join(APP, 'data', 'translations');

// Captured from the live Tanzil-derived dump on 2026-08-28 (2:1 of each
// edition) — bismillah-bleed detectors, same values the build gates on.
const FIRST_21 = {
  'ur-jalandhry': 'الم',
  'fr-hamidullah': 'Alif, Lâm, Mim',
  'tr-diyanet': 'Elif, Lam, Mim',
  'id-kemenag': 'Alif Lām Mīm',
};

const corpusCounts = (() => {
  const map = new Map();
  for (let s = 1; s <= 114; s++) {
    const doc = JSON.parse(readFileSync(join(APP, 'data', 'quran', `${s}.json`), 'utf8'));
    map.set(s, doc.ayahs.length);
  }
  return map;
})();

describe('translation edition config', () => {
  test('registry holds the default + four Tanzil-derived editions', () => {
    assert.equal(TRANSLATION_EDITIONS.length, 5);
    assert.deepEqual(
      TRANSLATION_EDITIONS.map((e) => e.id),
      ['en-sahih', 'ur-jalandhry', 'fr-hamidullah', 'tr-diyanet', 'id-kemenag']
    );
    const inline = TRANSLATION_EDITIONS.find((e) => e.id === 'en-sahih');
    assert.equal(inline.inline, true, 'default edition must be marked inline (no overlay files)');
    for (const ed of TRANSLATION_EDITIONS) {
      assert.equal(typeof ed.native, 'string');
      assert.ok(ed.native.length > 0, `${ed.id} native label missing`);
      assert.ok(ed.author, `${ed.id} author missing`);
      assert.ok(ed.dir === 'ltr' || ed.dir === 'rtl');
    }
    assert.equal(TRANSLATION_EDITIONS.find((e) => e.id === 'ur-jalandhry').dir, 'rtl');
  });

  test('asTranslationEdition allowlists strictly', () => {
    assert.equal(asTranslationEdition('ur-jalandhry'), 'ur-jalandhry');
    assert.equal(asTranslationEdition('id-kemenag'), 'id-kemenag');
    assert.equal(asTranslationEdition('en-sahih'), 'en-sahih');
    // garbage, unknown, objects, empty → default
    assert.equal(asTranslationEdition('de-luther'), DEFAULT_TRANSLATION_EDITION);
    assert.equal(asTranslationEdition(''), DEFAULT_TRANSLATION_EDITION);
    assert.equal(asTranslationEdition(null), DEFAULT_TRANSLATION_EDITION);
    assert.equal(asTranslationEdition(undefined), DEFAULT_TRANSLATION_EDITION);
    assert.equal(
      asTranslationEdition({ toString: () => 'ur-jalandhry' }),
      DEFAULT_TRANSLATION_EDITION
    );
    assert.equal(asTranslationEdition('__proto__'), DEFAULT_TRANSLATION_EDITION);
  });

  test('TRANSLATION_URL encodes segments', () => {
    assert.equal(TRANSLATION_URL('ur-jalandhry', 2), 'data/translations/ur-jalandhry/2.json');
    assert.equal(TRANSLATION_URL('../evil', 3), 'data/translations/..%2Fevil/3.json');
  });

  test('sanitizeSettings folds garbage quranTranslation into the default', () => {
    const s = sanitizeSettings({ ...DEFAULT_SETTINGS, quranTranslation: 'not-an-edition' });
    assert.equal(s.quranTranslation, DEFAULT_TRANSLATION_EDITION);
    const s2 = sanitizeSettings({ ...DEFAULT_SETTINGS, quranTranslation: 'tr-diyanet' });
    assert.equal(s2.quranTranslation, 'tr-diyanet');
  });
});

describe('overlayTranslation', () => {
  const corpus = {
    number: 112,
    ayahs: [
      { number: 1, text: 'ar1', translation: 'en1' },
      { number: 2, text: 'ar2', translation: 'en2' },
      { number: 3, text: 'ar3', translation: 'en3' },
    ],
  };

  test('overlays texts without mutating either input', () => {
    const tdoc = {
      key: 'tr-diyanet',
      surah: 112,
      ayahs: [
        { number: 1, translation: 'tr1' },
        { number: 2, translation: 'tr2' },
        { number: 3, translation: 'tr3' },
      ],
    };
    const out = overlayTranslation(corpus, tdoc);
    assert.equal(out.ayahs[0].translation, 'tr1');
    assert.equal(out.ayahs[2].translation, 'tr3');
    assert.equal(out.number, 112);
    // inputs untouched
    assert.equal(corpus.ayahs[0].translation, 'en1');
    assert.equal(tdoc.ayahs[0].translation, 'tr1');
    assert.notEqual(out, corpus);
    assert.notEqual(out.ayahs[0], corpus.ayahs[0]);
  });

  test('length mismatch → corpus doc returned unchanged (same reference)', () => {
    const short = { ayahs: [{ number: 1, translation: 'x' }] };
    assert.equal(overlayTranslation(corpus, short), corpus);
    assert.equal(overlayTranslation(corpus, null), corpus);
    assert.equal(overlayTranslation(corpus, {}), corpus);
    assert.equal(overlayTranslation(null, null), null);
  });

  test('empty/whitespace overlay rows fall back per-ayah, never blank a verse', () => {
    const partial = {
      ayahs: [{ number: 1, translation: '  ' }, { number: 2, translation: 'ok' }, { number: 3 }],
    };
    const out = overlayTranslation(corpus, partial);
    assert.equal(out.ayahs[0].translation, 'en1');
    assert.equal(out.ayahs[1].translation, 'ok');
    assert.equal(out.ayahs[2].translation, 'en3');
  });
});

describe('bundled translation data integrity (G1-G8)', () => {
  const EDITION_DIRS = TRANSLATION_EDITIONS.filter((e) => !e.inline).map((e) => e.id);

  test('corpus reference itself is complete (6,236 ayahs)', () => {
    let total = 0;
    for (const n of corpusCounts.values()) total += n;
    assert.equal(total, 6236);
  });

  for (const ed of EDITION_DIRS) {
    test(`[${ed}] 114 files, 6,236 verses, 1:1 with corpus, clean texts`, () => {
      let total = 0;
      for (let s = 1; s <= 114; s++) {
        const doc = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, ed, `${s}.json`), 'utf8'));
        assert.equal(doc.key, ed, `surah ${s}: key mismatch`);
        assert.equal(doc.surah, s, `surah ${s}: number field mismatch`);
        assert.equal(doc.ayahs.length, corpusCounts.get(s), `surah ${s}: count != corpus`);
        for (let i = 0; i < doc.ayahs.length; i++) {
          const row = doc.ayahs[i];
          assert.equal(row.number, i + 1, `${ed} ${s}: verse number not sequential`);
          const text = row.translation;
          assert.equal(typeof text, 'string', `${ed} ${s}:${i + 1} not a string`);
          assert.ok(text.trim().length > 0, `${ed} ${s}:${i + 1} empty`);
          const trimmed = text.trimEnd();
          assert.ok(
            !(trimmed.endsWith('...') || trimmed.endsWith('…')),
            `${ed} ${s}:${i + 1} ends truncated`
          );
          assert.ok(!/<[a-z!][^>]*>/i.test(text), `${ed} ${s}:${i + 1} contains HTML`);
        }
        total += doc.ayahs.length;
      }
      assert.equal(total, 6236, `${ed}: total verse count`);
    });

    test(`[${ed}] 2:1 muqatta'at sanity (bismillah-bleed detector)`, () => {
      const doc = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, ed, '2.json'), 'utf8'));
      const got = doc.ayahs[0].translation.trim();
      assert.ok(
        got.startsWith(FIRST_21[ed]),
        `${ed} 2:1 = "${got.slice(0, 30)}", expected start "${FIRST_21[ed]}"`
      );
    });

    test(`[${ed}] overlay merges 1:1 onto the real corpus doc`, () => {
      // spot surahs: opener, longest, final
      for (const s of [1, 2, 114]) {
        const corpus = JSON.parse(readFileSync(join(APP, 'data', 'quran', `${s}.json`), 'utf8'));
        const tdoc = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, ed, `${s}.json`), 'utf8'));
        const merged = overlayTranslation(corpus, tdoc);
        assert.equal(merged.ayahs.length, corpus.ayahs.length, `surah ${s}`);
        assert.notEqual(merged, corpus, 'overlay must not mutate or return the corpus doc');
        for (let i = 0; i < merged.ayahs.length; i++) {
          assert.ok(merged.ayahs[i].translation.length > 0, `${ed} ${s}:${i + 1} blanked`);
          assert.equal(
            merged.ayahs[i].text,
            corpus.ayahs[i].text,
            `surah ${s} arabic text altered`
          );
        }
      }
    });
  }
});
