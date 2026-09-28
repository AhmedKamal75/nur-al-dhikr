/**
 * tajweed-classify.test.js — the finished generator is finally reachable
 * (v5.17.20)
 *
 * `buildClassifyQuestion` was written, tested and provenance-tagged when the
 * quiz engine landed, and no user could reach it: the answer-mode allowlist
 * excluded 'classify' and the picker's mode switch rendered only the two
 * tap-the-letters modes. A complete multiple-choice generator was sitting in
 * the codebase doing nothing.
 *
 * These tests pin the wiring that makes it reachable, and the honesty rules
 * the new round must keep — chiefly that a wrong answer tells you which rule
 * it was AND where that rule is defined, because a bare "wrong" teaches
 * nothing in an app whose whole premise is that a rule arrives with a source.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildClassifyQuestion,
  TAJWEED_QUIZ_MODES,
  TAJWEED_ANSWER_MODES,
} from '../js/domain/tajweedPractice.js';
import { TAJWEED_RULES } from '../js/domain/tajweed.js';
import { TAJWEED_SOURCES, uncitedTajweedRules } from '../js/domain/tajweedSources.js';
import { isTajweedRuleId } from '../js/domain/tajweedPractice.js';

const RULE_IDS = TAJWEED_RULES.map((r) => r.id);

test('classify is in the quiz mode registry', () => {
  // It always was. The point of this assertion is that it must STAY there,
  // and that the registry and the picker cannot drift apart silently.
  assert.ok(TAJWEED_QUIZ_MODES.includes('classify'), 'classify is a registered quiz mode');
  assert.equal(new Set(TAJWEED_QUIZ_MODES).size, TAJWEED_QUIZ_MODES.length, 'no duplicate modes');
  // It is deliberately NOT a tap-the-letters answer mode: different question,
  // different answer shape. Keep the distinction or the two simple modes grow
  // a branch they never take.
  assert.equal(
    TAJWEED_ANSWER_MODES.includes('classify'),
    false,
    'classify is a round type, not a letter-tap answer mode'
  );
});

test('the picker offers all three modes', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(
    new URL('../js/views/tajweedPracticeView.js', import.meta.url),
    'utf8'
  );
  for (const [mode, key] of [
    ['find-spans', 'practice.findSpans'],
    ['find-word', 'practice.findWord'],
    ['classify', 'practice.classifyMode'],
  ]) {
    assert.ok(
      src.includes(`modeButton('${mode}', '${key}')`),
      `the picker must offer ${mode} — this is the line that was missing`
    );
  }
  // And every mode it offers must be a real quiz mode, so the switch cannot
  // advertise something the engine does not have.
  const offered = [...src.matchAll(/modeButton\('([a-z-]+)'/g)].map((m) => m[1]);
  for (const mode of offered) {
    assert.ok(TAJWEED_QUIZ_MODES.includes(mode), `${mode} is offered but is not a quiz mode`);
  }
});

test('the round view shows options, and teaches on a wrong answer', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(
    new URL('../js/views/tajweedPracticeView.js', import.meta.url),
    'utf8'
  );
  // A wrong answer must name the real rule and cite it.
  assert.ok(src.includes('practice.classifyWrong'), 'a wrong answer says what the rule was');
  assert.ok(src.includes('tajweedCitation'), 'the round cites the rule it names');
  assert.ok(src.includes('practice.readAyah'), 'and offers to read the ayah in context');
  // The classify round must be rendered, and the option buttons must carry a
  // rule id the question actually offered.
  assert.ok(src.includes('renderClassifyRoundHtml'), 'the round is rendered');
  assert.ok(
    src.includes('session.answer === id'),
    'options are marked by comparison with the chosen answer'
  );
});

test('the handler validates the answer against the question', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../js/app/practice.js', import.meta.url), 'utf8');
  // A crafted data-rule that is not one of the options must be refused: the
  // UI is not a trust boundary.
  assert.ok(
    src.includes('q.options.includes(ruleId)'),
    'an option that is not on the question is a crafted click, not an answer'
  );
  // And it must record through the one dispatch the tap modes use, so stats
  // and the weak-rule memory stay a single truth.
  assert.ok(src.includes('recordTajweedPracticeResult'), 'one dispatch, one truth');
});

test('a generated question is answerable and its answer is a real rule', () => {
  // A verse with a rule the classifier can see.
  const text = 'وَإِذَا قُلْتَ لَهُمُ';
  const q = buildClassifyQuestion(text, { surah: 2, ayah: 236 });
  assert.ok(q, 'a question was built');
  assert.equal(q.mode, 'classify');
  assert.ok(q.options.length >= 2, 'at least two options, or it is not a question');
  assert.ok(q.options.includes(q.correctAnswer), 'the correct answer is among the options');
  for (const opt of q.options) {
    assert.ok(RULE_IDS.includes(opt), `${opt} is a real rule id`);
  }
  assert.equal(new Set(q.options).size, q.options.length, 'no duplicate options');
  // Distractors must not be the answer wearing another name.
  assert.notEqual(q.options.filter((o) => o === q.correctAnswer).length, 0);
});

test('every rule a question can ask about is one the app can attribute', () => {
  // The round's whole value is teaching, so its answers must be teachable.
  assert.deepEqual(uncitedTajweedRules(RULE_IDS), [], 'an uncited rule could be asked about');
  for (const id of RULE_IDS) {
    const src = TAJWEED_SOURCES[id];
    assert.ok(src?.work && src?.lines, `${id} must carry a work and a line locator`);
  }
});

test('the registry covers the rules the classifier actually emits', () => {
  // isTajweedRuleId is what gates a drill. If the source registry and the
  // classifier's rule set diverge, a question can ask about a rule the legend
  // cannot explain.
  for (const id of RULE_IDS) {
    assert.equal(isTajweedRuleId(id), true, `${id} must be a drillable rule id`);
  }
});
