/**
 * tajweed-quiz-modes.test.js — (TAJ-QUIZ-01) unified quiz modes on the
 * existing classifier engine (no second quiz system).
 *
 * Modes: find-spans (existing) / find-word / classify / review.
 * Every classify question carries rule id, source ayah, correct answer,
 * distractor provenance, explanation, review status — and is never built
 * from an unsourced rule definition.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TAJWEED_QUIZ_MODES,
  buildAnswerKey,
  buildWordAnswerKey,
  scoreWordRound,
  buildClassifyQuestion,
  pickRoundEntries,
} from '../js/domain/tajweedPractice.js';
import { classifyAyahTajweed, TAJWEED_RULES } from '../js/domain/tajweed.js';

describe('TAJ-QUIZ-01 quiz modes', () => {
  test('mode registry covers the four required modes', () => {
    for (const m of ['find-spans', 'find-word', 'classify', 'review']) {
      assert.ok(TAJWEED_QUIZ_MODES.includes(m), `missing mode ${m}`);
    }
  });

  test('find-word key agrees with the classifier spans', () => {
    const text = 'مِن شَرِّ مَا خَلَقَ';
    const perWord = classifyAyahTajweed(text);
    const ruleWithHit = perWord.flatMap((w) => w.spans.map((s) => s.rule)).find(Boolean);
    assert.ok(ruleWithHit, 'fixture ayah must carry at least one marked rule');
    const words = buildWordAnswerKey(text, ruleWithHit);
    assert.ok(words.length > 0);
    // Every word in the key really carries the rule.
    for (const w of words) {
      const spans = perWord.find((x) => x.wordIndex === w)?.spans || [];
      assert.ok(spans.some((s) => s.rule === ruleWithHit), `word ${w} must carry ${ruleWithHit}`);
    }
    const scored = scoreWordRound(words, words);
    assert.equal(scored.perfect, true);
    const wrong = scoreWordRound(words, [9999]);
    assert.equal(wrong.perfect, false);
    assert.ok(wrong.missed.length > 0);
  });

  test('classify question is fully sourced (no invented rules)', () => {
    const text = 'مِن شَرِّ مَا خَلَقَ';
    const q = buildClassifyQuestion(text, { surah: 113, ayah: 2, options: 4 });
    assert.ok(q, 'classify question builds from a real marked ayah');
    assert.equal(q.mode, 'classify');
    assert.ok(TAJWEED_RULES.some((r) => r.id === q.ruleId), 'answer is a sourced rule id');
    assert.ok(q.options.includes(q.correctAnswer), 'options contain the answer');
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, 'no duplicated options');
    for (const o of q.options) {
      assert.ok(TAJWEED_RULES.some((r) => r.id === o), `distractor ${o} must be a sourced rule id`);
    }
    assert.equal(q.distractorProvenance, 'tajweed-rule-index');
    assert.ok(q.explanation, 'explanation travels with the question');
    assert.equal(q.reviewStatus, 'CURATED');
    assert.deepEqual(q.sourceAyah, { s: 113, a: 2 });
    // Deterministic: same inputs, same options order.
    const q2 = buildClassifyQuestion(text, { surah: 113, ayah: 2, options: 4 });
    assert.deepEqual(q2.options, q.options);
  });

  test('classify refuses unmarked text (never guesses)', () => {
    assert.equal(buildClassifyQuestion('   ', {}), null);
  });

  test('review mode reuses the existing weak-rule pool path', () => {
    assert.ok(typeof pickRoundEntries === 'function');
    const pool = { byRule: {}, mixed: [] };
    assert.deepEqual(pickRoundEntries(pool, 'review', 5, null, []), []);
  });

  test('span key (find-spans) still agrees with the classifier', () => {
    const text = 'مِن شَرِّ مَا خَلَقَ';
    const key = buildAnswerKey(text, 'mixed');
    assert.ok(key.length > 0);
    for (const k of key) {
      assert.ok(TAJWEED_RULES.some((r) => r.id === k.rule), 'span rule is sourced');
    }
  });
});
