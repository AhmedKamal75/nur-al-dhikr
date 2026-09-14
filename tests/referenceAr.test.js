/**
 * tests/referenceAr.test.js — audit §5.4 first light (v5.2.70) gates:
 *  1. collection matching folds diacritics + curly quotes (Ṣaḥīḥ, Aḥmad,
 *     Tirmidhī, Jami’, Qur’an) with byte-identical remainders from RAW;
 *  2. the ten backfilled duas render their Arabic source in AR while the
 *     deliberately-skipped classes stay honestly unmapped;
 *  3. the schema drops dead reference.url and keeps reference_ar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { collectionFor } from '../js/domain/localeContent.js';
import { normalizeItem } from '../js/core/schema.js';

const ar = (collection, extra = {}) => collectionFor({ reference: { collection, ...extra } }, 'ar');

describe('folded collection matching', () => {
  test('diacritic variants share their plain keys', () => {
    assert.equal(ar('Ṣaḥīḥ Muslim'), 'صحيح مسلم');
    assert.equal(ar('Ṣaḥīḥ al-Bukhārī'), 'صحيح البخاري');
    assert.equal(ar('Musnad Aḥmad'), 'مسند أحمد');
    assert.equal(ar('Sunan at-Tirmidhī'), 'سنن الترمذي');
  });

  test('curly quotes match straight ones, byte-identical', () => {
    assert.equal(ar('Jami’ at-Tirmidhi'), ar("Jami' at-Tirmidhi"));
    assert.equal(ar('The Qur’an'), ar("The Qur'an"));
    assert.equal(ar('The Qur’an'), 'القرآن الكريم');
  });

  test('remainders slice from raw: numbers kept, byte-identical', () => {
    assert.equal(ar('Sahih al-Bukhari 444'), 'صحيح البخاري 444');
    assert.equal(ar('Quran 2:152'), 'القرآن الكريم 2:152');
    assert.equal(ar('Sunan an-Nasa\u2019i (al-Kubra)'), 'سنن النسائي الكبرى');
  });

  test('descriptive strings stay unmapped (honest omission)', () => {
    assert.equal(ar('Scholarly recommendation'), '');
    assert.equal(ar('Multiple Collections'), '');
    assert.equal(ar('Fiqh consensus'), '');
  });
});

describe('duas.json reference_ar backfill', () => {
  const duas = JSON.parse(readFileSync(new URL('../data/duas.json', import.meta.url), 'utf8'));
  const byId = {};
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === 'object') {
      if (n.id) byId[n.id] = n;
      Object.values(n).forEach(walk);
    }
  };
  walk(duas);

  const expected = {
    'my-05-003': 'الفرج بعد الشدة',
    'my-05-013': 'حلية الأولياء',
    'my-05-014': 'حلية الأولياء',
    'my-06-008': 'حلية الأولياء',
    'my-07-004': 'سير أعلام النبلاء',
    'my-07-006': 'إعلام الموقعين',
    'my-11-010': 'تاريخ دمشق',
    'my-12-011': 'مجمع الزوائد',
    'my-15-017': 'مدارج السالكين',
    'my-15-018': 'الداء والدواء',
  };

  test('all ten backfilled ids render their Arabic source', () => {
    for (const [id, want] of Object.entries(expected)) {
      assert.ok(byId[id], `${id} exists`);
      assert.equal(collectionFor(byId[id], 'ar'), want, id);
    }
  });

  test('ambiguous/generic titles stay unmapped, never guessed', () => {
    for (const id of ['my-04-015', 'my-09-003']) {
      assert.equal(collectionFor(byId[id], 'ar'), '', `${id} honestly empty`);
    }
  });
});

describe('schema: dead url dropped, reference_ar kept', () => {
  test('normalizeItem drops reference.url and passes reference_ar through', () => {
    const out = normalizeItem(
      {
        id: 'x',
        reference: {
          collection: 'Hilyat al-Awliya\u2019',
          url: 'https://example.test/dead',
          reference_ar: { collection: 'حلية الأولياء' },
        },
      },
      'c'
    );
    assert.ok(!('url' in out.reference), 'no url key survives');
    assert.equal(out.reference.collection, 'Hilyat al-Awliya\u2019');
    assert.deepEqual(out.reference.reference_ar, {
      collection: 'حلية الأولياء',
    });
  });
});
