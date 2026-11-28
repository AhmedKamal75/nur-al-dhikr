/**
 * tests/installInvite.test.js (v5.17.189, C19) — the Home install
 * invitation: one card in the homeInvitations family, shown only to a
 * returning reader (3 distinct active days, never first run), action per
 * platform (browser prompt where available, the steps sheet otherwise,
 * iOS sheet with the real Share glyph and the honest Safari-only note),
 * "Not now" stamping the existing 7-day deferral memory AND the persisted
 * day-dismissal.
 *
 * TZ pinned at module top (repo pattern, ramadan-dedup.test.js):
 * deferral math is millisecond-based but dismissal keys are LOCAL day
 * strings, and the runner's zone must not decide which day "today" is.
 * Run: node --test tests/installInvite.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

process.env.TZ = 'Africa/Cairo';

import {
  INVITE_IDS,
  shouldShowInvite,
  shouldShowInstallInvite,
} from '../js/domain/homeInvitations.js';
import {
  INSTALL_INVITE_MIN_ACTIVE_DAYS,
  INSTALL_REOFFER_DAYS,
  detectInstallPlatform,
  recordInstallDeferral,
} from '../js/domain/install.js';
import { activeDays } from '../js/domain/statistics.js';
import { installStepsSheetHTML } from '../js/views/installRow.js';
import { homeInvitesHTML } from '../js/views/home.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';
import { dateKey } from '../js/core/utils.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { mergedClickHandlers } from '../js/app/events.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 28, 12, 0, 0); // local noon, Nov 28 2026

const statsWithDays = (n) => {
  const dailyHistory = {};
  for (let i = 0; i < n; i += 1) {
    dailyHistory[`2026-11-${String(10 + i).padStart(2, '0')}`] = { recitations: 1 };
  }
  return { dailyHistory };
};

/* ------------------------------------------------------------------ */
/* 1. Trigger: returning readers only                                  */
/* ------------------------------------------------------------------ */

describe('trigger: a returning reader only, never first run', () => {
  test('below the active-day floor stays silent; at it the card may show', () => {
    const base = { platform: 'desktop', deferral: null, dismissedInvites: {}, date: NOW };
    assert.equal(shouldShowInstallInvite({ ...base, activeDayCount: 0 }), false);
    assert.equal(
      shouldShowInstallInvite({ ...base, activeDayCount: INSTALL_INVITE_MIN_ACTIVE_DAYS - 1 }),
      false
    );
    assert.equal(
      shouldShowInstallInvite({ ...base, activeDayCount: INSTALL_INVITE_MIN_ACTIVE_DAYS }),
      true
    );
    assert.equal(shouldShowInstallInvite({ ...base, activeDayCount: 40 }), true);
  });

  test('hostile day counts read as first run', () => {
    const base = { platform: 'desktop', deferral: null, dismissedInvites: {}, date: NOW };
    for (const bad of [NaN, Infinity, -3, 'many', null, undefined]) {
      assert.equal(shouldShowInstallInvite({ ...base, activeDayCount: bad }), false, `${bad}`);
    }
  });

  test('an installed device never sees the invitation', () => {
    assert.equal(
      shouldShowInstallInvite({
        activeDayCount: 30,
        platform: 'installed',
        deferral: null,
        dismissedInvites: {},
        date: NOW,
      }),
      false
    );
  });

  test('statistics owns "active": dhikr days and read-only days both count', () => {
    const statistics = {
      dailyHistory: {
        '2026-11-10': { recitations: 4 },
        '2026-11-11': { readingSec: 95 },
        '2026-11-12': { recitations: 0, readingSec: 0 },
        '2026-11-13': { recitations: 1 },
      },
    };
    assert.equal(activeDays(statistics), 3);
    assert.equal(activeDays({}), 0);
    assert.equal(activeDays({ dailyHistory: {} }), 0);
  });

  test('the 7-day deferral memory holds the card quiet, then lets it back', () => {
    const base = {
      activeDayCount: 5,
      platform: 'desktop',
      dismissedInvites: {},
      date: NOW,
    };
    const recent = { at: NOW.getTime() - 3 * DAY, count: 1 };
    const cooled = { at: NOW.getTime() - (INSTALL_REOFFER_DAYS + 1) * DAY, count: 1 };
    assert.equal(shouldShowInstallInvite({ ...base, deferral: recent }), false);
    assert.equal(shouldShowInstallInvite({ ...base, deferral: cooled }), true);
    assert.equal(shouldShowInstallInvite({ ...base, deferral: null }), true);
    assert.equal(shouldShowInstallInvite({ ...base, deferral: 'junk' }), true);
  });

  test('day-dismissal hides for the day only; the generic dispatcher defers to the rich trigger', () => {
    const base = { activeDayCount: 5, platform: 'desktop', deferral: null, date: NOW };
    const today = dateKey(NOW);
    assert.equal(shouldShowInstallInvite({ ...base, dismissedInvites: { install: today } }), false);
    assert.equal(
      shouldShowInstallInvite({ ...base, dismissedInvites: { install: '2026-11-27' } }),
      true
    );
    // The 3-arg dispatcher cannot answer for 'install' — it must abstain,
    // not fall through to another card's season.
    assert.equal(shouldShowInvite('install', NOW, {}), false);
    assert.ok(INVITE_IDS.includes('install'));
  });
});

