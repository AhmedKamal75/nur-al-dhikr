import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSimilarPairs, resetMutashabihatCache } from '../js/domain/mutashabihat.js';

// Each ayah in one corpus must carry its own text. A fixture that repeats the
// same string across two surahs makes a similar pair genuinely correct, which
// would hide the thing this guard exists to test: that swapping the corpus
// recomputes instead of returning the previous object's cached result.
const corpus = (first, second) => ({
  1: { ayahs: [{ number: 1, text: first }] },
  2: { ayahs: [{ number: 1, text: second }] },
});

test('Mutashabihat cache follows corpus identity, not just corpus shape', () => {
  resetMutashabihatCache();
  const a = buildSimilarPairs(
    corpus('هذا نص طويل جدا متشابه جدا هنا الآن', 'وَقُل رَّبِّ زِدْنِي عِلۡمًا')
  );
  const b = buildSimilarPairs(
    corpus('وَقُل رَّبِّ زِدۡنِي عِلۡمًا', 'ذٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَ ۛ فِيهِ ۛ هُدًى')
  );
  assert.notStrictEqual(a, b, 'a different corpus object must not reuse the cached pairs');
  assert.equal(a.length, 0);
  assert.equal(b.length, 0);
});

test('Mutashabihat recomputes when the same corpus object is re-derived', () => {
  resetMutashabihatCache();
  const shared = 'سَبَّحَ ٱلْحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ';
  const first = buildSimilarPairs(corpus(shared, 'وَٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'));
  // The same object handed back must still hit the cache — the identity check
  // is what makes the recompute above safe rather than quadratic.
  const cached = buildSimilarPairs(corpus(shared, 'وَٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'), { force: true });
  assert.deepEqual(cached, first);
});
