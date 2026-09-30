/**
 * onboarding.js (v5.17.48)
 * Pure logic for the first-run wizard on Home: three decisions —
 * language, location-or-offset, reciter — then done, with an instant
 * skip. Everything else the old 8-step wizard asked (comfort,
 * notifications, calculation method, daily goal, install, first reading)
 * is deferred: passive doors in Settings that never pop up on their own
 * (see DEFERRED_STEPS + the Settings "finish later" block).
 *
 * Completion is always something *observable*, never a guess:
 *  - language:      the person picked a language (recorded confirm)
 *  - location:      settings.prayer has real coordinates, OR the person
 *    chose defaults/offsets instead (recorded confirm — prayer times
 *    work from defaults, so "no GPS" is a valid answer, not a trap)
 *  - reciter:       the person picked a voice or kept the default
 *    (recorded confirm — audio already plays from DEFAULT_RECITER)
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
 * Wizard steps, in order. Three decisions, then done. Every other
 * first-run concern lives in DEFERRED_STEPS below.
 */
export const WIZARD_STEP_IDS = ['language', 'location', 'reciter'];

/** Steps whose completion is a recorded confirm (persisted seen-flags). */
export const CONFIRM_STEPS = ['language', 'location', 'reciter'];

/**
 * The pre-8-step order (v5.2.52–v5.17.47), kept so old positions still
 * resolve: wizardStepIndex falls back honestly for out-of-range indices,
 * and resolveOnboardingStep maps every legacy id/index to either its live
 * step or the deferred door it moved to. No stored position or bookmarked
 * step silently dies.
 */
export const LEGACY_STEP_ORDER = [
  'language',
  'comfort',
  'location',
  'notifications',
  'prayer',
  'goals',
  'install',
  'firstReading',
];

/**
 * Deferred first-run doors: optional, passive, never auto-reshown. Each
 * names the route that now owns it — `view` values mirror VIEWS
 * (js/core/config/views.js), asserted by tests/onboarding.test.js, so the
 * map cannot drift from the router.
 */
export const DEFERRED_STEPS = [
  { id: 'comfort', view: 'settings', params: { id: 'accessibility' } },
  { id: 'notifications', view: 'settings', params: { id: 'notifications' } },
  { id: 'prayer', view: 'prayer', params: {} },
  { id: 'goals', view: 'settings', params: { id: 'content' } },
  { id: 'install', view: 'settings', params: { id: 'data' } },
  { id: 'firstReading', view: 'category', params: { id: 'morning' } },
];

/**
 * The old setup confirms (v5.2.52 CONFIRM_STEPS). Restore uses this to
 * grandfather people who finished the old wizard: the reciter never had a
 * wizard step before, so their default voice stands without being asked.
 */
export const LEGACY_CONFIRM_STEPS = ['language', 'comfort', 'prayer', 'goals'];

/**
 * Resolve any wizard reference — a live step id, a legacy step id, or a
 * legacy numeric position — to where it honestly goes now.
 * @param {string|number} ref step id or wizard position
 * @returns {{kind: 'wizard', index: number}|{kind: 'deferred', view: string, params: object}|null}
 *          null for unknown ids (callers fall back to first-incomplete).
 */
export function resolveOnboardingStep(ref) {
  const deferredById = new Map(DEFERRED_STEPS.map((d) => [d.id, d]));
  let id = null;
  if (typeof ref === 'string' && ref) id = ref;
  else if (typeof ref === 'number' && Number.isFinite(ref)) id = LEGACY_STEP_ORDER[ref] ?? null;
  if (id == null) return null;
  const wizardIndex = WIZARD_STEP_IDS.indexOf(id);
  if (wizardIndex !== -1) return { kind: 'wizard', index: wizardIndex };
  const deferred = deferredById.get(id);
  if (deferred) return { kind: 'deferred', view: deferred.view, params: { ...deferred.params } };
  return null;
}

/**
 * Build the ordered list of onboarding steps with their done flags.
 * @param {object} state app state
 * @param {{appInstalled?: boolean, notificationsGranted?: boolean}} [flags]
 *        accepted and ignored (legacy callers passed environment facts for
 *        the deferred install/notifications steps — kept so old call sites
 *        fail loudly at the test level, never silently here).
 * @returns {Array<{id: string, done: boolean}>}
 */
export function buildOnboardingSteps(state) {
  const p = state.settings?.prayer || {};
  const seen = state.onboarding?.stepsSeen;
  const seenMap = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
  const located =
    p.latitude != null &&
    p.longitude != null &&
    Number.isFinite(Number(p.latitude)) &&
    Number.isFinite(Number(p.longitude));
  return [
    { id: 'language', done: seenMap.language === true },
    { id: 'location', done: located || seenMap.location === true },
    { id: 'reciter', done: seenMap.reciter === true },
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
