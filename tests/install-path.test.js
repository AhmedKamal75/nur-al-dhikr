/**
 * tests/install-path.test.js (v5.17.31) — the install-path gap pins:
 *  1. deferral memory is pure and hostile-safe (default / sanitize /
 *     record / cooldown), with the clock injected;
 *  2. platform routing (installed > prompt > ios > android > desktop);
 *  3. the reducer flag matrix is idempotent and drops hostile outcomes;
 *  4. sanitizeSettings allowlists the new persisted deferral key;
 *  5. the wizard step renders Install+Later on prompt, per-platform steps
 *     off-prompt, and a re-offer once a deferral cools down — EN + AR;
 *  6. the shared About/Settings row reuses the same copy per platform;
 *  7. runInstallPrompt drives a fake deferred event (accepted / dismissed /
 *     hostile shapes), and the real handlers consume/record through it;
 *  8. the SW precache-complete message maps to SHELL_OFFLINE_READY.
 *
 * What this file does NOT claim: the real browser dialog, iOS Share-sheet
 * behavior, and airplane-mode offline proof all need a physical device —
 * see docs/DEVICE-TEST.md (BLOCKED:device) and tests/e2e/install-path.spec.js.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  INSTALL_REOFFER_DAYS,
  defaultInstallDeferral,
  sanitizeInstallDeferral,
  recordInstallDeferral,
  shouldReofferInstall,
  detectInstallPlatform,
  installStepsKey,
  normalizeInstallOutcome,
  runInstallPrompt,
  swInstallMessageAction,
} from '../js/domain/install.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { onboardingPanelHTML } from '../js/views/onboardingPanel.js';
import { installRowHTML } from '../js/views/installRow.js';
import { renderAbout } from '../js/views/about.js';
import { renderSettings } from '../js/views/settings.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { mergedClickHandlers } from '../js/app/events.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_750_000_000_000;

/* ------------------------------------------------------------------ */
/* 1. Deferral memory                                                  */
/* ------------------------------------------------------------------ */

