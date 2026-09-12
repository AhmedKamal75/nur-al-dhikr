/**
 * tests/content-i18n-audit.test.js — Content & i18n audit gates.
 *
 * Part 1 pins the strict language-separation contract at the unit level:
 *   AR UI → Arabic matn + Arabic virtue/source only. Transliteration and
 *     translation NEVER render; no English fallback anywhere.
 *   EN UI → Arabic matn + transliteration + English translation + English
 *     virtue/source, with no Arabic fallback.
 * Part 2 pins it at the template level (ui/card.js).
 * Part 3 guards the datasets themselves: hard matn-integrity invariants
 * (no empty matn, no HTML/Latin in the Arabic field, no duplicate ids)
 * plus coverage baselines that fail only when a gap count REGRESSES
 * (known scholarly gaps — man-yaduni takhrij, asma essays — are tracked
 * in docs/content-i18n-audit.md, not re-broken here).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  pickStrict,
  containsArabic,
  showTransliterationFor,
  showTranslationFor,
  translationFor,
  virtueFor,
  collectionFor,
  narratorFor,
  referencePartsFor,
  noteFor,
} from '../js/domain/localeContent.js';
import { cardHTML } from '../js/ui/card.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* Part 1 — localeContent unit contract                                 */
/* ------------------------------------------------------------------ */

describe('localeContent: strict language separation', () => {
  test('transliteration/translation toggles are dead in AR, live in EN', () => {
    assert.equal(showTransliterationFor('ar', true), false);
    assert.equal(showTransliterationFor('ar', false), false);
    assert.equal(showTranslationFor('ar', true), false);
    assert.equal(showTranslationFor('ar', false), false);
    assert.equal(showTransliterationFor('en', true), true);
    assert.equal(showTransliterationFor('en', false), false);
    assert.equal(showTranslationFor('en', true), true);
    assert.equal(showTranslationFor('en', false), false);
  });

  test('translationFor reads English exclusively, never in AR', () => {
    const item = { translation: { en: 'O Allah', ar: 'اللهم' } };
    assert.equal(translationFor(item, 'en'), 'O Allah');
    assert.equal(translationFor(item, 'ar'), '');
    // no fallback: missing EN side renders nothing (not the Arabic gloss)
    assert.equal(translationFor({ translation: { en: '', ar: 'اللهم' } }, 'en'), '');
  });

  test('virtueFor/pickStrict never fall back across languages', () => {
    assert.equal(virtueFor({ virtues: { en: 'EN virtue', ar: '' } }, 'ar'), '');
    assert.equal(virtueFor({ virtues: { en: '', ar: 'فضل عربي' } }, 'en'), '');
    assert.equal(virtueFor({ virtues: { en: 'EN virtue', ar: 'فضل عربي' } }, 'ar'), 'فضل عربي');
    assert.equal(pickStrict({ en: 'x' }, 'ar'), '');
    assert.equal(pickStrict('legacy', 'ar'), '');
    assert.equal(pickStrict('legacy', 'en'), 'legacy');
  });

  test('collectionFor localizes known sources, suppresses unmapped Latin in AR', () => {
    const bukhari = { reference: { collection: 'Sahih al-Bukhari 444, Sahih Muslim 714' } };
    assert.equal(collectionFor(bukhari, 'en'), 'Sahih al-Bukhari 444, Sahih Muslim 714');
    assert.equal(collectionFor(bukhari, 'ar'), 'صحيح البخاري 444، صحيح مسلم 714');
    assert.equal(
      collectionFor({ reference: { collection: 'Sahih Muslim 591' } }, 'ar'),
      'صحيح مسلم 591'
    );
    assert.equal(
      collectionFor({ reference: { collection: 'Quran 2:201' } }, 'ar'),
      'القرآن الكريم 2:201'
    );
    assert.equal(
      collectionFor({ reference: { collection: 'Surah al-Baqarah 2:201' } }, 'ar'),
      'القرآن الكريم 2:201'
    );
    assert.equal(collectionFor({ reference: { collection: 'من يدعوني؟' } }, 'ar'), 'من يدعوني؟');
    // unmapped Latin source: omitted in AR rather than leaked
    assert.equal(
      collectionFor({ reference: { collection: 'Some Unmapped Journal 12' } }, 'ar'),
      ''
    );
    assert.equal(
      collectionFor({ reference: { collection: 'Some Unmapped Journal 12' } }, 'en'),
      'Some Unmapped Journal 12'
    );
  });

  test('narratorFor maps common narrators, suppresses unmapped Latin in AR', () => {
    assert.equal(narratorFor({ reference: { narrator: 'Abu Hurayrah' } }, 'ar'), 'أبو هريرة');
    assert.equal(narratorFor({ reference: { narrator: 'Anas bin Malik' } }, 'ar'), 'أنس بن مالك');
    assert.equal(narratorFor({ reference: { narrator: 'Abu Hurayrah' } }, 'en'), 'Abu Hurayrah');
    assert.equal(narratorFor({ reference: { narrator: 'Some Unknown Narrator' } }, 'ar'), '');
  });

  test('referencePartsFor keeps book/chapter/grading in EN only', () => {
    const item = {
      reference: {
        collection: 'Sahih al-Bukhari',
        book: 'Book of Supplications',
        hadith: '6398',
        narrator: 'Abu Hurayrah',
        grading: 'Sahih',
      },
    };
    const en = referencePartsFor(item, 'en', 'narrated by');
    assert.ok(en.includes('Sahih al-Bukhari') && en.includes('Book of Supplications'));
    assert.ok(en.includes('6398') && en.some((p) => p.includes('Abu Hurayrah')));
    const ar = referencePartsFor(item, 'ar', 'رواه');
    assert.ok(ar.includes('صحيح البخاري'), `AR parts: ${ar.join(' · ')}`);
    assert.ok(ar.includes('6398'));
    assert.ok(!ar.some((p) => /[A-Za-z]/.test(p)), `no Latin in AR parts: ${ar.join(' · ')}`);
  });

  test('noteFor suppresses Latin-only notes in AR', () => {
    assert.equal(noteFor('Also in Muslim 2719.', 'ar'), '');
    assert.equal(noteFor('Also in Muslim 2719.', 'en'), 'Also in Muslim 2719.');
    assert.equal(noteFor('ملاحظة عربية (مسلم 2719).', 'ar'), 'ملاحظة عربية (مسلم 2719).');
  });

  test('containsArabic detects script presence', () => {
    assert.equal(containsArabic('صحيح البخاري'), true);
    assert.equal(containsArabic('Sahih al-Bukhari'), false);
    assert.equal(containsArabic(''), false);
  });
});

