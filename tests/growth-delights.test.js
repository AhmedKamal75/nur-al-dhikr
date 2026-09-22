import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionFlag,
  setSessionFlag,
  sessionValue,
  setSessionValue,
  resetSessionFlagsForTests,
} from '../js/domain/sessionFlags.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { CHECKLIST_ITEMS } from '../js/core/config.js';
import { dateKey } from '../js/core/utils.js';
import { renderChecklist } from '../js/views/checklist.js';

describe('GROWTH-01 session flags (delights 2+3 plumbing)', () => {
  test('one-shot flags flip once and reset for tests', () => {
    resetSessionFlagsForTests();
    assert.equal(sessionFlag('continueResumed'), false);
    setSessionFlag('continueResumed');
    assert.equal(sessionFlag('continueResumed'), true);
    resetSessionFlagsForTests();
    assert.equal(sessionFlag('continueResumed'), false);
  });

  test('keyed values remember per-ayah study context with a cap', () => {
    resetSessionFlagsForTests();
    assert.equal(sessionValue('study-tab:2:255'), undefined);
    setSessionValue('study-tab:2:255', 'jalalayn', { cap: 2 });
    setSessionValue('study-tab:36:1', 'ibn-kathir', { cap: 2 });
    assert.equal(sessionValue('study-tab:2:255'), 'jalalayn');
    // Cap eviction: the oldest key drops, newest survive.
    setSessionValue('study-tab:112:1', 'saadi', { cap: 2 });
    assert.equal(sessionValue('study-tab:2:255'), undefined);
    assert.equal(sessionValue('study-tab:112:1'), 'saadi');
    resetSessionFlagsForTests();
  });
});

describe('GROWTH-01 delight 1 calm completion panel', () => {
  const stateFor = (doneIds, lang = 'en') => ({
    settings: { language: lang },
    dailyChecklist: {
      [dateKey(new Date())]: Object.fromEntries(doneIds.map((id) => [id, true])),
    },
  });
  const allIds = CHECKLIST_ITEMS.map((i) => i.id);

  test('full checklist renders the calm sentence + continue action, no reward loop', () => {
    const html = renderChecklist(stateFor(allIds));
    assert.ok(html.includes('Your daily portion is complete.'), 'calm sentence missing');
    assert.ok(html.includes('#/library'), 'continue-reading action missing');
    assert.ok(!html.includes('confetti') && !html.includes('streak-pressure'), 'no reward loop');
  });

  test('partial checklist renders no completion panel', () => {
    const html = renderChecklist(stateFor(allIds.slice(0, -1)));
    assert.ok(!html.includes('Your daily portion is complete.'));
  });

  test('Arabic full checklist renders the Arabic calm sentence', () => {
    const html = renderChecklist(stateFor(allIds, 'ar'));
    assert.ok(html.includes('اكتمل وردك اليومي'));
  });

  test('calm completion copy exists in both languages and differs', () => {
    assert.ok(en['checklist.completeCalm'], 'missing en checklist.completeCalm');
    assert.ok(ar['checklist.completeCalm'], 'missing ar checklist.completeCalm');
    assert.notEqual(en['checklist.completeCalm'], ar['checklist.completeCalm']);
    assert.equal(en['checklist.completeCalm'], 'Your daily portion is complete.');
    assert.equal(ar['checklist.completeCalm'], 'اكتمل وردك اليومي');
  });
});
