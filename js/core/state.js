/**
 * core/state.js — the store package facade.
 *
 * Single source of truth for Nūr al-Dhikr, split since v4.0 into focused
 * modules under core/state/ (this file re-exports the public surface so
 * every importer keeps one stable entry point):
 *
 *   state/initial.js   initialState(), PERSISTED_KEYS, pickPersisted()
 *   state/store.js     Store class (dispatch/batch/subscribe/persist) + the store instance
 *   state/reducer.js   reduce() — the single action switch
 *   state/actions.js   action creators
 *   state/restore.js   sanitizeRestoredPayload(), dryRunRestore(), persistedSnapshot()
 *   state/selectors.js selectors
 *   state/streak.js    computeStreak() (shared by reducer + restore)
 *
 * Modules never mutate state directly — they dispatch actions and
 * subscribe to changes. Views treat state as read-only.
 */

export { store } from './state/store.js';
export { initialState, PERSISTED_KEYS, pickPersisted } from './state/initial.js';
export { reduce } from './state/reducer.js';
export { actions } from './state/actions.js';
export { sanitizeRestoredPayload, dryRunRestore, persistedSnapshot } from './state/restore.js';
export { selectors } from './state/selectors.js';
