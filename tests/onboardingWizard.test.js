/**
 * tests/onboardingWizard.test.js — item 9 (onboarding wizard) gates,
 * v5.17.48 (3-step wizard: language → location-or-offset → reciter):
 *  1. ONBOARDING_STEP_SEEN records only live confirms; legacy confirms
 *     and hostile shapes degrade; ONBOARDING_STEP_SET moves/clears the
 *     ephemeral position; ONBOARDING_RESHOW restarts the introduction;
 *  2. restore keeps seen-flags (booleans, live steps) and drops hostile
 *     ones; a finished legacy setup grandfathers the reciter (its default
 *     voice was already in effect — re-asking would be an auto-reshow);
 *     the ui position never persists (initialState owns it);
 *  3. the panel renders one step at a time with position, progress,
 *     Back/Next, inline controls (location + defaults, reciter rows from
 *     QURAN_RECITERS) and the instant skip — EN + AR;
 *  4. handlers for step/confirm/language/reshow are registered;
 *  5. the Settings deferred block lists the six moved doors + reshow.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { onboardingPanelHTML } from '../js/views/onboardingPanel.js';
import { deferredSetupHTML } from '../js/views/settings.js';
import { QURAN_RECITERS } from '../js/core/config/quran.js';

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
  test('STEP_SEEN records live confirms, ignores legacy and hostile ones', () => {
    const s0 = wizardState();
    const s = reduce(s0, actions.markOnboardingStepSeen('location'));
    assert.deepEqual(s.onboarding.stepsSeen, { location: true });
    const s2 = reduce(s, actions.markOnboardingStepSeen('reciter'));
    assert.deepEqual(s2.onboarding.stepsSeen, { location: true, reciter: true });
    // Legacy confirms (comfort/prayer/goals) no longer record.
    assert.equal(reduce(s0, actions.markOnboardingStepSeen('prayer')), s0);
    assert.equal(reduce(s0, actions.markOnboardingStepSeen('goals')), s0);
    assert.equal(reduce(s0, actions.markOnboardingStepSeen('comfort')), s0);
    assert.equal(reduce(s0, actions.markOnboardingStepSeen('bogus')), s0);
    assert.equal(reduce(s0, actions.markOnboardingStepSeen(null)), s0);
    assert.equal(reduce(s, actions.markOnboardingStepSeen('location')), s, 'idempotent');
  });

  test('STEP_SEEN survives hostile onboarding shapes', () => {
    const s = reduce(
      { ...wizardState(), onboarding: null },
      actions.markOnboardingStepSeen('reciter')
    );
    assert.deepEqual(s.onboarding.stepsSeen, { reciter: true });
  });

  test('STEP_SET moves, clears and bounds the position', () => {
    const s0 = wizardState();
    assert.equal(reduce(s0, actions.setOnboardingStep(2)).ui.onboardingStep, 2);
    assert.equal(reduce(s0, actions.setOnboardingStep(null)).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep('x')).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep(-2)).ui.onboardingStep, null);
    assert.equal(reduce(s0, actions.setOnboardingStep(null)), s0, 'no-op keeps the ref');
  });

  test('RESHOW undismisses, clears seen-flags and releases the position', () => {
    const done = wizardState({
      onboarding: {
        dismissed: true,
        settingsVisited: false,
        stepsSeen: { language: true, location: true, reciter: true },
      },
      ui: { contentManage: false, onboardingStep: 2 },
    });
    const s = reduce(done, actions.reshowOnboarding());
    assert.equal(s.onboarding.dismissed, false);
    assert.deepEqual(s.onboarding.stepsSeen, {});
    assert.equal(s.ui.onboardingStep, null);
    // Already fresh → no-op keeps the ref.
    const fresh = wizardState();
    assert.equal(reduce(fresh, actions.reshowOnboarding()), fresh, 'no-op keeps the ref');
  });
});

describe('restore: seen-flags sanitize, legacy setup grandfathers reciter', () => {
  test('booleans for live steps survive; hostile and legacy drop', () => {
    const out = sanitizeRestoredPayload({
      onboarding: {
        dismissed: false,
        stepsSeen: { reciter: true, location: 'yes', prayer: true, bogus: true },
      },
    });
    assert.deepEqual(out.onboarding.stepsSeen, { reciter: true });
    assert.deepEqual(sanitizeRestoredPayload({}).onboarding.stepsSeen, {});
    assert.deepEqual(
      sanitizeRestoredPayload({ onboarding: { stepsSeen: [1] } }).onboarding.stepsSeen,
      {}
    );
  });

  test('a finished legacy setup keeps the default voice without being asked', () => {
    const out = sanitizeRestoredPayload({
      onboarding: {
        dismissed: false,
        stepsSeen: { language: true, comfort: true, prayer: true, goals: true },
      },
    });
    assert.deepEqual(out.onboarding.stepsSeen, { language: true, reciter: true });
  });

  test('a partial legacy setup does not grandfather anything', () => {
    const out = sanitizeRestoredPayload({
      onboarding: {
        dismissed: false,
        stepsSeen: { language: true, comfort: true, prayer: true },
      },
    });
    assert.deepEqual(out.onboarding.stepsSeen, { language: true });
  });

  test('a fresh hydrate starts the wizard position at null', () => {
    assert.equal(initialState().ui.onboardingStep, null);
  });
});

describe('wizard panel: one step at a time', () => {
  test('fresh users meet language first, with position + progress', () => {
    const html = onboardingPanelHTML(wizardState(), 'en');
    assert.ok(html.includes('Choose your language'), 'step title');
    assert.ok(html.includes('data-action="onboarding-language"'), 'language pick actions');
    assert.ok(html.includes('1 / 3'), 'bare position indicator');
    assert.ok(html.includes('0 of 3 steps done'), 'progress line');
    assert.ok(html.includes('data-action="onboarding-step"'), 'Next control');
    assert.ok(!html.match(/data-idx="-1"/), 'no Back on the first step');
    assert.ok(html.includes('data-action="onboarding-dismiss"'), 'dismiss survives');
  });

  test('explicit position overrides; Back appears past the first step', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 2 } };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('Choose your reciter'), 'override shows reciter');
    assert.ok(html.includes('3 / 3'), 'position follows the override');
    assert.ok(html.includes('data-idx="1"'), 'Back control');
    assert.ok(!html.includes('data-idx="3"'), 'no Next past the end');
  });

  test('the location step offers GPS, manual entry and defaults', () => {
    const s = wizardState({
      onboarding: {
        dismissed: false,
        settingsVisited: false,
        stepsSeen: { language: true },
      },
    });
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('Set your location'), 'step title');
    assert.ok(html.includes('2 / 3'), 'position advances past language');
    assert.ok(html.includes('data-action="prayer-request-location"'), 'GPS action');
    assert.ok(html.includes('Enter manually'), 'manual-entry deep link');
    assert.ok(
      html.includes('data-action="onboarding-confirm" data-step="location"'),
      'defaults confirm records'
    );
  });

  test('coordinates complete the location step; the wizard moves to reciter', () => {
    const s = wizardState({
      settings: {
        ...wizardState().settings,
        prayer: { latitude: 30, longitude: 31, method: 'MWL', asr: 'Standard' },
      },
      onboarding: {
        dismissed: false,
        settingsVisited: false,
        stepsSeen: { language: true },
      },
    });
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('Choose your reciter'), 'location done → reciter');
    assert.ok(html.includes('3 / 3'), 'position advances');
  });

  test('the reciter step lists every voice from the catalog, plus keep + more', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 2 } };
    const html = onboardingPanelHTML(s, 'en');
    for (const r of QURAN_RECITERS) {
      assert.ok(html.includes(r.nameEn), `voice listed: ${r.nameEn}`);
    }
    assert.equal(
      (html.match(/data-action="set-setting" data-key="reciter"/g) || []).length,
      QURAN_RECITERS.length,
      'one shared-pipeline pick per catalog voice, never a pinned subset'
    );
    assert.ok(
      html.includes('data-action="onboarding-confirm" data-step="reciter"'),
      'Done keeps the current voice'
    );
    assert.ok(html.includes('More voices in Settings'), 'overflow deep link');
  });

  test('language step offers both languages', () => {
    const first = onboardingPanelHTML(wizardState(), 'en');
    assert.ok(first.includes('data-action="onboarding-language" data-lang="ar"'), 'Arabic pick');
    assert.ok(first.includes('data-action="onboarding-language" data-lang="en"'), 'English pick');
  });

  test('a legacy stored position falls back to the first incomplete step', () => {
    const s = { ...wizardState(), ui: { contentManage: false, onboardingStep: 6 } };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('Choose your language'), 'stale install position → language');
    assert.ok(html.includes('1 / 3'), 'position restarts honestly');
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
        stepsSeen: { language: true, reciter: true },
      },
    });
    assert.equal(onboardingPanelHTML(done, 'en'), '');
    const ar = onboardingPanelHTML(wizardState(), 'ar');
    assert.ok(ar.includes('اختر لغتك'), 'AR renders the localized step');
    assert.doesNotMatch(ar, /undefined/);
    const arReciter = onboardingPanelHTML(
      { ...wizardState(), ui: { contentManage: false, onboardingStep: 2 } },
      'ar'
    );
    assert.ok(arReciter.includes('اختر القارئ'), 'AR reciter step');
    assert.ok(arReciter.includes('مشاري العفاسي'), 'AR voice names from the catalog');
    assert.doesNotMatch(arReciter, /undefined/);
  });
});

describe('wizard wiring: handlers registered', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/worship.js', import.meta.url), 'utf8');

  test('step, confirm, language and reshow keys exist', () => {
    for (const key of [
      'onboarding-step',
      'onboarding-confirm',
      'onboarding-language',
      'onboarding-reshow',
    ]) {
      assert.ok(handlers.includes(`'${key}'`), `handler missing: ${key}`);
    }
  });
});

describe('settings deferred block: the moved doors, re-openable', () => {
  test('six passive doors plus the reshow control (EN + AR)', () => {
    const html = deferredSetupHTML(wizardState(), 'en');
    for (const label of [
      'Comfortable to read?',
      'Prayer alerts',
      'Calculation method',
      'Daily Dhikr Goal',
      'Install the app',
      'Read your first adhkar',
    ]) {
      assert.ok(html.includes(label), `door listed: ${label}`);
    }
    assert.ok(html.includes('Finish setup when ready'), 'block title');
    assert.ok(html.includes('never pop up'), 'never-auto-reshown promise on screen');
    assert.ok(html.includes('data-action="onboarding-reshow"'), 'reshow control');
    assert.ok(html.includes('data-view="settings" data-id="accessibility"'), 'comfort deep link');
    assert.ok(html.includes('data-view="prayer"'), 'method deep link');
    assert.ok(html.includes('data-view="category" data-id="morning"'), 'first-reading deep link');
    const ar = deferredSetupHTML(wizardState(), 'ar');
    assert.ok(ar.includes('أكمل الإعداد متى شئت'), 'AR title');
    assert.ok(ar.includes('إظهار المقدمة مجددًا'), 'AR reshow');
    assert.doesNotMatch(ar, /undefined/);
  });
});