describe('install deferral: pure memory with an injected clock', () => {
  test('a fresh deferral stamps now and counts one', () => {
    assert.deepEqual(recordInstallDeferral(defaultInstallDeferral(), NOW), {
      at: NOW,
      count: 1,
    });
  });

  test('counts accumulate over repeated deferrals', () => {
    const twice = recordInstallDeferral(recordInstallDeferral(undefined, NOW - DAY), NOW);
    assert.deepEqual(twice, { at: NOW, count: 2 });
  });

  test('sanitize drops hostile shapes to the default', () => {
    assert.deepEqual(sanitizeInstallDeferral(null, NOW), { at: null, count: 0 });
    assert.deepEqual(sanitizeInstallDeferral([1], NOW), { at: null, count: 0 });
    assert.deepEqual(sanitizeInstallDeferral({ at: 'soon', count: -3 }, NOW), {
      at: null,
      count: 0,
    });
    assert.deepEqual(sanitizeInstallDeferral({ at: NOW + DAY, count: 1 }, NOW), {
      at: null,
      count: 1,
    });
  });

  test('the count clamps at the cap instead of growing forever', () => {
    assert.equal(sanitizeInstallDeferral({ at: null, count: 1e9 }, NOW).count, 1000);
    assert.equal(recordInstallDeferral({ at: NOW, count: 1000 }, NOW).count, 1000);
  });

  test('never deferred (or zero-count) always re-offers', () => {
    assert.equal(shouldReofferInstall(undefined, NOW), true);
    assert.equal(shouldReofferInstall({ at: NOW, count: 0 }, NOW), true);
  });

  test('inside the cooldown stays quiet; past it re-offers', () => {
    const recent = { at: NOW - DAY, count: 1 };
    const stale = { at: NOW - (INSTALL_REOFFER_DAYS * DAY + 1), count: 2 };
    assert.equal(shouldReofferInstall(recent, NOW), false);
    assert.equal(shouldReofferInstall(stale, NOW), true);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Platform routing                                                 */
/* ------------------------------------------------------------------ */

describe('install platform routing', () => {
  test('installed beats everything; a live prompt beats the UA', () => {
    assert.equal(detectInstallPlatform({ installed: true, ua: 'iPhone' }), 'installed');
    assert.equal(
      detectInstallPlatform({ installed: false, promptReady: true, ua: 'iPhone' }),
      'prompt'
    );
  });

  test('UA matrix: iOS vs Android vs desktop fallback', () => {
    const ios =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const android =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
    const desktop =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    assert.equal(detectInstallPlatform({ ua: ios }), 'ios');
    assert.equal(detectInstallPlatform({ ua: 'iPad' }), 'ios');
    assert.equal(detectInstallPlatform({ ua: android }), 'android');
    assert.equal(detectInstallPlatform({ ua: desktop }), 'desktop');
    assert.equal(detectInstallPlatform({}), 'desktop');
    assert.equal(detectInstallPlatform(), 'desktop');
  });

  test('each no-prompt platform names its own steps key', () => {
    assert.equal(installStepsKey('ios'), 'onboarding.installIosSteps');
    assert.equal(installStepsKey('android'), 'onboarding.installAndroidSteps');
    assert.equal(installStepsKey('desktop'), 'onboarding.installDesktopSteps');
  });
});

/* ------------------------------------------------------------------ */
/* 3. Reducer flag matrix                                              */
/* ------------------------------------------------------------------ */

describe('install reducer: flag matrix, idempotent, hostile-safe', () => {
  test('READY / CLEAR / DEFER / REOFFER move promptReady and no-op on repeat', () => {
    const s0 = initialState();
    assert.equal(s0.install.promptReady, false);
    const ready = reduce(s0, actions.installPromptReady());
    assert.equal(ready.install.promptReady, true);
    assert.equal(reduce(ready, actions.installPromptReady()), ready, 'READY idempotent');
    const cleared = reduce(ready, actions.installPromptClear());
    assert.equal(cleared.install.promptReady, false);
    assert.equal(reduce(s0, actions.installPromptClear()), s0, 'CLEAR idempotent');
    // DEFER hides the offer like CLEAR (the stashed event survives in rt).
    assert.equal(reduce(ready, actions.installPromptDefer()).install.promptReady, false);
    assert.equal(reduce(s0, actions.installPromptDefer()), s0, 'DEFER idempotent');
    // REOFFER re-surfaces it — never over installed or an live offer.
    const reoffered = reduce(s0, actions.installPromptReoffer());
    assert.equal(reoffered.install.promptReady, true);
    assert.equal(reduce(reoffered, actions.installPromptReoffer()), reoffered);
    assert.equal(
      reduce({ ...s0, install: { ...s0.install, installed: true } }, actions.installPromptReoffer())
        .install.promptReady,
      false
    );
  });

  test('DONE records accepted vs dismissed; hostile outcomes are dropped', () => {
    const s0 = initialState();
    const accepted = reduce(s0, actions.installPromptDone('accepted'));
    assert.equal(accepted.install.outcome, 'accepted');
    assert.equal(accepted.install.promptReady, false);
    assert.equal(reduce(accepted, actions.installPromptDone('accepted')), accepted);
    const dismissed = reduce(s0, actions.installPromptDone('dismissed'));
    assert.equal(dismissed.install.outcome, 'dismissed');
    assert.equal(reduce(s0, actions.installPromptDone('maybe')), s0, 'hostile dropped');
    assert.equal(reduce(s0, actions.installPromptDone(null)), s0, 'null dropped');
    assert.equal(reduce(s0, { type: 'INSTALL_PROMPT_DONE' }), s0, 'absent dropped');
  });

  test('INSTALL_DONE still marks installed; SHELL_OFFLINE_READY latches once', () => {
    const s0 = initialState();
    const done = reduce(s0, actions.markAppInstalled());
    assert.equal(done.install.installed, true);
    assert.equal(reduce(done, actions.markAppInstalled()), done);
    assert.equal(s0.install.shellReady, false);
    const ready = reduce(s0, actions.shellOfflineReady());
    assert.equal(ready.install.shellReady, true);
    assert.equal(reduce(ready, actions.shellOfflineReady()), ready, 'latch idempotent');
  });
});

/* ------------------------------------------------------------------ */
/* 4. The new settings key survives sanitize                           */
/* ------------------------------------------------------------------ */

describe('settings sanitize: installDeferral allowlist', () => {
  test('DEFAULT_SETTINGS carries the fresh shape', () => {
    assert.deepEqual(DEFAULT_SETTINGS.installDeferral, { at: null, count: 0 });
  });

  test('valid memory survives; hostile degrades to the default', () => {
    const kept = sanitizeSettings({ installDeferral: { at: Date.now() - 1000, count: 3 } });
    assert.equal(kept.installDeferral.count, 3);
    assert.ok(kept.installDeferral.at > 0);
    assert.deepEqual(sanitizeSettings({}).installDeferral, { at: null, count: 0 });
    assert.deepEqual(
      sanitizeSettings({ installDeferral: { at: 'x', count: 'y' } }).installDeferral,
      {
        at: null,
        count: 0,
      }
    );
    assert.deepEqual(
      sanitizeSettings({ installDeferral: { at: Date.now() + DAY, count: 1 } }).installDeferral,
      { at: null, count: 1 },
      'future stamps never persist'
    );
  });
});

/* ------------------------------------------------------------------ */
/* 5. Wizard step variants                                             */
/* ------------------------------------------------------------------ */

function wizardState(over = {}) {
  const s = initialState();
  return {
    ...s,
    settings: {
      ...s.settings,
      language: 'en',
      prayer: { latitude: null, longitude: null, method: 'MWL', asr: 'Standard' },
    },
    onboarding: { dismissed: false, settingsVisited: false, stepsSeen: {} },
    statistics: { ...s.statistics, totalRecitations: 0 },
    install: { promptReady: false, installed: false, outcome: null, shellReady: false },
    ui: { contentManage: false, onboardingStep: 6 },
    ...over,
  };
}

describe('wizard install step: prompt vs per-platform copy', () => {
  test('a live prompt offers Install + Not-now (EN + AR)', () => {
    const html = onboardingPanelHTML(wizardState(), 'en', { installPromptReady: true });
    assert.ok(html.includes('data-action="onboarding-install"'), 'install action');
    assert.ok(html.includes('data-action="install-later"'), 'later action');
    const arHtml = onboardingPanelHTML(
      wizardState({ settings: { ...wizardState().settings, language: 'ar' } }),
      'ar',
      { installPromptReady: true }
    );
    assert.ok(arHtml.includes('data-action="onboarding-install"'), 'AR keeps the actions');
    assert.ok(arHtml.includes('ليس الآن'), 'AR later copy');
    assert.doesNotMatch(arHtml, /undefined/);
  });

  test('no prompt renders per-platform steps, never the generic line', () => {
    for (const [platform, copy] of [
      ['ios', 'Add to Home Screen'],
      ['android', 'Install app'],
      ['desktop', 'address bar'],
    ]) {
      const html = onboardingPanelHTML(wizardState(), 'en', { installPlatform: platform });
      assert.ok(html.includes(copy), `${platform} steps`);
      assert.ok(!html.includes('data-action="onboarding-install"'), `${platform}: no dead button`);
    }
    const arHtml = onboardingPanelHTML(
      wizardState({ settings: { ...wizardState().settings, language: 'ar' } }),
      'ar',
      { installPlatform: 'ios' }
    );
    assert.ok(arHtml.includes('المشاركة'), 'AR iOS Share step');
  });

  test('an expired deferral adds the re-offer; a fresh one stays quiet', () => {
    const stale = wizardState({
      settings: {
        ...wizardState().settings,
        installDeferral: { at: NOW - (INSTALL_REOFFER_DAYS * DAY + 1), count: 1 },
      },
    });
    // The fixture stamp is older than the real clock — still expired, so
    // the re-offer renders regardless of Date.now skew.
    assert.ok(
      onboardingPanelHTML(stale, 'en', { installPlatform: 'android' }).includes(
        'data-action="install-reoffer"'
      ),
      'expired deferral re-offers'
    );
    const fresh = wizardState({
      settings: { ...wizardState().settings, installDeferral: { at: Date.now(), count: 1 } },
    });
    assert.ok(
      !onboardingPanelHTML(fresh, 'en', { installPlatform: 'android' }).includes(
        'data-action="install-reoffer"'
      ),
      'fresh deferral stays quiet'
    );
  });
});

/* ------------------------------------------------------------------ */
/* 6. Shared About/Settings row                                        */
/* ------------------------------------------------------------------ */

function rowState(over = {}) {
  const s = initialState();
  return {
    ...s,
    settings: { ...s.settings, language: 'en', installDeferral: { at: null, count: 0 } },
    install: { promptReady: false, installed: false, outcome: null, shellReady: false },
    ...over,
  };
}

describe('install row: one copy reused by About and Settings', () => {
  test('prompt state offers both actions; shell-ready shows the badge', () => {
    const html = installRowHTML(rowState(), 'en', { platform: 'prompt', promptReady: true });
    assert.ok(html.includes('data-action="onboarding-install"'), 'install');
    assert.ok(html.includes('data-action="install-later"'), 'later');
    const ready = installRowHTML(
      rowState({
        install: { promptReady: false, installed: true, outcome: 'accepted', shellReady: true },
      }),
      'en',
      { platform: 'installed' }
    );
    assert.ok(ready.includes('Offline-ready'), 'shell-ready badge');
    assert.ok(!ready.includes('data-action='), 'installed: no actions left');
  });

  test('manual platforms reuse the wizard steps keys', () => {
    assert.ok(
      installRowHTML(rowState(), 'en', { platform: 'ios' }).includes(
        en['onboarding.installIosSteps']
      )
    );
    assert.ok(
      installRowHTML(rowState(), 'ar', { platform: 'desktop' }).includes(
        ar['onboarding.installDesktopSteps']
      ),
      'AR parity in the row'
    );
  });

  test('About and Settings both carry the row on the offline surface', () => {
    const about = renderAbout({ ...rowState(), library: { documents: {} } });
    assert.ok(about.includes('install-row'), 'about renders the row');
    assert.ok(about.includes(en['onboarding.installDesktopSteps']), 'about reuses the steps copy');
    const settings = renderSettings({
      ...rowState(),
      activeParams: {},
      settings: { ...rowState().settings, settingsSection: 'data' },
    });
    assert.ok(settings.includes('install-row'), 'settings renders the row');
    assert.ok(settings.includes('data-action="navigate"'), 'settings keeps its own actions');
  });
});

/* ------------------------------------------------------------------ */
/* 7. Fake-prompt runs + outcome normalization                         */
/* ------------------------------------------------------------------ */

describe('runInstallPrompt: the dialog sequence against a fake event', () => {
  const fake = (outcome) => ({
    calls: 0,
    async prompt() {
      this.calls += 1;
    },
    userChoice: Promise.resolve({ outcome }),
  });

  test('accepted vs dismissed resolve distinctly', async () => {
    assert.equal(await runInstallPrompt(fake('accepted')), 'accepted');
    assert.equal(await runInstallPrompt(fake('dismissed')), 'dismissed');
  });

  test('hostile shapes resolve to null instead of throwing', async () => {
    assert.equal(await runInstallPrompt(null), null);
    assert.equal(await runInstallPrompt({}), null);
    assert.equal(await runInstallPrompt(fake('maybe')), null);
    assert.equal(
      await runInstallPrompt({
        prompt: async () => {},
        userChoice: Promise.reject(new Error('x')),
      }),
      null,
      'rejected userChoice'
    );
    assert.equal(
      await runInstallPrompt({
        prompt: async () => {
          throw new Error('refused');
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }),
      null,
      'refused second prompt'
    );
  });

  test('normalizeInstallOutcome only trusts the two literals', () => {
    assert.equal(normalizeInstallOutcome('accepted'), 'accepted');
    assert.equal(normalizeInstallOutcome('dismissed'), 'dismissed');
    assert.equal(normalizeInstallOutcome('ACCEPTED'), null);
    assert.equal(normalizeInstallOutcome(undefined), null);
  });
});

/* ------------------------------------------------------------------ */
/* 8. SW shell-ready bridge + handler wiring                           */
/* ------------------------------------------------------------------ */

describe('shell-ready signal + handler wiring', () => {
  test('precache-complete maps to SHELL_OFFLINE_READY; everything else maps nowhere', () => {
    assert.equal(swInstallMessageAction({ type: 'precache-complete' }), 'SHELL_OFFLINE_READY');
    assert.equal(swInstallMessageAction({ type: 'precache-failed' }), null);
    assert.equal(swInstallMessageAction(null), null);
    assert.equal(swInstallMessageAction('precache-complete'), 'SHELL_OFFLINE_READY');
  });

  test('every install action resolves to a registered click handler', () => {
    for (const a of ['onboarding-install', 'install-later', 'install-reoffer']) {
      assert.ok(mergedClickHandlers[a], `${a} has a handler in the delegation table`);
    }
  });

  test('new i18n keys exist in both languages with matching placeholders', () => {
    const keys = [
      'onboarding.installIosSteps',
      'onboarding.installAndroidSteps',
      'onboarding.installDesktopSteps',
      'onboarding.installLater',
      'onboarding.installReoffer',
      'onboarding.installAccepted',
      'onboarding.installDeferred',
      'sw.shellReady',
    ];
    const ph = (s) =>
      [...String(s).matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join(',');
    for (const k of keys) {
      assert.ok(typeof en[k] === 'string' && en[k].length > 0, `en has ${k}`);
      assert.ok(typeof ar[k] === 'string' && ar[k].length > 0, `ar has ${k}`);
      assert.equal(ph(ar[k]), ph(en[k]), `${k} placeholder parity`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 9. Live handlers against a fake deferredInstallPrompt               */
/*                                                                     */
/* The store is a singleton: these run last, stamp deferral memory,    */
/* and restore it, so nothing else in this file can observe them.      */
/* ------------------------------------------------------------------ */

describe('handlers with a fake deferredInstallPrompt', async () => {
  const { store } = await import('../js/core/state.js');
  const { rt } = await import('../js/app/rt.js');

  const fakePrompt = (outcome) => ({
    calls: 0,
    async prompt() {
      this.calls += 1;
    },
    userChoice: Promise.resolve({ outcome }),
  });

  // showToast renders into #toast-root; headless there is no document.
  function stubToast() {
    const prev = globalThis.document;
    globalThis.document = { getElementById: () => null };
    return () => {
      if (prev === undefined) delete globalThis.document;
      else globalThis.document = prev;
    };
  }

  test('install-later stamps deferral without consuming the event', () => {
    const restoreToast = stubToast();
    const prev = store.getState().settings.installDeferral;
    try {
      const event = fakePrompt('accepted');
      rt.deferredInstallPrompt = event;
      mergedClickHandlers['install-later']({}, null, null);
      const after = store.getState();
      assert.equal(after.settings.installDeferral.count, (prev?.count || 0) + 1);
      assert.ok(after.settings.installDeferral.at > 0);
      assert.equal(rt.deferredInstallPrompt, event, 'event survives for the re-offer');
      assert.equal(after.install.promptReady, false);
    } finally {
      store.dispatch(actions.updateSettings({ installDeferral: prev }));
      rt.deferredInstallPrompt = null;
      restoreToast();
    }
  });

  test('install-reoffer resurfaces the stashed event after the cooldown', () => {
    const restoreToast = stubToast();
    const prev = store.getState().settings.installDeferral;
    try {
      store.dispatch(
        actions.updateSettings({
          installDeferral: { at: NOW - (INSTALL_REOFFER_DAYS * DAY + 1), count: 1 },
        })
      );
      rt.deferredInstallPrompt = fakePrompt('accepted');
      mergedClickHandlers['install-reoffer']({}, null, null);
      assert.equal(store.getState().install.promptReady, true, 'offer resurfaces');
    } finally {
      store.dispatch(actions.installPromptClear());
      store.dispatch(actions.updateSettings({ installDeferral: prev }));
      rt.deferredInstallPrompt = null;
      restoreToast();
    }
  });

  test('onboarding-install consumes the event and records accepted', async () => {
    const restoreToast = stubToast();
    try {
      const event = fakePrompt('accepted');
      rt.deferredInstallPrompt = event;
      await mergedClickHandlers['onboarding-install']({}, null, null);
      assert.equal(event.calls, 1, 'prompt() ran once');
      assert.equal(rt.deferredInstallPrompt, null, 'one-shot event consumed');
      assert.equal(store.getState().install.outcome, 'accepted');
    } finally {
      rt.deferredInstallPrompt = null;
      restoreToast();
    }
  });

  test('onboarding-install records dismissed and stamps deferral memory', async () => {
    const restoreToast = stubToast();
    const prev = store.getState().settings.installDeferral;
    try {
      rt.deferredInstallPrompt = fakePrompt('dismissed');
      await mergedClickHandlers['onboarding-install']({}, null, null);
      assert.equal(store.getState().install.outcome, 'dismissed');
      assert.equal(
        store.getState().settings.installDeferral.count,
        (prev?.count || 0) + 1,
        'dismissal is remembered for the cooldown'
      );
    } finally {
      store.dispatch(actions.updateSettings({ installDeferral: prev }));
      rt.deferredInstallPrompt = null;
      restoreToast();
    }
  });
});
