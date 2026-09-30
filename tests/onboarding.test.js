/**
 * tests/onboarding.test.js — first-run wizard logic (pure module, v5.17.48:
 * three decisions — language, location-or-offset, reciter — with the other
 * five legacy steps deferred to Settings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReturningUser,
  buildOnboardingSteps,
  onboardingComplete,
  shouldShowOnboarding,
  wizardStepIndex,
  resolveOnboardingStep,
  WIZARD_STEP_IDS,
  CONFIRM_STEPS,
  LEGACY_STEP_ORDER,
  LEGACY_CONFIRM_STEPS,
  DEFERRED_STEPS,
} from '../js/domain/onboarding.js';
import { VIEWS } from '../js/core/config.js';

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

test('the wizard is three decisions; legacy order keeps all eight ids', () => {
  assert.deepEqual(WIZARD_STEP_IDS, ['language', 'location', 'reciter']);
  assert.deepEqual(CONFIRM_STEPS, ['language', 'location', 'reciter']);
  assert.deepEqual(LEGACY_CONFIRM_STEPS, ['language', 'comfort', 'prayer', 'goals']);
  assert.deepEqual(LEGACY_STEP_ORDER, [
    'language',
    'comfort',
    'location',
    'notifications',
    'prayer',
    'goals',
    'install',
    'firstReading',
  ]);
});

test('deferred doors name real routes (mirrors VIEWS, js/core/config/views.js)', () => {
  const views = new Set(Object.values(VIEWS));
  assert.deepEqual(
    DEFERRED_STEPS.map((d) => d.id),
    ['comfort', 'notifications', 'prayer', 'goals', 'install', 'firstReading']
  );
  for (const d of DEFERRED_STEPS) {
    assert.ok(views.has(d.view), `deferred ${d.id} names a real view: ${d.view}`);
    assert.ok(d.params && typeof d.params === 'object', `deferred ${d.id} carries params`);
  }
});

test('buildOnboardingSteps: all three steps start undone for a fresh user', () => {
  const steps = buildOnboardingSteps(baseState());
  assert.deepEqual(
    steps.map((s) => s.id),
    ['language', 'location', 'reciter']
  );
  assert.deepEqual(
    steps.map((s) => s.done),
    [false, false, false]
  );
  assert.deepEqual(
    WIZARD_STEP_IDS,
    steps.map((s) => s.id)
  );
});

test('buildOnboardingSteps: each completion signal flips exactly its own step', () => {
  const located = buildOnboardingSteps(
    baseState({ settings: { prayer: { latitude: 30.04, longitude: 31.24 } } })
  );
  assert.deepEqual(
    located.map((s) => s.done),
    [false, true, false]
  );

  const defaults = buildOnboardingSteps(
    baseState({ onboarding: { dismissed: false, stepsSeen: { location: true } } })
  );
  assert.deepEqual(
    defaults.map((s) => s.done),
    [false, true, false],
    'continuing with defaults completes the location step without coordinates'
  );

  const setUp = buildOnboardingSteps(
    baseState({ onboarding: { dismissed: false, stepsSeen: { language: true, reciter: true } } })
  );
  assert.deepEqual(
    setUp.map((s) => s.done),
    [true, false, true]
  );

  // Legacy confirms no longer complete anything on their own.
  const legacy = buildOnboardingSteps(
    baseState({
      onboarding: {
        dismissed: false,
        stepsSeen: { comfort: true, prayer: true, goals: true },
      },
    })
  );
  assert.deepEqual(
    legacy.map((s) => s.done),
    [false, false, false]
  );
});

test('buildOnboardingSteps: junk coordinates do not complete the location step', () => {
  const junk = buildOnboardingSteps(
    baseState({ settings: { prayer: { latitude: 'x', longitude: null } } })
  );
  assert.equal(junk[1].done, false);
});

test('resolveOnboardingStep: live steps render, legacy ones redirect, unknown is null', () => {
  assert.deepEqual(resolveOnboardingStep('language'), { kind: 'wizard', index: 0 });
  assert.deepEqual(resolveOnboardingStep('location'), { kind: 'wizard', index: 1 });
  assert.deepEqual(resolveOnboardingStep('reciter'), { kind: 'wizard', index: 2 });
  // Numeric positions follow the legacy order, not the new one.
  assert.deepEqual(resolveOnboardingStep(1), {
    kind: 'deferred',
    view: 'settings',
    params: { id: 'accessibility' },
  });
  assert.deepEqual(resolveOnboardingStep(6), {
    kind: 'deferred',
    view: 'settings',
    params: { id: 'data' },
  });
  assert.deepEqual(resolveOnboardingStep(7), {
    kind: 'deferred',
    view: 'category',
    params: { id: 'morning' },
  });
  assert.deepEqual(resolveOnboardingStep('comfort'), {
    kind: 'deferred',
    view: 'settings',
    params: { id: 'accessibility' },
  });
  assert.deepEqual(resolveOnboardingStep('prayer'), {
    kind: 'deferred',
    view: 'prayer',
    params: {},
  });
  assert.equal(resolveOnboardingStep('bogus'), null);
  assert.equal(resolveOnboardingStep(99), null);
  assert.equal(resolveOnboardingStep(null), null);
});

test('onboardingComplete: only when all three steps are done', () => {
  const all = buildOnboardingSteps(
    baseState({
      settings: { prayer: { latitude: 1, longitude: 2 } },
      onboarding: { dismissed: false, stepsSeen: { language: true, reciter: true } },
    })
  );
  assert.equal(onboardingComplete(all), true);
  const pending = buildOnboardingSteps(
    baseState({
      settings: { prayer: { latitude: 1, longitude: 2 } },
      onboarding: { dismissed: false, stepsSeen: { language: true } },
    })
  );
  assert.equal(onboardingComplete(pending), false);
});

test('shouldShowOnboarding: hides when dismissed, when complete, shows otherwise', () => {
  assert.equal(shouldShowOnboarding(baseState()), true);
  assert.equal(shouldShowOnboarding(baseState({ onboarding: { dismissed: true } })), false);
  const doneState = baseState({
    settings: { prayer: { latitude: 1, longitude: 2 } },
    onboarding: { dismissed: false, stepsSeen: { language: true, reciter: true } },
  });
  assert.equal(shouldShowOnboarding(doneState), false);
  assert.equal(
    shouldShowOnboarding(
      baseState({
        onboarding: { dismissed: false, stepsSeen: { language: true, reciter: true } },
      })
    ),
    true,
    'location still pending without coordinates or a defaults confirm'
  );
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

test('wizardStepIndex: a stored legacy position falls back honestly', () => {
  const steps = buildOnboardingSteps(baseState());
  assert.equal(wizardStepIndex(steps, 6), 0, 'legacy install position → first incomplete');
});
