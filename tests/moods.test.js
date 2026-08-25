/**
 * tests/moods.test.js — "Browse by need" cross-library matcher
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MOODS, moodById, itemsForMood } from '../js/moods.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* ---- Shape guarantees ---- */

test('every mood has a unique id, an icon, and matching rules', () => {
  const ids = new Set();
  for (const mood of MOODS) {
    assert.equal(typeof mood.id, 'string', `${mood} id`);
    assert.ok(!ids.has(mood.id), `duplicate mood id ${mood.id}`);
    ids.add(mood.id);
    assert.equal(typeof mood.icon, 'string');
    assert.ok(
      Array.isArray(mood.categories) && mood.categories.length >= 1,
      `${mood.id} needs categories`
    );
    assert.ok(Array.isArray(mood.tags));
  }
});

test('moodById resolves known ids and rejects unknown ones', () => {
  assert.equal(moodById('anxious')?.id, 'anxious');
  assert.equal(moodById('does-not-exist'), null);
});

/* ---- Matching logic (synthetic index) ---- */

function entry(id, categoryId, tags = []) {
  return {
    item: { id, tags },
    category: { id: categoryId },
    document: { metadata: { id: 'lib' } },
  };
}

test('itemsForMood: whole-category matching', () => {
  const mood = moodById('travel');
  const index = {
    a: entry('a', 'travel'),
    b: entry('b', 'anxiety-distress'),
    c: entry('c', 'travel'),
  };
  const got = itemsForMood(mood, index).map((e) => e.item.id);
  assert.deepEqual(got.sort(), ['a', 'c']);
});

test('itemsForMood: tag matching is case-insensitive and pulls cross-library items', () => {
  const mood = moodById('anxious'); // tags include anxiety, tawakkul
  const index = {
    a: entry('a', 'unrelated-cat'),
    b: entry('b', 'other-cat', ['Anxiety']), // case difference must still match
    c: entry('c', 'another-cat', ['tawakkul']),
    d: entry('d', 'third-cat', ['gratitude']), // must NOT match
  };
  const got = itemsForMood(mood, index)
    .map((e) => e.item.id)
    .sort();
  assert.deepEqual(got, ['b', 'c']);
});

test('itemsForMood: category items are included even when their tags miss', () => {
  const mood = moodById('sleep');
  const index = { a: entry('a', 'sleep', ['nothing-matching']), b: entry('b', 'other', ['sleep']) };
  assert.equal(itemsForMood(mood, index).length, 2);
});

test('itemsForMood: malformed inputs return empty arrays, never throw', () => {
  assert.deepEqual(itemsForMood(null, {}), []);
  assert.deepEqual(itemsForMood(MOODS[0], null), []);
  assert.deepEqual(
    itemsForMood(MOODS[0], { a: null, b: { item: null }, c: { item: {}, category: null } }),
    []
  );
});

/* ---- Grounding: run every mood against the REAL bundled data ---- */

function buildRealIndex() {
  const index = {};
  for (const lib of [
    'adhkar',
    'duas',
    'quranic',
    'prophet-duas',
    'reflections',
    'daily-sunnah',
    'special-days',
  ]) {
    const doc = JSON.parse(readFileSync(join(ROOT, 'data', `${lib}.json`), 'utf8'));
    for (const cat of doc.categories || []) {
      for (const item of cat.items || []) {
        index[item.id] = { item, category: cat, document: doc };
      }
    }
  }
  return index;
}

const realIndex = buildRealIndex();

test('every mood matches real bundled content (no empty mood ever renders)', () => {
  for (const mood of MOODS) {
    const count = itemsForMood(mood, realIndex).length;
    assert.ok(count >= 5, `mood "${mood.id}" matched only ${count} items`);
  }
});

test('mood categories reference real category ids in the bundled data', () => {
  const realCatIds = new Set(Object.values(realIndex).map((e) => e.category.id));
  for (const mood of MOODS) {
    for (const catId of mood.categories) {
      assert.ok(realCatIds.has(catId), `mood "${mood.id}" references unknown category "${catId}"`);
    }
  }
});

test('anxious mood pulls from more than one library (cross-library breadth)', () => {
  const libs = new Set(
    itemsForMood(moodById('anxious'), realIndex).map((e) => e.document.metadata.id)
  );
  assert.ok(libs.size >= 2, `expected cross-library breadth, got ${[...libs].join(', ')}`);
});
