/**
 * tests/appBadge.test.js — item 1 (App-badge API) gates:
 *  1. badgeCountFor is pure and honest (remaining prayers → streak-at-risk
 *     → cleared), degrading to the full five on hostile state;
 *  2. the at-risk branch shares the engine's streak-day rule (goal-aware —
 *     a sub-goal today does NOT secure the streak);
 *  3. sync/clear/refresh never throw and report unsupported where the
 *     Badging API is missing (Node has no navigator);
 *  4. refreshAppBadge is change-deduped (no platform churn per dispatch);
 *  5. the module is precached (APP_SHELL) and wired at boot + on change.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { dateKey } from '../js/core/utils.js';
import { coerceGoal, isStreakDay } from '../js/core/state/streak.js';
import {
  badgeCountFor,
  clearAppBadge,
  refreshAppBadge,
  syncAppBadge,
  _resetAppBadgeForTests,
} from '../js/services/appBadge.js';

const DAY = new Date(2026, 4, 10, 12, 0, 0); // local noon: dateKey-stable in any TZ
const TODAY = dateKey(DAY);
const YESTERDAY = dateKey(new Date(2026, 4, 9, 12, 0, 0));

const ALL_PRAYED = {
  fajr: 'prayed',
  dhuhr: 'prayed',
  asr: 'prayed',
  maghrib: 'prayed',
  isha: 'jamaah',
};

function stateWith({ checklist = {}, history = {}, settings = {} } = {}) {
  return { dailyChecklist: checklist, settings, statistics: { dailyHistory: history } };
}

/** Recording fake navigator with the Badging API surface. */
function fakeNav() {
  return {
    calls: [],
    async setAppBadge(n) {
      this.calls.push(['set', n]);
    },
    async clearAppBadge() {
      this.calls.push(['clear']);
    },
  };
}

describe('badgeCountFor: remaining prayers first', () => {
  test('empty or hostile state reads as all five outstanding', () => {
    assert.equal(badgeCountFor(stateWith(), DAY), 5);
    assert.equal(badgeCountFor({}, DAY), 5);
    assert.equal(badgeCountFor(null, DAY), 5);
    assert.equal(badgeCountFor({ dailyChecklist: null, statistics: null }, DAY), 5);
  });

  test('partial prayer logs badge the remainder', () => {
    assert.equal(
      badgeCountFor(stateWith({ checklist: { [TODAY]: { fajr: 'prayed', maghrib: true } } }), DAY),
      3
    );
    assert.equal(
      badgeCountFor(stateWith({ checklist: { [TODAY]: { ...ALL_PRAYED, isha: null } } }), DAY),
      1
    );
  });

  test('yesterday’s log never leaks into today’s count', () => {
    assert.equal(badgeCountFor(stateWith({ checklist: { [YESTERDAY]: ALL_PRAYED } }), DAY), 5);
  });
});

describe('badgeCountFor: streak-at-risk, then clear', () => {
  test('prayers done + today active → cleared', () => {
    const s = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [TODAY]: { recitations: 33, sessions: 1, itemIds: ['x'] } },
    });
    assert.equal(badgeCountFor(s, DAY), null);
  });

  test('prayers done + today idle + yesterday active → 1 (streak dies at midnight)', () => {
    const s = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [YESTERDAY]: { recitations: 10 } },
    });
    assert.equal(badgeCountFor(s, DAY), 1);
  });

  test('prayers done + both days idle → cleared (no live streak to protect)', () => {
    const s = stateWith({ checklist: { [TODAY]: ALL_PRAYED }, history: {} });
    assert.equal(badgeCountFor(s, DAY), null);
  });

  test('a present-but-idle today entry does NOT secure the streak', () => {
    const s = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: {
        [TODAY]: { recitations: 0, sessions: 0, itemIds: [] },
        [YESTERDAY]: { pages: 2 },
      },
    });
    assert.equal(badgeCountFor(s, DAY), 1);
  });

  test('Qur’an pages / reading seconds count as today activity', () => {
    const pages = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [TODAY]: { pages: 1 }, [YESTERDAY]: { recitations: 5 } },
    });
    assert.equal(badgeCountFor(pages, DAY), null);
    const seconds = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [TODAY]: { readingSec: 120 }, [YESTERDAY]: { recitations: 5 } },
    });
    assert.equal(badgeCountFor(seconds, DAY), null);
  });

  test('a hostile today argument falls back to now without throwing', () => {
    assert.doesNotThrow(() => badgeCountFor(stateWith(), 'not-a-date'));
    assert.doesNotThrow(() => badgeCountFor(stateWith(), null));
  });

  test('sub-goal effort does NOT secure the streak (goal-aware)', () => {
    const settings = { dailyGoal: 100 };
    const atRisk = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [TODAY]: { recitations: 30 }, [YESTERDAY]: { recitations: 100 } },
      settings,
    });
    assert.equal(badgeCountFor(atRisk, DAY), 1);
    const secured = stateWith({
      checklist: { [TODAY]: ALL_PRAYED },
      history: { [TODAY]: { recitations: 100 }, [YESTERDAY]: { recitations: 100 } },
      settings,
    });
    assert.equal(badgeCountFor(secured, DAY), null);
  });
});

