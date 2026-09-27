/**
 * tests/content-authority-depth.test.js — the content-authority depth
 * gates for the fix wave:
 *
 *  1. banner reordering reaches ACROSS the bundled/custom boundary (the
 *     override pool used to be bundled-only, so the last bundled banner
 *     could never move below a custom one and custom banners could not
 *     move at all);
 *  2. section reordering works inside a CUSTOM library (custom sections
 *     live in customContent, never in library.raw, so the move pool was
 *     empty) and the library view honors the override for them;
 *  3. the item editor merges onto the stored item instead of replacing
 *     it — the EN-only form used to blank the Arabic translation /
 *     virtues / custom grade and drop unrelated fields (audio, notes,
 *     tags, related);
 *  4. the "verse of the day" pool is an allowlist of devotional
 *     libraries, so a new bundled library can never leak into the card
 *     by accident.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { moveLibrary, moveCategory, moveItem } from '../js/services/contentPrefs.js';
import { renderLibrary } from '../js/views/library.js';
import { dailyEligibleEntries, pickDailyItemThemed } from '../js/domain/dailyAyah.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { processDocument, normalizeDocument } from '../js/core/schema.js';

const ROOT = join(import.meta.dirname, '..');
const adhkar = processDocument(
  JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
).value;
const duas = processDocument(JSON.parse(readFileSync(join(ROOT, 'data/duas.json'), 'utf8'))).value;

const customDoc = normalizeDocument({
  metadata: {
    id: 'lib-custom-1',
    name: { en: 'My Duas', ar: 'أدعيتي' },
    description: { en: 'Custom', ar: 'مخصص' },
    version: '1.0.0',
  },
  categories: [
    {
      id: 'cat-a',
      name: { en: 'Morning', ar: 'صباح' },
      order: 1,
      items: [
        {
          id: 'usr-1',
          title: { en: 'One', ar: 'واحد' },
          arabic: 'وَاحِد',
          order: 1,
          repetitions: 3,
        },
        {
          id: 'usr-2',
          title: { en: 'Two', ar: 'اثنان' },
          arabic: 'اثْنَان',
          order: 2,
          repetitions: 3,
        },
      ],
    },
    {
      id: 'cat-b',
      name: { en: 'Evening', ar: 'مساء' },
      order: 2,
      items: [],
    },
  ],
});

function state(prefs = {}, custom = { 'lib-custom-1': customDoc }) {
  return {
    settings: { ...DEFAULT_SETTINGS, contentPrefs: prefs },
    library: {
      documents: { adhkar, duas },
      order: ['adhkar', 'duas'],
      itemIndex: {},
      raw: { documents: { adhkar, duas }, order: ['adhkar', 'duas'] },
    },
    customContent: custom,
    activeView: 'library',
    activeParams: {},
    favorites: [],
    collections: [],
    counters: {},
    speakingItemId: null,
    ui: { contentManage: false },
  };
}

describe('banner reordering spans bundled and custom libraries', () => {
  test('the last bundled banner can move below a custom one', () => {
    const after = moveLibrary(state(), 'duas', 1);
    assert.deepEqual(after.libraryOrderOverrides, ['adhkar', 'lib-custom-1', 'duas']);
  });

  test('a custom banner can move up into the bundled block', () => {
    const after = moveLibrary(state(), 'lib-custom-1', -1);
    assert.deepEqual(after.libraryOrderOverrides, ['adhkar', 'lib-custom-1', 'duas']);
  });

  test('the edges are still no-ops and never drop a library', () => {
    const first = moveLibrary(state(), 'adhkar', -1);
    assert.equal(first.libraryOrderOverrides, undefined);
    const last = moveLibrary(state(), 'lib-custom-1', 1);
    assert.equal(last.libraryOrderOverrides, undefined);
  });

  test('a library created after the override joins the saved order', () => {
    const s = state({ libraryOrderOverrides: ['adhkar', 'duas'] });
    s.customContent['lib-custom-2'] = {
      ...customDoc,
      metadata: { ...customDoc.metadata, id: 'lib-custom-2' },
    };
    const after = moveLibrary(s, 'adhkar', 1);
    assert.deepEqual(after.libraryOrderOverrides, [
      'duas',
      'adhkar',
      'lib-custom-1',
      'lib-custom-2',
    ]);
  });

  test('the library view renders the custom banner in its moved slot', () => {
    const html = renderLibrary(
      state({ libraryOrderOverrides: ['adhkar', 'lib-custom-1', 'duas'] })
    );
    const order = [...html.matchAll(/id="lib-section-([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
    const banners = order.filter((id) => id !== 'moods');
    assert.deepEqual(banners.slice(0, 3), ['adhkar', 'lib-custom-1', 'duas']);
  });
});

describe('section + item reordering inside custom libraries', () => {
  test('sections of a custom library swap (pool reads customContent)', () => {
    const after = moveCategory(state(), 'lib-custom-1', 'cat-b', -1);
    assert.deepEqual(after.categoryOrderOverrides['lib-custom-1'], ['cat-b', 'cat-a']);
  });

  test('the library view honors a custom library section order', () => {
    const html = renderLibrary(
      state({ categoryOrderOverrides: { 'lib-custom-1': ['cat-b', 'cat-a'] } })
    );
    const section = html.slice(html.indexOf('id="lib-section-lib-custom-1"'));
    const names = [...section.matchAll(/data-id="(cat-[ab])"/g)].map((m) => m[1]);
    assert.deepEqual(names, ['cat-b', 'cat-a']);
  });

  test('items of a custom section still reorder through the shared lens', () => {
    const after = moveItem(state(), 'cat-a', 'usr-2', -1);
    assert.deepEqual(after.orderOverrides['cat-a'], ['usr-2', 'usr-1']);
  });
});

describe('the item editor merges onto the stored item', () => {
  const item = {
    id: 'itm-1',
    title: { en: 'Old title', ar: 'عنوان قديم' },
    arabic: 'قَدِيم',
    transliteration: 'qadim',
    translation: { en: 'Old translation', ar: 'ترجمة قديمة' },
    virtues: { en: 'Old virtue', ar: 'فضيلة قديمة' },
    custom_grade: { en: 'Custom grade', ar: 'درجة مخصصة' },
    reference: { collection: 'Book', reference_ar: { collection: 'كتاب' } },
    grade: 'Sahih',
    repetitions: 3,
    audio: 'audio/one.mp3',
    notes: 'Keep me',
    tags: ['sleep'],
    related: ['itm-2'],
  };

  test('an EN-only edit keeps the Arabic locales and the untouched fields', async () => {
    const { store, actions } = await import('../js/core/state.js');
    const { saveItem } = await import('../js/services/editor.js');
    const seeded = JSON.parse(JSON.stringify(customDoc));
    seeded.categories[0].items.push({ ...item, order: 3 });
    store.dispatch(actions.upsertCustomLibrary(normalizeDocument(seeded)));
    const result = saveItem(
      'lib-custom-1',
      'cat-a',
      {
        title: { en: 'New title', ar: item.title.ar },
        arabic: item.arabic,
        transliteration: item.transliteration,
        translation: { en: 'New translation', ar: item.translation.ar },
        grade: item.grade,
        custom_grade: { en: 'New grade', ar: item.custom_grade.ar },
        repetitions: 7,
        virtues: { en: 'New virtue', ar: item.virtues.ar },
        tags: item.tags,
      },
      item.id
    );
    assert.equal(result.success, true, result.error);
    const saved = result.item;
    assert.equal(saved.id, item.id, 'the edit is in place, not a new card');
    assert.equal(saved.title.en, 'New title');
    assert.equal(saved.title.ar, 'عنوان قديم', 'Arabic title survives');
    assert.equal(saved.translation.en, 'New translation');
    assert.equal(saved.translation.ar, 'ترجمة قديمة', 'Arabic translation survives');
    assert.equal(saved.virtues.ar, 'فضيلة قديمة', 'Arabic virtue survives');
    assert.equal(saved.custom_grade.ar, 'درجة مخصصة', 'Arabic custom grade survives');
    assert.equal(saved.repetitions, 7);
    assert.equal(saved.audio, 'audio/one.mp3', 'unrelated fields survive');
    assert.equal(saved.notes, 'Keep me');
    assert.deepEqual(saved.tags, ['sleep']);
    assert.deepEqual(saved.related, ['itm-2']);
    assert.equal(saved.reference.reference_ar.collection, 'كتاب');
    const cat = store
      .getState()
      .customContent['lib-custom-1'].categories.find((c) => c.id === 'cat-a');
    assert.equal(cat.items.length, 3, 'no duplicate card was appended');
  });

  test('the forms pass the stored Arabic through (source-pinned)', () => {
    const src = readFileSync(join(ROOT, 'js/app/forms.js'), 'utf8');
    for (const field of ['title?.ar', 'translation?.ar', 'virtues?.ar', 'custom_grade?.ar']) {
      assert.ok(src.includes(`existing?.${field}`), `${field} fallback present`);
    }
  });
});

describe('the daily card pool is an allowlist', () => {
  const index = {};
  const add = (lib) => {
    index[`${lib}-1`] = {
      item: { id: `${lib}-1`, translation: { en: 'x' } },
      document: { metadata: { id: lib } },
    };
  };
  for (const lib of [
    'adhkar',
    'duas',
    'quranic',
    'prophet-duas',
    'pdf-duas',
    'asma',
    'reflections',
    'daily-sunnah',
  ]) {
    add(lib);
  }

  test('devotional libraries are eligible; study/calendar ones are not', () => {
    const eligible = dailyEligibleEntries(index);
    const libs = new Set(eligible.map((e) => e.document.metadata.id));
    for (const lib of ['adhkar', 'duas', 'quranic', 'prophet-duas', 'pdf-duas']) {
      assert.ok(libs.has(lib), `${lib} is eligible`);
    }
    for (const lib of ['asma', 'reflections', 'daily-sunnah']) {
      assert.ok(!libs.has(lib), `${lib} is NOT eligible`);
    }
  });

  test('the themed pick never returns an ineligible library', () => {
    const days = Array.from({ length: 40 }, (_, i) => new Date(2026, 0, 1 + i));
    for (const day of days) {
      for (const theme of ['any', 'mercy', 'paradise']) {
        const picked = pickDailyItemThemed(index, theme, day);
        assert.ok(picked, 'a pick exists');
        assert.doesNotMatch(picked.document.metadata.id, /^(asma|reflections|daily-sunnah)$/);
      }
    }
  });

  test('a pool of only ineligible libraries yields no card (honest blank)', () => {
    const only = {
      'asma-1': { item: { id: 'asma-1' }, document: { metadata: { id: 'asma' } } },
    };
    assert.equal(dailyEligibleEntries(only).length, 0);
    assert.equal(pickDailyItemThemed(only, 'any'), null);
  });
});
