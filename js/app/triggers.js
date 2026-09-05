/**
 * app/triggers.js — prayer-alert reliability: computes the next 24h of
 * adhan alerts and arms them with the service worker (TimestampTriggers
 * where supported, periodicsync catch-up otherwise).
 */

import { rt } from './rt.js';
import { t } from '../core/i18n.js';
import { actions, store } from '../core/state.js';
import {
  buildTriggerPlan,
  planFingerprint,
  PRAYER_ORDER,
  triggersSupported,
} from '../services/alertTriggers.js';
import { showToast } from '../ui/toast.js';

/* Prayer-alert reliability (v3.20)                                    */
/* ------------------------------------------------------------------ */
// TODO (v3.20, shipped): today's alerts only fired while a tab was open and
// the 30s check interval was running. On every app open, relevant settings
// change, and return-to-visible, the next 24h of adhan alerts are computed
// (pure buildTriggerPlan) and handed to the service worker, which arms them
// as real browser-level timestamped triggers where the Notification
// Triggers API exists — so a briefly closed tab no longer skips a prayer.
// Where triggers are missing (Firefox/Safari), the worker still keeps the
// plan in IndexedDB for its periodicsync catch-up, and the in-tab scheduler
// remains; the Prayer view's status row always says which path is live.

export const TRIGGER_ARM_THROTTLE_MS = 3000;

/** Trailing-edge debounce for settings-change re-arms: a rapid burst of
 * bell toggles must leave the FINAL state armed, so the last change wins
 * and runs (a plain throttle would swallow it for up to 3s). */
export function scheduleTriggerArm() {
  if (rt.triggerArmTimer) clearTimeout(rt.triggerArmTimer);
  rt.triggerArmTimer = setTimeout(() => {
    rt.triggerArmTimer = null;
    armPrayerTriggers(true);
  }, 250);
}

