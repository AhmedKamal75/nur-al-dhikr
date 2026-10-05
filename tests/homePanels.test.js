/**
 * tests/homePanels.test.js — home panel order + visibility: pure resolve/
 * move helpers and the settings sanitizer boundary.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_PANEL_IDS,
  HOME_DEFAULT_VISIBLE,
  HOME_PRIMARY_PANEL_IDS,
  HOME_HIGHLIGHT_PANEL_IDS,
  resolveHomePanels,
  moveHomePanel,
  defaultHiddenHome,
} from '../js/domain/homePanels.js';
import { sanitizeSettings } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';

describe('resolveHomePanels', () => {
  test('daily core is fixed; optional panels appear only when explicitly ordered', () => {
    const out = resolveHomePanels(['collections', 'hifz', 'verse'], {});
    assert.deepEqual(out.slice(0, HOME_PRIMARY_PANEL_IDS.length), [...HOME_PRIMARY_PANEL_IDS]);
    assert.ok(out.includes('collections'));
    assert.ok(out.includes('verse'));
    assert.ok(out.indexOf('collections') > out.indexOf('progress'));
  });

  test('hides respected while stale ids are ignored', () => {
    const out = resolveHomePanels(null, { verse: true, nope: true });
    assert.ok(!out.includes('verse'));
    assert.ok(out.includes('continue'));
    assert.ok(out.includes('progress'));
    assert.ok(!out.includes('nope'));
  });

  test('saved order cannot lift reflection above the daily core', () => {
    const out = resolveHomePanels(['verse', 'continue', 'hifz'], {});
    assert.ok(out.indexOf('continue') < out.indexOf('verse'));
    assert.ok(out.indexOf('progress') < out.indexOf('verse'));
  });

  test('invalid order falls back to the daily core only', () => {
    const out = resolveHomePanels('junk', null);
    assert.deepEqual(out, [...HOME_PRIMARY_PANEL_IDS]);
  });
});

describe('moveHomePanel', () => {
  test('moves within (or from) the book order, clamps at edges', () => {
    assert.deepEqual(moveHomePanel(null, 'verse', -1)[3], 'verse', 'moves up one');
    const top = moveHomePanel(null, 'ramadan', -1);
    assert.equal(top[0], 'ramadan', 'stays at the top');
    const bottom = moveHomePanel(null, 'collections', 1);
    assert.equal(bottom.at(-1), 'collections', 'stays at the bottom');
    assert.deepEqual(moveHomePanel(null, 'nope', 1).length, HOME_PANEL_IDS.length, 'junk ignored');
  });
});

describe('sanitizer', () => {
  test('keeps known ids, dedupes, drops hostile', () => {
    const s = sanitizeSettings({
      homeOrder: ['hifz', 'hifz', 'nope', 42],
      hiddenHome: { verse: true, nope: true, verse2: 'x' },
    });
    assert.deepEqual(s.homeOrder, ['hifz']);
    assert.deepEqual(s.hiddenHome, { verse: true });
    assert.equal(sanitizeSettings({}).homeOrder, null);
  });

  test('stored hides survive verbatim (existing users keep their Home)', () => {
    assert.deepEqual(sanitizeSettings({ hiddenHome: {} }).hiddenHome, {});
    assert.deepEqual(sanitizeSettings({ hiddenHome: { worship: true } }).hiddenHome, {
      worship: true,
    });
  });
});

describe('UX-1 fresh-install density cap', () => {
  test('default set is next-action + progress + two highlights (+conditional ramadan)', () => {
    // (v5.6.0, B-1) 'review' joins the defaults: it renders nothing
    // until something is actually due, so the density cap holds while
    // the nudge is there the first morning anything lapses.
    assert.deepEqual([...HOME_DEFAULT_VISIBLE], ['continue', 'progress']);
    const hidden = defaultHiddenHome();
    assert.deepEqual(
      Object.keys(hidden).sort(),
      [...HOME_PANEL_IDS].filter((id) => !HOME_DEFAULT_VISIBLE.includes(id)).sort()
    );
    assert.deepEqual(resolveHomePanels(null, hidden), [...HOME_DEFAULT_VISIBLE]);
  });

  test('fresh initial state carries the cap; opting in is one delete', () => {
    const { hiddenHome } = initialState().settings;
    assert.deepEqual(resolveHomePanels(null, hiddenHome), [...HOME_DEFAULT_VISIBLE]);
    // Settings toggle path: enabling worship removes its flag.
    const opted = { ...hiddenHome };
    delete opted.worship;
    assert.deepEqual(resolveHomePanels(null, opted), [...HOME_DEFAULT_VISIBLE]);
    const explicit = resolveHomePanels(['worship'], opted);
    assert.ok(explicit.includes('worship'));
  });
});

describe('(v5.6.0, B-1) review-due digest panel', () => {
  test('silent until anything is due; links per memory, counts in the ledger', async () => {
    const { reviewDigestCardHTML } = await import('../js/views/home.js');
    const base = {
      settings: { language: 'en' },
      hifzRecords: {},
      hifzAyahRecords: {},
      quizMissRecords: {},
      tajweedMissRecords: {},
    };
    assert.equal(reviewDigestCardHTML(base), '', 'nothing due renders nothing');
    const due = {
      ...base,
      hifzRecords: { 2: { level: 1, due: '2020-01-01' } },
      quizMissRecords: { alim: { m: 2, l: '2026-09-01' } },
      tajweedMissRecords: { ghunnah: { m: 1, l: '2026-09-01' } },
    };
    const html = reviewDigestCardHTML(due);
    assert.match(html, /Available review/, 'gentle title renders');
    // (v5.17.57, merged-plan item 10) Home carries no totals: no badge,
    // no per-row counts — the ledger (Statistics) keeps them, linked below.
    assert.doesNotMatch(html, /streak-badge/, 'no total badge on Home');
    assert.doesNotMatch(html, /chip__count/, 'no per-row counts on Home');
    assert.match(html, /data-view="statistics"/, 'the ledger door is linked');
    // Hifz row deep-links into memorize mode for the first due surah.
    assert.match(html, /mem/, 'hifz row links to memorize mode');
    // Quiz row links to the quiz view (which owns its review flow).
    assert.match(html, /data-view="quiz"/, 'quiz row links to the quiz view');
    // Tajweed row fires the global review round straight from Home.
    assert.match(html, /data-action="practice-start" data-rule="review"/, 'tajweed review wired');
    // Hostile maps degrade to silence, never throw.
    assert.equal(
      reviewDigestCardHTML({ settings: { language: 'en' } }),
      '',
      'missing maps render nothing'
    );
  });

  test('digest renders in Arabic', async () => {
    const { reviewDigestCardHTML } = await import('../js/views/home.js');
    const html = reviewDigestCardHTML({
      settings: { language: 'ar' },
      hifzRecords: {},
      hifzAyahRecords: {},
      quizMissRecords: {},
      tajweedMissRecords: { ghunnah: { m: 1, l: '2026-09-01' } },
    });
    assert.match(html, /مراجعة متاحة/, 'AR gentle title renders');
    assert.match(html, /مراجعة الأخطاء/, 'AR review action renders');
  });
});