/* ------------------------------------------------------------------ */
/* Part 2 — card template compliance                                    */
/* ------------------------------------------------------------------ */

const BILINGUAL_ITEM = {
  id: 'audit-demo',
  category_id: 'cat-audit',
  repetitions: 1,
  grade: 'Sahih',
  arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا',
  transliteration: 'Allahumma bika asbahna.',
  title: { en: 'Morning dua', ar: 'دعاء الصباح' },
  translation: { en: 'O Allah, by You we enter the morning.', ar: 'اللهم بك أصبحنا' },
  virtues: { en: 'Whoever says it is protected.', ar: 'من قالها حفظ.' },
  reference: {
    collection: 'Sahih Muslim',
    book: 'Book of Prayer',
    hadith: '2722',
    narrator: 'Abu Hurayrah',
    grading: 'Sahih',
    notes: 'Also in Sunan Abi Dawud 5095.',
  },
  notes: 'Editorial note in English.',
};

describe('cardHTML: strict language separation', () => {
  test('AR card hides transliteration + translation, shows Arabic virtue/source', () => {
    const html = cardHTML(BILINGUAL_ITEM, null, { lang: 'ar' });
    assert.ok(html.includes('اللَّهُمَّ بِكَ أَصْبَحْنَا'), 'matn present');
    assert.ok(!html.includes('Allahumma bika asbahna.'), 'no transliteration in AR');
    assert.ok(
      !html.includes('O Allah, by You we enter the morning.'),
      'no English translation in AR'
    );
    assert.ok(html.includes('من قالها حفظ.'), 'Arabic virtue present');
    assert.ok(!html.includes('Whoever says it is protected.'), 'no English virtue in AR');
    assert.ok(html.includes('صحيح مسلم'), 'localized source present');
    assert.ok(!html.includes('Book of Prayer'), 'no English book title in AR');
    assert.ok(!html.includes('Also in Sunan Abi Dawud'), 'no English ref-notes in AR');
    assert.ok(!html.includes('Editorial note in English'), 'no English notes in AR');
  });

  test('EN card shows matn + translit + translation + English virtue/source', () => {
    const html = cardHTML(BILINGUAL_ITEM, null, { lang: 'en' });
    assert.ok(html.includes('اللَّهُمَّ بِكَ أَصْبَحْنَا'), 'matn present');
    assert.ok(html.includes('Allahumma bika asbahna.'), 'transliteration present');
    assert.ok(html.includes('O Allah, by You we enter the morning.'), 'translation present');
    assert.ok(html.includes('Whoever says it is protected.'), 'English virtue present');
    assert.ok(html.includes('Sahih Muslim'), 'English source present');
    // ... and the Arabic-only sides stay out
    assert.ok(!html.includes('من قالها حفظ.'), 'no Arabic virtue in EN');
  });

  test('EN toggles still hide translit/translation; AR ignores enabled toggles', () => {
    const enOff = cardHTML(BILINGUAL_ITEM, null, {
      lang: 'en',
      showTransliteration: false,
      showTranslation: false,
    });
    assert.ok(!enOff.includes('Allahumma bika asbahna.'));
    assert.ok(!enOff.includes('O Allah, by You we enter the morning.'));
    const arOn = cardHTML(BILINGUAL_ITEM, null, {
      lang: 'ar',
      showTransliteration: true,
      showTranslation: true,
    });
    assert.ok(!arOn.includes('Allahumma bika asbahna.'));
    assert.ok(!arOn.includes('O Allah, by You we enter the morning.'));
  });

  test('AR card never falls back to English virtue when Arabic is missing', () => {
    const item = { ...BILINGUAL_ITEM, virtues: { en: 'English only virtue', ar: '' } };
    const html = cardHTML(item, null, { lang: 'ar' });
    assert.ok(!html.includes('English only virtue'));
  });
});