/* ------------------------------------------------------------------ */
/* 2. Platform branches and the steps sheet                            */
/* ------------------------------------------------------------------ */

describe('platform branches and the steps sheet', () => {
  test('iOS sheet: real Share glyph, steps, and the honest Safari-only note', () => {
    const html = installStepsSheetHTML('ios', 'en');
    assert.ok(html.includes('<svg'), 'glyph rendered');
    assert.ok(html.includes('Add to Home Screen'), 'the iOS steps');
    assert.ok(html.includes('Only Safari can install'), 'the honest note');
    const arHtml = installStepsSheetHTML('ios', 'ar');
    assert.ok(arHtml.includes(en['onboarding.installIosSafariNote']) === false, 'AR is Arabic');
    assert.ok(arHtml.includes(ar['onboarding.installIosSafariNote'].slice(0, 24)));
  });

  test('android and desktop sheets name their own steps, without the iOS note', () => {
    const android = installStepsSheetHTML('android', 'en');
    assert.ok(android.includes(en['onboarding.installAndroidSteps'].slice(0, 24)));
    assert.ok(!android.includes('Only Safari'));
    const desktop = installStepsSheetHTML('desktop', 'en');
    assert.ok(desktop.includes(en['onboarding.installDesktopSteps']));
    assert.ok(!desktop.includes('Only Safari'));
    // A hostile platform string degrades to the desktop steps.
    assert.ok(installStepsSheetHTML('haiku', 'en').includes(en['onboarding.installDesktopSteps']));
  });

  test('store flags alone decide the card: installed/prompt need no UA probe', () => {
    assert.equal(
      detectInstallPlatform({ installed: true, promptReady: true, ua: '' }),
      'installed'
    );
    assert.equal(detectInstallPlatform({ installed: false, promptReady: true, ua: '' }), 'prompt');
  });
});

/* ------------------------------------------------------------------ */
/* 3. The card in the home invitations stack                           */
/* ------------------------------------------------------------------ */

const inviteState = (over = {}) => ({
  settings: { language: 'en', dismissedInvites: {}, installDeferral: null, ...over.settings },
  statistics: statsWithDays(4),
  install: { installed: false, promptReady: false },
  ...over,
});

