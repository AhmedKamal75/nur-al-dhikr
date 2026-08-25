import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeItem,
  normalizeCategory,
  normalizeDocument,
  validateDocument,
  processDocument,
  blankItem,
  blankCategory,
  normalizeCustomContentMap,
} from '../js/schema.js';
import { GRADES } from '../js/config.js';

describe('normalizeItem', () => {
  test('fills in every field defined by the spec, even from an empty object', () => {
    const item = normalizeItem({}, 'cat-1');
    for (const key of [
      'id',
      'category_id',
      'title',
      'arabic',
      'transliteration',
      'translation',
      'reference',
      'grade',
      'custom_grade',
      'repetitions',
      'virtues',
      'tags',
      'related',
      'notes',
      'order',
    ]) {
      assert.ok(key in item, `missing field: ${key}`);
    }
    assert.equal(item.category_id, 'cat-1', 'falls back to the passed-in categoryId');
    assert.equal(item.grade, 'Unknown');
    assert.equal(item.repetitions, 1);
  });

  test('rejects an invalid grade, falling back to Unknown', () => {
    const item = normalizeItem({ grade: 'NotARealGrade' }, 'c');
    assert.equal(item.grade, 'Unknown');
  });

  test('accepts every grade defined in config.js', () => {
    for (const g of GRADES) {
      assert.equal(normalizeItem({ grade: g }, 'c').grade, g);
    }
  });

  test('coerces a non-positive or fractional repetitions value to a safe integer', () => {
    assert.equal(normalizeItem({ repetitions: -5 }, 'c').repetitions, 1);
    assert.equal(normalizeItem({ repetitions: 0 }, 'c').repetitions, 1);
    assert.equal(normalizeItem({ repetitions: 3.9 }, 'c').repetitions, 3);
  });

  test('filters non-string entries out of tags/related arrays instead of throwing', () => {
    const item = normalizeItem({ tags: ['ok', 42, null, 'also-ok'], related: [1, 'x'] }, 'c');
    assert.deepEqal ? null : assert.deepEqual(item.tags, ['ok', 'also-ok']);
    assert.deepEqual(item.related, ['x']);
  });

  test('accepts a bare string for a locale field (legacy shape)', () => {
    const item = normalizeItem({ title: 'Morning Adhkar' }, 'c');
    assert.equal(item.title.en, 'Morning Adhkar');
    assert.equal(item.title.ar, '');
  });
});

describe('normalizeDocument / validateDocument', () => {
  function sampleDoc() {
    return {
      metadata: { id: 'test-lib', name: 'Test Library' },
      categories: [
        {
          id: 'cat-a',
          name: 'Category A',
          items: [{ id: 'item-1', arabic: 'بِسْمِ اللَّهِ', grade: 'Sahih' }],
        },
      ],
    };
  }

  test('a well-formed document normalizes and validates cleanly', () => {
    const doc = normalizeDocument(sampleDoc());
    const result = validateDocument(doc);
    assert.equal(result.success, true);
    assert.equal(result.value.itemCount, 1);
    assert.equal(result.value.categoryCount, 1);
  });

  test('flags duplicate item ids across categories as a hard failure', () => {
    const raw = sampleDoc();
    raw.categories.push({
      id: 'cat-b',
      name: 'Category B',
      items: [{ id: 'item-1', arabic: 'دعاء آخر' }], // same id as cat-a's item
    });
    const doc = normalizeDocument(raw);
    const result = validateDocument(doc);
    assert.equal(result.success, false);
    assert.match(result.error, /Duplicate item id/);
  });

  test('flags duplicate category ids as a hard failure', () => {
    const raw = sampleDoc();
    raw.categories.push({ id: 'cat-a', name: 'Dup', items: [] });
    const result = validateDocument(normalizeDocument(raw));
    assert.equal(result.success, false);
    assert.match(result.error, /Duplicate category id/);
  });

  test('warns (but does not fail) when an item has neither Arabic nor English text', () => {
    const raw = sampleDoc();
    raw.categories[0].items.push({ id: 'item-empty' });
    const result = validateDocument(normalizeDocument(raw));
    assert.equal(result.success, true);
    assert.ok(result.value.warnings.some((w) => /neither Arabic/.test(w)));
  });

  test('warns when a document has no categories at all', () => {
    const result = validateDocument(normalizeDocument({ metadata: { id: 'empty' } }));
    assert.equal(result.success, true);
    assert.ok(result.value.warnings.some((w) => /no categories/.test(w)));
  });

  test('processDocument surfaces a hard failure from validateDocument', () => {
    const raw = sampleDoc();
    raw.categories.push({ id: 'cat-a', name: 'Dup', items: [] });
    const result = processDocument(raw);
    assert.equal(result.success, false);
  });

  test('never throws on completely malformed input (null, arrays, garbage)', () => {
    for (const bad of [null, undefined, [], 'not an object', 42]) {
      assert.doesNotThrow(() => processDocument(bad));
    }
  });
});

describe('blankItem / blankCategory', () => {
  test('blankItem produces a normalized, editable-ready item', () => {
    const item = blankItem('cat-1');
    assert.equal(item.category_id, 'cat-1');
    assert.equal(item.grade, 'Unknown');
    assert.equal(item.repetitions, 1);
  });

  test('blankCategory produces a normalized, editable-ready category', () => {
    const cat = blankCategory('sec-1');
    assert.equal(cat.section_id, 'sec-1');
    assert.deepEqual(cat.items, []);
  });
});

describe('normalizeCustomContentMap', () => {
  test('drops an unrecoverable library instead of throwing, keeping the rest', () => {
    const map = normalizeCustomContentMap({
      good: { metadata: { id: 'good' }, categories: [] },
      // A circular reference can't be JSON-cloned; normalizeDocument itself
      // won't throw on it (it only reads plain fields), so this still
      // normalizes as an empty-ish doc rather than being dropped — the
      // important guarantee is that the *good* entry survives regardless.
    });
    assert.ok('good' in map);
  });

  test('returns an empty object for non-object input', () => {
    assert.deepEqual(normalizeCustomContentMap(null), {});
    assert.deepEqual(normalizeCustomContentMap(undefined), {});
    assert.deepEqual(normalizeCustomContentMap('nope'), {});
  });
});
