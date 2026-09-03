/**
 * onboarding.js
 * Pure logic for the first-run "Getting started" panel on Home.
 *
 * The panel is state-driven like everything else in this app: these helpers
 * only read state and report which steps are done; rendering lives in
 * views/home.js and the deferred-install-prompt event lives in app.js.
 *
 * Completion is always something *observable*, never a guess:
 *  - location:  settings.prayer has real coordinates
 *  - appearance: the person has opened Settings at least once (tracked by
 *    the NAVIGATE reducer — see state.js)
 *  - install:   the app is running in a standalone display mode, or the
 *    browser fired appinstalled
 *  - first reading: at least one recitation ever recorded
 *
 * The panel auto-hides when every step is done, and can be dismissed
 * explicitly ("Maybe later"). Anyone upgrading from an earlier version
 * with existing progress is treated as a returning user and never sees it
 * at all (see isReturningUser + sanitizeRestoredPayload in state.js).
 */

/**
 * Does this restored/hydrated payload belong to someone who has clearly
 * used the app before? Used to auto-dismiss onboarding for upgrades.
 * @param {object|null} payload persisted state payload
 * @returns {boolean}
 */
export function isReturningUser(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const stats = payload.statistics || {};
  return (
    (Number(stats.totalRecitations) || 0) > 0 ||
    (Array.isArray(payload.favorites) && payload.favorites.length > 0) ||
    (Array.isArray(payload.history) && payload.history.length > 0) ||
    (Array.isArray(payload.collections) && payload.collections.length > 0)
  );
}

/**
 * Build the ordered list of onboarding steps with their done flags.
 * @param {object} state app state
 * @param {{appInstalled?: boolean}} [flags] environment facts the store
 *        can't know on its own (standalone display mode / appinstalled)
 * @returns {Array<{id: 'location'|'appearance'|'install'|'firstReading', done: boolean}>}
 */
export function buildOnboardingSteps(state, { appInstalled = false } = {}) {
  const p = state.settings?.prayer || {};
  return [
    {
      id: 'location',
      done:
        p.latitude != null &&
        p.longitude != null &&
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude)),
    },
    { id: 'appearance', done: !!state.onboarding?.settingsVisited },
    { id: 'install', done: !!appInstalled },
    { id: 'firstReading', done: (state.statistics?.totalRecitations || 0) > 0 },
  ];
}

/** Every step done → the panel disappears on its own. */
export function onboardingComplete(steps) {
  return steps.every((s) => s.done);
}

/**
 * Should the onboarding panel render at all?
 * @param {object} state app state
 * @param {{appInstalled?: boolean}} [flags]
 * @returns {boolean}
 */
export function shouldShowOnboarding(state, flags = {}) {
  if (state.onboarding?.dismissed) return false;
  return !onboardingComplete(buildOnboardingSteps(state, flags));
}