describe('isStreakDay (shared engine rule): goal-aware activity', () => {
  test('zeros, empties and hostile shapes are idle', () => {
    assert.equal(isStreakDay(null), false);
    assert.equal(isStreakDay({}), false);
    assert.equal(isStreakDay({ recitations: 0, sessions: 0, itemIds: [] }), false);
    assert.equal(isStreakDay({ recitations: 'x', pages: -2 }), false);
    assert.equal(isStreakDay([]), false);
    assert.equal(isStreakDay('2026-05-10'), false);
  });

  test('goal met, or Qur’an activity regardless of goal', () => {
    assert.equal(isStreakDay({ recitations: 1 }), true);
    assert.equal(isStreakDay({ recitations: 30 }, 100), false);
    assert.equal(isStreakDay({ recitations: 100 }, 100), true);
    assert.equal(isStreakDay({ pages: 3 }, 100), true);
    assert.equal(isStreakDay({ readingSec: 45 }, 100), true);
  });

  test('hostile goals coerce to 1 (any activity)', () => {
    assert.equal(isStreakDay({ recitations: 1 }, 0), true);
    assert.equal(isStreakDay({ recitations: 1 }, -5), true);
    assert.equal(isStreakDay({ recitations: 1 }, 'x'), true);
    assert.equal(coerceGoal(undefined), 1);
  });
});

describe('platform sync: guarded, never throws', () => {
  test('set and clear paths drive the fake API', async () => {
    const nav = fakeNav();
    assert.equal(await syncAppBadge(3, nav), 'set');
    assert.deepEqual(nav.calls, [['set', 3]]);
    assert.equal(await syncAppBadge(null, nav), 'cleared');
    assert.equal(await syncAppBadge(0, nav), 'cleared');
    assert.deepEqual(nav.calls.slice(1), [['clear'], ['clear']]);
    assert.equal(await clearAppBadge(nav), 'cleared');
  });

  test('missing or throwing APIs report unsupported instead of throwing', async () => {
    assert.equal(await syncAppBadge(3, {}), 'unsupported');
    assert.equal(await syncAppBadge(3, null), 'unsupported');
    // Node has no navigator: the real default path is a silent no-op.
    assert.equal(await syncAppBadge(3), 'unsupported');
    assert.equal(await clearAppBadge(), 'unsupported');
    const hostile = {
      async setAppBadge() {
        throw new Error('denied');
      },
      async clearAppBadge() {
        throw new Error('denied');
      },
    };
    assert.equal(await syncAppBadge(2, hostile), 'unsupported');
    assert.equal(await syncAppBadge(null, hostile), 'unsupported');
  });
});

describe('refreshAppBadge: change-deduped', () => {
  test('an unchanged count skips the platform call', async () => {
    _resetAppBadgeForTests();
    const nav = fakeNav();
    const getState = () => stateWith();
    assert.equal(await refreshAppBadge(getState, nav, DAY), 'set');
    assert.equal(nav.calls.length, 1);
    assert.equal(await refreshAppBadge(getState, nav, DAY), 'unchanged');
    assert.equal(nav.calls.length, 1);
    // A moved count applies again (5 → 4 after Fajr is logged).
    const prayed = () => stateWith({ checklist: { [TODAY]: { fajr: 'prayed' } } });
    const out = await refreshAppBadge(prayed, nav, DAY);
    assert.equal(out, 'set');
    assert.deepEqual(nav.calls[1], ['set', 4]);
    _resetAppBadgeForTests();
  });

  test('the first refresh after boot applies even when the badge clears', async () => {
    _resetAppBadgeForTests();
    const nav = fakeNav();
    const done = () =>
      stateWith({
        checklist: { [TODAY]: ALL_PRAYED },
        history: { [TODAY]: { recitations: 7 } },
      });
    assert.equal(await refreshAppBadge(done, nav, DAY), 'cleared');
    assert.deepEqual(nav.calls, [['clear']]);
    _resetAppBadgeForTests();
  });
});

describe('appBadge wiring: precached and called', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const boot = readFileSync(new URL('../js/app/boot.js', import.meta.url), 'utf8');
  const sub = readFileSync(new URL('../js/app/stateSub.js', import.meta.url), 'utf8');

  test('the module is in the SW precache shell', () => {
    assert.ok(/'js\/services\/appBadge\.js'/.test(sw), 'APP_SHELL missing appBadge.js');
  });

  test('boot clears the stale badge on open and syncs the fresh count', () => {
    assert.ok(boot.includes('clearAppBadge()'), 'boot must clear the badge on open');
    assert.ok(
      boot.includes('refreshAppBadge(() => store.getState())'),
      'boot must sync the fresh count'
    );
  });

  test('every state change re-syncs through the single subscriber', () => {
    assert.ok(
      sub.includes('refreshAppBadge(() => store.getState())'),
      'stateSub must refresh the badge'
    );
  });
});