describe('the card renders per its trigger inside homeInvitesHTML', () => {
  test('returning reader sees the card with both actions; installed/first-run do not', () => {
    const html = homeInvitesHTML(inviteState(), NOW);
    assert.ok(html.includes('data-home-invite="install"'), 'card renders');
    assert.ok(html.includes('data-action="home-invite-install"'), 'CTA action');
    assert.ok(html.includes('data-action="home-invite-install-later"'), 'Not now action');
    assert.ok(html.includes(en['home.invite.installTitle']));

    const installed = homeInvitesHTML(
      inviteState({ install: { installed: true, promptReady: false } }),
      NOW
    );
    assert.ok(!installed.includes('data-home-invite="install"'), 'installed: no card');

    const firstRun = homeInvitesHTML(inviteState({ statistics: statsWithDays(1) }), NOW);
    assert.ok(!firstRun.includes('data-home-invite="install"'), 'first run: no card');

    const deferred = homeInvitesHTML(
      inviteState({
        settings: {
          language: 'en',
          dismissedInvites: {},
          installDeferral: { at: NOW.getTime() - DAY, count: 1 },
        },
      }),
      NOW
    );
    assert.ok(!deferred.includes('data-home-invite="install"'), 'cooldown: no card');
  });

  test('prompt-ready platforms get the Install label, others See how', () => {
    const promptHtml = homeInvitesHTML(
      inviteState({ install: { installed: false, promptReady: true } }),
      NOW
    );
    assert.ok(promptHtml.includes(en['home.invite.installCtaPrompt']));
    const stepsHtml = homeInvitesHTML(inviteState(), NOW);
    assert.ok(stepsHtml.includes(en['home.invite.installCtaSteps']));
  });

  test('AR renders Arabic copy', () => {
    const html = homeInvitesHTML(inviteState({ settings: { language: 'ar' } }), NOW);
    assert.ok(html.includes(ar['home.invite.installTitle']));
    assert.ok(html.includes(ar['home.invite.installCtaSteps']));
  });

  test('a dismissed invite survives sanitizeSettings (persisted day-dismissal)', () => {
    const clean = sanitizeSettings({ dismissedInvites: { install: '2026-11-28' } });
    assert.equal(clean.dismissedInvites.install, '2026-11-28');
    // Forged ids and hostile day strings stay out.
    const forged = sanitizeSettings({
      dismissedInvites: { install: 'yesterday', '../../x': '2026-11-28' },
    });
    assert.equal(forged.dismissedInvites.install, undefined);
    assert.equal(Object.keys(forged.dismissedInvites).length, 0);
  });
});

/* ------------------------------------------------------------------ */
/* 4. Handlers (singleton store — run last, restore)                   */
/* ------------------------------------------------------------------ */

describe('handlers: Not now and the prompt branch', async () => {
  const { store, actions } = await import('../js/core/state.js');
  const { rt } = await import('../js/app/rt.js');

  const fakePrompt = (outcome) => ({
    calls: 0,
    async prompt() {
      this.calls += 1;
    },
    userChoice: Promise.resolve({ outcome }),
  });

  function stubToast() {
    const prev = globalThis.document;
    globalThis.document = { getElementById: () => null };
    return () => {
      if (prev === undefined) delete globalThis.document;
      else globalThis.document = prev;
    };
  }

  test('both new actions resolve to registered click handlers', () => {
    assert.ok(mergedClickHandlers['home-invite-install']);
    assert.ok(mergedClickHandlers['home-invite-install-later']);
  });

  test('home-invite-install-later stamps deferral AND the day-dismissal', () => {
    const restoreToast = stubToast();
    const prevDeferral = store.getState().settings.installDeferral;
    const prevDismissed = store.getState().settings.dismissedInvites;
    try {
      mergedClickHandlers['home-invite-install-later']({}, null, null);
      const after = store.getState().settings;
      assert.equal(after.installDeferral.count, (prevDeferral?.count || 0) + 1);
      assert.ok(after.installDeferral.at > 0);
      assert.equal(after.dismissedInvites.install, dateKey(new Date()));
      // The stashed prompt event is NOT consumed by a deferral.
      assert.equal(rt.deferredInstallPrompt, null, 'no event was stashed in this test');
    } finally {
      store.dispatch(
        actions.updateSettings({
          installDeferral: prevDeferral,
          dismissedInvites: prevDismissed,
        })
      );
      restoreToast();
    }
  });

  test('home-invite-install consumes the one-shot prompt like onboarding-install', async () => {
    const restoreToast = stubToast();
    try {
      const event = fakePrompt('accepted');
      rt.deferredInstallPrompt = event;
      store.dispatch(actions.installPromptReady());
      await mergedClickHandlers['home-invite-install']({}, null, null);
      assert.equal(event.calls, 1, 'prompt() ran once');
      assert.equal(rt.deferredInstallPrompt, null, 'one-shot event consumed');
      assert.equal(store.getState().install.outcome, 'accepted');
    } finally {
      rt.deferredInstallPrompt = null;
      store.dispatch(actions.installPromptClear());
      restoreToast();
    }
  });

  test('recordInstallDeferral composes with the Not now path over repeated days', () => {
    const once = recordInstallDeferral(null, NOW.getTime());
    const twice = recordInstallDeferral(once, NOW.getTime() + 8 * DAY);
    assert.equal(twice.count, 2);
    assert.equal(twice.at, NOW.getTime() + 8 * DAY);
  });
});
