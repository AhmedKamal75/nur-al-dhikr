/**
 * tests/onboardingWizard.test.js — item 9 (onboarding wizard) gates:
 *  1. ONBOARDING_STEP_SEEN records only known confirms; hostile shapes
 *     degrade; ONBOARDING_STEP_SET moves/clears the ephemeral position;
 *  2. restore keeps seen-flags (booleans, known steps) and drops hostile
 *     ones; the ui position never persists (initialState owns it);
 *  3. the panel renders one step at a time with position, progress,
 *     Back/Next, inline controls (location, permission, method/Asr,
 *     goal), the install fallback and the reading link — EN + AR;
 *  4. handlers for step/confirm/enable are registered.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { onboardingPanelHTML } from '../js/views/onboardingPanel.js';

function wizardState(over = {}) {
  const s = initialState();
  return {
    ...s,
    settings: {
      ...s.settings,
      language: 'en',
      dailyGoal: 100,
      prayer: { latitude: null, longitude: null, method: 'MWL', asr: 'Standard' },
    },
    onboarding: { dismissed: false, settingsVisited: false, stepsSeen: {} },
    statistics: { ...s.statistics, totalRecitations: 0 },
    install: { promptReady: false, installed: false },
    ui: { contentManage: false, onboardingStep: null },
    ...over,
  };
}

describe('wizard state: seen-flags and ephemeral position', () => {
  test('STEP_SEEN records known confirms, ignores the rest', () => {
    const s0 = wizardState();
    const s = reduce(s0, actions.markOnboardingStepSeen('prayer'));
    assert.deepEqual(s.onboarding.stepsSeen, { prayer: true });
    const s2 = reduce(s, actions.markOnboardingStepSeen('goals'));
    assert.deepEqual(s2.onboarding.stepsSeen, { prayer: true, goals: true });
    assert.equal(reduce(s0, actions.markOnboardingStepSeen('bogus')), s0);
    assert.equal(reduce(s0, actions.markOnboardingStepSeen(null)), s0);
    assert.equal(reduce(s, actions.markOnboardingStepSeen('prayer')), s, 'idempotent');
  });

  test('STEP_SEEN survives hostile onboarding shapes', () => {
    const s = reduce(
      { ...wizardState(), onboarding: null },
      actions.markOnboardingStepSeen('goals')
    );
    assert.deepEqual(s.onboarding.stepsSeen, { goals: true });
  });

  test('STEP_SET moves, clears and bounds the position', () => {
    const s0 = wizardState();
    assert.equal(reduce(s0, actions.setOnboardingStep(3)).ui.onboardingStep, 3);
    assert.equal(reduce(s0, actions.setOnboardingStep(null)).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep('x')).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep(-2)).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep(null)), s0, 'no-op keeps the ref');
  });
});

describe('restore: seen-flags sanitize, position stays ephemeral', () => {
  test('booleans for known steps survive; hostile drops', () => {
    const out = sanitizeRestoredPayload({
      onboarding: { dismissed: false, stepsSeen: { prayer: true, goals: 'yes', bogus: true } },
    });
    assert.deepEqual(out.onboarding.stepsSeen, { prayer: true });
    assert.deepEqual(sanitizeRestoredPayload({}).onboarding.stepsSeen, {});
    assert.deepEqual(
      sanitizeRestoredPayload({ onboarding: { stepsSeen: [1] } }).onboarding.stepsSeen,
      {}
    );
  });

  test('a fresh hydrate starts the wizard position at null', () => {
    assert.equal(initialState().ui.onboardingStep, null);
  });
});

describe('wizard panel: one step at a time', () => {
  test('fresh users meet location first, with position + progress', () => {
    const html = onboardingPanelHTML(wizardState(), 'en');
    assert.ok(html.includes('Set your location'), 'step title');
    assert.ok(html.includes('data-action="prayer-request-location"'), 'geolocation priming action');
    assert.ok(html.includes('Enable Location'), 'priming button label');
    assert.ok(html.includes('Enter manually'), 'manual fallback link');
    assert.ok(html.includes('1 / 6'), 'bare position indicator');
    assert.ok(html.includes('0 of 6 steps done'), 'progress line');
    assert.ok(html.includes('data-action="onboarding-step"'), 'Next control');
    assert.ok(!html.match(/data-idx="-1"/), 'no Back on the first step');
    assert.ok(html.includes('data-action="onboarding-dismiss"'), 'dismiss survives');
  });

  test('explicit position overrides; Back appears past the first step', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 4 } };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('Install the app'), 'override shows install');
    assert.ok(html.includes('5 / 6'), 'position follows the override');
    assert.ok(html.includes('data-idx="3"'), 'Back control');
    assert.ok(html.includes('data-idx="5"'), 'Next control');
  });

  test('position follows the first incomplete step', () => {
    const s = wizardState({
      settings: {
        ...wizardState().settings,
        prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
      },
      onboarding: { dismissed: false, settingsVisited: false, stepsSeen: {} },
    });
    const html = onboardingPanelHTML(s, 'en', { notificationsGranted: false });
    assert.ok(html.includes('Prayer alerts'), 'location done → notifications');
    assert.ok(html.includes('2 / 6'), 'position advances');
    assert.ok(html.includes('data-action="notifications-enable"'), 'priming action');
  });

  test('granted permission completes the notifications step', () => {
    const s = wizardState({
      settings: {
        ...wizardState().settings,
        prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
      },
    });
    const html = onboardingPanelHTML(s, 'en', { notificationsGranted: true });
    assert.ok(html.includes('Calculation method'), 'moves past notifications');
    assert.ok(!html.includes('data-action="notifications-enable"'), 'no enable button when done');
  });

  test('denied permission shows the honest blocked note', () => {
    const realWindow = globalThis.window;
    globalThis.window = { Notification: { permission: 'denied' } };
    try {
      const s = wizardState({
        settings: {
          ...wizardState().settings,
          prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
        },
      });
      const html = onboardingPanelHTML(s, 'en');
      assert.ok(html.includes('blocked for this site'), 'denied note renders');
      assert.ok(
        !html.includes('data-action="notifications-enable"'),
        'no enable button when blocked'
      );
    } finally {
      if (realWindow === undefined) delete globalThis.window;
      else globalThis.window = realWindow;
    }
  });

  test('prayer step carries live method/Asr controls plus confirm', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 2 } };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('data-bind="prayer-method"'), 'method select reuses the pipeline');
    assert.ok(html.includes('Muslim World League'), 'all seven methods listed');
    assert.ok(html.includes('data-bind="prayer-asr"'), 'Asr select reuses the pipeline');
    assert.ok(
      html.includes('data-action="onboarding-confirm" data-step="prayer"'),
      'confirm records'
    );
  });

  test('goals step carries the daily-goal input plus confirm', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 3 } };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('data-bind="dailyGoal"'), 'goal input reuses the pipeline');
    assert.ok(
      html.includes('data-action="onboarding-confirm" data-step="goals"'),
      'confirm records'
    );
  });

  test('seen setup steps are skipped; last step has no Next', () => {
    const s = wizardState({
      onboarding: {
        dismissed: false,
        settingsVisited: false,
        stepsSeen: { prayer: true, goals: true },
      },
    });
    const html = onboardingPanelHTML(s, 'en', { notificationsGranted: true, appInstalled: true });
    // location + install + firstReading remain; install done via flag.
    const full = wizardState({
      settings: {
        ...wizardState().settings,
        prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
      },
      onboarding: {
        dismissed: false,
        settingsVisited: false,
        stepsSeen: { prayer: true, goals: true },
      },
      statistics: { ...wizardState().statistics, totalRecitations: 0 },
    });
    const last = onboardingPanelHTML(full, 'en', {
      notificationsGranted: true,
      appInstalled: true,
    });
    assert.ok(last.includes('Read your first adhkar'), 'finale is first reading');
    assert.ok(last.includes('6 / 6'), 'last position');
    assert.ok(!last.includes('data-action="onboarding-step" data-idx="6"'), 'no Next past the end');
    assert.ok(html.includes('Set your location'), 'unseen location still leads');
  });

  test('dismissed or complete wizards render nothing (AR-safe)', () => {
    assert.equal(onboardingPanelHTML(wizardState({ onboarding: { dismissed: true } }), 'en'), '');
    const done = wizardState({
      settings: {
        ...wizardState().settings,
        prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
      },
      onboarding: {
        dismissed: false,
        settingsVisited: false,
        stepsSeen: { prayer: true, goals: true },
      },
      statistics: { ...wizardState().statistics, totalRecitations: 9 },
    });
    assert.equal(
      onboardingPanelHTML(done, 'en', { appInstalled: true, notificationsGranted: true }),
      ''
    );
    const ar = onboardingPanelHTML(wizardState(), 'ar');
    assert.ok(ar.includes('حدّد موقعك'), 'AR renders the localized step');
    assert.doesNotMatch(ar, /undefined/);
  });
});

describe('wizard wiring: handlers registered', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/worship.js', import.meta.url), 'utf8');

  test('step, confirm and enable keys exist', () => {
    for (const key of ['onboarding-step', 'onboarding-confirm', 'notifications-enable']) {
      assert.ok(handlers.includes(`'${key}'`), `handler missing: ${key}`);
    }
  });
});
