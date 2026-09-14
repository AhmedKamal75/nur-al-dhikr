/**
 * tests/editorReference.test.js — audit rank 7 (v5.2.71) gates:
 *  1. the item form carries book/chapter/reference-notes/Arabic-source
 *     inputs prefilled from the item (both languages render labels);
 *  2. the save path collects the new fields (source-pinned in
 *     app/forms.js — FormData needs a DOM element);
 *  3. the restore sanitizer passes book/chapter/notes/reference_ar
 *     through capped, and drops hostile shapes;
 *  4. the new label strings exist in both languages.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildItemForm } from '../js/views/editor.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';
import { collectionFor } from '../js/domain/localeContent.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const ITEM = {
  id: 'x',
  reference: {
    collection: 'Hilyat al-Awliya\u2019',
    book: 'Kitab al-Fitan',
    chapter: '3',
    hadith: '8/224',
    narrator: 'Abu Nu\u2019aim',
    grading: 'Daif',
    notes: 'A note.',
    reference_ar: { collection: 'حلية الأولياء' },
  },
};

describe('editor reference completeness', () => {
  test('form carries all eight reference inputs prefilled', () => {
    for (const lang of ['en', 'ar']) {
      const html = buildItemForm(ITEM, { libraryId: 'l', categoryId: 'c', lang });
      for (const name of [
        'reference',
        'referenceAr',
        'referenceBook',
        'referenceChapter',
        'referenceHadith',
        'referenceNarrator',
        'referenceGrading',
        'referenceNotes',
      ]) {
        assert.ok(html.includes(`name="${name}"`), `${lang}: input ${name} present`);
      }
      assert.ok(html.includes('Kitab al-Fitan'), `${lang}: book prefilled`);
      assert.ok(html.includes('حلية الأولياء'), `${lang}: AR source prefilled`);
    }
  });

  test('save path collects the new fields (source-pinned)', () => {
    const src = readProject('js/app/forms.js');
    for (const key of ['referenceBook', 'referenceChapter', 'referenceNotes', 'referenceAr']) {
      assert.ok(src.includes(`fd.get('${key}')`), `forms.js collects ${key}`);
    }
    assert.ok(!src.includes("url: ''"), 'dead url field gone from the write path');
  });

  test('restore sanitizer passes the fields through, drops over-long', () => {
    const s = sanitizeSettings({
      contentPrefs: {
        addedItems: {
          c: [
            {
              id: 'u1',
              reference: {
                collection: 'A'.repeat(200),
                book: 'B',
                chapter: 'C',
                hadith: '1',
                narrator: 'N',
                grading: 'G',
                notes: 'N'.repeat(2000),
                reference_ar: { collection: 'حلية الأولياء', grading: 'H'.repeat(201) },
                url: 'https://evil.test/x',
              },
            },
          ],
        },
      },
    });
    const got = s.contentPrefs.addedItems.c[0].reference;
    assert.equal(got.collection.length, 200, 'at-cap collection kept');
    assert.equal(got.book, 'B');
    assert.equal(got.chapter, 'C');
    assert.equal(got.notes.length, 2000, 'at-cap notes kept');
    assert.equal(got.reference_ar.collection, 'حلية الأولياء');
    assert.equal(got.reference_ar.grading, '', 'over-long AR grading dropped');
    assert.ok(!('url' in got), 'url dropped at restore');
    // The AR collection wins in AR UI through the choke point.
    assert.equal(
      collectionFor({ reference: got }, 'ar'),
      'حلية الأولياء',
      'edited AR source renders'
    );
  });

  test('hostile reference shapes drop the reference, keep the item', () => {
    const s = sanitizeSettings({
      contentPrefs: { addedItems: { c: [{ id: 'u2', reference: { collection: { evil: 1 } } }] } },
    });
    assert.equal(s.contentPrefs.addedItems.c.length, 1, 'item survives');
    assert.ok(!('reference' in s.contentPrefs.addedItems.c[0]), 'hostile reference dropped');
  });

  test('label strings exist in EN + AR', () => {
    for (const key of [
      'editor.fieldReferenceAr',
      'editor.fieldBook',
      'editor.fieldChapter',
      'editor.fieldReferenceNotes',
    ]) {
      assert.ok(EN_STRINGS[key], `EN ${key}`);
      assert.ok(AR_STRINGS[key], `AR ${key}`);
    }
  });
});
