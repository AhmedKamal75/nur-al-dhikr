/**
 * tests/onboarding.test.js — first-run panel logic (pure module)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReturningUser,
  buildOnboardingSteps,
  onboardingComplete,
  shouldShowOnboarding,
} from '../js/domain/onboarding.js';

function baseState(overrides = {}) {
  return {
    settings: { prayer: { latitude: null, longitude: null } },
    onboarding: { dismissed: false, settingsVisited: false },
    statistics: { totalRecitations: 0 },
    ...overrides,
  };
}

test('isReturningUser: false for empty/payload-less states', () => {
  assert.equal(isReturningUser(null), false);
  assert.equal(isReturningUser({}), false);
  assert.equal(isReturningUser({ statistics: { totalRecitations: 0 }, favorites: [] }), false);
});

test('isReturningUser: true for anyone with real progress', () => {
  assert.equal(isReturningUser({ statistics: { totalRecitations: 3 } }), true);
  assert.equal(isReturningUser({ favorites: ['a'] }), true);
  assert.equal(isReturningUser({ history: [{ itemId: 'x' }] }), true);
  assert.equal(isReturningUser({ collections: [{ id: 'c' }] }), true);
});

test('buildOnboardingSteps: all four steps start undone for a fresh user', () => {
  const steps = buildOnboardingSteps(baseState());
  assert.deepEqual(
    steps.map((s) => s.id),
    ['location', 'appearance', 'install', 'firstReading']
  );
  assert.deepEqual(
    steps.map((s) => s.done),
    [false, false, false, false]
  );
});

test('buildOnboardingSteps: each completion signal flips exactly its own step', () => {
  const located = buildOnboardingSteps(
    baseState({ settings: { prayer: { latitude: 30.04, longitude: 31.24 } } })
  );
  assert.deepEqual(
    located.map((s) => s.done),
    [true, false, false, false]
  );

  const visited = buildOnboardingSteps(
    baseState({ onboarding: { dismissed: false, settingsVisited: true } })
  );
  assert.deepEqual(
    visited.map((s) => s.done),
    [false, true, false, false]
  );

  const installed = buildOnboardingSteps(baseState(), { appInstalled: true });
  assert.deepEqual(
    installed.map((s) => s.done),
    [false, false, true, false]
  );

  const read = buildOnboardingSteps(baseState({ statistics: { totalRecitations: 1 } }));
  assert.deepEqual(
    read.map((s) => s.done),
    [false, false, false, true]
  );
});

test('buildOnboardingSteps: junk coordinates do not complete the location step', () => {
  const junk = buildOnboardingSteps(
    baseState({ settings: { prayer: { latitude: 'x', longitude: null } } })
  );
  assert.equal(junk[0].done, false);
});

test('onboardingComplete: only when every step is done', () => {
  const all = buildOnboardingSteps(
    baseState({
      settings: { prayer: { latitude: 1, longitude: 2 } },
      onboarding: { dismissed: false, settingsVisited: true },
      statistics: { totalRecitations: 5 },
    }),
    { appInstalled: true }
  );
  assert.equal(onboardingComplete(all), true);
  // Same state, but the app is not installed yet → one undone step is enough.
  const notInstalled = buildOnboardingSteps(
    baseState({
      settings: { prayer: { latitude: 1, longitude: 2 } },
      onboarding: { dismissed: false, settingsVisited: true },
      statistics: { totalRecitations: 5 },
    }),
    { appInstalled: false }
  );
  assert.equal(onboardingComplete(notInstalled), false);
});

test('shouldShowOnboarding: hides when dismissed, when complete, shows otherwise', () => {
  assert.equal(shouldShowOnboarding(baseState()), true);
  assert.equal(
    shouldShowOnboarding(baseState({ onboarding: { dismissed: true, settingsVisited: false } })),
    false
  );
  const doneState = baseState({
    settings: { prayer: { latitude: 1, longitude: 2 } },
    onboarding: { dismissed: false, settingsVisited: true },
    statistics: { totalRecitations: 5 },
  });
  assert.equal(shouldShowOnboarding(doneState, { appInstalled: true }), false);
  assert.equal(shouldShowOnboarding(doneState, { appInstalled: false }), true); // install still pending
});
