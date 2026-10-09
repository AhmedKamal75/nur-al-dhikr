import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSimilarPairs, resetMutashabihatCache } from '../js/domain/mutashabihat.js';

const corpus = (text) => ({
  1: { ayahs: [{ number: 1, text }] },
  2: { ayahs: [{ number: 1, text }] },
});

test('Mutashabihat cache follows corpus identity, not just corpus shape', () => {
  resetMutashabihatCache();
  const first = corpus('هذا نص طويل جدا متشابه جدا هنا الآن');
  const second = corpus('ذلك نص مختلف تماما بلا تطابق مفيد بين النصوص');
  const a = buildSimilarPairs(first);
  const b = buildSimilarPairs(second);
  assert.notStrictEqual(a, b);
  assert.equal(b.length, 0);
});