/* ------------------------------------------------------------------ */
/* Part 3 — dataset gates                                               */
/* ------------------------------------------------------------------ */

function loadLibrary(file) {
  const path = join(ROOT, 'data', file);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const LIB_FILES = [
  'adhkar.json',
  'duas.json',
  'quranic.json',
  'prophet-duas.json',
  'asma.json',
  'reflections.json',
  'pdf-duas.json',
  'daily-sunnah.json',
  'special-days.json',
];

const LATIN_RE = /[A-Za-z]/;
const HTML_RE = /<[^>]+>|&(amp|lt|gt|quot|#\d+);/;

function collectGaps(doc) {
  const items = (doc.categories || []).flatMap((c) => c.items || []);
  const gaps = {
    items: items.length,
    missingArabic: [],
    htmlInMatn: [],
    latinInMatn: [],
    duplicates: [],
    missingTransliteration: [],
    missingTranslationEn: [],
    missingVirtueEn: [],
    missingVirtueAr: [],
    gradeUnknown: [],
    emptyReference: [],
    missingGrading: [],
  };
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) gaps.duplicates.push(it.id);
    seen.add(it.id);
    const ar = it.arabic || '';
    if (!ar.trim()) gaps.missingArabic.push(it.id);
    if (HTML_RE.test(ar)) gaps.htmlInMatn.push(it.id);
    if (LATIN_RE.test(ar)) gaps.latinInMatn.push(it.id);
    if (!(it.transliteration || '').trim()) gaps.missingTransliteration.push(it.id);
    if (!(it.translation?.en || '').trim()) gaps.missingTranslationEn.push(it.id);
    if (!(it.virtues?.en || '').trim()) gaps.missingVirtueEn.push(it.id);
    if (!(it.virtues?.ar || '').trim()) gaps.missingVirtueAr.push(it.id);
    if (!it.grade || it.grade === 'Unknown') gaps.gradeUnknown.push(it.id);
    if (!(it.reference?.collection || '').trim()) gaps.emptyReference.push(it.id);
    // Custom devotional items carry their explanation in custom_grade —
    // hadith-style reference.grading does not apply to them.
    if (it.grade !== 'Quran' && it.grade !== 'Custom' && !(it.reference?.grading || '').trim())
      gaps.missingGrading.push(it.id);
  }
  return gaps;
}

// Coverage baselines (audit of record): counts must NEVER grow. When a
// scholarly gap is closed, lower the matching number here.
const BASELINES = {
  'adhkar.json': { missingGrading: 26 },
  'duas.json': {
    missingTranslationEn: 194,
    missingVirtueEn: 195,
    missingVirtueAr: 195,
    gradeUnknown: 98,
    missingGrading: 162,
  },
  'asma.json': { missingVirtueAr: 99 },
  'reflections.json': { missingGrading: 20 },
  'pdf-duas.json': { missingGrading: 61 },
  'daily-sunnah.json': { missingGrading: 6 },
};

describe('datasets: matn integrity (hard gates)', () => {
  for (const file of LIB_FILES) {
    test(`${file}: every item has an Arabic matn with no HTML/Latin, no duplicate ids`, () => {
      const doc = loadLibrary(file);
      assert.ok(doc, `data/${file} loads`);
      const g = collectGaps(doc);
      assert.deepEqual(g.missingArabic, [], `items without matn: ${g.missingArabic.join(', ')}`);
      assert.deepEqual(g.htmlInMatn, [], `matn with HTML: ${g.htmlInMatn.join(', ')}`);
      assert.deepEqual(g.latinInMatn, [], `matn with Latin script: ${g.latinInMatn.join(', ')}`);
      assert.deepEqual(g.duplicates, [], `duplicate ids: ${g.duplicates.join(', ')}`);
    });
  }
});

describe('datasets: coverage must not regress below the audit baselines', () => {
  for (const [file, base] of Object.entries(BASELINES)) {
    test(`${file}: gap counts stay at or below baseline`, () => {
      const g = collectGaps(loadLibrary(file));
      for (const [key, max] of Object.entries(base)) {
        assert.ok(
          g[key].length <= max,
          `${file} ${key}: ${g[key].length} exceeds baseline ${max} (new: ${g[key].slice(0, 8).join(', ')})`
        );
      }
    });
  }
});
