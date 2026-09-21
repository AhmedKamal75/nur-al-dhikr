/**
 * tests/onboarding.test.js — first-run wizard logic (pure module, v5.2.52:
 * six steppedWizard steps; appearance checklist retired)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReturningUser,
  buildOnboardingSteps,
  onboardingComplete,
  shouldShowOnboarding,
  wizardStepIndex,
  WIZARD_STEP_IDS,
  CONFIRM_STEPS,
} from '../js/domain/onboarding.js';

function baseState(overrides = {}) {
  return {
    settings: { prayer: { latitude: null, longitude: null } },
    onboarding: { dismissed: false, settingsVisited: false, stepsSeen: {} },
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

test('buildOnboardingSteps: all eight steps start undone for a fresh user', () => {
  const steps = buildOnboardingSteps(baseState());
  assert.deepEqual(
    steps.map((s) => s.id),
    [
      'language',
      'comfort',
      'location',
      'notifications',
      'prayer',
      'goals',
      'install',
      'firstReading',
    ]
  );
  assert.deepEqual(
    steps.map((s) => s.done),
    [false, false, false, false, false, false, false, false]
  );
  assert.deepEqual(
    WIZARD_STEP_IDS,
    steps.map((s) => s.id)
  );
  assert.deepEqual(CONFIRM_STEPS, ['language', 'comfort', 'prayer', 'goals']);
});

test('buildOnboardingSteps: each completion signal flips exactly its own step', () => {
  const located = buildOnboardingSteps(
    baseState({ settings: { prayer: { latitude: 30.04, longitude: 31.24 } } })
  );
  assert.deepEqual(
    located.map((s) => s.done),
    [false, false, true, false, false, false, false, false]
  );

  const notified = buildOnboardingSteps(baseState(), { notificationsGranted: true });
  assert.deepEqual(
    notified.map((s) => s.done),
    [false, false, false, true, false, false, false, false]
  );

  const setUp = buildOnboardingSteps(
    baseState({
      onboarding: {
        dismissed: false,
        stepsSeen: { language: true, comfort: true, prayer: true, goals: true },
      },
    })
  );
  assert.deepEqual(
    setUp.map((s) => s.done),
    [true, true, false, false, true, true, false, false]
  );

  const installed = buildOnboardingSteps(baseState(), { appInstalled: true });
  assert.deepEqual(
    installed.map((s) => s.done),
    [false, false, false, false, false, false, true, false]
  );

  const read = buildOnboardingSteps(baseState({ statistics: { totalRecitations: 1 } }));
  assert.deepEqual(
    read.map((s) => s.done),
    [false, false, false, false, false, false, false, true]
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
      onboarding: {
        dismissed: false,
        stepsSeen: { language: true, comfort: true, prayer: true, goals: true },
      },
      statistics: { totalRecitations: 5 },
    }),
    { appInstalled: true, notificationsGranted: true }
  );
  assert.equal(onboardingComplete(all), true);
  // Same state, but the app is not installed yet → one undone step is enough.
  const notInstalled = buildOnboardingSteps(
    baseState({
      settings: { prayer: { latitude: 1, longitude: 2 } },
      onboarding: {
        dismissed: false,
        stepsSeen: { language: true, comfort: true, prayer: true, goals: true },
      },
      statistics: { totalRecitations: 5 },
    }),
    { appInstalled: false, notificationsGranted: true }
  );
  assert.equal(onboardingComplete(notInstalled), false);
});

test('shouldShowOnboarding: hides when dismissed, when complete, shows otherwise', () => {
  assert.equal(shouldShowOnboarding(baseState()), true);
  assert.equal(shouldShowOnboarding(baseState({ onboarding: { dismissed: true } })), false);
  const doneState = baseState({
    settings: { prayer: { latitude: 1, longitude: 2 } },
    onboarding: {
      dismissed: false,
      stepsSeen: { language: true, comfort: true, prayer: true, goals: true },
    },
    statistics: { totalRecitations: 5 },
  });
  assert.equal(
    shouldShowOnboarding(doneState, { appInstalled: true, notificationsGranted: true }),
    false
  );
  assert.equal(
    shouldShowOnboarding(doneState, { appInstalled: false, notificationsGranted: true }),
    true
  ); // install still pending
});

test('wizardStepIndex: override wins, else first incomplete', () => {
  const steps = [
    { id: 'a', done: true },
    { id: 'b', done: false },
    { id: 'c', done: false },
  ];
  assert.equal(wizardStepIndex(steps, null), 1);
  assert.equal(wizardStepIndex(steps, 2), 2);
  assert.equal(wizardStepIndex(steps, 0), 0, 'Back revisits done steps');
  assert.equal(wizardStepIndex(steps, 9), 1, 'out-of-range override ignored');
  assert.equal(wizardStepIndex(steps, 'x'), 1, 'hostile override ignored');
  assert.equal(
    wizardStepIndex(
      steps.map((s) => ({ ...s, done: true })),
      null
    ),
    2,
    'all done lands on the last step'
  );
  assert.equal(wizardStepIndex([], null), 0);
});
