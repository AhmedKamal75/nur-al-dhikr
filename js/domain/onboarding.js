/**
 * onboarding.js (v5.2.52)
 * Pure logic for the first-run wizard on Home (was a 4-row checklist).
 *
 * Completion is always something *observable*, never a guess:
 *  - location:      settings.prayer has real coordinates
 *  - notifications: the browser granted notification permission (passed in
 *    via flags — the store can't know environment facts on its own)
 *  - prayer:        the person confirmed their calculation setup (method +
 *    Asr, defaults included — the recorded choice is the signal, which is
 *    why a confirm step exists instead of change detection)
 *  - goals:         the person confirmed their daily dhikr goal
 *  - install:       standalone display mode, or the browser fired
 *    appinstalled
 *  - first reading: at least one recitation ever recorded
 *
 * The wizard auto-hides when every step is done, and can be dismissed
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
 * Wizard steps, in order. The two setup steps complete on explicit
 * confirm (their seen-flags persist in state.onboarding.stepsSeen).
 */
export const WIZARD_STEP_IDS = [
  'language',
  'comfort',
  'location',
  'notifications',
  'prayer',
  'goals',
  'install',
  'firstReading',
];

/** Steps whose completion is a recorded confirm (persisted seen-flags). */
export const CONFIRM_STEPS = ['language', 'comfort', 'prayer', 'goals'];

/**
 * Build the ordered list of onboarding steps with their done flags.
 * @param {object} state app state
 * @param {{appInstalled?: boolean, notificationsGranted?: boolean}} [flags]
 *        environment facts the store can't know on its own (standalone
 *        display mode / appinstalled / notification permission)
 * @returns {Array<{id: string, done: boolean}>}
 */
export function buildOnboardingSteps(
  state,
  { appInstalled = false, notificationsGranted = false } = {}
) {
  const p = state.settings?.prayer || {};
  const seen = state.onboarding?.stepsSeen;
  const seenMap = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
  return [
    { id: 'language', done: seenMap.language === true },
    { id: 'comfort', done: seenMap.comfort === true },
    {
      id: 'location',
      done:
        p.latitude != null &&
        p.longitude != null &&
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude)),
    },
    { id: 'notifications', done: notificationsGranted === true },
    { id: 'prayer', done: seenMap.prayer === true },
    { id: 'goals', done: seenMap.goals === true },
    { id: 'install', done: !!appInstalled },
    { id: 'firstReading', done: (state.statistics?.totalRecitations || 0) > 0 },
  ];
}

/** Every step done → the panel disappears on its own. */
export function onboardingComplete(steps) {
  return steps.every((s) => s.done);
}

/**
 * Visible wizard index: the explicit override (Back/Next taps, ephemeral)
 * when it names a real step, else the first incomplete step (a reload
 * restarts the wizard exactly where work remains).
 */
export function wizardStepIndex(steps, override) {
  const n = Array.isArray(steps) ? steps.length : 0;
  if (n === 0) return 0;
  // Nullish/blank means "no explicit position" — Number(null) is 0, so it
  // must not fall through to the numeric path (that pinned every fresh
  // load to step 0 instead of the first incomplete step).
  if (override == null || override === '') {
    const first = steps.findIndex((s) => !s.done);
    return first === -1 ? n - 1 : first;
  }
  const o = Math.floor(Number(override));
  if (Number.isFinite(o) && o >= 0 && o < n) return o;
  const first = steps.findIndex((s) => !s.done);
  return first === -1 ? n - 1 : first;
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