export function sendTriggerPlan(plan, onResult) {
  try {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'schedule-prayer-triggers-result' && onResult) onResult(data);
    };
    rt.swRegistration.active.postMessage({ type: 'schedule-prayer-triggers', plan }, [
      channel.port2,
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function armPrayerTriggers(force = false) {
  try {
    const nowTs = Date.now();
    if (!force && nowTs - rt.lastTriggerArmTs < TRIGGER_ARM_THROTTLE_MS) return;
    rt.lastTriggerArmTs = nowTs;

    const state = store.getState();
    const lang = state.settings.language;
    const p = state.settings.prayer || {};
    const anyEnabled = PRAYER_ORDER.some((n) => p.alerts?.[n]);

    if (!anyEnabled) {
      // Alerts off: clear any previously armed browser-level triggers so a
      // toggled-off prayer can never ring later from a stale plan.
      if (rt.lastTriggerFingerprint !== '' && rt.swRegistration && rt.swRegistration.active) {
        rt.lastTriggerFingerprint = '';
        sendTriggerPlan([], null);
      }
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'off', count: 0 }));
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      // (review v3.21): permission revoked mid-session — cancel previously
      // armed triggers like the toggled-off path does, but only when there
      // is anything armed (fingerprint non-empty), so visibilitychange
      // churn doesn't re-message the worker.
      if (rt.lastTriggerFingerprint !== '' && rt.swRegistration && rt.swRegistration.active) {
        rt.lastTriggerFingerprint = '';
        sendTriggerPlan([], null);
      }
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'permission', count: 0 }));
      return;
    }

    const plan = buildTriggerPlan({ now: new Date(), prayerSettings: p, lang });
    if (!plan.length) {
      // Alerts are on but nothing could be computed (almost always: the
      // coordinates are missing) — nothing to arm; cancel stale triggers.
      if (rt.lastTriggerFingerprint !== '' && rt.swRegistration && rt.swRegistration.active) {
        rt.lastTriggerFingerprint = '';
        sendTriggerPlan([], null);
      }
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 0 }));
      return;
    }

    const fingerprint = planFingerprint(plan);
    if (fingerprint === rt.lastTriggerFingerprint) return; // nothing changed
    rt.lastTriggerFingerprint = fingerprint;

    if (!rt.swRegistration || !rt.swRegistration.active) {
      // The worker is not ready yet (first install) — the in-tab scheduler
      // still covers this session; arming retries on controllerchange.
      rt.lastTriggerFingerprint = '';
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 0 }));
      return;
    }

    // Best-effort, independent of trigger support: periodic background sync
    // lets the WORKER show a missed alert later. Browser-controlled cadence;
    // silently absent where unsupported (registration.periodicSync is
    // undefined outside installed Chromium PWAs).
    try {
      if (rt.swRegistration.periodicSync) {
        const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (perm.state === 'granted') {
          await rt.swRegistration.periodicSync.register('prayer-alert-sync', {
            minInterval: 12 * 60 * 60 * 1000,
          });
        }
      }
    } catch {
      /* best-effort only */
    }

    if (!triggersSupported()) {
      // No Notification Triggers: still hand the plan over (IndexedDB) so
      // the periodicsync catch-up has data, but be honest about the mode.
      sendTriggerPlan(plan, null);
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 0 }));
      return;
    }

    const sent = sendTriggerPlan(plan, (data) => {
      store.dispatch(
        actions.setAlertTriggerStatus({
          mode: data.supported && data.armed > 0 ? 'triggers' : 'tab',
          count: data.armed || 0,
        })
      );
    });
    if (!sent) store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 0 }));
  } catch (err) {
    console.warn('[alert-triggers] arm failed', err);
    try {
      store.dispatch(actions.setAlertTriggerStatus({ mode: 'tab', count: 0 }));
    } catch {
      /* boot ordering edge — nothing more to do */
    }
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // v4.1: the worker posts {type:'precache-failed'} when its install
  // couldn't complete (after its own one retry) — previously the failure
  // was console-only and the person had an "installed" app that was fully
  // network-dependent. (v4.3) it is now a real toast with a Retry action:
  // the install itself fails (see sw.js), so the OLD worker keeps serving,
  // and the retry asks the failing worker to fill its shell again.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'precache-failed') {
      console.warn('[sw] offline precache failed — updates will retry on next launch');
      const lang = store.getState().settings.language;
      showToast(t('sw.precacheFailed', lang), {
        duration: 8000,
        assertive: true,
        actionLabel: t('common.retry', lang),
        onAction: () => {
          const target =
            rt.swRegistration?.installing ||
            rt.swRegistration?.waiting ||
            rt.swRegistration?.active;
          target?.postMessage({ type: 'PRECACHE_RETRY' });
        },
      });
    }
  });
  const doRegister = () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registration) => {
        // v3.20: keep the registration for the prayer-alert trigger arming
        // below, and arm as soon as a worker is actually active (first
        // install activates immediately; updates wait — arming targets
        // .active only, so re-check on controllerchange).
        rt.swRegistration = registration;
        const armWhenActive = () => {
          if (registration.active) armPrayerTriggers(true);
          else
            navigator.serviceWorker.addEventListener('controllerchange', armWhenActive, {
              once: true,
            });
        };
        armWhenActive();

        // PWA update flow: without this, a cache-first worker means people
        // who installed the app keep running the old build indefinitely —
        // the exact failure mode this app's changelog has had to fix by
        // hand before. When a freshly installed worker is *waiting* (i.e.
        // the person has already used the app before — controller exists),
        // offer a one-tap refresh. The worker itself answers SKIP_WAITING
        // (sw.js) and the reload lands in the new version.
        const offerUpdate = (worker) => {
          if (!navigator.serviceWorker.controller) return; // first install, nothing to update
          showToast(t('update.available', store.getState().settings.language), {
            duration: 0, // no auto-dismiss: an update notice should stay tappable
            actionLabel: t('update.refresh', store.getState().settings.language),
            onAction: () => {
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => window.location.reload(),
                { once: true }
              );
              worker.postMessage('SKIP_WAITING');
              // Belt-and-braces: if controllerchange never fires (e.g. the
              // browser decided otherwise), still reload after a grace period.
              setTimeout(() => window.location.reload(), 4000);
            },
          });
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          offerUpdate(registration.waiting);
        } else {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                offerUpdate(newWorker);
              }
            });
          });
        }

        // Also poll on regaining focus/network — installed PWAs can sit in
        // the background for weeks; this catches updates shipped meanwhile.
        const checkForUpdate = () => registration.update().catch(() => {});
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
        setInterval(checkForUpdate, 6 * 60 * 60 * 1000); // every 6h
      })
      .catch((err) => console.warn('[sw] registration failed', err));
  };
  // boot() is async and may finish well after window's 'load' event already fired
  // (e.g. slow catalog fetch), so check readyState instead of blindly awaiting 'load'.
  if (document.readyState === 'complete') doRegister();
  else window.addEventListener('load', doRegister);
}
