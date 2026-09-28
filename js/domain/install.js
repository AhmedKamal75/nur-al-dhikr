/**
 * domain/install.js (v5.17.31)
 * Pure install-path logic for the in-app PWA install flow.
 *
 * The browser owns the only real dialog (beforeinstallprompt can be
 * consumed exactly once; iOS Safari never fires it at all), so everything
 * here is decision support around that fact:
 *
 *  - deferral memory: a "not now" (or a dismissed dialog) stamps
 *    { at, count } in persisted settings; the re-offer path stays quiet
 *    for INSTALL_REOFFER_DAYS afterwards. Persisted on purpose — an
 *    ephemeral stamp would die on reload and the cooldown would be a lie.
 *  - platform routing: the event (prompt), iOS Share steps, Android menu
 *    steps, or desktop address-bar steps — one honest instruction each.
 *  - outcome normalization: userChoice resolves { outcome } long after
 *    prompt() returns; only literal 'accepted'/'dismissed' mean anything.
 *  - runInstallPrompt: the prompt() → userChoice sequence against an
 *    injected event, so headless tests can drive it with a fake.
 *
 * Pure: inject `now` in tests; never touches window/store/rt.
 */

/** Cooldown between a deferral and the next offer (days). */
export const INSTALL_REOFFER_DAYS = 7;

/** Lifetime cap on the deferral counter — a crafted backup cannot bloat it. */
export const INSTALL_MAX_DEFERRALS = 1000;

/** Fresh deferral memory (also the sanitize fallback). */
export function defaultInstallDeferral() {
  return { at: null, count: 0 };
}

/**
 * Coerce untrusted deferral memory (backup import, hand-edited storage).
 * A future timestamp is junk — a deferral cannot happen ahead of the
 * device — and degrades to null; the count clamps to its cap.
 */
export function sanitizeInstallDeferral(raw, now = Date.now()) {
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const at = Math.floor(Number(p.at) || 0);
  const count = Math.floor(Number(p.count) || 0);
  return {
    at: at > 0 && at <= now ? at : null,
    count: Number.isFinite(count) ? Math.max(0, Math.min(INSTALL_MAX_DEFERRALS, count)) : 0,
  };
}

/** Stamp a fresh deferral over previous memory (count accumulates). */
export function recordInstallDeferral(prev, now = Date.now()) {
  const clean = sanitizeInstallDeferral(prev, now);
  return {
    at: now,
    count: Math.min(INSTALL_MAX_DEFERRALS, clean.count + 1),
  };
}

/**
 * May the install prompt be offered right now? Never deferred (or never
 * seen) → yes; inside the cooldown → no; cooldown passed → yes again.
 * The caller (wiring/handler) decides what "offer" means for the current
 * platform — this only answers the timing question.
 */
export function shouldReofferInstall(deferral, now = Date.now(), days = INSTALL_REOFFER_DAYS) {
  const clean = sanitizeInstallDeferral(deferral, now);
  if (clean.at == null || clean.count <= 0) return true;
  return now - clean.at >= days * 24 * 60 * 60 * 1000;
}

/**
 * Which install surface does this reader actually have?
 * 'installed' (standalone / appinstalled) > 'prompt' (a stashed
 * beforeinstallprompt is live) > per-platform manual steps. `ua` is the
 * navigator userAgent string; tests inject it, views probe it live.
 */
export function detectInstallPlatform({ installed = false, promptReady = false, ua = '' } = {}) {
  if (installed === true) return 'installed';
  if (promptReady === true) return 'prompt';
  const s = String(ua || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  if (/android/.test(s)) return 'android';
  return 'desktop';
}

/** i18n key for the manual steps of a no-prompt platform. */
export function installStepsKey(platform) {
  if (platform === 'ios') return 'onboarding.installIosSteps';
  if (platform === 'android') return 'onboarding.installAndroidSteps';
  return 'onboarding.installDesktopSteps';
}

/** Only the two literal userChoice outcomes mean anything; the rest is null. */
export function normalizeInstallOutcome(outcome) {
  return outcome === 'accepted' || outcome === 'dismissed' ? outcome : null;
}

/**
 * Drive a (possibly fake) deferred prompt: prompt() first, then the
 * userChoice outcome. Never throws — a browser that refuses the second
 * prompt, a missing userChoice, or a hostile shape all resolve to null
 * (no outcome recorded) instead of breaking the tap.
 */
export async function runInstallPrompt(promptEvent) {
  if (!promptEvent || typeof promptEvent.prompt !== 'function') return null;
  try {
    await promptEvent.prompt();
  } catch {
    return null;
  }
  try {
    const choice = await promptEvent.userChoice;
    return normalizeInstallOutcome(choice && choice.outcome);
  } catch {
    return null;
  }
}

/**
 * Service-worker → store bridge for install-adjacent worker mail. Returns
 * the action TYPE the page should dispatch, or null when the message is
 * not install business (the precache-failed toast path stays untouched).
 */
export function swInstallMessageAction(data) {
  const type = data && typeof data === 'object' ? data.type : data;
  if (type === 'precache-complete') return 'SHELL_OFFLINE_READY';
  return null;
}
