/**
 * tests/garden.test.js — v4.5.2, the Garden.
 * The growth computation (thresholds, spans, achievements) and the view
 * contract: positive framing, both languages, locale-aware numerals, and
 * a reachable route (APP-FLOW I1 — the nav owns the back path).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { gardenState, gardenAchievements, GARDEN_STAGES } from '../js/domain/garden.js';
import { renderGarden } from '../js/views/garden.js';
import { DEFAULT_SETTINGS, VIEWS } from '../js/core/config.js';

const viewState = (lang, totalRecitations) => ({
  settings: { ...DEFAULT_SETTINGS, language: lang },
  activeView: VIEWS.GARDEN,
  activeParams: {},
  statistics: {
    totalRecitations,
    totalSessions: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastActiveDate: null,
    dailyHistory: {},
    favoriteCategories: {},
  },
});

describe('gardenState — the growth computation', () => {
  test('zero recitations: the seed, nothing harvested', () => {
    const g = gardenState(0);
    assert.equal(g.stage.id, 'seed');
    assert.equal(g.next.id, 'sprout');
    assert.equal(g.toNext, 100);
    assert.equal(g.progress, 0);
    assert.deepEqual(gardenAchievements(0), []);
  });

  test('threshold boundaries land exactly on the stage', () => {
    assert.equal(gardenState(99).stage.id, 'seed');
    assert.equal(gardenState(100).stage.id, 'sprout');
    assert.equal(gardenState(500).stage.id, 'sapling');
    assert.equal(gardenState(2000).stage.id, 'youngTree');
    assert.equal(gardenState(8000).stage.id, 'tree');
    assert.equal(gardenState(25000).stage.id, 'grove');
  });

  test('progress spans the current-to-next interval', () => {
    // seed (0) -> sprout (100): at 50, halfway
    assert.equal(gardenState(50).progress, 0.5);
    // sprout (100) -> sapling (500): at 300, halfway
    assert.equal(gardenState(300).progress, 0.5);
  });

  test('the final form saturates: no next, progress 1, toNext null', () => {
    const g = gardenState(999999);
    assert.equal(g.stage.id, 'grove');
    assert.equal(g.next, null);
    assert.equal(g.toNext, null);
    assert.equal(g.progress, 1);
    assert.equal(gardenAchievements(999999).length, GARDEN_STAGES.length - 1);
  });

  test('hostile input never throws and degrades to the seed', () => {
    for (const junk of [null, undefined, NaN, -42, 'x', {}]) {
      const g = gardenState(junk);
      assert.equal(g.stage.id, 'seed');
      assert.equal(g.planted, 0);
    }
  });
});

describe('renderGarden — the view contract', () => {
  test('English: stage name, Western digits, positive framing, timeline', () => {
    const html = renderGarden(viewState('en', 152));
    assert.match(html, /garden-hero__stage">Sprout</);
    assert.match(html, /garden-hero__planted">\s*<strong dir="ltr">152<\/strong>/);
    // growing toward the next stage — never "missed" / countdown guilt
    assert.match(html, /Growing toward Sapling — 348 dhikr to go/);
    assert.match(html, /garden-timeline__node--current/);
    assert.match(html, /Young tree/); // timeline labels all present
  });

  test('Arabic: stage name, Eastern digits, the same shape', () => {
    const html = renderGarden(viewState('ar', 152));
    assert.match(html, /garden-hero__stage">برعم</);
    assert.match(html, /garden-hero__planted">\s*<strong dir="ltr">١٥٢<\/strong>/);
    // 152 planted: sprout (100) → sapling (500) span of 400 → 13%
    assert.match(html, /garden-hero__bar-fill" style="--fill:13%"/);
  });

  test('harvest chips appear only past the first milestone', () => {
    assert.ok(!renderGarden(viewState('en', 50)).includes('garden-harvest__title'));
    assert.ok(renderGarden(viewState('en', 100)).includes('garden-harvest__title'));
  });

  test('the final form has no progress bar — a closing line instead', () => {
    const html = renderGarden(viewState('en', 30000));
    assert.ok(!html.includes('garden-hero__bar"'));
    assert.match(html, /garden-hero__bar-caption">[^<]*full grove/i);
  });

  test('I1: the route stays reachable — link out to statistics, no dead end', () => {
    const html = renderGarden(viewState('en', 0));
    assert.match(html, /data-view="statistics"/);
    // the empty garden still shows a seed + welcome, never a deficit
    assert.match(html, /garden-hero__stage">Seed</);
  });
});
